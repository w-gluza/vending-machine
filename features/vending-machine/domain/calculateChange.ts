import { assertValidInventory, inventoryTotal } from "./coinInventory";
import {
  DENOMINATIONS,
  type CoinInventory,
  type CoinStack,
  type Denomination,
} from "./types";

const UNREACHABLE = Number.POSITIVE_INFINITY;

type Layer = {
  denomination: Denomination;
  best: readonly number[];
  used: readonly number[];
};

const assertValidAmount = (amount: number): void => {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new RangeError(
      `Change must be a non-negative integer, got ${amount}`,
    );
  }
};

const addDenomination = (
  best: readonly number[],
  denomination: Denomination,
  limit: number,
): Layer => {
  const next = best.slice();
  const used = new Array<number>(best.length).fill(0);

  for (let amount = 1; amount < best.length; amount++) {
    for (let k = 1; k <= limit && k * denomination <= amount; k++) {
      const prior = best[amount - k * denomination];
      if (prior === UNREACHABLE) continue;
      if (prior + k < next[amount]) {
        next[amount] = prior + k;
        used[amount] = k;
      }
    }
  }

  return { denomination, best: next, used };
};

const collectStacks = (
  layers: readonly Layer[],
  amount: number,
): CoinStack[] => {
  const stacks: CoinStack[] = [];
  let remaining = amount;

  for (let i = layers.length - 1; i >= 0; i--) {
    const { denomination, used } = layers[i];
    const count = used[remaining];
    if (count > 0) {
      stacks.push({ denomination, count });
      remaining -= count * denomination;
    }
  }

  return stacks.sort((a, b) => b.denomination - a.denomination);
};

export const calculateChange = (
  amount: number,
  coins: CoinInventory,
): CoinStack[] | null => {
  assertValidAmount(amount);
  assertValidInventory(coins);
  if (amount === 0) return [];
  if (amount > inventoryTotal(coins)) return null;

  const initial: readonly number[] = [
    0,
    ...new Array<number>(amount).fill(UNREACHABLE),
  ];

  const layers = DENOMINATIONS.filter((d) => coins[d] > 0).reduce<Layer[]>(
    (acc, denomination) => {
      const best = acc.length ? acc[acc.length - 1].best : initial;
      return [...acc, addDenomination(best, denomination, coins[denomination])];
    },
    [],
  );

  const final = layers.length ? layers[layers.length - 1].best : initial;
  if (final[amount] === UNREACHABLE) return null;

  return collectStacks(layers, amount);
};
