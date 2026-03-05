import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ─── Mocks ───

vi.mock("server-only", () => ({}));

vi.mock("@/lib/services/api-key-service", () => ({
  validateApiKey: vi.fn(),
  hasScope: vi.fn(),
  hasAnyScope: vi.fn(),
  checkRateLimit: vi.fn(),
  logApiRequest: vi.fn(),
}));

vi.mock("@/lib/hmac-signing.server", () => ({
  verifySignature: vi.fn(),
  extractRequestDetails: vi.fn(),
}));

import {
  authenticateApiRequest,
  requireScope,
  requireAnyScope,
  apiError,
  apiSuccess,
  addRateLimitHeaders,
  withApiAuth,
  logRequest,
  type ApiContext,
} from "@/lib/api-auth";

import {
  validateApiKey,
  hasScope,
  hasAnyScope,
  checkRateLimit,
  logApiRequest,
} from "@/lib/services/api-key-service";

import { verifySignature } from "@/lib/hmac-signing.server";

// ─── Helpers ───

function makeRequest(
  url = "https://example.com/api/v1/test",
  options?: RequestInit,
): NextRequest {
  return new NextRequest(url, options);
}

function makeMockApiKey(overrides: Record<string, unknown> = {}) {
  return {
    id: "key-123",
    name: "Test Key",
    keyHash: "hash",
    keyPrefix: "cxk_",
    organizationId: "org-456",
    createdById: "user-789",
    scopes: ["compliance:read"],
    rateLimit: 1000,
    requireSigning: false,
    signingSecret: null,
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: null,
    previousKeyHash: null,
    previousKeyExpiresAt: null,
    keyType: "STANDARD",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ───

describe("API Auth Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════
  // authenticateApiRequest
  // ═══════════════════════════════════════════════════════

  describe("authenticateApiRequest", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const request = makeRequest("https://example.com/api/v1/test");

      const result = await authenticateApiRequest(request);

      expect(result).toEqual({
        authenticated: false,
        error: "Missing Authorization header",
        statusCode: 401,
      });
      expect(validateApiKey).not.toHaveBeenCalled();
    });

    it("validates a Bearer-prefixed API key", async () => {
      const apiKey = makeMockApiKey();
      (validateApiKey as Mock).mockResolvedValue({ valid: true, apiKey });
      (checkRateLimit as Mock).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(),
      });

      const request = makeRequest("https://example.com/api/v1/test", {
        headers: { Authorization: "Bearer cxk_test_key" },
      });

      const result = await authenticateApiRequest(request);

      expect(validateApiKey).toHaveBeenCalledWith("cxk_test_key");
      expect(result.authenticated).toBe(true);
      expect(result.apiKey).toBe(apiKey);
    });

    it("validates a raw API key (no Bearer prefix)", async () => {
      const apiKey = makeMockApiKey();
      (validateApiKey as Mock).mockResolvedValue({ valid: true, apiKey });
      (checkRateLimit as Mock).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(),
      });

      const request = makeRequest("https://example.com/api/v1/test", {
        headers: { Authorization: "cxk_raw_key" },
      });

      const result = await authenticateApiRequest(request);

      expect(validateApiKey).toHaveBeenCalledWith("cxk_raw_key");
      expect(result.authenticated).toBe(true);
    });

    it("returns 401 when validateApiKey returns invalid", async () => {
      (validateApiKey as Mock).mockResolvedValue({
        valid: false,
        error: "Invalid key format",
      });

      const request = makeRequest("https://example.com/api/v1/test", {
        headers: { Authorization: "Bearer invalid_key" },
      });

      const result = await authenticateApiRequest(request);

      expect(result).toEqual({
        authenticated: false,
        error: "Invalid key format",
        statusCode: 401,
      });
    });

    it("returns 401 with default message when validateApiKey has no error string", async () => {
      (validateApiKey as Mock).mockResolvedValue({
        valid: false,
        apiKey: undefined,
      });

      const request = makeRequest("https://example.com/api/v1/test", {
        headers: { Authorization: "Bearer some_key" },
      });

      const result = await authenticateApiRequest(request);

      expect(result.error).toBe("Invalid API key");
      expect(result.statusCode).toBe(401);
    });

    it("returns 401 when apiKey is null even though valid is truthy", async () => {
      // Edge case: valid true but no apiKey object
      (validateApiKey as Mock).mockResolvedValue({
        valid: true,
        apiKey: undefined,
      });

      const request = makeRequest("https://example.com/api/v1/test", {
        headers: { Authorization: "Bearer cxk_key" },
      });

      const result = await authenticateApiRequest(request);

      expect(result.authenticated).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it("returns 429 when rate limit is exceeded", async () => {
      const apiKey = makeMockApiKey();
      (validateApiKey as Mock).mockResolvedValue({ valid: true, apiKey });
      (checkRateLimit as Mock).mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
      });

      const request = makeRequest("https://example.com/api/v1/test", {
        headers: { Authorization: "Bearer cxk_test_key" },
      });

      const result = await authenticateApiRequest(request);

      expect(checkRateLimit).toHaveBeenCalledWith(apiKey.id, apiKey.rateLimit);
      expect(result).toEqual({
        authenticated: false,
        error: "Rate limit exceeded",
        statusCode: 429,
      });
    });

    describe("HMAC signing verification", () => {
      it("verifies signature when requireSigning is true", async () => {
        const apiKey = makeMockApiKey({
          requireSigning: true,
          signingSecret: "secret-abc",
        });
        (validateApiKey as Mock).mockResolvedValue({ valid: true, apiKey });
        (verifySignature as Mock).mockReturnValue({ valid: true });
        (checkRateLimit as Mock).mockResolvedValue({
          allowed: true,
          remaining: 999,
          resetAt: new Date(),
        });

        const request = makeRequest("https://example.com/api/v1/test", {
          headers: {
            Authorization: "Bearer cxk_signed_key",
            "X-Signature": "t=1234,v1=abc123",
          },
        });

        const result = await authenticateApiRequest(request, '{"data":true}');

        expect(verifySignature).toHaveBeenCalledWith(
          "t=1234,v1=abc123",
          "secret-abc",
          "GET",
          "/api/v1/test",
          '{"data":true}',
        );
        expect(result.authenticated).toBe(true);
        expect(result.signatureVerified).toBe(true);
      });

      it("returns 500 when requireSigning is true but no signingSecret is configured", async () => {
        const apiKey = makeMockApiKey({
          requireSigning: true,
          signingSecret: null,
        });
        (validateApiKey as Mock).mockResolvedValue({ valid: true, apiKey });

        const request = makeRequest("https://example.com/api/v1/test", {
          headers: { Authorization: "Bearer cxk_key" },
        });

        const result = await authenticateApiRequest(request);

        expect(result).toEqual({
          authenticated: false,
          error:
            "API key requires signing but has no signing secret configured",
          statusCode: 500,
        });
        expect(verifySignature).not.toHaveBeenCalled();
      });

      it("returns 401 when signature verification fails", async () => {
        const apiKey = makeMockApiKey({
          requireSigning: true,
          signingSecret: "secret-abc",
        });
        (validateApiKey as Mock).mockResolvedValue({ valid: true, apiKey });
        (verifySignature as Mock).mockReturnValue({
          valid: false,
          error: "Signature expired",
        });

        const request = makeRequest("https://example.com/api/v1/test", {
          headers: {
            Authorization: "Bearer cxk_key",
            "X-Signature": "t=1,v1=bad",
          },
        });

        const result = await authenticateApiRequest(request);

        expect(result).toEqual({
          authenticated: false,
          error: "Signature expired",
          statusCode: 401,
        });
      });

      it("returns 401 with default error when verifySignature has no error string", async () => {
        const apiKey = makeMockApiKey({
          requireSigning: true,
          signingSecret: "secret-abc",
        });
        (validateApiKey as Mock).mockResolvedValue({ valid: true, apiKey });
        (verifySignature as Mock).mockReturnValue({ valid: false });

        const request = makeRequest("https://example.com/api/v1/test", {
          headers: {
            Authorization: "Bearer cxk_key",
            "X-Signature": "t=1,v1=bad",
          },
        });

        const result = await authenticateApiRequest(request);

        expect(result.error).toBe("Invalid signature");
      });

      it("passes null body when requestBody is undefined", async () => {
        const apiKey = makeMockApiKey({
          requireSigning: true,
          signingSecret: "secret-abc",
        });
        (validateApiKey as Mock).mockResolvedValue({ valid: true, apiKey });
        (verifySignature as Mock).mockReturnValue({ valid: true });
        (checkRateLimit as Mock).mockResolvedValue({
          allowed: true,
          remaining: 999,
          resetAt: new Date(),
        });

        const request = makeRequest("https://example.com/api/v1/test", {
          headers: {
            Authorization: "Bearer cxk_key",
            "X-Signature": "t=1,v1=abc",
          },
        });

        // Call without requestBody (undefined)
        await authenticateApiRequest(request);

        expect(verifySignature).toHaveBeenCalledWith(
          expect.any(String),
          "secret-abc",
          "GET",
          "/api/v1/test",
          null,
        );
      });
    });

    it("sets signatureVerified to false when requireSigning is false", async () => {
      const apiKey = makeMockApiKey({ requireSigning: false });
      (validateApiKey as Mock).mockResolvedValue({ valid: true, apiKey });
      (checkRateLimit as Mock).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(),
      });

      const request = makeRequest("https://example.com/api/v1/test", {
        headers: { Authorization: "Bearer cxk_key" },
      });

      const result = await authenticateApiRequest(request);

      expect(result.signatureVerified).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // requireScope / requireAnyScope
  // ═══════════════════════════════════════════════════════

  describe("requireScope", () => {
    it("delegates to hasScope and returns true when scope matches", () => {
      const apiKey = makeMockApiKey();
      (hasScope as Mock).mockReturnValue(true);

      const result = requireScope(apiKey as any, "compliance:read");

      expect(hasScope).toHaveBeenCalledWith(apiKey, "compliance:read");
      expect(result).toBe(true);
    });

    it("delegates to hasScope and returns false when scope does not match", () => {
      const apiKey = makeMockApiKey();
      (hasScope as Mock).mockReturnValue(false);

      const result = requireScope(apiKey as any, "admin:write");

      expect(hasScope).toHaveBeenCalledWith(apiKey, "admin:write");
      expect(result).toBe(false);
    });
  });

  describe("requireAnyScope", () => {
    it("delegates to hasAnyScope and returns true when any scope matches", () => {
      const apiKey = makeMockApiKey();
      (hasAnyScope as Mock).mockReturnValue(true);

      const result = requireAnyScope(apiKey as any, [
        "compliance:read",
        "compliance:write",
      ]);

      expect(hasAnyScope).toHaveBeenCalledWith(apiKey, [
        "compliance:read",
        "compliance:write",
      ]);
      expect(result).toBe(true);
    });

    it("delegates to hasAnyScope and returns false when no scope matches", () => {
      const apiKey = makeMockApiKey();
      (hasAnyScope as Mock).mockReturnValue(false);

      const result = requireAnyScope(apiKey as any, ["admin:write"]);

      expect(hasAnyScope).toHaveBeenCalledWith(apiKey, ["admin:write"]);
      expect(result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════
  // apiError
  // ═══════════════════════════════════════════════════════

  describe("apiError", () => {
    it("returns a JSON error response with default 400 status", async () => {
      const response = apiError("Bad request");

      expect(response.status).toBe(400);
      expect(response.headers.get("Content-Type")).toBe("application/json");

      const body = await response.json();
      expect(body).toEqual({
        error: {
          message: "Bad request",
          code: 400,
        },
      });
    });

    it("returns a JSON error response with custom status code", async () => {
      const response = apiError("Not found", 404);

      expect(response.status).toBe(404);

      const body = await response.json();
      expect(body.error.code).toBe(404);
      expect(body.error.message).toBe("Not found");
    });

    it("includes additional details when provided", async () => {
      const response = apiError("Forbidden", 403, {
        requiredScopes: ["compliance:write"],
        hint: "Upgrade your plan",
      });

      const body = await response.json();
      expect(body.error).toEqual({
        message: "Forbidden",
        code: 403,
        requiredScopes: ["compliance:write"],
        hint: "Upgrade your plan",
      });
    });

    it("returns a NextResponse instance", () => {
      const response = apiError("error");
      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  // ═══════════════════════════════════════════════════════
  // apiSuccess
  // ═══════════════════════════════════════════════════════

  describe("apiSuccess", () => {
    it("returns a JSON success response with default 200 status", async () => {
      const response = apiSuccess({ items: [1, 2, 3] });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");

      const body = await response.json();
      expect(body).toEqual({
        data: { items: [1, 2, 3] },
      });
    });

    it("returns a JSON success response with custom status code", async () => {
      const response = apiSuccess({ id: "new-123" }, 201);

      expect(response.status).toBe(201);

      const body = await response.json();
      expect(body.data).toEqual({ id: "new-123" });
    });

    it("includes meta when provided", async () => {
      const response = apiSuccess([{ id: 1 }, { id: 2 }], 200, {
        total: 42,
        page: 1,
        perPage: 10,
      });

      const body = await response.json();
      expect(body).toEqual({
        data: [{ id: 1 }, { id: 2 }],
        meta: { total: 42, page: 1, perPage: 10 },
      });
    });

    it("does not include meta key when meta is undefined", async () => {
      const response = apiSuccess("ok");

      const body = await response.json();
      expect(body).toEqual({ data: "ok" });
      expect("meta" in body).toBe(false);
    });

    it("returns a NextResponse instance", () => {
      const response = apiSuccess(null);
      expect(response).toBeInstanceOf(NextResponse);
    });
  });

  // ═══════════════════════════════════════════════════════
  // addRateLimitHeaders
  // ═══════════════════════════════════════════════════════

  describe("addRateLimitHeaders", () => {
    it("sets X-RateLimit-Limit header", () => {
      const response = NextResponse.json({});
      const resetAt = new Date("2026-01-01T00:00:00Z");

      addRateLimitHeaders(response, 950, 1000, resetAt);

      expect(response.headers.get("X-RateLimit-Limit")).toBe("1000");
    });

    it("sets X-RateLimit-Remaining header", () => {
      const response = NextResponse.json({});
      const resetAt = new Date("2026-01-01T00:00:00Z");

      addRateLimitHeaders(response, 42, 100, resetAt);

      expect(response.headers.get("X-RateLimit-Remaining")).toBe("42");
    });

    it("sets X-RateLimit-Reset header as unix timestamp (seconds)", () => {
      const resetAt = new Date("2026-06-15T12:00:00Z");
      const expectedTimestamp = Math.floor(resetAt.getTime() / 1000).toString();
      const response = NextResponse.json({});

      addRateLimitHeaders(response, 10, 100, resetAt);

      expect(response.headers.get("X-RateLimit-Reset")).toBe(expectedTimestamp);
    });

    it("returns the same response object (mutates in place)", () => {
      const response = NextResponse.json({});
      const resetAt = new Date();

      const returned = addRateLimitHeaders(response, 50, 100, resetAt);

      expect(returned).toBe(response);
    });

    it("handles zero remaining", () => {
      const response = NextResponse.json({});

      addRateLimitHeaders(response, 0, 500, new Date());

      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
    });
  });

  // ═══════════════════════════════════════════════════════
  // logRequest
  // ═══════════════════════════════════════════════════════

  describe("logRequest", () => {
    it("calls logApiRequest with correct method, path, and statusCode", async () => {
      const request = makeRequest(
        "https://example.com/api/v1/compliance/score",
        {
          method: "POST",
        },
      );

      await logRequest("key-123", request, 200, Date.now() - 50);

      expect(logApiRequest).toHaveBeenCalledWith(
        "key-123",
        expect.objectContaining({
          method: "POST",
          path: "/api/v1/compliance/score",
          statusCode: 200,
        }),
      );
    });

    it("calculates responseTimeMs from startTime", async () => {
      const startTime = Date.now() - 123;

      const request = makeRequest("https://example.com/api/v1/test");

      await logRequest("key-123", request, 200, startTime);

      const callArgs = (logApiRequest as Mock).mock.calls[0][1];
      // responseTimeMs should be roughly >= 123 (accounting for execution time)
      expect(callArgs.responseTimeMs).toBeGreaterThanOrEqual(100);
      expect(callArgs.responseTimeMs).toBeLessThan(5000);
    });

    it("extracts IP from x-forwarded-for header (first value)", async () => {
      const request = makeRequest("https://example.com/api/v1/test", {
        headers: {
          "x-forwarded-for": "1.2.3.4, 5.6.7.8",
        },
      });

      await logRequest("key-123", request, 200, Date.now());

      expect(logApiRequest).toHaveBeenCalledWith(
        "key-123",
        expect.objectContaining({
          ipAddress: "1.2.3.4",
        }),
      );
    });

    it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
      const request = makeRequest("https://example.com/api/v1/test", {
        headers: {
          "x-real-ip": "10.0.0.1",
        },
      });

      await logRequest("key-123", request, 200, Date.now());

      expect(logApiRequest).toHaveBeenCalledWith(
        "key-123",
        expect.objectContaining({
          ipAddress: "10.0.0.1",
        }),
      );
    });

    it("sets ipAddress to undefined when no IP headers are present", async () => {
      const request = makeRequest("https://example.com/api/v1/test");

      await logRequest("key-123", request, 200, Date.now());

      expect(logApiRequest).toHaveBeenCalledWith(
        "key-123",
        expect.objectContaining({
          ipAddress: undefined,
        }),
      );
    });

    it("includes userAgent from request headers", async () => {
      const request = makeRequest("https://example.com/api/v1/test", {
        headers: {
          "user-agent": "CaelexSDK/1.0",
        },
      });

      await logRequest("key-123", request, 200, Date.now());

      expect(logApiRequest).toHaveBeenCalledWith(
        "key-123",
        expect.objectContaining({
          userAgent: "CaelexSDK/1.0",
        }),
      );
    });

    it("includes errorCode and errorMessage when error is provided", async () => {
      const request = makeRequest("https://example.com/api/v1/test");

      await logRequest("key-123", request, 500, Date.now(), "Something broke");

      expect(logApiRequest).toHaveBeenCalledWith(
        "key-123",
        expect.objectContaining({
          errorCode: "500",
          errorMessage: "Something broke",
        }),
      );
    });

    it("sets errorCode and errorMessage to undefined when no error", async () => {
      const request = makeRequest("https://example.com/api/v1/test");

      await logRequest("key-123", request, 200, Date.now());

      expect(logApiRequest).toHaveBeenCalledWith(
        "key-123",
        expect.objectContaining({
          errorCode: undefined,
          errorMessage: undefined,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════
  // withApiAuth
  // ═══════════════════════════════════════════════════════

  describe("withApiAuth", () => {
    function setupAuthSuccess(apiKeyOverrides: Record<string, unknown> = {}) {
      const apiKey = makeMockApiKey(apiKeyOverrides);
      (validateApiKey as Mock).mockResolvedValue({ valid: true, apiKey });
      (checkRateLimit as Mock).mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetAt: new Date(),
      });
      (logApiRequest as Mock).mockResolvedValue(undefined);
      return apiKey;
    }

    it("authenticates and calls the handler with ApiContext", async () => {
      const apiKey = setupAuthSuccess();
      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ ok: true }));
      const wrapped = withApiAuth(handler);

      const request = makeRequest("https://example.com/api/v1/test", {
        headers: { Authorization: "Bearer cxk_key" },
      });

      const response = await wrapped(request);

      expect(response.status).toBe(200);
      expect(handler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          apiKey,
          organizationId: "org-456",
          startTime: expect.any(Number),
        }),
      );
    });

    it("returns 401 when authentication fails", async () => {
      (validateApiKey as Mock).mockResolvedValue({
        valid: false,
        error: "Expired key",
      });

      const handler = vi.fn();
      const wrapped = withApiAuth(handler);

      const request = makeRequest("https://example.com/api/v1/test", {
        headers: { Authorization: "Bearer cxk_expired" },
      });

      const response = await wrapped(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error.message).toBe("Expired key");
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns 401 with default error when validateApiKey provides no error string", async () => {
      // When validateApiKey returns { valid: false } with no error message,
      // authenticateApiRequest defaults to "Invalid API key".
      // withApiAuth passes that through via authResult.error || "Unauthorized".
      (validateApiKey as Mock).mockResolvedValue({
        valid: false,
      });

      const handler = vi.fn();
      const wrapped = withApiAuth(handler);

      const request = makeRequest("https://example.com/api/v1/test", {
        headers: { Authorization: "Bearer cxk_key" },
      });

      const response = await wrapped(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      // authenticateApiRequest fills in "Invalid API key" as default
      expect(body.error.message).toBe("Invalid API key");
      expect(handler).not.toHaveBeenCalled();
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const handler = vi.fn();
      const wrapped = withApiAuth(handler);

      const request = makeRequest("https://example.com/api/v1/test");

      const response = await wrapped(request);

      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    describe("scope checks (requiredScopes)", () => {
      it("returns 403 when requiredScopes check fails", async () => {
        setupAuthSuccess();
        (hasScope as Mock).mockReturnValue(false);
        (logApiRequest as Mock).mockResolvedValue(undefined);

        const handler = vi.fn();
        const wrapped = withApiAuth(handler, {
          requiredScopes: ["compliance:write"],
        });

        const request = makeRequest("https://example.com/api/v1/test", {
          headers: { Authorization: "Bearer cxk_key" },
        });

        const response = await wrapped(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error.message).toBe("Insufficient permissions");
        expect(body.error.requiredScopes).toEqual(["compliance:write"]);
        expect(handler).not.toHaveBeenCalled();
      });

      it("logs the 403 error on scope failure", async () => {
        setupAuthSuccess();
        (hasScope as Mock).mockReturnValue(false);
        (logApiRequest as Mock).mockResolvedValue(undefined);

        const handler = vi.fn();
        const wrapped = withApiAuth(handler, {
          requiredScopes: ["compliance:write"],
        });

        const request = makeRequest("https://example.com/api/v1/test", {
          headers: { Authorization: "Bearer cxk_key" },
        });

        await wrapped(request);

        expect(logApiRequest).toHaveBeenCalledWith(
          "key-123",
          expect.objectContaining({
            statusCode: 403,
            errorMessage: "Insufficient permissions",
          }),
        );
      });

      it("proceeds when all requiredScopes pass", async () => {
        setupAuthSuccess();
        (hasScope as Mock).mockReturnValue(true);

        const handler = vi
          .fn()
          .mockResolvedValue(NextResponse.json({ ok: true }));
        const wrapped = withApiAuth(handler, {
          requiredScopes: ["compliance:read", "compliance:write"],
        });

        const request = makeRequest("https://example.com/api/v1/test", {
          headers: { Authorization: "Bearer cxk_key" },
        });

        const response = await wrapped(request);

        expect(response.status).toBe(200);
        expect(handler).toHaveBeenCalled();
        expect(hasScope).toHaveBeenCalledTimes(2);
      });
    });

    describe("scope checks (anyScopes)", () => {
      it("returns 403 when anyScopes check fails", async () => {
        setupAuthSuccess();
        (hasAnyScope as Mock).mockReturnValue(false);
        (logApiRequest as Mock).mockResolvedValue(undefined);

        const handler = vi.fn();
        const wrapped = withApiAuth(handler, {
          anyScopes: ["compliance:read", "compliance:write"],
        });

        const request = makeRequest("https://example.com/api/v1/test", {
          headers: { Authorization: "Bearer cxk_key" },
        });

        const response = await wrapped(request);

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error.message).toBe("Insufficient permissions");
        expect(body.error.requiredScopes).toEqual([
          "compliance:read",
          "compliance:write",
        ]);
        expect(handler).not.toHaveBeenCalled();
      });

      it("proceeds when anyScopes check passes", async () => {
        setupAuthSuccess();
        (hasAnyScope as Mock).mockReturnValue(true);

        const handler = vi
          .fn()
          .mockResolvedValue(NextResponse.json({ ok: true }));
        const wrapped = withApiAuth(handler, {
          anyScopes: ["compliance:read", "compliance:write"],
        });

        const request = makeRequest("https://example.com/api/v1/test", {
          headers: { Authorization: "Bearer cxk_key" },
        });

        const response = await wrapped(request);

        expect(response.status).toBe(200);
        expect(handler).toHaveBeenCalled();
      });
    });

    describe("handler execution and error handling", () => {
      it("logs successful request after handler execution", async () => {
        setupAuthSuccess();

        const handler = vi
          .fn()
          .mockResolvedValue(
            new NextResponse(JSON.stringify({ data: true }), { status: 201 }),
          );
        const wrapped = withApiAuth(handler);

        const request = makeRequest("https://example.com/api/v1/test", {
          headers: { Authorization: "Bearer cxk_key" },
        });

        await wrapped(request);

        expect(logApiRequest).toHaveBeenCalledWith(
          "key-123",
          expect.objectContaining({
            statusCode: 201,
          }),
        );
      });

      it("returns 500 and logs error when handler throws an Error", async () => {
        setupAuthSuccess();

        const handler = vi
          .fn()
          .mockRejectedValue(new Error("Database connection lost"));
        const wrapped = withApiAuth(handler);

        const request = makeRequest("https://example.com/api/v1/test", {
          headers: { Authorization: "Bearer cxk_key" },
        });

        const response = await wrapped(request);

        expect(response.status).toBe(500);
        const body = await response.json();
        // Source returns generic message to clients to prevent information leakage
        expect(body.error.message).toBe("Internal server error");

        expect(logApiRequest).toHaveBeenCalledWith(
          "key-123",
          expect.objectContaining({
            statusCode: 500,
            errorMessage: "Database connection lost",
          }),
        );
      });

      it("returns 500 with generic message when handler throws non-Error", async () => {
        setupAuthSuccess();

        const handler = vi.fn().mockRejectedValue("string error");
        const wrapped = withApiAuth(handler);

        const request = makeRequest("https://example.com/api/v1/test", {
          headers: { Authorization: "Bearer cxk_key" },
        });

        const response = await wrapped(request);

        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.error.message).toBe("Internal server error");
      });
    });

    describe("request body extraction for HMAC", () => {
      it("extracts body from POST requests for HMAC verification", async () => {
        const apiKey = makeMockApiKey({
          requireSigning: true,
          signingSecret: "sec",
        });
        (validateApiKey as Mock).mockResolvedValue({ valid: true, apiKey });
        (verifySignature as Mock).mockReturnValue({ valid: true });
        (checkRateLimit as Mock).mockResolvedValue({
          allowed: true,
          remaining: 999,
          resetAt: new Date(),
        });
        (logApiRequest as Mock).mockResolvedValue(undefined);

        const handler = vi
          .fn()
          .mockResolvedValue(NextResponse.json({ ok: true }));
        const wrapped = withApiAuth(handler);

        const request = makeRequest("https://example.com/api/v1/test", {
          method: "POST",
          headers: {
            Authorization: "Bearer cxk_key",
            "X-Signature": "t=123,v1=abc",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ foo: "bar" }),
        });

        await wrapped(request);

        expect(verifySignature).toHaveBeenCalledWith(
          "t=123,v1=abc",
          "sec",
          "POST",
          "/api/v1/test",
          JSON.stringify({ foo: "bar" }),
        );
      });

      it("does not extract body from GET requests", async () => {
        const apiKey = makeMockApiKey({
          requireSigning: true,
          signingSecret: "sec",
        });
        (validateApiKey as Mock).mockResolvedValue({ valid: true, apiKey });
        (verifySignature as Mock).mockReturnValue({ valid: true });
        (checkRateLimit as Mock).mockResolvedValue({
          allowed: true,
          remaining: 999,
          resetAt: new Date(),
        });
        (logApiRequest as Mock).mockResolvedValue(undefined);

        const handler = vi
          .fn()
          .mockResolvedValue(NextResponse.json({ ok: true }));
        const wrapped = withApiAuth(handler);

        const request = makeRequest("https://example.com/api/v1/test", {
          method: "GET",
          headers: {
            Authorization: "Bearer cxk_key",
            "X-Signature": "t=123,v1=abc",
          },
        });

        await wrapped(request);

        // For GET, requestBody should be null (not extracted)
        expect(verifySignature).toHaveBeenCalledWith(
          "t=123,v1=abc",
          "sec",
          "GET",
          "/api/v1/test",
          null,
        );
      });
    });

    it("returns the handler response directly on success", async () => {
      setupAuthSuccess();

      const expectedResponse = NextResponse.json(
        { data: { score: 85 } },
        { status: 200 },
      );
      const handler = vi.fn().mockResolvedValue(expectedResponse);
      const wrapped = withApiAuth(handler);

      const request = makeRequest("https://example.com/api/v1/test", {
        headers: { Authorization: "Bearer cxk_key" },
      });

      const response = await wrapped(request);

      expect(response).toBe(expectedResponse);
    });
  });
});
