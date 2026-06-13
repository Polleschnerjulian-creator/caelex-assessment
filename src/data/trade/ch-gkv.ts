/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Data-Sprint S5 — Switzerland: Güterkontrollverordnung (GKV), SR 946.202.1.
 * THE MIRROR-ARCHITECTURE REFERENCE IMPLEMENTATION.
 *
 * ─── THE LAW ──────────────────────────────────────────────────────────────
 * "Verordnung über die Kontrolle zivil und militärisch verwendbarer Güter,
 *  besonderer militärischer Güter sowie strategischer Güter
 *  (Güterkontrollverordnung, GKV)" — SR 946.202.1, vom 3. Juni 2016
 *  (Stand am 15. November 2025). Issued by the Swiss Federal Council, based on
 *  the Güterkontrollgesetz (GKG, SR 946.202). Administered by SECO
 *  (Staatssekretariat für Wirtschaft).
 *
 * ─── ANNEX STRUCTURE (verified verbatim against GKV Art. 1–3, Stand 2025-11-15) ─
 *   • Anhang 1       — Begriffe (definitions).
 *   • Anhang 2 Teil 1 — nukleare Güter (nuclear goods; EKN 0C001/0C002, BFE-licensed).
 *   • Anhang 2 Teil 2 — ZIVIL UND MILITÄRISCH VERWENDBARE GÜTER (DUAL-USE).
 *                       THIS is the space slice's home. Switzerland transposes
 *                       the Wassenaar Arrangement Dual-Use List (and, via the
 *                       bilateral CH–EU arrangement, the EU Annex I structure)
 *                       ONE-TO-ONE. The goods are identified by the SAME
 *                       Exportkontrollnummern (EKN) as the EU/Wassenaar scheme:
 *                       category digit + letter + three digits (e.g. 9A004,
 *                       6A008, 5A001) — confirmed by the GKV body itself, which
 *                       cites EKN 0C001, 0C002, 0D001, 0E001, 1C111, 1C350
 *                       verbatim in Art. 3.
 *   • Anhang 3       — besondere militärische Güter (special military goods).
 *   • Anhang 4       — strategische Güter (strategic goods).
 *   • Anhang 5       — Güter, die nationalen Ausfuhrkontrollen unterliegen
 *                       (goods subject to NATIONAL export controls — no
 *                       multilateral equivalent; the genuine Swiss-only layer).
 *   • Anhang 6/7/8   — country lists / firearms-related (not goods codes).
 *
 * ─── WHY THIS IS A MIRROR FILE, NOT A RE-CURATED CODE LIST ────────────────
 * Anhang 2 Teil 2 is the Wassenaar/EU dual-use list under a Swiss cover. A Swiss
 * EKN "9A004" IS the Wassenaar/EU "9A004" — same code, same scope. Re-typing the
 * control text from the Swiss cover would be both wasteful AND a fabrication risk
 * (re-typing the SAME text from a different source inevitably drifts). So each
 * Swiss space code is declared as a MIRROR of the BEST existing union target —
 * "EU_ANNEX_I:<code>" wherever that code is curated in the EU corpus (it is, for
 * every code here) — and INHERITS the source title/description/controlReason
 * while carrying the SWISS code, the SWISS source URL and the SWISS as-of date.
 * The matcher then resolves a declared Swiss EKN to a `CH_GKV:<code>` chip (the
 * product win) without us duplicating the underlying control text.
 *
 * The honest national DELTA is Anhang 5: genuinely Swiss national controls with
 * NO multilateral equivalent. Those are modelled as `NATIONAL_ONLY` with their
 * own headline text (`mirrorDelta: "NATIONAL_ONLY"`). NONE of the dual-use codes
 * are marked `MODIFIED`, because Switzerland adopts the Wassenaar/EU dual-use
 * list verbatim — there is no Swiss code-level scope modification to claim, and
 * inventing one would be a fabrication.
 *
 * ─── HONEST SCOPE (see CH_GKV_COVERAGE.excluded) ──────────────────────────
 * This is the SPACE SLICE of Anhang 2 Teil 2 (dual-use) plus a representative
 * Anhang 5 national-control headline — NOT the whole GKV. Anhang 2 Teil 1
 * (nuclear), Anhang 3 (special military goods), Anhang 4 (strategic goods),
 * the non-space dual-use categories (0/1/2/4/8), and the country/firearms
 * annexes (6/7/8) are NOT enumerated — declared in `CH_GKV_COVERAGE.excluded`.
 * Curated at code level (depthTier 2), inheriting the EU sibling files' depth
 * for the underlying control text.
 *
 * ─── MATURITY (DELIBERATELY KEPT AT TIER 3) ───────────────────────────────
 * The mirror DATA makes Swiss EKN codes RESOLVABLE in classification (the
 * product win). But `REGIME_MATURITY.CH_GKV` stays 3 — see the REGIME_MATURITY
 * comment block in `normalized-corpus.ts`. Switzerland is NOT an EU/EEA member;
 * a CH-origin dual-use export needs a Swiss (SECO) licence in its own right, and
 * the determination engine has NO Swiss origin-licence logic yet. Gate 4.5
 * (thin-coverage REVIEW) is the only guard for CH-origin controlled exports;
 * lifting to Tier 2 would silently turn a CH→friendly-destination dual-use
 * export into a GO (false-CLEARED), identical to the UK S3 decision. Lift only
 * once CH-origin licence determination exists (engine phase).
 *
 * Source: Güterkontrollverordnung, SR 946.202.1, consolidated edition
 *   Stand am 15. November 2025 (Verordnung vom 3. Juni 2016).
 *   Official: https://www.fedlex.admin.ch/eli/cc/2016/352/de
 *   Annex 2 (dual-use list, EKN) is maintained/published by SECO and mirrors
 *   the Wassenaar/EU dual-use numbering one-to-one.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { MirrorEntry } from "./mirror-entry";

/**
 * Official Fedlex URL for the consolidated GKV (SR 946.202.1, Stand 2025-11-15).
 * The NATIONAL official source carried on every entry (the schema contract).
 */
const GKV_SOURCE_URL = "https://www.fedlex.admin.ch/eli/cc/2016/352/de";

/**
 * As-of date = verification date (the schema contract used across the trade
 * corpus). The GKV SOURCE EDITION is "vom 3. Juni 2016 (Stand am 15. November
 * 2025)" — recorded in the header and `CH_GKV_COVERAGE`. This `asOfDate`
 * records when the Passage entries were checked against that edition.
 */
export const CH_GKV_AS_OF = "2026-06-13";

/** The GKV consolidated edition ("Stand am") date the slice was verified against. */
export const CH_GKV_EDITION_DATE = "2025-11-15";

/** The GKV adoption date (Verordnung vom …). */
export const CH_GKV_ADOPTION_DATE = "2016-06-03";

/**
 * Switzerland GKV space slice as MIRROR entries.
 *
 * Every dual-use code below was VERIFIED present in the EU Annex I corpus (the
 * `EU_ANNEX_I:<code>` target it mirrors) before being written here — the
 * adapter throws on any dangling mirror, and the curation step grepped the EU
 * corpus files for each code. The Swiss EKN is byte-identical to the EU code
 * (Anhang 2 Teil 2 is the verbatim Wassenaar/EU dual-use list), so
 * `nationalCode === <the EU code>` for the NONE entries — the distinction lives
 * in the regime (CH_GKV vs EU_ANNEX_I), the source URL (fedlex vs EUR-Lex) and
 * the as-of date.
 */
export const CH_GKV_ENTRIES: MirrorEntry[] = [
  // ════════════════════════════════════════════════════════════════════════
  // Anhang 2 Teil 2 — Category 9 (Aerospace & Propulsion). The space spine.
  // All NONE — verbatim Swiss adoption of the EU/Wassenaar Cat 9 dual-use list.
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "9A004",
    mirrorsCanonicalId: "EU_ANNEX_I:9A004",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A005",
    mirrorsCanonicalId: "EU_ANNEX_I:9A005",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A006",
    mirrorsCanonicalId: "EU_ANNEX_I:9A006",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A007",
    mirrorsCanonicalId: "EU_ANNEX_I:9A007",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A008",
    mirrorsCanonicalId: "EU_ANNEX_I:9A008",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A009",
    mirrorsCanonicalId: "EU_ANNEX_I:9A009",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A010",
    mirrorsCanonicalId: "EU_ANNEX_I:9A010",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A011",
    mirrorsCanonicalId: "EU_ANNEX_I:9A011",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A012",
    mirrorsCanonicalId: "EU_ANNEX_I:9A012",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A101",
    mirrorsCanonicalId: "EU_ANNEX_I:9A101",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A104",
    mirrorsCanonicalId: "EU_ANNEX_I:9A104",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A105",
    mirrorsCanonicalId: "EU_ANNEX_I:9A105",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A106",
    mirrorsCanonicalId: "EU_ANNEX_I:9A106",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A107",
    mirrorsCanonicalId: "EU_ANNEX_I:9A107",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A108",
    mirrorsCanonicalId: "EU_ANNEX_I:9A108",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A110",
    mirrorsCanonicalId: "EU_ANNEX_I:9A110",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A115",
    mirrorsCanonicalId: "EU_ANNEX_I:9A115",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A116",
    mirrorsCanonicalId: "EU_ANNEX_I:9A116",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A117",
    mirrorsCanonicalId: "EU_ANNEX_I:9A117",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A119",
    mirrorsCanonicalId: "EU_ANNEX_I:9A119",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9A120",
    mirrorsCanonicalId: "EU_ANNEX_I:9A120",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9D001",
    mirrorsCanonicalId: "EU_ANNEX_I:9D001",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9D002",
    mirrorsCanonicalId: "EU_ANNEX_I:9D002",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9D004",
    mirrorsCanonicalId: "EU_ANNEX_I:9D004",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9E001",
    mirrorsCanonicalId: "EU_ANNEX_I:9E001",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "9E002",
    mirrorsCanonicalId: "EU_ANNEX_I:9E002",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Anhang 2 Teil 2 — Category 5 part 1 (Telecommunications) — sat comms.
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "5A001",
    mirrorsCanonicalId: "EU_ANNEX_I:5A001",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Anhang 2 Teil 2 — Category 6 (Sensors & Lasers) — EO/IR payloads, star
  // trackers, laser ranging, MTCR-shadowed detectors/radar (6A107/6A108).
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "6A002",
    mirrorsCanonicalId: "EU_ANNEX_I:6A002",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "6A003",
    mirrorsCanonicalId: "EU_ANNEX_I:6A003",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "6A004",
    mirrorsCanonicalId: "EU_ANNEX_I:6A004",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "6A008",
    mirrorsCanonicalId: "EU_ANNEX_I:6A008",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "6A107",
    mirrorsCanonicalId: "EU_ANNEX_I:6A107",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "6A108",
    mirrorsCanonicalId: "EU_ANNEX_I:6A108",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Anhang 2 Teil 2 — Category 7 (Navigation & Avionics) — IMUs, star
  // sensors, GNSS, MTCR-shadowed flight-control (7A101/7A103/7A104/7A106).
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "7A001",
    mirrorsCanonicalId: "EU_ANNEX_I:7A001",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "7A002",
    mirrorsCanonicalId: "EU_ANNEX_I:7A002",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "7A003",
    mirrorsCanonicalId: "EU_ANNEX_I:7A003",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "7A101",
    mirrorsCanonicalId: "EU_ANNEX_I:7A101",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "7A103",
    mirrorsCanonicalId: "EU_ANNEX_I:7A103",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "7A104",
    mirrorsCanonicalId: "EU_ANNEX_I:7A104",
    mirrorDelta: "NONE",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Anhang 5 — NATIONAL export controls (no multilateral equivalent). The
  // genuine Swiss-only layer (GKV Art. 1 lit. c + Art. 3, "nationalen
  // Ausfuhrkontrollen unterliegende Güter nach Anhang 5"). NATIONAL_ONLY:
  // own headline text, no mirror linkage. Modelled at headline depth only —
  // the GKV body establishes Anhang 5 as the national-control layer but the
  // per-item Anhang 5 list is SECO-maintained and not enumerated here.
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "ANHANG-5",
    mirrorDelta: "NATIONAL_ONLY",
    title:
      "Güter unter nationaler schweizerischer Ausfuhrkontrolle (GKV Anhang 5)",
    description:
      "Güter, die nach Artikel 1 Absatz 1 Buchstabe c und Artikel 3 GKV den " +
      "nationalen schweizerischen Ausfuhrkontrollen unterliegen und in Anhang 5 " +
      "der Güterkontrollverordnung gelistet sind — der rein nationale " +
      "Kontroll-Layer ohne multilaterales (Wassenaar/EU/MTCR/NSG) Pendant. Die " +
      "Ausfuhr bedarf einer Bewilligung des SECO. Headline-Eintrag: die " +
      "einzelnen Anhang-5-Positionen werden vom SECO geführt und sind hier nicht " +
      "auf Code-Ebene aufgeführt.",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
  {
    nationalCode: "ANHANG-4",
    mirrorDelta: "NATIONAL_ONLY",
    title: "Strategische Güter (GKV Anhang 4)",
    description:
      "Strategische Güter nach Artikel 3 GKV, die in Anhang 4 der " +
      "Güterkontrollverordnung gelistet sind — eine eigenständige schweizerische " +
      "Güterkategorie neben der Dual-Use-Liste (Anhang 2 Teil 2) und den " +
      "besonderen militärischen Gütern (Anhang 3). Die Ausfuhr bedarf einer " +
      "Bewilligung des SECO. Headline-Eintrag auf Anhang-Ebene; die einzelnen " +
      "Positionen werden hier nicht auf Code-Ebene aufgeführt.",
    sourceUrl: GKV_SOURCE_URL,
    asOfDate: CH_GKV_AS_OF,
  },
];

// ════════════════════════════════════════════════════════════════════════
// Coverage
// ════════════════════════════════════════════════════════════════════════

export interface ChGkvCoverage {
  regime: "CH_GKV";
  scope: string;
  excluded: string[];
  asOfDate: string;
  editionDate: string;
  adoptionDate: string;
  srNumber: string;
  caelexCoverageCount: number;
}

export const CH_GKV_COVERAGE: ChGkvCoverage = {
  regime: "CH_GKV",
  scope:
    "Space slice of the Swiss Güterkontrollverordnung (GKV, SR 946.202.1, " +
    "Stand am 15. November 2025). Covers the space-relevant DUAL-USE codes of " +
    "Anhang 2 Teil 2 — Category 9 (aerospace & propulsion: launch vehicles, " +
    "spacecraft, propulsion, MTCR-shadowed 9A1xx), Category 5 part 1 (5A001 " +
    "telecom), Category 6 (6A002/6A003/6A004/6A008 sensors+lasers, 6A107/6A108 " +
    "MTCR detectors/radar) and Category 7 (7A001/7A002/7A003 inertial+IMU, " +
    "7A101/7A103/7A104 MTCR flight-control) — as MIRROR entries that adopt the " +
    "Wassenaar/EU dual-use numbering one-to-one (Swiss EKN === EU code) plus the " +
    "Anhang 4 (strategic) + Anhang 5 (national-control) headlines as the genuine " +
    "Swiss-only layer (NATIONAL_ONLY).",
  excluded: [
    "Anhang 2 Teil 1 — nuclear goods (EKN 0C001/0C002 etc., BFE-licensed) — not in the space dual-use slice",
    "Anhang 3 — besondere militärische Güter (special military goods) — the military leg, not enumerated here (the EU Common Military List sibling carries the harmonised military source)",
    "Per-item Anhang 4 (strategic) and Anhang 5 (national) positions — represented at headline depth only; the line-item lists are SECO-maintained and not enumerated on code level",
    "Non-space dual-use categories of Anhang 2 Teil 2 (0 nuclear-materials, 1 materials/chemicals, 2 materials processing, 4 computers, 8 marine) — outside the space slice",
    "Anhang 6/7/8 — country lists and firearms-related annexes (not goods codes)",
    "Standard radiation-hardened microelectronics 3A001/3A002 — space-relevant but their EU/Wassenaar/MTCR union target is not curated in the corpus base; NOT mirrored here rather than pointed at a fabricated canonicalId (the underlying EU Annex I Cat 3 dual-use depth would be a prerequisite)",
    "Full parametric sub-clause depth of each EKN — inherited from the mirrored EU Annex I sibling entries (depthTier 2 code level here); the Swiss list carries the SAME thresholds as the Wassenaar/EU source it transposes",
  ],
  asOfDate: CH_GKV_AS_OF,
  editionDate: CH_GKV_EDITION_DATE,
  adoptionDate: CH_GKV_ADOPTION_DATE,
  srNumber: "946.202.1",
  caelexCoverageCount: 0, // set just below from the real length (single source of truth)
};
// Single source of truth: derive the coverage count from the actual array so
// the count can never drift from the data (the test asserts they match).
CH_GKV_COVERAGE.caelexCoverageCount = CH_GKV_ENTRIES.length;

/** Short citation for UI / provenance surfaces. */
export function getChGkvSourceCitation(): string {
  return `Güterkontrollverordnung (GKV), SR ${CH_GKV_COVERAGE.srNumber}, Stand am ${CH_GKV_EDITION_DATE} (Verordnung vom ${CH_GKV_ADOPTION_DATE}). ${GKV_SOURCE_URL}`;
}
