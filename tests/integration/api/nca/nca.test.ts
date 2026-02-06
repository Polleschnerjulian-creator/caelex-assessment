import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/services/nca-submission-service", () => ({
  getSubmissions: vi.fn(),
  getSubmissionStats: vi.fn(),
  getNCAAuthorityLabel: vi.fn(),
  getSubmissionMethodLabel: vi.fn(),
  getSubmissionStatusLabel: vi.fn(),
  getSubmissionStatusColor: vi.fn(),
  submitToNCA: vi.fn(),
  NCA_AUTHORITY_INFO: {
    GERMAN_NCA: {
      name: "German NCA",
      country: "Germany",
      description: "German authority",
    },
    FR_CNES: {
      name: "Centre National d'Etudes Spatiales",
      country: "France",
      description: "French space agency",
    },
    DE_BMWK: {
      name: "Federal Ministry for Economic Affairs and Climate Action",
      country: "Germany",
      portalUrl: "https://www.bmwk.de",
      description: "German national authority for space activities",
    },
  },
}));

vi.mock("@/lib/validations", () => ({
  safeJsonParse: vi.fn((json: string | null, fallback: unknown) => {
    if (!json) return fallback;
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }),
  safeJsonParseArray: vi.fn((json: string | null) => {
    if (!json) return [];
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supervisionReport: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    nCASubmission: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { auth } from "@/lib/auth";
import {
  getSubmissions,
  getSubmissionStats,
  getNCAAuthorityLabel,
  getSubmissionMethodLabel,
  getSubmissionStatusLabel,
  getSubmissionStatusColor,
  submitToNCA,
  NCA_AUTHORITY_INFO,
} from "@/lib/services/nca-submission-service";
import { GET } from "@/app/api/nca/submissions/route";
import { POST } from "@/app/api/nca/submit/route";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  },
};

function createRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost"), options);
}

const mockSubmission = {
  id: "sub-1",
  ncaAuthority: "GERMAN_NCA",
  submissionMethod: "ELECTRONIC",
  status: "SUBMITTED",
  attachments: null,
  statusHistory: null,
};

// ─── GET /api/nca/submissions ────────────────────────────────────────────────

describe("GET /api/nca/submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default label mocks
    vi.mocked(getNCAAuthorityLabel).mockReturnValue("German NCA");
    vi.mocked(getSubmissionMethodLabel).mockReturnValue("Electronic");
    vi.mocked(getSubmissionStatusLabel).mockReturnValue("Submitted");
    vi.mocked(getSubmissionStatusColor).mockReturnValue("blue");
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = createRequest("http://localhost/api/nca/submissions");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return submissions for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getSubmissions).mockResolvedValue({
      submissions: [mockSubmission as any],
      total: 1,
    });

    const request = createRequest("http://localhost/api/nca/submissions");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.submissions).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.limit).toBe(50);
    expect(data.offset).toBe(0);
    expect(data.stats).toBeUndefined();

    // Verify service was called with correct userId
    expect(getSubmissions).toHaveBeenCalledWith("test-user-id", {
      reportId: undefined,
      ncaAuthority: undefined,
      status: undefined,
      fromDate: undefined,
      toDate: undefined,
      limit: 50,
      offset: 0,
    });
  });

  it("should pass filter params to service (ncaAuthority, status)", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getSubmissions).mockResolvedValue({
      submissions: [mockSubmission as any],
      total: 1,
    });

    const request = createRequest(
      "http://localhost/api/nca/submissions?ncaAuthority=GERMAN_NCA&status=SUBMITTED",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getSubmissions).toHaveBeenCalledWith(
      "test-user-id",
      expect.objectContaining({
        ncaAuthority: "GERMAN_NCA",
        status: "SUBMITTED",
      }),
    );
  });

  it("should include stats when includeStats=true", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getSubmissions).mockResolvedValue({
      submissions: [mockSubmission as any],
      total: 1,
    });

    const mockStats = {
      total: 5,
      byStatus: { SUBMITTED: 3, ACKNOWLEDGED: 2 },
      byAuthority: { GERMAN_NCA: 3, FR_CNES: 2 },
      pendingFollowUps: 1,
      recentSubmissions: 2,
    };
    vi.mocked(getSubmissionStats).mockResolvedValue(mockStats);

    const request = createRequest(
      "http://localhost/api/nca/submissions?includeStats=true",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats).toEqual(mockStats);
    expect(getSubmissionStats).toHaveBeenCalledWith("test-user-id");
  });

  it("should not include stats when includeStats is not set", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getSubmissions).mockResolvedValue({
      submissions: [mockSubmission as any],
      total: 1,
    });

    const request = createRequest("http://localhost/api/nca/submissions");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats).toBeUndefined();
    expect(getSubmissionStats).not.toHaveBeenCalled();
  });

  it("should enrich submissions with labels", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getSubmissions).mockResolvedValue({
      submissions: [mockSubmission as any],
      total: 1,
    });
    vi.mocked(getNCAAuthorityLabel).mockReturnValue(
      "Federal Ministry for Economic Affairs",
    );
    vi.mocked(getSubmissionMethodLabel).mockReturnValue("Electronic Portal");
    vi.mocked(getSubmissionStatusLabel).mockReturnValue("Submitted");
    vi.mocked(getSubmissionStatusColor).mockReturnValue("blue");

    const request = createRequest("http://localhost/api/nca/submissions");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    const submission = data.submissions[0];
    expect(submission.ncaAuthorityLabel).toBe(
      "Federal Ministry for Economic Affairs",
    );
    expect(submission.submissionMethodLabel).toBe("Electronic Portal");
    expect(submission.statusLabel).toBe("Submitted");
    expect(submission.statusColor).toBe("blue");

    // Verify label functions were called with correct values
    expect(getNCAAuthorityLabel).toHaveBeenCalledWith("GERMAN_NCA");
    expect(getSubmissionMethodLabel).toHaveBeenCalledWith("ELECTRONIC");
    expect(getSubmissionStatusLabel).toHaveBeenCalledWith("SUBMITTED");
    expect(getSubmissionStatusColor).toHaveBeenCalledWith("SUBMITTED");
  });

  it("should support pagination via limit and offset", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getSubmissions).mockResolvedValue({
      submissions: [mockSubmission as any],
      total: 100,
    });

    const request = createRequest(
      "http://localhost/api/nca/submissions?limit=10&offset=20",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.limit).toBe(10);
    expect(data.offset).toBe(20);
    expect(getSubmissions).toHaveBeenCalledWith(
      "test-user-id",
      expect.objectContaining({
        limit: 10,
        offset: 20,
      }),
    );
  });

  it("should handle date range filters (fromDate, toDate)", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getSubmissions).mockResolvedValue({
      submissions: [],
      total: 0,
    });

    const request = createRequest(
      "http://localhost/api/nca/submissions?fromDate=2025-01-01&toDate=2025-12-31",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getSubmissions).toHaveBeenCalledWith(
      "test-user-id",
      expect.objectContaining({
        fromDate: new Date("2025-01-01"),
        toDate: new Date("2025-12-31"),
      }),
    );
  });

  it("should parse JSON fields (attachments, statusHistory)", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const submissionWithJsonFields = {
      ...mockSubmission,
      attachments: JSON.stringify([
        {
          fileName: "report.pdf",
          fileSize: 1024,
          fileUrl: "/files/report.pdf",
        },
      ]),
      statusHistory: JSON.stringify([
        { status: "SUBMITTED", timestamp: "2025-06-01T00:00:00Z" },
      ]),
    };

    vi.mocked(getSubmissions).mockResolvedValue({
      submissions: [submissionWithJsonFields as any],
      total: 1,
    });

    const request = createRequest("http://localhost/api/nca/submissions");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    const submission = data.submissions[0];
    expect(submission.attachments).toEqual([
      { fileName: "report.pdf", fileSize: 1024, fileUrl: "/files/report.pdf" },
    ]);
    expect(submission.statusHistory).toEqual([
      { status: "SUBMITTED", timestamp: "2025-06-01T00:00:00Z" },
    ]);
  });

  it("should pass reportId filter when provided", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getSubmissions).mockResolvedValue({
      submissions: [],
      total: 0,
    });

    const request = createRequest(
      "http://localhost/api/nca/submissions?reportId=report-123",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(getSubmissions).toHaveBeenCalledWith(
      "test-user-id",
      expect.objectContaining({
        reportId: "report-123",
      }),
    );
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getSubmissions).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = createRequest("http://localhost/api/nca/submissions");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch submissions");
  });
});

// ─── POST /api/nca/submit ────────────────────────────────────────────────────

describe("POST /api/nca/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getNCAAuthorityLabel).mockReturnValue("German NCA");
    vi.mocked(getSubmissionMethodLabel).mockReturnValue("Electronic");
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const request = createRequest("http://localhost/api/nca/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: "report-1",
        ncaAuthority: "DE_BMWK",
        submissionMethod: "PORTAL",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when reportId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = createRequest("http://localhost/api/nca/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ncaAuthority: "DE_BMWK",
        submissionMethod: "PORTAL",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Report ID is required");
  });

  it("should return 400 when ncaAuthority is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = createRequest("http://localhost/api/nca/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: "report-1",
        submissionMethod: "PORTAL",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Valid NCA authority is required");
  });

  it("should return 400 when ncaAuthority is invalid", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = createRequest("http://localhost/api/nca/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: "report-1",
        ncaAuthority: "INVALID_AUTHORITY",
        submissionMethod: "PORTAL",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Valid NCA authority is required");
  });

  it("should return 400 when submissionMethod is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = createRequest("http://localhost/api/nca/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: "report-1",
        ncaAuthority: "DE_BMWK",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Submission method is required");
  });

  it("should return 404 when report is not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supervisionReport.findFirst).mockResolvedValue(null);

    const request = createRequest("http://localhost/api/nca/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: "nonexistent-report",
        ncaAuthority: "DE_BMWK",
        submissionMethod: "PORTAL",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Report not found or access denied");
  });

  it("should return 400 when report is not in a submittable state", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supervisionReport.findFirst).mockResolvedValue({
      id: "report-1",
      status: "draft",
      supervision: { userId: "test-user-id" },
    } as any);

    const request = createRequest("http://localhost/api/nca/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: "report-1",
        ncaAuthority: "DE_BMWK",
        submissionMethod: "PORTAL",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain(
      "Report must be in 'generated' or 'ready' state",
    );
  });

  it("should successfully submit a report to NCA", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supervisionReport.findFirst).mockResolvedValue({
      id: "report-1",
      status: "generated",
      supervision: { userId: "test-user-id" },
    } as any);

    const createdSubmission = {
      id: "sub-new-1",
      userId: "test-user-id",
      reportId: "report-1",
      ncaAuthority: "DE_BMWK",
      submissionMethod: "PORTAL",
      status: "SUBMITTED",
      attachments: null,
      statusHistory: JSON.stringify([
        { status: "SUBMITTED", timestamp: "2025-06-01T00:00:00Z" },
      ]),
    };

    vi.mocked(submitToNCA).mockResolvedValue(createdSubmission as any);
    vi.mocked(prisma.supervisionReport.update).mockResolvedValue({} as any);
    vi.mocked(getNCAAuthorityLabel).mockReturnValue(
      "Federal Ministry for Economic Affairs and Climate Action",
    );
    vi.mocked(getSubmissionMethodLabel).mockReturnValue("Online Portal");

    const request = createRequest("http://localhost/api/nca/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: "report-1",
        ncaAuthority: "DE_BMWK",
        submissionMethod: "PORTAL",
        coverLetter: "Please review this report.",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.submission).toBeDefined();
    expect(data.submission.id).toBe("sub-new-1");
    expect(data.submission.ncaAuthorityLabel).toBe(
      "Federal Ministry for Economic Affairs and Climate Action",
    );
    expect(data.submission.submissionMethodLabel).toBe("Online Portal");

    // Verify submitToNCA was called
    expect(submitToNCA).toHaveBeenCalledWith({
      userId: "test-user-id",
      reportId: "report-1",
      ncaAuthority: "DE_BMWK",
      submissionMethod: "PORTAL",
      coverLetter: "Please review this report.",
      attachments: undefined,
    });

    // Verify report status was updated
    expect(prisma.supervisionReport.update).toHaveBeenCalledWith({
      where: { id: "report-1" },
      data: {
        status: "submitted",
        submittedAt: expect.any(Date),
      },
    });

    // Verify audit event was logged
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "test-user-id",
        action: "NCA_REPORT_SUBMITTED",
        entityType: "nca_submission",
        entityId: "sub-new-1",
      }),
    );
  });

  it("should accept report in 'ready' state", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supervisionReport.findFirst).mockResolvedValue({
      id: "report-2",
      status: "ready",
      supervision: { userId: "test-user-id" },
    } as any);

    vi.mocked(submitToNCA).mockResolvedValue({
      id: "sub-new-2",
      ncaAuthority: "DE_BMWK",
      submissionMethod: "EMAIL",
      status: "SUBMITTED",
      attachments: null,
      statusHistory: null,
    } as any);
    vi.mocked(prisma.supervisionReport.update).mockResolvedValue({} as any);

    const request = createRequest("http://localhost/api/nca/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: "report-2",
        ncaAuthority: "DE_BMWK",
        submissionMethod: "EMAIL",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should return 500 on service error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supervisionReport.findFirst).mockRejectedValue(
      new Error("Database error"),
    );

    const request = createRequest("http://localhost/api/nca/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: "report-1",
        ncaAuthority: "DE_BMWK",
        submissionMethod: "PORTAL",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to submit report to NCA");
  });
});
