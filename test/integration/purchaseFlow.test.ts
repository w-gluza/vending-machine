import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialInventory } from "@/features/vending-machine/domain/coinInventory";
import type { MachineSnapshot } from "@/features/vending-machine/domain/types";
import { createInMemoryStore } from "@/server/machine/inMemoryStore";
import type { MachineState } from "@/server/machine/store";
import { createInMemoryRateLimiter } from "@/server/rate-limit/inMemoryRateLimiter";

type Order = { customerId: string; productId: string; paidInPence: number };

const bootMachine = async (initial?: MachineState) => {
  vi.resetModules();
  (globalThis as { __vending?: unknown }).__vending = {
    store: createInMemoryStore(initial),
    limiter: createInMemoryRateLimiter(),
  };
  const { POST } = await import("@/app/api/purchase/route");
  const { GET } = await import("@/app/api/machine/route");

  const buy = async (order: Order) => {
    const response = await POST(
      new Request("http://localhost/api/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(order),
      }),
    );
    return { status: response.status, body: await response.json() };
  };
  const machine = async (): Promise<MachineSnapshot> => (await GET()).json();
  return { buy, machine };
};

const ramune = (customerId: string, paidInPence: number): Order => ({
  customerId,
  productId: "ramune",
  paidInPence,
});

describe("purchase flow through the real routes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-06T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as { __vending?: unknown }).__vending;
  });

  it("carries machine state from one purchase to the next and agrees with GET /api/machine", async () => {
    const { buy, machine } = await bootMachine();
    expect(await machine()).toEqual({
      coins: createInitialInventory(),
      changeAvailableInPence: 3880,
      cashBoxInPence: 0,
    });

    const withChange = await buy(ramune("alice", 100));
    expect(withChange.status).toBe(200);
    expect(withChange.body.change).toEqual([
      { denomination: 10, count: 1 },
      { denomination: 5, count: 1 },
    ]);
    expect(await machine()).toEqual(withChange.body.machine);

    const exact = await buy(ramune("bob", 85));
    expect(exact.status).toBe(200);
    expect(exact.body.change).toEqual([]);
    expect(await machine()).toMatchObject({
      cashBoxInPence: 185,
      changeAvailableInPence: 3865,
      coins: { ...createInitialInventory(), 10: 9, 5: 9 },
    });

    const short = await buy({
      customerId: "chen",
      productId: "coffee",
      paidInPence: 200,
    });
    expect(short.status).toBe(422);
    expect(await machine()).toEqual(exact.body.machine);
  });

  it("limits each customer separately and lets them back in when the window passes", async () => {
    const { buy, machine } = await bootMachine();
    for (let i = 0; i < 3; i++) {
      expect((await buy(ramune("alice", 100))).status).toBe(200);
      vi.advanceTimersByTime(500);
    }
    const before = await machine();
    const limited = await buy(ramune("alice", 100));
    expect(limited.status).toBe(429);
    expect(limited.body).toMatchObject({
      reason: "rate_limited",
      retryAfterMs: 1500,
    });
    expect(await machine()).toEqual(before);

    expect((await buy(ramune("bob", 100))).status).toBe(200);

    vi.advanceTimersByTime(1499);
    expect((await buy(ramune("alice", 100))).status).toBe(429);
    vi.advanceTimersByTime(1);
    expect((await buy(ramune("alice", 100))).status).toBe(200);
    expect(await machine()).toMatchObject({ cashBoxInPence: 500 });
  });

  it("refuses when the float cannot make change, then serves exact payment and non-greedy change", async () => {
    const { buy, machine } = await bootMachine({
      coins: { ...createInitialInventory(0), 50: 1, 20: 3 },
      cashBoxInPence: 0,
    });
    const before = await machine();

    const stuck = await buy(ramune("erin", 100));
    expect(stuck.status).toBe(409);
    expect(stuck.body.reason).toBe("cannot_make_change");
    expect(await machine()).toEqual(before);

    expect((await buy(ramune("erin", 85))).status).toBe(200);
    expect(await machine()).toMatchObject({
      cashBoxInPence: 85,
      changeAvailableInPence: 110,
    });

    const sixty = await buy(ramune("erin", 145));
    expect(sixty.status).toBe(200);
    expect(sixty.body.change).toEqual([{ denomination: 20, count: 3 }]);
  });
});
