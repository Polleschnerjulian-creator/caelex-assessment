/**
 * Verity 2036 -- Rate Limiter Tests
 *
 * Tests the InMemoryRateLimiter sliding-window implementation and
 * the header-setting / tier-mapping helpers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ServerResponse } from "node:http";

// We import the module functions, but the singleton `rateLimiter` gets its
// own internal state.  To get a fresh limiter per test we import the module
// and use the exported singleton (each test resets via `rateLimiter.reset`).
import {
  rateLimiter,
  setRateLimitHeaders,
  getTierForEndpoint,
  type RateLimitResult,
  type RateLimitTier,
} from "../../src/middleware/rate-limit.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Unique key per test to avoid cross-test state leaks. */
let keyCounter = 0;
function uniqueKey(): string {
  return `test-key-${++keyCounter}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// InMemoryRateLimiter.check
// ---------------------------------------------------------------------------

describe("InMemoryRateLimiter", () => {
  it("allows requests under the limit", async () => {
    const key = uniqueKey();
    const result = await rateLimiter.check(key, "create"); // limit = 100
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99); // 100 - 0 - 1
    expect(result.retryAfter).toBe(0);
  });

  it("tracks remaining count correctly across multiple requests", async () => {
    const key = uniqueKey();
    // Send 5 requests against the "key_ops" tier (limit = 10)
    for (let i = 0; i < 5; i++) {
      await rateLimiter.check(key, "key_ops");
    }
    const result = await rateLimiter.check(key, "key_ops");
    expect(result.allowed).toBe(true);
    // 10 - 5 (already sent) - 1 (this one) = 4
    expect(result.remaining).toBe(4);
  });

  it("blocks requests that exceed the limit", async () => {
    const key = uniqueKey();
    // Exhaust the "key_ops" tier (limit = 10)
    for (let i = 0; i < 10; i++) {
      const r = await rateLimiter.check(key, "key_ops");
      expect(r.allowed).toBe(true);
    }
    // The 11th request should be blocked
    const blocked = await rateLimiter.check(key, "key_ops");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("different tiers have different limits", async () => {
    const key = uniqueKey();

    // "verify" tier has limit 1000
    const verifyResult = await rateLimiter.check(key, "verify");
    expect(verifyResult.limit).toBe(1000);

    // "key_ops" tier has limit 10
    const keyOpsResult = await rateLimiter.check(key, "key_ops");
    expect(keyOpsResult.limit).toBe(10);

    // "cert_issue" tier has limit 50
    const certResult = await rateLimiter.check(key, "cert_issue");
    expect(certResult.limit).toBe(50);

    // "create" tier has limit 100
    const createResult = await rateLimiter.check(key, "create");
    expect(createResult.limit).toBe(100);

    // "transparency" tier has limit 500
    const transResult = await rateLimiter.check(key, "transparency");
    expect(transResult.limit).toBe(500);
  });

  it("tiers are independent — exhausting one does not affect others", async () => {
    const key = uniqueKey();

    // Exhaust "key_ops" (limit 10)
    for (let i = 0; i < 10; i++) {
      await rateLimiter.check(key, "key_ops");
    }
    const keyOpsBlocked = await rateLimiter.check(key, "key_ops");
    expect(keyOpsBlocked.allowed).toBe(false);

    // "create" tier for the same key should still be allowed
    const createAllowed = await rateLimiter.check(key, "create");
    expect(createAllowed.allowed).toBe(true);
  });

  it("reset clears all tier counters for a key", async () => {
    const key = uniqueKey();

    // Use up some of the "key_ops" budget
    for (let i = 0; i < 10; i++) {
      await rateLimiter.check(key, "key_ops");
    }
    const blocked = await rateLimiter.check(key, "key_ops");
    expect(blocked.allowed).toBe(false);

    // Reset
    await rateLimiter.reset(key);

    // Should be allowed again
    const afterReset = await rateLimiter.check(key, "key_ops");
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(9);
  });

  it("sliding window: old requests expire after 60 seconds", async () => {
    const key = uniqueKey();

    // Fake time: use vi.useFakeTimers to fast-forward
    vi.useFakeTimers();

    try {
      // Exhaust key_ops (limit 10)
      for (let i = 0; i < 10; i++) {
        await rateLimiter.check(key, "key_ops");
      }
      const blocked = await rateLimiter.check(key, "key_ops");
      expect(blocked.allowed).toBe(false);

      // Advance time by 61 seconds (past the 60s window)
      vi.advanceTimersByTime(61_000);

      // Old timestamps should have expired — request should be allowed
      const afterExpiry = await rateLimiter.check(key, "key_ops");
      expect(afterExpiry.allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns correct resetAt as UTC epoch seconds", async () => {
    const key = uniqueKey();
    const before = Math.floor(Date.now() / 1000);
    const result = await rateLimiter.check(key, "verify");
    const after = Math.ceil(Date.now() / 1000) + 60;

    // resetAt should be within [now, now+60] seconds (in epoch seconds)
    expect(result.resetAt).toBeGreaterThanOrEqual(before);
    expect(result.resetAt).toBeLessThanOrEqual(after);
  });
});

// ---------------------------------------------------------------------------
// setRateLimitHeaders
// ---------------------------------------------------------------------------

describe("setRateLimitHeaders", () => {
  function mockResponse(): {
    headers: Record<string, string | number>;
    setHeader: (k: string, v: string | number) => void;
  } {
    const headers: Record<string, string | number> = {};
    return {
      headers,
      setHeader(k: string, v: string | number) {
        headers[k] = v;
      },
    };
  }

  it("sets X-RateLimit-Limit, Remaining, Reset when allowed", () => {
    const res = mockResponse();
    const result: RateLimitResult = {
      allowed: true,
      limit: 100,
      remaining: 95,
      resetAt: 1700000000,
      retryAfter: 0,
    };

    setRateLimitHeaders(res as unknown as ServerResponse, result);

    expect(res.headers["X-RateLimit-Limit"]).toBe(100);
    expect(res.headers["X-RateLimit-Remaining"]).toBe(95);
    expect(res.headers["X-RateLimit-Reset"]).toBe(1700000000);
    // Retry-After should NOT be set when allowed
    expect(res.headers["Retry-After"]).toBeUndefined();
  });

  it("sets Retry-After header when NOT allowed", () => {
    const res = mockResponse();
    const result: RateLimitResult = {
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAt: 1700000060,
      retryAfter: 45,
    };

    setRateLimitHeaders(res as unknown as ServerResponse, result);

    expect(res.headers["X-RateLimit-Limit"]).toBe(10);
    expect(res.headers["X-RateLimit-Remaining"]).toBe(0);
    expect(res.headers["Retry-After"]).toBe(45);
  });
});

// ---------------------------------------------------------------------------
// getTierForEndpoint
// ---------------------------------------------------------------------------

describe("getTierForEndpoint", () => {
  it("maps /v1/attestations/verify to 'verify'", () => {
    expect(getTierForEndpoint("/v1/attestations/verify")).toBe("verify");
  });

  it("maps /v1/certificates/verify to 'verify'", () => {
    expect(getTierForEndpoint("/v1/certificates/verify")).toBe("verify");
  });

  it("maps /v1/attestations/create to 'create'", () => {
    expect(getTierForEndpoint("/v1/attestations/create")).toBe("create");
  });

  it("maps /v1/certificates/issue to 'cert_issue'", () => {
    expect(getTierForEndpoint("/v1/certificates/issue")).toBe("cert_issue");
  });

  it("maps /v1/keys/rotate to 'key_ops'", () => {
    expect(getTierForEndpoint("/v1/keys/rotate")).toBe("key_ops");
  });

  it("maps /v1/keys/revoke to 'key_ops'", () => {
    expect(getTierForEndpoint("/v1/keys/revoke")).toBe("key_ops");
  });

  it("maps /v1/transparency/inclusion/ref123 to 'transparency'", () => {
    expect(getTierForEndpoint("/v1/transparency/inclusion/ref123")).toBe(
      "transparency",
    );
  });

  it("maps unknown endpoints to 'create' as default", () => {
    expect(getTierForEndpoint("/v1/unknown/path")).toBe("create");
  });
});
