/**
 * NIS2 Auto-Assessment engine tests.
 *
 * `nis2-auto-assessment.server.ts` is the engine that pre-fills NIS2
 * requirement statuses based on the wizard answers (ISO 27001
 * coverage, existing CSIRT, risk management, ground infra) and
 * generates smart recommendations + a 4-phase implementation plan.
 *
 * Before this file existed it had 0% coverage. The two public exports
 * (`generateAutoAssessments` and `generateRecommendations`) feed
 * directly into the dashboard module, so a regression here silently
 * breaks the most visible Caelex screen for the customer.
 *
 * Test focus:
 *   - Auto-assessment rules 1–5 (ISO 27001, CSIRT, risk mgmt,
 *     proportionality, ground infra)
 *   - Recommendation set covers ISO / CSIRT / EU overlap / size paths
 *   - Implementation phases enumerate 1-4 in correct order
 *   - Critical gap sorting by implementation weeks (descending)
 *   - Auto-assessed count matches the [Auto-assessed] prefix scan
 */

import { describe, it, expect, vi } from "vitest";

import type { NIS2Requirement, NIS2AssessmentAnswers } from "@/lib/nis2-types";

vi.mock("server-only", () => ({}));

const { generateAutoAssessments, generateRecommendations } =
  await import("@/lib/nis2-auto-assessment.server");

// ─── Fixture builders ────────────────────────────────────────────────
function buildRequirement(
  overrides: Partial<NIS2Requirement> = {},
): NIS2Requirement {
  return {
    id: "test-req-1",
    articleRef: "NIS2 Art. 21(2)(a)",
    category: "policies_risk_analysis",
    title: "Risk analysis policy",
    description: "Establish a risk analysis policy",
    complianceQuestion: "Do you have a risk analysis policy?",
    spaceSpecificGuidance:
      "Cover RF interference, jamming, orbital debris, and supply chain risks.",
    applicableTo: {},
    tips: ["Use ISO 27005"],
    evidenceRequired: ["Policy document"],
    severity: "critical",
    canBeSimplified: true,
    implementationTimeWeeks: 6,
    ...overrides,
  };
}

function buildAnswers(
  overrides: Partial<NIS2AssessmentAnswers> = {},
): NIS2AssessmentAnswers {
  return {
    sector: "space",
    spaceSubSector: null,
    operatesGroundInfra: false,
    operatesSatComms: false,
    manufacturesSpacecraft: false,
    providesLaunchServices: false,
    providesEOData: false,
    entitySize: "medium",
    employeeCount: 100,
    annualRevenue: 20_000_000,
    memberStateCount: 1,
    isEUEstablished: true,
    offersServicesInEU: false,
    designatedByMemberState: false,
    providesDigitalInfrastructure: false,
    euControlledEntity: true,
    hasISO27001: false,
    hasExistingCSIRT: false,
    hasRiskManagement: false,
    ...overrides,
  };
}

// ─── generateAutoAssessments rules ───────────────────────────────────
describe("NIS2 auto-assessment — generateAutoAssessments", () => {
  it("Rule 1: ISO 27001 + iso27001Ref → suggests partial with ISO note", () => {
    const reqs = [buildRequirement({ iso27001Ref: "A.5.1" })];
    const result = generateAutoAssessments(
      reqs,
      buildAnswers({ hasISO27001: true }),
    );
    expect(result[0]!.suggestedStatus).toBe("partial");
    expect(result[0]!.reason).toContain("ISO 27001");
    expect(result[0]!.reason).toContain("A.5.1");
  });

  it("Rule 2: existing CSIRT + incident_handling category → suggests partial", () => {
    const reqs = [
      buildRequirement({
        id: "incident-req",
        category: "incident_handling",
      }),
    ];
    const result = generateAutoAssessments(
      reqs,
      buildAnswers({ hasExistingCSIRT: true }),
    );
    expect(result[0]!.suggestedStatus).toBe("partial");
    expect(result[0]!.reason).toContain("incident");
  });

  it("Rule 2: existing CSIRT + reporting category → references Art. 23 timelines", () => {
    const reqs = [
      buildRequirement({
        id: "reporting-req",
        category: "reporting",
      }),
    ];
    const result = generateAutoAssessments(
      reqs,
      buildAnswers({ hasExistingCSIRT: true }),
    );
    expect(result[0]!.reason).toContain("24h");
    expect(result[0]!.reason).toContain("72h");
  });

  it("Rule 3: hasRiskManagement + policies_risk_analysis category → partial with space-threats note", () => {
    const reqs = [
      buildRequirement({
        category: "policies_risk_analysis",
      }),
    ];
    const result = generateAutoAssessments(
      reqs,
      buildAnswers({ hasRiskManagement: true }),
    );
    expect(result[0]!.suggestedStatus).toBe("partial");
    expect(result[0]!.reason.toLowerCase()).toContain("space-specific");
  });

  it("Rule 4: small entity + canBeSimplified → adds proportionality note", () => {
    const reqs = [buildRequirement({ canBeSimplified: true })];
    const result = generateAutoAssessments(
      reqs,
      buildAnswers({ entitySize: "small" }),
    );
    expect(result[0]!.proportionalityNote).toBeTruthy();
    expect(result[0]!.proportionalityNote!.toLowerCase()).toContain(
      "proportionate",
    );
  });

  it("Rule 5: ground infra operator + ground-station guidance → high_priority_ground_infra flag", () => {
    const reqs = [
      buildRequirement({
        spaceSpecificGuidance:
          "Apply network segmentation to all ground station and TT&C links.",
      }),
    ];
    const result = generateAutoAssessments(
      reqs,
      buildAnswers({ operatesGroundInfra: true }),
    );
    expect(result[0]!.priorityFlags).toContain("high_priority_ground_infra");
  });

  it("euSpaceActRef present → adds eu_space_act_overlap flag", () => {
    const reqs = [buildRequirement({ euSpaceActRef: "Art. 80" })];
    const result = generateAutoAssessments(reqs, buildAnswers());
    expect(result[0]!.priorityFlags).toContain("eu_space_act_overlap");
  });

  it("severity=critical → adds critical_severity flag", () => {
    const reqs = [buildRequirement({ severity: "critical" })];
    const result = generateAutoAssessments(reqs, buildAnswers());
    expect(result[0]!.priorityFlags).toContain("critical_severity");
  });

  it("returns one result per requirement, in order", () => {
    const reqs = [
      buildRequirement({ id: "r1", title: "First" }),
      buildRequirement({ id: "r2", title: "Second" }),
      buildRequirement({ id: "r3", title: "Third" }),
    ];
    const result = generateAutoAssessments(reqs, buildAnswers());
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.requirementId)).toEqual(["r1", "r2", "r3"]);
  });

  it("does not crash on empty input", () => {
    expect(generateAutoAssessments([], buildAnswers())).toEqual([]);
  });
});

// ─── generateRecommendations ─────────────────────────────────────────
describe("NIS2 auto-assessment — generateRecommendations", () => {
  const baseRequirementMeta = {
    "req-iso-1": {
      title: "ISO Linked Req 1",
      articleRef: "Art. 21(2)(a)",
      category: "policies_risk_analysis",
      severity: "major",
      iso27001Ref: "A.5.1",
      implementationTimeWeeks: 4,
    },
    "req-critical-1": {
      title: "Critical Gap A",
      articleRef: "Art. 21(2)(b)",
      category: "incident_handling",
      severity: "critical",
      implementationTimeWeeks: 12,
    },
    "req-critical-2": {
      title: "Critical Gap B",
      articleRef: "Art. 21(2)(c)",
      category: "business_continuity",
      severity: "critical",
      implementationTimeWeeks: 6,
    },
    "req-major-1": {
      title: "Major Item",
      articleRef: "Art. 21(2)(g)",
      category: "cyber_hygiene",
      severity: "major",
      implementationTimeWeeks: 3,
    },
    "req-minor-1": {
      title: "Minor Item",
      articleRef: "Art. 21(2)(j)",
      category: "mfa_authentication",
      severity: "minor",
      implementationTimeWeeks: 1,
    },
    "req-eu-overlap": {
      title: "EU Overlap",
      articleRef: "Art. 21(2)(d)",
      category: "supply_chain",
      severity: "major",
      euSpaceActRef: "Art. 81",
      implementationTimeWeeks: 5,
    },
  } as const;

  function buildStatuses(overrides: Record<string, string> = {}) {
    return Object.keys(baseRequirementMeta).map((id) => ({
      requirementId: id,
      status: overrides[id] ?? "not_assessed",
      notes: null,
    }));
  }

  it("computes ISO27001 coverage as percentage of total requirements", () => {
    const result = generateRecommendations(
      {
        hasISO27001: true,
        hasExistingCSIRT: false,
        hasRiskManagement: false,
        operatesGroundInfra: false,
        operatesSatComms: false,
        organizationSize: "medium",
        entityClassification: "important",
        subSector: null,
      },
      buildStatuses(),
      baseRequirementMeta,
    );
    // 1 of 6 requirements has an iso27001Ref → ~17%
    expect(result.iso27001Coverage.count).toBe(1);
    expect(result.iso27001Coverage.total).toBe(6);
    expect(result.iso27001Coverage.percentage).toBe(17);
  });

  it("sorts critical gaps by implementation weeks descending", () => {
    const result = generateRecommendations(
      {
        hasISO27001: false,
        hasExistingCSIRT: false,
        hasRiskManagement: false,
        operatesGroundInfra: false,
        operatesSatComms: false,
        organizationSize: "medium",
        entityClassification: "important",
        subSector: null,
      },
      buildStatuses(),
      baseRequirementMeta,
    );
    expect(result.criticalGaps.length).toBe(2);
    // req-critical-1 = 12 weeks, req-critical-2 = 6 weeks
    expect(result.criticalGaps[0]!.id).toBe("req-critical-1");
    expect(result.criticalGaps[1]!.id).toBe("req-critical-2");
  });

  it("aggregates EU Space Act overlap article references uniquely", () => {
    const result = generateRecommendations(
      {
        hasISO27001: false,
        hasExistingCSIRT: false,
        hasRiskManagement: false,
        operatesGroundInfra: false,
        operatesSatComms: false,
        organizationSize: "medium",
        entityClassification: "important",
        subSector: null,
      },
      buildStatuses(),
      baseRequirementMeta,
    );
    expect(result.euSpaceActOverlap.count).toBe(1);
    expect(result.euSpaceActOverlap.articles).toContain("Art. 81");
  });

  it("totals implementation weeks across non-compliant + partial + not_assessed only", () => {
    const result = generateRecommendations(
      {
        hasISO27001: false,
        hasExistingCSIRT: false,
        hasRiskManagement: false,
        operatesGroundInfra: false,
        operatesSatComms: false,
        organizationSize: "medium",
        entityClassification: "important",
        subSector: null,
      },
      buildStatuses({
        "req-iso-1": "compliant", // 4 weeks excluded
        "req-major-1": "not_applicable", // 3 weeks excluded
      }),
      baseRequirementMeta,
    );
    // Remaining gaps: req-critical-1 (12) + req-critical-2 (6) +
    // req-minor-1 (1) + req-eu-overlap (5) = 24
    expect(result.totalImplementationWeeks).toBe(24);
  });

  it("counts auto-assessed entries by [Auto-assessed] prefix", () => {
    const statuses = buildStatuses();
    statuses[0]!.notes = "[Auto-assessed] ISO 27001 covers this";
    statuses[2]!.notes = "[Auto-assessed] CSIRT integration";
    statuses[3]!.notes = "Manual entry — does not match prefix";

    const result = generateRecommendations(
      {
        hasISO27001: false,
        hasExistingCSIRT: false,
        hasRiskManagement: false,
        operatesGroundInfra: false,
        operatesSatComms: false,
        organizationSize: "medium",
        entityClassification: "important",
        subSector: null,
      },
      statuses,
      baseRequirementMeta,
    );
    expect(result.autoAssessedCount).toBe(2);
  });

  it("emits a small/micro proportionality recommendation when applicable", () => {
    const result = generateRecommendations(
      {
        hasISO27001: false,
        hasExistingCSIRT: false,
        hasRiskManagement: false,
        operatesGroundInfra: false,
        operatesSatComms: false,
        organizationSize: "small",
        entityClassification: "important",
        subSector: null,
      },
      buildStatuses(),
      baseRequirementMeta,
    );
    const text = result.recommendations.join(" ");
    expect(text.toLowerCase()).toContain("small");
    expect(text.toLowerCase()).toContain("proportionate");
  });

  it("emits a ground-infra recommendation when operatesGroundInfra=true", () => {
    const result = generateRecommendations(
      {
        hasISO27001: false,
        hasExistingCSIRT: false,
        hasRiskManagement: false,
        operatesGroundInfra: true,
        operatesSatComms: false,
        organizationSize: "medium",
        entityClassification: "important",
        subSector: null,
      },
      buildStatuses(),
      baseRequirementMeta,
    );
    const text = result.recommendations.join(" ");
    expect(text.toLowerCase()).toContain("ground");
    expect(text.toLowerCase()).toContain("tt&c");
  });

  it("generates implementation phases in monotonic phase order (1, 2, 3, 4)", () => {
    const result = generateRecommendations(
      {
        hasISO27001: true,
        hasExistingCSIRT: false,
        hasRiskManagement: false,
        operatesGroundInfra: false,
        operatesSatComms: false,
        organizationSize: "medium",
        entityClassification: "important",
        subSector: null,
      },
      buildStatuses(),
      baseRequirementMeta,
    );
    const numbers = result.implementationPhases.map((p) => p.phase);
    // Phases must come in numerical order even if some are skipped.
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]!).toBeGreaterThan(numbers[i - 1]!);
    }
    // Each phase carries a name, description, totalWeeks, and reqs.
    for (const p of result.implementationPhases) {
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(typeof p.totalWeeks).toBe("number");
      expect(Array.isArray(p.requirements)).toBe(true);
    }
  });

  it("a requirement is never assigned to more than one implementation phase", () => {
    const result = generateRecommendations(
      {
        hasISO27001: true,
        hasExistingCSIRT: false,
        hasRiskManagement: false,
        operatesGroundInfra: false,
        operatesSatComms: false,
        organizationSize: "small",
        entityClassification: "important",
        subSector: null,
      },
      buildStatuses(),
      baseRequirementMeta,
    );

    const seen = new Set<string>();
    for (const phase of result.implementationPhases) {
      for (const req of phase.requirements) {
        expect(seen.has(req.id)).toBe(false);
        seen.add(req.id);
      }
    }
  });
});
