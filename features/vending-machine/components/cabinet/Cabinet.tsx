import type { ReactNode } from "react";
import { Button } from "@/components/button/Button";
import { catalogue } from "@/data/catalogues";
import type { Product } from "@/data/products";
import type { CoinStack } from "../../domain/types";
import { formatMoney } from "@/lib/formatMoney";
import { CoinReturn } from "./coin-return/CoinReturn";
import { CoinSlot } from "./coin-slot/CoinSlot";
import { Display, type DisplayTone } from "./display/Display";
import { Marquee } from "./marquee/Marquee";
import { Shelf } from "./shelf/Shelf";
import { Tray } from "./tray/Tray";
import styles from "./Cabinet.module.css";

type CabinetProps = {
  products: readonly Product[];
  selectedProduct: Product | null;
  onSelectProduct: (id: string) => void;
  insertedInPence: number;
  insertCount: number;
  message: ReactNode;
  tone: DisplayTone;
  change: readonly CoinStack[];
  onPurchase: () => void;
  onReturn: () => void;
  isPurchasing: boolean;
};

export const Cabinet = ({
  products,
  selectedProduct,
  onSelectProduct,
  insertedInPence,
  insertCount,
  message,
  tone,
  change,
  onPurchase,
  onReturn,
  isPurchasing,
}: CabinetProps) => (
  <div className={styles.cabinet}>
    <div className={styles.header}>
      <Marquee brand={catalogue.brand} />
    </div>

    <div className={styles.shelf}>
      <Shelf
        products={products}
        selectedId={selectedProduct?.id ?? null}
        onSelect={onSelectProduct}
        disabled={isPurchasing}
      />
    </div>

    <div className={styles.controls}>
      <Display
        productName={selectedProduct?.name ?? null}
        price={
          selectedProduct ? formatMoney(selectedProduct.priceInPence) : null
        }
        inserted={formatMoney(insertedInPence)}
        message={message}
        tone={tone}
      />
      <CoinSlot insertCount={insertCount} />
      <Button
        variant="primary"
        onClick={onPurchase}
        disabled={isPurchasing || !selectedProduct}
      >
        {isPurchasing ? "Buying..." : "Buy"}
      </Button>
      <Button
        variant="danger"
        onClick={onReturn}
        disabled={isPurchasing || insertedInPence === 0}
      >
        Return coins
      </Button>
    </div>

    <div className={styles.tray}>
      <Tray />
    </div>
    <div className={styles.coinReturn}>
      <CoinReturn coins={change} />
    </div>
  </div>
);
