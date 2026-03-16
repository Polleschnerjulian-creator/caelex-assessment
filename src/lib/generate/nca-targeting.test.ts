import { describe, it, expect } from "vitest";
import { applyNCATargeting } from "./nca-targeting";
import type { ReasoningPlan } from "./reasoning-types";
import type { NCAProfile } from "@/data/nca-profiles";

const basePlan: ReasoningPlan = {
  documentType: "DMP",
  targetNCA: null,
  overallStrategy: "Strong data profile",
  estimatedComplianceLevel: "high",
  userModified: false,
  crossReferences: [],
  sections: [
    {
      sectionIndex: 0,
      sectionTitle: "Cover Page",
      availableData: [],
      missingData: [],
      complianceVerdict: "not_applicable",
      confidenceLevel: "high",
      verdictRationale: "Cover page",
      writingStrategy: "Standard cover page",
      warnings: [],
      estimatedActionRequired: 0,
    },
    {
      sectionIndex: 4,
      sectionTitle: "Orbital Lifetime Analysis (25-Year Rule)",
      availableData: [
        {
          source: "debris",
          field: "altitudeKm",
          value: 550,
          articleRef: "Art. 72(2)",
        },
      ],
      missingData: [],
      complianceVerdict: "compliant",
      confidenceLevel: "high",
      verdictRationale: "All fields present",
      writingStrategy: "Present definitive compliance claim",
      warnings: [],
      estimatedActionRequired: 0,
    },
  ],
};

const cnesProfile: NCAProfile = {
  id: "cnes",
  name: "CNES (France)",
  country: "FR",
  language: "fr",
  executiveSummaryLanguage: "fr",
  rigor: { debris: 5, cybersecurity: 3, general: 4, safety: 5 },
  focusAreas: [
    {
      articleRange: "Art. 72",
      weight: "critical",
      description:
        "Detailed orbital lifetime analysis with STELA/DRAMA validation",
    },
  ],
  preferredStandards: ["ISO 24113:2019", "CNES LOS"],
  preferredEvidence: [],
  documentGuidance: {
    DMP: {
      depthExpectation: "extensive",
      specificRequirements: [
        "Include French-language executive summary",
        "CNES expects STELA tool output",
      ],
      commonRejectionReasons: ["Insufficient orbital lifetime analysis (34%)"],
    },
  },
};

describe("applyNCATargeting", () => {
  it("adds nca_specific warnings from document guidance", () => {
    const result = applyNCATargeting(basePlan, cnesProfile);
    const allWarnings = result.sections.flatMap((s) => s.warnings);
    const ncaWarnings = allWarnings.filter((w) => w.type === "nca_specific");
    expect(ncaWarnings.length).toBeGreaterThan(0);
    expect(ncaWarnings.some((w) => w.message.includes("French-language"))).toBe(
      true,
    );
  });

  it("adds rejection reason warnings", () => {
    const result = applyNCATargeting(basePlan, cnesProfile);
    const allWarnings = result.sections.flatMap((s) => s.warnings);
    expect(allWarnings.some((w) => w.message.includes("rejection"))).toBe(true);
  });

  it("modifies writing strategy for extensive depth documents", () => {
    const result = applyNCATargeting(basePlan, cnesProfile);
    // At least one section should have strategy modified for extensive depth
    const hasExtensiveNote = result.sections.some(
      (s) =>
        s.writingStrategy.includes("maximum detail") ||
        s.writingStrategy.includes("extensive"),
    );
    expect(hasExtensiveNote).toBe(true);
  });

  it("sets targetNCA on the plan", () => {
    const result = applyNCATargeting(basePlan, cnesProfile);
    expect(result.targetNCA).toBe("cnes");
  });

  it("does not mutate the original plan", () => {
    const originalWarningCount = basePlan.sections.flatMap(
      (s) => s.warnings,
    ).length;
    applyNCATargeting(basePlan, cnesProfile);
    const afterWarningCount = basePlan.sections.flatMap(
      (s) => s.warnings,
    ).length;
    expect(afterWarningCount).toBe(originalWarningCount);
  });

  it("adds high-scrutiny warning for categories with rigor >= 4", () => {
    const result = applyNCATargeting(basePlan, cnesProfile);
    // DMP is a debris document, CNES has debris rigor 5
    const allWarnings = result.sections.flatMap((s) => s.warnings);
    expect(
      allWarnings.some(
        (w) => w.message.includes("scrutiny") || w.message.includes("rigor"),
      ),
    ).toBe(true);
  });
});
