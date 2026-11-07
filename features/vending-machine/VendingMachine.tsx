"use client";

import { useEffect, useState } from "react";
import { customers } from "@/data/customers";
import { catalogue } from "@/data/catalogues";
import { formatMoney } from "@/lib/formatMoney";
import { coinsToStacks, stacksTotal } from "./domain/coinInventory";
import type {
  CoinStack,
  Denomination,
  MachineSnapshot,
  PurchaseResult,
} from "./domain/types";
import { usePurchase } from "./hooks/usePurchase";
import { MachineStatus } from "./components/machine-status/MachineStatus";
import { UserControls } from "./components/user-controls/UserControls";
import type { DisplayTone } from "./components/cabinet/display/Display";
import { Outcome } from "./components/cabinet/outcome/Outcome";
import { Cabinet } from "./components/cabinet/Cabinet";
import { Wallet } from "./components/wallet/Wallet";
import styles from "./VendingMachine.module.css";

const SUCCESS_DISPLAY_MS = 5_000;

const toneFor = (
  result: PurchaseResult | null,
  error: string | null,
): DisplayTone => {
  if (error) return "refused";
  if (!result) return "neutral";
  return result.ok ? "ok" : "refused";
};

type VendingMachineProps = {
  initialSnapshot: MachineSnapshot;
};

export const VendingMachine = ({ initialSnapshot }: VendingMachineProps) => {
  const [customerId, setCustomerId] = useState(customers[0]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [insertedCoins, setInsertedCoins] = useState<Denomination[]>([]);
  const [returnedCoins, setReturnedCoins] = useState<CoinStack[]>([]);
  const { snapshot, result, error, isPurchasing, purchase, clearOutcome } =
    usePurchase(initialSnapshot);

  const { products } = catalogue;
  const selectedProduct =
    products.find((p) => p.id === selectedProductId) ?? null;
  const insertedInPence = insertedCoins.reduce((sum, coin) => sum + coin, 0);

  useEffect(() => {
    if (!result?.ok) return;
    const timer = setTimeout(clearOutcome, SUCCESS_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [result, clearOutcome]);

  const startInteraction = () => {
    clearOutcome();
    setReturnedCoins([]);
  };

  const selectCustomer = (id: string) => {
    startInteraction();
    setCustomerId(id);
  };

  const selectProduct = (id: string) => {
    startInteraction();
    setSelectedProductId(id);
  };

  const insert = (denomination: Denomination) => {
    startInteraction();
    setInsertedCoins((coins) => [...coins, denomination]);
  };

  const returnCoins = () => {
    clearOutcome();
    setReturnedCoins(coinsToStacks(insertedCoins));
    setInsertedCoins([]);
  };

  const handlePurchase = async () => {
    if (isPurchasing || !selectedProduct) return;
    const outcome = await purchase(
      customerId,
      selectedProduct.id,
      insertedInPence,
    );
    if (!outcome?.ok) return;
    setInsertedCoins([]);
    setSelectedProductId(null);
  };

  return (
    <div className={styles.stage}>
      <Cabinet
        brand={catalogue.brand}
        products={products}
        selectedProduct={selectedProduct}
        onSelectProduct={selectProduct}
        insertedInPence={insertedInPence}
        insertCount={insertedCoins.length}
        message={
          returnedCoins.length > 0 && !result && !error ? (
            <p>Returned {formatMoney(stacksTotal(returnedCoins))}.</p>
          ) : (
            <Outcome result={result} error={error} />
          )
        }
        tone={toneFor(result, error)}
        change={result?.ok ? result.change : returnedCoins}
        onPurchase={handlePurchase}
        onReturn={returnCoins}
        isPurchasing={isPurchasing}
      />
      <aside className={styles.side}>
        <UserControls
          customers={customers}
          customerId={customerId}
          onSelect={selectCustomer}
          disabled={isPurchasing}
        />
        <Wallet onInsert={insert} disabled={isPurchasing} />
        <MachineStatus snapshot={snapshot} />
      </aside>
    </div>
  );
};
