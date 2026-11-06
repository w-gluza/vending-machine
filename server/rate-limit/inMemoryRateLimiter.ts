import {
  RATE_LIMIT_ATTEMPTS,
  RATE_LIMIT_WINDOW_MS,
  type RateLimiter,
} from "./rateLimiter";

export const createInMemoryRateLimiter = (
  limit = RATE_LIMIT_ATTEMPTS,
  windowMs = RATE_LIMIT_WINDOW_MS,
): RateLimiter => {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError(`Rate limit must be a positive integer, got ${limit}`);
  }
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new RangeError(`Rate limit window must be positive, got ${windowMs}`);
  }

  const attempts = new Map<string, number[]>();

  return {
    async attempt(key, now) {
      const cutoff = now - windowMs;
      const recent = (attempts.get(key) ?? []).filter((t) => t > cutoff);

      if (recent.length >= limit) {
        attempts.set(key, recent);
        return { allowed: false, retryAfterMs: recent[0] + windowMs - now };
      }

      attempts.set(key, [...recent, now]);
      return { allowed: true, remaining: limit - recent.length - 1 };
    },
  };
};
