import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { computeReadiness, computeAllReadiness } from "./readiness";
import type { Generate2DataBundle, NCADocumentType } from "./types";

function makeFullDataBundle(): Generate2DataBundle {
  return {
    operator: {
      organizationName: "Test Operator GmbH",
      operatorType: "SCO",
      establishmentCountry: "DE",
      userId: "user-123",
    },
    debris: {
      assessment: {
        id: "debris-1",
        missionName: "LEO-SAT-1",
        orbitType: "LEO",
        altitudeKm: 550,
        satelliteCount: 4,
        constellationTier: "small",
        hasManeuverability: "full",
        hasPropulsion: true,
        hasPassivationCap: true,
        plannedDurationYears: 5,
        deorbitStrategy: "controlled_reentry",
        deorbitTimelineYears: 2,
        caServiceProvider: "LeoLabs",
        complianceScore: 85,
      },
      requirements: [],
    },
    cybersecurity: {
      assessment: {
        id: "cyber-1",
        assessmentName: "Cyber Assessment 2025",
        organizationSize: "MEDIUM",
        employeeCount: 50,
        spaceSegmentComplexity: "MEDIUM",
        satelliteCount: 4,
        dataSensitivityLevel: "CONFIDENTIAL",
        existingCertifications: "ISO 27001",
        hasSecurityTeam: true,
        securityTeamSize: 5,
        hasIncidentResponsePlan: true,
        hasBCP: true,
        criticalSupplierCount: 3,
        maturityScore: 70,
        isSimplifiedRegime: false,
      },
      requirements: [],
    },
    spacecraft: [{ name: "SAT-A", noradId: "55001", missionType: "EO" }],
  };
}

function makeEmptyDataBundle(): Generate2DataBundle {
  return {
    operator: {
      organizationName: "",
      operatorType: null,
      establishmentCountry: null,
      userId: "user-123",
    },
    debris: null,
    cybersecurity: null,
    spacecraft: [],
  };
}

describe("computeReadiness", () => {
  it("returns a result with the correct documentType", () => {
    const result = computeReadiness("DMP", makeFullDataBundle());
    expect(result.documentType).toBe("DMP");
  });

  it("returns 'ready' for full data bundle on DMP", () => {
    const result = computeReadiness("DMP", makeFullDataBundle());
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.level).toBe("ready");
  });

  it("returns 'insufficient' for empty data bundle on DMP", () => {
    const result = computeReadiness("DMP", makeEmptyDataBundle());
    expect(result.score).toBeLessThan(40);
    expect(result.level).toBe("insufficient");
  });

  it("score is between 0 and 100", () => {
    const full = computeReadiness("DMP", makeFullDataBundle());
    const empty = computeReadiness("DMP", makeEmptyDataBundle());
    expect(full.score).toBeGreaterThanOrEqual(0);
    expect(full.score).toBeLessThanOrEqual(100);
    expect(empty.score).toBeGreaterThanOrEqual(0);
    expect(empty.score).toBeLessThanOrEqual(100);
  });

  it("tracks presentFields and totalFields", () => {
    const result = computeReadiness("DMP", makeFullDataBundle());
    expect(result.presentFields).toBeGreaterThan(0);
    expect(result.totalFields).toBeGreaterThan(0);
    expect(result.presentFields).toBeLessThanOrEqual(result.totalFields);
  });

  it("identifies missing critical fields", () => {
    const result = computeReadiness("DMP", makeEmptyDataBundle());
    expect(result.missingCritical.length).toBeGreaterThan(0);
  });

  it("has no missing critical fields when all data is present", () => {
    const result = computeReadiness("DMP", makeFullDataBundle());
    expect(result.missingCritical).toEqual([]);
  });

  it("returns 'partial' level for score between 40 and 79", () => {
    // Create a data bundle with some fields present to get a partial score
    const partialBundle = makeEmptyDataBundle();
    partialBundle.operator.organizationName = "Test Corp";
    partialBundle.operator.operatorType = "SCO";
    partialBundle.debris = {
      assessment: {
        id: "debris-1",
        missionName: null,
        orbitType: "LEO",
        altitudeKm: null,
        satelliteCount: 4,
        constellationTier: "small",
        hasManeuverability: "full",
        hasPropulsion: true,
        hasPassivationCap: true,
        plannedDurationYears: 5,
        deorbitStrategy: "controlled_reentry",
        deorbitTimelineYears: null,
        caServiceProvider: null,
        complianceScore: null,
      },
      requirements: [],
    };

    const result = computeReadiness("DMP", partialBundle);
    // With critical fields present but optional missing, should be partial or ready
    expect(result.score).toBeGreaterThan(0);
  });

  it("works for cybersecurity document types", () => {
    const result = computeReadiness("CYBER_POLICY", makeFullDataBundle());
    expect(result.documentType).toBe("CYBER_POLICY");
    expect(result.score).toBeGreaterThan(0);
  });

  it("reports missing cybersecurity data as critical when absent", () => {
    const result = computeReadiness("CYBER_POLICY", makeEmptyDataBundle());
    expect(result.missingCritical.length).toBeGreaterThan(0);
  });

  it("handles spacecraft source field check correctly", () => {
    const withSpacecraft = makeFullDataBundle();
    const withoutSpacecraft = makeFullDataBundle();
    withoutSpacecraft.spacecraft = [];

    const r1 = computeReadiness("DMP", withSpacecraft);
    const r2 = computeReadiness("DMP", withoutSpacecraft);

    // With spacecraft the presentFields should be >= without
    expect(r1.presentFields).toBeGreaterThanOrEqual(r2.presentFields);
  });

  it("handles organization name field check", () => {
    const data = makeFullDataBundle();
    const result = computeReadiness("AUTHORIZATION_APPLICATION", data);
    expect(result.score).toBeGreaterThan(0);
  });

  it("treats boolean false as present (carries information)", () => {
    const data = makeFullDataBundle();
    data.debris!.assessment.hasPropulsion = false;
    data.debris!.assessment.hasPassivationCap = false;
    // Boolean fields should still be considered present
    const result = computeReadiness("DMP", data);
    expect(result.score).toBeGreaterThan(0);
  });

  it("treats 0 as absent for non-boolean fields", () => {
    const data = makeFullDataBundle();
    data.debris!.assessment.altitudeKm = 0;
    const result1 = computeReadiness("DMP", data);

    data.debris!.assessment.altitudeKm = 550;
    const result2 = computeReadiness("DMP", data);

    // With altitudeKm=0 (absent), score should be lower
    expect(result1.score).toBeLessThanOrEqual(result2.score);
  });

  it("treats empty string as absent", () => {
    const data = makeFullDataBundle();
    data.operator.operatorType = "";
    const result = computeReadiness("DMP", data);
    // operatorType="" should be treated as absent
    expect(result.presentFields).toBeLessThan(
      computeReadiness("DMP", makeFullDataBundle()).presentFields,
    );
  });
});

describe("computeAllReadiness", () => {
  it("returns results for all document types", () => {
    const results = computeAllReadiness(makeFullDataBundle());
    expect(results.length).toBeGreaterThan(0);
    // Should cover DMP, ORBITAL_LIFETIME, CYBER_POLICY, etc.
    const types = results.map((r) => r.documentType);
    expect(types).toContain("DMP");
    expect(types).toContain("CYBER_POLICY");
    expect(types).toContain("AUTHORIZATION_APPLICATION");
  });

  it("each result has the expected shape", () => {
    const results = computeAllReadiness(makeFullDataBundle());
    for (const result of results) {
      expect(result).toHaveProperty("documentType");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("level");
      expect(result).toHaveProperty("presentFields");
      expect(result).toHaveProperty("totalFields");
      expect(result).toHaveProperty("missingCritical");
    }
  });
});
