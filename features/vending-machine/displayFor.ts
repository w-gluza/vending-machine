import type { DisplayTone } from "./components/cabinet/display/Display";
import { stacksTotal } from "./domain/coinInventory";
import {
  MAX_CREDIT_IN_PENCE,
  type CoinStack,
  type PurchaseResult,
} from "./domain/types";

export type DisplayMessage =
  | { kind: "outcome" }
  | { kind: "returned"; amountInPence: number }
  | { kind: "max_credit"; maxInPence: number };

export type MachineDisplay = {
  tone: DisplayTone;
  message: DisplayMessage;
  change: readonly CoinStack[];
};

export const displayFor = (
  result: PurchaseResult | null,
  error: string | null,
  returnedCoins: readonly CoinStack[],
  insertedInPence: number,
): MachineDisplay => {
  if (error) {
    return { tone: "refused", message: { kind: "outcome" }, change: [] };
  }
  if (result) {
    return result.ok
      ? { tone: "ok", message: { kind: "outcome" }, change: result.change }
      : { tone: "refused", message: { kind: "outcome" }, change: [] };
  }
  if (returnedCoins.length > 0) {
    return {
      tone: "neutral",
      message: { kind: "returned", amountInPence: stacksTotal(returnedCoins) },
      change: returnedCoins,
    };
  }
  if (insertedInPence >= MAX_CREDIT_IN_PENCE) {
    return {
      tone: "neutral",
      message: { kind: "max_credit", maxInPence: MAX_CREDIT_IN_PENCE },
      change: [],
    };
  }
  return { tone: "neutral", message: { kind: "outcome" }, change: [] };
};
