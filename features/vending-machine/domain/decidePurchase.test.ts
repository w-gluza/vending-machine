import { describe, expect, it } from "vitest";
import { createInitialInventory } from "./coinInventory";
import { decidePurchase } from "./decidePurchase";
import type { CoinInventory, PurchaseDecision } from "./types";

const frozen = (coins: CoinInventory): CoinInventory =>
  Object.freeze({ ...coins });

const dispensed = (decision: PurchaseDecision) => {
  if (!decision.ok)
    throw new Error(`Expected dispense, got ${decision.reason}`);
  return decision;
};

describe("decidePurchase", () => {
  it("dispenses with no change on exact payment and leaves coins untouched", () => {
    const coins = frozen(createInitialInventory());
    const decision = dispensed(
      decidePurchase(coins, { priceInPence: 120, paidInPence: 120 }),
    );
    expect(decision.changeDueInPence).toBe(0);
    expect(decision.change).toEqual([]);
    expect(decision.nextCoins).toEqual(coins);
  });

  it("dispenses with the fewest coins and removes them from the supply", () => {
    const coins = frozen(createInitialInventory());
    const decision = dispensed(
      decidePurchase(coins, { priceInPence: 85, paidInPence: 200 }),
    );
    expect(decision.changeDueInPence).toBe(115);
    expect(decision.change).toEqual([
      { denomination: 100, count: 1 },
      { denomination: 10, count: 1 },
      { denomination: 5, count: 1 },
    ]);
    expect(decision.nextCoins).toEqual({ ...coins, 100: 9, 10: 9, 5: 9 });
    expect(coins[100]).toBe(10);
  });

  it("refuses insufficient payment with the shortfall and keeps coins unchanged", () => {
    const coins = frozen(createInitialInventory());
    const decision = decidePurchase(coins, {
      priceInPence: 100,
      paidInPence: 70,
    });
    expect(decision).toEqual({
      ok: false,
      reason: "insufficient_payment",
      message: "Not enough money inserted.",
      shortfallInPence: 30,
    });
    expect(coins).toEqual(createInitialInventory());
  });

  it("refuses zero payment for a priced item", () => {
    const decision = decidePurchase(createInitialInventory(), {
      priceInPence: 85,
      paidInPence: 0,
    });
    expect(decision).toMatchObject({
      ok: false,
      reason: "insufficient_payment",
      shortfallInPence: 85,
    });
  });

  it("dispenses a free item with zero payment", () => {
    const decision = dispensed(
      decidePurchase(createInitialInventory(), {
        priceInPence: 0,
        paidInPence: 0,
      }),
    );
    expect(decision.change).toEqual([]);
  });

  it("does not modify inventory when change is unavailable", () => {
    const coins = frozen({ ...createInitialInventory(0), 50: 1 });
    const decision = decidePurchase(coins, {
      priceInPence: 50,
      paidInPence: 80,
    });
    expect(decision).toMatchObject({ ok: false, reason: "cannot_make_change" });
    expect(coins[50]).toBe(1);
  });

  it("gives change only from the machine's own stock, never from the inserted money", () => {
    const empty = frozen(createInitialInventory(0));
    const decision = decidePurchase(empty, {
      priceInPence: 50,
      paidInPence: 100,
    });
    expect(decision).toMatchObject({ ok: false, reason: "cannot_make_change" });
  });

  it("refuses when the machine holds enough money but not the right coins", () => {
    const coins = frozen({ ...createInitialInventory(0), 2: 10 });
    const decision = decidePurchase(coins, {
      priceInPence: 95,
      paidInPence: 100,
    });
    expect(decision).toMatchObject({ ok: false, reason: "cannot_make_change" });
  });

  it.each([
    ["price", { priceInPence: -1, paidInPence: 100 }],
    ["price", { priceInPence: 1.5, paidInPence: 100 }],
    ["price", { priceInPence: NaN, paidInPence: 100 }],
    ["payment", { priceInPence: 100, paidInPence: -1 }],
    ["payment", { priceInPence: 100, paidInPence: 99.5 }],
    ["payment", { priceInPence: 100, paidInPence: NaN }],
    ["payment", { priceInPence: 100, paidInPence: Infinity }],
  ])("throws on an invalid %s", (_label, request) => {
    expect(() => decidePurchase(createInitialInventory(), request)).toThrow(
      RangeError,
    );
  });
});
