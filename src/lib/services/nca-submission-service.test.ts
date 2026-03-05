import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    nCASubmission: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  submitToNCA,
  getSubmission,
  getSubmissions,
  updateSubmissionStatus,
  recordAcknowledgment,
  resendSubmission,
  getSubmissionStats,
  getActiveSubmissions,
  updatePriority,
  getSubmissionStatusLabel,
  getSubmissionStatusColor,
  getSubmissionMethodLabel,
  getNCAAuthorityLabel,
  getNCAAuthorityCountry,
} from "./nca-submission-service";

describe("nca-submission-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitToNCA", () => {
    it("should create a submission with NCA info and status history", async () => {
      const mockSubmission = { id: "sub-1", status: "SUBMITTED" };
      vi.mocked(prisma.nCASubmission.create).mockResolvedValue(
        mockSubmission as never,
      );

      const result = await submitToNCA({
        userId: "user-1",
        reportId: "report-1",
        ncaAuthority: "DE_BMWK" as never,
        submissionMethod: "PORTAL" as never,
        coverLetter: "Dear NCA...",
        attachments: [
          {
            fileName: "report.pdf",
            fileSize: 1024,
            fileUrl: "https://example.com/report.pdf",
          },
        ],
      });

      expect(result).toEqual(mockSubmission);
      expect(prisma.nCASubmission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          reportId: "report-1",
          ncaAuthority: "DE_BMWK",
          ncaAuthorityName:
            "Federal Ministry for Economic Affairs and Climate Action",
          ncaPortalUrl: "https://www.bmwk.de",
          submissionMethod: "PORTAL",
          status: "SUBMITTED",
          coverLetter: "Dear NCA...",
          submittedBy: "user-1",
        }),
      });

      // Check that attachments are JSON stringified
      const callData = vi.mocked(prisma.nCASubmission.create).mock.calls[0][0]
        .data;
      expect(callData.attachments).toBe(
        JSON.stringify([
          {
            fileName: "report.pdf",
            fileSize: 1024,
            fileUrl: "https://example.com/report.pdf",
          },
        ]),
      );

      // Check status history
      const statusHistory = JSON.parse(callData.statusHistory as string);
      expect(statusHistory).toHaveLength(1);
      expect(statusHistory[0].status).toBe("SUBMITTED");
      expect(statusHistory[0].notes).toBe("Initial submission");
    });

    it("should handle submission without attachments", async () => {
      vi.mocked(prisma.nCASubmission.create).mockResolvedValue({} as never);

      await submitToNCA({
        userId: "user-1",
        reportId: "report-1",
        ncaAuthority: "FR_CNES" as never,
        submissionMethod: "EMAIL" as never,
      });

      const callData = vi.mocked(prisma.nCASubmission.create).mock.calls[0][0]
        .data;
      expect(callData.attachments).toBeUndefined();
      expect(callData.ncaAuthorityName).toBe(
        "Centre National d'\u00C9tudes Spatiales",
      );
    });

    it("should set portalUrl to null when authority has no portal", async () => {
      vi.mocked(prisma.nCASubmission.create).mockResolvedValue({} as never);

      await submitToNCA({
        userId: "user-1",
        reportId: "report-1",
        ncaAuthority: "OTHER" as never,
        submissionMethod: "EMAIL" as never,
      });

      const callData = vi.mocked(prisma.nCASubmission.create).mock.calls[0][0]
        .data;
      expect(callData.ncaPortalUrl).toBeNull();
    });
  });

  describe("getSubmission", () => {
    it("should find submission by id and userId", async () => {
      const mockSubmission = {
        id: "sub-1",
        userId: "user-1",
        report: {
          id: "r-1",
          reportType: "ANNUAL",
          title: "Test",
          status: "COMPLETE",
          dueDate: null,
        },
      };
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue(
        mockSubmission as never,
      );

      const result = await getSubmission("sub-1", "user-1");

      expect(result).toEqual(mockSubmission);
      expect(prisma.nCASubmission.findFirst).toHaveBeenCalledWith({
        where: { id: "sub-1", userId: "user-1" },
        include: {
          report: {
            select: {
              id: true,
              reportType: true,
              title: true,
              status: true,
              dueDate: true,
            },
          },
        },
      });
    });

    it("should return null when submission not found", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue(null);

      const result = await getSubmission("nonexistent", "user-1");

      expect(result).toBeNull();
    });
  });

  describe("getSubmissions", () => {
    it("should return submissions with total count", async () => {
      const mockSubmissions = [{ id: "sub-1" }, { id: "sub-2" }];
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValue(
        mockSubmissions as never,
      );
      vi.mocked(prisma.nCASubmission.count).mockResolvedValue(2);

      const result = await getSubmissions("user-1");

      expect(result.submissions).toEqual(mockSubmissions);
      expect(result.total).toBe(2);
    });

    it("should apply filters when provided", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValue([]);
      vi.mocked(prisma.nCASubmission.count).mockResolvedValue(0);

      const fromDate = new Date("2026-01-01");
      const toDate = new Date("2026-03-01");

      await getSubmissions("user-1", {
        reportId: "report-1",
        ncaAuthority: "DE_BMWK" as never,
        status: "SUBMITTED" as never,
        fromDate,
        toDate,
        limit: 10,
        offset: 5,
      });

      expect(prisma.nCASubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            reportId: "report-1",
            ncaAuthority: "DE_BMWK",
            status: "SUBMITTED",
            submittedAt: { gte: fromDate, lte: toDate },
          }),
          take: 10,
          skip: 5,
        }),
      );
    });

    it("should apply only fromDate when toDate not provided", async () => {
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValue([]);
      vi.mocked(prisma.nCASubmission.count).mockResolvedValue(0);

      const fromDate = new Date("2026-01-01");

      await getSubmissions("user-1", { fromDate });

      const callWhere = vi.mocked(prisma.nCASubmission.findMany).mock
        .calls[0][0].where;
      expect(callWhere.submittedAt).toEqual({ gte: fromDate });
    });
  });

  describe("updateSubmissionStatus", () => {
    it("should update status and append to status history", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue({
        id: "sub-1",
        userId: "user-1",
        statusHistory: JSON.stringify([
          {
            status: "SUBMITTED",
            timestamp: "2026-03-01T00:00:00Z",
            notes: "Initial",
          },
        ]),
      } as never);
      vi.mocked(prisma.nCASubmission.update).mockResolvedValue({} as never);

      await updateSubmissionStatus("sub-1", "user-1", {
        status: "UNDER_REVIEW" as never,
        notes: "NCA reviewing",
      });

      const updateCall = vi.mocked(prisma.nCASubmission.update).mock
        .calls[0][0];
      expect(updateCall.where).toEqual({ id: "sub-1" });

      const history = JSON.parse(updateCall.data.statusHistory as string);
      expect(history).toHaveLength(2);
      expect(history[1].status).toBe("UNDER_REVIEW");
      expect(history[1].notes).toBe("NCA reviewing");
    });

    it("should throw when submission not found", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue(null);

      await expect(
        updateSubmissionStatus("nonexistent", "user-1", {
          status: "UNDER_REVIEW" as never,
        }),
      ).rejects.toThrow("Submission not found");
    });

    it("should set acknowledgedAt for ACKNOWLEDGED status", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue({
        id: "sub-1",
        statusHistory: JSON.stringify([]),
      } as never);
      vi.mocked(prisma.nCASubmission.update).mockResolvedValue({} as never);

      await updateSubmissionStatus("sub-1", "user-1", {
        status: "ACKNOWLEDGED" as never,
        ncaReference: "NCA-2026-001",
        acknowledgedBy: "Inspector Mueller",
      });

      const data = vi.mocked(prisma.nCASubmission.update).mock.calls[0][0].data;
      expect(data.acknowledgedAt).toBeInstanceOf(Date);
      expect(data.acknowledgedBy).toBe("Inspector Mueller");
      expect(data.ncaReference).toBe("NCA-2026-001");
    });

    it("should set acknowledgedAt for APPROVED status", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue({
        id: "sub-1",
        statusHistory: JSON.stringify([]),
      } as never);
      vi.mocked(prisma.nCASubmission.update).mockResolvedValue({} as never);

      await updateSubmissionStatus("sub-1", "user-1", {
        status: "APPROVED" as never,
      });

      const data = vi.mocked(prisma.nCASubmission.update).mock.calls[0][0].data;
      expect(data.acknowledgedAt).toBeInstanceOf(Date);
    });

    it("should set rejectedAt for REJECTED status", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue({
        id: "sub-1",
        statusHistory: JSON.stringify([]),
      } as never);
      vi.mocked(prisma.nCASubmission.update).mockResolvedValue({} as never);

      await updateSubmissionStatus("sub-1", "user-1", {
        status: "REJECTED" as never,
        rejectionReason: "Incomplete data",
      });

      const data = vi.mocked(prisma.nCASubmission.update).mock.calls[0][0].data;
      expect(data.rejectedAt).toBeInstanceOf(Date);
      expect(data.rejectionReason).toBe("Incomplete data");
    });

    it("should handle followUp fields", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue({
        id: "sub-1",
        statusHistory: JSON.stringify([]),
      } as never);
      vi.mocked(prisma.nCASubmission.update).mockResolvedValue({} as never);

      const followUpDeadline = new Date("2026-06-01");
      await updateSubmissionStatus("sub-1", "user-1", {
        status: "INFORMATION_REQUESTED" as never,
        followUpRequired: true,
        followUpDeadline,
        followUpNotes: "Provide debris plan",
      });

      const data = vi.mocked(prisma.nCASubmission.update).mock.calls[0][0].data;
      expect(data.followUpRequired).toBe(true);
      expect(data.followUpDeadline).toEqual(followUpDeadline);
      expect(data.followUpNotes).toBe("Provide debris plan");
    });

    it("should handle null statusHistory on existing submission", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue({
        id: "sub-1",
        statusHistory: null,
      } as never);
      vi.mocked(prisma.nCASubmission.update).mockResolvedValue({} as never);

      await updateSubmissionStatus("sub-1", "user-1", {
        status: "RECEIVED" as never,
      });

      const history = JSON.parse(
        vi.mocked(prisma.nCASubmission.update).mock.calls[0][0].data
          .statusHistory as string,
      );
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe("RECEIVED");
    });
  });

  describe("recordAcknowledgment", () => {
    it("should call updateSubmissionStatus with ACKNOWLEDGED status", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue({
        id: "sub-1",
        statusHistory: JSON.stringify([]),
      } as never);
      vi.mocked(prisma.nCASubmission.update).mockResolvedValue({} as never);

      await recordAcknowledgment("sub-1", "user-1", {
        ncaReference: "REF-123",
        acknowledgedBy: "Inspector",
        notes: "All good",
      });

      const data = vi.mocked(prisma.nCASubmission.update).mock.calls[0][0].data;
      expect(data.status).toBe("ACKNOWLEDGED");
      expect(data.ncaReference).toBe("REF-123");
      expect(data.acknowledgedBy).toBe("Inspector");
      expect(data.acknowledgedAt).toBeInstanceOf(Date);
    });
  });

  describe("resendSubmission", () => {
    it("should create a new submission linked to original", async () => {
      const original = {
        id: "sub-orig",
        userId: "user-1",
        reportId: "report-1",
        ncaAuthority: "DE_BMWK",
        ncaAuthorityName: "Federal Ministry",
        ncaPortalUrl: "https://www.bmwk.de",
        submissionMethod: "PORTAL",
        coverLetter: "Original letter",
        attachments: JSON.stringify([
          {
            fileName: "old.pdf",
            fileSize: 512,
            fileUrl: "https://example.com/old.pdf",
          },
        ]),
        resendCount: 0,
      };

      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue(
        original as never,
      );
      vi.mocked(prisma.nCASubmission.create).mockResolvedValue({
        id: "sub-resend",
      } as never);
      vi.mocked(prisma.nCASubmission.update).mockResolvedValue({} as never);

      const result = await resendSubmission("sub-orig", "user-1", {
        coverLetter: "Updated letter",
        additionalAttachments: [
          {
            fileName: "new.pdf",
            fileSize: 256,
            fileUrl: "https://example.com/new.pdf",
          },
        ],
      });

      expect(result).toEqual({ id: "sub-resend" });

      const createData = vi.mocked(prisma.nCASubmission.create).mock.calls[0][0]
        .data;
      expect(createData.originalSubmissionId).toBe("sub-orig");
      expect(createData.resendCount).toBe(1);
      expect(createData.coverLetter).toBe("Updated letter");
      expect(createData.reportId).toBe("report-1");

      // Should combine original + new attachments
      const attachments = JSON.parse(createData.attachments as string);
      expect(attachments).toHaveLength(2);

      // Should update original submission resend count
      expect(prisma.nCASubmission.update).toHaveBeenCalledWith({
        where: { id: "sub-orig" },
        data: { resendCount: 1 },
      });
    });

    it("should throw when original submission not found", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue(null);

      await expect(resendSubmission("nonexistent", "user-1")).rejects.toThrow(
        "Original submission not found",
      );
    });

    it("should handle original without attachments", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue({
        id: "sub-noatt",
        userId: "user-1",
        reportId: "r-1",
        ncaAuthority: "FR_CNES",
        ncaAuthorityName: "CNES",
        ncaPortalUrl: "https://cnes.fr",
        submissionMethod: "EMAIL",
        coverLetter: null,
        attachments: null,
        resendCount: 0,
      } as never);
      vi.mocked(prisma.nCASubmission.create).mockResolvedValue({} as never);
      vi.mocked(prisma.nCASubmission.update).mockResolvedValue({} as never);

      await resendSubmission("sub-noatt", "user-1");

      const createData = vi.mocked(prisma.nCASubmission.create).mock.calls[0][0]
        .data;
      // No attachments
      expect(createData.attachments).toBeUndefined();
    });
  });

  describe("getSubmissionStats", () => {
    it("should aggregate stats by status and authority", async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      vi.mocked(prisma.nCASubmission.count)
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(2); // pendingFollowUps

      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValue([
        {
          status: "SUBMITTED",
          ncaAuthority: "DE_BMWK",
          submittedAt: new Date(),
        },
        {
          status: "SUBMITTED",
          ncaAuthority: "DE_BMWK",
          submittedAt: new Date(),
        },
        {
          status: "ACKNOWLEDGED",
          ncaAuthority: "FR_CNES",
          submittedAt: new Date(),
        },
        {
          status: "REJECTED",
          ncaAuthority: "DE_BMWK",
          submittedAt: new Date("2025-01-01"),
        },
        {
          status: "APPROVED",
          ncaAuthority: "FR_CNES",
          submittedAt: new Date(),
        },
      ] as never);

      const result = await getSubmissionStats("user-1");

      expect(result.total).toBe(5);
      expect(result.byStatus.SUBMITTED).toBe(2);
      expect(result.byStatus.ACKNOWLEDGED).toBe(1);
      expect(result.byStatus.REJECTED).toBe(1);
      expect(result.byStatus.APPROVED).toBe(1);
      expect(result.byAuthority.DE_BMWK).toBe(3);
      expect(result.byAuthority.FR_CNES).toBe(2);
      expect(result.pendingFollowUps).toBe(2);
      // Recent: 4 out of 5 are within 30 days (one is from 2025-01-01)
      expect(result.recentSubmissions).toBe(4);
    });
  });

  describe("getActiveSubmissions", () => {
    it("should return non-terminal submissions", async () => {
      const mockActive = [
        { id: "sub-a1", status: "SUBMITTED" },
        { id: "sub-a2", status: "UNDER_REVIEW" },
      ];
      vi.mocked(prisma.nCASubmission.findMany).mockResolvedValue(
        mockActive as never,
      );

      const result = await getActiveSubmissions("user-1");

      expect(result).toEqual(mockActive);
      expect(prisma.nCASubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "user-1",
            status: { notIn: ["APPROVED", "REJECTED", "WITHDRAWN"] },
          },
          orderBy: { updatedAt: "desc" },
        }),
      );
    });
  });

  describe("updatePriority", () => {
    it("should update submission priority", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue({
        id: "sub-1",
      } as never);
      vi.mocked(prisma.nCASubmission.update).mockResolvedValue({
        id: "sub-1",
        priority: "URGENT",
      } as never);

      const result = await updatePriority("sub-1", "user-1", "URGENT" as never);

      expect(result.priority).toBe("URGENT");
      expect(prisma.nCASubmission.update).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: { priority: "URGENT" },
      });
    });

    it("should throw when submission not found", async () => {
      vi.mocked(prisma.nCASubmission.findFirst).mockResolvedValue(null);

      await expect(
        updatePriority("nonexistent", "user-1", "HIGH" as never),
      ).rejects.toThrow("Submission not found");
    });
  });

  describe("getSubmissionStatusLabel", () => {
    it("should return correct labels for all statuses", () => {
      expect(getSubmissionStatusLabel("DRAFT" as never)).toBe("Draft");
      expect(getSubmissionStatusLabel("SUBMITTED" as never)).toBe("Submitted");
      expect(getSubmissionStatusLabel("RECEIVED" as never)).toBe("Received");
      expect(getSubmissionStatusLabel("UNDER_REVIEW" as never)).toBe(
        "Under Review",
      );
      expect(getSubmissionStatusLabel("INFORMATION_REQUESTED" as never)).toBe(
        "Information Requested",
      );
      expect(getSubmissionStatusLabel("ACKNOWLEDGED" as never)).toBe(
        "Acknowledged",
      );
      expect(getSubmissionStatusLabel("APPROVED" as never)).toBe("Approved");
      expect(getSubmissionStatusLabel("REJECTED" as never)).toBe("Rejected");
      expect(getSubmissionStatusLabel("WITHDRAWN" as never)).toBe("Withdrawn");
    });

    it("should return the status itself for unknown status", () => {
      expect(getSubmissionStatusLabel("UNKNOWN" as never)).toBe("UNKNOWN");
    });
  });

  describe("getSubmissionStatusColor", () => {
    it("should return correct colors", () => {
      expect(getSubmissionStatusColor("DRAFT" as never)).toBe("gray");
      expect(getSubmissionStatusColor("SUBMITTED" as never)).toBe("blue");
      expect(getSubmissionStatusColor("RECEIVED" as never)).toBe("cyan");
      expect(getSubmissionStatusColor("UNDER_REVIEW" as never)).toBe("yellow");
      expect(getSubmissionStatusColor("INFORMATION_REQUESTED" as never)).toBe(
        "orange",
      );
      expect(getSubmissionStatusColor("ACKNOWLEDGED" as never)).toBe("green");
      expect(getSubmissionStatusColor("APPROVED" as never)).toBe("green");
      expect(getSubmissionStatusColor("REJECTED" as never)).toBe("red");
      expect(getSubmissionStatusColor("WITHDRAWN" as never)).toBe("gray");
    });

    it("should return gray for unknown status", () => {
      expect(getSubmissionStatusColor("UNKNOWN" as never)).toBe("gray");
    });
  });

  describe("getSubmissionMethodLabel", () => {
    it("should return correct labels", () => {
      expect(getSubmissionMethodLabel("PORTAL" as never)).toBe("Online Portal");
      expect(getSubmissionMethodLabel("EMAIL" as never)).toBe("Email");
      expect(getSubmissionMethodLabel("API" as never)).toBe("API Integration");
      expect(getSubmissionMethodLabel("REGISTERED_MAIL" as never)).toBe(
        "Registered Mail",
      );
      expect(getSubmissionMethodLabel("IN_PERSON" as never)).toBe("In Person");
    });

    it("should return the method itself for unknown method", () => {
      expect(getSubmissionMethodLabel("UNKNOWN" as never)).toBe("UNKNOWN");
    });
  });

  describe("getNCAAuthorityLabel", () => {
    it("should return authority name", () => {
      expect(getNCAAuthorityLabel("DE_BMWK" as never)).toBe(
        "Federal Ministry for Economic Affairs and Climate Action",
      );
      expect(getNCAAuthorityLabel("FR_CNES" as never)).toBe(
        "Centre National d'\u00C9tudes Spatiales",
      );
      expect(getNCAAuthorityLabel("EUSPA" as never)).toBe(
        "EU Agency for the Space Programme",
      );
    });

    it("should return authority key for unknown authority", () => {
      expect(getNCAAuthorityLabel("UNKNOWN" as never)).toBe("UNKNOWN");
    });
  });

  describe("getNCAAuthorityCountry", () => {
    it("should return correct countries", () => {
      expect(getNCAAuthorityCountry("DE_BMWK" as never)).toBe("Germany");
      expect(getNCAAuthorityCountry("FR_CNES" as never)).toBe("France");
      expect(getNCAAuthorityCountry("IT_ASI" as never)).toBe("Italy");
      expect(getNCAAuthorityCountry("EUSPA" as never)).toBe("EU");
      expect(getNCAAuthorityCountry("OTHER" as never)).toBe("Other");
    });

    it("should return Unknown for unknown authority", () => {
      expect(getNCAAuthorityCountry("UNKNOWN" as never)).toBe("Unknown");
    });
  });
});
