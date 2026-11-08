"use client";

import { useState } from "react";
import { Button } from "@/components/button/Button";
import { ResetIcon } from "@/components/icons/ResetIcon";
import { customers } from "@/data/customers";
import { catalogue } from "@/data/catalogues";
import { formatMoney } from "@/lib/formatMoney";
import { coinsToStacks } from "./domain/coinInventory";
import type { CoinStack, Denomination, MachineSnapshot } from "./domain/types";
import { displayFor, type DisplayMessage } from "./displayFor";
import { useAutoClear } from "./hooks/useAutoClear";
import { useMachineSnapshot } from "./hooks/useMachineSnapshot";
import { usePurchase } from "./hooks/usePurchase";
import { useReset } from "./hooks/useReset";
import { MachineStatus } from "./components/machine-status/MachineStatus";
import { UserControls } from "./components/user-controls/UserControls";
import { Outcome } from "./components/cabinet/outcome/Outcome";
import { Cabinet } from "./components/cabinet/Cabinet";
import { Wallet } from "./components/wallet/Wallet";
import styles from "./VendingMachine.module.css";

const SUCCESS_DISPLAY_MS = 5_000;

type VendingMachineProps = {
  initialSnapshot: MachineSnapshot;
  resetEnabled: boolean;
};

export const VendingMachine = ({
  initialSnapshot,
  resetEnabled,
}: VendingMachineProps) => {
  const [customerId, setCustomerId] = useState(customers[0]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [insertedCoins, setInsertedCoins] = useState<Denomination[]>([]);
  const [returnedCoins, setReturnedCoins] = useState<CoinStack[]>([]);
  const [statsOpen, setStatsOpen] = useState(false);
  const snapshot = useMachineSnapshot(initialSnapshot);
  const purchase = usePurchase();
  const reset = useReset();
  const { result } = purchase;
  const error = purchase.error ?? reset.error;
  const isPurchasing = purchase.isPending;
  const busy = purchase.isPending || reset.isPending;

  const clearOutcome = () => {
    purchase.clear();
    reset.clear();
  };

  const { products } = catalogue;
  const selectedProduct =
    products.find((p) => p.id === selectedProductId) ?? null;
  const insertedInPence = insertedCoins.reduce((sum, coin) => sum + coin, 0);
  const display = displayFor(result, error, returnedCoins, insertedInPence);

  const renderMessage = (message: DisplayMessage) => {
    switch (message.kind) {
      case "returned":
        return <p>Returned {formatMoney(message.amountInPence)}.</p>;
      case "max_credit":
        return (
          <p>
            Maximum credit {formatMoney(message.maxInPence)}. Press Buy or
            return your coins.
          </p>
        );
      case "outcome":
        return <Outcome result={result} error={error} />;
    }
  };

  useAutoClear(result?.ok ? result : null, clearOutcome, SUCCESS_DISPLAY_MS);
  useAutoClear(
    returnedCoins.length > 0 ? returnedCoins : null,
    () => setReturnedCoins([]),
    SUCCESS_DISPLAY_MS,
  );

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

  const handleReset = async () => {
    if (busy) return;
    const fresh = await reset.run();
    if (!fresh) return;
    clearOutcome();
    setInsertedCoins([]);
    setSelectedProductId(null);
    setReturnedCoins([]);
  };

  const handlePurchase = async () => {
    if (busy || !selectedProduct) return;
    const outcome = await purchase.submit(
      customerId,
      selectedProduct.id,
      insertedInPence,
    );
    const paymentTaken =
      outcome.kind === "result" ? outcome.result.ok : outcome.paymentTaken;
    if (!paymentTaken) return;
    setInsertedCoins([]);
    setSelectedProductId(null);
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <UserControls
          className={styles.customers}
          customers={customers}
          customerId={customerId}
          onSelect={selectCustomer}
          disabled={busy}
        />
        <div className={styles.actions}>
          <Button
            size="s"
            onClick={() => setStatsOpen((open) => !open)}
            aria-expanded={statsOpen}
            aria-controls="machine-stats"
            aria-label="Machine stats"
            title="Machine stats"
          >
            <span aria-hidden="true">£</span>
          </Button>
          {resetEnabled ? (
            <Button
              size="s"
              onClick={handleReset}
              disabled={busy}
              aria-label="Service visit"
              title="Service visit: the operator collects the cash box and refills the coins. The machine never refills itself."
            >
              <ResetIcon />
            </Button>
          ) : null}
        </div>
        {statsOpen ? (
          <MachineStatus
            id="machine-stats"
            className={styles.stats}
            snapshot={snapshot}
          />
        ) : null}
      </header>
      <div className={styles.scene}>
        <Cabinet
          brand={catalogue.brand}
          products={products}
          selectedProduct={selectedProduct}
          onSelectProduct={selectProduct}
          insertedInPence={insertedInPence}
          insertCount={insertedCoins.length}
          message={renderMessage(display.message)}
          tone={display.tone}
          change={display.change}
          onPurchase={handlePurchase}
          onReturn={returnCoins}
          isPurchasing={isPurchasing}
          disabled={busy}
        />
      </div>
      <Wallet
        className={styles.wallet}
        insertedInPence={insertedInPence}
        onInsert={insert}
        disabled={busy}
      />
    </div>
  );
};
