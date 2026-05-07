/**
 * Sprint B2 — MTCR Annex — Missile Technology Control Regime — Aerospace subset.
 *
 * The MTCR Annex is the multilateral control list agreed by 35+ partner
 * nations. It is NOT a binding treaty but creates a strong political
 * commitment to deny exports of Cat. I items.
 *
 * Cat. I  — Complete systems capable of delivering ≥ 500 kg to ≥ 300 km.
 *            Strong presumption of denial — virtually no exceptions.
 *            MTCR Cat. I triggers the highest-risk gate in Sprint B6.
 *
 * Cat. II — Dual-use items usable in Cat. I systems. Subject to "case-by-
 *            case" analysis; denial not presumed but license required.
 *
 * Source: MTCR Annex Handbook 2010 (last publicly available version)
 * + MTCR partner-nation guidelines.
 * https://mtcr.info/mtcr-annex/
 *
 * Note: The MTCR Annex is NOT a regulation — each member state implements
 * it via national export-control law (EU Annex I, US CCL, DE AL, etc.).
 * The codes here are the international reference codes; cross-references
 * to national implementation codes are in cross-reference-topics.ts.
 *
 * NOT a verbatim transcription. Descriptions are paraphrases.
 */

import type { ClassificationEntry, ClassificationCoverage } from "./schema";

const SOURCE_BASE = "https://mtcr.info/mtcr-annex/";

const ASOF = "2026-05-07";

export const MTCR_ANNEX_COVERAGE: ClassificationCoverage = {
  jurisdiction: "MTCR_ANNEX",
  scope:
    "MTCR Annex Cat. I and Cat. II items relevant to space-launch vehicles, propulsion, navigation, and spacecraft platforms. Item 1 (complete systems), Item 2 (propulsion), Item 9 (flight instruments), Item 11 (electronic equipment).",
  excluded: [
    "Items 3-8 (materials, production equipment, propellant chemicals) — partial coverage via cross-reference",
    "Items 12-19 (range safety, nuclear payloads, etc.) — out of scope for Wave B",
    "Biological warhead items — out of scope",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 200,
  caelexCoverageCount: 9,
};

export const MTCR_ANNEX_ENTRIES: ClassificationEntry[] = [
  // ─── Item 1 — Complete Systems ─────────────────────────────────────
  {
    code: "1.A.1",
    jurisdiction: "MTCR_ANNEX",
    title: "Complete rocket systems — Cat. I",
    description:
      "Complete rockets, space-launch vehicles, and ballistic missiles capable of delivering a payload of ≥ 500 kg to a range of ≥ 300 km. Strong presumption of denial — effectively embargoed for non-partner transfers.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "1.A.2",
    jurisdiction: "MTCR_ANNEX",
    title: "Complete MANPADS — Cat. I",
    description:
      "Complete man-portable air-defense systems meeting MTCR Cat. I delivery parameters. Treated identically to complete rocket systems for licensing purposes.",
    controlReasons: ["MT"],
    crossReferenceTopic: "manpads-and-anti-spacecraft",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },

  // ─── Item 2 — Propulsion ───────────────────────────────────────────
  {
    code: "2.A.1",
    jurisdiction: "MTCR_ANNEX",
    title: "Rocket engines for Cat. I systems — Cat. II",
    description:
      "Rocket engines (liquid or solid) designed for Cat. I systems, OR with total impulse ≥ 1.1 × 10⁶ N·s. Cat. II — case-by-case assessment. Includes thrust-vector-controlled variants.",
    controlReasons: ["MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
    notes:
      "Cryogenic upper stages (LOx/LH2) frequently fall here. RFA HELIX engine, HyImpulse SR75 — verify via export-classification request to BAFA/BIS.",
  },

  // ─── Item 3 — Propellant Production ───────────────────────────────
  {
    code: "3.A.7",
    jurisdiction: "MTCR_ANNEX",
    title: "Cryogenic storage and handling equipment — Cat. II",
    description:
      "Cryogenic storage and handling equipment for propellants usable in Cat. I delivery systems. Includes cryogenic tanks, transfer lines, and associated GSE.",
    controlReasons: ["MT"],
    crossReferenceTopic: "cryogenic-systems-spacecraft",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },

  // ─── Item 6 — Materials ────────────────────────────────────────────
  {
    code: "6.D.1",
    jurisdiction: "MTCR_ANNEX",
    title: "High-temperature coatings for rocket applications — Cat. II",
    description:
      "Technology for thermal-barrier coatings and high-temperature materials used in rocket propulsion or reentry vehicle applications.",
    controlReasons: ["MT"],
    crossReferenceTopic: "high-temp-coatings-aerospace",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },

  // ─── Item 9 — Flight Instruments ──────────────────────────────────
  {
    code: "9A105",
    jurisdiction: "MTCR_ANNEX",
    title: "Integrated flight instruments for Cat. I delivery — Cat. II",
    description:
      "Integrated flight instruments (IMUs, gyros, accelerometers, altimeters, star-trackers) usable in Cat. I delivery systems. Includes complete guidance packages.",
    controlReasons: ["MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A106",
    jurisdiction: "MTCR_ANNEX",
    title: "Spacecraft propulsion subsystems (MTCR Cat. II)",
    description:
      "Propulsion subsystems usable in Cat. I systems: thrust vector control, attitude control thrusters, staging/separation mechanisms, electric propulsion systems.",
    controlReasons: ["MT"],
    crossReferenceTopic: "hall-thrusters-electric-propulsion",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },

  // ─── Item 11 — Electronic Equipment ───────────────────────────────
  {
    code: "11.A.1",
    jurisdiction: "MTCR_ANNEX",
    title: "High-speed computers for missile-related calculations — Cat. II",
    description:
      "Computers and processing units with performance above defined MTCR thresholds specifically for real-time guidance calculations.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "11.A.3",
    jurisdiction: "MTCR_ANNEX",
    title: "Range safety destruct systems — Cat. II",
    description:
      "Flight termination systems (FTS) designed for Cat. I vehicles. FTS must be MTCR-assessed separately from the vehicle itself.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
];

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
 * Returns only Cat. I entries — used by Sprint B6 license-determination
 * to apply the "strong presumption of denial" gate.
 */
export function getMtcrCategoryIEntries(): ClassificationEntry[] {
  return MTCR_ANNEX_ENTRIES.filter((e) => e.mtcrCategory === "I");
}
