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
import { NextResponse } from "next/server";

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

// Enforce Redis in production — in-memory fallback is not safe for multi-instance
if (!redis && process.env.NODE_ENV === "production") {
  console.error(
    "[SECURITY] Upstash Redis not configured in production. " +
      "Rate limiting will use in-memory fallback which is NOT safe for " +
      "multi-instance deployments (Vercel serverless). " +
      "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
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

      // Supplier portal: 30 requests per hour per IP (public endpoint protection)
      supplier: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 h"),
        analytics: true,
        prefix: "ratelimit:supplier",
      }),

      // AI document generation: 5 per hour per user (expensive AI calls)
      document_generation: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        analytics: true,
        prefix: "ratelimit:docgen",
      }),

      // NCA Portal: 30 requests per hour for browsing, 10 for package assembly
      nca_portal: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 h"),
        analytics: true,
        prefix: "ratelimit:nca_portal",
      }),

      // NCA Package assembly: 10 per hour (creates DB records)
      nca_package: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        analytics: true,
        prefix: "ratelimit:nca_package",
      }),

      // Public API: 5 per hour per IP (strict, unauthenticated endpoints)
      public_api: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        analytics: true,
        prefix: "ratelimit:public_api",
      }),

      // Widget analytics tracking: 30 per hour per IP
      widget: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 h"),
        analytics: true,
        prefix: "ratelimit:widget",
      }),

      // MFA operations: 5 per minute (strict to prevent brute force on TOTP/backup codes)
      mfa: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        analytics: true,
        prefix: "ratelimit:mfa",
      }),

      // Generate 2.0: 20 per hour per user (AI section generation calls)
      generate2: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 h"),
        analytics: true,
        prefix: "ratelimit:generate2",
      }),

      // Admin operations: 30 per minute
      admin: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        analytics: true,
        prefix: "ratelimit:admin",
      }),

      // Contact form: 5 per hour per IP (prevent spam)
      contact: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        analytics: true,
        prefix: "ratelimit:contact",
      }),

      // Assure: 30 per hour (authenticated dashboard)
      assure: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 h"),
        analytics: true,
        prefix: "ratelimit:assure",
      }),

      // Assure public share view: 10 per hour per IP (more restrictive)
      assure_public: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        analytics: true,
        prefix: "ratelimit:assure_public",
      }),

      // Academy: 30 requests per minute per user
      academy: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, "1 m"),
        analytics: true,
        prefix: "ratelimit:academy",
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

// Fallback limiters — MORE CONSERVATIVE than Redis limits because in-memory
// rate limiting does not work across serverless instances. Lower limits help
// mitigate the risk of per-instance abuse.
const fallbackLimiters = {
  api: new InMemoryRateLimiter(30, 60000), // 30/min vs 100/min (Redis)
  auth: new InMemoryRateLimiter(3, 60000), // 3/min vs 5/min (Redis)
  registration: new InMemoryRateLimiter(1, 3600000), // 1/hr vs 3/hr (Redis)
  assessment: new InMemoryRateLimiter(5, 3600000), // 5/hr vs 10/hr (Redis)
  export: new InMemoryRateLimiter(5, 3600000), // 5/hr vs 20/hr (Redis)
  sensitive: new InMemoryRateLimiter(2, 3600000), // 2/hr vs 5/hr (Redis)
  supplier: new InMemoryRateLimiter(10, 3600000), // 10/hr vs 30/hr (Redis)
  document_generation: new InMemoryRateLimiter(2, 3600000), // 2/hr vs 5/hr (Redis)
  nca_portal: new InMemoryRateLimiter(10, 3600000), // 10/hr vs 30/hr (Redis)
  nca_package: new InMemoryRateLimiter(3, 3600000), // 3/hr vs 10/hr (Redis)
  public_api: new InMemoryRateLimiter(2, 3600000), // 2/hr vs 5/hr (Redis)
  widget: new InMemoryRateLimiter(10, 3600000), // 10/hr vs 30/hr (Redis)
  mfa: new InMemoryRateLimiter(3, 60000), // 3/min vs 5/min (Redis)
  generate2: new InMemoryRateLimiter(5, 3600000), // 5/hr vs 20/hr (Redis)
  admin: new InMemoryRateLimiter(10, 60000), // 10/min vs 30/min (Redis)
  contact: new InMemoryRateLimiter(2, 3600000), // 2/hr vs 5/hr (Redis)
  assure: new InMemoryRateLimiter(15, 3600000), // 15/hr vs 30/hr (Redis)
  assure_public: new InMemoryRateLimiter(5, 3600000), // 5/hr vs 10/hr (Redis)
  academy: new InMemoryRateLimiter(15, 60000), // 15/min vs 30/min (Redis)
};

// ─── Public API ───

export type RateLimitType =
  | "api"
  | "auth"
  | "registration"
  | "assessment"
  | "export"
  | "sensitive"
  | "supplier"
  | "document_generation"
  | "nca_portal"
  | "nca_package"
  | "public_api"
  | "widget"
  | "generate2"
  | "mfa"
  | "admin"
  | "contact"
  | "assure"
  | "assure_public"
  | "academy";

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

  // Fallback to in-memory — log warning as this is not safe for multi-instance
  console.warn(
    `[SECURITY] Rate limiting for "${type}" falling back to in-memory. ` +
      "This is NOT safe for multi-instance deployments. " +
      "Configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
  );
  return fallbackLimiters[type].limit(identifier);
}

/**
 * Validate that a string looks like a valid IP address.
 * Basic validation to prevent header injection attacks.
 */
function isValidIp(ip: string | null | undefined): ip is string {
  if (!ip) return false;

  // Basic validation: alphanumeric, dots, colons (for IPv6), and hyphens
  // Max length for IPv6 with zone ID
  if (ip.length > 45 || ip.length < 7) return false;

  // IPv4: xxx.xxx.xxx.xxx
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".");
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  // IPv6: Basic validation (simplified)
  const ipv6Regex = /^[a-fA-F0-9:]+$/;
  return ipv6Regex.test(ip);
}

/**
 * Get identifier from request.
 * Prefers user ID if available, falls back to IP.
 *
 * SECURITY: IP headers can be spoofed. We use the following trust order:
 * 1. Cloudflare's cf-connecting-ip (set by Cloudflare, cannot be spoofed by client)
 * 2. Vercel's x-real-ip (set by Vercel, cannot be spoofed by client)
 * 3. The rightmost IP in x-forwarded-for (added by trusted proxy)
 * 4. Fallback to "unknown" with strict rate limiting
 *
 * NOTE: x-forwarded-for can contain multiple IPs. The leftmost is the client,
 * but it can be spoofed. The rightmost is added by the trusted proxy.
 * In production behind a CDN, prefer CDN-specific headers.
 */
export function getIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Priority 1: Cloudflare's header (trusted, cannot be spoofed by client)
  const cfIp = request.headers.get("cf-connecting-ip");
  if (isValidIp(cfIp)) {
    return `ip:${cfIp}`;
  }

  // Priority 2: Vercel's header (trusted, cannot be spoofed by client)
  const realIp = request.headers.get("x-real-ip");
  if (isValidIp(realIp)) {
    return `ip:${realIp}`;
  }

  // Priority 3: x-forwarded-for - use the RIGHTMOST IP (added by trusted proxy)
  // The leftmost IP is the original client but can be spoofed
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    // Use the rightmost non-internal IP (added by our trusted proxy)
    // In a proper setup, this would be the IP of the client as seen by the CDN
    const lastIp = ips[ips.length - 1];
    if (isValidIp(lastIp)) {
      return `ip:${lastIp}`;
    }
  }

  // Fallback: Unknown - this will be heavily rate limited as all unknown
  // requests share the same identifier
  console.warn(
    "[SECURITY] Could not determine client IP for rate limiting. " +
      "This may indicate a misconfigured proxy or an attack attempt.",
  );
  return "ip:unknown";
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
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  return new NextResponse(
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
