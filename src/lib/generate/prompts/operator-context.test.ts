import { describe, it, expect } from "vitest";
import { buildOperatorContext } from "./operator-context";
import type { Generate2DataBundle, NCADocumentType } from "../types";

function makeDataBundle(
  overrides: Partial<Generate2DataBundle> = {},
): Generate2DataBundle {
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
      requirements: [
        { requirementId: "DM-001", status: "COMPLIANT", notes: "Fully met" },
      ],
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
      requirements: [
        { requirementId: "CS-001", status: "COMPLIANT", notes: null },
      ],
    },
    spacecraft: [{ name: "SAT-A", noradId: "55001", missionType: "EO" }],
    ...overrides,
  };
}

describe("buildOperatorContext", () => {
  it("returns a non-empty string for a debris document type", () => {
    const result = buildOperatorContext("DMP", makeDataBundle());
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes operator information in the output", () => {
    const result = buildOperatorContext("DMP", makeDataBundle());
    expect(result).toContain("Test Operator GmbH");
    expect(result).toContain("Satellite Constellation Operator (SCO)");
    expect(result).toContain("DE");
  });

  it("includes document generation request header", () => {
    const result = buildOperatorContext("DMP", makeDataBundle());
    expect(result).toContain("## Document Generation Request");
    expect(result).toContain("A1");
    expect(result).toContain("Debris Mitigation Plan");
  });

  it("includes debris assessment data for debris document types", () => {
    const result = buildOperatorContext("DMP", makeDataBundle());
    expect(result).toContain("## Debris Assessment Data");
    expect(result).toContain("LEO-SAT-1");
    expect(result).toContain("550 km");
    expect(result).toContain("LeoLabs");
  });

  it("includes cybersecurity assessment data for cybersecurity document types", () => {
    const result = buildOperatorContext("CYBER_POLICY", makeDataBundle());
    expect(result).toContain("## Cybersecurity Assessment Data");
    expect(result).toContain("Cyber Assessment 2025");
    expect(result).toContain("ISO 27001");
  });

  it("includes spacecraft data", () => {
    const result = buildOperatorContext("DMP", makeDataBundle());
    expect(result).toContain("## Registered Spacecraft");
    expect(result).toContain("SAT-A");
    expect(result).toContain("55001");
  });

  it("shows warning when debris data is null for debris document types", () => {
    const result = buildOperatorContext(
      "DMP",
      makeDataBundle({ debris: null }),
    );
    expect(result).toContain("WARNING");
    expect(result).toContain("No debris assessment data available");
  });

  it("shows warning when cybersecurity data is null for cyber document types", () => {
    const result = buildOperatorContext(
      "CYBER_POLICY",
      makeDataBundle({ cybersecurity: null }),
    );
    expect(result).toContain("WARNING");
    expect(result).toContain("No cybersecurity assessment data available");
  });

  it("shows placeholder for missing operator fields", () => {
    const data = makeDataBundle();
    data.operator.organizationName = "";
    data.operator.operatorType = null;
    data.operator.establishmentCountry = null;

    const result = buildOperatorContext("DMP", data);
    expect(result).toContain("[ACTION REQUIRED:");
  });

  it("handles empty spacecraft array", () => {
    const result = buildOperatorContext(
      "DMP",
      makeDataBundle({ spacecraft: [] }),
    );
    expect(result).toContain("No spacecraft registered");
  });

  it("includes requirement compliance status when requirements exist", () => {
    const result = buildOperatorContext("DMP", makeDataBundle());
    expect(result).toContain("Requirement Compliance Status");
    expect(result).toContain("DM-001");
    expect(result).toContain("COMPLIANT");
  });

  it("includes cybersecurity requirement compliance status", () => {
    const result = buildOperatorContext("CYBER_POLICY", makeDataBundle());
    expect(result).toContain("Requirement Compliance Status");
    expect(result).toContain("CS-001");
  });

  it("handles the category correctly", () => {
    const debrisResult = buildOperatorContext("DMP", makeDataBundle());
    expect(debrisResult).toContain("Debris Mitigation (Title IV)");

    const cyberResult = buildOperatorContext("CYBER_POLICY", makeDataBundle());
    expect(cyberResult).toContain("Cybersecurity (Title V)");
  });

  it("includes spacecraft data for cybersecurity types when spacecraft exist", () => {
    const result = buildOperatorContext("CYBER_POLICY", makeDataBundle());
    expect(result).toContain("## Registered Spacecraft");
    expect(result).toContain("SAT-A");
  });

  it("shows dashes for missing requirement notes", () => {
    const data = makeDataBundle();
    data.cybersecurity!.requirements = [
      { requirementId: "CS-002", status: "PARTIAL", notes: null },
    ];
    const result = buildOperatorContext("CYBER_POLICY", data);
    expect(result).toContain("CS-002");
    // The \u2014 is the em dash character
    expect(result).toContain("\u2014");
  });

  // ─── Additional branch coverage tests ──────────────────────────

  it("handles null/missing optional debris fields", () => {
    const data = makeDataBundle();
    data.debris!.assessment.missionName = null as unknown as string;
    data.debris!.assessment.altitudeKm = null as unknown as number;
    data.debris!.assessment.deorbitTimelineYears = null as unknown as number;
    data.debris!.assessment.caServiceProvider = null as unknown as string;
    data.debris!.assessment.complianceScore = null as unknown as number;
    data.debris!.requirements = [];

    const result = buildOperatorContext("DMP", data);
    expect(result).toContain("Not specified");
    expect(result).toContain("Not assessed");
    // Should NOT contain Requirement Compliance Status section
    expect(result).not.toContain("Requirement Compliance Status");
  });

  it("handles null/missing optional cybersecurity fields", () => {
    const data = makeDataBundle();
    data.cybersecurity!.assessment.assessmentName = null as unknown as string;
    data.cybersecurity!.assessment.employeeCount = null as unknown as number;
    data.cybersecurity!.assessment.satelliteCount = null as unknown as number;
    data.cybersecurity!.assessment.existingCertifications =
      null as unknown as string;
    data.cybersecurity!.assessment.hasSecurityTeam = false;
    data.cybersecurity!.assessment.securityTeamSize = null as unknown as number;
    data.cybersecurity!.assessment.hasIncidentResponsePlan = false;
    data.cybersecurity!.assessment.hasBCP = false;
    data.cybersecurity!.assessment.criticalSupplierCount =
      null as unknown as number;
    data.cybersecurity!.assessment.maturityScore = null as unknown as number;
    data.cybersecurity!.assessment.isSimplifiedRegime = true;
    data.cybersecurity!.requirements = [];

    const result = buildOperatorContext("CYBER_POLICY", data);
    expect(result).toContain("Not specified");
    expect(result).toContain("None reported");
    expect(result).toContain("N/A");
    expect(result).toContain("Not assessed");
    expect(result).toContain("Yes (Art. 10)");
    expect(result).toContain("No");
    expect(result).not.toContain("Requirement Compliance Status");
  });

  it("handles unknown operator type (passthrough)", () => {
    const data = makeDataBundle();
    data.operator.operatorType = "CUSTOM_TYPE";
    const result = buildOperatorContext("DMP", data);
    expect(result).toContain("CUSTOM_TYPE");
  });

  it("does not include spacecraft section for cyber type with empty spacecraft", () => {
    const result = buildOperatorContext(
      "CYBER_POLICY",
      makeDataBundle({ spacecraft: [] }),
    );
    // Cyber type with no spacecraft should NOT include spacecraft section
    // (category !== "debris" AND spacecraft.length === 0)
    expect(result).not.toContain("## Registered Spacecraft");
  });

  it("handles spacecraft with missing noradId and missionType", () => {
    const data = makeDataBundle();
    data.spacecraft = [
      {
        name: "SAT-B",
        noradId: null as unknown as string,
        missionType: null as unknown as string,
      },
    ];
    const result = buildOperatorContext("DMP", data);
    expect(result).toContain("Not assigned");
    expect(result).toContain("Not specified");
  });

  it("handles hasPropulsion false and hasPassivationCap false", () => {
    const data = makeDataBundle();
    data.debris!.assessment.hasPropulsion = false;
    data.debris!.assessment.hasPassivationCap = false;
    const result = buildOperatorContext("DMP", data);
    // Both should show "No"
    const noCount = (result.match(/\| No \|/g) || []).length;
    expect(noCount).toBeGreaterThanOrEqual(2);
  });
});
