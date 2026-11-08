import type { Catalogue } from "./types";

export const jp: Catalogue = {
  id: "jp",
  name: "Japan",
  brand: { text: "富士自動販売機", lang: "ja" },
  products: [
    {
      id: "be9c420f-78cf-499b-8f4a-835dd6865462",
      slug: "ramune",
      name: "Ramune",
      priceInPence: 85,
      image: "/jp/products/ramune.svg",
    },
    {
      id: "de64626f-0c99-4195-990e-ec5e807ff5f9",
      slug: "green-tea",
      name: "Green tea",
      priceInPence: 120,
      image: "/jp/products/green-tea.svg",
    },
    {
      id: "74381dd8-5d0c-4f00-8f43-4b61156b9be6",
      slug: "peach-soda",
      name: "Peach soda",
      priceInPence: 95,
      image: "/jp/products/peach-soda.svg",
    },
    {
      id: "8dec6622-5848-461e-b8ab-ecc19ab490ed",
      slug: "yuzu-soda",
      name: "Yuzu soda",
      priceInPence: 135,
      image: "/jp/products/yuzu-soda.svg",
    },
    {
      id: "1080a6dd-8540-4903-9371-c5741cadb559",
      slug: "fuji-water",
      name: "Fuji water",
      priceInPence: 165,
      image: "/jp/products/fuji-water.svg",
    },
    {
      id: "f296332c-cbeb-4ba8-8f67-e93984fcaa94",
      slug: "coffee",
      name: "Coffee",
      priceInPence: 230,
      image: "/jp/products/coffee.svg",
    },
  ],
};
