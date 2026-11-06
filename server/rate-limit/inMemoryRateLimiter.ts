import {
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
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError(`Rate limit must be a positive integer, got ${limit}`);
  }
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new RangeError(`Rate limit window must be positive, got ${windowMs}`);
  }
  if (!Number.isSafeInteger(pruneAbove) || pruneAbove < 1) {
    throw new RangeError(
      `Prune threshold must be a positive integer, got ${pruneAbove}`,
    );
  }

  const attempts = new Map<string, number[]>();

  const prune = (cutoff: number) => {
    for (const [key, times] of attempts) {
      const recent = times.filter((t) => t > cutoff);
      if (recent.length === 0) attempts.delete(key);
      else attempts.set(key, recent);
    }
  };

  return {
    async attempt(key, now) {
      const cutoff = now - windowMs;
      const recent = (attempts.get(key) ?? []).filter((t) => t > cutoff);
      const allowed = recent.length < limit;

      attempts.set(key, allowed ? [...recent, now] : recent);
      if (attempts.size > pruneAbove) prune(cutoff);

      return allowed
        ? { allowed, remaining: limit - recent.length - 1 }
        : { allowed, retryAfterMs: recent[0] + windowMs - now };
    },
    trackedKeys: () => attempts.size,
  };
};
