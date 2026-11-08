import { Coin } from "@/components/coin/Coin";
import { coinLabel, coinMetal } from "../../domain/coinInventory";
import { DENOMINATIONS, type Denomination } from "../../domain/types";
import styles from "./Wallet.module.css";

type WalletProps = {
  onInsert: (denomination: Denomination) => void;
  disabled?: boolean;
  className?: string;
};

export const Wallet = ({
  onInsert,
  disabled = false,
  className,
}: WalletProps) => (
  <ul
    className={[styles.coins, className].filter(Boolean).join(" ")}
    aria-label="Your coins"
  >
    {DENOMINATIONS.map((denomination) => (
      <li key={denomination}>
        <Coin
          label={coinLabel(denomination)}
          metal={coinMetal(denomination)}
          onClick={() => onInsert(denomination)}
          disabled={disabled}
        />
      </li>
    ))}
  </ul>
);
