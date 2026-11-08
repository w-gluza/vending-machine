import { formatMoney } from "@/lib/formatMoney";
import type { MachineSnapshot } from "../../domain/types";
import styles from "./MachineStatus.module.css";

type MachineStatusProps = {
  id: string;
  snapshot: MachineSnapshot;
  className?: string;
};

export const MachineStatus = ({
  id,
  snapshot,
  className,
}: MachineStatusProps) => (
  <dl
    id={id}
    className={[styles.panel, className].filter(Boolean).join(" ")}
    aria-label="Inside the machine"
  >
    <div>
      <dt>Available change</dt>
      <dd>{formatMoney(snapshot.changeAvailableInPence)}</dd>
    </div>
    <div>
      <dt>Cash box</dt>
      <dd>{formatMoney(snapshot.cashBoxInPence)}</dd>
    </div>
  </dl>
);
