import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only (it throws when imported in non-server context)
vi.mock("server-only", () => ({}));

// Mock cross-references data
vi.mock("@/data/cross-references", () => ({
  CROSS_REFERENCES: [
    {
      id: "xref-001",
      sourceRegulation: "nis2",
      sourceArticle: "Art. 21(2)(a)",
      targetRegulation: "eu_space_act",
      targetArticle: "Art. 76",
      relationship: "overlaps",
      description: "Both require risk management",
      confidence: "confirmed",
    },
    {
      id: "xref-002",
      sourceRegulation: "eu_space_act",
      sourceArticle: "Art. 80",
      targetRegulation: "nis2",
      targetArticle: "Art. 21(2)(b)",
      relationship: "supersedes",
      description: "EU Space Act supersedes NIS2 for incident handling",
      confidence: "confirmed",
    },
    {
      id: "xref-003",
      sourceRegulation: "nis2",
      sourceArticle: "Art. 21(2)(c)",
      targetRegulation: "eu_space_act",
      targetArticle: "Art. 82",
      relationship: "overlaps",
      description: "Business continuity overlap",
      confidence: "interpreted",
    },
    {
      id: "xref-004",
      sourceRegulation: "nis2",
      sourceArticle: "Art. 23",
      targetRegulation: "enisa_space",
      targetArticle: "IM-01",
      relationship: "implements",
      description: "Incident reporting mapping",
      confidence: "confirmed",
    },
  ],
}));

// Mock NIS2 requirements module (lazy loaded)
vi.mock("@/data/nis2-requirements", () => ({
  NIS2_REQUIREMENTS: [
    {
      id: "nis2-risk-policy",
      articleRef: "NIS2 Art. 21(2)(a)",
      category: "policies_risk_analysis",
      title: "Risk Analysis Policies",
      description: "Test description",
      complianceQuestion: "Test?",
      spaceSpecificGuidance: "Space guidance",
      applicableTo: {
        entityClassifications: ["essential", "important"],
        sectors: ["space"],
      },
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
      description: "Test description",
      complianceQuestion: "Test?",
      spaceSpecificGuidance: "Space guidance",
      applicableTo: {
        entityClassifications: ["essential", "important"],
        sectors: ["space"],
      },
      tips: [],
      evidenceRequired: [],
      severity: "critical",
      implementationTimeWeeks: 3,
      canBeSimplified: true,
    },
    {
      id: "nis2-essential-only",
      articleRef: "NIS2 Art. 20",
      category: "governance",
      title: "Governance",
      description: "Test description",
      complianceQuestion: "Test?",
      spaceSpecificGuidance: "Space guidance",
      applicableTo: {
        entityClassifications: ["essential"],
        sectors: ["space"],
      },
      tips: [],
      evidenceRequired: [],
      severity: "major",
      implementationTimeWeeks: 2,
      canBeSimplified: false,
    },
  ],
  getApplicableNIS2Requirements: vi.fn(
    (classification: string, _answers: unknown) => {
      const allReqs = [
        {
          id: "nis2-risk-policy",
          articleRef: "NIS2 Art. 21(2)(a)",
          category: "policies_risk_analysis",
          title: "Risk Analysis Policies",
          severity: "critical",
          implementationTimeWeeks: 4,
          canBeSimplified: false,
          applicableTo: {
            entityClassifications: ["essential", "important"],
          },
        },
        {
          id: "nis2-incident",
          articleRef: "NIS2 Art. 21(2)(b)",
          category: "incident_handling",
          title: "Incident Handling",
          severity: "critical",
          implementationTimeWeeks: 3,
          canBeSimplified: true,
          applicableTo: {
            entityClassifications: ["essential", "important"],
          },
        },
        {
          id: "nis2-essential-only",
          articleRef: "NIS2 Art. 20",
          category: "governance",
          title: "Governance",
          severity: "major",
          implementationTimeWeeks: 2,
          canBeSimplified: false,
          applicableTo: {
            entityClassifications: ["essential"],
          },
        },
      ];
      return allReqs.filter(
        (r) =>
          !r.applicableTo.entityClassifications ||
          r.applicableTo.entityClassifications.includes(classification),
      );
    },
  ),
}));

import {
  classifyNIS2Entity,
  calculateNIS2Compliance,
  redactNIS2ResultForClient,
} from "@/lib/nis2-engine.server";
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";

// ─── Test Helpers ───

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
    entitySize: "medium",
    employeeCount: null,
    annualRevenue: null,
    memberStateCount: 1,
    isEUEstablished: true,
    hasISO27001: false,
    hasExistingCSIRT: false,
    hasRiskManagement: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// Entity Classification Tests
// ═══════════════════════════════════════════════════════════════

describe("classifyNIS2Entity", () => {
  describe("Out of scope classifications", () => {
    it("should classify non-EU entities as out of scope", () => {
      const answers = makeAnswers({ isEUEstablished: false });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("out_of_scope");
      expect(result.reason).toContain("Non-EU entities");
      expect(result.articleRef).toContain("Art. 2");
    });

    it("should classify micro enterprises as out of scope (no special services)", () => {
      const answers = makeAnswers({
        entitySize: "micro",
        operatesSatComms: false,
      });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("out_of_scope");
      expect(result.reason).toContain("Micro enterprises");
      expect(result.articleRef).toContain("Art. 2(1)");
    });

    it("should classify small space entities without critical services as out of scope", () => {
      const answers = makeAnswers({
        entitySize: "small",
        operatesGroundInfra: false,
        operatesSatComms: false,
        providesLaunchServices: false,
      });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("out_of_scope");
      expect(result.reason).toContain("Small enterprises");
    });

    it("should classify entities with null size as out of scope", () => {
      const answers = makeAnswers({
        entitySize: null,
      });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("out_of_scope");
    });
  });

  describe("Essential entity classifications", () => {
    it("should classify large space entities as essential", () => {
      const answers = makeAnswers({ entitySize: "large" });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("essential");
      expect(result.reason).toContain("Large entities");
      expect(result.articleRef).toContain("Art. 3(1)");
    });

    it("should classify medium space entities with ground infra as essential", () => {
      const answers = makeAnswers({
        entitySize: "medium",
        operatesGroundInfra: true,
      });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("essential");
      expect(result.reason).toContain("critical space infrastructure");
    });

    it("should classify medium space entities with SATCOM as essential", () => {
      const answers = makeAnswers({
        entitySize: "medium",
        operatesSatComms: true,
      });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("essential");
      expect(result.articleRef).toContain("Art. 3(1)(e)");
    });

    it("should classify large space entities with ground infra as essential", () => {
      const answers = makeAnswers({
        entitySize: "large",
        operatesGroundInfra: true,
      });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("essential");
      expect(result.articleRef).toContain("Art. 3(1)");
    });
  });

  describe("Important entity classifications", () => {
    it("should classify medium space entities as important", () => {
      const answers = makeAnswers({
        entitySize: "medium",
        operatesGroundInfra: false,
        operatesSatComms: false,
      });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("important");
      expect(result.reason).toContain("Medium entities");
      expect(result.articleRef).toContain("Art. 3(2)");
    });

    it("should classify micro SATCOM operators as important (exception)", () => {
      const answers = makeAnswers({
        entitySize: "micro",
        operatesSatComms: true,
      });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("important");
      expect(result.reason).toContain("satellite communications");
    });

    it("should classify small entities with ground infra as important", () => {
      const answers = makeAnswers({
        entitySize: "small",
        operatesGroundInfra: true,
      });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("important");
      expect(result.reason).toContain("critical space services");
    });

    it("should classify small entities with SATCOM as important", () => {
      const answers = makeAnswers({
        entitySize: "small",
        operatesSatComms: true,
      });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("important");
    });

    it("should classify small entities with launch services as important", () => {
      const answers = makeAnswers({
        entitySize: "small",
        providesLaunchServices: true,
      });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("important");
    });

    it("should classify medium space entities without critical infra as important", () => {
      const answers = makeAnswers({
        entitySize: "medium",
        operatesGroundInfra: false,
        operatesSatComms: false,
        spaceSubSector: "spacecraft_manufacturing",
      });
      const result = classifyNIS2Entity(answers);

      expect(result.classification).toBe("important");
      expect(result.articleRef).toContain("Art. 3(2)");
    });
  });

  describe("Classification reason and articleRef", () => {
    it("should always include a non-empty reason", () => {
      const scenarios = [
        makeAnswers({ entitySize: "large" }),
        makeAnswers({ isEUEstablished: false }),
        makeAnswers({ entitySize: "micro" }),
      ];

      for (const answers of scenarios) {
        const result = classifyNIS2Entity(answers);
        expect(result.reason).toBeTruthy();
        expect(result.reason.length).toBeGreaterThan(10);
      }
    });

    it("should always include an article reference", () => {
      const scenarios = [
        makeAnswers({ entitySize: "large" }),
        makeAnswers({ isEUEstablished: false }),
        makeAnswers({ entitySize: "micro" }),
      ];

      for (const answers of scenarios) {
        const result = classifyNIS2Entity(answers);
        expect(result.articleRef).toBeTruthy();
        expect(result.articleRef).toContain("Art.");
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Full Compliance Calculation Tests
// ═══════════════════════════════════════════════════════════════

describe("calculateNIS2Compliance", () => {
  it("should return a complete compliance result for essential entity", async () => {
    const answers = makeAnswers({ entitySize: "large" });
    const result = await calculateNIS2Compliance(answers);

    expect(result.entityClassification).toBe("essential");
    expect(result.classificationReason).toBeTruthy();
    expect(result.classificationArticleRef).toBeTruthy();
    expect(result.sector).toBe("space");
    expect(result.organizationSize).toBe("large");
  });

  it("should return applicable requirements for in-scope entities", async () => {
    const answers = makeAnswers({ entitySize: "large" });
    const result = await calculateNIS2Compliance(answers);

    expect(result.applicableRequirements.length).toBeGreaterThan(0);
    expect(result.applicableCount).toBe(result.applicableRequirements.length);
    expect(result.totalNIS2Requirements).toBeGreaterThan(0);
  });

  it("should return empty requirements for out-of-scope entities", async () => {
    const answers = makeAnswers({ isEUEstablished: false });
    const result = await calculateNIS2Compliance(answers);

    expect(result.entityClassification).toBe("out_of_scope");
    expect(result.applicableRequirements).toEqual([]);
    expect(result.applicableCount).toBe(0);
  });

  it("should include incident reporting timeline", async () => {
    const answers = makeAnswers({ entitySize: "large" });
    const result = await calculateNIS2Compliance(answers);

    expect(result.incidentReportingTimeline).toBeDefined();
    expect(result.incidentReportingTimeline.earlyWarning.deadline).toBe(
      "24 hours",
    );
    expect(result.incidentReportingTimeline.notification.deadline).toBe(
      "72 hours",
    );
    expect(result.incidentReportingTimeline.finalReport.deadline).toBe(
      "1 month",
    );
  });

  it("should calculate EU Space Act overlap for in-scope entities", async () => {
    const answers = makeAnswers({ entitySize: "large" });
    const result = await calculateNIS2Compliance(answers);

    expect(result.euSpaceActOverlap).toBeDefined();
    expect(result.euSpaceActOverlap.count).toBeGreaterThan(0);
    expect(
      result.euSpaceActOverlap.totalPotentialSavingsWeeks,
    ).toBeGreaterThanOrEqual(0);
  });

  it("should return zero overlap for out-of-scope entities", async () => {
    const answers = makeAnswers({ isEUEstablished: false });
    const result = await calculateNIS2Compliance(answers);

    expect(result.euSpaceActOverlap.count).toBe(0);
    expect(result.euSpaceActOverlap.totalPotentialSavingsWeeks).toBe(0);
    expect(result.euSpaceActOverlap.overlappingRequirements).toEqual([]);
  });

  it("should include penalty information", async () => {
    const answers = makeAnswers({ entitySize: "large" });
    const result = await calculateNIS2Compliance(answers);

    expect(result.penalties).toBeDefined();
    expect(result.penalties.essential).toContain("10,000,000");
    expect(result.penalties.important).toContain("7,000,000");
    expect(result.penalties.applicable).toContain("10,000,000"); // essential entity
  });

  it("should show N/A penalties for out-of-scope", async () => {
    const answers = makeAnswers({ isEUEstablished: false });
    const result = await calculateNIS2Compliance(answers);

    expect(result.penalties.applicable).toContain("N/A");
  });

  it("should set registration required for in-scope entities", async () => {
    const answers = makeAnswers({ entitySize: "large" });
    const result = await calculateNIS2Compliance(answers);

    expect(result.registrationRequired).toBe(true);
    expect(result.registrationDeadline).toContain("Art. 3(4)");
  });

  it("should set registration not required for out-of-scope entities", async () => {
    const answers = makeAnswers({ isEUEstablished: false });
    const result = await calculateNIS2Compliance(answers);

    expect(result.registrationRequired).toBe(false);
  });

  it("should include key dates with EU Space Act date for in-scope entities", async () => {
    const answers = makeAnswers({ entitySize: "large" });
    const result = await calculateNIS2Compliance(answers);

    expect(result.keyDates.length).toBeGreaterThan(2);
    const hasSpaceActDate = result.keyDates.some((d) =>
      d.description.includes("EU Space Act"),
    );
    expect(hasSpaceActDate).toBe(true);
  });

  it("should handle multi-member-state supervisory authority", async () => {
    const answers = makeAnswers({
      entitySize: "large",
      memberStateCount: 5,
    });
    const result = await calculateNIS2Compliance(answers);

    expect(result.supervisoryAuthority).toContain("Primary");
    expect(result.supervisoryAuthorityNote).toContain("multiple member states");
  });

  it("should handle single member state supervisory authority", async () => {
    const answers = makeAnswers({
      entitySize: "large",
      memberStateCount: 1,
    });
    const result = await calculateNIS2Compliance(answers);

    expect(result.supervisoryAuthority).toContain(
      "National competent authority",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// Redaction Tests
// ═══════════════════════════════════════════════════════════════

describe("redactNIS2ResultForClient", () => {
  it("should strip sensitive fields from requirements", async () => {
    const answers = makeAnswers({ entitySize: "large" });
    const fullResult = await calculateNIS2Compliance(answers);
    const redacted = redactNIS2ResultForClient(fullResult);

    expect(redacted.entityClassification).toBe(fullResult.entityClassification);
    expect(redacted.classificationReason).toBe(fullResult.classificationReason);
    expect(redacted.applicableCount).toBe(fullResult.applicableCount);

    // Redacted requirements should only have: id, articleRef, category, title, severity
    for (const req of redacted.applicableRequirements) {
      expect(req).toHaveProperty("id");
      expect(req).toHaveProperty("articleRef");
      expect(req).toHaveProperty("category");
      expect(req).toHaveProperty("title");
      expect(req).toHaveProperty("severity");
      // Should NOT have sensitive fields
      expect(req).not.toHaveProperty("description");
      expect(req).not.toHaveProperty("spaceSpecificGuidance");
      expect(req).not.toHaveProperty("tips");
      expect(req).not.toHaveProperty("evidenceRequired");
      expect(req).not.toHaveProperty("euSpaceActRef");
      expect(req).not.toHaveProperty("enisaControlIds");
      expect(req).not.toHaveProperty("iso27001Ref");
    }
  });

  it("should strip overlapping requirements details from EU Space Act overlap", async () => {
    const answers = makeAnswers({ entitySize: "large" });
    const fullResult = await calculateNIS2Compliance(answers);
    const redacted = redactNIS2ResultForClient(fullResult);

    expect(redacted.euSpaceActOverlap.count).toBe(
      fullResult.euSpaceActOverlap.count,
    );
    expect(redacted.euSpaceActOverlap.totalPotentialSavingsWeeks).toBe(
      fullResult.euSpaceActOverlap.totalPotentialSavingsWeeks,
    );
    // Should not have detailed overlapping requirements
    expect(
      (redacted.euSpaceActOverlap as Record<string, unknown>)
        .overlappingRequirements,
    ).toBeUndefined();
  });

  it("should preserve non-sensitive fields", async () => {
    const answers = makeAnswers({ entitySize: "large" });
    const fullResult = await calculateNIS2Compliance(answers);
    const redacted = redactNIS2ResultForClient(fullResult);

    expect(redacted.sector).toBe(fullResult.sector);
    expect(redacted.subSector).toBe(fullResult.subSector);
    expect(redacted.organizationSize).toBe(fullResult.organizationSize);
    expect(redacted.penalties).toEqual(fullResult.penalties);
    expect(redacted.registrationRequired).toBe(fullResult.registrationRequired);
    expect(redacted.incidentReportingTimeline).toEqual(
      fullResult.incidentReportingTimeline,
    );
    expect(redacted.keyDates).toEqual(fullResult.keyDates);
  });
});
