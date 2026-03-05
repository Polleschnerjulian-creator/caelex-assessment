/**
 * Audit Package Service Tests
 *
 * Tests: generateAuditPackageData, getAcceptedEvidenceDocuments
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    organizationMember: { findMany: vi.fn() },
    cybersecurityRequirementStatus: { findMany: vi.fn() },
    nIS2RequirementStatus: { findMany: vi.fn() },
    debrisRequirementStatus: { findMany: vi.fn() },
    articleStatus: { findMany: vi.fn() },
    complianceEvidence: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/audit-hash.server", () => ({
  verifyChain: vi.fn(),
}));

import {
  generateAuditPackageData,
  getAcceptedEvidenceDocuments,
} from "./audit-package-service.server";
import { prisma } from "@/lib/prisma";
import { verifyChain } from "@/lib/audit-hash.server";

const mockPrisma = prisma as unknown as {
  organization: { findUnique: ReturnType<typeof vi.fn> };
  user: { findUnique: ReturnType<typeof vi.fn> };
  organizationMember: { findMany: ReturnType<typeof vi.fn> };
  cybersecurityRequirementStatus: { findMany: ReturnType<typeof vi.fn> };
  nIS2RequirementStatus: { findMany: ReturnType<typeof vi.fn> };
  debrisRequirementStatus: { findMany: ReturnType<typeof vi.fn> };
  articleStatus: { findMany: ReturnType<typeof vi.fn> };
  complianceEvidence: { findMany: ReturnType<typeof vi.fn> };
  auditLog: { findMany: ReturnType<typeof vi.fn> };
};
const mockVerifyChain = verifyChain as ReturnType<typeof vi.fn>;

describe("Audit Package Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Helper to set up default mocks ─────────────────────────────────────

  const setupDefaultMocks = () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      name: "Test Org",
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      name: "John Doe",
      email: "john@example.com",
    });
    mockPrisma.organizationMember.findMany.mockResolvedValue([
      { userId: "user-1" },
      { userId: "user-2" },
    ]);
    mockPrisma.cybersecurityRequirementStatus.findMany.mockResolvedValue([]);
    mockPrisma.nIS2RequirementStatus.findMany.mockResolvedValue([]);
    mockPrisma.debrisRequirementStatus.findMany.mockResolvedValue([]);
    mockPrisma.articleStatus.findMany.mockResolvedValue([]);
    mockPrisma.complianceEvidence.findMany.mockResolvedValue([]);
    mockVerifyChain.mockResolvedValue({
      valid: true,
      checkedEntries: 10,
      brokenAt: undefined,
    });
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
  };

  // ─── generateAuditPackageData ─────────────────────────────────────────────

  describe("generateAuditPackageData", () => {
    it("builds module compliance data from requirement statuses", async () => {
      setupDefaultMocks();

      mockPrisma.cybersecurityRequirementStatus.findMany.mockResolvedValue([
        {
          requirementId: "cyber-1",
          status: "compliant",
          assessment: { userId: "user-1" },
        },
        {
          requirementId: "cyber-2",
          status: "compliant",
          assessment: { userId: "user-1" },
        },
        {
          requirementId: "cyber-3",
          status: "partial",
          assessment: { userId: "user-2" },
        },
        {
          requirementId: "cyber-4",
          status: "non_compliant",
          assessment: { userId: "user-1" },
        },
      ]);

      const result = await generateAuditPackageData("org-1", "user-1");

      const cyberModule = result.modules.find(
        (m) => m.name === "Cybersecurity",
      );
      expect(cyberModule).toBeDefined();
      expect(cyberModule!.totalRequirements).toBe(4);
      expect(cyberModule!.compliant).toBe(2);
      expect(cyberModule!.partial).toBe(1);
      expect(cyberModule!.nonCompliant).toBe(1);
      expect(cyberModule!.regulationType).toBe("CYBERSECURITY");
    });

    it("calculates compliance scores correctly", async () => {
      setupDefaultMocks();

      // 2 compliant + 2 partial out of 4 total = (2 + 2*0.5) / 4 * 100 = 75
      mockPrisma.cybersecurityRequirementStatus.findMany.mockResolvedValue([
        {
          requirementId: "c1",
          status: "compliant",
          assessment: { userId: "user-1" },
        },
        {
          requirementId: "c2",
          status: "compliant",
          assessment: { userId: "user-1" },
        },
        {
          requirementId: "c3",
          status: "partial",
          assessment: { userId: "user-1" },
        },
        {
          requirementId: "c4",
          status: "partial",
          assessment: { userId: "user-1" },
        },
      ]);

      const result = await generateAuditPackageData("org-1", "user-1");

      const cyberModule = result.modules.find(
        (m) => m.name === "Cybersecurity",
      );
      expect(cyberModule!.score).toBe(75);

      // Overall score should also be 75 (only one module)
      expect(result.complianceScore).toBe(75);
    });

    it("builds evidence register from compliance evidence", async () => {
      setupDefaultMocks();

      mockPrisma.complianceEvidence.findMany.mockResolvedValue([
        {
          title: "Security Audit Report",
          regulationType: "CYBERSECURITY",
          requirementId: "cyber-1",
          evidenceType: "DOCUMENT",
          status: "ACCEPTED",
          documents: [{ document: {} }, { document: {} }],
          validFrom: new Date("2024-01-01"),
          validUntil: new Date("2024-12-31"),
          createdAt: new Date("2024-01-15"),
        },
        {
          title: "Debris Plan",
          regulationType: "DEBRIS",
          requirementId: "debris-1",
          evidenceType: "PLAN",
          status: "PENDING",
          documents: [],
          validFrom: null,
          validUntil: null,
          createdAt: new Date("2024-02-01"),
        },
      ]);

      const result = await generateAuditPackageData("org-1", "user-1");

      expect(result.evidenceRegister).toHaveLength(2);
      expect(result.evidenceRegister[0].title).toBe("Security Audit Report");
      expect(result.evidenceRegister[0].documentCount).toBe(2);
      expect(result.evidenceRegister[0].validFrom).toBe("2024-01-01");
      expect(result.evidenceRegister[1].validFrom).toBeNull();
    });

    it("builds gap analysis from non-compliant and not-assessed items", async () => {
      setupDefaultMocks();

      mockPrisma.cybersecurityRequirementStatus.findMany.mockResolvedValue([
        {
          requirementId: "cyber-1",
          status: "non_compliant",
          assessment: { userId: "user-1" },
        },
        {
          requirementId: "cyber-2",
          status: "not_assessed",
          assessment: { userId: "user-1" },
        },
        {
          requirementId: "cyber-3",
          status: "compliant",
          assessment: { userId: "user-1" },
        },
      ]);

      mockPrisma.nis2RequirementStatus?.findMany ??
        mockPrisma.nIS2RequirementStatus.findMany.mockResolvedValue([
          {
            requirementId: "nis2-1",
            status: "non_compliant",
            assessment: { userId: "user-1" },
          },
        ]);

      const result = await generateAuditPackageData("org-1", "user-1");

      // cyber-1 (non_compliant) + cyber-2 (not_assessed) + nis2-1 (non_compliant) = 3 gaps
      const cyberGaps = result.gapAnalysis.filter(
        (g) => g.regulationType === "CYBERSECURITY",
      );
      expect(cyberGaps).toHaveLength(2);
      expect(cyberGaps[0].severity).toBe("HIGH"); // non_compliant => HIGH
      expect(cyberGaps[1].severity).toBe("MEDIUM"); // not_assessed => MEDIUM
    });

    it("includes hash chain verification result", async () => {
      setupDefaultMocks();

      mockVerifyChain.mockResolvedValue({
        valid: true,
        checkedEntries: 42,
        brokenAt: undefined,
      });

      const result = await generateAuditPackageData("org-1", "user-1");

      expect(result.hashChain.valid).toBe(true);
      expect(result.hashChain.checkedEntries).toBe(42);
      expect(result.hashChain.brokenAt).toBeNull();
    });

    it("handles hash chain verification with broken entry", async () => {
      setupDefaultMocks();

      mockVerifyChain.mockResolvedValue({
        valid: false,
        checkedEntries: 15,
        brokenAt: {
          entryId: "entry-bad",
          timestamp: new Date(),
          expected: "abc",
          actual: "def",
        },
      });

      const result = await generateAuditPackageData("org-1", "user-1");

      expect(result.hashChain.valid).toBe(false);
      expect(result.hashChain.brokenAt).toBe("entry-bad");
    });

    it("handles empty data gracefully", async () => {
      setupDefaultMocks();

      // All status queries return empty
      mockPrisma.cybersecurityRequirementStatus.findMany.mockResolvedValue([]);
      mockPrisma.nIS2RequirementStatus.findMany.mockResolvedValue([]);
      mockPrisma.debrisRequirementStatus.findMany.mockResolvedValue([]);
      mockPrisma.articleStatus.findMany.mockResolvedValue([]);
      mockPrisma.complianceEvidence.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const result = await generateAuditPackageData("org-1", "user-1");

      expect(result.modules).toHaveLength(0);
      expect(result.complianceScore).toBe(0);
      expect(result.evidenceRegister).toHaveLength(0);
      expect(result.gapAnalysis).toHaveLength(0);
      expect(result.auditTrailSample).toHaveLength(0);
      expect(result.organizationName).toBe("Test Org");
      expect(result.generatedBy).toBe("John Doe");
    });

    it("builds audit trail sample from recent logs", async () => {
      setupDefaultMocks();

      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          timestamp: new Date("2024-06-10T14:30:00Z"),
          user: { name: "Alice", email: "alice@example.com" },
          action: "CREATE",
          entityType: "Document",
          description: "Uploaded compliance doc",
        },
      ]);

      const result = await generateAuditPackageData("org-1", "user-1");

      expect(result.auditTrailSample).toHaveLength(1);
      expect(result.auditTrailSample[0].user).toBe("Alice");
      expect(result.auditTrailSample[0].action).toBe("CREATE");
      expect(result.auditTrailSample[0].timestamp).toBe("2024-06-10 14:30:00");
    });

    it("uses org name fallback when org not found", async () => {
      setupDefaultMocks();
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const result = await generateAuditPackageData("org-1", "user-1");

      expect(result.organizationName).toBe("Unknown Organization");
    });

    it("uses user email fallback when name is null", async () => {
      setupDefaultMocks();
      mockPrisma.user.findUnique.mockResolvedValue({
        name: null,
        email: "user@example.com",
      });

      const result = await generateAuditPackageData("org-1", "user-1");

      expect(result.generatedBy).toBe("user@example.com");
    });

    it("includes NIS2, Debris, and EU Space Act modules when data exists", async () => {
      setupDefaultMocks();

      mockPrisma.nIS2RequirementStatus.findMany.mockResolvedValue([
        {
          requirementId: "nis2-1",
          status: "compliant",
          assessment: { userId: "user-1" },
        },
      ]);
      mockPrisma.debrisRequirementStatus.findMany.mockResolvedValue([
        {
          requirementId: "debris-1",
          status: "partial",
          assessment: { userId: "user-1" },
        },
      ]);
      mockPrisma.articleStatus.findMany.mockResolvedValue([
        {
          articleId: "art-1",
          status: "compliant",
          userId: "user-1",
        },
        {
          articleId: "art-2",
          status: "non_compliant",
          userId: "user-1",
        },
      ]);

      const result = await generateAuditPackageData("org-1", "user-1");

      const nis2 = result.modules.find((m) => m.name === "NIS2 Directive");
      expect(nis2).toBeDefined();
      expect(nis2!.regulationType).toBe("NIS2");

      const debris = result.modules.find((m) => m.name === "Debris Mitigation");
      expect(debris).toBeDefined();
      expect(debris!.regulationType).toBe("DEBRIS");

      const euSpaceAct = result.modules.find((m) => m.name === "EU Space Act");
      expect(euSpaceAct).toBeDefined();
      expect(euSpaceAct!.regulationType).toBe("EU_SPACE_ACT");
      expect(euSpaceAct!.totalRequirements).toBe(2);
    });
  });

  // ─── getAcceptedEvidenceDocuments ─────────────────────────────────────────

  describe("getAcceptedEvidenceDocuments", () => {
    it("returns flattened document list from evidence", async () => {
      mockPrisma.complianceEvidence.findMany.mockResolvedValue([
        {
          title: "Security Audit",
          regulationType: "CYBERSECURITY",
          documents: [
            {
              document: {
                id: "doc-1",
                name: "Audit Report",
                fileName: "audit.pdf",
                fileSize: 1024,
                mimeType: "application/pdf",
                storagePath: "/files/audit.pdf",
              },
            },
            {
              document: {
                id: "doc-2",
                name: "Evidence Screenshot",
                fileName: "screenshot.png",
                fileSize: 2048,
                mimeType: "image/png",
                storagePath: "/files/screenshot.png",
              },
            },
          ],
        },
        {
          title: "Debris Plan",
          regulationType: "DEBRIS",
          documents: [
            {
              document: {
                id: "doc-3",
                name: "Debris Mitigation Plan",
                fileName: "debris-plan.pdf",
                fileSize: 4096,
                mimeType: "application/pdf",
                storagePath: "/files/debris-plan.pdf",
              },
            },
          ],
        },
      ]);

      const result = await getAcceptedEvidenceDocuments("org-1");

      expect(result).toHaveLength(3);
      expect(result[0].evidenceTitle).toBe("Security Audit");
      expect(result[0].regulationType).toBe("CYBERSECURITY");
      expect(result[0].document.id).toBe("doc-1");
      expect(result[1].document.id).toBe("doc-2");
      expect(result[2].evidenceTitle).toBe("Debris Plan");
      expect(result[2].document.id).toBe("doc-3");
    });

    it("handles empty evidence", async () => {
      mockPrisma.complianceEvidence.findMany.mockResolvedValue([]);

      const result = await getAcceptedEvidenceDocuments("org-1");

      expect(result).toEqual([]);
    });

    it("queries with correct filters for ACCEPTED status", async () => {
      mockPrisma.complianceEvidence.findMany.mockResolvedValue([]);

      await getAcceptedEvidenceDocuments("org-1");

      expect(mockPrisma.complianceEvidence.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          status: "ACCEPTED",
          documents: { some: {} },
        },
        include: {
          documents: {
            include: {
              document: {
                select: {
                  id: true,
                  name: true,
                  fileName: true,
                  fileSize: true,
                  mimeType: true,
                  storagePath: true,
                },
              },
            },
          },
        },
      });
    });
  });
});
