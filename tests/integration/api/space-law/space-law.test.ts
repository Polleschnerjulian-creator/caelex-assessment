import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock server-only ───
vi.mock("server-only", () => ({}));

// ─── Mock Auth ───
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// ─── Mock Prisma ───
vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

// ─── Mock Rate Limiting ───
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 9 }),
  getIdentifier: vi.fn().mockReturnValue("test-ip"),
  createRateLimitResponse: vi.fn().mockImplementation(
    () =>
      new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
  ),
}));

// ─── Mock Space Law Engine (no factory references to module-scoped vars) ───
vi.mock("@/lib/space-law-engine.server", () => ({
  calculateSpaceLawCompliance: vi.fn(),
  redactSpaceLawResultForClient: vi.fn(),
}));

// ─── Mock JURISDICTION_DATA for jurisdictions endpoints ───
// We build the mock map here; vi.mock hoists but the Map constructor is self-contained.
vi.mock("@/data/national-space-laws", () => {
  const mockFR = {
    countryCode: "FR",
    countryName: "France",
    flagEmoji: "\u{1F1EB}\u{1F1F7}",
    legislation: {
      name: "French Space Operations Act (LOS)",
      nameLocal: "Loi relative aux operations spatiales",
      yearEnacted: 2008,
      yearAmended: 2019,
      status: "enacted",
      officialUrl:
        "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000018931380",
      keyArticles: "Articles 1-22",
    },
    licensingAuthority: {
      name: "Centre National d'Etudes Spatiales (CNES)",
      nameLocal: "Centre National d'Etudes Spatiales",
      website: "https://cnes.fr",
      contactEmail: "contact@cnes.fr",
      parentMinistry: "Ministry of Higher Education, Research and Innovation",
    },
    licensingRequirements: [
      {
        id: "fr-tech-assessment",
        category: "technical_assessment",
        title: "Technical Conformity Assessment",
        description: "Comprehensive technical assessment of the space object.",
        mandatory: true,
        applicableTo: ["spacecraft_operation"],
        articleRef: "Art. 4",
      },
      {
        id: "fr-financial-guarantee",
        category: "financial_guarantee",
        title: "Financial Guarantee",
        description: "Proof of adequate financial resources.",
        mandatory: true,
        applicableTo: ["spacecraft_operation", "launch_vehicle"],
        articleRef: "Art. 6 LOS",
      },
    ],
    applicabilityRules: [],
    insuranceLiability: {
      mandatoryInsurance: true,
      minimumCoverage: "EUR 60,000,000",
      governmentIndemnification: true,
      indemnificationCap: "EUR 60,000,000",
      liabilityRegime: "capped",
      thirdPartyRequired: true,
    },
    debrisMitigation: {
      deorbitRequirement: true,
      deorbitTimeline: "25 years",
      passivationRequired: true,
      debrisMitigationPlan: true,
      collisionAvoidance: true,
      standards: ["ISO 24113", "IADC Guidelines"],
    },
    dataSensing: {
      remoteSensingLicense: true,
      dataDistributionRestrictions: true,
      resolutionRestrictions: "0.5m requires authorization",
    },
    timeline: {
      typicalProcessingWeeks: { min: 12, max: 24 },
      applicationFee: "EUR 5,000",
      annualFee: "EUR 2,500",
    },
    registration: {
      nationalRegistryExists: true,
      registryName: "French National Space Registry",
      unRegistrationRequired: true,
    },
    euSpaceActCrossRef: {
      relationship: "complementary",
      description: "French LOS will be complemented by the EU Space Act.",
      keyArticles: ["Art. 4-12"],
      transitionNotes: "National provisions will remain for non-EU aspects.",
    },
    lastUpdated: "2025-12-01",
  };

  const mockUK = {
    countryCode: "UK",
    countryName: "United Kingdom",
    flagEmoji: "\u{1F1EC}\u{1F1E7}",
    legislation: {
      name: "Space Industry Act 2018",
      nameLocal: "Space Industry Act 2018",
      yearEnacted: 2018,
      status: "enacted",
      officialUrl: "https://www.legislation.gov.uk/ukpga/2018/5",
    },
    licensingAuthority: {
      name: "Civil Aviation Authority (CAA)",
      nameLocal: "Civil Aviation Authority",
      website: "https://www.caa.co.uk",
      contactEmail: "space@caa.co.uk",
    },
    licensingRequirements: [
      {
        id: "uk-operator-license",
        category: "technical_assessment",
        title: "Operator Licence",
        description: "Operator licence application.",
        mandatory: true,
        applicableTo: ["spacecraft_operation"],
      },
    ],
    applicabilityRules: [],
    insuranceLiability: {
      mandatoryInsurance: true,
      minimumCoverage: "Case-by-case",
      governmentIndemnification: false,
      liabilityRegime: "unlimited",
      thirdPartyRequired: true,
    },
    debrisMitigation: {
      deorbitRequirement: true,
      deorbitTimeline: "25 years",
      passivationRequired: true,
      debrisMitigationPlan: true,
      collisionAvoidance: true,
    },
    dataSensing: {
      remoteSensingLicense: false,
      dataDistributionRestrictions: false,
    },
    timeline: {
      typicalProcessingWeeks: { min: 8, max: 16 },
      applicationFee: "GBP 10,000",
    },
    registration: {
      nationalRegistryExists: true,
      registryName: "UK Space Registry",
      unRegistrationRequired: true,
    },
    euSpaceActCrossRef: {
      relationship: "parallel",
      description: "UK operates independently post-Brexit.",
      transitionNotes: "No EU Space Act applicability.",
    },
    lastUpdated: "2025-11-15",
  };

  return {
    JURISDICTION_DATA: new Map([
      ["FR", mockFR],
      ["UK", mockUK],
    ]),
  };
});

// ─── Imports (after mocks) ───
import { checkRateLimit } from "@/lib/ratelimit";
import {
  calculateSpaceLawCompliance,
  redactSpaceLawResultForClient,
} from "@/lib/space-law-engine.server";
import { POST as calculatePOST } from "@/app/api/space-law/calculate/route";
import { GET as jurisdictionsGET } from "@/app/api/space-law/jurisdictions/route";
import { GET as jurisdictionByCodeGET } from "@/app/api/space-law/jurisdictions/[countryCode]/route";
import { JURISDICTION_DATA } from "@/data/national-space-laws";

// ─── Mock Data (defined after imports, used in beforeEach) ───

const mockComplianceResult = {
  jurisdictions: [
    {
      countryCode: "FR",
      countryName: "France",
      flagEmoji: "\u{1F1EB}\u{1F1F7}",
      isApplicable: true,
      applicabilityReason:
        "Authorization required under French Space Operations Act (LOS).",
      totalRequirements: 7,
      mandatoryRequirements: 5,
      applicableRequirements: [
        {
          id: "fr-tech-assessment",
          category: "technical_assessment",
          title: "Technical Conformity Assessment",
          description: "Comprehensive technical assessment...",
          mandatory: true,
          applicableTo: ["spacecraft_operation"],
          articleRef: "Art. 4",
        },
      ],
      authority: {
        name: "CNES",
        website: "https://cnes.fr",
        contactEmail: "contact@cnes.fr",
      },
      estimatedTimeline: { min: 12, max: 24 },
      estimatedCost: "Application: EUR 5,000",
      insurance: {
        mandatory: true,
        minimumCoverage: "EUR 60,000,000",
        governmentIndemnification: true,
      },
      debris: {
        deorbitRequired: true,
        deorbitTimeline: "25 years",
        mitigationPlan: true,
      },
      legislation: {
        name: "French Space Operations Act (LOS)",
        status: "enacted",
        yearEnacted: 2008,
      },
      favorabilityScore: 78,
      favorabilityFactors: [
        "Mature regulatory framework",
        "Government indemnification available",
      ],
    },
  ],
  comparisonMatrix: {
    criteria: [
      {
        id: "processing_time",
        label: "Processing Time",
        category: "timeline",
        jurisdictionValues: {
          FR: { value: "12-24 weeks", score: 3 },
        },
      },
    ],
  },
  euSpaceActPreview: {
    overallRelationship:
      "The EU Space Act (effective 2030) will harmonize authorization requirements across EU member states.",
    jurisdictionNotes: {
      FR: {
        relationship: "complementary",
        description: "French LOS will be complemented by the EU Space Act.",
        keyChanges: ["Authorization (Art. 4-12): complementary"],
      },
    },
  },
  recommendations: [
    "Prepare insurance documentation early.",
    "Plan for EU Space Act transition by 2030.",
  ],
};

const mockRedactedResult = {
  jurisdictions: [
    {
      countryCode: "FR",
      countryName: "France",
      flagEmoji: "\u{1F1EB}\u{1F1F7}",
      isApplicable: true,
      applicabilityReason:
        "Authorization required under French Space Operations Act (LOS).",
      totalRequirements: 7,
      mandatoryRequirements: 5,
      requirementCount: 1,
      authority: {
        name: "CNES",
        website: "https://cnes.fr",
        contactEmail: "contact@cnes.fr",
      },
      estimatedTimeline: { min: 12, max: 24 },
      estimatedCost: "Application: EUR 5,000",
      insurance: {
        mandatory: true,
        minimumCoverage: "EUR 60,000,000",
        governmentIndemnification: true,
      },
      debris: {
        deorbitRequired: true,
        deorbitTimeline: "25 years",
        mitigationPlan: true,
      },
      legislation: {
        name: "French Space Operations Act (LOS)",
        status: "enacted",
        yearEnacted: 2008,
      },
      favorabilityScore: 78,
      favorabilityFactors: [
        "Mature regulatory framework",
        "Government indemnification available",
      ],
    },
  ],
  comparisonMatrix: {
    criteria: [
      {
        id: "processing_time",
        label: "Processing Time",
        category: "timeline",
        jurisdictionValues: {
          FR: { value: "12-24 weeks", score: 3 },
        },
      },
    ],
  },
  euSpaceActPreview: {
    overallRelationship:
      "The EU Space Act (effective 2030) will harmonize authorization requirements across EU member states.",
    jurisdictionNotes: {
      FR: {
        relationship: "complementary",
        description: "French LOS will be complemented by the EU Space Act.",
        keyChanges: ["Authorization (Art. 4-12): complementary"],
      },
    },
  },
  recommendations: [
    "Prepare insurance documentation early.",
    "Plan for EU Space Act transition by 2030.",
  ],
};

// ─── Test Helpers ───

function makeNextRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  },
): NextRequest {
  return new NextRequest(url, {
    method: options?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  });
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

function makeParams(countryCode: string) {
  return { params: Promise.resolve({ countryCode }) };
}

const validSpaceLawAnswers = {
  selectedJurisdictions: ["FR"],
  activityType: "spacecraft_operation",
  entityNationality: "domestic",
  entitySize: "medium",
  primaryOrbit: "LEO",
  constellationSize: 1,
  licensingStatus: "new_application",
};

// ═══════════════════════════════════════════════════════════════
// POST /api/space-law/calculate
// ═══════════════════════════════════════════════════════════════

describe("POST /api/space-law/calculate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 9,
    } as never);
    vi.mocked(calculateSpaceLawCompliance).mockResolvedValue(
      mockComplianceResult as never,
    );
    vi.mocked(redactSpaceLawResultForClient).mockReturnValue(
      mockRedactedResult as never,
    );
  });

  // ─── 200 Success Cases ───

  it("should return 200 with redacted compliance result for valid input", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: validSpaceLawAnswers,
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.result).toBeDefined();
    expect(data.result.jurisdictions).toBeDefined();
    expect(data.result.comparisonMatrix).toBeDefined();
    expect(data.result.euSpaceActPreview).toBeDefined();
    expect(data.result.recommendations).toBeDefined();
  });

  it("should call calculateSpaceLawCompliance with the provided answers", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: validSpaceLawAnswers,
        startedAt: Date.now() - 30000,
      },
    });

    await calculatePOST(req);

    expect(calculateSpaceLawCompliance).toHaveBeenCalledWith(
      validSpaceLawAnswers,
    );
  });

  it("should call redactSpaceLawResultForClient to strip sensitive data", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: validSpaceLawAnswers,
        startedAt: Date.now() - 30000,
      },
    });

    await calculatePOST(req);

    expect(redactSpaceLawResultForClient).toHaveBeenCalledWith(
      mockComplianceResult,
    );
  });

  it("should include rate limit and cache headers in successful response", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: validSpaceLawAnswers,
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);

    expect(res.headers.get("X-RateLimit-Remaining")).toBe("9");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(res.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("should accept request with multiple jurisdictions (up to 3)", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          ...validSpaceLawAnswers,
          selectedJurisdictions: ["FR", "UK", "BE"],
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    expect(res.status).toBe(200);
  });

  it("should accept request with null optional fields", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          selectedJurisdictions: ["FR"],
          activityType: null,
          entityNationality: null,
          entitySize: null,
          primaryOrbit: null,
          constellationSize: null,
          licensingStatus: null,
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    expect(res.status).toBe(200);
  });

  it("should accept request with undefined optional fields", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          selectedJurisdictions: ["UK"],
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    expect(res.status).toBe(200);
  });

  it("should accept request without startedAt (no anti-bot check)", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: validSpaceLawAnswers,
      },
    });

    const res = await calculatePOST(req);
    expect(res.status).toBe(200);
  });

  // ─── 400 Validation Error Cases ───

  it("should return 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-valid-json",
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid JSON body");
  });

  it("should return 400 when answers is missing", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("should return 400 when answers is not an object", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: "not-an-object",
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("expected an object");
  });

  it("should return 400 when selectedJurisdictions is missing", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          activityType: "spacecraft_operation",
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("selectedJurisdictions");
  });

  it("should return 400 when selectedJurisdictions is empty", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          ...validSpaceLawAnswers,
          selectedJurisdictions: [],
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("1 to 3 jurisdictions");
  });

  it("should return 400 when selectedJurisdictions exceeds 3", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          ...validSpaceLawAnswers,
          selectedJurisdictions: ["FR", "UK", "BE", "NL"],
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("1 to 3 jurisdictions");
  });

  it("should return 400 for invalid jurisdiction code", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          ...validSpaceLawAnswers,
          selectedJurisdictions: ["XX"],
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid jurisdiction code: XX");
  });

  it("should return 400 for invalid activityType", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          ...validSpaceLawAnswers,
          activityType: "warp_drive_operation",
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid activityType");
  });

  it("should return 400 for invalid entityNationality", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          ...validSpaceLawAnswers,
          entityNationality: "martian",
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid entityNationality");
  });

  it("should return 400 for invalid entitySize", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          ...validSpaceLawAnswers,
          entitySize: "gigantic",
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid entitySize");
  });

  it("should return 400 for invalid primaryOrbit", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          ...validSpaceLawAnswers,
          primaryOrbit: "HELIO",
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid primaryOrbit");
  });

  it("should return 400 for negative constellationSize", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          ...validSpaceLawAnswers,
          constellationSize: -5,
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid constellationSize");
  });

  it("should return 400 for non-numeric constellationSize", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          ...validSpaceLawAnswers,
          constellationSize: "many",
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid constellationSize");
  });

  it("should return 400 for invalid licensingStatus", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          ...validSpaceLawAnswers,
          licensingStatus: "expired",
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid licensingStatus");
  });

  // ─── 429 Rate Limit & Anti-Bot Cases ───

  it("should return 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
    } as never);

    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: validSpaceLawAnswers,
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    expect(res.status).toBe(429);
  });

  it("should return 429 for bot-like fast completion (< 3 seconds)", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: validSpaceLawAnswers,
        startedAt: Date.now() - 1000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toContain("too quickly");
  });

  it("should allow completion at exactly 3 seconds", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: validSpaceLawAnswers,
        startedAt: Date.now() - 3000,
      },
    });

    const res = await calculatePOST(req);
    // 3000ms elapsed is not < 3000, so it should pass the anti-bot check
    expect(res.status).toBe(200);
  });

  // ─── 500 Internal Server Error Cases ───

  it("should return 500 when engine throws an error", async () => {
    vi.mocked(calculateSpaceLawCompliance).mockRejectedValue(
      new Error("Engine failure"),
    );

    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: validSpaceLawAnswers,
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe(
      "Failed to calculate space law compliance assessment",
    );
  });

  it("should return 500 when redaction throws an error", async () => {
    vi.mocked(redactSpaceLawResultForClient).mockImplementation(() => {
      throw new Error("Redaction failed");
    });

    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: validSpaceLawAnswers,
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe(
      "Failed to calculate space law compliance assessment",
    );
  });

  // ─── Edge Cases ───

  it("should accept all valid activity types", async () => {
    const activityTypes = [
      "spacecraft_operation",
      "launch_vehicle",
      "launch_site",
      "in_orbit_services",
      "earth_observation",
      "satellite_communications",
      "space_resources",
    ];

    for (const activityType of activityTypes) {
      vi.clearAllMocks();
      vi.mocked(checkRateLimit).mockResolvedValue({
        success: true,
        remaining: 9,
      } as never);
      vi.mocked(calculateSpaceLawCompliance).mockResolvedValue(
        mockComplianceResult as never,
      );
      vi.mocked(redactSpaceLawResultForClient).mockReturnValue(
        mockRedactedResult as never,
      );

      const req = makeNextRequest("http://localhost/api/space-law/calculate", {
        method: "POST",
        body: {
          answers: {
            ...validSpaceLawAnswers,
            activityType,
          },
          startedAt: Date.now() - 30000,
        },
      });

      const res = await calculatePOST(req);
      expect(res.status).toBe(200);
    }
  });

  it("should accept all valid country codes individually", async () => {
    const countryCodes = [
      "FR",
      "UK",
      "BE",
      "NL",
      "LU",
      "AT",
      "DK",
      "DE",
      "IT",
      "NO",
    ];

    for (const code of countryCodes) {
      vi.clearAllMocks();
      vi.mocked(checkRateLimit).mockResolvedValue({
        success: true,
        remaining: 9,
      } as never);
      vi.mocked(calculateSpaceLawCompliance).mockResolvedValue(
        mockComplianceResult as never,
      );
      vi.mocked(redactSpaceLawResultForClient).mockReturnValue(
        mockRedactedResult as never,
      );

      const req = makeNextRequest("http://localhost/api/space-law/calculate", {
        method: "POST",
        body: {
          answers: {
            ...validSpaceLawAnswers,
            selectedJurisdictions: [code],
          },
          startedAt: Date.now() - 30000,
        },
      });

      const res = await calculatePOST(req);
      expect(res.status).toBe(200);
    }
  });

  it("should accept constellationSize of 0", async () => {
    const req = makeNextRequest("http://localhost/api/space-law/calculate", {
      method: "POST",
      body: {
        answers: {
          ...validSpaceLawAnswers,
          constellationSize: 0,
        },
        startedAt: Date.now() - 30000,
      },
    });

    const res = await calculatePOST(req);
    expect(res.status).toBe(200);
  });

  it("should accept all valid orbit types", async () => {
    const orbits = ["LEO", "MEO", "GEO", "beyond"];

    for (const primaryOrbit of orbits) {
      vi.clearAllMocks();
      vi.mocked(checkRateLimit).mockResolvedValue({
        success: true,
        remaining: 9,
      } as never);
      vi.mocked(calculateSpaceLawCompliance).mockResolvedValue(
        mockComplianceResult as never,
      );
      vi.mocked(redactSpaceLawResultForClient).mockReturnValue(
        mockRedactedResult as never,
      );

      const req = makeNextRequest("http://localhost/api/space-law/calculate", {
        method: "POST",
        body: {
          answers: {
            ...validSpaceLawAnswers,
            primaryOrbit,
          },
          startedAt: Date.now() - 30000,
        },
      });

      const res = await calculatePOST(req);
      expect(res.status).toBe(200);
    }
  });

  it("should accept all valid licensing statuses", async () => {
    const statuses = [
      "new_application",
      "existing_license",
      "renewal",
      "pre_assessment",
    ];

    for (const licensingStatus of statuses) {
      vi.clearAllMocks();
      vi.mocked(checkRateLimit).mockResolvedValue({
        success: true,
        remaining: 9,
      } as never);
      vi.mocked(calculateSpaceLawCompliance).mockResolvedValue(
        mockComplianceResult as never,
      );
      vi.mocked(redactSpaceLawResultForClient).mockReturnValue(
        mockRedactedResult as never,
      );

      const req = makeNextRequest("http://localhost/api/space-law/calculate", {
        method: "POST",
        body: {
          answers: {
            ...validSpaceLawAnswers,
            licensingStatus,
          },
          startedAt: Date.now() - 30000,
        },
      });

      const res = await calculatePOST(req);
      expect(res.status).toBe(200);
    }
  });

  it("should accept all valid entity nationalities", async () => {
    const nationalities = ["domestic", "eu_other", "non_eu", "esa_member"];

    for (const entityNationality of nationalities) {
      vi.clearAllMocks();
      vi.mocked(checkRateLimit).mockResolvedValue({
        success: true,
        remaining: 9,
      } as never);
      vi.mocked(calculateSpaceLawCompliance).mockResolvedValue(
        mockComplianceResult as never,
      );
      vi.mocked(redactSpaceLawResultForClient).mockReturnValue(
        mockRedactedResult as never,
      );

      const req = makeNextRequest("http://localhost/api/space-law/calculate", {
        method: "POST",
        body: {
          answers: {
            ...validSpaceLawAnswers,
            entityNationality,
          },
          startedAt: Date.now() - 30000,
        },
      });

      const res = await calculatePOST(req);
      expect(res.status).toBe(200);
    }
  });

  it("should accept all valid entity sizes", async () => {
    const sizes = ["small", "medium", "large"];

    for (const entitySize of sizes) {
      vi.clearAllMocks();
      vi.mocked(checkRateLimit).mockResolvedValue({
        success: true,
        remaining: 9,
      } as never);
      vi.mocked(calculateSpaceLawCompliance).mockResolvedValue(
        mockComplianceResult as never,
      );
      vi.mocked(redactSpaceLawResultForClient).mockReturnValue(
        mockRedactedResult as never,
      );

      const req = makeNextRequest("http://localhost/api/space-law/calculate", {
        method: "POST",
        body: {
          answers: {
            ...validSpaceLawAnswers,
            entitySize,
          },
          startedAt: Date.now() - 30000,
        },
      });

      const res = await calculatePOST(req);
      expect(res.status).toBe(200);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/space-law/jurisdictions
// ═══════════════════════════════════════════════════════════════

describe("GET /api/space-law/jurisdictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 200 Success Cases ───

  it("should return 200 with a list of jurisdiction summaries", async () => {
    const res = await jurisdictionsGET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.jurisdictions).toBeDefined();
    expect(Array.isArray(data.jurisdictions)).toBe(true);
    expect(data.jurisdictions.length).toBe(2); // FR and UK in our mock
  });

  it("should return jurisdiction summaries with expected fields", async () => {
    const res = await jurisdictionsGET();
    const data = await res.json();

    const fr = data.jurisdictions.find(
      (j: Record<string, unknown>) => j.countryCode === "FR",
    );
    expect(fr).toBeDefined();
    expect(fr.countryCode).toBe("FR");
    expect(fr.countryName).toBe("France");
    expect(fr.flagEmoji).toBeDefined();
    expect(fr.legislation).toBeDefined();
    expect(fr.legislation.name).toBe("French Space Operations Act (LOS)");
    expect(fr.legislation.status).toBe("enacted");
    expect(fr.legislation.yearEnacted).toBe(2008);
    expect(fr.authority).toBeDefined();
    expect(fr.authority.name).toContain("CNES");
    expect(fr.authority.website).toBe("https://cnes.fr");
    expect(fr.requirementCount).toBe(2);
    expect(fr.timeline).toEqual({ min: 12, max: 24 });
    expect(fr.insuranceMandatory).toBe(true);
    expect(fr.euSpaceActRelationship).toBe("complementary");
  });

  it("should include UK jurisdiction in the list", async () => {
    const res = await jurisdictionsGET();
    const data = await res.json();

    const uk = data.jurisdictions.find(
      (j: Record<string, unknown>) => j.countryCode === "UK",
    );
    expect(uk).toBeDefined();
    expect(uk.countryCode).toBe("UK");
    expect(uk.countryName).toBe("United Kingdom");
    expect(uk.euSpaceActRelationship).toBe("parallel");
  });

  it("should include cache headers for public caching", async () => {
    const res = await jurisdictionsGET();

    expect(res.headers.get("Cache-Control")).toContain("public");
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");
  });

  it("should not include full requirement descriptions in summary", async () => {
    const res = await jurisdictionsGET();
    const data = await res.json();

    const fr = data.jurisdictions.find(
      (j: Record<string, unknown>) => j.countryCode === "FR",
    );
    // Only count, not the full requirement objects
    expect(fr.requirementCount).toBeDefined();
    expect(fr.licensingRequirements).toBeUndefined();
  });

  // ─── 500 Error Cases ───

  it("should return 500 when JURISDICTION_DATA.values() throws", async () => {
    // Temporarily replace the mock Map's values() to throw
    const originalValues = JURISDICTION_DATA.values.bind(JURISDICTION_DATA);
    (JURISDICTION_DATA as unknown as Record<string, unknown>).values = () => {
      throw new Error("Data corruption");
    };

    const res = await jurisdictionsGET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch jurisdictions");

    // Restore
    (JURISDICTION_DATA as unknown as Record<string, unknown>).values =
      originalValues;
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/space-law/jurisdictions/[countryCode]
// ═══════════════════════════════════════════════════════════════

describe("GET /api/space-law/jurisdictions/[countryCode]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 200 Success Cases ───

  it("should return 200 with detailed jurisdiction data for valid country code", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/FR");

    const res = await jurisdictionByCodeGET(req, makeParams("FR"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.jurisdiction).toBeDefined();
    expect(data.jurisdiction.countryCode).toBe("FR");
    expect(data.jurisdiction.countryName).toBe("France");
  });

  it("should return detailed legislation info", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/FR");

    const res = await jurisdictionByCodeGET(req, makeParams("FR"));
    const data = await res.json();

    expect(data.jurisdiction.legislation).toBeDefined();
    expect(data.jurisdiction.legislation.name).toBe(
      "French Space Operations Act (LOS)",
    );
    expect(data.jurisdiction.legislation.yearEnacted).toBe(2008);
    expect(data.jurisdiction.legislation.yearAmended).toBe(2019);
    expect(data.jurisdiction.legislation.status).toBe("enacted");
    expect(data.jurisdiction.legislation.officialUrl).toBeDefined();
  });

  it("should return licensing authority info", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/FR");

    const res = await jurisdictionByCodeGET(req, makeParams("FR"));
    const data = await res.json();

    expect(data.jurisdiction.licensingAuthority).toBeDefined();
    expect(data.jurisdiction.licensingAuthority.name).toContain("CNES");
    expect(data.jurisdiction.licensingAuthority.website).toBe(
      "https://cnes.fr",
    );
    expect(data.jurisdiction.licensingAuthority.contactEmail).toBe(
      "contact@cnes.fr",
    );
  });

  it("should return requirement count and categories (not full descriptions)", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/FR");

    const res = await jurisdictionByCodeGET(req, makeParams("FR"));
    const data = await res.json();

    expect(data.jurisdiction.requirementCount).toBe(2);
    expect(data.jurisdiction.requirementCategories).toBeDefined();
    expect(Array.isArray(data.jurisdiction.requirementCategories)).toBe(true);
    expect(data.jurisdiction.requirementCategories).toContain(
      "technical_assessment",
    );
    expect(data.jurisdiction.requirementCategories).toContain(
      "financial_guarantee",
    );
  });

  it("should return insurance and liability info", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/FR");

    const res = await jurisdictionByCodeGET(req, makeParams("FR"));
    const data = await res.json();

    expect(data.jurisdiction.insuranceLiability).toBeDefined();
    expect(data.jurisdiction.insuranceLiability.mandatoryInsurance).toBe(true);
    expect(data.jurisdiction.insuranceLiability.minimumCoverage).toBe(
      "EUR 60,000,000",
    );
    expect(data.jurisdiction.insuranceLiability.governmentIndemnification).toBe(
      true,
    );
    expect(data.jurisdiction.insuranceLiability.liabilityRegime).toBe("capped");
  });

  it("should return debris mitigation info", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/FR");

    const res = await jurisdictionByCodeGET(req, makeParams("FR"));
    const data = await res.json();

    expect(data.jurisdiction.debrisMitigation).toBeDefined();
    expect(data.jurisdiction.debrisMitigation.deorbitRequirement).toBe(true);
    expect(data.jurisdiction.debrisMitigation.deorbitTimeline).toBe("25 years");
    expect(data.jurisdiction.debrisMitigation.debrisMitigationPlan).toBe(true);
  });

  it("should return timeline info", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/FR");

    const res = await jurisdictionByCodeGET(req, makeParams("FR"));
    const data = await res.json();

    expect(data.jurisdiction.timeline).toBeDefined();
    expect(data.jurisdiction.timeline.typicalProcessingWeeks).toEqual({
      min: 12,
      max: 24,
    });
    expect(data.jurisdiction.timeline.applicationFee).toBe("EUR 5,000");
  });

  it("should return registration info", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/FR");

    const res = await jurisdictionByCodeGET(req, makeParams("FR"));
    const data = await res.json();

    expect(data.jurisdiction.registration).toBeDefined();
    expect(data.jurisdiction.registration.nationalRegistryExists).toBe(true);
    expect(data.jurisdiction.registration.registryName).toBe(
      "French National Space Registry",
    );
  });

  it("should return EU Space Act cross-reference info", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/FR");

    const res = await jurisdictionByCodeGET(req, makeParams("FR"));
    const data = await res.json();

    expect(data.jurisdiction.euSpaceActCrossRef).toBeDefined();
    expect(data.jurisdiction.euSpaceActCrossRef.relationship).toBe(
      "complementary",
    );
    expect(data.jurisdiction.euSpaceActCrossRef.description).toBeDefined();
  });

  it("should return lastUpdated field", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/FR");

    const res = await jurisdictionByCodeGET(req, makeParams("FR"));
    const data = await res.json();

    expect(data.jurisdiction.lastUpdated).toBe("2025-12-01");
  });

  it("should handle case-insensitive country code (lowercase)", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/fr");

    const res = await jurisdictionByCodeGET(req, makeParams("fr"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.jurisdiction.countryCode).toBe("FR");
  });

  it("should handle case-insensitive country code (mixed case)", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/Fr");

    const res = await jurisdictionByCodeGET(req, makeParams("Fr"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.jurisdiction.countryCode).toBe("FR");
  });

  it("should return UK jurisdiction with parallel EU relationship", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/UK");

    const res = await jurisdictionByCodeGET(req, makeParams("UK"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.jurisdiction.countryCode).toBe("UK");
    expect(data.jurisdiction.euSpaceActCrossRef.relationship).toBe("parallel");
  });

  it("should include cache headers for public caching", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/FR");

    const res = await jurisdictionByCodeGET(req, makeParams("FR"));

    expect(res.headers.get("Cache-Control")).toContain("public");
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");
  });

  // ─── 400 Validation Error Cases ───

  it("should return 400 for invalid country code", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/XX");

    const res = await jurisdictionByCodeGET(req, makeParams("XX"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid country code");
    expect(data.error).toContain("XX");
  });

  it("should return 400 for non-ISO country code format", async () => {
    const req = makeRequest(
      "http://localhost/api/space-law/jurisdictions/FRANCE",
    );

    const res = await jurisdictionByCodeGET(req, makeParams("FRANCE"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid country code");
  });

  it("should return 400 for US (not in supported jurisdictions)", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/US");

    const res = await jurisdictionByCodeGET(req, makeParams("US"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid country code");
  });

  it("should return 400 for single-character country code", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/F");

    const res = await jurisdictionByCodeGET(req, makeParams("F"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid country code");
  });

  it("should return 400 for numeric country code", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/12");

    const res = await jurisdictionByCodeGET(req, makeParams("12"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid country code");
  });

  // ─── 404 Not Found Cases ───

  it("should return 404 when jurisdiction code is valid but data not found in map", async () => {
    // "BE" is a valid SPACE_LAW_COUNTRY_CODE but not in our mock map
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/BE");

    const res = await jurisdictionByCodeGET(req, makeParams("BE"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain("Jurisdiction not found");
  });

  // ─── 500 Internal Server Error Cases ───

  it("should return 500 when params resolution throws", async () => {
    const req = makeRequest("http://localhost/api/space-law/jurisdictions/FR");

    const res = await jurisdictionByCodeGET(req, {
      params: Promise.reject(new Error("Params error")),
    } as never);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch jurisdiction details");
  });

  it("should return 500 when JURISDICTION_DATA.get throws", async () => {
    const originalGet = JURISDICTION_DATA.get.bind(JURISDICTION_DATA);
    (JURISDICTION_DATA as unknown as Record<string, unknown>).get = () => {
      throw new Error("Map corruption");
    };

    const req = makeRequest("http://localhost/api/space-law/jurisdictions/FR");

    const res = await jurisdictionByCodeGET(req, makeParams("FR"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch jurisdiction details");

    // Restore
    (JURISDICTION_DATA as unknown as Record<string, unknown>).get = originalGet;
  });
});
