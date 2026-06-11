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
import { getToken } from "next-auth/jwt";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfToken,
  validateCsrfToken,
  hashSessionId,
} from "@/lib/csrf";
import {
  generateNonce,
  buildCspHeader,
  buildApiCspHeader,
  CSP_NONCE_HEADER,
} from "@/lib/csp-nonce";
import { getUpstashCredentials } from "@/lib/upstash-env";

// ─── Rate Limiting (Edge-compatible) ───

// Initialize rate limiter only when Redis is configured
let apiRateLimiter: Ratelimit | null = null;
let authRateLimiter: Ratelimit | null = null;
let redisWarningLogged = false;
let fallbackWarningLogged = false;

function logRedisWarningOnce(): void {
  if (redisWarningLogged || process.env.NODE_ENV !== "production") return;
  redisWarningLogged = true;
  console.warn(
    "[SECURITY] Redis not configured — using in-memory rate limit fallback. " +
      "This is NOT safe for multi-instance deployments. " +
      "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
  );
}

function logFallbackWarningOnce(): void {
  if (fallbackWarningLogged) return;
  fallbackWarningLogged = true;
  console.warn(
    "[SECURITY] Middleware rate limiting using in-memory fallback. " +
      "Rate limits are per-instance only and will not work correctly " +
      "across multiple serverless instances.",
  );
}

// ─── In-Memory Fallback Rate Limiter (Edge-compatible) ───
// Minimal implementation for when Redis is unavailable.
// Uses more conservative limits than Redis since in-memory state
// is not shared across serverless instances.

const inMemoryBuckets = new Map<string, { count: number; resetAt: number }>();

function inMemoryLimit(
  key: string,
  max: number,
  windowMs: number,
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const bucket = inMemoryBuckets.get(key);

  // Lazy cleanup: evict expired entries when map grows large
  if (inMemoryBuckets.size > 10000) {
    const keysToDelete: string[] = [];
    inMemoryBuckets.forEach((v, k) => {
      if (v.resetAt < now) keysToDelete.push(k);
    });
    keysToDelete.forEach((k) => inMemoryBuckets.delete(k));
  }

  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowMs;
    inMemoryBuckets.set(key, { count: 1, resetAt });
    return { success: true, limit: max, remaining: max - 1, reset: resetAt };
  }

  bucket.count++;
  const remaining = Math.max(0, max - bucket.count);
  return {
    success: bucket.count <= max,
    limit: max,
    remaining,
    reset: bucket.resetAt,
  };
}

function getApiRateLimiter(): Ratelimit | null {
  if (apiRateLimiter) return apiRateLimiter;
  const credentials = getUpstashCredentials();
  if (!credentials) {
    logRedisWarningOnce();
    return null;
  }
  apiRateLimiter = new Ratelimit({
    redis: new Redis(credentials),
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    analytics: true,
    prefix: "ratelimit:mw:api",
  });
  return apiRateLimiter;
}

function getAuthRateLimiter(): Ratelimit | null {
  if (authRateLimiter) return authRateLimiter;
  const credentials = getUpstashCredentials();
  if (!credentials) {
    logRedisWarningOnce();
    return null;
  }
  authRateLimiter = new Ratelimit({
    redis: new Redis(credentials),
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "ratelimit:mw:auth",
  });
  return authRateLimiter;
}

// Routes exempt from middleware rate limiting (webhooks, cron jobs, public API)
//
// `/api/auth/session` and `/api/auth/csrf` are NextAuth's required
// polling endpoints — useSession() hits /session every few seconds in
// every browser tab, and /csrf is fetched on every state-changing
// form. Including them in the auth-limiter's 5/min budget meant a
// legitimate user with three open tabs would self-DOS in seconds and
// see "rate limit exceeded" mid-session. They are NextAuth-internal
// reads (no credentials, no destructive action) so the broader IP
// rate limit elsewhere is sufficient defence.
const RATE_LIMIT_EXEMPT_ROUTES = [
  "/api/v1/webhooks",
  "/api/cron/",
  "/api/auth/callback/", // Only NextAuth OAuth callbacks are exempt; login/signup/mfa use auth limiter
  "/api/auth/session", // NextAuth session polling (every active tab hits this)
  "/api/auth/csrf", // NextAuth CSRF-token fetch (called before each POST)
  "/api/auth/providers", // NextAuth providers list (called on /login mount)
  "/api/auth/_log", // NextAuth client-side logger
  "/api/public/", // Public API handles its own rate limiting
];

function getClientIp(req: NextRequest): string {
  // Trust CDN headers first (cannot be spoofed by client)
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Use the RIGHTMOST IP in x-forwarded-for (added by trusted proxy).
  // The leftmost IP is the original client but can be spoofed.
  // This is consistent with the rate limiter's IP extraction logic.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim());
    return ips[ips.length - 1] || "unknown";
  }

  return "unknown";
}

const IP_REGEX = /^[\d.:a-fA-F]+$/;

function getSanitizedClientIp(req: NextRequest): string {
  const ip = getClientIp(req);
  return IP_REGEX.test(ip) ? ip : "unknown";
}

// ─── Security Headers ───

const SECURITY_HEADERS: Record<string, string> = {
  // HSTS — production-only. In dev the server speaks plain HTTP and
  // HSTS would HTTPS-pin localhost in the browser, breaking subsequent
  // hot-reloads (and Tauri desktop dev mode). Conditionally injected.
  ...(process.env.NODE_ENV === "production"
    ? {
        "Strict-Transport-Security":
          "max-age=63072000; includeSubDomains; preload",
      }
    : {}),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=(), accelerometer=(), gyroscope=(), magnetometer=(), usb=(), payment=()",
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
  nonce?: string,
): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    // Allow widget pages to be embedded in iframes
    if (key === "X-Frame-Options" && pathname?.startsWith("/widget/")) {
      return;
    }
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

  // Apply CSP based on route type
  if (pathname?.startsWith("/api")) {
    // Strict CSP for API routes (no scripts needed)
    response.headers.set("Content-Security-Policy", buildApiCspHeader());
  } else if (nonce) {
    // Full CSP for page routes
    // Note: Uses 'unsafe-inline' for scripts due to Next.js limitation
    // Still provides protection against external script injection
    const isDev = process.env.NODE_ENV === "development";
    response.headers.set(
      "Content-Security-Policy",
      buildCspHeader(nonce, isDev),
    );
    response.headers.set(CSP_NONCE_HEADER, nonce);
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
  "/api/v1/compliance/", // API v1 uses API key auth, not CSRF
  "/api/v1/sentinel/", // Sentinel agents use Bearer token auth, not browser sessions
  "/api/auth/callback/", // Only OAuth callbacks are exempt — login/signup/other auth endpoints require CSRF
  "/api/auth/session", // NextAuth session endpoint (GET-like, read-only)
  "/api/assessment/", // Assessment is public, CSRF exempt (rate limited instead)
  "/api/nis2/calculate", // NIS2 assessment is public, CSRF exempt (rate limited instead)
  // ASTRA now requires CSRF protection (session-authenticated, performs actions on user's behalf)
  "/api/public/", // Public API endpoints use rate limiting, not CSRF
  "/api/widget/", // Widget config API uses session auth
  "/api/newsletter/", // Public newsletter subscribe/unsubscribe
  "/api/demo/", // Public demo request form
  "/api/ontology/seed", // Ontology seed uses Bearer token auth (CRON_SECRET), not browser session
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
  // Always allow same-origin requests (Host header set by platform, not spoofable)
  allowedOrigins.push(req.nextUrl.origin);
  if (process.env.NEXT_PUBLIC_APP_URL)
    allowedOrigins.push(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.VERCEL_URL)
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.NODE_ENV === "development") {
    allowedOrigins.push("http://localhost:3000", "http://127.0.0.1:3000");
  }

  // Fail-safe: in production, reject if no allowed origins configured
  if (allowedOrigins.length === 0) {
    if (process.env.NODE_ENV === "production") {
      return false;
    }
    return true; // Allow in dev when no origins configured
  }

  return allowedOrigins.includes(requestOrigin);
}

// ─── Main Middleware ───

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith("/api");

  // Generate CSP nonce for this request
  const nonce = generateNonce();

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
      nonce,
    );
  }

  // Request size limit for API routes (10MB general, 50MB for document uploads)
  // Note: Content-Length is client-controlled and can be spoofed. However,
  // Vercel enforces a ~4.5MB serverless body limit at the platform level,
  // providing a backstop against chunked-encoding bypass attempts.
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
        nonce,
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
      const redisLimiter = isAuthRoute
        ? getAuthRateLimiter()
        : getApiRateLimiter();

      const ip = getSanitizedClientIp(req);
      let result: {
        success: boolean;
        limit: number;
        remaining: number;
        reset: number;
      };

      if (redisLimiter) {
        // Primary path: Redis-backed distributed rate limiting
        const redisResult = await redisLimiter.limit(`ip:${ip}`);
        result = {
          success: redisResult.success,
          limit: redisResult.limit,
          remaining: redisResult.remaining,
          reset: redisResult.reset,
        };
      } else {
        // Fallback: in-memory rate limiting (per-instance only)
        logFallbackWarningOnce();
        // Use more conservative limits since state is not shared across instances:
        // API: 30/min (vs 100/min Redis), Auth: 5/min (vs 10/min Redis)
        const fallbackMax = isAuthRoute ? 5 : 30;
        const fallbackWindowMs = 60000; // 1 minute
        result = inMemoryLimit(
          `mw:${isAuthRoute ? "auth" : "api"}:ip:${ip}`,
          fallbackMax,
          fallbackWindowMs,
        );
      }

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
          nonce,
        );
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
        nonce,
      );
    }

    // Layer 2: Double-submit cookie validation for mutating requests
    // Defense-in-depth: validates when CSRF cookie is present.
    // Origin validation (Layer 1) is the primary CSRF protection.
    // If CSRF cookie is absent (first visit, domain mismatch, cookie cleared),
    // the request is allowed — the cookie will be set on the response.
    //
    // AUDIT-FIX L16 (2026-05-15): added a feature-flag-gated strict mode
    // that REQUIRES the CSRF cookie + header for mutating non-exempt
    // requests once the rollout grace period ends. The grace period
    // exists because old single-page-app sessions started before the
    // CSRF cookie was issued (or after a cookie-clear) would otherwise
    // get a hard 403 on their next mutating request — that's the
    // behaviour we WANT once every active client has had a chance to
    // pick up the cookie via a prior GET. The flag lets ops flip the
    // enforcement on at the edge without redeploying app code.
    //
    // Rollout / migration path:
    //   1. Default (CSRF_REQUIRE_DOUBLE_SUBMIT unset / "false"):
    //      validate when both cookie+header are present, allow when
    //      cookie absent. This is today's behaviour.
    //   2. Telemetry phase (set to "log"): same allow-on-absent
    //      behaviour, but emit a metric/log line so we can see how
    //      many requests would 403 if we flipped the gate. (Not
    //      implemented here — telemetry is a separate concern; the
    //      log line below is enough to tail in observability.)
    //   3. Enforcement (set to "true"): the cookie MUST be present
    //      on every mutating non-exempt request, otherwise 403.
    //
    // Origin validation (Layer 1) is the primary CSRF defence and
    // continues to gate the request before this layer runs — strict
    // mode is purely additional belt-and-suspenders.
    const method = req.method.toUpperCase();
    const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    const isCsrfExempt = CSRF_EXEMPT_ROUTES.some((route) =>
      pathname.startsWith(route),
    );

    if (isMutating && !isCsrfExempt) {
      const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
      const headerToken = req.headers.get(CSRF_HEADER_NAME);

      /* AUDIT-FIX L16: strict-mode gate. When the env-var is "true",
         a missing cookie OR header is treated as a hard CSRF failure.
         When unset / "false" / anything else, fall through to the
         legacy permissive behaviour below. The "log" mode emits a
         server log so we can quantify impact pre-flip without yet
         changing user-visible behaviour. */
      const csrfStrictMode = (
        process.env.CSRF_REQUIRE_DOUBLE_SUBMIT ?? ""
      ).toLowerCase();
      const csrfStrictEnforce = csrfStrictMode === "true";
      const csrfStrictLog = csrfStrictMode === "log";

      if (!cookieToken || !headerToken) {
        if (csrfStrictEnforce) {
          return applySecurityHeaders(
            new NextResponse(
              JSON.stringify({
                error: "Forbidden",
                message: "CSRF token required",
                code: "CSRF_TOKEN_MISSING",
              }),
              { status: 403, headers: { "Content-Type": "application/json" } },
            ),
            pathname,
            nonce,
          );
        }
        if (csrfStrictLog && process.env.NODE_ENV === "production") {
          console.warn(
            "[CSRF] missing token on mutating request",
            JSON.stringify({
              pathname,
              method,
              hasCookie: Boolean(cookieToken),
              hasHeader: Boolean(headerToken),
            }),
          );
        }
      }

      // Only enforce double-submit check when both cookie and header exist.
      // Skip session binding — session rotation during long operations
      // (e.g. multi-section document generation) causes false positives.
      // Origin validation (Layer 1) + cookie/header match is sufficient.
      if (cookieToken && headerToken) {
        const csrfValid = await validateCsrfToken(cookieToken, headerToken);
        if (!csrfValid) {
          return applySecurityHeaders(
            new NextResponse(
              JSON.stringify({
                error: "Forbidden",
                message: "Invalid or missing CSRF token",
                code: "CSRF_VALIDATION_FAILED",
              }),
              { status: 403, headers: { "Content-Type": "application/json" } },
            ),
            pathname,
            nonce,
          );
        }
      }
    }
  }

  // Protected routes — check for session cookie and MFA status.
  // Critically, the MFA gate decodes the JWT here. The previous
  // version only checked cookie presence, which let any user with a
  // partial session (mfaRequired=true, mfaVerified=false) walk into
  // /dashboard by typing the URL directly — bypassing the MFA
  // challenge. Now we read the token's `mfaVerified` flag and force
  // the user back through /auth/mfa-challenge if it's missing.
  // Legacy → /admin permanent move (308, method-preserving). Must run BEFORE
  // the gate below, since the old path starts with /dashboard and would
  // otherwise be auth-gated and then served the old page.
  if (pathname === "/dashboard/admin/analytics") {
    return applySecurityHeaders(
      NextResponse.redirect(new URL("/admin", req.url), 308),
      pathname,
      nonce,
    );
  }

  // Legacy CRM → /admin/crm permanent move (308, method-preserving). The full
  // CRM — master lists AND record-detail pages — now lives in the light /admin
  // center; every old dark /dashboard/admin/crm[/...] path (including ?tab= and
  // the /contacts|/companies|/deals/[id] detail routes) redirects into the light
  // surface, preserving sub-path + query string. Must run BEFORE the gate below
  // (the old path starts with /dashboard and would otherwise be auth-gated then
  // served the old page).
  if (
    pathname === "/dashboard/admin/crm" ||
    pathname.startsWith("/dashboard/admin/crm/")
  ) {
    const dest = req.nextUrl.clone();
    dest.pathname = pathname.replace("/dashboard/admin/crm", "/admin/crm");
    return applySecurityHeaders(
      NextResponse.redirect(dest, 308),
      pathname,
      nonce,
    );
  }

  // /admin (the cross-product Admin/Analytics Center) inherits the SAME session
  // + MFA gate as /dashboard. This is only the coarse, defence-in-depth layer:
  // the authoritative super-admin allowlist check lives in the (admin) server
  // layout (requireSuperAdminPage) and in every /api/admin/v2 route
  // (requireSuperAdminApi). Middleware just bounces anonymous visitors early.
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    const hasSession =
      req.cookies.has("__Secure-authjs.session-token") ||
      req.cookies.has("authjs.session-token");

    if (!hasSession) {
      // If no auth configured at all, redirect to home
      if (!process.env.AUTH_SECRET) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL("/", req.url)),
          pathname,
          nonce,
        );
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return applySecurityHeaders(
        NextResponse.redirect(loginUrl),
        pathname,
        nonce,
      );
    }

    // MFA gate — only when AUTH_SECRET is set (otherwise getToken throws).
    if (process.env.AUTH_SECRET) {
      try {
        const token = await getToken({
          req,
          secret: process.env.AUTH_SECRET,
          // NextAuth v5 cookie name pattern matches our auth.ts config.
          cookieName:
            process.env.NODE_ENV === "production"
              ? "__Secure-authjs.session-token"
              : "authjs.session-token",
          salt:
            process.env.NODE_ENV === "production"
              ? "__Secure-authjs.session-token"
              : "authjs.session-token",
        });
        // Token can be null on edge cases (corrupt cookie, key rotation).
        // Treat as "not authenticated" → bounce to login.
        if (!token) {
          const loginUrl = new URL("/login", req.url);
          loginUrl.searchParams.set("callbackUrl", pathname);
          return applySecurityHeaders(
            NextResponse.redirect(loginUrl),
            pathname,
            nonce,
          );
        }
        if (token.mfaRequired && !token.mfaVerified) {
          const mfaUrl = new URL("/auth/mfa-challenge", req.url);
          mfaUrl.searchParams.set("callbackUrl", pathname);
          return applySecurityHeaders(
            NextResponse.redirect(mfaUrl),
            pathname,
            nonce,
          );
        }
      } catch {
        // getToken can throw if the cookie is malformed — fall through
        // and let the page-level auth() call handle it. Don't block
        // the user just because the JWT decoder hiccupped.
      }
    }
  }

  // Protected routes — check for session cookie (Assure)
  const assurePublicPaths = [
    "/assure",
    "/assure/onboarding",
    "/assure/demo",
    "/assure/book",
    "/assure/request-access",
  ];
  const isAssurePublicPath =
    assurePublicPaths.includes(pathname) ||
    pathname.startsWith("/assure/view") ||
    pathname.startsWith("/assure/dataroom/view");

  if (pathname.startsWith("/assure") && !isAssurePublicPath) {
    const hasSession =
      req.cookies.has("__Secure-authjs.session-token") ||
      req.cookies.has("authjs.session-token");
    if (!hasSession) {
      if (!process.env.AUTH_SECRET) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL("/", req.url)),
          pathname,
          nonce,
        );
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return applySecurityHeaders(
        NextResponse.redirect(loginUrl),
        pathname,
        nonce,
      );
    }
  }

  // Protected routes — check for session cookie (Academy)
  const academyPublicPaths = ["/academy"];
  const isAcademyPublicPath = academyPublicPaths.includes(pathname);

  if (pathname.startsWith("/academy") && !isAcademyPublicPath) {
    const hasSession =
      req.cookies.has("__Secure-authjs.session-token") ||
      req.cookies.has("authjs.session-token");
    if (!hasSession) {
      if (!process.env.AUTH_SECRET) {
        return applySecurityHeaders(
          NextResponse.redirect(new URL("/", req.url)),
          pathname,
          nonce,
        );
      }
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return applySecurityHeaders(
        NextResponse.redirect(loginUrl),
        pathname,
        nonce,
      );
    }
  }

  // Auth routes — redirect if already logged in. Includes both Caelex
  // and Atlas surfaces so a user with an active session can't get stuck
  // on a login form (and accidentally rate-limit themselves out).
  // Atlas surfaces redirect to /atlas; Caelex to /dashboard.
  const CAELEX_AUTH_ROUTES = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ];
  const ATLAS_AUTH_ROUTES = [
    "/atlas-login",
    "/atlas-signup",
    "/atlas-forgot-password",
    "/atlas-reset-password",
    "/atlas-access",
  ];
  const isCaelexAuth = CAELEX_AUTH_ROUTES.includes(pathname);
  const isAtlasAuth = ATLAS_AUTH_ROUTES.includes(pathname);

  if (isCaelexAuth || isAtlasAuth) {
    const hasSession =
      req.cookies.has("__Secure-authjs.session-token") ||
      req.cookies.has("authjs.session-token");

    if (hasSession) {
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
      // Validate callbackUrl is a safe relative path (prevent open redirect)
      const fallback = isAtlasAuth ? "/atlas" : "/dashboard";
      const safeUrl =
        callbackUrl &&
        callbackUrl.startsWith("/") &&
        !callbackUrl.startsWith("//") &&
        !callbackUrl.includes("://")
          ? callbackUrl
          : fallback;
      return applySecurityHeaders(
        NextResponse.redirect(new URL(safeUrl, req.url)),
        pathname,
        nonce,
      );
    }
  }

  // Set CSRF cookie if not present OR if session binding is stale
  const response = applySecurityHeaders(NextResponse.next(), pathname, nonce);
  const existingCsrf = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const sessionIdForCsrf =
    req.cookies.get("__Secure-authjs.session-token")?.value ||
    req.cookies.get("authjs.session-token")?.value;

  let needsCsrfRefresh = !existingCsrf;

  // Check if session binding is stale (session rotated since CSRF cookie was set)
  if (existingCsrf && sessionIdForCsrf && existingCsrf.includes(".")) {
    const tokenSessionHash = existingCsrf.split(".")[1];
    const currentHash = await hashSessionId(sessionIdForCsrf);
    if (tokenSessionHash !== currentHash) {
      needsCsrfRefresh = true;
    }
  }

  if (needsCsrfRefresh) {
    const isProduction = process.env.NODE_ENV === "production";
    const csrfToken = await generateCsrfToken(sessionIdForCsrf);
    response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
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
  // Apply middleware to all routes for CSP nonce injection
  // Exclude static files and Next.js internals
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)",
  ],
};
