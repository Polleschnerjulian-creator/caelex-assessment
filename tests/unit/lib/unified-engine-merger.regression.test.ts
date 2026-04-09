/**
 * Regression tests for fixes applied in the post-audit correctness pass.
 *
 * Each `describe` block targets a specific finding from the assessment
 * audit report. The test name should reference the bug it locks down so
 * that future regressions are immediately identifiable.
 *
 * These tests are intentionally minimal and rely on the canonical fixtures
 * in tests/fixtures/unified-answers.ts so that test intent is clear.
 */

import { describe, it, expect, vi } from "vitest";
import type { ComplianceResult } from "@/lib/types";

// server-only must be mocked before importing the merger module
vi.mock("server-only", () => ({}));

const { buildUnifiedResult, calculateOverallRisk, mergeMultiActivityResults } =
  await import("@/lib/unified-engine-merger.server");

const {
  euLargeSCO,
  defenseOnlyOperator,
  thirdCountryNoEUServices,
  multiActivityOperator,
  earlyStageNoCyberAnswers,
  smallNonCriticalSpaceEntity,
} = await import("../../fixtures/unified-answers");

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildSpaceActResult(
  overrides: Partial<ComplianceResult> = {},
): ComplianceResult {
  return {
    operatorType: "spacecraft_operator",
    operatorTypeLabel: "Spacecraft Operator (EU)",
    operatorAbbreviation: "SCO",
    isEU: true,
    isThirdCountry: false,
    regime: "standard",
    regimeLabel: "Standard",
    regimeReason: "Full compliance required",
    entitySize: "large",
    entitySizeLabel: "Large Enterprise",
    constellationTier: "single_satellite",
    constellationTierLabel: "Single Satellite",
    orbit: "LEO",
    orbitLabel: "Low Earth Orbit",
    offersEUServices: true,
    applicableArticles: [],
    totalArticles: 119,
    applicableCount: 0,
    applicablePercentage: 0,
    moduleStatuses: [],
    checklist: [],
    keyDates: [],
    estimatedAuthorizationCost: "EUR 50K",
    authorizationPath: "NCA → URSO",
    ...overrides,
  } as ComplianceResult;
}

// ─── Finding 4.1 — exempt regime tautology ────────────────────────────────

describe("buildUnifiedResult — defense vs no-EU regime distinction", () => {
  it("returns regime='defense_exempt' for defense-only operators with no space act result", () => {
    const result = buildUnifiedResult(
      // Simulating the merger's "applies: false, isDefenseOnly: true" branch
      { applies: false, isDefenseOnly: true } as never,
      null,
      null,
      defenseOnlyOperator,
    );
    expect(result.euSpaceAct.regime).toBe("defense_exempt");
    expect(result.euSpaceAct.regimeReason).toMatch(/Art\. 2\(3\)/);
  });

  it("returns regime='out_of_scope' for non-defense out-of-scope operators", () => {
    const result = buildUnifiedResult(
      { applies: false, isDefenseOnly: false } as never,
      null,
      null,
      thirdCountryNoEUServices,
    );
    expect(result.euSpaceAct.regime).toBe("out_of_scope");
    expect(result.euSpaceAct.regimeReason).not.toMatch(/Art\. 2\(3\)/);
  });
});

// ─── Finding 4.6 — calculateOverallRisk dead branch + null=compliant ─────

describe("calculateOverallRisk — null gap handling", () => {
  it("does not flag CYBER gaps for a fresh assessment with null cyber answers", () => {
    // earlyStageNoCyberAnswers has all cyber fields as null and the user
    // has not answered any cyber questions yet — should NOT auto-flag
    // gaps for cyber. (Non-cyber gaps like missing debris plan can still
    // appear depending on activity type.)
    const result = calculateOverallRisk(
      true, // spaceActApplies
      "standard",
      true, // nis2Applies
      "essential",
      0, // complianceGapCount (legacy)
      earlyStageNoCyberAnswers,
    );
    const cyberGapTypes = [
      "cybersecurity_policy",
      "incident_response",
      "risk_management",
      "supply_chain_security",
      "business_continuity",
      "encryption",
      "access_control",
      "vulnerability_management",
      "security_training",
      "penetration_testing",
    ];
    const cyberGaps = result.gaps.filter((g) => cyberGapTypes.includes(g.type));
    expect(cyberGaps).toHaveLength(0);
  });

  it("flags cyber gaps once the user has answered at least one cyber question", () => {
    // Once the cyber phase is "attempted", remaining nulls should count as gaps
    const partiallyAnswered = {
      ...earlyStageNoCyberAnswers,
      hasCybersecurityPolicy: false, // explicit false triggers phase-attempted
    };
    const result = calculateOverallRisk(
      true,
      "standard",
      true,
      "essential",
      0,
      partiallyAnswered,
    );
    // Should now produce gaps for all the null cyber fields too
    expect(result.gaps.length).toBeGreaterThan(1);
  });
});

// ─── Finding 4.5 — constellation priority action backwards logic ─────────

describe("buildSpaceActPriorityActions via buildUnifiedResult", () => {
  it("recommends spacecraft registration for SCO operators (constellation or not)", () => {
    const result = buildUnifiedResult(
      buildSpaceActResult({ applies: true }),
      null,
      null,
      euLargeSCO, // SCO, no constellation
    );
    const hasRegistration = result.euSpaceAct.priorityActions.some((a) =>
      /Register spacecraft/i.test(a),
    );
    expect(hasRegistration).toBe(true);
  });

  it("does NOT recommend constellation management plan for non-mega operators", () => {
    const result = buildUnifiedResult(
      buildSpaceActResult({ applies: true }),
      null,
      null,
      euLargeSCO, // small constellation
    );
    const hasConstellationPlan = result.euSpaceAct.priorityActions.some((a) =>
      /constellation management plan/i.test(a),
    );
    expect(hasConstellationPlan).toBe(false);
  });
});

// ─── Finding 3.7 — in-place sort mutation ────────────────────────────────

describe("buildUnifiedResult — does not mutate input space law jurisdictions", () => {
  it("preserves original ordering of spaceLawResult.jurisdictions", () => {
    const jurisdictions = [
      { countryCode: "FR", countryName: "France", favorabilityScore: 50 },
      { countryCode: "LU", countryName: "Luxembourg", favorabilityScore: 90 },
      { countryCode: "DE", countryName: "Germany", favorabilityScore: 30 },
    ];
    const originalOrder = jurisdictions.map((j) => j.countryCode);

    buildUnifiedResult(
      null,
      null,
      {
        jurisdictions,
        recommendations: ["Test recommendation"],
      } as never,
      euLargeSCO,
    );

    // Original array should be unchanged
    expect(jurisdictions.map((j) => j.countryCode)).toEqual(originalOrder);
  });
});

// ─── Finding 5.2 — intermediate report in incident timeline ──────────────

describe("buildIncidentTimeline (via buildUnifiedResult)", () => {
  it("includes the Art. 23(4)(c) intermediate report phase", () => {
    const result = buildUnifiedResult(null, mockNIS2Result(), null, euLargeSCO);
    const phases = result.nis2.incidentTimeline.map((p) => p.phase);
    expect(phases).toContain("Intermediate Report");
  });

  it("orders phases as Early Warning → Notification → Intermediate → Final", () => {
    const result = buildUnifiedResult(null, mockNIS2Result(), null, euLargeSCO);
    const phases = result.nis2.incidentTimeline.map((p) => p.phase);
    expect(phases).toEqual([
      "Early Warning",
      "Incident Notification",
      "Intermediate Report",
      "Final Report",
    ]);
  });
});

function mockNIS2Result() {
  return {
    entityClassification: "essential",
    classificationReason: "test",
    classificationArticleRef: "Art. 3(1)(a)",
    applicableRequirements: [],
    applicableCount: 51,
    incidentReportingTimeline: {
      earlyWarning: { deadline: "24 hours", description: "early warning desc" },
      notification: { deadline: "72 hours", description: "notification desc" },
      intermediateReport: {
        deadline: "Upon request",
        description: "intermediate report desc",
      },
      finalReport: { deadline: "1 month", description: "final report desc" },
    },
    euSpaceActOverlap: {
      count: 0,
      totalPotentialSavingsWeeks: 0,
      overlappingRequirements: [],
      confidenceLevel: "estimated",
      estimationSource: "test",
    },
    supervisoryAuthority: { authority: "test", note: "test" },
    penalties: { essential: "x", important: "y", applicable: "z" },
    keyDates: [],
    registrationRequired: true,
    registrationDeadline: "test",
  } as never;
}

// ─── Finding 4.3 — checklist deduplication is over-aggressive ────────────

describe("mergeMultiActivityResults — multi-activity merge", () => {
  it("merges checklist items: dedups same-requirement, keeps distinct items", () => {
    const r1 = buildSpaceActResult({
      checklist: [
        {
          requirement: "Submit authorization application",
          articles: "Art. 6",
          module: "authorization",
        },
      ],
    });
    const r2 = buildSpaceActResult({
      operatorAbbreviation: "LO",
      operatorTypeLabel: "Launch Operator (EU)",
      checklist: [
        {
          requirement: "Submit authorization application",
          articles: "Art. 6",
          module: "authorization",
        },
        {
          requirement: "Conduct range safety review",
          articles: "Art. 35",
          module: "supervision",
        },
      ],
    });

    const merged = mergeMultiActivityResults([r1, r2]);
    // Same requirement dedupes (1 entry), distinct requirement is preserved
    expect(merged.checklist.length).toBe(2);
  });

  it("returns out_of_scope regime for empty results array", () => {
    const merged = mergeMultiActivityResults([]);
    expect(merged.regime).toBe("out_of_scope");
    expect(merged.applies).toBe(false);
  });
});

// ─── Smoke test — buildUnifiedResult does not throw on minimal input ─────

describe("buildUnifiedResult — robustness", () => {
  it("handles a fully null result set without throwing", () => {
    expect(() =>
      buildUnifiedResult(null, null, null, smallNonCriticalSpaceEntity),
    ).not.toThrow();
  });

  it("handles a multi-activity operator with all three engines populated", () => {
    expect(() =>
      buildUnifiedResult(
        buildSpaceActResult({ applies: true }),
        mockNIS2Result(),
        {
          jurisdictions: [
            {
              countryCode: "FR",
              countryName: "France",
              favorabilityScore: 80,
            },
          ],
          recommendations: ["French CNES is the recommended jurisdiction"],
        } as never,
        multiActivityOperator,
      ),
    ).not.toThrow();
  });
});

// ─── Vitest noop guard for unused imports during incremental editing ─────

vi.fn();
