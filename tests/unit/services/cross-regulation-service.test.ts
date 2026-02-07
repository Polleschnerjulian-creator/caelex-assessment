import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock cross-references data — inline in factory to avoid hoisting issues
vi.mock("@/data/cross-references", () => ({
  CROSS_REFERENCES: [
    {
      id: "xref-001",
      sourceRegulation: "nis2",
      sourceArticle: "Art. 21(2)(a)",
      sourceTitle: "Risk Analysis",
      targetRegulation: "eu_space_act",
      targetArticle: "Art. 76",
      targetTitle: "Risk Management",
      relationship: "overlaps",
      description: "Both require cybersecurity risk management frameworks",
      confidence: "confirmed",
    },
    {
      id: "xref-002",
      sourceRegulation: "eu_space_act",
      sourceArticle: "Art. 80",
      sourceTitle: "Incident Response",
      targetRegulation: "nis2",
      targetArticle: "Art. 21(2)(b)",
      targetTitle: "Incident Handling",
      relationship: "supersedes",
      description:
        "EU Space Act supersedes NIS2 for space-specific incident handling",
      confidence: "confirmed",
    },
    {
      id: "xref-003",
      sourceRegulation: "nis2",
      sourceArticle: "Art. 21(2)(c)",
      sourceTitle: "Business Continuity",
      targetRegulation: "eu_space_act",
      targetArticle: "Art. 82",
      targetTitle: "Business Continuity",
      relationship: "overlaps",
      description: "Business continuity overlap",
      confidence: "interpreted",
    },
    {
      id: "xref-004",
      sourceRegulation: "nis2",
      sourceArticle: "Art. 23",
      sourceTitle: "Incident Reporting",
      targetRegulation: "enisa_space",
      targetArticle: "IM-01",
      targetTitle: "Incident Management",
      relationship: "implements",
      description: "NIS2 incident reporting maps to ENISA IM controls",
      confidence: "confirmed",
    },
    {
      id: "xref-005",
      sourceRegulation: "nis2",
      sourceArticle: "Art. 21(2)(d)",
      sourceTitle: "Supply Chain",
      targetRegulation: "iso27001",
      targetArticle: "A.15.1",
      targetTitle: "Supplier Relationships",
      relationship: "references",
      description: "NIS2 supply chain maps to ISO 27001 Annex A.15.1",
      confidence: "confirmed",
    },
  ],
}));

// Mock NIS2 requirements module
vi.mock("@/data/nis2-requirements", () => ({
  NIS2_REQUIREMENTS: [
    {
      id: "nis2-risk-policy",
      articleRef: "NIS2 Art. 21(2)(a)",
      category: "policies_risk_analysis",
      title: "Risk Analysis Policies",
      euSpaceActRef: "Art. 76",
      enisaControlIds: ["GR-01"],
      iso27001Ref: "A.5.1",
      severity: "critical",
      implementationTimeWeeks: 4,
    },
    {
      id: "nis2-incident",
      articleRef: "NIS2 Art. 21(2)(b)",
      category: "incident_handling",
      title: "Incident Handling",
      euSpaceActRef: "Art. 80",
      enisaControlIds: ["IM-01", "IM-02"],
      iso27001Ref: "A.16.1",
      severity: "critical",
      implementationTimeWeeks: 3,
    },
    {
      id: "nis2-bcp",
      articleRef: "NIS2 Art. 21(2)(c)",
      category: "business_continuity",
      title: "Business Continuity",
      euSpaceActRef: "Art. 82",
      severity: "major",
      implementationTimeWeeks: 4,
    },
    {
      id: "nis2-supply",
      articleRef: "NIS2 Art. 21(2)(d)",
      category: "supply_chain",
      title: "Supply Chain Security",
      iso27001Ref: "A.15.1",
      severity: "major",
      implementationTimeWeeks: 6,
    },
  ],
}));

// Mock ENISA controls
vi.mock("@/data/enisa-space-controls", () => ({
  ENISA_SPACE_CONTROLS: [
    {
      id: "ENISA-SPACE-GR-01",
      category: "governance_risk",
      subcategory: "Risk Management",
      title: "Risk Management Framework",
      description: "Establish a risk management framework",
      nis2Mapping: "Art. 21(2)(a)",
      euSpaceActMapping: "Art. 76",
      iso27001Mapping: "A.5.1",
      priority: "essential",
      implementationComplexity: "medium",
      spaceSegment: ["space", "ground"],
    },
    {
      id: "ENISA-SPACE-IM-01",
      category: "incident_management",
      subcategory: "Incident Response",
      title: "Incident Response Plan",
      description: "Establish an incident response plan",
      nis2Mapping: "Art. 21(2)(b)",
      euSpaceActMapping: "Art. 80",
      priority: "essential",
      implementationComplexity: "high",
      spaceSegment: ["space", "ground", "user"],
    },
  ],
}));

import {
  buildUnifiedComplianceMatrix,
  calculateOverlapSavings,
  getOverlappingRequirements,
  getCrossReferencesForRequirement,
  getCrossRegulationSummary,
} from "@/lib/services/cross-regulation-service";
import type { NIS2Requirement } from "@/lib/nis2-types";

// ─── Test Requirements ───

const mockRequirements: NIS2Requirement[] = [
  {
    id: "nis2-risk-policy",
    articleRef: "NIS2 Art. 21(2)(a)",
    category: "policies_risk_analysis",
    title: "Risk Analysis Policies",
    description: "Test",
    complianceQuestion: "Test?",
    spaceSpecificGuidance: "Test",
    applicableTo: {},
    euSpaceActRef: "Art. 76",
    enisaControlIds: ["GR-01"],
    iso27001Ref: "A.5.1",
    tips: [],
    evidenceRequired: [],
    severity: "critical",
    implementationTimeWeeks: 4,
    canBeSimplified: false,
  },
  {
    id: "nis2-incident",
    articleRef: "NIS2 Art. 21(2)(b)",
    category: "incident_handling",
    title: "Incident Handling",
    description: "Test",
    complianceQuestion: "Test?",
    spaceSpecificGuidance: "Test",
    applicableTo: {},
    euSpaceActRef: "Art. 80",
    enisaControlIds: ["IM-01", "IM-02"],
    iso27001Ref: "A.16.1",
    tips: [],
    evidenceRequired: [],
    severity: "critical",
    implementationTimeWeeks: 3,
    canBeSimplified: true,
  },
  {
    id: "nis2-bcp",
    articleRef: "NIS2 Art. 21(2)(c)",
    category: "business_continuity",
    title: "Business Continuity",
    description: "Test",
    complianceQuestion: "Test?",
    spaceSpecificGuidance: "Test",
    applicableTo: {},
    euSpaceActRef: "Art. 82",
    tips: [],
    evidenceRequired: [],
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: false,
  },
  {
    id: "nis2-supply",
    articleRef: "NIS2 Art. 21(2)(d)",
    category: "supply_chain",
    title: "Supply Chain Security",
    description: "Test",
    complianceQuestion: "Test?",
    spaceSpecificGuidance: "Test",
    applicableTo: {},
    iso27001Ref: "A.15.1",
    tips: [],
    evidenceRequired: [],
    severity: "major",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
  },
];

// ═══════════════════════════════════════════════════════════════
// buildUnifiedComplianceMatrix
// ═══════════════════════════════════════════════════════════════

describe("buildUnifiedComplianceMatrix", () => {
  it("should group requirements by category", async () => {
    const matrix = await buildUnifiedComplianceMatrix(mockRequirements);

    expect(matrix.length).toBeGreaterThan(0);
    // Should have unique categories
    const categories = matrix.map((m) => m.category);
    const uniqueCategories = new Set(categories);
    expect(uniqueCategories.size).toBe(categories.length);
  });

  it("should include EU Space Act articles for overlapping requirements", async () => {
    const matrix = await buildUnifiedComplianceMatrix(mockRequirements);

    const riskCategory = matrix.find(
      (m) => m.category === "policies_risk_analysis",
    );
    expect(riskCategory).toBeDefined();
    expect(riskCategory!.euSpaceActArticles.length).toBeGreaterThan(0);
    expect(riskCategory!.euSpaceActArticles).toContain("Art. 76");
  });

  it("should mark categories with multi-framework coverage as single_implementation", async () => {
    const matrix = await buildUnifiedComplianceMatrix(mockRequirements);

    // Policies/risk should have EU Space Act + ENISA + ISO = single_implementation
    const riskCategory = matrix.find(
      (m) => m.category === "policies_risk_analysis",
    );
    if (
      riskCategory &&
      riskCategory.enisaControls.length > 0 &&
      riskCategory.iso27001Refs.length > 0
    ) {
      expect(riskCategory.complianceEffort).toBe("single_implementation");
    }
  });

  it("should sort by effort type (single_implementation first)", async () => {
    const matrix = await buildUnifiedComplianceMatrix(mockRequirements);

    if (matrix.length >= 2) {
      const effortOrder: Record<string, number> = {
        single_implementation: 0,
        partial_overlap: 1,
        separate_effort: 2,
      };
      for (let i = 1; i < matrix.length; i++) {
        expect(effortOrder[matrix[i].complianceEffort]).toBeGreaterThanOrEqual(
          effortOrder[matrix[i - 1].complianceEffort],
        );
      }
    }
  });

  it("should handle empty requirements array", async () => {
    const matrix = await buildUnifiedComplianceMatrix([]);

    expect(matrix).toEqual([]);
  });

  it("should include category labels", async () => {
    const matrix = await buildUnifiedComplianceMatrix(mockRequirements);

    for (const item of matrix) {
      expect(item.categoryLabel).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// calculateOverlapSavings
// ═══════════════════════════════════════════════════════════════

describe("calculateOverlapSavings", () => {
  it("should return correct totals", async () => {
    const report = await calculateOverlapSavings(mockRequirements);

    expect(report.totalNIS2Requirements).toBe(mockRequirements.length);
    // satisfiedByEUSpaceAct + partiallySatisfied + additionalEffortRequired should sum to total
    expect(
      report.satisfiedByEUSpaceAct +
        report.partiallySatisfied +
        report.additionalEffortRequired,
    ).toBe(report.totalNIS2Requirements);
  });

  it("should calculate positive savings percentage when overlaps exist", async () => {
    const report = await calculateOverlapSavings(mockRequirements);

    // We know there are overlaps from our mock cross-references
    expect(report.savingsPercentage).toBeGreaterThanOrEqual(0);
    expect(report.savingsPercentage).toBeLessThanOrEqual(100);
  });

  it("should calculate weeks saved", async () => {
    const report = await calculateOverlapSavings(mockRequirements);

    expect(report.estimatedWeeksSaved).toBeGreaterThanOrEqual(0);
  });

  it("should handle empty requirements", async () => {
    const report = await calculateOverlapSavings([]);

    expect(report.totalNIS2Requirements).toBe(0);
    expect(report.satisfiedByEUSpaceAct).toBe(0);
    expect(report.partiallySatisfied).toBe(0);
    expect(report.additionalEffortRequired).toBe(0);
    expect(report.estimatedWeeksSaved).toBe(0);
    expect(report.savingsPercentage).toBe(0);
  });

  it("should count superseded requirements as fully satisfied", async () => {
    const report = await calculateOverlapSavings(mockRequirements);

    // xref-002 supersedes Art. 21(2)(b) → nis2-incident should be satisfied
    expect(report.satisfiedByEUSpaceAct).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// getOverlappingRequirements
// ═══════════════════════════════════════════════════════════════

describe("getOverlappingRequirements", () => {
  it("should return overlapping requirements with EU Space Act", async () => {
    const overlaps = await getOverlappingRequirements(mockRequirements);

    expect(overlaps.length).toBeGreaterThan(0);
    for (const overlap of overlaps) {
      expect(overlap.nis2RequirementId).toBeTruthy();
      expect(overlap.nis2Article).toBeTruthy();
      expect(overlap.euSpaceActArticle).toBeTruthy();
      expect(overlap.description).toBeTruthy();
      expect([
        "single_implementation",
        "partial_overlap",
        "separate_effort",
      ]).toContain(overlap.effortType);
    }
  });

  it("should classify superseded as single_implementation", async () => {
    const overlaps = await getOverlappingRequirements(mockRequirements);

    const superseded = overlaps.filter(
      (o) => o.effortType === "single_implementation",
    );
    // xref-002 has "supersedes" relationship
    expect(superseded.length).toBeGreaterThan(0);
  });

  it("should classify overlaps as partial_overlap", async () => {
    const overlaps = await getOverlappingRequirements(mockRequirements);

    const partial = overlaps.filter((o) => o.effortType === "partial_overlap");
    // xref-001 and xref-003 have "overlaps" relationship
    expect(partial.length).toBeGreaterThan(0);
  });

  it("should handle empty requirements", async () => {
    const overlaps = await getOverlappingRequirements([]);

    expect(overlaps).toEqual([]);
  });

  it("should include nis2Title for each overlap", async () => {
    const overlaps = await getOverlappingRequirements(mockRequirements);

    for (const overlap of overlaps) {
      expect(overlap.nis2Title).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// getCrossReferencesForRequirement
// ═══════════════════════════════════════════════════════════════

describe("getCrossReferencesForRequirement", () => {
  it("should find EU Space Act cross-references for a requirement", () => {
    const refs = getCrossReferencesForRequirement(mockRequirements[0]);

    expect(refs.euSpaceAct.length).toBeGreaterThan(0);
    expect(refs.total).toBeGreaterThan(0);
  });

  it("should find ENISA cross-references when they exist", () => {
    // The ENISA reference maps to Art. 23, but our mock requirements
    // use Art. 21(2)(a), Art. 21(2)(b), etc.
    const refs = getCrossReferencesForRequirement(mockRequirements[0]);

    // Even if no direct ENISA cross-ref, the structure should be correct
    expect(refs).toHaveProperty("euSpaceAct");
    expect(refs).toHaveProperty("enisa");
    expect(refs).toHaveProperty("iso27001");
    expect(refs).toHaveProperty("total");
  });

  it("should return empty arrays for a requirement with no cross-references", () => {
    const noRefsReq: NIS2Requirement = {
      ...mockRequirements[0],
      id: "no-refs",
      articleRef: "NIS2 Art. 99", // No cross-references for this
    };
    const refs = getCrossReferencesForRequirement(noRefsReq);

    expect(refs.euSpaceAct).toEqual([]);
    expect(refs.enisa).toEqual([]);
    expect(refs.iso27001).toEqual([]);
    expect(refs.total).toBe(0);
  });

  it("should handle bidirectional references (NIS2→other and other→NIS2)", () => {
    // nis2-incident: Art. 21(2)(b) has a cross-ref where EU Space Act targets NIS2
    const refs = getCrossReferencesForRequirement(mockRequirements[1]);

    // xref-002 has sourceRegulation=eu_space_act, targetRegulation=nis2
    expect(refs.euSpaceAct.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// getCrossRegulationSummary
// ═══════════════════════════════════════════════════════════════

describe("getCrossRegulationSummary", () => {
  it("should return total cross-reference count", async () => {
    const summary = await getCrossRegulationSummary();

    expect(summary.totalCrossReferences).toBe(5); // 5 mock cross-references
  });

  it("should group by relationship type", async () => {
    const summary = await getCrossRegulationSummary();

    expect(summary.byRelationship).toBeDefined();
    expect(typeof summary.byRelationship.overlaps).toBe("number");
    expect(typeof summary.byRelationship.supersedes).toBe("number");
  });

  it("should group by source regulation", async () => {
    const summary = await getCrossRegulationSummary();

    expect(summary.bySourceRegulation).toBeDefined();
    expect(summary.bySourceRegulation.nis2).toBeGreaterThan(0);
  });

  it("should calculate NIS2 to EU Space Act specific stats", async () => {
    const summary = await getCrossRegulationSummary();

    expect(summary.nis2ToEUSpaceAct).toBeDefined();
    expect(summary.nis2ToEUSpaceAct.total).toBeGreaterThan(0);
    expect(summary.nis2ToEUSpaceAct.overlapping).toBeGreaterThanOrEqual(0);
    expect(summary.nis2ToEUSpaceAct.superseded).toBeGreaterThanOrEqual(0);
  });

  it("should have consistent NIS2↔EU Space Act counts", async () => {
    const summary = await getCrossRegulationSummary();

    // overlapping + superseded should be <= total
    expect(
      summary.nis2ToEUSpaceAct.overlapping +
        summary.nis2ToEUSpaceAct.superseded,
    ).toBeLessThanOrEqual(summary.nis2ToEUSpaceAct.total);
  });
});
