import { Button } from "@/components/button/Button";
import styles from "./UserControls.module.css";

type UserControlsProps = {
  customers: readonly string[];
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
      <li key={customer}>
        <Button
          size="s"
          selected={customer === customerId}
          onClick={() => onSelect(customer)}
          disabled={disabled}
        >
          {customer}
        </Button>
      </li>
    ))}
  </ul>
);
