import "server-only";

/** Tiny TTL + LRU cache used when no database is configured (and as a hot layer in front of it). */
export class MemoryCache<V> {
  private map = new Map<string, { value: V; expires: number }>();
  constructor(private maxEntries = 500) {}

  get(key: string): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // refresh LRU position
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
  }

  set(key: string, value: V, ttlMs: number) {
    if (this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expires: Date.now() + ttlMs });
  }

  delete(key: string) {
    this.map.delete(key);
  }
}

/** Keep caches across dev hot-reloads. */
export function sharedCache<V>(name: string, maxEntries?: number): MemoryCache<V> {
  const g = globalThis as unknown as { __caches?: Record<string, MemoryCache<unknown>> };
  g.__caches ??= {};
  g.__caches[name] ??= new MemoryCache<unknown>(maxEntries);
  return g.__caches[name] as MemoryCache<V>;
}
