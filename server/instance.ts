import "server-only";
import { createDb } from "./db/client";
import { createInMemoryStore } from "./machine/inMemoryStore";
import { createPostgresStore } from "./machine/postgresStore";
import type { MachineStore } from "./machine/store";
import { createInMemoryRateLimiter } from "./rate-limit/inMemoryRateLimiter";
import type { RateLimiter } from "./rate-limit/rateLimiter";

export type Instances = {
  store: MachineStore;
  limiter: RateLimiter;
};

const createInstances = (): Instances => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return {
      store: createInMemoryStore(),
      limiter: createInMemoryRateLimiter(),
    };
  }
  const db = createDb(connectionString);
  return {
    store: createPostgresStore(db),
    limiter: createInMemoryRateLimiter(),
  };
};

const globalStore = globalThis as typeof globalThis & { __vending?: Instances };

export const getInstances = (): Instances =>
  (globalStore.__vending ??= createInstances());
