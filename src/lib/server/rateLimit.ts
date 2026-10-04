import "server-only";

/**
 * Sliding-window rate limiter keyed by client + bucket.
 * In-memory: correct for a single Node process. For multi-instance deployments, swap the
 * store for Redis/Upstash (same interface).
 */
type Bucket = { limit: number; windowMs: number };

export const LIMITS = {
  research: { limit: 30, windowMs: 10 * 60_000 }, // web-search fallback can be expensive
  parse: { limit: 30, windowMs: 60_000 },
  substitute: { limit: 20, windowMs: 60_000 },
  shopping: { limit: 20, windowMs: 60_000 },
  geocode: { limit: 20, windowMs: 60_000 },
  write: { limit: 60, windowMs: 60_000 },
} satisfies Record<string, Bucket>;

const g = globalThis as unknown as { __rl?: Map<string, number[]> };
const hits = (g.__rl ??= new Map<string, number[]>());

export function rateLimit(clientKey: string, bucket: keyof typeof LIMITS) {
  const { limit, windowMs } = LIMITS[bucket];
  const key = `${bucket}:${clientKey}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    const retryAfterSec = Math.ceil((windowMs - (now - recent[0])) / 1000);
    hits.set(key, recent);
    return { ok: false as const, retryAfterSec };
  }
  recent.push(now);
  hits.set(key, recent);
  // opportunistic cleanup
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < 60 * 60_000)) hits.delete(k);
  }
  return { ok: true as const, remaining: limit - recent.length };
}
