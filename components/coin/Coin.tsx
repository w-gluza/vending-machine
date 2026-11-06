import styles from "./Coin.module.css";

type CoinProps = {
  label: string;
  count?: number;
  onClick?: () => void;
  disabled?: boolean;
};

export const Coin = ({
  label,
  count,
  onClick,
  disabled = false,
}: CoinProps) => {
  const content = (
    <>
      <span>{label}</span>
      {count !== undefined && <span className={styles.count}>x{count}</span>}
    </>
  );

  if (!onClick) {
    return <span className={styles.coin}>{content}</span>;
  }

  return (
    <button
      type="button"
      className={styles.coin}
      onClick={onClick}
      disabled={disabled}
      aria-label={`Insert ${label}`}
    >
      {content}
    </button>
  );
};
