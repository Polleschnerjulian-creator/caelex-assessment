/**
 * Tests for `explainClassification` — the reference Explanation-Envelope
 * wrapper over the parametric matcher.
 *
 * Pins the conservative-by-design mapping:
 *   - a real candidate → a determined HIGH/MEDIUM/LOW result with the citation
 *     + list-version source and the matched-predicate parameter table in WHY.
 *   - a possibleMatch (NULL attribute) → UNVERIFIED, never a clearance.
 *   - a near-miss → UNVERIFIED with the closest entry surfaced.
 *   - no match / no attributes / null engine result → UNVERIFIED with the
 *     "absence is NOT a clearance" why. NEVER green.
 *
 * Fixtures build `MatcherResult` by hand so the wrapper is exercised in
 * isolation from the cross-walk data.
 */

import { describe, it, expect } from "vitest";

import type {
  CandidateMatch,
  MatcherResult,
  NearMissMatch,
  PossibleMatch,
} from "./classification/parametric-matcher";
import type { ControlListEntry } from "./classification/control-list-cross-walk";
import { explainClassification } from "./explain-classification";
import { isFullyExplained } from "./explained-result";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ENTRY_9A515: ControlListEntry = {
  canonicalId: "ECCN:9A515.a.1",
  regime: "EAR-CCL",
  category: "9",
  productGroup: "A",
  entryNumber: "515",
  subpara: "a.1",
  title: "Spacecraft with EO remote-sensing capability, aperture 0.35-0.50 m",
  predicates: [
    { attribute: "apertureMeters", op: "between", value: [0.35, 0.5] },
  ],
  reasonsForControl: ["NS:2"],
  seeAlso: [],
  citation: "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.a.1",
  validFrom: "2014-05-13",
};

function emptyMatcher(over: Partial<MatcherResult> = {}): MatcherResult {
  return {
    candidates: [],
    possibleMatches: [],
    nearMisses: [],
    noAttributesPopulated: false,
    disclaimer: "screening-level guidance",
    sanityWarnings: [],
    ...over,
  };
}

function candidate(confidence: CandidateMatch["confidence"]): CandidateMatch {
  return {
    entry: ENTRY_9A515,
    confidence,
    matchedPredicates: [
      {
        attribute: "apertureMeters",
        op: "between",
        expectedValue: [0.35, 0.5],
        actualValue: 0.45,
        boundary: false,
      },
    ],
    rationale: "Matched 1 predicate: aperture between [0.35, 0.5]. HIGH.",
  };
}

// ─── Determined candidate ────────────────────────────────────────────────────

describe("explainClassification — determined candidate", () => {
  it("maps a HIGH candidate to a fully-explained HIGH result", () => {
    const r = explainClassification(
      emptyMatcher({ candidates: [candidate("HIGH")] }),
    );
    expect(r.confidence).toBe("HIGH");
    expect(isFullyExplained(r)).toBe(true);
    expect(r.value.canonicalId).toBe("ECCN:9A515.a.1");
    expect(r.value.regime).toBe("EAR-CCL");
    // WHY carries the citation + the matched-predicate parameter table.
    expect(r.why).toContain("15 CFR 774");
    expect(r.why).toContain("apertureMeters");
    expect(r.why).toContain("actual: 0.45");
    // SOURCE carries the citation + the list-version (validFrom) stamp.
    expect(r.sources).toHaveLength(1);
    expect(r.sources[0].citation).toBe(
      "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.a.1",
    );
    expect(r.sources[0].listVersion).toContain("2014-05-13");
    // OVERRIDE: AI-proposed by default — a human applies it.
    expect(r.override.allowed).toBe(true);
    expect(r.override.by).toBeUndefined();
  });

  it("preserves MEDIUM and LOW bands (never upgrades to green)", () => {
    expect(
      explainClassification(emptyMatcher({ candidates: [candidate("MEDIUM")] }))
        .confidence,
    ).toBe("MEDIUM");
    expect(
      explainClassification(emptyMatcher({ candidates: [candidate("LOW")] }))
        .confidence,
    ).toBe("LOW");
  });

  it("folds T-M19 sanity warnings into the WHY so they cannot hide", () => {
    const r = explainClassification(
      emptyMatcher({
        candidates: [candidate("HIGH")],
        sanityWarnings: ["frequencyGhz value 1200 outside plausible range"],
      }),
    );
    expect(r.why).toContain("Sanity warnings");
    expect(r.why).toContain("1200");
  });
});

// ─── Possible match (three-valued logic) → UNVERIFIED ────────────────────────

describe("explainClassification — possible match maps to UNVERIFIED", () => {
  it("a NULL-attribute possible match is NOT a clearance", () => {
    const possible: PossibleMatch = {
      entry: ENTRY_9A515,
      matchedPredicates: [],
      unknownPredicates: [
        {
          attribute: "apertureMeters",
          op: "between",
          expectedValue: [0.35, 0.5],
          missingAttribute: "apertureMeters",
        },
      ],
      rationale:
        "Partial match against ECCN:9A515.a.1: populate [apertureMeters].",
    };
    const r = explainClassification(
      emptyMatcher({ possibleMatches: [possible] }),
    );
    expect(r.confidence).toBe("UNVERIFIED");
    expect(r.confidence).not.toBe("HIGH");
    expect(r.value.canonicalId).toBeNull();
    expect(r.why).toContain("NOT a clearance");
    expect(r.wherefore).toContain("apertureMeters");
    expect(isFullyExplained(r)).toBe(true);
  });
});

// ─── Near-miss → UNVERIFIED ──────────────────────────────────────────────────

describe("explainClassification — near-miss maps to UNVERIFIED", () => {
  it("surfaces the closest near-miss without classifying", () => {
    const nearMiss: NearMissMatch = {
      entry: ENTRY_9A515,
      matchedPredicates: [],
      refutingPredicate: {
        attribute: "apertureMeters",
        op: "between",
        expectedValue: [0.35, 0.5],
        actualValue: 0.55,
      },
      rationale: "Near-miss for ECCN:9A515.a.1: aperture 0.55 fails 0.35-0.50.",
    };
    const r = explainClassification(emptyMatcher({ nearMisses: [nearMiss] }));
    expect(r.confidence).toBe("UNVERIFIED");
    expect(r.value.canonicalId).toBeNull();
    expect(r.what).toContain("near-miss");
    expect(r.why).toContain("NOT a classification");
    expect(r.sources).toHaveLength(1);
  });
});

// ─── No match / no attributes / null engine ──────────────────────────────────

describe("explainClassification — absence is NOT a clearance", () => {
  it("maps an empty matcher result to UNVERIFIED (no green)", () => {
    const r = explainClassification(emptyMatcher());
    expect(r.confidence).toBe("UNVERIFIED");
    expect(r.value.canonicalId).toBeNull();
    expect(r.why).toContain("eine fehlende Einstufung ist keine Freigabe");
    expect(isFullyExplained(r)).toBe(true);
  });

  it("explains the no-attributes-populated path actionably", () => {
    const r = explainClassification(
      emptyMatcher({ noAttributesPopulated: true }),
    );
    expect(r.confidence).toBe("UNVERIFIED");
    expect(r.why).toContain("No technical attributes were populated");
    expect(r.wherefore).toContain("Populate at least one technical attribute");
  });

  it("maps a null engine result to UNVERIFIED (fail closed)", () => {
    const r = explainClassification(null);
    expect(r.confidence).toBe("UNVERIFIED");
    expect(r.value.canonicalId).toBeNull();
    expect(r.why).toContain("absence is NOT a clearance");
    expect(isFullyExplained(r)).toBe(true);
  });

  it("maps undefined the same way as null", () => {
    expect(explainClassification(undefined).confidence).toBe("UNVERIFIED");
  });

  it("prefers a real candidate over a coexisting possible/near-miss", () => {
    // If the engine produced both a candidate AND possibles, the determined
    // candidate wins — but it must still never be more permissive than the
    // candidate's own band.
    const r = explainClassification(
      emptyMatcher({
        candidates: [candidate("MEDIUM")],
        possibleMatches: [
          {
            entry: ENTRY_9A515,
            matchedPredicates: [],
            unknownPredicates: [],
            rationale: "x",
          },
        ],
      }),
    );
    expect(r.confidence).toBe("MEDIUM");
    expect(r.value.canonicalId).toBe("ECCN:9A515.a.1");
  });
});
