/**
 * Tests for online key revocation checking.
 *
 * Mocks the global fetch() to test various server responses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRevocationOnline } from "../src/check-revocation.js";

describe("checkRevocationOnline", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("should return ACTIVE for an active key", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ACTIVE",
      }),
    }) as unknown as typeof fetch;

    const result = await checkRevocationOnline(
      "key-001",
      "https://verity.caelex.com",
    );

    expect(result.keyId).toBe("key-001");
    expect(result.status).toBe("ACTIVE");
    expect(result.checkedAt).toBeDefined();

    // Verify the correct URL was called
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://verity.caelex.com/api/v1/keys/key-001/status",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "application/json",
        }),
      }),
    );
  });

  it("should return REVOKED for a revoked key", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "REVOKED",
        revoked_at: "2026-02-15T10:00:00.000Z",
        reason: "Key compromise",
      }),
    }) as unknown as typeof fetch;

    const result = await checkRevocationOnline(
      "key-002",
      "https://verity.caelex.com",
    );

    expect(result.keyId).toBe("key-002");
    expect(result.status).toBe("REVOKED");
    expect(result.revokedAt).toBe("2026-02-15T10:00:00.000Z");
    expect(result.reason).toBe("Key compromise");
  });

  it("should pass API key as Bearer token when provided", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ACTIVE" }),
    }) as unknown as typeof fetch;

    await checkRevocationOnline(
      "key-001",
      "https://verity.caelex.com",
      "my-api-key-123",
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-api-key-123",
        }),
      }),
    );
  });

  it("should return UNKNOWN on network error", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(
        new Error("Network timeout"),
      ) as unknown as typeof fetch;

    const result = await checkRevocationOnline(
      "key-001",
      "https://verity.caelex.com",
    );

    expect(result.keyId).toBe("key-001");
    expect(result.status).toBe("UNKNOWN");
    expect(result.reason).toContain("Network error");
    expect(result.reason).toContain("Network timeout");
  });

  it("should return UNKNOWN on HTTP error response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as unknown as typeof fetch;

    const result = await checkRevocationOnline(
      "key-001",
      "https://verity.caelex.com",
    );

    expect(result.keyId).toBe("key-001");
    expect(result.status).toBe("UNKNOWN");
    expect(result.reason).toContain("500");
  });

  it("should return UNKNOWN for unexpected status value", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "INVALID_STATUS" }),
    }) as unknown as typeof fetch;

    const result = await checkRevocationOnline(
      "key-001",
      "https://verity.caelex.com",
    );

    expect(result.keyId).toBe("key-001");
    expect(result.status).toBe("UNKNOWN");
    expect(result.reason).toContain("Unexpected status value");
  });

  it("should return ROTATED status", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ROTATED",
        reason: "Scheduled rotation",
      }),
    }) as unknown as typeof fetch;

    const result = await checkRevocationOnline(
      "key-003",
      "https://verity.caelex.com",
    );

    expect(result.keyId).toBe("key-003");
    expect(result.status).toBe("ROTATED");
    expect(result.reason).toBe("Scheduled rotation");
  });
});
