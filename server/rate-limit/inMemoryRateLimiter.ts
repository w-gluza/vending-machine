import {
  assertRateLimitConfig,
  RATE_LIMIT_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  type RateLimiter,
} from "./rateLimiter";

const DEFAULT_PRUNE_ABOVE = 1000;

export type InMemoryRateLimiter = RateLimiter & {
  trackedKeys(): number;
};

export const createInMemoryRateLimiter = (
  limit = RATE_LIMIT_ATTEMPTS,
  windowMs = RATE_LIMIT_WINDOW_MS,
  pruneAbove = DEFAULT_PRUNE_ABOVE,
): InMemoryRateLimiter => {
  assertRateLimitConfig(limit, windowMs);
  if (!Number.isSafeInteger(pruneAbove) || pruneAbove < 1) {
    throw new RangeError(
      `Prune threshold must be a positive integer, got ${pruneAbove}`,
    );
  }

  const attempts = new Map<string, number[]>();
  let lastSweepAt = -Infinity;

  const sweep = (now: number, cutoff: number) => {
    if (attempts.size <= pruneAbove || now - lastSweepAt < windowMs) return;
    lastSweepAt = now;
    for (const [key, times] of attempts) {
      if (times[times.length - 1] <= cutoff) attempts.delete(key);
    }
  };

  return {
    async attempt(key, now) {
      const cutoff = now - windowMs;
      const recent = (attempts.get(key) ?? []).filter((t) => t > cutoff);
      const allowed = recent.length < limit;

      attempts.set(key, allowed ? [...recent, now] : recent);
      sweep(now, cutoff);

      return allowed
        ? { allowed, remaining: limit - recent.length - 1 }
        : { allowed, retryAfterMs: recent[0] + windowMs - now };
    },
    async reset() {
      attempts.clear();
    },
    trackedKeys: () => attempts.size,
  };
};
