import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only so the service can be imported
vi.mock("server-only", () => ({}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    asset: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    assetRequirement: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock audit
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  createAsset,
  updateAsset,
  softDeleteAsset,
  getAssetById,
  getAssetsByOrganization,
  calculateAssetComplianceScore,
  calculateAssetRiskScore,
  recalculateOrganizationScores,
  getOrganizationRiskOverview,
} from "@/lib/nexus/asset-service.server";

const mockAsset = {
  id: "asset-1",
  organizationId: "org-1",
  name: "Test Spacecraft",
  assetType: "SPACECRAFT",
  category: "SPACE_SEGMENT",
  description: "A test spacecraft",
  externalId: null,
  criticality: "HIGH",
  dataClassification: "INTERNAL",
  operationalStatus: "ACTIVE",
  nis2Relevant: true,
  euSpaceActRelevant: true,
  nis2Subsector: null,
  location: null,
  jurisdiction: null,
  manufacturer: null,
  commissionedDate: null,
  expectedEolDate: null,
  complianceScore: null,
  riskScore: null,
  lastAssessedAt: null,
  spacecraftId: null,
  operatorEntityId: null,
  metadata: null,
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  createdBy: "user-1",
};

describe("Asset Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // createAsset
  // ─────────────────────────────────────────────────────────────────────────

  describe("createAsset", () => {
    it("creates an asset with auto-derived category, nis2Relevant, euSpaceActRelevant", async () => {
      vi.mocked(prisma.asset.create).mockResolvedValue(mockAsset as never);
      vi.mocked(prisma.assetRequirement.createMany).mockResolvedValue({
        count: 5,
      });

      const input = {
        name: "Test Spacecraft",
        assetType: "SPACECRAFT",
        criticality: "HIGH" as const,
        dataClassification: "INTERNAL" as const,
        operationalStatus: "ACTIVE" as const,
      };

      const result = await createAsset(input, "org-1", "user-1");

      expect(prisma.asset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Test Spacecraft",
          assetType: "SPACECRAFT",
          category: "SPACE_SEGMENT",
          nis2Relevant: true,
          euSpaceActRelevant: true,
          organizationId: "org-1",
          createdBy: "user-1",
        }),
      });
      expect(result).toEqual(mockAsset);
    });

    it("bulk-creates NIS2 requirements for asset types with defaultNis2Requirements", async () => {
      vi.mocked(prisma.asset.create).mockResolvedValue(mockAsset as never);
      vi.mocked(prisma.assetRequirement.createMany).mockResolvedValue({
        count: 5,
      });

      const input = {
        name: "Test Spacecraft",
        assetType: "SPACECRAFT",
        criticality: "HIGH" as const,
        dataClassification: "INTERNAL" as const,
        operationalStatus: "ACTIVE" as const,
      };

      await createAsset(input, "org-1", "user-1");

      // SPACECRAFT has 5 default NIS2 requirements: art_21_2_a, art_21_2_b, art_21_2_c, art_21_2_e, art_21_2_h
      expect(prisma.assetRequirement.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            assetId: "asset-1",
            regulationFramework: "NIS2",
            requirementId: "art_21_2_a",
            requirementLabel: expect.stringContaining("Art. 21(2)(a)"),
            status: "NOT_ASSESSED",
          }),
        ]),
        skipDuplicates: true,
      });

      const call = vi.mocked(prisma.assetRequirement.createMany).mock
        .calls[0][0];
      expect((call as { data: unknown[] }).data).toHaveLength(5);
    });

    it("does not call assetRequirement.createMany when type has no defaultNis2Requirements", async () => {
      const noReqAsset = {
        ...mockAsset,
        assetType: "FREQUENCY_ALLOCATION",
        category: "ORGANISATIONAL",
        nis2Relevant: false,
        euSpaceActRelevant: true,
      };
      vi.mocked(prisma.asset.create).mockResolvedValue(noReqAsset as never);

      const input = {
        name: "Freq Allocation",
        assetType: "FREQUENCY_ALLOCATION",
        criticality: "LOW" as const,
        dataClassification: "INTERNAL" as const,
        operationalStatus: "ACTIVE" as const,
      };

      await createAsset(input, "org-1", "user-1");

      // FREQUENCY_ALLOCATION has art_21_2_a and art_21_2_b — 2 requirements
      // so createMany should still be called
      expect(prisma.assetRequirement.createMany).toHaveBeenCalled();
    });

    it("logs a nexus_asset_created audit event", async () => {
      vi.mocked(prisma.asset.create).mockResolvedValue(mockAsset as never);
      vi.mocked(prisma.assetRequirement.createMany).mockResolvedValue({
        count: 5,
      });

      const input = {
        name: "Test Spacecraft",
        assetType: "SPACECRAFT",
        criticality: "HIGH" as const,
        dataClassification: "INTERNAL" as const,
        operationalStatus: "ACTIVE" as const,
      };

      await createAsset(input, "org-1", "user-1");

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "nexus_asset_created",
          entityType: "nexus_asset",
          entityId: "asset-1",
          userId: "user-1",
          organizationId: "org-1",
        }),
      );
    });

    it("auto-sets nis2Relevant=false for non-NIS2 asset types", async () => {
      const propulsionAsset = {
        ...mockAsset,
        assetType: "PROPULSION",
        category: "SPACE_SEGMENT",
        nis2Relevant: false,
        euSpaceActRelevant: true,
      };
      vi.mocked(prisma.asset.create).mockResolvedValue(
        propulsionAsset as never,
      );
      vi.mocked(prisma.assetRequirement.createMany).mockResolvedValue({
        count: 2,
      });

      const input = {
        name: "Propulsion System",
        assetType: "PROPULSION",
        criticality: "MEDIUM" as const,
        dataClassification: "INTERNAL" as const,
        operationalStatus: "ACTIVE" as const,
      };

      await createAsset(input, "org-1", "user-1");

      expect(prisma.asset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nis2Relevant: false,
          euSpaceActRelevant: true,
        }),
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updateAsset
  // ─────────────────────────────────────────────────────────────────────────

  describe("updateAsset", () => {
    it("fetches previous asset, updates, and logs audit event", async () => {
      const previousAsset = { ...mockAsset, name: "Old Name" };
      const updatedAsset = { ...mockAsset, name: "New Name" };

      vi.mocked(prisma.asset.findFirst).mockResolvedValue(
        previousAsset as never,
      );
      vi.mocked(prisma.asset.update).mockResolvedValue(updatedAsset as never);

      const input = { name: "New Name" };
      const result = await updateAsset("asset-1", input, "org-1", "user-1");

      expect(prisma.asset.findFirst).toHaveBeenCalledWith({
        where: { id: "asset-1", organizationId: "org-1" },
      });
      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: "asset-1" },
        data: expect.objectContaining({ name: "New Name" }),
      });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "nexus_asset_updated",
          entityType: "nexus_asset",
          entityId: "asset-1",
          previousValue: expect.objectContaining({ name: "Old Name" }),
          newValue: expect.objectContaining({ name: "New Name" }),
        }),
      );
      expect(result).toEqual(updatedAsset);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // softDeleteAsset
  // ─────────────────────────────────────────────────────────────────────────

  describe("softDeleteAsset", () => {
    it("sets isDeleted=true and logs audit event", async () => {
      const deletedAsset = { ...mockAsset, isDeleted: true };
      vi.mocked(prisma.asset.update).mockResolvedValue(deletedAsset as never);

      await softDeleteAsset("asset-1", "org-1", "user-1");

      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: "asset-1" },
        data: expect.objectContaining({
          isDeleted: true,
          deletedAt: expect.any(Date),
        }),
      });
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "nexus_asset_deleted",
          entityType: "nexus_asset",
          entityId: "asset-1",
        }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getAssetById
  // ─────────────────────────────────────────────────────────────────────────

  describe("getAssetById", () => {
    it("returns asset with all includes", async () => {
      const fullAsset = {
        ...mockAsset,
        requirements: [],
        dependenciesFrom: [],
        dependenciesTo: [],
        suppliers: [],
        vulnerabilities: [],
        personnel: [],
        spacecraft: null,
        operatorEntity: null,
      };
      vi.mocked(prisma.asset.findFirst).mockResolvedValue(fullAsset as never);

      const result = await getAssetById("asset-1", "org-1");

      expect(prisma.asset.findFirst).toHaveBeenCalledWith({
        where: { id: "asset-1", organizationId: "org-1", isDeleted: false },
        include: expect.objectContaining({
          requirements: true,
          suppliers: true,
          vulnerabilities: true,
          personnel: true,
        }),
      });
      expect(result).toEqual(fullAsset);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getAssetsByOrganization
  // ─────────────────────────────────────────────────────────────────────────

  describe("getAssetsByOrganization", () => {
    const defaultFilters = {
      page: 1,
      limit: 50,
      sortBy: "name" as const,
      sortOrder: "asc" as const,
      showDecommissioned: false,
    };

    it("queries with default filters and returns paginated result", async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([mockAsset] as never);
      vi.mocked(prisma.asset.count).mockResolvedValue(1);

      const result = await getAssetsByOrganization("org-1", defaultFilters);

      expect(prisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: "org-1" }),
          skip: 0,
          take: 50,
          orderBy: { name: "asc" },
        }),
      );
      expect(result).toEqual({
        assets: [mockAsset],
        total: 1,
        page: 1,
        limit: 50,
      });
    });

    it("applies search filter (name contains)", async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.asset.count).mockResolvedValue(0);

      await getAssetsByOrganization("org-1", {
        ...defaultFilters,
        search: "satellite",
      });

      expect(prisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: "satellite", mode: "insensitive" },
          }),
        }),
      );
    });

    it("applies category filter (comma-separated)", async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.asset.count).mockResolvedValue(0);

      await getAssetsByOrganization("org-1", {
        ...defaultFilters,
        category: "SPACE_SEGMENT,GROUND_SEGMENT",
      });

      expect(prisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { in: ["SPACE_SEGMENT", "GROUND_SEGMENT"] },
          }),
        }),
      );
    });

    it("applies criticality filter (comma-separated)", async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.asset.count).mockResolvedValue(0);

      await getAssetsByOrganization("org-1", {
        ...defaultFilters,
        criticality: "CRITICAL,HIGH",
      });

      expect(prisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            criticality: { in: ["CRITICAL", "HIGH"] },
          }),
        }),
      );
    });

    it("applies pagination correctly on page 2", async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.asset.count).mockResolvedValue(75);

      await getAssetsByOrganization("org-1", {
        ...defaultFilters,
        page: 2,
        limit: 25,
      });

      expect(prisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 25,
          take: 25,
        }),
      );
    });

    it("excludes decommissioned assets by default", async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.asset.count).mockResolvedValue(0);

      await getAssetsByOrganization("org-1", defaultFilters);

      expect(prisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
          }),
        }),
      );
    });

    it("applies compliance score range filters", async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([]);
      vi.mocked(prisma.asset.count).mockResolvedValue(0);

      await getAssetsByOrganization("org-1", {
        ...defaultFilters,
        minComplianceScore: 60,
        maxComplianceScore: 90,
      });

      expect(prisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            complianceScore: { gte: 60, lte: 90 },
          }),
        }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // calculateAssetComplianceScore
  // ─────────────────────────────────────────────────────────────────────────

  describe("calculateAssetComplianceScore", () => {
    it("calculates weighted compliance score correctly", async () => {
      // art_21_2_a: critical weight 2.0, COMPLIANT (1.0) → 2.0
      // art_21_2_b: critical weight 2.0, NON_COMPLIANT (0.0) → 0.0
      // art_21_2_c: major weight 1.5, PARTIAL (0.5) → 0.75
      // art_21_2_e: critical weight 2.0, COMPLIANT (1.0) → 2.0
      // art_21_2_h: critical weight 2.0, NOT_APPLICABLE (skip)
      // Applicable requirements: a(2.0), b(2.0), c(1.5), e(2.0) → total weight 7.5
      // Score sum: 2.0+0.0+0.75+2.0 = 4.75
      // (4.75/7.5)*100 = 63.33...
      const mockRequirements = [
        { requirementId: "art_21_2_a", status: "COMPLIANT" },
        { requirementId: "art_21_2_b", status: "NON_COMPLIANT" },
        { requirementId: "art_21_2_c", status: "PARTIAL" },
        { requirementId: "art_21_2_e", status: "COMPLIANT" },
        { requirementId: "art_21_2_h", status: "NOT_APPLICABLE" },
      ];

      vi.mocked(prisma.assetRequirement.findMany).mockResolvedValue(
        mockRequirements as never,
      );
      vi.mocked(prisma.asset.update).mockResolvedValue({
        ...mockAsset,
        complianceScore: 63.33,
      } as never);

      const score = await calculateAssetComplianceScore("asset-1");

      // Expected: (2.0 + 0.0 + 0.75 + 2.0) / (2.0 + 2.0 + 1.5 + 2.0) * 100
      // = 4.75 / 7.5 * 100 ≈ 63.33
      expect(score).toBeCloseTo(63.33, 1);

      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: "asset-1" },
        data: expect.objectContaining({
          complianceScore: expect.any(Number),
          lastAssessedAt: expect.any(Date),
        }),
      });
    });

    it("returns 0 when all requirements are NOT_ASSESSED", async () => {
      const mockRequirements = [
        { requirementId: "art_21_2_a", status: "NOT_ASSESSED" },
        { requirementId: "art_21_2_b", status: "NOT_ASSESSED" },
      ];

      vi.mocked(prisma.assetRequirement.findMany).mockResolvedValue(
        mockRequirements as never,
      );
      vi.mocked(prisma.asset.update).mockResolvedValue({
        ...mockAsset,
        complianceScore: 0,
      } as never);

      const score = await calculateAssetComplianceScore("asset-1");
      expect(score).toBe(0);
    });

    it("returns 100 when all requirements are COMPLIANT", async () => {
      const mockRequirements = [
        { requirementId: "art_21_2_a", status: "COMPLIANT" },
        { requirementId: "art_21_2_b", status: "COMPLIANT" },
        { requirementId: "art_21_2_h", status: "COMPLIANT" },
      ];

      vi.mocked(prisma.assetRequirement.findMany).mockResolvedValue(
        mockRequirements as never,
      );
      vi.mocked(prisma.asset.update).mockResolvedValue({
        ...mockAsset,
        complianceScore: 100,
      } as never);

      const score = await calculateAssetComplianceScore("asset-1");
      expect(score).toBe(100);
    });

    it("skips NOT_APPLICABLE requirements in weight calculation", async () => {
      // Only 1 non-skipped requirement: art_21_2_a COMPLIANT with weight 2.0
      const mockRequirements = [
        { requirementId: "art_21_2_a", status: "COMPLIANT" },
        { requirementId: "art_21_2_b", status: "NOT_APPLICABLE" },
        { requirementId: "art_21_2_c", status: "NOT_APPLICABLE" },
      ];

      vi.mocked(prisma.assetRequirement.findMany).mockResolvedValue(
        mockRequirements as never,
      );
      vi.mocked(prisma.asset.update).mockResolvedValue({
        ...mockAsset,
        complianceScore: 100,
      } as never);

      const score = await calculateAssetComplianceScore("asset-1");
      // 2.0/2.0 * 100 = 100
      expect(score).toBe(100);
    });

    it("returns 0 when no requirements exist", async () => {
      vi.mocked(prisma.assetRequirement.findMany).mockResolvedValue(
        [] as never,
      );
      vi.mocked(prisma.asset.update).mockResolvedValue({
        ...mockAsset,
        complianceScore: 0,
      } as never);

      const score = await calculateAssetComplianceScore("asset-1");
      expect(score).toBe(0);
    });

    it("assigns weight 1.5 to major requirements (art_21_2_c, d, f)", async () => {
      const mockRequirements = [
        { requirementId: "art_21_2_c", status: "COMPLIANT" },
        { requirementId: "art_21_2_d", status: "COMPLIANT" },
        { requirementId: "art_21_2_f", status: "COMPLIANT" },
      ];

      vi.mocked(prisma.assetRequirement.findMany).mockResolvedValue(
        mockRequirements as never,
      );
      vi.mocked(prisma.asset.update).mockResolvedValue({
        ...mockAsset,
        complianceScore: 100,
      } as never);

      const score = await calculateAssetComplianceScore("asset-1");
      // All COMPLIANT, all major (1.5 each): (1.5+1.5+1.5)/(1.5+1.5+1.5)*100 = 100
      expect(score).toBe(100);
    });

    it("assigns weight 1.0 to standard requirements (art_21_2_g, i, j)", async () => {
      const mockRequirements = [
        { requirementId: "art_21_2_g", status: "COMPLIANT" },
        { requirementId: "art_21_2_i", status: "NON_COMPLIANT" },
        { requirementId: "art_21_2_j", status: "PARTIAL" },
      ];

      vi.mocked(prisma.assetRequirement.findMany).mockResolvedValue(
        mockRequirements as never,
      );
      vi.mocked(prisma.asset.update).mockResolvedValue({
        ...mockAsset,
        complianceScore: 50,
      } as never);

      const score = await calculateAssetComplianceScore("asset-1");
      // g=1.0*1.0=1.0, i=0.0*1.0=0.0, j=0.5*1.0=0.5 → sum=1.5, weight=3.0 → 50
      expect(score).toBeCloseTo(50, 1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // calculateAssetRiskScore
  // ─────────────────────────────────────────────────────────────────────────

  describe("calculateAssetRiskScore", () => {
    it("calculates risk score: base × vulnFactor × spofFactor, capped at 100", async () => {
      const assetWithData = {
        ...mockAsset,
        criticality: "HIGH",
        complianceScore: 50, // base = 0.75 * (100 - 50) = 37.5
        requirements: [],
        vulnerabilities: [
          { severity: "CRITICAL", status: "OPEN" }, // openCriticalVulns=1
          { severity: "HIGH", status: "OPEN" }, // openHighVulns=1
        ],
        dependenciesTo: [], // no HARD deps without redundant → spofFactor=1.0
      };

      vi.mocked(prisma.asset.findFirst).mockResolvedValue(
        assetWithData as never,
      );
      vi.mocked(prisma.asset.update).mockResolvedValue(assetWithData as never);

      const score = await calculateAssetRiskScore("asset-1");

      // base = 0.75 * (100 - 50) = 37.5
      // vulnFactor = 1 + (1 * 0.2) + (1 * 0.1) = 1.3
      // spofFactor = 1.0
      // riskScore = 37.5 * 1.3 * 1.0 = 48.75
      expect(score).toBeCloseTo(48.75, 1);
    });

    it("applies SPOF factor 1.3 when there is a HARD dependency with no redundant", async () => {
      const assetWithSpof = {
        ...mockAsset,
        criticality: "CRITICAL",
        complianceScore: 0, // base = 1.0 * (100 - 0) = 100
        requirements: [],
        vulnerabilities: [],
        dependenciesTo: [
          { strength: "HARD", dependencyType: "REQUIRES" },
          { strength: "SOFT", dependencyType: "COMMUNICATES_WITH" },
        ],
      };

      vi.mocked(prisma.asset.findFirst).mockResolvedValue(
        assetWithSpof as never,
      );
      vi.mocked(prisma.asset.update).mockResolvedValue({
        ...assetWithSpof,
        riskScore: 100,
      } as never);

      const score = await calculateAssetRiskScore("asset-1");

      // base = 1.0 * 100 = 100
      // vulnFactor = 1.0 (no vulns)
      // spofFactor = 1.3 (has HARD dep, no REDUNDANT)
      // riskScore = 100 * 1.0 * 1.3 = 130 → capped at 100
      expect(score).toBe(100);
    });

    it("does NOT apply SPOF factor when HARD dep has a REDUNDANT counterpart", async () => {
      const assetNoSpof = {
        ...mockAsset,
        criticality: "MEDIUM",
        complianceScore: 50, // base = 0.5 * 50 = 25
        requirements: [],
        vulnerabilities: [],
        dependenciesTo: [
          { strength: "HARD", dependencyType: "REQUIRES" },
          { strength: "REDUNDANT", dependencyType: "REQUIRES" },
        ],
      };

      vi.mocked(prisma.asset.findFirst).mockResolvedValue(assetNoSpof as never);
      vi.mocked(prisma.asset.update).mockResolvedValue(assetNoSpof as never);

      const score = await calculateAssetRiskScore("asset-1");

      // base = 0.5 * 50 = 25
      // vulnFactor = 1.0
      // spofFactor = 1.0 (REDUNDANT present)
      // riskScore = 25 * 1.0 * 1.0 = 25
      expect(score).toBeCloseTo(25, 1);
    });

    it("caps vulnFactor at 2.0", async () => {
      const assetHighVulns = {
        ...mockAsset,
        criticality: "HIGH",
        complianceScore: 0, // base = 0.75 * 100 = 75
        requirements: [],
        vulnerabilities: [
          { severity: "CRITICAL", status: "OPEN" }, // 5 critical
          { severity: "CRITICAL", status: "OPEN" },
          { severity: "CRITICAL", status: "OPEN" },
          { severity: "CRITICAL", status: "OPEN" },
          { severity: "CRITICAL", status: "OPEN" },
          { severity: "HIGH", status: "OPEN" }, // 5 high
          { severity: "HIGH", status: "OPEN" },
          { severity: "HIGH", status: "OPEN" },
          { severity: "HIGH", status: "OPEN" },
          { severity: "HIGH", status: "OPEN" },
        ],
        dependenciesTo: [],
      };

      vi.mocked(prisma.asset.findFirst).mockResolvedValue(
        assetHighVulns as never,
      );
      vi.mocked(prisma.asset.update).mockResolvedValue(assetHighVulns as never);

      const score = await calculateAssetRiskScore("asset-1");

      // base = 0.75 * 100 = 75
      // vulnFactor uncapped = 1 + (5*0.2) + (5*0.1) = 1 + 1.0 + 0.5 = 2.5 → capped at 2.0
      // spofFactor = 1.0
      // riskScore = 75 * 2.0 = 150 → capped at 100
      expect(score).toBe(100);
    });

    it("does not count RESOLVED/MITIGATED vulnerabilities as open", async () => {
      const assetMitigated = {
        ...mockAsset,
        criticality: "HIGH",
        complianceScore: 50, // base = 0.75 * 50 = 37.5
        requirements: [],
        vulnerabilities: [
          { severity: "CRITICAL", status: "RESOLVED" }, // NOT open
          { severity: "HIGH", status: "MITIGATED" }, // NOT open
          { severity: "HIGH", status: "ACCEPTED" }, // NOT open
        ],
        dependenciesTo: [],
      };

      vi.mocked(prisma.asset.findFirst).mockResolvedValue(
        assetMitigated as never,
      );
      vi.mocked(prisma.asset.update).mockResolvedValue(assetMitigated as never);

      const score = await calculateAssetRiskScore("asset-1");

      // base = 0.75 * 50 = 37.5
      // vulnFactor = 1.0 (no open vulns)
      // riskScore = 37.5
      expect(score).toBeCloseTo(37.5, 1);
    });

    it("updates asset's riskScore in database", async () => {
      const simpleAsset = {
        ...mockAsset,
        criticality: "LOW",
        complianceScore: 80, // base = 0.25 * 20 = 5
        requirements: [],
        vulnerabilities: [],
        dependenciesTo: [],
      };

      vi.mocked(prisma.asset.findFirst).mockResolvedValue(simpleAsset as never);
      vi.mocked(prisma.asset.update).mockResolvedValue(simpleAsset as never);

      await calculateAssetRiskScore("asset-1");

      expect(prisma.asset.update).toHaveBeenCalledWith({
        where: { id: "asset-1" },
        data: { riskScore: expect.any(Number) },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // recalculateOrganizationScores
  // ─────────────────────────────────────────────────────────────────────────

  describe("recalculateOrganizationScores", () => {
    it("recalculates scores for all non-deleted assets and logs audit", async () => {
      const assets = [
        { ...mockAsset, id: "asset-1" },
        { ...mockAsset, id: "asset-2" },
      ];

      vi.mocked(prisma.asset.findMany).mockResolvedValue(assets as never);
      // For each asset: findFirst (risk calc) + update (compliance) + update (risk)
      vi.mocked(prisma.assetRequirement.findMany).mockResolvedValue(
        [] as never,
      );
      vi.mocked(prisma.asset.findFirst).mockResolvedValue({
        ...mockAsset,
        criticality: "MEDIUM",
        complianceScore: 0,
        vulnerabilities: [],
        dependenciesTo: [],
        requirements: [],
      } as never);
      vi.mocked(prisma.asset.update).mockResolvedValue(mockAsset as never);

      await recalculateOrganizationScores("org-1", "user-1");

      expect(prisma.asset.findMany).toHaveBeenCalledWith({
        where: { organizationId: "org-1", isDeleted: false },
        select: { id: true },
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "nexus_scores_recalculated",
          organizationId: "org-1",
          userId: "user-1",
        }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getOrganizationRiskOverview
  // ─────────────────────────────────────────────────────────────────────────

  describe("getOrganizationRiskOverview", () => {
    it("returns aggregated risk overview with all required fields", async () => {
      const assets = [
        {
          ...mockAsset,
          id: "asset-1",
          category: "SPACE_SEGMENT",
          criticality: "CRITICAL",
          complianceScore: 40,
          riskScore: 80,
        },
        {
          ...mockAsset,
          id: "asset-2",
          category: "GROUND_SEGMENT",
          criticality: "HIGH",
          complianceScore: 70,
          riskScore: 30,
        },
        {
          ...mockAsset,
          id: "asset-3",
          category: "SPACE_SEGMENT",
          criticality: "MEDIUM",
          complianceScore: 90,
          riskScore: 10,
        },
      ];

      vi.mocked(prisma.asset.findMany).mockResolvedValue(assets as never);

      const overview = await getOrganizationRiskOverview("org-1");

      expect(overview).toMatchObject({
        totalAssets: 3,
        byCategory: expect.any(Object),
        byCriticality: expect.any(Object),
        averageComplianceScore: expect.any(Number),
        averageRiskScore: expect.any(Number),
        topRiskAssets: expect.any(Array),
        lowComplianceCount: expect.any(Number),
      });

      // averageCompliance = (40+70+90)/3 ≈ 66.67
      expect(overview.averageComplianceScore).toBeCloseTo(66.67, 1);

      // averageRisk = (80+30+10)/3 ≈ 40
      expect(overview.averageRiskScore).toBeCloseTo(40, 1);

      // 1 asset with compliance < 50% (asset-1 at 40)
      expect(overview.lowComplianceCount).toBe(1);

      // top 5 highest risk (sorted desc)
      expect(overview.topRiskAssets[0].id).toBe("asset-1");
      expect(overview.topRiskAssets).toHaveLength(3);
    });

    it("returns empty overview when no assets", async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([] as never);

      const overview = await getOrganizationRiskOverview("org-1");

      expect(overview.totalAssets).toBe(0);
      expect(overview.averageComplianceScore).toBe(0);
      expect(overview.averageRiskScore).toBe(0);
      expect(overview.topRiskAssets).toHaveLength(0);
      expect(overview.lowComplianceCount).toBe(0);
    });
  });
});
