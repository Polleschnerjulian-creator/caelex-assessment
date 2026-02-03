/**
 * Rate Limiting Configuration
 *
 * Uses Upstash Redis for distributed rate limiting.
 * Required for DDoS protection and abuse prevention.
 *
 * Required environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 *
 * If Redis is not configured, falls back to in-memory rate limiting
 * (not suitable for production with multiple instances).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ─── Types ───

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}

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
    "[SECURITY WARNING] Upstash Redis not configured. Rate limiting will use in-memory fallback, " +
      "which is not suitable for production with multiple instances.",
  );
}

// ─── Rate Limiters ───

/**
 * Rate limiters for different endpoint types.
 * Adjust these values based on your expected traffic patterns.
 */
export const rateLimiters = redis
  ? {
      // General API: 100 requests per minute per IP
      api: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"),
        analytics: true,
        prefix: "ratelimit:api",
      }),

      // Authentication endpoints: 5 per minute (strict to prevent brute force)
      auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        analytics: true,
        prefix: "ratelimit:auth",
      }),

      // Registration: 3 per hour per IP (prevent mass account creation)
      registration: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "1 h"),
        analytics: true,
        prefix: "ratelimit:registration",
      }),

      // Assessment creation: 10 per hour per user
      assessment: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        analytics: true,
        prefix: "ratelimit:assessment",
      }),

      // Export/Download: 20 per hour (prevent data scraping)
      export: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 h"),
        analytics: true,
        prefix: "ratelimit:export",
      }),

      // Sensitive operations: 5 per hour (password changes, etc.)
      sensitive: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        analytics: true,
        prefix: "ratelimit:sensitive",
      }),
    }
  : null;

// ─── In-Memory Fallback ───

/**
 * Simple in-memory rate limiter for development/fallback.
 * NOT suitable for production with multiple instances.
 */
class InMemoryRateLimiter {
  private requests: Map<string, { count: number; resetAt: number }> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Clean up old entries every minute
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];
      this.requests.forEach((value, key) => {
        if (value.resetAt < now) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => this.requests.delete(key));
    }, 60000);
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const key = identifier;
    const existing = this.requests.get(key);

    if (!existing || existing.resetAt < now) {
      // New window
      this.requests.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return {
        success: true,
        remaining: this.maxRequests - 1,
        reset: now + this.windowMs,
        limit: this.maxRequests,
      };
    }

    if (existing.count >= this.maxRequests) {
      return {
        success: false,
        remaining: 0,
        reset: existing.resetAt,
        limit: this.maxRequests,
      };
    }

    existing.count++;
    return {
      success: true,
      remaining: this.maxRequests - existing.count,
      reset: existing.resetAt,
      limit: this.maxRequests,
    };
  }
}

// Fallback limiters
const fallbackLimiters = {
  api: new InMemoryRateLimiter(100, 60000),
  auth: new InMemoryRateLimiter(5, 60000),
  registration: new InMemoryRateLimiter(3, 3600000),
  assessment: new InMemoryRateLimiter(10, 3600000),
  export: new InMemoryRateLimiter(20, 3600000),
  sensitive: new InMemoryRateLimiter(5, 3600000),
};

// ─── Public API ───

export type RateLimitType =
  | "api"
  | "auth"
  | "registration"
  | "assessment"
  | "export"
  | "sensitive";

/**
 * Check rate limit for an identifier.
 *
 * @param type - Type of rate limit to apply
 * @param identifier - Unique identifier (usually IP or user ID)
 * @returns Rate limit result with success status and remaining requests
 */
export async function checkRateLimit(
  type: RateLimitType,
  identifier: string,
): Promise<RateLimitResult> {
  if (rateLimiters) {
    const limiter = rateLimiters[type];
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: result.limit,
    };
  }

  // Fallback to in-memory
  return fallbackLimiters[type].limit(identifier);
}

/**
 * Get identifier from request.
 * Prefers user ID if available, falls back to IP.
 */
export function getIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Get IP from headers (in order of preference)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip"); // Cloudflare

  const ip = cfIp || realIp || forwarded?.split(",")[0]?.trim() || "unknown";

  return `ip:${ip}`;
}

/**
 * Create rate limit response headers.
 */
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", result.reset.toString());
  return headers;
}

/**
 * Create a 429 Too Many Requests response.
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": retryAfter.toString(),
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": result.reset.toString(),
      },
    },
  );
}
