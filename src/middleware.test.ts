/**
 * Middleware Security Tests
 *
 * Tests for: security headers, bot detection, rate limiting,
 * CSRF validation, protected route redirects, open redirect prevention.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks (must be before import of module under test) ───

vi.mock("@/lib/csrf", () => ({
  CSRF_COOKIE_NAME: "csrf-token",
  CSRF_HEADER_NAME: "x-csrf-token",
  generateCsrfToken: vi.fn().mockResolvedValue("mock-csrf-token"),
  validateCsrfToken: vi.fn().mockResolvedValue(true),
  hashSessionId: vi.fn().mockResolvedValue("mock-hash"),
}));

vi.mock("@/lib/csp-nonce", () => ({
  generateNonce: vi.fn().mockReturnValue("test-nonce"),
  buildCspHeader: vi.fn().mockReturnValue("default-src 'self'"),
  buildApiCspHeader: vi.fn().mockReturnValue("default-src 'none'"),
  CSP_NONCE_HEADER: "x-csp-nonce",
}));

const mockLimit = vi.fn().mockResolvedValue({
  success: true,
  remaining: 99,
  limit: 100,
  reset: Date.now() + 60000,
});

vi.mock("@upstash/ratelimit", () => {
  class MockRatelimit {
    limit = mockLimit;
    static slidingWindow = vi.fn().mockReturnValue("sliding-window-config");
    constructor() {
      // no-op
    }
  }
  return { Ratelimit: MockRatelimit };
});

vi.mock("@upstash/redis", () => {
  class MockRedis {
    constructor() {
      // no-op
    }
  }
  return { Redis: MockRedis };
});

// ─── Import module under test ───

import middleware from "./middleware";
import { validateCsrfToken } from "@/lib/csrf";

// ─── Helpers ───

const BASE_URL = "http://localhost:3000";

function createRequest(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {},
): NextRequest {
  const url = new URL(path, BASE_URL);
  const init: RequestInit = {
    method: options.method || "GET",
    headers: new Headers(options.headers || {}),
  };
  const req = new NextRequest(url, init);
  if (options.cookies) {
    for (const [name, value] of Object.entries(options.cookies)) {
      req.cookies.set(name, value);
    }
  }
  return req;
}

// ─── Tests ───

describe("middleware", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Enable rate limiting by providing Redis env vars
    process.env.UPSTASH_REDIS_REST_URL = "https://fake-redis.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.AUTH_SECRET = "test-secret-at-least-32-chars-long!!";
    process.env.NODE_ENV = "test";
    // Reset rate limiter state
    mockLimit.mockResolvedValue({
      success: true,
      remaining: 99,
      limit: 100,
      reset: Date.now() + 60000,
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ─── Security Headers ───

  describe("security headers", () => {
    it("sets HSTS header on all responses", async () => {
      const req = createRequest("/", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.headers.get("Strict-Transport-Security")).toBe(
        "max-age=63072000; includeSubDomains; preload",
      );
    });

    it("sets X-Frame-Options DENY on non-widget paths", async () => {
      const req = createRequest("/dashboard", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
        cookies: { "authjs.session-token": "valid-session" },
      });
      const res = await middleware(req);
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("does NOT set X-Frame-Options on /widget/ paths", async () => {
      const req = createRequest("/widget/embed", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.headers.get("X-Frame-Options")).toBeNull();
    });

    it("sets X-Content-Type-Options nosniff", async () => {
      const req = createRequest("/about", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("sets Referrer-Policy", async () => {
      const req = createRequest("/", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.headers.get("Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin",
      );
    });

    it("sets Permissions-Policy", async () => {
      const req = createRequest("/", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.headers.get("Permissions-Policy")).toContain("camera=()");
      expect(res.headers.get("Permissions-Policy")).toContain("microphone=()");
    });

    it("sets all security headers on API responses", async () => {
      const req = createRequest("/api/test", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.headers.get("Strict-Transport-Security")).toBeTruthy();
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    });
  });

  // ─── X-Robots-Tag ───

  describe("X-Robots-Tag", () => {
    it("sets noindex on /api paths", async () => {
      const req = createRequest("/api/something", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.headers.get("X-Robots-Tag")).toBe(
        "noindex, nofollow, noarchive",
      );
    });

    it("sets noindex on /dashboard paths", async () => {
      const req = createRequest("/dashboard/settings", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
        cookies: { "authjs.session-token": "valid-session" },
      });
      const res = await middleware(req);
      expect(res.headers.get("X-Robots-Tag")).toBe(
        "noindex, nofollow, noarchive",
      );
    });

    it("sets noindex on .json paths", async () => {
      const req = createRequest("/data/test.json", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.headers.get("X-Robots-Tag")).toBe(
        "noindex, nofollow, noarchive",
      );
    });

    it("does NOT set X-Robots-Tag on public pages", async () => {
      const req = createRequest("/about", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.headers.get("X-Robots-Tag")).toBeNull();
    });
  });

  // ─── Bot Detection ───

  describe("bot detection", () => {
    it("blocks scrapy bot on assessment endpoints with 403", async () => {
      const req = createRequest("/api/assessment/submit", {
        headers: { "user-agent": "Scrapy/2.5" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
      expect(body.message).toContain("Automated access");
    });

    it("blocks python-requests on assessment endpoints", async () => {
      const req = createRequest("/api/assessment/eu-space-act", {
        headers: { "user-agent": "python-requests/2.28.0" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it("blocks curl on /api/nis2/calculate", async () => {
      const req = createRequest("/api/nis2/calculate", {
        headers: { "user-agent": "curl/7.88.1" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it("blocks requests with no User-Agent on assessment endpoints", async () => {
      const req = createRequest("/api/assessment/submit", {
        headers: {},
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it("blocks requests with very short User-Agent on assessment endpoints", async () => {
      const req = createRequest("/api/assessment/submit", {
        headers: { "user-agent": "bot" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it("blocks headlesschrome on assessment endpoints", async () => {
      const req = createRequest("/api/assessment/submit", {
        headers: { "user-agent": "Mozilla/5.0 HeadlessChrome/120.0" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it("allows normal browser User-Agent on assessment endpoints", async () => {
      const req = createRequest("/api/assessment/submit", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(403);
    });

    it("does NOT block bots on non-assessment API endpoints", async () => {
      const req = createRequest("/api/other-endpoint", {
        headers: { "user-agent": "python-requests/2.28.0" },
      });
      const res = await middleware(req);
      // Should not be a 403 from bot detection (may be 429 or other)
      expect(res.status).not.toBe(403);
    });
  });

  // ─── Request Size Limit ───

  describe("request size limit", () => {
    it("rejects general API requests over 10MB with 413", async () => {
      const elevenMb = (11 * 1024 * 1024).toString();
      const req = createRequest("/api/some-endpoint", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          "content-length": elevenMb,
          origin: "http://localhost:3000",
          "x-csrf-token": "mock-csrf-token",
        },
        cookies: { "csrf-token": "mock-csrf-token" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(413);
      const body = await res.json();
      expect(body.error).toBe("Payload Too Large");
      expect(body.message).toContain("10MB");
    });

    it("allows general API requests under 10MB", async () => {
      const fiveMb = (5 * 1024 * 1024).toString();
      const req = createRequest("/api/some-endpoint", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          "content-length": fiveMb,
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(413);
    });

    it("rejects document upload API requests over 50MB with 413", async () => {
      const sixtyMb = (60 * 1024 * 1024).toString();
      const req = createRequest("/api/documents/upload", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          "content-length": sixtyMb,
          origin: "http://localhost:3000",
          "x-csrf-token": "mock-csrf-token",
        },
        cookies: { "csrf-token": "mock-csrf-token" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(413);
      const body = await res.json();
      expect(body.message).toContain("50MB");
    });

    it("allows document upload requests under 50MB", async () => {
      const thirtyMb = (30 * 1024 * 1024).toString();
      const req = createRequest("/api/documents/upload", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          "content-length": thirtyMb,
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(413);
    });
  });

  // ─── Rate Limiting ───

  describe("rate limiting", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      mockLimit.mockResolvedValueOnce({
        success: false,
        remaining: 0,
        limit: 100,
        reset: Date.now() + 30000,
      });

      const req = createRequest("/api/data", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          "x-forwarded-for": "192.168.1.1",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toBe("Too Many Requests");
      expect(res.headers.get("Retry-After")).toBeTruthy();
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
    });

    it("passes through when rate limit is not exceeded", async () => {
      const req = createRequest("/api/data", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(429);
    });

    it("exempts webhook routes from rate limiting", async () => {
      const req = createRequest("/api/v1/webhooks/stripe", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      // mockLimit should not have been called for exempt routes
      // The request should pass without rate limit check
      expect(res.status).not.toBe(429);
    });

    it("exempts cron routes from rate limiting", async () => {
      const req = createRequest("/api/cron/deadline-reminders", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(429);
    });
  });

  // ─── CSRF Validation ───

  describe("CSRF validation", () => {
    it("rejects POST requests without CSRF token with 403", async () => {
      vi.mocked(validateCsrfToken).mockResolvedValueOnce(false);
      const req = createRequest("/api/user/update", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "http://localhost:3000",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe("CSRF_VALIDATION_FAILED");
    });

    it("rejects DELETE requests without CSRF token with 403", async () => {
      vi.mocked(validateCsrfToken).mockResolvedValueOnce(false);
      const req = createRequest("/api/user/delete", {
        method: "DELETE",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "http://localhost:3000",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe("CSRF_VALIDATION_FAILED");
    });

    it("allows POST requests with valid CSRF token", async () => {
      vi.mocked(validateCsrfToken).mockResolvedValueOnce(true);
      const req = createRequest("/api/user/update", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "http://localhost:3000",
          "x-csrf-token": "mock-csrf-token",
        },
        cookies: { "csrf-token": "mock-csrf-token" },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(403);
    });

    it("exempts /api/cron/ from CSRF", async () => {
      const req = createRequest("/api/cron/deadline-reminders", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "http://localhost:3000",
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(403);
    });

    it("exempts /api/v1/webhooks from CSRF", async () => {
      const req = createRequest("/api/v1/webhooks/stripe", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "http://localhost:3000",
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(403);
    });

    it("exempts /api/v1/compliance/ from CSRF", async () => {
      const req = createRequest("/api/v1/compliance/status", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "http://localhost:3000",
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(403);
    });

    it("exempts /api/assessment/ from CSRF", async () => {
      const req = createRequest("/api/assessment/submit", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "http://localhost:3000",
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(403);
    });

    it("exempts /api/public/ from CSRF", async () => {
      const req = createRequest("/api/public/data", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "http://localhost:3000",
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(403);
    });

    it("exempts /api/newsletter/ from CSRF", async () => {
      const req = createRequest("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "http://localhost:3000",
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(403);
    });

    it("allows GET requests without CSRF token", async () => {
      const req = createRequest("/api/user/profile", {
        method: "GET",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(403);
    });
  });

  // ─── Origin Validation ───

  describe("origin validation", () => {
    it("rejects POST from unknown origin with 403", async () => {
      const req = createRequest("/api/user/update", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "https://evil-site.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain("Invalid request origin");
    });

    it("rejects PUT from unknown origin", async () => {
      const req = createRequest("/api/user/update", {
        method: "PUT",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "https://attacker.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it("rejects PATCH from unknown origin", async () => {
      const req = createRequest("/api/user/settings", {
        method: "PATCH",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "https://attacker.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it("rejects DELETE from unknown origin", async () => {
      const req = createRequest("/api/user/account", {
        method: "DELETE",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "https://attacker.com",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });

    it("allows GET requests without origin header", async () => {
      const req = createRequest("/api/data", {
        method: "GET",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      // GET should not be subject to origin validation
      expect(res.status).not.toBe(403);
    });

    it("allows POST from configured NEXT_PUBLIC_APP_URL", async () => {
      vi.mocked(validateCsrfToken).mockResolvedValueOnce(true);
      const req = createRequest("/api/user/update", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          origin: "http://localhost:3000",
          "x-csrf-token": "mock-csrf-token",
        },
        cookies: { "csrf-token": "mock-csrf-token" },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(403);
    });

    it("rejects POST with no origin in production mode", async () => {
      process.env.NODE_ENV = "production";
      const req = createRequest("/api/user/update", {
        method: "POST",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(403);
    });
  });

  // ─── Protected Routes ───

  describe("protected route redirects", () => {
    it("redirects /dashboard to /login without session cookie", async () => {
      const req = createRequest("/dashboard", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
      expect(location).toContain("callbackUrl=%2Fdashboard");
    });

    it("passes through /dashboard with authjs.session-token cookie", async () => {
      const req = createRequest("/dashboard", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
        cookies: { "authjs.session-token": "valid-session" },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(307);
      expect(res.headers.get("location")).toBeNull();
    });

    it("passes through /dashboard with __Secure-authjs.session-token cookie", async () => {
      const req = createRequest("/dashboard/settings", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
        cookies: { "__Secure-authjs.session-token": "valid-session" },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(307);
    });

    it("redirects /dashboard to / when AUTH_SECRET is not set", async () => {
      delete process.env.AUTH_SECRET;
      const req = createRequest("/dashboard", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/");
      expect(location).not.toContain("/login");
    });

    it("redirects /dashboard/modules/cybersecurity to /login without session", async () => {
      const req = createRequest("/dashboard/modules/cybersecurity", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
    });
  });

  // ─── Auth Route Redirects ───

  describe("auth route redirects", () => {
    it("redirects /login to /dashboard if already has session", async () => {
      const req = createRequest("/login", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
        cookies: { "authjs.session-token": "valid-session" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/dashboard");
    });

    it("redirects /signup to /dashboard if already has session", async () => {
      const req = createRequest("/signup", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
        cookies: { "authjs.session-token": "valid-session" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/dashboard");
    });

    it("redirects /login with valid callbackUrl to that URL", async () => {
      const req = createRequest("/login?callbackUrl=/dashboard/settings", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
        cookies: { "authjs.session-token": "valid-session" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/dashboard/settings");
    });
  });

  // ─── Open Redirect Prevention ───

  describe("open redirect prevention", () => {
    it("blocks callbackUrl starting with // (protocol-relative)", async () => {
      const req = createRequest("/login?callbackUrl=//evil.com", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
        cookies: { "authjs.session-token": "valid-session" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/dashboard");
      expect(location).not.toContain("evil.com");
    });

    it("blocks callbackUrl containing :// (absolute URL)", async () => {
      const req = createRequest(
        "/login?callbackUrl=https://evil.com/phishing",
        {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
          },
          cookies: { "authjs.session-token": "valid-session" },
        },
      );
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/dashboard");
      expect(location).not.toContain("evil.com");
    });

    it("allows callbackUrl that is a safe relative path", async () => {
      const req = createRequest("/login?callbackUrl=/dashboard/modules/nis2", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
        cookies: { "authjs.session-token": "valid-session" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/dashboard/modules/nis2");
    });

    it("falls back to /dashboard when callbackUrl is empty", async () => {
      const req = createRequest("/login?callbackUrl=", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
        cookies: { "authjs.session-token": "valid-session" },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/dashboard");
    });
  });

  // ─── CSRF Cookie Setting ───

  describe("CSRF cookie", () => {
    it("sets CSRF cookie when not present", async () => {
      const req = createRequest("/about", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      const setCookieHeader = res.headers.get("set-cookie");
      expect(setCookieHeader).toContain("csrf-token");
    });
  });

  // ─── Assure Protected Routes ───

  describe("Assure protected routes", () => {
    it("allows public Assure paths without session", async () => {
      const req = createRequest("/assure", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(307);
    });

    it("redirects protected Assure paths to login without session", async () => {
      const req = createRequest("/assure/dashboard", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
    });
  });

  // ─── Academy Protected Routes ───

  describe("Academy protected routes", () => {
    it("allows /academy public path without session", async () => {
      const req = createRequest("/academy", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.status).not.toBe(307);
    });

    it("redirects /academy/course to login without session", async () => {
      const req = createRequest("/academy/course", {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
      });
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get("location")!;
      expect(location).toContain("/login");
    });
  });
});
