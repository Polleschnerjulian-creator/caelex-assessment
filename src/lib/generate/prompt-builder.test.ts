import { describe, it, expect } from "vitest";
import { buildGenerate2Prompt, buildSectionPrompt } from "./prompt-builder";
import type { Generate2DataBundle, NCADocumentType } from "./types";

function makeDataBundle(): Generate2DataBundle {
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

describe("buildGenerate2Prompt", () => {
  it("returns systemPrompt and userMessage", () => {
    const result = buildGenerate2Prompt("DMP", makeDataBundle(), "en");
    expect(result).toHaveProperty("systemPrompt");
    expect(result).toHaveProperty("userMessage");
    expect(typeof result.systemPrompt).toBe("string");
    expect(typeof result.userMessage).toBe("string");
  });

  it("systemPrompt contains base regulatory content", () => {
    const { systemPrompt } = buildGenerate2Prompt(
      "DMP",
      makeDataBundle(),
      "en",
    );
    expect(systemPrompt).toContain("EU Space Act");
  });

  it("systemPrompt contains document template content", () => {
    const { systemPrompt } = buildGenerate2Prompt(
      "DMP",
      makeDataBundle(),
      "en",
    );
    expect(systemPrompt).toContain("Debris Mitigation Plan");
  });

  it("systemPrompt contains quality rules", () => {
    const { systemPrompt } = buildGenerate2Prompt(
      "DMP",
      makeDataBundle(),
      "en",
    );
    expect(systemPrompt).toContain("Quality Rules");
  });

  it("userMessage contains operator context", () => {
    const { userMessage } = buildGenerate2Prompt("DMP", makeDataBundle(), "en");
    expect(userMessage).toContain("Test Operator GmbH");
    expect(userMessage).toContain("Document Generation Request");
  });

  it("systemPrompt layers are separated by dividers", () => {
    const { systemPrompt } = buildGenerate2Prompt(
      "DMP",
      makeDataBundle(),
      "en",
    );
    expect(systemPrompt).toContain("---");
  });

  describe("language directives", () => {
    it("adds English language directive for 'en'", () => {
      const { systemPrompt } = buildGenerate2Prompt(
        "DMP",
        makeDataBundle(),
        "en",
      );
      expect(systemPrompt).toContain("English");
    });

    it("adds German language directive for 'de'", () => {
      const { systemPrompt } = buildGenerate2Prompt(
        "DMP",
        makeDataBundle(),
        "de",
      );
      expect(systemPrompt).toContain("German");
      expect(systemPrompt).toContain("Deutsch");
    });

    it("adds French language directive for 'fr'", () => {
      const { systemPrompt } = buildGenerate2Prompt(
        "DMP",
        makeDataBundle(),
        "fr",
      );
      expect(systemPrompt).toContain("French");
      expect(systemPrompt).toContain("Fran");
    });

    it("adds Spanish language directive for 'es'", () => {
      const { systemPrompt } = buildGenerate2Prompt(
        "DMP",
        makeDataBundle(),
        "es",
      );
      expect(systemPrompt).toContain("Spanish");
    });

    it("defaults to English for unknown language codes", () => {
      const { systemPrompt } = buildGenerate2Prompt(
        "DMP",
        makeDataBundle(),
        "xx",
      );
      expect(systemPrompt).toContain("English");
    });
  });

  it("works for cybersecurity document types", () => {
    const result = buildGenerate2Prompt("CYBER_POLICY", makeDataBundle(), "en");
    expect(result.systemPrompt).toContain("Cybersecurity Policy");
    expect(result.userMessage).toContain("Cybersecurity");
  });

  it("works for general document types", () => {
    const result = buildGenerate2Prompt(
      "AUTHORIZATION_APPLICATION",
      makeDataBundle(),
      "en",
    );
    expect(result.systemPrompt.length).toBeGreaterThan(0);
    expect(result.userMessage.length).toBeGreaterThan(0);
  });
});

describe("buildSectionPrompt", () => {
  it("returns a string containing the user message", () => {
    const result = buildSectionPrompt(
      "User message here",
      1,
      "Executive Summary",
    );
    expect(result).toContain("User message here");
  });

  it("includes the section number", () => {
    const result = buildSectionPrompt("context", 3, "Mission Overview");
    expect(result).toContain("section 3");
  });

  it("includes the section title", () => {
    const result = buildSectionPrompt("context", 5, "Orbital Lifetime");
    expect(result).toContain("Orbital Lifetime");
  });

  it("includes the SECTION marker format", () => {
    const result = buildSectionPrompt("context", 1, "Cover Page");
    expect(result).toContain("## SECTION: Cover Page");
  });

  it("includes CRITICAL instruction", () => {
    const result = buildSectionPrompt("context", 1, "Test");
    expect(result).toContain("CRITICAL");
    expect(result).toContain("ONLY");
  });

  it("separates user message from section instruction with a divider", () => {
    const result = buildSectionPrompt("context", 1, "Test");
    expect(result).toContain("---");
  });
});
