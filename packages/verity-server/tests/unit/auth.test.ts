/**
 * Verity 2036 -- Auth Middleware Tests
 *
 * Tests the withApiAuth function from src/auth/middleware.ts.
 * Mocks the database layer so no real PostgreSQL connection is needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";

// ---------------------------------------------------------------------------
// Mock the database client BEFORE importing the auth module
// ---------------------------------------------------------------------------

const mockQuery = vi.fn();

vi.mock("../../src/db/client.js", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  getPool: vi.fn(() => ({ query: vi.fn() })),
  closePool: vi.fn(),
}));

// Now import the auth middleware (it will use the mocked query)
import { withApiAuth } from "../../src/auth/middleware.js";
import { ApiError } from "../../src/errors/codes.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a valid API key with the `vty2_` prefix and 48 base-62 body chars. */
function makeApiKey(): string {
  const body = "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4";
  return `vty2_${body}`;
}

/** Hash an API key the same way the auth middleware does. */
function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Create a mock IncomingMessage with the given Authorization header. */
function mockReq(authHeader?: string): IncomingMessage {
  const headers: Record<string, string | undefined> = {};
  if (authHeader !== undefined) {
    headers["authorization"] = authHeader;
  }
  return { headers } as unknown as IncomingMessage;
}

/** Standard DB row returned for a valid API key lookup. */
function validRow(
  apiKey: string,
  overrides?: Partial<Record<string, unknown>>,
) {
  return {
    api_key_id: "ak_test_123",
    tenant_id: "tenant_abc",
    key_hash: hashKey(apiKey),
    permissions: ["attestations:create", "attestations:verify"],
    status: "ACTIVE",
    expires_at: null,
    tenant_status: "ACTIVE",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("withApiAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Success path -------------------------------------------------------

  it("returns TenantContext for a valid API key with correct permission", async () => {
    const apiKey = makeApiKey();
    const row = validRow(apiKey);

    mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });
    // Fire-and-forget update of last_used_at
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = mockReq(`Bearer ${apiKey}`);
    const ctx = await withApiAuth(req, "attestations:create");

    expect(ctx.tenant_id).toBe("tenant_abc");
    expect(ctx.api_key_id).toBe("ak_test_123");
    expect(ctx.permissions).toContain("attestations:create");
  });

  it("accepts wildcard (*) permission", async () => {
    const apiKey = makeApiKey();
    const row = validRow(apiKey, { permissions: ["*"] });

    mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = mockReq(`Bearer ${apiKey}`);
    const ctx = await withApiAuth(req, "any:permission");

    expect(ctx.tenant_id).toBe("tenant_abc");
  });

  // ---- Missing Authorization header ---------------------------------------

  it("returns 401 when Authorization header is missing", async () => {
    const req = mockReq(undefined);

    await expect(withApiAuth(req, "attestations:create")).rejects.toThrow(
      ApiError,
    );

    try {
      await withApiAuth(req, "attestations:create");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(401);
      expect(apiErr.code).toBe("AUTHENTICATION_FAILED");
    }
  });

  // ---- Invalid key format -------------------------------------------------

  it("returns 401 when Authorization header is not Bearer", async () => {
    const req = mockReq("Basic dXNlcjpwYXNz");

    await expect(withApiAuth(req, "attestations:create")).rejects.toThrow(
      ApiError,
    );

    try {
      await withApiAuth(req, "attestations:create");
    } catch (err) {
      expect((err as ApiError).statusCode).toBe(401);
    }
  });

  it("returns 401 when key does not start with vty2_ prefix", async () => {
    const req = mockReq(
      "Bearer invalid_prefix_key_body_1234567890abcdef1234567890abcdef12345678",
    );

    await expect(withApiAuth(req, "attestations:create")).rejects.toThrow(
      ApiError,
    );
  });

  it("returns 401 when key body is too short (< 40 chars)", async () => {
    const req = mockReq("Bearer vty2_tooshort");

    await expect(withApiAuth(req, "attestations:create")).rejects.toThrow(
      ApiError,
    );
  });

  it("returns 401 when key body contains invalid characters", async () => {
    // 40+ chars but includes special chars
    const req = mockReq(
      "Bearer vty2_" + "a!b@c#d$e%f^g&h*i(j)k_l+m=n,o.p;q:r's" + "ABCD",
    );

    await expect(withApiAuth(req, "attestations:create")).rejects.toThrow(
      ApiError,
    );
  });

  // ---- Non-existent key ---------------------------------------------------

  it("returns 401 when key is not found in database", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = mockReq(`Bearer ${makeApiKey()}`);

    try {
      await withApiAuth(req, "attestations:create");
      expect.fail("Expected ApiError to be thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr).toBeInstanceOf(ApiError);
      expect(apiErr.statusCode).toBe(401);
      // Message should be generic — not reveal "key not found"
      expect(apiErr.message).toBe("Authentication failed");
    }
  });

  // ---- Hash mismatch (wrong key content) ----------------------------------

  it("returns 401 when key hash does not match (wrong key)", async () => {
    const apiKey = makeApiKey();
    // Row has a different hash
    const row = validRow(apiKey, { key_hash: "0".repeat(64) });

    mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    const req = mockReq(`Bearer ${apiKey}`);

    await expect(withApiAuth(req, "attestations:create")).rejects.toThrow(
      ApiError,
    );
  });

  // ---- Expired key --------------------------------------------------------

  it("returns 401 when key has expired", async () => {
    const apiKey = makeApiKey();
    const row = validRow(apiKey, {
      expires_at: "2020-01-01T00:00:00.000Z", // well in the past
    });

    mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    const req = mockReq(`Bearer ${apiKey}`);

    try {
      await withApiAuth(req, "attestations:create");
      expect.fail("Expected ApiError to be thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr).toBeInstanceOf(ApiError);
      expect(apiErr.statusCode).toBe(401);
      expect(apiErr.code).toBe("AUTHENTICATION_FAILED");
    }
  });

  // ---- Revoked key (non-ACTIVE status) ------------------------------------

  it("returns 401 when key status is REVOKED", async () => {
    const apiKey = makeApiKey();
    const row = validRow(apiKey, { status: "REVOKED" });

    mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    const req = mockReq(`Bearer ${apiKey}`);

    try {
      await withApiAuth(req, "attestations:create");
      expect.fail("Expected ApiError to be thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr).toBeInstanceOf(ApiError);
      expect(apiErr.statusCode).toBe(401);
      expect(apiErr.code).toBe("AUTHENTICATION_FAILED");
    }
  });

  it("returns 401 when key status is DISABLED", async () => {
    const apiKey = makeApiKey();
    const row = validRow(apiKey, { status: "DISABLED" });

    mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    const req = mockReq(`Bearer ${apiKey}`);

    await expect(withApiAuth(req, "attestations:create")).rejects.toThrow(
      ApiError,
    );
  });

  // ---- Missing permission -------------------------------------------------

  it("returns 401 (not 403) when key lacks the required permission — timing consistency", async () => {
    const apiKey = makeApiKey();
    const row = validRow(apiKey, {
      permissions: ["attestations:verify"], // does NOT have attestations:create
    });

    mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    const req = mockReq(`Bearer ${apiKey}`);

    try {
      await withApiAuth(req, "attestations:create");
      // Should not reach here
      expect.fail("Expected ApiError to be thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      // Returns 401, not 403, for timing consistency
      expect(apiErr.statusCode).toBe(401);
      expect(apiErr.code).toBe("AUTHENTICATION_FAILED");
      expect(apiErr.message).toBe("Authentication failed");
    }
  });

  // ---- Suspended tenant ---------------------------------------------------

  it("returns 401 when tenant status is SUSPENDED", async () => {
    const apiKey = makeApiKey();
    const row = validRow(apiKey, { tenant_status: "SUSPENDED" });

    mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    const req = mockReq(`Bearer ${apiKey}`);

    try {
      await withApiAuth(req, "attestations:create");
      expect.fail("Expected ApiError to be thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(401);
      expect(apiErr.code).toBe("AUTHENTICATION_FAILED");
    }
  });

  it("returns 401 when tenant status is INACTIVE", async () => {
    const apiKey = makeApiKey();
    const row = validRow(apiKey, { tenant_status: "INACTIVE" });

    mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });

    const req = mockReq(`Bearer ${apiKey}`);

    await expect(withApiAuth(req, "attestations:create")).rejects.toThrow(
      ApiError,
    );
  });

  // ---- Response timing consistency ----------------------------------------

  it("all failure paths return the same generic error message", async () => {
    const failureCases: Array<{
      name: string;
      setup: () => void;
      req: IncomingMessage;
    }> = [
      {
        name: "missing header",
        setup: () => {},
        req: mockReq(undefined),
      },
      {
        name: "bad prefix",
        setup: () => {},
        req: mockReq("Bearer bad_prefix_aaaa" + "a".repeat(40)),
      },
      {
        name: "key not found",
        setup: () => {
          mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        },
        req: mockReq(`Bearer ${makeApiKey()}`),
      },
      {
        name: "suspended tenant",
        setup: () => {
          const apiKey = makeApiKey();
          const row = validRow(apiKey, { tenant_status: "SUSPENDED" });
          mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });
        },
        req: mockReq(`Bearer ${makeApiKey()}`),
      },
    ];

    for (const tc of failureCases) {
      vi.clearAllMocks();
      tc.setup();

      try {
        await withApiAuth(tc.req, "attestations:create");
        expect.fail(`Expected ApiError for case: ${tc.name}`);
      } catch (err) {
        const apiErr = err as ApiError;
        expect(apiErr.message).toBe("Authentication failed");
        expect(apiErr.statusCode).toBe(401);
      }
    }
  });

  // ---- Fire-and-forget last_used_at update --------------------------------

  it("calls query to update last_used_at on successful auth", async () => {
    const apiKey = makeApiKey();
    const row = validRow(apiKey);

    mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const req = mockReq(`Bearer ${apiKey}`);
    await withApiAuth(req, "attestations:create");

    // The second call should be the UPDATE query for last_used_at
    // It is fire-and-forget so we just verify it was called
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const secondCallArgs = mockQuery.mock.calls[1];
    expect(secondCallArgs?.[0]).toContain("UPDATE api_keys SET last_used_at");
  });
});
