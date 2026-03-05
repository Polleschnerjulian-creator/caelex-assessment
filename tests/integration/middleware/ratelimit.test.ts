import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitHeaders,
  createRateLimitResponse,
  type RateLimitResult,
  type RateLimitType,
} from "@/lib/ratelimit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getIdentifier ────────────────────────────────────────────────────────

  describe("getIdentifier", () => {
    it("should prefer userId when available", () => {
      const request = new Request("http://localhost/api/test", {
        headers: {
          "x-real-ip": "1.2.3.4",
        },
      });

      const result = getIdentifier(request, "user-123");
      expect(result).toBe("user:user-123");
    });

    it("should use cf-connecting-ip when no userId", () => {
      const request = new Request("http://localhost/api/test", {
        headers: {
          "cf-connecting-ip": "10.0.0.1",
          "x-real-ip": "10.0.0.2",
        },
      });

      const result = getIdentifier(request);
      expect(result).toBe("ip:10.0.0.1");
    });

    it("should use x-real-ip when cf-connecting-ip not present", () => {
      const request = new Request("http://localhost/api/test", {
        headers: {
          "x-real-ip": "192.168.1.1",
        },
      });

      const result = getIdentifier(request);
      expect(result).toBe("ip:192.168.1.1");
    });

    it("should use rightmost x-forwarded-for IP when no other headers", () => {
      const request = new Request("http://localhost/api/test", {
        headers: {
          "x-forwarded-for": "10.0.0.1, 172.16.0.1, 192.168.1.100",
        },
      });

      const result = getIdentifier(request);
      expect(result).toBe("ip:192.168.1.100");
    });

    it("should return ip:unknown when no IP headers present", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const request = new Request("http://localhost/api/test");

      const result = getIdentifier(request);
      expect(result).toBe("ip:unknown");
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[SECURITY]"),
      );

      warnSpy.mockRestore();
    });

    it("should reject invalid IP addresses", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const request = new Request("http://localhost/api/test", {
        headers: {
          "x-real-ip": "not-an-ip",
        },
      });

      const result = getIdentifier(request);
      expect(result).toBe("ip:unknown");
      warnSpy.mockRestore();
    });

    it("should reject IP addresses with out-of-range octets", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const request = new Request("http://localhost/api/test", {
        headers: {
          "x-real-ip": "999.999.999.999",
        },
      });

      const result = getIdentifier(request);
      expect(result).toBe("ip:unknown");
      warnSpy.mockRestore();
    });

    it("should accept valid IPv6 addresses", () => {
      const request = new Request("http://localhost/api/test", {
        headers: {
          "x-real-ip": "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        },
      });

      const result = getIdentifier(request);
      expect(result).toBe("ip:2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    });
  });

  // ─── checkRateLimit (in-memory fallback) ─────────────────────────────────

  describe("checkRateLimit (in-memory fallback)", () => {
    it("should allow requests within the limit", async () => {
      const result = await checkRateLimit("api", "test-identifier-1");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(29); // 30 fallback limit, 1 used
      expect(result.limit).toBe(30);
      expect(result.reset).toBeGreaterThan(Date.now());
    });

    it("should return different remaining counts for auth limiter", async () => {
      const result = await checkRateLimit("auth", "test-auth-1");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(2); // 3 fallback limit, 1 used
      expect(result.limit).toBe(3);
    });

    it("should block after exceeding limit", async () => {
      const id = `test-block-${Date.now()}`;

      // Use all 3 auth requests (in-memory fallback limit)
      for (let i = 0; i < 3; i++) {
        const result = await checkRateLimit("auth", id);
        expect(result.success).toBe(true);
      }

      // 4th should fail
      const blocked = await checkRateLimit("auth", id);
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it("should track different identifiers separately", async () => {
      const id1 = `test-separate-a-${Date.now()}`;
      const id2 = `test-separate-b-${Date.now()}`;

      // Exhaust id1 (3 requests for auth fallback)
      for (let i = 0; i < 3; i++) {
        await checkRateLimit("auth", id1);
      }

      // id2 should still work
      const result = await checkRateLimit("auth", id2);
      expect(result.success).toBe(true);
    });

    it("should enforce registration limit (1/hour in-memory fallback)", async () => {
      const id = `test-reg-${Date.now()}`;

      // In-memory fallback: 1/hour for registration
      const result = await checkRateLimit("registration", id);
      expect(result.success).toBe(true);

      const blocked = await checkRateLimit("registration", id);
      expect(blocked.success).toBe(false);
      expect(blocked.limit).toBe(1);
    });
  });

  // ─── createRateLimitHeaders ──────────────────────────────────────────────

  describe("createRateLimitHeaders", () => {
    it("should create headers with rate limit info", () => {
      const result: RateLimitResult = {
        success: true,
        remaining: 95,
        reset: Date.now() + 60000,
        limit: 100,
      };

      const headers = createRateLimitHeaders(result);

      expect(headers.get("X-RateLimit-Limit")).toBe("100");
      expect(headers.get("X-RateLimit-Remaining")).toBe("95");
      expect(headers.get("X-RateLimit-Reset")).toBeTruthy();
    });
  });

  // ─── createRateLimitResponse ─────────────────────────────────────────────

  describe("createRateLimitResponse", () => {
    it("should return 429 status", () => {
      const result: RateLimitResult = {
        success: false,
        remaining: 0,
        reset: Date.now() + 30000,
        limit: 100,
      };

      const response = createRateLimitResponse(result);

      expect(response.status).toBe(429);
    });

    it("should include Retry-After header", async () => {
      const result: RateLimitResult = {
        success: false,
        remaining: 0,
        reset: Date.now() + 30000,
        limit: 100,
      };

      const response = createRateLimitResponse(result);
      const retryAfter = parseInt(
        response.headers.get("Retry-After") || "0",
        10,
      );

      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(30);
    });

    it("should include rate limit headers", async () => {
      const result: RateLimitResult = {
        success: false,
        remaining: 0,
        reset: Date.now() + 30000,
        limit: 100,
      };

      const response = createRateLimitResponse(result);

      expect(response.headers.get("X-RateLimit-Limit")).toBe("100");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy();
    });

    it("should include error message in response body", async () => {
      const result: RateLimitResult = {
        success: false,
        remaining: 0,
        reset: Date.now() + 30000,
        limit: 100,
      };

      const response = createRateLimitResponse(result);
      const body = await response.json();

      expect(body.error).toBe("Too Many Requests");
      expect(body.message).toContain("Rate limit exceeded");
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    it("should include retryAfter and error fields in body", async () => {
      const resetTime = Date.now() + 60000;
      const result: RateLimitResult = {
        success: false,
        remaining: 0,
        reset: resetTime,
        limit: 50,
      };

      const response = createRateLimitResponse(result);
      const body = await response.json();

      expect(body).toHaveProperty("retryAfter");
      expect(body).toHaveProperty("error");
      expect(body).toHaveProperty("message");
      expect(typeof body.retryAfter).toBe("number");
      expect(body.retryAfter).toBeGreaterThan(0);
      expect(body.retryAfter).toBeLessThanOrEqual(60);
    });
  });

  // ─── isValidIp edge cases (tested via getIdentifier) ───────────────────

  describe("isValidIp edge cases (via getIdentifier)", () => {
    it("rejects IP that is too short (< 7 chars)", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const request = new Request("http://localhost/api/test", {
        headers: {
          "x-real-ip": "1.2.3",
        },
      });

      const result = getIdentifier(request);
      expect(result).toBe("ip:unknown");
      warnSpy.mockRestore();
    });

    it("rejects IP that is too long (> 45 chars)", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const longIp = "2001:0db8:85a3:0000:0000:8a2e:0370:7334:extra:extra";
      const request = new Request("http://localhost/api/test", {
        headers: {
          "x-real-ip": longIp,
        },
      });

      const result = getIdentifier(request);
      expect(result).toBe("ip:unknown");
      warnSpy.mockRestore();
    });

    it("uses single IP from x-forwarded-for", () => {
      const request = new Request("http://localhost/api/test", {
        headers: {
          "x-forwarded-for": "203.0.113.50",
        },
      });

      const result = getIdentifier(request);
      expect(result).toBe("ip:203.0.113.50");
    });

    it("falls back to unknown when x-forwarded-for contains only invalid IPs", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const request = new Request("http://localhost/api/test", {
        headers: {
          "x-forwarded-for": "bad, alsobad",
        },
      });

      const result = getIdentifier(request);
      expect(result).toBe("ip:unknown");
      warnSpy.mockRestore();
    });
  });

  // ─── checkRateLimit — different limiter types ─────────────────────────────

  describe("checkRateLimit — different limiter types", () => {
    const limiterTypes: RateLimitType[] = [
      "export",
      "sensitive",
      "document_generation",
      "supplier",
      "nca_portal",
      "nca_package",
      "public_api",
      "widget",
      "mfa",
      "generate2",
      "admin",
      "contact",
      "assure",
      "assure_public",
      "academy",
    ];

    for (const type of limiterTypes) {
      it(`should allow first request for "${type}" limiter`, async () => {
        const id = `test-${type}-${Date.now()}`;
        const result = await checkRateLimit(type, id);

        expect(result.success).toBe(true);
        expect(result.remaining).toBeGreaterThanOrEqual(0);
        expect(result.limit).toBeGreaterThan(0);
      });
    }
  });

  // ─── InMemoryRateLimiter — window reset ─────────────────────────────────

  describe("InMemoryRateLimiter — window reset after expiry", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("resets the window after expiry and allows new requests", async () => {
      vi.useFakeTimers();

      const id = `test-window-reset-${Date.now()}`;

      // Use registration limiter (1 per hour in-memory fallback)
      const first = await checkRateLimit("registration", id);
      expect(first.success).toBe(true);

      // Should be blocked immediately
      const blocked = await checkRateLimit("registration", id);
      expect(blocked.success).toBe(false);

      // Advance time past the window (1 hour + 1 ms)
      vi.advanceTimersByTime(3600001);

      // Should be allowed again after window reset
      const afterReset = await checkRateLimit("registration", id);
      expect(afterReset.success).toBe(true);
      expect(afterReset.remaining).toBe(0); // 1 limit - 1 used = 0

      vi.useRealTimers();
    });
  });

  // ─── InMemoryRateLimiter — setInterval cleanup ───────────────────────────

  describe("InMemoryRateLimiter — setInterval cleanup", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("cleans up expired entries when setInterval fires", async () => {
      vi.useFakeTimers();
      vi.resetModules();

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const mod = await import("@/lib/ratelimit");

      const id = `cleanup-test-${Date.now()}`;

      // Make a request (auth fallback: 3/min, window=60000ms)
      const first = await mod.checkRateLimit("auth", id);
      expect(first.success).toBe(true);

      // Advance past window + cleanup interval so setInterval fires
      // T=0: entry created with resetAt=60000
      // T=120000: setInterval fires, finds entry expired (60000 < 120000), deletes it
      vi.advanceTimersByTime(120001);

      // After cleanup, new request gets a fresh window
      const after = await mod.checkRateLimit("auth", id);
      expect(after.success).toBe(true);
      expect(after.remaining).toBe(2); // 3 - 1 = 2

      warnSpy.mockRestore();
    });
  });
});
