import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OptimizationInput, OptimizationOutput } from "./types";
import type {
  JurisdictionLaw,
  SpaceLawCountryCode,
} from "@/lib/space-law-types";

// ── Mock server-only ──
vi.mock("server-only", () => ({}));

// ── Mock cross-references ──
vi.mock("@/data/space-law-cross-references", () => ({
  SPACE_LAW_CROSS_REFERENCES: [],
}));

// ── Mock national-space-laws with 3 test jurisdictions ──
vi.mock("@/data/national-space-laws", () => {
  const FR = {
    countryCode: "FR" as const,
    countryName: "France",
    flagEmoji: "🇫🇷",
    legislation: {
      name: "French Space Operations Act (LOS)",
      nameLocal: "Loi relative aux opérations spatiales",
      yearEnacted: 2008,
      yearAmended: 2019,
      status: "enacted",
    },
    licensingAuthority: {
      name: "CNES",
      nameLocal: "Centre National d'Études Spatiales",
      website: "https://cnes.fr",
      contactEmail: "contact@cnes.fr",
    },
    licensingRequirements: [],
    applicabilityRules: [],
    insuranceLiability: {
      mandatoryInsurance: true,
      minimumCoverage: "€60,000,000",
      governmentIndemnification: true,
      indemnificationCap: "Unlimited above €60M",
      liabilityRegime: "capped" as const,
      liabilityCap: "€60M",
      thirdPartyRequired: true,
    },
    debrisMitigation: {
      deorbitRequirement: true,
      deorbitTimeline: "25 years",
      passivationRequired: true,
      debrisMitigationPlan: true,
      collisionAvoidance: true,
      standards: ["ISO 24113"],
    },
    dataSensing: {
      remoteSensingLicense: true,
      dataDistributionRestrictions: true,
    },
    timeline: {
      typicalProcessingWeeks: { min: 12, max: 26 },
      applicationFee: "€10,000",
      annualFee: "€3,000",
    },
    registration: {
      nationalRegistryExists: true,
      registryName: "CNES Registry",
      unRegistrationRequired: true,
    },
    euSpaceActCrossRef: {
      relationship: "complementary",
      description: "Complementary to EU Space Act",
    },
    lastUpdated: "2026-01",
  };

  const LU = {
    countryCode: "LU" as const,
    countryName: "Luxembourg",
    flagEmoji: "🇱🇺",
    legislation: {
      name: "Space Activities Act 2020",
      nameLocal: "Loi sur les activités spatiales",
      yearEnacted: 2020,
      status: "enacted",
    },
    licensingAuthority: {
      name: "LSA",
      nameLocal: "Luxembourg Space Agency",
      website: "https://space-agency.lu",
      contactEmail: "info@space-agency.lu",
    },
    licensingRequirements: [],
    applicabilityRules: [],
    insuranceLiability: {
      mandatoryInsurance: true,
      minimumCoverage: "€10,000,000",
      governmentIndemnification: false,
      liabilityRegime: "negotiable" as const,
      thirdPartyRequired: true,
    },
    debrisMitigation: {
      deorbitRequirement: true,
      deorbitTimeline: "Best practices",
      passivationRequired: true,
      debrisMitigationPlan: true,
      collisionAvoidance: true,
      standards: ["ISO 24113"],
    },
    dataSensing: {
      remoteSensingLicense: false,
      dataDistributionRestrictions: false,
    },
    timeline: {
      typicalProcessingWeeks: { min: 4, max: 10 },
      applicationFee: "€5,000",
      annualFee: "€1,000",
    },
    registration: {
      nationalRegistryExists: true,
      registryName: "Luxembourg Registry",
      unRegistrationRequired: true,
    },
    euSpaceActCrossRef: {
      relationship: "parallel",
      description: "Parallel to EU Space Act",
    },
    lastUpdated: "2026-01",
  };

  const UK = {
    countryCode: "UK" as const,
    countryName: "United Kingdom",
    flagEmoji: "🇬🇧",
    legislation: {
      name: "Space Industry Act 2018",
      nameLocal: "Space Industry Act 2018",
      yearEnacted: 2018,
      status: "enacted",
    },
    licensingAuthority: {
      name: "UK CAA",
      nameLocal: "Civil Aviation Authority",
      website: "https://www.caa.co.uk",
      contactEmail: "space@caa.co.uk",
    },
    licensingRequirements: [],
    applicabilityRules: [],
    insuranceLiability: {
      mandatoryInsurance: true,
      minimumCoverage: "£60,000,000",
      governmentIndemnification: true,
      indemnificationCap: "Above £60M",
      liabilityRegime: "capped" as const,
      liabilityCap: "£60M",
      thirdPartyRequired: true,
    },
    debrisMitigation: {
      deorbitRequirement: true,
      deorbitTimeline: "25 years",
      passivationRequired: true,
      debrisMitigationPlan: true,
      collisionAvoidance: true,
      standards: ["ISO 24113"],
    },
    dataSensing: {
      remoteSensingLicense: true,
      dataDistributionRestrictions: true,
    },
    timeline: {
      typicalProcessingWeeks: { min: 16, max: 26 },
      applicationFee: "£50,000",
      annualFee: "£3,000",
    },
    registration: {
      nationalRegistryExists: true,
      registryName: "UK Space Registry",
      unRegistrationRequired: true,
    },
    euSpaceActCrossRef: {
      relationship: "parallel",
      description: "Independent post-Brexit",
    },
    lastUpdated: "2026-01",
  };

  return {
    JURISDICTION_DATA: new Map<SpaceLawCountryCode, JurisdictionLaw>([
      ["FR", FR as unknown as JurisdictionLaw],
      ["LU", LU as unknown as JurisdictionLaw],
      ["UK", UK as unknown as JurisdictionLaw],
    ]),
  };
});

// ── Mock space-law-engine.server ──
vi.mock("@/lib/space-law-engine.server", () => ({
  calculateSpaceLawCompliance: vi.fn().mockResolvedValue({
    jurisdictions: [
      {
        countryCode: "FR",
        countryName: "France",
        flagEmoji: "🇫🇷",
        favorabilityScore: 78,
        favorabilityFactors: ["Government indemnification available"],
        isApplicable: true,
        applicabilityReason: "Authorization required",
        totalRequirements: 6,
        mandatoryRequirements: 5,
        applicableRequirements: [],
        authority: {
          name: "CNES",
          website: "https://cnes.fr",
          contactEmail: "contact@cnes.fr",
        },
        estimatedTimeline: { min: 12, max: 26 },
        estimatedCost: "€10,000",
        insurance: {
          mandatory: true,
          minimumCoverage: "€60,000,000",
          governmentIndemnification: true,
        },
        debris: {
          deorbitRequired: true,
          deorbitTimeline: "25 years",
          mitigationPlan: true,
        },
        legislation: { name: "LOS", status: "enacted", yearEnacted: 2008 },
      },
      {
        countryCode: "LU",
        countryName: "Luxembourg",
        flagEmoji: "🇱🇺",
        favorabilityScore: 72,
        favorabilityFactors: ["Fast licensing timeline"],
        isApplicable: true,
        applicabilityReason: "Authorization required",
        totalRequirements: 4,
        mandatoryRequirements: 3,
        applicableRequirements: [],
        authority: {
          name: "LSA",
          website: "https://space-agency.lu",
          contactEmail: "info@space-agency.lu",
        },
        estimatedTimeline: { min: 4, max: 10 },
        estimatedCost: "€5,000",
        insurance: {
          mandatory: true,
          minimumCoverage: "€10,000,000",
          governmentIndemnification: false,
        },
        debris: {
          deorbitRequired: true,
          deorbitTimeline: "Best practices",
          mitigationPlan: true,
        },
        legislation: {
          name: "Space Activities Act",
          status: "enacted",
          yearEnacted: 2020,
        },
      },
      {
        countryCode: "UK",
        countryName: "United Kingdom",
        flagEmoji: "🇬🇧",
        favorabilityScore: 70,
        favorabilityFactors: ["Government indemnification available"],
        isApplicable: true,
        applicabilityReason: "Authorization required",
        totalRequirements: 7,
        mandatoryRequirements: 6,
        applicableRequirements: [],
        authority: {
          name: "UK CAA",
          website: "https://www.caa.co.uk",
          contactEmail: "space@caa.co.uk",
        },
        estimatedTimeline: { min: 16, max: 26 },
        estimatedCost: "£50,000",
        insurance: {
          mandatory: true,
          minimumCoverage: "£60,000,000",
          governmentIndemnification: true,
        },
        debris: {
          deorbitRequired: true,
          deorbitTimeline: "25 years",
          mitigationPlan: true,
        },
        legislation: { name: "SIA 2018", status: "enacted", yearEnacted: 2018 },
      },
    ],
    comparisonMatrix: { criteria: [] },
    euSpaceActPreview: { overallRelationship: "", jurisdictionNotes: {} },
    recommendations: [],
  }),
}));

// ── Dynamically import implementation after mocks ──
let runOptimization: (input: OptimizationInput) => Promise<OptimizationOutput>;

beforeEach(async () => {
  const mod = await import("./regulatory-optimizer.server");
  runOptimization = mod.runOptimization;
});

// ── Helper: default input ──
function makeInput(
  overrides: Partial<OptimizationInput> = {},
): OptimizationInput {
  return {
    activityType: "spacecraft_operation",
    entityNationality: "domestic",
    entitySize: "small",
    primaryOrbit: "LEO",
    constellationSize: 1,
    missionDurationYears: 5,
    hasDesignForDemise: false,
    weightProfile: "balanced",
    ...overrides,
  };
}

describe("runOptimization", () => {
  it("returns rankings sorted by total score descending", async () => {
    const result = await runOptimization(makeInput());
    expect(result.rankings.length).toBe(3);
    for (let i = 1; i < result.rankings.length; i++) {
      expect(result.rankings[i - 1].totalScore).toBeGreaterThanOrEqual(
        result.rankings[i].totalScore,
      );
    }
  });

  it("includes all 6 dimension scores in range 0-100", async () => {
    const result = await runOptimization(makeInput());
    const dims = [
      "timeline",
      "cost",
      "compliance",
      "insurance",
      "liability",
      "debris",
    ] as const;
    for (const r of result.rankings) {
      for (const d of dims) {
        expect(r.dimensionScores[d]).toBeGreaterThanOrEqual(0);
        expect(r.dimensionScores[d]).toBeLessThanOrEqual(100);
      }
    }
  });

  it("assigns BEST_OVERALL badge to first-ranked jurisdiction", async () => {
    const result = await runOptimization(makeInput());
    expect(result.rankings[0].badges).toContain("BEST_OVERALL");
    // other jurisdictions should not have BEST_OVERALL
    for (let i = 1; i < result.rankings.length; i++) {
      expect(result.rankings[i].badges).not.toContain("BEST_OVERALL");
    }
  });

  it("assigns FASTEST badge to LU (lowest min processing weeks = 4)", async () => {
    const result = await runOptimization(makeInput());
    const lu = result.rankings.find((r) => r.jurisdiction === "LU");
    expect(lu).toBeDefined();
    expect(lu!.badges).toContain("FASTEST");
  });

  it("assigns CHEAPEST badge to LU (lowest application fee = €5,000)", async () => {
    const result = await runOptimization(makeInput());
    const lu = result.rankings.find((r) => r.jurisdiction === "LU");
    expect(lu).toBeDefined();
    expect(lu!.badges).toContain("CHEAPEST");
  });

  it("summary has all 4 fields populated", async () => {
    const result = await runOptimization(makeInput());
    expect(result.summary.bestOverall).toBeTruthy();
    expect(result.summary.bestForTimeline).toBeTruthy();
    expect(result.summary.bestForCost).toBeTruthy();
    expect(result.summary.bestForCompliance).toBeTruthy();
  });

  it("trade-off data has correct number of points with valid ranges", async () => {
    const result = await runOptimization(makeInput());
    expect(result.tradeOffData.length).toBe(3);
    for (const pt of result.tradeOffData) {
      expect(pt.x).toBeGreaterThanOrEqual(0);
      expect(pt.x).toBeLessThanOrEqual(1);
      expect(pt.y).toBeGreaterThanOrEqual(0);
      expect(pt.y).toBeLessThanOrEqual(100);
      expect(pt.size).toBeGreaterThan(0);
    }
  });

  it("with startup weight profile LU should rank first (fastest + cheapest)", async () => {
    const result = await runOptimization(
      makeInput({ weightProfile: "startup" }),
    );
    expect(result.rankings[0].jurisdiction).toBe("LU");
  });

  it("key advantages include 'indemnification' for FR", async () => {
    const result = await runOptimization(makeInput());
    const fr = result.rankings.find((r) => r.jurisdiction === "FR");
    expect(fr).toBeDefined();
    const hasIndemnification = fr!.keyAdvantages.some((a) =>
      a.toLowerCase().includes("indemnification"),
    );
    expect(hasIndemnification).toBe(true);
  });

  it("generates migration path when currentJurisdiction provided", async () => {
    const result = await runOptimization(
      makeInput({ currentJurisdiction: "UK" }),
    );
    expect(result.migrationPath).toBeDefined();
    expect(result.migrationPath!.length).toBe(5);
    expect(result.migrationPath![0].order).toBe(1);
    expect(result.migrationPath![4].order).toBe(5);
  });

  it("does not generate migration path when no currentJurisdiction", async () => {
    const result = await runOptimization(makeInput());
    expect(result.migrationPath).toBeUndefined();
  });

  it("includes timeline and cost estimates per jurisdiction", async () => {
    const result = await runOptimization(makeInput());
    for (const r of result.rankings) {
      expect(r.timeline.min).toBeGreaterThan(0);
      expect(r.timeline.max).toBeGreaterThanOrEqual(r.timeline.min);
      expect(r.estimatedCost.application).toBeTruthy();
      expect(r.estimatedCost.annual).toBeTruthy();
    }
  });
});
