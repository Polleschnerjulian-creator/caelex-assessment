/**
 * Tests for src/lib/trade/settings/api-keys-service.ts — Caelex
 * Trade Settings (Sprint T-Settings).
 *
 * Coverage (8 cases):
 *   1. createApiKey generates `caelex_trade_` plaintext key
 *   2. createApiKey persists hash + prefix, never plaintext
 *   3. createApiKey rejects unknown scope
 *   4. createApiKey rejects empty name
 *   5. listApiKeys hides keyHash and surfaces maskedKey
 *   6. revokeApiKey soft-deletes + stamps revokedAt/reason
 *   7. revokeApiKey is idempotent on already-revoked rows
 *   8. validateKey rejects expired and inactive keys
 *   9. validateScopes dedupes valid input
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindMany, mockFindFirst, mockFindUnique, mockUpdate } =
  vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockFindMany: vi.fn(),
    mockFindFirst: vi.fn(),
    mockFindUnique: vi.fn(),
    mockUpdate: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tradeApiKey: {
      create: mockCreate,
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

// Tests assume a stable ENCRYPTION_KEY so the HMAC produces a known
// hash. Set this BEFORE importing the SUT — its hashKey() reads the
// env once at call time.
process.env.ENCRYPTION_KEY = "test-encryption-key-32-bytes-min!!";

import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  validateKey,
  validateScopes,
  InvalidScopeError,
  __testing,
} from "./api-keys-service";

beforeEach(() => {
  vi.clearAllMocks();
});

const baseRow = {
  id: "tk_1",
  organizationId: "org_1",
  name: "CI build key",
  keyHash: "hash-placeholder",
  keyPrefix: "caelex_trade_abcde",
  scopes: ["read-only"] as string[],
  isActive: true,
  lastUsedAt: null as Date | null,
  expiresAt: null as Date | null,
  createdById: "usr_1",
  createdAt: new Date("2026-05-23T00:00:00Z"),
  revokedAt: null as Date | null,
  revokedReason: null as string | null,
};

describe("createApiKey", () => {
  it("generates a `caelex_trade_` prefixed plaintext key", async () => {
    mockCreate.mockResolvedValue(baseRow);

    const { plaintextKey, apiKey } = await createApiKey({
      organizationId: "org_1",
      name: "CI key",
      scopes: ["read-only"],
      createdById: "usr_1",
    });

    expect(plaintextKey.startsWith("caelex_trade_")).toBe(true);
    expect(plaintextKey.length).toBeGreaterThan("caelex_trade_".length + 10);
    // View shape strips the hash and adds a masked display string.
    expect(apiKey).not.toHaveProperty("keyHash");
    expect(apiKey.maskedKey.startsWith(apiKey.keyPrefix)).toBe(true);
  });

  it("persists only the HMAC hash + prefix, never the plaintext", async () => {
    mockCreate.mockResolvedValue(baseRow);

    await createApiKey({
      organizationId: "org_1",
      name: "CI key",
      scopes: ["full-access"],
      createdById: "usr_1",
    });

    const call = mockCreate.mock.calls[0][0];
    expect(call.data.keyHash).toBeDefined();
    expect(call.data.keyHash).toMatch(/^[a-f0-9]{64}$/); // 256-bit hex
    expect(call.data.keyPrefix).toMatch(/^caelex_trade_.{5}$/);
    expect(call.data).not.toHaveProperty("plaintextKey");
    expect(call.data.scopes).toEqual(["full-access"]);
  });

  it("rejects an unknown scope at the validation boundary", async () => {
    await expect(
      createApiKey({
        organizationId: "org_1",
        name: "x",
        scopes: ["super-admin" as never],
        createdById: "usr_1",
      }),
    ).rejects.toBeInstanceOf(InvalidScopeError);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects an empty name", async () => {
    await expect(
      createApiKey({
        organizationId: "org_1",
        name: "   ",
        scopes: ["read-only"],
        createdById: "usr_1",
      }),
    ).rejects.toBeInstanceOf(InvalidScopeError);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("hash is deterministic — same plaintext maps to same hash", () => {
    const a = __testing.hashKey("caelex_trade_sample123");
    const b = __testing.hashKey("caelex_trade_sample123");
    expect(a).toBe(b);
    const c = __testing.hashKey("caelex_trade_different");
    expect(c).not.toBe(a);
  });
});

describe("listApiKeys", () => {
  it("hides keyHash, surfaces maskedKey, orders newest-first", async () => {
    mockFindMany.mockResolvedValue([baseRow]);

    const rows = await listApiKeys("org_1");

    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("keyHash");
    expect(rows[0].maskedKey).toBe(`${baseRow.keyPrefix}${"•".repeat(20)}`);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org_1" },
      orderBy: { createdAt: "desc" },
    });
  });
});

describe("revokeApiKey", () => {
  it("soft-deletes by flipping isActive false + stamping revokedAt/reason", async () => {
    mockFindFirst.mockResolvedValue(baseRow);
    mockUpdate.mockResolvedValue({
      ...baseRow,
      isActive: false,
      revokedAt: new Date("2026-05-23T01:00:00Z"),
      revokedReason: "Compromised",
    });

    const result = await revokeApiKey("tk_1", "org_1", "Compromised");

    expect(result?.isActive).toBe(false);
    expect(result?.revokedReason).toBe("Compromised");
    const call = mockUpdate.mock.calls[0][0];
    expect(call.where).toEqual({ id: "tk_1" });
    expect(call.data.isActive).toBe(false);
    expect(call.data.revokedAt).toBeInstanceOf(Date);
  });

  it("is idempotent on an already-revoked key — no second UPDATE", async () => {
    mockFindFirst.mockResolvedValue({
      ...baseRow,
      isActive: false,
      revokedAt: new Date(),
      revokedReason: "Previously revoked",
    });

    const result = await revokeApiKey("tk_1", "org_1");

    expect(result?.isActive).toBe(false);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns null when the key doesn't exist for that org", async () => {
    mockFindFirst.mockResolvedValue(null);
    const result = await revokeApiKey("tk_unknown", "org_1");
    expect(result).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("validateKey", () => {
  it("rejects an inactive key", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseRow,
      isActive: false,
    });

    const result = await validateKey("caelex_trade_anything");
    expect(result).toBeNull();
  });

  it("rejects an expired key", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseRow,
      isActive: true,
      expiresAt: new Date("2020-01-01T00:00:00Z"),
    });

    const result = await validateKey("caelex_trade_anything");
    expect(result).toBeNull();
  });

  it("rejects a key with the wrong prefix without hitting the DB", async () => {
    const result = await validateKey("caelex_NOT_a_trade_key");
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});

describe("validateScopes", () => {
  it("dedupes a valid input and returns the typed array", () => {
    const result = validateScopes(["read-only", "read-only", "full-access"]);
    expect(result).toEqual(["read-only", "full-access"]);
  });

  it("throws when given an empty array", () => {
    expect(() => validateScopes([])).toThrow(InvalidScopeError);
  });
});
