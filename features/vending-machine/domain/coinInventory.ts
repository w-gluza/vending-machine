import {
  DENOMINATIONS,
  type CoinInventory,
  type CoinStack,
  type Denomination,
} from "./types";

export const INITIAL_COINS_PER_DENOMINATION = 10;

export const isDenomination = (value: number): value is Denomination =>
  (DENOMINATIONS as readonly number[]).includes(value);

export const coinLabel = (denomination: Denomination): string =>
  denomination >= 100 ? `£${denomination / 100}` : `${denomination}p`;

export const coinMetal = (
  denomination: Denomination,
): "copper" | "silver" | "gold" => {
  if (denomination <= 2) return "copper";
  if (denomination <= 50) return "silver";
  return "gold";
};

const assertValidCount = (count: number, label: string): void => {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError(`Invalid coin count ${count} for ${label}`);
  }
};

export const assertValidInventory = (coins: CoinInventory): void => {
  for (const denomination of DENOMINATIONS) {
    if (!Object.hasOwn(coins, denomination)) {
      throw new RangeError(`Missing denomination ${denomination}p`);
    }
  }
  for (const [key, count] of Object.entries(coins)) {
    const denomination = Number(key);
    if (!isDenomination(denomination)) {
      throw new RangeError(`Unsupported denomination ${key}p`);
    }
    assertValidCount(count, `${key}p`);
  }
};

export const createInitialInventory = (
  perDenomination = INITIAL_COINS_PER_DENOMINATION,
): CoinInventory => {
  assertValidCount(perDenomination, "each denomination");
  return Object.fromEntries(
    DENOMINATIONS.map((d) => [d, perDenomination]),
  ) as CoinInventory;
};

export const inventoryTotal = (coins: CoinInventory): number =>
  DENOMINATIONS.reduce((sum, d) => sum + d * coins[d], 0);

export const inventoryToStacks = (coins: CoinInventory): CoinStack[] =>
  DENOMINATIONS.map((denomination) => ({
    denomination,
    count: coins[denomination],
  }));

export const coinsToStacks = (coins: readonly Denomination[]): CoinStack[] =>
  DENOMINATIONS.filter((d) => coins.includes(d)).map((denomination) => ({
    denomination,
    count: coins.filter((c) => c === denomination).length,
  }));

export const countCoins = (stacks: readonly CoinStack[]): number =>
  stacks.reduce((n, s) => n + s.count, 0);

export const stacksTotal = (stacks: readonly CoinStack[]): number =>
  stacks.reduce((n, s) => n + s.count * s.denomination, 0);

export const removeFromInventory = (
  coins: CoinInventory,
  stacks: readonly CoinStack[],
): CoinInventory => {
  assertValidInventory(coins);
  const next = { ...coins };
  for (const { denomination, count } of stacks) {
    if (!isDenomination(denomination)) {
      throw new RangeError(`Unsupported denomination ${denomination}p`);
    }
    assertValidCount(count, `${denomination}p`);
    if (next[denomination] < count) {
      throw new RangeError(
        `Inventory does not hold ${count} x ${denomination}p`,
      );
    }
    next[denomination] -= count;
  }
  return next;
};
