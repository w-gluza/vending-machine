import { Button } from "@/components/button/Button";
import { Coin } from "@/components/coin/Coin";
import type { Product } from "@/data/products";
import { formatMoney } from "@/lib/formatMoney";
import { coinLabel, inventoryToStacks } from "../../domain/coinInventory";
import type {
  Denomination,
  MachineSnapshot,
  PurchaseResult,
} from "../../domain/types";
import { CoinTray } from "../coin-tray/CoinTray";
import { Outcome } from "../outcome/Outcome";
import { ProductGrid } from "../product-grid/ProductGrid";
import styles from "./VendingMachine.module.css";

type VendingMachineProps = {
  customers: readonly string[];
  customerId: string;
  onSelectCustomer: (id: string) => void;
  products: readonly Product[];
  selectedProduct: Product | null;
  onSelectProduct: (id: string) => void;
  insertedInPence: number;
  onInsert: (denomination: Denomination) => void;
  onReturn: () => void;
  onPurchase: () => void;
  isPurchasing: boolean;
  result: PurchaseResult | null;
  error: string | null;
  snapshot: MachineSnapshot;
};

export const VendingMachine = ({
  customers,
  customerId,
  onSelectCustomer,
  products,
  selectedProduct,
  onSelectProduct,
  insertedInPence,
  onInsert,
  onReturn,
  onPurchase,
  isPurchasing,
  result,
  error,
  snapshot,
}: VendingMachineProps) => (
  <div className={styles.machine}>
    <section className={styles.section}>
      <h2>Customer</h2>
      <ul className={styles.row}>
        {customers.map((customer) => (
          <li key={customer}>
            <Button
              selected={customer === customerId}
              onClick={() => onSelectCustomer(customer)}
              disabled={isPurchasing}
            >
              {customer}
            </Button>
          </li>
        ))}
      </ul>
    </section>

    <section className={styles.section}>
      <h2>Products</h2>
      <ProductGrid
        products={products}
        selectedId={selectedProduct?.id ?? null}
        onSelect={onSelectProduct}
        disabled={isPurchasing}
      />
    </section>

    <section className={styles.section}>
      <h2>Coins</h2>
      <CoinTray
        insertedInPence={insertedInPence}
        onInsert={onInsert}
        onReturn={onReturn}
        disabled={isPurchasing}
      />
    </section>

    <section className={styles.section}>
      <h2>Purchase</h2>
      <p>
        Price:{" "}
        <strong>
          {selectedProduct ? formatMoney(selectedProduct.priceInPence) : "-"}
        </strong>
        {"  "}Paying: <strong>{formatMoney(insertedInPence)}</strong>
      </p>
      <Button onClick={onPurchase} disabled={isPurchasing || !selectedProduct}>
        {isPurchasing ? "Buying..." : "Buy"}
      </Button>
    </section>

    <section className={styles.section}>
      <h2>Outcome</h2>
      <Outcome result={result} error={error} />
    </section>

    <section className={styles.section}>
      <h2>Machine</h2>
      <ul className={styles.row}>
        {inventoryToStacks(snapshot.coins).map((stack) => (
          <li key={stack.denomination}>
            <Coin label={coinLabel(stack.denomination)} count={stack.count} />
          </li>
        ))}
      </ul>
      <p>
        Change available: {formatMoney(snapshot.changeAvailableInPence)}. Cash
        box: {formatMoney(snapshot.cashBoxInPence)}.
      </p>
    </section>
  </div>
);
