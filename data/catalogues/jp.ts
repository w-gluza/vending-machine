import type { Catalogue } from "./types";

export const jp: Catalogue = {
  id: "jp",
  name: "Japan",
  brand: { text: "富士自動販売機", lang: "ja" },
  products: [
    {
      id: "ramune",
      name: "Ramune",
      priceInPence: 85,
      image: "/jp/products/ramune.svg",
    },
    {
      id: "green-tea",
      name: "Green tea",
      priceInPence: 120,
      image: "/jp/products/green-tea.svg",
    },
    {
      id: "peach-soda",
      name: "Peach soda",
      priceInPence: 95,
      image: "/jp/products/peach-soda.svg",
    },
    {
      id: "yuzu-soda",
      name: "Yuzu soda",
      priceInPence: 135,
      image: "/jp/products/yuzu-soda.svg",
    },
    {
      id: "fuji-water",
      name: "Fuji water",
      priceInPence: 165,
      image: "/jp/products/fuji-water.svg",
    },
    {
      id: "coffee",
      name: "Coffee",
      priceInPence: 230,
      image: "/jp/products/coffee.svg",
    },
  ],
};
