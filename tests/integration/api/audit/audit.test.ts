import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  getAuditLogs: vi.fn(),
  exportAuditLogs: vi.fn(),
  logAuditEvent: vi.fn(),
}));

vi.mock("@/lib/services/audit-export-service", () => ({
  searchAuditLogs: vi.fn(),
  getAuditSummary: vi.fn(),
  getAuditFilterOptions: vi.fn(),
  generateComplianceCertificateData: vi.fn(),
  generateAuditReportData: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    reportArchive: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    security: vi.fn(),
  },
}));

// Mock PDF rendering (certificate and report routes use it)
vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: vi.fn(),
}));

vi.mock("@/lib/pdf/reports/compliance-certificate", () => ({
  ComplianceCertificate: vi.fn(),
}));

vi.mock("@/lib/pdf/reports/audit-report", () => ({
  AuditReport: vi.fn(),
}));

// ─── Imports (after mocks) ───

import { auth } from "@/lib/auth";
import { getAuditLogs, exportAuditLogs } from "@/lib/audit";
import {
  searchAuditLogs,
  getAuditSummary,
  getAuditFilterOptions,
  generateComplianceCertificateData,
  generateAuditReportData,
} from "@/lib/services/audit-export-service";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";

import { GET as getAuditLogsRoute } from "@/app/api/audit/route";
import { GET as getExportRoute } from "@/app/api/audit/export/route";
import { GET as getSearchRoute } from "@/app/api/audit/search/route";
import { GET as getSummaryRoute } from "@/app/api/audit/summary/route";
import {
  POST as postCertificateRoute,
  GET as getCertificateRoute,
} from "@/app/api/audit/certificate/route";
import { POST as postReportRoute } from "@/app/api/audit/report/route";

// ─── Helpers ───

const mockSession = {
  user: { id: "user-123", email: "test@example.com", name: "Test User" },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

function makeGetRequest(url: string): Request {
  return new Request(url, { method: "GET" });
}

function makePostRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Mock data ───

const mockAuditLog = {
  id: "log-1",
  userId: "user-123",
  action: "document_uploaded",
  entityType: "document",
  entityId: "doc-1",
  previousValue: null,
  newValue: '{"name":"test.pdf"}',
  description: "Uploaded document test.pdf",
  ipAddress: "127.0.0.1",
  userAgent: "test-agent",
  timestamp: new Date("2025-06-01T10:00:00Z"),
};

const mockAuditLog2 = {
  id: "log-2",
  userId: "user-123",
  action: "article_status_changed",
  entityType: "article",
  entityId: "art-5",
  previousValue: '{"status":"pending"}',
  newValue: '{"status":"compliant"}',
  description: "Changed article status",
  ipAddress: null,
  userAgent: null,
  timestamp: new Date("2025-06-02T14:00:00Z"),
};

// ============================================================
// TEST SUITES
// ============================================================

describe("GET /api/audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Auth enforcement ───

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = makeGetRequest("http://localhost/api/audit");
    const response = await getAuditLogsRoute(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when session has no user id", async () => {
    vi.mocked(auth).mockResolvedValue({ user: {}, expires: "" } as never);

    const request = makeGetRequest("http://localhost/api/audit");
    const response = await getAuditLogsRoute(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  // ─── Successful listing ───

  it("should return audit logs with default parameters", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getAuditLogs).mockResolvedValue({
      logs: [mockAuditLog, mockAuditLog2],
      total: 2,
    });

    const request = makeGetRequest("http://localhost/api/audit");
    const response = await getAuditLogsRoute(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.logs).toHaveLength(2);
    expect(data.total).toBe(2);
    expect(getAuditLogs).toHaveBeenCalledWith("user-123", {
      limit: 50,
      offset: 0,
      entityType: undefined,
      action: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  });

  // ─── Filtering ───

  it("should pass query parameters as filters", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getAuditLogs).mockResolvedValue({ logs: [], total: 0 });

    const request = makeGetRequest(
      "http://localhost/api/audit?limit=10&offset=5&entityType=document&action=document_uploaded&startDate=2025-01-01&endDate=2025-12-31",
    );
    const response = await getAuditLogsRoute(request);

    expect(response.status).toBe(200);
    expect(getAuditLogs).toHaveBeenCalledWith("user-123", {
      limit: 10,
      offset: 5,
      entityType: "document",
      action: "document_uploaded",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
    });
  });

  it("should cap limit at 100", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getAuditLogs).mockResolvedValue({ logs: [], total: 0 });

    const request = makeGetRequest("http://localhost/api/audit?limit=500");
    await getAuditLogsRoute(request);

    expect(getAuditLogs).toHaveBeenCalledWith(
      "user-123",
      expect.objectContaining({ limit: 100 }),
    );
  });

  // ─── Error handling ───

  it("should return 500 when getAuditLogs throws", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getAuditLogs).mockRejectedValue(new Error("Database error"));

    const request = makeGetRequest("http://localhost/api/audit");
    const response = await getAuditLogsRoute(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ============================================================

describe("GET /api/audit/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Auth enforcement ───

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = makeGetRequest("http://localhost/api/audit/export");
    const response = await getExportRoute(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  // ─── JSON export ───

  it("should return JSON export by default", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    const mockLogs = [mockAuditLog];
    vi.mocked(exportAuditLogs).mockResolvedValue(mockLogs as never);

    const request = makeGetRequest("http://localhost/api/audit/export");
    const response = await getExportRoute(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.logs).toHaveLength(mockLogs.length);
    expect(data.logs[0].id).toBe(mockAuditLog.id);
    expect(data.logs[0].action).toBe(mockAuditLog.action);
    expect(data.exportDate).toBeDefined();
    expect(data.dateRange).toBeDefined();
    expect(data.dateRange.start).toBeDefined();
    expect(data.dateRange.end).toBeDefined();
  });

  // ─── CSV export ───

  it("should return CSV export when format=csv", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    const csvContent = '"Timestamp","Action"\n"2025-06-01","document_uploaded"';
    vi.mocked(exportAuditLogs).mockResolvedValue(csvContent as never);

    const request = makeGetRequest(
      "http://localhost/api/audit/export?format=csv",
    );
    const response = await getExportRoute(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain(
      "attachment; filename=",
    );
    expect(response.headers.get("Content-Disposition")).toContain("audit-log-");

    const body = await response.text();
    expect(body).toBe(csvContent);
  });

  // ─── Date parameters ───

  it("should pass date range to exportAuditLogs", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(exportAuditLogs).mockResolvedValue([] as never);

    const request = makeGetRequest(
      "http://localhost/api/audit/export?startDate=2025-01-01&endDate=2025-06-30",
    );
    await getExportRoute(request);

    expect(exportAuditLogs).toHaveBeenCalledWith(
      "user-123",
      new Date("2025-01-01"),
      new Date("2025-06-30"),
      "json",
    );
  });

  // ─── Error handling ───

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(exportAuditLogs).mockRejectedValue(
      new Error("Connection refused"),
    );

    const request = makeGetRequest("http://localhost/api/audit/export");
    const response = await getExportRoute(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ============================================================

describe("GET /api/audit/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Auth enforcement ───

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = makeGetRequest("http://localhost/api/audit/search?q=test");
    const response = await getSearchRoute(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  // ─── Validation ───

  it("should return 400 when query is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const request = makeGetRequest("http://localhost/api/audit/search");
    const response = await getSearchRoute(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Search query must be at least 2 characters");
  });

  it("should return 400 when query is too short (1 char)", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const request = makeGetRequest("http://localhost/api/audit/search?q=a");
    const response = await getSearchRoute(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Search query must be at least 2 characters");
  });

  it("should return 400 when query is whitespace only", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const request = makeGetRequest(
      "http://localhost/api/audit/search?q=%20%20",
    );
    const response = await getSearchRoute(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Search query must be at least 2 characters");
  });

  // ─── Successful search ───

  it("should return search results for valid query", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(searchAuditLogs).mockResolvedValue({
      logs: [mockAuditLog as never],
      total: 1,
    });

    const request = makeGetRequest(
      "http://localhost/api/audit/search?q=document",
    );
    const response = await getSearchRoute(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.logs).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(searchAuditLogs).toHaveBeenCalledWith("user-123", "document", {
      limit: 50,
      offset: 0,
    });
  });

  it("should pass limit and offset to searchAuditLogs", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(searchAuditLogs).mockResolvedValue({
      logs: [],
      total: 0,
    });

    const request = makeGetRequest(
      "http://localhost/api/audit/search?q=test&limit=20&offset=10",
    );
    await getSearchRoute(request);

    expect(searchAuditLogs).toHaveBeenCalledWith("user-123", "test", {
      limit: 20,
      offset: 10,
    });
  });

  it("should cap search limit at 100", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(searchAuditLogs).mockResolvedValue({ logs: [], total: 0 });

    const request = makeGetRequest(
      "http://localhost/api/audit/search?q=test&limit=999",
    );
    await getSearchRoute(request);

    expect(searchAuditLogs).toHaveBeenCalledWith(
      "user-123",
      "test",
      expect.objectContaining({ limit: 100 }),
    );
  });

  // ─── Error handling ───

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(searchAuditLogs).mockRejectedValue(new Error("DB error"));

    const request = makeGetRequest(
      "http://localhost/api/audit/search?q=document",
    );
    const response = await getSearchRoute(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ============================================================

describe("GET /api/audit/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Auth enforcement ───

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = makeGetRequest("http://localhost/api/audit/summary");
    const response = await getSummaryRoute(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  // ─── Successful summary ───

  it("should return summary and filter options", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);

    const mockSummary = {
      totalEvents: 42,
      eventsByAction: { document_uploaded: 10, article_status_changed: 32 },
      eventsByEntityType: { document: 10, article: 32 },
      eventsByDay: [{ date: "2025-06-01", count: 42 }],
      topEntities: [],
      securityEvents: { total: 0, bySeverity: {}, unresolved: 0 },
      recentActivity: [],
    };

    const mockFilterOptions = {
      actions: ["document_uploaded", "article_status_changed"],
      entityTypes: ["document", "article"],
      dateRange: {
        earliest: new Date("2025-01-01"),
        latest: new Date("2025-06-30"),
      },
    };

    vi.mocked(getAuditSummary).mockResolvedValue(mockSummary as never);
    vi.mocked(getAuditFilterOptions).mockResolvedValue(mockFilterOptions);

    const request = makeGetRequest("http://localhost/api/audit/summary");
    const response = await getSummaryRoute(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary).toBeDefined();
    expect(data.summary.totalEvents).toBe(42);
    expect(data.filterOptions).toBeDefined();
    expect(data.filterOptions.actions).toHaveLength(2);
  });

  it("should pass filter parameters to getAuditSummary", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getAuditSummary).mockResolvedValue({} as never);
    vi.mocked(getAuditFilterOptions).mockResolvedValue({
      actions: [],
      entityTypes: [],
      dateRange: { earliest: null, latest: null },
    });

    const request = makeGetRequest(
      "http://localhost/api/audit/summary?startDate=2025-01-01&endDate=2025-06-30&actions=document_uploaded,article_status_changed&entityTypes=document",
    );
    await getSummaryRoute(request);

    expect(getAuditSummary).toHaveBeenCalledWith("user-123", {
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-06-30"),
      actions: ["document_uploaded", "article_status_changed"],
      entityTypes: ["document"],
    });
  });

  // ─── Error handling ───

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(getAuditSummary).mockRejectedValue(new Error("DB down"));

    const request = makeGetRequest("http://localhost/api/audit/summary");
    const response = await getSummaryRoute(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ============================================================

describe("POST /api/audit/certificate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Auth enforcement ───

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = makePostRequest("http://localhost/api/audit/certificate", {
      organizationName: "Space Corp",
    });
    const response = await postCertificateRoute(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  // ─── Validation: missing organization name ───

  it("should return 400 when organization name is missing from both request and profile", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      organization: null,
      name: "Test User",
      email: "test@example.com",
    } as never);

    const request = makePostRequest(
      "http://localhost/api/audit/certificate",
      {},
    );
    const response = await postCertificateRoute(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Organization name is required");
  });

  // ─── Validation: compliance score too low ───

  it("should return 400 when compliance score is below threshold", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      organization: "Space Corp",
      name: "Test User",
      email: "test@example.com",
    } as never);
    vi.mocked(generateComplianceCertificateData).mockResolvedValue({
      userId: "user-123",
      organizationName: "Space Corp",
      certificateNumber: "CAELEX-CERT-TEST",
      issuedAt: new Date(),
      validUntil: new Date(),
      complianceScore: 20,
      modules: [
        {
          name: "Authorization & Registration",
          status: "non_compliant",
          score: 20,
          lastAuditDate: null,
        },
      ],
      attestations: [],
    });

    const request = makePostRequest("http://localhost/api/audit/certificate", {
      organizationName: "Space Corp",
    });
    const response = await postCertificateRoute(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "Compliance score too low for certificate generation",
    );
    expect(data.score).toBe(20);
    expect(data.minimumRequired).toBe(40);
  });

  // ─── Successful certificate generation ───

  it("should generate PDF when compliance score is sufficient", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      organization: "Space Corp",
      name: "Test User",
      email: "test@example.com",
    } as never);
    vi.mocked(generateComplianceCertificateData).mockResolvedValue({
      userId: "user-123",
      organizationName: "Space Corp",
      certificateNumber: "CAELEX-CERT-ABC123",
      issuedAt: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      complianceScore: 85,
      modules: [
        {
          name: "Authorization & Registration",
          status: "compliant",
          score: 100,
          lastAuditDate: new Date(),
        },
      ],
      attestations: [
        "Organization demonstrates comprehensive compliance with EU Space Act requirements",
      ],
    });

    const pdfBuffer = Buffer.from("fake-pdf-content");
    vi.mocked(renderToBuffer).mockResolvedValue(pdfBuffer as never);
    vi.mocked(prisma.reportArchive.create).mockResolvedValue({
      id: "report-1",
    } as never);

    const request = makePostRequest("http://localhost/api/audit/certificate", {
      organizationName: "Space Corp",
    });
    const response = await postCertificateRoute(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(
      "Compliance-Certificate-",
    );
    expect(response.headers.get("X-Certificate-Number")).toBe(
      "CAELEX-CERT-ABC123",
    );
    expect(response.headers.get("X-Compliance-Score")).toBe("85");
  });

  it("should use organization from user profile when not in request body", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      organization: "Profile Org",
      name: "Test User",
      email: "test@example.com",
    } as never);
    vi.mocked(generateComplianceCertificateData).mockResolvedValue({
      userId: "user-123",
      organizationName: "Profile Org",
      certificateNumber: "CAELEX-CERT-PROF",
      issuedAt: new Date(),
      validUntil: new Date(),
      complianceScore: 75,
      modules: [],
      attestations: [],
    });

    const pdfBuffer = Buffer.from("pdf");
    vi.mocked(renderToBuffer).mockResolvedValue(pdfBuffer as never);
    vi.mocked(prisma.reportArchive.create).mockResolvedValue({
      id: "rpt-2",
    } as never);

    const request = makePostRequest(
      "http://localhost/api/audit/certificate",
      {},
    );
    const response = await postCertificateRoute(request);

    expect(response.status).toBe(200);
    expect(generateComplianceCertificateData).toHaveBeenCalledWith(
      "user-123",
      "Profile Org",
    );
  });

  // ─── Error handling ───

  it("should return 500 on internal error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.user.findUnique).mockRejectedValue(
      new Error("DB connection lost"),
    );

    const request = makePostRequest("http://localhost/api/audit/certificate", {
      organizationName: "Space Corp",
    });
    const response = await postCertificateRoute(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to generate compliance certificate");
  });
});

// ============================================================

describe("GET /api/audit/certificate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Auth enforcement ───

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const response = await getCertificateRoute();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  // ─── Validation: no organization ───

  it("should return 400 when user has no organization set", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      organization: null,
    } as never);

    const response = await getCertificateRoute();
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Organization name not set in profile");
  });

  // ─── Successful preview ───

  it("should return certificate preview and recent certificates", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      organization: "Space Corp",
    } as never);
    vi.mocked(generateComplianceCertificateData).mockResolvedValue({
      userId: "user-123",
      organizationName: "Space Corp",
      certificateNumber: "CAELEX-CERT-PREV",
      issuedAt: new Date(),
      validUntil: new Date(),
      complianceScore: 72,
      modules: [
        {
          name: "Debris Mitigation",
          status: "partially_compliant",
          score: 72,
          lastAuditDate: null,
        },
      ],
      attestations: [],
    });
    vi.mocked(prisma.reportArchive.findMany).mockResolvedValue([
      {
        id: "cert-1",
        title: "Certificate 1",
        generatedAt: new Date(),
        periodEnd: new Date(),
        fileName: "cert.pdf",
      },
    ] as never);

    const response = await getCertificateRoute();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.preview).toBeDefined();
    expect(data.preview.organizationName).toBe("Space Corp");
    expect(data.preview.complianceScore).toBe(72);
    expect(data.preview.isEligible).toBe(true);
    expect(data.recentCertificates).toHaveLength(1);
  });

  it("should mark as ineligible when score is below 40", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      organization: "Space Corp",
    } as never);
    vi.mocked(generateComplianceCertificateData).mockResolvedValue({
      userId: "user-123",
      organizationName: "Space Corp",
      certificateNumber: "CAELEX-CERT-LOW",
      issuedAt: new Date(),
      validUntil: new Date(),
      complianceScore: 25,
      modules: [],
      attestations: [],
    });
    vi.mocked(prisma.reportArchive.findMany).mockResolvedValue([]);

    const response = await getCertificateRoute();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.preview.isEligible).toBe(false);
  });

  // ─── Error handling ───

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error("DB fail"));

    const response = await getCertificateRoute();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch certificate status");
  });
});

// ============================================================

describe("POST /api/audit/report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Auth enforcement ───

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = makePostRequest("http://localhost/api/audit/report", {});
    const response = await postReportRoute(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  // ─── Successful report generation ───

  it("should generate a PDF audit report", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      organization: "Space Corp",
      name: "Test User",
      email: "test@example.com",
    } as never);

    const mockReportData = {
      userId: "user-123",
      organizationName: "Space Corp",
      generatedAt: new Date(),
      period: {
        from: new Date("2025-01-01"),
        to: new Date("2025-06-30"),
      },
      summary: {
        totalEvents: 100,
        eventsByAction: {},
        eventsByEntityType: {},
        eventsByDay: [],
        topEntities: [],
        securityEvents: { total: 0, bySeverity: {}, unresolved: 0 },
        recentActivity: [],
      },
      logs: [],
      securityEvents: [],
    };

    vi.mocked(generateAuditReportData).mockResolvedValue(
      mockReportData as never,
    );

    const pdfBuffer = Buffer.from("fake-audit-report-pdf");
    vi.mocked(renderToBuffer).mockResolvedValue(pdfBuffer as never);

    const request = makePostRequest("http://localhost/api/audit/report", {
      startDate: "2025-01-01",
      endDate: "2025-06-30",
    });
    const response = await postReportRoute(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(
      "Audit-Report-",
    );
    expect(response.headers.get("Content-Length")).toBe(
      pdfBuffer.length.toString(),
    );
  });

  it("should pass filters to generateAuditReportData", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      organization: "Space Corp",
      name: "Test",
      email: "t@t.com",
    } as never);

    const mockReportData = {
      userId: "user-123",
      period: { from: new Date(), to: new Date() },
      summary: {
        totalEvents: 0,
        eventsByAction: {},
        eventsByEntityType: {},
        eventsByDay: [],
        topEntities: [],
        securityEvents: { total: 0, bySeverity: {}, unresolved: 0 },
        recentActivity: [],
      },
      logs: [],
      securityEvents: [],
    };
    vi.mocked(generateAuditReportData).mockResolvedValue(
      mockReportData as never,
    );
    vi.mocked(renderToBuffer).mockResolvedValue(Buffer.from("pdf") as never);

    const request = makePostRequest("http://localhost/api/audit/report", {
      startDate: "2025-01-01",
      endDate: "2025-06-30",
      actions: ["document_uploaded"],
      entityTypes: ["document"],
      includeSecurityEvents: true,
    });
    await postReportRoute(request);

    expect(generateAuditReportData).toHaveBeenCalledWith(
      "user-123",
      {
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-06-30"),
        actions: ["document_uploaded"],
        entityTypes: ["document"],
        includeSecurityEvents: true,
      },
      "Space Corp",
    );
  });

  // ─── Error handling ───

  it("should return 500 on PDF generation failure", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      organization: "X",
      name: "X",
      email: "x@x.com",
    } as never);
    vi.mocked(generateAuditReportData).mockRejectedValue(
      new Error("Report generation failed"),
    );

    const request = makePostRequest("http://localhost/api/audit/report", {});
    const response = await postReportRoute(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to generate audit report");
  });
});
