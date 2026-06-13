/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Data-Sprint S5 — South Korea: MOTIE Strategic Items (space slice).
 * A MIRROR file in the family established by the CH_GKV reference
 * (`ch-gkv.ts`). LEGALLY SENSITIVE — see the honesty caveat below.
 *
 * ─── THE LAW ──────────────────────────────────────────────────────────────
 * Republic of Korea controls strategic-item trade under the **Foreign Trade
 * Act** (대외무역법, Art. 19) and its implementing **"Public Notice on Trade of
 * Strategic Items"** (전략물자 수출입고시 — also rendered "Public Notice on the
 * Export and Import of Strategic Goods and Technologies"), issued by **MOTIE**
 * (Ministry of Trade, Industry and Energy). The online national system is
 * **Yestrade** (yestrade.go.kr); classification is supported by **KOSTI** (the
 * Korea Strategic Trade Institute, now 무역안보관리원). Korea is a participating
 * state in the **Wassenaar Arrangement** (1996), **NSG** (1995), **Australia
 * Group** (1996) and **MTCR** (2001).
 *
 * ─── ANNEX STRUCTURE (verified against the SIPRI export-control brief) ──────
 *   • Annex 2  — STRATEGIC ITEMS (the control lists). Categories **1–9** are
 *                the DUAL-USE items administered by MOTIE; Category **10** is
 *                the solely-nuclear NSG-trigger leg (NSSC/KINAC-administered).
 *                Annex 2 is built on **the European Union list of dual-use
 *                items, which is itself based on the Wassenaar Arrangement
 *                control-list system** — so the Korean dual-use codes use the
 *                SAME category-digit + letter + three-digit numbering as the
 *                EU/Wassenaar scheme (e.g. 9A004, 5A001, 6A008). SIPRI: "the
 *                third [letter] and fifth (numeric) character represent the
 *                category of the items … [the list maps] to the European Union
 *                (EU) list of dual-use items (which is based on the Wassenaar
 *                Arrangement control list system)".
 *   • Annex 3  — MUNITIONS items (the Wassenaar munitions list leg) —
 *                military, not the space dual-use slice.
 *   • Annex 4+ — catch-all / WMD end-use ("situational licence") and the
 *                national, unilateral controls. A July-2024 amendment to the
 *                Enforcement Decree of the Foreign Trade Act gave Korea a legal
 *                basis to designate strategic items UNILATERALLY, independent
 *                of the multilateral regimes — the genuine Korea-only layer.
 *
 * ─── WHY THIS IS A MIRROR FILE, NOT A RE-CURATED CODE LIST ────────────────
 * Annex 2 Categories 1–9 IS the EU/Wassenaar dual-use list under a Korean
 * cover. A Korean Annex-2 "9A004" IS the Wassenaar/EU "9A004" — same code, same
 * scope (SIPRI confirms Annex 2 is structured on the EU dual-use list). So each
 * Korean space code is declared as a MIRROR of the BEST existing union target —
 * "EU_ANNEX_I:<code>" wherever that code is curated in the EU corpus — and
 * INHERITS the source title/description/controlReason while carrying the KOREAN
 * source URL and the Korean as-of date. We do NOT re-type the control text from
 * a different cover (a fabrication-and-drift risk, exactly as for Switzerland).
 *
 * ─── HONESTY CAVEAT (Spec §4.5) — READ THIS ───────────────────────────────
 * Official ENGLISH coverage of the Korean list is LIMITED: the authoritative
 * per-code text on yestrade.go.kr / kosti.or.kr is Korean-language and behind a
 * JS-gated portal, and the consolidated English control list is not freely
 * published code-by-code. We therefore curate ONLY where BOTH of the following
 * hold, and EXCLUDE (in KR_STRATEGIC_COVERAGE.excluded) otherwise:
 *   (a) the structural fact that Annex 2 adopts the EU/Wassenaar dual-use
 *       numbering verbatim is established by an OFFICIAL/authoritative source
 *       (the SIPRI national-system brief + MOTIE/KOSTI English overviews); AND
 *   (b) the multilateral target code is ALREADY CURATED in the Caelex base
 *       corpus (an "EU_ANNEX_I:<code>" that resolves), grep-verified before
 *       being written here — the adapter throws on any dangling mirror.
 * Where a space-relevant code's multilateral target is NOT in the base (e.g.
 * the rad-hard microelectronics 3A001/3A002, which are known-absent), we
 * EXCLUDE it honestly rather than invent a Korean code or point at a fabricated
 * canonicalId. We do NOT copy EU text and claim it is the verified Korean text;
 * the NONE entries assert ONLY the verbatim-adoption STRUCTURE that the source
 * establishes, inheriting the EU sibling's text for the underlying control.
 *
 * ─── MATURITY (DELIBERATELY KEPT THIN) ────────────────────────────────────
 * As with CH_GKV, the mirror DATA makes Korean Annex-2 codes RESOLVABLE in
 * classification (the product win), but the regime stays a thin-coverage,
 * REVIEW-gated tier: Korea is not an EU/EEA member, a KR-origin dual-use export
 * needs a Korean (MOTIE) licence in its own right, and the determination engine
 * has no KR-origin licence logic yet. The integration step (normalized-corpus)
 * sets REGIME_MATURITY; this data file does not lift it.
 *
 * Source: Public Notice on Trade of Strategic Items, MOTIE, under the Foreign
 *   Trade Act (Art. 19). National portal: https://www.yestrade.go.kr
 *   Authoritative structural reference: J. Lee, "South Korea's Export Control
 *   System", SIPRI (the Annex-2 = EU/Wassenaar dual-use numbering finding).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { MirrorEntry } from "./mirror-entry";

/**
 * National official source URL — the MOTIE/Yestrade strategic-items portal.
 * The NATIONAL official source carried on every entry (the schema contract).
 * yestrade.go.kr is the MOTIE-operated national export-controls system; the
 * Public Notice itself is published via MOTIE under the Foreign Trade Act.
 */
const KR_SOURCE_URL = "https://www.yestrade.go.kr";

/**
 * As-of date = verification date (the schema contract across the trade corpus).
 * The Korean SOURCE is the live "Public Notice on Trade of Strategic Items"
 * (amended periodically by MOTIE — most recently for added advanced-industry
 * items in early 2025); this `asOfDate` records when the Passage entries were
 * checked against the structural source.
 */
export const KR_STRATEGIC_AS_OF = "2026-06-13";

/** The legal anchor: Foreign Trade Act, Article 19 (대외무역법 제19조). */
export const KR_STRATEGIC_LEGAL_BASIS =
  "Foreign Trade Act (대외무역법) Article 19; Public Notice on Trade of Strategic Items (전략물자 수출입고시), MOTIE";

/**
 * South Korea MOTIE Strategic-Items space slice as MIRROR entries.
 *
 * Every dual-use code below was VERIFIED present in the EU Annex I corpus (the
 * `EU_ANNEX_I:<code>` target it mirrors) before being written here — the
 * adapter throws on any dangling mirror, and curation grepped the EU corpus
 * files for each code. Korea's Annex-2 code is byte-identical to the EU code
 * (Annex 2 Categories 1–9 adopt the EU/Wassenaar dual-use numbering), so
 * `nationalCode === <the EU code>` for the NONE entries — the distinction lives
 * in the regime (KR_STRATEGIC vs EU_ANNEX_I), the source URL (yestrade vs
 * EUR-Lex) and the as-of date.
 */
export const KR_STRATEGIC_ENTRIES: MirrorEntry[] = [
  // ════════════════════════════════════════════════════════════════════════
  // Annex 2 — Category 9 (Aerospace & Propulsion). The space spine.
  // All NONE — Korean adoption of the EU/Wassenaar Cat 9 dual-use numbering.
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "9A004",
    mirrorsCanonicalId: "EU_ANNEX_I:9A004",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A005",
    mirrorsCanonicalId: "EU_ANNEX_I:9A005",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A006",
    mirrorsCanonicalId: "EU_ANNEX_I:9A006",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A007",
    mirrorsCanonicalId: "EU_ANNEX_I:9A007",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A008",
    mirrorsCanonicalId: "EU_ANNEX_I:9A008",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A009",
    mirrorsCanonicalId: "EU_ANNEX_I:9A009",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A010",
    mirrorsCanonicalId: "EU_ANNEX_I:9A010",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A011",
    mirrorsCanonicalId: "EU_ANNEX_I:9A011",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A012",
    mirrorsCanonicalId: "EU_ANNEX_I:9A012",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A101",
    mirrorsCanonicalId: "EU_ANNEX_I:9A101",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A104",
    mirrorsCanonicalId: "EU_ANNEX_I:9A104",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A105",
    mirrorsCanonicalId: "EU_ANNEX_I:9A105",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A106",
    mirrorsCanonicalId: "EU_ANNEX_I:9A106",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A107",
    mirrorsCanonicalId: "EU_ANNEX_I:9A107",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A108",
    mirrorsCanonicalId: "EU_ANNEX_I:9A108",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A110",
    mirrorsCanonicalId: "EU_ANNEX_I:9A110",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A115",
    mirrorsCanonicalId: "EU_ANNEX_I:9A115",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A116",
    mirrorsCanonicalId: "EU_ANNEX_I:9A116",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A117",
    mirrorsCanonicalId: "EU_ANNEX_I:9A117",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A119",
    mirrorsCanonicalId: "EU_ANNEX_I:9A119",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9A120",
    mirrorsCanonicalId: "EU_ANNEX_I:9A120",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9D001",
    mirrorsCanonicalId: "EU_ANNEX_I:9D001",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9D002",
    mirrorsCanonicalId: "EU_ANNEX_I:9D002",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9D004",
    mirrorsCanonicalId: "EU_ANNEX_I:9D004",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9E001",
    mirrorsCanonicalId: "EU_ANNEX_I:9E001",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "9E002",
    mirrorsCanonicalId: "EU_ANNEX_I:9E002",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Annex 2 — Category 5 part 1 (Telecommunications) — sat comms / TT&C.
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "5A001",
    mirrorsCanonicalId: "EU_ANNEX_I:5A001",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Annex 2 — Category 6 (Sensors & Lasers) — EO/IR payloads, optics, radar,
  // MTCR-shadowed detectors/radar (6A107/6A108).
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "6A002",
    mirrorsCanonicalId: "EU_ANNEX_I:6A002",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "6A003",
    mirrorsCanonicalId: "EU_ANNEX_I:6A003",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "6A004",
    mirrorsCanonicalId: "EU_ANNEX_I:6A004",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "6A008",
    mirrorsCanonicalId: "EU_ANNEX_I:6A008",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "6A107",
    mirrorsCanonicalId: "EU_ANNEX_I:6A107",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "6A108",
    mirrorsCanonicalId: "EU_ANNEX_I:6A108",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Annex 2 — Category 7 (Navigation & Avionics) — accelerometers, gyros,
  // IMU/INS, MTCR-shadowed guidance (7A101/7A103/7A104).
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "7A001",
    mirrorsCanonicalId: "EU_ANNEX_I:7A001",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "7A002",
    mirrorsCanonicalId: "EU_ANNEX_I:7A002",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "7A003",
    mirrorsCanonicalId: "EU_ANNEX_I:7A003",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "7A101",
    mirrorsCanonicalId: "EU_ANNEX_I:7A101",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "7A103",
    mirrorsCanonicalId: "EU_ANNEX_I:7A103",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "7A104",
    mirrorsCanonicalId: "EU_ANNEX_I:7A104",
    mirrorDelta: "NONE",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // NATIONAL layer — genuine Korea-only controls with NO multilateral
  // equivalent (NATIONAL_ONLY: own headline text, no mirror linkage). These
  // are the honest deltas the source establishes; per-item lists are MOTIE-
  // maintained (Korean-language) and are NOT enumerated here on code level.
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "ANNEX-2-CAT10",
    mirrorDelta: "NATIONAL_ONLY",
    title:
      "Solely-nuclear NSG-trigger items (Public Notice Annex 2, Category 10)",
    description:
      "Items with a solely nuclear use, listed in Category 10 of Annex 2 of the " +
      "Public Notice on Trade of Strategic Items. Unlike the dual-use Categories " +
      "1–9 (MOTIE-administered, EU/Wassenaar-numbered), Category 10 is the NSG " +
      "trigger-list leg administered by the Nuclear Safety and Security Commission " +
      "(NSSC) with classification by KINAC — a distinct Korean licensing pathway. " +
      "Headline entry: the per-item Category 10 list is administered separately " +
      "and is not enumerated here on code level.",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "ANNEX-3-MUNITIONS",
    mirrorDelta: "NATIONAL_ONLY",
    title: "Munitions items (Public Notice Annex 3 — Wassenaar munitions leg)",
    description:
      "Military / munitions items listed in Annex 3 of the Public Notice on Trade " +
      "of Strategic Items — the Korean transposition of the Wassenaar Arrangement " +
      "Munitions List (the military leg, distinct from the Annex 2 dual-use list). " +
      "Export licensing involves DAPA (Defense Acquisition Program Administration) " +
      "alongside MOTIE. Headline entry on the Annex level; the individual munitions " +
      "positions are not enumerated here on code level (the harmonised military " +
      "source is carried by the EU Common Military List sibling).",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
  {
    nationalCode: "NATIONAL-UNILATERAL-2024",
    mirrorDelta: "NATIONAL_ONLY",
    title:
      "Korea-designated unilateral strategic items (Foreign Trade Act, 2024 basis)",
    description:
      "Items designated as strategic by the Republic of Korea UNILATERALLY, " +
      "independent of the multilateral regimes — enabled by the July-2024 " +
      "amendment to the Enforcement Decree of the Foreign Trade Act, which gave " +
      "MOTIE a domestic legal basis to add advanced-industry items and " +
      "technologies (e.g. advanced semiconductors, dual-use software) to the " +
      "Public Notice outside the Wassenaar/MTCR/NSG/AG lists. The genuine " +
      "Korea-only control layer with NO multilateral equivalent; headline entry " +
      "(the specific designated items are MOTIE-maintained and change frequently).",
    sourceUrl: KR_SOURCE_URL,
    asOfDate: KR_STRATEGIC_AS_OF,
  },
];

// ════════════════════════════════════════════════════════════════════════
// Coverage
// ════════════════════════════════════════════════════════════════════════

export interface KrStrategicCoverage {
  regime: "KR_STRATEGIC";
  scope: string;
  excluded: string[];
  asOfDate: string;
  legalBasis: string;
  administeringBody: string;
  caelexCoverageCount: number;
}

export const KR_STRATEGIC_COVERAGE: KrStrategicCoverage = {
  regime: "KR_STRATEGIC",
  scope:
    "Space slice of the South Korean MOTIE Strategic-Items control list " +
    "(Public Notice on Trade of Strategic Items, under the Foreign Trade Act " +
    "Art. 19). Covers the space-relevant DUAL-USE codes of Annex 2 — Category 9 " +
    "(aerospace & propulsion: launch vehicles, spacecraft, propulsion, " +
    "MTCR-shadowed 9A1xx, plus 9D/9E software+technology), Category 5 part 1 " +
    "(5A001 telecom), Category 6 (6A002/6A003/6A004/6A008 sensors+optics+radar, " +
    "6A107/6A108 MTCR detectors/radar) and Category 7 (7A001/7A002/7A003 " +
    "inertial+gyro+IMU, 7A101/7A103/7A104 MTCR flight-control) — as MIRROR " +
    "entries that adopt the EU/Wassenaar dual-use numbering one-to-one (Korean " +
    "Annex-2 code === EU code, per the SIPRI structural finding) plus the " +
    "Category 10 (solely-nuclear), Annex 3 (munitions) and the 2024 unilateral " +
    "national-control headlines as the genuine Korea-only layer (NATIONAL_ONLY). " +
    "HONESTY CAVEAT (Spec §4.5): official English per-code text is JS-gated and " +
    "not freely published code-by-code; NONE entries assert ONLY the verbatim " +
    "EU/Wassenaar-adoption STRUCTURE the source establishes and inherit the EU " +
    "sibling's text — codes whose multilateral target is not curated in the base " +
    "are EXCLUDED below rather than fabricated.",
  excluded: [
    "Per-code Korean-language Annex 2 text — the authoritative item descriptions on yestrade.go.kr / kosti.or.kr are Korean and behind a JS-gated portal; we do NOT re-state EU text as the 'verified Korean text', so NONE entries inherit the EU sibling's control text rather than re-typing it",
    "Standard radiation-hardened microelectronics 3A001/3A002 — space-relevant and present in the Korean Annex 2 Category 3, but their EU/Wassenaar union target is NOT curated in the corpus base; EXCLUDED rather than pointed at a fabricated canonicalId (the underlying EU Annex I Cat 3 dual-use depth would be a prerequisite)",
    "Annex 2 Category 10 (solely-nuclear NSG-trigger items, NSSC/KINAC-administered) — represented at headline depth only; the per-item list is administered on a separate Korean pathway and not enumerated on code level",
    "Annex 3 munitions list (the Wassenaar Munitions List leg, DAPA/MOTIE) — the military leg; headline only (the EU Common Military List sibling carries the harmonised military source)",
    "The 2024 unilateral/national designations (advanced semiconductors, dual-use software, critical minerals) — Korea-only controls that change frequently; headline only, not enumerated on code level",
    "Non-space dual-use categories of Annex 2 (0/1/2/4/8 — nuclear materials, materials/chemicals, materials processing, computers, marine) — outside the space slice",
    "Catch-all / 'situational licence' (WMD end-use) clauses of the Public Notice — a licensing-pathway mechanism, not a distinct goods-code scheme",
    "Full parametric sub-clause depth of each code — inherited from the mirrored EU Annex I sibling entries (depthTier code level here); the Korean list carries the SAME thresholds as the EU/Wassenaar source Annex 2 transposes",
  ],
  asOfDate: KR_STRATEGIC_AS_OF,
  legalBasis: KR_STRATEGIC_LEGAL_BASIS,
  administeringBody:
    "MOTIE (Ministry of Trade, Industry and Energy) — dual-use Categories 1–9; supported by KOSTI; Yestrade national system",
  caelexCoverageCount: 0, // set just below from the real length (single source of truth)
};
// Single source of truth: derive the coverage count from the actual array so
// the count can never drift from the data (the test asserts they match).
KR_STRATEGIC_COVERAGE.caelexCoverageCount = KR_STRATEGIC_ENTRIES.length;

/** Case-insensitive exact-code lookup — mirrors findChGkvEntry / findUkStrategicEntry. */
export function findKrStrategicEntry(
  nationalCode: string,
): MirrorEntry | undefined {
  const needle = nationalCode.trim().toUpperCase();
  return KR_STRATEGIC_ENTRIES.find(
    (e) => e.nationalCode.toUpperCase() === needle,
  );
}

/** Short citation for UI / provenance surfaces. */
export function getKrStrategicSourceCitation(): string {
  return `Public Notice on Trade of Strategic Items (전략물자 수출입고시), MOTIE, under the Foreign Trade Act (대외무역법) Art. 19. National system: ${KR_SOURCE_URL}`;
}
