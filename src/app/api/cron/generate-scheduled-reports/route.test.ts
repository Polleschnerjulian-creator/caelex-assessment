import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from "vitest";
import { NextRequest } from "next/server";

// ─── Set env BEFORE anything else (vi.hoisted runs before mocks) ───
const CRON_SECRET = "test-cron-secret-value";
vi.hoisted(() => {
  process.env.CRON_SECRET = "test-cron-secret-value";
});

// ─── Mocks ───

vi.mock("@/lib/prisma", () => ({
  prisma: {
    incident: { findMany: vi.fn() },
    authorizationWorkflow: { findMany: vi.fn() },
    document: { findMany: vi.fn() },
    deadline: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/audit", () => ({ logAuditEvent: vi.fn() }));

vi.mock("@/lib/validations", () => ({
  safeJsonParseObject: vi.fn((json: string | null) =>
    json ? JSON.parse(json) : {},
  ),
  getSafeErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

const mockGetDueReports = vi.fn();
const mockMarkReportRunSuccess = vi.fn();
const mockMarkReportRunFailure = vi.fn();
const mockArchiveReport = vi.fn();
const mockGetNextRunTime = vi.fn();
const mockGetMimeTypeForFormat = vi.fn().mockReturnValue("application/json");
const mockGetFileExtensionForFormat = vi.fn().mockReturnValue("json");
const mockGetReportTypeLabel = vi.fn().mockReturnValue("Compliance Summary");

vi.mock("@/lib/services/report-scheduler-service", () => ({
  getDueReports: (...args: unknown[]) => mockGetDueReports(...args),
  markReportRunSuccess: (...args: unknown[]) =>
    mockMarkReportRunSuccess(...args),
  markReportRunFailure: (...args: unknown[]) =>
    mockMarkReportRunFailure(...args),
  archiveReport: (...args: unknown[]) => mockArchiveReport(...args),
  getNextRunTime: (...args: unknown[]) => mockGetNextRunTime(...args),
  getMimeTypeForFormat: (...args: unknown[]) =>
    mockGetMimeTypeForFormat(...args),
  getFileExtensionForFormat: (...args: unknown[]) =>
    mockGetFileExtensionForFormat(...args),
  getReportTypeLabel: (...args: unknown[]) => mockGetReportTypeLabel(...args),
}));

vi.mock("@/lib/services/dashboard-analytics-service", () => ({
  getComplianceOverview: vi.fn().mockResolvedValue({ score: 85 }),
}));

vi.mock("@/lib/services/compliance-scoring-service", () => ({
  calculateComplianceScore: vi
    .fn()
    .mockResolvedValue({ overall: 85, grade: "A" }),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// ─── Import route ───
import { GET, POST } from "./route";
import { logAuditEvent } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

// ─── Helpers ───

function createRequest(
  method: string,
  options: { withAuth?: boolean; secret?: string } = {},
): NextRequest {
  const headers: Record<string, string> = {};
  if (options.withAuth) {
    headers["authorization"] = `Bearer ${options.secret || CRON_SECRET}`;
  }
  return new NextRequest(
    new URL("http://localhost/api/cron/generate-scheduled-reports"),
    { method, headers },
  );
}

function makeScheduledReport(overrides: Record<string, unknown> = {}) {
  return {
    id: "sr-1",
    name: "Monthly Compliance",
    reportType: "COMPLIANCE_SUMMARY",
    format: "JSON",
    schedule: "MONTHLY",
    userId: "user-1",
    sendToSelf: true,
    recipients: ["admin@example.com"],
    filters: null,
    user: {
      id: "user-1",
      email: "user@example.com",
      name: "Test User",
    },
    ...overrides,
  };
}

// ─── Tests ───

describe("Cron: generate-scheduled-reports", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET };

    mockGetDueReports.mockResolvedValue([]);
    mockMarkReportRunSuccess.mockResolvedValue(undefined);
    mockMarkReportRunFailure.mockResolvedValue(undefined);
    mockArchiveReport.mockResolvedValue({ id: "archive-1" });
    mockGetNextRunTime.mockReturnValue(new Date("2026-04-01"));
    mockSendEmail.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ═══════════════════════════════════════
  // isValidCronSecret (tested through POST)
  // ═══════════════════════════════════════

  describe("isValidCronSecret (via POST)", () => {
    it("validates with timing-safe comparison (correct secret)", async () => {
      const req = createRequest("POST", { withAuth: true });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("rejects wrong secret", async () => {
      const req = createRequest("POST", {
        withAuth: true,
        secret: "wrong-secret",
      });
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("rejects secret with different length", async () => {
      const req = createRequest("POST", { withAuth: true, secret: "short" });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════
  // POST authentication
  // ═══════════════════════════════════════

  describe("POST authentication", () => {
    it("returns 503 when CRON_SECRET not configured", async () => {
      // Module-level CRON_SECRET was set at import time.
      // To test the 503 path, we need a fresh module where CRON_SECRET is undefined.
      vi.resetModules();
      const savedSecret = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      vi.doMock("@/lib/prisma", () => ({
        prisma: {
          incident: { findMany: vi.fn() },
          authorizationWorkflow: { findMany: vi.fn() },
          document: { findMany: vi.fn() },
          deadline: { findMany: vi.fn() },
          auditLog: { findMany: vi.fn() },
        },
      }));
      vi.doMock("@/lib/audit", () => ({ logAuditEvent: vi.fn() }));
      vi.doMock("@/lib/validations", () => ({
        safeJsonParseObject: vi.fn((json: string | null) =>
          json ? JSON.parse(json) : {},
        ),
        getSafeErrorMessage: vi.fn(
          (_err: unknown, fallback: string) => fallback,
        ),
      }));
      vi.doMock("@/lib/services/report-scheduler-service", () => ({
        getDueReports: vi.fn(),
        markReportRunSuccess: vi.fn(),
        markReportRunFailure: vi.fn(),
        archiveReport: vi.fn(),
        getNextRunTime: vi.fn(),
        getMimeTypeForFormat: vi.fn().mockReturnValue("application/json"),
        getFileExtensionForFormat: vi.fn().mockReturnValue("json"),
        getReportTypeLabel: vi.fn().mockReturnValue("Compliance Summary"),
      }));
      vi.doMock("@/lib/services/dashboard-analytics-service", () => ({
        getComplianceOverview: vi.fn().mockResolvedValue({ score: 85 }),
      }));
      vi.doMock("@/lib/services/compliance-scoring-service", () => ({
        calculateComplianceScore: vi
          .fn()
          .mockResolvedValue({ overall: 85, grade: "A" }),
      }));
      vi.doMock("@/lib/email", () => ({ sendEmail: vi.fn() }));
      vi.doMock("@/lib/logger", () => ({
        logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
      }));

      const { POST: FreshPOST } = await import("./route");

      const req = new NextRequest(
        new URL("http://localhost/api/cron/generate-scheduled-reports"),
        { method: "POST" },
      );
      const res = await FreshPOST(req);
      const data = await res.json();

      expect(res.status).toBe(503);
      // Source now returns generic "Service unavailable" — see comment
      // in analytics-aggregate test for rationale.
      expect(data.error).toBe("Service unavailable");

      process.env.CRON_SECRET = savedSecret;
    });

    it("returns 401 when auth header is wrong", async () => {
      const req = createRequest("POST", {
        withAuth: true,
        secret: "bad-token-value",
      });
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 401 when no auth header", async () => {
      const req = createRequest("POST");
      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  // ═══════════════════════════════════════
  // POST processing
  // ═══════════════════════════════════════

  describe("POST processing", () => {
    it("processes due reports, calls generateAndArchiveReport for each", async () => {
      const report = makeScheduledReport();
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.processed).toBe(1);
      expect(data.successCount).toBe(1);
      expect(data.failedCount).toBe(0);
      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
    });

    it("marks report as success and schedules next run on success", async () => {
      const report = makeScheduledReport();
      mockGetDueReports.mockResolvedValue([report]);
      const nextRun = new Date("2026-04-01");
      mockGetNextRunTime.mockReturnValue(nextRun);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockMarkReportRunSuccess).toHaveBeenCalledWith("sr-1", nextRun);
    });

    it("marks report as failure on error (unknown type)", async () => {
      const report = makeScheduledReport({ reportType: "UNKNOWN_TYPE" });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      const res = await POST(req);
      const data = await res.json();

      expect(data.failedCount).toBe(1);
      expect(mockMarkReportRunFailure).toHaveBeenCalledWith("sr-1");
    });

    it("marks report as failure when archive throws", async () => {
      const report = makeScheduledReport();
      mockGetDueReports.mockResolvedValue([report]);
      mockArchiveReport.mockRejectedValue(new Error("Storage failure"));

      const req = createRequest("POST", { withAuth: true });
      const res = await POST(req);
      const data = await res.json();

      expect(data.failedCount).toBe(1);
      expect(mockMarkReportRunFailure).toHaveBeenCalledWith("sr-1");
    });

    it("sends email notifications to recipients", async () => {
      const report = makeScheduledReport();
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      // user@example.com (sendToSelf) + admin@example.com (recipient)
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
      const recipients = mockSendEmail.mock.calls.map(
        (c: unknown[]) => (c[0] as { to: string }).to,
      );
      expect(recipients).toContain("user@example.com");
      expect(recipients).toContain("admin@example.com");
    });

    it("logs audit event after processing", async () => {
      mockGetDueReports.mockResolvedValue([]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "system",
          action: "CRON_GENERATE_SCHEDULED_REPORTS",
          entityType: "cron_job",
          entityId: "generate-scheduled-reports",
        }),
      );
    });

    it("returns correct counts (processed, success, failed)", async () => {
      const successReport = makeScheduledReport({ id: "sr-success" });
      const failReport = makeScheduledReport({
        id: "sr-fail",
        reportType: "UNKNOWN_TYPE",
      });
      mockGetDueReports.mockResolvedValue([successReport, failReport]);

      const req = createRequest("POST", { withAuth: true });
      const res = await POST(req);
      const data = await res.json();

      expect(data.processed).toBe(2);
      expect(data.successCount).toBe(1);
      expect(data.failedCount).toBe(1);
      expect(data.details).toHaveLength(2);
    });

    it("returns 500 when an unhandled error occurs", async () => {
      mockGetDueReports.mockRejectedValue(new Error("Database down"));

      const req = createRequest("POST", { withAuth: true });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe("Failed to process scheduled reports");
    });
  });

  // ═══════════════════════════════════════
  // GET delegates to POST
  // ═══════════════════════════════════════

  describe("GET", () => {
    it("delegates to POST", async () => {
      mockGetDueReports.mockResolvedValue([]);
      const req = createRequest("GET", { withAuth: true });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
    });
  });

  // ═══════════════════════════════════════
  // formatReport (tested via report generation)
  // ═══════════════════════════════════════

  describe("formatReport (via report generation)", () => {
    it("generates JSON correctly", async () => {
      const report = makeScheduledReport({
        reportType: "COMPLIANCE_SUMMARY",
        format: "JSON",
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const archiveCall = mockArchiveReport.mock.calls[0][0];
      const content = archiveCall.fileBuffer.toString("utf-8");
      const parsed = JSON.parse(content);
      expect(parsed.title).toBe("Compliance Summary");
      expect(parsed.reportType).toBe("COMPLIANCE_SUMMARY");
      expect(parsed.data).toBeDefined();
      expect(parsed.data.overview).toEqual({ score: 85 });
    });

    it("generates CSV correctly for document data", async () => {
      const mockDocs = [
        {
          id: "doc-1",
          name: "Policy A",
          category: "REGULATORY",
          status: "ACTIVE",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-15",
        },
      ];
      vi.mocked(prisma.document.findMany).mockResolvedValue(mockDocs as never);

      const report = makeScheduledReport({
        reportType: "DOCUMENT_INVENTORY",
        format: "CSV",
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const csvContent =
        mockArchiveReport.mock.calls[0][0].fileBuffer.toString("utf-8");
      expect(csvContent).toContain("ID,Name,Category,Status,Created At");
      expect(csvContent).toContain("doc-1");
      expect(csvContent).toContain("Policy A");
    });

    it("generates CSV correctly for incident data", async () => {
      const mockIncidents = [
        {
          id: "inc-1",
          title: "Breach",
          severity: "HIGH",
          category: "CYBER",
          status: "OPEN",
          detectedAt: "2026-02-01",
          createdAt: new Date(),
        },
      ];
      vi.mocked(prisma.incident.findMany).mockResolvedValue(
        mockIncidents as never,
      );

      const report = makeScheduledReport({
        reportType: "INCIDENT_DIGEST",
        format: "CSV",
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const csvContent =
        mockArchiveReport.mock.calls[0][0].fileBuffer.toString("utf-8");
      expect(csvContent).toContain(
        "ID,Title,Severity,Category,Status,Detected At",
      );
      expect(csvContent).toContain("inc-1");
    });

    it("generates CSV correctly for deadline data", async () => {
      const mockDeadlines = [
        {
          id: "dl-1",
          title: "Submit Report",
          dueDate: "2026-06-01",
          priority: "HIGH",
          status: "UPCOMING",
        },
      ];
      vi.mocked(prisma.deadline.findMany).mockResolvedValue(
        mockDeadlines as never,
      );

      const report = makeScheduledReport({
        reportType: "DEADLINE_FORECAST",
        format: "CSV",
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const csvContent =
        mockArchiveReport.mock.calls[0][0].fileBuffer.toString("utf-8");
      expect(csvContent).toContain("ID,Title,Due Date,Priority,Status");
      expect(csvContent).toContain("dl-1");
    });

    it("generates CSV correctly for audit log data", async () => {
      const mockLogs = [
        {
          timestamp: "2026-01-15T10:00:00Z",
          action: "LOGIN",
          entityType: "user",
          entityId: "u-1",
        },
      ];
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue(mockLogs as never);

      const report = makeScheduledReport({
        reportType: "AUDIT_TRAIL",
        format: "CSV",
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const csvContent =
        mockArchiveReport.mock.calls[0][0].fileBuffer.toString("utf-8");
      expect(csvContent).toContain("Timestamp,Action,Entity Type,Entity ID");
      expect(csvContent).toContain("LOGIN");
    });
  });

  // ═══════════════════════════════════════
  // calculatePeriodStart (tested via archive call)
  // ═══════════════════════════════════════

  describe("calculatePeriodStart (via archiveReport call)", () => {
    it("MONTHLY_DIGEST -> 1 month back", async () => {
      const report = makeScheduledReport({ reportType: "MONTHLY_DIGEST" });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const archiveCall = mockArchiveReport.mock.calls[0][0];
      const periodStart: Date = archiveCall.periodStart;
      const periodEnd: Date = archiveCall.periodEnd;

      const diffMonths =
        periodEnd.getMonth() -
        periodStart.getMonth() +
        12 * (periodEnd.getFullYear() - periodStart.getFullYear());
      expect(diffMonths).toBe(1);
    });

    it("QUARTERLY_REVIEW -> 3 months back", async () => {
      const report = makeScheduledReport({ reportType: "QUARTERLY_REVIEW" });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const archiveCall = mockArchiveReport.mock.calls[0][0];
      const periodStart: Date = archiveCall.periodStart;
      const periodEnd: Date = archiveCall.periodEnd;

      const diffMonths =
        periodEnd.getMonth() -
        periodStart.getMonth() +
        12 * (periodEnd.getFullYear() - periodStart.getFullYear());
      expect(diffMonths).toBe(3);
    });

    it("ANNUAL_COMPLIANCE -> 1 year back", async () => {
      const report = makeScheduledReport({ reportType: "ANNUAL_COMPLIANCE" });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const archiveCall = mockArchiveReport.mock.calls[0][0];
      const periodStart: Date = archiveCall.periodStart;
      const periodEnd: Date = archiveCall.periodEnd;

      const diffYears = periodEnd.getFullYear() - periodStart.getFullYear();
      expect(diffYears).toBe(1);
    });

    it("default types (COMPLIANCE_SUMMARY) -> 7 days back", async () => {
      const report = makeScheduledReport({
        reportType: "COMPLIANCE_SUMMARY",
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const archiveCall = mockArchiveReport.mock.calls[0][0];
      const periodStart: Date = archiveCall.periodStart;
      const periodEnd: Date = archiveCall.periodEnd;

      const diffDays = Math.round(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(diffDays).toBe(7);
    });
  });

  // ═══════════════════════════════════════
  // calculateExpiryDate (tested via archive call)
  // ═══════════════════════════════════════

  describe("calculateExpiryDate (via archiveReport call)", () => {
    it("ANNUAL_COMPLIANCE -> 7 years", async () => {
      const report = makeScheduledReport({ reportType: "ANNUAL_COMPLIANCE" });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const archiveCall = mockArchiveReport.mock.calls[0][0];
      const expiresAt: Date = archiveCall.expiresAt;
      const now = new Date();
      const diffYears = expiresAt.getFullYear() - now.getFullYear();
      expect(diffYears).toBe(7);
    });

    it("QUARTERLY_REVIEW -> 3 years", async () => {
      const report = makeScheduledReport({ reportType: "QUARTERLY_REVIEW" });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const archiveCall = mockArchiveReport.mock.calls[0][0];
      const expiresAt: Date = archiveCall.expiresAt;
      const now = new Date();
      const diffYears = expiresAt.getFullYear() - now.getFullYear();
      expect(diffYears).toBe(3);
    });

    it("AUDIT_TRAIL -> 5 years", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
      const report = makeScheduledReport({ reportType: "AUDIT_TRAIL" });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const archiveCall = mockArchiveReport.mock.calls[0][0];
      const expiresAt: Date = archiveCall.expiresAt;
      const now = new Date();
      const diffYears = expiresAt.getFullYear() - now.getFullYear();
      expect(diffYears).toBe(5);
    });

    it("default types -> 1 year", async () => {
      const report = makeScheduledReport({
        reportType: "COMPLIANCE_SUMMARY",
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const archiveCall = mockArchiveReport.mock.calls[0][0];
      const expiresAt: Date = archiveCall.expiresAt;
      const now = new Date();
      const diffYears = expiresAt.getFullYear() - now.getFullYear();
      expect(diffYears).toBe(1);
    });
  });

  // ═══════════════════════════════════════
  // sendReportNotifications
  // ═══════════════════════════════════════

  describe("sendReportNotifications (via POST processing)", () => {
    it("deduplicates recipients", async () => {
      const report = makeScheduledReport({
        sendToSelf: true,
        recipients: ["user@example.com", "other@example.com"],
        user: { id: "user-1", email: "user@example.com", name: "User" },
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      // user@example.com in both sendToSelf and recipients, should be deduplicated
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
      const recipients = mockSendEmail.mock.calls.map(
        (c: unknown[]) => (c[0] as { to: string }).to,
      );
      expect(new Set(recipients).size).toBe(2);
      expect(recipients).toContain("user@example.com");
      expect(recipients).toContain("other@example.com");
    });

    it("skips when no recipients (sendToSelf=false, no recipients)", async () => {
      const report = makeScheduledReport({
        sendToSelf: false,
        recipients: [],
        user: { id: "user-1", email: "user@example.com", name: "User" },
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("skips user email when user has no email", async () => {
      const report = makeScheduledReport({
        sendToSelf: true,
        recipients: ["admin@example.com"],
        user: { id: "user-1", email: null, name: "User" },
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail.mock.calls[0][0].to).toBe("admin@example.com");
    });

    it("handles email send failure gracefully", async () => {
      const report = makeScheduledReport();
      mockGetDueReports.mockResolvedValue([report]);
      mockSendEmail.mockRejectedValue(new Error("SMTP error"));

      const req = createRequest("POST", { withAuth: true });
      const res = await POST(req);
      const data = await res.json();

      // Report should still be counted as success (email failure is logged but not fatal)
      expect(data.successCount).toBe(1);
    });
  });

  // ═══════════════════════════════════════
  // Additional report types
  // ═══════════════════════════════════════

  describe("AUTHORIZATION_STATUS report", () => {
    it("fetches authorization workflows", async () => {
      vi.mocked(prisma.authorizationWorkflow.findMany).mockResolvedValue([
        { id: "wf-1", status: "ACTIVE", documents: [] },
      ] as never);

      const report = makeScheduledReport({
        reportType: "AUTHORIZATION_STATUS",
        format: "JSON",
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(prisma.authorizationWorkflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          include: { documents: true },
        }),
      );
      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
    });
  });

  describe("DEADLINE_FORECAST report", () => {
    it("fetches upcoming deadlines", async () => {
      vi.mocked(prisma.deadline.findMany).mockResolvedValue([]);

      const report = makeScheduledReport({
        reportType: "DEADLINE_FORECAST",
        format: "JSON",
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            status: { in: ["UPCOMING", "DUE_SOON"] },
          }),
          take: 50,
        }),
      );
    });
  });

  // ═══════════════════════════════════════
  // PDF and XLSX format
  // ═══════════════════════════════════════

  describe("PDF/XLSX format handling", () => {
    it("generates PDF placeholder", async () => {
      const report = makeScheduledReport({
        reportType: "COMPLIANCE_SUMMARY",
        format: "PDF",
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const buffer = mockArchiveReport.mock.calls[0][0].fileBuffer;
      const content = buffer.toString("utf-8");
      expect(content).toContain("%PDF-1.4");
    });

    it("generates XLSX placeholder (JSON format)", async () => {
      const report = makeScheduledReport({
        reportType: "COMPLIANCE_SUMMARY",
        format: "XLSX",
      });
      mockGetDueReports.mockResolvedValue([report]);

      const req = createRequest("POST", { withAuth: true });
      await POST(req);

      expect(mockArchiveReport).toHaveBeenCalledTimes(1);
      const buffer = mockArchiveReport.mock.calls[0][0].fileBuffer;
      const content = buffer.toString("utf-8");
      const parsed = JSON.parse(content);
      expect(parsed.title).toBe("Compliance Summary");
    });
  });

  // ═══════════════════════════════════════
  // Empty dataset
  // ═══════════════════════════════════════

  describe("empty dataset", () => {
    it("handles zero due reports gracefully", async () => {
      mockGetDueReports.mockResolvedValue([]);

      const req = createRequest("POST", { withAuth: true });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.processed).toBe(0);
      expect(data.successCount).toBe(0);
      expect(data.failedCount).toBe(0);
      expect(data.details).toEqual([]);
    });
  });
});
