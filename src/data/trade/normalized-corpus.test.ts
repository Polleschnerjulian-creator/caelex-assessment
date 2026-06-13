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
  it("thin (tier-3) origin regimes — 4 after M-CH (CH_GKV left)", () => {
    // Data-Sprint S4 lifted EU_CML 3 → 2 (set 7 → 6). M-UK (2026-06-13,
    // Engine-Origin-Determination) lifted UK_STRATEGIC 3 → 2 (6 → 5). M-CH
    // (2026-06-13) lifted CH_GKV 3 → 2 — the CH-origin OGB/Einzelbewilligung
    // licence determination is now modelled (`origin-determination/ch.ts`), so
    // CH leaves the thin set (5 → 4). CH_GKV's lift is asserted separately below.
    for (const r of ["CA_ECL", "AU_DSGL", "KR_STRATEGIC", "NO_LIST"] as const) {
      expect(REGIME_MATURITY[r]).toBe(3);
    }
  });
  it("UK_STRATEGIC is tier 2 after M-UK (UK OGEL/ECJU origin-licence modelled)", () => {
    // M-UK (Engine-Origin-Determination, 2026-06-13) modelled the UK-origin
    // licence determination — `origin-determination/uk.ts`: the OGEL (Export of
    // Dual-Use items to EU Member States) GENERAL/GO supersede + the SIEL
    // fallback at the ECJU. The lift is safe (no false-CLEARED): Annex-IIg-
    // excluded items (9A004/9A106.c, Annex IV) stay SIEL/REVIEW, non-OGEL
    // destinations (US/JP/IN/CN) stay SIEL/REVIEW, and Gate 1.6 (RU/BY) still
    // BLOCKS upstream. The golden pin `sat-bus|GB|DE = REVIEW` now comes from
    // the UK module's SIEL verdict (not Gate 4.5). See the REGIME_MATURITY
    // comment block in normalized-corpus.ts.
    expect(REGIME_MATURITY.UK_STRATEGIC).toBe(2);
  });
  it("CH_GKV is tier 2 after M-CH (Swiss OGB/SECO origin-licence modelled)", () => {
    // M-CH (Engine-Origin-Determination, 2026-06-13) modelled the CH-origin
    // licence determination — `origin-determination/ch.ts`: the OGB (ordentliche
    // Generalausfuhrbewilligung, GKV Art. 12, to the Anhang-7 partner states)
    // GENERAL/GO supersede + the Einzelbewilligung fallback at SECO. The lift is
    // safe (no false-CLEARED): sensitive MTCR/Annex-IV-equivalent items
    // (9A004/9A106.c) fail-close to REVIEW (the GKV carries no written exclusion
    // schedule), non-partner destinations (IN/CN — NOT on Anhang 7) stay REVIEW,
    // and Gate 1.6 (RU/BY, EU-aligned) still BLOCKS upstream. The golden pin
    // `sat-bus|CH|DE = REVIEW` now comes from the CH module's Einzelbewilligung
    // verdict (not Gate 4.5). See the REGIME_MATURITY comment block in
    // normalized-corpus.ts.
    expect(REGIME_MATURITY.CH_GKV).toBe(2);
  });
  it("USML_XV stays tier 1, EU_ANNEX_I tier 2", () => {
    expect(REGIME_MATURITY.USML_XV).toBe(1);
    expect(REGIME_MATURITY.EU_ANNEX_I).toBe(2);
  });
  it("EU_CML is tier 2 after S4 (space slice curated, lift spike-proven safe)", () => {
    // Data-Sprint S4 curated the EU Common Military List space slice (OJ
    // C/2026/1640) and lifted EU_CML 3 → 2. The lift is safe because Gate 4.5's
    // EU_CML military leg fires only for USML/ITAR-signalled items, which are
    // independently guarded by Gate 3.5 (DDTC) + AVA itarBlock — golden spike
    // distribution byte-identical (74/396/274) before and after.
    expect(REGIME_MATURITY.EU_CML).toBe(2);
  });
  it("USML is tier 1 after S2 (Cat IV + Cat XV both at paragraph depth)", () => {
    // Data-Sprint S2 curated Category IV (launch vehicles / rocket propulsion)
    // at paragraph depth in `usml-iv.ts`; together with the Cat XV files
    // (already Tier 1) the space-relevant USML spectrum is now paragraph-deep.
    // No circle-A origin's dualUsePrimary is USML, so this does not affect
    // isThinOrigin / the golden-set thin-set.
    expect(REGIME_MATURITY.USML).toBe(1);
  });
  it("MTCR_ANNEX is tier 1 after S1 (full Annex curated)", () => {
    // Data-Sprint S1 curated the complete MTCR Annex (Items 1–20, 2024-03-14)
    // at item/sub-item level; the maturity map records the upgrade 3 → 1.
    expect(REGIME_MATURITY.MTCR_ANNEX).toBe(1);
  });
  it("WASSENAAR is tier 1 after S5 (Cat-6/7/9 base coverage deepened)", () => {
    // Data-Sprint S5 deepened the Wassenaar Cat-6/7/9 base coverage (42 new
    // entries: 32 new Cat-9 + 7 new Cat-7 + 3 new Cat-6) and lifts WASSENAAR
    // 2 → 1. The lift has ZERO verdict impact: Wassenaar is MULTILATERAL and is
    // NEVER any circle-A origin's dualUsePrimary (origins point at their national
    // transposition), so isThinOrigin (dualUsePrimary-only) cannot flip — the
    // same null-impact lift as MTCR_ANNEX in S1.
    expect(REGIME_MATURITY.WASSENAAR).toBe(1);
  });
});

describe("S5: mirror architecture invariants", () => {
  it("no dangling mirror — every mirrorsCanonicalId resolves within the union", () => {
    // This test guards UNION-WIDE post-build consistency (all mirrors resolve in the flat union).
    // The adapter's throw (in adaptMirrorEntries) guards BASE-ONLY resolution at import time —
    // so a hypothetical mirror→mirror chain would throw at module load rather than fail here gracefully.
    const ids = new Set(NORMALIZED_CORPUS_UNION.map((e) => e.canonicalId));
    for (const e of NORMALIZED_CORPUS_UNION) {
      if (e.mirrorsCanonicalId) {
        expect(
          ids.has(e.mirrorsCanonicalId),
          `${e.canonicalId} mirrors "${e.mirrorsCanonicalId}", which must EXIST in the union (no dangling)`,
        ).toBe(true);
      }
    }
  });

  it("every MODIFIED / NATIONAL_ONLY entry carries its own non-empty description", () => {
    for (const e of NORMALIZED_CORPUS_UNION) {
      if (e.mirrorDelta === "MODIFIED" || e.mirrorDelta === "NATIONAL_ONLY") {
        expect(
          e.description.trim().length,
          `${e.canonicalId} (${e.mirrorDelta}) must have its own description`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("mirror entries (mirrorDelta set) carry depthTier 2 — CH_GKV + the S5 fan-out have landed", () => {
    const mirrors = NORMALIZED_CORPUS_UNION.filter(
      (e) => e.mirrorDelta !== undefined,
    );
    // The reference country (Switzerland CH_GKV) plus the S5 fan-out (Norway,
    // Canada, Australia, Korea) are all wired, so there MUST be mirror entries
    // for each, all code-level (depthTier 2).
    expect(mirrors.length).toBeGreaterThan(0);
    for (const regime of [
      "CH_GKV",
      "NO_LIST",
      "CA_ECL",
      "AU_DSGL",
      "KR_STRATEGIC",
    ] as const) {
      expect(
        mirrors.some((e) => e.regime === regime),
        `expected mirror entries for ${regime}`,
      ).toBe(true);
    }
    for (const e of mirrors) {
      expect(e.depthTier, `${e.canonicalId} mirror depthTier`).toBe(2);
    }
  });

  it("matchByCode probe — 9A004 now ALSO resolves to a CH_GKV mirror (product win)", () => {
    const nineA004 = NORMALIZED_CORPUS_UNION.filter((e) => e.code === "9A004");
    const regimes = new Set(nineA004.map((e) => e.regime));
    expect(regimes.has("CH_GKV")).toBe(true);
    // The NONE mirror inherited the EU source's title (no re-typed control text).
    const ch = nineA004.find((e) => e.regime === "CH_GKV")!;
    expect(ch.mirrorsCanonicalId).toBe("EU_ANNEX_I:9A004");
    expect(ch.mirrorDelta).toBe("NONE");
    expect(ch.title.length).toBeGreaterThan(0);
  });
});
