/**
 * Verity 2036 -- Error Handling Tests
 *
 * Tests:
 * - ApiError maps to correct HTTP status codes
 * - Error responses have correct JSON structure
 * - Unknown errors return INTERNAL_ERROR
 * - Stack traces are never exposed
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ServerResponse } from "node:http";
import { ApiError, ErrorCode } from "../../src/errors/codes.js";
import { handleError } from "../../src/middleware/error-handler.js";

// ---------------------------------------------------------------------------
// Mock response helper
// ---------------------------------------------------------------------------

function createMockResponse(): {
  res: ServerResponse;
  getStatus: () => number;
  getBody: () => string;
  getContentType: () => string;
} {
  let statusCode = 0;
  let body = "";
  let contentType = "";

  const res = {
    writeHead: vi.fn((code: number, headers?: Record<string, string>) => {
      statusCode = code;
      if (headers?.["Content-Type"]) {
        contentType = headers["Content-Type"];
      }
      return res;
    }),
    end: vi.fn((data?: string) => {
      if (data) body = data;
    }),
  } as unknown as ServerResponse;

  return {
    res,
    getStatus: () => statusCode,
    getBody: () => body,
    getContentType: () => contentType,
  };
}

// ---------------------------------------------------------------------------
// ApiError status code mapping
// ---------------------------------------------------------------------------

describe("ApiError status code mapping", () => {
  const cases: Array<[ErrorCode, number]> = [
    [ErrorCode.VALIDATION_ERROR, 400],
    [ErrorCode.AUTHENTICATION_REQUIRED, 401],
    [ErrorCode.AUTHENTICATION_FAILED, 401],
    [ErrorCode.PERMISSION_DENIED, 403],
    [ErrorCode.RESOURCE_NOT_FOUND, 404],
    [ErrorCode.TENANT_MISMATCH, 403],
    [ErrorCode.KEY_EXPIRED, 422],
    [ErrorCode.KEY_REVOKED, 422],
    [ErrorCode.KEY_ALREADY_ROTATED, 409],
    [ErrorCode.KEY_ALREADY_REVOKED, 409],
    [ErrorCode.ATTESTATION_REVOKED, 422],
    [ErrorCode.ATTESTATION_NOT_FOUND, 404],
    [ErrorCode.CERTIFICATE_NOT_FOUND, 404],
    [ErrorCode.NONCE_COLLISION, 409],
    [ErrorCode.RATE_LIMIT_EXCEEDED, 429],
    [ErrorCode.INTERNAL_ERROR, 500],
  ];

  for (const [code, expectedStatus] of cases) {
    it(`${code} maps to HTTP ${expectedStatus}`, () => {
      const error = new ApiError(code, `Test message for ${code}`);
      expect(error.statusCode).toBe(expectedStatus);
      expect(error.code).toBe(code);
      expect(error.message).toBe(`Test message for ${code}`);
      expect(error.name).toBe("ApiError");
    });
  }

  it("ApiError is an instance of Error", () => {
    const error = new ApiError(ErrorCode.VALIDATION_ERROR, "test");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// handleError — JSON response structure
// ---------------------------------------------------------------------------

describe("handleError", () => {
  it("produces correct JSON structure for known ApiErrors", () => {
    const { res, getStatus, getBody } = createMockResponse();
    const error = new ApiError(ErrorCode.VALIDATION_ERROR, "Name is required");

    handleError(error, res, "req-123");

    expect(getStatus()).toBe(400);
    const parsed = JSON.parse(getBody()) as {
      error: { code: string; message: string };
    };
    expect(parsed.error).toBeDefined();
    expect(parsed.error.code).toBe("VALIDATION_ERROR");
    expect(parsed.error.message).toBe("Name is required");
  });

  it("produces correct JSON for AUTHENTICATION_FAILED", () => {
    const { res, getStatus, getBody } = createMockResponse();
    const error = new ApiError(
      ErrorCode.AUTHENTICATION_FAILED,
      "Authentication failed",
    );

    handleError(error, res, "req-456");

    expect(getStatus()).toBe(401);
    const parsed = JSON.parse(getBody()) as {
      error: { code: string; message: string };
    };
    expect(parsed.error.code).toBe("AUTHENTICATION_FAILED");
  });

  it("produces correct JSON for RATE_LIMIT_EXCEEDED", () => {
    const { res, getStatus, getBody } = createMockResponse();
    const error = new ApiError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      "Rate limit exceeded",
    );

    handleError(error, res, "req-789");

    expect(getStatus()).toBe(429);
    const parsed = JSON.parse(getBody()) as {
      error: { code: string; message: string };
    };
    expect(parsed.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("returns INTERNAL_ERROR for unknown Error instances", () => {
    const { res, getStatus, getBody } = createMockResponse();
    const error = new TypeError("Cannot read property 'x' of undefined");

    handleError(error, res, "req-000");

    expect(getStatus()).toBe(500);
    const parsed = JSON.parse(getBody()) as {
      error: { code: string; message: string };
    };
    expect(parsed.error.code).toBe("INTERNAL_ERROR");
    expect(parsed.error.message).toBe("An internal error occurred.");
  });

  it("returns INTERNAL_ERROR for non-Error throwables", () => {
    const { res, getStatus, getBody } = createMockResponse();

    handleError("string error", res, "req-001");

    expect(getStatus()).toBe(500);
    const parsed = JSON.parse(getBody()) as {
      error: { code: string; message: string };
    };
    expect(parsed.error.code).toBe("INTERNAL_ERROR");
    expect(parsed.error.message).toBe("An internal error occurred.");
  });

  it("returns INTERNAL_ERROR for null throwable", () => {
    const { res, getStatus, getBody } = createMockResponse();

    handleError(null, res, "req-002");

    expect(getStatus()).toBe(500);
    const parsed = JSON.parse(getBody()) as {
      error: { code: string; message: string };
    };
    expect(parsed.error.code).toBe("INTERNAL_ERROR");
  });

  it("never exposes stack traces in unknown error responses", () => {
    const { res, getBody } = createMockResponse();
    const error = new Error("Sensitive internal details");
    error.stack =
      "Error: Sensitive internal details\n    at /src/db/client.ts:42:5";

    handleError(error, res, "req-003");

    const body = getBody();
    expect(body).not.toContain("stack");
    expect(body).not.toContain("/src/db/client.ts");
    expect(body).not.toContain("Sensitive internal details");
  });

  it("never exposes stack traces in ApiError responses", () => {
    const { res, getBody } = createMockResponse();
    const error = new ApiError(ErrorCode.INTERNAL_ERROR, "Something broke");
    error.stack =
      "ApiError: Something broke\n    at createAttestation (attestation.ts:42)";

    handleError(error, res, "req-004");

    const body = getBody();
    expect(body).not.toContain("stack");
    expect(body).not.toContain("attestation.ts");
  });

  it("sets Content-Type to application/json", () => {
    const { res, getContentType } = createMockResponse();
    const error = new ApiError(ErrorCode.VALIDATION_ERROR, "bad input");

    handleError(error, res, "req-005");

    expect(getContentType()).toBe("application/json");
  });
});
