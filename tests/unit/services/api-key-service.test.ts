import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    apiKey: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    apiRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

// Mock security audit service
vi.mock("@/lib/services/security-audit-service", () => ({
  logSecurityEvent: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { logSecurityEvent } from "@/lib/services/security-audit-service";
import {
  API_SCOPES,
  createApiKey,
  validateApiKey,
  hasScope,
  hasAnyScope,
  getOrganizationApiKeys,
  getApiKeyById,
  updateApiKey,
  revokeApiKey,
  regenerateApiKey,
  rotateApiKey,
  completeKeyRotation,
  deleteApiKey,
  logApiRequest,
  getApiKeyUsageStats,
  checkRateLimit,
  cleanupOldRequestLogs,
  expireOldApiKeys,
  clearExpiredGracePeriods,
  isKeyInRotation,
} from "@/lib/services/api-key-service";
import type { ApiKey } from "@prisma/client";

const mockPrisma = vi.mocked(prisma);
const mockLogSecurityEvent = vi.mocked(logSecurityEvent);

// Helper to create a mock ApiKey object
function makeMockApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: "key-1",
    organizationId: "org-1",
    name: "Test Key",
    keyHash: "somehash",
    keyPrefix: "caelex_abcd",
    scopes: ["read:compliance", "write:reports"],
    rateLimit: 1000,
    isActive: true,
    lastUsedAt: null,
    expiresAt: null,
    createdById: "user-1",
    createdAt: new Date("2025-01-01"),
    revokedAt: null,
    revokedReason: null,
    previousKeyHash: null,
    rotatedAt: null,
    graceEndsAt: null,
    signingSecret: null,
    requireSigning: false,
    keyType: "standard",
    ...overrides,
  } as ApiKey;
}

describe("API Key Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── API_SCOPES ───

  describe("API_SCOPES", () => {
    it("should have compliance scopes", () => {
      expect(API_SCOPES["read:compliance"]).toBeDefined();
      expect(API_SCOPES["write:compliance"]).toBeDefined();
    });

    it("should have spacecraft scopes", () => {
      expect(API_SCOPES["read:spacecraft"]).toBeDefined();
      expect(API_SCOPES["write:spacecraft"]).toBeDefined();
    });

    it("should have reports scopes", () => {
      expect(API_SCOPES["read:reports"]).toBeDefined();
      expect(API_SCOPES["write:reports"]).toBeDefined();
    });

    it("should have incidents scopes", () => {
      expect(API_SCOPES["read:incidents"]).toBeDefined();
      expect(API_SCOPES["write:incidents"]).toBeDefined();
    });

    it("should have deadlines scope", () => {
      expect(API_SCOPES["read:deadlines"]).toBeDefined();
    });

    it("should have documents scopes", () => {
      expect(API_SCOPES["read:documents"]).toBeDefined();
      expect(API_SCOPES["write:documents"]).toBeDefined();
    });

    it("should have organization scope", () => {
      expect(API_SCOPES["read:organization"]).toBeDefined();
    });

    it("should have audit scope", () => {
      expect(API_SCOPES["read:audit"]).toBeDefined();
    });

    it("should have descriptions for all scopes", () => {
      for (const [scope, description] of Object.entries(API_SCOPES)) {
        expect(typeof description).toBe("string");
        expect(description.length).toBeGreaterThan(0);
      }
    });

    it("should have read and write pattern for most resources", () => {
      const readScopes = Object.keys(API_SCOPES).filter((s) =>
        s.startsWith("read:"),
      );
      const writeScopes = Object.keys(API_SCOPES).filter((s) =>
        s.startsWith("write:"),
      );

      expect(readScopes.length).toBeGreaterThan(0);
      expect(writeScopes.length).toBeGreaterThan(0);
    });
  });

  describe("Scope organization", () => {
    it("should categorize scopes by resource", () => {
      const scopes = Object.keys(API_SCOPES);
      const resources = new Set(scopes.map((s) => s.split(":")[1]));

      expect(resources.has("compliance")).toBe(true);
      expect(resources.has("spacecraft")).toBe(true);
      expect(resources.has("reports")).toBe(true);
      expect(resources.has("incidents")).toBe(true);
      expect(resources.has("deadlines")).toBe(true);
      expect(resources.has("documents")).toBe(true);
      expect(resources.has("organization")).toBe(true);
      expect(resources.has("audit")).toBe(true);
    });

    it("should have valid scope format", () => {
      const scopes = Object.keys(API_SCOPES);
      for (const scope of scopes) {
        expect(scope).toMatch(/^(read|write):\w+$/);
      }
    });
  });

  // ─── createApiKey ───

  describe("createApiKey", () => {
    it("should generate a key, hash it, store via prisma, and log security event", async () => {
      const mockCreatedKey = makeMockApiKey({ id: "new-key-1" });
      mockPrisma.apiKey.create.mockResolvedValue(mockCreatedKey as never);

      const result = await createApiKey({
        organizationId: "org-1",
        name: "My Key",
        scopes: ["read:compliance"],
        createdById: "user-1",
      });

      expect(result.plainTextKey).toMatch(/^caelex_/);
      expect(result.plainTextKey.length).toBeGreaterThan(7);
      expect(result.apiKey.id).toBe("new-key-1");

      expect(mockPrisma.apiKey.create).toHaveBeenCalledOnce();
      const createCall = mockPrisma.apiKey.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(createCall.data.organizationId).toBe("org-1");
      expect(createCall.data.name).toBe("My Key");
      expect(createCall.data.scopes).toEqual(["read:compliance"]);
      expect(createCall.data.keyHash).toBeDefined();
      expect(createCall.data.keyPrefix).toMatch(/^caelex_/);
      expect(createCall.data.rateLimit).toBe(1000);

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "API_KEY_CREATED",
          userId: "user-1",
          organizationId: "org-1",
          targetType: "api_key",
          targetId: "new-key-1",
        }),
      );
    });

    it("should use custom rateLimit when provided", async () => {
      mockPrisma.apiKey.create.mockResolvedValue(makeMockApiKey() as never);

      await createApiKey({
        organizationId: "org-1",
        name: "Fast Key",
        scopes: ["read:compliance"],
        rateLimit: 5000,
        createdById: "user-1",
      });

      const createCall = mockPrisma.apiKey.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(createCall.data.rateLimit).toBe(5000);
    });

    it("should pass expiresAt when provided", async () => {
      mockPrisma.apiKey.create.mockResolvedValue(makeMockApiKey() as never);
      const expires = new Date("2026-12-31");

      await createApiKey({
        organizationId: "org-1",
        name: "Expiring Key",
        scopes: ["read:compliance"],
        expiresAt: expires,
        createdById: "user-1",
      });

      const createCall = mockPrisma.apiKey.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(createCall.data.expiresAt).toBe(expires);
    });
  });

  // ─── validateApiKey ───

  describe("validateApiKey", () => {
    it("should reject keys with invalid format", async () => {
      const result = await validateApiKey("invalid_key_format");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid key format");
    });

    it("should reject keys not found in the database", async () => {
      mockPrisma.apiKey.findUnique.mockResolvedValue(null as never);
      mockPrisma.apiKey.findFirst.mockResolvedValue(null as never);

      const result = await validateApiKey("caelex_abc123def456ghi789jkl012mn");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });

    it("should reject revoked keys", async () => {
      const revokedKey = makeMockApiKey({
        isActive: false,
        organization: { id: "org-1", name: "Org", isActive: true },
      } as Partial<ApiKey>);
      mockPrisma.apiKey.findUnique.mockResolvedValue(revokedKey as never);

      const result = await validateApiKey("caelex_abc123def456ghi789jkl012mn");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("API key has been revoked");
    });

    it("should reject expired keys", async () => {
      const expiredKey = makeMockApiKey({
        isActive: true,
        expiresAt: new Date("2020-01-01"),
        organization: { id: "org-1", name: "Org", isActive: true },
      } as Partial<ApiKey>);
      mockPrisma.apiKey.findUnique.mockResolvedValue(expiredKey as never);

      const result = await validateApiKey("caelex_abc123def456ghi789jkl012mn");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("API key has expired");
    });

    it("should reject keys from inactive organizations", async () => {
      const inactiveOrgKey = makeMockApiKey({
        isActive: true,
        organization: { id: "org-1", name: "Dead Org", isActive: false },
      } as Partial<ApiKey>);
      mockPrisma.apiKey.findUnique.mockResolvedValue(inactiveOrgKey as never);

      const result = await validateApiKey("caelex_abc123def456ghi789jkl012mn");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Organization is inactive");
    });

    it("should accept a valid active key and update lastUsedAt", async () => {
      const activeKey = makeMockApiKey({
        isActive: true,
        expiresAt: new Date("2099-01-01"),
        organization: { id: "org-1", name: "Org", isActive: true },
      } as Partial<ApiKey>);
      mockPrisma.apiKey.findUnique.mockResolvedValue(activeKey as never);
      mockPrisma.apiKey.update.mockResolvedValue(activeKey as never);

      const result = await validateApiKey("caelex_abc123def456ghi789jkl012mn");
      expect(result.valid).toBe(true);
      expect(result.apiKey).toBeDefined();

      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: activeKey.id },
          data: { lastUsedAt: expect.any(Date) },
        }),
      );
    });

    it("should accept valid key with no expiresAt", async () => {
      const activeKey = makeMockApiKey({
        isActive: true,
        expiresAt: null,
        organization: { id: "org-1", name: "Org", isActive: true },
      } as Partial<ApiKey>);
      mockPrisma.apiKey.findUnique.mockResolvedValue(activeKey as never);
      mockPrisma.apiKey.update.mockResolvedValue(activeKey as never);

      const result = await validateApiKey("caelex_abc123def456ghi789jkl012mn");
      expect(result.valid).toBe(true);
    });

    it("should fall back to previous key hash during grace period", async () => {
      const graceEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const rotatedKey = makeMockApiKey({
        isActive: true,
        graceEndsAt,
        previousKeyHash: "oldhash",
        organization: { id: "org-1", name: "Org", isActive: true },
      } as Partial<ApiKey>);

      mockPrisma.apiKey.findUnique.mockResolvedValue(null as never);
      mockPrisma.apiKey.findFirst.mockResolvedValue(rotatedKey as never);
      mockPrisma.apiKey.update.mockResolvedValue(rotatedKey as never);

      const result = await validateApiKey("caelex_abc123def456ghi789jkl012mn");
      expect(result.valid).toBe(true);
      expect(result.usingPreviousKey).toBe(true);
      expect(result.graceEndsAt).toBe(graceEndsAt);
    });
  });

  // ─── hasScope ───

  describe("hasScope", () => {
    it("should return true when key has the exact scope", () => {
      const key = makeMockApiKey({
        scopes: ["read:compliance", "write:reports"],
      });
      expect(hasScope(key, "read:compliance")).toBe(true);
    });

    it("should return false when key does not have the scope", () => {
      const key = makeMockApiKey({ scopes: ["read:compliance"] });
      expect(hasScope(key, "write:compliance")).toBe(false);
    });

    it("should return true when key has wildcard scope", () => {
      const key = makeMockApiKey({ scopes: ["*"] });
      expect(hasScope(key, "read:anything")).toBe(true);
    });

    it("should return false for empty scopes", () => {
      const key = makeMockApiKey({ scopes: [] });
      expect(hasScope(key, "read:compliance")).toBe(false);
    });
  });

  // ─── hasAnyScope ───

  describe("hasAnyScope", () => {
    it("should return true when key has at least one of the scopes", () => {
      const key = makeMockApiKey({ scopes: ["read:compliance"] });
      expect(hasAnyScope(key, ["read:compliance", "write:reports"])).toBe(true);
    });

    it("should return false when key has none of the scopes", () => {
      const key = makeMockApiKey({ scopes: ["read:compliance"] });
      expect(hasAnyScope(key, ["write:reports", "write:compliance"])).toBe(
        false,
      );
    });

    it("should return true with wildcard scope", () => {
      const key = makeMockApiKey({ scopes: ["*"] });
      expect(hasAnyScope(key, ["read:anything", "write:something"])).toBe(true);
    });

    it("should return false for empty requested scopes", () => {
      const key = makeMockApiKey({ scopes: ["read:compliance"] });
      expect(hasAnyScope(key, [])).toBe(false);
    });
  });

  // ─── getOrganizationApiKeys ───

  describe("getOrganizationApiKeys", () => {
    it("should return keys with hash stripped and maskedKey added", async () => {
      const keys = [
        makeMockApiKey({
          id: "k1",
          keyPrefix: "caelex_abcd",
          keyHash: "secrethash1",
          previousKeyHash: "oldhash",
        }),
        makeMockApiKey({
          id: "k2",
          keyPrefix: "caelex_efgh",
          keyHash: "secrethash2",
          previousKeyHash: null,
        }),
      ];
      mockPrisma.apiKey.findMany.mockResolvedValue(keys as never);

      const result = await getOrganizationApiKeys("org-1");

      expect(result).toHaveLength(2);
      for (const key of result) {
        expect(key).not.toHaveProperty("keyHash");
        expect(key).not.toHaveProperty("previousKeyHash");
        expect(key.maskedKey).toContain("caelex_");
        expect(key.maskedKey).toContain("\u2022"); // bullet character
      }
      expect(result[0].maskedKey).toBe("caelex_abcd" + "\u2022".repeat(20));
    });

    it("should pass organizationId in query", async () => {
      mockPrisma.apiKey.findMany.mockResolvedValue([] as never);
      await getOrganizationApiKeys("org-99");

      expect(mockPrisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-99" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  // ─── getApiKeyById ───

  describe("getApiKeyById", () => {
    it("should return null when key not found", async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null as never);
      const result = await getApiKeyById("nonexistent", "org-1");
      expect(result).toBeNull();
    });

    it("should return key without hash and with maskedKey", async () => {
      const key = makeMockApiKey({
        keyPrefix: "caelex_wxyz",
        keyHash: "hash123",
      });
      mockPrisma.apiKey.findFirst.mockResolvedValue(key as never);

      const result = await getApiKeyById("key-1", "org-1");

      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty("keyHash");
      expect(result).not.toHaveProperty("previousKeyHash");
      expect(result!.maskedKey).toBe("caelex_wxyz" + "\u2022".repeat(20));
    });
  });

  // ─── updateApiKey ───

  describe("updateApiKey", () => {
    it("should call prisma.apiKey.update with correct params", async () => {
      const updatedKey = makeMockApiKey({ name: "Updated Name" });
      mockPrisma.apiKey.update.mockResolvedValue(updatedKey as never);

      const result = await updateApiKey("key-1", "org-1", {
        name: "Updated Name",
        rateLimit: 2000,
      });

      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: "key-1", organizationId: "org-1" },
        data: { name: "Updated Name", rateLimit: 2000 },
      });
      expect(result.name).toBe("Updated Name");
    });
  });

  // ─── revokeApiKey ───

  describe("revokeApiKey", () => {
    it("should set isActive to false and log security event", async () => {
      const revokedKey = makeMockApiKey({
        id: "key-1",
        name: "Revoked Key",
        isActive: false,
      });
      mockPrisma.apiKey.update.mockResolvedValue(revokedKey as never);

      const result = await revokeApiKey(
        "key-1",
        "org-1",
        "admin-1",
        "Compromised",
      );

      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: "key-1", organizationId: "org-1" },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
          revokedReason: "Compromised",
        },
      });
      expect(result.isActive).toBe(false);

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "API_KEY_REVOKED",
          userId: "admin-1",
          organizationId: "org-1",
          riskLevel: "MEDIUM",
        }),
      );
    });

    it("should use default revoke reason when none provided", async () => {
      const revokedKey = makeMockApiKey({ isActive: false, name: "Key" });
      mockPrisma.apiKey.update.mockResolvedValue(revokedKey as never);

      await revokeApiKey("key-1", "org-1", "admin-1");

      const updateCall = mockPrisma.apiKey.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(updateCall.data.revokedReason).toBe("Manually revoked");
    });
  });

  // ─── regenerateApiKey ───

  describe("regenerateApiKey", () => {
    it("should revoke the old key and create a new one with same settings", async () => {
      const existingKey = makeMockApiKey({
        id: "old-key",
        name: "Original",
        scopes: ["read:compliance"],
        rateLimit: 500,
        expiresAt: new Date("2030-01-01"),
      });
      const revokedKey = makeMockApiKey({
        id: "old-key",
        isActive: false,
        name: "Original",
      });
      const newKey = makeMockApiKey({ id: "new-key", name: "Original" });

      mockPrisma.apiKey.findFirst.mockResolvedValue(existingKey as never);
      // revokeApiKey internally calls update, then createApiKey calls create
      mockPrisma.apiKey.update.mockResolvedValue(revokedKey as never);
      mockPrisma.apiKey.create.mockResolvedValue(newKey as never);

      const result = await regenerateApiKey("old-key", "org-1", "user-1");

      expect(result.apiKey.id).toBe("new-key");
      expect(result.plainTextKey).toMatch(/^caelex_/);
      // Verify revokeApiKey was called (sets isActive false)
      expect(mockPrisma.apiKey.update).toHaveBeenCalled();
      // Verify createApiKey was called (creates new key)
      expect(mockPrisma.apiKey.create).toHaveBeenCalled();
    });

    it("should throw if key not found", async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null as never);

      await expect(
        regenerateApiKey("nonexistent", "org-1", "user-1"),
      ).rejects.toThrow("API key not found");
    });
  });

  // ─── rotateApiKey ───

  describe("rotateApiKey", () => {
    it("should generate new key, store previousKeyHash with grace period, and log event", async () => {
      const existingKey = makeMockApiKey({
        id: "key-1",
        keyHash: "currenthash",
        name: "Rotating Key",
        isActive: true,
      });
      const updatedKey = makeMockApiKey({
        id: "key-1",
        previousKeyHash: "currenthash",
        graceEndsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      mockPrisma.apiKey.findFirst.mockResolvedValue(existingKey as never);
      mockPrisma.apiKey.update.mockResolvedValue(updatedKey as never);

      const result = await rotateApiKey("key-1", "org-1", "user-1");

      expect(result.plainTextKey).toMatch(/^caelex_/);
      expect(result.graceEndsAt).toBeInstanceOf(Date);

      const updateCall = mockPrisma.apiKey.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(updateCall.data.previousKeyHash).toBe("currenthash");
      expect(updateCall.data.graceEndsAt).toBeInstanceOf(Date);
      expect(updateCall.data.rotatedAt).toBeInstanceOf(Date);

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "API_KEY_ROTATED",
          userId: "user-1",
        }),
      );
    });

    it("should throw if key not found or already revoked", async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null as never);

      await expect(
        rotateApiKey("nonexistent", "org-1", "user-1"),
      ).rejects.toThrow("API key not found or already revoked");
    });
  });

  // ─── completeKeyRotation ───

  describe("completeKeyRotation", () => {
    it("should clear previousKeyHash and log event", async () => {
      const keyInRotation = makeMockApiKey({
        id: "key-1",
        previousKeyHash: "oldhash",
        graceEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true,
        name: "Rotating",
      });
      const completedKey = makeMockApiKey({
        id: "key-1",
        previousKeyHash: null,
        graceEndsAt: null,
        rotatedAt: null,
      });

      mockPrisma.apiKey.findFirst.mockResolvedValue(keyInRotation as never);
      mockPrisma.apiKey.update.mockResolvedValue(completedKey as never);

      const result = await completeKeyRotation("key-1", "org-1", "user-1");

      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: "key-1" },
        data: {
          previousKeyHash: null,
          rotatedAt: null,
          graceEndsAt: null,
        },
      });
      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "API_KEY_ROTATION_COMPLETED",
        }),
      );
    });

    it("should throw if key not found", async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null as never);

      await expect(
        completeKeyRotation("nonexistent", "org-1", "user-1"),
      ).rejects.toThrow("API key not found or already revoked");
    });

    it("should throw if no active rotation", async () => {
      const noRotation = makeMockApiKey({
        isActive: true,
        previousKeyHash: null,
      });
      mockPrisma.apiKey.findFirst.mockResolvedValue(noRotation as never);

      await expect(
        completeKeyRotation("key-1", "org-1", "user-1"),
      ).rejects.toThrow("No active rotation to complete");
    });
  });

  // ─── deleteApiKey ───

  describe("deleteApiKey", () => {
    it("should call prisma.apiKey.delete with correct params", async () => {
      mockPrisma.apiKey.delete.mockResolvedValue(undefined as never);

      await deleteApiKey("key-1", "org-1");

      expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({
        where: { id: "key-1", organizationId: "org-1" },
      });
    });
  });

  // ─── logApiRequest ───

  describe("logApiRequest", () => {
    it("should create an ApiRequest record", async () => {
      mockPrisma.apiRequest.create.mockResolvedValue(undefined as never);

      await logApiRequest("key-1", {
        method: "GET",
        path: "/api/v1/compliance",
        statusCode: 200,
        responseTimeMs: 45,
        ipAddress: "1.2.3.4",
        userAgent: "TestAgent/1.0",
      });

      expect(mockPrisma.apiRequest.create).toHaveBeenCalledWith({
        data: {
          apiKeyId: "key-1",
          method: "GET",
          path: "/api/v1/compliance",
          statusCode: 200,
          responseTimeMs: 45,
          ipAddress: "1.2.3.4",
          userAgent: "TestAgent/1.0",
          errorCode: undefined,
          errorMessage: undefined,
        },
      });
    });

    it("should include error fields when provided", async () => {
      mockPrisma.apiRequest.create.mockResolvedValue(undefined as never);

      await logApiRequest("key-1", {
        method: "POST",
        path: "/api/v1/reports",
        statusCode: 500,
        responseTimeMs: 120,
        errorCode: "INTERNAL_ERROR",
        errorMessage: "Something went wrong",
      });

      const createCall = mockPrisma.apiRequest.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(createCall.data.errorCode).toBe("INTERNAL_ERROR");
      expect(createCall.data.errorMessage).toBe("Something went wrong");
    });
  });

  // ─── getApiKeyUsageStats ───

  describe("getApiKeyUsageStats", () => {
    it("should aggregate requests by endpoint, day, and status", async () => {
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      const mockRequests = [
        {
          statusCode: 200,
          responseTimeMs: 50,
          path: "/api/v1/compliance",
          createdAt: now,
        },
        {
          statusCode: 200,
          responseTimeMs: 100,
          path: "/api/v1/compliance?page=2",
          createdAt: now,
        },
        {
          statusCode: 500,
          responseTimeMs: 200,
          path: "/api/v1/reports",
          createdAt: now,
        },
      ];

      mockPrisma.apiRequest.findMany.mockResolvedValue(mockRequests as never);

      const stats = await getApiKeyUsageStats("key-1", 30);

      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.failedRequests).toBe(1);
      expect(stats.avgResponseTime).toBe(Math.round((50 + 100 + 200) / 3));
      expect(stats.requestsByEndpoint["/api/v1/compliance"]).toBe(2);
      expect(stats.requestsByEndpoint["/api/v1/reports"]).toBe(1);
      expect(stats.requestsByDay).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ date: today, count: 3 }),
        ]),
      );
    });

    it("should return zero stats when no requests exist", async () => {
      mockPrisma.apiRequest.findMany.mockResolvedValue([] as never);

      const stats = await getApiKeyUsageStats("key-1");

      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.avgResponseTime).toBe(0);
      expect(stats.requestsByEndpoint).toEqual({});
      expect(stats.requestsByDay).toEqual([]);
    });
  });

  // ─── checkRateLimit ───

  describe("checkRateLimit", () => {
    it("should allow requests under the limit", async () => {
      mockPrisma.apiRequest.count.mockResolvedValue(50 as never);

      const result = await checkRateLimit("key-1", 1000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(950);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it("should deny requests at or over the limit", async () => {
      mockPrisma.apiRequest.count.mockResolvedValue(1000 as never);

      const result = await checkRateLimit("key-1", 1000);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should deny requests over the limit", async () => {
      mockPrisma.apiRequest.count.mockResolvedValue(1500 as never);

      const result = await checkRateLimit("key-1", 1000);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  // ─── cleanupOldRequestLogs ───

  describe("cleanupOldRequestLogs", () => {
    it("should delete old request logs and return count", async () => {
      mockPrisma.apiRequest.deleteMany.mockResolvedValue({
        count: 42,
      } as never);

      const result = await cleanupOldRequestLogs(90);

      expect(result).toBe(42);
      expect(mockPrisma.apiRequest.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
        },
      });
    });

    it("should default to 90 days", async () => {
      mockPrisma.apiRequest.deleteMany.mockResolvedValue({ count: 0 } as never);

      await cleanupOldRequestLogs();

      expect(mockPrisma.apiRequest.deleteMany).toHaveBeenCalledOnce();
    });
  });

  // ─── expireOldApiKeys ───

  describe("expireOldApiKeys", () => {
    it("should bulk update expired keys and return count", async () => {
      mockPrisma.apiKey.updateMany.mockResolvedValue({ count: 5 } as never);

      const result = await expireOldApiKeys();

      expect(result).toBe(5);
      expect(mockPrisma.apiKey.updateMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          expiresAt: { lt: expect.any(Date) },
        },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
          revokedReason: "Expired",
        },
      });
    });
  });

  // ─── clearExpiredGracePeriods ───

  describe("clearExpiredGracePeriods", () => {
    it("should clear previousKeyHash where graceEndsAt has passed", async () => {
      mockPrisma.apiKey.updateMany.mockResolvedValue({ count: 3 } as never);

      const result = await clearExpiredGracePeriods();

      expect(result).toBe(3);
      expect(mockPrisma.apiKey.updateMany).toHaveBeenCalledWith({
        where: {
          previousKeyHash: { not: null },
          graceEndsAt: { lt: expect.any(Date) },
        },
        data: {
          previousKeyHash: null,
          rotatedAt: null,
          graceEndsAt: null,
        },
      });
    });
  });

  // ─── isKeyInRotation ───

  describe("isKeyInRotation", () => {
    it("should return inRotation:false when key not found", async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null as never);

      const result = await isKeyInRotation("nonexistent", "org-1");
      expect(result.inRotation).toBe(false);
    });

    it("should return inRotation:false when no previousKeyHash", async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        previousKeyHash: null,
        graceEndsAt: null,
      } as never);

      const result = await isKeyInRotation("key-1", "org-1");
      expect(result.inRotation).toBe(false);
    });

    it("should return inRotation:false when grace period has expired", async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        previousKeyHash: "oldhash",
        graceEndsAt: new Date("2020-01-01"),
      } as never);

      const result = await isKeyInRotation("key-1", "org-1");
      expect(result.inRotation).toBe(false);
    });

    it("should return inRotation:true with hours remaining when grace period is active", async () => {
      const graceEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      mockPrisma.apiKey.findFirst.mockResolvedValue({
        previousKeyHash: "oldhash",
        graceEndsAt,
      } as never);

      const result = await isKeyInRotation("key-1", "org-1");
      expect(result.inRotation).toBe(true);
      expect(result.graceEndsAt).toBe(graceEndsAt);
      expect(result.hoursRemaining).toBeGreaterThan(0);
      expect(result.hoursRemaining).toBeLessThanOrEqual(24);
    });
  });
});
