import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialInventory } from "@/features/vending-machine/domain/coinInventory";
import type { MachineSnapshot } from "@/features/vending-machine/domain/types";
import { createInMemoryRateLimiter } from "@/server/rate-limit/inMemoryRateLimiter";
import { createInMemoryStore } from "@/server/machine/inMemoryStore";
import type { MachineState } from "@/server/machine/store";

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
    return {
      status: response.status,
      headers: response.headers,
      body: await response.json(),
    };
  };
  const machine = async (): Promise<MachineSnapshot> => (await GET()).json();
  return { buy, machine };
};

describe("purchase flow through the real routes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-06T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as { __vending?: unknown }).__vending;
  });

  it("runs a day at the machine: dispense, exact payment, refusals, rate limit, recovery", async () => {
    const { buy, machine } = await bootMachine();

    expect(await machine()).toEqual({
      coins: createInitialInventory(),
      changeAvailableInPence: 3880,
      cashBoxInPence: 0,
    });

    const alice = await buy({
      customerId: "alice",
      productId: "ramune",
      paidInPence: 100,
    });
    expect(alice.status).toBe(200);
    expect(alice.body).toMatchObject({
      ok: true,
      priceInPence: 85,
      paidInPence: 100,
      changeDueInPence: 15,
      change: [
        { denomination: 10, count: 1 },
        { denomination: 5, count: 1 },
      ],
    });
    expect(await machine()).toEqual(alice.body.machine);
    expect(alice.body.machine).toMatchObject({
      cashBoxInPence: 100,
      changeAvailableInPence: 3865,
      coins: { ...createInitialInventory(), 10: 9, 5: 9 },
    });

    const bob = await buy({
      customerId: "bob",
      productId: "ramune",
      paidInPence: 85,
    });
    expect(bob.status).toBe(200);
    expect(bob.body).toMatchObject({
      ok: true,
      change: [],
      changeDueInPence: 0,
    });
    expect(bob.body.machine).toMatchObject({
      cashBoxInPence: 185,
      changeAvailableInPence: 3865,
    });

    const before = await machine();
    const chen = await buy({
      customerId: "chen",
      productId: "cup-noodle",
      paidInPence: 200,
    });
    expect(chen.status).toBe(422);
    expect(chen.body).toMatchObject({
      ok: false,
      reason: "insufficient_payment",
      shortfallInPence: 30,
      priceInPence: 230,
      paidInPence: 200,
    });
    expect(await machine()).toEqual(before);

    vi.advanceTimersByTime(500);
    expect(
      (await buy({ customerId: "alice", productId: "pocky", paidInPence: 200 }))
        .status,
    ).toBe(200);
    vi.advanceTimersByTime(500);
    expect(
      (await buy({ customerId: "alice", productId: "mochi", paidInPence: 200 }))
        .status,
    ).toBe(200);

    vi.advanceTimersByTime(500);
    const limited = await buy({
      customerId: "alice",
      productId: "ramune",
      paidInPence: 100,
    });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("2");
    expect(limited.body).toMatchObject({
      ok: false,
      reason: "rate_limited",
      retryAfterMs: 1500,
      paidInPence: 100,
    });
    const afterAlice = await machine();
    expect(afterAlice).toEqual(limited.body.machine);

    const bobAgain = await buy({
      customerId: "bob",
      productId: "ramune",
      paidInPence: 100,
    });
    expect(bobAgain.status).toBe(200);

    vi.advanceTimersByTime(1499);
    expect(
      (
        await buy({
          customerId: "alice",
          productId: "ramune",
          paidInPence: 100,
        })
      ).status,
    ).toBe(429);
    vi.advanceTimersByTime(1);
    const recovered = await buy({
      customerId: "alice",
      productId: "ramune",
      paidInPence: 100,
    });
    expect(recovered.status).toBe(200);
    expect(recovered.body.machine.cashBoxInPence).toBe(
      afterAlice.cashBoxInPence + 200,
    );
  });

  it("rate limits a short payment too, and the refused attempt still counts", async () => {
    const { buy, machine } = await bootMachine();
    const short = {
      customerId: "dana",
      productId: "cup-noodle",
      paidInPence: 100,
    };
    for (let i = 0; i < 3; i++) {
      expect((await buy(short)).status).toBe(422);
    }
    const fourth = await buy({
      customerId: "dana",
      productId: "ramune",
      paidInPence: 100,
    });
    expect(fourth.status).toBe(429);
    expect(await machine()).toMatchObject({ cashBoxInPence: 0 });
  });

  it("refuses when change cannot be made and keeps the float and the customer's money apart", async () => {
    const { buy, machine } = await bootMachine({
      coins: { ...createInitialInventory(0), 50: 1, 20: 3 },
      cashBoxInPence: 0,
    });
    const before = await machine();
    expect(before.changeAvailableInPence).toBe(110);

    const stuck = await buy({
      customerId: "erin",
      productId: "ramune",
      paidInPence: 100,
    });
    expect(stuck.status).toBe(409);
    expect(stuck.body).toMatchObject({
      ok: false,
      reason: "cannot_make_change",
    });
    expect(await machine()).toEqual(before);

    const exact = await buy({
      customerId: "erin",
      productId: "ramune",
      paidInPence: 85,
    });
    expect(exact.status).toBe(200);
    expect(exact.body.machine).toMatchObject({
      cashBoxInPence: 85,
      changeAvailableInPence: 110,
    });

    const sixty = await buy({
      customerId: "erin",
      productId: "ramune",
      paidInPence: 145,
    });
    expect(sixty.status).toBe(200);
    expect(sixty.body.change).toEqual([{ denomination: 20, count: 3 }]);
  });

  it("rejects malformed input before touching the machine or the limiter", async () => {
    const { buy, machine } = await bootMachine();
    const bad = await buy({
      customerId: "",
      productId: "ramune",
      paidInPence: 100,
    });
    expect(bad.status).toBe(400);
    for (let i = 0; i < 4; i++) {
      await buy({ customerId: "", productId: "ramune", paidInPence: 100 });
    }
    expect(
      (await buy({ customerId: "frank", productId: "nope", paidInPence: 100 }))
        .status,
    ).toBe(400);
    expect(await machine()).toMatchObject({
      cashBoxInPence: 0,
      changeAvailableInPence: 3880,
    });
  });
});
