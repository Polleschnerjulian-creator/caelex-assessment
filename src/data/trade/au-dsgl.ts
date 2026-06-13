/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Data-Sprint S5 — Australia: Defence and Strategic Goods List (DSGL).
 * A MIRROR file (same architecture as the CH GKV reference — see ch-gkv.ts).
 *
 * ─── THE INSTRUMENT ───────────────────────────────────────────────────────
 * "Defence and Strategic Goods List 2024" — a legislative instrument made
 *  under section 112 of the Customs Act 1901, registered on the Federal
 *  Register of Legislation as **F2024L01024** and IN FORCE from **16 August
 *  2024**. It is the single consolidated control list administered by Defence
 *  Export Controls (DEC) within the Australian Department of Defence under the
 *  Customs (Prohibited Exports) Regulations 1958 and the Defence Trade
 *  Controls Act 2012.
 *
 * ─── LIST STRUCTURE (verified against the F2024L01024 table of contents) ───
 *   • Part 1 — MUNITIONS LIST. The military leg (the Wassenaar Munitions List
 *              transposed under an Australian cover; ML1–ML22-style positions).
 *              The genuine national/military layer — NOT a dual-use mirror.
 *   • Part 2 — DUAL USE LIST. THIS is the space slice's home. Australia is a
 *              founding Wassenaar Arrangement participant and transposes the
 *              Wassenaar Dual-Use List ONE-TO-ONE: the goods are identified by
 *              the SAME category numbering as the Wassenaar/EU scheme — category
 *              digit + letter + three digits (e.g. 9A004, 5A001, 6A008, 7A001).
 *              The F2024L01024 ToC itself prints the Wassenaar category headers
 *              verbatim: "Category 5—Telecommunications and 'information
 *              security'", "Category 6—Sensors and lasers", "Category 9—
 *              Aerospace and propulsion".
 *
 * ─── WHY THIS IS A MIRROR FILE, NOT A RE-CURATED CODE LIST ────────────────
 * Part 2 IS the Wassenaar/EU dual-use list under an Australian cover. An AU
 * DSGL "9A004" IS the Wassenaar/EU "9A004" — same code, same scope. Re-typing
 * the control text from the Australian cover would be both wasteful AND a
 * fabrication risk (re-typing the SAME text from a different source inevitably
 * drifts). So each AU space code is declared as a MIRROR of the BEST existing
 * union target — "EU_ANNEX_I:<code>" wherever that code is curated in the EU
 * corpus (it is, for every code here) — and INHERITS the source title/
 * description/controlReason while carrying the AU code, the AU source URL and
 * the AU as-of date. The matcher then resolves a declared AU DSGL code to an
 * `AU_DSGL:<code>` chip (the product win) without us duplicating the underlying
 * control text. Every EU_ANNEX_I target below was grep-verified present in the
 * EU corpus base (eu-annex-i*.ts) before being written — the adapter throws on
 * any dangling mirror.
 *
 * The honest national DELTA is Part 1: the Australian Munitions List, a genuine
 * military-controls layer with NO multilateral dual-use equivalent. It is
 * modelled as a single `NATIONAL_ONLY` headline (mirrorDelta "NATIONAL_ONLY",
 * own title+desc, no mirror linkage) at headline depth only — the per-item ML
 * positions are DEC-maintained and not enumerated on code level here. NONE of
 * the dual-use codes are marked `MODIFIED`, because Australia adopts the
 * Wassenaar dual-use list verbatim — there is no AU code-level scope
 * modification to claim, and inventing one would be a fabrication.
 *
 * ─── HONEST SCOPE (see AU_DSGL_COVERAGE.excluded) ─────────────────────────
 * This is the SPACE SLICE of Part 2 (dual-use) plus the Part 1 (munitions)
 * headline — NOT the whole DSGL. The non-space dual-use categories
 * (0 nuclear, 1 materials/chemicals, 2 materials processing, 3 electronics,
 * 4 computers, 8 marine) and the per-item Part 1 munitions positions are NOT
 * enumerated — declared in `AU_DSGL_COVERAGE.excluded`. Curated at code level
 * (depthTier 2), inheriting the EU sibling files' depth for the underlying
 * control text.
 *
 * ─── MATURITY (DELIBERATELY KEPT AT TIER 3) ───────────────────────────────
 * The mirror DATA makes AU DSGL codes RESOLVABLE in classification (the product
 * win). But the regime maturity stays 3 (see the REGIME_MATURITY comment block
 * in normalized-corpus.ts): Australia is NOT an EU/EEA member; an AU-origin
 * dual-use export needs an Australian (DEC) permit in its own right, and the
 * determination engine has NO Australian origin-permit logic yet. Gate 4.5
 * (thin-coverage REVIEW) is the only guard for AU-origin controlled exports;
 * lifting to Tier 2 would silently turn an AU→friendly-destination dual-use
 * export into a GO (false-CLEARED), identical to the CH/UK decision. Lift only
 * once AU-origin permit determination exists (engine phase).
 *
 * Source: Defence and Strategic Goods List 2024, F2024L01024 (in force
 *   16 August 2024), Federal Register of Legislation.
 *   Official: https://www.legislation.gov.au/F2024L01024/latest/text
 *   Part 2 (dual-use list) mirrors the Wassenaar dual-use numbering one-to-one;
 *   administered by Defence Export Controls (DEC), Department of Defence.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { MirrorEntry } from "./mirror-entry";

/**
 * Official Federal Register of Legislation URL for the consolidated DSGL 2024
 * (F2024L01024, in force 16 August 2024). The NATIONAL official source carried
 * on every entry (the schema contract). Domain: legislation.gov.au.
 */
const DSGL_SOURCE_URL =
  "https://www.legislation.gov.au/F2024L01024/latest/text";

/**
 * As-of date = verification date (the schema contract used across the trade
 * corpus). The DSGL SOURCE EDITION is "Defence and Strategic Goods List 2024,
 * in force 16 August 2024" — recorded in the header and `AU_DSGL_COVERAGE`.
 * This `asOfDate` records when the Passage entries were checked against that
 * edition.
 */
export const AU_DSGL_AS_OF = "2026-06-13";

/** The DSGL source edition: the date the DSGL 2024 came into force. */
export const AU_DSGL_EDITION_DATE = "2024-08-16";

/** The Federal Register of Legislation registration ID of the DSGL 2024. */
export const AU_DSGL_REGISTRATION_ID = "F2024L01024";

/**
 * Australia DSGL space slice as MIRROR entries.
 *
 * Every dual-use code below was VERIFIED present in the EU Annex I corpus (the
 * `EU_ANNEX_I:<code>` target it mirrors) before being written here — the
 * adapter throws on any dangling mirror, and the curation step grepped the EU
 * corpus files for each code. The AU DSGL code is byte-identical to the EU code
 * (Part 2 is the verbatim Wassenaar/EU dual-use list), so `nationalCode ===
 * <the EU code>` for the NONE entries — the distinction lives in the regime
 * (AU_DSGL vs EU_ANNEX_I), the source URL (legislation.gov.au vs EUR-Lex) and
 * the as-of date.
 */
export const AU_DSGL_ENTRIES: MirrorEntry[] = [
  // ════════════════════════════════════════════════════════════════════════
  // Part 2 — Category 9 (Aerospace & Propulsion). The space spine.
  // All NONE — verbatim Australian adoption of the Wassenaar/EU Cat 9 dual-use
  // list (space launch vehicles, spacecraft, propulsion, MTCR-shadowed 9A1xx).
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "9A004",
    mirrorsCanonicalId: "EU_ANNEX_I:9A004",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A005",
    mirrorsCanonicalId: "EU_ANNEX_I:9A005",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A006",
    mirrorsCanonicalId: "EU_ANNEX_I:9A006",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A007",
    mirrorsCanonicalId: "EU_ANNEX_I:9A007",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A008",
    mirrorsCanonicalId: "EU_ANNEX_I:9A008",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A009",
    mirrorsCanonicalId: "EU_ANNEX_I:9A009",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A010",
    mirrorsCanonicalId: "EU_ANNEX_I:9A010",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A011",
    mirrorsCanonicalId: "EU_ANNEX_I:9A011",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A012",
    mirrorsCanonicalId: "EU_ANNEX_I:9A012",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A101",
    mirrorsCanonicalId: "EU_ANNEX_I:9A101",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A104",
    mirrorsCanonicalId: "EU_ANNEX_I:9A104",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A105",
    mirrorsCanonicalId: "EU_ANNEX_I:9A105",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A106",
    mirrorsCanonicalId: "EU_ANNEX_I:9A106",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A107",
    mirrorsCanonicalId: "EU_ANNEX_I:9A107",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A108",
    mirrorsCanonicalId: "EU_ANNEX_I:9A108",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A110",
    mirrorsCanonicalId: "EU_ANNEX_I:9A110",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A115",
    mirrorsCanonicalId: "EU_ANNEX_I:9A115",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A116",
    mirrorsCanonicalId: "EU_ANNEX_I:9A116",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A117",
    mirrorsCanonicalId: "EU_ANNEX_I:9A117",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A119",
    mirrorsCanonicalId: "EU_ANNEX_I:9A119",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9A120",
    mirrorsCanonicalId: "EU_ANNEX_I:9A120",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9D001",
    mirrorsCanonicalId: "EU_ANNEX_I:9D001",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9D002",
    mirrorsCanonicalId: "EU_ANNEX_I:9D002",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9D004",
    mirrorsCanonicalId: "EU_ANNEX_I:9D004",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9E001",
    mirrorsCanonicalId: "EU_ANNEX_I:9E001",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "9E002",
    mirrorsCanonicalId: "EU_ANNEX_I:9E002",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Part 2 — Category 5 part 1 (Telecommunications) — sat comms.
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "5A001",
    mirrorsCanonicalId: "EU_ANNEX_I:5A001",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "5A002",
    mirrorsCanonicalId: "EU_ANNEX_I:5A002",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Part 2 — Category 6 (Sensors & Lasers) — EO/IR payloads, cameras, radar,
  // MTCR-shadowed detectors/radar (6A107/6A108).
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "6A002",
    mirrorsCanonicalId: "EU_ANNEX_I:6A002",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "6A003",
    mirrorsCanonicalId: "EU_ANNEX_I:6A003",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "6A004",
    mirrorsCanonicalId: "EU_ANNEX_I:6A004",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "6A008",
    mirrorsCanonicalId: "EU_ANNEX_I:6A008",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "6A107",
    mirrorsCanonicalId: "EU_ANNEX_I:6A107",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "6A108",
    mirrorsCanonicalId: "EU_ANNEX_I:6A108",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Part 2 — Category 7 (Navigation & Avionics) — accelerometers, IMU/INS,
  // star trackers, GNSS, MTCR-shadowed flight-control (7A101/7A103/7A104).
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "7A001",
    mirrorsCanonicalId: "EU_ANNEX_I:7A001",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "7A002",
    mirrorsCanonicalId: "EU_ANNEX_I:7A002",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "7A003",
    mirrorsCanonicalId: "EU_ANNEX_I:7A003",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "7A004",
    mirrorsCanonicalId: "EU_ANNEX_I:7A004",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "7A005",
    mirrorsCanonicalId: "EU_ANNEX_I:7A005",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "7A101",
    mirrorsCanonicalId: "EU_ANNEX_I:7A101",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "7A103",
    mirrorsCanonicalId: "EU_ANNEX_I:7A103",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
  {
    nationalCode: "7A104",
    mirrorsCanonicalId: "EU_ANNEX_I:7A104",
    mirrorDelta: "NONE",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Part 1 — MUNITIONS LIST (no multilateral dual-use equivalent). The genuine
  // Australian military-controls layer (DSGL Part 1, the Wassenaar Munitions
  // List under an Australian cover). NATIONAL_ONLY: own headline text, no
  // mirror linkage. Modelled at headline depth only — the per-item ML positions
  // are DEC-maintained and not enumerated here on code level (the EU Common
  // Military List sibling carries the harmonised military source).
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "PART-1-MUNITIONS",
    mirrorDelta: "NATIONAL_ONLY",
    title: "DSGL Part 1 — Munitions List (military goods)",
    description:
      "Part 1 of the Defence and Strategic Goods List 2024 (F2024L01024) — the " +
      "Munitions List, covering goods, software and technology designed or " +
      "modified for military use (the Wassenaar Munitions List transposed under " +
      "the Australian cover). This is the genuine military-controls layer, " +
      "distinct from the Part 2 dual-use list, and has no multilateral dual-use " +
      "equivalent to mirror. Export, supply, publication or brokering is " +
      "regulated by Defence Export Controls (DEC) under the Customs (Prohibited " +
      "Exports) Regulations 1958 and the Defence Trade Controls Act 2012. " +
      "Headline entry: the individual Part 1 munitions positions are " +
      "DEC-maintained and are not enumerated here on code level.",
    sourceUrl: DSGL_SOURCE_URL,
    asOfDate: AU_DSGL_AS_OF,
  },
];

// ════════════════════════════════════════════════════════════════════════
// Coverage
// ════════════════════════════════════════════════════════════════════════

export interface AuDsglCoverage {
  regime: "AU_DSGL";
  scope: string;
  excluded: string[];
  asOfDate: string;
  editionDate: string;
  registrationId: string;
  caelexCoverageCount: number;
}

export const AU_DSGL_COVERAGE: AuDsglCoverage = {
  regime: "AU_DSGL",
  scope:
    "Space slice of the Australian Defence and Strategic Goods List 2024 " +
    "(F2024L01024, in force 16 August 2024). Covers the space-relevant DUAL-USE " +
    "codes of Part 2 — Category 9 (aerospace & propulsion: launch vehicles, " +
    "spacecraft, propulsion, MTCR-shadowed 9A1xx), Category 5 part 1 (5A001 " +
    "telecom, 5A002 information security), Category 6 (6A002/6A003/6A004/6A008 " +
    "sensors+cameras+radar, 6A107/6A108 MTCR detectors/radar) and Category 7 " +
    "(7A001/7A002/7A003/7A004/7A005 inertial+IMU+star-tracker+GNSS, 7A101/7A103/" +
    "7A104 MTCR flight-control) — as MIRROR entries that adopt the Wassenaar/EU " +
    "dual-use numbering one-to-one (AU DSGL code === EU code) plus the Part 1 " +
    "(Munitions List) headline as the genuine Australian military-only layer " +
    "(NATIONAL_ONLY).",
  excluded: [
    "Part 1 — Munitions List per-item positions — represented at headline depth only; the line-item ML list is DEC-maintained and not enumerated on code level (the EU Common Military List sibling carries the harmonised military source)",
    "Non-space dual-use categories of Part 2 (0 nuclear, 1 materials/chemicals, 2 materials processing, 3 electronics, 4 computers, 8 marine) — outside the space slice",
    "Standard radiation-hardened microelectronics 3A001/3A002 — space-relevant but their EU/Wassenaar/MTCR union target is not curated in the corpus base; NOT mirrored here rather than pointed at a fabricated canonicalId (the underlying EU Annex I Cat 3 dual-use depth would be a prerequisite)",
    "Full parametric sub-clause depth of each DSGL Part 2 code — inherited from the mirrored EU Annex I sibling entries (depthTier 2 code level here); the Australian list carries the SAME thresholds as the Wassenaar/EU source it transposes",
    "The Defence Trade Controls (Excluded DSGL goods and DSGL technology) Determination 2024 (F2024L01100) — the supply/publication carve-out instrument, not a goods-code list",
  ],
  asOfDate: AU_DSGL_AS_OF,
  editionDate: AU_DSGL_EDITION_DATE,
  registrationId: AU_DSGL_REGISTRATION_ID,
  caelexCoverageCount: 0, // set just below from the real length (single source of truth)
};
// Single source of truth: derive the coverage count from the actual array so
// the count can never drift from the data (the test asserts they match).
AU_DSGL_COVERAGE.caelexCoverageCount = AU_DSGL_ENTRIES.length;

/** Case-insensitive exact-code lookup — mirrors findChGkvEntry / findUkStrategicEntry. */
export function findAuDsglEntry(nationalCode: string): MirrorEntry | undefined {
  const needle = nationalCode.trim().toUpperCase();
  return AU_DSGL_ENTRIES.find((e) => e.nationalCode.toUpperCase() === needle);
}

/** Short citation for UI / provenance surfaces. */
export function getAuDsglSourceCitation(): string {
  return `Defence and Strategic Goods List 2024, ${AU_DSGL_REGISTRATION_ID} (in force ${AU_DSGL_EDITION_DATE}), Federal Register of Legislation. ${DSGL_SOURCE_URL}`;
}
