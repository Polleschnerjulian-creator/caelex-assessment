import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock server-only ───
vi.mock("server-only", () => ({}));

// ─── Mock auth ───
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// ─── Mock real engines ───
const mockCalculateCompliance = vi.fn();
const mockLoadSpaceActData = vi.fn();

vi.mock("@/lib/engine.server", () => ({
  calculateCompliance: (...args: unknown[]) => mockCalculateCompliance(...args),
  loadSpaceActDataFromDisk: () => mockLoadSpaceActData(),
}));

const mockNIS2Compliance = vi.fn();
vi.mock("@/lib/nis2-engine.server", () => ({
  calculateNIS2Compliance: (...args: unknown[]) => mockNIS2Compliance(...args),
}));

const mockSpaceLawCompliance = vi.fn();
vi.mock("@/lib/space-law-engine.server", () => ({
  calculateSpaceLawCompliance: (...args: unknown[]) =>
    mockSpaceLawCompliance(...args),
}));

import { POST } from "@/app/api/unified/calculate/route";

// ─── Helpers ───

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/unified/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockSpaceActResult(overrides = {}) {
  return {
    operatorType: "spacecraft_operator",
    operatorTypeLabel: "Spacecraft Operator",
    operatorAbbreviation: "SCO",
    isEU: true,
    isThirdCountry: false,
    regime: "standard",
    regimeLabel: "Standard",
    regimeReason: "Standard regime applies",
    entitySize: "large",
    entitySizeLabel: "Large Enterprise",
    constellationTier: null,
    constellationTierLabel: null,
    orbit: "LEO",
    orbitLabel: "Low Earth Orbit",
    offersEUServices: true,
    applicableArticles: [
      {
        number: 1,
        title: "Subject Matter",
        summary: "Establishes framework",
        applies_to: ["ALL"],
        compliance_type: "informational",
      },
      {
        number: 10,
        title: "Authorization",
        summary: "Authorization required",
        applies_to: ["SCO"],
        compliance_type: "mandatory_pre_activity",
      },
    ],
    totalArticles: 119,
    applicableCount: 2,
    applicablePercentage: 2,
    moduleStatuses: [
      {
        id: "authorization",
        name: "Authorization",
        icon: "Shield",
        description: "Authorization module",
        status: "required",
        articleCount: 5,
        summary: "",
      },
    ],
    checklist: [
      {
        requirement: "Submit authorization",
        articles: "Art. 10",
        module: "authorization",
      },
    ],
    keyDates: [{ date: "2027-01-01", description: "Entry into force" }],
    estimatedAuthorizationCost: "EUR 50,000",
    authorizationPath: "Full authorization",
    ...overrides,
  };
}

function mockNIS2Result(overrides = {}) {
  return {
    entityClassification: "essential",
    classificationReason: "Essential entity",
    classificationArticleRef: "Art. 3(1)",
    sector: "space",
    subSector: "satellite_communications",
    organizationSize: "large",
    applicableRequirements: [],
    totalNIS2Requirements: 51,
    applicableCount: 40,
    incidentReportingTimeline: {
      earlyWarning: { deadline: "24 hours", description: "Early warning" },
      notification: { deadline: "72 hours", description: "Notification" },
      intermediateReport: {
        deadline: "Upon request",
        description: "Intermediate",
      },
      finalReport: { deadline: "1 month", description: "Final report" },
    },
    euSpaceActOverlap: {
      count: 0,
      totalPotentialSavingsWeeks: 0,
      overlappingRequirements: [],
    },
    supervisoryAuthority: "BSI",
    supervisoryAuthorityNote: "German authority",
    penalties: {
      essential: "10M",
      important: "7M",
      applicable: "10M",
    },
    registrationRequired: true,
    registrationDeadline: "17 October 2024",
    keyDates: [],
    ...overrides,
  };
}

const validAnswers = {
  establishmentCountry: "DE",
  entitySize: "large",
  activityTypes: ["SCO"],
  serviceTypes: ["SATCOM"],
  primaryOrbitalRegime: "LEO",
  operatesConstellation: false,
  constellationSize: null,
  servesEUCustomers: true,
  isDefenseOnly: false,
  defenseInvolvement: "none",
  hasCybersecurityPolicy: true,
  hasRiskManagement: true,
  hasIncidentResponsePlan: true,
  hasBusinessContinuityPlan: true,
  hasSupplyChainSecurity: true,
  hasSecurityTraining: true,
  hasEncryption: true,
  hasAccessControl: true,
  hasVulnerabilityManagement: true,
  conductsPenetrationTesting: true,
  interestedJurisdictions: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(null);
  mockLoadSpaceActData.mockReturnValue({ titles: [] });
  mockCalculateCompliance.mockReturnValue(mockSpaceActResult());
  mockNIS2Compliance.mockResolvedValue(mockNIS2Result());
  mockSpaceLawCompliance.mockResolvedValue(null);
});

describe("POST /api/unified/calculate", () => {
  it("returns 400 for assessments completed too quickly (unauthenticated)", async () => {
    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 1000, // 1 second ago
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("too quickly");
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("accepts assessments over minimum duration (unauthenticated)", async () => {
    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 6000, // 6 seconds ago
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("skips timer check for authenticated users", async () => {
    mockAuth.mockResolvedValue({ user: { id: "1", name: "Test" } });

    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 1000, // 1 second ago — would fail if unauthenticated
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it("returns 400 for missing required fields (Zod validation)", async () => {
    const request = makeRequest({
      answers: {},
      startedAt: Date.now() - 10000,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Validation failed");
    expect(data.code).toBe("VALIDATION_ERROR");
  });

  it("calls real EU Space Act engine for SCO", async () => {
    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 10000,
    });

    await POST(request);

    expect(mockLoadSpaceActData).toHaveBeenCalled();
    expect(mockCalculateCompliance).toHaveBeenCalled();
    const [engineAnswers] = mockCalculateCompliance.mock.calls[0];
    expect(engineAnswers.activityType).toBe("spacecraft");
  });

  it("calls engine once per activity type for multi-activity", async () => {
    const multiAnswers = {
      ...validAnswers,
      activityTypes: ["SCO", "LO"],
    };

    const request = makeRequest({
      answers: multiAnswers,
      startedAt: Date.now() - 10000,
    });

    await POST(request);

    // Should be called twice - once for SCO and once for LO
    expect(mockCalculateCompliance).toHaveBeenCalledTimes(2);
  });

  it("calls NIS2 engine", async () => {
    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 10000,
    });

    await POST(request);

    expect(mockNIS2Compliance).toHaveBeenCalled();
    const [nis2Answers] = mockNIS2Compliance.mock.calls[0];
    expect(nis2Answers.sector).toBe("space");
  });

  it("does not call space law engine when no jurisdictions selected", async () => {
    const request = makeRequest({
      answers: { ...validAnswers, interestedJurisdictions: [] },
      startedAt: Date.now() - 10000,
    });

    await POST(request);

    expect(mockSpaceLawCompliance).not.toHaveBeenCalled();
  });

  it("returns result with real article counts from engine", async () => {
    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 10000,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.data.result).toBeDefined();
    expect(data.data.result.euSpaceAct.applies).toBe(true);
    expect(data.data.result.euSpaceAct.applicableArticleCount).toBe(2);
    expect(data.data.result.euSpaceAct.applicableArticles).toHaveLength(2);
  });

  it("returns module statuses from engine", async () => {
    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 10000,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.data.result.euSpaceAct.moduleStatuses).toBeDefined();
    expect(data.data.result.euSpaceAct.moduleStatuses.length).toBeGreaterThan(
      0,
    );
    expect(data.data.result.euSpaceAct.moduleStatuses[0]).toHaveProperty(
      "status",
    );
  });

  it("returns NIS2 incident timeline", async () => {
    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 10000,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.data.result.nis2.incidentTimeline).toBeDefined();
    expect(data.data.result.nis2.incidentTimeline).toHaveLength(3);
  });

  it("handles defense-only exemption", async () => {
    const defenseAnswers = {
      ...validAnswers,
      defenseInvolvement: "full",
      isDefenseOnly: true,
    };

    const request = makeRequest({
      answers: defenseAnswers,
      startedAt: Date.now() - 10000,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.data.result.euSpaceAct.applies).toBe(false);
    // Engine should not be called for defense-only
    expect(mockCalculateCompliance).not.toHaveBeenCalled();
  });

  it("defaults constellation size when operates constellation but no size", async () => {
    const constAnswers = {
      ...validAnswers,
      operatesConstellation: true,
      constellationSize: null,
    };

    const request = makeRequest({
      answers: constAnswers,
      startedAt: Date.now() - 10000,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    // The validation should have defaulted constellationSize to "small"
  });

  it("includes confidence score in result", async () => {
    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 10000,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.data.result.confidenceScore).toBeDefined();
    expect(typeof data.data.result.confidenceScore).toBe("number");
    expect(data.data.result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(data.data.result.confidenceScore).toBeLessThanOrEqual(100);
  });

  it("includes cross-framework overlap in result", async () => {
    const request = makeRequest({
      answers: validAnswers,
      startedAt: Date.now() - 10000,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.data.result.crossFrameworkOverlap).toBeDefined();
    expect(Array.isArray(data.data.result.crossFrameworkOverlap)).toBe(true);
  });
});
