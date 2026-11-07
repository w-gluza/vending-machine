import { VendingMachine } from "@/features/vending-machine";
import { getInstances } from "@/server/instance";
import { getSnapshot } from "@/server/machine/getSnapshot";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const snapshot = await getSnapshot(getInstances().store);
  return (
    <main className={styles.scene}>
      <VendingMachine initialSnapshot={snapshot} />
    </main>
  );
}
