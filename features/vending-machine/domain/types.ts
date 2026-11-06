export const DENOMINATIONS = [200, 100, 50, 20, 10, 5, 2, 1] as const;

export type Denomination = (typeof DENOMINATIONS)[number];

export type CoinInventory = Record<Denomination, number>;

export type CoinStack = {
  denomination: Denomination;
  count: number;
};

export type MachineSnapshot = {
  coins: CoinInventory;
  changeAvailableInPence: number;
  cashBoxInPence: number;
};

export type PurchaseInput = {
  priceInPence: number;
  paidInPence: number;
};

export type PurchaseRequest = PurchaseInput & {
  customerId: string;
};

export type PurchaseRefusalReason =
  "insufficient_payment" | "cannot_make_change";

export type RefusalReason = PurchaseRefusalReason | "rate_limited";

export type PurchaseRefusal =
  | {
      ok: false;
      reason: "insufficient_payment";
      message: string;
      shortfallInPence: number;
    }
  | {
      ok: false;
      reason: "cannot_make_change";
      message: string;
    };

export type RateLimitRefusal = {
  ok: false;
  reason: "rate_limited";
  message: string;
  retryAfterMs: number;
};

export type PurchaseDecision =
  | {
      ok: true;
      changeDueInPence: number;
      change: CoinStack[];
      nextCoins: CoinInventory;
    }
  | PurchaseRefusal;

type ResultContext = {
  priceInPence: number;
  paidInPence: number;
  machine: MachineSnapshot;
};

export type PurchaseResult =
  | ({
      ok: true;
      changeDueInPence: number;
      change: CoinStack[];
    } & ResultContext)
  | ((PurchaseRefusal | RateLimitRefusal) & ResultContext);
