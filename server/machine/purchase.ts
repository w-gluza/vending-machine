import { decidePurchase } from "@/features/vending-machine/domain/decidePurchase";
import type {
  PurchaseInput,
  PurchaseResult,
} from "@/features/vending-machine/domain/types";
import { toSnapshot } from "./getSnapshot";
import type { MachineStore } from "./store";

const MAX_SAVE_ATTEMPTS = 3;

export class PurchaseConflictError extends Error {
  constructor() {
    super("Purchase could not be committed after concurrent updates");
    this.name = "PurchaseConflictError";
  }
}

const queues = new WeakMap<MachineStore, Promise<unknown>>();

const serialise = <T>(
  store: MachineStore,
  task: () => Promise<T>,
): Promise<T> => {
  const previous = queues.get(store) ?? Promise.resolve();
  const run = previous.then(task, task);
  queues.set(
    store,
    run.catch(() => undefined),
  );
  return run;
};

const commitPurchase = async (
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

  throw new PurchaseConflictError();
};

export const purchase = (
  input: PurchaseInput,
  store: MachineStore,
): Promise<PurchaseResult> =>
  serialise(store, () => commitPurchase(input, store));
