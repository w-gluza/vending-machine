import { decidePurchase } from "@/features/vending-machine/domain/decidePurchase";
import type {
  PurchaseRequest,
  PurchaseResult,
} from "@/features/vending-machine/domain/types";
import type { RateLimiter } from "@/server/rate-limit/rateLimiter";
import { toSnapshot } from "./getSnapshot";
import type { MachineStore } from "./store";

const MAX_SAVE_ATTEMPTS = 3;

export type PurchaseDependencies = {
  store: MachineStore;
  limiter: RateLimiter;
  now?: () => number;
};

export const purchase = async (
  request: PurchaseRequest,
  { store, limiter, now = Date.now }: PurchaseDependencies,
): Promise<PurchaseResult> => {
  const { customerId, priceInPence, paidInPence } = request;
  const context = { priceInPence, paidInPence };

  const gate = await limiter.attempt(customerId, now());
  if (!gate.allowed) {
    const { state } = await store.load();
    return {
      ok: false,
      reason: "rate_limited",
      message: `Too many purchases. Try again in ${(gate.retryAfterMs / 1000).toFixed(1)}s.`,
      retryAfterMs: gate.retryAfterMs,
      ...context,
      machine: toSnapshot(state),
    };
  }

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
