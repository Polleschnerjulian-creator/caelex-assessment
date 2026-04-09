import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    articleStatus: {
      findMany: vi.fn(),
    },
    cybersecurityAssessment: {
      findMany: vi.fn(),
    },
    nIS2Assessment: {
      findMany: vi.fn(),
    },
    debrisAssessment: {
      findMany: vi.fn(),
    },
    insuranceAssessment: {
      findMany: vi.fn(),
    },
    environmentalAssessment: {
      findMany: vi.fn(),
    },
    complianceEvidence: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getOrganizationId,
  getAuditCenterOverview,
  type AuditCenterOverview,
  type ModuleComplianceStatus,
  type EvidenceCoverage,
  type ActionItem,
} from "@/lib/services/audit-center-service.server";

// ─── Helpers ───

function mockEmptyState() {
  vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
    { userId: "user-1" },
  ] as never);
  vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([]);
  vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.nIS2Assessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.complianceEvidence.groupBy).mockResolvedValue([] as never);
  vi.mocked(prisma.complianceEvidence.findMany).mockResolvedValue([]);
  vi.mocked(prisma.auditLog.count).mockResolvedValue(0);
}

describe("Audit Center Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────
  // getOrganizationId
  // ───────────────────────────────────────────────────────────

  describe("getOrganizationId", () => {
    it("should return organizationId for a user with membership", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-123",
      } as never);

      const result = await getOrganizationId("user-1");

      expect(result).toBe("org-123");
      expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { joinedAt: "desc" },
        select: { organizationId: true },
      });
    });

    it("should return null when user has no organization membership", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue(null);

      const result = await getOrganizationId("user-no-org");

      expect(result).toBeNull();
    });

    it("should return the most recent organization when user has multiple memberships", async () => {
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValue({
        organizationId: "org-latest",
      } as never);

      const result = await getOrganizationId("user-multi");

      expect(result).toBe("org-latest");
      expect(prisma.organizationMember.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { joinedAt: "desc" },
        }),
      );
    });
  });

  // ───────────────────────────────────────────────────────────
  // getAuditCenterOverview — empty state
  // ───────────────────────────────────────────────────────────

  describe("getAuditCenterOverview — empty state", () => {
    it("should return zero scores when no data exists", async () => {
      mockEmptyState();

      const overview = await getAuditCenterOverview("org-1", "user-1");

      expect(overview.complianceScore).toBe(0);
      expect(overview.modules).toHaveLength(0);
      expect(overview.totalAuditEntries).toBe(0);
      expect(overview.recentActivityCount).toBe(0);
    });

    it("should return empty action items when no data exists", async () => {
      mockEmptyState();

      const overview = await getAuditCenterOverview("org-1", "user-1");

      expect(overview.actionItems).toEqual([]);
    });

    it("should return zero evidence coverage when no data exists", async () => {
      mockEmptyState();

      const overview = await getAuditCenterOverview("org-1", "user-1");

      expect(overview.evidenceCoverage.totalRequirements).toBe(0);
      expect(overview.evidenceCoverage.withEvidence).toBe(0);
      expect(overview.evidenceCoverage.percentage).toBe(0);
      expect(overview.evidenceCoverage.byStatus).toEqual({
        draft: 0,
        submitted: 0,
        accepted: 0,
        rejected: 0,
        expired: 0,
      });
    });
  });

  // ───────────────────────────────────────────────────────────
  // getAuditCenterOverview — EU Space Act module
  // ───────────────────────────────────────────────────────────

  describe("getAuditCenterOverview — EU Space Act module", () => {
    it("should calculate EU Space Act module with all compliant articles", async () => {
      mockEmptyState();
      const now = new Date();
      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { articleId: "art-1", status: "compliant", updatedAt: now },
        { articleId: "art-2", status: "compliant", updatedAt: now },
        { articleId: "art-3", status: "compliant", updatedAt: now },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const euModule = overview.modules.find(
        (m) => m.regulationType === "EU_SPACE_ACT",
      );
      expect(euModule).toBeDefined();
      expect(euModule!.totalRequirements).toBe(3);
      expect(euModule!.compliant).toBe(3);
      expect(euModule!.score).toBe(100);
      expect(euModule!.module).toBe("EU Space Act");
    });

    it("should calculate score excluding not_applicable articles", async () => {
      mockEmptyState();
      const now = new Date();
      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { articleId: "art-1", status: "compliant", updatedAt: now },
        { articleId: "art-2", status: "not_applicable", updatedAt: now },
        { articleId: "art-3", status: "not_started", updatedAt: now },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const euModule = overview.modules.find(
        (m) => m.regulationType === "EU_SPACE_ACT",
      );
      expect(euModule).toBeDefined();
      // assessable = 3 - 1 = 2, score = (1 + 0) / 2 * 100 = 50
      expect(euModule!.score).toBe(50);
      expect(euModule!.notApplicable).toBe(1);
      expect(euModule!.nonCompliant).toBe(1);
    });

    it("should count in_progress and under_review as partial", async () => {
      mockEmptyState();
      const now = new Date();
      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { articleId: "art-1", status: "in_progress", updatedAt: now },
        { articleId: "art-2", status: "under_review", updatedAt: now },
        { articleId: "art-3", status: "not_started", updatedAt: now },
        { articleId: "art-4", status: "compliant", updatedAt: now },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const euModule = overview.modules.find(
        (m) => m.regulationType === "EU_SPACE_ACT",
      );
      expect(euModule!.partial).toBe(2);
      // score = (1 compliant + 2 partial * 0.5) / 4 * 100 = 50
      expect(euModule!.score).toBe(50);
    });

    it("should set score to 0 when all articles are not_applicable", async () => {
      mockEmptyState();
      const now = new Date();
      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { articleId: "art-1", status: "not_applicable", updatedAt: now },
        { articleId: "art-2", status: "not_applicable", updatedAt: now },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const euModule = overview.modules.find(
        (m) => m.regulationType === "EU_SPACE_ACT",
      );
      expect(euModule!.score).toBe(0);
    });

    it("should track lastUpdated as the most recent article update", async () => {
      mockEmptyState();
      const older = new Date("2025-01-01");
      const newer = new Date("2025-06-15");
      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { articleId: "art-1", status: "compliant", updatedAt: older },
        { articleId: "art-2", status: "compliant", updatedAt: newer },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const euModule = overview.modules.find(
        (m) => m.regulationType === "EU_SPACE_ACT",
      );
      expect(euModule!.lastUpdated).toEqual(newer);
    });

    it("should generate action items for not_started EU Space Act articles", async () => {
      mockEmptyState();
      const now = new Date();
      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { articleId: "art-6", status: "not_started", updatedAt: now },
        { articleId: "art-7", status: "compliant", updatedAt: now },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const euActions = overview.actionItems.filter(
        (a) => a.regulationType === "EU_SPACE_ACT",
      );
      expect(euActions).toHaveLength(1);
      expect(euActions[0].requirementId).toBe("art-6");
      expect(euActions[0].status).toBe("not_started");
      expect(euActions[0].severity).toBe("major");
      expect(euActions[0].modulePath).toBe("/dashboard/tracker");
    });
  });

  // ───────────────────────────────────────────────────────────
  // getAuditCenterOverview — Cybersecurity module
  // ───────────────────────────────────────────────────────────

  describe("getAuditCenterOverview — Cybersecurity module", () => {
    it("should calculate cybersecurity module scores correctly", async () => {
      mockEmptyState();
      const now = new Date();
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
        {
          id: "cyber-1",
          updatedAt: now,
          requirements: [
            { requirementId: "req-1", status: "compliant" },
            { requirementId: "req-2", status: "partial" },
            { requirementId: "req-3", status: "non_compliant" },
            { requirementId: "req-4", status: "not_applicable" },
            { requirementId: "req-5", status: "not_assessed" },
          ],
        },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const cyberModule = overview.modules.find(
        (m) => m.regulationType === "CYBERSECURITY",
      );
      expect(cyberModule).toBeDefined();
      expect(cyberModule!.module).toBe("Cybersecurity");
      expect(cyberModule!.totalRequirements).toBe(5);
      expect(cyberModule!.compliant).toBe(1);
      expect(cyberModule!.partial).toBe(1);
      expect(cyberModule!.nonCompliant).toBe(1);
      expect(cyberModule!.notApplicable).toBe(1);
      expect(cyberModule!.notAssessed).toBe(1);
      // assessable = 5 - 1 = 4, score = (1 + 0.5) / 4 * 100 = 37.5 -> 38
      expect(cyberModule!.score).toBe(38);
      expect(cyberModule!.lastUpdated).toEqual(now);
    });

    it("should generate action items for non_compliant and not_assessed cyber requirements", async () => {
      mockEmptyState();
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
        {
          id: "cyber-1",
          updatedAt: new Date(),
          requirements: [
            { requirementId: "req-1", status: "compliant" },
            { requirementId: "req-2", status: "non_compliant" },
            { requirementId: "req-3", status: "not_assessed" },
          ],
        },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const cyberActions = overview.actionItems.filter(
        (a) => a.regulationType === "CYBERSECURITY",
      );
      expect(cyberActions).toHaveLength(2);
      expect(cyberActions.map((a) => a.requirementId)).toContain("req-2");
      expect(cyberActions.map((a) => a.requirementId)).toContain("req-3");
      expect(cyberActions[0].modulePath).toBe(
        "/dashboard/modules/cybersecurity",
      );
      expect(cyberActions[0].severity).toBe("major");
    });

    it("should not include cybersecurity module when no assessment exists", async () => {
      mockEmptyState();

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const cyberModule = overview.modules.find(
        (m) => m.regulationType === "CYBERSECURITY",
      );
      expect(cyberModule).toBeUndefined();
    });
  });

  // ───────────────────────────────────────────────────────────
  // getAuditCenterOverview — NIS2 module
  // ───────────────────────────────────────────────────────────

  describe("getAuditCenterOverview — NIS2 module", () => {
    it("should calculate NIS2 module scores correctly", async () => {
      mockEmptyState();
      const now = new Date();
      vi.mocked(prisma.nIS2Assessment.findMany).mockResolvedValue([
        {
          id: "nis2-1",
          updatedAt: now,
          requirements: [
            { requirementId: "nis2-req-1", status: "compliant" },
            { requirementId: "nis2-req-2", status: "compliant" },
            { requirementId: "nis2-req-3", status: "partial" },
          ],
        },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const nis2Module = overview.modules.find(
        (m) => m.regulationType === "NIS2",
      );
      expect(nis2Module).toBeDefined();
      expect(nis2Module!.module).toBe("NIS2 Directive");
      expect(nis2Module!.totalRequirements).toBe(3);
      expect(nis2Module!.compliant).toBe(2);
      expect(nis2Module!.partial).toBe(1);
      // score = (2 + 0.5) / 3 * 100 = 83.33 -> 83
      expect(nis2Module!.score).toBe(83);
    });

    it("should link NIS2 action items to the correct assessment path", async () => {
      mockEmptyState();
      vi.mocked(prisma.nIS2Assessment.findMany).mockResolvedValue([
        {
          id: "nis2-assessment-42",
          updatedAt: new Date(),
          requirements: [
            { requirementId: "nis2-req-1", status: "non_compliant" },
          ],
        },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const nis2Actions = overview.actionItems.filter(
        (a) => a.regulationType === "NIS2",
      );
      expect(nis2Actions).toHaveLength(1);
      expect(nis2Actions[0].modulePath).toBe(
        "/dashboard/modules/nis2/nis2-assessment-42",
      );
    });
  });

  // ───────────────────────────────────────────────────────────
  // getAuditCenterOverview — Debris module
  // ───────────────────────────────────────────────────────────

  describe("getAuditCenterOverview — Debris module", () => {
    it("should calculate debris module scores without partial status", async () => {
      mockEmptyState();
      const now = new Date();
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
        {
          id: "debris-1",
          updatedAt: now,
          requirements: [
            { requirementId: "debris-req-1", status: "compliant" },
            { requirementId: "debris-req-2", status: "compliant" },
            { requirementId: "debris-req-3", status: "non_compliant" },
            { requirementId: "debris-req-4", status: "not_applicable" },
          ],
        },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const debrisModule = overview.modules.find(
        (m) => m.regulationType === "DEBRIS",
      );
      expect(debrisModule).toBeDefined();
      expect(debrisModule!.module).toBe("Debris Mitigation");
      expect(debrisModule!.partial).toBe(0); // debris doesn't have partial
      expect(debrisModule!.compliant).toBe(2);
      expect(debrisModule!.nonCompliant).toBe(1);
      // assessable = 4 - 1 = 3, score = 2/3 * 100 = 66.67 -> 67
      expect(debrisModule!.score).toBe(67);
    });

    it("should mark debris action items with minor severity", async () => {
      mockEmptyState();
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
        {
          id: "debris-1",
          updatedAt: new Date(),
          requirements: [
            { requirementId: "debris-req-1", status: "not_assessed" },
          ],
        },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const debrisActions = overview.actionItems.filter(
        (a) => a.regulationType === "DEBRIS",
      );
      expect(debrisActions).toHaveLength(1);
      expect(debrisActions[0].severity).toBe("minor");
      expect(debrisActions[0].modulePath).toBe("/dashboard/modules/debris");
    });
  });

  // ───────────────────────────────────────────────────────────
  // getAuditCenterOverview — Insurance module
  // ───────────────────────────────────────────────────────────

  describe("getAuditCenterOverview — Insurance module", () => {
    it("should mark insurance as compliant when score >= 80", async () => {
      mockEmptyState();
      const now = new Date();
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
        { id: "ins-1", complianceScore: 85, updatedAt: now },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const insModule = overview.modules.find(
        (m) => m.regulationType === "INSURANCE",
      );
      expect(insModule).toBeDefined();
      expect(insModule!.compliant).toBe(1);
      expect(insModule!.partial).toBe(0);
      expect(insModule!.nonCompliant).toBe(0);
      expect(insModule!.score).toBe(85);
    });

    it("should mark insurance as partial when score >= 50 and < 80", async () => {
      mockEmptyState();
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
        { id: "ins-1", complianceScore: 65, updatedAt: new Date() },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const insModule = overview.modules.find(
        (m) => m.regulationType === "INSURANCE",
      );
      expect(insModule!.compliant).toBe(0);
      expect(insModule!.partial).toBe(1);
      expect(insModule!.nonCompliant).toBe(0);
      expect(insModule!.score).toBe(65);
    });

    it("should mark insurance as non-compliant when score < 50", async () => {
      mockEmptyState();
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
        { id: "ins-1", complianceScore: 30, updatedAt: new Date() },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const insModule = overview.modules.find(
        (m) => m.regulationType === "INSURANCE",
      );
      expect(insModule!.compliant).toBe(0);
      expect(insModule!.partial).toBe(0);
      expect(insModule!.nonCompliant).toBe(1);
      expect(insModule!.score).toBe(30);
    });

    it("should handle null complianceScore in insurance", async () => {
      mockEmptyState();
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
        { id: "ins-1", complianceScore: null, updatedAt: new Date() },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const insModule = overview.modules.find(
        (m) => m.regulationType === "INSURANCE",
      );
      expect(insModule!.score).toBe(0);
      expect(insModule!.nonCompliant).toBe(1);
    });
  });

  // ───────────────────────────────────────────────────────────
  // getAuditCenterOverview — Environmental module
  // ───────────────────────────────────────────────────────────

  describe("getAuditCenterOverview — Environmental module", () => {
    it("should mark environmental as compliant when score >= 80", async () => {
      mockEmptyState();
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
        { id: "env-1", complianceScore: 90, updatedAt: new Date() },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const envModule = overview.modules.find(
        (m) => m.regulationType === "ENVIRONMENTAL",
      );
      expect(envModule).toBeDefined();
      expect(envModule!.module).toBe("Environmental");
      expect(envModule!.compliant).toBe(1);
      expect(envModule!.score).toBe(90);
    });

    it("should mark environmental as partial when score is between 50 and 79", async () => {
      mockEmptyState();
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
        { id: "env-1", complianceScore: 60, updatedAt: new Date() },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const envModule = overview.modules.find(
        (m) => m.regulationType === "ENVIRONMENTAL",
      );
      expect(envModule!.partial).toBe(1);
      expect(envModule!.compliant).toBe(0);
    });

    it("should mark environmental as non-compliant when score < 50", async () => {
      mockEmptyState();
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
        { id: "env-1", complianceScore: 20, updatedAt: new Date() },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const envModule = overview.modules.find(
        (m) => m.regulationType === "ENVIRONMENTAL",
      );
      expect(envModule!.nonCompliant).toBe(1);
      expect(envModule!.score).toBe(20);
    });
  });

  // ───────────────────────────────────────────────────────────
  // getAuditCenterOverview — Overall compliance score
  // ───────────────────────────────────────────────────────────

  describe("getAuditCenterOverview — overall compliance score", () => {
    it("should average scores across all active modules", async () => {
      mockEmptyState();
      const now = new Date();

      // EU Space Act: 100% compliant
      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { articleId: "art-1", status: "compliant", updatedAt: now },
      ] as never);

      // Insurance: score 50
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
        { id: "ins-1", complianceScore: 50, updatedAt: now },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      // (100 + 50) / 2 = 75
      expect(overview.complianceScore).toBe(75);
      expect(overview.modules).toHaveLength(2);
    });

    it("should return 0 when no modules are present", async () => {
      mockEmptyState();

      const overview = await getAuditCenterOverview("org-1", "user-1");

      expect(overview.complianceScore).toBe(0);
    });

    it("should include all 6 module types when data is present", async () => {
      mockEmptyState();
      const now = new Date();

      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { articleId: "art-1", status: "compliant", updatedAt: now },
      ] as never);
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
        {
          id: "cyber-1",
          updatedAt: now,
          requirements: [{ requirementId: "r1", status: "compliant" }],
        },
      ] as never);
      vi.mocked(prisma.nIS2Assessment.findMany).mockResolvedValue([
        {
          id: "nis2-1",
          updatedAt: now,
          requirements: [{ requirementId: "r1", status: "compliant" }],
        },
      ] as never);
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValue([
        {
          id: "debris-1",
          updatedAt: now,
          requirements: [{ requirementId: "r1", status: "compliant" }],
        },
      ] as never);
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
        { id: "ins-1", complianceScore: 100, updatedAt: now },
      ] as never);
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
        { id: "env-1", complianceScore: 100, updatedAt: now },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      expect(overview.modules).toHaveLength(6);
      const types = overview.modules.map((m) => m.regulationType);
      expect(types).toContain("EU_SPACE_ACT");
      expect(types).toContain("CYBERSECURITY");
      expect(types).toContain("NIS2");
      expect(types).toContain("DEBRIS");
      expect(types).toContain("INSURANCE");
      expect(types).toContain("ENVIRONMENTAL");
      expect(overview.complianceScore).toBe(100);
    });
  });

  // ───────────────────────────────────────────────────────────
  // getAuditCenterOverview — Evidence coverage
  // ───────────────────────────────────────────────────────────

  describe("getAuditCenterOverview — evidence coverage", () => {
    it("should aggregate evidence counts by status", async () => {
      mockEmptyState();
      const now = new Date();

      // Provide a module so we have totalRequirements
      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { articleId: "art-1", status: "compliant", updatedAt: now },
        { articleId: "art-2", status: "compliant", updatedAt: now },
      ] as never);

      vi.mocked(prisma.complianceEvidence.groupBy).mockResolvedValue([
        { status: "DRAFT", _count: 3 },
        { status: "SUBMITTED", _count: 2 },
        { status: "ACCEPTED", _count: 5 },
        { status: "REJECTED", _count: 1 },
        { status: "EXPIRED", _count: 0 },
      ] as never);

      vi.mocked(prisma.complianceEvidence.findMany).mockResolvedValue([
        { regulationType: "EU_SPACE_ACT", requirementId: "art-1" },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      expect(overview.evidenceCoverage.byStatus.draft).toBe(3);
      expect(overview.evidenceCoverage.byStatus.submitted).toBe(2);
      expect(overview.evidenceCoverage.byStatus.accepted).toBe(5);
      expect(overview.evidenceCoverage.byStatus.rejected).toBe(1);
      expect(overview.evidenceCoverage.byStatus.expired).toBe(0);
    });

    it("should calculate evidence coverage percentage", async () => {
      mockEmptyState();
      const now = new Date();

      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { articleId: "art-1", status: "compliant", updatedAt: now },
        { articleId: "art-2", status: "compliant", updatedAt: now },
        { articleId: "art-3", status: "compliant", updatedAt: now },
        { articleId: "art-4", status: "compliant", updatedAt: now },
      ] as never);

      vi.mocked(prisma.complianceEvidence.findMany).mockResolvedValue([
        { regulationType: "EU_SPACE_ACT", requirementId: "art-1" },
        { regulationType: "EU_SPACE_ACT", requirementId: "art-2" },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      expect(overview.evidenceCoverage.totalRequirements).toBe(4);
      expect(overview.evidenceCoverage.withEvidence).toBe(2);
      expect(overview.evidenceCoverage.percentage).toBe(50);
    });

    it("should handle evidence groupBy failure gracefully", async () => {
      mockEmptyState();
      vi.mocked(prisma.complianceEvidence.groupBy).mockRejectedValue(
        new Error("Schema migration not applied"),
      );

      const overview = await getAuditCenterOverview("org-1", "user-1");

      expect(overview.evidenceCoverage.byStatus).toEqual({
        draft: 0,
        submitted: 0,
        accepted: 0,
        rejected: 0,
        expired: 0,
      });
    });

    it("should handle evidence findMany failure gracefully", async () => {
      mockEmptyState();
      const now = new Date();

      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { articleId: "art-1", status: "compliant", updatedAt: now },
      ] as never);

      vi.mocked(prisma.complianceEvidence.findMany).mockRejectedValue(
        new Error("Schema migration not applied"),
      );

      const overview = await getAuditCenterOverview("org-1", "user-1");

      expect(overview.evidenceCoverage.withEvidence).toBe(0);
      expect(overview.evidenceCoverage.percentage).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────
  // getAuditCenterOverview — Action items
  // ───────────────────────────────────────────────────────────

  describe("getAuditCenterOverview — action items", () => {
    it("should sort action items: non_compliant first, then not_started, then not_assessed", async () => {
      mockEmptyState();
      const now = new Date();

      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { articleId: "art-1", status: "not_started", updatedAt: now },
      ] as never);
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
        {
          id: "cyber-1",
          updatedAt: now,
          requirements: [
            { requirementId: "cyber-req-1", status: "not_assessed" },
            { requirementId: "cyber-req-2", status: "non_compliant" },
          ],
        },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      expect(overview.actionItems.length).toBeGreaterThanOrEqual(3);
      // non_compliant should come first
      expect(overview.actionItems[0].status).toBe("non_compliant");
      // not_started second
      expect(overview.actionItems[1].status).toBe("not_started");
      // not_assessed last
      expect(overview.actionItems[2].status).toBe("not_assessed");
    });

    it("should limit action items to 50", async () => {
      mockEmptyState();
      const now = new Date();

      // Create 60 not_started articles
      const manyArticles = Array.from({ length: 60 }, (_, i) => ({
        articleId: `art-${i}`,
        status: "not_started",
        updatedAt: now,
      }));
      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue(
        manyArticles as never,
      );

      const overview = await getAuditCenterOverview("org-1", "user-1");

      expect(overview.actionItems.length).toBe(50);
    });

    it("should detect evidence for action items", async () => {
      mockEmptyState();
      const now = new Date();

      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
        {
          id: "cyber-1",
          updatedAt: now,
          requirements: [
            { requirementId: "cyber-req-1", status: "non_compliant" },
            { requirementId: "cyber-req-2", status: "non_compliant" },
          ],
        },
      ] as never);

      vi.mocked(prisma.complianceEvidence.findMany).mockResolvedValue([
        { regulationType: "CYBERSECURITY", requirementId: "cyber-req-1" },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const withEvidence = overview.actionItems.find(
        (a) => a.requirementId === "cyber-req-1",
      );
      const withoutEvidence = overview.actionItems.find(
        (a) => a.requirementId === "cyber-req-2",
      );
      expect(withEvidence!.hasEvidence).toBe(true);
      expect(withoutEvidence!.hasEvidence).toBe(false);
    });

    it("should not create action items for compliant or partial requirements", async () => {
      mockEmptyState();
      const now = new Date();

      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
        {
          id: "cyber-1",
          updatedAt: now,
          requirements: [
            { requirementId: "req-1", status: "compliant" },
            { requirementId: "req-2", status: "partial" },
            { requirementId: "req-3", status: "not_applicable" },
          ],
        },
      ] as never);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      const cyberActions = overview.actionItems.filter(
        (a) => a.regulationType === "CYBERSECURITY",
      );
      expect(cyberActions).toHaveLength(0);
    });
  });

  // ───────────────────────────────────────────────────────────
  // getAuditCenterOverview — Audit trail counts
  // ───────────────────────────────────────────────────────────

  describe("getAuditCenterOverview — audit trail", () => {
    it("should return total and recent audit log counts", async () => {
      mockEmptyState();
      // auditLog.count is called twice: once for total, once for recent
      vi.mocked(prisma.auditLog.count)
        .mockResolvedValueOnce(150) // total
        .mockResolvedValueOnce(25); // recent (last 30 days)

      const overview = await getAuditCenterOverview("org-1", "user-1");

      expect(overview.totalAuditEntries).toBe(150);
      expect(overview.recentActivityCount).toBe(25);
    });

    it("should filter recent audit entries to last 30 days", async () => {
      mockEmptyState();
      vi.mocked(prisma.auditLog.count)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(10);

      await getAuditCenterOverview("org-1", "user-1");

      // The second call should have a timestamp filter
      const secondCall = vi.mocked(prisma.auditLog.count).mock.calls[1];
      expect(secondCall[0]).toHaveProperty("where.organizationId", "org-1");
      expect(secondCall[0]).toHaveProperty("where.timestamp.gte");

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const filterDate = (
        secondCall[0] as { where: { timestamp: { gte: Date } } }
      ).where.timestamp.gte;
      // Allow 5 seconds of tolerance for test execution time
      expect(
        Math.abs(filterDate.getTime() - thirtyDaysAgo.getTime()),
      ).toBeLessThan(5000);
    });
  });

  // ───────────────────────────────────────────────────────────
  // getAuditCenterOverview — Parallel data fetching
  // ───────────────────────────────────────────────────────────

  describe("getAuditCenterOverview — data fetching", () => {
    it("should query all data sources in parallel", async () => {
      mockEmptyState();

      await getAuditCenterOverview("org-1", "user-1");

      // Verify all prisma calls were made
      expect(prisma.articleStatus.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.cybersecurityAssessment.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.nIS2Assessment.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.debrisAssessment.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.insuranceAssessment.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.environmentalAssessment.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.complianceEvidence.groupBy).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.count).toHaveBeenCalledTimes(2);
    });

    it("should filter article statuses by org member user IDs", async () => {
      mockEmptyState();

      await getAuditCenterOverview("org-1", "user-42");

      expect(prisma.articleStatus.findMany).toHaveBeenCalledWith({
        where: { userId: { in: ["user-1"] } },
        select: { articleId: true, status: true, updatedAt: true },
      });
    });

    it("should filter evidence by organizationId", async () => {
      mockEmptyState();

      await getAuditCenterOverview("org-99", "user-1");

      expect(prisma.complianceEvidence.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: "org-99" },
        }),
      );
    });

    it("should take only the latest assessment for each module", async () => {
      mockEmptyState();

      await getAuditCenterOverview("org-1", "user-1");

      expect(prisma.cybersecurityAssessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: "desc" },
          take: 1,
        }),
      );
      expect(prisma.nIS2Assessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: "desc" },
          take: 1,
        }),
      );
      expect(prisma.debrisAssessment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: "desc" },
          take: 1,
        }),
      );
    });
  });

  // ───────────────────────────────────────────────────────────
  // getAuditCenterOverview — Mixed module scenario
  // ───────────────────────────────────────────────────────────

  describe("getAuditCenterOverview — mixed compliance scenario", () => {
    it("should produce a realistic overview with mixed compliance data", async () => {
      mockEmptyState();
      const now = new Date();

      // EU Space Act: 2 compliant, 1 in_progress, 1 not_started
      vi.mocked(prisma.articleStatus.findMany).mockResolvedValue([
        { articleId: "art-1", status: "compliant", updatedAt: now },
        { articleId: "art-2", status: "compliant", updatedAt: now },
        { articleId: "art-3", status: "in_progress", updatedAt: now },
        { articleId: "art-4", status: "not_started", updatedAt: now },
      ] as never);

      // Cybersecurity: 3 reqs, 1 compliant, 1 non_compliant, 1 partial
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue([
        {
          id: "cyber-1",
          updatedAt: now,
          requirements: [
            { requirementId: "c-1", status: "compliant" },
            { requirementId: "c-2", status: "non_compliant" },
            { requirementId: "c-3", status: "partial" },
          ],
        },
      ] as never);

      // Insurance: score 70 (partial)
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
        { id: "ins-1", complianceScore: 70, updatedAt: now },
      ] as never);

      // Evidence
      vi.mocked(prisma.complianceEvidence.groupBy).mockResolvedValue([
        { status: "ACCEPTED", _count: 4 },
        { status: "DRAFT", _count: 2 },
      ] as never);
      vi.mocked(prisma.complianceEvidence.findMany).mockResolvedValue([
        { regulationType: "EU_SPACE_ACT", requirementId: "art-1" },
        { regulationType: "CYBERSECURITY", requirementId: "c-1" },
      ] as never);

      // Audit log
      vi.mocked(prisma.auditLog.count)
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(45);

      const overview = await getAuditCenterOverview("org-1", "user-1");

      // 3 modules present
      expect(overview.modules).toHaveLength(3);

      // EU Space Act: score = (2 + 1*0.5) / 4 * 100 = 62.5 -> 63
      const euModule = overview.modules.find(
        (m) => m.regulationType === "EU_SPACE_ACT",
      );
      expect(euModule!.score).toBe(63);

      // Cybersecurity: score = (1 + 1*0.5) / 3 * 100 = 50
      const cyberModule = overview.modules.find(
        (m) => m.regulationType === "CYBERSECURITY",
      );
      expect(cyberModule!.score).toBe(50);

      // Insurance: score = 70
      const insModule = overview.modules.find(
        (m) => m.regulationType === "INSURANCE",
      );
      expect(insModule!.score).toBe(70);

      // Overall = (63 + 50 + 70) / 3 = 61
      expect(overview.complianceScore).toBe(61);

      // Action items: 1 from EU Space Act (not_started) + 1 from cyber (non_compliant)
      expect(overview.actionItems.length).toBeGreaterThanOrEqual(2);
      // non_compliant should be first
      expect(overview.actionItems[0].status).toBe("non_compliant");

      // Evidence coverage
      expect(overview.evidenceCoverage.totalRequirements).toBe(8); // 4 + 3 + 1
      expect(overview.evidenceCoverage.withEvidence).toBe(2);
      expect(overview.evidenceCoverage.percentage).toBe(25); // 2/8 * 100
      expect(overview.evidenceCoverage.byStatus.accepted).toBe(4);
      expect(overview.evidenceCoverage.byStatus.draft).toBe(2);

      // Audit counts
      expect(overview.totalAuditEntries).toBe(200);
      expect(overview.recentActivityCount).toBe(45);
    });
  });

  // ───────────────────────────────────────────────────────────
  // Type exports
  // ───────────────────────────────────────────────────────────

  describe("Type exports", () => {
    it("should export ModuleComplianceStatus type with correct shape", () => {
      const status: ModuleComplianceStatus = {
        module: "Test",
        regulationType: "TEST",
        totalRequirements: 10,
        compliant: 5,
        partial: 2,
        nonCompliant: 1,
        notAssessed: 1,
        notApplicable: 1,
        score: 50,
        lastUpdated: new Date(),
      };
      expect(status).toBeDefined();
      expect(status.score).toBe(50);
    });

    it("should export EvidenceCoverage type with correct shape", () => {
      const coverage: EvidenceCoverage = {
        totalRequirements: 10,
        withEvidence: 5,
        percentage: 50,
        byStatus: {
          draft: 1,
          submitted: 1,
          accepted: 2,
          rejected: 0,
          expired: 1,
        },
      };
      expect(coverage).toBeDefined();
      expect(coverage.percentage).toBe(50);
    });

    it("should export ActionItem type with correct shape", () => {
      const item: ActionItem = {
        regulationType: "CYBERSECURITY",
        requirementId: "req-1",
        title: "Test Requirement",
        severity: "critical",
        status: "non_compliant",
        hasEvidence: false,
        modulePath: "/dashboard/modules/cybersecurity",
      };
      expect(item).toBeDefined();
      expect(item.severity).toBe("critical");
    });

    it("should export AuditCenterOverview type with correct shape", () => {
      const overview: AuditCenterOverview = {
        complianceScore: 75,
        modules: [],
        evidenceCoverage: {
          totalRequirements: 0,
          withEvidence: 0,
          percentage: 0,
          byStatus: {
            draft: 0,
            submitted: 0,
            accepted: 0,
            rejected: 0,
            expired: 0,
          },
        },
        actionItems: [],
        totalAuditEntries: 0,
        recentActivityCount: 0,
      };
      expect(overview).toBeDefined();
      expect(overview.complianceScore).toBe(75);
    });
  });
});
