import styles from "./CoinSlot.module.css";

type CoinSlotProps = {
  insertCount: number;
};

export const CoinSlot = ({ insertCount }: CoinSlotProps) => (
  <div className={styles.slot} aria-hidden="true">
    <span
      key={insertCount}
      className={insertCount > 0 ? styles.flash : undefined}
    />
  </div>
);
