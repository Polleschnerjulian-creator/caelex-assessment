/**
 * Tests for the Explanation Envelope (`ExplainedResult<T>`) contract.
 *
 * These tests pin the structural-transparency invariants the renderer + every
 * downstream lane rely on:
 *   - `isExplained` returns the EXACT list of missing fields.
 *   - sources are required for a determined result, optional ONLY for
 *     UNVERIFIED (the fail-closed band).
 *   - the constructors refuse to fabricate a determined result without
 *     provenance and refuse a silent UNVERIFIED with no stated gap.
 *   - a human decision-of-record stamps without making the result more
 *     permissive.
 */

import { describe, it, expect } from "vitest";

import {
  type ExplainedResult,
  type ExplainSource,
  isExplained,
  isFullyExplained,
  explainedResult,
  unverifiedResult,
  withDecisionOfRecord,
} from "./explained-result";

const SRC: ExplainSource = {
  label: "EU Annex I (Reg. 2021/821)",
  citation: "15 CFR 774 Supp.1 ECCN 9A515.a.1",
  listVersion: "2026-01-15",
  url: "https://example.test/9A515",
};

function completeResult(): ExplainedResult<{ code: string }> {
  return {
    value: { code: "ECCN:9A515.a.1" },
    what: "Item classifies as ECCN 9A515.a.1.",
    why: "Aperture 0.55 m ≥ 0.50 m threshold; matched 15 CFR 774 Supp.1.",
    wherefore: "Licence likely required. Next: confirm de-minimis content.",
    confidence: "HIGH",
    sources: [SRC],
    override: { allowed: true },
  };
}

describe("isExplained", () => {
  it("returns an empty array for a fully-explained determined result", () => {
    expect(isExplained(completeResult())).toEqual([]);
    expect(isFullyExplained(completeResult())).toBe(true);
  });

  it("flags an empty `what`", () => {
    const r = { ...completeResult(), what: "" };
    expect(isExplained(r)).toContain("what");
    expect(isFullyExplained(r)).toBe(false);
  });

  it("flags a whitespace-only `what` / `why` / `wherefore` as missing", () => {
    const r = { ...completeResult(), what: "   ", why: "\t\n", wherefore: " " };
    const missing = isExplained(r);
    expect(missing).toContain("what");
    expect(missing).toContain("why");
    expect(missing).toContain("wherefore");
  });

  it("flags an invalid confidence band", () => {
    const r = { ...completeResult(), confidence: "GREEN" as never };
    expect(isExplained(r)).toContain("confidence");
  });

  it("requires sources for a determined (HIGH/MEDIUM/LOW) result", () => {
    for (const confidence of ["HIGH", "MEDIUM", "LOW"] as const) {
      const r = { ...completeResult(), confidence, sources: [] };
      expect(isExplained(r)).toContain("sources");
    }
  });

  it("PERMITS empty sources ONLY for the UNVERIFIED fail-closed band", () => {
    const r = {
      ...completeResult(),
      confidence: "UNVERIFIED" as const,
      sources: [] as ExplainSource[],
    };
    // why/wherefore/what still present → only-missing-field is nothing.
    expect(isExplained(r)).toEqual([]);
    expect(isFullyExplained(r)).toBe(true);
  });

  it("still requires why even for UNVERIFIED (no silent fail)", () => {
    const r = {
      ...completeResult(),
      confidence: "UNVERIFIED" as const,
      sources: [] as ExplainSource[],
      why: "",
    };
    expect(isExplained(r)).toContain("why");
  });

  it("reports ALL missing fields for an empty object", () => {
    expect(isExplained({}).sort()).toEqual(
      ["confidence", "sources", "what", "wherefore", "why"].sort(),
    );
  });

  it("treats null / non-object input as entirely unexplained", () => {
    const all = ["what", "why", "wherefore", "confidence", "sources"].sort();
    expect(isExplained(null).sort()).toEqual(all);
    expect(isExplained(undefined).sort()).toEqual(all);
    expect(isExplained("verdict: CLEAR").sort()).toEqual(all);
    expect(isExplained(42).sort()).toEqual(all);
  });
});

describe("explainedResult constructor", () => {
  it("builds a determined result and defaults override to AI-proposed", () => {
    const r = explainedResult({
      value: { code: "EU:9A004" },
      what: "Spacecraft controlled under EU 9A004.",
      why: "itemClass matches EU Annex I 9A004 scope entry.",
      wherefore: "EU export authorisation required. Next: prepare EUC.",
      confidence: "MEDIUM",
      sources: [SRC],
    });
    expect(isFullyExplained(r)).toBe(true);
    expect(r.override).toEqual({ allowed: true });
    expect(r.confidence).toBe("MEDIUM");
  });

  it("THROWS when a determined result is built with zero sources", () => {
    expect(() =>
      explainedResult({
        value: null,
        what: "x",
        why: "y",
        wherefore: "z",
        confidence: "HIGH",
        sources: [],
      }),
    ).toThrow(/requires >=1 source/);
  });

  it("THROWS when UNVERIFIED is passed to the determined constructor", () => {
    expect(() =>
      explainedResult({
        value: null,
        what: "x",
        why: "y",
        wherefore: "z",
        // force the invalid path a caller might hit via a widened type
        confidence: "UNVERIFIED" as never,
        sources: [SRC],
      }),
    ).toThrow(/UNVERIFIED/);
  });
});

describe("unverifiedResult constructor (fail-closed)", () => {
  it("produces a renderable UNVERIFIED envelope with no sources", () => {
    const r = unverifiedResult({
      value: null,
      what: "No classification could be determined.",
      why: "No control-list entry matched — absence is NOT a clearance.",
      wherefore: "Populate technical attributes or request a BAFA AzG.",
    });
    expect(r.confidence).toBe("UNVERIFIED");
    expect(r.sources).toEqual([]);
    expect(isFullyExplained(r)).toBe(true);
    // It is NEVER green: confidence is explicitly the blocking band.
    expect(r.confidence).not.toBe("HIGH");
  });

  it("THROWS on a silent fail (empty why)", () => {
    expect(() =>
      unverifiedResult({
        value: null,
        what: "x",
        why: "   ",
        wherefore: "z",
      }),
    ).toThrow(/must explain the gap/);
  });

  it("may carry the stale/partial provenance that was consulted", () => {
    const r = unverifiedResult({
      value: null,
      what: "Screening could not complete.",
      why: "OFAC SDN list snapshot is stale (>30 days) — failing closed.",
      wherefore: "Refresh the sanctions snapshot and re-screen.",
      sources: [SRC],
    });
    expect(r.sources).toHaveLength(1);
    expect(r.confidence).toBe("UNVERIFIED");
  });
});

describe("withDecisionOfRecord", () => {
  it("stamps a human decision without mutating the original", () => {
    const original = completeResult();
    const decided = withDecisionOfRecord(original, {
      by: "officer@firm.de",
      at: "2026-06-09T10:00:00Z",
      justification: "Reviewed datasheet; concur with 9A515.a.1.",
    });
    expect(original.override).toEqual({ allowed: true });
    expect(decided.override.by).toBe("officer@firm.de");
    expect(decided.override.at).toBe("2026-06-09T10:00:00Z");
    expect(decided.override.allowed).toBe(true);
  });

  it("NEVER changes the verdict or confidence — only the override record", () => {
    const original = completeResult();
    const decided = withDecisionOfRecord(original, {
      by: "u",
      at: "t",
    });
    expect(decided.value).toEqual(original.value);
    expect(decided.confidence).toBe(original.confidence);
    expect(decided.what).toBe(original.what);
    expect(isFullyExplained(decided)).toBe(true);
  });
});
