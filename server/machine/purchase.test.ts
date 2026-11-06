import { describe, expect, it } from "vitest";
import { createInitialInventory } from "@/features/vending-machine/domain/coinInventory";
import { createInMemoryRateLimiter } from "@/server/rate-limit/inMemoryRateLimiter";
import type { RateLimiter } from "@/server/rate-limit/rateLimiter";
import { getSnapshot } from "./getSnapshot";
import { createInMemoryStore } from "./inMemoryStore";
import { purchase } from "./purchase";
import type { MachineStore } from "./store";

const deps = (
  overrides: Partial<{ store: MachineStore; limiter: RateLimiter }> = {},
) => ({
  store: createInMemoryStore(),
  limiter: createInMemoryRateLimiter(),
  now: () => 1_000,
  ...overrides,
});

const request = (
  overrides: Partial<{
    customerId: string;
    priceInPence: number;
    paidInPence: number;
  }> = {},
) => ({
  customerId: "alice",
  priceInPence: 85,
  paidInPence: 100,
  ...overrides,
});

describe("purchase", () => {
  it("dispenses, takes the payment into the cash box and removes change from the float", async () => {
    const d = deps();
    const result = await purchase(request(), d);
    expect(result).toMatchObject({
      ok: true,
      changeDueInPence: 15,
      change: [
        { denomination: 10, count: 1 },
        { denomination: 5, count: 1 },
      ],
    });
    const snapshot = await getSnapshot(d.store);
    expect(snapshot.cashBoxInPence).toBe(100);
    expect(snapshot.coins[10]).toBe(9);
    expect(snapshot.coins[5]).toBe(9);
    expect(snapshot.changeAvailableInPence).toBe(3880 - 15);
  });

  it("exact payment dispenses and changes nothing but the cash box", async () => {
    const d = deps();
    const result = await purchase(request({ paidInPence: 85 }), d);
    expect(result).toMatchObject({ ok: true, change: [] });
    const snapshot = await getSnapshot(d.store);
    expect(snapshot.coins).toEqual(createInitialInventory());
    expect(snapshot.cashBoxInPence).toBe(85);
  });

  it("refuses insufficient payment and leaves the machine untouched", async () => {
    const d = deps();
    const result = await purchase(request({ paidInPence: 50 }), d);
    expect(result).toMatchObject({
      ok: false,
      reason: "insufficient_payment",
      shortfallInPence: 35,
    });
    expect(await getSnapshot(d.store)).toMatchObject({
      coins: createInitialInventory(),
      cashBoxInPence: 0,
    });
  });

  it("refuses when change cannot be made and keeps the customer's money out of the box", async () => {
    const d = deps({
      store: createInMemoryStore({
        coins: { ...createInitialInventory(0), 50: 1 },
        cashBoxInPence: 0,
      }),
    });
    const result = await purchase(
      request({ priceInPence: 50, paidInPence: 80 }),
      d,
    );
    expect(result).toMatchObject({ ok: false, reason: "cannot_make_change" });
    expect((await getSnapshot(d.store)).cashBoxInPence).toBe(0);
  });

  it("rate limits the fourth attempt in three seconds before checking the price", async () => {
    const d = deps();
    let clock = 0;
    d.now = () => clock;
    for (let i = 0; i < 3; i++) {
      clock += 500;
      await purchase(request({ paidInPence: 1 }), d);
    }
    clock += 500;
    const result = await purchase(request(), d);
    expect(result).toMatchObject({ ok: false, reason: "rate_limited" });
    if (result.ok || result.reason !== "rate_limited")
      throw new Error("expected rate limit");
    expect(result.retryAfterMs).toBe(1500);
    expect((await getSnapshot(d.store)).cashBoxInPence).toBe(0);
  });

  it("keeps customers' limits independent", async () => {
    const d = deps();
    for (let i = 0; i < 3; i++) await purchase(request(), d);
    expect(await purchase(request(), d)).toMatchObject({
      ok: false,
      reason: "rate_limited",
    });
    expect(await purchase(request({ customerId: "bob" }), d)).toMatchObject({
      ok: true,
    });
  });

  it("runs the float down until change becomes impossible", async () => {
    const d = deps();
    const results = [];
    for (let i = 0; i < 12; i++) {
      results.push(
        await purchase(
          request({ customerId: `c${i}`, priceInPence: 1, paidInPence: 200 }),
          d,
        ),
      );
    }
    expect(results[0]).toMatchObject({ ok: true, changeDueInPence: 199 });
    expect(results.some((r) => r.ok)).toBe(true);
    expect(
      results.some((r) => !r.ok && r.reason === "cannot_make_change"),
    ).toBe(true);
    const snapshot = await getSnapshot(d.store);
    expect(snapshot.changeAvailableInPence).toBeLessThan(3880);
  });

  it("retries once when a concurrent purchase changed the state first", async () => {
    const inner = createInMemoryStore();
    let failedOnce = false;
    const racing: MachineStore = {
      load: () => inner.load(),
      async save(next, expectedVersion) {
        if (!failedOnce) {
          failedOnce = true;
          const { state, version } = await inner.load();
          await inner.save(
            { ...state, cashBoxInPence: state.cashBoxInPence + 1 },
            version,
          );
          return inner.save(next, expectedVersion);
        }
        return inner.save(next, expectedVersion);
      },
    };
    const d = deps({ store: racing });
    const result = await purchase(request(), d);
    expect(result.ok).toBe(true);
    expect((await getSnapshot(inner)).cashBoxInPence).toBe(101);
  });

  it("hands out copies so callers cannot mutate the stored state", async () => {
    const store = createInMemoryStore();
    const { state } = await store.load();
    (state.coins as Record<number, number>)[200] = 0;
    expect((await store.load()).state.coins[200]).toBe(10);
  });

  it("refuses to overflow the cash box", async () => {
    const d = deps({
      store: createInMemoryStore({
        coins: createInitialInventory(),
        cashBoxInPence: Number.MAX_SAFE_INTEGER,
      }),
    });
    await expect(purchase(request({ paidInPence: 85 }), d)).rejects.toThrow(
      RangeError,
    );
    expect((await getSnapshot(d.store)).cashBoxInPence).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it("gives up after repeated conflicts", async () => {
    const inner = createInMemoryStore();
    const alwaysStale: MachineStore = {
      load: () => inner.load(),
      save: async () => false,
    };
    await expect(
      purchase(request(), deps({ store: alwaysStale })),
    ).rejects.toThrow();
  });
});
