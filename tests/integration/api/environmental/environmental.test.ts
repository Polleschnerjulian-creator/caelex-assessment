import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Dependencies ───

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    environmentalAssessment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    environmentalImpactResult: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    supplierDataRequest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
  getRequestContext: vi.fn(() => ({
    ipAddress: "127.0.0.1",
    userAgent: "test-agent",
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    security: vi.fn(),
  },
}));

vi.mock("@/data/environmental-requirements", () => ({
  calculateScreeningLCA: vi.fn(() => ({
    totalGWP: 50000,
    totalODP: 0.01,
    carbonIntensity: 250,
    grade: "B",
    gradeLabel: "Good",
    lifecycleBreakdown: [
      {
        phase: "manufacturing",
        gwpKgCO2eq: 10000,
        odpKgCFC11eq: 0.002,
        percentOfTotal: 20,
      },
      {
        phase: "launch",
        gwpKgCO2eq: 30000,
        odpKgCFC11eq: 0.006,
        percentOfTotal: 60,
      },
      {
        phase: "operations",
        gwpKgCO2eq: 5000,
        odpKgCFC11eq: 0.001,
        percentOfTotal: 10,
      },
      {
        phase: "end_of_life",
        gwpKgCO2eq: 5000,
        odpKgCFC11eq: 0.001,
        percentOfTotal: 10,
      },
    ],
    hotspots: ["launch"],
    recommendations: ["Consider reusable launch vehicles"],
    isSimplifiedAssessment: false,
    regulatoryCompliance: {},
  })),
  calculateComplianceScore: vi.fn(() => 75),
  generateSupplierDataRequests: vi.fn(() => [
    {
      supplierName: "Test Supplier A",
      componentType: "solar_panels",
      dataRequired: ["Manufacturing energy"],
      deadline: new Date("2030-01-01"),
    },
    {
      supplierName: "Test Supplier B",
      componentType: "propulsion",
      dataRequired: ["Propellant data"],
      deadline: new Date("2030-01-01"),
    },
  ]),
  launchVehicles: {
    falcon_9: {
      name: "Falcon 9",
      provider: "SpaceX",
      reusability: "partial",
      sustainabilityGrade: "B",
      carbonIntensityKgCO2PerKgPayload: { leo: 250 },
      notes: "Partially reusable",
    },
  },
  propellantProfiles: {
    hydrazine: {
      name: "Hydrazine",
      sustainabilityRating: "Poor",
      toxicityClass: "High",
      notes: "Toxic propellant",
    },
  },
  efdGradeThresholds: [
    {
      grade: "B",
      label: "Good",
      color: "green",
      description: "Good environmental performance",
    },
  ],
  efdRegulatoryRequirements: [
    {
      articleNumber: "Art. 96",
      title: "EFD Requirement",
      summary: "Environmental Footprint Declaration required",
      deadline: "2030-01-01",
      applicableTo: ["SCO", "LO"],
    },
  ],
  simplifiedRegimeCriteria: [
    {
      criterion: "Organization Size",
      threshold: "Small enterprise",
      exemption: "Simplified EFD",
    },
  ],
  getPhaseLabel: vi.fn((phase: string) => phase),
  formatEmissions: vi.fn((val: number) => `${val} kg CO2eq`),
  formatMass: vi.fn((val: number) => `${val} kg`),
}));

vi.mock("@/lib/services", () => ({
  sendSupplierOutreach: vi.fn(),
  createSupplierRequest: vi.fn(),
  sendBatchOutreach: vi.fn(),
}));

// ─── Imports (after mocks) ───

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  GET as listAssessments,
  POST as createAssessment,
} from "@/app/api/environmental/route";
import {
  GET as getAssessment,
  PATCH as updateAssessment,
  DELETE as deleteAssessment,
} from "@/app/api/environmental/[assessmentId]/route";
import { POST as calculateFootprint } from "@/app/api/environmental/calculate/route";
import {
  GET as listSuppliers,
  POST as createSupplier,
  PATCH as updateSupplier,
  DELETE as deleteSupplier,
} from "@/app/api/environmental/suppliers/route";
import { POST as importSupplierData } from "@/app/api/environmental/suppliers/import/route";
import { POST as reportGenerate } from "@/app/api/environmental/report/generate/route";

// ─── Test Data ───

const mockSession = {
  user: { id: "user-123", email: "test@example.com", name: "Test User" },
};

const mockAssessment = {
  id: "assess-001",
  userId: "user-123",
  assessmentName: "Test EFD Assessment",
  status: "draft",
  missionName: "TestSat-1",
  operatorType: "spacecraft",
  missionType: "commercial",
  spacecraftMassKg: 200,
  spacecraftCount: 1,
  orbitType: "LEO",
  altitudeKm: 550,
  missionDurationYears: 5,
  launchVehicle: "falcon_9",
  launchSharePercent: 100,
  launchSiteCountry: "USA",
  spacecraftPropellant: "hydrazine",
  propellantMassKg: 20,
  groundStationCount: 2,
  dailyContactHours: 4,
  deorbitStrategy: "controlled_deorbit",
  isSmallEnterprise: false,
  isResearchEducation: false,
  totalGWP: null,
  totalODP: null,
  carbonIntensity: null,
  efdGrade: null,
  complianceScore: null,
  isSimplifiedAssessment: false,
  reportGenerated: false,
  reportGeneratedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  impactResults: [],
  supplierRequests: [],
};

const mockAssessmentWithResults = {
  ...mockAssessment,
  status: "calculation",
  totalGWP: 50000,
  totalODP: 0.01,
  carbonIntensity: 250,
  efdGrade: "B",
  complianceScore: 75,
  impactResults: [
    {
      id: "impact-1",
      assessmentId: "assess-001",
      phase: "manufacturing",
      gwpKgCO2eq: 10000,
      odpKgCFC11eq: 0.002,
      percentOfTotal: 20,
    },
    {
      id: "impact-2",
      assessmentId: "assess-001",
      phase: "launch",
      gwpKgCO2eq: 30000,
      odpKgCFC11eq: 0.006,
      percentOfTotal: 60,
    },
  ],
  supplierRequests: [],
  user: { name: "Test User", organization: "TestOrg" },
};

const mockSupplierRequest = {
  id: "supplier-001",
  assessmentId: "assess-001",
  supplierName: "Component Corp",
  supplierEmail: "supplier@example.com",
  componentType: "solar_panels",
  dataRequired: '["Manufacturing energy"]',
  status: "pending",
  sentAt: null,
  receivedAt: null,
  deadline: null,
  notes: null,
  responseData: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  assessment: { userId: "user-123" },
};

const validCreatePayload = {
  assessmentName: "New EFD",
  missionName: "TestSat-1",
  spacecraftMassKg: 200,
  orbitType: "LEO",
  launchVehicle: "falcon_9",
  deorbitStrategy: "controlled_deorbit",
};

// ─── Helpers ───

function makeRequest(
  url: string,
  method: string = "GET",
  body?: unknown,
): Request {
  const options: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new Request(url, options);
}

function makeParams(assessmentId: string): {
  params: Promise<{ assessmentId: string }>;
} {
  return { params: Promise.resolve({ assessmentId }) };
}

// ══════════════════════════════════════════════════════════════
//  GET /api/environmental  (list assessments)
// ══════════════════════════════════════════════════════════════

describe("GET /api/environmental", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const response = await listAssessments();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return assessments for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([
      mockAssessment,
    ] as any);

    const response = await listAssessments();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assessments).toHaveLength(1);
    expect(prisma.environmentalAssessment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-123" },
      }),
    );
  });

  it("should return empty array when user has no assessments", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findMany).mockResolvedValue([]);

    const response = await listAssessments();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assessments).toEqual([]);
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findMany).mockRejectedValue(
      new Error("Database error"),
    );

    const response = await listAssessments();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ══════════════════════════════════════════════════════════════
//  POST /api/environmental  (create assessment)
// ══════════════════════════════════════════════════════════════

describe("POST /api/environmental", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const request = makeRequest(
      "http://localhost/api/environmental",
      "POST",
      validCreatePayload,
    );
    const response = await createAssessment(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when required fields are missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    const request = makeRequest("http://localhost/api/environmental", "POST", {
      missionName: "Test",
    });
    const response = await createAssessment(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should return 400 when spacecraftMassKg is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    const { spacecraftMassKg, ...incomplete } = validCreatePayload;
    const request = makeRequest(
      "http://localhost/api/environmental",
      "POST",
      incomplete,
    );
    const response = await createAssessment(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("should create assessment with valid data and return 201", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.create).mockResolvedValue(
      mockAssessment as any,
    );

    const request = makeRequest(
      "http://localhost/api/environmental",
      "POST",
      validCreatePayload,
    );
    const response = await createAssessment(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.assessment).toBeDefined();
    expect(prisma.environmentalAssessment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          spacecraftMassKg: 200,
          orbitType: "LEO",
          launchVehicle: "falcon_9",
          deorbitStrategy: "controlled_deorbit",
        }),
      }),
    );
  });

  it("should return 500 on database error during creation", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.create).mockRejectedValue(
      new Error("Database error"),
    );

    const request = makeRequest(
      "http://localhost/api/environmental",
      "POST",
      validCreatePayload,
    );
    const response = await createAssessment(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ══════════════════════════════════════════════════════════════
//  GET /api/environmental/[assessmentId]  (get single)
// ══════════════════════════════════════════════════════════════

describe("GET /api/environmental/[assessmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const request = makeRequest(
      "http://localhost/api/environmental/assess-001",
    );
    const response = await getAssessment(request, makeParams("assess-001"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when assessment not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(null);

    const request = makeRequest(
      "http://localhost/api/environmental/nonexistent",
    );
    const response = await getAssessment(request, makeParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return assessment details for valid id", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );

    const request = makeRequest(
      "http://localhost/api/environmental/assess-001",
    );
    const response = await getAssessment(request, makeParams("assess-001"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assessment).toBeDefined();
    expect(prisma.environmentalAssessment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "assess-001", userId: "user-123" },
      }),
    );
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockRejectedValue(
      new Error("Database error"),
    );

    const request = makeRequest(
      "http://localhost/api/environmental/assess-001",
    );
    const response = await getAssessment(request, makeParams("assess-001"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ══════════════════════════════════════════════════════════════
//  PATCH /api/environmental/[assessmentId]  (update)
// ══════════════════════════════════════════════════════════════

describe("PATCH /api/environmental/[assessmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const request = makeRequest(
      "http://localhost/api/environmental/assess-001",
      "PATCH",
      { assessmentName: "Updated" },
    );
    const response = await updateAssessment(request, makeParams("assess-001"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when assessment not found for update", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(null);

    const request = makeRequest(
      "http://localhost/api/environmental/nonexistent",
      "PATCH",
      { assessmentName: "Updated" },
    );
    const response = await updateAssessment(request, makeParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should update assessment with allowed fields", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );
    const updatedAssessment = {
      ...mockAssessment,
      assessmentName: "Updated Name",
      impactResults: [],
      supplierRequests: [],
    };
    vi.mocked(prisma.environmentalAssessment.update).mockResolvedValue(
      updatedAssessment as any,
    );

    const request = makeRequest(
      "http://localhost/api/environmental/assess-001",
      "PATCH",
      { assessmentName: "Updated Name", spacecraftMassKg: 300 },
    );
    const response = await updateAssessment(request, makeParams("assess-001"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assessment).toBeDefined();
    expect(prisma.environmentalAssessment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "assess-001" },
        data: expect.objectContaining({
          assessmentName: "Updated Name",
          spacecraftMassKg: 300,
        }),
      }),
    );
  });

  it("should return 500 on database error during update", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );
    vi.mocked(prisma.environmentalAssessment.update).mockRejectedValue(
      new Error("Database error"),
    );

    const request = makeRequest(
      "http://localhost/api/environmental/assess-001",
      "PATCH",
      { assessmentName: "Updated" },
    );
    const response = await updateAssessment(request, makeParams("assess-001"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ══════════════════════════════════════════════════════════════
//  DELETE /api/environmental/[assessmentId]
// ══════════════════════════════════════════════════════════════

describe("DELETE /api/environmental/[assessmentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const request = makeRequest(
      "http://localhost/api/environmental/assess-001",
      "DELETE",
    );
    const response = await deleteAssessment(request, makeParams("assess-001"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when assessment not found for deletion", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(null);

    const request = makeRequest(
      "http://localhost/api/environmental/nonexistent",
      "DELETE",
    );
    const response = await deleteAssessment(request, makeParams("nonexistent"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should delete assessment and return success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );
    vi.mocked(prisma.environmentalAssessment.delete).mockResolvedValue(
      mockAssessment as any,
    );

    const request = makeRequest(
      "http://localhost/api/environmental/assess-001",
      "DELETE",
    );
    const response = await deleteAssessment(request, makeParams("assess-001"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.environmentalAssessment.delete).toHaveBeenCalledWith({
      where: { id: "assess-001" },
    });
  });

  it("should return 500 on database error during deletion", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );
    vi.mocked(prisma.environmentalAssessment.delete).mockRejectedValue(
      new Error("Database error"),
    );

    const request = makeRequest(
      "http://localhost/api/environmental/assess-001",
      "DELETE",
    );
    const response = await deleteAssessment(request, makeParams("assess-001"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ══════════════════════════════════════════════════════════════
//  POST /api/environmental/calculate
// ══════════════════════════════════════════════════════════════

describe("POST /api/environmental/calculate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const request = makeRequest(
      "http://localhost/api/environmental/calculate",
      "POST",
      { assessmentId: "assess-001" },
    );
    const response = await calculateFootprint(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when assessmentId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    const request = makeRequest(
      "http://localhost/api/environmental/calculate",
      "POST",
      {},
    );
    const response = await calculateFootprint(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("assessmentId is required");
  });

  it("should return 404 when assessment not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(null);

    const request = makeRequest(
      "http://localhost/api/environmental/calculate",
      "POST",
      { assessmentId: "nonexistent" },
    );
    const response = await calculateFootprint(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should calculate footprint and return results", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );
    vi.mocked(prisma.environmentalImpactResult.deleteMany).mockResolvedValue({
      count: 0,
    } as any);
    vi.mocked(prisma.environmentalImpactResult.createMany).mockResolvedValue({
      count: 4,
    } as any);
    vi.mocked(prisma.environmentalAssessment.update).mockResolvedValue({
      ...mockAssessmentWithResults,
    } as any);

    const request = makeRequest(
      "http://localhost/api/environmental/calculate",
      "POST",
      { assessmentId: "assess-001" },
    );
    const response = await calculateFootprint(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.result).toBeDefined();
    expect(data.result.totalGWP).toBe(50000);
    expect(data.result.grade).toBe("B");
    expect(data.result.complianceScore).toBe(75);
    expect(prisma.environmentalImpactResult.deleteMany).toHaveBeenCalledWith({
      where: { assessmentId: "assess-001" },
    });
    expect(prisma.environmentalImpactResult.createMany).toHaveBeenCalled();
  });

  it("should return 500 on database error during calculation", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockRejectedValue(
      new Error("Database error"),
    );

    const request = makeRequest(
      "http://localhost/api/environmental/calculate",
      "POST",
      { assessmentId: "assess-001" },
    );
    const response = await calculateFootprint(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ══════════════════════════════════════════════════════════════
//  POST /api/environmental/report/generate
// ══════════════════════════════════════════════════════════════

describe("POST /api/environmental/report/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const request = makeRequest(
      "http://localhost/api/environmental/report/generate",
      "POST",
      { assessmentId: "assess-001" },
    );
    const response = await reportGenerate(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when assessmentId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    const request = makeRequest(
      "http://localhost/api/environmental/report/generate",
      "POST",
      {},
    );
    const response = await reportGenerate(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("assessmentId is required");
  });

  it("should return 404 when assessment not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(null);

    const request = makeRequest(
      "http://localhost/api/environmental/report/generate",
      "POST",
      { assessmentId: "nonexistent" },
    );
    const response = await reportGenerate(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 400 when calculation has not been run", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    // Assessment without totalGWP or efdGrade
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue({
      ...mockAssessment,
      totalGWP: null,
      efdGrade: null,
    } as any);

    const request = makeRequest(
      "http://localhost/api/environmental/report/generate",
      "POST",
      { assessmentId: "assess-001" },
    );
    const response = await reportGenerate(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("calculation must be completed");
  });

  it("should generate report for assessment with completed calculation", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
      mockAssessmentWithResults as any,
    );
    vi.mocked(prisma.environmentalAssessment.update).mockResolvedValue({
      ...mockAssessmentWithResults,
      status: "review",
      reportGenerated: true,
    } as any);

    const request = makeRequest(
      "http://localhost/api/environmental/report/generate",
      "POST",
      { assessmentId: "assess-001" },
    );
    const response = await reportGenerate(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.report).toBeDefined();
    expect(data.report.missionProfile).toBeDefined();
    expect(data.report.environmentalFootprint).toBeDefined();
    expect(data.report.lifecycleBreakdown).toBeDefined();
    expect(data.report.regulatoryCompliance).toBeDefined();
    expect(data.report.complianceScore).toBeDefined();
    // Verify status updated to 'review'
    expect(prisma.environmentalAssessment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "assess-001" },
        data: expect.objectContaining({
          status: "review",
          reportGenerated: true,
        }),
      }),
    );
  });

  it("should return 500 on database error during report generation", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockRejectedValue(
      new Error("Database error"),
    );

    const request = makeRequest(
      "http://localhost/api/environmental/report/generate",
      "POST",
      { assessmentId: "assess-001" },
    );
    const response = await reportGenerate(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ══════════════════════════════════════════════════════════════
//  GET /api/environmental/suppliers
// ══════════════════════════════════════════════════════════════

describe("GET /api/environmental/suppliers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const request = makeRequest(
      "http://localhost/api/environmental/suppliers?assessmentId=assess-001",
    );
    const response = await listSuppliers(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when assessmentId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    const request = makeRequest("http://localhost/api/environmental/suppliers");
    const response = await listSuppliers(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("assessmentId is required");
  });

  it("should return 404 when assessment not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(null);

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers?assessmentId=nonexistent",
    );
    const response = await listSuppliers(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return supplier requests for valid assessment", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue({
      ...mockAssessment,
      supplierRequests: [mockSupplierRequest],
    } as any);

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers?assessmentId=assess-001",
    );
    const response = await listSuppliers(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.suppliers).toHaveLength(1);
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockRejectedValue(
      new Error("Database error"),
    );

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers?assessmentId=assess-001",
    );
    const response = await listSuppliers(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ══════════════════════════════════════════════════════════════
//  POST /api/environmental/suppliers (create single)
// ══════════════════════════════════════════════════════════════

describe("POST /api/environmental/suppliers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "POST",
      { assessmentId: "assess-001" },
    );
    const response = await createSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when assessmentId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "POST",
      {},
    );
    const response = await createSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("assessmentId is required");
  });

  it("should return 404 when assessment not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(null);

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "POST",
      {
        assessmentId: "nonexistent",
        supplierName: "Test",
        componentType: "solar_panels",
        dataRequired: ["energy"],
      },
    );
    const response = await createSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Assessment not found");
  });

  it("should return 400 for single creation without required fields", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "POST",
      { assessmentId: "assess-001" },
    );
    const response = await createSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("supplierName");
  });

  it("should create a single supplier request", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );
    vi.mocked(prisma.supplierDataRequest.create).mockResolvedValue(
      mockSupplierRequest as any,
    );

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "POST",
      {
        assessmentId: "assess-001",
        supplierName: "Component Corp",
        componentType: "solar_panels",
        dataRequired: ["Manufacturing energy"],
      },
    );
    const response = await createSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.supplier).toBeDefined();
    expect(prisma.supplierDataRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assessmentId: "assess-001",
          supplierName: "Component Corp",
          componentType: "solar_panels",
          status: "pending",
        }),
      }),
    );
  });

  it("should generate default supplier requests when generateDefaults=true", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );
    vi.mocked(prisma.supplierDataRequest.create).mockResolvedValue(
      mockSupplierRequest as any,
    );

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "POST",
      {
        assessmentId: "assess-001",
        generateDefaults: true,
      },
    );
    const response = await createSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.suppliers).toBeDefined();
    // generateSupplierDataRequests returns 2 items, so create should be called twice
    expect(prisma.supplierDataRequest.create).toHaveBeenCalledTimes(2);
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.environmentalAssessment.findFirst).mockResolvedValue(
      mockAssessment as any,
    );
    vi.mocked(prisma.supplierDataRequest.create).mockRejectedValue(
      new Error("Database error"),
    );

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "POST",
      {
        assessmentId: "assess-001",
        supplierName: "Test",
        componentType: "solar_panels",
        dataRequired: ["energy"],
      },
    );
    const response = await createSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ══════════════════════════════════════════════════════════════
//  PATCH /api/environmental/suppliers (update)
// ══════════════════════════════════════════════════════════════

describe("PATCH /api/environmental/suppliers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "PATCH",
      { supplierId: "supplier-001", status: "sent" },
    );
    const response = await updateSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when supplierId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "PATCH",
      { status: "sent" },
    );
    const response = await updateSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("supplierId is required");
  });

  it("should return 404 when supplier request not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(null);

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "PATCH",
      { supplierId: "nonexistent", status: "sent" },
    );
    const response = await updateSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Supplier request not found");
  });

  it("should return 404 when supplier belongs to different user", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue({
      ...mockSupplierRequest,
      assessment: { userId: "other-user" },
    } as any);

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "PATCH",
      { supplierId: "supplier-001", status: "sent" },
    );
    const response = await updateSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Supplier request not found");
  });

  it("should update supplier request status", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(
      mockSupplierRequest as any,
    );
    const updatedSupplier = {
      ...mockSupplierRequest,
      status: "sent",
      sentAt: new Date(),
    };
    vi.mocked(prisma.supplierDataRequest.update).mockResolvedValue(
      updatedSupplier as any,
    );

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "PATCH",
      { supplierId: "supplier-001", status: "sent" },
    );
    const response = await updateSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.supplier).toBeDefined();
    expect(prisma.supplierDataRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "supplier-001" },
        data: expect.objectContaining({
          status: "sent",
        }),
      }),
    );
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(
      mockSupplierRequest as any,
    );
    vi.mocked(prisma.supplierDataRequest.update).mockRejectedValue(
      new Error("Database error"),
    );

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "PATCH",
      { supplierId: "supplier-001", status: "sent" },
    );
    const response = await updateSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ══════════════════════════════════════════════════════════════
//  DELETE /api/environmental/suppliers
// ══════════════════════════════════════════════════════════════

describe("DELETE /api/environmental/suppliers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const request = makeRequest(
      "http://localhost/api/environmental/suppliers?supplierId=supplier-001",
      "DELETE",
    );
    const response = await deleteSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when supplierId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    const request = makeRequest(
      "http://localhost/api/environmental/suppliers",
      "DELETE",
    );
    const response = await deleteSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("supplierId is required");
  });

  it("should return 404 when supplier not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(null);

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers?supplierId=nonexistent",
      "DELETE",
    );
    const response = await deleteSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Supplier request not found");
  });

  it("should return 404 when supplier belongs to different user", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue({
      ...mockSupplierRequest,
      assessment: { userId: "other-user" },
    } as any);

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers?supplierId=supplier-001",
      "DELETE",
    );
    const response = await deleteSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Supplier request not found");
  });

  it("should delete supplier request and return success", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(
      mockSupplierRequest as any,
    );
    vi.mocked(prisma.supplierDataRequest.delete).mockResolvedValue(
      mockSupplierRequest as any,
    );

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers?supplierId=supplier-001",
      "DELETE",
    );
    const response = await deleteSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.supplierDataRequest.delete).toHaveBeenCalledWith({
      where: { id: "supplier-001" },
    });
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(
      mockSupplierRequest as any,
    );
    vi.mocked(prisma.supplierDataRequest.delete).mockRejectedValue(
      new Error("Database error"),
    );

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers?supplierId=supplier-001",
      "DELETE",
    );
    const response = await deleteSupplier(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});

// ══════════════════════════════════════════════════════════════
//  POST /api/environmental/suppliers/import
// ══════════════════════════════════════════════════════════════

describe("POST /api/environmental/suppliers/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const request = makeRequest(
      "http://localhost/api/environmental/suppliers/import",
      "POST",
      { requestId: "supplier-001" },
    );
    const response = await importSupplierData(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when requestId is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    const request = makeRequest(
      "http://localhost/api/environmental/suppliers/import",
      "POST",
      {},
    );
    const response = await importSupplierData(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("requestId required");
  });

  it("should return 404 when supplier request not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue(null);

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers/import",
      "POST",
      { requestId: "nonexistent" },
    );
    const response = await importSupplierData(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Supplier request not found");
  });

  it("should return 403 when supplier request belongs to another user", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue({
      ...mockSupplierRequest,
      responseData: '{"lcaData":{}}',
      assessment: {
        id: "assess-001",
        userId: "other-user",
        missionName: "X",
        spacecraftMassKg: 200,
      },
    } as any);

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers/import",
      "POST",
      { requestId: "supplier-001" },
    );
    const response = await importSupplierData(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when no response data available", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue({
      ...mockSupplierRequest,
      responseData: null,
      assessment: {
        id: "assess-001",
        userId: "user-123",
        missionName: "X",
        spacecraftMassKg: 200,
      },
    } as any);

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers/import",
      "POST",
      { requestId: "supplier-001" },
    );
    const response = await importSupplierData(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No supplier response data available");
  });

  it("should return 400 when response data has invalid JSON", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue({
      ...mockSupplierRequest,
      responseData: "not-valid-json",
      assessment: {
        id: "assess-001",
        userId: "user-123",
        missionName: "X",
        spacecraftMassKg: 200,
      },
    } as any);

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers/import",
      "POST",
      { requestId: "supplier-001" },
    );
    const response = await importSupplierData(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid response data format");
  });

  it("should return 400 when response data has no lcaData", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue({
      ...mockSupplierRequest,
      responseData: '{"someField":"value"}',
      assessment: {
        id: "assess-001",
        userId: "user-123",
        missionName: "X",
        spacecraftMassKg: 200,
      },
    } as any);

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers/import",
      "POST",
      { requestId: "supplier-001" },
    );
    const response = await importSupplierData(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No LCA data in supplier response");
  });

  it("should import supplier data and update assessment totals", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    const responseData = JSON.stringify({
      lcaData: {
        manufacturingEnergyKwh: 5000,
        manufacturingEnergySource: "grid_avg",
        primaryMaterial: "aluminum",
        primaryMaterialMassKg: 50,
        transportDistanceKm: 1000,
        transportMode: "air",
        componentMassKg: 50,
      },
    });

    vi.mocked(prisma.supplierDataRequest.findUnique).mockResolvedValue({
      ...mockSupplierRequest,
      assessmentId: "assess-001",
      responseData,
      assessment: {
        id: "assess-001",
        userId: "user-123",
        missionName: "TestSat",
        spacecraftMassKg: 200,
      },
    } as any);

    vi.mocked(prisma.environmentalImpactResult.findUnique).mockResolvedValue(
      null,
    );
    vi.mocked(prisma.environmentalImpactResult.upsert).mockResolvedValue(
      {} as any,
    );
    vi.mocked(prisma.environmentalImpactResult.findMany).mockResolvedValue([
      { id: "i1", gwpKgCO2eq: 2500, odpKgCFC11eq: 0.025 },
      { id: "i2", gwpKgCO2eq: 30, odpKgCFC11eq: 0.00003 },
    ] as any);
    vi.mocked(prisma.environmentalImpactResult.update).mockResolvedValue(
      {} as any,
    );
    vi.mocked(prisma.environmentalAssessment.update).mockResolvedValue(
      {} as any,
    );

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers/import",
      "POST",
      { requestId: "supplier-001" },
    );
    const response = await importSupplierData(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.imported).toBeDefined();
    expect(data.imported.supplierName).toBe("Component Corp");
    expect(data.assessment).toBeDefined();
    expect(data.assessment.totalGWP).toBeDefined();
    // Verify upsert was called for manufacturing and transport phases
    expect(prisma.environmentalImpactResult.upsert).toHaveBeenCalledTimes(2);
    // Verify assessment totals were updated
    expect(prisma.environmentalAssessment.update).toHaveBeenCalled();
  });

  it("should return 500 on database error", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.supplierDataRequest.findUnique).mockRejectedValue(
      new Error("Database error"),
    );

    const request = makeRequest(
      "http://localhost/api/environmental/suppliers/import",
      "POST",
      { requestId: "supplier-001" },
    );
    const response = await importSupplierData(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
