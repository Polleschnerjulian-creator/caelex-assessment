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

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
  createRateLimitHeaders,
  type RateLimitType,
} from "@/lib/ratelimit";

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

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith("/api");

  // ─── Rate Limiting for API Routes ───
  if (isApiRoute) {
    const rateLimitType = getRateLimitType(pathname);
    const identifier = getIdentifier(req, req.auth?.user?.id);

    try {
      const result = await checkRateLimit(rateLimitType, identifier);

      if (!result.success) {
        return createRateLimitResponse(result);
      }

      // Continue with rate limit headers
      const response = NextResponse.next();
      const headers = createRateLimitHeaders(result);
      headers.forEach((value, key) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      // If rate limiting fails, log and continue (fail open for availability)
      console.error("Rate limiting error:", error);
    }
  }

  // ─── Protected Routes - Require Authentication ───
  const protectedPaths = ["/dashboard"];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path),
  );

  if (isProtectedPath && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Auth Routes - Redirect if Already Logged In ───
  const authPaths = ["/login", "/signup"];
  const isAuthPath = authPaths.includes(pathname);

  if (isAuthPath && req.auth) {
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
    const redirectUrl = callbackUrl || "/dashboard";
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // ─── Continue ───
  return NextResponse.next();
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
