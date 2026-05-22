/**
 * Sprint B2 — US Munitions List (USML) — ITAR (22 CFR 121) — Aerospace subset.
 *
 * The USML is administered by the Directorate of Defense Trade Controls
 * (DDTC) under the Department of State. Items on the USML are subject to
 * ITAR — International Traffic in Arms Regulations (22 CFR Parts 120-130).
 *
 * ITAR jurisdiction is presumed for all USML items. De-minimis rule does
 * NOT apply to USML items — even 0.1% US-origin USML content in a foreign
 * product requires ITAR authorization.
 *
 * Source: 22 CFR § 121.1 (eCFR, accessed 2026-05-07)
 * https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121
 *
 * Aerospace-relevant USML categories:
 *   Cat. IV  — Missiles, rockets, and related articles
 *   Cat. XI  — Military electronics
 *   Cat. XII — Fire control, navigation, telemetry equipment
 *   Cat. XV  — Spacecraft and related articles (post-ECR 2014 remainder)
 *
 * NOT a verbatim transcription. Descriptions are paraphrases. Full text
 * at eCFR link above.
 *
 * ── Z23a (Tier 3 — Ontology Depth Completion, 2026-05-22) ──────────────
 * Extended XV(a) enumeration from 6 → 15 sub-paragraphs. The original
 * file (Sprint B2) covered the most common ECR-2014 holdovers; Z23a
 * added the remaining XV(a) sub-paragraphs per 22 CFR § 121.1 Cat. XV(a)
 * enumeration (a)(3) through (a)(13), aligning with Blueprint 3 § 3 and
 * the Caelex Trade Living Execution Plan § 7.
 *   Source: 22 CFR § 121.1 Cat. XV(a) (eCFR, accessed 2026-05-22)
 *   https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121/section-121.1
 */

import type { ClassificationEntry, ClassificationCoverage } from "./schema";

const SOURCE_BASE =
  "https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121";

const ASOF = "2026-05-07";

export const USML_COVERAGE: ClassificationCoverage = {
  jurisdiction: "USML",
  scope:
    "ITAR-controlled articles relevant to space: Cat. IV (propulsion/launch), Cat. XI (military electronics), Cat. XII (navigation/fire control), Cat. XV (spacecraft — post-ECR 2014 remainder).",
  excluded: [
    "Cat. I (firearms) — not aerospace-relevant",
    "Cat. II (artillery) — not aerospace-relevant",
    "Cat. III (ordnance) — not aerospace-relevant",
    "Cat. V (explosives) — covered only via cross-reference",
    "Cat. VI-X (various weapons) — not aerospace-relevant",
    "Cat. XIII (materials) — covered by cross-reference only",
    "Cat. XIV (toxicological agents) — out of scope",
    "Cat. XVI-XXI — not aerospace-relevant for this wave",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 500,
  caelexCoverageCount: 28,
};

export const USML_ENTRIES: ClassificationEntry[] = [
  // ─── Cat. IV — Rockets and Related Articles ─────────────────────────
  {
    code: "IV(a)(1)",
    jurisdiction: "USML",
    title: "Complete launch vehicles for MTCR-capable delivery",
    description:
      "Complete rockets and launch vehicles capable of delivering a payload to orbital altitude or meeting MTCR Cat. I parameters. Always ITAR — MTCR strong-presumption-of-denial applies.",
    controlReasons: ["NS", "MT", "SI"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "IV(b)",
    jurisdiction: "USML",
    title: "MANPADS (man-portable air-defense systems)",
    description:
      "Man-portable infrared-guided surface-to-air systems. Strictly controlled; subject to Leahy Law restrictions. Also MTCR Cat. I if above range threshold.",
    controlReasons: ["NS", "SI"],
    crossReferenceTopic: "manpads-and-anti-spacecraft",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "IV(c)",
    jurisdiction: "USML",
    title: "Anti-satellite and counter-space systems",
    description:
      "Systems designed or modified to destroy or disrupt space assets. No exceptions for 'inspection' or 'servicing' if designed to cause effects on satellites.",
    controlReasons: ["NS", "SI"],
    crossReferenceTopic: "manpads-and-anti-spacecraft",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "IV(d)(1)",
    jurisdiction: "USML",
    title: "Liquid-propellant rocket engines (ITAR)",
    description:
      "Liquid-propellant engines for USML Cat. IV(a) vehicles. Includes thrust-chamber assemblies, injectors, turbopump assemblies, and engine controllers.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
    notes:
      "Engine controllers (ECUs) are frequently the ITAR-controlled component even when the engine itself is licensed for export. Verify ECU origin in BoM.",
  },
  {
    code: "IV(d)(2)",
    jurisdiction: "USML",
    title: "Solid-propellant rocket motors (ITAR)",
    description:
      "Solid-propellant motors for USML Cat. IV(a) vehicles. Includes motor case, igniter, nozzle assembly, and propellant grain.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "rocket-propulsion-solid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "IV(h)(1)",
    jurisdiction: "USML",
    title: "High-temperature coatings and thermal protection (ITAR)",
    description:
      "Coatings and thermal-protection materials specifically designed for USML Cat. IV articles (combustion chambers, nozzles, reentry vehicle heat shields).",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-temp-coatings-aerospace",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. XI — Military Electronics ────────────────────────────────
  {
    code: "XI(c)(2)",
    jurisdiction: "USML",
    title: "Military satellite communication systems",
    description:
      "MILSATCOM ground terminals and space-borne elements with anti-jam waveforms, COMSEC, or LPI/LPD characteristics. TT&C systems using spread-spectrum or frequency-hopping for anti-jam remain USML XI.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. XII — Navigation, Telemetry, and Fire Control ─────────────
  {
    code: "XII(c)",
    jurisdiction: "USML",
    title: "Military inertial navigation systems",
    description:
      "INS/IMU with performance above defined thresholds for military applications; or designed/modified for use in USML Cat. IV articles.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "XII(d)",
    jurisdiction: "USML",
    title: "Military GNSS receivers and related equipment",
    description:
      "GNSS receivers designed/modified for use with USML articles, or with military anti-jam / anti-spoof capabilities above defined thresholds.",
    controlReasons: ["NS"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. XV — Spacecraft and Related Articles ──────────────────────
  {
    code: "XV(a)(1)",
    jurisdiction: "USML",
    title: "Military and intelligence spacecraft",
    description:
      "Spacecraft specifically designed, modified, or configured for intelligence gathering, military communication, or military reconnaissance. Post-ECR 2014 remainder that did NOT move to ECCN 9A515.",
    controlReasons: ["NS", "SI"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "The ECR 2014 moved most commercial sats to CCL 9A515. Items that remain USML XV(a)(1) must have a DDTC license (DSP-5 or TAA) for export or re-transfer.",
  },
  {
    code: "XV(a)(2)",
    jurisdiction: "USML",
    title: "Rendezvous and proximity operations (ITAR)",
    description:
      "Spacecraft specifically designed for rendezvous, proximity operations, docking, or inspection of another space object. RPO-capable systems require DDTC determination.",
    controlReasons: ["NS"],
    crossReferenceTopic: "in-orbit-servicing-rpo",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "Ambiguous boundary: in-orbit servicing for debris removal may be XV(a)(2) even if commercial intent. Seek DDTC commodity jurisdiction (CJ) determination.",
  },
  {
    code: "XV(a)(7)",
    jurisdiction: "USML",
    title: "Spacecraft with military-grade payload capabilities",
    description:
      "Spacecraft with payload capabilities meeting specific performance thresholds (see XV(a)(7)(i) for EO, XV(a)(7)(ii) for SAR). Catch-all for high-performance military payloads.",
    controlReasons: ["NS", "SI"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "XV(a)(7)(i)",
    jurisdiction: "USML",
    title: "High-resolution EO payloads on USML spacecraft",
    description:
      "EO imaging payloads with GSD ≤ 0.50 m (aperture ≥ 0.50 m or equivalent resolution). BIS 2024 Interim Final Rule retained this threshold — 0.80 m liberalization was rejected.",
    controlReasons: ["NS", "SI"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "Threshold: sub-0.50 m GSD = USML. 0.50 m to ~1.0 m = may qualify for ECCN 9A515.g. Commercial operators must verify exact GSD with DDTC CJ if borderline.",
  },
  {
    code: "XV(a)(7)(ii)",
    jurisdiction: "USML",
    title: "High-resolution SAR payloads on USML spacecraft",
    description:
      "SAR payloads with ground resolution above defined sensitivity/bandwidth thresholds in X, C, or L band. High-resolution interferometric SAR remains USML.",
    controlReasons: ["NS", "SI"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "XV(a)(8)",
    jurisdiction: "USML",
    title: "Anti-satellite payloads and counter-space weapons",
    description:
      "Spacecraft carrying payloads designed to disrupt, degrade, deny, deceive, or destroy other space objects or their ground segments.",
    controlReasons: ["NS", "SI"],
    crossReferenceTopic: "manpads-and-anti-spacecraft",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Z23a — XV(a) Full Enumeration (Tier 3, 2026-05-22) ───────────────
  // Per 22 CFR § 121.1 Cat. XV(a) sub-paragraphs (3)-(6) and (9)-(13).
  // Source: https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121/section-121.1
  // These complete the XV(a) enumeration the original Sprint B2 dataset
  // (entries (1), (2), (7), (7)(i), (7)(ii), (8)) left incomplete.
  // ────────────────────────────────────────────────────────────────────
  {
    code: "XV(a)(3)",
    jurisdiction: "USML",
    title: "Spacecraft with SIGINT, MASINT, or HUMINT payloads",
    description:
      "Spacecraft specifically designed or modified to provide signals intelligence (SIGINT), measurement and signature intelligence (MASINT), or human-intelligence-derived payloads. Includes ELINT, COMINT, FISINT, RADINT, and similar intelligence-collection sub-types. No commercial dual-use carve-out.",
    controlReasons: ["NS", "SI"],
    crossReferenceTopic: null,
    sourceUrl: `${SOURCE_BASE}/section-121.1`,
    asOfDate: ASOF,
    notes:
      "Intelligence-gathering spacecraft remain firmly USML even when the bus itself is commercial. The PAYLOAD's intent is the determinative factor. Hosted-payload arrangements with classified tenants typically trigger Cat. XV(a)(3) for the entire spacecraft.",
  },
  {
    code: "XV(a)(4)",
    jurisdiction: "USML",
    title: "Spacecraft for autonomous detection and reaction to threats",
    description:
      "Spacecraft specifically designed or modified to autonomously detect and react to threats — including incoming kinetic, RF, or directed-energy attacks. Encompasses virtual-satellite constellations (distributed mission architectures with autonomous reconfiguration), defensive maneuvering, and threat-classification AI.",
    controlReasons: ["NS", "SI"],
    crossReferenceTopic: null,
    sourceUrl: `${SOURCE_BASE}/section-121.1`,
    asOfDate: ASOF,
    notes:
      "Defensive autonomy (threat detection, autonomous maneuvering away from a threat) is the discriminator. Routine collision-avoidance with passive debris is XV(a)(10), not (a)(4). Distinguishing between the two requires DDTC commodity-jurisdiction determination for borderline AI-controlled satellites.",
  },
  {
    code: "XV(a)(5)",
    jurisdiction: "USML",
    title: "Anti-satellite (ASAT) spacecraft",
    description:
      "Spacecraft specifically designed to inflict damage on another spacecraft, regardless of intent (kinetic, non-kinetic, electronic-warfare, or laser dazzle/blind). Companion to XV(a)(8) — (a)(5) controls the ASAT *vehicle*, (a)(8) controls the ASAT *payload* aboard another spacecraft.",
    controlReasons: ["NS", "SI"],
    crossReferenceTopic: "manpads-and-anti-spacecraft",
    sourceUrl: `${SOURCE_BASE}/section-121.1`,
    asOfDate: ASOF,
    notes:
      "Strict liability regime: DDTC has rejected 'inspection only' or 'debris removal only' justifications when the underlying vehicle has demonstrated kinetic-impact capability. RPO vehicles with close-approach maneuvering may be classified as either XV(a)(5) (ASAT-capable) or XV(a)(12) (servicing/inspection) depending on payload and operational concept.",
  },
  {
    code: "XV(a)(6)",
    jurisdiction: "USML",
    title: "Spacecraft for space-to-ground weapons functions",
    description:
      "Spacecraft specifically designed to deliver kinetic or directed-energy effects from orbit onto terrestrial, sea-borne, or atmospheric targets. Includes orbital strike platforms (kinetic rod / 'rod-from-god' concepts), space-based laser weapons, and any payload designed to release a weapon during atmospheric re-entry.",
    controlReasons: ["NS", "SI"],
    crossReferenceTopic: "manpads-and-anti-spacecraft",
    sourceUrl: `${SOURCE_BASE}/section-121.1`,
    asOfDate: ASOF,
    notes:
      "Note that XV(a)(6) is currently restricted by the Outer Space Treaty (1967) Article IV (no WMD in orbit) but conventional kinetic weapons are not prohibited by treaty. ITAR control persists regardless of treaty status.",
  },
  {
    code: "XV(a)(9)",
    jurisdiction: "USML",
    title: "Spacecraft providing GNSS-like PNT signal generation",
    description:
      "Spacecraft specifically designed to provide a global or regional positioning, navigation, and timing (PNT) signal comparable to GPS, Galileo, GLONASS, BeiDou, QZSS, or NavIC. Includes encrypted military PNT codes (M-code for GPS, PRS for Galileo). Generation of the PNT signal is the controlling activity — reception is XII(d).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: `${SOURCE_BASE}/section-121.1`,
    asOfDate: ASOF,
    notes:
      "Commercial GNSS-augmentation satellites (e.g. SBAS) may fall under ECCN 9A515 or 9A004 depending on signal characteristics. Direct generation of a primary PNT constellation signal is USML Cat. XV(a)(9). Pseudo-PNT services (e.g. ground-relay timing) are NOT in scope.",
  },
  {
    code: "XV(a)(10)",
    jurisdiction: "USML",
    title: "Spacecraft with autonomous collision-avoidance maneuvering",
    description:
      "Spacecraft specifically designed or modified to autonomously detect, track, and maneuver to avoid other space objects without ground-segment commanding. The autonomous element is the discriminator — ground-commanded conjunction-avoidance is NOT controlled under (a)(10).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: `${SOURCE_BASE}/section-121.1`,
    asOfDate: ASOF,
    notes:
      "Distinct from XV(a)(4) (autonomous threat detection): (a)(10) covers passive-object avoidance (debris, other satellites); (a)(4) covers active threat detection (incoming attacks). A spacecraft with both capabilities is typically classified under (a)(4), the more restrictive paragraph.",
  },
  {
    code: "XV(a)(11)",
    jurisdiction: "USML",
    title: "Sub-orbital re-entry vehicles for crew or cargo recovery",
    description:
      "Spacecraft or sub-orbital vehicles specifically designed for re-entry from orbital or sub-orbital trajectories carrying crew or cargo intended for recovery on Earth. Covers reusable crewed capsules with military hosting, cargo-return capsules with classified payloads, and re-entry test vehicles.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: null,
    sourceUrl: `${SOURCE_BASE}/section-121.1`,
    asOfDate: ASOF,
    notes:
      "Cross-controlled with MTCR Cat. I via re-entry vehicle technology. Commercial cargo-return capsules (e.g. SpaceX Dragon cargo) may be ECCN 9A004 if no DoD payload is hosted, but the heat-shield / TPS materials remain USML IV(h)(1). Caelex BoM-origin tracking should flag re-entry vehicles for individual DDTC determination.",
    mtcrCategory: "I",
  },
  {
    code: "XV(a)(12)",
    jurisdiction: "USML",
    title: "Spacecraft for in-orbit inspection or grappling",
    description:
      "Spacecraft specifically designed to perform close-approach inspection, grappling, docking, capture, or physical interaction with another spacecraft NOT under the same operator's control. Distinguishable from (a)(2) RPO by the involuntary nature — the target satellite has not consented to the interaction.",
    controlReasons: ["NS"],
    crossReferenceTopic: "in-orbit-servicing-rpo",
    sourceUrl: `${SOURCE_BASE}/section-121.1`,
    asOfDate: ASOF,
    notes:
      "DDTC has classified active-debris-removal (ADR) missions with non-cooperative targets under XV(a)(12) even where commercial intent is documented. Commercial servicing of own-fleet satellites is typically ECCN 9A515, but cross-operator servicing requires CJ determination.",
  },
  {
    code: "XV(a)(13)",
    jurisdiction: "USML",
    title: "Classified spacecraft (Executive Order 13526 catch-all)",
    description:
      "Any spacecraft, the existence, performance, or mission of which is classified pursuant to Executive Order 13526 (or successor). Catch-all paragraph that captures black-program satellites, classified hosted payloads, and any spacecraft whose mission profile is not publicly disclosed.",
    controlReasons: ["NS", "SI"],
    crossReferenceTopic: null,
    sourceUrl: `${SOURCE_BASE}/section-121.1`,
    asOfDate: ASOF,
    notes:
      "If a Caelex customer indicates is_classified=true (per Z25 typed attributes), XV(a)(13) is auto-applied regardless of other technical specifications. Commercial operators rarely interact with XV(a)(13), but commercial buses hosting a classified secondary payload may fall under this paragraph for the duration of the classified mission.",
  },

  {
    code: "XV(c)",
    jurisdiction: "USML",
    title: "Military satellite TT&C systems (USML XV)",
    description:
      "TT&C and inter-satellite communication systems specifically designed for USML XV spacecraft. Includes COMSEC-equipped TT&C.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "XV(e)(2)",
    jurisdiction: "USML",
    title: "Electric propulsion systems (USML)",
    description:
      "Electric propulsion systems specifically designed for USML XV spacecraft. Commercial Hall thrusters not meeting USML performance criteria may fall under ECCN 9A011.",
    controlReasons: ["NS"],
    crossReferenceTopic: "hall-thrusters-electric-propulsion",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "PCUs/PPUs (power-conditioning/processing units) are often the US-origin ITAR-controlled component. Check manufacturer origin before assuming commercial-grade exemption.",
  },
  {
    code: "XV(e)(8)",
    jurisdiction: "USML",
    title: "Spacecraft radiation-hardened electronics (USML)",
    description:
      "Rad-hard electronics meeting the most stringent USML XV performance criteria, or specifically designed for USML XV spacecraft systems.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "XV(e)(11)",
    jurisdiction: "USML",
    title: "Optical inter-satellite communication systems (USML)",
    description:
      "Free-space optical communication systems specifically designed for USML XV spacecraft. High-bandwidth laser comms with LPI characteristics may remain USML.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
];

/**
 * Lookup by USML category code (e.g. "XV(a)(1)").
 */
export function findUsmlEntry(code: string): ClassificationEntry | undefined {
  return USML_ENTRIES.find((e) => e.code === code);
}

/**
 * Lookup all USML entries for a given cross-reference topic slug.
 */
export function findUsmlEntriesByTopic(slug: string): ClassificationEntry[] {
  return USML_ENTRIES.filter((e) => e.crossReferenceTopic === slug);
}

/**
 * Returns true if this USML entry requires a DDTC license (DSP-5 or TAA).
 * All USML items require authorization — this is here to make the logic
 * explicit in the license-determination engine (Sprint B6).
 */
export function requiresItarLicense(_entry: ClassificationEntry): true {
  return true;
}
