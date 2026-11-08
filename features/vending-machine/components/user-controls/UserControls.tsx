import { Button } from "@/components/button/Button";
import type { Customer } from "@/data/customers";
import styles from "./UserControls.module.css";

type UserControlsProps = {
  customers: readonly Customer[];
  customerId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
  className?: string;
};

export const UserControls = ({
  customers,
  customerId,
  onSelect,
  disabled = false,
  className,
}: UserControlsProps) => (
  <ul
    className={[styles.customers, className].filter(Boolean).join(" ")}
    aria-label="Who is buying"
  >
    {customers.map((customer) => (
      <li key={customer.id}>
        <Button
          size="s"
          selected={customer.id === customerId}
          onClick={() => onSelect(customer.id)}
          disabled={disabled}
        >
          {customer.name}
        </Button>
      </li>
    ))}
  </ul>
);
