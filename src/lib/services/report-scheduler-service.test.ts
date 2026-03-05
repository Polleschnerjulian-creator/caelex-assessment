/**
 * Report Scheduler Service Tests
 *
 * Tests: cron parsing, CRUD operations, archiving, cleanup, and pure helper functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    scheduledReport: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      fields: { maxRetries: "maxRetries" },
    },
    reportArchive: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import {
  getNextRunTime,
  describeCronSchedule,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  getScheduledReport,
  getScheduledReports,
  getDueReports,
  markReportRunSuccess,
  markReportRunFailure,
  archiveReport,
  getReportArchive,
  getReportArchives,
  deleteReportArchive,
  recordArchiveDownload,
  cleanupExpiredArchives,
  getReportTypeLabel,
  getDefaultScheduleForType,
  getMimeTypeForFormat,
  getFileExtensionForFormat,
} from "./report-scheduler-service";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  scheduledReport: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    fields: { maxRetries: string };
  };
  reportArchive: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
};

describe("Report Scheduler Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── getNextRunTime ─────────────────────────────────────────────────────────

  describe("getNextRunTime", () => {
    it("calculates next run for daily schedule '0 0 * * *'", () => {
      // fromDate: 2024-06-15 10:30:00 UTC
      const from = new Date("2024-06-15T10:30:00Z");
      const next = getNextRunTime("0 0 * * *", from);

      // Next midnight should be 2024-06-16 00:00:00
      expect(next.getHours()).toBe(0);
      expect(next.getMinutes()).toBe(0);
      expect(next.getTime()).toBeGreaterThan(from.getTime());
    });

    it("calculates next run for weekly schedule '0 9 * * 1' (Monday 9am)", () => {
      // 2024-06-12 is a Wednesday
      const from = new Date("2024-06-12T10:00:00Z");
      const next = getNextRunTime("0 9 * * 1", from);

      expect(next.getDay()).toBe(1); // Monday
      expect(next.getHours()).toBe(9);
      expect(next.getMinutes()).toBe(0);
      expect(next.getTime()).toBeGreaterThan(from.getTime());
    });

    it("calculates next run for monthly schedule '0 0 1 * *'", () => {
      // fromDate: 2024-06-15 (mid-month)
      const from = new Date("2024-06-15T00:00:00Z");
      const next = getNextRunTime("0 0 1 * *", from);

      expect(next.getDate()).toBe(1);
      expect(next.getHours()).toBe(0);
      expect(next.getMinutes()).toBe(0);
      // Should land on July 1st since we're past June 1st
      expect(next.getMonth()).toBe(6); // July (0-indexed)
    });

    it("calculates next run for step expression '*/5 * * * *'", () => {
      // fromDate at minute 12 => next match is minute 15
      const from = new Date("2024-06-15T10:12:00Z");
      const next = getNextRunTime("*/5 * * * *", from);

      // Next minute divisible by 5 after minute 12 is minute 15
      expect(next.getMinutes() % 5).toBe(0);
      expect(next.getTime()).toBeGreaterThan(from.getTime());
    });

    it("throws on invalid cron expression with wrong number of fields", () => {
      expect(() => getNextRunTime("0 0 *")).toThrow("Invalid cron expression");
    });

    it("throws on cron expression with 6 fields", () => {
      expect(() => getNextRunTime("0 0 * * * *")).toThrow(
        "Invalid cron expression",
      );
    });

    it("always returns a date after fromDate", () => {
      const from = new Date("2024-01-01T00:00:00Z");
      const next = getNextRunTime("0 0 * * *", from);
      expect(next.getTime()).toBeGreaterThan(from.getTime());
    });
  });

  // ─── describeCronSchedule ──────────────────────────────────────────────────

  describe("describeCronSchedule", () => {
    it("returns 'Monthly on the 1st at midnight' for '0 0 1 * *'", () => {
      expect(describeCronSchedule("0 0 1 * *")).toBe(
        "Monthly on the 1st at midnight",
      );
    });

    it("returns 'Daily at midnight' for '0 0 * * *'", () => {
      expect(describeCronSchedule("0 0 * * *")).toBe("Daily at midnight");
    });

    it("returns 'Weekly on Monday at 9:00 AM' for '0 9 * * 1'", () => {
      expect(describeCronSchedule("0 9 * * 1")).toBe(
        "Weekly on Monday at 9:00 AM",
      );
    });

    it("returns 'Quarterly on the 1st at midnight' for '0 0 1 1,4,7,10 *'", () => {
      expect(describeCronSchedule("0 0 1 1,4,7,10 *")).toBe(
        "Quarterly on the 1st at midnight",
      );
    });

    it("returns 'Annually on January 1st at midnight' for '0 0 1 1 *'", () => {
      expect(describeCronSchedule("0 0 1 1 *")).toBe(
        "Annually on January 1st at midnight",
      );
    });

    it("returns the raw expression for an invalid cron expression", () => {
      const invalid = "not a cron";
      expect(describeCronSchedule(invalid)).toBe(invalid);
    });

    it("returns a generic description for non-standard patterns", () => {
      const result = describeCronSchedule("30 14 * * *");
      expect(result).toContain("14:30");
    });
  });

  // ─── createScheduledReport ─────────────────────────────────────────────────

  describe("createScheduledReport", () => {
    it("creates a report with correct defaults", async () => {
      const mockReport = {
        id: "report-1",
        userId: "user-1",
        name: "Weekly Compliance",
        reportType: "COMPLIANCE_SUMMARY",
        schedule: "0 9 * * 1",
        timezone: "UTC",
        nextRunAt: new Date(),
        recipients: [],
        sendToSelf: true,
        format: "PDF",
        includeCharts: true,
        filters: null,
      };
      mockPrisma.scheduledReport.create.mockResolvedValue(mockReport);

      const result = await createScheduledReport({
        userId: "user-1",
        name: "Weekly Compliance",
        reportType: "COMPLIANCE_SUMMARY" as never,
        schedule: "0 9 * * 1",
      });

      expect(result).toEqual(mockReport);
      expect(mockPrisma.scheduledReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-1",
          name: "Weekly Compliance",
          reportType: "COMPLIANCE_SUMMARY",
          schedule: "0 9 * * 1",
          timezone: "UTC",
          recipients: [],
          sendToSelf: true,
          format: "PDF",
          includeCharts: true,
          filters: null,
        }),
      });
    });

    it("calculates nextRunAt from the schedule", async () => {
      mockPrisma.scheduledReport.create.mockResolvedValue({ id: "report-1" });

      await createScheduledReport({
        userId: "user-1",
        name: "Daily Report",
        reportType: "MONTHLY_DIGEST" as never,
        schedule: "0 0 * * *",
      });

      const createCall = mockPrisma.scheduledReport.create.mock.calls[0][0];
      expect(createCall.data.nextRunAt).toBeInstanceOf(Date);
      expect(createCall.data.nextRunAt.getMinutes()).toBe(0);
      expect(createCall.data.nextRunAt.getHours()).toBe(0);
    });

    it("uses provided optional values instead of defaults", async () => {
      mockPrisma.scheduledReport.create.mockResolvedValue({ id: "report-2" });

      await createScheduledReport({
        userId: "user-1",
        name: "Custom Report",
        reportType: "AUDIT_TRAIL" as never,
        schedule: "0 0 1 * *",
        timezone: "Europe/Berlin",
        recipients: ["admin@example.com"],
        sendToSelf: false,
        format: "CSV" as never,
        includeCharts: false,
        filters: { status: "active" },
      });

      const createCall = mockPrisma.scheduledReport.create.mock.calls[0][0];
      expect(createCall.data.timezone).toBe("Europe/Berlin");
      expect(createCall.data.recipients).toEqual(["admin@example.com"]);
      expect(createCall.data.sendToSelf).toBe(false);
      expect(createCall.data.format).toBe("CSV");
      expect(createCall.data.includeCharts).toBe(false);
      expect(createCall.data.filters).toBe(
        JSON.stringify({ status: "active" }),
      );
    });
  });

  // ─── updateScheduledReport ─────────────────────────────────────────────────

  describe("updateScheduledReport", () => {
    it("updates only changed fields", async () => {
      mockPrisma.scheduledReport.update.mockResolvedValue({ id: "report-1" });

      await updateScheduledReport("report-1", "user-1", {
        name: "Updated Name",
      });

      const updateCall = mockPrisma.scheduledReport.update.mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: "report-1", userId: "user-1" });
      expect(updateCall.data).toEqual({ name: "Updated Name" });
      // Should NOT have schedule or nextRunAt since schedule was not changed
      expect(updateCall.data.schedule).toBeUndefined();
      expect(updateCall.data.nextRunAt).toBeUndefined();
    });

    it("recalculates nextRunAt when schedule changes", async () => {
      mockPrisma.scheduledReport.update.mockResolvedValue({ id: "report-1" });

      await updateScheduledReport("report-1", "user-1", {
        schedule: "0 0 1 * *",
      });

      const updateCall = mockPrisma.scheduledReport.update.mock.calls[0][0];
      expect(updateCall.data.schedule).toBe("0 0 1 * *");
      expect(updateCall.data.nextRunAt).toBeInstanceOf(Date);
    });

    it("does not recalculate nextRunAt when schedule is not changed", async () => {
      mockPrisma.scheduledReport.update.mockResolvedValue({ id: "report-1" });

      await updateScheduledReport("report-1", "user-1", {
        isActive: false,
      });

      const updateCall = mockPrisma.scheduledReport.update.mock.calls[0][0];
      expect(updateCall.data.isActive).toBe(false);
      expect(updateCall.data.nextRunAt).toBeUndefined();
    });

    it("handles multiple field updates simultaneously", async () => {
      mockPrisma.scheduledReport.update.mockResolvedValue({ id: "report-1" });

      await updateScheduledReport("report-1", "user-1", {
        name: "New Name",
        timezone: "America/New_York",
        recipients: ["a@b.com"],
        sendToSelf: false,
        format: "XLSX" as never,
        includeCharts: false,
        filters: { year: 2024 },
        isActive: true,
      });

      const updateCall = mockPrisma.scheduledReport.update.mock.calls[0][0];
      expect(updateCall.data.name).toBe("New Name");
      expect(updateCall.data.timezone).toBe("America/New_York");
      expect(updateCall.data.recipients).toEqual(["a@b.com"]);
      expect(updateCall.data.sendToSelf).toBe(false);
      expect(updateCall.data.format).toBe("XLSX");
      expect(updateCall.data.includeCharts).toBe(false);
      expect(updateCall.data.filters).toBe(JSON.stringify({ year: 2024 }));
      expect(updateCall.data.isActive).toBe(true);
    });
  });

  // ─── archiveReport ─────────────────────────────────────────────────────────

  describe("archiveReport", () => {
    it("computes SHA-256 checksum of the file buffer", async () => {
      const fileBuffer = Buffer.from("test report content");
      const expectedChecksum = createHash("sha256")
        .update(fileBuffer)
        .digest("hex");

      mockPrisma.reportArchive.create.mockResolvedValue({ id: "archive-1" });

      await archiveReport({
        userId: "user-1",
        reportType: "COMPLIANCE_SUMMARY" as never,
        title: "June Compliance Report",
        fileBuffer,
        fileName: "report.pdf",
        mimeType: "application/pdf",
      });

      const createCall = mockPrisma.reportArchive.create.mock.calls[0][0];
      expect(createCall.data.checksum).toBe(expectedChecksum);
    });

    it("stores the correct file size", async () => {
      const fileBuffer = Buffer.from("A".repeat(1024));
      mockPrisma.reportArchive.create.mockResolvedValue({ id: "archive-2" });

      await archiveReport({
        userId: "user-1",
        reportType: "AUDIT_TRAIL" as never,
        title: "Audit Trail",
        fileBuffer,
        fileName: "audit.csv",
        mimeType: "text/csv",
      });

      const createCall = mockPrisma.reportArchive.create.mock.calls[0][0];
      expect(createCall.data.fileSize).toBe(1024);
    });

    it("stores all provided metadata correctly", async () => {
      const fileBuffer = Buffer.from("data");
      const periodStart = new Date("2024-01-01");
      const periodEnd = new Date("2024-03-31");
      const expiresAt = new Date("2025-01-01");

      mockPrisma.reportArchive.create.mockResolvedValue({ id: "archive-3" });

      await archiveReport({
        userId: "user-1",
        reportType: "QUARTERLY_REVIEW" as never,
        title: "Q1 Review",
        description: "First quarter review",
        fileBuffer,
        fileName: "q1-review.pdf",
        mimeType: "application/pdf",
        scheduledReportId: "sched-1",
        periodStart,
        periodEnd,
        metadata: { quarter: 1 },
        expiresAt,
      });

      const createCall = mockPrisma.reportArchive.create.mock.calls[0][0];
      expect(createCall.data.userId).toBe("user-1");
      expect(createCall.data.reportType).toBe("QUARTERLY_REVIEW");
      expect(createCall.data.title).toBe("Q1 Review");
      expect(createCall.data.description).toBe("First quarter review");
      expect(createCall.data.fileName).toBe("q1-review.pdf");
      expect(createCall.data.mimeType).toBe("application/pdf");
      expect(createCall.data.scheduledReportId).toBe("sched-1");
      expect(createCall.data.periodStart).toEqual(periodStart);
      expect(createCall.data.periodEnd).toEqual(periodEnd);
      expect(createCall.data.metadata).toBe(JSON.stringify({ quarter: 1 }));
      expect(createCall.data.expiresAt).toEqual(expiresAt);
    });

    it("generates a storage path containing userId and fileName", async () => {
      const fileBuffer = Buffer.from("data");
      mockPrisma.reportArchive.create.mockResolvedValue({ id: "archive-4" });

      await archiveReport({
        userId: "user-42",
        reportType: "DOCUMENT_INVENTORY" as never,
        title: "Doc Inventory",
        fileBuffer,
        fileName: "inventory.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const createCall = mockPrisma.reportArchive.create.mock.calls[0][0];
      expect(createCall.data.storagePath).toContain("user-42");
      expect(createCall.data.storagePath).toContain("inventory.xlsx");
      expect(createCall.data.storagePath).toMatch(/^\/reports\//);
    });

    it("sets metadata to null when not provided", async () => {
      const fileBuffer = Buffer.from("data");
      mockPrisma.reportArchive.create.mockResolvedValue({ id: "archive-5" });

      await archiveReport({
        userId: "user-1",
        reportType: "COMPLIANCE_SUMMARY" as never,
        title: "Report",
        fileBuffer,
        fileName: "report.pdf",
        mimeType: "application/pdf",
      });

      const createCall = mockPrisma.reportArchive.create.mock.calls[0][0];
      expect(createCall.data.metadata).toBeNull();
    });
  });

  // ─── cleanupExpiredArchives ────────────────────────────────────────────────

  describe("cleanupExpiredArchives", () => {
    it("calls deleteMany with correct filter for expired, non-archived reports", async () => {
      mockPrisma.reportArchive.deleteMany.mockResolvedValue({ count: 5 });

      const result = await cleanupExpiredArchives();

      expect(mockPrisma.reportArchive.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lte: expect.any(Date) },
          isArchived: false,
        },
      });
      expect(result).toBe(5);
    });

    it("returns 0 when no expired archives exist", async () => {
      mockPrisma.reportArchive.deleteMany.mockResolvedValue({ count: 0 });

      const result = await cleanupExpiredArchives();

      expect(result).toBe(0);
    });
  });

  // ─── getReportTypeLabel ────────────────────────────────────────────────────

  describe("getReportTypeLabel", () => {
    it("returns 'Compliance Summary' for COMPLIANCE_SUMMARY", () => {
      expect(getReportTypeLabel("COMPLIANCE_SUMMARY" as never)).toBe(
        "Compliance Summary",
      );
    });

    it("returns 'Monthly Digest' for MONTHLY_DIGEST", () => {
      expect(getReportTypeLabel("MONTHLY_DIGEST" as never)).toBe(
        "Monthly Digest",
      );
    });

    it("returns 'Quarterly Review' for QUARTERLY_REVIEW", () => {
      expect(getReportTypeLabel("QUARTERLY_REVIEW" as never)).toBe(
        "Quarterly Review",
      );
    });

    it("returns 'Annual Compliance Report' for ANNUAL_COMPLIANCE", () => {
      expect(getReportTypeLabel("ANNUAL_COMPLIANCE" as never)).toBe(
        "Annual Compliance Report",
      );
    });

    it("returns 'Incident Digest' for INCIDENT_DIGEST", () => {
      expect(getReportTypeLabel("INCIDENT_DIGEST" as never)).toBe(
        "Incident Digest",
      );
    });

    it("returns 'Authorization Status' for AUTHORIZATION_STATUS", () => {
      expect(getReportTypeLabel("AUTHORIZATION_STATUS" as never)).toBe(
        "Authorization Status",
      );
    });

    it("returns 'Document Inventory' for DOCUMENT_INVENTORY", () => {
      expect(getReportTypeLabel("DOCUMENT_INVENTORY" as never)).toBe(
        "Document Inventory",
      );
    });

    it("returns 'Deadline Forecast' for DEADLINE_FORECAST", () => {
      expect(getReportTypeLabel("DEADLINE_FORECAST" as never)).toBe(
        "Deadline Forecast",
      );
    });

    it("returns 'Audit Trail' for AUDIT_TRAIL", () => {
      expect(getReportTypeLabel("AUDIT_TRAIL" as never)).toBe("Audit Trail");
    });

    it("returns 'Compliance Certificate' for COMPLIANCE_CERTIFICATE", () => {
      expect(getReportTypeLabel("COMPLIANCE_CERTIFICATE" as never)).toBe(
        "Compliance Certificate",
      );
    });
  });

  // ─── getMimeTypeForFormat ──────────────────────────────────────────────────

  describe("getMimeTypeForFormat", () => {
    it("returns 'application/pdf' for PDF", () => {
      expect(getMimeTypeForFormat("PDF" as never)).toBe("application/pdf");
    });

    it("returns 'text/csv' for CSV", () => {
      expect(getMimeTypeForFormat("CSV" as never)).toBe("text/csv");
    });

    it("returns 'application/json' for JSON", () => {
      expect(getMimeTypeForFormat("JSON" as never)).toBe("application/json");
    });

    it("returns the XLSX OOXML MIME type for XLSX", () => {
      expect(getMimeTypeForFormat("XLSX" as never)).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    });
  });

  // ─── getFileExtensionForFormat ─────────────────────────────────────────────

  describe("getFileExtensionForFormat", () => {
    it("returns 'pdf' for PDF", () => {
      expect(getFileExtensionForFormat("PDF" as never)).toBe("pdf");
    });

    it("returns 'csv' for CSV", () => {
      expect(getFileExtensionForFormat("CSV" as never)).toBe("csv");
    });

    it("returns 'json' for JSON", () => {
      expect(getFileExtensionForFormat("JSON" as never)).toBe("json");
    });

    it("returns 'xlsx' for XLSX", () => {
      expect(getFileExtensionForFormat("XLSX" as never)).toBe("xlsx");
    });
  });

  // ─── parseRange (tested indirectly through getNextRunTime / cron matching) ──

  describe("parseRange (via cron matching)", () => {
    it("matches a simple range expression like 1-5 for weekday", () => {
      // "0 9 * * 1-5" means weekdays Mon-Fri at 9am
      // 2024-06-12 is a Wednesday (day 3, within 1-5)
      const from = new Date("2024-06-12T08:00:00Z");
      const next = getNextRunTime("0 9 * * 1-5", from);

      // Should match the same day at 9am since 8am < 9am and Wed is in 1-5
      expect(next.getHours()).toBe(9);
      expect(next.getMinutes()).toBe(0);
      const day = next.getDay();
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(5);
    });

    it("matches a range with step expression like 0-30/10 for minutes", () => {
      // "0-30/10 * * * *" means minutes 0, 10, 20, 30 of every hour
      const from = new Date("2024-06-15T10:05:00Z");
      const next = getNextRunTime("0-30/10 * * * *", from);

      // Next matching minute after 5 in range 0-30 step 10 is minute 10
      expect(next.getMinutes()).toBe(10);
      expect(next.getTime()).toBeGreaterThan(from.getTime());
    });

    it("handles range in hour field like 9-17 for business hours", () => {
      // "0 9-17 * * *" means on the hour from 9am to 5pm
      const from = new Date("2024-06-15T18:00:00Z");
      const next = getNextRunTime("0 9-17 * * *", from);

      // After 6pm, next match is 9am next day
      expect(next.getHours()).toBe(9);
      expect(next.getMinutes()).toBe(0);
      expect(next.getDate()).toBe(16);
    });
  });

  // ─── deleteScheduledReport ────────────────────────────────────────────────

  describe("deleteScheduledReport", () => {
    it("calls prisma.scheduledReport.delete with correct id and userId", async () => {
      mockPrisma.scheduledReport.delete.mockResolvedValue({});

      await deleteScheduledReport("report-1", "user-1");

      expect(mockPrisma.scheduledReport.delete).toHaveBeenCalledWith({
        where: { id: "report-1", userId: "user-1" },
      });
    });

    it("returns void on success", async () => {
      mockPrisma.scheduledReport.delete.mockResolvedValue({});

      const result = await deleteScheduledReport("report-1", "user-1");

      expect(result).toBeUndefined();
    });

    it("propagates errors from prisma", async () => {
      mockPrisma.scheduledReport.delete.mockRejectedValue(
        new Error("Record not found"),
      );

      await expect(
        deleteScheduledReport("nonexistent", "user-1"),
      ).rejects.toThrow("Record not found");
    });
  });

  // ─── getScheduledReport ───────────────────────────────────────────────────

  describe("getScheduledReport", () => {
    it("returns null when report is not found", async () => {
      mockPrisma.scheduledReport.findFirst.mockResolvedValue(null);

      const result = await getScheduledReport("nonexistent", "user-1");

      expect(result).toBeNull();
      expect(mockPrisma.scheduledReport.findFirst).toHaveBeenCalledWith({
        where: { id: "nonexistent", userId: "user-1" },
      });
    });

    it("returns report with archive stats when found", async () => {
      const mockReport = {
        id: "report-1",
        userId: "user-1",
        name: "Weekly Compliance",
        reportType: "COMPLIANCE_SUMMARY",
        schedule: "0 9 * * 1",
      };
      const mockLastArchive = {
        id: "archive-1",
        generatedAt: new Date("2024-06-10"),
      };

      mockPrisma.scheduledReport.findFirst.mockResolvedValue(mockReport);
      mockPrisma.reportArchive.count.mockResolvedValue(5);
      mockPrisma.reportArchive.findFirst.mockResolvedValue(mockLastArchive);

      const result = await getScheduledReport("report-1", "user-1");

      expect(result).toEqual({
        ...mockReport,
        archiveCount: 5,
        lastArchive: mockLastArchive,
      });
      expect(mockPrisma.reportArchive.count).toHaveBeenCalledWith({
        where: { scheduledReportId: "report-1" },
      });
      expect(mockPrisma.reportArchive.findFirst).toHaveBeenCalledWith({
        where: { scheduledReportId: "report-1" },
        orderBy: { generatedAt: "desc" },
      });
    });

    it("returns archiveCount 0 and lastArchive null when no archives exist", async () => {
      const mockReport = {
        id: "report-2",
        userId: "user-1",
        name: "New Report",
      };

      mockPrisma.scheduledReport.findFirst.mockResolvedValue(mockReport);
      mockPrisma.reportArchive.count.mockResolvedValue(0);
      mockPrisma.reportArchive.findFirst.mockResolvedValue(null);

      const result = await getScheduledReport("report-2", "user-1");

      expect(result).toEqual({
        ...mockReport,
        archiveCount: 0,
        lastArchive: null,
      });
    });
  });

  // ─── getScheduledReports ──────────────────────────────────────────────────

  describe("getScheduledReports", () => {
    it("returns reports with stats and total count for a user", async () => {
      const mockReports = [
        { id: "report-1", userId: "user-1", name: "Report A" },
        { id: "report-2", userId: "user-1", name: "Report B" },
      ];

      mockPrisma.scheduledReport.findMany.mockResolvedValue(mockReports);
      mockPrisma.scheduledReport.count.mockResolvedValue(2);
      mockPrisma.reportArchive.count.mockResolvedValue(0);
      mockPrisma.reportArchive.findFirst.mockResolvedValue(null);

      const result = await getScheduledReports("user-1");

      expect(result.total).toBe(2);
      expect(result.reports).toHaveLength(2);
      expect(result.reports[0]).toEqual({
        ...mockReports[0],
        archiveCount: 0,
        lastArchive: null,
      });
    });

    it("applies reportType filter when provided", async () => {
      mockPrisma.scheduledReport.findMany.mockResolvedValue([]);
      mockPrisma.scheduledReport.count.mockResolvedValue(0);

      await getScheduledReports("user-1", {
        reportType: "COMPLIANCE_SUMMARY" as never,
      });

      expect(mockPrisma.scheduledReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "user-1",
            reportType: "COMPLIANCE_SUMMARY",
          },
        }),
      );
    });

    it("applies isActive filter when provided", async () => {
      mockPrisma.scheduledReport.findMany.mockResolvedValue([]);
      mockPrisma.scheduledReport.count.mockResolvedValue(0);

      await getScheduledReports("user-1", { isActive: true });

      expect(mockPrisma.scheduledReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "user-1",
            isActive: true,
          },
        }),
      );
    });

    it("applies limit and offset when provided", async () => {
      mockPrisma.scheduledReport.findMany.mockResolvedValue([]);
      mockPrisma.scheduledReport.count.mockResolvedValue(0);

      await getScheduledReports("user-1", { limit: 10, offset: 20 });

      expect(mockPrisma.scheduledReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it("uses defaults of limit=50 and offset=0 when not provided", async () => {
      mockPrisma.scheduledReport.findMany.mockResolvedValue([]);
      mockPrisma.scheduledReport.count.mockResolvedValue(0);

      await getScheduledReports("user-1");

      expect(mockPrisma.scheduledReport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });
  });

  // ─── getDueReports ────────────────────────────────────────────────────────

  describe("getDueReports", () => {
    it("queries for active reports with nextRunAt <= asOfDate", async () => {
      const dueDate = new Date("2024-06-15T12:00:00Z");
      const mockDueReports = [
        {
          id: "report-1",
          name: "Due Report",
          nextRunAt: new Date("2024-06-15T09:00:00Z"),
        },
      ];
      mockPrisma.scheduledReport.findMany.mockResolvedValue(mockDueReports);

      const result = await getDueReports(dueDate);

      expect(result).toEqual(mockDueReports);
      expect(mockPrisma.scheduledReport.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          nextRunAt: { lte: dueDate },
          failureCount: { lt: mockPrisma.scheduledReport.fields.maxRetries },
        },
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { nextRunAt: "asc" },
      });
    });

    it("returns an empty array when no reports are due", async () => {
      mockPrisma.scheduledReport.findMany.mockResolvedValue([]);

      const result = await getDueReports(new Date("2024-01-01T00:00:00Z"));

      expect(result).toEqual([]);
    });
  });

  // ─── markReportRunSuccess ─────────────────────────────────────────────────

  describe("markReportRunSuccess", () => {
    it("updates report with success status and resets failureCount", async () => {
      mockPrisma.scheduledReport.update.mockResolvedValue({});

      const nextRunAt = new Date("2024-06-22T09:00:00Z");
      await markReportRunSuccess("report-1", nextRunAt);

      expect(mockPrisma.scheduledReport.update).toHaveBeenCalledWith({
        where: { id: "report-1" },
        data: {
          lastRunAt: expect.any(Date),
          lastRunStatus: "success",
          nextRunAt,
          failureCount: 0,
        },
      });
    });

    it("returns void on success", async () => {
      mockPrisma.scheduledReport.update.mockResolvedValue({});

      const result = await markReportRunSuccess(
        "report-1",
        new Date("2024-06-22T09:00:00Z"),
      );

      expect(result).toBeUndefined();
    });
  });

  // ─── markReportRunFailure ─────────────────────────────────────────────────

  describe("markReportRunFailure", () => {
    it("updates report with failed status and increments failureCount", async () => {
      mockPrisma.scheduledReport.update.mockResolvedValue({});

      await markReportRunFailure("report-1");

      expect(mockPrisma.scheduledReport.update).toHaveBeenCalledWith({
        where: { id: "report-1" },
        data: {
          lastRunAt: expect.any(Date),
          lastRunStatus: "failed",
          failureCount: { increment: 1 },
        },
      });
    });

    it("returns void on success", async () => {
      mockPrisma.scheduledReport.update.mockResolvedValue({});

      const result = await markReportRunFailure("report-1");

      expect(result).toBeUndefined();
    });
  });

  // ─── getReportArchive ─────────────────────────────────────────────────────

  describe("getReportArchive", () => {
    it("returns an archive when found", async () => {
      const mockArchive = {
        id: "archive-1",
        userId: "user-1",
        title: "June Compliance Report",
        reportType: "COMPLIANCE_SUMMARY",
      };
      mockPrisma.reportArchive.findFirst.mockResolvedValue(mockArchive);

      const result = await getReportArchive("archive-1", "user-1");

      expect(result).toEqual(mockArchive);
      expect(mockPrisma.reportArchive.findFirst).toHaveBeenCalledWith({
        where: { id: "archive-1", userId: "user-1" },
      });
    });

    it("returns null when archive is not found", async () => {
      mockPrisma.reportArchive.findFirst.mockResolvedValue(null);

      const result = await getReportArchive("nonexistent", "user-1");

      expect(result).toBeNull();
    });
  });

  // ─── getReportArchives ────────────────────────────────────────────────────

  describe("getReportArchives", () => {
    it("returns archives and total count for a user", async () => {
      const mockArchives = [
        { id: "archive-1", userId: "user-1", title: "Report A" },
        { id: "archive-2", userId: "user-1", title: "Report B" },
      ];
      mockPrisma.reportArchive.findMany.mockResolvedValue(mockArchives);
      mockPrisma.reportArchive.count.mockResolvedValue(2);

      const result = await getReportArchives("user-1");

      expect(result.archives).toEqual(mockArchives);
      expect(result.total).toBe(2);
    });

    it("applies reportType filter", async () => {
      mockPrisma.reportArchive.findMany.mockResolvedValue([]);
      mockPrisma.reportArchive.count.mockResolvedValue(0);

      await getReportArchives("user-1", {
        reportType: "AUDIT_TRAIL" as never,
      });

      expect(mockPrisma.reportArchive.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "user-1",
            reportType: "AUDIT_TRAIL",
          },
        }),
      );
    });

    it("applies scheduledReportId filter", async () => {
      mockPrisma.reportArchive.findMany.mockResolvedValue([]);
      mockPrisma.reportArchive.count.mockResolvedValue(0);

      await getReportArchives("user-1", {
        scheduledReportId: "sched-1",
      });

      expect(mockPrisma.reportArchive.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "user-1",
            scheduledReportId: "sched-1",
          },
        }),
      );
    });

    it("applies fromDate and toDate filters on generatedAt", async () => {
      const fromDate = new Date("2024-01-01");
      const toDate = new Date("2024-06-30");

      mockPrisma.reportArchive.findMany.mockResolvedValue([]);
      mockPrisma.reportArchive.count.mockResolvedValue(0);

      await getReportArchives("user-1", { fromDate, toDate });

      expect(mockPrisma.reportArchive.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "user-1",
            generatedAt: {
              gte: fromDate,
              lte: toDate,
            },
          },
        }),
      );
    });

    it("applies only fromDate filter when toDate is not provided", async () => {
      const fromDate = new Date("2024-01-01");

      mockPrisma.reportArchive.findMany.mockResolvedValue([]);
      mockPrisma.reportArchive.count.mockResolvedValue(0);

      await getReportArchives("user-1", { fromDate });

      expect(mockPrisma.reportArchive.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "user-1",
            generatedAt: {
              gte: fromDate,
            },
          },
        }),
      );
    });

    it("applies only toDate filter when fromDate is not provided", async () => {
      const toDate = new Date("2024-06-30");

      mockPrisma.reportArchive.findMany.mockResolvedValue([]);
      mockPrisma.reportArchive.count.mockResolvedValue(0);

      await getReportArchives("user-1", { toDate });

      expect(mockPrisma.reportArchive.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "user-1",
            generatedAt: {
              lte: toDate,
            },
          },
        }),
      );
    });

    it("applies limit and offset when provided", async () => {
      mockPrisma.reportArchive.findMany.mockResolvedValue([]);
      mockPrisma.reportArchive.count.mockResolvedValue(0);

      await getReportArchives("user-1", { limit: 25, offset: 50 });

      expect(mockPrisma.reportArchive.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 25,
          skip: 50,
        }),
      );
    });

    it("uses default limit=50 and offset=0 when not provided", async () => {
      mockPrisma.reportArchive.findMany.mockResolvedValue([]);
      mockPrisma.reportArchive.count.mockResolvedValue(0);

      await getReportArchives("user-1");

      expect(mockPrisma.reportArchive.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });
  });

  // ─── deleteReportArchive ──────────────────────────────────────────────────

  describe("deleteReportArchive", () => {
    it("calls prisma.reportArchive.delete with correct id and userId", async () => {
      mockPrisma.reportArchive.delete.mockResolvedValue({});

      await deleteReportArchive("archive-1", "user-1");

      expect(mockPrisma.reportArchive.delete).toHaveBeenCalledWith({
        where: { id: "archive-1", userId: "user-1" },
      });
    });

    it("returns void on success", async () => {
      mockPrisma.reportArchive.delete.mockResolvedValue({});

      const result = await deleteReportArchive("archive-1", "user-1");

      expect(result).toBeUndefined();
    });

    it("propagates errors from prisma", async () => {
      mockPrisma.reportArchive.delete.mockRejectedValue(
        new Error("Archive not found"),
      );

      await expect(
        deleteReportArchive("nonexistent", "user-1"),
      ).rejects.toThrow("Archive not found");
    });
  });

  // ─── recordArchiveDownload ────────────────────────────────────────────────

  describe("recordArchiveDownload", () => {
    it("increments downloadCount and sets lastDownloadedAt", async () => {
      mockPrisma.reportArchive.update.mockResolvedValue({});

      await recordArchiveDownload("archive-1");

      expect(mockPrisma.reportArchive.update).toHaveBeenCalledWith({
        where: { id: "archive-1" },
        data: {
          downloadCount: { increment: 1 },
          lastDownloadedAt: expect.any(Date),
        },
      });
    });

    it("returns void on success", async () => {
      mockPrisma.reportArchive.update.mockResolvedValue({});

      const result = await recordArchiveDownload("archive-1");

      expect(result).toBeUndefined();
    });
  });

  // ─── getDefaultScheduleForType ────────────────────────────────────────────

  describe("getDefaultScheduleForType", () => {
    it("returns weekly Monday 9am for COMPLIANCE_SUMMARY", () => {
      expect(getDefaultScheduleForType("COMPLIANCE_SUMMARY" as never)).toBe(
        "0 9 * * 1",
      );
    });

    it("returns monthly 1st midnight for MONTHLY_DIGEST", () => {
      expect(getDefaultScheduleForType("MONTHLY_DIGEST" as never)).toBe(
        "0 0 1 * *",
      );
    });

    it("returns quarterly schedule for QUARTERLY_REVIEW", () => {
      expect(getDefaultScheduleForType("QUARTERLY_REVIEW" as never)).toBe(
        "0 0 1 1,4,7,10 *",
      );
    });

    it("returns Jan 1st for ANNUAL_COMPLIANCE", () => {
      expect(getDefaultScheduleForType("ANNUAL_COMPLIANCE" as never)).toBe(
        "0 0 1 1 *",
      );
    });

    it("returns weekly Monday 9am for INCIDENT_DIGEST", () => {
      expect(getDefaultScheduleForType("INCIDENT_DIGEST" as never)).toBe(
        "0 9 * * 1",
      );
    });

    it("returns weekly Monday 9am for AUTHORIZATION_STATUS", () => {
      expect(getDefaultScheduleForType("AUTHORIZATION_STATUS" as never)).toBe(
        "0 9 * * 1",
      );
    });

    it("returns monthly for DOCUMENT_INVENTORY", () => {
      expect(getDefaultScheduleForType("DOCUMENT_INVENTORY" as never)).toBe(
        "0 0 1 * *",
      );
    });

    it("returns weekly Monday 9am for DEADLINE_FORECAST", () => {
      expect(getDefaultScheduleForType("DEADLINE_FORECAST" as never)).toBe(
        "0 9 * * 1",
      );
    });

    it("returns monthly for AUDIT_TRAIL", () => {
      expect(getDefaultScheduleForType("AUDIT_TRAIL" as never)).toBe(
        "0 0 1 * *",
      );
    });

    it("returns annually Jan 1st for COMPLIANCE_CERTIFICATE", () => {
      expect(getDefaultScheduleForType("COMPLIANCE_CERTIFICATE" as never)).toBe(
        "0 0 1 1 *",
      );
    });
  });
});
