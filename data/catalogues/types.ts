export type Product = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly priceInPence: number;
  readonly image: string;
};

export type Catalogue = {
  readonly id: string;
  readonly name: string;
  readonly brand: { readonly text: string; readonly lang: string };
  readonly themeColor: string;
  readonly products: readonly Product[];
};
