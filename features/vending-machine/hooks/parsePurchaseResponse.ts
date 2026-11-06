import type { PurchaseResult } from "../domain/types";

export type ParsedPurchaseResponse =
  | { kind: "result"; result: PurchaseResult }
  | { kind: "failure"; message: string };

const RESULT_STATUSES = new Set([200, 409, 422, 429]);

export const UNEXPECTED_RESPONSE_MESSAGE =
  "The machine gave an unexpected answer. Your coins are still inserted.";
export const BUSY_MESSAGE = "The machine is busy. Press Buy again in a moment.";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSnapshot = (value: unknown) =>
  isRecord(value) &&
  isRecord(value.coins) &&
  typeof value.cashBoxInPence === "number" &&
  typeof value.changeAvailableInPence === "number";

const isPurchaseResult = (value: unknown): value is PurchaseResult =>
  isRecord(value) &&
  typeof value.ok === "boolean" &&
  typeof value.priceInPence === "number" &&
  typeof value.paidInPence === "number" &&
  isSnapshot(value.machine) &&
  (value.ok
    ? Array.isArray(value.change)
    : typeof value.reason === "string" && typeof value.message === "string");

const validationMessage = (body: unknown): string | null => {
  if (!isRecord(body) || !Array.isArray(body.issues)) return null;
  const messages = body.issues.flatMap((issue) =>
    isRecord(issue) && typeof issue.message === "string" ? [issue.message] : [],
  );
  return messages.length > 0 ? messages.join(", ") : null;
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
  if (RESULT_STATUSES.has(status) && isPurchaseResult(body)) {
    return { kind: "result", result: body };
  }
  return { kind: "failure", message: UNEXPECTED_RESPONSE_MESSAGE };
};
