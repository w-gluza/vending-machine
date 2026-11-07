import { z } from "zod";
import { products, type Product } from "@/data/products";

export const MAX_CUSTOMER_ID_LENGTH = 64;
export const MAX_PENCE = 100_000;

export type ValidationIssue = { field: string; message: string };

export type ValidationError = {
  error: "validation";
  issues: ValidationIssue[];
};

export type Validated<T> =
  { ok: true; value: T } | { ok: false; issues: ValidationIssue[] };

export const isJsonObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const customerIdSchema = z
  .string("must be a non-empty string")
  .transform((value) => value.trim().toLowerCase())
  .pipe(
    z
      .string()
      .min(1, "must be a non-empty string")
      .max(
        MAX_CUSTOMER_ID_LENGTH,
        `must be at most ${MAX_CUSTOMER_ID_LENGTH} characters`,
      ),
  );

const isKnownProductId = (id: string) => products.some((p) => p.id === id);

const orderSchema = z.object({
  productId: z
    .string("must be a known product id")
    .refine(isKnownProductId, "must be a known product id"),
  paidInPence: z
    .int("must be a non-negative integer number of pence")
    .nonnegative("must be a non-negative integer number of pence")
    .max(MAX_PENCE, `must be at most ${MAX_PENCE}`),
});

const toIssues = (error: z.ZodError): ValidationIssue[] => {
  const seen = new Set<string>();
  return error.issues.flatMap((issue) => {
    const field = String(issue.path[0] ?? "body");
    if (seen.has(field)) return [];
    seen.add(field);
    return [{ field, message: issue.message }];
  });
};

export const validateCustomerId = (value: unknown): Validated<string> => {
  const result = customerIdSchema.safeParse(value);
  return result.success
    ? { ok: true, value: result.data }
    : {
        ok: false,
        issues: toIssues(result.error).map((issue) => ({
          ...issue,
          field: "customerId",
        })),
      };
};

export type ValidatedOrder = { product: Product; paidInPence: number };

export const validateOrder = (
  body: Record<string, unknown>,
): Validated<ValidatedOrder> => {
  const result = orderSchema.safeParse(body);
  if (!result.success) return { ok: false, issues: toIssues(result.error) };
  const product = products.find(
    (p) => p.id === result.data.productId,
  ) as Product;
  return { ok: true, value: { product, paidInPence: result.data.paidInPence } };
};
