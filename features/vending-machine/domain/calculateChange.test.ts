import { describe, expect, it } from "vitest";
import { calculateChange } from "./calculateChange";
import {
  countCoins,
  createInitialInventory,
  stacksTotal,
} from "./coinInventory";
import { DENOMINATIONS, type CoinInventory } from "./types";

const bruteForce = (amount: number, coins: CoinInventory): number | null => {
  let bestCount: number | null = null;
  const walk = (index: number, remaining: number, count: number) => {
    if (remaining === 0) {
      bestCount = bestCount === null ? count : Math.min(bestCount, count);
      return;
    }
    if (index === DENOMINATIONS.length) return;
    const d = DENOMINATIONS[index];
    for (let k = 0; k <= coins[d] && k * d <= remaining; k++) {
      walk(index + 1, remaining - k * d, count + k);
    }
  };
  walk(0, amount, 0);
  return bestCount;
};

const inventory = (overrides: Partial<CoinInventory> = {}): CoinInventory => ({
  ...createInitialInventory(0),
  ...overrides,
});

describe("calculateChange", () => {
  it("returns no coins for zero change", () => {
    expect(calculateChange(0, createInitialInventory())).toEqual([]);
  });

  it("uses the fewest coins when every denomination is available", () => {
    const change = calculateChange(388, createInitialInventory());
    expect(change).toEqual([
      { denomination: 200, count: 1 },
      { denomination: 100, count: 1 },
      { denomination: 50, count: 1 },
      { denomination: 20, count: 1 },
      { denomination: 10, count: 1 },
      { denomination: 5, count: 1 },
      { denomination: 2, count: 1 },
      { denomination: 1, count: 1 },
    ]);
  });

  it("beats greedy when the greedy path runs out of coins", () => {
    const change = calculateChange(60, inventory({ 50: 1, 20: 3 }));
    expect(change).toEqual([{ denomination: 20, count: 3 }]);
  });

  it("falls back to smaller coins when large ones are exhausted", () => {
    const change = calculateChange(100, inventory({ 50: 1, 20: 2, 10: 1 }));
    expect(change).toEqual([
      { denomination: 50, count: 1 },
      { denomination: 20, count: 2 },
      { denomination: 10, count: 1 },
    ]);
  });

  it("returns null when the amount cannot be made", () => {
    expect(calculateChange(3, inventory({ 2: 1 }))).toBeNull();
    expect(calculateChange(1, inventory({ 2: 10, 5: 10 }))).toBeNull();
    expect(calculateChange(10, inventory())).toBeNull();
  });

  it("never uses more of a denomination than the machine holds", () => {
    const coins = inventory({ 2: 2, 1: 1 });
    const change = calculateChange(5, coins);
    expect(change).toEqual([
      { denomination: 2, count: 2 },
      { denomination: 1, count: 1 },
    ]);
    expect(calculateChange(6, coins)).toBeNull();
  });

  it("returns combinations that sum to the requested amount", () => {
    const coins = inventory({ 50: 1, 20: 4, 5: 3, 2: 5, 1: 2 });
    for (let amount = 1; amount <= 150; amount++) {
      const change = calculateChange(amount, coins);
      if (change === null) continue;
      expect(stacksTotal(change)).toBe(amount);
      expect(countCoins(change)).toBeGreaterThan(0);
    }
  });

  it("matches an exhaustive search on small inventories", () => {
    const inventories = [
      inventory({ 50: 1, 20: 3 }),
      inventory({ 100: 1, 20: 2, 5: 3, 2: 4, 1: 1 }),
      inventory({ 200: 1, 50: 2, 10: 1, 2: 6 }),
      inventory({ 5: 2, 2: 3, 1: 2 }),
    ];
    for (const coins of inventories) {
      for (let amount = 0; amount <= 120; amount++) {
        const change = calculateChange(amount, coins);
        const expected = bruteForce(amount, coins);
        if (expected === null) {
          expect(change).toBeNull();
        } else {
          expect(change).not.toBeNull();
          expect(countCoins(change!)).toBe(expected);
          expect(stacksTotal(change!)).toBe(amount);
          for (const { denomination, count } of change!) {
            expect(count).toBeLessThanOrEqual(coins[denomination]);
          }
        }
      }
    }
  });

  it("does not mutate the supplied inventory", () => {
    const coins = Object.freeze(inventory({ 50: 1, 20: 3, 1: 4 }));
    const before = { ...coins };
    calculateChange(73, coins);
    expect(coins).toEqual(before);
  });

  it("is deterministic across repeated calls", () => {
    const coins = inventory({ 20: 2, 10: 4, 5: 8 });
    expect(calculateChange(40, coins)).toEqual(calculateChange(40, coins));
  });

  it.each([NaN, Infinity, -Infinity, 1.5, -1, Number.MAX_SAFE_INTEGER + 2])(
    "rejects invalid change amount %s",
    (amount) => {
      expect(() => calculateChange(amount, inventory())).toThrow(RangeError);
    },
  );

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 2])(
    "rejects invalid inventory count %s",
    (count) => {
      expect(() => calculateChange(10, inventory({ 10: count }))).toThrow(
        RangeError,
      );
    },
  );

  it("rejects an inventory with an unknown denomination", () => {
    const unknown = {
      ...inventory({ 10: 1 }),
      25: 1,
    } as unknown as CoinInventory;
    expect(() => calculateChange(10, unknown)).toThrow(RangeError);
  });

  it("returns null without searching when the amount exceeds all coins held", () => {
    const start = performance.now();
    expect(calculateChange(50_000_000, inventory({ 1: 3 }))).toBeNull();
    expect(performance.now() - start).toBeLessThan(50);
  });

  it("keeps exact counts above 255 of one denomination", () => {
    const change = calculateChange(300, inventory({ 1: 300 }));
    expect(change).toEqual([{ denomination: 1, count: 300 }]);
  });
});
