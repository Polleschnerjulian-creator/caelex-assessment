/**
 * Tests for the Cyber Baseline Compliance Engine.
 */

import { describe, expect, it } from "vitest";
import {
  checkCyberCompliance,
  evaluateCyberRequirement,
  type CyberPostureProfile,
} from "./engine";
import {
  CYBER_BASELINE_REQUIREMENTS,
  findCyberEntry,
} from "@/data/comply/cyber-baseline-space-iot";

// ============================================================================
// Helpers
// ============================================================================

function compliantUSGovProfile(): CyberPostureProfile {
  return {
    applicableSegments: [
      "SPACE_SEGMENT",
      "GROUND_SEGMENT",
      "LINK_SEGMENT",
      "USER_SEGMENT",
      "SUPPLY_CHAIN",
    ],
    hasVulnerabilityDisclosurePolicy: true,
    defaultCredentialsRemoved: true,
    firmwareSignatureVerification: true,
    tlsEnabled: true,
    incidentReportingPlannedHours: 12,
    incidentFollowupPlannedHours: 48,
    incidentFinalReportPlannedMonths: 1,
    supplyChainRiskMgmtPlan: true,
    comsecEnabled: true,
    pntIntegrityChecks: true,
    jurisdictions: ["US"],
    operatorType: "GOVERNMENT",
    isNIS2Essential: false,
    isUsGovContractor: true,
    penetrationTestingFrequencyMonths: 6,
    etsiMandatoryProvisionsImplemented: 33,
    hasCSIRTRegistration: true,
    participatesInThreatIntelSharing: true,
  };
}

function compliantDEEssentialProfile(): CyberPostureProfile {
  return {
    applicableSegments: [
      "SPACE_SEGMENT",
      "GROUND_SEGMENT",
      "LINK_SEGMENT",
      "USER_SEGMENT",
      "SUPPLY_CHAIN",
    ],
    hasVulnerabilityDisclosurePolicy: true,
    defaultCredentialsRemoved: true,
    firmwareSignatureVerification: true,
    tlsEnabled: true,
    incidentReportingPlannedHours: 20,
    incidentFollowupPlannedHours: 60,
    incidentFinalReportPlannedMonths: 1,
    supplyChainRiskMgmtPlan: true,
    comsecEnabled: true,
    pntIntegrityChecks: true,
    jurisdictions: ["DE"],
    operatorType: "CRITICAL_INFRA",
    isNIS2Essential: true,
    isUsGovContractor: false,
    penetrationTestingFrequencyMonths: 6,
    etsiMandatoryProvisionsImplemented: 33,
    hasCSIRTRegistration: true,
    participatesInThreatIntelSharing: true,
  };
}

function nonEssentialCommercialProfile(): CyberPostureProfile {
  return {
    applicableSegments: ["GROUND_SEGMENT", "USER_SEGMENT"],
    hasVulnerabilityDisclosurePolicy: true,
    defaultCredentialsRemoved: true,
    firmwareSignatureVerification: true,
    tlsEnabled: true,
    incidentReportingPlannedHours: 12,
    incidentFollowupPlannedHours: 48,
    incidentFinalReportPlannedMonths: 1,
    supplyChainRiskMgmtPlan: true,
    comsecEnabled: true,
    pntIntegrityChecks: true,
    jurisdictions: ["DE"],
    operatorType: "COMMERCIAL",
    isNIS2Essential: false,
    isUsGovContractor: false,
    penetrationTestingFrequencyMonths: 6,
    etsiMandatoryProvisionsImplemented: 33,
    hasCSIRTRegistration: true,
    participatesInThreatIntelSharing: true,
  };
}

// ============================================================================
// NIS2 essential-entity gating (special path)
// ============================================================================

describe("evaluateCyberRequirement — NIS2 essential-entity gating", () => {
  const nis2EarlyWarn = findCyberEntry("NIS2-ART-23-EARLY-WARN")!;
  const nis2Art21 = findCyberEntry("NIS2-ART-21-RISK-MGMT")!;

  it("NIS2 rule NOT_APPLICABLE when isNIS2Essential=false", () => {
    const profile = nonEssentialCommercialProfile();
    const result = evaluateCyberRequirement(nis2EarlyWarn, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
    expect(result.rationale).toContain("essential");
  });

  it("NIS2 rule NOT_APPLICABLE when isNIS2Essential undefined", () => {
    const profile: CyberPostureProfile = {
      ...nonEssentialCommercialProfile(),
      isNIS2Essential: undefined,
    };
    const result = evaluateCyberRequirement(nis2EarlyWarn, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("NIS2 rule applies (COMPLIANT) when isNIS2Essential=true + incident reporting ≤24h", () => {
    const profile = compliantDEEssentialProfile();
    const result = evaluateCyberRequirement(nis2EarlyWarn, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NIS2 Art. 21 risk-management qualitative rule COMPLIANT for essential entity with pen-testing ≤12mo", () => {
    const profile = compliantDEEssentialProfile();
    const result = evaluateCyberRequirement(nis2Art21, profile);
    expect(result.status).toBe("COMPLIANT");
  });
});

// ============================================================================
// SPD-5 US-Gov-Contractor gating (special path)
// ============================================================================

describe("evaluateCyberRequirement — SPD-5 US-Gov-Contractor gating", () => {
  const spd5_4a = findCyberEntry("US-SPD-5-PRINCIPLE-4A")!;
  const spd5_4f = findCyberEntry("US-SPD-5-PRINCIPLE-4F-SUPPLY-CHAIN")!;

  it("SPD-5 rule NOT_APPLICABLE when isUsGovContractor=false", () => {
    const profile: CyberPostureProfile = {
      ...compliantUSGovProfile(),
      isUsGovContractor: false,
    };
    const result = evaluateCyberRequirement(spd5_4a, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
    expect(result.rationale).toContain("isUsGovContractor");
  });

  it("SPD-5 supply-chain rule COMPLIANT for US Gov contractor with supplyChainRiskMgmtPlan=true", () => {
    const profile = compliantUSGovProfile();
    const result = evaluateCyberRequirement(spd5_4f, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("SPD-5 supply-chain rule NON_COMPLIANT for US Gov contractor with plan=false", () => {
    const profile: CyberPostureProfile = {
      ...compliantUSGovProfile(),
      supplyChainRiskMgmtPlan: false,
    };
    const result = evaluateCyberRequirement(spd5_4f, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

// ============================================================================
// Incident-reporting timeline check (NIS2 24h / 72h / 1mo)
// ============================================================================

describe("evaluateCyberRequirement — NIS2 24-hour early-warning timeline", () => {
  const earlyWarn = findCyberEntry("NIS2-ART-23-EARLY-WARN")!;

  it("COMPLIANT when incidentReportingPlannedHours ≤ 24", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      incidentReportingPlannedHours: 24,
    };
    const result = evaluateCyberRequirement(earlyWarn, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("COMPLIANT when incidentReportingPlannedHours = 12 (faster than required)", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      incidentReportingPlannedHours: 12,
    };
    const result = evaluateCyberRequirement(earlyWarn, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when incidentReportingPlannedHours > 24", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      incidentReportingPlannedHours: 48,
    };
    const result = evaluateCyberRequirement(earlyWarn, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("UNKNOWN when incidentReportingPlannedHours undefined", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      incidentReportingPlannedHours: undefined,
    };
    const result = evaluateCyberRequirement(earlyWarn, profile);
    expect(result.status).toBe("UNKNOWN");
  });
});

describe("evaluateCyberRequirement — NIS2 72-hour follow-up timeline", () => {
  const followup = findCyberEntry("NIS2-ART-23-72H")!;

  it("COMPLIANT when incidentFollowupPlannedHours ≤ 72", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      incidentFollowupPlannedHours: 72,
    };
    const result = evaluateCyberRequirement(followup, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when incidentFollowupPlannedHours > 72", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      incidentFollowupPlannedHours: 96,
    };
    const result = evaluateCyberRequirement(followup, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

describe("evaluateCyberRequirement — NIS2 1-month final report timeline", () => {
  const finalReport = findCyberEntry("NIS2-ART-23-1MO")!;

  it("COMPLIANT when incidentFinalReportPlannedMonths ≤ 1", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      incidentFinalReportPlannedMonths: 1,
    };
    const result = evaluateCyberRequirement(finalReport, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when incidentFinalReportPlannedMonths > 1", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      incidentFinalReportPlannedMonths: 3,
    };
    const result = evaluateCyberRequirement(finalReport, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

// ============================================================================
// ETSI EN 303 645 provisions
// ============================================================================

describe("evaluateCyberRequirement — ETSI § 5.1 default passwords", () => {
  const etsi51 = findCyberEntry("ETSI-303-645-5-1")!;

  it("COMPLIANT when defaultCredentialsRemoved=true", () => {
    const profile = compliantDEEssentialProfile();
    const result = evaluateCyberRequirement(etsi51, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when defaultCredentialsRemoved=false", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      defaultCredentialsRemoved: false,
    };
    const result = evaluateCyberRequirement(etsi51, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("UNKNOWN when defaultCredentialsRemoved undefined", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      defaultCredentialsRemoved: undefined,
    };
    const result = evaluateCyberRequirement(etsi51, profile);
    expect(result.status).toBe("UNKNOWN");
  });
});

describe("evaluateCyberRequirement — ETSI § 5.5 secure comms (TLS)", () => {
  const etsi55 = findCyberEntry("ETSI-303-645-5-5")!;

  it("COMPLIANT when tlsEnabled=true", () => {
    const profile = compliantDEEssentialProfile();
    const result = evaluateCyberRequirement(etsi55, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when tlsEnabled=false", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      tlsEnabled: false,
    };
    const result = evaluateCyberRequirement(etsi55, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

describe("evaluateCyberRequirement — ETSI provision count (33 M)", () => {
  const provCount = findCyberEntry("ETSI-303-645-PROVISION-COUNT")!;

  it("COMPLIANT when etsiMandatoryProvisionsImplemented = 33", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      etsiMandatoryProvisionsImplemented: 33,
    };
    const result = evaluateCyberRequirement(provCount, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when etsiMandatoryProvisionsImplemented < 33", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      etsiMandatoryProvisionsImplemented: 25,
    };
    const result = evaluateCyberRequirement(provCount, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

// ============================================================================
// Multi-jurisdiction (US + DE operator sees SPD-5 + NIS2 + BSI + ETSI)
// ============================================================================

describe("checkCyberCompliance — multi-jurisdiction", () => {
  it("US+DE operator sees SPD-5 + NIS2 + BSI + ETSI requirements", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      jurisdictions: ["US", "DE"],
      isUsGovContractor: true,
    };
    const report = checkCyberCompliance(profile);
    const spd5Applied = report.results.filter(
      (r) =>
        r.requirement.regime === "US-SPD-5" && r.status !== "NOT_APPLICABLE",
    );
    const nis2Applied = report.results.filter(
      (r) => r.requirement.regime === "NIS2" && r.status !== "NOT_APPLICABLE",
    );
    const bsiApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "BSI-IT-GRUNDSCHUTZ" &&
        r.status !== "NOT_APPLICABLE",
    );
    const etsiApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "ETSI-EN-303-645" &&
        r.status !== "NOT_APPLICABLE",
    );
    expect(spd5Applied.length).toBeGreaterThan(0);
    expect(nis2Applied.length).toBeGreaterThan(0);
    expect(bsiApplied.length).toBeGreaterThan(0);
    expect(etsiApplied.length).toBeGreaterThan(0);
  });

  it("US-only government operator does not see NIS2 + BSI + ETSI", () => {
    const profile = compliantUSGovProfile();
    const report = checkCyberCompliance(profile);
    const nis2Applied = report.results.filter(
      (r) => r.requirement.regime === "NIS2" && r.status !== "NOT_APPLICABLE",
    );
    const bsiApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "BSI-IT-GRUNDSCHUTZ" &&
        r.status !== "NOT_APPLICABLE",
    );
    const etsiApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "ETSI-EN-303-645" &&
        r.status !== "NOT_APPLICABLE",
    );
    expect(nis2Applied.length).toBe(0);
    expect(bsiApplied.length).toBe(0);
    expect(etsiApplied.length).toBe(0);
  });

  it("DE essential operator (commercial) sees NIS2 + BSI + ETSI but NOT SPD-5", () => {
    const profile = compliantDEEssentialProfile();
    const report = checkCyberCompliance(profile);
    const spd5Applied = report.results.filter(
      (r) =>
        r.requirement.regime === "US-SPD-5" && r.status !== "NOT_APPLICABLE",
    );
    const nis2Applied = report.results.filter(
      (r) => r.requirement.regime === "NIS2" && r.status !== "NOT_APPLICABLE",
    );
    expect(spd5Applied.length).toBe(0);
    expect(nis2Applied.length).toBeGreaterThan(0);
  });

  it("Japanese-only operator sees industry-consensus only", () => {
    const profile: CyberPostureProfile = {
      ...compliantUSGovProfile(),
      jurisdictions: ["JP"],
      isUsGovContractor: false,
      isNIS2Essential: false,
    };
    const report = checkCyberCompliance(profile);
    const applied = report.results.filter((r) => r.status !== "NOT_APPLICABLE");
    // Only INDUSTRY-CONSENSUS entries surface
    for (const r of applied) {
      expect(r.requirement.regime).toBe("INDUSTRY-CONSENSUS");
    }
  });
});

// ============================================================================
// Segment scoping
// ============================================================================

describe("evaluateCyberRequirement — segment scoping", () => {
  const enisaGround = findCyberEntry("ENISA-LANDSCAPE-GROUND")!;
  const enisaSpace = findCyberEntry("ENISA-LANDSCAPE-SPACE")!;

  it("Ground-only rule NOT_APPLICABLE for space-segment-only operator", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      applicableSegments: ["SPACE_SEGMENT"],
    };
    const result = evaluateCyberRequirement(enisaGround, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("Space-only rule applicable for space-segment-declared operator", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      applicableSegments: ["SPACE_SEGMENT"],
    };
    const result = evaluateCyberRequirement(enisaSpace, profile);
    // Operator does have space-segment in scope; rule applies
    expect(result.status).not.toBe("NOT_APPLICABLE");
  });

  it("Ground rule applicable when operator declares ground segment", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      applicableSegments: ["GROUND_SEGMENT", "LINK_SEGMENT"],
    };
    const result = evaluateCyberRequirement(enisaGround, profile);
    expect(result.status).not.toBe("NOT_APPLICABLE");
  });
});

// ============================================================================
// Operator-type scoping
// ============================================================================

describe("evaluateCyberRequirement — operator scoping", () => {
  it("ACADEMIC operator does not see SPD-5 (GOV-only)", () => {
    const profile: CyberPostureProfile = {
      ...compliantUSGovProfile(),
      operatorType: "ACADEMIC",
    };
    const spd5_4a = findCyberEntry("US-SPD-5-PRINCIPLE-4A")!;
    const result = evaluateCyberRequirement(spd5_4a, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("CRITICAL_INFRA operator sees NIS2 rules (designated essential)", () => {
    const profile = compliantDEEssentialProfile();
    const nis2Art21 = findCyberEntry("NIS2-ART-21-RISK-MGMT")!;
    const result = evaluateCyberRequirement(nis2Art21, profile);
    expect(result.status).not.toBe("NOT_APPLICABLE");
  });
});

// ============================================================================
// PNT-integrity check (NIST IR 8270)
// ============================================================================

describe("evaluateCyberRequirement — PNT integrity (NIST IR 8270)", () => {
  const pnt = findCyberEntry("NIST-IR-8270-PNT")!;

  it("COMPLIANT when pntIntegrityChecks=true (US operator)", () => {
    const profile = compliantUSGovProfile();
    const result = evaluateCyberRequirement(pnt, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when pntIntegrityChecks=false (US operator)", () => {
    const profile: CyberPostureProfile = {
      ...compliantUSGovProfile(),
      pntIntegrityChecks: false,
    };
    const result = evaluateCyberRequirement(pnt, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

// ============================================================================
// COMSEC (SPD-5 § 4(d))
// ============================================================================

describe("evaluateCyberRequirement — COMSEC (SPD-5 § 4(d))", () => {
  const comsec = findCyberEntry("US-SPD-5-PRINCIPLE-4D")!;

  it("COMPLIANT when comsecEnabled=true + isUsGovContractor=true", () => {
    const profile = compliantUSGovProfile();
    const result = evaluateCyberRequirement(comsec, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when comsecEnabled=false (US Gov contractor)", () => {
    const profile: CyberPostureProfile = {
      ...compliantUSGovProfile(),
      comsecEnabled: false,
    };
    const result = evaluateCyberRequirement(comsec, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

// ============================================================================
// Full-report integration
// ============================================================================

describe("checkCyberCompliance — full report", () => {
  it("returns a result for every requirement in the dataset", () => {
    const profile = compliantUSGovProfile();
    const report = checkCyberCompliance(profile);
    expect(report.results.length).toBe(CYBER_BASELINE_REQUIREMENTS.length);
  });

  it("overallCompliant true for fully-compliant US Gov profile", () => {
    const profile = compliantUSGovProfile();
    const report = checkCyberCompliance(profile);
    const mandatoryViolations = report.results.filter(
      (r) =>
        r.status === "NON_COMPLIANT" &&
        r.requirement.bindingNature === "MANDATORY",
    );
    expect(mandatoryViolations.length).toBe(0);
    expect(report.overallCompliant).toBe(true);
  });

  it("overallCompliant true for fully-compliant DE essential profile", () => {
    const profile = compliantDEEssentialProfile();
    const report = checkCyberCompliance(profile);
    const mandatoryViolations = report.results.filter(
      (r) =>
        r.status === "NON_COMPLIANT" &&
        r.requirement.bindingNature === "MANDATORY",
    );
    expect(mandatoryViolations.length).toBe(0);
    expect(report.overallCompliant).toBe(true);
  });

  it("overallCompliant false when NIS2 24h reporting > 24 hours", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      incidentReportingPlannedHours: 48,
    };
    const report = checkCyberCompliance(profile);
    expect(report.overallCompliant).toBe(false);
    const result = report.results.find(
      (r) => r.requirement.code === "NIS2-ART-23-EARLY-WARN",
    );
    expect(result?.status).toBe("NON_COMPLIANT");
  });

  it("overallCompliant false when SPD-5 supply-chain plan missing (US Gov)", () => {
    const profile: CyberPostureProfile = {
      ...compliantUSGovProfile(),
      supplyChainRiskMgmtPlan: false,
    };
    const report = checkCyberCompliance(profile);
    expect(report.overallCompliant).toBe(false);
  });

  it("HARMONISED ETSI rule NON_COMPLIANT does not break overall compliance", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      tlsEnabled: false, // breaks ETSI § 5.5 (HARMONISED)
    };
    const report = checkCyberCompliance(profile);
    const etsi55 = report.results.find(
      (r) => r.requirement.code === "ETSI-303-645-5-5",
    );
    expect(etsi55?.status).toBe("NON_COMPLIANT");
    // HARMONISED failures alone don't break overall (only MANDATORY does)
    expect(report.overallCompliant).toBe(true);
  });

  it("summary counts add up to total", () => {
    const profile = compliantUSGovProfile();
    const report = checkCyberCompliance(profile);
    const {
      compliantCount,
      nonCompliantCount,
      notApplicableCount,
      unknownCount,
    } = report.summary;
    expect(
      compliantCount + nonCompliantCount + notApplicableCount + unknownCount,
    ).toBe(report.summary.totalEvaluated);
    expect(report.summary.totalEvaluated).toBe(
      CYBER_BASELINE_REQUIREMENTS.length,
    );
  });

  it("non-essential commercial operator sees NIS2 rules as NOT_APPLICABLE", () => {
    const profile = nonEssentialCommercialProfile();
    const report = checkCyberCompliance(profile);
    const nis2Results = report.results.filter(
      (r) => r.requirement.regime === "NIS2",
    );
    for (const r of nis2Results) {
      expect(r.status).toBe("NOT_APPLICABLE");
    }
    // Overall still compliant — NIS2 doesn't bind a non-essential operator
    expect(report.overallCompliant).toBe(true);
  });
});

// ============================================================================
// Sanity invariants
// ============================================================================

describe("checkCyberCompliance — sanity invariants", () => {
  it("UNKNOWN-heavy profile (empty optional fields) does not crash", () => {
    const minimal: CyberPostureProfile = {
      applicableSegments: ["GROUND_SEGMENT"],
      jurisdictions: ["DE"],
      operatorType: "COMMERCIAL",
    };
    const report = checkCyberCompliance(minimal);
    expect(report.results.length).toBe(CYBER_BASELINE_REQUIREMENTS.length);
  });

  it("DE essential overall-compliant profile contains an Art. 23 early-warn COMPLIANT result", () => {
    const profile = compliantDEEssentialProfile();
    const report = checkCyberCompliance(profile);
    const earlyWarn = report.results.find(
      (r) => r.requirement.code === "NIS2-ART-23-EARLY-WARN",
    );
    expect(earlyWarn?.status).toBe("COMPLIANT");
  });

  it("US Gov compliant profile contains SPD-5 § 4(f) supply-chain COMPLIANT", () => {
    const profile = compliantUSGovProfile();
    const report = checkCyberCompliance(profile);
    const sc = report.results.find(
      (r) => r.requirement.code === "US-SPD-5-PRINCIPLE-4F-SUPPLY-CHAIN",
    );
    expect(sc?.status).toBe("COMPLIANT");
  });

  it("Empty jurisdictions defaults to conservative include (rules visible)", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      jurisdictions: [],
    };
    const report = checkCyberCompliance(profile);
    // Most rules surface as something other than NOT_APPLICABLE
    const applied = report.results.filter((r) => r.status !== "NOT_APPLICABLE");
    expect(applied.length).toBeGreaterThan(0);
  });

  it("ENISA threat-landscape entries (GUIDELINE) surface as advisory + don't break overall", () => {
    const profile: CyberPostureProfile = {
      ...compliantDEEssentialProfile(),
      participatesInThreatIntelSharing: false,
    };
    const report = checkCyberCompliance(profile);
    const enisaResults = report.results.filter(
      (r) => r.requirement.regime === "ENISA-THREAT-LANDSCAPE",
    );
    // ENISA rules surface (not NOT_APPLICABLE) and may be NON_COMPLIANT
    const nonAppliedEnisa = enisaResults.filter(
      (r) => r.status !== "NOT_APPLICABLE",
    );
    expect(nonAppliedEnisa.length).toBeGreaterThan(0);
    // But GUIDELINE failures don't break overall compliance
    expect(report.overallCompliant).toBe(true);
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
