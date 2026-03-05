/**
 * Verity Adapter Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/verity/utils/redaction", () => ({
  safeLog: vi.fn(),
}));

import { getVerityAttestations, getVerityStatus } from "./verity-adapter";

// Build a mock PrismaClient that satisfies the functions under test
function createMockPrisma() {
  return {
    verityAttestation: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
  } as unknown as import("@prisma/client").PrismaClient;
}

describe("verity-adapter", () => {
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
  });

  // ─── getVerityAttestations ────────────────────────────────────────────────

  describe("getVerityAttestations", () => {
    it("returns all attestations for an operator", async () => {
      const now = new Date();
      const later = new Date(Date.now() + 86400000);

      const mockRows = [
        {
          attestationId: "att-1",
          regulationRef: "Art.10",
          dataPoint: "authorization_status",
          result: true,
          trustScore: 95,
          trustLevel: "HIGH",
          issuedAt: now,
          expiresAt: later,
        },
        {
          attestationId: "att-2",
          regulationRef: "Art.15",
          dataPoint: "debris_plan",
          result: false,
          trustScore: 60,
          trustLevel: "MEDIUM",
          issuedAt: now,
          expiresAt: later,
        },
      ];

      (
        mockPrisma.verityAttestation as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany.mockResolvedValue(mockRows);

      const results = await getVerityAttestations(mockPrisma, "op-1", null);

      expect(results).toHaveLength(2);
      expect(results[0].attestationId).toBe("att-1");
      expect(results[0].regulationRef).toBe("Art.10");
      expect(results[0].result).toBe(true);
      expect(results[0].trustScore).toBe(95);
      expect(results[0].trustLevel).toBe("HIGH");
      expect(typeof results[0].issuedAt).toBe("string");
      expect(typeof results[0].expiresAt).toBe("string");
      expect(results[1].attestationId).toBe("att-2");
    });

    it("filters by noradId when provided", async () => {
      (
        mockPrisma.verityAttestation as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany.mockResolvedValue([]);

      await getVerityAttestations(mockPrisma, "op-1", "25544");

      const callArgs = (
        mockPrisma.verityAttestation as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany.mock.calls[0][0];
      expect(callArgs.where.satelliteNorad).toBe("25544");
      expect(callArgs.where.operatorId).toBe("op-1");
    });

    it("does not include satelliteNorad filter when noradId is null", async () => {
      (
        mockPrisma.verityAttestation as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany.mockResolvedValue([]);

      await getVerityAttestations(mockPrisma, "op-1", null);

      const callArgs = (
        mockPrisma.verityAttestation as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany.mock.calls[0][0];
      expect(callArgs.where.satelliteNorad).toBeUndefined();
    });

    it("returns empty array when none found", async () => {
      (
        mockPrisma.verityAttestation as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany.mockResolvedValue([]);

      const results = await getVerityAttestations(
        mockPrisma,
        "op-no-data",
        null,
      );

      expect(results).toEqual([]);
    });

    it("handles errors gracefully by returning empty array", async () => {
      (
        mockPrisma.verityAttestation as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany.mockRejectedValue(new Error("Database connection lost"));

      const results = await getVerityAttestations(mockPrisma, "op-1", null);

      expect(results).toEqual([]);
    });

    it("handles non-Error thrown values gracefully", async () => {
      (
        mockPrisma.verityAttestation as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany.mockRejectedValue("string error");

      const results = await getVerityAttestations(mockPrisma, "op-1", null);

      expect(results).toEqual([]);
    });

    it("converts issuedAt and expiresAt to ISO strings", async () => {
      const issuedAt = new Date("2025-06-15T12:00:00Z");
      const expiresAt = new Date("2026-06-15T12:00:00Z");

      (
        mockPrisma.verityAttestation as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany.mockResolvedValue([
        {
          attestationId: "att-3",
          regulationRef: "Art.10",
          dataPoint: "auth",
          result: true,
          trustScore: 90,
          trustLevel: "HIGH",
          issuedAt,
          expiresAt,
        },
      ]);

      const results = await getVerityAttestations(mockPrisma, "op-1", null);

      expect(results[0].issuedAt).toBe(issuedAt.toISOString());
      expect(results[0].expiresAt).toBe(expiresAt.toISOString());
    });

    it("orders by issuedAt desc", async () => {
      (
        mockPrisma.verityAttestation as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany.mockResolvedValue([]);

      await getVerityAttestations(mockPrisma, "op-1", null);

      const callArgs = (
        mockPrisma.verityAttestation as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual({ issuedAt: "desc" });
    });

    it("only fetches non-expired attestations", async () => {
      (
        mockPrisma.verityAttestation as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany.mockResolvedValue([]);

      await getVerityAttestations(mockPrisma, "op-1", null);

      const callArgs = (
        mockPrisma.verityAttestation as unknown as {
          findMany: ReturnType<typeof vi.fn>;
        }
      ).findMany.mock.calls[0][0];
      expect(callArgs.where.expiresAt).toBeDefined();
      expect(callArgs.where.expiresAt.gt).toBeInstanceOf(Date);
    });
  });

  // ─── getVerityStatus ──────────────────────────────────────────────────────

  describe("getVerityStatus", () => {
    it("returns count and latest trust level", async () => {
      (
        mockPrisma.verityAttestation as unknown as {
          count: ReturnType<typeof vi.fn>;
        }
      ).count.mockResolvedValue(5);
      (
        mockPrisma.verityAttestation as unknown as {
          findFirst: ReturnType<typeof vi.fn>;
        }
      ).findFirst.mockResolvedValue({
        trustLevel: "HIGH",
      });

      const status = await getVerityStatus(mockPrisma, "op-1", null);

      expect(status.attestations).toBe(5);
      expect(status.latestTrustLevel).toBe("HIGH");
    });

    it("returns null trust level when no attestations exist", async () => {
      (
        mockPrisma.verityAttestation as unknown as {
          count: ReturnType<typeof vi.fn>;
        }
      ).count.mockResolvedValue(0);
      (
        mockPrisma.verityAttestation as unknown as {
          findFirst: ReturnType<typeof vi.fn>;
        }
      ).findFirst.mockResolvedValue(null);

      const status = await getVerityStatus(mockPrisma, "op-1", null);

      expect(status.attestations).toBe(0);
      expect(status.latestTrustLevel).toBeNull();
    });

    it("returns null trust level when latest has no trustLevel", async () => {
      (
        mockPrisma.verityAttestation as unknown as {
          count: ReturnType<typeof vi.fn>;
        }
      ).count.mockResolvedValue(2);
      (
        mockPrisma.verityAttestation as unknown as {
          findFirst: ReturnType<typeof vi.fn>;
        }
      ).findFirst.mockResolvedValue({
        trustLevel: null,
      });

      const status = await getVerityStatus(mockPrisma, "op-1", null);

      expect(status.attestations).toBe(2);
      expect(status.latestTrustLevel).toBeNull();
    });

    it("filters by noradId when provided", async () => {
      (
        mockPrisma.verityAttestation as unknown as {
          count: ReturnType<typeof vi.fn>;
        }
      ).count.mockResolvedValue(1);
      (
        mockPrisma.verityAttestation as unknown as {
          findFirst: ReturnType<typeof vi.fn>;
        }
      ).findFirst.mockResolvedValue({
        trustLevel: "LOW",
      });

      await getVerityStatus(mockPrisma, "op-1", "25544");

      const countArgs = (
        mockPrisma.verityAttestation as unknown as {
          count: ReturnType<typeof vi.fn>;
        }
      ).count.mock.calls[0][0];
      expect(countArgs.where.satelliteNorad).toBe("25544");
    });

    it("does not filter by noradId when null", async () => {
      (
        mockPrisma.verityAttestation as unknown as {
          count: ReturnType<typeof vi.fn>;
        }
      ).count.mockResolvedValue(0);
      (
        mockPrisma.verityAttestation as unknown as {
          findFirst: ReturnType<typeof vi.fn>;
        }
      ).findFirst.mockResolvedValue(null);

      await getVerityStatus(mockPrisma, "op-1", null);

      const countArgs = (
        mockPrisma.verityAttestation as unknown as {
          count: ReturnType<typeof vi.fn>;
        }
      ).count.mock.calls[0][0];
      expect(countArgs.where.satelliteNorad).toBeUndefined();
    });

    it("handles errors gracefully by returning defaults", async () => {
      (
        mockPrisma.verityAttestation as unknown as {
          count: ReturnType<typeof vi.fn>;
        }
      ).count.mockRejectedValue(new Error("DB error"));

      const status = await getVerityStatus(mockPrisma, "op-1", null);

      expect(status.attestations).toBe(0);
      expect(status.latestTrustLevel).toBeNull();
    });
  });
});
