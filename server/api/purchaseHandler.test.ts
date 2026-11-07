import { describe, expect, it } from "vitest";
import { createInMemoryStore } from "@/server/machine/inMemoryStore";
import { createInMemoryRateLimiter } from "@/server/rate-limit/inMemoryRateLimiter";
import { createMachineHandler } from "./machineHandler";
import { createPurchaseHandler } from "./purchaseHandler";
import { MAX_PENCE } from "./validation";

const instances = () => ({
  store: createInMemoryStore(),
  limiter: createInMemoryRateLimiter(),
});

const post = (body: unknown) =>
  new Request("http://localhost/api/purchase", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const valid = { customerId: "alice", productId: "ramune", paidInPence: 100 };

describe("POST /api/purchase", () => {
  it("dispenses with 200 and returns change and the machine snapshot", async () => {
    const response = await createPurchaseHandler(instances())(post(valid));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      ok: true,
      changeDueInPence: 15,
      change: [
        { denomination: 10, count: 1 },
        { denomination: 5, count: 1 },
      ],
      machine: { cashBoxInPence: 100 },
    });
  });

  it("returns 422 for insufficient payment", async () => {
    const response = await createPurchaseHandler(instances())(
      post({ ...valid, paidInPence: 50 }),
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      ok: false,
      reason: "insufficient_payment",
      shortfallInPence: 35,
    });
  });

  it("returns 409 when change cannot be made", async () => {
    const handler = createPurchaseHandler({
      ...instances(),
      store: createInMemoryStore({
        coins: {
          200: 0,
          100: 0,
          50: 1,
          20: 0,
          10: 0,
          5: 0,
          2: 0,
          1: 0,
        },
        cashBoxInPence: 0,
      }),
    });
    const response = await handler(
      post({ ...valid, productId: "green-tea", paidInPence: 150 }),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      ok: false,
      reason: "cannot_make_change",
    });
  });

  it("returns 429 with Retry-After on the fourth attempt in three seconds", async () => {
    const handler = createPurchaseHandler(instances());
    for (let i = 0; i < 3; i++) await handler(post(valid));
    const response = await handler(post(valid));
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThanOrEqual(
      1,
    );
    expect(await response.json()).toMatchObject({
      ok: false,
      reason: "rate_limited",
    });
  });

  it("rate limits before checking the product, so an unknown product still spends an attempt", async () => {
    const handler = createPurchaseHandler(instances());
    for (let i = 0; i < 3; i++) {
      const response = await handler(post({ ...valid, productId: "nope" }));
      expect(response.status).toBe(400);
    }
    const response = await handler(post(valid));
    expect(response.status).toBe(429);
  });

  it("keeps each customer's limit independent", async () => {
    const handler = createPurchaseHandler(instances());
    for (let i = 0; i < 3; i++) await handler(post(valid));
    expect((await handler(post(valid))).status).toBe(429);
    expect((await handler(post({ ...valid, customerId: "bob" }))).status).toBe(
      200,
    );
  });

  it("lets the customer back in once the window has passed", async () => {
    let clock = 0;
    const handler = createPurchaseHandler(instances(), () => clock);
    for (let i = 0; i < 3; i++)
      await handler(post({ ...valid, paidInPence: 85 }));
    expect((await handler(post(valid))).status).toBe(429);
    clock = 3000;
    expect((await handler(post(valid))).status).toBe(200);
  });

  it("still answers 429 when a throttled request carries a malformed payment", async () => {
    const handler = createPurchaseHandler(instances());
    for (let i = 0; i < 3; i++) await handler(post(valid));
    const response = await handler(
      post({ ...valid, paidInPence: { toString: null, valueOf: null } }),
    );
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ paidInPence: 0 });
  });

  it("does not rate limit a request without a valid customer id", async () => {
    const handler = createPurchaseHandler(instances());
    for (let i = 0; i < 5; i++) {
      expect((await handler(post({ ...valid, customerId: "" }))).status).toBe(
        400,
      );
    }
    expect((await handler(post(valid))).status).toBe(200);
  });

  it.each([
    ["invalid JSON", "{not json"],
    ["an array body", [1, 2]],
    ["a missing customer", { priceInPence: 85, paidInPence: 100 }],
    ["a blank customer", { ...valid, customerId: "   " }],
    ["an overlong customer", { ...valid, customerId: "x".repeat(65) }],
    ["an unknown product", { ...valid, productId: "caviar" }],
    ["a missing product", { customerId: "alice", paidInPence: 100 }],
    ["a numeric product id", { ...valid, productId: 1 }],
    ["a fractional payment", { ...valid, paidInPence: 99.5 }],
    ["a negative payment", { ...valid, paidInPence: -1 }],
    ["a payment above the cap", { ...valid, paidInPence: MAX_PENCE + 1 }],
  ])("returns 400 for %s", async (_label, body) => {
    const response = await createPurchaseHandler(instances())(post(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "validation" });
  });

  it("reports an unknown product and a bad payment at once", async () => {
    const response = await createPurchaseHandler(instances())(
      post({ customerId: "alice", productId: "caviar", paidInPence: "x" }),
    );
    const body = await response.json();
    expect(body.issues.map((i: { field: string }) => i.field)).toEqual([
      "productId",
      "paidInPence",
    ]);
  });

  it("ignores any price sent by the client and uses the catalogue", async () => {
    const response = await createPurchaseHandler(instances())(
      post({ ...valid, priceInPence: 1 }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      priceInPence: 85,
      changeDueInPence: 15,
    });
  });

  it("does not touch the machine on invalid input", async () => {
    const deps = instances();
    await createPurchaseHandler(deps)(post({ ...valid, paidInPence: -5 }));
    const snapshot = await (await createMachineHandler(deps)()).json();
    expect(snapshot.cashBoxInPence).toBe(0);
  });
});

describe("POST /api/purchase under contention", () => {
  it("answers 503 with Retry-After when the state keeps changing underneath", async () => {
    const inner = createInMemoryStore();
    const alwaysStale = { load: () => inner.load(), save: async () => false };
    const response = await createPurchaseHandler({
      store: alwaysStale,
      limiter: createInMemoryRateLimiter(),
    })(post(valid));
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("1");
    expect(await response.json()).toMatchObject({ error: "conflict" });
  });

  it("serves simultaneous purchases from different customers without losing any", async () => {
    const shared = instances();
    const handler = createPurchaseHandler(shared);
    const responses = await Promise.all(
      ["a", "b", "c", "d", "e", "f"].map((customerId) =>
        handler(post({ ...valid, customerId })),
      ),
    );
    expect(responses.map((r) => r.status)).toEqual([
      200, 200, 200, 200, 200, 200,
    ]);
    const machine = await createMachineHandler(shared)();
    expect(await machine.json()).toMatchObject({ cashBoxInPence: 600 });
  });
});

describe("GET /api/machine", () => {
  it("returns the snapshot with full float and empty cash box at start", async () => {
    const response = await createMachineHandler(instances())();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.changeAvailableInPence).toBe(3880);
    expect(body.cashBoxInPence).toBe(0);
    expect(body.coins[200]).toBe(10);
  });
});
