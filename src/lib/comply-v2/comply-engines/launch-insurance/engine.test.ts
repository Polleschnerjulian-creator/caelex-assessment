/**
 * Tests for the Launch Insurance + Liability Compliance Engine.
 */

import { describe, expect, it } from "vitest";
import {
  checkInsuranceCompliance,
  evaluateInsuranceRequirement,
  type LaunchInsuranceProfile,
} from "./engine";
import {
  LAUNCH_INSURANCE_REQUIREMENTS,
  findInsuranceEntry,
} from "@/data/comply/launch-insurance-liability";

// ============================================================================
// Helpers
// ============================================================================

function compliantUSLaunchProfile(): LaunchInsuranceProfile {
  return {
    missionPhase: "LAUNCH",
    insuranceCoverageThirdPartyUSD: 500_000_000,
    insuranceCoveragePropertyUSD: 100_000_000,
    hasStateIndemnification: true,
    launchingStateParties: ["US"],
    jurisdictions: ["US"],
    operatorType: "COMMERCIAL",
    hasCrossWaiver: true,
    mplDeterminedUSD: 250_000_000,
    coveragePeriodStart: "2026-04-01",
    coveragePeriodEnd: "2027-04-30",
    capturedLiabilityConvention: true,
    capturedOuterSpaceTreaty: true,
    claimWindowYears: 1,
  };
}

function compliantUKLaunchProfile(): LaunchInsuranceProfile {
  return {
    missionPhase: "LAUNCH",
    insuranceCoverageThirdPartyGBP: 80_000_000,
    hasStateIndemnification: false,
    launchingStateParties: ["GB"],
    jurisdictions: ["GB"],
    operatorType: "COMMERCIAL",
    hasCrossWaiver: true,
    coveragePeriodStart: "2026-04-01",
    coveragePeriodEnd: "2027-04-30",
    capturedLiabilityConvention: true,
    capturedOuterSpaceTreaty: true,
    claimWindowYears: 1,
  };
}

function compliantFRLaunchProfile(): LaunchInsuranceProfile {
  return {
    missionPhase: "LAUNCH",
    insuranceCoverageThirdPartyEUR: 60_000_000,
    hasStateIndemnification: true,
    launchingStateParties: ["FR"],
    jurisdictions: ["FR"],
    operatorType: "COMMERCIAL",
    hasCrossWaiver: true,
    coveragePeriodStart: "2026-04-01",
    coveragePeriodEnd: "2027-04-30",
    capturedLiabilityConvention: true,
    capturedOuterSpaceTreaty: true,
    claimWindowYears: 1,
  };
}

// ============================================================================
// Threshold rule — US MPL gating (special path)
// ============================================================================

describe("evaluateInsuranceRequirement — US MPL gating", () => {
  const mplRule = findInsuranceEntry("US-CSLA-MPL")!;

  it("COMPLIANT when insurance amount ≥ MPL", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      insuranceCoverageThirdPartyUSD: 300_000_000,
      mplDeterminedUSD: 200_000_000,
    };
    const result = evaluateInsuranceRequirement(mplRule, profile);
    expect(result.status).toBe("COMPLIANT");
    expect(result.rationale).toContain("meets or exceeds MPL");
  });

  it("NON_COMPLIANT when insurance amount < MPL", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      insuranceCoverageThirdPartyUSD: 100_000_000,
      mplDeterminedUSD: 300_000_000,
    };
    const result = evaluateInsuranceRequirement(mplRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
    expect(result.rationale).toContain("BELOW MPL");
  });

  it("UNKNOWN when mplDeterminedUSD is undefined for US LAUNCH mission", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      mplDeterminedUSD: undefined,
    };
    const result = evaluateInsuranceRequirement(mplRule, profile);
    expect(result.status).toBe("UNKNOWN");
    expect(result.rationale).toContain("mplDeterminedUSD");
  });

  it("UNKNOWN when insuranceCoverageThirdPartyUSD is undefined", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      insuranceCoverageThirdPartyUSD: undefined,
    };
    const result = evaluateInsuranceRequirement(mplRule, profile);
    expect(result.status).toBe("UNKNOWN");
    expect(result.rationale).toContain("insuranceCoverageThirdPartyUSD");
  });

  it("NOT_APPLICABLE when mission phase is IN_ORBIT (MPL applies only to LAUNCH/REENTRY)", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      missionPhase: "IN_ORBIT",
    };
    const result = evaluateInsuranceRequirement(mplRule, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("NOT_APPLICABLE for UK-only operator (no US jurisdiction)", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUKLaunchProfile(),
    };
    const result = evaluateInsuranceRequirement(mplRule, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });
});

// ============================================================================
// Threshold rules — currency-aware comparisons
// ============================================================================

describe("evaluateInsuranceRequirement — UK SIA launch insurance (£60M floor)", () => {
  const ukLaunch = findInsuranceEntry("UK-SIA-LAUNCH-INS")!;

  it("COMPLIANT when GBP coverage ≥ £60M", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUKLaunchProfile(),
      insuranceCoverageThirdPartyGBP: 80_000_000,
    };
    const result = evaluateInsuranceRequirement(ukLaunch, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when GBP coverage < £60M", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUKLaunchProfile(),
      insuranceCoverageThirdPartyGBP: 40_000_000,
    };
    const result = evaluateInsuranceRequirement(ukLaunch, profile);
    expect(result.status).toBe("NON_COMPLIANT");
    expect(result.rationale).toContain("violates");
  });

  it("UNKNOWN when GBP coverage is not declared", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUKLaunchProfile(),
      insuranceCoverageThirdPartyGBP: undefined,
    };
    const result = evaluateInsuranceRequirement(ukLaunch, profile);
    expect(result.status).toBe("UNKNOWN");
    expect(result.rationale).toContain("insuranceCoverageThirdPartyGBP");
  });

  it("NOT_APPLICABLE for US-only operator", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
    };
    const result = evaluateInsuranceRequirement(ukLaunch, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });
});

describe("evaluateInsuranceRequirement — French LOA €60M cap", () => {
  const frCap = findInsuranceEntry("FR-LOA-CAP")!;

  it("COMPLIANT when EUR coverage ≥ €60M", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantFRLaunchProfile(),
      insuranceCoverageThirdPartyEUR: 60_000_000,
    };
    const result = evaluateInsuranceRequirement(frCap, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when EUR coverage < €60M", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantFRLaunchProfile(),
      insuranceCoverageThirdPartyEUR: 40_000_000,
    };
    const result = evaluateInsuranceRequirement(frCap, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

// ============================================================================
// Phase-scoped filtering
// ============================================================================

describe("evaluateInsuranceRequirement — phase scoping", () => {
  const ukInOrbit = findInsuranceEntry("UK-SIA-IN-ORBIT-INS")!;
  const ukLaunch = findInsuranceEntry("UK-SIA-LAUNCH-INS")!;

  it("UK in-orbit rule NOT_APPLICABLE for LAUNCH phase", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUKLaunchProfile(),
      missionPhase: "LAUNCH",
    };
    const result = evaluateInsuranceRequirement(ukInOrbit, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });

  it("UK in-orbit rule COMPLIANT for IN_ORBIT phase with adequate GBP coverage", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUKLaunchProfile(),
      missionPhase: "IN_ORBIT",
      insuranceCoverageThirdPartyGBP: 25_000_000,
    };
    const result = evaluateInsuranceRequirement(ukInOrbit, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("UK in-orbit rule NON_COMPLIANT for IN_ORBIT phase with sub-£20M coverage", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUKLaunchProfile(),
      missionPhase: "IN_ORBIT",
      insuranceCoverageThirdPartyGBP: 10_000_000,
    };
    const result = evaluateInsuranceRequirement(ukInOrbit, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("UK launch rule NOT_APPLICABLE for IN_ORBIT phase", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUKLaunchProfile(),
      missionPhase: "IN_ORBIT",
    };
    const result = evaluateInsuranceRequirement(ukLaunch, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
  });
});

// ============================================================================
// Liability Convention claim-window threshold
// ============================================================================

describe("evaluateInsuranceRequirement — Liability Convention claim window (1 year)", () => {
  const claimRule = findInsuranceEntry("LIAB-CONV-ART-XII-CLAIM")!;

  it("COMPLIANT when claimWindowYears ≤ 1", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      claimWindowYears: 1,
    };
    const result = evaluateInsuranceRequirement(claimRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when claimWindowYears > 1", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      claimWindowYears: 3,
    };
    const result = evaluateInsuranceRequirement(claimRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

// ============================================================================
// Treaty rules apply to ALL operators (universal scope)
// ============================================================================

describe("evaluateInsuranceRequirement — treaty rules apply universally", () => {
  it("Liability Convention Art. II applies to operators in ALL declared jurisdictions", () => {
    const artII = findInsuranceEntry("LIAB-CONV-ART-II-ABSOLUTE")!;
    for (const jurisdiction of ["US", "GB", "DE", "FR", "IT", "JP", "BR"]) {
      const profile: LaunchInsuranceProfile = {
        ...compliantUSLaunchProfile(),
        jurisdictions: [jurisdiction],
      };
      const result = evaluateInsuranceRequirement(artII, profile);
      // Liability Convention applies to LAUNCH phase per applicablePhases
      expect(result.status).not.toBe("NOT_APPLICABLE");
    }
  });

  it("OST Art. VI applies to operators across jurisdictions", () => {
    const artVI = findInsuranceEntry("OST-ART-VI")!;
    for (const jurisdiction of ["US", "GB", "DE", "FR", "JP"]) {
      const profile: LaunchInsuranceProfile = {
        ...compliantUSLaunchProfile(),
        jurisdictions: [jurisdiction],
      };
      const result = evaluateInsuranceRequirement(artVI, profile);
      expect(result.status).not.toBe("NOT_APPLICABLE");
    }
  });

  it("Liability Convention rule UNKNOWN when capturedLiabilityConvention is undefined", () => {
    const artII = findInsuranceEntry("LIAB-CONV-ART-II-ABSOLUTE")!;
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      capturedLiabilityConvention: undefined,
    };
    const result = evaluateInsuranceRequirement(artII, profile);
    expect(result.status).toBe("UNKNOWN");
  });
});

// ============================================================================
// Cross-waiver evaluation
// ============================================================================

describe("evaluateInsuranceRequirement — cross-waiver clauses", () => {
  const usCrossWaiver = findInsuranceEntry("US-CSLA-CROSS-WAIVER")!;

  it("COMPLIANT when hasCrossWaiver=true", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      hasCrossWaiver: true,
    };
    const result = evaluateInsuranceRequirement(usCrossWaiver, profile);
    expect(result.status).toBe("COMPLIANT");
    expect(result.rationale).toContain("cross-waiver");
  });

  it("NON_COMPLIANT when hasCrossWaiver=false", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      hasCrossWaiver: false,
    };
    const result = evaluateInsuranceRequirement(usCrossWaiver, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("UNKNOWN when hasCrossWaiver is undefined", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      hasCrossWaiver: undefined,
    };
    const result = evaluateInsuranceRequirement(usCrossWaiver, profile);
    expect(result.status).toBe("UNKNOWN");
  });
});

// ============================================================================
// State indemnification evaluation
// ============================================================================

describe("evaluateInsuranceRequirement — state indemnification", () => {
  const usIndemn = findInsuranceEntry("US-CSLA-GOV-INDEMNIFICATION")!;

  it("COMPLIANT when hasStateIndemnification=true", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      hasStateIndemnification: true,
    };
    const result = evaluateInsuranceRequirement(usIndemn, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when hasStateIndemnification=false", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      hasStateIndemnification: false,
    };
    const result = evaluateInsuranceRequirement(usIndemn, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

// ============================================================================
// Coverage period evaluation
// ============================================================================

describe("evaluateInsuranceRequirement — coverage period", () => {
  const coverageRule = findInsuranceEntry("US-CSLA-COVERAGE-PERIOD")!;

  it("COMPLIANT when coveragePeriodEnd > coveragePeriodStart", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      coveragePeriodStart: "2026-04-01",
      coveragePeriodEnd: "2027-04-30",
    };
    const result = evaluateInsuranceRequirement(coverageRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("NON_COMPLIANT when coveragePeriodEnd ≤ coveragePeriodStart", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      coveragePeriodStart: "2026-12-31",
      coveragePeriodEnd: "2026-01-01",
    };
    const result = evaluateInsuranceRequirement(coverageRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });

  it("UNKNOWN when coverage period dates not declared", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      coveragePeriodStart: undefined,
      coveragePeriodEnd: undefined,
    };
    const result = evaluateInsuranceRequirement(coverageRule, profile);
    expect(result.status).toBe("UNKNOWN");
  });
});

// ============================================================================
// Operator-type scoping
// ============================================================================

describe("evaluateInsuranceRequirement — operator scoping", () => {
  it("GOVERNMENT operator does not see COMMERCIAL-only rules", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      operatorType: "GOVERNMENT",
    };
    // Most national entries are scoped to COMMERCIAL + ACADEMIC; GOV is excluded
    const usMpl = findInsuranceEntry("US-CSLA-MPL")!;
    const result = evaluateInsuranceRequirement(usMpl, profile);
    expect(result.status).toBe("NOT_APPLICABLE");
    expect(result.rationale).toMatch(/COMMERCIAL|ACADEMIC/);
  });

  it("Treaty rules apply to ALL operator types (including GOVERNMENT)", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      operatorType: "GOVERNMENT",
    };
    const artII = findInsuranceEntry("LIAB-CONV-ART-II-ABSOLUTE")!;
    const result = evaluateInsuranceRequirement(artII, profile);
    expect(result.status).not.toBe("NOT_APPLICABLE");
  });
});

// ============================================================================
// Multi-jurisdiction (UK + US operator sees both regimes)
// ============================================================================

describe("checkInsuranceCompliance — multi-jurisdiction", () => {
  it("US+GB operator sees both US-CSLA and UK-SIA rules", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      jurisdictions: ["US", "GB"],
      insuranceCoverageThirdPartyGBP: 80_000_000,
    };
    const report = checkInsuranceCompliance(profile);
    const usApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "US-CSLA" && r.status !== "NOT_APPLICABLE",
    );
    const ukApplied = report.results.filter(
      (r) => r.requirement.regime === "UK-SIA" && r.status !== "NOT_APPLICABLE",
    );
    expect(usApplied.length).toBeGreaterThan(0);
    expect(ukApplied.length).toBeGreaterThan(0);
  });

  it("US-only mission does not see UK or French rules", () => {
    const profile = compliantUSLaunchProfile();
    const report = checkInsuranceCompliance(profile);
    const ukApplied = report.results.filter(
      (r) => r.requirement.regime === "UK-SIA" && r.status !== "NOT_APPLICABLE",
    );
    const frApplied = report.results.filter(
      (r) => r.requirement.regime === "FR-LOA" && r.status !== "NOT_APPLICABLE",
    );
    expect(ukApplied.length).toBe(0);
    expect(frApplied.length).toBe(0);
  });

  it("French operator sees FR-LOA + EU Space Act (proposed)", () => {
    const profile = compliantFRLaunchProfile();
    const report = checkInsuranceCompliance(profile);
    const frApplied = report.results.filter(
      (r) => r.requirement.regime === "FR-LOA" && r.status !== "NOT_APPLICABLE",
    );
    const euApplied = report.results.filter(
      (r) =>
        r.requirement.regime === "EU-SPACE-ACT" &&
        r.status !== "NOT_APPLICABLE",
    );
    expect(frApplied.length).toBeGreaterThan(0);
    expect(euApplied.length).toBeGreaterThan(0);
  });

  it("Treaty rules visible to every jurisdictional operator", () => {
    for (const jurisdiction of ["US", "GB", "FR", "DE", "IT", "JP"]) {
      const profile: LaunchInsuranceProfile = {
        ...compliantUSLaunchProfile(),
        jurisdictions: [jurisdiction],
      };
      const report = checkInsuranceCompliance(profile);
      const treatyApplied = report.results.filter(
        (r) =>
          (r.requirement.regime === "LIABILITY_CONVENTION" ||
            r.requirement.regime === "OST_VI_VII") &&
          r.status !== "NOT_APPLICABLE",
      );
      expect(treatyApplied.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Full-report integration
// ============================================================================

describe("checkInsuranceCompliance — full report", () => {
  it("returns a result for every requirement in the dataset", () => {
    const profile = compliantUSLaunchProfile();
    const report = checkInsuranceCompliance(profile);
    expect(report.results.length).toBe(LAUNCH_INSURANCE_REQUIREMENTS.length);
  });

  it("overallCompliant true for fully-compliant US LAUNCH profile", () => {
    const profile = compliantUSLaunchProfile();
    const report = checkInsuranceCompliance(profile);
    const mandatoryViolations = report.results.filter(
      (r) =>
        r.status === "NON_COMPLIANT" &&
        (r.requirement.bindingNature === "MANDATORY" ||
          r.requirement.bindingNature === "TREATY"),
    );
    expect(mandatoryViolations.length).toBe(0);
    expect(report.overallCompliant).toBe(true);
  });

  it("overallCompliant false when insurance < MPL (US violation)", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      insuranceCoverageThirdPartyUSD: 50_000_000,
      mplDeterminedUSD: 300_000_000,
    };
    const report = checkInsuranceCompliance(profile);
    expect(report.overallCompliant).toBe(false);
    const mplResult = report.results.find(
      (r) => r.requirement.code === "US-CSLA-MPL",
    );
    expect(mplResult?.status).toBe("NON_COMPLIANT");
  });

  it("overallCompliant false when UK launch coverage below £60M", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUKLaunchProfile(),
      insuranceCoverageThirdPartyGBP: 30_000_000,
    };
    const report = checkInsuranceCompliance(profile);
    expect(report.overallCompliant).toBe(false);
  });

  it("summary counts add up to total", () => {
    const profile = compliantUSLaunchProfile();
    const report = checkInsuranceCompliance(profile);
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
      LAUNCH_INSURANCE_REQUIREMENTS.length,
    );
  });

  it("PROPOSED rules NON_COMPLIANT do not break overallCompliant (proposed rules are non-binding)", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantFRLaunchProfile(),
      // EU Art. 40 €100M floor is PROPOSED — even a "violation" doesn't
      // block overall compliance (only MANDATORY + TREATY do)
      insuranceCoverageThirdPartyEUR: 70_000_000, // satisfies FR €60M but below EU €100M
    };
    const report = checkInsuranceCompliance(profile);
    const euFloor = report.results.find(
      (r) => r.requirement.code === "EU-SA-ART-40-MIN-3P",
    );
    // EU floor may be NON_COMPLIANT but doesn't break overall (PROPOSED)
    expect(euFloor?.status).toBe("NON_COMPLIANT");
    expect(report.overallCompliant).toBe(true);
  });
});

// ============================================================================
// Joint liability evaluation (Art. V)
// ============================================================================

describe("evaluateInsuranceRequirement — joint liability (Art. V)", () => {
  const jointRule = findInsuranceEntry("LIAB-CONV-ART-V-JOINT")!;

  it("COMPLIANT when single launching State declared", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      launchingStateParties: ["US"],
    };
    const result = evaluateInsuranceRequirement(jointRule, profile);
    expect(result.status).toBe("COMPLIANT");
    expect(result.rationale).toContain("Single launching State");
  });

  it("COMPLIANT when multiple co-launching States declared", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      launchingStateParties: ["FR", "DE", "IT"],
    };
    const result = evaluateInsuranceRequirement(jointRule, profile);
    expect(result.status).toBe("COMPLIANT");
    expect(result.rationale).toContain("co-launching States");
  });

  it("UNKNOWN when launchingStateParties is empty", () => {
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      launchingStateParties: [],
    };
    const result = evaluateInsuranceRequirement(jointRule, profile);
    expect(result.status).toBe("UNKNOWN");
  });
});

// ============================================================================
// Reentry phase scoping
// ============================================================================

describe("evaluateInsuranceRequirement — REENTRY phase", () => {
  it("US MPL gating applies to REENTRY phase too", () => {
    const mplRule = findInsuranceEntry("US-CSLA-MPL")!;
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      missionPhase: "REENTRY",
      insuranceCoverageThirdPartyUSD: 150_000_000,
      mplDeterminedUSD: 100_000_000,
    };
    const result = evaluateInsuranceRequirement(mplRule, profile);
    expect(result.status).toBe("COMPLIANT");
  });

  it("US MPL gating NON_COMPLIANT on REENTRY phase with insufficient coverage", () => {
    const mplRule = findInsuranceEntry("US-CSLA-MPL")!;
    const profile: LaunchInsuranceProfile = {
      ...compliantUSLaunchProfile(),
      missionPhase: "REENTRY",
      insuranceCoverageThirdPartyUSD: 50_000_000,
      mplDeterminedUSD: 200_000_000,
    };
    const result = evaluateInsuranceRequirement(mplRule, profile);
    expect(result.status).toBe("NON_COMPLIANT");
  });
});

// ============================================================================
// Sanity invariants
// ============================================================================

describe("checkInsuranceCompliance — sanity invariants", () => {
  it("UNKNOWN-heavy profile (empty optional fields) does not crash", () => {
    const minimal: LaunchInsuranceProfile = {
      missionPhase: "LAUNCH",
      launchingStateParties: [],
      jurisdictions: [],
      operatorType: "COMMERCIAL",
    };
    const report = checkInsuranceCompliance(minimal);
    // Should not throw and should return a result per requirement
    expect(report.results.length).toBe(LAUNCH_INSURANCE_REQUIREMENTS.length);
  });

  it("US LAUNCH overall-compliant profile contains an MPL COMPLIANT result", () => {
    const profile = compliantUSLaunchProfile();
    const report = checkInsuranceCompliance(profile);
    const mpl = report.results.find(
      (r) => r.requirement.code === "US-CSLA-MPL",
    );
    expect(mpl?.status).toBe("COMPLIANT");
  });

  it("French operator sees FR-LOA-CAP COMPLIANT when €60M coverage exactly", () => {
    const profile = compliantFRLaunchProfile();
    const report = checkInsuranceCompliance(profile);
    const frCap = report.results.find(
      (r) => r.requirement.code === "FR-LOA-CAP",
    );
    expect(frCap?.status).toBe("COMPLIANT");
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
