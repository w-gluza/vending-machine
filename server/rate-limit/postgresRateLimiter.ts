import type { Db } from "@/server/db/client";
import {
  assertRateLimitConfig,
  RATE_LIMIT_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  type RateLimiter,
} from "./rateLimiter";

export const CLEAR_ATTEMPTS = "DELETE FROM customer_rate_limit";

type AttemptsRow = { attempts_ms: string[] };

const ascending = (a: number, b: number) => a - b;

export const createPostgresRateLimiter = (
  db: Db,
  limit = RATE_LIMIT_ATTEMPTS,
  windowMs = RATE_LIMIT_WINDOW_MS,
): RateLimiter => {
  assertRateLimitConfig(limit, windowMs);

  return {
    attempt: (key, now) =>
      db.transaction(async (client) => {
        await client.query(
          `INSERT INTO customer_rate_limit (customer_id) VALUES ($1)
           ON CONFLICT (customer_id) DO NOTHING`,
          [key],
        );
        const { rows } = await client.query<AttemptsRow>(
          "SELECT attempts_ms FROM customer_rate_limit WHERE customer_id = $1 FOR UPDATE",
          [key],
        );
        const cutoff = now - windowMs;
        const recent = (rows[0]?.attempts_ms ?? [])
          .map(Number)
          .filter((t) => t > cutoff)
          .sort(ascending);
        const allowed = recent.length < limit;
        const kept = allowed ? [...recent, now].sort(ascending) : recent;

        await client.query(
          `INSERT INTO customer_rate_limit (customer_id, attempts_ms)
           VALUES ($1, $2::bigint[])
           ON CONFLICT (customer_id)
           DO UPDATE SET attempts_ms = EXCLUDED.attempts_ms, updated_at = now()`,
          [key, kept],
        );

        return allowed
          ? { allowed, remaining: limit - recent.length - 1 }
          : { allowed, retryAfterMs: recent[0] + windowMs - now };
      }),
    async reset() {
      await db.query(CLEAR_ATTEMPTS);
    },
  };
};
