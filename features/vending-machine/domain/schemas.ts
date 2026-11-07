import { z } from "zod";
import { DENOMINATIONS } from "./types";

const pence = z.int().nonnegative();

export const coinStackSchema = z.object({
  denomination: z.literal(DENOMINATIONS),
  count: z.int().positive(),
});

export const coinInventorySchema = z.object({
  200: pence,
  100: pence,
  50: pence,
  20: pence,
  10: pence,
  5: pence,
  2: pence,
  1: pence,
});

export const machineSnapshotSchema = z.object({
  coins: coinInventorySchema,
  changeAvailableInPence: pence,
  cashBoxInPence: pence,
});

const context = {
  priceInPence: pence,
  paidInPence: pence,
  machine: machineSnapshotSchema,
};

const insufficientPayment = z.object({
  ok: z.literal(false),
  reason: z.literal("insufficient_payment"),
  message: z.string(),
  shortfallInPence: pence,
});

const cannotMakeChange = z.object({
  ok: z.literal(false),
  reason: z.literal("cannot_make_change"),
  message: z.string(),
});

export const purchaseRefusalSchema = z.discriminatedUnion("reason", [
  insufficientPayment,
  cannotMakeChange,
]);

export const rateLimitRefusalSchema = z.object({
  ok: z.literal(false),
  reason: z.literal("rate_limited"),
  message: z.string(),
  retryAfterMs: pence,
});

export const purchaseResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    changeDueInPence: pence,
    change: z.array(coinStackSchema),
    ...context,
  }),
  z.discriminatedUnion("reason", [
    insufficientPayment.extend(context),
    cannotMakeChange.extend(context),
    rateLimitRefusalSchema.extend(context),
  ]),
]);
