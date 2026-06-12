/**
 * MTCR Annex — Missile Technology Control Regime — full space-relevant corpus.
 *
 * The MTCR Annex ("Equipment, Software and Technology Annex") is the
 * multilateral control list agreed by the 35 MTCR partner nations. It is NOT
 * a binding treaty but creates a strong political commitment to deny exports
 * of Category I items. Each member state implements it via national export-
 * control law (EU Reg. 2021/821 Annex I, US CCL/USML, DE AL, UK SECL, …);
 * the codes here are the international reference codes.
 *
 *   Category I  — Items 1 and 2 only: complete delivery systems (≥ 500 kg
 *                 payload to ≥ 300 km range) and the complete subsystems
 *                 usable in them. Strong presumption of denial; transfer of
 *                 Cat I production facilities is flatly prohibited.
 *   Category II — every Annex item NOT designated Cat I, i.e. Items 3–20.
 *                 Case-by-case licensing review; denial not presumed.
 *
 * This file holds Category I (Items 1–2). Category II (Items 3–20) lives in
 * `mtcr-cat2.ts` to keep each file readable; both are unioned into the single
 * `MTCR_ANNEX_ENTRIES` export below so `normalized-corpus.ts` keeps ONE
 * import. Items 5, 7 and 8 are "Reserved For Future Use" and carry no entries.
 *
 * Source: MTCR "Equipment, Software and Technology Annex", document dated
 * 14 March 2024 (MTCR/TEM/2024/Annex). https://www.mtcr.info/en/mtcr-annex
 *
 * NOT a verbatim transcription. Descriptions paraphrase the operative text;
 * codes and numeric thresholds (range, payload, total impulse, CEP, …) are
 * reproduced exactly from the Annex.
 */

import type { ClassificationEntry, ClassificationCoverage } from "./schema";
import { MTCR_CAT2_ENTRIES } from "./mtcr-cat2";

const SRC = "https://www.mtcr.info/en/mtcr-annex";
/**
 * Date these entries were last verified against the official source (per the
 * `ClassificationEntry.asOfDate` contract — verification date, NOT the source
 * document's publication date). The source document is the MTCR Annex dated
 * 14 March 2024 (MTCR/TEM/2024/Annex), stated in the file header and coverage.
 */
const ASOF = "2026-06-13";

/**
 * Category I — Items 1 and 2. The Annex Introduction §1(a) states: "Category I
 * items, all of which are in Annex Items 1 and 2, are those items of greatest
 * sensitivity." A system that incorporates a Cat I item is itself Cat I unless
 * the item cannot be separated, removed or duplicated.
 */
const MTCR_CAT1_ENTRIES: ClassificationEntry[] = [
  // ─── ITEM 1 — COMPLETE DELIVERY SYSTEMS ──────────────────────────────
  {
    code: "1.A.1",
    jurisdiction: "MTCR_ANNEX",
    title: "Complete rocket systems (≥500 kg payload to ≥300 km range)",
    description:
      "Complete rocket systems (including ballistic missiles, space-launch vehicles and sounding rockets) capable of delivering at least a 500 kg payload to a range of at least 300 km. Strong presumption of denial — effectively embargoed except in extraordinary government-to-government circumstances.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "1.A.2",
    jurisdiction: "MTCR_ANNEX",
    title: "Complete UAV systems (≥500 kg payload to ≥300 km range)",
    description:
      "Complete unmanned aerial vehicle systems (including cruise missiles, target drones and reconnaissance drones) capable of delivering at least a 500 kg payload to a range of at least 300 km. Treated identically to complete rocket systems for licensing — Cat I, strong presumption of denial.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "1.B.1",
    jurisdiction: "MTCR_ANNEX",
    title: "Production facilities for complete delivery systems",
    description:
      "'Production facilities' specially designed for the systems specified in 1.A. Transfer of Category I production facilities is flatly prohibited under the MTCR Guidelines.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "1.D.1",
    jurisdiction: "MTCR_ANNEX",
    title: "Software for use of Item 1 production facilities",
    description:
      "'Software' specially designed or modified for the use of 'production facilities' specified in 1.B.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "1.D.2",
    jurisdiction: "MTCR_ANNEX",
    title: "Software coordinating subsystems of Item 1 systems",
    description:
      "'Software' specially designed or modified to coordinate the function of more than one subsystem in systems specified in 1.A (incl., for manned aircraft converted to UAVs, software integrating the conversion equipment and operating the aircraft as a UAV).",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "1.E.1",
    jurisdiction: "MTCR_ANNEX",
    title: "Technology for Item 1 complete delivery systems",
    description:
      "'Technology' (per the General Technology Note) for the development, production or use of equipment or software specified in 1.A, 1.B or 1.D.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },

  // ─── ITEM 2 — COMPLETE SUBSYSTEMS USABLE IN COMPLETE DELIVERY SYSTEMS ─
  {
    code: "2.A.1.a",
    jurisdiction: "MTCR_ANNEX",
    title: "Individual rocket stages usable in Item 1.A systems",
    description:
      "Individual rocket stages usable in the complete delivery systems specified in 1.A. Cat I subsystem.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "2.A.1.b",
    jurisdiction: "MTCR_ANNEX",
    title: "Re-entry vehicles and dedicated equipment",
    description:
      "Re-entry vehicles usable in 1.A systems and equipment designed/modified therefor: ceramic/ablative heat shields, light-weight high-heat-capacity heat sinks, and electronic equipment specially designed for re-entry vehicles. May be treated as Cat II for non-weapon payloads subject to end-use statements and quantity limits.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "2.A.1.c",
    jurisdiction: "MTCR_ANNEX",
    title: "Rocket propulsion subsystems (total impulse ≥ 1.1×10⁶ Ns)",
    description:
      "Rocket propulsion subsystems usable in 1.A systems: solid or hybrid rocket motors with total impulse capacity ≥ 1.1 × 10⁶ Ns; or liquid/gel propellant rocket engines integrated into a propulsion system with total impulse ≥ 1.1 × 10⁶ Ns. Liquid apogee/station-keeping engines for satellites may be treated as Cat II if vacuum thrust ≤ 1 kN and exported under appropriate end-use statements.",
    controlReasons: ["MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
    notes:
      "The 1.1×10⁶ Ns total-impulse boundary is the headline Cat-I propulsion tripwire. Cryogenic upper stages (LOx/LH2) frequently fall here; the ≤1 kN vacuum-thrust satellite exception is the key carve-out for commercial apogee engines.",
  },
  {
    code: "2.A.1.d",
    jurisdiction: "MTCR_ANNEX",
    title: "Guidance sets (system accuracy ≤ 3.33% of range)",
    description:
      "'Guidance sets' usable in 1.A systems capable of achieving system accuracy of 3.33% or less of the range (e.g. a CEP of 10 km or less at 300 km range). A guidance set integrates navigation (measuring position/velocity) with commands to the flight-control system. May be treated as Cat II for missiles with range under 300 km or manned aircraft.",
    controlReasons: ["MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "2.A.1.e",
    jurisdiction: "MTCR_ANNEX",
    title: "Thrust-vector-control subsystems",
    description:
      "Thrust-vector-control subsystems usable in 1.A systems (flexible nozzle, fluid/secondary-gas injection, movable engine or nozzle, exhaust-gas deflection via jet vanes/probes, or thrust tabs). May be treated as Cat II if designed for rocket systems other than those specified in 1.A.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "2.A.1.f",
    jurisdiction: "MTCR_ANNEX",
    title: "Weapon/warhead safing, arming, fuzing and firing mechanisms",
    description:
      "Weapon or warhead safing, arming, fuzing and firing mechanisms usable in 1.A systems. May be treated as Cat II if designed for systems other than those specified in 1.A.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "2.B.1",
    jurisdiction: "MTCR_ANNEX",
    title: "Production facilities for Item 2 subsystems",
    description:
      "'Production facilities' specially designed for the subsystems specified in 2.A.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "2.B.2",
    jurisdiction: "MTCR_ANNEX",
    title: "Production equipment for Item 2 subsystems",
    description:
      "'Production equipment' specially designed for the subsystems specified in 2.A.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "2.D.1",
    jurisdiction: "MTCR_ANNEX",
    title: "Software for use of Item 2 production facilities",
    description:
      "'Software' specially designed or modified for the use of 'production facilities' specified in 2.B.1.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "2.D.2",
    jurisdiction: "MTCR_ANNEX",
    title: "Software for rocket motors/engines (2.A.1.c)",
    description:
      "'Software' specially designed or modified for the use of rocket motors or engines specified in 2.A.1.c. May be treated as Cat II if for satellite liquid apogee/station-keeping engines per the Note to 2.A.1.c.2.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "2.D.3",
    jurisdiction: "MTCR_ANNEX",
    title: "Software for guidance sets (2.A.1.d)",
    description:
      "'Software' specially designed or modified for the operation or maintenance of 'guidance sets' specified in 2.A.1.d (incl. software enhancing guidance-set accuracy to meet 2.A.1.d). May be treated as Cat II if for missiles with range under 300 km or manned aircraft.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "2.D.4",
    jurisdiction: "MTCR_ANNEX",
    title: "Software for re-entry-vehicle electronics (2.A.1.b.3)",
    description:
      "'Software' specially designed or modified for the operation or maintenance of subsystems or equipment specified in 2.A.1.b.3. May be treated as Cat II if for re-entry vehicles designed for non-weapon payloads.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "2.D.5",
    jurisdiction: "MTCR_ANNEX",
    title: "Software for thrust-vector-control subsystems (2.A.1.e)",
    description:
      "'Software' specially designed or modified for the operation or maintenance of subsystems specified in 2.A.1.e. May be treated as Cat II if for rocket systems other than those specified in 1.A.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "2.D.6",
    jurisdiction: "MTCR_ANNEX",
    title: "Software for safing/arming/fuzing/firing (2.A.1.f)",
    description:
      "'Software' specially designed or modified for the operation or maintenance of subsystems specified in 2.A.1.f. May be treated as Cat II if for systems other than those specified in 1.A.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "2.E.1",
    jurisdiction: "MTCR_ANNEX",
    title: "Technology for Item 2 complete subsystems",
    description:
      "'Technology' (per the General Technology Note) for the development, production or use of equipment or software specified in 2.A, 2.B or 2.D.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SRC,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
];

/**
 * The complete MTCR Annex corpus: Category I (Items 1–2, this file) unioned
 * with Category II (Items 3–20, `mtcr-cat2.ts`). Single export so the
 * normalized corpus keeps one import.
 */
export const MTCR_ANNEX_ENTRIES: ClassificationEntry[] = [
  ...MTCR_CAT1_ENTRIES,
  ...MTCR_CAT2_ENTRIES,
];

export const MTCR_ANNEX_COVERAGE: ClassificationCoverage = {
  jurisdiction: "MTCR_ANNEX",
  scope:
    "Complete MTCR Annex (2024-03-14) at item / sub-item level: Category I Items 1–2 (complete delivery systems and complete subsystems usable in them) and Category II Items 3, 4, 6, 9–20 (propulsion, propellants, structural composites/materials, navigation, flight control, avionics, launch support, computers, ADCs, test facilities, modelling, stealth, nuclear-effects protection, and the 'other' complete systems/subsystems). Controlling parameters (range, payload, total impulse, CEP, specific tensile strength, dielectric constant, thrust, etc.) are stated in each entry's description.",
  excluded: [
    "Items 5, 7 and 8 — 'Reserved For Future Use' in the Annex (no controlled entries exist).",
    "Verbatim CAS-number sub-lists inside 4.C.2.b (hydrazine derivatives), 4.C.2.g, 4.C.4 (oxidisers), 4.C.5 (polymers) and 4.C.6 (additives) are summarised, not enumerated chemical-by-chemical — the controlling code and representative substances are given; consult the Annex text for the exhaustive CAS list before a chemical-specific determination.",
    "The Annex's Units/Constants/Acronyms table, Table of Conversions and Statement of Understanding (front/back matter, not control entries).",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 200,
  caelexCoverageCount: MTCR_ANNEX_ENTRIES.length,
};

/**
 * Lookup by MTCR Annex item code.
 */
export function findMtcrEntry(code: string): ClassificationEntry | undefined {
  return MTCR_ANNEX_ENTRIES.find((e) => e.code === code);
}

/**
 * Lookup all MTCR Annex entries for a given cross-reference topic slug.
 */
export function findMtcrEntriesByTopic(slug: string): ClassificationEntry[] {
  return MTCR_ANNEX_ENTRIES.filter((e) => e.crossReferenceTopic === slug);
}

/**
 * Returns only Cat. I entries (Items 1–2) — used by license-determination to
 * apply the "strong presumption of denial" gate.
 */
export function getMtcrCategoryIEntries(): ClassificationEntry[] {
  return MTCR_ANNEX_ENTRIES.filter((e) => e.mtcrCategory === "I");
}
