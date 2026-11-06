import { Button } from "@/components/button/Button";
import { Coin } from "@/components/coin/Coin";
import { formatMoney } from "@/lib/formatMoney";
import { coinLabel } from "../../domain/coinInventory";
import { DENOMINATIONS, type Denomination } from "../../domain/types";
import styles from "./CoinTray.module.css";

type CoinTrayProps = {
  insertedInPence: number;
  onInsert: (denomination: Denomination) => void;
  onReturn: () => void;
  disabled?: boolean;
};

export const CoinTray = ({
  insertedInPence,
  onInsert,
  onReturn,
  disabled = false,
}: CoinTrayProps) => (
  <div className={styles.tray}>
    <ul className={styles.coins}>
      {DENOMINATIONS.map((denomination) => (
        <li key={denomination}>
          <Coin
            label={coinLabel(denomination)}
            onClick={() => onInsert(denomination)}
            disabled={disabled}
          />
        </li>
      ))}
    </ul>
    <p>
      Inserted: <strong>{formatMoney(insertedInPence)}</strong>
    </p>
    <Button onClick={onReturn} disabled={disabled || insertedInPence === 0}>
      Return coins
    </Button>
  </div>
);
