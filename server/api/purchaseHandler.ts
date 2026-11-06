import type { PurchaseResult } from "@/features/vending-machine/domain/types";
import type { Instances } from "@/server/instance";
import { getSnapshot } from "@/server/machine/getSnapshot";
import { purchase, PurchaseConflictError } from "@/server/machine/purchase";
import {
  isJsonObject,
  validateCustomerId,
  validateOrder,
  type ValidationIssue,
} from "./validation";

const statusFor = (result: PurchaseResult): number => {
  if (result.ok) return 200;
  switch (result.reason) {
    case "insufficient_payment":
      return 422;
    case "cannot_make_change":
      return 409;
    case "rate_limited":
      return 429;
  }
};

const validationResponse = (issues: ValidationIssue[]): Response =>
  Response.json({ error: "validation", issues }, { status: 400 });

export const createPurchaseHandler =
  ({ store, limiter }: Instances, now: () => number = Date.now) =>
  async (request: Request): Promise<Response> => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationResponse([
        { field: "body", message: "must be valid JSON" },
      ]);
    }
    if (!isJsonObject(body)) {
      return validationResponse([
        { field: "body", message: "must be a JSON object" },
      ]);
    }

    const customer = validateCustomerId(body.customerId);
    if (!customer.ok) return validationResponse(customer.issues);

    const gate = await limiter.attempt(customer.value, now());
    if (!gate.allowed) {
      const result: PurchaseResult = {
        ok: false,
        reason: "rate_limited",
        message: `Too many purchases. Try again in ${(gate.retryAfterMs / 1000).toFixed(1)}s.`,
        retryAfterMs: gate.retryAfterMs,
        priceInPence: 0,
        paidInPence: Number(body.paidInPence) || 0,
        machine: await getSnapshot(store),
      };
      return Response.json(result, {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(gate.retryAfterMs / 1000)) },
      });
    }

    const order = validateOrder(body);
    if (!order.ok) return validationResponse(order.issues);

    try {
      const result = await purchase(
        {
          priceInPence: order.value.product.priceInPence,
          paidInPence: order.value.paidInPence,
        },
        store,
      );
      return Response.json(result, { status: statusFor(result) });
    } catch (error) {
      if (!(error instanceof PurchaseConflictError)) throw error;
      return Response.json(
        { error: "conflict", message: "The machine is busy. Try again." },
        { status: 503, headers: { "Retry-After": "1" } },
      );
    }
  };
