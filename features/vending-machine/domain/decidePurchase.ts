import { calculateChange } from "./calculateChange";
import { removeFromInventory } from "./coinInventory";
import type { CoinInventory, PurchaseDecision, PurchaseInput } from "./types";

const assertValidPence = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`Invalid ${label} ${value}`);
  }
};

export const decidePurchase = (
  coins: CoinInventory,
  input: PurchaseInput,
): PurchaseDecision => {
  const { priceInPence, paidInPence } = input;
  assertValidPence(priceInPence, "price");
  assertValidPence(paidInPence, "payment");

  if (paidInPence < priceInPence) {
    return {
      ok: false,
      reason: "insufficient_payment",
      message: "Not enough money inserted.",
      shortfallInPence: priceInPence - paidInPence,
    };
  }

  const changeDueInPence = paidInPence - priceInPence;
  const change = calculateChange(changeDueInPence, coins);

  if (change === null) {
    return {
      ok: false,
      reason: "cannot_make_change",
      message: "The machine cannot give exact change for this payment.",
    };
  }

  return {
    ok: true,
    changeDueInPence,
    change,
    nextCoins: removeFromInventory(coins, change),
  };
};
