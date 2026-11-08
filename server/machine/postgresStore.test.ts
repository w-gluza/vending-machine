import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/server/db/client";
import { migrate } from "@/server/db/migrate";
import { purchase, PurchaseConflictError } from "./purchase";
import {
  createPostgresStore,
  MAX_INTEGER_COLUMN,
  MachineNotSeededError,
} from "./postgresStore";
import { createInitialState, type MachineStore } from "./store";

const connectionString = process.env.TEST_DATABASE_URL;

describe.skipIf(!connectionString)("postgres store (TEST_DATABASE_URL)", () => {
  let db: Db;
  let store: MachineStore;

  beforeAll(async () => {
    db = createDb(connectionString as string);
    await migrate(db);
  });

  afterAll(async () => {
    await db.end();
  });

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

    expect(await store.save({ ...state, cashBoxInPence: 999 }, version)).toBe(
      false,
    );
    expect((await store.load()).state.cashBoxInPence).toBe(85);
  });

  it("lets exactly one of two concurrent saves from separate connections win", async () => {
    const other = createPostgresStore(createDb(connectionString as string));
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
      createPostgresStore(createDb(connectionString as string)),
    );

    const outcomes = await Promise.allSettled(
      stores.map((s) => purchase(input, s)),
    );

    const dispensed = outcomes.filter(
      (o) => o.status === "fulfilled" && o.value.ok,
    ).length;
    const conflicts = outcomes.filter(
      (o) =>
        o.status === "rejected" && o.reason instanceof PurchaseConflictError,
    ).length;
    expect(dispensed + conflicts).toBe(stores.length);
    expect(dispensed).toBeGreaterThan(0);
    expect((await store.load()).state.cashBoxInPence).toBe(dispensed * 100);
  });

  it("keeps state for a new store instance", async () => {
    const { state, version } = await store.load();
    await store.save({ ...state, cashBoxInPence: 85 }, version);

    const fresh = createPostgresStore(createDb(connectionString as string));
    expect((await fresh.load()).state.cashBoxInPence).toBe(85);
  });

  it("refuses a cash box the INTEGER column cannot hold", async () => {
    const { state, version } = await store.load();
    await expect(
      store.save({ ...state, cashBoxInPence: MAX_INTEGER_COLUMN + 1 }, version),
    ).rejects.toThrow(RangeError);
  });

  it("reports an unseeded table", async () => {
    await db.query("DELETE FROM machine");
    await expect(store.load()).rejects.toThrow(MachineNotSeededError);
    await migrate(db);
  });
});
