import { z } from "zod";
import { purchaseResultSchema } from "../domain/schemas";
import type { PurchaseResult } from "../domain/types";

export type ParsedPurchaseResponse =
  | { kind: "result"; result: PurchaseResult }
  | { kind: "failure"; message: string; paymentTaken: boolean };

const failure = (
  message: string,
  paymentTaken = false,
): ParsedPurchaseResponse => ({ kind: "failure", message, paymentTaken });

const RESULT_STATUSES = new Set([200, 409, 422, 429]);
const REFUSAL_STATUSES = new Set([400, 409, 422, 429]);

export const UNEXPECTED_RESPONSE_MESSAGE =
  "The machine gave an unexpected answer. Your coins are still inserted.";
export const UNREADABLE_SUCCESS_MESSAGE =
  "Purchase went through, but the machine's reply could not be read.";
export const UNCONFIRMED_MESSAGE =
  "Purchase not confirmed. It may have gone through.";
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
    return failure(validationMessage(body) ?? UNEXPECTED_RESPONSE_MESSAGE);
  }
  if (status === 503) return failure(BUSY_MESSAGE);
  if (RESULT_STATUSES.has(status)) {
    const parsed = purchaseResultSchema.safeParse(body);
    if (parsed.success) return { kind: "result", result: parsed.data };
  }
  if (REFUSAL_STATUSES.has(status)) return failure(UNEXPECTED_RESPONSE_MESSAGE);
  if (status === 200) return failure(UNREADABLE_SUCCESS_MESSAGE, true);
  return failure(UNCONFIRMED_MESSAGE);
};
