import { describe, expect, it } from "vitest";
import { createInMemoryRateLimiter } from "./inMemoryRateLimiter";

describe("in-memory rate limiter", () => {
  it.each([
    [0, 3000],
    [-1, 3000],
    [1.5, 3000],
    [3, 0],
    [3, -1],
    [3, NaN],
  ])("rejects a limit of %s with a window of %s", (limit, windowMs) => {
    expect(() => createInMemoryRateLimiter(limit, windowMs)).toThrow(
      RangeError,
    );
  });

  it("allows three attempts in a window and refuses the fourth", async () => {
    const limiter = createInMemoryRateLimiter();
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
    const limiter = createInMemoryRateLimiter();
    await limiter.attempt("a", 0);
    await limiter.attempt("a", 100);
    await limiter.attempt("a", 200);
    expect((await limiter.attempt("a", 2999)).allowed).toBe(false);
    expect((await limiter.attempt("a", 3000)).allowed).toBe(true);
  });

  it("keeps each customer independent", async () => {
    const limiter = createInMemoryRateLimiter();
    for (let i = 0; i < 3; i++) await limiter.attempt("a", i);
    expect((await limiter.attempt("a", 10)).allowed).toBe(false);
    expect((await limiter.attempt("b", 10)).allowed).toBe(true);
  });

  it("sweeps expired customers once more than the threshold are tracked, without capping the map", async () => {
    const limiter = createInMemoryRateLimiter(3, 3000, 10);
    for (let i = 0; i < 11; i++) await limiter.attempt(`one-off-${i}`, 0);
    expect(limiter.trackedKeys()).toBe(11);
    await limiter.attempt("later", 5000);
    expect(limiter.trackedKeys()).toBe(1);
    for (let i = 0; i < 20; i++) await limiter.attempt(`fresh-${i}`, 5000);
    expect(limiter.trackedKeys()).toBe(21);
  });

  it("does not count rate-limited attempts towards the limit", async () => {
    const limiter = createInMemoryRateLimiter();
    for (let i = 0; i < 3; i++) await limiter.attempt("a", i);
    await limiter.attempt("a", 2999);
    expect((await limiter.attempt("a", 3001)).allowed).toBe(true);
    expect((await limiter.attempt("a", 3002)).allowed).toBe(true);
    expect((await limiter.attempt("a", 3003)).allowed).toBe(true);
    expect((await limiter.attempt("a", 3004)).allowed).toBe(false);
  });
});
