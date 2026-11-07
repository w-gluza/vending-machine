import { isDenomination } from "../domain/coinInventory";
import { DENOMINATIONS, type PurchaseResult } from "../domain/types";

export type ParsedPurchaseResponse =
  | { kind: "result"; result: PurchaseResult }
  | { kind: "failure"; message: string };

const RESULT_STATUSES = new Set([200, 409, 422, 429]);

export const UNEXPECTED_RESPONSE_MESSAGE =
  "The machine gave an unexpected answer. Your coins are still inserted.";
export const BUSY_MESSAGE = "The machine is busy. Press Buy again in a moment.";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPence = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

const isCoinStack = (value: unknown) =>
  isRecord(value) &&
  typeof value.denomination === "number" &&
  isDenomination(value.denomination) &&
  isPence(value.count) &&
  value.count > 0;

const isInventory = (value: unknown) =>
  isRecord(value) &&
  DENOMINATIONS.every((denomination) => isPence(value[denomination]));

const isSnapshot = (value: unknown) =>
  isRecord(value) &&
  isInventory(value.coins) &&
  isPence(value.cashBoxInPence) &&
  isPence(value.changeAvailableInPence);

const isRefusal = (value: Record<string, unknown>) => {
  if (typeof value.message !== "string") return false;
  switch (value.reason) {
    case "insufficient_payment":
      return isPence(value.shortfallInPence);
    case "rate_limited":
      return isPence(value.retryAfterMs);
    case "cannot_make_change":
      return true;
    default:
      return false;
  }
};

const isDispense = (value: Record<string, unknown>) =>
  isPence(value.changeDueInPence) &&
  Array.isArray(value.change) &&
  value.change.every(isCoinStack);

const isPurchaseResult = (value: unknown): value is PurchaseResult =>
  isRecord(value) &&
  typeof value.ok === "boolean" &&
  isPence(value.priceInPence) &&
  isPence(value.paidInPence) &&
  isSnapshot(value.machine) &&
  (value.ok ? isDispense(value) : isRefusal(value));

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
