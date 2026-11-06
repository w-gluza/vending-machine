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

export const validateCustomerId = (value: unknown): Validated<string> => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return {
      ok: false,
      issues: [{ field: "customerId", message: "must be a non-empty string" }],
    };
  }
  if (value.length > MAX_CUSTOMER_ID_LENGTH) {
    return {
      ok: false,
      issues: [
        {
          field: "customerId",
          message: `must be at most ${MAX_CUSTOMER_ID_LENGTH} characters`,
        },
      ],
    };
  }
  return { ok: true, value: value.trim() };
};

const productIssue = (value: unknown): ValidationIssue | null => {
  if (typeof value !== "string" || !products.some((p) => p.id === value)) {
    return { field: "productId", message: "must be a known product id" };
  }
  return null;
};

const paidIssue = (value: unknown): ValidationIssue | null => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return {
      field: "paidInPence",
      message: "must be a non-negative integer number of pence",
    };
  }
  if (value > MAX_PENCE) {
    return { field: "paidInPence", message: `must be at most ${MAX_PENCE}` };
  }
  return null;
};

export type ValidatedOrder = { product: Product; paidInPence: number };

export const validateOrder = (
  body: Record<string, unknown>,
): Validated<ValidatedOrder> => {
  const issues = [
    productIssue(body.productId),
    paidIssue(body.paidInPence),
  ].filter((issue): issue is ValidationIssue => issue !== null);

  if (issues.length > 0) return { ok: false, issues };

  const product = products.find((p) => p.id === body.productId) as Product;
  return {
    ok: true,
    value: { product, paidInPence: body.paidInPence as number },
  };
};
