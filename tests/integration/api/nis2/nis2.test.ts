import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock server-only ───
vi.mock("server-only", () => ({}));

// ─── Mock Prisma ───
vi.mock("@/lib/prisma", () => ({
  prisma: {
    nIS2Assessment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    nIS2RequirementStatus: {
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

// ─── Mock Rate Limiting ───
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 9 }),
  getIdentifier: vi.fn().mockReturnValue("test-ip"),
  createRateLimitResponse: vi.fn().mockImplementation(
    (result) =>
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
  ),
}));

// ─── Mock NIS2 Engine ───
vi.mock("@/lib/nis2-engine.server", () => ({
  classifyNIS2Entity: vi.fn().mockReturnValue({
    classification: "important",
    reason:
      "Medium entities in the space sector are classified as important entities",
    articleRef: "NIS2 Art. 3(2)",
  }),
  calculateNIS2Compliance: vi.fn().mockResolvedValue({
    entityClassification: "important",
    classificationReason: "Medium entities in the space sector",
    classificationArticleRef: "NIS2 Art. 3(2)",
    sector: "space",
    subSector: null,
    organizationSize: "medium",
    applicableRequirements: [
      {
        id: "nis2-risk-policy",
        articleRef: "NIS2 Art. 21(2)(a)",
        title: "Risk",
      },
      {
        id: "nis2-incident",
        articleRef: "NIS2 Art. 21(2)(b)",
        title: "Incident",
      },
    ],
    totalNIS2Requirements: 51,
    applicableCount: 2,
    incidentReportingTimeline: {
      earlyWarning: { deadline: "24 hours", description: "Early warning" },
      notification: { deadline: "72 hours", description: "Notification" },
      intermediateReport: {
        deadline: "Upon request",
        description: "Intermediate",
      },
      finalReport: { deadline: "1 month", description: "Final" },
    },
    euSpaceActOverlap: {
      count: 5,
      totalPotentialSavingsWeeks: 12,
      overlappingRequirements: [],
    },
    supervisoryAuthority: "National competent authority",
    supervisoryAuthorityNote: "Check ENISA tracker",
    penalties: {
      essential: "Up to €10,000,000",
      important: "Up to €7,000,000",
      applicable: "Up to €7,000,000",
    },
    registrationRequired: true,
    registrationDeadline: "Without undue delay",
    keyDates: [
      { date: "17 October 2024", description: "Transposition deadline" },
    ],
  }),
  redactNIS2ResultForClient: vi.fn().mockReturnValue({
    entityClassification: "important",
    classificationReason: "Medium entities in the space sector",
    sector: "space",
    subSector: null,
    organizationSize: "medium",
    applicableRequirements: [
      {
        id: "nis2-risk-policy",
        articleRef: "NIS2 Art. 21(2)(a)",
        title: "Risk",
        category: "policies_risk_analysis",
        severity: "critical",
      },
    ],
    totalNIS2Requirements: 51,
    applicableCount: 2,
    incidentReportingTimeline: {
      earlyWarning: { deadline: "24 hours", description: "Early warning" },
      notification: { deadline: "72 hours", description: "Notification" },
      intermediateReport: {
        deadline: "Upon request",
        description: "Intermediate",
      },
      finalReport: { deadline: "1 month", description: "Final" },
    },
    euSpaceActOverlap: { count: 5, totalPotentialSavingsWeeks: 12 },
    penalties: {
      essential: "Up to €10,000,000",
      important: "Up to €7,000,000",
      applicable: "Up to €7,000,000",
    },
    registrationRequired: true,
    keyDates: [
      { date: "17 October 2024", description: "Transposition deadline" },
    ],
  }),
}));

// ─── Mock Cross-Regulation Service ───
vi.mock("@/lib/services/cross-regulation-service", () => ({
  buildUnifiedComplianceMatrix: vi.fn().mockResolvedValue([
    {
      category: "policies_risk_analysis",
      categoryLabel: "Risk Analysis & Security Policies",
      nis2Requirement: { id: "nis2-risk-policy" },
      euSpaceActArticles: ["Art. 76"],
      enisaControls: ["GR-01"],
      iso27001Refs: ["A.5.1"],
      complianceEffort: "single_implementation",
      description: "1 NIS2 requirement(s)",
    },
  ]),
  calculateOverlapSavings: vi.fn().mockResolvedValue({
    totalNIS2Requirements: 2,
    satisfiedByEUSpaceAct: 1,
    partiallySatisfied: 1,
    additionalEffortRequired: 0,
    estimatedWeeksSaved: 5,
    savingsPercentage: 75,
  }),
  getOverlappingRequirements: vi.fn().mockResolvedValue([
    {
      nis2RequirementId: "nis2-risk-policy",
      nis2Article: "NIS2 Art. 21(2)(a)",
      nis2Title: "Risk Analysis",
      euSpaceActArticle: "Art. 76",
      relationship: "overlaps",
      description: "Both require risk management",
      effortType: "partial_overlap",
    },
  ]),
}));

// ─── Imports (after mocks) ───
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/ratelimit";
import { GET as nis2GET, POST as nis2POST } from "@/app/api/nis2/route";
import {
  GET as assessmentGET,
  PATCH as assessmentPATCH,
  DELETE as assessmentDELETE,
} from "@/app/api/nis2/[assessmentId]/route";
import { POST as calculatePOST } from "@/app/api/nis2/calculate/route";

// ─── Test Helpers ───

const TEST_USER_ID = "user-test-nis2-123";

function authed() {
  vi.mocked(auth).mockResolvedValue({ user: { id: TEST_USER_ID } } as never);
}

function unauthed() {
  vi.mocked(auth).mockResolvedValue(null as never);
}

function makeRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  },
): Request {
  return new Request(url, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  });
}

function makeParams(assessmentId: string) {
  return { params: Promise.resolve({ assessmentId }) };
}

const validNIS2AssessmentPayload = {
  assessmentName: "Test NIS2 Assessment",
  sector: "space",
  subSector: "ground_infrastructure",
  entitySize: "medium",
  memberStateCount: 1,
  isEUEstablished: true,
  operatesGroundInfra: true,
  operatesSatComms: false,
  hasISO27001: false,
  hasExistingCSIRT: false,
};

const mockNIS2Assessment = {
  id: "nis2-assessment-1",
  userId: TEST_USER_ID,
  assessmentName: "Test NIS2 Assessment",
  entityClassification: "important",
  classificationReason: "Medium entities in the space sector",
  sector: "space",
  subSector: "ground_infrastructure",
  organizationSize: "medium",
  employeeCount: null,
  annualRevenue: null,
  memberStateCount: 1,
  operatesGroundInfra: true,
  operatesSatComms: false,
  manufacturesSpacecraft: false,
  providesLaunchServices: false,
  providesEOData: false,
  hasISO27001: false,
  hasExistingCSIRT: false,
  hasRiskManagement: false,
  complianceScore: 0,
  maturityScore: 0,
  riskLevel: "medium",
  euSpaceActOverlapCount: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  requirements: [],
};

// ═══════════════════════════════════════════════════════════════
// GET /api/nis2
// ═══════════════════════════════════════════════════════════════

describe("GET /api/nis2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    unauthed();
    const res = await nis2GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 200 with assessments when authenticated", async () => {
    authed();
    vi.mocked(prisma.nIS2Assessment.findMany).mockResolvedValue([
      mockNIS2Assessment,
    ] as never);

    const res = await nis2GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.assessments).toBeDefined();
    expect(data.assessments).toHaveLength(1);
    expect(prisma.nIS2Assessment.findMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID },
      include: { requirements: true },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should return 200 with empty array when user has no assessments", async () => {
    authed();
    vi.mocked(prisma.nIS2Assessment.findMany).mockResolvedValue([] as never);

    const res = await nis2GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.assessments).toEqual([]);
  });

  it("should return 500 on database error", async () => {
    authed();
    vi.mocked(prisma.nIS2Assessment.findMany).mockRejectedValue(
      new Error("DB connection failed"),
    );

    const res = await nis2GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/nis2
// ═══════════════════════════════════════════════════════════════

describe("POST /api/nis2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    unauthed();
    const req = makeRequest("http://localhost/api/nis2", {
      method: "POST",
      body: validNIS2AssessmentPayload,
    });
    const res = await nis2POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when sector is missing", async () => {
    authed();
    const { sector, ...incomplete } = validNIS2AssessmentPayload;
    const req = makeRequest("http://localhost/api/nis2", {
      method: "POST",
      body: incomplete,
    });
    const res = await nis2POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 400 when entitySize is missing", async () => {
    authed();
    const { entitySize, ...incomplete } = validNIS2AssessmentPayload;
    const req = makeRequest("http://localhost/api/nis2", {
      method: "POST",
      body: incomplete,
    });
    const res = await nis2POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 200 with assessment on valid input", async () => {
    authed();
    const createdAssessment = { ...mockNIS2Assessment, id: "new-nis2-1" };

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      return (fn as Function)({
        nIS2Assessment: {
          create: vi.fn().mockResolvedValue(createdAssessment),
        },
        nIS2RequirementStatus: {
          create: vi.fn().mockResolvedValue({}),
        },
      });
    });

    vi.mocked(prisma.nIS2Assessment.findUnique).mockResolvedValue({
      ...createdAssessment,
      requirements: [],
    } as never);

    const req = makeRequest("http://localhost/api/nis2", {
      method: "POST",
      body: validNIS2AssessmentPayload,
    });
    const res = await nis2POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.assessment).toBeDefined();
    expect(data.entityClassification).toBeDefined();
    expect(data.classificationReason).toBeDefined();
    expect(data.applicableRequirements).toBeDefined();
    expect(Array.isArray(data.applicableRequirements)).toBe(true);
  });

  it("should return 500 on database error during creation", async () => {
    authed();
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Error("Transaction failed"),
    );

    const req = makeRequest("http://localhost/api/nis2", {
      method: "POST",
      body: validNIS2AssessmentPayload,
    });
    const res = await nis2POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/nis2/[assessmentId]
// ═══════════════════════════════════════════════════════════════

describe("GET /api/nis2/[assessmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    unauthed();
    const req = makeRequest("http://localhost/api/nis2/nis2-assessment-1");
    const res = await assessmentGET(req, makeParams("nis2-assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when assessment not found", async () => {
    authed();
    vi.mocked(prisma.nIS2Assessment.findFirst).mockResolvedValue(null as never);

    const req = makeRequest("http://localhost/api/nis2/nonexistent-id");
    const res = await assessmentGET(req, makeParams("nonexistent-id"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 200 with assessment details", async () => {
    authed();
    vi.mocked(prisma.nIS2Assessment.findFirst).mockResolvedValue(
      mockNIS2Assessment as never,
    );

    const req = makeRequest("http://localhost/api/nis2/nis2-assessment-1");
    const res = await assessmentGET(req, makeParams("nis2-assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.assessment).toBeDefined();
    expect(prisma.nIS2Assessment.findFirst).toHaveBeenCalledWith({
      where: { id: "nis2-assessment-1", userId: TEST_USER_ID },
      include: { requirements: true },
    });
  });

  it("should return 500 on database error", async () => {
    authed();
    vi.mocked(prisma.nIS2Assessment.findFirst).mockRejectedValue(
      new Error("DB error"),
    );

    const req = makeRequest("http://localhost/api/nis2/nis2-assessment-1");
    const res = await assessmentGET(req, makeParams("nis2-assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// PATCH /api/nis2/[assessmentId]
// ═══════════════════════════════════════════════════════════════

describe("PATCH /api/nis2/[assessmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    unauthed();
    const req = makeRequest("http://localhost/api/nis2/nis2-assessment-1", {
      method: "PATCH",
      body: { assessmentName: "Updated" },
    });
    const res = await assessmentPATCH(req, makeParams("nis2-assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when assessment not found", async () => {
    authed();
    vi.mocked(prisma.nIS2Assessment.findFirst).mockResolvedValue(null as never);

    const req = makeRequest("http://localhost/api/nis2/nonexistent-id", {
      method: "PATCH",
      body: { assessmentName: "Updated" },
    });
    const res = await assessmentPATCH(req, makeParams("nonexistent-id"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 200 with updated assessment for simple field update", async () => {
    authed();
    vi.mocked(prisma.nIS2Assessment.findFirst).mockResolvedValue(
      mockNIS2Assessment as never,
    );
    const updatedAssessment = {
      ...mockNIS2Assessment,
      assessmentName: "Updated Name",
    };
    vi.mocked(prisma.nIS2Assessment.update).mockResolvedValue(
      updatedAssessment as never,
    );

    const req = makeRequest("http://localhost/api/nis2/nis2-assessment-1", {
      method: "PATCH",
      body: { assessmentName: "Updated Name" },
    });
    const res = await assessmentPATCH(req, makeParams("nis2-assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.assessment).toBeDefined();
  });

  it("should return 500 on database error", async () => {
    authed();
    vi.mocked(prisma.nIS2Assessment.findFirst).mockRejectedValue(
      new Error("DB error"),
    );

    const req = makeRequest("http://localhost/api/nis2/nis2-assessment-1", {
      method: "PATCH",
      body: { assessmentName: "Updated" },
    });
    const res = await assessmentPATCH(req, makeParams("nis2-assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// DELETE /api/nis2/[assessmentId]
// ═══════════════════════════════════════════════════════════════

describe("DELETE /api/nis2/[assessmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    unauthed();
    const req = makeRequest("http://localhost/api/nis2/nis2-assessment-1", {
      method: "DELETE",
    });
    const res = await assessmentDELETE(req, makeParams("nis2-assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when assessment not found", async () => {
    authed();
    vi.mocked(prisma.nIS2Assessment.findFirst).mockResolvedValue(null as never);

    const req = makeRequest("http://localhost/api/nis2/nonexistent-id", {
      method: "DELETE",
    });
    const res = await assessmentDELETE(req, makeParams("nonexistent-id"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 200 with success on valid delete", async () => {
    authed();
    vi.mocked(prisma.nIS2Assessment.findFirst).mockResolvedValue(
      mockNIS2Assessment as never,
    );
    vi.mocked(prisma.nIS2Assessment.delete).mockResolvedValue(
      mockNIS2Assessment as never,
    );

    const req = makeRequest("http://localhost/api/nis2/nis2-assessment-1", {
      method: "DELETE",
    });
    const res = await assessmentDELETE(req, makeParams("nis2-assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.nIS2Assessment.delete).toHaveBeenCalledWith({
      where: { id: "nis2-assessment-1" },
    });
  });

  it("should return 500 on database error", async () => {
    authed();
    vi.mocked(prisma.nIS2Assessment.findFirst).mockResolvedValue(
      mockNIS2Assessment as never,
    );
    vi.mocked(prisma.nIS2Assessment.delete).mockRejectedValue(
      new Error("DB error"),
    );

    const req = makeRequest("http://localhost/api/nis2/nis2-assessment-1", {
      method: "DELETE",
    });
    const res = await assessmentDELETE(req, makeParams("nis2-assessment-1"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/nis2/calculate (Public endpoint)
// ═══════════════════════════════════════════════════════════════

describe("POST /api/nis2/calculate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset rate limit to allow requests
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 9,
    } as never);
  });

  it("should return 200 with redacted compliance result for valid input", async () => {
    const req = makeRequest("http://localhost/api/nis2/calculate", {
      method: "POST",
      body: {
        answers: {
          sector: "space",
          spaceSubSector: "ground_infrastructure",
          entitySize: "medium",
          isEUEstablished: true,
          operatesGroundInfra: true,
          memberStateCount: 1,
          hasISO27001: false,
          hasExistingCSIRT: false,
        },
        startedAt: Date.now() - 30000, // 30 seconds ago
      },
    }) as never;

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.result).toBeDefined();
    expect(data.result.entityClassification).toBeDefined();
    expect(data.result.applicableRequirements).toBeDefined();
  });

  it("should return 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/nis2/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    }) as never;

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeTruthy();
  });

  it("should return 400 for invalid sector value", async () => {
    const req = makeRequest("http://localhost/api/nis2/calculate", {
      method: "POST",
      body: {
        answers: {
          sector: "invalid_sector",
          entitySize: "medium",
        },
        startedAt: Date.now() - 30000,
      },
    }) as never;

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid sector");
  });

  it("should return 400 for invalid entitySize value", async () => {
    const req = makeRequest("http://localhost/api/nis2/calculate", {
      method: "POST",
      body: {
        answers: {
          sector: "space",
          entitySize: "giant",
        },
        startedAt: Date.now() - 30000,
      },
    }) as never;

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid entitySize");
  });

  it("should return 400 for invalid boolean fields", async () => {
    const req = makeRequest("http://localhost/api/nis2/calculate", {
      method: "POST",
      body: {
        answers: {
          sector: "space",
          entitySize: "medium",
          isEUEstablished: "yes", // Should be boolean
        },
        startedAt: Date.now() - 30000,
      },
    }) as never;

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("isEUEstablished");
  });

  it("should return 429 for bot-like fast completion", async () => {
    const req = makeRequest("http://localhost/api/nis2/calculate", {
      method: "POST",
      body: {
        answers: {
          sector: "space",
          entitySize: "medium",
        },
        startedAt: Date.now() - 1000, // Only 1 second ago (< 3s threshold)
      },
    }) as never;

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toContain("too quickly");
  });

  it("should return 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
    } as never);

    const req = makeRequest("http://localhost/api/nis2/calculate", {
      method: "POST",
      body: {
        answers: {
          sector: "space",
          entitySize: "medium",
        },
        startedAt: Date.now() - 30000,
      },
    }) as never;

    const res = await calculatePOST(req);

    expect(res.status).toBe(429);
  });

  it("should accept null values for optional fields", async () => {
    const req = makeRequest("http://localhost/api/nis2/calculate", {
      method: "POST",
      body: {
        answers: {
          sector: null,
          spaceSubSector: null,
          entitySize: null,
          isEUEstablished: null,
          memberStateCount: null,
          hasISO27001: null,
        },
        startedAt: Date.now() - 30000,
      },
    }) as never;

    const res = await calculatePOST(req);
    const data = await res.json();

    // Null values should be valid (assessment just started)
    expect(res.status).toBe(200);
  });

  it("should include rate limit headers in response", async () => {
    const req = makeRequest("http://localhost/api/nis2/calculate", {
      method: "POST",
      body: {
        answers: {
          sector: "space",
          entitySize: "medium",
        },
        startedAt: Date.now() - 30000,
      },
    }) as never;

    const res = await calculatePOST(req);

    expect(res.headers.get("X-RateLimit-Remaining")).toBeTruthy();
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("should reject invalid memberStateCount (> 27)", async () => {
    const req = makeRequest("http://localhost/api/nis2/calculate", {
      method: "POST",
      body: {
        answers: {
          sector: "space",
          entitySize: "medium",
          memberStateCount: 50, // More than EU member states
        },
        startedAt: Date.now() - 30000,
      },
    }) as never;

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("memberStateCount");
  });
});
