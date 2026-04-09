/**
 * CRA Rule Engine tests.
 *
 * `cra-rule-engine.server.ts` is a pure rule-based classifier with two
 * public exports: `classifyByRules` (Annex IV / Annex III evaluation)
 * and `detectClassificationConflict` (taxonomy vs rule-engine sanity
 * check). It is consumed by `cra-engine.server.ts` as both the
 * fallback classifier when no taxonomy ID is provided and as a
 * validator for taxonomy-based classifications.
 *
 * Before this file existed, the rule engine was tested only
 * indirectly via the (very recent) `cra-engine.test.ts`. This file
 * pins down each Annex IV and Annex III rule individually so a
 * regression in any single rule fails loudly.
 */

import { describe, it, expect, vi } from "vitest";

import type { CRAAssessmentAnswers } from "@/lib/cra-types";

vi.mock("server-only", () => ({}));

const { classifyByRules, detectClassificationConflict } =
  await import("@/lib/cra-rule-engine.server");

function buildAnswers(
  overrides: Partial<CRAAssessmentAnswers> = {},
): CRAAssessmentAnswers {
  return {
    economicOperatorRole: "manufacturer",
    isEUEstablished: true,
    spaceProductTypeId: null,
    productName: "Test product",
    hasNetworkFunction: false,
    processesAuthData: false,
    usedInCriticalInfra: false,
    performsCryptoOps: false,
    controlsPhysicalSystem: false,
    hasMicrocontroller: false,
    isOSSComponent: false,
    isCommerciallySupplied: true,
    segments: ["space"],
    isSafetyCritical: false,
    hasRedundancy: false,
    processesClassifiedData: false,
    hasIEC62443: false,
    hasETSIEN303645: false,
    hasCommonCriteria: false,
    hasISO27001: false,
    ...overrides,
  };
}

// ─── OSS scope check ─────────────────────────────────────────────────
describe("CRA rule engine — OSS scope check", () => {
  it("non-commercial OSS short-circuits to default + out-of-scope", () => {
    const result = classifyByRules(
      buildAnswers({
        isOSSComponent: true,
        isCommerciallySupplied: false,
      }),
    );
    expect(result.classification).toBe("default");
    expect(result.conformityRoute).toBe("self_assessment");
    expect(result.isOutOfScope).toBe(true);
    expect(result.outOfScopeReason).toBeTruthy();
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("commercial OSS continues evaluation (NOT out of scope)", () => {
    const result = classifyByRules(
      buildAnswers({
        isOSSComponent: true,
        isCommerciallySupplied: true,
        hasNetworkFunction: true,
        usedInCriticalInfra: true,
      }),
    );
    expect(result.isOutOfScope).toBe(false);
    // Should escalate to class_I via Annex III network/critical-infra rule.
    expect(result.classification).toBe("class_I");
  });
});

// ─── Annex IV Class II rules ─────────────────────────────────────────
describe("CRA rule engine — Annex IV (Class II) rules", () => {
  it("Annex IV Kat 1: physical control + critical infra → class_II", () => {
    const result = classifyByRules(
      buildAnswers({
        controlsPhysicalSystem: true,
        usedInCriticalInfra: true,
      }),
    );
    expect(result.classification).toBe("class_II");
    expect(result.conformityRoute).toBe("third_party_type_exam");
  });

  it("Annex IV Kat 2: auth-data processing + critical infra → class_II", () => {
    const result = classifyByRules(
      buildAnswers({
        processesAuthData: true,
        usedInCriticalInfra: true,
      }),
    );
    expect(result.classification).toBe("class_II");
  });

  it("Annex IV Kat 3: cryptographic + safety-critical → class_II", () => {
    const result = classifyByRules(
      buildAnswers({
        performsCryptoOps: true,
        isSafetyCritical: true,
      }),
    );
    expect(result.classification).toBe("class_II");
  });

  it("any Annex IV match takes precedence over Annex III matches", () => {
    // Set both an Annex IV trigger AND an Annex III trigger; the
    // result must be class_II, not class_I.
    const result = classifyByRules(
      buildAnswers({
        controlsPhysicalSystem: true,
        usedInCriticalInfra: true, // Annex IV Kat 1
        hasNetworkFunction: true, // Also satisfies Annex III Kat 2.1
      }),
    );
    expect(result.classification).toBe("class_II");
  });
});

// ─── Annex III Class I rules ─────────────────────────────────────────
describe("CRA rule engine — Annex III (Class I) rules", () => {
  it("Annex III Kat 2.1: network function + critical infra → class_I", () => {
    const result = classifyByRules(
      buildAnswers({
        hasNetworkFunction: true,
        usedInCriticalInfra: true,
      }),
    );
    expect(result.classification).toBe("class_I");
    expect(result.conformityRoute).toBe("harmonised_standard");
  });

  it("Annex III Kat 2.3: network function + cryptographic ops → class_I", () => {
    const result = classifyByRules(
      buildAnswers({
        hasNetworkFunction: true,
        performsCryptoOps: true,
      }),
    );
    expect(result.classification).toBe("class_I");
  });

  it("Annex III Kat 2.1 (microcontroller): MCU + network → class_I", () => {
    const result = classifyByRules(
      buildAnswers({
        hasMicrocontroller: true,
        hasNetworkFunction: true,
      }),
    );
    expect(result.classification).toBe("class_I");
  });
});

// ─── Default fallback ────────────────────────────────────────────────
describe("CRA rule engine — default classification", () => {
  it("returns default when no Annex III or IV rule matches", () => {
    const result = classifyByRules(buildAnswers());
    expect(result.classification).toBe("default");
    expect(result.conformityRoute).toBe("self_assessment");
    expect(result.isOutOfScope).toBe(false);
  });

  it("includes a non-empty reasoning chain even for the default case", () => {
    const result = classifyByRules(buildAnswers());
    expect(result.steps.length).toBeGreaterThan(0);
    // Step 0 is always the "product with digital elements" affirmation.
    expect(result.steps[0]!.criterion.toLowerCase()).toContain("digital");
  });
});

// ─── Conflict detection ──────────────────────────────────────────────
describe("CRA rule engine — detectClassificationConflict", () => {
  it("returns undefined when taxonomy and rule engine agree", () => {
    const ruleResult = classifyByRules(
      buildAnswers({
        controlsPhysicalSystem: true,
        usedInCriticalInfra: true,
      }),
    );
    const conflict = detectClassificationConflict("class_II", ruleResult);
    expect(conflict).toBeUndefined();
  });

  it("flags class_II rule engine result over class_I taxonomy", () => {
    const ruleResult = classifyByRules(
      buildAnswers({
        controlsPhysicalSystem: true,
        usedInCriticalInfra: true,
      }),
    );
    const conflict = detectClassificationConflict("class_I", ruleResult);
    expect(conflict).toBeDefined();
    expect(conflict!.taxonomyClass).toBe("class_I");
    expect(conflict!.ruleEngineClass).toBe("class_II");
    expect(conflict!.recommendation.toLowerCase()).toContain("class ii");
  });

  it("flags class_I rule engine result over default taxonomy with a review note", () => {
    const ruleResult = classifyByRules(
      buildAnswers({
        hasNetworkFunction: true,
        usedInCriticalInfra: true,
      }),
    );
    const conflict = detectClassificationConflict("default", ruleResult);
    expect(conflict).toBeDefined();
    expect(conflict!.recommendation.toLowerCase()).toContain("review");
  });

  it("only conflictingSteps are the satisfied ones (failed rules excluded)", () => {
    const ruleResult = classifyByRules(
      buildAnswers({
        hasNetworkFunction: true,
        usedInCriticalInfra: true,
      }),
    );
    const conflict = detectClassificationConflict("default", ruleResult);
    expect(conflict).toBeDefined();
    for (const step of conflict!.conflictingSteps) {
      expect(step.satisfied).toBe(true);
    }
  });
});
