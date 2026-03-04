/**
 * Verity 2036 -- Nonce Service Tests
 *
 * Tests the nonce generation and uniqueness enforcement from
 * src/services/nonce.ts. Mocks the database layer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the database client BEFORE importing the nonce module
// ---------------------------------------------------------------------------

const mockQuery = vi.fn();

vi.mock("../../src/db/client.js", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  getPool: vi.fn(() => ({ query: vi.fn() })),
  closePool: vi.fn(),
}));

// Now import the nonce service
import {
  generateAndStoreNonce,
  verifyNonceUnique,
} from "../../src/services/nonce.js";
import { ApiError, ErrorCode } from "../../src/errors/codes.js";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateAndStoreNonce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a 64-character lowercase hex string", async () => {
    // Mock successful INSERT
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const nonce = await generateAndStoreNonce("tenant-1");

    expect(nonce).toHaveLength(64);
    expect(nonce).toMatch(/^[0-9a-f]{64}$/);
  });

  it("calls the database INSERT with correct parameters", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const nonce = await generateAndStoreNonce("tenant-2");

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];

    expect(sql).toContain("INSERT INTO nonces");
    expect(params).toHaveLength(3);
    // First param is the nonce
    expect(params[0]).toBe(nonce);
    // Second param is the tenant_id
    expect(params[1]).toBe("tenant-2");
    // Third param is expires_at (ISO string)
    expect(typeof params[2]).toBe("string");
  });

  it("generates different nonces on consecutive calls", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const nonce1 = await generateAndStoreNonce("tenant-1");
    const nonce2 = await generateAndStoreNonce("tenant-1");

    expect(nonce1).not.toBe(nonce2);
  });

  it("throws NONCE_COLLISION on PostgreSQL unique constraint violation (code 23505)", async () => {
    // Simulate PG unique violation
    const pgError = new Error("duplicate key value violates unique constraint");
    (pgError as unknown as { code: string }).code = "23505";
    mockQuery.mockRejectedValueOnce(pgError);

    try {
      await generateAndStoreNonce("tenant-1");
      expect.fail("Expected ApiError to be thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr).toBeInstanceOf(ApiError);
      expect(apiErr.code).toBe(ErrorCode.NONCE_COLLISION);
      expect(apiErr.statusCode).toBe(409);
      expect(apiErr.message).toContain("Nonce collision");
    }
  });

  it("throws INTERNAL_ERROR on non-23505 database error", async () => {
    const dbError = new Error("Connection refused");
    (dbError as unknown as { code: string }).code = "ECONNREFUSED";
    mockQuery.mockRejectedValueOnce(dbError);

    try {
      await generateAndStoreNonce("tenant-1");
      expect.fail("Expected ApiError to be thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr).toBeInstanceOf(ApiError);
      expect(apiErr.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(apiErr.statusCode).toBe(500);
    }
  });

  it("sets expires_at approximately 24 hours in the future", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const before = Date.now();
    await generateAndStoreNonce("tenant-1");
    const after = Date.now();

    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    const expiresAt = new Date(params[2] as string).getTime();

    const expectedMin = before + 24 * 60 * 60 * 1000 - 1000; // 1s tolerance
    const expectedMax = after + 24 * 60 * 60 * 1000 + 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAt).toBeLessThanOrEqual(expectedMax);
  });
});

// ---------------------------------------------------------------------------
// verifyNonceUnique
// ---------------------------------------------------------------------------

describe("verifyNonceUnique", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when nonce does not exist in the database", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ count: "0" }],
      rowCount: 1,
    });

    const result = await verifyNonceUnique("a".repeat(64));
    expect(result).toBe(true);
  });

  it("returns false when nonce already exists (replay detected)", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ count: "1" }],
      rowCount: 1,
    });

    const result = await verifyNonceUnique("a".repeat(64));
    expect(result).toBe(false);
  });

  it("queries the nonces table with the provided nonce", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ count: "0" }],
      rowCount: 1,
    });

    const testNonce = "f".repeat(64);
    await verifyNonceUnique(testNonce);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("nonces");
    expect(params?.[0]).toBe(testNonce);
  });
});
