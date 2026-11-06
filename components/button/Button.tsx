import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export const Button = ({
  selected = false,
  className,
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    aria-pressed={selected}
    className={[styles.button, className].filter(Boolean).join(" ")}
    {...rest}
  />
);
