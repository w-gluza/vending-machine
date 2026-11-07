import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type ButtonVariant = "plain" | "primary" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "s" | "m";
  selected?: boolean;
};

export const Button = ({
  variant = "plain",
  size = "m",
  selected,
  className,
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    aria-pressed={selected}
    className={[styles.button, styles[variant], styles[size], className]
      .filter(Boolean)
      .join(" ")}
    {...rest}
  />
);
