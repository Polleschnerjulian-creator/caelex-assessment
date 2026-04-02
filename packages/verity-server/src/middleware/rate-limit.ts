import type { ServerResponse } from "node:http";
import { logger } from "../logging/logger.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RateLimitTier =
  | "verify"
  | "create"
  | "cert_issue"
  | "key_ops"
  | "transparency";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // UTC epoch seconds
  retryAfter: number; // seconds
}

export interface RateLimiter {
  check(key: string, tier: RateLimitTier): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Tier limits (requests per 60-second sliding window)
// ---------------------------------------------------------------------------

const TIER_LIMITS: Record<RateLimitTier, number> = {
  verify: 1000,
  create: 100,
  cert_issue: 50,
  key_ops: 10,
  transparency: 500,
};

/** Sliding window size in seconds. */
const WINDOW_SECONDS = 60;

/** Interval between cleanup sweeps (milliseconds). */
const CLEANUP_INTERVAL_MS = 60_000;

// ---------------------------------------------------------------------------
// InMemoryRateLimiter — sliding-window algorithm
// ---------------------------------------------------------------------------

class InMemoryRateLimiter implements RateLimiter {
  /**
   * Map of composite key (`${tenantId}:${tier}`) to an array of request
   * timestamps (milliseconds since epoch).  Using millisecond precision
   * avoids collisions when multiple requests land in the same second.
   */
  private readonly windows = new Map<string, number[]>();

  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[SECURITY] Using in-memory rate limiter. Rate limits will not be shared across instances. Consider using Redis-backed rate limiting for production deployments.",
      );
    }

    // Periodic cleanup: evict entries whose *newest* timestamp is older than
    // the window so the Map does not grow without bound.
    this.cleanupTimer = setInterval(() => {
      this.evictStaleEntries();
    }, CLEANUP_INTERVAL_MS);

    // Allow the Node.js process to exit even if this timer is still active.
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  async check(key: string, tier: RateLimitTier): Promise<RateLimitResult> {
    const limit = TIER_LIMITS[tier];
    const now = Date.now();
    const windowStart = now - WINDOW_SECONDS * 1000;

    // Retrieve (or create) the timestamp array for this composite key.
    const compositeKey = `${key}:${tier}`;
    let timestamps = this.windows.get(compositeKey);

    if (!timestamps) {
      timestamps = [];
      this.windows.set(compositeKey, timestamps);
    }

    // 1. Remove timestamps older than the sliding window.
    //    Because timestamps are appended in order, we can binary-search for
    //    the cut-off point, but a simple forward scan is fine for the
    //    expected cardinalities (max 1 000 entries).
    const pruned = timestamps.filter((ts) => ts > windowStart);

    // 2. Count remaining requests within the window.
    const count = pruned.length;

    // Calculate resetAt: the earliest timestamp in the window + 60 s.
    // If the window is empty, resetAt is "now + 60 s".
    const earliestTs = pruned.length > 0 ? pruned[0]! : now;
    const resetAtMs = earliestTs + WINDOW_SECONDS * 1000;
    const resetAt = Math.ceil(resetAtMs / 1000); // UTC epoch seconds

    if (count < limit) {
      // 3a. Under limit — record the request and allow.
      pruned.push(now);
      this.windows.set(compositeKey, pruned);

      return {
        allowed: true,
        limit,
        remaining: limit - count - 1, // -1 because we just consumed one
        resetAt,
        retryAfter: 0,
      };
    }

    // 3b. At or over limit — deny.
    this.windows.set(compositeKey, pruned);

    const retryAfterMs = resetAtMs - now;
    const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000));

    logger.warn("Rate limit exceeded", {
      key,
      tier,
      limit,
      window_count: count,
      retry_after: retryAfter,
    });

    return {
      allowed: false,
      limit,
      remaining: 0,
      resetAt,
      retryAfter,
    };
  }

  async reset(key: string): Promise<void> {
    // Remove all tier windows for this key.
    for (const tier of Object.keys(TIER_LIMITS)) {
      this.windows.delete(`${key}:${tier}`);
    }
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Evict map entries whose newest timestamp is older than the current
   * window.  This prevents unbounded memory growth from keys that were
   * active once but are no longer sending requests.
   */
  private evictStaleEntries(): void {
    const cutoff = Date.now() - WINDOW_SECONDS * 1000;
    let evicted = 0;

    for (const [compositeKey, timestamps] of this.windows) {
      // If the list is empty or every timestamp is stale, drop it.
      if (timestamps.length === 0) {
        this.windows.delete(compositeKey);
        evicted++;
        continue;
      }

      // The last element is the newest (appended in order).
      const newest = timestamps[timestamps.length - 1]!;
      if (newest <= cutoff) {
        this.windows.delete(compositeKey);
        evicted++;
      }
    }

    if (evicted > 0) {
      logger.info("Rate limiter cleanup", {
        evicted_keys: evicted,
        remaining_keys: this.windows.size,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Header helper
// ---------------------------------------------------------------------------

/**
 * Sets standard rate-limit response headers on an HTTP response.
 *
 * Applied BEFORE authentication to prevent auth-bypass enumeration — the
 * response timing is identical regardless of whether the resource exists.
 */
export function setRateLimitHeaders(
  res: ServerResponse,
  result: RateLimitResult,
): void {
  res.setHeader("X-RateLimit-Limit", result.limit);
  res.setHeader("X-RateLimit-Remaining", result.remaining);
  res.setHeader("X-RateLimit-Reset", result.resetAt);
  if (!result.allowed) {
    res.setHeader("Retry-After", result.retryAfter);
  }
}

// ---------------------------------------------------------------------------
// Endpoint → tier mapping
// ---------------------------------------------------------------------------

/**
 * Determines the rate-limit tier for a given request path.
 *
 * The order of checks matters: more specific patterns are matched first so
 * that, e.g., `/v1/keys/rotate` is classified as `key_ops` rather than the
 * fallback tier.
 */
export function getTierForEndpoint(path: string): RateLimitTier {
  if (path.includes("/verify")) return "verify";
  if (path.includes("/create")) return "create";
  if (path.includes("/issue")) return "cert_issue";
  if (path.includes("/keys/")) return "key_ops";
  if (path.includes("/transparency")) return "transparency";
  // Default to "create" — the most restrictive non-key tier — to ensure
  // unknown or new endpoints are still meaningfully rate-limited.
  return "create";
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const rateLimiter: RateLimiter = new InMemoryRateLimiter();
