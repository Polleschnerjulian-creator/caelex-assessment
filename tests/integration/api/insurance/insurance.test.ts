import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks (must be before imports) ───

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    insuranceAssessment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    insurancePolicy: {
      createMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
  getRequestContext: vi.fn().mockReturnValue({
    ipAddress: "127.0.0.1",
    userAgent: "test-agent",
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    security: vi.fn(),
  },
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    security: vi.fn(),
  },
}));

vi.mock("@/data/insurance-requirements", () => ({
  calculateTPLRequirement: vi.fn().mockReturnValue({
    amount: 60_000_000,
    currency: "EUR",
    basis: "French FSOA minimum",
    explanation: "Minimum TPL per French space law",
    notes: ["Coverage must include State, ESA, ESA Member States"],
  }),
  getRequiredInsuranceTypes: vi
    .fn()
    .mockReturnValue(["third_party_liability", "launch", "in_orbit"]),
  calculateMissionRiskLevel: vi.fn().mockReturnValue("medium"),
  calculateInsuranceComplianceScore: vi.fn().mockReturnValue(45),
  estimatePremiumRange: vi.fn().mockReturnValue({
    total: { min: 100_000, max: 250_000 },
    breakdown: {
      third_party_liability: { min: 40_000, max: 100_000 },
      launch: { min: 30_000, max: 80_000 },
      in_orbit: { min: 30_000, max: 70_000 },
    },
  }),
  nationalRequirementsLookup: {
    FR: {
      country: "France",
      minimumTPL: 60_000_000,
      insuranceRequired: true,
      coverageScope:
        "State, ESA, ESA Member States, operator, and mission participants",
      governmentGuarantee: true,
      launchSiteInsurance: true,
      notes: ["Coverage must include State, ESA"],
      relevantLegislation: ["Article 6", "Decree 2009-643 Art. 16-18"],
    },
  },
  insuranceTypeDefinitions: {
    third_party_liability: {
      name: "Third-Party Liability",
      description: "Covers damage to third parties",
    },
    launch: {
      name: "Launch Insurance",
      description: "Covers launch phase risks",
    },
    in_orbit: {
      name: "In-Orbit Insurance",
      description: "Covers in-orbit operational risks",
    },
    pre_launch: {
      name: "Pre-Launch Insurance",
      description: "Covers pre-launch phase",
    },
    contingent_liability: {
      name: "Contingent Liability",
      description: "Covers contingent risks",
    },
    loss_of_revenue: {
      name: "Loss of Revenue",
      description: "Covers revenue loss",
    },
    launch_plus_life: {
      name: "Launch + Life",
      description: "Combined launch and in-orbit coverage",
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/insurance/route";
import {
  GET as GET_BY_ID,
  PATCH as PATCH_BY_ID,
  DELETE as DELETE_BY_ID,
} from "@/app/api/insurance/[assessmentId]/route";
import {
  GET as GET_POLICIES,
  PATCH as PATCH_POLICIES,
} from "@/app/api/insurance/policies/route";
import { POST as POST_REPORT } from "@/app/api/insurance/report/generate/route";

// ─── Test Helpers ───

const mockSession = {
  user: { id: "user-123", email: "test@example.com", name: "Test User" },
  expires: new Date(Date.now() + 86400000).toISOString(),
};

const now = new Date();

const mockAssessment = {
  id: "assess-1",
  userId: "user-123",
  assessmentName: "LEO Mission Alpha",
  primaryJurisdiction: "FR",
  operatorType: "spacecraft",
  companySize: "medium",
  orbitRegime: "LEO",
  satelliteCount: 3,
  satelliteValueEur: 5_000_000,
  totalMissionValueEur: 20_000_000,
  isConstellationOperator: false,
  hasManeuverability: true,
  missionDurationYears: 5,
  hasFlightHeritage: true,
  launchVehicle: "Falcon 9",
  launchProvider: "SpaceX",
  launchDate: null,
  hasADR: false,
  hasPropulsion: true,
  hasHazardousMaterials: false,
  crossBorderOps: false,
  annualRevenueEur: 15_000_000,
  turnoversShareSpace: 80,
  calculatedTPL: 60_000_000,
  riskLevel: "medium",
  complianceScore: null,
  reportGenerated: false,
  reportGeneratedAt: null,
  createdAt: now,
  updatedAt: now,
};

const mockPolicies = [
  {
    id: "pol-1",
    assessmentId: "assess-1",
    insuranceType: "third_party_liability",
    status: "active",
    isRequired: true,
    policyNumber: "TPL-001",
    insurer: "AXA XL",
    broker: null,
    coverageAmount: 60_000_000,
    premium: 50_000,
    deductible: 5_000,
    effectiveDate: now,
    expirationDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
    renewalDate: null,
    notes: null,
    quoteNotes: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "pol-2",
    assessmentId: "assess-1",
    insuranceType: "launch",
    status: "not_started",
    isRequired: true,
    policyNumber: null,
    insurer: null,
    broker: null,
    coverageAmount: null,
    premium: null,
    deductible: null,
    effectiveDate: null,
    expirationDate: null,
    renewalDate: null,
    notes: null,
    quoteNotes: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "pol-3",
    assessmentId: "assess-1",
    insuranceType: "in_orbit",
    status: "quote_requested",
    isRequired: true,
    policyNumber: null,
    insurer: null,
    broker: null,
    coverageAmount: null,
    premium: null,
    deductible: null,
    effectiveDate: null,
    expirationDate: null,
    renewalDate: null,
    notes: null,
    quoteNotes: null,
    createdAt: now,
    updatedAt: now,
  },
];

const validCreatePayload = {
  assessmentName: "LEO Mission Alpha",
  primaryJurisdiction: "FR",
  operatorType: "spacecraft",
  companySize: "medium",
  orbitRegime: "LEO",
  satelliteCount: 3,
  satelliteValueEur: 5_000_000,
  totalMissionValueEur: 20_000_000,
};

function makeRequest(url: string, method: string, body?: unknown): Request {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

function makeParams(assessmentId: string) {
  return { params: Promise.resolve({ assessmentId }) };
}

// ═══════════════════════════════════════════════════════════════
// GET /api/insurance
// ═══════════════════════════════════════════════════════════════

describe("GET /api/insurance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return assessments for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([
      { ...mockAssessment, policies: mockPolicies },
    ] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assessments).toBeDefined();
    expect(data.assessments).toHaveLength(1);
    expect(prisma.insuranceAssessment.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      include: { policies: true },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("should return empty array when user has no assessments", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findMany).mockResolvedValue([] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assessments).toEqual([]);
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findMany).mockRejectedValue(
      new Error("DB down"),
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/insurance
// ═══════════════════════════════════════════════════════════════

describe("POST /api/insurance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.insuranceAssessment.create).mockResolvedValue(
      mockAssessment as any,
    );
    vi.mocked(prisma.insurancePolicy.createMany).mockResolvedValue({
      count: 7,
    } as any);
    vi.mocked(prisma.insuranceAssessment.findUnique).mockResolvedValue({
      ...mockAssessment,
      policies: mockPolicies,
    } as any);
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = makeRequest(
      "http://localhost/api/insurance",
      "POST",
      validCreatePayload,
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when primaryJurisdiction is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const { primaryJurisdiction, ...incomplete } = validCreatePayload;
    const request = makeRequest(
      "http://localhost/api/insurance",
      "POST",
      incomplete,
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("primaryJurisdiction is required");
  });

  it("should return 400 when operatorType is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const { operatorType, ...incomplete } = validCreatePayload;
    const request = makeRequest(
      "http://localhost/api/insurance",
      "POST",
      incomplete,
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("operatorType is required");
  });

  it("should return 400 when companySize is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const { companySize, ...incomplete } = validCreatePayload;
    const request = makeRequest(
      "http://localhost/api/insurance",
      "POST",
      incomplete,
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("companySize is required");
  });

  it("should return 400 when orbitRegime is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const { orbitRegime, ...incomplete } = validCreatePayload;
    const request = makeRequest(
      "http://localhost/api/insurance",
      "POST",
      incomplete,
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("orbitRegime is required");
  });

  it("should return 201 and create assessment with valid payload", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeRequest(
      "http://localhost/api/insurance",
      "POST",
      validCreatePayload,
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.assessment).toBeDefined();
    expect(data.tplRequirement).toBeDefined();
    expect(data.riskLevel).toBe("medium");
    expect(data.requiredTypes).toEqual([
      "third_party_liability",
      "launch",
      "in_orbit",
    ]);
  });

  it("should create policy records for all 7 insurance types", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeRequest(
      "http://localhost/api/insurance",
      "POST",
      validCreatePayload,
    );
    await POST(request);

    expect(prisma.insurancePolicy.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          assessmentId: "assess-1",
          insuranceType: "third_party_liability",
          status: "not_started",
          isRequired: true,
        }),
        expect.objectContaining({
          insuranceType: "pre_launch",
          isRequired: false,
        }),
      ]),
    });

    const call = vi.mocked(prisma.insurancePolicy.createMany).mock.calls[0][0];
    expect((call as any).data).toHaveLength(7);
  });

  it("should return 500 on database error during creation", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.create).mockRejectedValue(
      new Error("DB error"),
    );

    const request = makeRequest(
      "http://localhost/api/insurance",
      "POST",
      validCreatePayload,
    );
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/insurance/[assessmentId]
// ═══════════════════════════════════════════════════════════════

describe("GET /api/insurance/[assessmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = makeRequest(
      "http://localhost/api/insurance/assess-1",
      "GET",
    );
    const response = await GET_BY_ID(request, makeParams("assess-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when assessment not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(
      null as any,
    );

    const request = makeRequest(
      "http://localhost/api/insurance/nonexistent",
      "GET",
    );
    const response = await GET_BY_ID(request, makeParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return assessment with calculations for valid ID", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
      ...mockAssessment,
      policies: mockPolicies,
    } as any);

    const request = makeRequest(
      "http://localhost/api/insurance/assess-1",
      "GET",
    );
    const response = await GET_BY_ID(request, makeParams("assess-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assessment).toBeDefined();
    expect(data.tplRequirement).toBeDefined();
    expect(data.requiredTypes).toBeDefined();
    expect(data.complianceScore).toBeDefined();
  });

  it("should filter assessment by userId for ownership check", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
      ...mockAssessment,
      policies: mockPolicies,
    } as any);

    const request = makeRequest(
      "http://localhost/api/insurance/assess-1",
      "GET",
    );
    await GET_BY_ID(request, makeParams("assess-1"));

    expect(prisma.insuranceAssessment.findFirst).toHaveBeenCalledWith({
      where: { id: "assess-1", userId: "user-123" },
      include: { policies: true },
    });
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockRejectedValue(
      new Error("DB error"),
    );

    const request = makeRequest(
      "http://localhost/api/insurance/assess-1",
      "GET",
    );
    const response = await GET_BY_ID(request, makeParams("assess-1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// PATCH /api/insurance/[assessmentId]
// ═══════════════════════════════════════════════════════════════

describe("PATCH /api/insurance/[assessmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
      ...mockAssessment,
      policies: mockPolicies,
    } as any);
    vi.mocked(prisma.insuranceAssessment.update).mockResolvedValue({
      ...mockAssessment,
      assessmentName: "Updated Name",
      policies: mockPolicies,
    } as any);
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = makeRequest(
      "http://localhost/api/insurance/assess-1",
      "PATCH",
      { assessmentName: "Updated" },
    );
    const response = await PATCH_BY_ID(request, makeParams("assess-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when assessment not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(
      null as any,
    );

    const request = makeRequest(
      "http://localhost/api/insurance/nonexistent",
      "PATCH",
      { assessmentName: "Updated" },
    );
    const response = await PATCH_BY_ID(request, makeParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should update assessment name successfully", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeRequest(
      "http://localhost/api/insurance/assess-1",
      "PATCH",
      { assessmentName: "Updated Name" },
    );
    const response = await PATCH_BY_ID(request, makeParams("assess-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assessment).toBeDefined();
    expect(prisma.insuranceAssessment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "assess-1" },
        data: expect.objectContaining({ assessmentName: "Updated Name" }),
      }),
    );
  });

  it("should recalculate TPL and risk when profile fields change", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeRequest(
      "http://localhost/api/insurance/assess-1",
      "PATCH",
      { orbitRegime: "GEO" },
    );
    await PATCH_BY_ID(request, makeParams("assess-1"));

    // The update data should include recalculated values
    expect(prisma.insuranceAssessment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          calculatedTPL: 60_000_000,
          riskLevel: "medium",
        }),
      }),
    );
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.update).mockRejectedValue(
      new Error("DB error"),
    );

    const request = makeRequest(
      "http://localhost/api/insurance/assess-1",
      "PATCH",
      { assessmentName: "Fail" },
    );
    const response = await PATCH_BY_ID(request, makeParams("assess-1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// DELETE /api/insurance/[assessmentId]
// ═══════════════════════════════════════════════════════════════

describe("DELETE /api/insurance/[assessmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = makeRequest(
      "http://localhost/api/insurance/assess-1",
      "DELETE",
    );
    const response = await DELETE_BY_ID(request, makeParams("assess-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when assessment not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(
      null as any,
    );

    const request = makeRequest(
      "http://localhost/api/insurance/nonexistent",
      "DELETE",
    );
    const response = await DELETE_BY_ID(request, makeParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should delete assessment and return success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );
    vi.mocked(prisma.insuranceAssessment.delete).mockResolvedValue(
      mockAssessment as any,
    );

    const request = makeRequest(
      "http://localhost/api/insurance/assess-1",
      "DELETE",
    );
    const response = await DELETE_BY_ID(request, makeParams("assess-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.insuranceAssessment.delete).toHaveBeenCalledWith({
      where: { id: "assess-1" },
    });
  });

  it("should verify ownership before deleting", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );
    vi.mocked(prisma.insuranceAssessment.delete).mockResolvedValue(
      mockAssessment as any,
    );

    const request = makeRequest(
      "http://localhost/api/insurance/assess-1",
      "DELETE",
    );
    await DELETE_BY_ID(request, makeParams("assess-1"));

    expect(prisma.insuranceAssessment.findFirst).toHaveBeenCalledWith({
      where: { id: "assess-1", userId: "user-123" },
    });
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );
    vi.mocked(prisma.insuranceAssessment.delete).mockRejectedValue(
      new Error("DB error"),
    );

    const request = makeRequest(
      "http://localhost/api/insurance/assess-1",
      "DELETE",
    );
    const response = await DELETE_BY_ID(request, makeParams("assess-1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/insurance/policies
// ═══════════════════════════════════════════════════════════════

describe("GET /api/insurance/policies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = makeRequest(
      "http://localhost/api/insurance/policies?assessmentId=assess-1",
      "GET",
    );
    const response = await GET_POLICIES(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when assessmentId query param is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeRequest(
      "http://localhost/api/insurance/policies",
      "GET",
    );
    const response = await GET_POLICIES(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("assessmentId is required");
  });

  it("should return 404 when assessment not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(
      null as any,
    );

    const request = makeRequest(
      "http://localhost/api/insurance/policies?assessmentId=nonexistent",
      "GET",
    );
    const response = await GET_POLICIES(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return policies for valid assessment", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
      ...mockAssessment,
      policies: mockPolicies,
    } as any);

    const request = makeRequest(
      "http://localhost/api/insurance/policies?assessmentId=assess-1",
      "GET",
    );
    const response = await GET_POLICIES(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.policies).toBeDefined();
    expect(data.policies).toHaveLength(3);
    expect(data.assessment).toBeDefined();
    expect(data.assessment.id).toBe("assess-1");
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockRejectedValue(
      new Error("DB error"),
    );

    const request = makeRequest(
      "http://localhost/api/insurance/policies?assessmentId=assess-1",
      "GET",
    );
    const response = await GET_POLICIES(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// PATCH /api/insurance/policies
// ═══════════════════════════════════════════════════════════════

describe("PATCH /api/insurance/policies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );
    vi.mocked(prisma.insurancePolicy.findUnique).mockResolvedValue(
      mockPolicies[1] as any,
    );
    vi.mocked(prisma.insurancePolicy.update).mockResolvedValue({
      ...mockPolicies[1],
      status: "quote_requested",
    } as any);
    vi.mocked(prisma.insurancePolicy.findMany).mockResolvedValue(
      mockPolicies as any,
    );
    vi.mocked(prisma.insuranceAssessment.update).mockResolvedValue(
      mockAssessment as any,
    );
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = makeRequest(
      "http://localhost/api/insurance/policies",
      "PATCH",
      {
        assessmentId: "assess-1",
        insuranceType: "launch",
        status: "quote_requested",
      },
    );
    const response = await PATCH_POLICIES(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when assessmentId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeRequest(
      "http://localhost/api/insurance/policies",
      "PATCH",
      { insuranceType: "launch", status: "quote_requested" },
    );
    const response = await PATCH_POLICIES(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("assessmentId and insuranceType are required");
  });

  it("should return 400 when insuranceType is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeRequest(
      "http://localhost/api/insurance/policies",
      "PATCH",
      { assessmentId: "assess-1", status: "quote_requested" },
    );
    const response = await PATCH_POLICIES(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("assessmentId and insuranceType are required");
  });

  it("should return 404 when assessment ownership check fails", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(
      null as any,
    );

    const request = makeRequest(
      "http://localhost/api/insurance/policies",
      "PATCH",
      {
        assessmentId: "other-user",
        insuranceType: "launch",
        status: "active",
      },
    );
    const response = await PATCH_POLICIES(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 404 when policy not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insurancePolicy.findUnique).mockResolvedValue(null as any);

    const request = makeRequest(
      "http://localhost/api/insurance/policies",
      "PATCH",
      {
        assessmentId: "assess-1",
        insuranceType: "nonexistent_type",
        status: "active",
      },
    );
    const response = await PATCH_POLICIES(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Policy not found");
  });

  it("should update policy status and return compliance score", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeRequest(
      "http://localhost/api/insurance/policies",
      "PATCH",
      {
        assessmentId: "assess-1",
        insuranceType: "launch",
        status: "quote_requested",
      },
    );
    const response = await PATCH_POLICIES(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.policy).toBeDefined();
    expect(data.complianceScore).toBeDefined();
  });

  it("should update policy details like insurer and coverage", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeRequest(
      "http://localhost/api/insurance/policies",
      "PATCH",
      {
        assessmentId: "assess-1",
        insuranceType: "launch",
        status: "active",
        insurer: "Swiss Re",
        policyNumber: "LNC-2026-001",
        coverageAmount: 10_000_000,
        premium: 75_000,
      },
    );
    await PATCH_POLICIES(request);

    expect(prisma.insurancePolicy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "active",
          insurer: "Swiss Re",
          policyNumber: "LNC-2026-001",
          coverageAmount: 10_000_000,
          premium: 75_000,
        }),
      }),
    );
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insurancePolicy.update).mockRejectedValue(
      new Error("DB error"),
    );

    const request = makeRequest(
      "http://localhost/api/insurance/policies",
      "PATCH",
      {
        assessmentId: "assess-1",
        insuranceType: "launch",
        status: "active",
      },
    );
    const response = await PATCH_POLICIES(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/insurance/report/generate
// ═══════════════════════════════════════════════════════════════

describe("POST /api/insurance/report/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.insuranceAssessment.update).mockResolvedValue(
      mockAssessment as any,
    );
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = makeRequest(
      "http://localhost/api/insurance/report/generate",
      "POST",
      { assessmentId: "assess-1" },
    );
    const response = await POST_REPORT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when assessmentId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const request = makeRequest(
      "http://localhost/api/insurance/report/generate",
      "POST",
      {},
    );
    const response = await POST_REPORT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("assessmentId is required");
  });

  it("should return 404 when assessment not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue(
      null as any,
    );

    const request = makeRequest(
      "http://localhost/api/insurance/report/generate",
      "POST",
      { assessmentId: "nonexistent" },
    );
    const response = await POST_REPORT(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should generate report with all required sections", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
      ...mockAssessment,
      policies: mockPolicies,
      user: { name: "Test User", organization: "Space Corp" },
    } as any);

    const request = makeRequest(
      "http://localhost/api/insurance/report/generate",
      "POST",
      { assessmentId: "assess-1" },
    );
    const response = await POST_REPORT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.report).toBeDefined();
    expect(data.report.organizationProfile).toBeDefined();
    expect(data.report.tplRequirement).toBeDefined();
    expect(data.report.insuranceCoverage).toBeDefined();
    expect(data.report.insuranceCoverage.required).toBeDefined();
    expect(data.report.insuranceCoverage.optional).toBeDefined();
    expect(data.report.premiumEstimate).toBeDefined();
    expect(data.report.complianceStatus).toBeDefined();
    expect(data.report.nationalRequirements).toBeDefined();
    expect(data.report.recommendations).toBeDefined();
    expect(data.report.generatedAt).toBeDefined();
  });

  it("should mark assessment as report-generated", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockResolvedValue({
      ...mockAssessment,
      policies: mockPolicies,
      user: { name: "Test User", organization: "Space Corp" },
    } as any);

    const request = makeRequest(
      "http://localhost/api/insurance/report/generate",
      "POST",
      { assessmentId: "assess-1" },
    );
    await POST_REPORT(request);

    expect(prisma.insuranceAssessment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "assess-1" },
        data: expect.objectContaining({
          reportGenerated: true,
          reportGeneratedAt: expect.any(Date),
          complianceScore: 45,
        }),
      }),
    );
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.insuranceAssessment.findFirst).mockRejectedValue(
      new Error("DB error"),
    );

    const request = makeRequest(
      "http://localhost/api/insurance/report/generate",
      "POST",
      { assessmentId: "assess-1" },
    );
    const response = await POST_REPORT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
