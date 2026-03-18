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
    {
      id: "xref-005",
      sourceRegulation: "nis2",
      sourceArticle: "Art. 21(2)(h)",
      targetRegulation: "eu_space_act",
      targetArticle: "Art. 78",
      relationship: "supersedes",
      description: "EU Space Act supersedes NIS2 for cryptography requirements",
      confidence: "confirmed",
    },
  ],
}));

// Mock NIS2 requirements module (lazy loaded by engine) — use importOriginal to
// preserve the real classifyNIS2Entity and getApplicableNIS2Requirements functions
// from the data file while substituting a lightweight NIS2_REQUIREMENTS array.
// NOTE: vi.mock factories are hoisted to the top of the file; no top-level
// variables can be referenced here.  All data must be defined inline.
vi.mock("@/data/nis2-requirements", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/data/nis2-requirements")>();

  const mockReqs = [
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
        organizationSizes: ["small", "medium", "large"],
      },
      euSpaceActRef: "Art. 74",
      enisaControlIds: ["3.1.1"],
      iso27001Ref: "A.5.1",
      tips: ["tip1"],
      evidenceRequired: ["evidence1"],
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
        organizationSizes: ["small", "medium", "large"],
      },
      euSpaceActRef: "Art. 80",
      enisaControlIds: ["3.2.1"],
      iso27001Ref: "A.5.24",
      tips: ["tip1"],
      evidenceRequired: ["evidence1"],
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
        organizationSizes: ["medium", "large"],
      },
      euSpaceActRef: "Art. 72",
      enisaControlIds: ["1.1.1"],
      iso27001Ref: "A.6.1",
      tips: ["tip1"],
      evidenceRequired: ["evidence1"],
      severity: "major",
      implementationTimeWeeks: 2,
      canBeSimplified: false,
    },
    {
      id: "nis2-satcom-only",
      articleRef: "NIS2 Art. 21(2)(e)",
      category: "network_acquisition",
      title: "SATCOM Network Security",
      description: "Test description",
      complianceQuestion: "Test?",
      spaceSpecificGuidance: "Space guidance",
      applicableTo: {
        entityClassifications: ["essential", "important"],
        sectors: ["space"],
        subSectors: ["satellite_communications"],
        organizationSizes: ["small", "medium", "large"],
      },
      tips: [],
      evidenceRequired: [],
      severity: "major",
      implementationTimeWeeks: 6,
      canBeSimplified: false,
    },
  ];

  return {
    ...actual,
    NIS2_REQUIREMENTS: mockReqs,
    // Re-implement getApplicableNIS2Requirements operating on the mock data
    // so that the engine's lazy-load path works with controlled fixtures.
    getApplicableNIS2Requirements: (
      classification: string,
      answers: unknown,
    ) => {
      if (classification === "out_of_scope") return [];
      const ans = answers as Record<string, unknown>;
      return mockReqs.filter((req) => {
        const appl = req.applicableTo as Record<string, string[]>;
        if (
          appl.entityClassifications &&
          !appl.entityClassifications.includes(classification)
        )
          return false;
        if (
          appl.sectors &&
          ans["sector"] !== null &&
          !appl.sectors.includes(ans["sector"] as string)
        )
          return false;
        if (
          appl.subSectors &&
          appl.subSectors.length > 0 &&
          ans["spaceSubSector"] !== null
        ) {
          if (!appl.subSectors.includes(ans["spaceSubSector"] as string))
            return false;
        }
        if (
          appl.organizationSizes &&
          ans["entitySize"] !== null &&
          !appl.organizationSizes.includes(ans["entitySize"] as string)
        )
          return false;
        return true;
      });
    },
  };
});

import {
  classifyNIS2Entity,
  calculateNIS2Compliance,
  redactNIS2ResultForClient,
} from "@/lib/nis2-engine.server";
import {
  classifyNIS2Entity as classifyNIS2EntityFromData,
  getApplicableNIS2Requirements,
  NIS2_REQUIREMENTS,
} from "@/data/nis2-requirements";
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
// ENGINE classifyNIS2Entity — Classification Matrix Tests
// ═══════════════════════════════════════════════════════════════

describe("classifyNIS2Entity (engine — src/lib/nis2-engine.server.ts)", () => {
  // ── Non-EU ──────────────────────────────────────────────────

  describe("Non-EU → out_of_scope", () => {
    it("classifies non-EU entities as out_of_scope", () => {
      const result = classifyNIS2Entity(
        makeAnswers({ isEUEstablished: false }),
      );
      expect(result.classification).toBe("out_of_scope");
    });

    it("includes Art. 2 reference for non-EU entities", () => {
      const result = classifyNIS2Entity(
        makeAnswers({ isEUEstablished: false }),
      );
      expect(result.articleRef).toContain("Art. 2");
    });

    it("mentions Art. 26 representative requirement for non-EU", () => {
      const result = classifyNIS2Entity(
        makeAnswers({ isEUEstablished: false }),
      );
      expect(result.articleRef).toContain("Art. 26");
    });

    it("non-EU trumps all size/service flags", () => {
      // Even a large SATCOM operator is out_of_scope if not EU-established
      const result = classifyNIS2Entity(
        makeAnswers({
          isEUEstablished: false,
          entitySize: "large",
          operatesSatComms: true,
          operatesGroundInfra: true,
        }),
      );
      expect(result.classification).toBe("out_of_scope");
    });
  });

  // ── Micro ────────────────────────────────────────────────────

  describe("Micro → out_of_scope (with SATCOM carve-out)", () => {
    it("classifies micro without SATCOM as out_of_scope", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "micro",
          operatesSatComms: false,
        }),
      );
      expect(result.classification).toBe("out_of_scope");
      expect(result.articleRef).toContain("Art. 2(1)");
    });

    it("micro with ground infra only is still out_of_scope", () => {
      // Ground infra does NOT trigger the micro carve-out; only SATCOM does
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "micro",
          operatesGroundInfra: true,
          operatesSatComms: false,
        }),
      );
      expect(result.classification).toBe("out_of_scope");
    });

    it("micro with launch services only is still out_of_scope", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "micro",
          providesLaunchServices: true,
          operatesSatComms: false,
        }),
      );
      expect(result.classification).toBe("out_of_scope");
    });

    it("micro + SATCOM carve-out → important (Art. 2(2)(b))", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "micro",
          operatesSatComms: true,
        }),
      );
      expect(result.classification).toBe("important");
      expect(result.articleRef).toContain("Art. 2(2)(b)");
    });

    it("micro + SATCOM reason mentions satellite communications", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "micro",
          operatesSatComms: true,
        }),
      );
      expect(result.reason).toMatch(/satellite communications/i);
    });
  });

  // ── Large → essential ────────────────────────────────────────

  describe("Large → essential", () => {
    it("classifies large entities as essential", () => {
      const result = classifyNIS2Entity(makeAnswers({ entitySize: "large" }));
      expect(result.classification).toBe("essential");
    });

    it("includes Art. 3(1)(a) for large entities", () => {
      const result = classifyNIS2Entity(makeAnswers({ entitySize: "large" }));
      expect(result.articleRef).toContain("Art. 3(1)");
    });

    it("large entity reason mentions 250 employees threshold", () => {
      const result = classifyNIS2Entity(makeAnswers({ entitySize: "large" }));
      expect(result.reason).toContain("250");
    });

    it("large entity with no special services is still essential", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "large",
          operatesGroundInfra: false,
          operatesSatComms: false,
          providesLaunchServices: false,
        }),
      );
      expect(result.classification).toBe("essential");
    });
  });

  // ── Medium ───────────────────────────────────────────────────

  describe("Medium + ground infra → essential", () => {
    it("classifies medium + ground infra as essential", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "medium",
          operatesGroundInfra: true,
        }),
      );
      expect(result.classification).toBe("essential");
    });

    it("includes Art. 3(1)(e) reference", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "medium",
          operatesGroundInfra: true,
        }),
      );
      expect(result.articleRef).toContain("Art. 3(1)(e)");
    });
  });

  describe("Medium + SATCOM → essential", () => {
    it("classifies medium + SATCOM as essential", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "medium",
          operatesSatComms: true,
        }),
      );
      expect(result.classification).toBe("essential");
    });

    it("medium + both ground infra and SATCOM is essential", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "medium",
          operatesGroundInfra: true,
          operatesSatComms: true,
        }),
      );
      expect(result.classification).toBe("essential");
    });
  });

  describe("Medium + other → important", () => {
    it("classifies medium without critical infra as important", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "medium",
          operatesGroundInfra: false,
          operatesSatComms: false,
        }),
      );
      expect(result.classification).toBe("important");
    });

    it("includes Art. 3(2) for medium important entities", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "medium",
          operatesGroundInfra: false,
          operatesSatComms: false,
        }),
      );
      expect(result.articleRef).toContain("Art. 3(2)");
    });

    it("medium spacecraft manufacturer is important", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "medium",
          spaceSubSector: "spacecraft_manufacturing",
          operatesGroundInfra: false,
          operatesSatComms: false,
        }),
      );
      expect(result.classification).toBe("important");
    });

    it("medium earth observation provider is important", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "medium",
          providesEOData: true,
          operatesGroundInfra: false,
          operatesSatComms: false,
        }),
      );
      expect(result.classification).toBe("important");
    });
  });

  // ── Small ────────────────────────────────────────────────────

  describe("Small + critical services → important", () => {
    it("classifies small + ground infra as important", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "small",
          operatesGroundInfra: true,
        }),
      );
      expect(result.classification).toBe("important");
    });

    it("classifies small + SATCOM as important", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "small",
          operatesSatComms: true,
        }),
      );
      expect(result.classification).toBe("important");
    });

    it("classifies small + launch services as important", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "small",
          providesLaunchServices: true,
        }),
      );
      expect(result.classification).toBe("important");
    });

    it("includes Art. 2(2)(b) for small important entities", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "small",
          operatesGroundInfra: true,
        }),
      );
      expect(result.articleRef).toContain("Art. 2(2)(b)");
    });

    it("small entity with all critical services is important", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "small",
          operatesGroundInfra: true,
          operatesSatComms: true,
          providesLaunchServices: true,
        }),
      );
      expect(result.classification).toBe("important");
    });
  });

  describe("Small + non-critical → out_of_scope", () => {
    it("classifies small without critical services as out_of_scope", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "small",
          operatesGroundInfra: false,
          operatesSatComms: false,
          providesLaunchServices: false,
        }),
      );
      expect(result.classification).toBe("out_of_scope");
    });

    it("small + EO data only is out_of_scope in engine", () => {
      // NOTE: The engine does NOT include EO data as a carve-out trigger for small entities.
      // The data file DOES include EO data. This is a divergence point.
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "small",
          providesEOData: true,
          operatesGroundInfra: false,
          operatesSatComms: false,
          providesLaunchServices: false,
        }),
      );
      expect(result.classification).toBe("out_of_scope");
    });

    it("includes Art. 2(1) reference for small out-of-scope", () => {
      const result = classifyNIS2Entity(
        makeAnswers({
          entitySize: "small",
          operatesGroundInfra: false,
          operatesSatComms: false,
          providesLaunchServices: false,
        }),
      );
      expect(result.articleRef).toContain("Art. 2(1)");
    });
  });

  // ── Null / unknown size ──────────────────────────────────────

  describe("Null or unknown entity size → out_of_scope (fallback)", () => {
    it("classifies null entity size as out_of_scope", () => {
      const result = classifyNIS2Entity(makeAnswers({ entitySize: null }));
      expect(result.classification).toBe("out_of_scope");
    });

    it("classifies unknown entity size string as out_of_scope", () => {
      const result = classifyNIS2Entity(
        makeAnswers({ entitySize: "unknown" as never }),
      );
      expect(result.classification).toBe("out_of_scope");
    });

    it("fallback always returns an articleRef containing Art. 2", () => {
      const result = classifyNIS2Entity(makeAnswers({ entitySize: null }));
      expect(result.articleRef).toContain("Art. 2");
    });
  });

  // ── Return shape ─────────────────────────────────────────────

  describe("Return shape invariants", () => {
    const allScenarios: Array<Partial<NIS2AssessmentAnswers>> = [
      { entitySize: "large" },
      { entitySize: "medium", operatesGroundInfra: true },
      {
        entitySize: "medium",
        operatesSatComms: false,
        operatesGroundInfra: false,
      },
      { entitySize: "small", operatesGroundInfra: true },
      {
        entitySize: "small",
        operatesGroundInfra: false,
        operatesSatComms: false,
        providesLaunchServices: false,
      },
      { entitySize: "micro", operatesSatComms: true },
      { entitySize: "micro", operatesSatComms: false },
      { isEUEstablished: false },
    ];

    it.each(allScenarios)(
      "always returns non-empty reason and articleRef (%o)",
      (overrides) => {
        const result = classifyNIS2Entity(makeAnswers(overrides));
        expect(result.reason).toBeTruthy();
        expect(result.reason.length).toBeGreaterThan(10);
        expect(result.articleRef).toBeTruthy();
        expect(result.articleRef).toContain("Art.");
      },
    );

    it("always returns one of the three valid classifications", () => {
      const valid = new Set(["out_of_scope", "essential", "important"]);
      const scenarios = allScenarios.map((o) => makeAnswers(o));
      for (const answers of scenarios) {
        const result = classifyNIS2Entity(answers);
        expect(valid.has(result.classification)).toBe(true);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// DATA FILE classifyNIS2Entity — Documenting Divergences
// ═══════════════════════════════════════════════════════════════

/**
 * DIVERGENCE DOCUMENTATION
 * ─────────────────────────
 * There are TWO separate `classifyNIS2Entity` implementations:
 *
 *   1. src/lib/nis2-engine.server.ts   (engine)
 *   2. src/data/nis2-requirements.ts   (data)
 *
 * Key behavioural differences:
 *
 * | Scenario                              | Engine result  | Data result    |
 * |---------------------------------------|---------------|----------------|
 * | Micro + SATCOM                        | important      | out_of_scope   |
 * | Small + non-critical                  | out_of_scope   | important      |
 * | Small + EO data only                  | out_of_scope   | important      |
 * | Non-space sector (e.g. "energy")      | ignores sector | out_of_scope   |
 * | Null sector                           | treats as space| out_of_scope   |
 * | Return shape                          | has articleRef | no articleRef  |
 * | Micro + ground infra (no SATCOM)      | out_of_scope   | out_of_scope   |
 *
 * This divergence may cause inconsistencies between the assessment wizard
 * (which uses the data-file function) and the compliance report (engine).
 */
describe("classifyNIS2Entity (data — src/data/nis2-requirements.ts)", () => {
  // ── Non-EU ──────────────────────────────────────────────────

  describe("Non-EU → out_of_scope", () => {
    it("classifies non-EU entities as out_of_scope", () => {
      const result = classifyNIS2EntityFromData(
        makeAnswers({ isEUEstablished: false, sector: "space" }),
      );
      expect(result.classification).toBe("out_of_scope");
    });

    it("returns no articleRef (data fn only has reason field)", () => {
      const result = classifyNIS2EntityFromData(
        makeAnswers({ isEUEstablished: false, sector: "space" }),
      );
      expect((result as Record<string, unknown>).articleRef).toBeUndefined();
      expect(result.reason).toBeTruthy();
    });
  });

  // ── Sector filtering ──────────────────────────────────────────

  describe("Non-space sector → out_of_scope (data-file only feature)", () => {
    it("classifies non-space sector as out_of_scope", () => {
      const result = classifyNIS2EntityFromData(
        makeAnswers({ sector: "energy", entitySize: "large" }),
      );
      expect(result.classification).toBe("out_of_scope");
    });

    it("classifies null sector as out_of_scope", () => {
      const result = classifyNIS2EntityFromData(
        makeAnswers({ sector: null, entitySize: "large" }),
      );
      expect(result.classification).toBe("out_of_scope");
    });
  });

  // ── Micro ─────────────────────────────────────────────────────

  describe("Micro → out_of_scope (NO SATCOM carve-out in data file)", () => {
    it("classifies micro as out_of_scope — even with SATCOM", () => {
      // DIVERGENCE: Engine returns important for micro+SATCOM; data file returns out_of_scope
      const result = classifyNIS2EntityFromData(
        makeAnswers({
          entitySize: "micro",
          operatesSatComms: true,
          sector: "space",
        }),
      );
      expect(result.classification).toBe("out_of_scope");
    });

    it("classifies micro without SATCOM as out_of_scope", () => {
      const result = classifyNIS2EntityFromData(
        makeAnswers({
          entitySize: "micro",
          operatesSatComms: false,
          sector: "space",
        }),
      );
      expect(result.classification).toBe("out_of_scope");
    });
  });

  // ── Large ─────────────────────────────────────────────────────

  describe("Large → essential", () => {
    it("classifies large space entities as essential", () => {
      const result = classifyNIS2EntityFromData(
        makeAnswers({ entitySize: "large", sector: "space" }),
      );
      expect(result.classification).toBe("essential");
    });
  });

  // ── Medium ────────────────────────────────────────────────────

  describe("Medium + ground infra → essential", () => {
    it("classifies medium + ground infra as essential", () => {
      const result = classifyNIS2EntityFromData(
        makeAnswers({
          entitySize: "medium",
          operatesGroundInfra: true,
          sector: "space",
        }),
      );
      expect(result.classification).toBe("essential");
    });
  });

  describe("Medium + SATCOM → essential", () => {
    it("classifies medium + SATCOM as essential", () => {
      const result = classifyNIS2EntityFromData(
        makeAnswers({
          entitySize: "medium",
          operatesSatComms: true,
          sector: "space",
        }),
      );
      expect(result.classification).toBe("essential");
    });
  });

  describe("Medium + other → important", () => {
    it("classifies medium without critical infra as important", () => {
      const result = classifyNIS2EntityFromData(
        makeAnswers({
          entitySize: "medium",
          operatesGroundInfra: false,
          operatesSatComms: false,
          sector: "space",
        }),
      );
      expect(result.classification).toBe("important");
    });
  });

  // ── Small ─────────────────────────────────────────────────────

  describe("Small → important (data file always returns important for small)", () => {
    it("classifies small + critical services as important", () => {
      const result = classifyNIS2EntityFromData(
        makeAnswers({
          entitySize: "small",
          operatesSatComms: true,
          sector: "space",
        }),
      );
      expect(result.classification).toBe("important");
    });

    it("classifies small + EO data as important (DIVERGENCE: engine returns out_of_scope)", () => {
      // DIVERGENCE: Data file includes EO data as a trigger; engine does NOT.
      const result = classifyNIS2EntityFromData(
        makeAnswers({
          entitySize: "small",
          providesEOData: true,
          operatesGroundInfra: false,
          operatesSatComms: false,
          providesLaunchServices: false,
          sector: "space",
        }),
      );
      expect(result.classification).toBe("important");
    });

    it("classifies small + NO critical services as important (DIVERGENCE: engine returns out_of_scope)", () => {
      // DIVERGENCE: Data file classifies all small space entities as important.
      // Engine returns out_of_scope for small entities without critical services.
      const result = classifyNIS2EntityFromData(
        makeAnswers({
          entitySize: "small",
          operatesGroundInfra: false,
          operatesSatComms: false,
          providesLaunchServices: false,
          providesEOData: false,
          sector: "space",
        }),
      );
      expect(result.classification).toBe("important");
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// DIVERGENCE MATRIX — Direct comparison of the two functions
// ═══════════════════════════════════════════════════════════════

describe("Classification divergence: engine vs data file", () => {
  it("DIVERGENCE — micro + SATCOM: engine=important, data=out_of_scope", () => {
    const answers = makeAnswers({
      entitySize: "micro",
      operatesSatComms: true,
      sector: "space",
    });
    const engineResult = classifyNIS2Entity(answers);
    const dataResult = classifyNIS2EntityFromData(answers);

    expect(engineResult.classification).toBe("important");
    expect(dataResult.classification).toBe("out_of_scope");
    // Explicit assertion that they diverge
    expect(engineResult.classification).not.toBe(dataResult.classification);
  });

  it("DIVERGENCE — small + non-critical: engine=out_of_scope, data=important", () => {
    const answers = makeAnswers({
      entitySize: "small",
      operatesGroundInfra: false,
      operatesSatComms: false,
      providesLaunchServices: false,
      providesEOData: false,
      sector: "space",
    });
    const engineResult = classifyNIS2Entity(answers);
    const dataResult = classifyNIS2EntityFromData(answers);

    expect(engineResult.classification).toBe("out_of_scope");
    expect(dataResult.classification).toBe("important");
    expect(engineResult.classification).not.toBe(dataResult.classification);
  });

  it("DIVERGENCE — small + EO data only: engine=out_of_scope, data=important", () => {
    const answers = makeAnswers({
      entitySize: "small",
      providesEOData: true,
      operatesGroundInfra: false,
      operatesSatComms: false,
      providesLaunchServices: false,
      sector: "space",
    });
    const engineResult = classifyNIS2Entity(answers);
    const dataResult = classifyNIS2EntityFromData(answers);

    expect(engineResult.classification).toBe("out_of_scope");
    expect(dataResult.classification).toBe("important");
    expect(engineResult.classification).not.toBe(dataResult.classification);
  });

  it("DIVERGENCE — data file lacks articleRef field", () => {
    const answers = makeAnswers({ entitySize: "large", sector: "space" });
    const engineResult = classifyNIS2Entity(answers);
    const dataResult = classifyNIS2EntityFromData(answers);

    // Engine always returns articleRef
    expect(engineResult.articleRef).toBeTruthy();
    // Data file result does not include articleRef
    expect((dataResult as Record<string, unknown>).articleRef).toBeUndefined();
  });

  it("AGREEMENT — large space entity: both return essential", () => {
    const answers = makeAnswers({ entitySize: "large", sector: "space" });
    expect(classifyNIS2Entity(answers).classification).toBe("essential");
    expect(classifyNIS2EntityFromData(answers).classification).toBe(
      "essential",
    );
  });

  it("AGREEMENT — medium + ground infra: both return essential", () => {
    const answers = makeAnswers({
      entitySize: "medium",
      operatesGroundInfra: true,
      sector: "space",
    });
    expect(classifyNIS2Entity(answers).classification).toBe("essential");
    expect(classifyNIS2EntityFromData(answers).classification).toBe(
      "essential",
    );
  });

  it("AGREEMENT — medium + SATCOM: both return essential", () => {
    const answers = makeAnswers({
      entitySize: "medium",
      operatesSatComms: true,
      sector: "space",
    });
    expect(classifyNIS2Entity(answers).classification).toBe("essential");
    expect(classifyNIS2EntityFromData(answers).classification).toBe(
      "essential",
    );
  });

  it("AGREEMENT — medium + other: both return important", () => {
    const answers = makeAnswers({
      entitySize: "medium",
      operatesGroundInfra: false,
      operatesSatComms: false,
      sector: "space",
    });
    expect(classifyNIS2Entity(answers).classification).toBe("important");
    expect(classifyNIS2EntityFromData(answers).classification).toBe(
      "important",
    );
  });

  it("AGREEMENT — non-EU: both return out_of_scope", () => {
    const answers = makeAnswers({ isEUEstablished: false, sector: "space" });
    expect(classifyNIS2Entity(answers).classification).toBe("out_of_scope");
    expect(classifyNIS2EntityFromData(answers).classification).toBe(
      "out_of_scope",
    );
  });

  it("AGREEMENT — small + launch services: both return important", () => {
    const answers = makeAnswers({
      entitySize: "small",
      providesLaunchServices: true,
      sector: "space",
    });
    expect(classifyNIS2Entity(answers).classification).toBe("important");
    expect(classifyNIS2EntityFromData(answers).classification).toBe(
      "important",
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// getApplicableNIS2Requirements (data file)
// ═══════════════════════════════════════════════════════════════

describe("getApplicableNIS2Requirements (src/data/nis2-requirements.ts)", () => {
  it("returns empty array for out_of_scope", () => {
    const answers = makeAnswers({ isEUEstablished: false });
    const result = getApplicableNIS2Requirements("out_of_scope", answers);
    expect(result).toEqual([]);
  });

  it("returns requirements for essential classification", () => {
    const answers = makeAnswers({ entitySize: "large" });
    const result = getApplicableNIS2Requirements("essential", answers);
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns requirements for important classification", () => {
    const answers = makeAnswers({ entitySize: "medium" });
    const result = getApplicableNIS2Requirements("important", answers);
    expect(result.length).toBeGreaterThan(0);
  });

  it("essential gets at least as many requirements as important", () => {
    const essentialAnswers = makeAnswers({ entitySize: "large" });
    const importantAnswers = makeAnswers({ entitySize: "medium" });
    const essentialReqs = getApplicableNIS2Requirements(
      "essential",
      essentialAnswers,
    );
    const importantReqs = getApplicableNIS2Requirements(
      "important",
      importantAnswers,
    );
    expect(essentialReqs.length).toBeGreaterThanOrEqual(importantReqs.length);
  });

  it("filters requirements that only apply to essential", () => {
    const answers = makeAnswers({ entitySize: "medium" });
    const importantReqs = getApplicableNIS2Requirements("important", answers);
    const essentialOnlyIds = NIS2_REQUIREMENTS.filter(
      (r) =>
        r.applicableTo.entityClassifications &&
        r.applicableTo.entityClassifications.length === 1 &&
        r.applicableTo.entityClassifications[0] === "essential",
    ).map((r) => r.id);

    for (const id of essentialOnlyIds) {
      expect(importantReqs.find((r) => r.id === id)).toBeUndefined();
    }
  });

  it("filters by sub-sector when spaceSubSector is set and requirements specify subSectors", () => {
    const satcomAnswers = makeAnswers({
      entitySize: "large",
      spaceSubSector: "satellite_communications",
    });
    const groundAnswers = makeAnswers({
      entitySize: "large",
      spaceSubSector: "ground_infrastructure",
    });

    const satcomReqs = getApplicableNIS2Requirements(
      "essential",
      satcomAnswers,
    );
    const groundReqs = getApplicableNIS2Requirements(
      "essential",
      groundAnswers,
    );

    // satcom-only requirements should appear for satcom but not for ground
    const satcomOnlyIds = NIS2_REQUIREMENTS.filter(
      (r) =>
        r.applicableTo.subSectors &&
        r.applicableTo.subSectors.length > 0 &&
        r.applicableTo.subSectors.includes("satellite_communications") &&
        !r.applicableTo.subSectors.includes("ground_infrastructure"),
    ).map((r) => r.id);

    for (const id of satcomOnlyIds) {
      expect(satcomReqs.find((r) => r.id === id)).toBeDefined();
      expect(groundReqs.find((r) => r.id === id)).toBeUndefined();
    }
  });

  it("all returned requirements match the given classification", () => {
    const answers = makeAnswers({ entitySize: "medium" });
    const reqs = getApplicableNIS2Requirements("important", answers);
    for (const req of reqs) {
      if (req.applicableTo.entityClassifications) {
        expect(req.applicableTo.entityClassifications).toContain("important");
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Full Compliance Calculation Tests
// ═══════════════════════════════════════════════════════════════

describe("calculateNIS2Compliance", () => {
  it("returns a complete compliance result for essential entity", async () => {
    const answers = makeAnswers({ entitySize: "large" });
    const result = await calculateNIS2Compliance(answers);

    expect(result.entityClassification).toBe("essential");
    expect(result.classificationReason).toBeTruthy();
    expect(result.classificationArticleRef).toBeTruthy();
    expect(result.sector).toBe("space");
    expect(result.organizationSize).toBe("large");
  });

  it("returns applicable requirements for in-scope entities", async () => {
    const answers = makeAnswers({ entitySize: "large" });
    const result = await calculateNIS2Compliance(answers);

    expect(result.applicableRequirements.length).toBeGreaterThan(0);
    expect(result.applicableCount).toBe(result.applicableRequirements.length);
    expect(result.totalNIS2Requirements).toBeGreaterThan(0);
  });

  it("returns more requirements for essential than important", async () => {
    const essentialAnswers = makeAnswers({ entitySize: "large" });
    const importantAnswers = makeAnswers({
      entitySize: "medium",
      operatesGroundInfra: false,
      operatesSatComms: false,
    });

    const essentialResult = await calculateNIS2Compliance(essentialAnswers);
    const importantResult = await calculateNIS2Compliance(importantAnswers);

    expect(essentialResult.applicableCount).toBeGreaterThanOrEqual(
      importantResult.applicableCount,
    );
  });

  it("returns empty requirements for out-of-scope entities", async () => {
    const answers = makeAnswers({ isEUEstablished: false });
    const result = await calculateNIS2Compliance(answers);

    expect(result.entityClassification).toBe("out_of_scope");
    expect(result.applicableRequirements).toEqual([]);
    expect(result.applicableCount).toBe(0);
  });

  it("sector is always 'space' (Caelex is space-only)", async () => {
    const result = await calculateNIS2Compliance(
      makeAnswers({ entitySize: "large" }),
    );
    expect(result.sector).toBe("space");
  });

  it("applicableCount matches applicableRequirements.length", async () => {
    const answers = makeAnswers({
      entitySize: "medium",
      operatesGroundInfra: true,
    });
    const result = await calculateNIS2Compliance(answers);
    expect(result.applicableCount).toBe(result.applicableRequirements.length);
  });

  // ── Incident Reporting Timeline ──────────────────────────────

  describe("Incident Reporting Timeline", () => {
    it("earlyWarning deadline is exactly '24 hours'", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.incidentReportingTimeline.earlyWarning.deadline).toBe(
        "24 hours",
      );
    });

    it("notification deadline is exactly '72 hours'", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.incidentReportingTimeline.notification.deadline).toBe(
        "72 hours",
      );
    });

    it("finalReport deadline is exactly '1 month'", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.incidentReportingTimeline.finalReport.deadline).toBe(
        "1 month",
      );
    });

    it("intermediateReport deadline is 'Upon request'", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.incidentReportingTimeline.intermediateReport.deadline).toBe(
        "Upon request",
      );
    });

    it("all four timeline phases have non-empty descriptions", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      const tl = result.incidentReportingTimeline;
      expect(tl.earlyWarning.description.length).toBeGreaterThan(20);
      expect(tl.notification.description.length).toBeGreaterThan(20);
      expect(tl.intermediateReport.description.length).toBeGreaterThan(20);
      expect(tl.finalReport.description.length).toBeGreaterThan(20);
    });

    it("earlyWarning description mentions CSIRT or competent authority", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.incidentReportingTimeline.earlyWarning.description).toMatch(
        /CSIRT|competent authority/i,
      );
    });

    it("finalReport description lists required content items", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      const desc = result.incidentReportingTimeline.finalReport.description;
      // Should reference root cause / threat type per NIS2 Art. 23(4)
      expect(desc).toMatch(/threat|root cause/i);
    });

    it("timeline is identical for essential and important entities", async () => {
      const essentialResult = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      const importantResult = await calculateNIS2Compliance(
        makeAnswers({
          entitySize: "medium",
          operatesGroundInfra: false,
          operatesSatComms: false,
        }),
      );
      expect(essentialResult.incidentReportingTimeline).toEqual(
        importantResult.incidentReportingTimeline,
      );
    });

    it("timeline is still present for out-of-scope entities", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ isEUEstablished: false }),
      );
      // Timeline is returned regardless of classification
      expect(result.incidentReportingTimeline.earlyWarning.deadline).toBe(
        "24 hours",
      );
      expect(result.incidentReportingTimeline.finalReport.deadline).toBe(
        "1 month",
      );
    });
  });

  // ── Penalty Thresholds ───────────────────────────────────────

  describe("Penalty Thresholds", () => {
    it("essential applicable penalty contains €10M / 2%", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.penalties.applicable).toContain("10,000,000");
      expect(result.penalties.applicable).toContain("2%");
    });

    it("essential.essential field shows €10M / 2%", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.penalties.essential).toContain("10,000,000");
      expect(result.penalties.essential).toContain("2%");
    });

    it("important applicable penalty contains €7M / 1.4%", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({
          entitySize: "medium",
          operatesGroundInfra: false,
          operatesSatComms: false,
        }),
      );
      expect(result.penalties.applicable).toContain("7,000,000");
      expect(result.penalties.applicable).toContain("1.4%");
    });

    it("important.important field shows €7M / 1.4%", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({
          entitySize: "medium",
          operatesGroundInfra: false,
          operatesSatComms: false,
        }),
      );
      expect(result.penalties.important).toContain("7,000,000");
      expect(result.penalties.important).toContain("1.4%");
    });

    it("out-of-scope applicable penalty is N/A", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ isEUEstablished: false }),
      );
      expect(result.penalties.applicable).toContain("N/A");
    });

    it("essential and important base fields are always present regardless of classification", async () => {
      // The result always contains both thresholds for reference
      for (const answers of [
        makeAnswers({ entitySize: "large" }),
        makeAnswers({
          entitySize: "medium",
          operatesGroundInfra: false,
          operatesSatComms: false,
        }),
        makeAnswers({ isEUEstablished: false }),
      ]) {
        const result = await calculateNIS2Compliance(answers);
        expect(result.penalties.essential).toContain("10,000,000");
        expect(result.penalties.important).toContain("7,000,000");
      }
    });

    it("penalty thresholds are based on higher of fixed amount or % of turnover", async () => {
      // Both should say "whichever is higher"
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.penalties.essential).toMatch(/higher/i);
      expect(result.penalties.important).toMatch(/higher/i);
    });
  });

  // ── EU Space Act Overlap ─────────────────────────────────────

  describe("EU Space Act Overlap", () => {
    it("calculates overlap for in-scope entities", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.euSpaceActOverlap).toBeDefined();
      expect(result.euSpaceActOverlap.count).toBeGreaterThan(0);
    });

    it("returns zero overlap for out-of-scope entities", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ isEUEstablished: false }),
      );
      expect(result.euSpaceActOverlap.count).toBe(0);
      expect(result.euSpaceActOverlap.totalPotentialSavingsWeeks).toBe(0);
      expect(result.euSpaceActOverlap.overlappingRequirements).toEqual([]);
    });

    it("single_implementation effort type earns 3 weeks savings per requirement", async () => {
      // The mock has 2 supersedes cross-refs (xref-002, xref-005) and 2 overlaps (xref-001, xref-003).
      // savings = (2 supersedes * 3) + (2 overlaps * 1.5) = 6 + 3 = 9, rounded = 9
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.euSpaceActOverlap.totalPotentialSavingsWeeks).toBe(9);
    });

    it("overlap count matches overlappingRequirements array length", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.euSpaceActOverlap.count).toBe(
        result.euSpaceActOverlap.overlappingRequirements.length,
      );
    });

    it("overlapping requirements have required fields", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      for (const overlap of result.euSpaceActOverlap.overlappingRequirements) {
        expect(overlap).toHaveProperty("nis2Article");
        expect(overlap).toHaveProperty("euSpaceActArticle");
        expect(overlap).toHaveProperty("description");
        expect(overlap).toHaveProperty("effortType");
        expect(["single_implementation", "partial_overlap"]).toContain(
          overlap.effortType,
        );
      }
    });

    it("supersedes cross-refs map to single_implementation effort type", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      const singleImpl =
        result.euSpaceActOverlap.overlappingRequirements.filter(
          (r) => r.effortType === "single_implementation",
        );
      expect(singleImpl.length).toBeGreaterThan(0);
    });

    it("overlaps cross-refs map to partial_overlap effort type", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      const partial = result.euSpaceActOverlap.overlappingRequirements.filter(
        (r) => r.effortType === "partial_overlap",
      );
      expect(partial.length).toBeGreaterThan(0);
    });

    it("implements cross-refs are excluded from overlap calculation", async () => {
      // xref-004 has relationship 'implements' targeting enisa_space — not nis2/eu_space_act overlap
      // The filter in the engine only keeps overlaps and supersedes between nis2 and eu_space_act
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      // Count should not include xref-004 (implements / enisa_space target)
      // xref-001 (overlaps), xref-002 (supersedes), xref-003 (overlaps), xref-005 (supersedes) = 4
      expect(result.euSpaceActOverlap.count).toBe(4);
    });
  });

  // ── Registration ─────────────────────────────────────────────

  describe("Registration", () => {
    it("registrationRequired is true for essential entities", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.registrationRequired).toBe(true);
    });

    it("registrationRequired is true for important entities", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({
          entitySize: "medium",
          operatesGroundInfra: false,
          operatesSatComms: false,
        }),
      );
      expect(result.registrationRequired).toBe(true);
    });

    it("registrationRequired is false for out-of-scope entities", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ isEUEstablished: false }),
      );
      expect(result.registrationRequired).toBe(false);
    });

    it("registrationDeadline mentions Art. 3(4) for in-scope entities", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.registrationDeadline).toContain("Art. 3(4)");
    });

    it("registrationDeadline is 'N/A' for out-of-scope entities", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ isEUEstablished: false }),
      );
      expect(result.registrationDeadline).toBe("N/A");
    });
  });

  // ── Key Dates ────────────────────────────────────────────────

  describe("Key Dates", () => {
    it("includes October 2024 transposition deadline for all classifications", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      const hasTransposition = result.keyDates.some(
        (d) =>
          d.date.includes("October 2024") &&
          d.description.includes("transposition"),
      );
      expect(hasTransposition).toBe(true);
    });

    it("includes April 2025 entity list deadline", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      const hasEntityList = result.keyDates.some((d) =>
        d.date.includes("April 2025"),
      );
      expect(hasEntityList).toBe(true);
    });

    it("in-scope entities get EU Space Act 2030 date", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      const hasSpaceActDate = result.keyDates.some(
        (d) =>
          d.description.includes("EU Space Act") && d.date.includes("2030"),
      );
      expect(hasSpaceActDate).toBe(true);
    });

    it("out-of-scope entities get only the two base dates", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ isEUEstablished: false }),
      );
      expect(result.keyDates.length).toBe(2);
    });

    it("in-scope entities get more than two key dates", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      expect(result.keyDates.length).toBeGreaterThan(2);
    });

    it("all key dates have non-empty date and description", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large" }),
      );
      for (const kd of result.keyDates) {
        expect(kd.date).toBeTruthy();
        expect(kd.description).toBeTruthy();
      }
    });
  });

  // ── Supervisory Authority ────────────────────────────────────

  describe("Supervisory Authority", () => {
    it("single member state returns national authority string", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large", memberStateCount: 1 }),
      );
      expect(result.supervisoryAuthority).toContain(
        "National competent authority",
      );
    });

    it("multi-member-state returns primary jurisdiction string", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large", memberStateCount: 3 }),
      );
      expect(result.supervisoryAuthority).toContain("Primary");
    });

    it("multi-member-state note mentions Art. 26(1)", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large", memberStateCount: 5 }),
      );
      expect(result.supervisoryAuthorityNote).toContain("Art. 26(1)");
    });

    it("null memberStateCount defaults to single jurisdiction", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large", memberStateCount: null as never }),
      );
      expect(result.supervisoryAuthority).toContain(
        "National competent authority",
      );
    });

    it("supervisoryAuthority and note are always non-empty strings", async () => {
      for (const count of [1, 2, 5]) {
        const result = await calculateNIS2Compliance(
          makeAnswers({ entitySize: "large", memberStateCount: count }),
        );
        expect(result.supervisoryAuthority.length).toBeGreaterThan(10);
        expect(result.supervisoryAuthorityNote.length).toBeGreaterThan(10);
      }
    });
  });

  // ── Sub-sector ───────────────────────────────────────────────

  describe("Sub-sector preservation", () => {
    it("preserves spaceSubSector in result", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({
          entitySize: "large",
          spaceSubSector: "ground_infrastructure",
        }),
      );
      expect(result.subSector).toBe("ground_infrastructure");
    });

    it("preserves satellite_communications sub-sector", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({
          entitySize: "large",
          spaceSubSector: "satellite_communications",
        }),
      );
      expect(result.subSector).toBe("satellite_communications");
    });

    it("returns null for null spaceSubSector", async () => {
      const result = await calculateNIS2Compliance(
        makeAnswers({ entitySize: "large", spaceSubSector: null }),
      );
      expect(result.subSector).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Redaction Tests
// ═══════════════════════════════════════════════════════════════

describe("redactNIS2ResultForClient", () => {
  it("strips description from requirements", async () => {
    const fullResult = await calculateNIS2Compliance(
      makeAnswers({ entitySize: "large" }),
    );
    const redacted = redactNIS2ResultForClient(fullResult);
    for (const req of redacted.applicableRequirements) {
      expect(req).not.toHaveProperty("description");
    }
  });

  it("strips spaceSpecificGuidance from requirements", async () => {
    const fullResult = await calculateNIS2Compliance(
      makeAnswers({ entitySize: "large" }),
    );
    const redacted = redactNIS2ResultForClient(fullResult);
    for (const req of redacted.applicableRequirements) {
      expect(req).not.toHaveProperty("spaceSpecificGuidance");
    }
  });

  it("strips tips from requirements", async () => {
    const fullResult = await calculateNIS2Compliance(
      makeAnswers({ entitySize: "large" }),
    );
    const redacted = redactNIS2ResultForClient(fullResult);
    for (const req of redacted.applicableRequirements) {
      expect(req).not.toHaveProperty("tips");
    }
  });

  it("strips evidenceRequired from requirements", async () => {
    const fullResult = await calculateNIS2Compliance(
      makeAnswers({ entitySize: "large" }),
    );
    const redacted = redactNIS2ResultForClient(fullResult);
    for (const req of redacted.applicableRequirements) {
      expect(req).not.toHaveProperty("evidenceRequired");
    }
  });

  it("strips euSpaceActRef, enisaControlIds, iso27001Ref from requirements", async () => {
    const fullResult = await calculateNIS2Compliance(
      makeAnswers({ entitySize: "large" }),
    );
    const redacted = redactNIS2ResultForClient(fullResult);
    for (const req of redacted.applicableRequirements) {
      expect(req).not.toHaveProperty("euSpaceActRef");
      expect(req).not.toHaveProperty("enisaControlIds");
      expect(req).not.toHaveProperty("iso27001Ref");
    }
  });

  it("preserves id, articleRef, category, title, severity in requirements", async () => {
    const fullResult = await calculateNIS2Compliance(
      makeAnswers({ entitySize: "large" }),
    );
    const redacted = redactNIS2ResultForClient(fullResult);
    for (const req of redacted.applicableRequirements) {
      expect(req).toHaveProperty("id");
      expect(req).toHaveProperty("articleRef");
      expect(req).toHaveProperty("category");
      expect(req).toHaveProperty("title");
      expect(req).toHaveProperty("severity");
    }
  });

  it("strips overlappingRequirements details from euSpaceActOverlap", async () => {
    const fullResult = await calculateNIS2Compliance(
      makeAnswers({ entitySize: "large" }),
    );
    const redacted = redactNIS2ResultForClient(fullResult);
    expect(
      (redacted.euSpaceActOverlap as Record<string, unknown>)
        .overlappingRequirements,
    ).toBeUndefined();
  });

  it("preserves count and totalPotentialSavingsWeeks in euSpaceActOverlap", async () => {
    const fullResult = await calculateNIS2Compliance(
      makeAnswers({ entitySize: "large" }),
    );
    const redacted = redactNIS2ResultForClient(fullResult);
    expect(redacted.euSpaceActOverlap.count).toBe(
      fullResult.euSpaceActOverlap.count,
    );
    expect(redacted.euSpaceActOverlap.totalPotentialSavingsWeeks).toBe(
      fullResult.euSpaceActOverlap.totalPotentialSavingsWeeks,
    );
  });

  it("preserves top-level non-sensitive fields", async () => {
    const fullResult = await calculateNIS2Compliance(
      makeAnswers({ entitySize: "large" }),
    );
    const redacted = redactNIS2ResultForClient(fullResult);

    expect(redacted.entityClassification).toBe(fullResult.entityClassification);
    expect(redacted.classificationReason).toBe(fullResult.classificationReason);
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

  it("handles empty requirements array gracefully", async () => {
    const fullResult = await calculateNIS2Compliance(
      makeAnswers({ isEUEstablished: false }),
    );
    const redacted = redactNIS2ResultForClient(fullResult);
    expect(redacted.applicableRequirements).toEqual([]);
    expect(redacted.applicableCount).toBe(0);
  });

  it("applicableCount in redacted result matches applicableRequirements.length", async () => {
    const fullResult = await calculateNIS2Compliance(
      makeAnswers({ entitySize: "large" }),
    );
    const redacted = redactNIS2ResultForClient(fullResult);
    expect(redacted.applicableCount).toBe(
      redacted.applicableRequirements.length,
    );
  });

  it("redacted result does not include classificationArticleRef (not part of public type)", async () => {
    const fullResult = await calculateNIS2Compliance(
      makeAnswers({ entitySize: "large" }),
    );
    const redacted = redactNIS2ResultForClient(fullResult);
    expect(
      (redacted as Record<string, unknown>).classificationArticleRef,
    ).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════════

describe("Edge Cases", () => {
  it("all boolean flags true + large size → essential (large takes priority)", async () => {
    const result = await calculateNIS2Compliance(
      makeAnswers({
        entitySize: "large",
        operatesGroundInfra: true,
        operatesSatComms: true,
        manufacturesSpacecraft: true,
        providesLaunchServices: true,
        providesEOData: true,
      }),
    );
    expect(result.entityClassification).toBe("essential");
  });

  it("isEUEstablished null does not crash (treated as truthy path)", () => {
    // null is not strictly false so the `=== false` check in the engine won't fire
    expect(() =>
      classifyNIS2Entity(makeAnswers({ isEUEstablished: null })),
    ).not.toThrow();
  });

  it("memberStateCount of 0 is treated as single jurisdiction (falsy)", async () => {
    const result = await calculateNIS2Compliance(
      makeAnswers({ entitySize: "large", memberStateCount: 0 }),
    );
    // 0 is falsy, so memberStateCount || 1 = 1
    expect(result.supervisoryAuthority).toContain(
      "National competent authority",
    );
  });

  it("calculateNIS2Compliance is idempotent — same answers produce same result", async () => {
    const answers = makeAnswers({
      entitySize: "large",
      operatesSatComms: true,
    });
    const result1 = await calculateNIS2Compliance(answers);
    const result2 = await calculateNIS2Compliance(answers);
    expect(result1.entityClassification).toBe(result2.entityClassification);
    expect(result1.applicableCount).toBe(result2.applicableCount);
    expect(result1.penalties).toEqual(result2.penalties);
  });

  it("medium + only spacecraft manufacturing → important (no critical infra carve-out)", async () => {
    const result = await calculateNIS2Compliance(
      makeAnswers({
        entitySize: "medium",
        spaceSubSector: "spacecraft_manufacturing",
        operatesGroundInfra: false,
        operatesSatComms: false,
      }),
    );
    expect(result.entityClassification).toBe("important");
  });

  it("small + only EO data → out_of_scope in engine (EO data is not a carve-out trigger)", async () => {
    const result = await calculateNIS2Compliance(
      makeAnswers({
        entitySize: "small",
        providesEOData: true,
        operatesGroundInfra: false,
        operatesSatComms: false,
        providesLaunchServices: false,
      }),
    );
    expect(result.entityClassification).toBe("out_of_scope");
    expect(result.applicableRequirements).toEqual([]);
  });

  it("classifyNIS2Entity does not mutate the answers object", () => {
    const answers = makeAnswers({ entitySize: "large" });
    const original = JSON.stringify(answers);
    classifyNIS2Entity(answers);
    expect(JSON.stringify(answers)).toBe(original);
  });
});
