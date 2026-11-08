export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number };

export type RateLimiter = {
  attempt(key: string, now: number): Promise<RateLimitDecision>;
  reset(): Promise<void>;
};

export const RATE_LIMIT_ATTEMPTS = 3;
export const RATE_LIMIT_WINDOW_MS = 3_000;

export const assertRateLimitConfig = (limit: number, windowMs: number) => {
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError(`Rate limit must be a positive integer, got ${limit}`);
  }
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new RangeError(`Rate limit window must be positive, got ${windowMs}`);
  }
};
