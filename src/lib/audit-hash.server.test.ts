import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: { findMany: vi.fn(), findFirst: vi.fn() },
    auditLog: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ─── Imports (after mocks) ───

import {
  computeEntryHash,
  getLatestHash,
  verifyChain,
  computeHashForNewEntry,
} from "@/lib/audit-hash.server";
import { prisma } from "@/lib/prisma";

// ─── Helpers ───

const mockOrgMemberFindMany = vi.mocked(prisma.organizationMember.findMany);
const mockOrgMemberFindFirst = vi.mocked(prisma.organizationMember.findFirst);
const mockAuditLogFindFirst = vi.mocked(prisma.auditLog.findFirst);
const mockAuditLogFindMany = vi.mocked(prisma.auditLog.findMany);

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user-1",
    action: "CREATE",
    entityType: "Document",
    entityId: "doc-1",
    timestamp: new Date("2025-01-15T10:00:00Z"),
    previousValue: null,
    newValue: '{"title":"New"}',
    description: "Created document",
    ipAddress: "127.0.0.1",
    userAgent: "vitest",
    previousHash: "GENESIS_org-1",
    ...overrides,
  };
}

// ─── Tests ───

describe("audit-hash.server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── computeEntryHash ───

  describe("computeEntryHash", () => {
    it("produces a deterministic SHA-256 hex string", () => {
      const entry = makeEntry();
      const hash1 = computeEntryHash(entry);
      const hash2 = computeEntryHash(entry);

      expect(hash1).toBe(hash2);
      // SHA-256 hex is 64 characters
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("changes when userId changes", () => {
      const base = makeEntry();
      const altered = makeEntry({ userId: "user-2" });

      expect(computeEntryHash(base)).not.toBe(computeEntryHash(altered));
    });

    it("changes when action changes", () => {
      const base = makeEntry();
      const altered = makeEntry({ action: "DELETE" });

      expect(computeEntryHash(base)).not.toBe(computeEntryHash(altered));
    });

    it("changes when entityType changes", () => {
      const base = makeEntry();
      const altered = makeEntry({ entityType: "User" });

      expect(computeEntryHash(base)).not.toBe(computeEntryHash(altered));
    });

    it("changes when entityId changes", () => {
      const base = makeEntry();
      const altered = makeEntry({ entityId: "doc-99" });

      expect(computeEntryHash(base)).not.toBe(computeEntryHash(altered));
    });

    it("changes when timestamp changes", () => {
      const base = makeEntry();
      const altered = makeEntry({
        timestamp: new Date("2025-06-01T12:00:00Z"),
      });

      expect(computeEntryHash(base)).not.toBe(computeEntryHash(altered));
    });

    it("changes when previousHash changes", () => {
      const base = makeEntry();
      const altered = makeEntry({ previousHash: "different-hash" });

      expect(computeEntryHash(base)).not.toBe(computeEntryHash(altered));
    });

    it("handles null optional fields consistently", () => {
      const entryWithNulls = makeEntry({
        previousValue: null,
        newValue: null,
        description: null,
        ipAddress: null,
        userAgent: null,
      });

      const entryWithUndefined = makeEntry({
        previousValue: undefined,
        newValue: undefined,
        description: undefined,
        ipAddress: undefined,
        userAgent: undefined,
      });

      // Both null and undefined are normalised to null via `|| null`
      expect(computeEntryHash(entryWithNulls)).toBe(
        computeEntryHash(entryWithUndefined),
      );
    });

    it("handles null userId", () => {
      const entry = makeEntry({ userId: null });
      const hash = computeEntryHash(entry);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // ─── getLatestHash ───

  describe("getLatestHash", () => {
    it("returns GENESIS_ when no members exist", async () => {
      mockOrgMemberFindMany.mockResolvedValue([]);

      const result = await getLatestHash("org-1");

      expect(result).toBe("GENESIS_org-1");
      expect(mockOrgMemberFindMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1" },
        select: { userId: true },
      });
    });

    it("returns GENESIS_ when no hashed entries exist", async () => {
      mockOrgMemberFindMany.mockResolvedValue([{ userId: "user-1" }] as never);
      mockAuditLogFindFirst.mockResolvedValue(null);

      const result = await getLatestHash("org-1");

      expect(result).toBe("GENESIS_org-1");
      expect(mockAuditLogFindFirst).toHaveBeenCalledWith({
        where: {
          userId: { in: ["user-1"] },
          entryHash: { not: null },
        },
        orderBy: { timestamp: "desc" },
        select: { entryHash: true },
      });
    });

    it("returns the latest entryHash when hashed entries exist", async () => {
      mockOrgMemberFindMany.mockResolvedValue([
        { userId: "user-1" },
        { userId: "user-2" },
      ] as never);
      mockAuditLogFindFirst.mockResolvedValue({
        entryHash: "abc123def456",
      } as never);

      const result = await getLatestHash("org-1");

      expect(result).toBe("abc123def456");
      expect(mockAuditLogFindFirst).toHaveBeenCalledWith({
        where: {
          userId: { in: ["user-1", "user-2"] },
          entryHash: { not: null },
        },
        orderBy: { timestamp: "desc" },
        select: { entryHash: true },
      });
    });

    it("returns GENESIS_ on error", async () => {
      mockOrgMemberFindMany.mockRejectedValue(new Error("DB down"));

      const result = await getLatestHash("org-1");

      expect(result).toBe("GENESIS_org-1");
    });
  });

  // ─── verifyChain ───

  describe("verifyChain", () => {
    it("returns valid for empty chain (no members)", async () => {
      mockOrgMemberFindMany.mockResolvedValue([]);

      const result = await verifyChain("org-1");

      expect(result).toEqual({ valid: true, checkedEntries: 0 });
    });

    it("returns valid for empty chain (no hashed entries)", async () => {
      mockOrgMemberFindMany.mockResolvedValue([{ userId: "user-1" }] as never);
      mockAuditLogFindMany.mockResolvedValue([]);

      const result = await verifyChain("org-1");

      expect(result).toEqual({ valid: true, checkedEntries: 0 });
    });

    it("returns valid for a correct chain of 2+ entries", async () => {
      mockOrgMemberFindMany.mockResolvedValue([{ userId: "user-1" }] as never);

      // Build a valid chain: genesis -> entry1 -> entry2
      const entry1Base = {
        userId: "user-1",
        action: "CREATE",
        entityType: "Document",
        entityId: "doc-1",
        timestamp: new Date("2025-01-15T10:00:00Z"),
        previousValue: null,
        newValue: '{"title":"A"}',
        description: "Created A",
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
        previousHash: "GENESIS_org-1",
      };
      const hash1 = computeEntryHash(entry1Base);

      const entry2Base = {
        userId: "user-1",
        action: "UPDATE",
        entityType: "Document",
        entityId: "doc-1",
        timestamp: new Date("2025-01-15T11:00:00Z"),
        previousValue: '{"title":"A"}',
        newValue: '{"title":"B"}',
        description: "Updated A to B",
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
        previousHash: hash1,
      };
      const hash2 = computeEntryHash(entry2Base);

      mockAuditLogFindMany.mockResolvedValue([
        { id: "log-1", ...entry1Base, entryHash: hash1 },
        { id: "log-2", ...entry2Base, entryHash: hash2 },
      ] as never);

      const result = await verifyChain("org-1");

      expect(result).toEqual({ valid: true, checkedEntries: 2 });
    });

    it("detects a tampered entry", async () => {
      mockOrgMemberFindMany.mockResolvedValue([{ userId: "user-1" }] as never);

      const entry1Base = {
        userId: "user-1",
        action: "CREATE",
        entityType: "Document",
        entityId: "doc-1",
        timestamp: new Date("2025-01-15T10:00:00Z"),
        previousValue: null,
        newValue: '{"title":"A"}',
        description: "Created A",
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
        previousHash: "GENESIS_org-1",
      };
      const correctHash = computeEntryHash(entry1Base);

      // Tamper: store a wrong hash
      const tamperedHash = "0".repeat(64);

      mockAuditLogFindMany.mockResolvedValue([
        { id: "log-1", ...entry1Base, entryHash: tamperedHash },
      ] as never);

      const result = await verifyChain("org-1");

      expect(result.valid).toBe(false);
      expect(result.checkedEntries).toBe(1);
      expect(result.brokenAt).toEqual({
        entryId: "log-1",
        timestamp: new Date("2025-01-15T10:00:00Z"),
        expected: tamperedHash,
        actual: correctHash,
      });
    });

    it("supports date filters (startDate and endDate)", async () => {
      mockOrgMemberFindMany.mockResolvedValue([{ userId: "user-1" }] as never);
      mockAuditLogFindMany.mockResolvedValue([]);

      const startDate = new Date("2025-01-01T00:00:00Z");
      const endDate = new Date("2025-12-31T23:59:59Z");

      await verifyChain("org-1", startDate, endDate);

      expect(mockAuditLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            timestamp: { gte: startDate, lte: endDate },
          }),
        }),
      );
    });

    it("does not include timestamp filter when no dates provided", async () => {
      mockOrgMemberFindMany.mockResolvedValue([{ userId: "user-1" }] as never);
      mockAuditLogFindMany.mockResolvedValue([]);

      await verifyChain("org-1");

      const callArg = mockAuditLogFindMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(callArg.where).not.toHaveProperty("timestamp");
    });

    it("returns invalid on error", async () => {
      mockOrgMemberFindMany.mockRejectedValue(new Error("DB down"));

      const result = await verifyChain("org-1");

      expect(result).toEqual({ valid: false, checkedEntries: 0 });
    });
  });

  // ─── computeHashForNewEntry ───

  describe("computeHashForNewEntry", () => {
    it("returns null when user has no membership", async () => {
      mockOrgMemberFindFirst.mockResolvedValue(null);

      const result = await computeHashForNewEntry("user-1", {
        action: "CREATE",
        entityType: "Document",
        entityId: "doc-1",
        timestamp: new Date("2025-01-15T10:00:00Z"),
      });

      expect(result).toBeNull();
      expect(mockOrgMemberFindFirst).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { joinedAt: "desc" },
        select: { organizationId: true },
      });
    });

    it("returns entryHash and previousHash on success", async () => {
      mockOrgMemberFindFirst.mockResolvedValue({
        organizationId: "org-1",
      } as never);
      // getLatestHash: no members -> GENESIS (or we can mock the full chain)
      mockOrgMemberFindMany.mockResolvedValue([{ userId: "user-1" }] as never);
      mockAuditLogFindFirst.mockResolvedValue(null); // No prior hashed entries

      const entryData = {
        action: "CREATE",
        entityType: "Document",
        entityId: "doc-1",
        timestamp: new Date("2025-01-15T10:00:00Z"),
        description: "Created doc",
      };

      const result = await computeHashForNewEntry("user-1", entryData);

      expect(result).not.toBeNull();
      expect(result!.previousHash).toBe("GENESIS_org-1");
      expect(result!.entryHash).toMatch(/^[a-f0-9]{64}$/);

      // Verify the entryHash is consistent with computeEntryHash
      const expectedHash = computeEntryHash({
        ...entryData,
        userId: "user-1",
        previousHash: "GENESIS_org-1",
      });
      expect(result!.entryHash).toBe(expectedHash);
    });

    it("chains from the latest existing hash", async () => {
      const existingHash = "a".repeat(64);

      mockOrgMemberFindFirst.mockResolvedValue({
        organizationId: "org-1",
      } as never);
      mockOrgMemberFindMany.mockResolvedValue([{ userId: "user-1" }] as never);
      mockAuditLogFindFirst.mockResolvedValue({
        entryHash: existingHash,
      } as never);

      const result = await computeHashForNewEntry("user-1", {
        action: "UPDATE",
        entityType: "Document",
        entityId: "doc-1",
        timestamp: new Date("2025-01-15T11:00:00Z"),
      });

      expect(result).not.toBeNull();
      expect(result!.previousHash).toBe(existingHash);
    });

    it("returns null on error", async () => {
      mockOrgMemberFindFirst.mockRejectedValue(new Error("DB down"));

      const result = await computeHashForNewEntry("user-1", {
        action: "CREATE",
        entityType: "Document",
        entityId: "doc-1",
        timestamp: new Date("2025-01-15T10:00:00Z"),
      });

      expect(result).toBeNull();
    });
  });
});
