/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Data-Sprint S5 — Norway: export control "Liste II" (dual-use), the space slice.
 * A MIRROR file (see `mirror-entry.ts`), following the `ch-gkv.ts` reference.
 *
 * ─── THE LAW ──────────────────────────────────────────────────────────────
 * "Forskrift om eksport av forsvarsmateriell, flerbruksvarer, teknologi og
 *  tjenester" — FOR-2013-06-19-718, issued 19 June 2013 by Utenriks-
 *  departementet (the Norwegian Ministry of Foreign Affairs, MFA), under the
 *  Eksportkontrolloven (LOV-1987-12-18-93). Licensing decisions and compliance
 *  are administered by the Directorate for Export Control and Sanctions
 *  (Direktoratet for eksportkontroll og sanksjoner) under the MFA.
 *
 * ─── LIST STRUCTURE (verified against the regulation + its vedlegg PDFs) ────
 *   • Liste I  (Vedlegg I)   — forsvarsrelaterte varer (MILITARY / defence-
 *                              related goods). The military leg — NOT the
 *                              dual-use space slice. Modelled at headline depth
 *                              only (NATIONAL_ONLY); the harmonised military
 *                              source is the EU Common Military List sibling.
 *   • Liste II (Vedlegg II)  — FLERBRUKSVARER (DUAL-USE). THIS is the space
 *                              slice's home. Norway aligns Liste II with the EU
 *                              dual-use list: it is the content of EU Reg.
 *                              (EU) 2021/821 Annex I (which itself transposes
 *                              Wassenaar / MTCR / NSG / Australia Group / CWC),
 *                              identified by the SAME goods numbers — category
 *                              digit + letter + three digits (e.g. 9A004, 6A008,
 *                              5A001). A Norwegian Liste-II "9A004" IS the
 *                              EU/Wassenaar "9A004".
 *   • Liste III (Vedlegg III) — NASJONAL LISTE (Norwegian NATIONAL controls
 *                              with no multilateral / EU equivalent — the
 *                              genuine national-only layer). Modelled at
 *                              headline depth only (NATIONAL_ONLY).
 *
 * ─── WHY THIS IS A MIRROR FILE, NOT A RE-CURATED CODE LIST ────────────────
 * Liste II is the EU Reg. 2021/821 Annex I dual-use list under a Norwegian
 * cover. A Norwegian "9A004" IS the EU "9A004" — same code, same scope. Re-
 * typing the control text from the Norwegian cover would be both wasteful AND a
 * fabrication risk (re-typing the SAME text from a different source inevitably
 * drifts). So each Norwegian space code is declared as a MIRROR of the BEST
 * existing union target — "EU_ANNEX_I:<code>" wherever that code is curated in
 * the EU corpus (it is, for every code here) — and INHERITS the source
 * title/description/controlReason while carrying the NORWEGIAN code, the
 * NORWEGIAN source URL and the NORWEGIAN as-of date. The matcher then resolves
 * a declared Liste-II code to a `NO_LIST:<code>` chip (the product win) without
 * us duplicating the underlying control text.
 *
 * The honest national DELTA is Liste III: genuinely Norwegian national controls
 * with NO multilateral equivalent. Plus the Liste I military leg. Both are
 * modelled as `NATIONAL_ONLY` with their own headline text. NONE of the dual-
 * use codes are marked `MODIFIED`, because Norway adopts the EU dual-use list
 * verbatim — there is no Norwegian code-level scope modification to claim, and
 * inventing one would be a fabrication.
 *
 * ─── HONEST SCOPE (see NO_LIST_COVERAGE.excluded) ─────────────────────────
 * This is the SPACE SLICE of Liste II (dual-use) plus the Liste I (military)
 * and Liste III (national) headlines — NOT the whole regulation. The non-space
 * dual-use categories (0/1/2/3/4/8), the per-item Liste I / Liste III lists,
 * and standard rad-hard microelectronics (3A001/3A002 — known-absent from the
 * corpus base) are NOT enumerated; declared in `NO_LIST_COVERAGE.excluded`.
 * Curated at code level (depthTier 2), inheriting the EU sibling files' depth
 * for the underlying control text.
 *
 * ─── MATURITY (DELIBERATELY KEPT AT TIER 3) ───────────────────────────────
 * The mirror DATA makes Norwegian Liste-II codes RESOLVABLE in classification
 * (the product win). But Norway is an EEA — NOT an EU — member; a NO-origin
 * dual-use export needs a Norwegian (MFA / Directorate) licence in its own
 * right, and the determination engine has NO Norwegian origin-licence logic
 * yet. The regime stays at thin-coverage maturity for the same reason the Swiss
 * GKV slice does (see the REGIME_MATURITY block in `normalized-corpus.ts`):
 * lifting it would silently turn a NO→friendly-destination dual-use export into
 * a false-CLEARED. Lift only once NO-origin licence determination exists.
 *
 * ─── SOURCE PROVENANCE ─────────────────────────────────────────────────────
 * Forskrift FOR-2013-06-19-718 (Lovdata, consolidated). Liste II (Vedlegg II,
 * dual-use) and Liste III (national) were last updated by the MFA on
 * 2026-01-20, aligned with the dual-use changes the EU made during 2025 — i.e.
 * the current EU Reg. (EU) 2021/821 Annex I edition. Official sources:
 *   • Forskrift:  https://lovdata.no/dokument/SF/forskrift/2013-06-19-718
 *   • Liste II:   https://lovdata.no/static/SF/sf-20130619-0718-02-10.pdf
 *   • MFA notice: regjeringen.no/no/aktuelt/eksportkontrollforskriftens-varelister-er-oppdatert/id3146679/
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { MirrorEntry } from "./mirror-entry";

/**
 * Official Lovdata URL for the consolidated export control regulation
 * (FOR-2013-06-19-718). The NATIONAL official source carried on every entry
 * (the schema contract). Lovdata is the official Norwegian legislation database;
 * the per-list goods PDFs (Vedlegg I/II/III) hang off this document.
 */
const NO_SOURCE_URL = "https://lovdata.no/dokument/SF/forskrift/2013-06-19-718";

/**
 * As-of date = verification date (the schema contract used across the trade
 * corpus). The Norwegian SOURCE EDITION is the Liste II / Liste III update of
 * 2026-01-20 (recorded in the header and `NO_LIST_COVERAGE.editionDate`). This
 * `asOfDate` records when the Passage entries were checked against that edition.
 */
export const NO_LIST_AS_OF = "2026-06-13";

/** The Liste II / Liste III edition date (MFA update aligned to EU 2025 dual-use changes). */
export const NO_LIST_EDITION_DATE = "2026-01-20";

/** The forskrift adoption date (FOR-2013-06-19-718). */
export const NO_LIST_ADOPTION_DATE = "2013-06-19";

/**
 * Norway export-control space slice as MIRROR entries.
 *
 * Every dual-use code below was VERIFIED present in the EU Annex I corpus (the
 * `EU_ANNEX_I:<code>` target it mirrors) before being written here — the
 * adapter throws on any dangling mirror, and the curation step grepped the EU
 * corpus files for each code. The Norwegian Liste-II code is byte-identical to
 * the EU code (Liste II IS EU Reg. 2021/821 Annex I), so
 * `nationalCode === <the EU code>` for the NONE entries — the distinction lives
 * in the regime (NO_LIST vs EU_ANNEX_I), the source URL (lovdata vs EUR-Lex)
 * and the as-of date.
 */
export const NO_LIST_ENTRIES: MirrorEntry[] = [
  // ════════════════════════════════════════════════════════════════════════
  // Liste II — Category 9 (Aerospace & Propulsion). The space spine.
  // All NONE — verbatim Norwegian adoption of the EU/Wassenaar Cat 9 dual-use
  // list. MTCR-shadowed 9A1xx propulsion/launch items included.
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "9A004",
    mirrorsCanonicalId: "EU_ANNEX_I:9A004",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A005",
    mirrorsCanonicalId: "EU_ANNEX_I:9A005",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A006",
    mirrorsCanonicalId: "EU_ANNEX_I:9A006",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A007",
    mirrorsCanonicalId: "EU_ANNEX_I:9A007",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A008",
    mirrorsCanonicalId: "EU_ANNEX_I:9A008",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A009",
    mirrorsCanonicalId: "EU_ANNEX_I:9A009",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A010",
    mirrorsCanonicalId: "EU_ANNEX_I:9A010",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A011",
    mirrorsCanonicalId: "EU_ANNEX_I:9A011",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A012",
    mirrorsCanonicalId: "EU_ANNEX_I:9A012",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A101",
    mirrorsCanonicalId: "EU_ANNEX_I:9A101",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A104",
    mirrorsCanonicalId: "EU_ANNEX_I:9A104",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A105",
    mirrorsCanonicalId: "EU_ANNEX_I:9A105",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A106",
    mirrorsCanonicalId: "EU_ANNEX_I:9A106",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A107",
    mirrorsCanonicalId: "EU_ANNEX_I:9A107",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A108",
    mirrorsCanonicalId: "EU_ANNEX_I:9A108",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A110",
    mirrorsCanonicalId: "EU_ANNEX_I:9A110",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A115",
    mirrorsCanonicalId: "EU_ANNEX_I:9A115",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A116",
    mirrorsCanonicalId: "EU_ANNEX_I:9A116",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A117",
    mirrorsCanonicalId: "EU_ANNEX_I:9A117",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A119",
    mirrorsCanonicalId: "EU_ANNEX_I:9A119",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9A120",
    mirrorsCanonicalId: "EU_ANNEX_I:9A120",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9D001",
    mirrorsCanonicalId: "EU_ANNEX_I:9D001",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9D002",
    mirrorsCanonicalId: "EU_ANNEX_I:9D002",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9D004",
    mirrorsCanonicalId: "EU_ANNEX_I:9D004",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9E001",
    mirrorsCanonicalId: "EU_ANNEX_I:9E001",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "9E002",
    mirrorsCanonicalId: "EU_ANNEX_I:9E002",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Liste II — Category 5 part 1 (Telecommunications) — sat comms / TT&C.
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "5A001",
    mirrorsCanonicalId: "EU_ANNEX_I:5A001",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Liste II — Category 6 (Sensors & Lasers) — EO/IR payloads, cameras, radar
  // (6A008 SAR), MTCR-shadowed gravimeters/radar (6A107/6A108).
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "6A002",
    mirrorsCanonicalId: "EU_ANNEX_I:6A002",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "6A003",
    mirrorsCanonicalId: "EU_ANNEX_I:6A003",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "6A008",
    mirrorsCanonicalId: "EU_ANNEX_I:6A008",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "6A107",
    mirrorsCanonicalId: "EU_ANNEX_I:6A107",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "6A108",
    mirrorsCanonicalId: "EU_ANNEX_I:6A108",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Liste II — Category 7 (Navigation & Avionics) — accelerometers, IMU/INS,
  // GNSS, MTCR-shadowed guidance (7A101/7A103/7A104).
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "7A001",
    mirrorsCanonicalId: "EU_ANNEX_I:7A001",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "7A003",
    mirrorsCanonicalId: "EU_ANNEX_I:7A003",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "7A005",
    mirrorsCanonicalId: "EU_ANNEX_I:7A005",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "7A101",
    mirrorsCanonicalId: "EU_ANNEX_I:7A101",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "7A103",
    mirrorsCanonicalId: "EU_ANNEX_I:7A103",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "7A104",
    mirrorsCanonicalId: "EU_ANNEX_I:7A104",
    mirrorDelta: "NONE",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Liste I + Liste III — the NATIONAL layers (no multilateral equivalent in
  // the dual-use space slice). NATIONAL_ONLY: own headline text, no mirror
  // linkage. Modelled at headline depth only — the per-item Liste I (military)
  // and Liste III (national) positions are MFA-maintained and not enumerated
  // here on code level.
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "LISTE-III",
    mirrorDelta: "NATIONAL_ONLY",
    title:
      "Varer under norsk nasjonal eksportkontroll (Liste III / Vedlegg III)",
    description:
      "Varer som er underlagt norsk nasjonal eksportkontroll og oppført i Liste " +
      "III (Vedlegg III) til forskrift FOR-2013-06-19-718 — det rent nasjonale " +
      "kontroll-laget uten multilateralt (Wassenaar/EU/MTCR/NSG) motstykke. " +
      "Eksport krever lisens fra Utenriksdepartementet (Direktoratet for " +
      "eksportkontroll og sanksjoner). Headline-oppføring: de enkelte Liste-III-" +
      "posisjonene føres av Utenriksdepartementet og er ikke listet på kodenivå " +
      "her.",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
  {
    nationalCode: "LISTE-I",
    mirrorDelta: "NATIONAL_ONLY",
    title: "Forsvarsrelaterte varer (Liste I / Vedlegg I)",
    description:
      "Forsvarsmateriell og forsvarsrelaterte varer oppført i Liste I (Vedlegg I) " +
      "til forskrift FOR-2013-06-19-718 — den militære delen, atskilt fra " +
      "flerbruksvarelisten (Liste II). Eksport krever lisens fra " +
      "Utenriksdepartementet. Headline-oppføring på liste-nivå; de enkelte " +
      "posisjonene er ikke listet på kodenivå her (det harmoniserte militære " +
      "kildegrunnlaget bæres av EU Common Military List-søsterfilen).",
    sourceUrl: NO_SOURCE_URL,
    asOfDate: NO_LIST_AS_OF,
  },
];

// ════════════════════════════════════════════════════════════════════════
// Coverage
// ════════════════════════════════════════════════════════════════════════

export interface NoListCoverage {
  regime: "NO_LIST";
  scope: string;
  excluded: string[];
  asOfDate: string;
  editionDate: string;
  adoptionDate: string;
  forskriftId: string;
  caelexCoverageCount: number;
}

export const NO_LIST_COVERAGE: NoListCoverage = {
  regime: "NO_LIST",
  scope:
    "Space slice of the Norwegian export control regulation (forskrift " +
    "FOR-2013-06-19-718, Liste II / Vedlegg II dual-use list, edition updated " +
    "2026-01-20 aligned to the EU's 2025 dual-use changes). Covers the space-" +
    "relevant DUAL-USE codes of Liste II — Category 9 (aerospace & propulsion: " +
    "launch vehicles, spacecraft, propulsion, MTCR-shadowed 9A1xx), Category 5 " +
    "part 1 (5A001 telecom), Category 6 (6A002/6A003/6A008 sensors+SAR, " +
    "6A107/6A108 MTCR gravimeters/radar) and Category 7 (7A001/7A003/7A005 " +
    "inertial+GNSS, 7A101/7A103/7A104 MTCR guidance) — as MIRROR entries that " +
    "adopt the EU Reg. (EU) 2021/821 Annex I numbering one-to-one (Norwegian " +
    "Liste-II code === EU code) plus the Liste I (military) + Liste III " +
    "(national) headlines as the genuine national layer (NATIONAL_ONLY).",
  excluded: [
    "Liste I (Vedlegg I) — forsvarsrelaterte varer (military/defence goods) — represented at headline depth only; the harmonised military source is the EU Common Military List sibling, not enumerated here on code level",
    "Per-item Liste III (Vedlegg III) national-control positions — represented at headline depth only; the line-item list is MFA-maintained and not enumerated on code level",
    "Non-space dual-use categories of Liste II (0 nuclear-materials, 1 materials/chemicals, 2 materials processing, 3 electronics, 4 computers, 8 marine) — outside the space slice",
    "Standard radiation-hardened microelectronics 3A001/3A002 — space-relevant but their EU/Wassenaar union target is not curated in the corpus base (Cat 3 carries 3A091/3A092 etc., not 3A001/3A002); NOT mirrored here rather than pointed at a fabricated canonicalId (the underlying EU Annex I Cat 3 dual-use depth would be a prerequisite)",
    "Full parametric sub-clause depth of each Liste-II code — inherited from the mirrored EU Annex I sibling entries (depthTier 2 code level here); the Norwegian list carries the SAME thresholds as the EU Reg. 2021/821 Annex I source it adopts",
  ],
  asOfDate: NO_LIST_AS_OF,
  editionDate: NO_LIST_EDITION_DATE,
  adoptionDate: NO_LIST_ADOPTION_DATE,
  forskriftId: "FOR-2013-06-19-718",
  caelexCoverageCount: 0, // set just below from the real length (single source of truth)
};
// Single source of truth: derive the coverage count from the actual array so
// the count can never drift from the data (the test asserts they match).
NO_LIST_COVERAGE.caelexCoverageCount = NO_LIST_ENTRIES.length;

/** Case-insensitive exact-code lookup — mirrors findChGkvEntry / findUkStrategicEntry. */
export function findNoListEntry(nationalCode: string): MirrorEntry | undefined {
  const needle = nationalCode.trim().toUpperCase();
  return NO_LIST_ENTRIES.find((e) => e.nationalCode.toUpperCase() === needle);
}

/** Short citation for UI / provenance surfaces. */
export function getNoListSourceCitation(): string {
  return `Forskrift om eksport av forsvarsmateriell, flerbruksvarer, teknologi og tjenester (${NO_LIST_COVERAGE.forskriftId}), Liste II (flerbruksvarer), oppdatert ${NO_LIST_EDITION_DATE} (forskrift av ${NO_LIST_ADOPTION_DATE}). ${NO_SOURCE_URL}`;
}
