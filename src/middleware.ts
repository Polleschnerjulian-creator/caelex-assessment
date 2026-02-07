/**
 * Next.js Middleware (Lightweight)
 *
 * Handles:
 * - Security headers + X-Robots-Tag for data protection
 * - Bot detection for assessment API
 * - Protected route redirects
 * - CSRF validation for API routes
 *
 * NOTE: Kept minimal to stay under Vercel's 1MB Edge Function limit.
 * Rate limiting and auth verification happen in API route handlers.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export default function middleware(req: NextRequest) {
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

  // CSRF check for API routes
  if (isApiRoute && !validateOrigin(req)) {
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

  return applySecurityHeaders(NextResponse.next(), pathname);
}

// ─── Matcher ───

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/api/:path*"],
};
