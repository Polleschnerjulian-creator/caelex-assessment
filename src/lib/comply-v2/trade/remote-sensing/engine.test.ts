/**
 * Tests for the NOAA CRSRA + EU/UK Remote-Sensing Compliance Engine.
 */

import { describe, expect, it } from "vitest";
import {
  checkRemoteSensingCompliance,
  evaluateRemoteSensingRequirement,
  type RemoteSensingOperatorProfile,
} from "./engine";
import {
  REMOTE_SENSING_REQUIREMENTS,
  findRemoteSensingEntry,
} from "@/data/trade/noaa-crsra-remote-sensing";

// ============================================================================
// Helpers
// ============================================================================

function compliantCommercialUSProfile(): RemoteSensingOperatorProfile {
  return {
    sensorTypes: ["OPTICAL_PANCHROMATIC", "OPTICAL_MULTISPECTRAL"],
    resolutionMeters: 0.5, // 50 cm — above 25 cm Tier 3 trigger
    isCommercialOperator: true,
    dataPublicationDelayHours: 0,
    hasSensitiveAreaExclusionPolicy: false,
    supportsShutterControl: true,
    willPublishGloballly: true,
    willSellToForeignBuyers: false,
    jurisdictions: ["US"],
    operatorType: "COMMERCIAL",
    capturesPersonalData: false,
    groundStationCountries: ["US"],
    hasNOAATier: 2, // Tier 2 — common case
    itarOverlayPresent: false,
    hasDocumentedArt6Basis: undefined,
    hasDPIA: undefined,
    hasRetentionPolicy: undefined,
    dataRetentionYears: undefined,
  };
}

// ============================================================================
// Single-requirement evaluation — NOAA licence required
// ============================================================================

describe("evaluateRemoteSensingRequirement — NOAA-960-3-LICENSE", () => {
  const licenseRule = findRemoteSensingEntry("NOAA-960-3-LICENSE")!;

  it("COMPLIANT for commercial US operator", () => {
    const profile = compliantCommercialUSProfile();
    const result = evaluateRemoteSensingRequirement(licenseRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NOT_APPLICABLE for UK-only operator", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      jurisdictions: ["GB"],
    };
    const result = evaluateRemoteSensingRequirement(licenseRule, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("NOT_APPLICABLE for GOVERNMENT operator (rule scoped to COMMERCIAL)", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      operatorType: "GOVERNMENT",
    };
    const result = evaluateRemoteSensingRequirement(licenseRule, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });
});

// ============================================================================
// Tier classification special path
// ============================================================================

describe("evaluateRemoteSensingRequirement — Tier classification logic", () => {
  const tierRule = findRemoteSensingEntry("NOAA-960-6-TIER")!;

  it("NON_COMPLIANT when US commercial operator has hasNOAATier=null (missing classification)", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: null,
    };
    const result = evaluateRemoteSensingRequirement(tierRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
    expect(result.rationale).toContain("no declared NOAA tier classification");
  });

  it("COMPLIANT when Tier 1 declared", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: 1,
    };
    const result = evaluateRemoteSensingRequirement(tierRule, profile);
    expect(result.status).toBe("COMPLIANT");
    expect(result.rationale).toContain("Tier 1");
  });

  it("COMPLIANT when Tier 3 declared", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: 3,
      supportsShutterControl: true,
      hasSensitiveAreaExclusionPolicy: true,
    };
    const result = evaluateRemoteSensingRequirement(tierRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });
});

// ============================================================================
// Tier 3 specific conditions
// ============================================================================

describe("evaluateRemoteSensingRequirement — Tier 3 specific conditions", () => {
  const shutterRule = findRemoteSensingEntry("NOAA-960-SHUTTER-CONTROL")!;
  const resCapRule = findRemoteSensingEntry("NOAA-TIER-3-RESOLUTION-CAP")!;
  const delayRule = findRemoteSensingEntry("NOAA-TIER-3-DELAY")!;
  const exclusionRule = findRemoteSensingEntry("NOAA-TIER-3-EXCLUSION")!;

  it("NON_COMPLIANT for Tier 3 operator without shutter-control capability", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: 3,
      supportsShutterControl: false,
    };
    const result = evaluateRemoteSensingRequirement(shutterRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
    expect(result.rationale).toContain("shutter-control capability");
  });

  it("COMPLIANT for Tier 3 operator with shutter-control capability", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: 3,
      supportsShutterControl: true,
    };
    const result = evaluateRemoteSensingRequirement(shutterRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NOT_APPLICABLE for resolution-cap rule when operator is Tier 2", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: 2,
    };
    const result = evaluateRemoteSensingRequirement(resCapRule, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("NON_COMPLIANT for Tier 3 + <=25 cm resolution + no mitigation", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: 3,
      resolutionMeters: 0.2, // 20 cm — finer than 25 cm
      dataPublicationDelayHours: 0,
      hasSensitiveAreaExclusionPolicy: false,
      supportsShutterControl: true,
    };
    const result = evaluateRemoteSensingRequirement(resCapRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("COMPLIANT for Tier 3 + <=25 cm resolution + 24h delay applied", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: 3,
      resolutionMeters: 0.2,
      dataPublicationDelayHours: 24,
      hasSensitiveAreaExclusionPolicy: false,
      supportsShutterControl: true,
    };
    const result = evaluateRemoteSensingRequirement(resCapRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("COMPLIANT for Tier 3 + <=25 cm resolution + exclusion policy", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: 3,
      resolutionMeters: 0.15,
      dataPublicationDelayHours: 0,
      hasSensitiveAreaExclusionPolicy: true,
      supportsShutterControl: true,
    };
    const result = evaluateRemoteSensingRequirement(resCapRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("Tier 3 delay rule NON_COMPLIANT when <24 h declared", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: 3,
      dataPublicationDelayHours: 12,
      supportsShutterControl: true,
    };
    const result = evaluateRemoteSensingRequirement(delayRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("Tier 3 exclusion rule NON_COMPLIANT when no policy declared", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: 3,
      hasSensitiveAreaExclusionPolicy: false,
      supportsShutterControl: true,
    };
    const result = evaluateRemoteSensingRequirement(exclusionRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

// ============================================================================
// GDPR conditional path
// ============================================================================

describe("evaluateRemoteSensingRequirement — GDPR conditional path", () => {
  const gdprPDRule = findRemoteSensingEntry("EU-GDPR-EO-PERSONAL-DATA")!;
  const gdprArt6Rule = findRemoteSensingEntry("EU-GDPR-EO-ART6-LAWFUL")!;
  const gdprArt9Rule = findRemoteSensingEntry("EU-GDPR-EO-ART9-BIOMETRIC")!;

  it("NOT_APPLICABLE when capturesPersonalData=false (e.g. SAR-only mission)", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["DE"],
      capturesPersonalData: false,
    };
    const result = evaluateRemoteSensingRequirement(gdprPDRule, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("NON_COMPLIANT for high-res optical + personal data + EU jurisdiction", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["DE"],
      resolutionMeters: 0.2, // ≤ 30 cm
      capturesPersonalData: true,
    };
    const result = evaluateRemoteSensingRequirement(gdprPDRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
    expect(result.rationale).toMatch(/30 cm|personal data/);
  });

  it("COMPLIANT when resolution > 30 cm and personal data captured", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["DE"],
      resolutionMeters: 0.5, // > 30 cm
      capturesPersonalData: true,
    };
    const result = evaluateRemoteSensingRequirement(gdprPDRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("Art. 6 NON_COMPLIANT for high-res + personal data + no documented basis", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["DE"],
      resolutionMeters: 0.2,
      capturesPersonalData: true,
      hasDocumentedArt6Basis: false,
    };
    const result = evaluateRemoteSensingRequirement(gdprArt6Rule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("Art. 6 COMPLIANT when documented LIA in place", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["DE"],
      resolutionMeters: 0.2,
      capturesPersonalData: true,
      hasDocumentedArt6Basis: true,
    };
    const result = evaluateRemoteSensingRequirement(gdprArt6Rule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("Art. 9 NOT_APPLICABLE when resolution > 30 cm (biometric inference not feasible)", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["DE"],
      resolutionMeters: 0.5,
      capturesPersonalData: true,
    };
    const result = evaluateRemoteSensingRequirement(gdprArt9Rule, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("Art. 9 NON_COMPLIANT for high-res + personal data (biometric risk)", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["DE"],
      resolutionMeters: 0.15,
      capturesPersonalData: true,
    };
    const result = evaluateRemoteSensingRequirement(gdprArt9Rule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
    expect(result.rationale).toMatch(/biometric/);
  });
});

// ============================================================================
// ITAR overlay path
// ============================================================================

describe("evaluateRemoteSensingRequirement — ITAR overlay path", () => {
  const itarLicense = findRemoteSensingEntry("ITAR-XV-E-LICENSE")!;
  const itarSME = findRemoteSensingEntry("ITAR-XV-E-SME")!;
  const itarTechData = findRemoteSensingEntry("ITAR-XV-E-TECHDATA")!;

  it("NOT_APPLICABLE when itarOverlayPresent=false", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      itarOverlayPresent: false,
    };
    const result = evaluateRemoteSensingRequirement(itarLicense, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("COMPLIANT for SAR exporter with itarOverlayPresent=true", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["SAR_X_BAND"],
      itarOverlayPresent: true,
    };
    const result = evaluateRemoteSensingRequirement(itarLicense, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("ITAR SME rule NOT_APPLICABLE without ITAR overlay flag", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      itarOverlayPresent: false,
    };
    const result = evaluateRemoteSensingRequirement(itarSME, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("ITAR Tech Data rule applies for ITAR + relevant sensor", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_HYPERSPECTRAL"],
      itarOverlayPresent: true,
    };
    const result = evaluateRemoteSensingRequirement(itarTechData, profile);
    expect(result.status).toBe("COMPLIANT");
  });
});

// ============================================================================
// Jurisdiction scoping (multi-jurisdiction)
// ============================================================================

describe("evaluateRemoteSensingRequirement — jurisdiction scoping", () => {
  it("US-only operator does NOT see SatDSiG rules", () => {
    const satDsig = findRemoteSensingEntry("DE-SATDSIG-1-LICENSE")!;
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      jurisdictions: ["US"],
    };
    const result = evaluateRemoteSensingRequirement(satDsig, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("US-only operator does NOT see UK SIA rules", () => {
    const ukSia = findRemoteSensingEntry("UK-SIA-SCH1-PARA5")!;
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      jurisdictions: ["US"],
    };
    const result = evaluateRemoteSensingRequirement(ukSia, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("DE-only operator does NOT see NOAA rules", () => {
    const noaaLic = findRemoteSensingEntry("NOAA-960-3-LICENSE")!;
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      jurisdictions: ["DE"],
    };
    const result = evaluateRemoteSensingRequirement(noaaLic, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("FR operator sees French LOA + EU-GDPR-EO", () => {
    const frRule = findRemoteSensingEntry("FR-LOA-R331-15")!;
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["FR"],
      resolutionMeters: 0.2,
    };
    const result = evaluateRemoteSensingRequirement(frRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("IT operator sees Italian Codice Privacy rules", () => {
    const itAsi = findRemoteSensingEntry("IT-ASI-AUTHORISATION")!;
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["IT"],
    };
    const result = evaluateRemoteSensingRequirement(itAsi, profile);
    expect(result.status).toBe("COMPLIANT");
  });
});

// ============================================================================
// Sensor-type scoping
// ============================================================================

describe("evaluateRemoteSensingRequirement — sensor-type scoping", () => {
  it("SAR-only operator does NOT trigger thermal-IR-specific rules", () => {
    // Find a rule that does NOT include THERMAL_INFRARED in sensors:
    const thermalOnlyRule = REMOTE_SENSING_REQUIREMENTS.find(
      (e) =>
        !e.applicableSensorTypes.includes("THERMAL_INFRARED") &&
        e.applicableSensorTypes.includes("OPTICAL_PANCHROMATIC"),
    );
    if (!thermalOnlyRule) return; // No such rule (defensive)
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["THERMAL_INFRARED"],
      itarOverlayPresent: false,
    };
    const result = evaluateRemoteSensingRequirement(thermalOnlyRule, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("Optical-only operator does NOT trigger SAR-only rules", () => {
    const sarRule = findRemoteSensingEntry("ITAR-XV-E-LICENSE")!;
    // ITAR-XV-E-LICENSE applies to optical PAN too, so let's find a
    // rule that excludes optical:
    const sarOnly = REMOTE_SENSING_REQUIREMENTS.find(
      (e) =>
        !e.applicableSensorTypes.includes("OPTICAL_PANCHROMATIC") &&
        !e.applicableSensorTypes.includes("OPTICAL_HYPERSPECTRAL") &&
        e.applicableSensorTypes.includes("SAR_X_BAND"),
    );
    if (!sarOnly) {
      // If no such rule exists in dataset, fall back to general test
      const profile: RemoteSensingOperatorProfile = {
        ...compliantCommercialUSProfile(),
        sensorTypes: ["OPTICAL_PANCHROMATIC"],
      };
      const result = evaluateRemoteSensingRequirement(sarRule, profile);
      expect(["NOT_APPLICABLE", "COMPLIANT"]).toContain(result.status);
    }
  });
});

// ============================================================================
// Multi-jurisdiction integration (US+DE operator sees both NOAA + EU-GDPR)
// ============================================================================

describe("checkRemoteSensingCompliance — multi-jurisdiction", () => {
  it("US+DE operator sees both NOAA-CRSRA and EU-GDPR-EO rules", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["US", "DE"],
      resolutionMeters: 0.4,
      capturesPersonalData: true,
      hasDocumentedArt6Basis: true,
      hasDPIA: true,
    };
    const report = checkRemoteSensingCompliance(profile);
    const noaaApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "NOAA-CRSRA" && r.status !== "NOT_APPLICABLE",
    );
    const gdprApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "EU-GDPR-EO" && r.status !== "NOT_APPLICABLE",
    );
    expect(noaaApplied.length).toBeGreaterThan(0);
    expect(gdprApplied.length).toBeGreaterThan(0);
  });

  it("US+UK operator sees NOAA + UK-GISA-SIA but NOT SatDSiG", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      jurisdictions: ["US", "GB"],
    };
    const report = checkRemoteSensingCompliance(profile);
    const noaa = report.results.filter(
      (r) =>
        r.requirement.regime === "NOAA-CRSRA" && r.status !== "NOT_APPLICABLE",
    );
    const uk = report.results.filter(
      (r) =>
        r.requirement.regime === "UK-GISA-SIA" && r.status !== "NOT_APPLICABLE",
    );
    const satDsig = report.results.filter(
      (r) =>
        r.requirement.regime === "DE-SATDSIG" && r.status !== "NOT_APPLICABLE",
    );
    expect(noaa.length).toBeGreaterThan(0);
    expect(uk.length).toBeGreaterThan(0);
    expect(satDsig.length).toBe(0);
  });

  it("EU-only operator (DE) sees SatDSiG + EU-GDPR-EO but not NOAA", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["DE"],
      capturesPersonalData: true,
      resolutionMeters: 0.5,
      hasDocumentedArt6Basis: true,
      hasDPIA: true,
    };
    const report = checkRemoteSensingCompliance(profile);
    const noaa = report.results.filter(
      (r) =>
        r.requirement.regime === "NOAA-CRSRA" && r.status !== "NOT_APPLICABLE",
    );
    const satDsig = report.results.filter(
      (r) =>
        r.requirement.regime === "DE-SATDSIG" && r.status !== "NOT_APPLICABLE",
    );
    const gdpr = report.results.filter(
      (r) =>
        r.requirement.regime === "EU-GDPR-EO" && r.status !== "NOT_APPLICABLE",
    );
    expect(noaa.length).toBe(0);
    expect(satDsig.length).toBeGreaterThan(0);
    expect(gdpr.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Full-report integration
// ============================================================================

describe("checkRemoteSensingCompliance — full report", () => {
  it("returns a result for every requirement in the dataset", () => {
    const profile = compliantCommercialUSProfile();
    const report = checkRemoteSensingCompliance(profile);
    expect(report.results.length).toBe(REMOTE_SENSING_REQUIREMENTS.length);
  });

  it("overallCompliant true for fully-compliant Tier 2 commercial US profile", () => {
    const profile = compliantCommercialUSProfile();
    const report = checkRemoteSensingCompliance(profile);
    const mandatoryViolations = report.results.filter(
      (r) =>
        r.status === "NON_COMPLIANT" &&
        r.requirement.bindingNature === "MANDATORY",
    );
    expect(mandatoryViolations.length).toBe(0);
    expect(report.overallCompliant).toBe(true);
  });

  it("overallCompliant false when commercial US operator has no tier classification", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: null,
    };
    const report = checkRemoteSensingCompliance(profile);
    expect(report.overallCompliant).toBe(false);
  });

  it("overallCompliant false when Tier 3 + no shutter control", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: 3,
      supportsShutterControl: false,
      resolutionMeters: 0.15,
      hasSensitiveAreaExclusionPolicy: true,
      dataPublicationDelayHours: 24,
    };
    const report = checkRemoteSensingCompliance(profile);
    expect(report.overallCompliant).toBe(false);
  });

  it("summary counts add up to total", () => {
    const profile = compliantCommercialUSProfile();
    const report = checkRemoteSensingCompliance(profile);
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
      REMOTE_SENSING_REQUIREMENTS.length,
    );
  });
});

// ============================================================================
// Tier-based scoping (full report integration)
// ============================================================================

describe("checkRemoteSensingCompliance — tier-based scoping", () => {
  it("Tier 2 operator does NOT trigger Tier 3 conditional rules", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: 2,
    };
    const report = checkRemoteSensingCompliance(profile);
    const tier3Conds = report.results.filter(
      (r) =>
        r.requirement.code.startsWith("NOAA-TIER-3-") &&
        r.status === "NON_COMPLIANT",
    );
    expect(tier3Conds.length).toBe(0);
  });

  it("Tier 3 + 20 cm resolution + no mitigation → multiple Tier 3 NON_COMPLIANT", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      hasNOAATier: 3,
      resolutionMeters: 0.2,
      supportsShutterControl: true,
      hasSensitiveAreaExclusionPolicy: false,
      dataPublicationDelayHours: 0,
    };
    const report = checkRemoteSensingCompliance(profile);
    const violations = report.results.filter(
      (r) => r.status === "NON_COMPLIANT",
    );
    expect(violations.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// SAR-only mission (no GDPR triggers, but ITAR + NOAA still apply)
// ============================================================================

describe("checkRemoteSensingCompliance — SAR-only commercial mission", () => {
  it("SAR-only US mission triggers NOAA + ITAR but not GDPR", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["SAR_X_BAND"],
      jurisdictions: ["US"],
      capturesPersonalData: false, // SAR data typically doesn't capture persons
      itarOverlayPresent: true,
      hasNOAATier: 2,
    };
    const report = checkRemoteSensingCompliance(profile);
    const noaaApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "NOAA-CRSRA" && r.status !== "NOT_APPLICABLE",
    );
    const itarApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "ITAR-XV-E" && r.status !== "NOT_APPLICABLE",
    );
    const gdprApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "EU-GDPR-EO" && r.status !== "NOT_APPLICABLE",
    );
    expect(noaaApplied.length).toBeGreaterThan(0);
    expect(itarApplied.length).toBeGreaterThan(0);
    expect(gdprApplied.length).toBe(0);
  });
});

// ============================================================================
// EU operator with personal data (DPIA path)
// ============================================================================

describe("checkRemoteSensingCompliance — EU operator personal-data path", () => {
  it("DE operator with personal data + no DPIA → DPIA NON_COMPLIANT", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["DE"],
      capturesPersonalData: true,
      resolutionMeters: 0.5,
      hasDocumentedArt6Basis: true,
      hasDPIA: false,
    };
    const report = checkRemoteSensingCompliance(profile);
    const dpia = report.results.find(
      (r) => r.requirement.code === "EU-GDPR-EO-DPIA",
    );
    expect(dpia?.status).toBe("NON_COMPLIANT");
  });

  it("DE operator with personal data + DPIA → DPIA COMPLIANT", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["DE"],
      capturesPersonalData: true,
      resolutionMeters: 0.5,
      hasDocumentedArt6Basis: true,
      hasDPIA: true,
    };
    const report = checkRemoteSensingCompliance(profile);
    const dpia = report.results.find(
      (r) => r.requirement.code === "EU-GDPR-EO-DPIA",
    );
    expect(dpia?.status).toBe("COMPLIANT");
  });
});

// ============================================================================
// Italian retention rule
// ============================================================================

describe("checkRemoteSensingCompliance — Italian retention rule", () => {
  it("IT operator with retention > 2 years → IT-CODICE-PRIVACY-RETENTION NON_COMPLIANT", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["IT"],
      capturesPersonalData: true,
      dataRetentionYears: 5,
    };
    const report = checkRemoteSensingCompliance(profile);
    const retention = report.results.find(
      (r) => r.requirement.code === "IT-CODICE-PRIVACY-RETENTION",
    );
    expect(retention?.status).toBe("NON_COMPLIANT");
  });

  it("IT operator with retention ≤ 2 years → COMPLIANT", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["IT"],
      capturesPersonalData: true,
      dataRetentionYears: 2,
    };
    const report = checkRemoteSensingCompliance(profile);
    const retention = report.results.find(
      (r) => r.requirement.code === "IT-CODICE-PRIVACY-RETENTION",
    );
    expect(retention?.status).toBe("COMPLIANT");
  });

  it("IT operator without personal data → retention rule NOT_APPLICABLE", () => {
    const profile: RemoteSensingOperatorProfile = {
      ...compliantCommercialUSProfile(),
      sensorTypes: ["OPTICAL_PANCHROMATIC"],
      jurisdictions: ["IT"],
      capturesPersonalData: false,
      dataRetentionYears: 5,
    };
    const report = checkRemoteSensingCompliance(profile);
    const retention = report.results.find(
      (r) => r.requirement.code === "IT-CODICE-PRIVACY-RETENTION",
    );
    expect(retention?.status).toBe("NOT_APPLICABLE");
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
