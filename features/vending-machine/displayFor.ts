import type { DisplayTone } from "./components/cabinet/display/Display";
import { stacksTotal } from "./domain/coinInventory";
import type { CoinStack, PurchaseResult } from "./domain/types";

export type DisplayMessage =
  { kind: "outcome" } | { kind: "returned"; amountInPence: number };

export type MachineDisplay = {
  tone: DisplayTone;
  message: DisplayMessage;
  change: readonly CoinStack[];
};

export const displayFor = (
  result: PurchaseResult | null,
  error: string | null,
  returnedCoins: readonly CoinStack[],
): MachineDisplay => {
  if (error)
    return { tone: "refused", message: { kind: "outcome" }, change: [] };
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
  return { tone: "neutral", message: { kind: "outcome" }, change: [] };
};
