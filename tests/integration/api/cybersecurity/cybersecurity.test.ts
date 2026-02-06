import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ───
vi.mock("@/lib/prisma", () => ({
  prisma: {
    cybersecurityAssessment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    cybersecurityRequirementStatus: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ─── Mock Auth ───
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// ─── Mock Audit ───
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
  getRequestContext: vi.fn().mockReturnValue({
    ipAddress: "127.0.0.1",
    userAgent: "test-agent",
  }),
}));

// ─── Mock Logger ───
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    security: vi.fn(),
  },
}));

// ─── Imports (after mocks) ───
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  GET as cyberGET,
  POST as cyberPOST,
} from "@/app/api/cybersecurity/route";
import {
  GET as assessmentGET,
  PATCH as assessmentPATCH,
  DELETE as assessmentDELETE,
} from "@/app/api/cybersecurity/[assessmentId]/route";
import {
  GET as requirementsGET,
  PATCH as requirementsPATCH,
} from "@/app/api/cybersecurity/requirements/route";
import { POST as frameworkPOST } from "@/app/api/cybersecurity/framework/generate/route";

// ─── Test Helpers ───

const TEST_USER_ID = "user-test-123";

function authed() {
  vi.mocked(auth).mockResolvedValue({ user: { id: TEST_USER_ID } } as never);
}

function unauthed() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

function makeRequest(
  url: string,
  options?: { method?: string; body?: unknown },
): Request {
  return new Request(url, {
    method: options?.method ?? "GET",
    headers: { "Content-Type": "application/json" },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  });
}

function makeParams(assessmentId: string) {
  return { params: Promise.resolve({ assessmentId }) };
}

const validAssessmentPayload = {
  assessmentName: "Test Cybersecurity Assessment",
  organizationSize: "medium",
  employeeCount: 100,
  annualRevenue: 20000000,
  spaceSegmentComplexity: "small_constellation",
  satelliteCount: 5,
  hasGroundSegment: true,
  groundStationCount: 2,
  dataSensitivityLevel: "confidential",
  processesPersonalData: false,
  handlesGovData: false,
  existingCertifications: ["iso27001"],
  hasSecurityTeam: true,
  securityTeamSize: 3,
  hasIncidentResponsePlan: true,
  hasBCP: false,
  criticalSupplierCount: 5,
  supplierSecurityAssessed: false,
};

const mockAssessment = {
  id: "assessment-1",
  userId: TEST_USER_ID,
  assessmentName: "Test Assessment",
  organizationSize: "medium",
  employeeCount: 100,
  annualRevenue: 20000000,
  spaceSegmentComplexity: "small_constellation",
  satelliteCount: 5,
  hasGroundSegment: true,
  groundStationCount: 2,
  dataSensitivityLevel: "confidential",
  processesPersonalData: false,
  handlesGovData: false,
  existingCertifications: '["iso27001"]',
  hasSecurityTeam: true,
  securityTeamSize: 3,
  hasIncidentResponsePlan: true,
  hasBCP: false,
  criticalSupplierCount: 5,
  supplierSecurityAssessed: false,
  isSimplifiedRegime: false,
  maturityScore: 0,
  frameworkGenerated: false,
  frameworkGeneratedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  requirements: [],
};

// ═══════════════════════════════════════════════════════════════
// GET /api/cybersecurity
// ═══════════════════════════════════════════════════════════════
describe("GET /api/cybersecurity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    unauthed();
    const res = await cyberGET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 200 with assessments when authenticated", async () => {
    authed();
    const assessments = [mockAssessment];
    vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue(
      assessments as never,
    );

    const res = await cyberGET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.assessments).toBeDefined();
    expect(data.assessments).toHaveLength(1);
    expect(prisma.cybersecurityAssessment.findMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID },
      include: { requirements: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should return 200 with empty array when user has no assessments", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findMany).mockResolvedValue(
      [] as never,
    );

    const res = await cyberGET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.assessments).toEqual([]);
  });

  it("should return 500 on database error", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findMany).mockRejectedValue(
      new Error("DB connection failed"),
    );

    const res = await cyberGET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/cybersecurity
// ═══════════════════════════════════════════════════════════════
describe("POST /api/cybersecurity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    unauthed();
    const req = makeRequest("http://localhost/api/cybersecurity", {
      method: "POST",
      body: validAssessmentPayload,
    });
    const res = await cyberPOST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when required fields are missing", async () => {
    authed();
    const req = makeRequest("http://localhost/api/cybersecurity", {
      method: "POST",
      body: { assessmentName: "Missing fields" },
    });
    const res = await cyberPOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 400 when organizationSize is missing", async () => {
    authed();
    const { organizationSize, ...incomplete } = validAssessmentPayload;
    const req = makeRequest("http://localhost/api/cybersecurity", {
      method: "POST",
      body: incomplete,
    });
    const res = await cyberPOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 400 when spaceSegmentComplexity is missing", async () => {
    authed();
    const { spaceSegmentComplexity, ...incomplete } = validAssessmentPayload;
    const req = makeRequest("http://localhost/api/cybersecurity", {
      method: "POST",
      body: incomplete,
    });
    const res = await cyberPOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 400 when dataSensitivityLevel is missing", async () => {
    authed();
    const { dataSensitivityLevel, ...incomplete } = validAssessmentPayload;
    const req = makeRequest("http://localhost/api/cybersecurity", {
      method: "POST",
      body: incomplete,
    });
    const res = await cyberPOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 200 with assessment on valid input", async () => {
    authed();
    const createdAssessment = { ...mockAssessment, id: "new-assessment-1" };

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      return (fn as Function)({
        cybersecurityAssessment: {
          create: vi.fn().mockResolvedValue(createdAssessment),
        },
        cybersecurityRequirementStatus: {
          create: vi.fn().mockResolvedValue({}),
        },
      });
    });

    vi.mocked(prisma.cybersecurityAssessment.findUnique).mockResolvedValue({
      ...createdAssessment,
      requirements: [],
    } as never);

    const req = makeRequest("http://localhost/api/cybersecurity", {
      method: "POST",
      body: validAssessmentPayload,
    });
    const res = await cyberPOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.assessment).toBeDefined();
    expect(data.isSimplifiedRegime).toBeDefined();
    expect(data.applicableRequirements).toBeDefined();
    expect(Array.isArray(data.applicableRequirements)).toBe(true);
  });

  it("should correctly identify non-simplified regime for medium enterprise", async () => {
    authed();
    const createdAssessment = { ...mockAssessment, id: "new-assessment-2" };

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      return (fn as Function)({
        cybersecurityAssessment: {
          create: vi.fn().mockResolvedValue(createdAssessment),
        },
        cybersecurityRequirementStatus: {
          create: vi.fn().mockResolvedValue({}),
        },
      });
    });

    vi.mocked(prisma.cybersecurityAssessment.findUnique).mockResolvedValue({
      ...createdAssessment,
      requirements: [],
    } as never);

    const req = makeRequest("http://localhost/api/cybersecurity", {
      method: "POST",
      body: { ...validAssessmentPayload, organizationSize: "medium" },
    });
    const res = await cyberPOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    // Medium enterprises are NOT eligible for simplified regime
    expect(data.isSimplifiedRegime).toBe(false);
  });

  it("should correctly identify simplified regime for micro enterprise", async () => {
    authed();
    const microPayload = {
      ...validAssessmentPayload,
      organizationSize: "micro",
      spaceSegmentComplexity: "single_satellite",
      handlesGovData: false,
      processesPersonalData: false,
    };
    const createdAssessment = {
      ...mockAssessment,
      id: "new-assessment-micro",
      organizationSize: "micro",
      spaceSegmentComplexity: "single_satellite",
      isSimplifiedRegime: true,
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      return (fn as Function)({
        cybersecurityAssessment: {
          create: vi.fn().mockResolvedValue(createdAssessment),
        },
        cybersecurityRequirementStatus: {
          create: vi.fn().mockResolvedValue({}),
        },
      });
    });

    vi.mocked(prisma.cybersecurityAssessment.findUnique).mockResolvedValue({
      ...createdAssessment,
      requirements: [],
    } as never);

    const req = makeRequest("http://localhost/api/cybersecurity", {
      method: "POST",
      body: microPayload,
    });
    const res = await cyberPOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.isSimplifiedRegime).toBe(true);
  });

  it("should return 500 on database error during creation", async () => {
    authed();
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Error("Transaction failed"),
    );

    const req = makeRequest("http://localhost/api/cybersecurity", {
      method: "POST",
      body: validAssessmentPayload,
    });
    const res = await cyberPOST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/cybersecurity/[assessmentId]
// ═══════════════════════════════════════════════════════════════
describe("GET /api/cybersecurity/[assessmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    unauthed();
    const req = makeRequest("http://localhost/api/cybersecurity/assessment-1");
    const res = await assessmentGET(req, makeParams("assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when assessment not found", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      null as never,
    );

    const req = makeRequest(
      "http://localhost/api/cybersecurity/nonexistent-id",
    );
    const res = await assessmentGET(req, makeParams("nonexistent-id"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 200 with assessment details", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      mockAssessment as never,
    );

    const req = makeRequest("http://localhost/api/cybersecurity/assessment-1");
    const res = await assessmentGET(req, makeParams("assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.assessment).toBeDefined();
    expect(prisma.cybersecurityAssessment.findFirst).toHaveBeenCalledWith({
      where: { id: "assessment-1", userId: TEST_USER_ID },
      include: { requirements: true },
    });
  });

  it("should return 500 on database error", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockRejectedValue(
      new Error("DB error"),
    );

    const req = makeRequest("http://localhost/api/cybersecurity/assessment-1");
    const res = await assessmentGET(req, makeParams("assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// PATCH /api/cybersecurity/[assessmentId]
// ═══════════════════════════════════════════════════════════════
describe("PATCH /api/cybersecurity/[assessmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    unauthed();
    const req = makeRequest("http://localhost/api/cybersecurity/assessment-1", {
      method: "PATCH",
      body: { assessmentName: "Updated Name" },
    });
    const res = await assessmentPATCH(req, makeParams("assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when assessment not found", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      null as never,
    );

    const req = makeRequest(
      "http://localhost/api/cybersecurity/nonexistent-id",
      {
        method: "PATCH",
        body: { assessmentName: "Updated" },
      },
    );
    const res = await assessmentPATCH(req, makeParams("nonexistent-id"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 200 with updated assessment for simple field update", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      mockAssessment as never,
    );
    const updatedAssessment = {
      ...mockAssessment,
      assessmentName: "Updated Name",
    };
    vi.mocked(prisma.cybersecurityAssessment.update).mockResolvedValue(
      updatedAssessment as never,
    );

    const req = makeRequest("http://localhost/api/cybersecurity/assessment-1", {
      method: "PATCH",
      body: { assessmentName: "Updated Name" },
    });
    const res = await assessmentPATCH(req, makeParams("assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.assessment).toBeDefined();
  });

  it("should recalculate simplified regime when profile fields change", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      mockAssessment as never,
    );
    vi.mocked(prisma.cybersecurityRequirementStatus.findMany).mockResolvedValue(
      [] as never,
    );
    vi.mocked(
      prisma.cybersecurityRequirementStatus.createMany,
    ).mockResolvedValue({ count: 0 } as never);
    vi.mocked(
      prisma.cybersecurityRequirementStatus.deleteMany,
    ).mockResolvedValue({ count: 0 } as never);
    const updatedAssessment = {
      ...mockAssessment,
      organizationSize: "large",
    };
    vi.mocked(prisma.cybersecurityAssessment.update).mockResolvedValue(
      updatedAssessment as never,
    );

    const req = makeRequest("http://localhost/api/cybersecurity/assessment-1", {
      method: "PATCH",
      body: { organizationSize: "large" },
    });
    const res = await assessmentPATCH(req, makeParams("assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    // When organizationSize changes, simplified regime should be recalculated
    expect(prisma.cybersecurityAssessment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isSimplifiedRegime: expect.any(Boolean),
        }),
      }),
    );
  });

  it("should return 500 on database error", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockRejectedValue(
      new Error("DB error"),
    );

    const req = makeRequest("http://localhost/api/cybersecurity/assessment-1", {
      method: "PATCH",
      body: { assessmentName: "Updated" },
    });
    const res = await assessmentPATCH(req, makeParams("assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// DELETE /api/cybersecurity/[assessmentId]
// ═══════════════════════════════════════════════════════════════
describe("DELETE /api/cybersecurity/[assessmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    unauthed();
    const req = makeRequest("http://localhost/api/cybersecurity/assessment-1", {
      method: "DELETE",
    });
    const res = await assessmentDELETE(req, makeParams("assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when assessment not found", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      null as never,
    );

    const req = makeRequest(
      "http://localhost/api/cybersecurity/nonexistent-id",
      {
        method: "DELETE",
      },
    );
    const res = await assessmentDELETE(req, makeParams("nonexistent-id"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 200 with success on valid delete", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      mockAssessment as never,
    );
    vi.mocked(prisma.cybersecurityAssessment.delete).mockResolvedValue(
      mockAssessment as never,
    );

    const req = makeRequest("http://localhost/api/cybersecurity/assessment-1", {
      method: "DELETE",
    });
    const res = await assessmentDELETE(req, makeParams("assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.cybersecurityAssessment.delete).toHaveBeenCalledWith({
      where: { id: "assessment-1" },
    });
  });

  it("should return 500 on database error", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      mockAssessment as never,
    );
    vi.mocked(prisma.cybersecurityAssessment.delete).mockRejectedValue(
      new Error("DB error"),
    );

    const req = makeRequest("http://localhost/api/cybersecurity/assessment-1", {
      method: "DELETE",
    });
    const res = await assessmentDELETE(req, makeParams("assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/cybersecurity/requirements
// ═══════════════════════════════════════════════════════════════
describe("GET /api/cybersecurity/requirements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    unauthed();
    const req = makeRequest("http://localhost/api/cybersecurity/requirements");
    const res = await requirementsGET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return all requirements when no assessmentId is provided", async () => {
    authed();
    const req = makeRequest("http://localhost/api/cybersecurity/requirements");
    const res = await requirementsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.requirements).toBeDefined();
    expect(Array.isArray(data.requirements)).toBe(true);
    // Should return the static requirements list
    expect(data.requirements.length).toBeGreaterThan(0);
  });

  it("should return 404 when assessmentId is provided but not found", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      null as never,
    );

    const req = makeRequest(
      "http://localhost/api/cybersecurity/requirements?assessmentId=nonexistent",
    );
    const res = await requirementsGET(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return requirements with statuses when assessmentId is found", async () => {
    authed();
    const assessmentWithReqs = {
      ...mockAssessment,
      requirements: [
        {
          id: "req-status-1",
          assessmentId: "assessment-1",
          requirementId: "sec_policy",
          status: "compliant",
          notes: "Policy approved",
          evidenceNotes: "Doc attached",
          targetDate: null,
        },
      ],
    };
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      assessmentWithReqs as never,
    );

    const req = makeRequest(
      "http://localhost/api/cybersecurity/requirements?assessmentId=assessment-1",
    );
    const res = await requirementsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.requirements).toBeDefined();
    expect(data.assessment).toBeDefined();
    expect(data.assessment.id).toBe("assessment-1");
  });

  it("should return 500 on database error", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockRejectedValue(
      new Error("DB error"),
    );

    const req = makeRequest(
      "http://localhost/api/cybersecurity/requirements?assessmentId=assessment-1",
    );
    const res = await requirementsGET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// PATCH /api/cybersecurity/requirements
// ═══════════════════════════════════════════════════════════════
describe("PATCH /api/cybersecurity/requirements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    unauthed();
    const req = makeRequest("http://localhost/api/cybersecurity/requirements", {
      method: "PATCH",
      body: {
        assessmentId: "assessment-1",
        requirementId: "sec_policy",
        status: "compliant",
      },
    });
    const res = await requirementsPATCH(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when assessmentId is missing", async () => {
    authed();
    const req = makeRequest("http://localhost/api/cybersecurity/requirements", {
      method: "PATCH",
      body: { requirementId: "sec_policy", status: "compliant" },
    });
    const res = await requirementsPATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("assessmentId");
  });

  it("should return 400 when requirementId is missing", async () => {
    authed();
    const req = makeRequest("http://localhost/api/cybersecurity/requirements", {
      method: "PATCH",
      body: { assessmentId: "assessment-1", status: "compliant" },
    });
    const res = await requirementsPATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("requirementId");
  });

  it("should return 404 when assessment not found", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      null as never,
    );

    const req = makeRequest("http://localhost/api/cybersecurity/requirements", {
      method: "PATCH",
      body: {
        assessmentId: "nonexistent",
        requirementId: "sec_policy",
        status: "compliant",
      },
    });
    const res = await requirementsPATCH(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 200 with updated requirement status and maturity score", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      mockAssessment as never,
    );
    vi.mocked(
      prisma.cybersecurityRequirementStatus.findUnique,
    ).mockResolvedValue(null as never);
    const upsertResult = {
      id: "status-1",
      assessmentId: "assessment-1",
      requirementId: "sec_policy",
      status: "compliant",
      notes: null,
      evidenceNotes: null,
      targetDate: null,
    };
    vi.mocked(prisma.cybersecurityRequirementStatus.upsert).mockResolvedValue(
      upsertResult as never,
    );
    vi.mocked(prisma.cybersecurityRequirementStatus.findMany).mockResolvedValue(
      [upsertResult] as never,
    );
    vi.mocked(prisma.cybersecurityAssessment.update).mockResolvedValue({
      ...mockAssessment,
      maturityScore: 15,
    } as never);

    const req = makeRequest("http://localhost/api/cybersecurity/requirements", {
      method: "PATCH",
      body: {
        assessmentId: "assessment-1",
        requirementId: "sec_policy",
        status: "compliant",
      },
    });
    const res = await requirementsPATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.requirementStatus).toBeDefined();
    expect(data.maturityScore).toBeDefined();
    expect(typeof data.maturityScore).toBe("number");
  });

  it("should handle updating with notes and evidence", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      mockAssessment as never,
    );
    vi.mocked(
      prisma.cybersecurityRequirementStatus.findUnique,
    ).mockResolvedValue({
      id: "status-1",
      assessmentId: "assessment-1",
      requirementId: "sec_policy",
      status: "not_assessed",
    } as never);
    const upsertResult = {
      id: "status-1",
      assessmentId: "assessment-1",
      requirementId: "sec_policy",
      status: "partial",
      notes: "Working on it",
      evidenceNotes: "ISO cert pending",
      targetDate: null,
    };
    vi.mocked(prisma.cybersecurityRequirementStatus.upsert).mockResolvedValue(
      upsertResult as never,
    );
    vi.mocked(prisma.cybersecurityRequirementStatus.findMany).mockResolvedValue(
      [upsertResult] as never,
    );
    vi.mocked(prisma.cybersecurityAssessment.update).mockResolvedValue({
      ...mockAssessment,
      maturityScore: 8,
    } as never);

    const req = makeRequest("http://localhost/api/cybersecurity/requirements", {
      method: "PATCH",
      body: {
        assessmentId: "assessment-1",
        requirementId: "sec_policy",
        status: "partial",
        notes: "Working on it",
        evidenceNotes: "ISO cert pending",
      },
    });
    const res = await requirementsPATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.requirementStatus).toBeDefined();
  });

  it("should return 500 on database error", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockRejectedValue(
      new Error("DB error"),
    );

    const req = makeRequest("http://localhost/api/cybersecurity/requirements", {
      method: "PATCH",
      body: {
        assessmentId: "assessment-1",
        requirementId: "sec_policy",
        status: "compliant",
      },
    });
    const res = await requirementsPATCH(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/cybersecurity/framework/generate
// ═══════════════════════════════════════════════════════════════
describe("POST /api/cybersecurity/framework/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    unauthed();
    const req = makeRequest(
      "http://localhost/api/cybersecurity/framework/generate",
      {
        method: "POST",
        body: { assessmentId: "assessment-1" },
      },
    );
    const res = await frameworkPOST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when assessmentId is missing", async () => {
    authed();
    const req = makeRequest(
      "http://localhost/api/cybersecurity/framework/generate",
      {
        method: "POST",
        body: {},
      },
    );
    const res = await frameworkPOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("assessmentId");
  });

  it("should return 404 when assessment not found", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      null as never,
    );

    const req = makeRequest(
      "http://localhost/api/cybersecurity/framework/generate",
      {
        method: "POST",
        body: { assessmentId: "nonexistent" },
      },
    );
    const res = await frameworkPOST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 200 with generated framework", async () => {
    authed();
    const assessmentWithUser = {
      ...mockAssessment,
      requirements: [
        {
          id: "status-1",
          assessmentId: "assessment-1",
          requirementId: "sec_policy",
          status: "compliant",
          notes: null,
          evidenceNotes: null,
          targetDate: null,
        },
      ],
      user: {
        name: "Test User",
        organization: "Test Org",
      },
    };
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      assessmentWithUser as never,
    );
    vi.mocked(prisma.cybersecurityAssessment.update).mockResolvedValue({
      ...assessmentWithUser,
      frameworkGenerated: true,
      frameworkGeneratedAt: new Date(),
    } as never);

    const req = makeRequest(
      "http://localhost/api/cybersecurity/framework/generate",
      {
        method: "POST",
        body: { assessmentId: "assessment-1" },
      },
    );
    const res = await frameworkPOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.framework).toBeDefined();
    expect(data.framework.organizationProfile).toBeDefined();
    expect(data.framework.maturityAssessment).toBeDefined();
    expect(data.framework.complianceStatus).toBeDefined();
    expect(data.framework.gapAnalysis).toBeDefined();
    expect(data.framework.implementationPlan).toBeDefined();
    expect(data.framework.recommendations).toBeDefined();
    expect(data.framework.generatedAt).toBeDefined();
  });

  it("should include correct compliance status counts", async () => {
    authed();
    const assessmentWithUser = {
      ...mockAssessment,
      requirements: [
        {
          id: "s1",
          assessmentId: "assessment-1",
          requirementId: "sec_policy",
          status: "compliant",
        },
        {
          id: "s2",
          assessmentId: "assessment-1",
          requirementId: "risk_assessment_regular",
          status: "non_compliant",
        },
        {
          id: "s3",
          assessmentId: "assessment-1",
          requirementId: "access_control",
          status: "partial",
        },
      ],
      user: { name: "Test User", organization: "Test Org" },
    };
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      assessmentWithUser as never,
    );
    vi.mocked(prisma.cybersecurityAssessment.update).mockResolvedValue({
      ...assessmentWithUser,
      frameworkGenerated: true,
    } as never);

    const req = makeRequest(
      "http://localhost/api/cybersecurity/framework/generate",
      {
        method: "POST",
        body: { assessmentId: "assessment-1" },
      },
    );
    const res = await frameworkPOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const status = data.framework.complianceStatus;
    expect(status.totalRequirements).toBeGreaterThan(0);
    // The counts should sum to total
    const sumOfCounts =
      status.compliant +
      status.partial +
      status.nonCompliant +
      status.notAssessed +
      status.notApplicable;
    expect(sumOfCounts).toBe(status.totalRequirements);
  });

  it("should mark framework as generated in DB", async () => {
    authed();
    const assessmentWithUser = {
      ...mockAssessment,
      requirements: [],
      user: { name: "Test", organization: null },
    };
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockResolvedValue(
      assessmentWithUser as never,
    );
    vi.mocked(prisma.cybersecurityAssessment.update).mockResolvedValue({
      ...assessmentWithUser,
      frameworkGenerated: true,
    } as never);

    const req = makeRequest(
      "http://localhost/api/cybersecurity/framework/generate",
      {
        method: "POST",
        body: { assessmentId: "assessment-1" },
      },
    );
    await frameworkPOST(req);

    expect(prisma.cybersecurityAssessment.update).toHaveBeenCalledWith({
      where: { id: "assessment-1" },
      data: {
        frameworkGenerated: true,
        frameworkGeneratedAt: expect.any(Date),
      },
    });
  });

  it("should return 500 on database error", async () => {
    authed();
    vi.mocked(prisma.cybersecurityAssessment.findFirst).mockRejectedValue(
      new Error("DB error"),
    );

    const req = makeRequest(
      "http://localhost/api/cybersecurity/framework/generate",
      {
        method: "POST",
        body: { assessmentId: "assessment-1" },
      },
    );
    const res = await frameworkPOST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
