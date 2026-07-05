/**
 * In-memory token-bucket rate limiter.
 *
 * Provider-swappable: the interface (`limit`) is stable so a Redis/Upstash
 * backend can replace the in-memory store without touching call sites. In
 * dev/single-instance this is sufficient; production multi-instance should
 * swap the store.
 */

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max requests per window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetMs: number;
}

export function limit(
  key: string,
  { max, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const refillRate = max / windowMs; // tokens per ms
  const bucket = buckets.get(key) ?? { tokens: max, updatedAt: now };

  // Refill based on elapsed time.
  const elapsed = now - bucket.updatedAt;
  bucket.tokens = Math.min(max, bucket.tokens + elapsed * refillRate);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    buckets.set(key, bucket);
    const resetMs = Math.ceil((1 - bucket.tokens) / refillRate);
    return { ok: false, remaining: 0, resetMs };
  }

  bucket.tokens -= 1;
  buckets.set(key, bucket);
  return { ok: true, remaining: Math.floor(bucket.tokens), resetMs: 0 };
}

// Periodic cleanup so the map doesn't grow unbounded.
if (typeof setInterval !== "undefined") {
  const CLEAN_EVERY = 10 * 60_000;
  const timer = setInterval(() => {
    const cutoff = Date.now() - CLEAN_EVERY;
    for (const [key, b] of buckets) {
      if (b.updatedAt < cutoff) buckets.delete(key);
    }
  }, CLEAN_EVERY);
  // Don't keep the process alive for cleanup alone.
  (timer as { unref?: () => void }).unref?.();
}
