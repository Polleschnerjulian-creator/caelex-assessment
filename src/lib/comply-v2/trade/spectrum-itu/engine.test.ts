/**
 * Tests for the Spectrum / ITU Coordination Compliance Engine.
 */

import { describe, expect, it } from "vitest";
import {
  checkSpectrumCompliance,
  evaluateSpectrumRequirement,
  type SatelliteSpectrumProfile,
} from "./engine";
import {
  SPECTRUM_REQUIREMENTS,
  findSpectrumEntry,
} from "@/data/trade/spectrum-itu-coordination";

// ============================================================================
// Helpers
// ============================================================================

function compliantCommercialUSProfile(): SatelliteSpectrumProfile {
  return {
    frequencyBands: ["KU_BAND", "KA_BAND"],
    orbitalRegime: "LEO",
    itnNotificationDate: "2024-01-01",
    bringingIntoUseDate: "2026-01-01",
    offAxisEirpDensityDbw4kHz: 12,
    outOfBandEmissionAttenuationDb: 65,
    crossPolarizationIsolationDb: 30,
    epfdComplianceAttested: true,
    milestone7yearDeploymentPercent: 100,
    coordinationTriggerDeltaTOverTPercent: 4,
    groundEarthStationCountries: ["US"],
    isExperimental: false,
    isAmateurBand: false,
    jurisdictions: ["US"],
    operatorType: "COMMERCIAL",
    hasNGSOSystem: true,
    antennaPatternMeetsItuR580: true,
    ituCoordinationComplete: true,
    ituNotificationFiled: true,
  };
}

// ============================================================================
// Single-requirement evaluation — threshold rules
// ============================================================================

describe("evaluateSpectrumRequirement — FCC § 25.218 EIRP density (+18 dBW/4kHz)", () => {
  const eirpRule = findSpectrumEntry("FCC-25.218-EIRP")!;

  it("COMPLIANT when EIRP density ≤ +18 dBW/4kHz", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["S_BAND"],
      offAxisEirpDensityDbw4kHz: 12,
    };
    const result = evaluateSpectrumRequirement(eirpRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when EIRP density > +18 dBW/4kHz", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["S_BAND"],
      offAxisEirpDensityDbw4kHz: 25,
    };
    const result = evaluateSpectrumRequirement(eirpRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
    expect(result.rationale).toContain("violates");
  });

  it("UNKNOWN when EIRP density is not declared", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["S_BAND"],
      offAxisEirpDensityDbw4kHz: undefined,
    };
    const result = evaluateSpectrumRequirement(eirpRule, profile);
    expect(result.status).toBe("UNKNOWN");
    expect(result.rationale).toContain("missing field");
  });

  it("NOT_APPLICABLE for non-US operator", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["S_BAND"],
      offAxisEirpDensityDbw4kHz: 12,
      jurisdictions: ["DE"], // EU only
    };
    const result = evaluateSpectrumRequirement(eirpRule, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });
});

describe("evaluateSpectrumRequirement — Cross-polarization isolation (≥27 dB)", () => {
  const xpolRule = findSpectrumEntry("ETSI-EN-301-459")!;

  it("COMPLIANT when X-pol isolation ≥ 27 dB and EU jurisdiction", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["KU_BAND"],
      crossPolarizationIsolationDb: 30,
      jurisdictions: ["DE"],
    };
    const result = evaluateSpectrumRequirement(xpolRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when X-pol isolation < 27 dB", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["KU_BAND"],
      crossPolarizationIsolationDb: 20,
      jurisdictions: ["DE"],
    };
    const result = evaluateSpectrumRequirement(xpolRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

describe("evaluateSpectrumRequirement — ITU coordination ΔT/T trigger (6%)", () => {
  const coordRule = findSpectrumEntry("ITU-RR-9-COORD")!;

  it("COMPLIANT when ΔT/T ≤ 6%", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      coordinationTriggerDeltaTOverTPercent: 4,
    };
    const result = evaluateSpectrumRequirement(coordRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when ΔT/T > 6% (coordination not completed)", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      coordinationTriggerDeltaTOverTPercent: 8,
    };
    const result = evaluateSpectrumRequirement(coordRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

describe("evaluateSpectrumRequirement — out-of-band emissions (≥60 dB)", () => {
  const oobRule = findSpectrumEntry("FCC-25-SUBPART-C")!;

  it("COMPLIANT when OOB attenuation ≥ 60 dB", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["KU_BAND"],
      outOfBandEmissionAttenuationDb: 65,
    };
    const result = evaluateSpectrumRequirement(oobRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when OOB attenuation < 60 dB", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["KU_BAND"],
      outOfBandEmissionAttenuationDb: 45,
    };
    const result = evaluateSpectrumRequirement(oobRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

// ============================================================================
// 7-year bringing-into-use deadline (special path)
// ============================================================================

describe("evaluateSpectrumRequirement — 7-year bringing-into-use deadline", () => {
  const biuRule = findSpectrumEntry("ITU-RR-RES32-BIU")!;

  it("COMPLIANT when within 7-year window (no BIU date)", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      itnNotificationDate: "2025-01-01", // 2025 + 7 = 2032; still within window
      bringingIntoUseDate: undefined,
    };
    const result = evaluateSpectrumRequirement(biuRule, profile);
    expect(result.status).toBe("COMPLIANT");
    expect(result.rationale).toContain("Within 7-year");
  });

  it("COMPLIANT when BIU attested within 7 years of notification", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      itnNotificationDate: "2018-01-01",
      bringingIntoUseDate: "2024-01-01", // 6 years later — within window
    };
    const result = evaluateSpectrumRequirement(biuRule, profile);
    expect(result.status).toBe("COMPLIANT");
    expect(result.rationale).toContain("within 7 years");
  });

  it("NON_COMPLIANT when BIU attested AFTER 7-year deadline", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      itnNotificationDate: "2015-01-01",
      bringingIntoUseDate: "2024-01-01", // 9 years later — past deadline
    };
    const result = evaluateSpectrumRequirement(biuRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
    expect(result.rationale).toContain("AFTER the 7-year deadline");
  });

  it("NON_COMPLIANT when 7+ years passed with NO BIU declared", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      itnNotificationDate: "2015-01-01",
      bringingIntoUseDate: undefined,
    };
    const result = evaluateSpectrumRequirement(biuRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
    expect(result.rationale).toContain("no bringingIntoUseDate attested");
  });

  it("UNKNOWN when itnNotificationDate is not declared", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      itnNotificationDate: undefined,
    };
    const result = evaluateSpectrumRequirement(biuRule, profile);
    expect(result.status).toBe("UNKNOWN");
    expect(result.rationale).toContain("itnNotificationDate not declared");
  });
});

// ============================================================================
// EPFD evaluation (NGSO-only)
// ============================================================================

describe("evaluateSpectrumRequirement — Article 22 EPFD (NGSO gating)", () => {
  const epfdRule = findSpectrumEntry("ITU-RR-22-EPFD-NGSO")!;

  it("COMPLIANT when EPFD attested + NGSO operator", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      orbitalRegime: "LEO",
      epfdComplianceAttested: true,
    };
    const result = evaluateSpectrumRequirement(epfdRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when EPFD not attested + NGSO operator", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      orbitalRegime: "LEO",
      epfdComplianceAttested: false,
    };
    const result = evaluateSpectrumRequirement(epfdRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("NOT_APPLICABLE for GEO satellite (EPFD is NGSO-only)", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      orbitalRegime: "GEO",
      epfdComplianceAttested: undefined,
    };
    const result = evaluateSpectrumRequirement(epfdRule, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
    expect(result.rationale).toContain("GEO");
  });

  it("UNKNOWN when EPFD attestation flag is not declared (NGSO)", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      orbitalRegime: "LEO",
      epfdComplianceAttested: undefined,
    };
    const result = evaluateSpectrumRequirement(epfdRule, profile);
    expect(result.status).toBe("UNKNOWN");
  });
});

// ============================================================================
// Amateur band path (Part 97)
// ============================================================================

describe("evaluateSpectrumRequirement — Part 97 amateur band path", () => {
  const part97 = findSpectrumEntry("FCC-97-301-AMATEUR-SAT")!;

  it("COMPLIANT for amateur operator in UHF/VHF (US)", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["UHF", "VHF"],
      isAmateurBand: true,
      operatorType: "AMATEUR",
    };
    const result = evaluateSpectrumRequirement(part97, profile);
    expect(result.status).toBe("COMPLIANT");
    expect(result.rationale).toContain("Amateur");
  });

  it("NOT_APPLICABLE when isAmateurBand is false", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["UHF", "VHF"],
      isAmateurBand: false,
      operatorType: "AMATEUR",
    };
    const result = evaluateSpectrumRequirement(part97, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("NOT_APPLICABLE for COMMERCIAL operator", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["UHF", "VHF"],
      isAmateurBand: true,
      operatorType: "COMMERCIAL",
    };
    const result = evaluateSpectrumRequirement(part97, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
    expect(result.rationale).toMatch(/AMATEUR|ACADEMIC/);
  });
});

// ============================================================================
// Experimental license path (Part 5)
// ============================================================================

describe("evaluateSpectrumRequirement — Part 5 experimental license path", () => {
  const part5 = findSpectrumEntry("FCC-PART-5-EXPERIMENTAL")!;

  it("COMPLIANT for experimental US academic mission", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      isExperimental: true,
      operatorType: "ACADEMIC",
    };
    const result = evaluateSpectrumRequirement(part5, profile);
    expect(result.status).toBe("COMPLIANT");
    expect(result.rationale).toContain("Experimental");
  });

  it("NOT_APPLICABLE when isExperimental is false", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      isExperimental: false,
      operatorType: "ACADEMIC",
    };
    const result = evaluateSpectrumRequirement(part5, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });
});

// ============================================================================
// Jurisdiction scoping
// ============================================================================

describe("evaluateSpectrumRequirement — jurisdiction scoping", () => {
  it("FCC Part 25 rules NOT_APPLICABLE for UK-only operator", () => {
    const fccSubB = findSpectrumEntry("FCC-25-SUBPART-B")!;
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      jurisdictions: ["GB"],
    };
    const result = evaluateSpectrumRequirement(fccSubB, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("BNetzA rules NOT_APPLICABLE for US-only operator", () => {
    const bnetza = findSpectrumEntry("BNETZA-TKG-91")!;
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      jurisdictions: ["US"],
    };
    const result = evaluateSpectrumRequirement(bnetza, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("ITU-RR rules apply to EVERY operator (international treaty)", () => {
    const itu5 = findSpectrumEntry("ITU-RR-5-ALLOCATION")!;
    for (const jurisdiction of ["US", "GB", "DE", "FR", "JP", "BR"]) {
      const profile: SatelliteSpectrumProfile = {
        ...compliantCommercialUSProfile(),
        jurisdictions: [jurisdiction],
      };
      const result = evaluateSpectrumRequirement(itu5, profile);
      expect(result.status).not.toBe("NOT_APPLICABLE");
    }
  });

  it("Ofcom rules apply for UK operator", () => {
    const ofcom = findSpectrumEntry("OFCOM-WTA-2006")!;
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      jurisdictions: ["GB"],
      groundEarthStationCountries: ["GB"],
      antennaPatternMeetsItuR580: true,
    };
    const result = evaluateSpectrumRequirement(ofcom, profile);
    expect(result.status).toBe("COMPLIANT");
  });
});

// ============================================================================
// Multi-jurisdiction (US + DE operator sees both regimes)
// ============================================================================

describe("checkSpectrumCompliance — multi-jurisdiction", () => {
  it("US+DE operator sees both FCC and BNetzA rules", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      jurisdictions: ["US", "DE"],
      groundEarthStationCountries: ["US", "DE"],
    };
    const report = checkSpectrumCompliance(profile);

    const fccApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "FCC-PART-25" && r.status !== "NOT_APPLICABLE",
    );
    const bnetzaApplied = report.results.filter(
      (r) => r.requirement.regime === "BNETZA" && r.status !== "NOT_APPLICABLE",
    );
    expect(fccApplied.length).toBeGreaterThan(0);
    expect(bnetzaApplied.length).toBeGreaterThan(0);
  });

  it("US-only mission does not see BNetzA rules", () => {
    const profile = compliantCommercialUSProfile();
    const report = checkSpectrumCompliance(profile);
    const bnetzaApplied = report.results.filter(
      (r) => r.requirement.regime === "BNETZA" && r.status !== "NOT_APPLICABLE",
    );
    expect(bnetzaApplied.length).toBe(0);
  });

  it("EU-only operator sees ETSI but not FCC", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      jurisdictions: ["DE"],
      groundEarthStationCountries: ["DE"],
    };
    const report = checkSpectrumCompliance(profile);
    const fccApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "FCC-PART-25" && r.status !== "NOT_APPLICABLE",
    );
    const etsiApplied = report.results.filter(
      (r) => r.requirement.regime === "ETSI" && r.status !== "NOT_APPLICABLE",
    );
    expect(fccApplied.length).toBe(0);
    expect(etsiApplied.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Full-report integration
// ============================================================================

describe("checkSpectrumCompliance — full report", () => {
  it("returns a result for every requirement in the dataset", () => {
    const profile = compliantCommercialUSProfile();
    const report = checkSpectrumCompliance(profile);
    expect(report.results.length).toBe(SPECTRUM_REQUIREMENTS.length);
  });

  it("overallCompliant true for fully-compliant LEO commercial US profile", () => {
    const profile = compliantCommercialUSProfile();
    const report = checkSpectrumCompliance(profile);
    const mandatoryViolations = report.results.filter(
      (r) =>
        r.status === "NON_COMPLIANT" &&
        r.requirement.bindingNature === "MANDATORY",
    );
    expect(mandatoryViolations.length).toBe(0);
    expect(report.overallCompliant).toBe(true);
  });

  it("overallCompliant false when EIRP density too high (FCC violation)", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["S_BAND"],
      offAxisEirpDensityDbw4kHz: 30,
    };
    const report = checkSpectrumCompliance(profile);
    expect(report.overallCompliant).toBe(false);
  });

  it("overallCompliant false when BIU past 7-year deadline", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      itnNotificationDate: "2015-01-01",
      bringingIntoUseDate: "2024-01-01", // > 7 years later
    };
    const report = checkSpectrumCompliance(profile);
    const biuResult = report.results.find(
      (r) => r.requirement.code === "ITU-RR-RES32-BIU",
    );
    expect(biuResult?.status).toBe("NON_COMPLIANT");
    expect(report.overallCompliant).toBe(false);
  });

  it("summary counts add up to total", () => {
    const profile = compliantCommercialUSProfile();
    const report = checkSpectrumCompliance(profile);
    const {
      compliantCount,
      nonCompliantCount,
      notApplicableCount,
      unknownCount,
    } = report.summary;
    expect(
      compliantCount + nonCompliantCount + notApplicableCount + unknownCount,
    ).toBe(report.summary.totalEvaluated);
    expect(report.summary.totalEvaluated).toBe(SPECTRUM_REQUIREMENTS.length);
  });
});

// ============================================================================
// EPFD compliance gating for NGSO operators (integration)
// ============================================================================

describe("checkSpectrumCompliance — EPFD NGSO gating", () => {
  it("LEO NGSO with EPFD attested → EPFD rule COMPLIANT", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      orbitalRegime: "LEO",
      epfdComplianceAttested: true,
    };
    const report = checkSpectrumCompliance(profile);
    const epfd = report.results.find(
      (r) => r.requirement.code === "ITU-RR-22-EPFD-NGSO",
    );
    expect(epfd?.status).toBe("COMPLIANT");
  });

  it("LEO NGSO without EPFD attestation → EPFD rule NON_COMPLIANT", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      orbitalRegime: "LEO",
      epfdComplianceAttested: false,
    };
    const report = checkSpectrumCompliance(profile);
    const epfd = report.results.find(
      (r) => r.requirement.code === "ITU-RR-22-EPFD-NGSO",
    );
    expect(epfd?.status).toBe("NON_COMPLIANT");
    expect(report.overallCompliant).toBe(false);
  });

  it("GEO satellite → EPFD rule NOT_APPLICABLE", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      orbitalRegime: "GEO",
    };
    const report = checkSpectrumCompliance(profile);
    const epfd = report.results.find(
      (r) => r.requirement.code === "ITU-RR-22-EPFD-NGSO",
    );
    expect(epfd?.status).toBe("NOT_APPLICABLE");
  });
});

// ============================================================================
// Band scoping
// ============================================================================

describe("checkSpectrumCompliance — band scoping", () => {
  it("L-band-only satellite does not trigger Ku-band ETSI rules", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["L_BAND"],
      jurisdictions: ["DE"],
      groundEarthStationCountries: ["DE"],
    };
    const report = checkSpectrumCompliance(profile);
    const ku459 = report.results.find(
      (r) => r.requirement.code === "ETSI-EN-301-459",
    );
    expect(ku459?.status).toBe("NOT_APPLICABLE");
  });

  it("Ku-band satellite triggers ETSI EN 301 459", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      frequencyBands: ["KU_BAND"],
      crossPolarizationIsolationDb: 30,
      jurisdictions: ["DE"],
      groundEarthStationCountries: ["DE"],
    };
    const report = checkSpectrumCompliance(profile);
    const ku459 = report.results.find(
      (r) => r.requirement.code === "ETSI-EN-301-459",
    );
    expect(ku459?.status).toBe("COMPLIANT");
  });
});

// ============================================================================
// Operator scoping
// ============================================================================

describe("checkSpectrumCompliance — operator scoping", () => {
  it("GOVERNMENT operator does not see COMMERCIAL-only rules", () => {
    const profile: SatelliteSpectrumProfile = {
      ...compliantCommercialUSProfile(),
      operatorType: "GOVERNMENT",
    };
    const report = checkSpectrumCompliance(profile);
    // Find a rule scoped only to COMMERCIAL
    const commercialOnly = SPECTRUM_REQUIREMENTS.find(
      (e) =>
        e.operatorScope.length === 1 && e.operatorScope.includes("COMMERCIAL"),
    );
    if (commercialOnly) {
      const result = report.results.find(
        (r) => r.requirement.code === commercialOnly.code,
      );
      expect(result?.status).toBe("NOT_APPLICABLE");
    }
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
