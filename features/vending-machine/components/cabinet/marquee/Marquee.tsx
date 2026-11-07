import type { Catalogue } from "@/data/catalogues/types";
import styles from "./Marquee.module.css";

type MarqueeProps = {
  brand: Catalogue["brand"];
};

export const Marquee = ({ brand }: MarqueeProps) => (
  <h1 className={styles.marquee} lang={brand.lang}>
    {brand.text}
  </h1>
);
