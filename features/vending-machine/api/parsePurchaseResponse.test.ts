import { describe, expect, it } from "vitest";
import { createInitialInventory } from "../domain/coinInventory";
import {
  BUSY_MESSAGE,
  parsePurchaseResponse,
  UNCONFIRMED_MESSAGE,
  UNEXPECTED_RESPONSE_MESSAGE,
  UNREADABLE_SUCCESS_MESSAGE,
} from "./parsePurchaseResponse";

const machine = {
  coins: createInitialInventory(),
  changeAvailableInPence: 3880,
  cashBoxInPence: 0,
};

const dispensed = {
  ok: true,
  changeDueInPence: 15,
  change: [{ denomination: 10, count: 1 }],
  priceInPence: 85,
  paidInPence: 100,
  machine,
};

const refused = {
  ok: false,
  reason: "insufficient_payment",
  message: "Not enough money inserted.",
  shortfallInPence: 35,
  priceInPence: 85,
  paidInPence: 50,
  machine,
};

describe("parsePurchaseResponse", () => {
  it("accepts a dispensed result", () => {
    expect(parsePurchaseResponse(200, dispensed)).toEqual({
      kind: "result",
      result: dispensed,
    });
  });

  it("accepts a refusal with its status", () => {
    expect(parsePurchaseResponse(422, refused)).toEqual({
      kind: "result",
      result: refused,
    });
  });

  it("accepts a cannot-make-change refusal", () => {
    const body = {
      ok: false,
      reason: "cannot_make_change",
      message: "Cannot make change.",
      priceInPence: 85,
      paidInPence: 100,
      machine,
    };
    expect(parsePurchaseResponse(409, body)).toEqual({
      kind: "result",
      result: body,
    });
  });

  it("accepts a rate-limited refusal", () => {
    const body = {
      ok: false,
      reason: "rate_limited",
      message: "Too many purchases.",
      retryAfterMs: 1500,
      machine,
    };
    expect(parsePurchaseResponse(429, body)).toEqual({
      kind: "result",
      result: body,
    });
  });

  it("joins validation issues into one message", () => {
    const body = {
      error: "validation",
      issues: [
        { field: "productId", message: "unknown product" },
        { field: "paidInPence", message: "must be a whole number of pence" },
      ],
    };
    expect(parsePurchaseResponse(400, body)).toEqual({
      kind: "failure",
      paymentTaken: false,
      message: "unknown product, must be a whole number of pence",
    });
  });

  it("reports a busy machine on 503", () => {
    expect(parsePurchaseResponse(503, { error: "conflict" })).toEqual({
      kind: "failure",
      paymentTaken: false,
      message: BUSY_MESSAGE,
    });
  });

  it.each([
    ["a 200 without a machine snapshot", { ...dispensed, machine: null }],
    ["a 200 with a string body", "ok"],
    ["a non-JSON body", null],
    [
      "a success without changeDueInPence",
      { ...dispensed, changeDueInPence: undefined },
    ],
    [
      "a success with an unknown coin",
      { ...dispensed, change: [{ denomination: 3, count: 1 }] },
    ],
    [
      "a success with a zero-count stack",
      { ...dispensed, change: [{ denomination: 10, count: 0 }] },
    ],
    [
      "an empty inventory",
      { ...dispensed, machine: { ...machine, coins: {} } },
    ],
    [
      "a negative cash box",
      { ...dispensed, machine: { ...machine, cashBoxInPence: -1 } },
    ],
    ["a fractional price", { ...dispensed, priceInPence: 85.5 }],
  ])(
    "reports a purchase that went through but could not be read on %s",
    (_, body) => {
      expect(parsePurchaseResponse(200, body)).toEqual({
        kind: "failure",
        paymentTaken: true,
        message: UNREADABLE_SUCCESS_MESSAGE,
      });
    },
  );

  it.each([
    ["a refusal without a reason", 422, { ...refused, reason: undefined }],
    ["an empty 400", 400, {}],
    [
      "a short payment without the shortfall",
      422,
      { ...refused, shortfallInPence: undefined },
    ],
    ["an unknown refusal reason", 422, { ...refused, reason: "out_of_stock" }],
    [
      "a rate limit without retryAfterMs",
      429,
      { ...refused, reason: "rate_limited", shortfallInPence: undefined },
    ],
    ["a 409 with no body", 409, null],
  ])("keeps the coins inserted on %s", (_, status, body) => {
    expect(parsePurchaseResponse(status, body)).toEqual({
      kind: "failure",
      paymentTaken: false,
      message: UNEXPECTED_RESPONSE_MESSAGE,
    });
  });

  it.each([
    ["a JSON 500", 500, { error: "unavailable" }],
    ["a 502 with no body", 502, null],
    ["an unknown 2xx", 204, null],
  ])("leaves the outcome unconfirmed on %s", (_, status, body) => {
    expect(parsePurchaseResponse(status, body)).toEqual({
      kind: "failure",
      paymentTaken: false,
      message: UNCONFIRMED_MESSAGE,
    });
  });
});
