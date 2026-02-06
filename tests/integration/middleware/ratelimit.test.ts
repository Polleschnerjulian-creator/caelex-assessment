import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitHeaders,
  createRateLimitResponse,
  type RateLimitResult,
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
      expect(result.remaining).toBe(99); // 100 limit, 1 used
      expect(result.limit).toBe(100);
      expect(result.reset).toBeGreaterThan(Date.now());
    });

    it("should return different remaining counts for auth limiter", async () => {
      const result = await checkRateLimit("auth", "test-auth-1");

      expect(result.success).toBe(true);
      expect(result.remaining).toBe(4); // 5 limit, 1 used
      expect(result.limit).toBe(5);
    });

    it("should block after exceeding limit", async () => {
      const id = `test-block-${Date.now()}`;

      // Use all 5 auth requests
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit("auth", id);
        expect(result.success).toBe(true);
      }

      // 6th should fail
      const blocked = await checkRateLimit("auth", id);
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it("should track different identifiers separately", async () => {
      const id1 = `test-separate-a-${Date.now()}`;
      const id2 = `test-separate-b-${Date.now()}`;

      // Exhaust id1
      for (let i = 0; i < 5; i++) {
        await checkRateLimit("auth", id1);
      }

      // id2 should still work
      const result = await checkRateLimit("auth", id2);
      expect(result.success).toBe(true);
    });

    it("should enforce registration limit (3/hour)", async () => {
      const id = `test-reg-${Date.now()}`;

      for (let i = 0; i < 3; i++) {
        const result = await checkRateLimit("registration", id);
        expect(result.success).toBe(true);
      }

      const blocked = await checkRateLimit("registration", id);
      expect(blocked.success).toBe(false);
      expect(blocked.limit).toBe(3);
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
  });
});
