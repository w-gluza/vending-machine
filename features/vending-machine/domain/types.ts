import type { z } from "zod";
import type {
  coinInventorySchema,
  coinStackSchema,
  machineSnapshotSchema,
  purchaseRefusalSchema,
  purchaseResultSchema,
} from "./schemas";

export const DENOMINATIONS = [200, 100, 50, 20, 10, 5, 2, 1] as const;

export type Denomination = (typeof DENOMINATIONS)[number];

export type CoinInventory = z.infer<typeof coinInventorySchema>;

export type CoinStack = z.infer<typeof coinStackSchema>;

export type MachineSnapshot = z.infer<typeof machineSnapshotSchema>;

export type PurchaseInput = {
  priceInPence: number;
  paidInPence: number;
};

export type PurchaseRefusal = z.infer<typeof purchaseRefusalSchema>;

export type PurchaseDecision =
  | {
      ok: true;
      changeDueInPence: number;
      change: CoinStack[];
      nextCoins: CoinInventory;
    }
  | PurchaseRefusal;

export type PurchaseResult = z.infer<typeof purchaseResultSchema>;
