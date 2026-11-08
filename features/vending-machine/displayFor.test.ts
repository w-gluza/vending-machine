import { describe, expect, it } from "vitest";
import { createInitialInventory } from "./domain/coinInventory";
import { displayFor } from "./displayFor";
import type { CoinStack, PurchaseResult } from "./domain/types";

const machine = {
  coins: createInitialInventory(),
  changeAvailableInPence: 3880,
  cashBoxInPence: 0,
};

const dispensed: PurchaseResult = {
  ok: true,
  priceInPence: 85,
  paidInPence: 100,
  changeDueInPence: 15,
  change: [
    { denomination: 10, count: 1 },
    { denomination: 5, count: 1 },
  ],
  machine,
};

const refused: PurchaseResult = {
  ok: false,
  reason: "insufficient_payment",
  message: "Short by 35p",
  priceInPence: 85,
  paidInPence: 50,
  shortfallInPence: 35,
  machine,
};

const returned: CoinStack[] = [{ denomination: 100, count: 2 }];

describe("displayFor", () => {
  it("is idle with nothing to show", () => {
    expect(displayFor(null, null, [], 0)).toEqual({
      tone: "neutral",
      message: { kind: "outcome" },
      change: [],
    });
  });

  it("shows a dispensed purchase with its change in the cup", () => {
    expect(displayFor(dispensed, null, [], 0)).toEqual({
      tone: "ok",
      message: { kind: "outcome" },
      change: dispensed.ok ? dispensed.change : [],
    });
  });

  it("shows a refusal with an empty cup", () => {
    expect(displayFor(refused, null, [], 0)).toMatchObject({
      tone: "refused",
      change: [],
    });
  });

  it("shows returned coins and their total when there is no outcome", () => {
    expect(displayFor(null, null, returned, 0)).toEqual({
      tone: "neutral",
      message: { kind: "returned", amountInPence: 200 },
      change: returned,
    });
  });

  it("lets an outcome or an error take precedence over returned coins", () => {
    expect(displayFor(refused, null, returned, 0).message).toEqual({
      kind: "outcome",
    });
    expect(
      displayFor(null, "Could not reach the machine.", returned, 0),
    ).toEqual({
      tone: "refused",
      message: { kind: "outcome" },
      change: [],
    });
  });

  it("tells the customer the credit is full once the maximum is reached", () => {
    expect(displayFor(null, null, [], 1_000).message).toEqual({
      kind: "max_credit",
      maxInPence: 1_000,
    });
    expect(displayFor(null, null, [], 999).message).toEqual({
      kind: "outcome",
    });
  });
});
