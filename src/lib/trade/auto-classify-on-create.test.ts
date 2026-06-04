/**
 * Tests for deriveAutoClassification — the event-driven auto-suggest that runs
 * the deterministic parametric matcher on a freshly-created TradeItem's
 * attributes and proposes a control code (marked ASTRA_SUGGESTED +
 * REQUIRES_REVIEW for human confirmation). Pure, no I/O.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Isolate the helper's logic (skip rules, confidence filter, regime→field
// mapping) from the matcher's corpus data by mocking the matcher.
vi.mock("@/lib/trade/classify-suggest", () => ({
  attributesToCandidateCodes: vi.fn(),
}));

import {
  deriveAutoClassification,
  fieldForCanonicalId,
} from "./auto-classify-on-create";
import { attributesToCandidateCodes } from "@/lib/trade/classify-suggest";

const cand = (canonicalId: string, confidence: "HIGH" | "MEDIUM" | "LOW") => ({
  code: canonicalId.slice(canonicalId.indexOf(":") + 1),
  canonicalId,
  regime: canonicalId.split(":")[0],
  title: "t",
  confidence,
  rationale: "r",
});

describe("fieldForCanonicalId — regime prefix → TradeItem field", () => {
  it("maps each control regime to the correct field", () => {
    expect(fieldForCanonicalId("USML:XV(a)(7)(i)")).toBe("usmlCategory");
    expect(fieldForCanonicalId("MTCR:9A101")).toBe("mtcrCategory");
    expect(fieldForCanonicalId("ECCN:9A515.a.1")).toBe("eccnUS");
    expect(fieldForCanonicalId("EU:9A515.a")).toBe("eccnEU");
  });
  it("returns null for an unknown prefix (never mis-route a code)", () => {
    expect(fieldForCanonicalId("WASSENAAR:x")).toBeNull();
    expect(fieldForCanonicalId("no-colon")).toBeNull();
  });
});

describe("deriveAutoClassification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when the user already declared ANY control code (never override a human)", () => {
    expect(
      deriveAutoClassification({ eccnUS: "9A515.a", apertureMeters: 0.7 }),
    ).toBeNull();
    expect(
      deriveAutoClassification({ usmlCategory: "XV(a)", isMilSpec: true }),
    ).toBeNull();
    expect(attributesToCandidateCodes).not.toHaveBeenCalled();
  });

  it("returns null when no parametric attribute is present", () => {
    expect(deriveAutoClassification({ name: "Widget" } as never)).toBeNull();
    expect(attributesToCandidateCodes).not.toHaveBeenCalled();
  });

  it("writes a HIGH candidate to the prefix-mapped field + ASTRA_SUGGESTED + REQUIRES_REVIEW", () => {
    vi.mocked(attributesToCandidateCodes).mockReturnValue([
      cand("ECCN:9A515.a.1", "HIGH"),
    ]);
    const out = deriveAutoClassification({ apertureMeters: 0.7 });
    expect(out).not.toBeNull();
    expect(out!.patch).toEqual({
      eccnUS: "9A515.a.1",
      classificationSource: "ASTRA_SUGGESTED",
      status: "REQUIRES_REVIEW",
    });
    expect(out!.suggestion.confidence).toBe("HIGH");
  });

  it("routes a USML candidate to usmlCategory", () => {
    vi.mocked(attributesToCandidateCodes).mockReturnValue([
      cand("USML:XV(a)(7)(i)", "MEDIUM"),
    ]);
    const out = deriveAutoClassification({ apertureMeters: 0.7 });
    expect(out!.patch.usmlCategory).toBe("XV(a)(7)(i)");
    expect(out!.patch.eccnUS).toBeUndefined();
  });

  it("ignores a LOW-confidence top candidate (too speculative to auto-write)", () => {
    vi.mocked(attributesToCandidateCodes).mockReturnValue([
      cand("ECCN:9A515.a.1", "LOW"),
    ]);
    expect(deriveAutoClassification({ apertureMeters: 0.7 })).toBeNull();
  });

  it("returns null when the top candidate's regime maps to no known field", () => {
    vi.mocked(attributesToCandidateCodes).mockReturnValue([
      cand("WASSENAAR:cat-9", "HIGH"),
    ]);
    expect(deriveAutoClassification({ apertureMeters: 0.7 })).toBeNull();
  });

  it("only forwards present attributes to the matcher (skips undefined + false booleans)", () => {
    vi.mocked(attributesToCandidateCodes).mockReturnValue([]);
    deriveAutoClassification({
      apertureMeters: 0.7,
      rangeKm: undefined,
      isMilSpec: false,
      isRadHardened: true,
    });
    const passed = vi.mocked(attributesToCandidateCodes).mock.calls[0][0];
    const names = passed.map((a) => a.attribute).sort();
    expect(names).toEqual(["apertureMeters", "isRadHardened"]);
  });
});

describe("deriveAutoClassification — multi-regime (Tier 1.3)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes the best HIGH/MEDIUM candidate for EVERY regime a dual-listed item matches", () => {
    // A 0.7 m EO payload is routinely listed under US EAR + EU dual-use + ITAR.
    vi.mocked(attributesToCandidateCodes).mockReturnValue([
      cand("ECCN:9A515.a.1", "HIGH"),
      cand("EU:9A515.a", "HIGH"),
      cand("USML:XV(a)(7)(i)", "MEDIUM"),
    ]);
    const out = deriveAutoClassification({ apertureMeters: 0.7 });
    expect(out).not.toBeNull();
    expect(out!.patch).toEqual({
      eccnUS: "9A515.a.1",
      eccnEU: "9A515.a",
      usmlCategory: "XV(a)(7)(i)",
      classificationSource: "ASTRA_SUGGESTED",
      status: "REQUIRES_REVIEW",
    });
    // suggestions carries one entry per field written; primary = overall top.
    expect(out!.suggestions).toHaveLength(3);
    expect(out!.suggestion.canonicalId).toBe("ECCN:9A515.a.1");
  });

  it("keeps only the highest-ranked candidate per field (de-dups same-regime codes)", () => {
    vi.mocked(attributesToCandidateCodes).mockReturnValue([
      cand("ECCN:9A515.a.1", "HIGH"), // best ECCN
      cand("ECCN:9A515.b", "MEDIUM"), // lower-ranked ECCN — ignored
    ]);
    const out = deriveAutoClassification({ apertureMeters: 0.7 });
    expect(out!.patch.eccnUS).toBe("9A515.a.1");
    expect(out!.suggestions).toHaveLength(1);
  });

  it("skips LOW-confidence and unmappable-regime candidates while keeping the rest", () => {
    vi.mocked(attributesToCandidateCodes).mockReturnValue([
      cand("ECCN:9A515.a.1", "HIGH"), // kept
      cand("WASSENAAR:cat-9", "HIGH"), // unmappable regime → skipped
      cand("EU:9A515.a", "LOW"), // too speculative → skipped
      cand("MTCR:9A101", "MEDIUM"), // kept
    ]);
    const out = deriveAutoClassification({ rangeKm: 320 });
    expect(out!.patch).toEqual({
      eccnUS: "9A515.a.1",
      mtcrCategory: "9A101",
      classificationSource: "ASTRA_SUGGESTED",
      status: "REQUIRES_REVIEW",
    });
    expect(out!.patch.eccnEU).toBeUndefined();
    expect(out!.suggestions).toHaveLength(2);
  });

  it("primary suggestion is the highest-ranked MAPPABLE candidate (unmappable top is skipped)", () => {
    vi.mocked(attributesToCandidateCodes).mockReturnValue([
      cand("WASSENAAR:x", "HIGH"), // unmappable — cannot be primary
      cand("EU:9A515.a", "HIGH"),
    ]);
    const out = deriveAutoClassification({ apertureMeters: 0.7 });
    expect(out!.suggestion.canonicalId).toBe("EU:9A515.a");
    expect(out!.patch.eccnEU).toBe("9A515.a");
    expect(out!.suggestions).toHaveLength(1);
  });
});
