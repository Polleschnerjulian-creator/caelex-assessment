import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ───

vi.mock("@/lib/prisma", () => ({
  prisma: {
    nCASubmission: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    nCACorrespondence: {
      findMany: vi.fn(),
    },
    submissionPackage: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
    },
    generatedDocument: {
      findMany: vi.fn(),
    },
    debrisAssessment: {
      findMany: vi.fn(),
    },
    cybersecurityAssessment: {
      findMany: vi.fn(),
    },
    insuranceAssessment: {
      findMany: vi.fn(),
    },
    environmentalAssessment: {
      findMany: vi.fn(),
    },
    nIS2Assessment: {
      findMany: vi.fn(),
    },
    nCADocument: {
      findMany: vi.fn(),
    },
    verityAttestation: {
      findMany: vi.fn(),
    },
  },
}));

// ─── Mock nca-submission-service ───

vi.mock("@/lib/services/nca-submission-service", async () => {
  const prismaModule =
    await vi.importMock<typeof import("@/lib/prisma")>("@/lib/prisma");
  return {
    updatePriority: vi.fn(
      async (id: string, userId: string, priority: string) => {
        const submission = await prismaModule.prisma.nCASubmission.findFirst({
          where: { id, userId },
        });
        if (!submission) throw new Error("Submission not found");
        return prismaModule.prisma.nCASubmission.update({
          where: { id },
          data: { priority },
        });
      },
    ),
    NCA_AUTHORITY_INFO: {
      DE_BMWK: {
        name: "Federal Ministry for Economic Affairs and Climate Action",
        country: "Germany",
        portalUrl: "https://www.bmwk.de",
        description: "German national authority for space activities",
      },
      FR_CNES: {
        name: "Centre National d'Études Spatiales",
        country: "France",
        portalUrl: "https://cnes.fr",
        description: "French space agency",
      },
      IT_ASI: {
        name: "Agenzia Spaziale Italiana",
        country: "Italy",
        portalUrl: "https://www.asi.it",
        description: "Italian space agency",
      },
      OTHER: {
        name: "Other Authority",
        country: "Other",
        description: "Other national or international authority",
      },
    },
    getSubmissionStatusLabel: vi.fn((status: string) => {
      const labels: Record<string, string> = {
        DRAFT: "Draft",
        SUBMITTED: "Submitted",
        RECEIVED: "Received",
        UNDER_REVIEW: "Under Review",
        INFORMATION_REQUESTED: "Information Requested",
        ACKNOWLEDGED: "Acknowledged",
        APPROVED: "Approved",
        REJECTED: "Rejected",
        WITHDRAWN: "Withdrawn",
      };
      return labels[status] || status;
    }),
  };
});

// ─── Mock authorization-documents ───

vi.mock("@/data/authorization-documents", () => ({
  getDocumentsForOperatorType: vi.fn(() => [
    {
      type: "mission_description",
      name: "Mission Description",
      required: true,
    },
    {
      type: "technical_specs",
      name: "Technical Specifications",
      required: true,
    },
    {
      type: "debris_mitigation_plan",
      name: "Debris Mitigation Plan",
      required: true,
    },
    {
      type: "insurance_proof",
      name: "Third-Party Liability Insurance",
      required: true,
    },
    {
      type: "efd",
      name: "Environmental Footprint Declaration",
      required: false,
    },
    {
      type: "financial_guarantee",
      name: "Financial Guarantee / Bond",
      required: false,
    },
  ]),
  getRequiredDocuments: vi.fn(() => [
    {
      type: "mission_description",
      name: "Mission Description",
      required: true,
    },
    {
      type: "technical_specs",
      name: "Technical Specifications",
      required: true,
    },
    {
      type: "debris_mitigation_plan",
      name: "Debris Mitigation Plan",
      required: true,
    },
    {
      type: "insurance_proof",
      name: "Third-Party Liability Insurance",
      required: true,
    },
  ]),
}));

// ─── Mock encryption ───

vi.mock("@/lib/encryption", () => ({
  encrypt: vi.fn((v: string) => Promise.resolve(v)),
  decrypt: vi.fn((v: string) => Promise.resolve(v)),
  isEncrypted: vi.fn(() => false),
}));

// ─── Imports ───

import { prisma } from "@/lib/prisma";
import {
  getPortalDashboard,
  getSubmissionPipeline,
  getSubmissionTimeline,
  assemblePackage,
  getPackages,
  getPackage,
  submitPackage,
  getAnalytics,
  getActiveSubmissions,
  updatePriority,
  getSubmissionWithTimeline,
} from "@/lib/services/nca-portal-service";

// ─── Helpers ───

const USER_ID = "user-001";
const ORG_ID = "org-001";
const SUBMISSION_ID = "sub-001";
const PACKAGE_ID = "pkg-001";

function makeSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: SUBMISSION_ID,
    userId: USER_ID,
    ncaAuthority: "DE_BMWK",
    ncaAuthorityName:
      "Federal Ministry for Economic Affairs and Climate Action",
    status: "SUBMITTED",
    priority: "NORMAL",
    submittedAt: new Date("2025-06-01"),
    updatedAt: new Date("2025-06-05"),
    ncaReference: null,
    slaDeadline: null,
    followUpRequired: false,
    followUpDeadline: null,
    statusHistory: null,
    acknowledgedAt: null,
    coverLetter: null,
    packageId: null,
    reportId: "report-001",
    report: {
      id: "report-001",
      title: "Test Report",
      reportType: "AUTHORIZATION",
      status: "COMPLETED",
      dueDate: null,
    },
    _count: { correspondence: 2 },
    correspondence: [],
    package: null,
    ...overrides,
  };
}

function makeCorrespondence(overrides: Record<string, unknown> = {}) {
  return {
    id: "corr-001",
    submissionId: SUBMISSION_ID,
    subject: "Follow-up request",
    direction: "INBOUND",
    content: "Please provide additional documentation for review.",
    messageType: "REQUEST",
    createdAt: new Date("2025-06-03"),
    isRead: false,
    requiresResponse: true,
    submission: { ncaAuthority: "DE_BMWK" },
    ...overrides,
  };
}

// ─── Tests ───

describe("NCA Portal Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────
  //  getPortalDashboard
  // ───────────────────────────────────────────────

  describe("getPortalDashboard", () => {
    it("should return dashboard data with correct counts", async () => {
      vi.mocked(prisma.nCASubmission.count)
        .mockResolvedValueOnce(3) // activeSubmissions
        .mockResolvedValueOnce(1) // pendingFollowUps
        .mockResolvedValueOnce(2); // upcomingDeadlines

      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        {
          status: "SUBMITTED",
          submittedAt: new Date("2025-06-01"),
          acknowledgedAt: new Date("2025-06-04"),
        },
        {
          status: "APPROVED",
          submittedAt: new Date("2025-05-01"),
          acknowledgedAt: new Date("2025-05-08"),
        },
        {
          status: "UNDER_REVIEW",
          submittedAt: new Date("2025-06-10"),
          acknowledgedAt: null,
        },
      ] as never);

      vi.mocked(prisma.nCACorrespondence.findMany).mockResolvedValueOnce([
        makeCorrespondence(),
      ] as never);

      const result = await getPortalDashboard(USER_ID);

      expect(result.activeSubmissions).toBe(3);
      expect(result.pendingFollowUps).toBe(1);
      expect(result.upcomingDeadlines).toBe(2);
      expect(result.recentCorrespondence).toHaveLength(1);
      expect(result.recentCorrespondence[0].ncaAuthority).toBe("DE_BMWK");
      expect(result.recentCorrespondence[0].subject).toBe("Follow-up request");
    });

    it("should calculate average response days correctly", async () => {
      vi.mocked(prisma.nCASubmission.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      // 3 days + 7 days = 10 days, responseCount = 2, avg = 5
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        {
          status: "SUBMITTED",
          submittedAt: new Date("2025-06-01"),
          acknowledgedAt: new Date("2025-06-04"),
        },
        {
          status: "APPROVED",
          submittedAt: new Date("2025-05-01"),
          acknowledgedAt: new Date("2025-05-08"),
        },
      ] as never);

      vi.mocked(prisma.nCACorrespondence.findMany).mockResolvedValueOnce(
        [] as never,
      );

      const result = await getPortalDashboard(USER_ID);

      expect(result.avgResponseDays).toBe(5);
    });

    it("should return avgResponseDays 0 when no submissions have acknowledgedAt", async () => {
      vi.mocked(prisma.nCASubmission.count)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        {
          status: "SUBMITTED",
          submittedAt: new Date("2025-06-01"),
          acknowledgedAt: null,
        },
      ] as never);

      vi.mocked(prisma.nCACorrespondence.findMany).mockResolvedValueOnce(
        [] as never,
      );

      const result = await getPortalDashboard(USER_ID);

      expect(result.avgResponseDays).toBe(0);
    });

    it("should aggregate submissionsByStatus correctly", async () => {
      vi.mocked(prisma.nCASubmission.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        { status: "SUBMITTED", submittedAt: new Date(), acknowledgedAt: null },
        { status: "SUBMITTED", submittedAt: new Date(), acknowledgedAt: null },
        {
          status: "APPROVED",
          submittedAt: new Date(),
          acknowledgedAt: new Date(),
        },
        { status: "REJECTED", submittedAt: new Date(), acknowledgedAt: null },
      ] as never);

      vi.mocked(prisma.nCACorrespondence.findMany).mockResolvedValueOnce(
        [] as never,
      );

      const result = await getPortalDashboard(USER_ID);

      expect(result.submissionsByStatus).toEqual({
        SUBMITTED: 2,
        APPROVED: 1,
        REJECTED: 1,
      });
    });

    it("should handle empty state with zero submissions", async () => {
      vi.mocked(prisma.nCASubmission.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.nCACorrespondence.findMany).mockResolvedValueOnce(
        [] as never,
      );

      const result = await getPortalDashboard(USER_ID);

      expect(result.activeSubmissions).toBe(0);
      expect(result.pendingFollowUps).toBe(0);
      expect(result.upcomingDeadlines).toBe(0);
      expect(result.avgResponseDays).toBe(0);
      expect(result.recentCorrespondence).toEqual([]);
      expect(result.submissionsByStatus).toEqual({});
    });

    it("should pass userId filter to all queries", async () => {
      vi.mocked(prisma.nCASubmission.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.nCACorrespondence.findMany).mockResolvedValueOnce(
        [] as never,
      );

      await getPortalDashboard(USER_ID);

      // Verify count calls filter by userId
      expect(prisma.nCASubmission.count).toHaveBeenCalledTimes(3);
      const firstCall = vi.mocked(prisma.nCASubmission.count).mock
        .calls[0][0] as { where: { userId: string } };
      expect(firstCall.where.userId).toBe(USER_ID);

      // Verify findMany call filters by userId
      expect(prisma.nCASubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID } }),
      );
    });
  });

  // ───────────────────────────────────────────────
  //  getSubmissionPipeline
  // ───────────────────────────────────────────────

  describe("getSubmissionPipeline", () => {
    it("should return all pipeline stages", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce(
        [] as never,
      );

      const result = await getSubmissionPipeline(USER_ID);

      expect(Object.keys(result)).toEqual([
        "DRAFT",
        "SUBMITTED",
        "RECEIVED",
        "UNDER_REVIEW",
        "INFORMATION_REQUESTED",
        "ACKNOWLEDGED",
        "APPROVED",
        "REJECTED",
        "WITHDRAWN",
      ]);
    });

    it("should categorize submissions into correct pipeline stages", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        makeSubmission({ id: "s1", status: "SUBMITTED", statusHistory: null }),
        makeSubmission({
          id: "s2",
          status: "UNDER_REVIEW",
          statusHistory: null,
        }),
        makeSubmission({ id: "s3", status: "APPROVED", statusHistory: null }),
        makeSubmission({ id: "s4", status: "SUBMITTED", statusHistory: null }),
      ] as never);

      const result = await getSubmissionPipeline(USER_ID);

      expect(result.SUBMITTED).toHaveLength(2);
      expect(result.UNDER_REVIEW).toHaveLength(1);
      expect(result.APPROVED).toHaveLength(1);
      expect(result.DRAFT).toHaveLength(0);
    });

    it("should compute daysInStatus from statusHistory", async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const statusHistory = JSON.stringify([
        {
          status: "SUBMITTED",
          timestamp: new Date("2025-01-01").toISOString(),
        },
        { status: "UNDER_REVIEW", timestamp: twoDaysAgo.toISOString() },
      ]);

      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        makeSubmission({ id: "s1", status: "UNDER_REVIEW", statusHistory }),
      ] as never);

      const result = await getSubmissionPipeline(USER_ID);
      const item = result.UNDER_REVIEW[0];

      // Should be approximately 2-3 days depending on rounding
      expect(item.daysInStatus).toBeGreaterThanOrEqual(2);
      expect(item.daysInStatus).toBeLessThanOrEqual(3);
    });

    it("should fall back to updatedAt when statusHistory is malformed JSON", async () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        makeSubmission({
          id: "s1",
          status: "SUBMITTED",
          statusHistory: "not-valid-json",
          updatedAt: fiveDaysAgo,
        }),
      ] as never);

      const result = await getSubmissionPipeline(USER_ID);
      const item = result.SUBMITTED[0];

      expect(item.daysInStatus).toBeGreaterThanOrEqual(5);
      expect(item.daysInStatus).toBeLessThanOrEqual(6);
    });

    it("should fall back to updatedAt when statusHistory is null", async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        makeSubmission({
          id: "s1",
          status: "SUBMITTED",
          statusHistory: null,
          updatedAt: threeDaysAgo,
        }),
      ] as never);

      const result = await getSubmissionPipeline(USER_ID);
      const item = result.SUBMITTED[0];

      expect(item.daysInStatus).toBeGreaterThanOrEqual(3);
      expect(item.daysInStatus).toBeLessThanOrEqual(4);
    });

    it("should map pipeline submission fields correctly", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        makeSubmission({
          id: "s1",
          ncaAuthority: "FR_CNES",
          ncaAuthorityName: "Centre National d'Etudes Spatiales",
          status: "RECEIVED",
          priority: "HIGH",
          ncaReference: "NCA-2025-001",
          slaDeadline: new Date("2025-12-31"),
          _count: { correspondence: 5 },
          report: { title: "My Authorization Report" },
          statusHistory: null,
        }),
      ] as never);

      const result = await getSubmissionPipeline(USER_ID);
      const item = result.RECEIVED[0];

      expect(item.id).toBe("s1");
      expect(item.ncaAuthority).toBe("FR_CNES");
      expect(item.priority).toBe("HIGH");
      expect(item.ncaReference).toBe("NCA-2025-001");
      expect(item.correspondenceCount).toBe(5);
      expect(item.reportTitle).toBe("My Authorization Report");
    });
  });

  // ───────────────────────────────────────────────
  //  getSubmissionTimeline
  // ───────────────────────────────────────────────

  describe("getSubmissionTimeline", () => {
    it("should throw when submission is not found", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValueOnce(null);

      await expect(
        getSubmissionTimeline("nonexistent", USER_ID),
      ).rejects.toThrow("Submission not found");
    });

    it("should return status change entries from statusHistory", async () => {
      const statusHistory = JSON.stringify([
        {
          status: "SUBMITTED",
          timestamp: "2025-06-01T00:00:00Z",
          notes: "Initial submission",
        },
        { status: "RECEIVED", timestamp: "2025-06-02T00:00:00Z", notes: "" },
      ]);

      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValueOnce(
        makeSubmission({ statusHistory, correspondence: [] }) as never,
      );

      const result = await getSubmissionTimeline(SUBMISSION_ID, USER_ID);

      const statusEntries = result.filter((e) => e.type === "status_change");
      expect(statusEntries).toHaveLength(2);
      expect(statusEntries[0].title).toContain("Received");
      expect(statusEntries[1].title).toContain("Submitted");
    });

    it("should return correspondence entries", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValueOnce(
        makeSubmission({
          statusHistory: null,
          correspondence: [
            {
              id: "c1",
              direction: "INBOUND",
              subject: "Request for info",
              content: "We need more documentation about your mission plan.",
              createdAt: new Date("2025-06-03"),
              messageType: "REQUEST",
              requiresResponse: true,
            },
            {
              id: "c2",
              direction: "OUTBOUND",
              subject: "Response to request",
              content: "Please find attached the requested documents.",
              createdAt: new Date("2025-06-04"),
              messageType: "RESPONSE",
              requiresResponse: false,
            },
          ],
        }) as never,
      );

      const result = await getSubmissionTimeline(SUBMISSION_ID, USER_ID);

      expect(result).toHaveLength(2);
      // Sorted descending by timestamp
      expect(result[0].title).toBe("Sent: Response to request");
      expect(result[0].type).toBe("correspondence");
      expect(result[1].title).toBe("Received: Request for info");
    });

    it("should combine and sort status changes and correspondence by timestamp descending", async () => {
      const statusHistory = JSON.stringify([
        { status: "SUBMITTED", timestamp: "2025-06-01T00:00:00Z", notes: "" },
      ]);

      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValueOnce(
        makeSubmission({
          statusHistory,
          correspondence: [
            {
              id: "c1",
              direction: "INBOUND",
              subject: "Info request",
              content: "Need more info.",
              createdAt: new Date("2025-06-05"),
              messageType: "REQUEST",
              requiresResponse: true,
            },
          ],
        }) as never,
      );

      const result = await getSubmissionTimeline(SUBMISSION_ID, USER_ID);

      expect(result).toHaveLength(2);
      // Correspondence on June 5 should be first (newest)
      expect(result[0].type).toBe("correspondence");
      expect(result[1].type).toBe("status_change");
    });

    it("should skip malformed statusHistory JSON gracefully", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValueOnce(
        makeSubmission({
          statusHistory: "{invalid json}",
          correspondence: [],
        }) as never,
      );

      const result = await getSubmissionTimeline(SUBMISSION_ID, USER_ID);

      expect(result).toHaveLength(0);
    });

    it("should truncate correspondence content to 200 characters in description", async () => {
      const longContent = "A".repeat(500);

      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValueOnce(
        makeSubmission({
          statusHistory: null,
          correspondence: [
            {
              id: "c1",
              direction: "OUTBOUND",
              subject: "Long content",
              content: longContent,
              createdAt: new Date("2025-06-03"),
              messageType: "INFO",
              requiresResponse: false,
            },
          ],
        }) as never,
      );

      const result = await getSubmissionTimeline(SUBMISSION_ID, USER_ID);

      expect(result[0].description).toHaveLength(200);
    });

    it("should include metadata for correspondence entries", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValueOnce(
        makeSubmission({
          statusHistory: null,
          correspondence: [
            {
              id: "c1",
              direction: "INBOUND",
              subject: "Urgent",
              content: "Respond ASAP.",
              createdAt: new Date("2025-06-10"),
              messageType: "URGENT",
              requiresResponse: true,
            },
          ],
        }) as never,
      );

      const result = await getSubmissionTimeline(SUBMISSION_ID, USER_ID);

      expect(result[0].metadata).toEqual({
        correspondenceId: "c1",
        direction: "INBOUND",
        messageType: "URGENT",
        requiresResponse: true,
      });
    });
  });

  // ───────────────────────────────────────────────
  //  assemblePackage
  // ───────────────────────────────────────────────

  describe("assemblePackage", () => {
    function setupAssembleMocks(
      overrides: {
        operatorType?: string | null;
        vaultDocuments?: unknown[];
        generatedDocuments?: unknown[];
        debrisAssessments?: unknown[];
        cyberAssessments?: unknown[];
        insuranceAssessments?: unknown[];
        environmentalAssessments?: unknown[];
        nis2Assessments?: unknown[];
      } = {},
    ) {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        operatorType: overrides.operatorType ?? "SCO",
      } as never);

      vi.mocked(prisma.document.findMany).mockResolvedValueOnce(
        (overrides.vaultDocuments ?? []) as never,
      );
      vi.mocked(prisma.generatedDocument.findMany).mockResolvedValueOnce(
        (overrides.generatedDocuments ?? []) as never,
      );
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValueOnce(
        (overrides.debrisAssessments ?? []) as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValueOnce(
        (overrides.cyberAssessments ?? []) as never,
      );
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValueOnce(
        (overrides.insuranceAssessments ?? []) as never,
      );
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValueOnce(
        (overrides.environmentalAssessments ?? []) as never,
      );
      vi.mocked(prisma.nIS2Assessment.findMany).mockResolvedValueOnce(
        (overrides.nis2Assessments ?? []) as never,
      );
      vi.mocked(prisma.nCADocument.findMany).mockResolvedValueOnce([] as never);
      vi.mocked(prisma.verityAttestation.findMany).mockResolvedValueOnce(
        [] as never,
      );

      vi.mocked(prisma.submissionPackage.create).mockResolvedValueOnce({
        id: PACKAGE_ID,
        userId: USER_ID,
        organizationId: ORG_ID,
        ncaAuthority: "DE_BMWK",
        packageName:
          "Federal Ministry for Economic Affairs and Climate Action Submission Package",
        completenessScore: 0,
      } as never);
    }

    it("should assemble a package with all documents missing", async () => {
      setupAssembleMocks();

      const result = await assemblePackage(USER_ID, ORG_ID, "DE_BMWK");

      expect(result.package.id).toBe(PACKAGE_ID);
      expect(result.completenessScore).toBe(0);
      expect(result.missingDocuments).toHaveLength(4);
      expect(result.requiredDocuments).toHaveLength(4);
      expect(result.documents.some((d) => d.status === "missing")).toBe(true);
    });

    it("should mark vault documents as found", async () => {
      setupAssembleMocks({
        vaultDocuments: [
          {
            id: "d1",
            name: "Mission Plan",
            category: "mission_description",
            status: "ACTIVE",
          },
          {
            id: "d2",
            name: "Tech Specs",
            category: "technical_specs",
            status: "ACTIVE",
          },
        ],
      });

      const result = await assemblePackage(USER_ID, ORG_ID, "DE_BMWK");

      const foundDocs = result.documents.filter((d) => d.status === "found");
      expect(foundDocs.length).toBeGreaterThanOrEqual(2);
      expect(
        foundDocs.some(
          (d) =>
            d.sourceType === "vault" &&
            d.documentType === "mission_description",
        ),
      ).toBe(true);
      expect(
        foundDocs.some(
          (d) =>
            d.sourceType === "vault" && d.documentType === "technical_specs",
        ),
      ).toBe(true);
    });

    it("should mark generated documents as found when vault does not have the type", async () => {
      setupAssembleMocks({
        generatedDocuments: [
          {
            id: "g1",
            title: "Generated Tech Specs",
            documentType: "technical_specs",
          },
        ],
      });

      const result = await assemblePackage(USER_ID, ORG_ID, "DE_BMWK");

      const genDoc = result.documents.find(
        (d) =>
          d.sourceType === "generated" && d.documentType === "technical_specs",
      );
      expect(genDoc).toBeDefined();
      expect(genDoc?.status).toBe("found");
    });

    it("should not duplicate document types when vault already has them", async () => {
      setupAssembleMocks({
        vaultDocuments: [
          {
            id: "d1",
            name: "Tech Specs",
            category: "technical_specs",
            status: "ACTIVE",
          },
        ],
        generatedDocuments: [
          {
            id: "g1",
            title: "Generated Tech Specs",
            documentType: "technical_specs",
          },
        ],
      });

      const result = await assemblePackage(USER_ID, ORG_ID, "DE_BMWK");

      const techSpecDocs = result.documents.filter(
        (d) => d.documentType === "technical_specs",
      );
      // Only vault one should be present, generated one should be skipped
      expect(techSpecDocs).toHaveLength(1);
      expect(techSpecDocs[0].sourceType).toBe("vault");
    });

    it("should mark assessment results as found documents", async () => {
      setupAssembleMocks({
        debrisAssessments: [
          { id: "debris-001", complianceScore: 85, updatedAt: new Date() },
        ],
        cyberAssessments: [
          { id: "cyber-001", maturityScore: 70, updatedAt: new Date() },
        ],
        insuranceAssessments: [
          { id: "ins-001", complianceScore: 90, updatedAt: new Date() },
        ],
      });

      const result = await assemblePackage(USER_ID, ORG_ID, "DE_BMWK");

      const assessmentDocs = result.documents.filter(
        (d) => d.sourceType === "assessment",
      );
      expect(assessmentDocs).toHaveLength(3);
      expect(
        assessmentDocs.some((d) => d.documentType === "debris_mitigation_plan"),
      ).toBe(true);
      expect(
        assessmentDocs.some(
          (d) => d.documentType === "cybersecurity_assessment",
        ),
      ).toBe(true);
      expect(
        assessmentDocs.some((d) => d.documentType === "insurance_proof"),
      ).toBe(true);
    });

    it("should compute completenessScore as percentage of required docs found", async () => {
      // 2 of 4 required found => 50%
      setupAssembleMocks({
        vaultDocuments: [
          {
            id: "d1",
            name: "Mission Plan",
            category: "mission_description",
            status: "ACTIVE",
          },
          {
            id: "d2",
            name: "Tech Specs",
            category: "technical_specs",
            status: "ACTIVE",
          },
        ],
      });

      const result = await assemblePackage(USER_ID, ORG_ID, "DE_BMWK");

      expect(result.completenessScore).toBe(50);
      expect(result.missingDocuments).toHaveLength(2);
    });

    it("should achieve 100% when all required documents are found", async () => {
      setupAssembleMocks({
        vaultDocuments: [
          {
            id: "d1",
            name: "Mission Plan",
            category: "mission_description",
            status: "ACTIVE",
          },
          {
            id: "d2",
            name: "Tech Specs",
            category: "technical_specs",
            status: "ACTIVE",
          },
        ],
        debrisAssessments: [
          { id: "debris-001", complianceScore: 85, updatedAt: new Date() },
        ],
        insuranceAssessments: [
          { id: "ins-001", complianceScore: 90, updatedAt: new Date() },
        ],
      });

      const result = await assemblePackage(USER_ID, ORG_ID, "DE_BMWK");

      expect(result.completenessScore).toBe(100);
      expect(result.missingDocuments).toHaveLength(0);
    });

    it("should include optional documents with status 'optional'", async () => {
      setupAssembleMocks();

      const result = await assemblePackage(USER_ID, ORG_ID, "DE_BMWK");

      const optionalDocs = result.documents.filter(
        (d) => d.status === "optional",
      );
      expect(optionalDocs.length).toBeGreaterThanOrEqual(1);
      expect(optionalDocs.some((d) => d.documentType === "efd")).toBe(true);
    });

    it("should default to SCO when user has no operatorType", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        operatorType: null,
      } as never);

      // Set up remaining mocks (empty data)
      vi.mocked(prisma.document.findMany).mockResolvedValueOnce([] as never);
      vi.mocked(prisma.generatedDocument.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.nIS2Assessment.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.nCADocument.findMany).mockResolvedValueOnce([] as never);
      vi.mocked(prisma.verityAttestation.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.submissionPackage.create).mockResolvedValueOnce({
        id: PACKAGE_ID,
      } as never);

      await assemblePackage(USER_ID, ORG_ID, "DE_BMWK");

      // Should still succeed without throwing
      expect(prisma.submissionPackage.create).toHaveBeenCalledTimes(1);
    });

    it("should create submissionPackage with correct data", async () => {
      setupAssembleMocks();

      await assemblePackage(USER_ID, ORG_ID, "DE_BMWK");

      expect(prisma.submissionPackage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: USER_ID,
            organizationId: ORG_ID,
            ncaAuthority: "DE_BMWK",
            packageName:
              "Federal Ministry for Economic Affairs and Climate Action Submission Package",
          }),
        }),
      );
    });

    it("should include NCA authority country in package description", async () => {
      setupAssembleMocks();

      await assemblePackage(USER_ID, ORG_ID, "DE_BMWK");

      const createCall = vi.mocked(prisma.submissionPackage.create).mock
        .calls[0][0] as {
        data: { description: string };
      };
      expect(createCall.data.description).toContain("Germany");
    });
  });

  // ───────────────────────────────────────────────
  //  getPackages
  // ───────────────────────────────────────────────

  describe("getPackages", () => {
    it("should return packages for the user", async () => {
      const mockPackages = [
        { id: "pkg-1", userId: USER_ID, _count: { submissions: 2 } },
        { id: "pkg-2", userId: USER_ID, _count: { submissions: 0 } },
      ];
      vi.mocked(prisma.submissionPackage.findMany).mockResolvedValueOnce(
        mockPackages as never,
      );

      const result = await getPackages(USER_ID);

      expect(result).toHaveLength(2);
      expect(prisma.submissionPackage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID },
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("should include submission count", async () => {
      vi.mocked(prisma.submissionPackage.findMany).mockResolvedValueOnce([
        { id: "pkg-1", _count: { submissions: 3 } },
      ] as never);

      const result = await getPackages(USER_ID);

      expect(result[0]._count.submissions).toBe(3);
    });
  });

  // ───────────────────────────────────────────────
  //  getPackage
  // ───────────────────────────────────────────────

  describe("getPackage", () => {
    it("should return a single package with its submissions", async () => {
      vi.mocked(prisma.submissionPackage.findFirst).mockResolvedValueOnce({
        id: PACKAGE_ID,
        userId: USER_ID,
        submissions: [
          {
            id: "s1",
            status: "SUBMITTED",
            submittedAt: new Date(),
            ncaAuthorityName: "DLR",
          },
        ],
      } as never);

      const result = await getPackage(PACKAGE_ID, USER_ID);

      expect(result.id).toBe(PACKAGE_ID);
      expect(result.submissions).toHaveLength(1);
    });

    it("should throw when package is not found", async () => {
      vi.mocked(prisma.submissionPackage.findFirst).mockResolvedValueOnce(null);

      await expect(getPackage("nonexistent", USER_ID)).rejects.toThrow(
        "Package not found",
      );
    });

    it("should filter by both id and userId", async () => {
      vi.mocked(prisma.submissionPackage.findFirst).mockResolvedValueOnce({
        id: PACKAGE_ID,
        submissions: [],
      } as never);

      await getPackage(PACKAGE_ID, USER_ID);

      expect(prisma.submissionPackage.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PACKAGE_ID, userId: USER_ID },
        }),
      );
    });
  });

  // ───────────────────────────────────────────────
  //  submitPackage
  // ───────────────────────────────────────────────

  describe("submitPackage", () => {
    it("should create a submission from a package", async () => {
      vi.mocked(prisma.submissionPackage.findFirst).mockResolvedValueOnce({
        id: PACKAGE_ID,
        userId: USER_ID,
        ncaAuthority: "DE_BMWK",
        packageName: "BMWK Package",
      } as never);

      const createdSubmission = {
        id: "new-sub-001",
        status: "SUBMITTED",
        packageId: PACKAGE_ID,
      };
      vi.mocked(prisma.nCASubmission.create).mockResolvedValueOnce(
        createdSubmission as never,
      );
      vi.mocked(prisma.submissionPackage.update).mockResolvedValueOnce(
        {} as never,
      );

      const result = await submitPackage(PACKAGE_ID, USER_ID, {
        reportId: "report-001",
        submissionMethod: "PORTAL",
        coverLetter: "Dear NCA, please review.",
        priority: "HIGH",
      });

      expect(result.id).toBe("new-sub-001");
      expect(result.status).toBe("SUBMITTED");
    });

    it("should throw when package is not found", async () => {
      vi.mocked(prisma.submissionPackage.findFirst).mockResolvedValueOnce(null);

      await expect(
        submitPackage("nonexistent", USER_ID, {
          reportId: "r1",
          submissionMethod: "PORTAL",
        }),
      ).rejects.toThrow("Package not found");
    });

    it("should set initial status to SUBMITTED with statusHistory", async () => {
      vi.mocked(prisma.submissionPackage.findFirst).mockResolvedValueOnce({
        id: PACKAGE_ID,
        ncaAuthority: "DE_BMWK",
        packageName: "BMWK Package",
      } as never);
      vi.mocked(prisma.nCASubmission.create).mockResolvedValueOnce({
        id: "sub",
      } as never);
      vi.mocked(prisma.submissionPackage.update).mockResolvedValueOnce(
        {} as never,
      );

      await submitPackage(PACKAGE_ID, USER_ID, {
        reportId: "r1",
        submissionMethod: "EMAIL",
      });

      const createCall = vi.mocked(prisma.nCASubmission.create).mock
        .calls[0][0] as {
        data: {
          status: string;
          statusHistory: string;
          submissionMethod: string;
        };
      };
      expect(createCall.data.status).toBe("SUBMITTED");
      expect(createCall.data.submissionMethod).toBe("EMAIL");

      const parsedHistory = JSON.parse(createCall.data.statusHistory);
      expect(parsedHistory).toHaveLength(1);
      expect(parsedHistory[0].status).toBe("SUBMITTED");
      expect(parsedHistory[0].notes).toContain("BMWK Package");
    });

    it("should default priority to NORMAL when not provided", async () => {
      vi.mocked(prisma.submissionPackage.findFirst).mockResolvedValueOnce({
        id: PACKAGE_ID,
        ncaAuthority: "FR_CNES",
        packageName: "CNES Package",
      } as never);
      vi.mocked(prisma.nCASubmission.create).mockResolvedValueOnce({
        id: "sub",
      } as never);
      vi.mocked(prisma.submissionPackage.update).mockResolvedValueOnce(
        {} as never,
      );

      await submitPackage(PACKAGE_ID, USER_ID, {
        reportId: "r1",
        submissionMethod: "PORTAL",
      });

      const createCall = vi.mocked(prisma.nCASubmission.create).mock
        .calls[0][0] as {
        data: { priority: string };
      };
      expect(createCall.data.priority).toBe("NORMAL");
    });

    it("should mark the package as exported after submission", async () => {
      vi.mocked(prisma.submissionPackage.findFirst).mockResolvedValueOnce({
        id: PACKAGE_ID,
        ncaAuthority: "DE_BMWK",
        packageName: "Package",
      } as never);
      vi.mocked(prisma.nCASubmission.create).mockResolvedValueOnce({
        id: "sub",
      } as never);
      vi.mocked(prisma.submissionPackage.update).mockResolvedValueOnce(
        {} as never,
      );

      await submitPackage(PACKAGE_ID, USER_ID, {
        reportId: "r1",
        submissionMethod: "PORTAL",
      });

      expect(prisma.submissionPackage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PACKAGE_ID },
          data: expect.objectContaining({
            exportedAt: expect.any(Date),
          }),
        }),
      );
    });

    it("should populate ncaAuthorityName and ncaPortalUrl from NCA_AUTHORITY_INFO", async () => {
      vi.mocked(prisma.submissionPackage.findFirst).mockResolvedValueOnce({
        id: PACKAGE_ID,
        ncaAuthority: "FR_CNES",
        packageName: "CNES Package",
      } as never);
      vi.mocked(prisma.nCASubmission.create).mockResolvedValueOnce({
        id: "sub",
      } as never);
      vi.mocked(prisma.submissionPackage.update).mockResolvedValueOnce(
        {} as never,
      );

      await submitPackage(PACKAGE_ID, USER_ID, {
        reportId: "r1",
        submissionMethod: "PORTAL",
      });

      const createCall = vi.mocked(prisma.nCASubmission.create).mock
        .calls[0][0] as {
        data: { ncaAuthorityName: string; ncaPortalUrl: string | null };
      };
      expect(createCall.data.ncaAuthorityName).toBe(
        "Centre National d'Études Spatiales",
      );
      expect(createCall.data.ncaPortalUrl).toBe("https://cnes.fr");
    });

    it("should handle NCA authority with no portalUrl", async () => {
      vi.mocked(prisma.submissionPackage.findFirst).mockResolvedValueOnce({
        id: PACKAGE_ID,
        ncaAuthority: "OTHER",
        packageName: "Other Package",
      } as never);
      vi.mocked(prisma.nCASubmission.create).mockResolvedValueOnce({
        id: "sub",
      } as never);
      vi.mocked(prisma.submissionPackage.update).mockResolvedValueOnce(
        {} as never,
      );

      await submitPackage(PACKAGE_ID, USER_ID, {
        reportId: "r1",
        submissionMethod: "REGISTERED_MAIL",
      });

      const createCall = vi.mocked(prisma.nCASubmission.create).mock
        .calls[0][0] as {
        data: { ncaPortalUrl: string | null };
      };
      expect(createCall.data.ncaPortalUrl).toBeNull();
    });
  });

  // ───────────────────────────────────────────────
  //  getAnalytics
  // ───────────────────────────────────────────────

  describe("getAnalytics", () => {
    it("should return correct total and approval rate", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        {
          ncaAuthority: "DE_BMWK",
          ncaAuthorityName: "BMWK",
          status: "APPROVED",
          submittedAt: new Date("2025-03-01"),
          acknowledgedAt: new Date("2025-03-05"),
        },
        {
          ncaAuthority: "DE_BMWK",
          ncaAuthorityName: "BMWK",
          status: "REJECTED",
          submittedAt: new Date("2025-04-01"),
          acknowledgedAt: null,
        },
        {
          ncaAuthority: "FR_CNES",
          ncaAuthorityName: "CNES",
          status: "APPROVED",
          submittedAt: new Date("2025-05-01"),
          acknowledgedAt: new Date("2025-05-10"),
        },
        {
          ncaAuthority: "FR_CNES",
          ncaAuthorityName: "CNES",
          status: "SUBMITTED",
          submittedAt: new Date("2025-06-01"),
          acknowledgedAt: null,
        },
      ] as never);

      const result = await getAnalytics(USER_ID);

      expect(result.totalSubmissions).toBe(4);
      // Terminal: APPROVED (2) + REJECTED (1) = 3; Approved: 2; Rate: 67%
      expect(result.approvalRate).toBe(67);
    });

    it("should calculate avgResponseDays from acknowledged submissions", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        {
          ncaAuthority: "DE_BMWK",
          ncaAuthorityName: "BMWK",
          status: "APPROVED",
          submittedAt: new Date("2025-06-01"),
          acknowledgedAt: new Date("2025-06-11"),
        },
        {
          ncaAuthority: "FR_CNES",
          ncaAuthorityName: "CNES",
          status: "APPROVED",
          submittedAt: new Date("2025-06-01"),
          acknowledgedAt: new Date("2025-06-06"),
        },
      ] as never);

      const result = await getAnalytics(USER_ID);

      // 10 days + 5 days = 15, count = 2, avg = 8 (rounded)
      expect(result.avgResponseDays).toBe(8);
    });

    it("should return 0 avgResponseDays when no submissions are acknowledged", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        {
          ncaAuthority: "DE_BMWK",
          ncaAuthorityName: "BMWK",
          status: "SUBMITTED",
          submittedAt: new Date(),
          acknowledgedAt: null,
        },
      ] as never);

      const result = await getAnalytics(USER_ID);

      expect(result.avgResponseDays).toBe(0);
    });

    it("should return 0 approvalRate when no terminal submissions exist", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        {
          ncaAuthority: "DE_BMWK",
          ncaAuthorityName: "BMWK",
          status: "SUBMITTED",
          submittedAt: new Date(),
          acknowledgedAt: null,
        },
        {
          ncaAuthority: "FR_CNES",
          ncaAuthorityName: "CNES",
          status: "UNDER_REVIEW",
          submittedAt: new Date(),
          acknowledgedAt: null,
        },
      ] as never);

      const result = await getAnalytics(USER_ID);

      expect(result.approvalRate).toBe(0);
    });

    it("should aggregate byAuthority data correctly", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        {
          ncaAuthority: "DE_BMWK",
          ncaAuthorityName: "BMWK",
          status: "APPROVED",
          submittedAt: new Date("2025-06-01"),
          acknowledgedAt: new Date("2025-06-04"),
        },
        {
          ncaAuthority: "DE_BMWK",
          ncaAuthorityName: "BMWK",
          status: "REJECTED",
          submittedAt: new Date("2025-06-10"),
          acknowledgedAt: null,
        },
        {
          ncaAuthority: "FR_CNES",
          ncaAuthorityName: "CNES",
          status: "APPROVED",
          submittedAt: new Date("2025-05-01"),
          acknowledgedAt: new Date("2025-05-11"),
        },
      ] as never);

      const result = await getAnalytics(USER_ID);

      expect(result.byAuthority).toHaveLength(2);

      const bmwk = result.byAuthority.find((a) => a.authority === "DE_BMWK");
      expect(bmwk).toBeDefined();
      expect(bmwk!.total).toBe(2);
      expect(bmwk!.approved).toBe(1);
      expect(bmwk!.avgDays).toBe(3); // 3 days for the one acknowledged

      const cnes = result.byAuthority.find((a) => a.authority === "FR_CNES");
      expect(cnes).toBeDefined();
      expect(cnes!.total).toBe(1);
      expect(cnes!.approved).toBe(1);
      expect(cnes!.avgDays).toBe(10);
    });

    it("should return 12 months of byMonth data", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce(
        [] as never,
      );

      const result = await getAnalytics(USER_ID);

      expect(result.byMonth).toHaveLength(12);
      // Each entry should have the correct shape
      for (const entry of result.byMonth) {
        expect(entry).toHaveProperty("month");
        expect(entry).toHaveProperty("submitted");
        expect(entry).toHaveProperty("approved");
        expect(entry).toHaveProperty("rejected");
        expect(entry.month).toMatch(/^\d{4}-\d{2}$/);
      }
    });

    it("should categorize submissions by month correctly", async () => {
      const now = new Date();
      // Use local-time month start to match how getAnalytics builds its month keys
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthKey = monthStart.toISOString().slice(0, 7);
      // Place submissions in the middle of the month (safely within the range)
      const submittedAt = new Date(now.getFullYear(), now.getMonth(), 15);

      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        {
          ncaAuthority: "DE_BMWK",
          ncaAuthorityName: "BMWK",
          status: "SUBMITTED",
          submittedAt,
          acknowledgedAt: null,
        },
        {
          ncaAuthority: "DE_BMWK",
          ncaAuthorityName: "BMWK",
          status: "APPROVED",
          submittedAt,
          acknowledgedAt: new Date(),
        },
      ] as never);

      const result = await getAnalytics(USER_ID);

      // The last entry in byMonth should be the current month
      const lastMonth = result.byMonth[result.byMonth.length - 1];
      expect(lastMonth.month).toBe(monthKey);
      expect(lastMonth.submitted).toBe(2);
      expect(lastMonth.approved).toBe(1);
    });

    it("should handle empty submissions gracefully", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce(
        [] as never,
      );

      const result = await getAnalytics(USER_ID);

      expect(result.totalSubmissions).toBe(0);
      expect(result.approvalRate).toBe(0);
      expect(result.avgResponseDays).toBe(0);
      expect(result.byAuthority).toEqual([]);
      expect(result.byMonth).toHaveLength(12);
    });
  });

  // ───────────────────────────────────────────────
  //  getActiveSubmissions
  // ───────────────────────────────────────────────

  describe("getActiveSubmissions", () => {
    it("should return non-terminal submissions with report and correspondence count", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        makeSubmission({ status: "SUBMITTED" }),
        makeSubmission({ id: "s2", status: "UNDER_REVIEW" }),
      ] as never);

      const result = await getActiveSubmissions(USER_ID);

      expect(result).toHaveLength(2);
    });

    it("should filter by userId and exclude terminal statuses", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce(
        [] as never,
      );

      await getActiveSubmissions(USER_ID);

      expect(prisma.nCASubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: USER_ID,
            status: { notIn: ["APPROVED", "REJECTED", "WITHDRAWN"] },
          },
        }),
      );
    });

    it("should order by updatedAt descending", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce(
        [] as never,
      );

      await getActiveSubmissions(USER_ID);

      expect(prisma.nCASubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: "desc" },
        }),
      );
    });
  });

  // ───────────────────────────────────────────────
  //  updatePriority
  // ───────────────────────────────────────────────

  describe("updatePriority", () => {
    it("should update the priority of a submission", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValueOnce(
        makeSubmission() as never,
      );
      vi.mocked(prisma.nCASubmission.update).mockResolvedValueOnce(
        makeSubmission({ priority: "CRITICAL" }) as never,
      );

      const result = await updatePriority(
        SUBMISSION_ID,
        USER_ID,
        "CRITICAL" as never,
      );

      expect(result.priority).toBe("CRITICAL");
      expect(prisma.nCASubmission.update).toHaveBeenCalledWith({
        where: { id: SUBMISSION_ID },
        data: { priority: "CRITICAL" },
      });
    });

    it("should throw when submission is not found", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValueOnce(null);

      await expect(
        updatePriority("nonexistent", USER_ID, "HIGH" as never),
      ).rejects.toThrow("Submission not found");
    });

    it("should verify ownership via userId filter", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValueOnce(
        makeSubmission() as never,
      );
      vi.mocked(prisma.nCASubmission.update).mockResolvedValueOnce({} as never);

      await updatePriority(SUBMISSION_ID, USER_ID, "LOW" as never);

      expect(prisma.nCASubmission.findFirst).toHaveBeenCalledWith({
        where: { id: SUBMISSION_ID, userId: USER_ID },
      });
    });
  });

  // ───────────────────────────────────────────────
  //  getSubmissionWithTimeline
  // ───────────────────────────────────────────────

  describe("getSubmissionWithTimeline", () => {
    it("should return submission with full detail and timeline", async () => {
      const statusHistory = JSON.stringify([
        {
          status: "SUBMITTED",
          timestamp: "2025-06-01T00:00:00Z",
          notes: "Initial",
        },
      ]);

      // First call from getSubmissionWithTimeline
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValueOnce(
        makeSubmission({
          statusHistory,
          correspondence: [
            {
              id: "c1",
              direction: "INBOUND",
              subject: "Ack",
              content: "Acknowledged",
              createdAt: new Date("2025-06-02"),
              messageType: "ACK",
              requiresResponse: false,
            },
          ],
          package: { id: PACKAGE_ID },
        }) as never,
      );

      // Second call from getSubmissionTimeline (called inside getSubmissionWithTimeline)
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValueOnce(
        makeSubmission({
          statusHistory,
          correspondence: [
            {
              id: "c1",
              direction: "INBOUND",
              subject: "Ack",
              content: "Acknowledged",
              createdAt: new Date("2025-06-02"),
              messageType: "ACK",
              requiresResponse: false,
            },
          ],
        }) as never,
      );

      const result = await getSubmissionWithTimeline(SUBMISSION_ID, USER_ID);

      expect(result.submission).toBeDefined();
      expect(result.submission.id).toBe(SUBMISSION_ID);
      expect(result.timeline).toBeInstanceOf(Array);
      expect(result.timeline.length).toBeGreaterThanOrEqual(1);
    });

    it("should throw when submission is not found", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValueOnce(null);

      await expect(
        getSubmissionWithTimeline("nonexistent", USER_ID),
      ).rejects.toThrow("Submission not found");
    });

    it("should include related report and package in submission", async () => {
      vi.mocked(prisma.nCASubmission.findFirst)
        .mockResolvedValueOnce(
          makeSubmission({
            statusHistory: null,
            correspondence: [],
            report: {
              id: "r1",
              title: "Auth Report",
              reportType: "AUTHORIZATION",
              status: "COMPLETED",
              dueDate: null,
            },
            package: { id: "pkg-1", packageName: "Test Package" },
          }) as never,
        )
        // Internal call to getSubmissionTimeline
        .mockResolvedValueOnce(
          makeSubmission({
            statusHistory: null,
            correspondence: [],
          }) as never,
        );

      const result = await getSubmissionWithTimeline(SUBMISSION_ID, USER_ID);

      expect(result.submission.report.title).toBe("Auth Report");
      expect(result.submission.package.id).toBe("pkg-1");
    });
  });

  // ───────────────────────────────────────────────
  //  Edge Cases & Cross-Cutting Concerns
  // ───────────────────────────────────────────────

  describe("Edge Cases", () => {
    it("getPortalDashboard should handle correspondence mapping with all fields", async () => {
      vi.mocked(prisma.nCASubmission.count)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce(
        [] as never,
      );

      vi.mocked(prisma.nCACorrespondence.findMany).mockResolvedValueOnce([
        {
          id: "c1",
          submissionId: "s1",
          subject: "Test Subject",
          direction: "OUTBOUND",
          createdAt: new Date("2025-07-01"),
          isRead: true,
          submission: { ncaAuthority: "IT_ASI" },
        },
      ] as never);

      const result = await getPortalDashboard(USER_ID);

      const corr = result.recentCorrespondence[0];
      expect(corr.id).toBe("c1");
      expect(corr.submissionId).toBe("s1");
      expect(corr.ncaAuthority).toBe("IT_ASI");
      expect(corr.direction).toBe("OUTBOUND");
      expect(corr.isRead).toBe(true);
    });

    it("getSubmissionPipeline should handle unknown status gracefully", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        makeSubmission({
          id: "s1",
          status: "UNKNOWN_STATUS",
          statusHistory: null,
        }),
      ] as never);

      const result = await getSubmissionPipeline(USER_ID);

      // Should not crash; the unknown status just won't be in any bucket
      const allItems = Object.values(result).flat();
      expect(allItems).toHaveLength(0);
    });

    it("assemblePackage should not duplicate assessment docs when vault already has the type", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        operatorType: "SCO",
      } as never);
      vi.mocked(prisma.document.findMany).mockResolvedValueOnce([
        {
          id: "d1",
          name: "Debris Plan",
          category: "debris_mitigation_plan",
          status: "ACTIVE",
        },
      ] as never);
      vi.mocked(prisma.generatedDocument.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.debrisAssessment.findMany).mockResolvedValueOnce([
        { id: "debris-001", complianceScore: 85, updatedAt: new Date() },
      ] as never);
      vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.nIS2Assessment.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.nCADocument.findMany).mockResolvedValueOnce([] as never);
      vi.mocked(prisma.verityAttestation.findMany).mockResolvedValueOnce(
        [] as never,
      );
      vi.mocked(prisma.submissionPackage.create).mockResolvedValueOnce({
        id: PACKAGE_ID,
      } as never);

      const result = await assemblePackage(USER_ID, ORG_ID, "DE_BMWK");

      const debrisDocs = result.documents.filter(
        (d) => d.documentType === "debris_mitigation_plan",
      );
      // Should only have one (from vault), not duplicated by assessment
      expect(debrisDocs).toHaveLength(1);
      expect(debrisDocs[0].sourceType).toBe("vault");
    });

    it("submitPackage should include coverLetter when provided", async () => {
      vi.mocked(prisma.submissionPackage.findFirst).mockResolvedValueOnce({
        id: PACKAGE_ID,
        ncaAuthority: "DE_BMWK",
        packageName: "Package",
      } as never);
      vi.mocked(prisma.nCASubmission.create).mockResolvedValueOnce({
        id: "sub",
      } as never);
      vi.mocked(prisma.submissionPackage.update).mockResolvedValueOnce(
        {} as never,
      );

      await submitPackage(PACKAGE_ID, USER_ID, {
        reportId: "r1",
        submissionMethod: "PORTAL",
        coverLetter: "Dear Authority, please review our compliance package.",
      });

      const createCall = vi.mocked(prisma.nCASubmission.create).mock
        .calls[0][0] as {
        data: { coverLetter: string };
      };
      expect(createCall.data.coverLetter).toBe(
        "Dear Authority, please review our compliance package.",
      );
    });

    it("getAnalytics byAuthority should report 0 avgDays when no submissions are acknowledged for an authority", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValueOnce([
        {
          ncaAuthority: "DE_BMWK",
          ncaAuthorityName: "BMWK",
          status: "SUBMITTED",
          submittedAt: new Date(),
          acknowledgedAt: null,
        },
      ] as never);

      const result = await getAnalytics(USER_ID);

      const bmwk = result.byAuthority.find((a) => a.authority === "DE_BMWK");
      expect(bmwk).toBeDefined();
      expect(bmwk!.avgDays).toBe(0);
    });
  });
});
