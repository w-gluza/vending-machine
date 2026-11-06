import "server-only";
import { createInMemoryStore } from "./machine/inMemoryStore";
import type { MachineStore } from "./machine/store";
import { createInMemoryRateLimiter } from "./rate-limit/inMemoryRateLimiter";
import type { RateLimiter } from "./rate-limit/rateLimiter";

export type Instances = {
  store: MachineStore;
  limiter: RateLimiter;
};

const globalStore = globalThis as typeof globalThis & { __vending?: Instances };

export const getInstances = (): Instances =>
  (globalStore.__vending ??= {
    store: createInMemoryStore(),
    limiter: createInMemoryRateLimiter(),
  });
