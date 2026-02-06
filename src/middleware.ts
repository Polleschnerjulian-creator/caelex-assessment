/**
 * Next.js Middleware
 *
 * Handles:
 * - Authentication route protection
 * - Rate limiting for API routes
 * - Security headers enforcement
 *
 * IMPORTANT: Auth verification in middleware is NOT sufficient for security.
 * Always verify authentication in the Data Access Layer (DAL) as well.
 * See CVE-2025-29927 for why middleware-only auth is dangerous.
 */

import { auth, isAuthConfigured } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
  createRateLimitHeaders,
  type RateLimitType,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

// ─── Security Headers ───

/**
 * Security headers applied to all responses
 * These help prevent common web vulnerabilities
 */
const SECURITY_HEADERS: Record<string, string> = {
  // Prevent clickjacking by disallowing iframe embedding
  "X-Frame-Options": "DENY",

  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",

  // Control referrer information sent with requests
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Restrict browser features (geolocation, camera, etc.)
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",

  // Force HTTPS in production (1 year, include subdomains)
  ...(process.env.NODE_ENV === "production"
    ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" }
    : {}),

  // Prevent XSS attacks - using nonce would be better but requires SSR changes
  // This is a baseline CSP that allows inline scripts for Next.js hydration
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
    "style-src 'self' 'unsafe-inline'", // Required for Tailwind/styled-jsx
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; "),
};

/**
 * Apply security headers to a response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// ─── CSRF Protection via Origin Validation ───

/**
 * Allowed origins for state-changing requests.
 * In production, this should be your actual domain(s).
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Production domain
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  // Vercel preview deployments
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  // Development
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000");
    origins.push("http://127.0.0.1:3000");
  }

  return origins;
}

/**
 * Routes that are exempt from CSRF protection.
 * These are typically webhook endpoints or public APIs that need
 * to accept requests from external sources.
 */
const CSRF_EXEMPT_ROUTES = [
  "/api/cron/", // Cron jobs (authenticated by CRON_SECRET)
  "/api/supplier/", // Public supplier portal (authenticated by token)
  "/api/v1/webhooks", // Incoming webhooks (authenticated by signature)
  "/api/auth/", // NextAuth handles its own CSRF
];

/**
 * Validate request origin for CSRF protection.
 * Returns true if the request is valid, false if it should be blocked.
 */
function validateOrigin(req: NextRequest): boolean {
  const method = req.method.toUpperCase();

  // Only check state-changing methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return true;
  }

  const pathname = req.nextUrl.pathname;

  // Check if route is exempt
  if (CSRF_EXEMPT_ROUTES.some((route) => pathname.startsWith(route))) {
    return true;
  }

  // Get origin from request
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // If no origin header, check referer (some browsers don't send origin)
  const requestOrigin = origin || (referer ? new URL(referer).origin : null);

  // In development, allow requests without origin (e.g., from API clients)
  if (!requestOrigin && process.env.NODE_ENV === "development") {
    return true;
  }

  // In production, require origin for state-changing requests
  if (!requestOrigin) {
    console.warn(
      `[CSRF] Blocked request to ${pathname}: Missing origin header`,
    );
    return false;
  }

  // Validate origin against allowed list
  const allowedOrigins = getAllowedOrigins();
  if (!allowedOrigins.includes(requestOrigin)) {
    console.warn(
      `[CSRF] Blocked request to ${pathname}: Invalid origin ${requestOrigin}`,
    );
    return false;
  }

  return true;
}

// ─── Rate Limit Configuration ───

const RATE_LIMIT_CONFIG: Record<string, RateLimitType> = {
  "/api/auth": "auth",
  "/api/signup": "registration",
  "/api/tracker/import-assessment": "assessment",
  "/api/environmental": "assessment",
  "/api/cybersecurity": "assessment",
  "/api/insurance": "assessment",
  "/api/export": "export",
  "/api": "api", // Default for all other API routes
};

/**
 * Get the appropriate rate limiter type for a path
 */
function getRateLimitType(pathname: string): RateLimitType {
  for (const [prefix, type] of Object.entries(RATE_LIMIT_CONFIG)) {
    if (pathname.startsWith(prefix)) {
      return type;
    }
  }
  return "api";
}

// ─── Main Middleware ───

export default auth(async (req: NextRequest & { auth?: any }) => {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith("/api");

  // ─── CSRF Protection for API Routes ───
  if (isApiRoute && !validateOrigin(req)) {
    const csrfResponse = new NextResponse(
      JSON.stringify({
        error: "Forbidden",
        message: "Invalid request origin",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
    return applySecurityHeaders(csrfResponse);
  }

  // ─── Rate Limiting for API Routes ───
  if (isApiRoute) {
    const rateLimitType = getRateLimitType(pathname);
    const identifier = getIdentifier(req, req.auth?.user?.id);

    try {
      const result = await checkRateLimit(rateLimitType, identifier);

      if (!result.success) {
        return applySecurityHeaders(createRateLimitResponse(result));
      }

      // Continue with rate limit headers and security headers
      const response = NextResponse.next();
      const headers = createRateLimitHeaders(result);
      headers.forEach((value, key) => {
        response.headers.set(key, value);
      });

      return applySecurityHeaders(response);
    } catch (error) {
      // SECURITY: If rate limiting fails, block the request (fail closed)
      // This prevents abuse when the rate limiting service is unavailable
      logger.error("Rate limiting error", error);

      // In production, block requests when rate limiting fails
      if (process.env.NODE_ENV === "production") {
        const errorResponse = new NextResponse(
          JSON.stringify({
            error: "Service temporarily unavailable",
            message: "Please try again later",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          },
        );
        return applySecurityHeaders(errorResponse);
      }
      // In development, allow through with warning
      console.warn("[DEV] Rate limiting bypassed due to error");
    }
  }

  // ─── Protected Routes - Require Authentication ───
  const protectedPaths = ["/dashboard"];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path),
  );

  if (isProtectedPath && !req.auth) {
    // If auth is not configured at all, redirect to home instead of login
    if (!isAuthConfigured) {
      return applySecurityHeaders(NextResponse.redirect(new URL("/", req.url)));
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // ─── Auth Routes - Redirect if Already Logged In ───
  const authPaths = ["/login", "/signup"];
  const isAuthPath = authPaths.includes(pathname);

  if (isAuthPath && req.auth) {
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
    const redirectUrl = callbackUrl || "/dashboard";
    return applySecurityHeaders(
      NextResponse.redirect(new URL(redirectUrl, req.url)),
    );
  }

  // ─── Continue with security headers ───
  return applySecurityHeaders(NextResponse.next());
});

// ─── Matcher Configuration ───

export const config = {
  matcher: [
    // Protected routes
    "/dashboard/:path*",
    // Auth routes
    "/login",
    "/signup",
    // API routes (for rate limiting)
    "/api/:path*",
  ],
};
