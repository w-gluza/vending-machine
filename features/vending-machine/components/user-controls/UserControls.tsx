import { Button } from "@/components/button/Button";
import { Card } from "@/components/card/Card";
import styles from "./UserControls.module.css";

type UserControlsProps = {
  customers: readonly string[];
  customerId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

export const UserControls = ({
  customers,
  customerId,
  onSelect,
  disabled = false,
}: UserControlsProps) => (
  <Card title="Who is buying">
    <ul className={styles.row}>
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
  </Card>
);
