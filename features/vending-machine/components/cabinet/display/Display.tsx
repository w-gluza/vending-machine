import type { ReactNode } from "react";
import styles from "./Display.module.css";

export type DisplayTone = "neutral" | "ok" | "refused";

type DisplayProps = {
  productName: string | null;
  price: string | null;
  inserted: string;
  message: ReactNode;
  tone?: DisplayTone;
};

export const Display = ({
  productName,
  price,
  inserted,
  message,
  tone = "neutral",
}: DisplayProps) => (
  <output className={styles.display} aria-live="polite">
    <p className={styles.credit}>
      <span className={styles.label}>Inserted</span> <strong>{inserted}</strong>
    </p>
    <p className={styles.product}>
      <span className={styles.label}>Product</span>
      <span>{productName ?? "None selected"}</span>{" "}
      <strong>{price ?? "-"}</strong>
    </p>
    <div className={`${styles.message} ${styles[tone]}`}>{message}</div>
  </output>
);
