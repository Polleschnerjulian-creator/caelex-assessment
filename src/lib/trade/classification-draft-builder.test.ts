/**
 * Tests for src/lib/trade/classification-draft-builder.ts — Sprint Z4b.
 *
 * Exercises the pure-function draft composition between the Z4a
 * extractor and the parametric matcher. Uses small handcrafted
 * extractions to drive the matcher into each surface (full candidate,
 * possible-match fallback, near-miss fallback, no-match).
 */

import { describe, it, expect } from "vitest";
import {
  buildClassificationDraft,
  composeDraft,
} from "./classification-draft-builder";
import { extractFromText } from "./datasheet-extractor";
import type { MatcherResult } from "@/lib/comply-v2/trade/classification/parametric-matcher";

describe("buildClassificationDraft — end-to-end paths", () => {
  it("returns a primary candidate when extractor + matcher agree", () => {
    // EO satellite with sub-0.50 m aperture → USML XV(a)(7)(i)
    // (`apertureMeters < 0.50` AND itemClass starts with
    // "spacecraft.remote_sensing.eo"). The extractor heuristic maps
    // "Earth-observation satellite" → spacecraft.remote_sensing.eo.
    const text =
      "Earth-observation satellite. Primary aperture: 0.30 m. Specially designed for spaceflight applications.";
    const extraction = extractFromText(text);
    const draft = buildClassificationDraft(extraction);

    expect(draft.primary).not.toBeNull();
    expect(draft.primary?.canonicalId).toContain("XV(a)(7)(i)");
    expect(draft.primary?.regime).toBe("ITAR-USML");
    // Evidence on the primary proposal must include the aperture
    // evidence pulled by the extractor.
    expect(
      draft.primary?.evidence.some((e) => e.attribute === "apertureMeters"),
    ).toBe(true);
  });

  it("preserves the disclaimer across every draft", () => {
    const text = "Aperture: 0.65 m. Specially designed for spaceflight.";
    const draft = buildClassificationDraft(extractFromText(text));

    expect(draft.disclaimer).toMatch(/SCREENING-LEVEL GUIDANCE/);
    expect(draft.disclaimer).toMatch(/criminal penalties/);
  });

  it("returns empty proposals + actionable summary when nothing matches", () => {
    // No extracted attributes → matcher has nothing to chew on.
    const draft = buildClassificationDraft(extractFromText("Marketing copy."));

    expect(draft.proposals).toEqual([]);
    expect(draft.primary).toBeNull();
    expect(draft.summary.toLowerCase()).toContain("no parametric attributes");
  });

  it("surfaces a parseError summary when the upstream extractor failed", () => {
    const draft = buildClassificationDraft({
      rawText: "",
      pageCount: 0,
      attributes: {},
      evidence: [],
      parseError: "fake PDF parse error",
    });

    expect(draft.proposals).toEqual([]);
    expect(draft.summary).toContain("Could not parse");
    expect(draft.summary).toContain("fake PDF parse error");
  });
});

describe("composeDraft — possible-match fallback", () => {
  it("downgrades a possible-match to LOW confidence when no candidate exists", () => {
    // Hand-craft a matcher result with only possible-matches (no
    // candidates) so we exercise the fallback branch deterministically.
    const matcherResult: MatcherResult = {
      candidates: [],
      possibleMatches: [
        {
          entry: {
            canonicalId: "TEST:9A999",
            regime: "EAR-CCL",
            category: "9",
            productGroup: "A",
            entryNumber: "999",
            title: "Test entry",
            citation: "Test citation",
            reasonsForControl: ["NS"],
            seeAlso: [],
            predicates: [],
            validFrom: "2026-01-01",
          },
          matchedPredicates: [],
          unknownPredicates: [
            {
              attribute: "transmitPowerW",
              op: "gte",
              expectedValue: 100,
              missingAttribute: "transmitPowerW",
            },
          ],
          rationale: "Test possible match",
        },
      ],
      nearMisses: [],
      noAttributesPopulated: false,
      disclaimer: "test disclaimer",
    };

    const draft = composeDraft(
      {
        rawText: "test",
        pageCount: 1,
        attributes: {},
        evidence: [],
      },
      matcherResult,
    );

    expect(draft.primary?.source).toBe("possible_match");
    expect(draft.primary?.confidence).toBe("LOW");
    expect(draft.attributesNeeded).toContain("transmitPowerW");
  });
});

describe("composeDraft — near-miss fallback", () => {
  it("surfaces the top near-miss when no candidates or possibles exist", () => {
    const matcherResult: MatcherResult = {
      candidates: [],
      possibleMatches: [],
      nearMisses: [
        {
          entry: {
            canonicalId: "TEST:9A888",
            regime: "EAR-CCL",
            category: "9",
            productGroup: "A",
            entryNumber: "888",
            title: "Near-miss entry",
            citation: "Test citation",
            reasonsForControl: ["NS"],
            seeAlso: [],
            predicates: [],
            validFrom: "2026-01-01",
          },
          matchedPredicates: [],
          refutingPredicate: {
            attribute: "apertureMeters",
            op: "gte",
            expectedValue: 0.5,
            actualValue: 0.49,
          },
          rationale: "Aperture 0.49 m fell just below the 0.50 m threshold.",
        },
      ],
      noAttributesPopulated: false,
      disclaimer: "test disclaimer",
    };

    const draft = composeDraft(
      {
        rawText: "test",
        pageCount: 1,
        attributes: {},
        evidence: [],
      },
      matcherResult,
    );

    expect(draft.primary?.source).toBe("near_miss");
    expect(draft.primary?.canonicalId).toBe("TEST:9A888");
  });
});

describe("composeDraft — proposals capped at 3", () => {
  it("limits proposals to the top three candidates", () => {
    const makeCandidate = (
      id: string,
    ): MatcherResult["candidates"][number] => ({
      entry: {
        canonicalId: id,
        regime: "EAR-CCL",
        category: "9",
        productGroup: "A",
        entryNumber: "x",
        title: id,
        citation: "Test",
        reasonsForControl: ["NS"],
        seeAlso: [],
        predicates: [],
        validFrom: "2026-01-01",
      },
      confidence: "HIGH",
      matchedPredicates: [],
      rationale: `rationale for ${id}`,
    });

    const matcherResult: MatcherResult = {
      candidates: [
        makeCandidate("ECCN:9A001"),
        makeCandidate("ECCN:9A002"),
        makeCandidate("ECCN:9A003"),
        makeCandidate("ECCN:9A004"),
        makeCandidate("ECCN:9A005"),
      ],
      possibleMatches: [],
      nearMisses: [],
      noAttributesPopulated: false,
      disclaimer: "test",
    };

    const draft = composeDraft(
      { rawText: "", pageCount: 1, attributes: {}, evidence: [] },
      matcherResult,
    );

    // Three is the cap: the operator can't review more usefully and
    // the LLM/UI surface becomes cluttered.
    expect(draft.proposals).toHaveLength(3);
    expect(draft.proposals[0].canonicalId).toBe("ECCN:9A001");
  });
});

describe("composeDraft — corpus keyword fallback (DCW-1)", () => {
  it("surfaces a LOW-confidence corpus_keyword proposal when the parametric matcher is sparse", () => {
    // No numeric attributes → 0 parametric candidates. The distinctive terms
    // match the USML XV(e) "Lithium-thionyl chloride ... batteries" entry
    // (>=2 token hits) — a code the predicate matcher structurally can't see.
    const draft = buildClassificationDraft(
      extractFromText(
        "Lithium-thionyl chloride chemistry cells for power storage units.",
      ),
    );
    const kw = draft.proposals.filter((p) => p.source === "corpus_keyword");
    expect(kw.length).toBeGreaterThan(0);
    expect(kw.every((p) => p.confidence === "LOW")).toBe(true);
  });

  it("does NOT add corpus_keyword noise to plain text (requires >=2 distinct term hits)", () => {
    const draft = buildClassificationDraft(extractFromText("Marketing copy."));
    expect(
      draft.proposals.filter((p) => p.source === "corpus_keyword"),
    ).toEqual([]);
  });
});
