/**
 * Cache Utility for API Responses
 *
 * Uses Upstash Redis for distributed caching across serverless instances.
 * Gracefully falls back to no caching if Redis is not configured.
 *
 * Required environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 *
 * All cache keys are prefixed with "caelex:cache:" for namespace isolation.
 */

import "server-only";
import { Redis } from "@upstash/redis";

// ─── Configuration ───

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Redis client (null if not configured)
const redis =
  REDIS_URL && REDIS_TOKEN
    ? new Redis({
        url: REDIS_URL,
        token: REDIS_TOKEN,
      })
    : null;

// Log warning if Redis not configured
if (!redis && process.env.NODE_ENV === "production") {
  console.warn(
    "[CACHE WARNING] Upstash Redis not configured. Caching will be disabled. " +
      "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production caching.",
  );
}

// ─── Constants ───

const CACHE_PREFIX = "caelex:cache:";
const DEFAULT_TTL_SECONDS = 300; // 5 minutes

// ─── Helper Functions ───

/**
 * Build cache key with namespace prefix.
 */
function buildKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

// ─── Public API ───

/**
 * Get a cached value by key.
 *
 * @param key - Cache key (will be prefixed with "caelex:cache:")
 * @returns Cached value or null if not found / Redis unavailable
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) {
    return null;
  }

  try {
    const fullKey = buildKey(key);
    const value = await redis.get<string>(fullKey);

    if (value === null) {
      return null;
    }

    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[CACHE] Error getting key "${key}":`, error);
    return null;
  }
}

/**
 * Set a cached value with optional TTL.
 *
 * @param key - Cache key (will be prefixed with "caelex:cache:")
 * @param value - Value to cache (will be JSON serialized)
 * @param ttlSeconds - Time to live in seconds (default: 300s / 5min)
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const fullKey = buildKey(key);
    const serialized = JSON.stringify(value);
    await redis.set(fullKey, serialized, { ex: ttlSeconds });
  } catch (error) {
    console.error(`[CACHE] Error setting key "${key}":`, error);
  }
}

/**
 * Delete a cached value by key.
 *
 * @param key - Cache key (will be prefixed with "caelex:cache:")
 */
export async function cacheDelete(key: string): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const fullKey = buildKey(key);
    await redis.del(fullKey);
  } catch (error) {
    console.error(`[CACHE] Error deleting key "${key}":`, error);
  }
}

/**
 * Cache-through helper: returns cached value if exists, otherwise calls fn(),
 * caches the result, and returns it.
 *
 * @param key - Cache key (will be prefixed with "caelex:cache:")
 * @param fn - Function to call if cache miss
 * @param ttlSeconds - Time to live in seconds (default: 300s / 5min)
 * @returns Cached or freshly computed value
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<T> {
  // If Redis not configured, just call fn()
  if (!redis) {
    return fn();
  }

  // Try to get from cache
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss: call function
  const result = await fn();

  // Cache the result (fire and forget, don't block return)
  cacheSet(key, result, ttlSeconds).catch((error) => {
    console.error(`[CACHE] Failed to cache result for key "${key}":`, error);
  });

  return result;
}

/**
 * Delete all keys matching a prefix pattern.
 *
 * @param pattern - Key prefix pattern (without "caelex:cache:" prefix)
 *
 * Example: invalidatePattern("jurisdictions") deletes all keys starting with "caelex:cache:jurisdictions"
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const fullPattern = buildKey(pattern);
    const keys = await redis.keys(`${fullPattern}*`);

    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(
        `[CACHE] Invalidated ${keys.length} keys matching "${pattern}"`,
      );
    }
  } catch (error) {
    console.error(`[CACHE] Error invalidating pattern "${pattern}":`, error);
  }
}
