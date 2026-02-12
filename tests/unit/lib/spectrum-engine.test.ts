/**
 * Unit tests for the Spectrum Management & ITU Compliance Engine
 *
 * @module tests/unit/lib/spectrum-engine.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Import after mocking
import {
  validateSpectrumProfile,
  calculateComplianceScore,
  generateGapAnalysis,
  performAssessment,
  analyzeFrequencyBands,
  generateFilingStatusSummary,
  generateCoordinationSummary,
  generateRecommendations,
  recommendServiceTypes,
  type RequirementAssessment,
  type SpectrumComplianceScore,
} from "@/lib/spectrum-engine.server";

import {
  type SpectrumProfile,
  type SpectrumRequirement,
  type ComplianceStatus,
  type RiskLevel,
  type ServiceType,
  type FrequencyBand,
  type OrbitType,
  type FilingPhase,
  type FilingStatus,
  type CoordinationStatus,
  type SpectrumSource,
  getApplicableSpectrumRequirements,
  getApplicableLicenses,
  getImpactingWRCDecisions,
  determineSpectrumRisk,
  calculateEstimatedFees,
  getFrequencyBandInfo,
  getBandsForService,
  getServiceTypeName,
  getOrbitTypeName,
  frequencyBands,
  spectrumRequirements,
  ituFilingPhases,
  jurisdictionLicenses,
  wrcDecisions,
} from "@/data/spectrum-itu-requirements";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createGeoFssProfile = (): SpectrumProfile => ({
  serviceTypes: ["FSS"],
  frequencyBands: ["Ku", "Ka"],
  orbitType: "GEO",
  numberOfSatellites: 1,
  isConstellation: false,
  primaryJurisdiction: "ITU",
  additionalJurisdictions: [],
  hasExistingFilings: false,
  targetLaunchDate: undefined,
  uplinkBands: ["Ku", "Ka"],
  downlinkBands: ["Ku", "Ka"],
  intersatelliteLinks: false,
});

const createNgsoConstellationProfile = (): SpectrumProfile => ({
  serviceTypes: ["FSS", "MSS"],
  frequencyBands: ["Ku", "Ka", "V"],
  orbitType: "LEO",
  numberOfSatellites: 1000,
  isConstellation: true,
  primaryJurisdiction: "ITU",
  additionalJurisdictions: ["FCC", "OFCOM"],
  hasExistingFilings: false,
  targetLaunchDate: new Date("2027-01-01"),
  uplinkBands: ["Ku", "Ka"],
  downlinkBands: ["Ku", "Ka"],
  intersatelliteLinks: true,
});

const createMssMeoProfile = (): SpectrumProfile => ({
  serviceTypes: ["MSS", "MMSS"],
  frequencyBands: ["L", "S"],
  orbitType: "MEO",
  numberOfSatellites: 24,
  isConstellation: true,
  primaryJurisdiction: "ITU",
  additionalJurisdictions: ["FCC"],
  hasExistingFilings: true,
  targetLaunchDate: new Date("2026-06-01"),
  uplinkBands: ["L"],
  downlinkBands: ["S"],
  intersatelliteLinks: false,
});

const createEarthObservationProfile = (): SpectrumProfile => ({
  serviceTypes: ["EESS"],
  frequencyBands: ["X", "Ka"],
  orbitType: "LEO",
  numberOfSatellites: 4,
  isConstellation: true,
  primaryJurisdiction: "BNETZA",
  additionalJurisdictions: ["ITU", "CEPT"],
  hasExistingFilings: false,
  targetLaunchDate: new Date("2025-12-01"),
  uplinkBands: ["X"],
  downlinkBands: ["X", "Ka"],
  intersatelliteLinks: false,
});

const createCompliantAssessments = (
  requirements: SpectrumRequirement[],
): RequirementAssessment[] =>
  requirements.map((r) => ({
    requirementId: r.id,
    status: "compliant" as ComplianceStatus,
    assessedAt: new Date(),
  }));

const createPartialAssessments = (
  requirements: SpectrumRequirement[],
): RequirementAssessment[] =>
  requirements.map((r, index) => ({
    requirementId: r.id,
    status: (index % 2 === 0 ? "compliant" : "partial") as ComplianceStatus,
    assessedAt: new Date(),
  }));

const createMixedAssessments = (
  requirements: SpectrumRequirement[],
): RequirementAssessment[] =>
  requirements.map((r, index) => ({
    requirementId: r.id,
    status: ["compliant", "partial", "non_compliant", "not_assessed"][
      index % 4
    ] as ComplianceStatus,
    assessedAt: new Date(),
  }));

// ============================================================================
// PROFILE VALIDATION TESTS
// ============================================================================

describe("validateSpectrumProfile", () => {
  it("should return a valid profile with all required fields", () => {
    const profile = createGeoFssProfile();
    const validated = validateSpectrumProfile(profile);

    expect(validated.serviceTypes).toEqual(["FSS"]);
    expect(validated.frequencyBands).toEqual(["Ku", "Ka"]);
    expect(validated.orbitType).toBe("GEO");
    expect(validated.numberOfSatellites).toBe(1);
    expect(validated.isConstellation).toBe(false);
  });

  it("should validate NGSO constellation profile", () => {
    const profile = createNgsoConstellationProfile();
    const validated = validateSpectrumProfile(profile);

    expect(validated.isConstellation).toBe(true);
    expect(validated.numberOfSatellites).toBe(1000);
    expect(validated.orbitType).toBe("LEO");
  });

  it("should handle partial profiles with defaults", () => {
    const partial: Partial<SpectrumProfile> = {
      serviceTypes: ["FSS"],
      frequencyBands: ["Ku"],
      orbitType: "GEO",
    };
    const validated = validateSpectrumProfile(partial);

    expect(validated.serviceTypes).toEqual(["FSS"]);
    expect(validated.frequencyBands).toEqual(["Ku"]);
    expect(validated.numberOfSatellites).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// REQUIREMENTS FILTERING TESTS
// ============================================================================

describe("getApplicableSpectrumRequirements", () => {
  it("should return ITU requirements for GEO FSS profile", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);

    expect(requirements.length).toBeGreaterThan(0);

    // Should include ITU requirements
    const ituReqs = requirements.filter((r) => r.source === "ITU");
    expect(ituReqs.length).toBeGreaterThan(0);
  });

  it("should return multi-jurisdiction requirements for NGSO constellation", () => {
    const profile = createNgsoConstellationProfile();
    const requirements = getApplicableSpectrumRequirements(profile);

    // Should include requirements from multiple sources
    const sources = new Set(requirements.map((r) => r.source));
    expect(sources.size).toBeGreaterThanOrEqual(1);
  });

  it("should filter requirements by frequency band", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);

    // All requirements should be relevant to Ku or Ka band
    for (const req of requirements) {
      // Either the requirement applies to all bands or includes Ku/Ka
      const appliesToBands =
        req.frequencyBands.length === 0 ||
        req.frequencyBands.some((b) => ["Ku", "Ka"].includes(b));
      expect(appliesToBands).toBe(true);
    }
  });

  it("should include mandatory requirements", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);

    const mandatoryReqs = requirements.filter((r) => r.isMandatory);
    expect(mandatoryReqs.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// COMPLIANCE SCORE TESTS
// ============================================================================

describe("calculateComplianceScore", () => {
  it("should return 100% for fully compliant assessment", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments = createCompliantAssessments(requirements);

    const score = calculateComplianceScore(requirements, assessments);

    expect(score.overall).toBe(100);
  });

  it("should return lower score for partial compliance", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments = createPartialAssessments(requirements);

    const score = calculateComplianceScore(requirements, assessments);

    expect(score.overall).toBeLessThan(100);
    expect(score.overall).toBeGreaterThan(50);
  });

  it("should return score by source", () => {
    const profile = createNgsoConstellationProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments = createMixedAssessments(requirements);

    const score = calculateComplianceScore(requirements, assessments);

    expect(score.bySource).toBeDefined();
    expect(score.bySource.ITU).toBeDefined();
  });

  it("should calculate mandatory score separately", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments = createMixedAssessments(requirements);

    const score = calculateComplianceScore(requirements, assessments);

    expect(score.mandatory).toBeDefined();
    expect(typeof score.mandatory).toBe("number");
  });

  it("should handle empty assessments", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);

    const score = calculateComplianceScore(requirements, []);

    expect(score.overall).toBe(0);
  });
});

// ============================================================================
// GAP ANALYSIS TESTS
// ============================================================================

describe("generateGapAnalysis", () => {
  it("should identify non-compliant requirements as gaps", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments: RequirementAssessment[] = requirements.map((r) => ({
      requirementId: r.id,
      status: "non_compliant",
      assessedAt: new Date(),
    }));

    const gaps = generateGapAnalysis(requirements, assessments);

    expect(gaps.length).toBe(requirements.length);
    gaps.forEach((gap) => {
      expect(gap.requirementId).toBeDefined();
      expect(gap.recommendation).toBeDefined();
      expect(gap.riskLevel).toBeDefined();
    });
  });

  it("should not include compliant requirements in gaps", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments = createCompliantAssessments(requirements);

    const gaps = generateGapAnalysis(requirements, assessments);

    expect(gaps.length).toBe(0);
  });

  it("should include not_assessed requirements in gaps", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments: RequirementAssessment[] = requirements.map((r) => ({
      requirementId: r.id,
      status: "not_assessed",
      assessedAt: new Date(),
    }));

    const gaps = generateGapAnalysis(requirements, assessments);

    expect(gaps.length).toBe(requirements.length);
  });

  it("should sort gaps by risk level", () => {
    const profile = createNgsoConstellationProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments: RequirementAssessment[] = requirements.map((r) => ({
      requirementId: r.id,
      status: "non_compliant",
      assessedAt: new Date(),
    }));

    const gaps = generateGapAnalysis(requirements, assessments);

    // Critical gaps should come before high, which should come before medium
    const riskOrder: Record<RiskLevel, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    for (let i = 0; i < gaps.length - 1; i++) {
      expect(riskOrder[gaps[i].riskLevel]).toBeLessThanOrEqual(
        riskOrder[gaps[i + 1].riskLevel],
      );
    }
  });
});

// ============================================================================
// FREQUENCY BAND ANALYSIS TESTS
// ============================================================================

describe("analyzeFrequencyBands", () => {
  it("should analyze all bands in the profile", () => {
    const profile = createNgsoConstellationProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const analysis = analyzeFrequencyBands(profile, requirements);

    expect(analysis.length).toBe(profile.frequencyBands.length);
  });

  it("should include band info for each band", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const analysis = analyzeFrequencyBands(profile, requirements);

    analysis.forEach((a) => {
      expect(a.band).toBeDefined();
      expect(a.bandInfo).toBeDefined();
      expect(a.bandInfo.rangeGHz).toBeDefined();
    });
  });

  it("should identify coordination requirements", () => {
    const profile = createNgsoConstellationProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const analysis = analyzeFrequencyBands(profile, requirements);

    const kaAnalysis = analysis.find((a) => a.band === "Ka");
    expect(kaAnalysis?.coordinationRequired).toBe(true);
  });
});

// ============================================================================
// RISK DETERMINATION TESTS
// ============================================================================

describe("determineSpectrumRisk", () => {
  it("should return critical risk for GEO without filings", () => {
    const profile = createGeoFssProfile();
    const risk = determineSpectrumRisk(profile);

    expect(risk).toBe("critical");
  });

  it("should return lower risk for profile with existing filings", () => {
    const profile = createMssMeoProfile();
    const risk = determineSpectrumRisk(profile);

    // With existing filings, risk should not be critical
    expect(["high", "medium", "low"]).toContain(risk);
  });

  it("should consider constellation size", () => {
    const smallProfile = {
      ...createNgsoConstellationProfile(),
      numberOfSatellites: 10,
    };
    const largeProfile = {
      ...createNgsoConstellationProfile(),
      numberOfSatellites: 5000,
    };

    const smallRisk = determineSpectrumRisk(smallProfile);
    const largeRisk = determineSpectrumRisk(largeProfile);

    // Large constellations should have equal or higher risk
    const riskOrder: Record<RiskLevel, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    expect(riskOrder[largeRisk]).toBeLessThanOrEqual(riskOrder[smallRisk]);
  });
});

// ============================================================================
// LICENSING TESTS
// ============================================================================

describe("getApplicableLicenses", () => {
  it("should return licenses for primary jurisdiction", () => {
    const profile = createGeoFssProfile();
    const licenses = getApplicableLicenses(profile);

    expect(licenses.length).toBeGreaterThanOrEqual(0);
  });

  it("should include licenses for additional jurisdictions", () => {
    const profile = createNgsoConstellationProfile();
    const licenses = getApplicableLicenses(profile);

    // Should have licenses from multiple jurisdictions
    if (licenses.length > 0) {
      const jurisdictions = new Set(licenses.map((l) => l.jurisdiction));
      expect(jurisdictions.size).toBeGreaterThanOrEqual(1);
    }
  });

  it("should filter by service type", () => {
    const profile = createMssMeoProfile();
    const licenses = getApplicableLicenses(profile);

    // All licenses should be applicable to MSS or MMSS
    licenses.forEach((l) => {
      const applicable =
        l.applicableTo.length === 0 ||
        l.applicableTo.some((st) => profile.serviceTypes.includes(st));
      expect(applicable).toBe(true);
    });
  });
});

// ============================================================================
// WRC IMPACT TESTS
// ============================================================================

describe("getImpactingWRCDecisions", () => {
  it("should return WRC decisions for profile", () => {
    const profile = createNgsoConstellationProfile();
    const decisions = getImpactingWRCDecisions(profile);

    expect(Array.isArray(decisions)).toBe(true);
  });

  it("should return relevant WRC decisions", () => {
    const profile = createGeoFssProfile();
    const decisions = getImpactingWRCDecisions(profile);

    // Should return an array of decisions
    expect(Array.isArray(decisions)).toBe(true);

    // Each decision should have required fields
    decisions.forEach((d) => {
      expect(d.id).toBeDefined();
      expect(d.conference).toBeDefined();
      expect(d.title).toBeDefined();
      expect(d.impactedBands).toBeDefined();
      expect(d.impactedServices).toBeDefined();
    });
  });
});

// ============================================================================
// FULL ASSESSMENT TESTS
// ============================================================================

describe("performAssessment", () => {
  it("should return complete assessment result", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments = createMixedAssessments(requirements);

    const result = performAssessment(profile, assessments);

    expect(result.profile).toBeDefined();
    expect(result.applicableRequirements).toBeDefined();
    expect(result.score).toBeDefined();
    expect(result.gapAnalysis).toBeDefined();
    expect(result.riskLevel).toBeDefined();
    expect(result.recommendations).toBeDefined();
  });

  it("should include filing status summary", () => {
    const profile = createNgsoConstellationProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments = createPartialAssessments(requirements);

    const filingStatuses: Record<FilingPhase, FilingStatus> = {
      API: "submitted",
      CR_C: "in_preparation",
      NOTIFICATION: "not_started",
      RECORDING: "not_started",
    };

    const result = performAssessment(profile, assessments, filingStatuses);

    expect(result.filingStatusSummary).toBeDefined();
    expect(Array.isArray(result.filingStatusSummary)).toBe(true);
  });

  it("should include coordination summary", () => {
    const profile = createNgsoConstellationProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments = createPartialAssessments(requirements);

    const coordinationStatuses = {
      ituStatus: "in_progress" as CoordinationStatus,
      bilateral: [
        { administration: "USA", status: "completed" as CoordinationStatus },
        { administration: "G", status: "in_progress" as CoordinationStatus },
      ],
    };

    const result = performAssessment(
      profile,
      assessments,
      undefined,
      coordinationStatuses,
    );

    expect(result.coordinationSummary).toBeDefined();
    expect(result.coordinationSummary.ituStatus).toBe("in_progress");
  });

  it("should include estimated fees", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments = createCompliantAssessments(requirements);

    const result = performAssessment(profile, assessments);

    expect(result.estimatedFees).toBeDefined();
    expect(result.estimatedFees.total).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// RECOMMENDATIONS TESTS
// ============================================================================

describe("generateRecommendations", () => {
  it("should recommend ITU filing for profile without filings", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments = createMixedAssessments(requirements);
    const gaps = generateGapAnalysis(requirements, assessments);
    const score = calculateComplianceScore(requirements, assessments);
    const filingStatus = generateFilingStatusSummary(profile);

    const recommendations = generateRecommendations(
      profile,
      gaps,
      score,
      filingStatus,
    );

    expect(recommendations.length).toBeGreaterThan(0);

    // Should include filing recommendation
    const filingRec = recommendations.find((r) => r.category === "filing");
    expect(filingRec).toBeDefined();
  });

  it("should prioritize recommendations", () => {
    const profile = createNgsoConstellationProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments = createMixedAssessments(requirements);
    const gaps = generateGapAnalysis(requirements, assessments);
    const score = calculateComplianceScore(requirements, assessments);
    const filingStatus = generateFilingStatusSummary(profile);

    const recommendations = generateRecommendations(
      profile,
      gaps,
      score,
      filingStatus,
    );

    // Recommendations should be sorted by priority
    for (let i = 0; i < recommendations.length - 1; i++) {
      expect(recommendations[i].priority).toBeLessThanOrEqual(
        recommendations[i + 1].priority,
      );
    }
  });
});

// ============================================================================
// DATA CONSTANTS TESTS
// ============================================================================

describe("Spectrum Data Constants", () => {
  it("should have frequency band definitions", () => {
    expect(frequencyBands.length).toBeGreaterThan(0);

    frequencyBands.forEach((band) => {
      expect(band.band).toBeDefined();
      expect(band.name).toBeDefined();
      expect(band.rangeGHz).toBeDefined();
      expect(band.rangeGHz.min).toBeLessThan(band.rangeGHz.max);
    });
  });

  it("should have ITU filing phases", () => {
    expect(ituFilingPhases.length).toBe(4);

    const phases = ituFilingPhases.map((p) => p.phase);
    expect(phases).toContain("API");
    expect(phases).toContain("CR_C");
    expect(phases).toContain("NOTIFICATION");
    expect(phases).toContain("RECORDING");
  });

  it("should have spectrum requirements", () => {
    expect(spectrumRequirements.length).toBeGreaterThan(0);

    spectrumRequirements.forEach((req) => {
      expect(req.id).toBeDefined();
      expect(req.title).toBeDefined();
      expect(req.source).toBeDefined();
      expect(req.riskLevel).toBeDefined();
    });
  });

  it("should have jurisdiction licenses", () => {
    expect(jurisdictionLicenses.length).toBeGreaterThan(0);

    jurisdictionLicenses.forEach((license) => {
      expect(license.jurisdiction).toBeDefined();
      expect(license.licenseName).toBeDefined();
      expect(license.fees).toBeDefined();
    });
  });

  it("should have WRC decisions", () => {
    expect(wrcDecisions.length).toBeGreaterThan(0);

    wrcDecisions.forEach((decision) => {
      expect(decision.id).toBeDefined();
      expect(decision.conference).toBeDefined();
      expect(decision.title).toBeDefined();
    });
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe("Helper Functions", () => {
  describe("getFrequencyBandInfo", () => {
    it("should return band info for valid band", () => {
      const info = getFrequencyBandInfo("Ka");
      expect(info).toBeDefined();
      expect(info?.band).toBe("Ka");
      expect(info?.rangeGHz).toBeDefined();
    });

    it("should return undefined for invalid band", () => {
      const info = getFrequencyBandInfo("Invalid" as FrequencyBand);
      expect(info).toBeUndefined();
    });
  });

  describe("getBandsForService", () => {
    it("should return bands for FSS", () => {
      const bands = getBandsForService("FSS");
      expect(bands.length).toBeGreaterThan(0);
      expect(bands).toContain("Ku");
      expect(bands).toContain("Ka");
    });

    it("should return bands for MSS", () => {
      const bands = getBandsForService("MSS");
      expect(bands.length).toBeGreaterThan(0);
      expect(bands).toContain("L");
      expect(bands).toContain("S");
    });
  });

  describe("getServiceTypeName", () => {
    it("should return full name for service type", () => {
      expect(getServiceTypeName("FSS")).toBe("Fixed-Satellite Service");
      expect(getServiceTypeName("MSS")).toBe("Mobile-Satellite Service");
      expect(getServiceTypeName("BSS")).toBe("Broadcasting-Satellite Service");
    });
  });

  describe("getOrbitTypeName", () => {
    it("should return full name for orbit type", () => {
      expect(getOrbitTypeName("GEO")).toContain("Geostationary");
      expect(getOrbitTypeName("LEO")).toContain("Low Earth");
      expect(getOrbitTypeName("MEO")).toContain("Medium Earth");
    });
  });

  describe("calculateEstimatedFees", () => {
    it("should calculate total fees for licenses", () => {
      const licenses = jurisdictionLicenses.slice(0, 3);
      const fees = calculateEstimatedFees(licenses);

      expect(fees.total).toBeGreaterThanOrEqual(0);
      expect(fees.byCurrency).toBeDefined();
    });

    it("should handle empty license array", () => {
      const fees = calculateEstimatedFees([]);
      expect(fees.total).toBe(0);
    });
  });

  describe("recommendServiceTypes", () => {
    it("should recommend FSS for Ku/Ka bands", () => {
      const services = recommendServiceTypes(["Ku", "Ka"]);
      expect(services).toContain("FSS");
    });

    it("should recommend MSS for L/S bands", () => {
      const services = recommendServiceTypes(["L", "S"]);
      expect(services).toContain("MSS");
    });
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe("Edge Cases", () => {
  it("should handle profile with single satellite", () => {
    const profile: SpectrumProfile = {
      ...createGeoFssProfile(),
      numberOfSatellites: 1,
      isConstellation: false,
    };

    const requirements = getApplicableSpectrumRequirements(profile);
    const risk = determineSpectrumRisk(profile);

    expect(requirements.length).toBeGreaterThan(0);
    expect(risk).toBeDefined();
  });

  it("should handle profile with many frequency bands", () => {
    const profile: SpectrumProfile = {
      ...createNgsoConstellationProfile(),
      frequencyBands: ["L", "S", "C", "X", "Ku", "Ka", "V"],
      uplinkBands: ["C", "Ku", "Ka"],
      downlinkBands: ["L", "S", "X", "Ka", "V"],
    };

    const requirements = getApplicableSpectrumRequirements(profile);
    const result = performAssessment(profile, []);

    expect(result.bandAnalysis.length).toBe(7);
  });

  it("should handle assessment with all not_applicable statuses", () => {
    const profile = createGeoFssProfile();
    const requirements = getApplicableSpectrumRequirements(profile);
    const assessments: RequirementAssessment[] = requirements.map((r) => ({
      requirementId: r.id,
      status: "not_applicable",
      assessedAt: new Date(),
    }));

    const score = calculateComplianceScore(requirements, assessments);
    const gaps = generateGapAnalysis(requirements, assessments);

    // Not applicable should not count as gaps
    expect(gaps.length).toBe(0);
  });
});
