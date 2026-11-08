import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchMachine,
  PurchaseError,
  requestPurchase,
  resetMachine,
  UNCONFIRMED_MESSAGE,
} from "./requestPurchase";

const input = { customerId: "sui", productId: "ramune", paidInPence: 100 };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requestPurchase", () => {
  it("sends the order with a timeout signal", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    await requestPurchase(input).catch(() => null);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body as string)).toEqual(input);
  });

  it.each([
    ["the machine snapshot", fetchMachine],
    ["the reset", resetMachine],
  ])("gives %s request a timeout signal", async (_name, request) => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    await request().catch(() => null);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("flags the payment as taken when a 200 cannot be read", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })),
    );

    const error = await requestPurchase(input).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(PurchaseError);
    expect((error as PurchaseError).paymentTaken).toBe(true);
  });

  it("keeps the payment when the machine refuses unreadably", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 422 })),
    );

    const error = await requestPurchase(input).catch((e: unknown) => e);

    expect((error as PurchaseError).paymentTaken).toBe(false);
  });

  it.each([
    ["a dropped connection", new TypeError("Failed to fetch")],
    ["a timeout", new DOMException("The operation timed out.", "TimeoutError")],
  ])("reports an unconfirmed purchase after %s", async (_name, failure) => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(failure));

    await expect(requestPurchase(input)).rejects.toThrow(UNCONFIRMED_MESSAGE);
  });
});
