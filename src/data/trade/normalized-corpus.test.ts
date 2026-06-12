/**
 * Tests for the normalized control-list corpus union (DCW-1 / P0-A).
 * Verifies every dead corpus is wired into one flat, code-lookup-able index
 * with honest provenance (no fabricated control reasons).
 */

import { describe, it, expect } from "vitest";
import {
  NORMALIZED_CORPUS_UNION,
  type CorpusRegime,
  type NormalizedCorpusEntry,
} from "./normalized-corpus";

describe("NORMALIZED_CORPUS_UNION — shape + provenance", () => {
  it("every entry has the required non-empty fields", () => {
    for (const e of NORMALIZED_CORPUS_UNION) {
      expect(e.canonicalId, `canonicalId for ${e.code}`).toBeTruthy();
      expect(e.code, `code in ${e.canonicalId}`).toBeTruthy();
      expect(e.title, `title in ${e.canonicalId}`).toBeTruthy();
      expect(e.description, `description in ${e.canonicalId}`).toBeTruthy();
      expect(e.sourceUrl, `sourceUrl in ${e.canonicalId}`).toMatch(
        /^https?:\/\//,
      );
      expect(e.asOfDate, `asOfDate in ${e.canonicalId}`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
      expect(Array.isArray(e.controlReason)).toBe(true);
      expect(typeof e.isItar).toBe("boolean");
      expect(e.canonicalId).toBe(`${e.regime}:${e.code}`);
    }
  });

  it("canonicalIds are unique (no collisions across regimes)", () => {
    const ids = NORMALIZED_CORPUS_UNION.map((e) => e.canonicalId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every regime + is materially larger than the 99-entry parametric seed", () => {
    const regimes = new Set(NORMALIZED_CORPUS_UNION.map((e) => e.regime));
    const expected: CorpusRegime[] = [
      "US_CCL",
      "USML",
      "MTCR_ANNEX",
      "DE_ANLAGE_AL",
      "USML_XV",
      "WASSENAAR",
      "JP_METI",
      "IN_SCOMET",
      "DE_AUSFUHRLISTE",
      "EU_ANNEX_I",
      "NSG",
      "RU_833",
    ];
    for (const r of expected) expect(regimes.has(r)).toBe(true);
    // Union should be well beyond the 99-entry parametric cross-walk —
    // now incl. the full EU Annex I + NSG + Russia-833 corpora.
    expect(NORMALIZED_CORPUS_UNION.length).toBeGreaterThan(300);
  });

  it("wires in the previously-dead EU Annex I / NSG / Russia-833 corpora", () => {
    const byRegime = (r: CorpusRegime) =>
      NORMALIZED_CORPUS_UNION.filter((e) => e.regime === r);
    // EU Annex I is the core EU dual-use list — must be materially present.
    expect(byRegime("EU_ANNEX_I").length).toBeGreaterThan(20);
    expect(byRegime("NSG").length).toBeGreaterThan(0);
    expect(byRegime("RU_833").length).toBeGreaterThan(0);
  });
});

describe("NORMALIZED_CORPUS_UNION — USML / ITAR semantics", () => {
  const usmlXv = (): NormalizedCorpusEntry[] =>
    NORMALIZED_CORPUS_UNION.filter((e) => e.regime === "USML_XV");

  it("all USML and USML_XV entries carry isItar=true", () => {
    for (const e of NORMALIZED_CORPUS_UNION) {
      if (e.regime === "USML" || e.regime === "USML_XV") {
        expect(e.isItar, `isItar for ${e.canonicalId}`).toBe(true);
      }
    }
  });

  it("the XV(e)(17) see-through trigger survives normalization", () => {
    const seeThrough = usmlXv().find((e) => e.code === "XV(e)(17)");
    expect(seeThrough).toBeDefined();
    expect(seeThrough!.isSeeThroughTrigger).toBe(true);
  });

  it("non-USML regimes are not flagged ITAR", () => {
    for (const e of NORMALIZED_CORPUS_UNION) {
      if (e.regime === "WASSENAAR" || e.regime === "JP_METI") {
        expect(e.isItar).toBe(false);
      }
    }
  });
});

describe("NORMALIZED_CORPUS_UNION — honest provenance (no fabricated reasons)", () => {
  it("corpora without a control-reason enum carry an EMPTY controlReason (never fabricated)", () => {
    const noReasonRegimes = new Set([
      "USML_XV",
      "WASSENAAR",
      "JP_METI",
      "IN_SCOMET",
      "DE_AUSFUHRLISTE",
      "NSG",
      "RU_833",
    ]);
    for (const e of NORMALIZED_CORPUS_UNION) {
      if (noReasonRegimes.has(e.regime)) {
        expect(
          e.controlReason,
          `${e.canonicalId} must not fabricate reasons`,
        ).toEqual([]);
      }
    }
  });

  it("DE Ausfuhrliste entries are keyed by position (e.g. the 0010j suborbital line)", () => {
    const de = NORMALIZED_CORPUS_UNION.filter(
      (e) => e.regime === "DE_AUSFUHRLISTE",
    );
    expect(de.length).toBeGreaterThan(0);
    expect(de.some((e) => e.code === "0010j")).toBe(true);
  });
});

import { REGIME_MATURITY } from "./normalized-corpus";

describe("S0: regime maturity (fail-closed input)", () => {
  it("declares a tier for EVERY CorpusRegime incl. the 7 new ones", () => {
    const expected: CorpusRegime[] = [
      "US_CCL",
      "USML",
      "MTCR_ANNEX",
      "DE_ANLAGE_AL",
      "USML_XV",
      "WASSENAAR",
      "JP_METI",
      "IN_SCOMET",
      "DE_AUSFUHRLISTE",
      "EU_ANNEX_I",
      "NSG",
      "RU_833",
      "UK_STRATEGIC",
      "EU_CML",
      "CA_ECL",
      "AU_DSGL",
      "KR_STRATEGIC",
      "CH_GKV",
      "NO_LIST",
    ];
    for (const r of expected) expect([1, 2, 3]).toContain(REGIME_MATURITY[r]);
  });
  it("not-yet-curated regimes are tier 3 (forces REVIEW)", () => {
    for (const r of [
      "UK_STRATEGIC",
      "EU_CML",
      "CA_ECL",
      "AU_DSGL",
      "KR_STRATEGIC",
      "CH_GKV",
      "NO_LIST",
    ] as const) {
      expect(REGIME_MATURITY[r]).toBe(3);
    }
  });
  it("USML_XV stays tier 1, EU_ANNEX_I tier 2", () => {
    expect(REGIME_MATURITY.USML_XV).toBe(1);
    expect(REGIME_MATURITY.EU_ANNEX_I).toBe(2);
  });
  it("MTCR_ANNEX is tier 1 after S1 (full Annex curated)", () => {
    // Data-Sprint S1 curated the complete MTCR Annex (Items 1–20, 2024-03-14)
    // at item/sub-item level; the maturity map records the upgrade 3 → 1.
    expect(REGIME_MATURITY.MTCR_ANNEX).toBe(1);
  });
});
