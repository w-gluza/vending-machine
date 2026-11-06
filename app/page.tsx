import { VendingMachineScreen } from "@/features/vending-machine";
import { getInstances } from "@/server/instance";
import { getSnapshot } from "@/server/machine/getSnapshot";

export const dynamic = "force-dynamic";

export default async function Home() {
  const snapshot = await getSnapshot(getInstances().store);
  return (
    <main>
      <h1>Vending machine</h1>
      <VendingMachineScreen initialSnapshot={snapshot} />
    </main>
  );
}
