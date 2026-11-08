import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/server/db/client";
import { migrate } from "@/server/db/migrate";
import { createPostgresInstances } from "@/server/instance";
import { createPostgresRateLimiter } from "./postgresRateLimiter";
import type { RateLimiter } from "./rateLimiter";

const connectionString = process.env.TEST_DATABASE_URL;

describe.skipIf(!connectionString)(
  "postgres rate limiter (TEST_DATABASE_URL)",
  () => {
    let db: Db;
    let limiter: RateLimiter;

    beforeAll(async () => {
      db = createDb(connectionString as string);
      await migrate(db);
    });

    afterAll(async () => {
      await db.end();
    });

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
        createPostgresRateLimiter(createDb(connectionString as string)),
      );

      const decisions = await Promise.all(
        limiters.map((l) => l.attempt("burst", 0)),
      );

      expect(decisions.filter((d) => d.allowed)).toHaveLength(3);
    });

    it("resets the machine and every customer in one go", async () => {
      const instances = createPostgresInstances(db);
      for (let i = 0; i < 3; i++) await instances.limiter.attempt("a", i);
      const { state, version } = await instances.store.load();
      await instances.store.save({ ...state, cashBoxInPence: 85 }, version);

      await instances.reset();

      expect((await instances.limiter.attempt("a", 4)).allowed).toBe(true);
      expect((await instances.store.load()).state.cashBoxInPence).toBe(0);
    });
  },
);
