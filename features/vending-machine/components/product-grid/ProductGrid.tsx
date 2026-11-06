import type { Product } from "@/data/products";
import { formatMoney } from "@/lib/formatMoney";
import styles from "./ProductGrid.module.css";

type ProductGridProps = {
  products: readonly Product[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

export const ProductGrid = ({
  products,
  selectedId,
  onSelect,
  disabled = false,
}: ProductGridProps) => (
  <ul className={styles.grid}>
    {products.map((product) => (
      <li key={product.id}>
        <button
          type="button"
          className={styles.product}
          aria-pressed={product.id === selectedId}
          onClick={() => onSelect(product.id)}
          disabled={disabled}
        >
          <span>{product.name}</span>
          <span>{formatMoney(product.priceInPence)}</span>
        </button>
      </li>
    ))}
  </ul>
);
