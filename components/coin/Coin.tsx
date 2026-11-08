import styles from "./Coin.module.css";

type CoinMetal = "copper" | "silver" | "gold";

type CoinProps = {
  label: string;
  metal?: CoinMetal;
  size?: "s" | "m";
  count?: number;
  onClick?: () => void;
  disabled?: boolean;
};

export const Coin = ({
  label,
  metal = "silver",
  size = "m",
  count,
  onClick,
  disabled = false,
}: CoinProps) => {
  const className = `${styles.coin} ${styles[metal]} ${styles[size]}`;
  const content = (
    <>
      <span>{label}</span>
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </>
  );

  if (!onClick) {
    return (
      <span
        role="img"
        aria-label={
          count === undefined
            ? label
            : `${label}, ${count} ${count === 1 ? "coin" : "coins"}`
        }
        className={className}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Insert ${label}`}
    >
      {content}
    </button>
  );
};
