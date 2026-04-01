vi.mock("server-only", () => ({}));

import {
  classifyByRules,
  detectClassificationConflict,
} from "./cra-rule-engine.server";
import type { CRAAssessmentAnswers } from "./cra-types";

// Helper to create default answers
function makeAnswers(
  overrides: Partial<CRAAssessmentAnswers> = {},
): CRAAssessmentAnswers {
  return {
    economicOperatorRole: "manufacturer",
    isEUEstablished: true,
    spaceProductTypeId: null,
    productName: "Test Product",
    segments: ["space"],
    hasNetworkFunction: null,
    processesAuthData: null,
    usedInCriticalInfra: null,
    performsCryptoOps: null,
    controlsPhysicalSystem: null,
    hasMicrocontroller: null,
    isOSSComponent: null,
    isCommerciallySupplied: null,
    isSafetyCritical: null,
    hasRedundancy: null,
    processesClassifiedData: null,
    hasIEC62443: null,
    hasETSIEN303645: null,
    hasCommonCriteria: null,
    hasISO27001: null,
    ...overrides,
  };
}

describe("CRA Rule Engine", () => {
  describe("classifyByRules", () => {
    it("classifies as Default when no criteria matched", () => {
      const result = classifyByRules(makeAnswers());
      expect(result.classification).toBe("default");
      expect(result.conformityRoute).toBe("self_assessment");
      expect(result.isOutOfScope).toBe(false);
    });

    // Class II triggers
    it("classifies as Class II when controlsPhysicalSystem + usedInCriticalInfra", () => {
      const result = classifyByRules(
        makeAnswers({
          controlsPhysicalSystem: true,
          usedInCriticalInfra: true,
        }),
      );
      expect(result.classification).toBe("class_II");
      expect(result.conformityRoute).toBe("third_party_type_exam");
    });

    it("classifies as Class II when processesAuthData + usedInCriticalInfra", () => {
      const result = classifyByRules(
        makeAnswers({
          processesAuthData: true,
          usedInCriticalInfra: true,
        }),
      );
      expect(result.classification).toBe("class_II");
    });

    it("classifies as Class II when performsCryptoOps + isSafetyCritical", () => {
      const result = classifyByRules(
        makeAnswers({
          performsCryptoOps: true,
          isSafetyCritical: true,
        }),
      );
      expect(result.classification).toBe("class_II");
    });

    // Class I triggers
    it("classifies as Class I when hasNetworkFunction + usedInCriticalInfra", () => {
      const result = classifyByRules(
        makeAnswers({
          hasNetworkFunction: true,
          usedInCriticalInfra: true,
        }),
      );
      expect(result.classification).toBe("class_I");
      expect(result.conformityRoute).toBe("harmonised_standard");
    });

    it("classifies as Class I when hasNetworkFunction + performsCryptoOps", () => {
      const result = classifyByRules(
        makeAnswers({
          hasNetworkFunction: true,
          performsCryptoOps: true,
        }),
      );
      expect(result.classification).toBe("class_I");
    });

    it("classifies as Class I when hasMicrocontroller + hasNetworkFunction", () => {
      const result = classifyByRules(
        makeAnswers({
          hasMicrocontroller: true,
          hasNetworkFunction: true,
        }),
      );
      expect(result.classification).toBe("class_I");
    });

    // Class II takes priority over Class I
    it("Class II takes priority when both Class II and Class I criteria match", () => {
      const result = classifyByRules(
        makeAnswers({
          controlsPhysicalSystem: true,
          usedInCriticalInfra: true,
          hasNetworkFunction: true, // would trigger Class I too
        }),
      );
      expect(result.classification).toBe("class_II");
    });

    // OSS scope exclusion
    it("excludes non-commercial OSS from scope", () => {
      const result = classifyByRules(
        makeAnswers({
          isOSSComponent: true,
          isCommerciallySupplied: false,
        }),
      );
      expect(result.isOutOfScope).toBe(true);
      expect(result.outOfScopeReason).toContain("open-source");
    });

    it("does NOT exclude commercially supplied OSS", () => {
      const result = classifyByRules(
        makeAnswers({
          isOSSComponent: true,
          isCommerciallySupplied: true,
          hasNetworkFunction: true,
          usedInCriticalInfra: true,
        }),
      );
      expect(result.isOutOfScope).toBe(false);
      expect(result.classification).toBe("class_I");
    });

    // Reasoning chain
    it("includes reasoning steps for all evaluated rules", () => {
      const result = classifyByRules(
        makeAnswers({
          controlsPhysicalSystem: true,
          usedInCriticalInfra: true,
        }),
      );
      expect(result.steps.length).toBeGreaterThanOrEqual(2); // product check + at least 1 rule
      expect(result.steps[0].criterion).toContain("digital elements");
    });
  });

  describe("detectClassificationConflict", () => {
    it("returns undefined when classifications match", () => {
      const result = classifyByRules(makeAnswers());
      const conflict = detectClassificationConflict("default", result);
      expect(conflict).toBeUndefined();
    });

    it("returns conflict when taxonomy says default but rules say class_I", () => {
      const result = classifyByRules(
        makeAnswers({
          hasNetworkFunction: true,
          usedInCriticalInfra: true,
        }),
      );
      const conflict = detectClassificationConflict("default", result);
      expect(conflict).toBeDefined();
      expect(conflict!.taxonomyClass).toBe("default");
      expect(conflict!.ruleEngineClass).toBe("class_I");
    });

    it("returns conflict with upgrade recommendation for class_II mismatch", () => {
      const result = classifyByRules(
        makeAnswers({
          controlsPhysicalSystem: true,
          usedInCriticalInfra: true,
        }),
      );
      const conflict = detectClassificationConflict("class_I", result);
      expect(conflict).toBeDefined();
      expect(conflict!.recommendation).toContain("Class II");
    });
  });
});
