"use client";

import { useState } from "react";
import { customers } from "@/data/customers";
import { products } from "@/data/products";
import type { Denomination, MachineSnapshot } from "../../domain/types";
import { usePurchase } from "../../hooks/usePurchase";
import { VendingMachine } from "../vending-machine/VendingMachine";

type VendingMachineScreenProps = {
  initialSnapshot: MachineSnapshot;
};

export const VendingMachineScreen = ({
  initialSnapshot,
}: VendingMachineScreenProps) => {
  const [customerId, setCustomerId] = useState(customers[0]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [insertedInPence, setInsertedInPence] = useState(0);
  const { snapshot, result, error, isPurchasing, purchase, clearOutcome } =
    usePurchase(initialSnapshot);

  const selectedProduct =
    products.find((p) => p.id === selectedProductId) ?? null;

  const selectCustomer = (id: string) => {
    clearOutcome();
    setCustomerId(id);
  };

  const selectProduct = (id: string) => {
    clearOutcome();
    setSelectedProductId(id);
  };

  const insert = (denomination: Denomination) => {
    clearOutcome();
    setInsertedInPence((total) => total + denomination);
  };

  const returnCoins = () => {
    clearOutcome();
    setInsertedInPence(0);
  };

  const handlePurchase = async () => {
    if (isPurchasing || !selectedProduct) return;
    const outcome = await purchase(
      customerId,
      selectedProduct.id,
      insertedInPence,
    );
    if (!outcome?.ok) return;
    setInsertedInPence(0);
    setSelectedProductId(null);
  };

  return (
    <VendingMachine
      customers={customers}
      customerId={customerId}
      onSelectCustomer={selectCustomer}
      products={products}
      selectedProduct={selectedProduct}
      onSelectProduct={selectProduct}
      insertedInPence={insertedInPence}
      onInsert={insert}
      onReturn={returnCoins}
      onPurchase={handlePurchase}
      isPurchasing={isPurchasing}
      result={result}
      error={error}
      snapshot={snapshot}
    />
  );
};
