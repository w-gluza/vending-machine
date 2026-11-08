import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { createDb, type Db } from "@/server/db/client";
import { migrate } from "@/server/db/migrate";
import { createPostgresInstances } from "@/server/instance";
import {
  createPostgresStore,
  MAX_INTEGER_COLUMN,
  MachineNotSeededError,
} from "@/server/machine/postgresStore";
import { purchase, PurchaseConflictError } from "@/server/machine/purchase";
import { createInitialState, type MachineStore } from "@/server/machine/store";
import { createPostgresRateLimiter } from "@/server/rate-limit/postgresRateLimiter";
import type { RateLimiter } from "@/server/rate-limit/rateLimiter";

const connectionString = process.env.TEST_DATABASE_URL;

describe.skipIf(!connectionString)(
  "postgres adapters (TEST_DATABASE_URL)",
  () => {
    let db: Db;
    const extra: Db[] = [];

    const openDb = () => {
      const opened = createDb(connectionString as string);
      extra.push(opened);
      return opened;
    };

    beforeAll(async () => {
      db = createDb(connectionString as string);
      await migrate(db);
    }, 30_000);

    afterEach(async () => {
      await Promise.all(extra.splice(0).map((d) => d.end()));
    });

    afterAll(async () => {
      await db.end();
    });

    describe("machine store", () => {
      let store: MachineStore;

      beforeEach(async () => {
        store = createPostgresStore(db);
        await store.reset();
      });

      it("loads the seeded machine", async () => {
        const { state } = await store.load();
        expect(state).toEqual(createInitialState());
      });

      it("saves against the current version and bumps it", async () => {
        const { state, version } = await store.load();
        const next = { ...state, cashBoxInPence: 85 };

        expect(await store.save(next, version)).toBe(true);

        const after = await store.load();
        expect(after.state).toEqual(next);
        expect(after.version).toBe(version + 1);
      });

      it("refuses a stale version and leaves the state alone", async () => {
        const { state, version } = await store.load();
        await store.save({ ...state, cashBoxInPence: 85 }, version);

        expect(
          await store.save({ ...state, cashBoxInPence: 999 }, version),
        ).toBe(false);
        expect((await store.load()).state.cashBoxInPence).toBe(85);
      });

      it("lets exactly one of two concurrent saves from separate connections win", async () => {
        const other = createPostgresStore(openDb());
        const [a, b] = await Promise.all([store.load(), other.load()]);
        expect(a.version).toBe(b.version);

        const results = await Promise.all([
          store.save({ ...a.state, cashBoxInPence: 1 }, a.version),
          other.save({ ...b.state, cashBoxInPence: 2 }, b.version),
        ]);

        expect(results.filter(Boolean)).toHaveLength(1);
      });

      it("never loses cash under concurrent purchases from separate instances", async () => {
        const input = { priceInPence: 85, paidInPence: 100 };
        const stores = Array.from({ length: 6 }, () =>
          createPostgresStore(openDb()),
        );

        const outcomes = await Promise.allSettled(
          stores.map((s) => purchase(input, s)),
        );

        const dispensed = outcomes.filter(
          (o) => o.status === "fulfilled" && o.value.ok,
        ).length;
        const conflicts = outcomes.filter(
          (o) =>
            o.status === "rejected" &&
            o.reason instanceof PurchaseConflictError,
        ).length;
        expect(dispensed + conflicts).toBe(stores.length);
        expect(dispensed).toBeGreaterThan(0);
        expect((await store.load()).state.cashBoxInPence).toBe(dispensed * 100);
      });

      it("keeps state for a new store instance", async () => {
        const { state, version } = await store.load();
        await store.save({ ...state, cashBoxInPence: 85 }, version);

        const fresh = createPostgresStore(openDb());
        expect((await fresh.load()).state.cashBoxInPence).toBe(85);
      });

      it("refuses a cash box the INTEGER column cannot hold", async () => {
        const { state, version } = await store.load();
        await expect(
          store.save(
            { ...state, cashBoxInPence: MAX_INTEGER_COLUMN + 1 },
            version,
          ),
        ).rejects.toThrow(RangeError);
      });

      it("reports an unseeded table", async () => {
        await db.query("DELETE FROM machine");
        await expect(store.load()).rejects.toThrow(MachineNotSeededError);
        await migrate(db);
      });
    });

    describe("rate limiter", () => {
      let limiter: RateLimiter;

      beforeEach(async () => {
        limiter = createPostgresRateLimiter(db);
        await limiter.reset();
      });

      it("allows three attempts in a window and refuses the fourth", async () => {
        expect(await limiter.attempt("a", 0)).toEqual({
          allowed: true,
          remaining: 2,
        });
        expect(await limiter.attempt("a", 1000)).toEqual({
          allowed: true,
          remaining: 1,
        });
        expect(await limiter.attempt("a", 2000)).toEqual({
          allowed: true,
          remaining: 0,
        });
        expect(await limiter.attempt("a", 2500)).toEqual({
          allowed: false,
          retryAfterMs: 500,
        });
      });

      it("allows again once the oldest attempt leaves the window", async () => {
        await limiter.attempt("a", 0);
        await limiter.attempt("a", 100);
        await limiter.attempt("a", 200);
        expect((await limiter.attempt("a", 2999)).allowed).toBe(false);
        expect((await limiter.attempt("a", 3000)).allowed).toBe(true);
      });

      it("keeps each customer independent", async () => {
        for (let i = 0; i < 3; i++) await limiter.attempt("a", i);
        expect((await limiter.attempt("a", 10)).allowed).toBe(false);
        expect((await limiter.attempt("b", 10)).allowed).toBe(true);
      });

      it("does not count refused attempts towards the limit", async () => {
        for (let i = 0; i < 3; i++) await limiter.attempt("a", i);
        await limiter.attempt("a", 2999);
        expect((await limiter.attempt("a", 3001)).allowed).toBe(true);
        expect((await limiter.attempt("a", 3002)).allowed).toBe(true);
        expect((await limiter.attempt("a", 3003)).allowed).toBe(true);
        expect((await limiter.attempt("a", 3004)).allowed).toBe(false);
      });

      it("orders attempts by time even when clocks run backwards", async () => {
        await limiter.attempt("a", 100);
        await limiter.attempt("a", 50);
        await limiter.attempt("a", 0);
        expect(await limiter.attempt("a", 2999)).toEqual({
          allowed: false,
          retryAfterMs: 1,
        });
        expect((await limiter.attempt("a", 3000)).allowed).toBe(true);
      });

      it("admits exactly three of six simultaneous attempts from separate connections", async () => {
        const limiters = Array.from({ length: 6 }, () =>
          createPostgresRateLimiter(openDb()),
        );

        const decisions = await Promise.all(
          limiters.map((l) => l.attempt("burst", 0)),
        );

        expect(decisions.filter((d) => d.allowed)).toHaveLength(3);
      });
    });

    describe("service reset", () => {
      it("resets the machine and every customer in one go", async () => {
        const instances = createPostgresInstances(db);
        for (let i = 0; i < 3; i++) await instances.limiter.attempt("a", i);
        const { state, version } = await instances.store.load();
        await instances.store.save({ ...state, cashBoxInPence: 85 }, version);

        await instances.reset();

        expect((await instances.limiter.attempt("a", 4)).allowed).toBe(true);
        expect((await instances.store.load()).state.cashBoxInPence).toBe(0);
      });
    });
  },
);
