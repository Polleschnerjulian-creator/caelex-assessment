/**
 * NIS2 Auto-Assessment Engine Tests
 *
 * Tests: generateAutoAssessments (rule evaluation),
 * generateRecommendations (gap analysis, phases, context-aware suggestions).
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { NIS2Requirement, NIS2AssessmentAnswers } from "./nis2-types";
import {
  generateAutoAssessments,
  generateRecommendations,
} from "./nis2-auto-assessment.server";

// ── Helpers ──

function makeRequirement(
  overrides: Partial<NIS2Requirement> = {},
): NIS2Requirement {
  return {
    id: "req-1",
    articleRef: "NIS2 Art. 21(2)(a)",
    category: "policies_risk_analysis",
    title: "Risk Analysis Policies",
    description: "Policies on risk analysis and information system security.",
    complianceQuestion: "Do you have risk analysis policies?",
    spaceSpecificGuidance:
      "Consider space-specific threats such as RF interference.",
    applicableTo: {},
    severity: "major",
    implementationTimeWeeks: 8,
    canBeSimplified: false,
    tips: [],
    evidenceRequired: [],
    ...overrides,
  };
}

function makeAnswers(
  overrides: Partial<NIS2AssessmentAnswers> = {},
): NIS2AssessmentAnswers {
  return {
    sector: "space",
    spaceSubSector: "ground_infrastructure",
    operatesGroundInfra: false,
    operatesSatComms: false,
    manufacturesSpacecraft: false,
    providesLaunchServices: false,
    providesEOData: false,
    entitySize: "large",
    employeeCount: 500,
    annualRevenue: 50000000,
    memberStateCount: 3,
    isEUEstablished: true,
    hasISO27001: false,
    hasExistingCSIRT: false,
    hasRiskManagement: false,
    ...overrides,
  };
}

interface RequirementStatusRecord {
  requirementId: string;
  status: string;
  notes: string | null;
}

interface RequirementMetaRecord {
  title: string;
  articleRef: string;
  category: string;
  severity: string;
  iso27001Ref?: string;
  euSpaceActRef?: string;
  canBeSimplified?: boolean;
  implementationTimeWeeks?: number;
  complianceQuestion?: string;
}

interface AssessmentProfile {
  hasISO27001: boolean;
  hasExistingCSIRT: boolean;
  hasRiskManagement: boolean;
  operatesGroundInfra: boolean;
  operatesSatComms: boolean;
  organizationSize: string | null;
  entityClassification: string | null;
  subSector: string | null;
}

function makeProfile(
  overrides: Partial<AssessmentProfile> = {},
): AssessmentProfile {
  return {
    hasISO27001: false,
    hasExistingCSIRT: false,
    hasRiskManagement: false,
    operatesGroundInfra: false,
    operatesSatComms: false,
    organizationSize: "large",
    entityClassification: "essential",
    subSector: "ground_infrastructure",
    ...overrides,
  };
}

function makeStatus(
  requirementId: string,
  status: string,
  notes: string | null = null,
): RequirementStatusRecord {
  return { requirementId, status, notes };
}

function makeMeta(
  overrides: Partial<RequirementMetaRecord> & {
    title: string;
    articleRef: string;
  },
): RequirementMetaRecord {
  return {
    category: "policies_risk_analysis",
    severity: "major",
    implementationTimeWeeks: 8,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe("NIS2 Auto-Assessment Engine", () => {
  // ─────────────────────────────────────────────────────────────────
  // generateAutoAssessments
  // ─────────────────────────────────────────────────────────────────

  describe("generateAutoAssessments", () => {
    it("Rule 1: marks as partial when hasISO27001 and req.iso27001Ref exists", () => {
      const req = makeRequirement({ id: "r1", iso27001Ref: "A.5.1" });
      const answers = makeAnswers({ hasISO27001: true });

      const results = generateAutoAssessments([req], answers);

      expect(results).toHaveLength(1);
      expect(results[0]!.suggestedStatus).toBe("partial");
      expect(results[0]!.reason).toContain("[Auto-assessed]");
      expect(results[0]!.reason).toContain("ISO 27001");
      expect(results[0]!.reason).toContain("A.5.1");
    });

    it("Rule 1: does not apply when hasISO27001 is false", () => {
      const req = makeRequirement({ id: "r1", iso27001Ref: "A.5.1" });
      const answers = makeAnswers({ hasISO27001: false });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.suggestedStatus).toBe("not_assessed");
    });

    it("Rule 1: does not apply when req has no iso27001Ref", () => {
      const req = makeRequirement({ id: "r1", iso27001Ref: undefined });
      const answers = makeAnswers({ hasISO27001: true });

      const results = generateAutoAssessments([req], answers);

      // Should be not_assessed since no other rules match
      expect(results[0]!.suggestedStatus).toBe("not_assessed");
    });

    it("Rule 2: marks incident_handling as partial when hasExistingCSIRT", () => {
      const req = makeRequirement({ id: "r2", category: "incident_handling" });
      const answers = makeAnswers({ hasExistingCSIRT: true });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.suggestedStatus).toBe("partial");
      expect(results[0]!.reason).toContain("incident response capability");
    });

    it("Rule 2: marks reporting as partial when hasExistingCSIRT", () => {
      const req = makeRequirement({ id: "r2b", category: "reporting" });
      const answers = makeAnswers({ hasExistingCSIRT: true });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.suggestedStatus).toBe("partial");
      expect(results[0]!.reason).toContain("Art. 23");
      expect(results[0]!.reason).toContain("24h early warning");
    });

    it("Rule 2: does not apply to non-incident categories", () => {
      const req = makeRequirement({ id: "r2c", category: "cryptography" });
      const answers = makeAnswers({ hasExistingCSIRT: true });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.suggestedStatus).toBe("not_assessed");
    });

    it("Rule 3: marks policies_risk_analysis as partial when hasRiskManagement", () => {
      const req = makeRequirement({
        id: "r3",
        category: "policies_risk_analysis",
      });
      const answers = makeAnswers({ hasRiskManagement: true });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.suggestedStatus).toBe("partial");
      expect(results[0]!.reason).toContain("risk management framework");
      expect(results[0]!.reason).toContain("space-specific threats");
    });

    it("Rule 3: does not apply to other categories", () => {
      const req = makeRequirement({
        id: "r3b",
        category: "supply_chain",
      });
      const answers = makeAnswers({ hasRiskManagement: true });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.suggestedStatus).toBe("not_assessed");
    });

    it("Rule 4: adds proportionalityNote for small entities with canBeSimplified", () => {
      const req = makeRequirement({ id: "r4", canBeSimplified: true });
      const answers = makeAnswers({ entitySize: "small" });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.proportionalityNote).toBeDefined();
      expect(results[0]!.proportionalityNote).toContain("Proportionate");
      expect(results[0]!.proportionalityNote).toContain("Art. 21(1)");
    });

    it("Rule 4: adds proportionalityNote for micro entities with canBeSimplified", () => {
      const req = makeRequirement({ id: "r4b", canBeSimplified: true });
      const answers = makeAnswers({ entitySize: "micro" });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.proportionalityNote).toBeDefined();
      expect(results[0]!.proportionalityNote).toContain("Proportionate");
    });

    it("Rule 4: does not add proportionalityNote for large entities", () => {
      const req = makeRequirement({ id: "r4c", canBeSimplified: true });
      const answers = makeAnswers({ entitySize: "large" });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.proportionalityNote).toBeUndefined();
    });

    it("Rule 4: does not add proportionalityNote when canBeSimplified is false", () => {
      const req = makeRequirement({ id: "r4d", canBeSimplified: false });
      const answers = makeAnswers({ entitySize: "small" });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.proportionalityNote).toBeUndefined();
    });

    it("Rule 5: flags high_priority_ground_infra when operatesGroundInfra and guidance mentions ground station", () => {
      const req = makeRequirement({
        id: "r5",
        spaceSpecificGuidance:
          "Ensure ground station links are encrypted with FIPS-compliant algorithms.",
      });
      const answers = makeAnswers({ operatesGroundInfra: true });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.priorityFlags).toContain("high_priority_ground_infra");
    });

    it("Rule 5: flags ground infra for guidance mentioning mission control", () => {
      const req = makeRequirement({
        id: "r5b",
        spaceSpecificGuidance:
          "Mission control centres should have redundant network paths.",
      });
      const answers = makeAnswers({ operatesGroundInfra: true });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.priorityFlags).toContain("high_priority_ground_infra");
    });

    it("Rule 5: flags ground infra for guidance mentioning TT&C", () => {
      const req = makeRequirement({
        id: "r5c",
        spaceSpecificGuidance: "Secure TT&C command links against jamming.",
      });
      const answers = makeAnswers({ operatesGroundInfra: true });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.priorityFlags).toContain("high_priority_ground_infra");
    });

    it("Rule 5: does not flag when operatesGroundInfra is false", () => {
      const req = makeRequirement({
        id: "r5d",
        spaceSpecificGuidance: "Secure ground station links.",
      });
      const answers = makeAnswers({ operatesGroundInfra: false });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.priorityFlags).not.toContain(
        "high_priority_ground_infra",
      );
    });

    it("Rule 5: does not flag when guidance has no ground keywords", () => {
      const req = makeRequirement({
        id: "r5e",
        spaceSpecificGuidance: "Ensure satellite firmware is up to date.",
      });
      const answers = makeAnswers({ operatesGroundInfra: true });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.priorityFlags).not.toContain(
        "high_priority_ground_infra",
      );
    });

    it("flags eu_space_act_overlap when req.euSpaceActRef exists", () => {
      const req = makeRequirement({
        id: "r6",
        euSpaceActRef: "Art. 76",
      });
      const answers = makeAnswers();

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.priorityFlags).toContain("eu_space_act_overlap");
    });

    it("does not flag eu_space_act_overlap when euSpaceActRef is absent", () => {
      const req = makeRequirement({
        id: "r6b",
        euSpaceActRef: undefined,
      });
      const answers = makeAnswers();

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.priorityFlags).not.toContain("eu_space_act_overlap");
    });

    it("flags critical_severity for critical requirements", () => {
      const req = makeRequirement({
        id: "r7",
        severity: "critical",
      });
      const answers = makeAnswers();

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.priorityFlags).toContain("critical_severity");
    });

    it("does not flag critical_severity for major or minor requirements", () => {
      const majorReq = makeRequirement({ id: "r7b", severity: "major" });
      const minorReq = makeRequirement({ id: "r7c", severity: "minor" });
      const answers = makeAnswers();

      const majorResults = generateAutoAssessments([majorReq], answers);
      const minorResults = generateAutoAssessments([minorReq], answers);

      expect(majorResults[0]!.priorityFlags).not.toContain("critical_severity");
      expect(minorResults[0]!.priorityFlags).not.toContain("critical_severity");
    });

    it("returns not_assessed with empty reason when no rules match", () => {
      const req = makeRequirement({
        id: "r8",
        category: "cryptography",
        severity: "minor",
        canBeSimplified: false,
        iso27001Ref: undefined,
        euSpaceActRef: undefined,
        spaceSpecificGuidance: "Generic guidance.",
      });
      const answers = makeAnswers({
        hasISO27001: false,
        hasExistingCSIRT: false,
        hasRiskManagement: false,
        operatesGroundInfra: false,
        entitySize: "large",
      });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.suggestedStatus).toBe("not_assessed");
      expect(results[0]!.reason).toBe("");
      expect(results[0]!.priorityFlags).toEqual([]);
      expect(results[0]!.proportionalityNote).toBeUndefined();
    });

    it("combines multiple rules for the same requirement", () => {
      const req = makeRequirement({
        id: "r9",
        category: "policies_risk_analysis",
        iso27001Ref: "A.6.1",
        severity: "critical",
        euSpaceActRef: "Art. 78",
        canBeSimplified: true,
        spaceSpecificGuidance: "Protect ground station control systems.",
      });
      const answers = makeAnswers({
        hasISO27001: true,
        hasRiskManagement: true,
        operatesGroundInfra: true,
        entitySize: "small",
      });

      const results = generateAutoAssessments([req], answers);

      expect(results[0]!.suggestedStatus).toBe("partial");
      expect(results[0]!.reason).toContain("ISO 27001");
      expect(results[0]!.reason).toContain("risk management");
      expect(results[0]!.proportionalityNote).toContain("Proportionate");
      expect(results[0]!.priorityFlags).toContain("high_priority_ground_infra");
      expect(results[0]!.priorityFlags).toContain("eu_space_act_overlap");
      expect(results[0]!.priorityFlags).toContain("critical_severity");
    });

    it("processes multiple requirements independently", () => {
      const reqs = [
        makeRequirement({
          id: "a",
          iso27001Ref: "A.5.1",
          category: "supply_chain",
        }),
        makeRequirement({
          id: "b",
          iso27001Ref: undefined,
          category: "incident_handling",
        }),
      ];
      const answers = makeAnswers({
        hasISO27001: true,
        hasExistingCSIRT: true,
      });

      const results = generateAutoAssessments(reqs, answers);

      expect(results).toHaveLength(2);
      expect(results[0]!.requirementId).toBe("a");
      expect(results[0]!.suggestedStatus).toBe("partial"); // ISO 27001
      expect(results[1]!.requirementId).toBe("b");
      expect(results[1]!.suggestedStatus).toBe("partial"); // CSIRT
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // generateRecommendations
  // ─────────────────────────────────────────────────────────────────

  describe("generateRecommendations", () => {
    it("shows ISO 27001 focus recommendation when hasISO27001 is true", () => {
      const profile = makeProfile({ hasISO27001: true });
      const statuses = [
        makeStatus("r1", "partial"),
        makeStatus("r2", "not_assessed"),
      ];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({
          title: "Risk Policies",
          articleRef: "Art. 21(2)(a)",
          iso27001Ref: "A.5.1",
        }),
        r2: makeMeta({
          title: "Incident Handling",
          articleRef: "Art. 21(2)(b)",
        }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      const isoRec = result.recommendations.find((r) =>
        r.includes("ISO 27001"),
      );
      expect(isoRec).toBeDefined();
      expect(isoRec).toContain("covers");
      expect(isoRec).toContain("space-specific additions");
    });

    it("suggests pursuing ISO 27001 when hasISO27001 is false", () => {
      const profile = makeProfile({ hasISO27001: false });
      const statuses = [makeStatus("r1", "not_assessed")];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({
          title: "Risk Policies",
          articleRef: "Art. 21(2)(a)",
          iso27001Ref: "A.5.1",
        }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      const isoRec = result.recommendations.find((r) =>
        r.includes("ISO 27001"),
      );
      expect(isoRec).toBeDefined();
      expect(isoRec).toContain("Consider pursuing");
    });

    it("lists critical gaps sorted by implementation weeks (descending)", () => {
      const profile = makeProfile();
      const statuses = [
        makeStatus("r1", "not_assessed"),
        makeStatus("r2", "non_compliant"),
        makeStatus("r3", "not_assessed"),
      ];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({
          title: "Incident Handling",
          articleRef: "Art. 21(2)(b)",
          severity: "critical",
          implementationTimeWeeks: 4,
        }),
        r2: makeMeta({
          title: "Business Continuity",
          articleRef: "Art. 21(2)(c)",
          severity: "critical",
          implementationTimeWeeks: 12,
        }),
        r3: makeMeta({
          title: "Risk Policies",
          articleRef: "Art. 21(2)(a)",
          severity: "critical",
          implementationTimeWeeks: 8,
        }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      expect(result.criticalGaps.length).toBe(3);
      // Sorted by implementationWeeks descending
      expect(result.criticalGaps[0]!.implementationWeeks).toBe(12);
      expect(result.criticalGaps[1]!.implementationWeeks).toBe(8);
      expect(result.criticalGaps[2]!.implementationWeeks).toBe(4);
    });

    it("does not include compliant requirements in critical gaps", () => {
      const profile = makeProfile();
      const statuses = [
        makeStatus("r1", "compliant"),
        makeStatus("r2", "not_assessed"),
      ];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({
          title: "Handled",
          articleRef: "Art. 21(2)(b)",
          severity: "critical",
          implementationTimeWeeks: 4,
        }),
        r2: makeMeta({
          title: "Not Handled",
          articleRef: "Art. 21(2)(c)",
          severity: "critical",
          implementationTimeWeeks: 8,
        }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      expect(result.criticalGaps).toHaveLength(1);
      expect(result.criticalGaps[0]!.id).toBe("r2");
    });

    it("shows EU Space Act overlap count and articles", () => {
      const profile = makeProfile();
      const statuses = [
        makeStatus("r1", "partial"),
        makeStatus("r2", "not_assessed"),
        makeStatus("r3", "partial"),
      ];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({
          title: "A",
          articleRef: "Art. 21(2)(a)",
          euSpaceActRef: "Art. 76",
        }),
        r2: makeMeta({
          title: "B",
          articleRef: "Art. 21(2)(b)",
        }),
        r3: makeMeta({
          title: "C",
          articleRef: "Art. 21(2)(c)",
          euSpaceActRef: "Art. 78",
        }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      expect(result.euSpaceActOverlap.count).toBe(2);
      expect(result.euSpaceActOverlap.articles).toContain("Art. 76");
      expect(result.euSpaceActOverlap.articles).toContain("Art. 78");

      // Recommendation should mention the overlap count
      const overlapRec = result.recommendations.find((r) =>
        r.includes("overlap"),
      );
      expect(overlapRec).toBeDefined();
      expect(overlapRec).toContain("2");
    });

    it("calculates total implementation weeks from gaps only", () => {
      const profile = makeProfile();
      const statuses = [
        makeStatus("r1", "compliant"), // not a gap
        makeStatus("r2", "not_assessed"), // gap
        makeStatus("r3", "partial"), // gap
        makeStatus("r4", "non_compliant"), // gap
        makeStatus("r5", "not_applicable"), // not a gap
      ];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({
          title: "A",
          articleRef: "a",
          implementationTimeWeeks: 100,
        }),
        r2: makeMeta({
          title: "B",
          articleRef: "b",
          implementationTimeWeeks: 4,
        }),
        r3: makeMeta({
          title: "C",
          articleRef: "c",
          implementationTimeWeeks: 6,
        }),
        r4: makeMeta({
          title: "D",
          articleRef: "d",
          implementationTimeWeeks: 10,
        }),
        r5: makeMeta({
          title: "E",
          articleRef: "e",
          implementationTimeWeeks: 200,
        }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      // Only r2 (4) + r3 (6) + r4 (10) = 20
      expect(result.totalImplementationWeeks).toBe(20);
    });

    it("shows CSIRT recommendation when hasExistingCSIRT is true", () => {
      const profile = makeProfile({ hasExistingCSIRT: true });
      const statuses = [makeStatus("r1", "partial")];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({ title: "A", articleRef: "a" }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      const csirtRec = result.recommendations.find((r) => r.includes("CSIRT"));
      expect(csirtRec).toBeDefined();
      expect(csirtRec).toContain("24h early warning");
      expect(csirtRec).toContain("72h");
    });

    it("shows establish CSIRT recommendation when hasExistingCSIRT is false", () => {
      const profile = makeProfile({ hasExistingCSIRT: false });
      const statuses = [makeStatus("r1", "partial")];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({ title: "A", articleRef: "a" }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      const csirtRec = result.recommendations.find(
        (r) =>
          r.includes("incident response capability") || r.includes("CSIRT/SOC"),
      );
      expect(csirtRec).toBeDefined();
      expect(csirtRec).toContain("Establish");
    });

    it("shows ground infra recommendation when operatesGroundInfra is true", () => {
      const profile = makeProfile({ operatesGroundInfra: true });
      const statuses = [makeStatus("r1", "partial")];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({ title: "A", articleRef: "a" }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      const groundRec = result.recommendations.find((r) =>
        r.includes("ground infrastructure"),
      );
      expect(groundRec).toBeDefined();
      expect(groundRec).toContain("TT&C");
      expect(groundRec).toContain("mission control");
    });

    it("does not show ground infra recommendation when operatesGroundInfra is false", () => {
      const profile = makeProfile({ operatesGroundInfra: false });
      const statuses = [makeStatus("r1", "partial")];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({ title: "A", articleRef: "a" }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      const groundRec = result.recommendations.find((r) =>
        r.includes("ground infrastructure"),
      );
      expect(groundRec).toBeUndefined();
    });

    it("shows proportionality note for small entities", () => {
      const profile = makeProfile({ organizationSize: "small" });
      const statuses = [
        makeStatus("r1", "partial"),
        makeStatus("r2", "not_assessed"),
      ];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({
          title: "A",
          articleRef: "a",
          canBeSimplified: true,
        }),
        r2: makeMeta({
          title: "B",
          articleRef: "b",
          canBeSimplified: false,
        }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      const propRec = result.recommendations.find((r) =>
        r.includes("proportionate"),
      );
      expect(propRec).toBeDefined();
      expect(propRec).toContain("small");
      expect(propRec).toContain("1 of 2"); // 1 simplifiable out of 2 total
      expect(propRec).toContain("Art. 21(1)");
    });

    it("shows proportionality note for micro entities", () => {
      const profile = makeProfile({ organizationSize: "micro" });
      const statuses = [makeStatus("r1", "partial")];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({
          title: "A",
          articleRef: "a",
          canBeSimplified: true,
        }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      const propRec = result.recommendations.find((r) =>
        r.includes("proportionate"),
      );
      expect(propRec).toBeDefined();
      expect(propRec).toContain("micro");
    });

    it("does not show proportionality note for large entities", () => {
      const profile = makeProfile({ organizationSize: "large" });
      const statuses = [makeStatus("r1", "partial")];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({
          title: "A",
          articleRef: "a",
          canBeSimplified: true,
        }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      const propRec = result.recommendations.find((r) =>
        r.includes("proportionate"),
      );
      expect(propRec).toBeUndefined();
    });

    it("shows auto-assessed count in recommendations", () => {
      const profile = makeProfile();
      const statuses = [
        makeStatus("r1", "partial", "[Auto-assessed] ISO 27001 covers this."),
        makeStatus("r2", "partial", "[Auto-assessed] CSIRT foundation."),
        makeStatus("r3", "not_assessed", null),
      ];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({ title: "A", articleRef: "a" }),
        r2: makeMeta({ title: "B", articleRef: "b" }),
        r3: makeMeta({ title: "C", articleRef: "c" }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      expect(result.autoAssessedCount).toBe(2);
      const autoRec = result.recommendations.find((r) =>
        r.includes("auto-assessed"),
      );
      expect(autoRec).toBeDefined();
      expect(autoRec).toContain("2");
    });

    it("does not show auto-assessed recommendation when count is 0", () => {
      const profile = makeProfile();
      const statuses = [makeStatus("r1", "partial", "Manual note")];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({ title: "A", articleRef: "a" }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      expect(result.autoAssessedCount).toBe(0);
      const autoRec = result.recommendations.find((r) =>
        r.includes("auto-assessed"),
      );
      expect(autoRec).toBeUndefined();
    });

    it("computes ISO 27001 coverage correctly", () => {
      const profile = makeProfile();
      const statuses = [
        makeStatus("r1", "partial"),
        makeStatus("r2", "partial"),
        makeStatus("r3", "not_assessed"),
      ];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({
          title: "A",
          articleRef: "a",
          iso27001Ref: "A.5.1",
        }),
        r2: makeMeta({
          title: "B",
          articleRef: "b",
          iso27001Ref: "A.6.1",
        }),
        r3: makeMeta({ title: "C", articleRef: "c" }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      expect(result.iso27001Coverage.count).toBe(2);
      expect(result.iso27001Coverage.total).toBe(3);
      expect(result.iso27001Coverage.percentage).toBe(67); // Math.round(2/3 * 100)
    });

    it("generates no critical gaps recommendation when all critical are compliant", () => {
      const profile = makeProfile();
      const statuses = [
        makeStatus("r1", "compliant"),
        makeStatus("r2", "compliant"),
      ];
      const meta: Record<string, RequirementMetaRecord> = {
        r1: makeMeta({
          title: "A",
          articleRef: "a",
          severity: "critical",
        }),
        r2: makeMeta({
          title: "B",
          articleRef: "b",
          severity: "critical",
        }),
      };

      const result = generateRecommendations(profile, statuses, meta);

      expect(result.criticalGaps).toHaveLength(0);
      const gapRec = result.recommendations.find((r) =>
        r.includes("No critical gaps"),
      );
      expect(gapRec).toBeDefined();
    });

    // ── Implementation Phases ──

    describe("implementation phases", () => {
      it("generates Quick Wins phase for partial requirements", () => {
        const profile = makeProfile({ hasISO27001: true });
        const statuses = [
          makeStatus("r1", "partial"),
          makeStatus("r2", "not_assessed"),
        ];
        const meta: Record<string, RequirementMetaRecord> = {
          r1: makeMeta({
            title: "Partial Item",
            articleRef: "a",
            severity: "major",
            implementationTimeWeeks: 2,
          }),
          r2: makeMeta({
            title: "Not Assessed",
            articleRef: "b",
            severity: "major",
            implementationTimeWeeks: 6,
            iso27001Ref: "A.5.1",
          }),
        };

        const result = generateRecommendations(profile, statuses, meta);

        const quickWins = result.implementationPhases.find(
          (p) => p.name === "Quick Wins",
        );
        expect(quickWins).toBeDefined();
        expect(quickWins!.phase).toBe(1);
        expect(quickWins!.requirements.length).toBeGreaterThan(0);
      });

      it("generates Critical Gaps phase for critical severity requirements", () => {
        const profile = makeProfile();
        const statuses = [
          makeStatus("r1", "not_assessed"),
          makeStatus("r2", "non_compliant"),
        ];
        const meta: Record<string, RequirementMetaRecord> = {
          r1: makeMeta({
            title: "Critical Gap 1",
            articleRef: "a",
            severity: "critical",
            implementationTimeWeeks: 12,
          }),
          r2: makeMeta({
            title: "Critical Gap 2",
            articleRef: "b",
            severity: "critical",
            implementationTimeWeeks: 8,
          }),
        };

        const result = generateRecommendations(profile, statuses, meta);

        const criticalPhase = result.implementationPhases.find(
          (p) => p.name === "Critical Gaps",
        );
        expect(criticalPhase).toBeDefined();
        expect(criticalPhase!.phase).toBe(2);
        expect(criticalPhase!.requirements.length).toBe(2);
      });

      it("generates Major Items phase", () => {
        const profile = makeProfile();
        const statuses = [makeStatus("r1", "not_assessed")];
        const meta: Record<string, RequirementMetaRecord> = {
          r1: makeMeta({
            title: "Major Item",
            articleRef: "a",
            severity: "major",
            implementationTimeWeeks: 6,
          }),
        };

        const result = generateRecommendations(profile, statuses, meta);

        const majorPhase = result.implementationPhases.find(
          (p) => p.name === "Major Items",
        );
        expect(majorPhase).toBeDefined();
      });

      it("generates Minor Items phase for remaining requirements", () => {
        const profile = makeProfile();
        const statuses = [makeStatus("r1", "not_assessed")];
        const meta: Record<string, RequirementMetaRecord> = {
          r1: makeMeta({
            title: "Minor Item",
            articleRef: "a",
            severity: "minor",
            implementationTimeWeeks: 2,
          }),
        };

        const result = generateRecommendations(profile, statuses, meta);

        const minorPhase = result.implementationPhases.find(
          (p) => p.name === "Minor Items",
        );
        expect(minorPhase).toBeDefined();
      });

      it("excludes compliant and not_applicable from all phases", () => {
        const profile = makeProfile();
        const statuses = [
          makeStatus("r1", "compliant"),
          makeStatus("r2", "not_applicable"),
        ];
        const meta: Record<string, RequirementMetaRecord> = {
          r1: makeMeta({
            title: "Compliant",
            articleRef: "a",
            severity: "critical",
          }),
          r2: makeMeta({
            title: "N/A",
            articleRef: "b",
            severity: "major",
          }),
        };

        const result = generateRecommendations(profile, statuses, meta);

        expect(result.implementationPhases).toHaveLength(0);
      });

      it("assigns requirements to only one phase (no duplicates)", () => {
        const profile = makeProfile({ hasISO27001: true });
        const statuses = [
          makeStatus("r1", "partial"),
          makeStatus("r2", "not_assessed"),
          makeStatus("r3", "non_compliant"),
          makeStatus("r4", "not_assessed"),
        ];
        const meta: Record<string, RequirementMetaRecord> = {
          r1: makeMeta({
            title: "Partial Critical",
            articleRef: "a",
            severity: "critical",
            implementationTimeWeeks: 4,
          }),
          r2: makeMeta({
            title: "Critical Unassessed",
            articleRef: "b",
            severity: "critical",
            implementationTimeWeeks: 12,
          }),
          r3: makeMeta({
            title: "Major Noncompliant",
            articleRef: "c",
            severity: "major",
            implementationTimeWeeks: 8,
          }),
          r4: makeMeta({
            title: "Minor Unassessed",
            articleRef: "d",
            severity: "minor",
            implementationTimeWeeks: 2,
          }),
        };

        const result = generateRecommendations(profile, statuses, meta);

        // Collect all requirement IDs across phases
        const allPhaseReqIds = result.implementationPhases.flatMap((p) =>
          p.requirements.map((r) => r.id),
        );
        const uniqueIds = new Set(allPhaseReqIds);
        expect(allPhaseReqIds.length).toBe(uniqueIds.size);
      });

      it("phases are numbered sequentially", () => {
        const profile = makeProfile();
        const statuses = [
          makeStatus("r1", "partial"),
          makeStatus("r2", "not_assessed"),
          makeStatus("r3", "not_assessed"),
          makeStatus("r4", "not_assessed"),
        ];
        const meta: Record<string, RequirementMetaRecord> = {
          r1: makeMeta({
            title: "A",
            articleRef: "a",
            severity: "major",
            implementationTimeWeeks: 2,
          }),
          r2: makeMeta({
            title: "B",
            articleRef: "b",
            severity: "critical",
            implementationTimeWeeks: 12,
          }),
          r3: makeMeta({
            title: "C",
            articleRef: "c",
            severity: "major",
            implementationTimeWeeks: 6,
          }),
          r4: makeMeta({
            title: "D",
            articleRef: "d",
            severity: "minor",
            implementationTimeWeeks: 2,
          }),
        };

        const result = generateRecommendations(profile, statuses, meta);

        for (let i = 0; i < result.implementationPhases.length; i++) {
          expect(result.implementationPhases[i]!.phase).toBe(i + 1);
        }
      });
    });

    it("limits critical gaps to 5 entries", () => {
      const profile = makeProfile();
      const statuses = Array.from({ length: 8 }, (_, i) =>
        makeStatus(`r${i}`, "not_assessed"),
      );
      const meta: Record<string, RequirementMetaRecord> = {};
      for (let i = 0; i < 8; i++) {
        meta[`r${i}`] = makeMeta({
          title: `Critical ${i}`,
          articleRef: `Art. ${i}`,
          severity: "critical",
          implementationTimeWeeks: i + 1,
        });
      }

      const result = generateRecommendations(profile, statuses, meta);

      expect(result.criticalGaps.length).toBeLessThanOrEqual(5);
    });

    it("handles empty requirement lists gracefully", () => {
      const profile = makeProfile();
      const statuses: RequirementStatusRecord[] = [];
      const meta: Record<string, RequirementMetaRecord> = {};

      const result = generateRecommendations(profile, statuses, meta);

      expect(result.iso27001Coverage.count).toBe(0);
      expect(result.iso27001Coverage.total).toBe(0);
      expect(result.iso27001Coverage.percentage).toBe(0);
      expect(result.criticalGaps).toHaveLength(0);
      expect(result.euSpaceActOverlap.count).toBe(0);
      expect(result.totalImplementationWeeks).toBe(0);
      expect(result.autoAssessedCount).toBe(0);
      expect(result.implementationPhases).toHaveLength(0);
    });
  });
});
