import { formatMoney } from "@/lib/formatMoney";
import type { PurchaseResult } from "../../../domain/types";
import styles from "./Outcome.module.css";

type OutcomeProps = {
  result: PurchaseResult | null;
  error: string | null;
};

export const Outcome = ({ result, error }: OutcomeProps) => {
  if (error) return <p>{error}</p>;
  if (!result) return <p>Choose a drink, insert your coins, and press Buy.</p>;

  if (result.ok) {
    return (
      <div className={styles.outcome}>
        <p>
          Dispensed. Paid {formatMoney(result.paidInPence)} for{" "}
          {formatMoney(result.priceInPence)}.
        </p>
        <p>
          {result.change.length === 0
            ? "Exact payment, no change."
            : `Change ${formatMoney(result.changeDueInPence)}.`}
        </p>
      </div>
    );
  }

  if (result.reason === "insufficient_payment") {
    return (
      <p>
        {`You're ${formatMoney(result.shortfallInPence)} short. Please add a few more coins.`}
      </p>
    );
  }
  if (result.reason === "cannot_make_change") {
    return (
      <div className={styles.outcome}>
        <p>Cannot give change.</p>
        <p>Pay the exact amount.</p>
      </div>
    );
  }
  return (
    <div className={styles.outcome}>
      <p>Too many tries.</p>
      <p>Wait {(result.retryAfterMs / 1000).toFixed(1)}s,</p>
      <p>then press Buy.</p>
    </div>
  );
};
