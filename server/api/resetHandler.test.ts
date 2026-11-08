import { describe, expect, it } from "vitest";
import { createInitialInventory } from "@/features/vending-machine/domain/coinInventory";
import { createInMemoryStore } from "@/server/machine/inMemoryStore";
import { createInMemoryRateLimiter } from "@/server/rate-limit/inMemoryRateLimiter";
import { createPurchaseHandler } from "./purchaseHandler";
import { createResetHandler } from "./resetHandler";

const post = (body: unknown) =>
  new Request("http://localhost/api/purchase", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

const order = { customerId: "alice", productId: "ramune", paidInPence: 100 };
const enabled = () => true;

describe("POST /api/machine/reset", () => {
  it("returns the machine to its seed state after purchases", async () => {
    const instances = {
      store: createInMemoryStore({
        coins: { ...createInitialInventory(0), 5: 3 },
        cashBoxInPence: 1234,
      }),
      limiter: createInMemoryRateLimiter(),
    };

    const response = await createResetHandler(instances, enabled)();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      coins: createInitialInventory(),
      changeAvailableInPence: 3880,
      cashBoxInPence: 0,
    });
  });

  it("clears the rate limit so a blocked customer can buy again", async () => {
    const instances = {
      store: createInMemoryStore(),
      limiter: createInMemoryRateLimiter(),
    };
    const purchase = createPurchaseHandler(instances, () => 1_000);
    for (let i = 0; i < 3; i += 1) await purchase(post(order));
    expect((await purchase(post(order))).status).toBe(429);

    await createResetHandler(instances, enabled)();

    expect((await purchase(post(order))).status).toBe(200);
  });

  it("bumps the version so an in-flight save against the old state is refused", async () => {
    const store = createInMemoryStore();
    const { state, version } = await store.load();

    await createResetHandler(
      { store, limiter: createInMemoryRateLimiter() },
      enabled,
    )();

    expect(await store.save(state, version)).toBe(false);
  });

  it("answers 404 and leaves the machine alone when reset is disabled", async () => {
    const store = createInMemoryStore({
      coins: createInitialInventory(0),
      cashBoxInPence: 500,
    });

    const response = await createResetHandler(
      { store, limiter: createInMemoryRateLimiter() },
      () => false,
    )();

    expect(response.status).toBe(404);
    expect((await store.load()).state.cashBoxInPence).toBe(500);
  });
});
