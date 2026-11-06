export type Product = {
  readonly id: string;
  readonly name: string;
  readonly priceInPence: number;
};

export const products: readonly Product[] = [
  { id: "ramune", name: "Ramune", priceInPence: 85 },
  { id: "green-tea", name: "Green tea", priceInPence: 120 },
  { id: "kitkat-matcha", name: "KitKat Matcha", priceInPence: 95 },
  { id: "pocky", name: "Pocky", priceInPence: 135 },
  { id: "mochi", name: "Mochi", priceInPence: 165 },
  { id: "cup-noodle", name: "Cup Noodle", priceInPence: 230 },
];
