/**
 * Next.js Middleware (Lightweight)
 *
 * Handles:
 * - Security headers + X-Robots-Tag for data protection
 * - Bot detection for assessment API
 * - Protected route redirects
 * - CSRF validation for API routes
 * - Rate limiting for all API routes (general tier)
 *
 * NOTE: Kept minimal to stay under Vercel's 1MB Edge Function limit.
 * Auth verification happens in API route handlers.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfToken,
  validateCsrfToken,
} from "@/lib/csrf";

// ─── Rate Limiting (Edge-compatible) ───

// Initialize rate limiter only when Redis is configured
let apiRateLimiter: Ratelimit | null = null;
let authRateLimiter: Ratelimit | null = null;

function getApiRateLimiter(): Ratelimit | null {
  if (apiRateLimiter) return apiRateLimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  apiRateLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    analytics: true,
    prefix: "ratelimit:mw:api",
  });
  return apiRateLimiter;
}

function getAuthRateLimiter(): Ratelimit | null {
  if (authRateLimiter) return authRateLimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  authRateLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "ratelimit:mw:auth",
  });
  return authRateLimiter;
}

// Routes exempt from middleware rate limiting (webhooks, cron jobs)
const RATE_LIMIT_EXEMPT_ROUTES = [
  "/api/v1/webhooks",
  "/api/cron/",
  "/api/auth/", // NextAuth callbacks have their own protection
];

function getClientIp(req: NextRequest): string {
  // Trust CDN headers first (cannot be spoofed by client)
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    return ips[ips.length - 1] || "unknown";
  }

  return "unknown";
}

// ─── Security Headers ───

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

// Known scraper/bot User-Agents to block on assessment endpoints
const BLOCKED_USER_AGENTS = [
  "scrapy",
  "python-requests",
  "go-http-client",
  "wget",
  "curl",
  "httpclient",
  "java/",
  "libwww",
  "mechanize",
  "phantomjs",
  "headlesschrome",
];

function applySecurityHeaders(
  response: NextResponse,
  pathname?: string,
): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Prevent indexing of API routes, JSON data files, and dashboard
  if (
    pathname &&
    (pathname.startsWith("/api") ||
      pathname.endsWith(".json") ||
      pathname.startsWith("/dashboard"))
  ) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return response;
}

// ─── Bot Detection ───

function isLikelyBot(req: NextRequest): boolean {
  const ua = (req.headers.get("user-agent") || "").toLowerCase();

  // No User-Agent at all
  if (!ua || ua.length < 10) return true;

  // Known scraper user agents
  if (BLOCKED_USER_AGENTS.some((bot) => ua.includes(bot))) return true;

  // WebDriver/headless browser indicators
  if (req.headers.get("sec-ch-ua-platform") === "") return true;

  return false;
}

// ─── CSRF Protection ───

const CSRF_EXEMPT_ROUTES = [
  "/api/cron/",
  "/api/supplier/",
  "/api/v1/webhooks",
  "/api/auth/",
  "/api/assessment/", // Assessment is public, CSRF exempt (rate limited instead)
  "/api/nis2/calculate", // NIS2 assessment is public, CSRF exempt (rate limited instead)
];

function validateOrigin(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return true;

  const pathname = req.nextUrl.pathname;
  if (CSRF_EXEMPT_ROUTES.some((route) => pathname.startsWith(route)))
    return true;

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const requestOrigin = origin || (referer ? new URL(referer).origin : null);

  if (!requestOrigin && process.env.NODE_ENV === "development") return true;
  if (!requestOrigin) return false;

  const allowedOrigins: string[] = [];
  if (process.env.NEXT_PUBLIC_APP_URL)
    allowedOrigins.push(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.VERCEL_URL)
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.NODE_ENV === "development") {
    allowedOrigins.push("http://localhost:3000", "http://127.0.0.1:3000");
  }

  return allowedOrigins.length === 0 || allowedOrigins.includes(requestOrigin);
}

// ─── Main Middleware ───

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith("/api");

  // Block bots on assessment API endpoints (EU Space Act + NIS2)
  if (
    (pathname.startsWith("/api/assessment") ||
      pathname.startsWith("/api/nis2/calculate")) &&
    isLikelyBot(req)
  ) {
    return applySecurityHeaders(
      new NextResponse(
        JSON.stringify({
          error: "Forbidden",
          message: "Automated access is not permitted",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
      pathname,
    );
  }

  // Request size limit for API routes (10MB general, 50MB for document uploads)
  if (isApiRoute) {
    const contentLength = parseInt(
      req.headers.get("content-length") || "0",
      10,
    );
    const isUploadRoute = pathname.startsWith("/api/documents");
    const maxSize = isUploadRoute ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

    if (contentLength > maxSize) {
      return applySecurityHeaders(
        new NextResponse(
          JSON.stringify({
            error: "Payload Too Large",
            message: `Request body exceeds maximum size of ${maxSize / (1024 * 1024)}MB`,
          }),
          { status: 413, headers: { "Content-Type": "application/json" } },
        ),
        pathname,
      );
    }
  }

  // Rate limiting for API routes
  if (isApiRoute) {
    const isExempt = RATE_LIMIT_EXEMPT_ROUTES.some((route) =>
      pathname.startsWith(route),
    );

    if (!isExempt) {
      // Use stricter limiter for auth-related endpoints
      const isAuthRoute =
        pathname.startsWith("/api/auth") ||
        pathname === "/api/signup" ||
        pathname === "/api/login";
      const limiter = isAuthRoute ? getAuthRateLimiter() : getApiRateLimiter();

      if (limiter) {
        const ip = getClientIp(req);
        const result = await limiter.limit(`ip:${ip}`);

        if (!result.success) {
          const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
          return applySecurityHeaders(
            new NextResponse(
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
            ),
            pathname,
          );
        }
      }
    }
  }

  // CSRF check for API routes (origin validation + double-submit cookie)
  if (isApiRoute) {
    // Layer 1: Origin validation
    if (!validateOrigin(req)) {
      return applySecurityHeaders(
        new NextResponse(
          JSON.stringify({
            error: "Forbidden",
            message: "Invalid request origin",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        ),
        pathname,
      );
    }

    // Layer 2: Double-submit cookie validation for mutating requests
    // NOTE: Currently in monitoring mode (log-only). Origin validation (Layer 1)
    // provides primary CSRF protection. Double-submit enforcement will be enabled
    // once all client-side fetch calls include csrfHeaders().
    const method = req.method.toUpperCase();
    const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    const isCsrfExempt = CSRF_EXEMPT_ROUTES.some((route) =>
      pathname.startsWith(route),
    );

    if (isMutating && !isCsrfExempt) {
      const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
      const headerToken = req.headers.get(CSRF_HEADER_NAME);

      if (cookieToken && !validateCsrfToken(cookieToken, headerToken)) {
        // Log for monitoring — will be enforced once all clients send CSRF headers
        console.warn(`[CSRF] Missing/invalid token on ${method} ${pathname}`);
      }
    }
  }

  // Protected routes — check for session cookie
  if (pathname.startsWith("/dashboard")) {
    const hasSession =
      req.cookies.has("__Secure-authjs.session-token") ||
      req.cookies.has("authjs.session-token");

    if (!hasSession) {
      // If no auth configured at all, redirect to home
      if (!process.env.AUTH_SECRET) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL("/", req.url)),
          pathname,
        );
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl), pathname);
    }
  }

  // Auth routes — redirect if already logged in
  if (["/login", "/signup"].includes(pathname)) {
    const hasSession =
      req.cookies.has("__Secure-authjs.session-token") ||
      req.cookies.has("authjs.session-token");

    if (hasSession) {
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
      return applySecurityHeaders(
        NextResponse.redirect(new URL(callbackUrl || "/dashboard", req.url)),
        pathname,
      );
    }
  }

  // Set CSRF cookie if not present (readable by JS for double-submit pattern)
  const response = applySecurityHeaders(NextResponse.next(), pathname);
  if (!req.cookies.has(CSRF_COOKIE_NAME)) {
    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
      httpOnly: false, // Must be readable by JS for double-submit pattern
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }
  return response;
}

// ─── Matcher ───

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/api/:path*"],
};
