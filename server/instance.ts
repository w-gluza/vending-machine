import "server-only";
import { createDb, type Db } from "./db/client";
import { createInMemoryStore } from "./machine/inMemoryStore";
import {
  createPostgresStore,
  RESET_MACHINE,
  resetMachineParams,
} from "./machine/postgresStore";
import type { MachineStore } from "./machine/store";
import { createInMemoryRateLimiter } from "./rate-limit/inMemoryRateLimiter";
import {
  CLEAR_ATTEMPTS,
  createPostgresRateLimiter,
} from "./rate-limit/postgresRateLimiter";
import type { RateLimiter } from "./rate-limit/rateLimiter";

export type Instances = {
  store: MachineStore;
  limiter: RateLimiter;
  reset(): Promise<void>;
};

export const createInMemoryInstances = (
  store: MachineStore = createInMemoryStore(),
  limiter: RateLimiter = createInMemoryRateLimiter(),
): Instances => ({
  store,
  limiter,
  async reset() {
    await store.reset();
    await limiter.reset();
  },
});

export const createPostgresInstances = (db: Db): Instances => ({
  store: createPostgresStore(db),
  limiter: createPostgresRateLimiter(db),
  reset: () =>
    db.transaction(async (client) => {
      await client.query(RESET_MACHINE, resetMachineParams());
      await client.query(CLEAR_ATTEMPTS);
    }),
});

const createInstances = (): Instances => {
  const connectionString = process.env.DATABASE_URL;
  return connectionString
    ? createPostgresInstances(createDb(connectionString))
    : createInMemoryInstances();
};

const globalStore = globalThis as typeof globalThis & { __vending?: Instances };

export const getInstances = (): Instances =>
  (globalStore.__vending ??= createInstances());
