/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Data-Sprint S5 — Canada: Export Control List (ECL), SOR/89-202.
 * A MIRROR file, built on the `ch-gkv.ts` reference pattern.
 *
 * ─── THE LAW ──────────────────────────────────────────────────────────────
 * "Export Control List" — SOR/89-202, made under the Export and Import
 *  Permits Act (R.S.C. 1985, c. E-19). The List itself is terse: it does NOT
 *  reprint the goods descriptions. Instead, each Group of the List
 *  incorporates BY REFERENCE the corresponding Group of "A Guide to Canada's
 *  Export Control List" (published by Global Affairs Canada / the Department
 *  of Foreign Affairs, Trade and Development). The Guide carries the actual
 *  item-by-item descriptions. Administered by Global Affairs Canada (the
 *  Export Controls Division).
 *
 * ─── GROUP STRUCTURE (verified against SOR/89-202 + the Guide) ─────────────
 *   • Group 1 — DUAL-USE LIST. Reproduces the Wassenaar Arrangement Dual-Use
 *               List verbatim under a Canadian cover. THIS is the space
 *               slice's home. Items carry a "1-" Group prefix followed by the
 *               Wassenaar category structure with dots: Canadian item
 *               "1-9.A.4." IS Wassenaar/EU "9A004", "1-5.A.1." IS "5A001",
 *               "1-6.A.8." IS "6A008". The Canadian item number DIFFERS from
 *               the bare multilateral code (the dots + "1-" prefix) but the
 *               SCOPE is identical — this is the nationalCode != multilateral-
 *               Code case: mirrorDelta NONE, nationalCode = the Canadian
 *               number, mirrorsCanonicalId = EU_ANNEX_I:<bare code>.
 *   • Group 2 — MUNITIONS LIST (the military leg — not enumerated here).
 *   • Group 3 — Nuclear Non-Proliferation List.
 *   • Group 4 — Nuclear-Related Dual-Use List.
 *   • Group 5 — Miscellaneous Goods and Technology (Canadian national items).
 *   • Group 6 — MISSILE TECHNOLOGY CONTROL REGIME (MTCR) List. The missile-
 *               relevant items (the multilateral 9A1xx / 7A1xx / 6A1xx
 *               families) live HERE in the Canadian scheme under a SEPARATE
 *               "6-" numbering that mirrors the MTCR Annex item numbers — NOT
 *               under Group 1 with a "1-9.A.104." style number (that number
 *               does not exist in the Canadian list). Modelled at headline
 *               depth as NATIONAL_ONLY rather than fabricating per-item "1-"
 *               codes for them.
 *   • Group 7 — Chemical and Biological Weapons Non-Proliferation List.
 *   • Group 9 — Arms Trade Treaty.
 *   (Group 8 is repealed.)
 *
 *   Provenance anchor: SOR/89-202 itself, at item 5504(2)(a)(ii), cites
 *   "propulsion and space-related equipment referred to in items 1-9.A.4. to
 *    1-9.A.11. of the Guide, the associated software referred to in item
 *    1-9.D. of the Guide, and the associated technology referred to in item
 *    1-9.E. of the Guide" — a direct, statutory confirmation that the
 *   Canadian Group-1 numbers are "1-9.A.4." (= 9A004) … "1-9.A.11." (= 9A011),
 *   "1-9.D." (= 9Dxxx), "1-9.E." (= 9Exxx).
 *
 * ─── WHY THIS IS A MIRROR FILE, NOT A RE-CURATED CODE LIST ────────────────
 * Group 1 is the Wassenaar dual-use list under a Canadian cover. A Canadian
 * "1-9.A.4." IS the Wassenaar/EU "9A004" — same scope, only the printed item
 * number differs (the "1-" prefix + dots). Re-typing the control text from the
 * Guide would be both wasteful AND a fabrication risk. So each Canadian space
 * code is declared as a MIRROR of the BEST existing union target —
 * "EU_ANNEX_I:<bare code>" wherever that code is curated in the EU corpus (it
 * is, for every code here) — and INHERITS the source title/description/
 * controlReason while carrying the CANADIAN item number, the Canadian source
 * URL and the Canadian as-of date. The matcher then resolves a declared
 * Canadian item to a `CA_ECL:<item>` chip without us duplicating the control
 * text.
 *
 * The honest national DELTAS:
 *   • Group 6 (MTCR) — the missile-relevant 9A1xx/7A1xx/6A1xx families live in
 *     a separate Canadian Group with "6-" MTCR-Annex numbering; modelled as a
 *     NATIONAL_ONLY headline (own text), not fabricated "1-9.A.104." codes.
 *   • Group 5 (Miscellaneous) — genuinely Canadian national items with no
 *     clean multilateral equivalent; NATIONAL_ONLY headline.
 * NONE of the Group-1 dual-use codes are marked MODIFIED, because Canada
 * adopts the Wassenaar dual-use list verbatim — there is no Canadian
 * code-level scope modification to claim, and inventing one would be a
 * fabrication.
 *
 * ─── HONEST SCOPE (see CA_ECL_COVERAGE.excluded) ──────────────────────────
 * This is the SPACE SLICE of Group 1 (dual-use) — Category 9 (aerospace &
 * propulsion), plus 5A001 (telecom), Category 6 (sensors & lasers) and the
 * Category 7 inertial/nav codes that the EU sibling corpus carries — plus the
 * Group 6 (MTCR) + Group 5 (Miscellaneous) national-control headlines. NOT the
 * whole ECL. Group 2 (munitions), Groups 3/4/7/9, the non-space Group 1
 * categories (0/1/2/3/4/8), and the per-item Group 5/6 lists are NOT
 * enumerated — declared in CA_ECL_COVERAGE.excluded. Curated at code level
 * (depthTier 2), inheriting the EU sibling files' depth for the control text.
 *
 * Source: Export Control List, SOR/89-202, consolidated text on the federal
 *   Justice Laws Website (laws-lois.justice.gc.ca), read together with
 *   "A Guide to Canada's Export Control List" (Global Affairs Canada,
 *   international.gc.ca). The Guide carries the Group-1 item descriptions the
 *   List incorporates by reference.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { MirrorEntry } from "./mirror-entry";

/**
 * Official Justice Laws Website URL for the consolidated ECL (SOR/89-202).
 * The NATIONAL official source carried on every entry (the schema contract).
 * laws-lois.justice.gc.ca is the Government of Canada's official consolidation
 * of federal regulations.
 */
const ECL_SOURCE_URL =
  "https://laws-lois.justice.gc.ca/eng/regulations/SOR-89-202/FullText.html";

/**
 * As-of date = verification date (the schema contract used across the trade
 * corpus). This `asOfDate` records when the Passage entries were checked
 * against the SOR/89-202 consolidation + the Guide structure.
 */
export const CA_ECL_AS_OF = "2026-06-13";

/** The registration number of the regulation. */
export const CA_ECL_SOR_NUMBER = "SOR/89-202";

/**
 * Canada ECL space slice as MIRROR entries.
 *
 * Every Group-1 dual-use code below was VERIFIED present in the EU Annex I
 * corpus (the `EU_ANNEX_I:<bare code>` target it mirrors) before being written
 * here — the adapter throws on any dangling mirror, and the curation step
 * grepped the EU corpus files for each code. The Canadian item number carries
 * the "1-" Group prefix and dotted category structure (e.g. "1-9.A.4."),
 * DISTINCT from the bare EU code it mirrors ("9A004") — the
 * nationalCode != multilateralCode case the task describes.
 */
export const CA_ECL_ENTRIES: MirrorEntry[] = [
  // ════════════════════════════════════════════════════════════════════════
  // Group 1, Category 9 (Aerospace & Propulsion). The space spine.
  // Canadian "1-9.A.x." === Wassenaar/EU "9Axxx". All NONE (verbatim adoption).
  // Statutorily anchored by SOR/89-202 item 5504(2)(a)(ii) citing 1-9.A.4. to
  // 1-9.A.11., 1-9.D. and 1-9.E.
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "1-9.A.1.",
    mirrorsCanonicalId: "EU_ANNEX_I:9A001",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.A.4.",
    mirrorsCanonicalId: "EU_ANNEX_I:9A004",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.A.5.",
    mirrorsCanonicalId: "EU_ANNEX_I:9A005",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.A.6.",
    mirrorsCanonicalId: "EU_ANNEX_I:9A006",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.A.7.",
    mirrorsCanonicalId: "EU_ANNEX_I:9A007",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.A.8.",
    mirrorsCanonicalId: "EU_ANNEX_I:9A008",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.A.9.",
    mirrorsCanonicalId: "EU_ANNEX_I:9A009",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.A.10.",
    mirrorsCanonicalId: "EU_ANNEX_I:9A010",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.A.11.",
    mirrorsCanonicalId: "EU_ANNEX_I:9A011",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.A.12.",
    mirrorsCanonicalId: "EU_ANNEX_I:9A012",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.D.1.",
    mirrorsCanonicalId: "EU_ANNEX_I:9D001",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.D.2.",
    mirrorsCanonicalId: "EU_ANNEX_I:9D002",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.D.3.",
    mirrorsCanonicalId: "EU_ANNEX_I:9D003",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.D.4.",
    mirrorsCanonicalId: "EU_ANNEX_I:9D004",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.E.1.",
    mirrorsCanonicalId: "EU_ANNEX_I:9E001",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-9.E.2.",
    mirrorsCanonicalId: "EU_ANNEX_I:9E002",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Group 1, Category 5 Part 1 (Telecommunications) — sat comms.
  // Canadian "1-5.A.1." === Wassenaar/EU "5A001".
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "1-5.A.1.",
    mirrorsCanonicalId: "EU_ANNEX_I:5A001",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Group 1, Category 6 (Sensors & Lasers) — EO/IR payloads, telescopes,
  // laser-comm, magnetometers, SAR radar. Canadian "1-6.A.x." === EU "6Axxx".
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "1-6.A.2.",
    mirrorsCanonicalId: "EU_ANNEX_I:6A002",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-6.A.3.",
    mirrorsCanonicalId: "EU_ANNEX_I:6A003",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-6.A.4.",
    mirrorsCanonicalId: "EU_ANNEX_I:6A004",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-6.A.5.",
    mirrorsCanonicalId: "EU_ANNEX_I:6A005",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-6.A.6.",
    mirrorsCanonicalId: "EU_ANNEX_I:6A006",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-6.A.7.",
    mirrorsCanonicalId: "EU_ANNEX_I:6A007",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-6.A.8.",
    mirrorsCanonicalId: "EU_ANNEX_I:6A008",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Group 1, Category 7 (Navigation & Avionics) — accelerometers, gyros,
  // altimeters. Canadian "1-7.A.x." === EU "7Axxx". (The MTCR-derived 7A1xx
  // guidance siblings live in Group 6, not here — see coverage.excluded.)
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "1-7.A.1.",
    mirrorsCanonicalId: "EU_ANNEX_I:7A001",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-7.A.2.",
    mirrorsCanonicalId: "EU_ANNEX_I:7A002",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
  {
    nationalCode: "1-7.A.6.",
    mirrorsCanonicalId: "EU_ANNEX_I:7A006",
    mirrorDelta: "NONE",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Group 6 — MISSILE TECHNOLOGY CONTROL REGIME (MTCR) List. The genuine
  // Canadian DELTA: the missile-relevant items (the multilateral 9A1xx /
  // 7A1xx / 6A1xx families) live in a SEPARATE Canadian Group under "6-" MTCR-
  // Annex numbering, NOT under Group 1. Modelled as a NATIONAL_ONLY headline
  // (own text, no mirror linkage) rather than fabricating "1-9.A.104." codes
  // that do not exist in the Canadian scheme.
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "GROUP-6-MTCR",
    mirrorDelta: "NATIONAL_ONLY",
    title: "Missile Technology Control Regime List (ECL Group 6)",
    description:
      "Goods and technology that Canada has agreed to control under the " +
      "Missile Technology Control Regime (MTCR), listed as Group 6 of the " +
      "Export Control List (SOR/89-202) as described in Group 6 of A Guide to " +
      "Canada's Export Control List. In the Canadian scheme the missile- and " +
      "space-launch-relevant items that the multilateral lists number 9A1xx / " +
      "7A1xx / 6A1xx (e.g. sounding rockets, individual rocket stages, MTCR " +
      "rocket engines, guidance gyros and accelerometers, missile re-entry " +
      "vehicles) live HERE under separate '6-' MTCR-Annex item numbers — NOT " +
      "under Group 1 with a '1-9.A.104.'-style number. Export requires a " +
      "permit from Global Affairs Canada. Headline entry: the per-item Group 6 " +
      "list is carried in the Guide and is not enumerated here on code level.",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },

  // ════════════════════════════════════════════════════════════════════════
  // Group 5 — Miscellaneous Goods and Technology. Genuine Canadian national
  // controls with no clean multilateral equivalent (the Canadian-only layer).
  // NATIONAL_ONLY headline.
  // ════════════════════════════════════════════════════════════════════════
  {
    nationalCode: "GROUP-5-MISC",
    mirrorDelta: "NATIONAL_ONLY",
    title: "Miscellaneous Goods and Technology (ECL Group 5)",
    description:
      "Goods and technology controlled for national reasons under Group 5 of " +
      "the Export Control List (SOR/89-202), as described in Group 5 of A " +
      "Guide to Canada's Export Control List — the genuine Canadian national " +
      "control layer with no direct Wassenaar/EU/MTCR multilateral equivalent " +
      "(e.g. items controlled on grounds of strategic interest or sanctions " +
      "implementation). Export requires a permit from Global Affairs Canada. " +
      "Headline entry on Group level; the individual Group 5 positions are " +
      "carried in the Guide and are not enumerated here on code level.",
    sourceUrl: ECL_SOURCE_URL,
    asOfDate: CA_ECL_AS_OF,
  },
];

// ════════════════════════════════════════════════════════════════════════
// Coverage
// ════════════════════════════════════════════════════════════════════════

export interface CaEclCoverage {
  regime: "CA_ECL";
  scope: string;
  excluded: string[];
  asOfDate: string;
  sorNumber: string;
  caelexCoverageCount: number;
}

export const CA_ECL_COVERAGE: CaEclCoverage = {
  regime: "CA_ECL",
  scope:
    "Space slice of Canada's Export Control List (ECL, SOR/89-202), read with " +
    "A Guide to Canada's Export Control List (Global Affairs Canada). Covers " +
    "the space-relevant DUAL-USE codes of Group 1 — Category 9 (aerospace & " +
    "propulsion: launch vehicles, spacecraft, propulsion, structures, software " +
    "and technology, items 1-9.A.1./1-9.A.4.–1-9.A.12., 1-9.D.1.–1-9.D.4., " +
    "1-9.E.1.–1-9.E.2.), Category 5 part 1 (1-5.A.1. telecom), Category 6 " +
    "(1-6.A.2.–1-6.A.8. sensors+lasers) and Category 7 (1-7.A.1./1-7.A.2./" +
    "1-7.A.6. inertial+altimeter) — as MIRROR entries that adopt the Wassenaar " +
    "dual-use scope one-to-one (Canadian '1-9.A.4.' === bare EU/Wassenaar " +
    "9A004; the item number differs but the scope is identical) plus the Group " +
    "6 (MTCR) and Group 5 (Miscellaneous) headlines as the Canadian national " +
    "layer (NATIONAL_ONLY).",
  excluded: [
    "Group 2 — Munitions List (the military leg) — not enumerated here (the EU Common Military List sibling carries the harmonised military source)",
    "Group 6 — Missile Technology Control Regime List: the missile/space-launch items the multilateral lists number 9A1xx/7A1xx/6A1xx (sounding rockets 9A104, individual stages 9A119, MTCR rocket engines 9A105/9A106, guidance gyros 7A102, accelerometers 7A101, re-entry vehicles 9A116) live in this SEPARATE Canadian Group under '6-' MTCR-Annex numbering — represented at headline depth only, NOT mirrored under a fabricated '1-9.A.104.'-style Group-1 code that does not exist in the Canadian list",
    "Group 5 — Miscellaneous Goods and Technology: per-item Canadian national positions represented at headline depth only; the line-item list is in the Guide and not enumerated on code level",
    "Groups 3 (Nuclear Non-Proliferation), 4 (Nuclear-Related Dual-Use), 7 (Chemical & Biological Weapons Non-Proliferation), 9 (Arms Trade Treaty) — outside the space dual-use slice (Group 8 is repealed)",
    "Non-space Group 1 categories (0 nuclear materials, 1 special materials, 2 materials processing, 3 electronics, 4 computers, 8 marine) — outside the space slice; note 1-9.A.2./1-9.A.3. (marine/sub-assembly gas turbines) and the 9B/9C production/test families are also not enumerated",
    "Standard radiation-hardened microelectronics (Wassenaar 3A001/3A002, Canadian 1-3.A.1./1-3.A.2.) — space-relevant but their EU/Wassenaar union target is not curated in the corpus base; NOT mirrored here rather than pointed at a fabricated canonicalId",
    "Full parametric sub-clause depth of each item — inherited from the mirrored EU Annex I sibling entries (depthTier 2 code level here); the Canadian Guide carries the SAME thresholds as the Wassenaar source it transposes",
  ],
  asOfDate: CA_ECL_AS_OF,
  sorNumber: CA_ECL_SOR_NUMBER,
  caelexCoverageCount: 0, // set just below from the real length (single source of truth)
};
// Single source of truth: derive the coverage count from the actual array so
// the count can never drift from the data (the test asserts they match).
CA_ECL_COVERAGE.caelexCoverageCount = CA_ECL_ENTRIES.length;

/** Case-insensitive exact-code lookup — mirrors findChGkvEntry / findUkStrategicEntry. */
export function findCaEclEntry(nationalCode: string): MirrorEntry | undefined {
  const needle = nationalCode.trim().toUpperCase();
  return CA_ECL_ENTRIES.find((e) => e.nationalCode.toUpperCase() === needle);
}

/** Short citation for UI / provenance surfaces. */
export function getCaEclSourceCitation(): string {
  return `Export Control List, ${CA_ECL_SOR_NUMBER} (consolidated), read with A Guide to Canada's Export Control List (Global Affairs Canada). ${ECL_SOURCE_URL}`;
}
