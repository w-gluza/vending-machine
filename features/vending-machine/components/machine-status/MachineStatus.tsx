import { Card } from "@/components/card/Card";
import { Coin } from "@/components/coin/Coin";
import { formatMoney } from "@/lib/formatMoney";
import {
  coinLabel,
  coinMetal,
  inventoryToStacks,
} from "../../domain/coinInventory";
import type { MachineSnapshot } from "../../domain/types";
import styles from "./MachineStatus.module.css";

type MachineStatusProps = {
  snapshot: MachineSnapshot;
};

export const MachineStatus = ({ snapshot }: MachineStatusProps) => (
  <Card title="Inside the machine">
    <ul className={styles.coins}>
      {inventoryToStacks(snapshot.coins).map((stack) => (
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
    <div className={styles.totals}>
      <p>Change available: {formatMoney(snapshot.changeAvailableInPence)}.</p>
      <p>Cash box: {formatMoney(snapshot.cashBoxInPence)}.</p>
    </div>
  </Card>
);
