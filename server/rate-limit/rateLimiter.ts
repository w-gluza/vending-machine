export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterMs: number };

export type RateLimiter = {
  attempt(key: string, now: number): Promise<RateLimitDecision>;
  reset(): Promise<void>;
};

export const RATE_LIMIT_ATTEMPTS = 3;
export const RATE_LIMIT_WINDOW_MS = 3_000;
