import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { computeReasoningPlan } from "./reasoning-plan";
import type { Generate2DataBundle } from "./types";

function makeFullDebrisBundle(): Generate2DataBundle {
  return {
    operator: {
      organizationName: "TestSat GmbH",
      operatorType: "SCO",
      establishmentCountry: "DE",
      userId: "u1",
    },
    debris: {
      assessment: {
        id: "d1",
        missionName: "Alpha",
        orbitType: "LEO",
        altitudeKm: 550,
        satelliteCount: 3,
        constellationTier: "SMALL",
        hasManeuverability: "FULL",
        hasPropulsion: true,
        hasPassivationCap: true,
        plannedDurationYears: 7,
        deorbitStrategy: "controlled_reentry",
        deorbitTimelineYears: 5,
        caServiceProvider: "LeoLabs",
        complianceScore: 85,
      },
      requirements: [],
    },
    cybersecurity: null,
    spacecraft: [{ name: "SAT-1", noradId: "55001", missionType: "EO" }],
  };
}

function makeEmptyBundle(): Generate2DataBundle {
  return {
    operator: {
      organizationName: "Empty Corp",
      operatorType: null,
      establishmentCountry: null,
      userId: "u2",
    },
    debris: null,
    cybersecurity: null,
    spacecraft: [],
  };
}

describe("computeReasoningPlan", () => {
  it("returns a plan with sections matching section definitions", () => {
    const plan = computeReasoningPlan("DMP", makeFullDebrisBundle(), []);
    expect(plan.documentType).toBe("DMP");
    expect(plan.sections.length).toBe(11);
    expect(plan.sections[0].sectionTitle).toBe("Cover Page & Document Control");
  });

  it("assigns high confidence when all critical data is present", () => {
    const plan = computeReasoningPlan("DMP", makeFullDebrisBundle(), []);
    const section4 = plan.sections[4];
    expect(section4.confidenceLevel).toBe("high");
    expect(section4.availableData.length).toBeGreaterThan(0);
    expect(section4.missingData.length).toBe(0);
  });

  it("assigns low confidence when no assessment data exists", () => {
    const plan = computeReasoningPlan("DMP", makeEmptyBundle(), []);
    const section4 = plan.sections[4];
    expect(section4.confidenceLevel).toBe("low");
    expect(section4.missingData.length).toBeGreaterThan(0);
  });

  it("generates warnings for missing critical fields", () => {
    const plan = computeReasoningPlan("DMP", makeEmptyBundle(), []);
    const allWarnings = plan.sections.flatMap((s) => s.warnings);
    const criticalWarnings = allWarnings.filter(
      (w) => w.type === "missing_critical_data",
    );
    expect(criticalWarnings.length).toBeGreaterThan(0);
  });

  it("computes overall strategy string", () => {
    const plan = computeReasoningPlan("DMP", makeFullDebrisBundle(), []);
    expect(plan.overallStrategy).toBeTruthy();
    expect(typeof plan.overallStrategy).toBe("string");
  });

  it("estimates compliance level based on section verdicts", () => {
    const fullPlan = computeReasoningPlan("DMP", makeFullDebrisBundle(), []);
    expect(fullPlan.estimatedComplianceLevel).toBe("high");

    const emptyPlan = computeReasoningPlan("DMP", makeEmptyBundle(), []);
    expect(emptyPlan.estimatedComplianceLevel).toBe("low");
  });

  it("includes cross-references for DMP", () => {
    const plan = computeReasoningPlan("DMP", makeFullDebrisBundle(), []);
    expect(plan.crossReferences.length).toBeGreaterThan(0);
    const toTypes = plan.crossReferences.map((cr) => cr.toDocumentType);
    expect(toTypes).toContain("ORBITAL_LIFETIME");
    expect(toTypes).toContain("EOL_DISPOSAL");
  });
});
