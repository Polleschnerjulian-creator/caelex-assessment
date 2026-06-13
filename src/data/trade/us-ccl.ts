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
  caelexCoverageCount: 49,
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
    // CORRECTED 2026-06-13: electric propulsion is CCL 9A004.f (controlled
    // via 9A515 for licensing per the 23 Oct 2024 IFR), NOT 9A011 — 9A011 =
    // ramjet/scramjet/combined-cycle engines (Wassenaar 9.A.11).
    code: "9A004.f",
    jurisdiction: "US_CCL",
    title: "Electric / plasma propulsion systems (9A004.f)",
    description:
      "Hall-effect thrusters, gridded ion thrusters, FEEP, PPT providing thrust > 300 mN AND specific impulse > 1,500 s, OR input power > 15 kW. Items under 9A004.b–.f are controlled via 9A515 for licensing. US-origin PCUs/PPUs are a common De-minimis trigger.",
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

  // ─── Sprint B4 — Cat. 3 expansion ──────────────────────────────────
  {
    code: "3A001.a.5",
    jurisdiction: "US_CCL",
    title: "Programmable logic devices / FPGAs",
    description:
      "FPGAs and configurable logic devices above defined gate-count / operating-temperature thresholds. Space-grade rad-tolerant FPGAs (e.g. Microsemi RTG4) commonly fall here; commercial-grade FPGAs are typically EAR99.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "3A001.b.3",
    jurisdiction: "US_CCL",
    title: "High-speed analog-to-digital converters",
    description:
      "ADCs above sample-rate × resolution thresholds — e.g. ≥125 MSps × 14-bit. Common in spacecraft TT&C demodulators and SAR back-ends.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "3A002",
    jurisdiction: "US_CCL",
    title: "Specially designed test equipment",
    description:
      "High-bandwidth signal generators, spectrum analyzers, vector network analyzers above defined thresholds. EGSE and integration test sets frequently classified here.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. 4 expansion ────────────────────────────────────────────────
  {
    code: "4A001",
    jurisdiction: "US_CCL",
    title: "Computers — specially designed",
    description:
      "Computers above defined operating-temperature ranges (typically rated for -55°C to +125°C or hardened against vibration/shock) and rad-hardened ground-station computers.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "4A003",
    jurisdiction: "US_CCL",
    title: "Digital computers above APP threshold",
    description:
      "Digital computers, electronic assemblies, and related equipment with Adjusted Peak Performance (APP) above defined TeraFLOPS thresholds. Mission-control supercomputers may classify here.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. 5 Part 1 — Telecommunications ─────────────────────────────
  {
    code: "5A001.a",
    jurisdiction: "US_CCL",
    title: "Telecom systems and equipment — specially designed",
    description:
      "Telecommunications systems / equipment / specially designed components with bandwidth or anti-jam capabilities above defined thresholds. Typically catches military-grade or anti-jam SATCOM.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "5A001.c",
    jurisdiction: "US_CCL",
    title: "Anti-jam and direction-finding communications",
    description:
      "Equipment with anti-jam, anti-spoof, or direction-finding capability above defined performance thresholds. Standard for resilient TT&C ground links.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. 5 Part 2 — Information Security ───────────────────────────
  {
    code: "5A002",
    jurisdiction: "US_CCL",
    title: "Information security — encryption commodities",
    description:
      "Commodities employing cryptographic functionality above defined key-length / algorithm thresholds. Most TT&C link encryptors with AES-256 or stronger fall here. Eligible for License Exception ENC under §740.17.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "5A002.a.1",
    jurisdiction: "US_CCL",
    title: "Symmetric encryption above 56-bit",
    description:
      "Symmetric-key cryptography with key length > 56 bits (block ciphers) or > 512 bits (asymmetric). Practically every modern crypto module falls here.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "5D002",
    jurisdiction: "US_CCL",
    title: "Encryption software",
    description:
      "Source code, object code, or software employing or controlling cryptographic functionality covered by 5A002. ENC §740.17 typically applies.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "5E002",
    jurisdiction: "US_CCL",
    title: "Encryption technology",
    description:
      "Technology for the development, production, or use of 5A002 / 5D002 items. Includes algorithms, design specifications, and test data.",
    controlReasons: ["NS", "EI"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. 6 expansion — Lasers, Magnetics ───────────────────────────
  {
    code: "6A005.a",
    jurisdiction: "US_CCL",
    title: "Continuous-wave lasers above power thresholds",
    description:
      "CW lasers with power × wavelength above defined thresholds. Optical-comm transmit lasers and laser-range-finders frequently classify here.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "6A005.b",
    jurisdiction: "US_CCL",
    title: "Pulsed lasers above peak-power × repetition-rate thresholds",
    description:
      "Pulsed lasers — Q-switched, mode-locked, and short-pulse — above defined peak-power × repetition-rate thresholds. LiDAR and ranging payloads common.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "6A006",
    jurisdiction: "US_CCL",
    title: "Magnetic and electric-field sensors",
    description:
      "Magnetometers, gradiometers, fluxgate sensors above noise-density thresholds. Spacecraft attitude determination + scientific magnetic-field mapping.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. 7 expansion — Inertial, MTCR-relevant ─────────────────────
  {
    code: "7A001",
    jurisdiction: "US_CCL",
    title: "Linear accelerometers — high-grade",
    description:
      "Accelerometers above bias-stability / scale-factor stability thresholds. High-grade IMU components for launch-vehicle GNC.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "7A002",
    jurisdiction: "US_CCL",
    title: "Gyroscopes / angular accelerometers — high-grade",
    description:
      "Gyros and angular accelerometers above performance thresholds (≤0.5°/hr bias). FOG, MEMS, and ring-laser-gyros for launch-vehicle GNC fall here.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "7A101",
    jurisdiction: "US_CCL",
    title: "MTCR Cat. II accelerometers",
    description:
      "Accelerometers usable in MTCR Cat. II rockets/UAVs (range ≥ 300 km, payload < 500 kg). License required for most destinations.",
    controlReasons: ["MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "7A102",
    jurisdiction: "US_CCL",
    title: "MTCR Cat. II gyroscopes",
    description:
      "Gyroscopes usable in MTCR Cat. II vehicles. Same controls as 7A101.",
    controlReasons: ["MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },

  // ─── Cat. 9 expansion — MTCR Cat I/II vehicles + propulsion ─────────
  {
    code: "9A001",
    jurisdiction: "US_CCL",
    title: "Aero gas turbine engines — specially designed",
    description:
      "Aero gas turbine engines with characteristics specially designed for military / dual-use applications. Catch for UAV powerplants.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A101",
    jurisdiction: "US_CCL",
    title: "Sounding rockets and rocket propellant systems",
    description:
      "Complete sounding rockets and rocket propellant systems with MTCR Cat. II characteristics. License required for most destinations.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A105",
    jurisdiction: "US_CCL",
    title: "MTCR Cat. II rocket motors and stages",
    description:
      "Liquid- and solid-propellant rocket motors and propellant stages usable in MTCR Cat. II vehicles. Strong-presumption-of-denial gates do NOT apply (Cat. II), but license required.",
    controlReasons: ["MT"],
    crossReferenceTopic: "rocket-propulsion-solid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },

  // ─── Cat. 9 — Software + Technology ──────────────────────────────────
  {
    code: "9D001",
    jurisdiction: "US_CCL",
    title: "Software for spacecraft development",
    description:
      "Software specially designed for development, production, or use of items in 9A. Most flight software, control-system simulators, and orbit-propagator design tools.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9D004",
    jurisdiction: "US_CCL",
    title: "Cat. 9 development software",
    description:
      "Source code for development / production of Cat. 9 items. Specifically scoped to non-MTCR items.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9E001",
    jurisdiction: "US_CCL",
    title: "Cat. 9 technology — development & production",
    description:
      "Technology for the development or production of items in 9A or 9B. Drawings, specifications, manufacturing processes, integration know-how — frequently the deemed-export trigger.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9E101",
    jurisdiction: "US_CCL",
    title: "Technology for MTCR Cat. II items",
    description:
      "Technology for development or production of MTCR Cat. II items in 9A101/9A105/etc. License required for most destinations including deemed-export to foreign nationals.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
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
