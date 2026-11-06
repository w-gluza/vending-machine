import { describe, expect, it } from "vitest";
import {
  coinLabel,
  countCoins,
  createInitialInventory,
  inventoryToStacks,
  inventoryTotal,
  removeFromInventory,
  stacksTotal,
} from "./coinInventory";
import { DENOMINATIONS, type CoinInventory } from "./types";

describe("createInitialInventory", () => {
  it("starts with ten of every denomination by default", () => {
    const coins = createInitialInventory();
    for (const d of DENOMINATIONS) expect(coins[d]).toBe(10);
    expect(inventoryTotal(coins)).toBe(3880);
  });

  it.each([-10, 1.5, NaN, Infinity])("rejects %s per denomination", (n) => {
    expect(() => createInitialInventory(n)).toThrow(RangeError);
  });
});

describe("coinLabel", () => {
  it.each([
    [1, "1p"],
    [2, "2p"],
    [50, "50p"],
    [100, "£1"],
    [200, "£2"],
  ] as const)("labels %i as %s", (denomination, expected) => {
    expect(coinLabel(denomination)).toBe(expected);
  });
});

describe("inventoryToStacks", () => {
  it("lists every denomination, including empty ones, largest first", () => {
    const stacks = inventoryToStacks({ ...createInitialInventory(0), 50: 2 });
    expect(stacks.map((s) => s.denomination)).toEqual([...DENOMINATIONS]);
    expect(stacks.find((s) => s.denomination === 50)?.count).toBe(2);
    expect(stacks.find((s) => s.denomination === 1)?.count).toBe(0);
  });
});

describe("countCoins and stacksTotal", () => {
  it("sum counts and values", () => {
    const stacks = [
      { denomination: 50, count: 1 },
      { denomination: 2, count: 3 },
    ] as const;
    expect(countCoins(stacks)).toBe(4);
    expect(stacksTotal(stacks)).toBe(56);
  });
});

describe("removeFromInventory", () => {
  it("returns a new inventory and leaves the input untouched", () => {
    const coins = Object.freeze(createInitialInventory());
    const next = removeFromInventory(coins, [{ denomination: 20, count: 3 }]);
    expect(next[20]).toBe(7);
    expect(coins[20]).toBe(10);
  });

  it("refuses to remove more than the machine holds", () => {
    expect(() =>
      removeFromInventory(createInitialInventory(), [
        { denomination: 5, count: 11 },
      ]),
    ).toThrow(RangeError);
  });

  it.each([-5, 1.5, NaN])("refuses a count of %s", (count) => {
    expect(() =>
      removeFromInventory(createInitialInventory(), [
        { denomination: 5, count },
      ]),
    ).toThrow(RangeError);
  });

  it("refuses an inventory with a missing denomination", () => {
    const missing = Object.fromEntries(
      Object.entries(createInitialInventory()).filter(([key]) => key !== "5"),
    ) as CoinInventory;
    expect(() => removeFromInventory(missing, [])).toThrow(RangeError);
  });

  it("refuses an inventory with a malformed count before subtracting", () => {
    const bad = { ...createInitialInventory(), 10: NaN } as CoinInventory;
    expect(() =>
      removeFromInventory(bad, [{ denomination: 10, count: 1 }]),
    ).toThrow(RangeError);
  });

  it("refuses an unknown denomination", () => {
    const bad = [{ denomination: 25, count: 1 }] as unknown as Parameters<
      typeof removeFromInventory
    >[1];
    expect(() => removeFromInventory(createInitialInventory(), bad)).toThrow(
      RangeError,
    );
  });
});
