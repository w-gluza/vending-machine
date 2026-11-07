import styles from "./Marquee.module.css";

type MarqueeProps = {
  brand: { text: string; lang: string };
};

export const Marquee = ({ brand }: MarqueeProps) => (
  <h1 className={styles.marquee} lang={brand.lang}>
    {brand.text}
  </h1>
);
