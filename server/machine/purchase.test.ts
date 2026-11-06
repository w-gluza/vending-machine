import { describe, expect, it } from "vitest";
import { createInitialInventory } from "@/features/vending-machine/domain/coinInventory";
import { getSnapshot } from "./getSnapshot";
import { createInMemoryStore } from "./inMemoryStore";
import { purchase, PurchaseConflictError } from "./purchase";
import type { MachineStore } from "./store";

const input = (
  overrides: Partial<{ priceInPence: number; paidInPence: number }> = {},
) => ({
  priceInPence: 85,
  paidInPence: 100,
  ...overrides,
});

describe("purchase", () => {
  it("dispenses, takes the payment into the cash box and removes change from the float", async () => {
    const store = createInMemoryStore();
    const result = await purchase(input(), store);
    expect(result).toMatchObject({
      ok: true,
      changeDueInPence: 15,
      change: [
        { denomination: 10, count: 1 },
        { denomination: 5, count: 1 },
      ],
    });
    const snapshot = await getSnapshot(store);
    expect(snapshot.cashBoxInPence).toBe(100);
    expect(snapshot.coins[10]).toBe(9);
    expect(snapshot.coins[5]).toBe(9);
    expect(snapshot.changeAvailableInPence).toBe(3880 - 15);
  });

  it("exact payment dispenses and changes nothing but the cash box", async () => {
    const store = createInMemoryStore();
    const result = await purchase(input({ paidInPence: 85 }), store);
    expect(result).toMatchObject({ ok: true, change: [] });
    const snapshot = await getSnapshot(store);
    expect(snapshot.coins).toEqual(createInitialInventory());
    expect(snapshot.cashBoxInPence).toBe(85);
  });

  it("refuses insufficient payment and leaves the machine untouched", async () => {
    const store = createInMemoryStore();
    const result = await purchase(input({ paidInPence: 50 }), store);
    expect(result).toMatchObject({
      ok: false,
      reason: "insufficient_payment",
      shortfallInPence: 35,
    });
    expect(await getSnapshot(store)).toMatchObject({
      coins: createInitialInventory(),
      cashBoxInPence: 0,
    });
  });

  it("refuses when change cannot be made and keeps the customer's money out of the box", async () => {
    const store = createInMemoryStore({
      coins: { ...createInitialInventory(0), 50: 1 },
      cashBoxInPence: 0,
    });
    const result = await purchase(
      input({ priceInPence: 50, paidInPence: 80 }),
      store,
    );
    expect(result).toMatchObject({ ok: false, reason: "cannot_make_change" });
    expect((await getSnapshot(store)).cashBoxInPence).toBe(0);
  });

  it("runs the float down until change becomes impossible", async () => {
    const store = createInMemoryStore();
    const results = [];
    for (let i = 0; i < 12; i++) {
      results.push(
        await purchase(input({ priceInPence: 1, paidInPence: 200 }), store),
      );
    }
    expect(results[0]).toMatchObject({ ok: true, changeDueInPence: 199 });
    expect(results.some((r) => r.ok)).toBe(true);
    expect(
      results.some((r) => !r.ok && r.reason === "cannot_make_change"),
    ).toBe(true);
    expect((await getSnapshot(store)).changeAvailableInPence).toBeLessThan(
      3880,
    );
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
        }
        return inner.save(next, expectedVersion);
      },
    };
    const result = await purchase(input(), racing);
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
    const store = createInMemoryStore({
      coins: createInitialInventory(),
      cashBoxInPence: Number.MAX_SAFE_INTEGER,
    });
    await expect(purchase(input({ paidInPence: 85 }), store)).rejects.toThrow(
      RangeError,
    );
    expect((await getSnapshot(store)).cashBoxInPence).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it("commits every one of several simultaneous purchases exactly once", async () => {
    const store = createInMemoryStore();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => purchase(input(), store)),
    );
    expect(results.every((r) => r.ok)).toBe(true);
    const snapshot = await getSnapshot(store);
    expect(snapshot.cashBoxInPence).toBe(600);
    expect(snapshot.coins[10]).toBe(4);
    expect(snapshot.coins[5]).toBe(4);
  });

  it("keeps serving purchases after one of them throws", async () => {
    const inner = createInMemoryStore();
    let loads = 0;
    const flaky: MachineStore = {
      load: () => {
        loads += 1;
        if (loads === 1) throw new Error("database hiccup");
        return inner.load();
      },
      save: (next, expectedVersion) => inner.save(next, expectedVersion),
    };
    const [first, second] = await Promise.allSettled([
      purchase(input(), flaky),
      purchase(input(), flaky),
    ]);
    expect(first.status).toBe("rejected");
    expect(second).toMatchObject({ status: "fulfilled", value: { ok: true } });
    expect((await getSnapshot(inner)).cashBoxInPence).toBe(100);
  });

  it("gives up after repeated conflicts", async () => {
    const inner = createInMemoryStore();
    const alwaysStale: MachineStore = {
      load: () => inner.load(),
      save: async () => false,
    };
    await expect(purchase(input(), alwaysStale)).rejects.toThrow(
      PurchaseConflictError,
    );
  });
});
