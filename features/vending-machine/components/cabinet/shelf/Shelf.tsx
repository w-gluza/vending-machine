import Image from "next/image";
import type { Product } from "@/data/products";
import { formatMoney } from "@/lib/formatMoney";
import styles from "./Shelf.module.css";

type ShelfProps = {
  products: readonly Product[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

export const Shelf = ({
  products,
  selectedId,
  onSelect,
  disabled = false,
}: ShelfProps) => (
  <ul className={styles.shelf}>
    {products.map((product) => (
      <li key={product.id}>
        <button
          type="button"
          className={styles.product}
          aria-pressed={product.id === selectedId}
          onClick={() => onSelect(product.id)}
          disabled={disabled}
        >
          <Image
            src={product.image}
            alt=""
            width={200}
            height={400}
            unoptimized
          />
          <span>{product.name}</span>
          <strong>{formatMoney(product.priceInPence)}</strong>
        </button>
      </li>
    ))}
  </ul>
);
