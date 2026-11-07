import { z } from "zod";
import { purchaseResultSchema } from "../domain/schemas";
import type { PurchaseResult } from "../domain/types";

export type ParsedPurchaseResponse =
  | { kind: "result"; result: PurchaseResult }
  | { kind: "failure"; message: string };

const RESULT_STATUSES = new Set([200, 409, 422, 429]);

export const UNEXPECTED_RESPONSE_MESSAGE =
  "The machine gave an unexpected answer. Your coins are still inserted.";
export const BUSY_MESSAGE = "The machine is busy. Press Buy again in a moment.";

const validationBody = z.object({
  issues: z.array(z.object({ message: z.string() })),
});

const validationMessage = (body: unknown): string | null => {
  const parsed = validationBody.safeParse(body);
  if (!parsed.success || parsed.data.issues.length === 0) return null;
  return parsed.data.issues.map((issue) => issue.message).join(", ");
};

export const parsePurchaseResponse = (
  status: number,
  body: unknown,
): ParsedPurchaseResponse => {
  if (status === 400) {
    return {
      kind: "failure",
      message: validationMessage(body) ?? UNEXPECTED_RESPONSE_MESSAGE,
    };
  }
  if (status === 503) return { kind: "failure", message: BUSY_MESSAGE };
  if (RESULT_STATUSES.has(status)) {
    const parsed = purchaseResultSchema.safeParse(body);
    if (parsed.success) return { kind: "result", result: parsed.data };
  }
  return { kind: "failure", message: UNEXPECTED_RESPONSE_MESSAGE };
};
