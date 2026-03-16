import { describe, it, expect } from "vitest";
import { buildSectionPromptWithPlan } from "./reasoning-prompt";
import type { SectionPlan } from "./reasoning-types";

const mockSectionPlan: SectionPlan = {
  sectionIndex: 4,
  sectionTitle: "Orbital Lifetime Analysis (25-Year Rule)",
  availableData: [
    {
      source: "debris",
      field: "altitudeKm",
      value: 550,
      articleRef: "Art. 72(2)",
    },
    {
      source: "debris",
      field: "orbitType",
      value: "LEO",
      articleRef: "Art. 72",
    },
  ],
  missingData: [],
  complianceVerdict: "compliant",
  confidenceLevel: "high",
  verdictRationale: "All fields present.",
  writingStrategy:
    "Present definitive compliance claim with evidence references.",
  warnings: [],
  estimatedActionRequired: 0,
};

describe("buildSectionPromptWithPlan", () => {
  it("includes the section plan block in the prompt", () => {
    const prompt = buildSectionPromptWithPlan(
      "Some operator context",
      5,
      "Orbital Lifetime Analysis (25-Year Rule)",
      mockSectionPlan,
    );
    expect(prompt).toContain("SECTION PLAN");
    expect(prompt).toContain("COMPLIANT");
    expect(prompt).toContain("altitudeKm");
    expect(prompt).toContain("550");
  });

  it("includes cross-reference instructions when provided", () => {
    const prompt = buildSectionPromptWithPlan(
      "Some context",
      5,
      "Title",
      mockSectionPlan,
      [
        {
          toDocumentType: "EOL_DISPOSAL",
          toSection: 4,
          description: "Disposal delta-V",
        },
      ],
    );
    expect(prompt).toContain("EOL_DISPOSAL");
    expect(prompt).toContain("Section 4");
  });

  it("falls back to standard prompt when no plan provided", () => {
    const prompt = buildSectionPromptWithPlan("Context", 5, "Title", null);
    expect(prompt).toContain("ONLY section 5");
    expect(prompt).not.toContain("SECTION PLAN");
  });

  it("includes missing data in the prompt", () => {
    const planWithMissing: SectionPlan = {
      ...mockSectionPlan,
      missingData: [
        {
          source: "debris",
          field: "dragCoefficient",
          weight: 2,
          articleRef: "Art. 72",
          defaultAssumption: "Cd=2.2",
        },
      ],
    };
    const prompt = buildSectionPromptWithPlan(
      "Context",
      5,
      "Title",
      planWithMissing,
    );
    expect(prompt).toContain("Missing");
    expect(prompt).toContain("dragCoefficient");
  });

  it("includes warnings in the prompt", () => {
    const planWithWarnings: SectionPlan = {
      ...mockSectionPlan,
      warnings: [
        {
          type: "default_assumption",
          message: "Using default Cd=2.2",
          actionable: true,
          suggestion: null,
        },
      ],
    };
    const prompt = buildSectionPromptWithPlan(
      "Context",
      5,
      "Title",
      planWithWarnings,
    );
    expect(prompt).toContain("Using default Cd=2.2");
  });

  it("includes package context when provided", () => {
    const prompt = buildSectionPromptWithPlan(
      "Context",
      5,
      "Title",
      mockSectionPlan,
      undefined,
      "CROSS-REFERENCE DATA: Document A2 confirmed 25-year compliance",
    );
    expect(prompt).toContain("CROSS-REFERENCE DATA");
    expect(prompt).toContain("25-year compliance");
  });
});
