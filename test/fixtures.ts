import { products } from "@/data/products";

export const productId = (slug: string): string => {
  const product = products.find((p) => p.slug === slug);
  if (!product) throw new Error(`No product with slug ${slug}`);
  return product.id;
};
