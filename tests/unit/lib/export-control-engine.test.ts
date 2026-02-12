/**
 * Unit tests for the ITAR/EAR Export Control Compliance Engine
 *
 * @module tests/unit/lib/export-control-engine.test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Import after mocking
import {
  validateExportControlProfile,
  calculateComplianceScore,
  generateGapAnalysis,
  performAssessment,
  assessDeemedExportRisks,
  assessScreeningRequirements,
  assessTCPRequirements,
  generateDocumentationChecklist,
  assessPenaltyExposure,
  analyzeLicenseExceptions,
  generateRecommendations,
  type RequirementAssessment,
} from "@/lib/export-control-engine.server";

import {
  type ExportControlProfile,
  type ExportControlRequirement,
  type ComplianceStatus,
  type RiskLevel,
  getApplicableExportControlRequirements,
  getRequiredRegistrations,
  getRequiredLicenseTypes,
  determineOverallRisk,
  determineJurisdiction,
  calculateMaxPenaltyExposure,
  getApplicableDeemedExportRules,
  getRequiredScreeningLists,
  formatPenalty,
} from "@/data/itar-ear-requirements";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createItarProfile = (): ExportControlProfile => ({
  companyType: ["spacecraft_manufacturer"],
  hasITARItems: true,
  hasEARItems: false,
  hasForeignNationals: false,
  foreignNationalCountries: [],
  exportsToCountries: [],
  hasTechnologyTransfer: false,
  hasDefenseContracts: false,
  hasManufacturingAbroad: false,
  hasJointVentures: false,
  registeredWithDDTC: true,
  hasTCP: false,
  hasECL: false,
});

const createEarProfile = (): ExportControlProfile => ({
  companyType: ["satellite_operator"],
  hasITARItems: false,
  hasEARItems: true,
  hasForeignNationals: false,
  foreignNationalCountries: [],
  exportsToCountries: [],
  hasTechnologyTransfer: false,
  hasDefenseContracts: false,
  hasManufacturingAbroad: false,
  hasJointVentures: false,
  registeredWithDDTC: false,
  hasTCP: false,
  hasECL: false,
});

const createDualUseProfile = (): ExportControlProfile => ({
  companyType: ["spacecraft_manufacturer", "satellite_operator"],
  hasITARItems: true,
  hasEARItems: true,
  hasForeignNationals: true,
  foreignNationalCountries: ["CN", "RU"],
  exportsToCountries: ["DE", "FR", "JP"],
  hasTechnologyTransfer: true,
  hasDefenseContracts: true,
  hasManufacturingAbroad: false,
  hasJointVentures: true,
  annualExportValue: 50000000,
  registeredWithDDTC: true,
  hasTCP: true,
  hasECL: true,
});

const createHighRiskProfile = (): ExportControlProfile => ({
  companyType: ["spacecraft_manufacturer", "defense_contractor"],
  hasITARItems: true,
  hasEARItems: true,
  hasForeignNationals: true,
  foreignNationalCountries: ["CN", "IR"],
  exportsToCountries: ["CN", "RU"],
  hasTechnologyTransfer: true,
  hasDefenseContracts: true,
  hasManufacturingAbroad: true,
  hasJointVentures: true,
  annualExportValue: 100000000,
  registeredWithDDTC: false, // Not registered - critical risk
  hasTCP: false, // No TCP with foreign nationals - critical risk
  hasECL: false,
});

const createMockAssessments = (
  requirements: ExportControlRequirement[],
  statusOverrides?: Record<string, ComplianceStatus>,
): RequirementAssessment[] => {
  return requirements.map((req) => ({
    requirementId: req.id,
    status: statusOverrides?.[req.id] || "not_assessed",
    assessedAt: new Date(),
  }));
};

// ============================================================================
// PROFILE VALIDATION TESTS
// ============================================================================

describe("validateExportControlProfile", () => {
  it("should validate a valid ITAR profile", () => {
    const profile = createItarProfile();
    const validated = validateExportControlProfile(profile);

    expect(validated.companyType).toEqual(["spacecraft_manufacturer"]);
    expect(validated.hasITARItems).toBe(true);
    expect(validated.hasEARItems).toBe(false);
    expect(validated.registeredWithDDTC).toBe(true);
  });

  it("should validate a valid EAR profile", () => {
    const profile = createEarProfile();
    const validated = validateExportControlProfile(profile);

    expect(validated.companyType).toEqual(["satellite_operator"]);
    expect(validated.hasITARItems).toBe(false);
    expect(validated.hasEARItems).toBe(true);
  });

  it("should throw error for missing company type", () => {
    const invalidProfile = {
      companyType: [],
      hasITARItems: true,
      hasEARItems: false,
    } as unknown as ExportControlProfile;

    expect(() => validateExportControlProfile(invalidProfile)).toThrow(
      "At least one company type is required",
    );
  });

  it("should set default values for optional fields", () => {
    const minimalProfile = {
      companyType: ["satellite_operator"],
    } as unknown as ExportControlProfile;

    const validated = validateExportControlProfile(minimalProfile);

    expect(validated.hasITARItems).toBe(false);
    expect(validated.hasEARItems).toBe(false);
    expect(validated.hasForeignNationals).toBe(false);
    expect(validated.registeredWithDDTC).toBe(false);
    expect(validated.hasTCP).toBe(false);
    expect(validated.hasECL).toBe(false);
  });
});

// ============================================================================
// JURISDICTION DETERMINATION TESTS
// ============================================================================

describe("determineJurisdiction", () => {
  it("should return itar_only for military items on USML", () => {
    const result = determineJurisdiction(
      "Military satellite",
      true, // specifically designed for military
      false, // no commercial equivalent
      true, // is on USML
    );
    expect(result).toBe("itar_only");
  });

  it("should return ear_only for commercial items", () => {
    const result = determineJurisdiction(
      "Commercial satellite",
      false, // not specifically designed for military
      true, // has commercial equivalent
      false, // not on USML
    );
    expect(result).toBe("ear_only");
  });

  it("should return dual_use for items with both applications", () => {
    const result = determineJurisdiction(
      "Dual-use component",
      true, // can be used for military
      true, // also has commercial use
      false, // not on USML
    );
    expect(result).toBe("dual_use");
  });
});

// ============================================================================
// REQUIREMENTS FILTERING TESTS
// ============================================================================

describe("getApplicableExportControlRequirements", () => {
  it("should return ITAR requirements for ITAR profile", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    expect(requirements.length).toBeGreaterThan(0);
    expect(requirements.some((r) => r.regulation === "ITAR")).toBe(true);
  });

  it("should return EAR requirements for EAR profile", () => {
    const profile = createEarProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    expect(requirements.length).toBeGreaterThan(0);
    expect(requirements.some((r) => r.regulation === "EAR")).toBe(true);
  });

  it("should return both ITAR and EAR requirements for dual-use profile", () => {
    const profile = createDualUseProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    const hasITAR = requirements.some((r) => r.regulation === "ITAR");
    const hasEAR = requirements.some((r) => r.regulation === "EAR");

    expect(hasITAR).toBe(true);
    expect(hasEAR).toBe(true);
  });

  it("should include screening requirements for all export profiles", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    const hasScreening = requirements.some((r) => r.category === "SCREENING");
    expect(hasScreening).toBe(true);
  });
});

// ============================================================================
// COMPLIANCE SCORE CALCULATION TESTS
// ============================================================================

describe("calculateComplianceScore", () => {
  it("should return 100% for fully compliant assessment", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    const assessments = requirements.map((req) => ({
      requirementId: req.id,
      status: "compliant" as ComplianceStatus,
      assessedAt: new Date(),
    }));

    const score = calculateComplianceScore(requirements, assessments);

    expect(score.overall).toBe(100);
    expect(score.mandatory).toBe(100);
  });

  it("should return 0% for fully non-compliant assessment", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    const assessments = requirements.map((req) => ({
      requirementId: req.id,
      status: "non_compliant" as ComplianceStatus,
      assessedAt: new Date(),
    }));

    const score = calculateComplianceScore(requirements, assessments);

    expect(score.overall).toBe(0);
  });

  it("should return 50% for partial compliance", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    const assessments = requirements.map((req) => ({
      requirementId: req.id,
      status: "partial" as ComplianceStatus,
      assessedAt: new Date(),
    }));

    const score = calculateComplianceScore(requirements, assessments);

    expect(score.overall).toBe(50);
  });

  it("should weight critical requirements higher", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    // Make critical requirements non-compliant, others compliant
    const criticalReqs = requirements.filter((r) => r.riskLevel === "critical");
    const otherReqs = requirements.filter((r) => r.riskLevel !== "critical");

    const assessments: RequirementAssessment[] = [
      ...criticalReqs.map((req) => ({
        requirementId: req.id,
        status: "non_compliant" as ComplianceStatus,
        assessedAt: new Date(),
      })),
      ...otherReqs.map((req) => ({
        requirementId: req.id,
        status: "compliant" as ComplianceStatus,
        assessedAt: new Date(),
      })),
    ];

    const score = calculateComplianceScore(requirements, assessments);

    // Score should be lower than if all were equally weighted
    expect(score.overall).toBeLessThan(80);
  });

  it("should calculate scores by regulation", () => {
    const profile = createDualUseProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    const itarReqs = requirements.filter((r) => r.regulation === "ITAR");
    const earReqs = requirements.filter((r) => r.regulation === "EAR");

    // ITAR compliant, EAR non-compliant
    const assessments: RequirementAssessment[] = [
      ...itarReqs.map((req) => ({
        requirementId: req.id,
        status: "compliant" as ComplianceStatus,
        assessedAt: new Date(),
      })),
      ...earReqs.map((req) => ({
        requirementId: req.id,
        status: "non_compliant" as ComplianceStatus,
        assessedAt: new Date(),
      })),
    ];

    const score = calculateComplianceScore(requirements, assessments);

    expect(score.byRegulation.ITAR).toBe(100);
    expect(score.byRegulation.EAR).toBe(0);
  });

  it("should exclude not_applicable from score calculation", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    // Half compliant, half N/A
    const assessments = requirements.map((req, idx) => ({
      requirementId: req.id,
      status: (idx % 2 === 0
        ? "compliant"
        : "not_applicable") as ComplianceStatus,
      assessedAt: new Date(),
    }));

    const score = calculateComplianceScore(requirements, assessments);

    // Should be 100% since N/A are excluded
    expect(score.overall).toBe(100);
  });
});

// ============================================================================
// GAP ANALYSIS TESTS
// ============================================================================

describe("generateGapAnalysis", () => {
  it("should identify gaps for non-compliant requirements", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    const assessments = requirements.map((req) => ({
      requirementId: req.id,
      status: "non_compliant" as ComplianceStatus,
      assessedAt: new Date(),
    }));

    const gaps = generateGapAnalysis(requirements, assessments);

    expect(gaps.length).toBe(requirements.length);
    gaps.forEach((gap) => {
      expect(gap.recommendation).toBeDefined();
      expect(gap.riskLevel).toBeDefined();
    });
  });

  it("should not identify gaps for compliant requirements", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    const assessments = requirements.map((req) => ({
      requirementId: req.id,
      status: "compliant" as ComplianceStatus,
      assessedAt: new Date(),
    }));

    const gaps = generateGapAnalysis(requirements, assessments);

    expect(gaps.length).toBe(0);
  });

  it("should identify gaps for not_assessed requirements", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    const assessments = requirements.map((req) => ({
      requirementId: req.id,
      status: "not_assessed" as ComplianceStatus,
      assessedAt: new Date(),
    }));

    const gaps = generateGapAnalysis(requirements, assessments);

    expect(gaps.length).toBe(requirements.length);
  });

  it("should sort gaps by risk level (critical first)", () => {
    const profile = createDualUseProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    const assessments = requirements.map((req) => ({
      requirementId: req.id,
      status: "non_compliant" as ComplianceStatus,
      assessedAt: new Date(),
    }));

    const gaps = generateGapAnalysis(requirements, assessments);

    // First gaps should be critical or high risk
    const firstGapRiskLevels = gaps.slice(0, 5).map((g) => g.riskLevel);
    const hasCriticalFirst =
      firstGapRiskLevels.includes("critical") ||
      firstGapRiskLevels.includes("high");
    expect(hasCriticalFirst).toBe(true);
  });

  it("should include penalty information in gaps", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    const assessments = requirements.map((req) => ({
      requirementId: req.id,
      status: "non_compliant" as ComplianceStatus,
      assessedAt: new Date(),
    }));

    const gaps = generateGapAnalysis(requirements, assessments);

    const itarGaps = gaps.filter((g) => g.regulation === "ITAR");
    itarGaps.forEach((gap) => {
      expect(gap.potentialPenalty).toContain("$");
    });
  });
});

// ============================================================================
// RISK LEVEL DETERMINATION TESTS
// ============================================================================

describe("determineOverallRisk", () => {
  it("should return critical for unregistered ITAR exporter", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      registeredWithDDTC: false,
    };

    const risk = determineOverallRisk(profile);
    expect(risk).toBe("critical");
  });

  it("should return critical for ITAR with foreign nationals but no TCP", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      hasForeignNationals: true,
      hasTCP: false,
    };

    const risk = determineOverallRisk(profile);
    expect(risk).toBe("critical");
  });

  it("should return high for ITAR with foreign manufacturing", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      hasManufacturingAbroad: true,
    };

    const risk = determineOverallRisk(profile);
    expect(risk).toBe("high");
  });

  it("should return medium for standard ITAR profile", () => {
    const profile = createItarProfile();
    const risk = determineOverallRisk(profile);
    expect(["medium", "high"]).toContain(risk);
  });

  it("should return low for EAR-only profile with no risk factors", () => {
    const profile: ExportControlProfile = {
      companyType: ["component_supplier"],
      hasITARItems: false,
      hasEARItems: false,
      hasForeignNationals: false,
      foreignNationalCountries: [],
      exportsToCountries: [],
      hasTechnologyTransfer: false,
      hasDefenseContracts: false,
      hasManufacturingAbroad: false,
      hasJointVentures: false,
      registeredWithDDTC: false,
      hasTCP: false,
      hasECL: false,
    };

    const risk = determineOverallRisk(profile);
    expect(risk).toBe("low");
  });
});

// ============================================================================
// DEEMED EXPORT ASSESSMENT TESTS
// ============================================================================

describe("assessDeemedExportRisks", () => {
  it("should identify deemed export risks for foreign nationals", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      hasForeignNationals: true,
      foreignNationalCountries: ["CN", "IN"],
    };

    const assessment = assessDeemedExportRisks(profile);

    expect(assessment.hasForeignNationals).toBe(true);
    expect(assessment.foreignNationalCountries).toEqual(["CN", "IN"]);
    expect(assessment.tcpRequired).toBe(true);
    expect(assessment.itarRisks.length).toBeGreaterThan(0);
  });

  it("should not require TCP if no foreign nationals", () => {
    const profile = createItarProfile();

    const assessment = assessDeemedExportRisks(profile);

    expect(assessment.tcpRequired).toBe(false);
    expect(assessment.deemedExportLicensesRequired.length).toBe(0);
  });

  it("should identify restricted country risks", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      hasForeignNationals: true,
      foreignNationalCountries: ["CN", "IR"], // China and Iran - restricted
    };

    const assessment = assessDeemedExportRisks(profile);

    expect(assessment.deemedExportLicensesRequired.length).toBeGreaterThan(0);
    expect(assessment.recommendations.length).toBeGreaterThan(0);
  });

  it("should return empty risks for no foreign nationals", () => {
    const profile = createEarProfile();

    const assessment = assessDeemedExportRisks(profile);

    expect(assessment.itarRisks.length).toBe(0);
  });
});

// ============================================================================
// SCREENING REQUIREMENTS TESTS
// ============================================================================

describe("assessScreeningRequirements", () => {
  it("should require screening for ITAR activities", () => {
    const profile = createItarProfile();

    const assessment = assessScreeningRequirements(profile);

    expect(assessment.requiredLists.length).toBeGreaterThan(0);
    expect(assessment.redFlagProceduresRequired).toBe(true);
  });

  it("should require automated screening for high-value exports", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      annualExportValue: 10000000, // $10M
    };

    const assessment = assessScreeningRequirements(profile);

    expect(assessment.automatedScreeningRequired).toBe(true);
  });

  it("should set appropriate screening frequency based on volume", () => {
    const highVolumeProfile: ExportControlProfile = {
      ...createDualUseProfile(),
      annualExportValue: 50000000, // $50M
    };

    const assessment = assessScreeningRequirements(highVolumeProfile);

    expect(assessment.screeningFrequency).toBe("daily");
  });
});

// ============================================================================
// TCP ASSESSMENT TESTS
// ============================================================================

describe("assessTCPRequirements", () => {
  it("should require TCP for ITAR with foreign nationals", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      hasForeignNationals: true,
    };

    const assessment = assessTCPRequirements(profile);

    expect(assessment.tcpRequired).toBe(true);
    expect(assessment.reasons.length).toBeGreaterThan(0);
    expect(assessment.requiredElements.length).toBeGreaterThan(0);
  });

  it("should require TCP for ITAR with joint ventures", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      hasJointVentures: true,
    };

    const assessment = assessTCPRequirements(profile);

    expect(assessment.tcpRequired).toBe(true);
  });

  it("should set immediate priority for unregistered with foreign nationals", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      hasForeignNationals: true,
      hasTCP: false,
    };

    const assessment = assessTCPRequirements(profile);

    expect(assessment.implementationPriority).toBe("immediate");
  });

  it("should not require TCP for EAR-only without foreign nationals", () => {
    const profile = createEarProfile();

    const assessment = assessTCPRequirements(profile);

    expect(assessment.tcpRequired).toBe(false);
  });
});

// ============================================================================
// LICENSE EXCEPTION ANALYSIS TESTS
// ============================================================================

describe("analyzeLicenseExceptions", () => {
  it("should analyze available exceptions for EAR profile", () => {
    const profile = createEarProfile();

    const exceptions = analyzeLicenseExceptions(profile);

    expect(exceptions.length).toBeGreaterThan(0);
    exceptions.forEach((exc) => {
      expect(exc.exception).toBeDefined();
      expect(exc.eligibilityCriteria.length).toBeGreaterThan(0);
    });
  });

  it("should include TMP exception for EAR items", () => {
    const profile = createEarProfile();

    const exceptions = analyzeLicenseExceptions(profile);

    const tmpException = exceptions.find((e) => e.exception === "TMP");
    expect(tmpException).toBeDefined();
    expect(tmpException?.name).toBe("Temporary Exports");
  });

  it("should include GOV exception for defense contractors", () => {
    const profile: ExportControlProfile = {
      ...createEarProfile(),
      hasDefenseContracts: true,
    };

    const exceptions = analyzeLicenseExceptions(profile);

    const govException = exceptions.find((e) => e.exception === "GOV");
    expect(govException).toBeDefined();
  });
});

// ============================================================================
// DOCUMENTATION CHECKLIST TESTS
// ============================================================================

describe("generateDocumentationChecklist", () => {
  it("should include ITAR documentation for ITAR profile", () => {
    const profile = createItarProfile();

    const checklists = generateDocumentationChecklist(profile);

    const itarChecklist = checklists.find((c) => c.category.includes("ITAR"));
    expect(itarChecklist).toBeDefined();
    expect(itarChecklist?.documents.length).toBeGreaterThan(0);
  });

  it("should include EAR documentation for EAR profile", () => {
    const profile = createEarProfile();

    const checklists = generateDocumentationChecklist(profile);

    const earChecklist = checklists.find((c) => c.category.includes("EAR"));
    expect(earChecklist).toBeDefined();
  });

  it("should include TCP checklist for foreign nationals", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      hasForeignNationals: true,
    };

    const checklists = generateDocumentationChecklist(profile);

    const tcpChecklist = checklists.find((c) =>
      c.category.includes("Technology Control"),
    );
    expect(tcpChecklist).toBeDefined();
    expect(
      tcpChecklist?.documents.some((d) =>
        d.name.includes("Technology Control Plan"),
      ),
    ).toBe(true);
  });

  it("should always include screening documentation", () => {
    const profile = createItarProfile();

    const checklists = generateDocumentationChecklist(profile);

    const screeningChecklist = checklists.find((c) =>
      c.category.includes("Screening"),
    );
    expect(screeningChecklist).toBeDefined();
  });
});

// ============================================================================
// PENALTY ASSESSMENT TESTS
// ============================================================================

describe("assessPenaltyExposure", () => {
  it("should calculate ITAR penalties for ITAR profile", () => {
    const profile = createItarProfile();

    const assessment = assessPenaltyExposure(profile, false, false);

    expect(assessment.maxCivilPerViolation).toBeGreaterThan(1000000); // > $1M
    expect(assessment.maxImprisonmentYears).toBe(20);
  });

  it("should identify mitigating factors for compliance program", () => {
    const profile = createItarProfile();

    const assessment = assessPenaltyExposure(profile, true, false);

    expect(assessment.mitigatingFactors).toContain(
      "Existence of compliance program",
    );
  });

  it("should identify mitigating factors for voluntary disclosure", () => {
    const profile = createItarProfile();

    const assessment = assessPenaltyExposure(profile, false, true);

    expect(
      assessment.mitigatingFactors.some((f) =>
        f.includes("Voluntary disclosure"),
      ),
    ).toBe(true);
  });

  it("should identify aggravating factors for unregistered ITAR", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      registeredWithDDTC: false,
    };

    const assessment = assessPenaltyExposure(profile, false, false);

    expect(
      assessment.aggravatingFactors.some((f) => f.includes("registration")),
    ).toBe(true);
  });
});

// ============================================================================
// FULL ASSESSMENT TESTS
// ============================================================================

describe("performAssessment", () => {
  it("should perform full assessment for ITAR profile", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);
    const assessments = createMockAssessments(requirements);

    const result = performAssessment(profile, assessments);

    expect(result.profile).toBeDefined();
    expect(result.score).toBeDefined();
    expect(result.gapAnalysis).toBeDefined();
    expect(result.recommendations).toBeDefined();
    expect(result.requiredLicenses).toBeDefined();
    expect(result.requiredRegistrations).toBeDefined();
  });

  it("should determine correct jurisdiction", () => {
    const itarProfile = createItarProfile();
    const earProfile = createEarProfile();
    const dualProfile = createDualUseProfile();

    const itarResult = performAssessment(
      itarProfile,
      createMockAssessments(
        getApplicableExportControlRequirements(itarProfile),
      ),
    );
    const earResult = performAssessment(
      earProfile,
      createMockAssessments(getApplicableExportControlRequirements(earProfile)),
    );
    const dualResult = performAssessment(
      dualProfile,
      createMockAssessments(
        getApplicableExportControlRequirements(dualProfile),
      ),
    );

    expect(itarResult.jurisdictionDetermination).toBe("itar_only");
    expect(earResult.jurisdictionDetermination).toBe("ear_only");
    expect(dualResult.jurisdictionDetermination).toBe("itar_with_ear_parts");
  });

  it("should include deemed export risks", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      hasForeignNationals: true,
    };
    const requirements = getApplicableExportControlRequirements(profile);
    const assessments = createMockAssessments(requirements);

    const result = performAssessment(profile, assessments);

    expect(result.deemedExportRisks.length).toBeGreaterThan(0);
  });

  it("should include screening requirements", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);
    const assessments = createMockAssessments(requirements);

    const result = performAssessment(profile, assessments);

    expect(result.screeningRequired.length).toBeGreaterThan(0);
  });

  it("should calculate penalty exposure", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);
    const assessments = createMockAssessments(requirements);

    const result = performAssessment(profile, assessments);

    expect(result.penaltyExposure.civil).toBeGreaterThan(0);
    expect(result.penaltyExposure.imprisonment).toBe(20);
  });
});

// ============================================================================
// RECOMMENDATIONS TESTS
// ============================================================================

describe("generateRecommendations", () => {
  it("should recommend DDTC registration for unregistered ITAR", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      registeredWithDDTC: false,
    };
    const requirements = getApplicableExportControlRequirements(profile);
    const assessments = createMockAssessments(requirements);
    const gaps = generateGapAnalysis(requirements, assessments);
    const score = calculateComplianceScore(requirements, assessments);

    const recommendations = generateRecommendations(profile, gaps, score);

    const ddtcRec = recommendations.find((r) => r.title.includes("DDTC"));
    expect(ddtcRec).toBeDefined();
    expect(ddtcRec?.priority).toBe(1);
    expect(ddtcRec?.timeframe).toContain("Immediate");
  });

  it("should recommend TCP for foreign nationals without TCP", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      hasForeignNationals: true,
      hasTCP: false,
    };
    const requirements = getApplicableExportControlRequirements(profile);
    const assessments = createMockAssessments(requirements);
    const gaps = generateGapAnalysis(requirements, assessments);
    const score = calculateComplianceScore(requirements, assessments);

    const recommendations = generateRecommendations(profile, gaps, score);

    const tcpRec = recommendations.find((r) =>
      r.title.includes("Technology Control Plan"),
    );
    expect(tcpRec).toBeDefined();
  });

  it("should recommend screening for exporters without automation", () => {
    const profile = createItarProfile();
    const requirements = getApplicableExportControlRequirements(profile);

    // Create assessments with screening gaps
    const statusOverrides: Record<string, ComplianceStatus> = {};
    requirements
      .filter((r) => r.id.includes("SCREEN"))
      .forEach((r) => {
        statusOverrides[r.id] = "non_compliant";
      });

    const assessments = createMockAssessments(requirements, statusOverrides);
    const gaps = generateGapAnalysis(requirements, assessments);
    const score = calculateComplianceScore(requirements, assessments);

    const recommendations = generateRecommendations(profile, gaps, score);

    const screeningRec = recommendations.find((r) =>
      r.title.includes("Screening"),
    );
    expect(screeningRec).toBeDefined();
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe("Helper Functions", () => {
  describe("getRequiredRegistrations", () => {
    it("should return DDTC registration for ITAR items", () => {
      const profile = createItarProfile();
      const registrations = getRequiredRegistrations(profile);

      expect(registrations.length).toBeGreaterThan(0);
      expect(registrations.some((r) => r.includes("DDTC"))).toBe(true);
    });

    it("should return empty for EAR-only profile", () => {
      const profile = createEarProfile();
      const registrations = getRequiredRegistrations(profile);

      expect(registrations.length).toBe(0);
    });
  });

  describe("getRequiredLicenseTypes", () => {
    it("should include DSP-5 for ITAR exports", () => {
      const profile = createItarProfile();
      const licenses = getRequiredLicenseTypes(profile);

      expect(licenses).toContain("DSP_5");
    });

    it("should include TAA for technology transfer", () => {
      const profile: ExportControlProfile = {
        ...createItarProfile(),
        hasTechnologyTransfer: true,
      };
      const licenses = getRequiredLicenseTypes(profile);

      expect(licenses).toContain("TAA");
    });

    it("should include MLA for manufacturing abroad", () => {
      const profile: ExportControlProfile = {
        ...createItarProfile(),
        hasManufacturingAbroad: true,
      };
      const licenses = getRequiredLicenseTypes(profile);

      expect(licenses).toContain("MLA");
    });

    it("should include BIS_LICENSE for EAR exports", () => {
      const profile = createEarProfile();
      const licenses = getRequiredLicenseTypes(profile);

      expect(licenses).toContain("BIS_LICENSE");
    });
  });

  describe("formatPenalty", () => {
    it("should format millions correctly", () => {
      expect(formatPenalty(1000000)).toBe("$1.0M");
      expect(formatPenalty(1227364)).toBe("$1.2M");
    });

    it("should format thousands correctly", () => {
      // Use regex to handle locale differences (. vs ,)
      expect(formatPenalty(300000)).toMatch(/^\$300[,.]000$/);
      expect(formatPenalty(50000)).toMatch(/^\$50[,.]000$/);
    });
  });

  describe("calculateMaxPenaltyExposure", () => {
    it("should return ITAR penalties for ITAR profile", () => {
      const profile = createItarProfile();
      const exposure = calculateMaxPenaltyExposure(profile);

      expect(exposure.civil).toBeGreaterThanOrEqual(1000000);
      expect(exposure.imprisonment).toBe(20);
    });

    it("should return EAR penalties for EAR profile", () => {
      const profile = createEarProfile();
      const exposure = calculateMaxPenaltyExposure(profile);

      expect(exposure.imprisonment).toBe(20);
    });
  });
});

// ============================================================================
// SCREENING LISTS TESTS
// ============================================================================

describe("getRequiredScreeningLists", () => {
  it("should require all lists for ITAR activities", () => {
    const lists = getRequiredScreeningLists(true, false, true);

    expect(lists.length).toBeGreaterThan(0);
    expect(lists.some((l) => l.listCode === "SDN")).toBe(true);
    expect(lists.some((l) => l.listCode === "DEBARRED")).toBe(true);
  });

  it("should require export lists for EAR activities", () => {
    const lists = getRequiredScreeningLists(false, true, true);

    expect(lists.some((l) => l.listCode === "ENTITY_LIST")).toBe(true);
    expect(lists.some((l) => l.listCode === "DPL")).toBe(true);
  });

  it("should require financial lists for financial transactions", () => {
    const lists = getRequiredScreeningLists(false, false, true);

    expect(lists.some((l) => l.listCode === "SDN")).toBe(true);
  });
});

// ============================================================================
// DEEMED EXPORT RULES TESTS
// ============================================================================

describe("getApplicableDeemedExportRules", () => {
  it("should return ITAR rules for ITAR with foreign nationals", () => {
    const profile: ExportControlProfile = {
      ...createItarProfile(),
      hasForeignNationals: true,
    };

    const rules = getApplicableDeemedExportRules(profile);

    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some((r) => r.regulation === "ITAR")).toBe(true);
  });

  it("should return EAR rules for EAR with foreign nationals", () => {
    const profile: ExportControlProfile = {
      ...createEarProfile(),
      hasForeignNationals: true,
    };

    const rules = getApplicableDeemedExportRules(profile);

    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some((r) => r.regulation === "EAR")).toBe(true);
  });

  it("should return empty for no foreign nationals", () => {
    const profile = createItarProfile();

    const rules = getApplicableDeemedExportRules(profile);

    expect(rules.length).toBe(0);
  });
});
