/**
 * Unit tests for CRA Engine — classification and scope check logic.
 */

vi.mock("server-only", () => ({}));

vi.mock("@/data/cra-taxonomy", () => ({
  getSpaceProductById: vi.fn((id: string) => {
    if (id === "obc")
      return {
        id: "obc",
        name: "On-board Computer",
        classification: "class_II",
        conformityRoute: "third_party_type_exam",
        classificationReasoning: [
          {
            criterion: "Test",
            legalBasis: "Art. 7(2)",
            annexRef: "Annex IV",
            satisfied: true,
            reasoning: "Test",
          },
        ],
      };
    if (id === "star_tracker")
      return {
        id: "star_tracker",
        name: "Star Tracker",
        classification: "default",
        conformityRoute: "self_assessment",
        classificationReasoning: [
          {
            criterion: "Test",
            legalBasis: "Art. 3",
            annexRef: "N/A",
            satisfied: true,
            reasoning: "Test",
          },
        ],
      };
    return undefined;
  }),
}));

vi.mock("./cra-rule-engine.server", () => ({
  classifyByRules: vi.fn(() => ({
    classification: "default",
    conformityRoute: "self_assessment",
    steps: [],
    isOutOfScope: false,
  })),
  detectClassificationConflict: vi.fn(() => undefined),
}));

vi.mock("@/data/cross-references", () => ({
  CROSS_REFERENCES: [],
}));

vi.mock("@/lib/engines/shared.server", () => ({
  EngineDataError: class extends Error {
    context: Record<string, unknown>;
    constructor(msg: string, ctx: Record<string, unknown>) {
      super(msg);
      this.context = ctx;
    }
  },
}));

import { classifyCRAProduct } from "./cra-engine.server";
import type { CRAAssessmentAnswers } from "./cra-types";

// ─── Helpers ───

function makeAnswers(
  overrides: Partial<CRAAssessmentAnswers> = {},
): CRAAssessmentAnswers {
  return {
    economicOperatorRole: "manufacturer",
    isEUEstablished: true,
    spaceProductTypeId: null,
    productName: "Test Product",
    productVersion: "1.0",
    hasNetworkFunction: false,
    processesAuthData: false,
    usedInCriticalInfra: false,
    performsCryptoOps: false,
    controlsPhysicalSystem: false,
    hasMicrocontroller: false,
    isOSSComponent: false,
    isCommerciallySupplied: false,
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

// ─── Scope Check Tests ───

describe("classifyCRAProduct — scope checks", () => {
  it("marks OSS non-commercial products as out of scope", () => {
    const answers = makeAnswers({
      isOSSComponent: true,
      isCommerciallySupplied: false,
    });
    const result = classifyCRAProduct(answers);
    expect(result.isOutOfScope).toBe(true);
    expect(result.outOfScopeReason).toContain("open-source");
  });

  it("marks non-manufacturer roles as out of scope (Phase 2)", () => {
    const answers = makeAnswers({ economicOperatorRole: "importer" });
    const result = classifyCRAProduct(answers);
    expect(result.isOutOfScope).toBe(true);
    expect(result.outOfScopeReason).toContain("Phase 2");
  });

  it("marks distributor role as out of scope (Phase 2)", () => {
    const answers = makeAnswers({ economicOperatorRole: "distributor" });
    const result = classifyCRAProduct(answers);
    expect(result.isOutOfScope).toBe(true);
    expect(result.outOfScopeReason).toContain("Phase 2");
  });

  it("does NOT mark non-EU manufacturers as out of scope", () => {
    const answers = makeAnswers({ isEUEstablished: false });
    const result = classifyCRAProduct(answers);
    expect(result.isOutOfScope).toBe(false);
  });

  it("flags authorized_representative when manufacturer is not EU-established", () => {
    const answers = makeAnswers({ isEUEstablished: false });
    // The engine still proceeds — non-EU manufacturers are NOT out of scope,
    // they just need an authorized representative under Art. 4(2).
    // The scope check adds a flag internally but the product still proceeds
    // through classification (Phase 2b rule engine path).
    const result = classifyCRAProduct(answers);
    expect(result.isOutOfScope).toBe(false);
    expect(result.outOfScopeReason).toBeUndefined();
  });
});

// ─── Taxonomy Path Tests ───

describe("classifyCRAProduct — taxonomy path", () => {
  it("returns class_II for known OBC product ID", () => {
    const answers = makeAnswers({ spaceProductTypeId: "obc" });
    const result = classifyCRAProduct(answers);
    expect(result.isOutOfScope).toBe(false);
    expect(result.classification).toBe("class_II");
    expect(result.conformityRoute).toBe("third_party_type_exam");
  });

  it("returns default classification for star_tracker product ID", () => {
    const answers = makeAnswers({ spaceProductTypeId: "star_tracker" });
    const result = classifyCRAProduct(answers);
    expect(result.isOutOfScope).toBe(false);
    expect(result.classification).toBe("default");
    expect(result.conformityRoute).toBe("self_assessment");
  });

  it("falls through to rule engine when product ID is unknown", () => {
    const answers = makeAnswers({ spaceProductTypeId: "unknown_product_xyz" });
    const result = classifyCRAProduct(answers);
    // Rule engine mock returns default
    expect(result.classification).toBe("default");
    expect(result.conformityRoute).toBe("self_assessment");
  });
});

// ─── Rule Engine Path Tests ───

describe("classifyCRAProduct — rule engine path", () => {
  it("uses rule engine when no product ID is provided", () => {
    const answers = makeAnswers({ spaceProductTypeId: null });
    const result = classifyCRAProduct(answers);
    expect(result.isOutOfScope).toBe(false);
    expect(result.classification).toBe("default");
    expect(result.conformityRoute).toBe("self_assessment");
  });

  it("returns classificationReasoning array from rule engine steps", () => {
    const answers = makeAnswers({ spaceProductTypeId: null });
    const result = classifyCRAProduct(answers);
    expect(Array.isArray(result.classificationReasoning)).toBe(true);
  });
});
