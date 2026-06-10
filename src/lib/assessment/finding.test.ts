/**
 * Task 1.2 — AssessmentFinding envelope tests.
 *
 * The plan's spec for this suite:
 *   (a) `determinedFinding()` throws on empty sources;
 *   (b) `indeterminateFinding()` requires a non-empty `why`;
 *   (c) `isFindingComplete()` reports missing fields on a hand-built bad object;
 *   (d) a finding with `fluxFlag` set must have ≥2 `positions`;
 *   (e) confidence derivation: 0 unknowns → DETERMINED, ≥1 → PROBABLE,
 *       decisive unknown → INDETERMINATE.
 */
import { describe, expect, it } from "vitest";

import {
  type AssessmentFinding,
  type FindingSource,
  type FluxFlag,
  deriveConfidence,
  determinedFinding,
  indeterminateFinding,
  isFindingComplete,
} from "./finding";

const SOURCE: FindingSource = {
  label: "EU Space Act proposal — Commission text",
  citation: "COM(2025) 335 Art. 23",
  asOf: "2025-06-25",
  verified: true,
};

const FLUX_FLAG_TWO_POSITIONS: FluxFlag = {
  summary: "contested — conservative reading shown",
  conservativeReading:
    "Space Act resilience chapter applies (Commission text reading)",
  positions: [
    {
      source: "com-2025-335",
      position: "Space Act resilience chapter (Arts 74–95) as lex specialis",
    },
    {
      source: "ep-itre-draft",
      position: "resilience chapter deleted; NIS2 extended via new Art 117a",
    },
  ],
};

/** A fully valid determined-finding input, overridable per test. */
function determinedInput(
  overrides: Partial<Parameters<typeof determinedFinding<string>>[0]> = {},
): Parameters<typeof determinedFinding<string>>[0] {
  return {
    value: "authorization_required",
    verdict: "applicable",
    what: "You need an authorization under the EU Space Act.",
    why: "Spacecraft operators established in the EU fall under COM(2025) 335 Art. 4.",
    wherefore:
      "Prepare an authorization application — start with the technical file.",
    whyTrace: [
      { questionId: "q1_1_roles", answerLabel: "Spacecraft operator" },
    ],
    confidence: "DETERMINED",
    sources: [SOURCE],
    cluster: "authorization_registration",
    rulebookVersion: "1.0.0",
    ...overrides,
  };
}

describe("determinedFinding (Task 1.2)", () => {
  it("builds a complete finding from valid input", () => {
    const finding = determinedFinding(determinedInput());
    expect(finding.confidence).toBe("DETERMINED");
    expect(finding.sources).toHaveLength(1);
    expect(isFindingComplete(finding)).toEqual([]);
  });

  it("(a) throws on empty sources — a determined finding without provenance must never exist", () => {
    expect(() => determinedFinding(determinedInput({ sources: [] }))).toThrow(
      /source/i,
    );
  });

  it("refuses INDETERMINATE confidence at runtime (use indeterminateFinding instead)", () => {
    expect(() =>
      determinedFinding(
        determinedInput({
          confidence: "INDETERMINATE" as unknown as "DETERMINED",
        }),
      ),
    ).toThrow(/indeterminate/i);
  });

  it("accepts PROBABLE as a determined band", () => {
    const finding = determinedFinding(
      determinedInput({ confidence: "PROBABLE" }),
    );
    expect(finding.confidence).toBe("PROBABLE");
    expect(isFindingComplete(finding)).toEqual([]);
  });

  it("preserves optional evidenceExamples and fluxFlag", () => {
    const finding = determinedFinding(
      determinedInput({
        evidenceExamples: ["Signed debris-mitigation plan"],
        fluxFlag: FLUX_FLAG_TWO_POSITIONS,
      }),
    );
    expect(finding.evidenceExamples).toEqual(["Signed debris-mitigation plan"]);
    expect(finding.fluxFlag?.positions).toHaveLength(2);
    expect(isFindingComplete(finding)).toEqual([]);
  });
});

describe("indeterminateFinding (Task 1.2)", () => {
  it("(b) throws when `why` is empty — an unexplained unknown is a silent fail", () => {
    expect(() =>
      indeterminateFinding({
        value: null,
        verdict: "advisory",
        what: "NIS2 classification could not be determined.",
        why: "   ",
        wherefore: "Answer the size-band questions to resolve this.",
        whyTrace: [],
        cluster: "resilience_cyber",
        rulebookVersion: "1.0.0",
      }),
    ).toThrow(/why/i);
  });

  it("builds an INDETERMINATE finding; sources default to [] and the empty list is renderable", () => {
    const finding = indeterminateFinding({
      value: null,
      verdict: "advisory",
      what: "NIS2 classification could not be determined.",
      why: "Both size-band answers are unsure — the decisive size-cap input is unknown.",
      wherefore: "Answer the size-band questions to resolve this.",
      whyTrace: [{ questionId: "q1_5_headcount", answerLabel: "I'm not sure" }],
      cluster: "resilience_cyber",
      rulebookVersion: "1.0.0",
    });
    expect(finding.confidence).toBe("INDETERMINATE");
    expect(finding.sources).toEqual([]);
    expect(isFindingComplete(finding)).toEqual([]);
  });

  it("may carry the partial provenance that WAS consulted", () => {
    const finding = indeterminateFinding({
      value: null,
      verdict: "advisory",
      what: "Light-regime eligibility could not be determined.",
      why: "Group structure is unsure — Art 10 eligibility depends on the linked-enterprise test.",
      wherefore: "Verify group structure with your finance team.",
      whyTrace: [{ questionId: "q1_7_group", answerLabel: "I'm not sure" }],
      sources: [SOURCE],
      cluster: "authorization_registration",
      rulebookVersion: "1.0.0",
    });
    expect(finding.sources).toEqual([SOURCE]);
  });
});

describe("isFindingComplete (Task 1.2)", () => {
  it("(c) reports missing fields on a hand-built bad object", () => {
    const missing = isFindingComplete({
      what: "Something applies.",
      confidence: "DETERMINED",
    });
    expect(missing).toContain("why");
    expect(missing).toContain("wherefore");
    expect(missing).toContain("verdict");
    expect(missing).toContain("sources");
    expect(missing).toContain("whyTrace");
    expect(missing).toContain("cluster");
    expect(missing).toContain("rulebookVersion");
    expect(missing).not.toContain("what");
    expect(missing).not.toContain("confidence");
  });

  it("reports every core field for a non-object", () => {
    const missing = isFindingComplete(null);
    expect(missing).toEqual(
      expect.arrayContaining([
        "what",
        "why",
        "wherefore",
        "verdict",
        "confidence",
        "sources",
        "whyTrace",
        "cluster",
        "rulebookVersion",
      ]),
    );
  });

  it("requires ≥1 source unless confidence is INDETERMINATE", () => {
    const base = determinedFinding(determinedInput());
    const stripped: AssessmentFinding<string> = { ...base, sources: [] };
    expect(isFindingComplete(stripped)).toContain("sources");
  });

  it("rejects an unknown cluster id and an invalid verdict", () => {
    const base = determinedFinding(determinedInput());
    expect(isFindingComplete({ ...base, cluster: "not_a_cluster" })).toContain(
      "cluster",
    );
    expect(isFindingComplete({ ...base, verdict: "compliant" })).toContain(
      "verdict",
    );
  });
});

describe("fluxFlag positions (Task 1.2, §7.1 #2 / founder §11.4)", () => {
  it("(d) determinedFinding throws when fluxFlag has fewer than 2 positions", () => {
    expect(() =>
      determinedFinding(
        determinedInput({
          fluxFlag: {
            ...FLUX_FLAG_TWO_POSITIONS,
            positions: [FLUX_FLAG_TWO_POSITIONS.positions[0]],
          },
        }),
      ),
    ).toThrow(/position/i);
  });

  it("(d) indeterminateFinding enforces the same ≥2-positions rule", () => {
    expect(() =>
      indeterminateFinding({
        value: null,
        verdict: "contested",
        what: "Cyber architecture is contested.",
        why: "The co-legislators disagree on the resilience chapter.",
        wherefore: "Track the trilogue outcome.",
        whyTrace: [],
        cluster: "resilience_cyber",
        rulebookVersion: "1.0.0",
        fluxFlag: {
          ...FLUX_FLAG_TWO_POSITIONS,
          positions: [],
        },
      }),
    ).toThrow(/position/i);
  });

  it("(d) isFindingComplete reports a hand-built fluxFlag with <2 positions", () => {
    const base = determinedFinding(determinedInput());
    const bad = {
      ...base,
      fluxFlag: {
        ...FLUX_FLAG_TWO_POSITIONS,
        positions: [FLUX_FLAG_TWO_POSITIONS.positions[0]],
      },
    };
    expect(isFindingComplete(bad)).toContain("fluxFlag");
  });

  it("accepts a fluxFlag with exactly 2 positions", () => {
    const finding = determinedFinding(
      determinedInput({ fluxFlag: FLUX_FLAG_TWO_POSITIONS }),
    );
    expect(isFindingComplete(finding)).toEqual([]);
  });
});

describe("deriveConfidence (Task 1.2)", () => {
  it("(e) 0 unknowns in the trigger chain → DETERMINED", () => {
    expect(
      deriveConfidence({ unknownsInTriggerChain: 0, decisiveUnknown: false }),
    ).toBe("DETERMINED");
  });

  it("(e) ≥1 non-decisive unknown → PROBABLE (the unknown is named at the finding level)", () => {
    expect(
      deriveConfidence({ unknownsInTriggerChain: 1, decisiveUnknown: false }),
    ).toBe("PROBABLE");
    expect(
      deriveConfidence({ unknownsInTriggerChain: 3, decisiveUnknown: false }),
    ).toBe("PROBABLE");
  });

  it("(e) decisive unknown → INDETERMINATE, regardless of count", () => {
    expect(
      deriveConfidence({ unknownsInTriggerChain: 0, decisiveUnknown: true }),
    ).toBe("INDETERMINATE");
    expect(
      deriveConfidence({ unknownsInTriggerChain: 2, decisiveUnknown: true }),
    ).toBe("INDETERMINATE");
  });

  it("monotonic: adding an unknown never improves the band (unknown rounds up)", () => {
    // DETERMINED (0) → PROBABLE (1) → still PROBABLE (2) → INDETERMINATE (decisive).
    const rank: Record<string, number> = {
      DETERMINED: 0,
      PROBABLE: 1,
      INDETERMINATE: 2,
    };
    const zero = deriveConfidence({
      unknownsInTriggerChain: 0,
      decisiveUnknown: false,
    });
    const one = deriveConfidence({
      unknownsInTriggerChain: 1,
      decisiveUnknown: false,
    });
    const decisive = deriveConfidence({
      unknownsInTriggerChain: 1,
      decisiveUnknown: true,
    });
    expect(rank[one]).toBeGreaterThanOrEqual(rank[zero]);
    expect(rank[decisive]).toBeGreaterThanOrEqual(rank[one]);
  });
});
