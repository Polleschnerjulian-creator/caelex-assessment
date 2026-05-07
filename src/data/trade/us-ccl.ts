/**
 * Sprint B2 — US Commerce Control List (CCL) — EAR Part 774 — Aerospace subset.
 *
 * The CCL is the BIS export-control list for dual-use items under EAR
 * (15 CFR Parts 730-774). Only ECCNs relevant to spacecraft, propulsion,
 * navigation, sensors, and communications are included.
 *
 * Source: eCFR Part 774 Supplement 1 (accessed 2026-05-07) at
 * https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-774/
 *
 * The "9A515" split (ECCN 9A515.a vs USML XV) is the product of the
 * Export Control Reform (ECR) Act / Presidential Policy Directive (2014),
 * which moved most commercial spacecraft from USML XV to CCL. Items that
 * remain under USML XV are listed in usml.ts.
 *
 * NOT a verbatim transcription. Descriptions are paraphrases. For full
 * text, consult eCFR or BIS Supplement directly.
 */

import type { ClassificationEntry, ClassificationCoverage } from "./schema";

const SOURCE_BASE =
  "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-774";

const ASOF = "2026-05-07";

export const US_CCL_COVERAGE: ClassificationCoverage = {
  jurisdiction: "US_CCL",
  scope:
    "Aerospace-relevant ECCNs: 1C002 (materials), 3A001 (rad-hard electronics), 5A001 (telecom), 6A002/6A003/6A008 (sensors/SAR), 7A003-7A103 (navigation), 9A004/9A005/9A007/9A009-9A011 (launch & spacecraft), 9A515 (commercial sat ECR split).",
  excluded: [
    "EAR99 (no ECCN) items",
    "CCL Cat. 0 (nuclear)",
    "Cat. 4 (computers) except cross-control items",
    "Cat. 8 (marine systems)",
    "Cat. 2 (most material processing) except 2B510",
    "USML items that remain controlled under ITAR (see usml.ts)",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 3000,
  caelexCoverageCount: 24,
};

export const US_CCL_ENTRIES: ClassificationEntry[] = [
  // ─── Cat. 1 — Materials ────────────────────────────────────────────
  {
    code: "1C002",
    jurisdiction: "US_CCL",
    title: "Metallic alloys and powder materials",
    description:
      "Nickel-, niobium-, titanium-aluminides and certain superalloys above purity/composition thresholds. Mirrors EU Annex I 1C002 (Wassenaar-harmonized).",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-temp-coatings-aerospace",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. 2 — Material Processing ─────────────────────────────────
  {
    code: "2B510",
    jurisdiction: "US_CCL",
    title: "Metal additive manufacturing equipment",
    description:
      "DMLS, SLM, EBM machines printing metal parts above thermal-cycle / build-rate thresholds. Also controlled under EU-autonomous 2B510.",
    controlReasons: ["NS"],
    crossReferenceTopic: "metal-additive-manufacturing-aerospace",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. 3 — Electronics ──────────────────────────────────────────
  {
    code: "3A001.a.1",
    jurisdiction: "US_CCL",
    title: "Radiation-hardened ICs",
    description:
      "ICs designed or rated for total-ionizing-dose ≥ 5×10⁴ rad(Si), single-event-upset immunity, or single-event-latch-up immunity ≥ 80 MeV·cm²/mg LET. US-origin rad-hard chips trigger De-minimis calculations.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. 5 — Telecom ──────────────────────────────────────────────
  {
    code: "5A001.b",
    jurisdiction: "US_CCL",
    title: "Phased-array antennas above 31.8 GHz",
    description:
      "Phased-array antennas with electronic beam-steering above 31.8 GHz or adaptive-nulling capability. Spacecraft TT&C hardware often falls here.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "5A001.f",
    jurisdiction: "US_CCL",
    title: "Free-space optical communication terminals",
    description:
      "Laser communication terminals above data-rate × range product threshold. US-origin laser comms trigger De-minimis even when marketed as ITAR-free.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. 6 — Sensors / Optics / SAR ───────────────────────────────
  {
    code: "6A002",
    jurisdiction: "US_CCL",
    title: "Optical sensors and detectors",
    description:
      "VIS/IR/UV detectors above defined NETD / quantum-efficiency thresholds. Focal-plane arrays for spaceborne EO.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "6A003",
    jurisdiction: "US_CCL",
    title: "Imaging cameras",
    description:
      "Cameras above defined frame-rate / resolution thresholds (image-intensifier, IR, ICCD, special-purpose).",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "6A008",
    jurisdiction: "US_CCL",
    title: "Radar and SAR systems",
    description:
      "Radar above power × aperture thresholds, including spaceborne SAR. Lower-spec commercial SAR (e.g. ICEYE, Capella) may fall here with STA or individual license.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. 7 — Navigation ───────────────────────────────────────────
  {
    code: "7A003",
    jurisdiction: "US_CCL",
    title: "Inertial measurement units and gyroscopes",
    description:
      "IMUs and gyros above bias-stability thresholds. High-performance IMUs used in launch vehicles and spacecraft ADCS.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "7A004",
    jurisdiction: "US_CCL",
    title: "Star-trackers and celestial navigation systems",
    description:
      "Star-trackers with attitude-update rate × accuracy above defined thresholds. Standard on medium-class spacecraft ADCS.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "7A005",
    jurisdiction: "US_CCL",
    title: "GNSS receivers (anti-jam / anti-spoof variants)",
    description:
      "GNSS receivers with anti-jam/anti-spoof capability above defined thresholds. Standard civil GNSS receivers are generally EAR99.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "7A103",
    jurisdiction: "US_CCL",
    title: "Inertial guidance systems for MTCR-relevant vehicles",
    description:
      "Guidance systems usable in rockets / UAVs capable of MTCR Cat. I delivery parameters. MTCR Cat. II item — STA/individual license required for most destinations.",
    controlReasons: ["MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },

  // ─── Cat. 9 — Propulsion and Launch Vehicles ────────────────────────
  {
    code: "9A004",
    jurisdiction: "US_CCL",
    title: "Space launch vehicles and spacecraft",
    description:
      "Complete SLVs and spacecraft above thresholds. Note: most commercial spacecraft engines moved to 9A005 post-ECR 2014.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "Also covers in-orbit servicing / RPO spacecraft (no dedicated ECCN for OSS yet — catch-all here).",
  },
  {
    code: "9A005",
    jurisdiction: "US_CCL",
    title: "Liquid-propellant rocket propulsion systems",
    description:
      "Complete liquid-propellant rocket engines above vacuum thrust / performance thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A007",
    jurisdiction: "US_CCL",
    title: "Solid-propellant rocket motors",
    description:
      "Solid-propellant rocket motors above total-impulse thresholds, including case, igniter, nozzle, propellant grain assemblies.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "rocket-propulsion-solid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A009",
    jurisdiction: "US_CCL",
    title: "Hybrid rocket motors",
    description:
      "Hybrid rocket motors (solid fuel / liquid oxidizer) above thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "cryogenic-systems-spacecraft",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A010",
    jurisdiction: "US_CCL",
    title: "Cryogenic propellant tanks",
    description:
      "Tanks designed for cryogenic rocket propellants (LOx, LH2, LCH4) — material, insulation, and pressure thresholds apply.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "cryogenic-systems-spacecraft",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A011",
    jurisdiction: "US_CCL",
    title: "Electric propulsion systems",
    description:
      "Hall-effect thrusters, gridded ion thrusters, FEEP, PPT above defined specific-impulse / thrust thresholds. US-origin PCUs/PPUs are a common De-minimis trigger.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "hall-thrusters-electric-propulsion",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── 9A515 — Post-ECR Commercial Spacecraft (CCL side of USML split) ─
  {
    code: "9A515.a",
    jurisdiction: "US_CCL",
    title: "Commercial spacecraft (general)",
    description:
      "Spacecraft not described in USML XV — the 'catch-all' CCL entry post-ECR 2014. Requires at minimum an NLR/EAR99 self-classification or CCATS determination.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "Most commercial EO and comms satellites land here post-ECR 2014. Still requires EAR compliance (license or No License Required determination).",
  },
  {
    code: "9A515.b",
    jurisdiction: "US_CCL",
    title: "Satellite buses (non-USML)",
    description:
      "Satellite buses / platforms not described in USML XV — structural, power, propulsion and thermal subsystems integrated into a non-USML bus.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A515.d",
    jurisdiction: "US_CCL",
    title: "Radiation-hardened spacecraft electronics (CCL side)",
    description:
      "Spacecraft electronics (avionics, power controllers, computers) rated for total-ionizing-dose above threshold, not meeting USML XV(e)(8) criteria.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A515.g",
    jurisdiction: "US_CCL",
    title: "Commercial EO imaging systems (CCL side)",
    description:
      "EO imaging systems not meeting USML XV(a)(7)(i) criteria. BIS 2024 Interim Final Rule retained 0.50 m GSD as the USML threshold; sub-0.50 m stays USML.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "2024 BIS IFR rejected the proposed liberalization to 0.80 m. Operators must verify exact GSD against current threshold before self-classifying as 9A515.g.",
  },
  {
    code: "9A515.h",
    jurisdiction: "US_CCL",
    title: "Spacecraft TT&C systems (CCL side)",
    description:
      "TT&C and inter-satellite link systems not meeting USML XI(c) or XV(c) criteria. Anti-jam waveforms remain USML.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A515.j",
    jurisdiction: "US_CCL",
    title: "Commercial SAR systems (CCL side)",
    description:
      "SAR systems not meeting USML XV(a)(7)(ii) criteria. Lower-spec/commercial SAR (e.g. ICEYE Dwell, Capella Spotlight) may fall here.",
    controlReasons: ["NS"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
];

/**
 * Lookup by ECCN code within the US CCL.
 */
export function findUsCclEntry(code: string): ClassificationEntry | undefined {
  return US_CCL_ENTRIES.find((e) => e.code === code);
}

/**
 * Lookup all US CCL entries for a given cross-reference topic slug.
 */
export function findUsCclEntriesByTopic(slug: string): ClassificationEntry[] {
  return US_CCL_ENTRIES.filter((e) => e.crossReferenceTopic === slug);
}
