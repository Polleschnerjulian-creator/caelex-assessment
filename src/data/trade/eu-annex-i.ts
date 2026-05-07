/**
 * Sprint B2 — EU 2021/821 Annex I — Aerospace + cross-cutting subset.
 *
 * Coverage: Aerospace-relevant entries from Cat. 9 (full focus), plus
 * cross-cutting entries from Cat. 1 (materials), Cat. 3 (electronics),
 * Cat. 5 (telecom + crypto), Cat. 6 (sensors/optics/SAR), Cat. 7
 * (navigation), and the new EU-autonomous 5xx entries from Delegated
 * Reg. 2025/2003.
 *
 * Source: EUR-Lex Reg. 2021/821 consolidated + Delegated Reg.
 * 2025/2003 (OJ L 2025/2003 of 14.11.2025, in force 15.11.2025).
 *
 * **NOT a verbatim transcription.** Each entry has paraphrased title +
 * description, cites the official source URL. The official Annex I has
 * approx. 11,000 lines; Caelex covers ~30 entries (the most space-
 * relevant). For full lookup, the user must consult EUR-Lex directly.
 */

import type { ClassificationEntry, ClassificationCoverage } from "./schema";

const SOURCE_BASE =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02021R0821";
const SOURCE_DELEG_2025_2003 =
  "https://eur-lex.europa.eu/eli/reg_del/2025/2003/oj";

const ASOF = "2026-05-07";

export const EU_ANNEX_I_COVERAGE: ClassificationCoverage = {
  jurisdiction: "EU_ANNEX_I",
  scope:
    "Aerospace-relevant entries from Cat. 9 (full subset), plus cross-cutting items from Cat. 1, 3, 5, 6, 7 + EU-autonomous 5xx from Delegated Reg. 2025/2003.",
  excluded: [
    "Cat. 0 (nuclear) — covered separately by NSG/Zangger",
    "Cat. 2 (most material processing equipment)",
    "Cat. 4 (computers — except cross-control items)",
    "Cat. 8 (marine systems)",
    "Most non-aerospace 5A/5B/5D entries",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 11000,
  caelexCoverageCount: 29,
};

export const EU_ANNEX_I_ENTRIES: ClassificationEntry[] = [
  // ─── Cat. 1 — Materials ─────────────────────────────────────────────
  {
    code: "1C002",
    jurisdiction: "EU_ANNEX_I",
    title: "Metallic alloys, alloy powders & alloyed materials",
    description:
      "Nickel-, niobium-, titanium-, magnesium-aluminides and certain superalloys for high-temperature aerospace applications. Cross-control by US CCL 1C002 + USML IV(h).",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-temp-coatings-aerospace",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "Drives composite-cycle propulsion + RV-nose-cone thermal protection.",
  },
  {
    code: "1C513",
    jurisdiction: "EU_ANNEX_I",
    title: "High-entropy alloys & refractory metal powders",
    description:
      "EU-autonomous control (introduced by Delegated Reg. 2025/2003): HEAs and refractory metal powders (W, Ta, Mo, Nb, Re) above defined purity and particle-size thresholds.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-entropy-alloys-refractory",
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
    notes:
      "First-time EU-autonomous listing without Wassenaar consensus. Aerospace use: regenerative-cooled rocket-engine combustion chambers.",
  },

  // ─── Cat. 2 — Material Processing ──────────────────────────────────
  {
    code: "2B510",
    jurisdiction: "EU_ANNEX_I",
    title: "Metal additive manufacturing equipment",
    description:
      "EU-autonomous control (Delegated Reg. 2025/2003): metal AM machines (DMLS, SLM, EBM) above thermal-cycle and build-rate thresholds.",
    controlReasons: ["NS"],
    crossReferenceTopic: "metal-additive-manufacturing-aerospace",
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
    notes:
      "Drives Isar / RFA / MaiaSpace regenerative-engine production lines.",
  },
  {
    code: "2E503",
    jurisdiction: "EU_ANNEX_I",
    title: "High-temperature coating technology",
    description:
      "EU-autonomous control (Delegated Reg. 2025/2003): technology for thermal-barrier coatings rated above defined operating temperatures + thermal-cycle counts.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-temp-coatings-aerospace",
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
  },

  // ─── Cat. 3 — Electronics ──────────────────────────────────────────
  {
    code: "3A001.a.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Radiation-hardened ICs",
    description:
      "Integrated circuits designed or rated for total-ionizing-dose ≥ 5×10⁴ rad(Si), single-event-upset ≤ 1×10⁻⁸ errors/bit/day, or single-event-latch-up immunity ≥ 80 MeV·cm²/mg LET.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "Frequently-traded BoM line for satellite avionics. PCUs/PPUs from US fabs trigger De-minimis.",
  },
  {
    code: "3A504",
    jurisdiction: "EU_ANNEX_I",
    title: "Cryogenic cooling subsystems",
    description:
      "EU-autonomous control (Delegated Reg. 2025/2003): cryogenic cooling subsystems operating below 4 K (≤ -269 °C). Covers Stirling-cycle, pulse-tube, and dilution refrigerators.",
    controlReasons: ["NS"],
    crossReferenceTopic: "cryogenic-systems-spacecraft",
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
    notes:
      "Quantum-computer-driven addition; carries spillover into IR-sensor cooling for satellites.",
  },

  // ─── Cat. 5 Part 1 — Telecom ───────────────────────────────────────
  {
    code: "5A001.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Phased-array antennas operating above 31.8 GHz",
    description:
      "Phased-array antennas with electronic beam-steering at frequencies above 31.8 GHz, OR with capabilities for adaptive nulling.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "5A001.f",
    jurisdiction: "EU_ANNEX_I",
    title: "Free-space optical communication terminals",
    description:
      "Laser communication terminals: data-rate × range product above defined threshold; tracking systems; specific wavelength bands.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "Mynaric Condor Mk3, Tesat SCOT20/SCOT80 fall here. 'ITAR-free' marketing requires verified zero US-DNA — see Caelex De-Minimis-Calculator (Sprint B5).",
  },

  // ─── Cat. 6 — Sensors / Optics / SAR ───────────────────────────────
  {
    code: "6A002",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical sensors & detectors",
    description:
      "Visible / IR / UV detectors above defined performance thresholds (NETD for IR; quantum efficiency for VIS). Includes focal-plane arrays for spaceborne EO.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "6A003",
    jurisdiction: "EU_ANNEX_I",
    title: "Imaging cameras",
    description:
      "Cameras (image-intensifier-based, IR, ICCD, special-purpose) above defined frame-rate / resolution thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "6A008",
    jurisdiction: "EU_ANNEX_I",
    title: "Radar systems including SAR",
    description:
      "Radar systems above defined power × aperture thresholds, including spaceborne synthetic-aperture radar. ICEYE, Capella, Iceye-class smallsat SAR fall here.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. 7 — Navigation ───────────────────────────────────────────
  {
    code: "7A003",
    jurisdiction: "EU_ANNEX_I",
    title: "Inertial measurement units & gyroscopes",
    description:
      "IMUs and gyros above gyro-bias-stability thresholds (≤ 0.5 deg/h for non-MTCR; finer for MTCR).",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "7A004",
    jurisdiction: "EU_ANNEX_I",
    title: "Star-trackers and other celestial navigation systems",
    description:
      "Star-trackers with attitude-update rate × accuracy above defined thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "7A005",
    jurisdiction: "EU_ANNEX_I",
    title: "GNSS receivers (anti-jam / anti-spoof variants)",
    description:
      "GNSS receivers with adaptive antenna arrays for anti-jamming, OR designed to operate in jamming environments above defined thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "7A103",
    jurisdiction: "EU_ANNEX_I",
    title: "Inertial guidance systems for missiles (MTCR)",
    description:
      "Inertial guidance systems / equipment usable in rockets, missiles or UAVs capable of MTCR Cat. I delivery (≥ 300 km / ≥ 500 kg payload).",
    controlReasons: ["MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },

  // ─── Cat. 9 — Aerospace & Propulsion (focus area) ──────────────────
  {
    code: "9A001",
    jurisdiction: "EU_ANNEX_I",
    title: "Aero gas turbine engines",
    description:
      "Aero gas turbine engines with characteristics above Wassenaar thresholds (e.g. specific fuel consumption, thrust-to-weight ratio, specific TIT levels).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A004",
    jurisdiction: "EU_ANNEX_I",
    title: "Space launch vehicles & spacecraft",
    description:
      "Complete space launch vehicles (SLVs) AND spacecraft above defined thresholds. Cross-control by 9A104 for MTCR-Cat-I systems.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "Isar Spectrum, RFA One, HyImpulse SL1 all fall here. MTCR Cat. I → strong-presumption-of-denial.",
  },
  {
    code: "9A005",
    jurisdiction: "EU_ANNEX_I",
    title: "Liquid-propellant rocket propulsion systems",
    description:
      "Complete liquid-propellant rocket engines with vacuum thrust ≥ 1 kN AND certain performance thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A007",
    jurisdiction: "EU_ANNEX_I",
    title: "Solid-propellant rocket motors",
    description:
      "Solid-propellant rocket motors with total impulse capacity above thresholds. Includes case, igniter, nozzle, propellant grain.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "rocket-propulsion-solid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A009",
    jurisdiction: "EU_ANNEX_I",
    title: "Hybrid rocket motors",
    description:
      "Hybrid rocket motors (solid fuel + liquid oxidizer) above thresholds. HyImpulse SR75/SL1 architecture.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "cryogenic-systems-spacecraft",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A010",
    jurisdiction: "EU_ANNEX_I",
    title: "Cryogenic propellant tanks for rocket stages",
    description:
      "Tanks specifically designed for cryogenic rocket propellants (LOx, LH2, LCH4, LN2). Material/insulation/tank-pressure thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "cryogenic-systems-spacecraft",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A011",
    jurisdiction: "EU_ANNEX_I",
    title: "Electric propulsion (Hall-effect, ion, FEEP, PPT)",
    description:
      "Electric propulsion systems for spacecraft: Hall-effect thrusters, gridded ion thrusters, field-emission thrusters, pulsed plasma thrusters above defined Isp / thrust thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "hall-thrusters-electric-propulsion",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A101",
    jurisdiction: "EU_ANNEX_I",
    title: "Turbojet/turbofan engines for missiles (MTCR)",
    description:
      "Turbojet and turbofan engines with maximum thrust > 400 N (excluding civil-certified variants), usable in MTCR-relevant unmanned air vehicles.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A104",
    jurisdiction: "EU_ANNEX_I",
    title: "Sounding rockets above MTCR thresholds",
    description:
      "Sounding rockets with maximum range ≥ 300 km. MTCR Cat. I if also ≥ 500 kg payload.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "9A105",
    jurisdiction: "EU_ANNEX_I",
    title: "Liquid-propellant rocket engines (MTCR Cat. II)",
    description:
      "Liquid-propellant rocket engines with total impulse ≥ 1.1 × 10⁶ N·s — MTCR-controlled even below Cat. I.",
    controlReasons: ["MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A106",
    jurisdiction: "EU_ANNEX_I",
    title: "Subsystems usable in rocket systems (MTCR)",
    description:
      "Subsystems and components usable in MTCR-relevant systems: thrust vector control, separation mechanisms, staging mechanisms, attitude control thrusters.",
    controlReasons: ["MT"],
    crossReferenceTopic: "hall-thrusters-electric-propulsion",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A107",
    jurisdiction: "EU_ANNEX_I",
    title: "Solid-propellant rocket motors (MTCR Cat. II)",
    description:
      "Solid-propellant rocket motors with total impulse ≥ 1.1 × 10⁶ N·s — MTCR-controlled even below Cat. I.",
    controlReasons: ["MT"],
    crossReferenceTopic: "rocket-propulsion-solid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A350",
    jurisdiction: "EU_ANNEX_I",
    title: "Aerosol-generating systems (dual-use, CB-controlled)",
    description:
      "Aerosol-generating systems that could be adapted for CB-agent dispersal. Controlled for Chemical/Biological reasons under Wassenaar. Payload-delivery cross-check required for aerial platforms.",
    controlReasons: ["CB"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. 9 — Spacecraft Bus & Platforms ───────────────────────────
  {
    code: "9A515",
    jurisdiction: "EU_ANNEX_I",
    title: "Spacecraft and spacecraft platforms",
    description:
      "Spacecraft designed or modified for military/intelligence use, OR with anti-jam/anti-spoof capabilities, OR above defined radiation tolerance thresholds. Commercial EO/comms sats may still fall here if mil-spec subsystems are present.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "ECR 2014 (US) moved commercial sats from USML XV → ECCN 9A515. EU Annex I 9A515 mirrors this post-2014 Wassenaar alignment. Check for mil-spec avionics before assuming commercial exemption.",
  },
];

/**
 * Lookup by code within EU Annex I.
 */
export function findEuAnnexIEntry(
  code: string,
): ClassificationEntry | undefined {
  return EU_ANNEX_I_ENTRIES.find((e) => e.code === code);
}

/**
 * Lookup all EU Annex I entries for a given cross-reference topic slug.
 */
export function findEuAnnexIEntriesByTopic(
  slug: string,
): ClassificationEntry[] {
  return EU_ANNEX_I_ENTRIES.filter((e) => e.crossReferenceTopic === slug);
}
