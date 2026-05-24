/**
 * Caelex Trade — Tests for extraction-merger.ts (M1-1A).
 *
 * Pure-function merger → easy to exhaustively test the trust hierarchy,
 * numeric tolerance, disagreement-flagging, and source-attribution
 * without any I/O.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  mergeExtractions,
  valuesAgree,
  NUMERIC_AGREEMENT_TOLERANCE,
} from "./extraction-merger";
import type { DatasheetExtraction } from "@/lib/trade/datasheet-extractor";
import type { VisionAttribute } from "./claude-vision-extractor.server";

// ─── Helpers ──────────────────────────────────────────────────────────

function regexDoc(
  attrs: Record<string, number | boolean | string>,
  extras: Partial<DatasheetExtraction> = {},
): DatasheetExtraction {
  return {
    rawText: "synthetic",
    pageCount: 1,
    attributes: attrs as DatasheetExtraction["attributes"],
    evidence: Object.keys(attrs).map((k) => ({
      attribute: k as never,
      quote: `${k} = ${attrs[k]}`,
      contextBefore: "",
      contextAfter: "",
      offset: 0,
      parsedValue: attrs[k],
    })),
    ...extras,
  };
}

function vision(
  attribute: string,
  value: number | boolean | string,
  confidence: "high" | "medium" | "low" = "medium",
  reasoning = "Vision claim",
): VisionAttribute {
  return {
    attribute: attribute as VisionAttribute["attribute"],
    value,
    confidence,
    reasoning,
  };
}

// ─── valuesAgree primitive ────────────────────────────────────────────

describe("valuesAgree", () => {
  it("returns true when numbers are exactly equal", () => {
    expect(valuesAgree(0.5, 0.5)).toBe(true);
  });

  it("returns true when numbers are within tolerance", () => {
    // 5% tolerance — 0.5 vs 0.51 = 2% drift
    expect(valuesAgree(0.5, 0.51)).toBe(true);
  });

  it("returns false when numbers exceed tolerance", () => {
    // 0.5 vs 0.6 = 16% drift — over 5%
    expect(valuesAgree(0.5, 0.6)).toBe(false);
  });

  it("treats 0,0 as agreement", () => {
    expect(valuesAgree(0, 0)).toBe(true);
  });

  it("returns true for matching booleans", () => {
    expect(valuesAgree(true, true)).toBe(true);
    expect(valuesAgree(false, false)).toBe(true);
  });

  it("returns false for mismatched booleans", () => {
    expect(valuesAgree(true, false)).toBe(false);
  });

  it("returns true for case-insensitive matching strings", () => {
    expect(
      valuesAgree(
        "Spacecraft.Remote_Sensing.SAR",
        "spacecraft.remote_sensing.sar",
      ),
    ).toBe(true);
  });

  it("returns false for type mismatches", () => {
    expect(valuesAgree(1, true)).toBe(false);
    expect(valuesAgree("1", 1)).toBe(false);
  });
});

// ─── mergeExtractions — null inputs ───────────────────────────────────

describe("mergeExtractions — degenerate inputs", () => {
  it("returns empty extraction when both inputs are null", () => {
    const r = mergeExtractions({ regex: null, vision: null });
    expect(r.attributes).toEqual([]);
    expect(r.regexEvidence).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it("passes through visionError when set", () => {
    const r = mergeExtractions({
      regex: null,
      vision: null,
      visionError: "Quota exceeded",
    });
    expect(r.visionError).toBe("Quota exceeded");
  });

  it("passes through regexParseError when regex pipeline failed", () => {
    const r = mergeExtractions({
      regex: regexDoc({}, { parseError: "Could not extract text" }),
      vision: null,
    });
    expect(r.regexParseError).toBe("Could not extract text");
  });
});

// ─── Regex-only path ──────────────────────────────────────────────────

describe("mergeExtractions — regex-only", () => {
  it('emits regex attributes with source="regex" and confidence="high"', () => {
    const r = mergeExtractions({
      regex: regexDoc({ apertureMeters: 0.5, payloadKg: 500 }),
      vision: null,
    });
    expect(r.attributes).toHaveLength(2);
    expect(r.attributes.every((a) => a.source === "regex")).toBe(true);
    expect(r.attributes.every((a) => a.confidence === "high")).toBe(true);
  });

  it("uses the evidence quote in the reasoning string", () => {
    const r = mergeExtractions({
      regex: regexDoc({ apertureMeters: 0.5 }),
      vision: null,
    });
    expect(r.attributes[0].reasoning).toContain("apertureMeters = 0.5");
  });

  it("propagates regex evidence", () => {
    const r = mergeExtractions({
      regex: regexDoc({ apertureMeters: 0.5, payloadKg: 500 }),
      vision: null,
    });
    expect(r.regexEvidence).toHaveLength(2);
  });
});

// ─── Vision-only path ─────────────────────────────────────────────────

describe("mergeExtractions — vision-only", () => {
  it('emits vision attributes with source="vision"', () => {
    const r = mergeExtractions({
      regex: null,
      vision: [vision("gsdMeters", 0.3, "high", "Spec table page 2")],
    });
    expect(r.attributes).toHaveLength(1);
    expect(r.attributes[0].source).toBe("vision");
    expect(r.attributes[0].confidence).toBe("high");
    expect(r.attributes[0].reasoning).toBe("Spec table page 2");
  });

  it("includes vision warnings", () => {
    const r = mergeExtractions({
      regex: null,
      vision: [],
      visionWarnings: ["Datasheet looks scanned — accuracy reduced"],
    });
    expect(r.warnings).toContain("Datasheet looks scanned — accuracy reduced");
  });
});

// ─── Both sources — agreement path ────────────────────────────────────

describe("mergeExtractions — agreement", () => {
  it("regex wins when both sources have the same numeric value", () => {
    const r = mergeExtractions({
      regex: regexDoc({ apertureMeters: 0.5 }),
      vision: [vision("apertureMeters", 0.5, "high")],
    });
    expect(r.attributes).toHaveLength(1);
    expect(r.attributes[0].source).toBe("regex");
    expect(r.attributes[0].value).toBe(0.5);
    expect(r.attributes[0].reasoning).toContain("Vision agreed");
    expect(r.attributes[0].alternateValue).toBeUndefined();
  });

  it("regex wins when values agree within tolerance (e.g. 0.5 vs 0.51)", () => {
    const r = mergeExtractions({
      regex: regexDoc({ apertureMeters: 0.5 }),
      vision: [vision("apertureMeters", 0.51, "high")],
    });
    expect(r.attributes).toHaveLength(1);
    expect(r.attributes[0].source).toBe("regex");
    expect(r.attributes[0].reasoning).toContain("Vision agreed");
  });
});

// ─── Both sources — disagreement path ─────────────────────────────────

describe("mergeExtractions — disagreement", () => {
  it("regex wins as primary but vision attached as alternateValue", () => {
    const r = mergeExtractions({
      regex: regexDoc({ payloadKg: 500 }),
      vision: [vision("payloadKg", 700, "high", "Vision row 3")],
    });
    expect(r.attributes).toHaveLength(1);
    expect(r.attributes[0].value).toBe(500);
    expect(r.attributes[0].source).toBe("regex");
    expect(r.attributes[0].alternateValue).toBeDefined();
    expect(r.attributes[0].alternateValue?.value).toBe(700);
    expect(r.attributes[0].alternateValue?.source).toBe("vision");
    expect(r.attributes[0].alternateValue?.reasoning).toBe("Vision row 3");
  });

  it("emits a warning describing the disagreement", () => {
    const r = mergeExtractions({
      regex: regexDoc({ payloadKg: 500 }),
      vision: [vision("payloadKg", 700)],
    });
    expect(r.warnings.some((w) => w.includes("payloadKg"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("500"))).toBe(true);
    expect(r.warnings.some((w) => w.includes("700"))).toBe(true);
  });

  it("flags boolean disagreement", () => {
    const r = mergeExtractions({
      regex: regexDoc({ isRadHardened: true }),
      vision: [vision("isRadHardened", false)],
    });
    expect(r.attributes).toHaveLength(1);
    expect(r.attributes[0].value).toBe(true);
    expect(r.attributes[0].alternateValue?.value).toBe(false);
    expect(r.warnings.some((w) => w.includes("isRadHardened"))).toBe(true);
  });
});

// ─── Mixed input ──────────────────────────────────────────────────────

describe("mergeExtractions — mixed regex + vision sets", () => {
  it("merges disjoint attribute sets without duplication", () => {
    const r = mergeExtractions({
      regex: regexDoc({ apertureMeters: 0.5 }),
      vision: [vision("gsdMeters", 0.3)],
    });
    expect(r.attributes).toHaveLength(2);
    const aperture = r.attributes.find((a) => a.attribute === "apertureMeters");
    const gsd = r.attributes.find((a) => a.attribute === "gsdMeters");
    expect(aperture?.source).toBe("regex");
    expect(gsd?.source).toBe("vision");
  });

  it("sorts regex attributes before vision attributes", () => {
    const r = mergeExtractions({
      regex: regexDoc({ apertureMeters: 0.5, payloadKg: 500 }),
      vision: [vision("gsdMeters", 0.3), vision("frequencyGhz", 5.2)],
    });
    expect(r.attributes).toHaveLength(4);
    expect(r.attributes[0].source).toBe("regex");
    expect(r.attributes[1].source).toBe("regex");
    expect(r.attributes[2].source).toBe("vision");
    expect(r.attributes[3].source).toBe("vision");
  });

  it("handles parametricAttributes (extended-vocabulary) entries", () => {
    const dsExt = regexDoc(
      {},
      {
        attributes: {
          parametricAttributes: { spectralBandCount: 12 },
        } as DatasheetExtraction["attributes"],
        evidence: [
          {
            attribute: "spectralBandCount" as never,
            quote: "12 spectral bands",
            contextBefore: "",
            contextAfter: "",
            offset: 0,
            parsedValue: 12,
          },
        ],
      },
    );
    const r = mergeExtractions({
      regex: dsExt,
      vision: null,
    });
    expect(r.attributes).toHaveLength(1);
    expect(r.attributes[0].attribute).toBe("spectralBandCount");
    expect(r.attributes[0].value).toBe(12);
    expect(r.attributes[0].source).toBe("regex");
  });
});

// ─── Tolerance constant exposed ───────────────────────────────────────

describe("NUMERIC_AGREEMENT_TOLERANCE", () => {
  it("is between 0 and 1 (relative error)", () => {
    expect(NUMERIC_AGREEMENT_TOLERANCE).toBeGreaterThan(0);
    expect(NUMERIC_AGREEMENT_TOLERANCE).toBeLessThan(1);
  });
});

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
