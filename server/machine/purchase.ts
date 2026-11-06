import { decidePurchase } from "@/features/vending-machine/domain/decidePurchase";
import type {
  PurchaseInput,
  PurchaseResult,
} from "@/features/vending-machine/domain/types";
import { toSnapshot } from "./getSnapshot";
import type { MachineStore } from "./store";

const MAX_SAVE_ATTEMPTS = 3;

export const purchase = async (
  input: PurchaseInput,
  store: MachineStore,
): Promise<PurchaseResult> => {
  const { priceInPence, paidInPence } = input;
  const context = { priceInPence, paidInPence };

  for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt++) {
    const { state, version } = await store.load();
    const decision = decidePurchase(state.coins, context);

    if (!decision.ok) {
      return { ...decision, ...context, machine: toSnapshot(state) };
    }

    const cashBoxInPence = state.cashBoxInPence + paidInPence;
    if (!Number.isSafeInteger(cashBoxInPence)) {
      throw new RangeError("Cash box total exceeds the safe integer range");
    }

    const next = { coins: decision.nextCoins, cashBoxInPence };

    if (await store.save(next, version)) {
      return {
        ok: true,
        changeDueInPence: decision.changeDueInPence,
        change: decision.change,
        ...context,
        machine: toSnapshot(next),
      };
    }
  }

  throw new Error("Purchase could not be committed after concurrent updates");
};
