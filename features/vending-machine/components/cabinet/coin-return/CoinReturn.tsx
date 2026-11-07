import { Coin } from "@/components/coin/Coin";
import { coinLabel, coinMetal } from "../../../domain/coinInventory";
import type { CoinStack } from "../../../domain/types";
import styles from "./CoinReturn.module.css";

type CoinReturnProps = {
  coins: readonly CoinStack[];
};

export const CoinReturn = ({ coins }: CoinReturnProps) => (
  <ul className={styles.cup} aria-label="Coin return">
    {coins.map((stack) => (
      <li key={stack.denomination}>
        <Coin
          label={coinLabel(stack.denomination)}
          metal={coinMetal(stack.denomination)}
          count={stack.count}
          size="s"
        />
      </li>
    ))}
  </ul>
);
