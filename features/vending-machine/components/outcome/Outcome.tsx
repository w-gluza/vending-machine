import { Coin } from "@/components/coin/Coin";
import { formatMoney } from "@/lib/formatMoney";
import { coinLabel } from "../../domain/coinInventory";
import type { PurchaseResult } from "../../domain/types";
import styles from "./Outcome.module.css";

type OutcomeProps = {
  result: PurchaseResult | null;
  error: string | null;
};

export const Outcome = ({ result, error }: OutcomeProps) => {
  if (error) return <p className={styles.refused}>{error}</p>;
  if (!result) return <p>Pick a product, insert coins, press Buy.</p>;

  if (result.ok) {
    return (
      <div className={styles.outcome}>
        <p>
          Dispensed. Paid {formatMoney(result.paidInPence)} for{" "}
          {formatMoney(result.priceInPence)}.
        </p>
        {result.change.length === 0 ? (
          <p>Exact payment, no change.</p>
        ) : (
          <>
            <p>Change {formatMoney(result.changeDueInPence)}:</p>
            <ul className={styles.coins}>
              {result.change.map((stack) => (
                <li key={stack.denomination}>
                  <Coin
                    label={coinLabel(stack.denomination)}
                    count={stack.count}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={styles.outcome}>
      <p className={styles.refused}>Refused: {result.message}</p>
      {result.reason === "insufficient_payment" && (
        <p>
          Short by {formatMoney(result.shortfallInPence)}. Insert more coins.
        </p>
      )}
      {result.reason === "cannot_make_change" && (
        <p>Return your coins and pay the exact amount.</p>
      )}
      {result.reason === "rate_limited" && (
        <p>
          Wait {(result.retryAfterMs / 1000).toFixed(1)}s and press Buy again.
        </p>
      )}
    </div>
  );
};
