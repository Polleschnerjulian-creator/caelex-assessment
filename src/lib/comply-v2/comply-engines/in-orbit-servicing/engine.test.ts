/**
 * Tests for the In-Orbit Servicing / RPO Compliance Engine.
 */

import { describe, expect, it } from "vitest";
import {
  checkIosCompliance,
  deriveOperationalRegime,
  evaluateIosRequirement,
  type IosMissionProfile,
} from "./engine";
import {
  IOS_RPO_REQUIREMENTS,
  findIosEntry,
} from "@/data/comply/in-orbit-servicing-rpo";

// ============================================================================
// Helpers
// ============================================================================

function compliantLeoServicingUS(): IosMissionProfile {
  return {
    missionType: "SERVICING",
    targetSpacecraftConsent: true,
    abortCapability: true,
    proximityRangeMeters: 5,
    finalApproachClosingVelocityMps: 1.5,
    altitudeKm: 550,
    jurisdictions: ["US"],
    operatorType: "COMMERCIAL",
    insuranceCoverageMillionUSD: 150,
    communicationsLinkRedundancy: 3,
    inspectionPhaseHours: 48,
    regulatorNotificationLeadTimeHours: 48,
    rfSpectrumCoordinationComplete: true,
    captureMechanismQualified: true,
    multiSensorDockingVerification: true,
    exportControlReviewComplete: true,
    debrisMitigationDocumented: true,
  };
}

// ============================================================================
// Operational regime derivation
// ============================================================================

describe("deriveOperationalRegime", () => {
  it("returns LEO for low altitudes", () => {
    expect(deriveOperationalRegime(400)).toBe("LEO");
    expect(deriveOperationalRegime(550)).toBe("LEO");
    expect(deriveOperationalRegime(2000)).toBe("LEO");
  });

  it("returns MEO for medium altitudes", () => {
    expect(deriveOperationalRegime(2001)).toBe("MEO");
    expect(deriveOperationalRegime(20000)).toBe("MEO");
  });

  it("returns GEO around 35,786 km", () => {
    expect(deriveOperationalRegime(35786)).toBe("GEO");
    expect(deriveOperationalRegime(35900)).toBe("GEO");
    expect(deriveOperationalRegime(35600)).toBe("GEO");
  });

  it("returns HEO above GEO", () => {
    expect(deriveOperationalRegime(40000)).toBe("HEO");
    expect(deriveOperationalRegime(100000)).toBe("HEO");
  });

  it("returns CISLUNAR for lunar transfer altitudes", () => {
    expect(deriveOperationalRegime(400000)).toBe("CISLUNAR");
  });

  it("returns undefined for missing altitude", () => {
    expect(deriveOperationalRegime(undefined)).toBeUndefined();
  });
});

// ============================================================================
// Single-requirement evaluation — threshold rules
// ============================================================================

describe("evaluateIosRequirement — CONFERS BP-2 (2 m/s closing velocity)", () => {
  const bp2 = findIosEntry("CONFERS-BP-2")!;

  it("COMPLIANT when closing velocity ≤ 2 m/s", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      finalApproachClosingVelocityMps: 1.5,
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(bp2, mission);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when closing velocity > 2 m/s", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      finalApproachClosingVelocityMps: 3.5,
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(bp2, mission);
    expect(result.status).toBe("NON_COMPLIANT");
    expect(result.rationale).toContain("violates");
  });

  it("UNKNOWN when closing velocity is not declared", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(bp2, mission);
    expect(result.status).toBe("UNKNOWN");
    expect(result.rationale).toContain("missing field");
  });
});

describe("evaluateIosRequirement — FAA insurance ($100M floor)", () => {
  const faaIns = findIosEntry("FAA-AST-450-LIABILITY")!;

  it("COMPLIANT when coverage ≥ $100M USD", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      insuranceCoverageMillionUSD: 150,
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(faaIns, mission);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when coverage < $100M USD", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      insuranceCoverageMillionUSD: 50,
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(faaIns, mission);
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("NOT_APPLICABLE for non-US operator", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      insuranceCoverageMillionUSD: 150,
      altitudeKm: 550,
      jurisdictions: ["DE"], // EU only
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(faaIns, mission);
    expect(result.status).toBe("NOT_APPLICABLE");
    expect(result.rationale).toContain("not binding");
  });
});

describe("evaluateIosRequirement — CONFERS BP-5 (3 redundant comm links)", () => {
  const bp5 = findIosEntry("CONFERS-BP-5")!;

  it("COMPLIANT when redundancy ≥ 3", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      communicationsLinkRedundancy: 3,
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(bp5, mission);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when redundancy < 3", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      communicationsLinkRedundancy: 2,
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(bp5, mission);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

describe("evaluateIosRequirement — UK CAA 24h notification", () => {
  const ukNotify = findIosEntry("UK-CAA-IOA-REG-26")!;

  it("COMPLIANT when lead time ≥ 24h and UK jurisdiction", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      regulatorNotificationLeadTimeHours: 36,
      altitudeKm: 550,
      jurisdictions: ["GB"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(ukNotify, mission);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when lead time < 24h", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      regulatorNotificationLeadTimeHours: 8,
      altitudeKm: 550,
      jurisdictions: ["GB"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(ukNotify, mission);
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("NOT_APPLICABLE for non-UK operator", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      regulatorNotificationLeadTimeHours: 36,
      altitudeKm: 550,
      jurisdictions: ["US"], // FCC + FAA, not UK
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(ukNotify, mission);
    expect(result.status).toBe("NOT_APPLICABLE");
  });
});

// ============================================================================
// Single-requirement evaluation — qualitative rules
// ============================================================================

describe("evaluateIosRequirement — client consent (qualitative)", () => {
  const fccClient = findIosEntry("FCC-ISAM-25.114-CLIENT")!;

  it("COMPLIANT when consent is documented", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      targetSpacecraftConsent: true,
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(fccClient, mission);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when consent is not documented", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      targetSpacecraftConsent: false,
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(fccClient, mission);
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("UNKNOWN when consent status not declared", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(fccClient, mission);
    expect(result.status).toBe("UNKNOWN");
  });

  it("COMPLIANT for ACTIVE_DEBRIS_REMOVAL even without consent flag", () => {
    const mission: IosMissionProfile = {
      missionType: "ACTIVE_DEBRIS_REMOVAL",
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(fccClient, mission);
    expect(result.status).toBe("COMPLIANT");
    expect(result.rationale).toContain("debris-removal");
  });
});

describe("evaluateIosRequirement — abort capability (qualitative)", () => {
  const nasaAbort = findIosEntry("NASA-OS-DM-6.1")!;

  it("COMPLIANT when abort capability is declared for GOVERNMENT mission", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      abortCapability: true,
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "GOVERNMENT",
    };
    const result = evaluateIosRequirement(nasaAbort, mission);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when abort capability is missing", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      abortCapability: false,
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "GOVERNMENT",
    };
    const result = evaluateIosRequirement(nasaAbort, mission);
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("NOT_APPLICABLE for COMMERCIAL operator (NASA OS-DM is GOVERNMENT-scoped)", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      abortCapability: true,
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(nasaAbort, mission);
    expect(result.status).toBe("NOT_APPLICABLE");
    expect(result.rationale).toContain("GOVERNMENT");
  });
});

// ============================================================================
// Operational regime scoping
// ============================================================================

describe("evaluateIosRequirement — operational regime scoping", () => {
  const darpaInspect = findIosEntry("DARPA-RSGS-INSPECTION")!;

  it("DARPA RSGS inspection rule NOT_APPLICABLE for LEO mission", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      inspectionPhaseHours: 48,
      altitudeKm: 550, // LEO
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(darpaInspect, mission);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("DARPA RSGS inspection rule COMPLIANT at GEO with 48h inspection", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      inspectionPhaseHours: 48,
      altitudeKm: 35786, // GEO
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(darpaInspect, mission);
    expect(result.status).toBe("COMPLIANT");
  });

  it("DARPA RSGS inspection rule NON_COMPLIANT at GEO with 12h inspection", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      inspectionPhaseHours: 12,
      altitudeKm: 35786,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(darpaInspect, mission);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

// ============================================================================
// Jurisdiction scoping
// ============================================================================

describe("evaluateIosRequirement — jurisdiction scoping", () => {
  it("FCC ISAM rules NOT_APPLICABLE for UK-only operator", () => {
    const fccServicer = findIosEntry("FCC-ISAM-25.114-SERVICER")!;
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      altitudeKm: 550,
      jurisdictions: ["GB"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(fccServicer, mission);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("METI rules NOT_APPLICABLE for US-only operator", () => {
    const metiLicense = findIosEntry("JAXA-METI-LICENSE")!;
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      altitudeKm: 550,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const result = evaluateIosRequirement(metiLicense, mission);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("ESA-RAMSES rules in scope for EU operators", () => {
    const esaCapture = findIosEntry("ESA-RAMSES-CAPTURE")!;
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      captureMechanismQualified: true,
      altitudeKm: 550,
      jurisdictions: ["DE"],
      operatorType: "GOVERNMENT",
    };
    const result = evaluateIosRequirement(esaCapture, mission);
    expect(result.status).toBe("COMPLIANT");
  });
});

// ============================================================================
// Full-report integration
// ============================================================================

describe("checkIosCompliance — full report", () => {
  it("returns a result for every requirement in the dataset", () => {
    const mission = compliantLeoServicingUS();
    const report = checkIosCompliance(mission);
    expect(report.results.length).toBe(IOS_RPO_REQUIREMENTS.length);
  });

  it("overallCompliant true for fully-compliant LEO commercial US profile", () => {
    const mission = compliantLeoServicingUS();
    const report = checkIosCompliance(mission);
    const mandatoryViolations = report.results.filter(
      (r) =>
        r.status === "NON_COMPLIANT" &&
        r.requirement.bindingNature === "MANDATORY",
    );
    expect(mandatoryViolations.length).toBe(0);
    expect(report.overallCompliant).toBe(true);
  });

  it("overallCompliant false when insurance < $100M (FAA violation)", () => {
    const mission = compliantLeoServicingUS();
    mission.insuranceCoverageMillionUSD = 50;
    const report = checkIosCompliance(mission);
    expect(report.overallCompliant).toBe(false);
  });

  it("overallCompliant false when client consent missing on cooperative mission", () => {
    const mission = compliantLeoServicingUS();
    mission.targetSpacecraftConsent = false;
    const report = checkIosCompliance(mission);
    // FCC + UK + ESA rules around CLIENT_CONSENT are MANDATORY; for a US-
    // only profile, the FCC consent rule should fire NON_COMPLIANT.
    const consentViolations = report.results.filter(
      (r) =>
        r.requirement.category === "CLIENT_CONSENT" &&
        r.status === "NON_COMPLIANT" &&
        r.requirement.bindingNature === "MANDATORY",
    );
    expect(consentViolations.length).toBeGreaterThan(0);
    expect(report.overallCompliant).toBe(false);
  });

  it("summary counts add up to total", () => {
    const mission = compliantLeoServicingUS();
    const report = checkIosCompliance(mission);
    const {
      compliantCount,
      nonCompliantCount,
      notApplicableCount,
      unknownCount,
    } = report.summary;
    expect(
      compliantCount + nonCompliantCount + notApplicableCount + unknownCount,
    ).toBe(report.summary.totalEvaluated);
    expect(report.summary.totalEvaluated).toBe(IOS_RPO_REQUIREMENTS.length);
  });
});

describe("checkIosCompliance — multi-jurisdiction", () => {
  it("US+UK operator sees both FCC and UK-CAA rules", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      targetSpacecraftConsent: true,
      abortCapability: true,
      finalApproachClosingVelocityMps: 1.5,
      altitudeKm: 550,
      jurisdictions: ["US", "GB"],
      operatorType: "COMMERCIAL",
      insuranceCoverageMillionUSD: 150,
      regulatorNotificationLeadTimeHours: 48,
    };
    const report = checkIosCompliance(mission);
    const fccApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "FCC-ISAM" && r.status !== "NOT_APPLICABLE",
    );
    const ukApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "UK-CAA-IOA" && r.status !== "NOT_APPLICABLE",
    );
    expect(fccApplied.length).toBeGreaterThan(0);
    expect(ukApplied.length).toBeGreaterThan(0);
  });

  it("US-only mission does not see UK CAA rules", () => {
    const mission = compliantLeoServicingUS();
    const report = checkIosCompliance(mission);
    const ukApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "UK-CAA-IOA" && r.status !== "NOT_APPLICABLE",
    );
    expect(ukApplied.length).toBe(0);
  });

  it("EU-only operator sees ESA but not FCC/FAA/METI", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      targetSpacecraftConsent: true,
      altitudeKm: 550,
      jurisdictions: ["DE"],
      operatorType: "GOVERNMENT",
      captureMechanismQualified: true,
      debrisMitigationDocumented: true,
    };
    const report = checkIosCompliance(mission);
    const fccApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "FCC-ISAM" && r.status !== "NOT_APPLICABLE",
    );
    const esaApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "ESA-RAMSES" && r.status !== "NOT_APPLICABLE",
    );
    const metiApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "JAXA-METI" && r.status !== "NOT_APPLICABLE",
    );
    expect(fccApplied.length).toBe(0);
    expect(esaApplied.length).toBeGreaterThan(0);
    expect(metiApplied.length).toBe(0);
  });
});

describe("checkIosCompliance — operational regime override", () => {
  it("explicit operationalRegime takes precedence over altitudeKm", () => {
    const mission: IosMissionProfile = {
      missionType: "SERVICING",
      altitudeKm: 550, // would be LEO
      operationalRegime: "GEO", // overridden to GEO
      inspectionPhaseHours: 48,
      jurisdictions: ["US"],
      operatorType: "COMMERCIAL",
    };
    const report = checkIosCompliance(mission);
    // DARPA RSGS inspection rule is GEO-only; should apply now.
    const darpaInspect = report.results.find(
      (r) => r.requirement.code === "DARPA-RSGS-INSPECTION",
    );
    expect(darpaInspect?.status).toBe("COMPLIANT");
  });
});

describe("checkIosCompliance — ADR (Active Debris Removal) special path", () => {
  it("ADR mission satisfies CLIENT_CONSENT requirements via regulator path", () => {
    const mission: IosMissionProfile = {
      missionType: "ACTIVE_DEBRIS_REMOVAL",
      abortCapability: true,
      altitudeKm: 550,
      jurisdictions: ["GB"],
      operatorType: "COMMERCIAL",
      insuranceCoverageMillionUSD: 150,
      regulatorNotificationLeadTimeHours: 48,
      // targetSpacecraftConsent intentionally omitted — ADR uses
      // regulator-authorisation path instead.
    };
    const report = checkIosCompliance(mission);
    const consentResults = report.results.filter(
      (r) =>
        r.requirement.category === "CLIENT_CONSENT" &&
        r.status !== "NOT_APPLICABLE",
    );
    // For UK jurisdiction, UK-CAA-IOA-REG-23 (CLIENT_CONSENT) should be in scope
    expect(consentResults.length).toBeGreaterThan(0);
    // For an ADR mission, all in-scope CLIENT_CONSENT rules report COMPLIANT
    // via the regulator-authorisation path
    for (const result of consentResults) {
      expect(result.status).toBe("COMPLIANT");
      expect(result.rationale).toContain("debris-removal");
    }
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
