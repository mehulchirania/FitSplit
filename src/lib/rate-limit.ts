/**
 * Minimal in-memory sliding-window limiter for abuse guards on signup/login.
 * Per server instance (best effort): it blunts scripted abuse; Firebase Auth's own
 * TOO_MANY_ATTEMPTS protection remains the backstop for credential stuffing.
 */
const buckets = new Map<string, number[]>();
const MAX_KEYS = 10_000;

export function hitRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): { limited: boolean; retryAfterMs: number } {
  const fresh = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (fresh.length >= limit) {
    buckets.set(key, fresh);
    return { limited: true, retryAfterMs: windowMs - (now - fresh[0]) };
  }
  fresh.push(now);
  buckets.set(key, fresh);
  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
    }
  }
  return { limited: false, retryAfterMs: 0 };
}

/** Test hook. */
export function resetRateLimits() {
  buckets.clear();
}
