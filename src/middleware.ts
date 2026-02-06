/**
 * Next.js Middleware (Lightweight)
 *
 * Handles:
 * - Security headers
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

function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// ─── CSRF Protection ───

const CSRF_EXEMPT_ROUTES = [
  "/api/cron/",
  "/api/supplier/",
  "/api/v1/webhooks",
  "/api/auth/",
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
        );
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return applySecurityHeaders(NextResponse.redirect(loginUrl));
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
      );
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

// ─── Matcher ───

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/api/:path*"],
};
