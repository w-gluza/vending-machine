import { formatMoney } from "@/lib/formatMoney";
import type { MachineSnapshot } from "../../domain/types";
import styles from "./MachineStatus.module.css";

type MachineStatusProps = {
  snapshot: MachineSnapshot;
  className?: string;
};

export const MachineStatus = ({ snapshot, className }: MachineStatusProps) => (
  <dl
    className={[styles.totals, className].filter(Boolean).join(" ")}
    aria-label="Inside the machine"
  >
    <div>
      <dt>Change</dt>
      <dd>{formatMoney(snapshot.changeAvailableInPence)}</dd>
    </div>
    <div>
      <dt>Cash box</dt>
      <dd>{formatMoney(snapshot.cashBoxInPence)}</dd>
    </div>
  </dl>
);
