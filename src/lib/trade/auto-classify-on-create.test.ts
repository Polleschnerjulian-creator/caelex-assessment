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
