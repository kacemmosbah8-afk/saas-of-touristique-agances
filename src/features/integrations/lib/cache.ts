import "server-only";

import { prisma } from "@/shared/lib/db";
import { logger } from "@/shared/lib/logger";

/**
 * Cache layer for provider responses (destination lookups, airport/airline
 * catalogues, search results). Backed by the `cache_entries` table today;
 * the `CacheStore` interface is the seam for a Redis implementation — set
 * REDIS_URL and register a RedisCacheStore here without touching callers.
 */

export interface CacheStore {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/** In-memory store — used in unit tests and as a per-instance L1 if desired. */
export class MemoryCacheStore implements CacheStore {
  private entries = new Map<string, { value: unknown; expiresAt: number }>();

  async get(key: string): Promise<unknown | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }
}

class DbCacheStore implements CacheStore {
  async get(key: string): Promise<unknown | null> {
    const entry = await prisma.cacheEntry.findUnique({ where: { key } });
    if (!entry) return null;
    if (entry.expiresAt <= new Date()) {
      // Lazy expiry — delete on read; a periodic cleanup can also prune.
      await prisma.cacheEntry.delete({ where: { key } }).catch(() => undefined);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await prisma.cacheEntry.upsert({
      where: { key },
      create: { key, value: value as never, expiresAt },
      update: { value: value as never, expiresAt },
    });
  }

  async delete(key: string): Promise<void> {
    await prisma.cacheEntry.delete({ where: { key } }).catch(() => undefined);
  }
}

// Redis support: when REDIS_URL is configured, swap this for a RedisCacheStore
// implementing the same interface. The DB store is the default backend.
const store: CacheStore = new DbCacheStore();

/** Build a namespaced cache key. Include tenant scope for tenant-specific data. */
export function cacheKey(...parts: (string | number)[]): string {
  return parts.map((p) => String(p).toLowerCase().replace(/\s+/g, "_")).join(":");
}

/**
 * Read-through cache: return the cached value for `key`, or run `fn`,
 * store its result for `ttlSeconds`, and return it. Cache failures never
 * break the request — they degrade to calling `fn` directly.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  try {
    const existing = await store.get(key);
    if (existing !== null) {
      return { value: existing as T, hit: true };
    }
  } catch (err) {
    logger.warn("cache read failed", { key, error: String(err) });
  }

  const value = await fn();

  try {
    await store.set(key, value, ttlSeconds);
  } catch (err) {
    logger.warn("cache write failed", { key, error: String(err) });
  }

  return { value, hit: false };
}

export async function invalidateCache(key: string): Promise<void> {
  await store.delete(key);
}
