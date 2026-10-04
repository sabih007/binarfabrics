/* ==========================================================================
   Fixed-window rate limiter.

   In-memory, so each serverless instance keeps its own counters — enough to
   stop a form being hammered from one browser, not a distributed flood. Swap
   `hit()` for Upstash/Redis if you need limits shared across instances.
   ========================================================================== */

import { HttpError } from "./api";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
}

export function hit(key: string, limit: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
} {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  bucket.count += 1;
  const allowed = bucket.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** Throws a 429 when the caller is over budget. */
export function enforce(key: string, limit: number, windowMs: number) {
  const res = hit(key, limit, windowMs);
  if (!res.allowed) {
    throw new HttpError(
      429,
      `Too many requests. Please wait ${res.retryAfter}s and try again.`,
      "RATE_LIMITED"
    );
  }
}
