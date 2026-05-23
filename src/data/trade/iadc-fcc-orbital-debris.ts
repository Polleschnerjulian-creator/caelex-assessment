/**
 * IADC + FCC + ESA + NASA + ISO + UN COPUOS Orbital Debris Mitigation
 * — first-class regulatory dataset.
 *
 * Covers the orbital-debris regulatory baseline that any space operator
 * must demonstrate compliance with, spanning international guidelines
 * (IADC, UN COPUOS), national rules (FCC, NASA, ESA, UK), and consensus
 * standards (ISO 24113).
 *
 * The space-debris regulatory layer is the **single most-cited compliance
 * gate** that blocks satellite operator licensing. FCC will deny a Part 25
 * earth-station / space-station authorisation if the debris-mitigation
 * showing is incomplete. ESA will deny an ESSB-ST-U-007 sign-off for
 * institutional missions. UK CAA will deny an SIA s.8 authorisation.
 * IADC + ISO 24113 are the "industry-consensus" floor that national
 * regulators bind against.
 *
 * **Major regulatory shifts (2022-2025):**
 *   - FCC 22-74 (Sept 2022) compressed the 25-year post-mission disposal
 *     guideline to **5 years** for new LEO sats, effective 2024. This is
 *     the single biggest debris-policy change since 2007.
 *   - ESA ESSB-ST-U-007 Rev. 2 (2023) adopted FCC-aligned 5-year PMD as
 *     the institutional standard for new ESA-funded LEO missions.
 *   - EU Space Act COM(2025) 335 Art. 32-35 (proposed) would impose
 *     binding debris-mitigation obligations across all EU operators —
 *     currently in trilogue, expected adoption 2026/2027.
 *   - UK CAA Spaceflight Activities Regulations 2021 already require an
 *     SIA s.8 debris-mitigation showing per launch / per spacecraft.
 *
 * **Quantitative thresholds that appear repeatedly:**
 *   - **5 years** — FCC 22-74 PMD limit for LEO sats licensed after 2024
 *   - **25 years** — Legacy IADC / NASA / pre-2024 FCC PMD limit
 *   - **1×10⁻⁴ (0.0001)** — Casualty risk threshold for uncontrolled re-entry
 *     (NASA-STD-8719.14C, FCC 25.114, ESA ESSB-ST-U-007, ISO 24113)
 *   - **200 km** above GEO — Graveyard orbit altitude for GEO disposal
 *   - **1×10⁻³ (0.001)** — Probability-of-explosion threshold (passivation)
 *
 * Sources (accessed 2026-05-23):
 *   - IADC-02-01 Rev. 3 "IADC Space Debris Mitigation Guidelines" (2020)
 *     https://www.iadc-home.org/documents_public/file_down/id/85
 *   - FCC 22-74 "Mitigation of Orbital Debris in the New Space Age" (2022)
 *     https://docs.fcc.gov/public/attachments/FCC-22-74A1.pdf
 *   - 47 CFR § 25.114(d)(14) — FCC application requirements for orbital
 *     debris mitigation
 *     https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25
 *   - NASA-STD-8719.14C Rev. C "Process for Limiting Orbital Debris" (2021)
 *     https://standards.nasa.gov/standard/NASA/NASA-STD-871914
 *   - NASA Orbital Debris Program Office DAS (Debris Assessment Software)
 *     https://orbitaldebris.jsc.nasa.gov/mitigation/das.html
 *   - ESA ESSB-ST-U-007 Rev. 2 "Space Debris Mitigation Requirements" (2023)
 *     https://ecss.nl/standard/essb-st-u-007-rev-2-space-debris-mitigation/
 *   - ESA ESSB-HB-U-002 "Space Debris Mitigation Compliance Verification
 *     Guidelines" (2015)
 *     https://ecss.nl/hbstms/essb-hb-u-002-space-debris-mitigation-verification/
 *   - ISO 24113:2019 "Space systems — Space debris mitigation requirements"
 *     https://www.iso.org/standard/72383.html
 *   - UN COPUOS Space Debris Mitigation Guidelines, A/62/20 Annex (2007)
 *     https://www.unoosa.org/pdf/publications/st_space_49E.pdf
 *   - EU Space Act COM(2025) 335 Art. 32-35
 *     https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335
 *   - UK Space Industry Act 2018 s.8 + Spaceflight Activities Regulations
 *     2021 (SI 2021/792) reg. 27-31 (debris mitigation)
 *     https://www.legislation.gov.uk/uksi/2021/792/contents
 *
 * NOT a verbatim transcription. Descriptions are paraphrased compliance-
 * level summaries; authoritative interpretation requires the specific
 * regulator's review (FCC IBFS, ESA mission review, UK CAA application).
 */

/** As-of date for the file as a whole. */
export const IADC_FCC_DEBRIS_AS_OF = "2026-05-23";

/** Regime — the regulator or standard-issuer the requirement comes from. */
export type DebrisRegime =
  | "IADC" // IADC-02-01 Rev. 3
  | "FCC" // FCC 22-74 + 47 CFR § 25.114
  | "NASA-STD" // NASA-STD-8719.14C
  | "ESA-STD" // ESA ESSB-ST-U-007 Rev. 2
  | "ISO-24113" // ISO 24113:2019
  | "UN-COPUOS" // UN A/62/20 Annex
  | "EU-SPACE-ACT" // COM(2025) 335 Art. 32-35
  | "UK-SIA"; // UK SIA 2018 + 2021 Regs

/** Functional category of a debris-mitigation requirement. */
export type DebrisRequirementCategory =
  | "POST_MISSION_DISPOSAL" // PMD — deorbit / graveyard / direct re-entry
  | "PASSIVATION" // depleting energy sources after end-of-life
  | "COLLISION_AVOIDANCE" // operational COLA
  | "EXPLOSION_PREVENTION" // design choices that prevent break-up
  | "CASUALTY_RISK" // re-entry safety (humans on ground)
  | "LIFETIME_LIMITS" // 25-yr or 5-yr orbital lifetime cap
  | "TRACKING_DATA" // sharing TLE / position data
  | "DEMISABILITY" // design for full atmospheric burn-up
  | "BREAK_UP_PREVENTION" // mission ops to avoid in-orbit break-up
  | "FRAGMENT_RELEASE" // mission-related debris (lens caps, bolts)
  | "CONJUNCTION_REPORTING" // sharing close-approach data
  | "DISPOSAL_VERIFICATION"; // proving the disposal happened

/** Orbital regimes — where a rule applies. */
export type DebrisOrbitalRegime =
  | "LEO" // ≤ 2000 km altitude
  | "MEO" // 2000-35,786 km
  | "GEO" // 35,786 km ± 200 km
  | "HEO" // Highly elliptical (Molniya etc.)
  | "BEYOND_EARTH" // Lunar, L1/L2, interplanetary
  | "ANY"; // applies everywhere

/** Binding nature — how strict the rule is. */
export type DebrisBindingNature =
  | "MANDATORY" // Binding rule of law (FCC, UK SIA, future EU)
  | "GUIDELINE" // Non-binding international guideline (IADC, UN COPUOS)
  | "STANDARD"; // Consensus standard (ISO 24113, ECSS)

/** One entry — a single debris-mitigation requirement from one regime. */
export interface DebrisRequirementEntry {
  /** Unique code, e.g. "FCC-25.114-PMD-5YR", "IADC-5.3.2". */
  code: string;

  /** Regulator or standard-issuer. */
  regime: DebrisRegime;

  /** Functional category. */
  category: DebrisRequirementCategory;

  /** Headline (≤120 chars). */
  title: string;

  /** Paraphrased compliance-level description. */
  description: string;

  /** Effective-from date (ISO). */
  effectiveFrom: string;

  /** Citation — exact rule reference. */
  citation: string;

  /** Source URL. */
  sourceUrl: string;

  /** Orbital regimes where this rule applies. */
  orbitalRegimes: ReadonlyArray<DebrisOrbitalRegime>;

  /** Quantitative threshold, if any. */
  threshold?: {
    /** Parameter name (e.g. "postMissionLifetimeYears"). */
    parameter: string;
    /** Comparison operator. */
    operator: "<=" | ">=" | "<" | ">" | "=";
    /** Numeric value. */
    value: number;
    /** Unit. */
    unit: string;
  };

  /** Binding nature. */
  bindingNature: DebrisBindingNature;

  /** Operator scope this applies to. */
  operatorScope: ReadonlyArray<
    "COMMERCIAL" | "GOVERNMENT" | "ACADEMIC" | "ALL"
  >;

  /** Related codes in this dataset (cross-references). */
  relatedCodes?: ReadonlyArray<string>;

  /** Clarification notes. */
  notes?: string;
}

// ============================================================================
// IADC-02-01 Rev. 3 — IADC Space Debris Mitigation Guidelines (2020)
// ============================================================================

const IADC_ENTRIES: ReadonlyArray<DebrisRequirementEntry> = [
  {
    code: "IADC-5.1",
    regime: "IADC",
    category: "FRAGMENT_RELEASE",
    title: "Limitation of debris released during normal operations",
    description:
      "Spacecraft and orbital stages should be designed to not release " +
      "debris during normal operations. Examples of operational debris that " +
      "are no longer acceptable: lens caps, bolt-catcher residues, payload " +
      "shrouds released in orbit. Solid rocket motor slag should be minimised.",
    effectiveFrom: "2020-06-01",
    citation: "IADC-02-01 Rev. 3 § 5.1",
    sourceUrl: "https://www.iadc-home.org/documents_public/file_down/id/85",
    orbitalRegimes: ["ANY"],
    bindingNature: "GUIDELINE",
    operatorScope: ["ALL"],
  },
  {
    code: "IADC-5.2.1",
    regime: "IADC",
    category: "BREAK_UP_PREVENTION",
    title: "Minimise potential for on-orbit break-ups during operations",
    description:
      "Design and operate spacecraft and orbital stages to minimise the " +
      "probability of accidental break-ups during their operational phases. " +
      "Stored energy sources (batteries, fuel tanks, pressurants) must have " +
      "redundancy and failure modes that do not lead to fragmentation.",
    effectiveFrom: "2020-06-01",
    citation: "IADC-02-01 Rev. 3 § 5.2.1",
    sourceUrl: "https://www.iadc-home.org/documents_public/file_down/id/85",
    orbitalRegimes: ["ANY"],
    bindingNature: "GUIDELINE",
    operatorScope: ["ALL"],
    relatedCodes: ["NASA-STD-4.4", "ISO-24113-6.2.2"],
  },
  {
    code: "IADC-5.2.2",
    regime: "IADC",
    category: "PASSIVATION",
    title: "Minimise potential for post-mission break-ups (passivation)",
    description:
      "All on-board sources of stored energy should be depleted or made safe " +
      "when they are no longer required for mission operations or post-" +
      "mission disposal. This includes: residual propellants (vented or " +
      "burned), pressurants (vented), batteries (discharged + isolated), " +
      "flywheels (spun down).",
    effectiveFrom: "2020-06-01",
    citation: "IADC-02-01 Rev. 3 § 5.2.2",
    sourceUrl: "https://www.iadc-home.org/documents_public/file_down/id/85",
    orbitalRegimes: ["ANY"],
    bindingNature: "GUIDELINE",
    operatorScope: ["ALL"],
    relatedCodes: ["FCC-25.114-PASS", "NASA-STD-4.4", "ISO-24113-6.3.2"],
  },
  {
    code: "IADC-5.3.1",
    regime: "IADC",
    category: "POST_MISSION_DISPOSAL",
    title: "LEO disposal — 25-year lifetime limit (legacy IADC standard)",
    description:
      "Spacecraft and orbital stages operating in LEO should be removed " +
      "from orbit within 25 years after the end of mission. This is the " +
      "legacy IADC standard, since superseded by FCC 5-year rule (FCC " +
      "22-74) for US-licensed sats and adopted by ESA for new missions.",
    effectiveFrom: "2007-10-01",
    citation: "IADC-02-01 Rev. 3 § 5.3.1",
    sourceUrl: "https://www.iadc-home.org/documents_public/file_down/id/85",
    orbitalRegimes: ["LEO"],
    threshold: {
      parameter: "postMissionLifetimeYears",
      operator: "<=",
      value: 25,
      unit: "years",
    },
    bindingNature: "GUIDELINE",
    operatorScope: ["ALL"],
    relatedCodes: ["FCC-22-74-5YR", "ESA-ESSB-U-007-PMD-5YR"],
    notes:
      "Superseded for US-licensed LEO sats by FCC 22-74 (5-year rule). " +
      "Still the international IADC baseline for non-US operators that " +
      "haven't adopted the 5-year shift.",
  },
  {
    code: "IADC-5.3.2",
    regime: "IADC",
    category: "POST_MISSION_DISPOSAL",
    title: "GEO disposal — graveyard orbit (≥235 km above GEO)",
    description:
      "Spacecraft in or near the geostationary region should be transferred " +
      "to a disposal orbit at end of mission. Minimum perigee altitude " +
      "above GEO must be 235 km plus a margin accounting for solar radiation " +
      "pressure perturbations and luni-solar gravity. Standard formula: " +
      "Δh = 235 + 1000·CR·A/m (km), where CR is reflectivity coefficient.",
    effectiveFrom: "2007-10-01",
    citation: "IADC-02-01 Rev. 3 § 5.3.2",
    sourceUrl: "https://www.iadc-home.org/documents_public/file_down/id/85",
    orbitalRegimes: ["GEO"],
    threshold: {
      parameter: "graveyardOrbitMarginKm",
      operator: ">=",
      value: 235,
      unit: "km above GEO",
    },
    bindingNature: "GUIDELINE",
    operatorScope: ["ALL"],
    relatedCodes: ["FCC-25.114-GEO", "ESA-ESSB-U-007-GEO", "ISO-24113-6.3.3"],
  },
  {
    code: "IADC-5.3.3",
    regime: "IADC",
    category: "POST_MISSION_DISPOSAL",
    title: "Intermediate orbital regions — case-by-case disposal",
    description:
      "Spacecraft in MEO, HEO and other regions outside LEO and GEO should " +
      "be disposed of via case-by-case analysis. Options include: re-entry " +
      "to LEO and 25-yr/5-yr decay, graveyard orbits above GEO, or escape-" +
      "trajectory disposal. The chosen approach must be justified in the " +
      "mission's debris-mitigation plan.",
    effectiveFrom: "2020-06-01",
    citation: "IADC-02-01 Rev. 3 § 5.3.3",
    sourceUrl: "https://www.iadc-home.org/documents_public/file_down/id/85",
    orbitalRegimes: ["MEO", "HEO"],
    bindingNature: "GUIDELINE",
    operatorScope: ["ALL"],
  },
  {
    code: "IADC-5.4",
    regime: "IADC",
    category: "COLLISION_AVOIDANCE",
    title: "Collision avoidance during launch and operations",
    description:
      "Spacecraft operators should implement Conjunction Assessment " +
      "(CA) procedures using Space-Track / 18 SDS / commercial CSpOC data, " +
      "and execute manoeuvres when the probability of collision exceeds a " +
      "defined threshold (typically 1×10⁻⁴ per conjunction). Manoeuvres " +
      "must be coordinated with neighbouring operators.",
    effectiveFrom: "2020-06-01",
    citation: "IADC-02-01 Rev. 3 § 5.4",
    sourceUrl: "https://www.iadc-home.org/documents_public/file_down/id/85",
    orbitalRegimes: ["LEO", "MEO", "GEO", "HEO"],
    threshold: {
      parameter: "collisionProbabilityThreshold",
      operator: "<=",
      value: 0.0001,
      unit: "probability per conjunction",
    },
    bindingNature: "GUIDELINE",
    operatorScope: ["ALL"],
    relatedCodes: ["NASA-STD-4.5", "FCC-25.114-COLA"],
  },
];

// ============================================================================
// FCC 22-74 + 47 CFR § 25.114 — FCC Orbital Debris Rules
// ============================================================================

const FCC_ENTRIES: ReadonlyArray<DebrisRequirementEntry> = [
  {
    code: "FCC-22-74-5YR",
    regime: "FCC",
    category: "POST_MISSION_DISPOSAL",
    title: "LEO 5-year post-mission disposal rule (replaces 25-year)",
    description:
      "Spacecraft operating below 2000 km altitude must dispose of by re-" +
      "entry within 5 years of the end of mission. Applies to all FCC-" +
      "licensed (Part 25, Part 5, Part 97) spacecraft licensed on or after " +
      "September 29, 2024, with a 2-year grandfather period for systems " +
      "with applications pending as of Sept 29, 2022. This is the single " +
      "biggest US debris-policy change since the 2007 IADC guidelines.",
    effectiveFrom: "2024-09-29",
    citation: "FCC 22-74 ¶ 12-30 + 47 CFR § 25.114(d)(14)(vi)",
    sourceUrl: "https://docs.fcc.gov/public/attachments/FCC-22-74A1.pdf",
    orbitalRegimes: ["LEO"],
    threshold: {
      parameter: "postMissionLifetimeYears",
      operator: "<=",
      value: 5,
      unit: "years",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["IADC-5.3.1", "ESA-ESSB-U-007-PMD-5YR"],
    notes:
      "Compliance demonstrated via DAS (Debris Assessment Software) " +
      "analysis showing the spacecraft will re-enter Earth's atmosphere " +
      "within 5 years from end of mission under expected solar conditions.",
  },
  {
    code: "FCC-25.114-PMD-PLAN",
    regime: "FCC",
    category: "DISPOSAL_VERIFICATION",
    title: "FCC application — orbital debris mitigation plan",
    description:
      "FCC Part 25 (commercial) and Part 5 (experimental) spacecraft " +
      "applications must include a detailed orbital debris mitigation plan " +
      "addressing: (i) operational debris release, (ii) collision risk, " +
      "(iii) probability of break-up, (iv) post-mission disposal, (v) " +
      "casualty risk on re-entry. Plan must include quantitative analysis " +
      "with documented assumptions.",
    effectiveFrom: "2004-06-21",
    citation: "47 CFR § 25.114(d)(14)",
    sourceUrl:
      "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25",
    orbitalRegimes: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FCC-22-74-5YR", "FCC-25.114-CASUALTY"],
  },
  {
    code: "FCC-25.114-CASUALTY",
    regime: "FCC",
    category: "CASUALTY_RISK",
    title: "Casualty risk threshold for uncontrolled re-entry",
    description:
      "FCC application must demonstrate that the casualty risk from " +
      "uncontrolled re-entry of the spacecraft does not exceed 1 in 10,000 " +
      "(1×10⁻⁴). Demisability analysis must show that surviving fragments " +
      "have a low probability of impacting populated areas. For higher-mass " +
      "spacecraft, controlled re-entry over open ocean is typically required.",
    effectiveFrom: "2004-06-21",
    citation: "47 CFR § 25.114(d)(14)(iv) + FCC 22-74 ¶ 53-58",
    sourceUrl:
      "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25",
    orbitalRegimes: ["LEO", "MEO", "HEO"],
    threshold: {
      parameter: "casualtyRiskFactor",
      operator: "<=",
      value: 0.0001,
      unit: "probability per re-entry",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: [
      "NASA-STD-4.7",
      "ESA-ESSB-U-007-CASUALTY",
      "ISO-24113-6.3.4",
    ],
  },
  {
    code: "FCC-25.114-PASS",
    regime: "FCC",
    category: "PASSIVATION",
    title: "Passivation of stored energy sources required at end-of-life",
    description:
      "FCC requires that all on-board sources of stored energy are " +
      "depleted or rendered safe at end-of-life. Specific requirements: " +
      "(a) propellant tanks vented to ≤1 bar residual pressure, (b) " +
      "batteries discharged and isolated from solar arrays, (c) momentum " +
      "wheels and reaction wheels spun down, (d) pressurised tanks vented, " +
      "(e) explosive devices (pyros) discharged or made-safe.",
    effectiveFrom: "2004-06-21",
    citation: "47 CFR § 25.114(d)(14)(ii)",
    sourceUrl:
      "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25",
    orbitalRegimes: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["IADC-5.2.2", "NASA-STD-4.4", "ISO-24113-6.3.2"],
  },
  {
    code: "FCC-25.114-GEO",
    regime: "FCC",
    category: "POST_MISSION_DISPOSAL",
    title: "GEO disposal orbit — minimum 200-300 km above GEO",
    description:
      "FCC-licensed GEO spacecraft must be transferred to a disposal orbit " +
      "at end-of-mission with sufficient altitude above the GEO ring to " +
      "avoid interference with operational GEO sats. Standard formula: " +
      "minimum perigee altitude of 200 + 1000·CR·A/m (km) above GEO, where " +
      "CR is the spacecraft's reflectivity coefficient and A/m is the area-" +
      "to-mass ratio.",
    effectiveFrom: "2004-06-21",
    citation: "47 CFR § 25.114(d)(14)(v) + FCC 22-74 ¶ 61",
    sourceUrl:
      "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25",
    orbitalRegimes: ["GEO"],
    threshold: {
      parameter: "graveyardOrbitMarginKm",
      operator: ">=",
      value: 200,
      unit: "km above GEO",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["IADC-5.3.2", "ESA-ESSB-U-007-GEO"],
  },
  {
    code: "FCC-25.114-COLA",
    regime: "FCC",
    category: "COLLISION_AVOIDANCE",
    title: "Collision avoidance capability and procedures",
    description:
      "FCC applicants must describe their collision-avoidance procedures, " +
      "including: (a) capability to perform avoidance manoeuvres (i.e. " +
      "propulsion), (b) procedures for receiving conjunction warnings from " +
      "18 SDS / Space-Track, (c) thresholds for manoeuvre execution, (d) " +
      "coordination with operators of conjunction-partner spacecraft. " +
      "Non-manoeuvrable spacecraft must rely on screening-volume sizing and " +
      "passive collision risk acceptance.",
    effectiveFrom: "2024-09-29",
    citation: "47 CFR § 25.114(d)(14)(iii) + FCC 22-74 ¶ 88-97",
    sourceUrl:
      "https://www.ecfr.gov/current/title-47/chapter-I/subchapter-B/part-25",
    orbitalRegimes: ["LEO", "MEO", "GEO"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["IADC-5.4", "NASA-STD-4.5"],
  },
  {
    code: "FCC-25.114-MANEUVERABILITY",
    regime: "FCC",
    category: "COLLISION_AVOIDANCE",
    title: "Manoeuvrability requirement for large LEO constellations",
    description:
      "Spacecraft operating in LEO at altitudes >400 km that are part of " +
      "a constellation of 100+ sats must have propulsion (manoeuvrability) " +
      "sufficient to perform collision-avoidance manoeuvres. Non-" +
      "manoeuvrable cubesats are still permitted below this threshold, " +
      "but the operator must demonstrate the constellation's aggregate " +
      "debris impact is acceptable.",
    effectiveFrom: "2024-09-29",
    citation: "FCC 22-74 ¶ 100-108",
    sourceUrl: "https://docs.fcc.gov/public/attachments/FCC-22-74A1.pdf",
    orbitalRegimes: ["LEO"],
    threshold: {
      parameter: "constellationSize",
      operator: ">=",
      value: 100,
      unit: "sats",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["FCC-25.114-COLA"],
    notes:
      "First explicit rule that distinguishes constellation operators " +
      "from single-spacecraft operators. SpaceX Starlink, Iridium NEXT, " +
      "Planet Labs all fall in scope.",
  },
  {
    code: "FCC-22-74-TRACKING",
    regime: "FCC",
    category: "TRACKING_DATA",
    title: "Tracking data sharing with 18 SDS / Space-Track",
    description:
      "FCC-licensed operators must share spacecraft state-vector / TLE " +
      "data with the US Space Force 18 SDS (formerly JFCC SPACE) so that " +
      "the catalogue remains accurate. Constellations must share planned " +
      "manoeuvre schedules with sufficient advance notice (typically 72h) " +
      "to allow conjunction screening updates.",
    effectiveFrom: "2024-09-29",
    citation: "FCC 22-74 ¶ 110-118",
    sourceUrl: "https://docs.fcc.gov/public/attachments/FCC-22-74A1.pdf",
    orbitalRegimes: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FCC-25.114-COLA"],
  },
];

// ============================================================================
// NASA-STD-8719.14C Rev. C — Process for Limiting Orbital Debris (2021)
// ============================================================================

const NASA_STD_ENTRIES: ReadonlyArray<DebrisRequirementEntry> = [
  {
    code: "NASA-STD-4.3",
    regime: "NASA-STD",
    category: "POST_MISSION_DISPOSAL",
    title: "NASA missions — disposal options A/B/C/D analysis",
    description:
      "NASA-funded missions must analyse disposal via one of four options: " +
      "(A) atmospheric re-entry within 25 years (legacy) or 5 years (FCC- " +
      "aligned for new missions), (B) storage orbit (graveyard above GEO), " +
      "(C) heliocentric / Earth-escape, (D) direct controlled re-entry. " +
      "Analysis must be performed using DAS (Debris Assessment Software) " +
      "or ORSAT (Object Reentry Survival Analysis Tool).",
    effectiveFrom: "2021-11-23",
    citation: "NASA-STD-8719.14C Rev. C § 4.3",
    sourceUrl: "https://standards.nasa.gov/standard/NASA/NASA-STD-871914",
    orbitalRegimes: ["ANY"],
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT"],
    relatedCodes: ["FCC-22-74-5YR", "IADC-5.3.1"],
  },
  {
    code: "NASA-STD-4.4",
    regime: "NASA-STD",
    category: "PASSIVATION",
    title: "NASA — full passivation analysis required",
    description:
      "NASA missions must demonstrate that all stored energy sources are " +
      "depleted/passivated within 1 year of end-of-mission. Documented " +
      "passivation sequence required for: residual propellants, pressurants, " +
      "batteries (state-of-charge ≤ depleted threshold), reaction wheels " +
      "(angular momentum below safe threshold), pyrotechnic devices. " +
      "Demonstration of P(failure-leading-to-explosion) ≤ 10⁻³.",
    effectiveFrom: "2021-11-23",
    citation: "NASA-STD-8719.14C Rev. C § 4.4",
    sourceUrl: "https://standards.nasa.gov/standard/NASA/NASA-STD-871914",
    orbitalRegimes: ["ANY"],
    threshold: {
      parameter: "explosionProbability",
      operator: "<=",
      value: 0.001,
      unit: "probability over mission lifetime",
    },
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT"],
    relatedCodes: ["IADC-5.2.2", "FCC-25.114-PASS", "ISO-24113-6.3.2"],
  },
  {
    code: "NASA-STD-4.5",
    regime: "NASA-STD",
    category: "COLLISION_AVOIDANCE",
    title: "NASA — collision-avoidance manoeuvre threshold 1×10⁻⁴",
    description:
      "NASA missions must execute collision-avoidance manoeuvres when " +
      "the probability of collision (Pc) exceeds 1×10⁻⁴ per conjunction. " +
      "Standard practice: 18 SDS provides conjunction data messages (CDMs), " +
      "NASA Goddard's Conjunction Assessment Risk Analysis (CARA) team " +
      "evaluates, mission operations centre executes manoeuvres.",
    effectiveFrom: "2021-11-23",
    citation: "NASA-STD-8719.14C Rev. C § 4.5",
    sourceUrl: "https://standards.nasa.gov/standard/NASA/NASA-STD-871914",
    orbitalRegimes: ["LEO", "MEO", "GEO", "HEO"],
    threshold: {
      parameter: "collisionProbabilityThreshold",
      operator: "<=",
      value: 0.0001,
      unit: "probability per conjunction",
    },
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT"],
    relatedCodes: ["IADC-5.4", "FCC-25.114-COLA"],
  },
  {
    code: "NASA-STD-4.7",
    regime: "NASA-STD",
    category: "CASUALTY_RISK",
    title: "NASA — casualty risk ≤ 1×10⁻⁴ for uncontrolled re-entry",
    description:
      "NASA missions undergoing uncontrolled re-entry must demonstrate " +
      "casualty risk ≤ 1×10⁻⁴ for any individual on Earth's surface. " +
      "Compliance demonstrated via ORSAT analysis (Object Reentry Survival " +
      "Analysis Tool) showing all surviving fragments meet the threshold. " +
      "High-risk missions require controlled re-entry over open ocean " +
      "(SPOUA — South Pacific Ocean Uninhabited Area).",
    effectiveFrom: "2021-11-23",
    citation: "NASA-STD-8719.14C Rev. C § 4.7",
    sourceUrl: "https://standards.nasa.gov/standard/NASA/NASA-STD-871914",
    orbitalRegimes: ["LEO", "MEO", "HEO"],
    threshold: {
      parameter: "casualtyRiskFactor",
      operator: "<=",
      value: 0.0001,
      unit: "probability per re-entry",
    },
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT"],
    relatedCodes: ["FCC-25.114-CASUALTY", "ESA-ESSB-U-007-CASUALTY"],
  },
  {
    code: "NASA-STD-DAS",
    regime: "NASA-STD",
    category: "DISPOSAL_VERIFICATION",
    title: "NASA — DAS (Debris Assessment Software) analysis required",
    description:
      "All NASA-funded space missions must run DAS analysis to verify " +
      "compliance with NASA-STD-8719.14C. DAS computes: post-mission " +
      "orbital lifetime, collision risk (LARGE — Lifetime Assessment Risk " +
      "of GEneration), casualty risk on re-entry, debris flux integrals. " +
      "Output is the mission's Orbital Debris Assessment Report (ODAR).",
    effectiveFrom: "2021-11-23",
    citation: "NASA-STD-8719.14C Rev. C § 5 + ODAR template",
    sourceUrl: "https://orbitaldebris.jsc.nasa.gov/mitigation/das.html",
    orbitalRegimes: ["ANY"],
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT"],
    relatedCodes: ["NASA-STD-4.3", "NASA-STD-4.7"],
  },
];

// ============================================================================
// ESA ESSB-ST-U-007 Rev. 2 — Space Debris Mitigation Requirements (2023)
// ============================================================================

const ESA_ENTRIES: ReadonlyArray<DebrisRequirementEntry> = [
  {
    code: "ESA-ESSB-U-007-PMD-5YR",
    regime: "ESA-STD",
    category: "POST_MISSION_DISPOSAL",
    title: "ESA — 5-year LEO PMD adopted (FCC-aligned)",
    description:
      "ESA missions in LEO must dispose of by re-entry within 5 years of " +
      "end-of-mission, aligning with FCC 22-74. Applies to new ESA-funded " +
      "missions starting Phase B from 2024 onward. Legacy ESA missions in " +
      "operation may continue under the 25-year ESA-ESSB Rev. 1 baseline.",
    effectiveFrom: "2024-01-01",
    citation: "ESA ESSB-ST-U-007 Rev. 2 § 6.3.1",
    sourceUrl:
      "https://ecss.nl/standard/essb-st-u-007-rev-2-space-debris-mitigation/",
    orbitalRegimes: ["LEO"],
    threshold: {
      parameter: "postMissionLifetimeYears",
      operator: "<=",
      value: 5,
      unit: "years",
    },
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: ["FCC-22-74-5YR", "IADC-5.3.1"],
    notes:
      "First major institutional space agency to adopt the FCC 5-year " +
      "rule. JAXA and Roscosmos still on 25-year IADC baseline.",
  },
  {
    code: "ESA-ESSB-U-007-GEO",
    regime: "ESA-STD",
    category: "POST_MISSION_DISPOSAL",
    title: "ESA — GEO disposal orbit ≥ 300 km above GEO (conservative)",
    description:
      "ESA missions in GEO must transfer to a disposal orbit with perigee " +
      "altitude ≥ 300 km above the geostationary ring (more conservative " +
      "than FCC's 200 km and IADC's 235 km). ESA accepts additional fuel " +
      "reserves to ensure margin against perturbations over 100-year " +
      "horizon.",
    effectiveFrom: "2023-06-01",
    citation: "ESA ESSB-ST-U-007 Rev. 2 § 6.3.3",
    sourceUrl:
      "https://ecss.nl/standard/essb-st-u-007-rev-2-space-debris-mitigation/",
    orbitalRegimes: ["GEO"],
    threshold: {
      parameter: "graveyardOrbitMarginKm",
      operator: ">=",
      value: 300,
      unit: "km above GEO",
    },
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT"],
    relatedCodes: ["FCC-25.114-GEO", "IADC-5.3.2"],
  },
  {
    code: "ESA-ESSB-U-007-CASUALTY",
    regime: "ESA-STD",
    category: "CASUALTY_RISK",
    title: "ESA — casualty risk ≤ 1×10⁻⁴ (aligned with NASA/FCC)",
    description:
      "ESA missions must demonstrate casualty risk ≤ 1×10⁻⁴ for " +
      "uncontrolled re-entry. ESA accepts both DRAMA (ESA's tool) and " +
      "NASA's ORSAT for compliance demonstrations. High-mass missions " +
      "(>2000 kg) typically require controlled re-entry into SPOUA.",
    effectiveFrom: "2023-06-01",
    citation: "ESA ESSB-ST-U-007 Rev. 2 § 6.4",
    sourceUrl:
      "https://ecss.nl/standard/essb-st-u-007-rev-2-space-debris-mitigation/",
    orbitalRegimes: ["LEO", "MEO", "HEO"],
    threshold: {
      parameter: "casualtyRiskFactor",
      operator: "<=",
      value: 0.0001,
      unit: "probability per re-entry",
    },
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT", "COMMERCIAL"],
    relatedCodes: ["NASA-STD-4.7", "FCC-25.114-CASUALTY"],
  },
  {
    code: "ESA-ESSB-U-007-VERIFY",
    regime: "ESA-STD",
    category: "DISPOSAL_VERIFICATION",
    title: "ESA — Compliance Verification via ESSB-HB-U-002 Handbook",
    description:
      "ESA missions must demonstrate compliance with ESSB-ST-U-007 via the " +
      "ESSB-HB-U-002 Compliance Verification Guidelines. Verification is " +
      "performed at four phase reviews: SRR, PDR, CDR, ORR. Mission cannot " +
      "be authorised for launch without sign-off from ESA's Independent " +
      "Compliance Verification Authority.",
    effectiveFrom: "2015-01-01",
    citation: "ESA ESSB-HB-U-002",
    sourceUrl:
      "https://ecss.nl/hbstms/essb-hb-u-002-space-debris-mitigation-verification/",
    orbitalRegimes: ["ANY"],
    bindingNature: "STANDARD",
    operatorScope: ["GOVERNMENT"],
  },
];

// ============================================================================
// ISO 24113:2019 — Space debris mitigation requirements
// ============================================================================

const ISO_ENTRIES: ReadonlyArray<DebrisRequirementEntry> = [
  {
    code: "ISO-24113-6.2.2",
    regime: "ISO-24113",
    category: "BREAK_UP_PREVENTION",
    title: "ISO 24113 § 6.2.2 — Prevent break-up during operations",
    description:
      "Spacecraft and orbital stages shall be designed and operated so " +
      "that the probability of an accidental break-up during their " +
      "operational phase remains below 1×10⁻³. Design must include " +
      "redundancy for stored-energy components and failure modes that do " +
      "not lead to fragmentation.",
    effectiveFrom: "2019-07-01",
    citation: "ISO 24113:2019 § 6.2.2",
    sourceUrl: "https://www.iso.org/standard/72383.html",
    orbitalRegimes: ["ANY"],
    threshold: {
      parameter: "operationalBreakUpProbability",
      operator: "<=",
      value: 0.001,
      unit: "probability over operational phase",
    },
    bindingNature: "STANDARD",
    operatorScope: ["ALL"],
    relatedCodes: ["IADC-5.2.1", "NASA-STD-4.4"],
  },
  {
    code: "ISO-24113-6.3.2",
    regime: "ISO-24113",
    category: "PASSIVATION",
    title: "ISO 24113 § 6.3.2 — Passivation at end-of-mission",
    description:
      "All stored energy sources (propellant, pressurants, batteries, " +
      "momentum storage) shall be passivated within 1 year of end-of-" +
      "mission. Passivation methods and the probability that passivation " +
      "succeeds shall be documented in the mission's debris-mitigation plan.",
    effectiveFrom: "2019-07-01",
    citation: "ISO 24113:2019 § 6.3.2",
    sourceUrl: "https://www.iso.org/standard/72383.html",
    orbitalRegimes: ["ANY"],
    bindingNature: "STANDARD",
    operatorScope: ["ALL"],
    relatedCodes: ["IADC-5.2.2", "NASA-STD-4.4", "FCC-25.114-PASS"],
  },
  {
    code: "ISO-24113-6.3.3",
    regime: "ISO-24113",
    category: "POST_MISSION_DISPOSAL",
    title: "ISO 24113 § 6.3.3 — Disposal in protected regions",
    description:
      "Spacecraft and orbital stages operating in or passing through the " +
      "LEO Protected Region (≤2000 km) or GEO Protected Region (GEO ± 200 " +
      "km × ± 15° latitude) shall be removed from those regions within " +
      "specified timeframes. The standard accepts LEO 25-year (legacy) or " +
      "5-year (FCC-aligned) baselines.",
    effectiveFrom: "2019-07-01",
    citation: "ISO 24113:2019 § 6.3.3",
    sourceUrl: "https://www.iso.org/standard/72383.html",
    orbitalRegimes: ["LEO", "GEO"],
    bindingNature: "STANDARD",
    operatorScope: ["ALL"],
    relatedCodes: ["IADC-5.3.1", "IADC-5.3.2"],
  },
  {
    code: "ISO-24113-6.3.4",
    regime: "ISO-24113",
    category: "CASUALTY_RISK",
    title: "ISO 24113 § 6.3.4 — Casualty risk for uncontrolled re-entry",
    description:
      "Uncontrolled re-entry shall demonstrate casualty risk ≤ 1×10⁻⁴. " +
      "Risk shall be computed accounting for population density along the " +
      "re-entry ground track and the demisability of spacecraft components.",
    effectiveFrom: "2019-07-01",
    citation: "ISO 24113:2019 § 6.3.4",
    sourceUrl: "https://www.iso.org/standard/72383.html",
    orbitalRegimes: ["LEO", "MEO", "HEO"],
    threshold: {
      parameter: "casualtyRiskFactor",
      operator: "<=",
      value: 0.0001,
      unit: "probability per re-entry",
    },
    bindingNature: "STANDARD",
    operatorScope: ["ALL"],
    relatedCodes: [
      "FCC-25.114-CASUALTY",
      "NASA-STD-4.7",
      "ESA-ESSB-U-007-CASUALTY",
    ],
  },
];

// ============================================================================
// UN COPUOS Space Debris Mitigation Guidelines (A/62/20 Annex, 2007)
// ============================================================================

const UN_COPUOS_ENTRIES: ReadonlyArray<DebrisRequirementEntry> = [
  {
    code: "UN-COPUOS-3",
    regime: "UN-COPUOS",
    category: "FRAGMENT_RELEASE",
    title: "UN — Limit debris released during normal operations",
    description:
      "Member States and international organisations should limit debris " +
      "released during normal operations. Foundational UN guideline that " +
      "national debris-mitigation regulations (FCC, NASA, ESA, UK SIA) " +
      "implement.",
    effectiveFrom: "2007-12-22",
    citation: "UN COPUOS Guideline 3 (A/62/20 Annex)",
    sourceUrl: "https://www.unoosa.org/pdf/publications/st_space_49E.pdf",
    orbitalRegimes: ["ANY"],
    bindingNature: "GUIDELINE",
    operatorScope: ["ALL"],
    relatedCodes: ["IADC-5.1"],
  },
  {
    code: "UN-COPUOS-6",
    regime: "UN-COPUOS",
    category: "POST_MISSION_DISPOSAL",
    title: "UN — Limit long-term presence in LEO Protected Region",
    description:
      "Member States should limit the long-term presence of spacecraft " +
      "and orbital stages in the LEO Protected Region (≤2000 km) after " +
      "the end of their mission. UN Guideline does not specify a " +
      "numerical limit; the IADC 25-year guideline (and now FCC 5-year " +
      "rule) implement this.",
    effectiveFrom: "2007-12-22",
    citation: "UN COPUOS Guideline 6 (A/62/20 Annex)",
    sourceUrl: "https://www.unoosa.org/pdf/publications/st_space_49E.pdf",
    orbitalRegimes: ["LEO"],
    bindingNature: "GUIDELINE",
    operatorScope: ["ALL"],
    relatedCodes: ["IADC-5.3.1", "FCC-22-74-5YR"],
  },
  {
    code: "UN-COPUOS-7",
    regime: "UN-COPUOS",
    category: "POST_MISSION_DISPOSAL",
    title: "UN — Limit long-term presence in GEO Protected Region",
    description:
      "Member States should limit the long-term interference with the " +
      "GEO Protected Region (GEO ring ± 200 km × ± 15° latitude). " +
      "Implementation via IADC graveyard-orbit formula (235 km above GEO).",
    effectiveFrom: "2007-12-22",
    citation: "UN COPUOS Guideline 7 (A/62/20 Annex)",
    sourceUrl: "https://www.unoosa.org/pdf/publications/st_space_49E.pdf",
    orbitalRegimes: ["GEO"],
    bindingNature: "GUIDELINE",
    operatorScope: ["ALL"],
    relatedCodes: ["IADC-5.3.2", "FCC-25.114-GEO"],
  },
];

// ============================================================================
// EU Space Act COM(2025) 335 — Articles 32-35 (Proposed, in trilogue)
// ============================================================================

const EU_SPACE_ACT_ENTRIES: ReadonlyArray<DebrisRequirementEntry> = [
  {
    code: "EU-SPACE-ACT-32",
    regime: "EU-SPACE-ACT",
    category: "POST_MISSION_DISPOSAL",
    title: "EU Space Act Art. 32 — Mandatory debris-mitigation plan",
    description:
      "All space activities authorised in the EU under the Space Act must " +
      "submit a debris-mitigation plan demonstrating compliance with ISO " +
      "24113 and aligned ECSS standards. Plan must cover: operational " +
      "debris release, collision avoidance, passivation, post-mission " +
      "disposal, casualty risk. Status: in trilogue 2026, expected adoption " +
      "2026/2027.",
    effectiveFrom: "2027-01-01",
    citation: "COM(2025) 335 Art. 32",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335",
    orbitalRegimes: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["ISO-24113-6.3.2", "ESA-ESSB-U-007-PMD-5YR"],
    notes:
      "Status (May 2026): Trilogue in progress. Final text may include " +
      "5-year LEO PMD requirement aligned with FCC and ESA.",
  },
  {
    code: "EU-SPACE-ACT-33",
    regime: "EU-SPACE-ACT",
    category: "COLLISION_AVOIDANCE",
    title: "EU Space Act Art. 33 — Collision-avoidance capability",
    description:
      "EU-authorised spacecraft above 400 km altitude that are part of " +
      "constellations of 50+ sats must have manoeuvre capability and " +
      "participate in conjunction-screening with EUSST or equivalent " +
      "facilities. EUSST = EU Space Surveillance and Tracking framework.",
    effectiveFrom: "2027-01-01",
    citation: "COM(2025) 335 Art. 33",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335",
    orbitalRegimes: ["LEO"],
    threshold: {
      parameter: "constellationSize",
      operator: ">=",
      value: 50,
      unit: "sats",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL"],
    relatedCodes: ["FCC-25.114-MANEUVERABILITY", "IADC-5.4"],
    notes:
      "EU threshold (50 sats) is more conservative than FCC (100 sats), " +
      "scoping more constellation operators into mandatory manoeuvrability.",
  },
  {
    code: "EU-SPACE-ACT-34",
    regime: "EU-SPACE-ACT",
    category: "TRACKING_DATA",
    title: "EU Space Act Art. 34 — EUSST data-sharing requirement",
    description:
      "EU-authorised operators must share spacecraft state-vectors and " +
      "manoeuvre plans with EUSST to maintain the EU space-object " +
      "catalogue. Data-sharing is reciprocal: EUSST provides conjunction " +
      "warnings back to operators.",
    effectiveFrom: "2027-01-01",
    citation: "COM(2025) 335 Art. 34",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335",
    orbitalRegimes: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["FCC-22-74-TRACKING"],
  },
  {
    code: "EU-SPACE-ACT-35",
    regime: "EU-SPACE-ACT",
    category: "CASUALTY_RISK",
    title: "EU Space Act Art. 35 — Casualty risk ≤ 1×10⁻⁴",
    description:
      "EU-authorised re-entries must demonstrate casualty risk ≤ 1×10⁻⁴ " +
      "(consistent with FCC, NASA, ESA, ISO). For missions where this " +
      "cannot be met, controlled re-entry into open ocean is required.",
    effectiveFrom: "2027-01-01",
    citation: "COM(2025) 335 Art. 35",
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335",
    orbitalRegimes: ["LEO", "MEO", "HEO"],
    threshold: {
      parameter: "casualtyRiskFactor",
      operator: "<=",
      value: 0.0001,
      unit: "probability per re-entry",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: [
      "FCC-25.114-CASUALTY",
      "NASA-STD-4.7",
      "ESA-ESSB-U-007-CASUALTY",
      "ISO-24113-6.3.4",
    ],
  },
];

// ============================================================================
// UK Space Industry Act 2018 + Spaceflight Activities Regulations 2021
// ============================================================================

const UK_SIA_ENTRIES: ReadonlyArray<DebrisRequirementEntry> = [
  {
    code: "UK-SIA-8",
    regime: "UK-SIA",
    category: "DISPOSAL_VERIFICATION",
    title: "UK SIA s.8 — Debris-mitigation assessment for authorisation",
    description:
      "UK-licensed spaceflight activities (launch + spacecraft) must " +
      "submit a Mission Debris Mitigation Assessment (MDMA) as part of the " +
      "CAA authorisation application. MDMA must demonstrate compliance " +
      "with ISO 24113 (preferred) or IADC-02-01 Rev. 3 (acceptable).",
    effectiveFrom: "2021-07-29",
    citation: "UK SIA 2018 s.8 + SI 2021/792 reg. 27",
    sourceUrl: "https://www.legislation.gov.uk/uksi/2021/792/contents",
    orbitalRegimes: ["ANY"],
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["ISO-24113-6.3.2"],
  },
  {
    code: "UK-SIA-REG-29",
    regime: "UK-SIA",
    category: "CASUALTY_RISK",
    title: "UK CAA — Casualty risk ≤ 1×10⁻⁴ for re-entry",
    description:
      "UK-licensed spacecraft undergoing uncontrolled re-entry must " +
      "demonstrate casualty risk ≤ 1×10⁻⁴. CAA accepts ESA DRAMA, NASA " +
      "ORSAT, or equivalent commercial tools (e.g. SCARAB by ESA). " +
      "Controlled re-entry required for spacecraft mass > 1500 kg.",
    effectiveFrom: "2021-07-29",
    citation: "SI 2021/792 reg. 29",
    sourceUrl: "https://www.legislation.gov.uk/uksi/2021/792/contents",
    orbitalRegimes: ["LEO", "MEO", "HEO"],
    threshold: {
      parameter: "casualtyRiskFactor",
      operator: "<=",
      value: 0.0001,
      unit: "probability per re-entry",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: [
      "FCC-25.114-CASUALTY",
      "NASA-STD-4.7",
      "ESA-ESSB-U-007-CASUALTY",
    ],
  },
  {
    code: "UK-SIA-REG-31",
    regime: "UK-SIA",
    category: "POST_MISSION_DISPOSAL",
    title: "UK CAA — LEO PMD aligned with ISO 24113 (25-year baseline)",
    description:
      "UK-licensed LEO spacecraft must dispose of within 25 years per " +
      "ISO 24113 baseline. UK CAA is consulting (2025) on adopting the " +
      "FCC 5-year rule for new authorisations; decision expected 2026.",
    effectiveFrom: "2021-07-29",
    citation: "SI 2021/792 reg. 31",
    sourceUrl: "https://www.legislation.gov.uk/uksi/2021/792/contents",
    orbitalRegimes: ["LEO"],
    threshold: {
      parameter: "postMissionLifetimeYears",
      operator: "<=",
      value: 25,
      unit: "years",
    },
    bindingNature: "MANDATORY",
    operatorScope: ["COMMERCIAL", "ACADEMIC"],
    relatedCodes: ["ISO-24113-6.3.3", "IADC-5.3.1"],
    notes:
      "Status (May 2026): Public consultation on FCC-alignment closed " +
      "March 2026; CAA decision pending.",
  },
];

// ============================================================================
// CONSOLIDATED EXPORT
// ============================================================================

/** All orbital-debris mitigation requirements across all regimes. */
export const DEBRIS_REQUIREMENTS: ReadonlyArray<DebrisRequirementEntry> = [
  ...IADC_ENTRIES,
  ...FCC_ENTRIES,
  ...NASA_STD_ENTRIES,
  ...ESA_ENTRIES,
  ...ISO_ENTRIES,
  ...UN_COPUOS_ENTRIES,
  ...EU_SPACE_ACT_ENTRIES,
  ...UK_SIA_ENTRIES,
];

/** Coverage metadata. */
export const DEBRIS_COVERAGE = {
  totalEntries: DEBRIS_REQUIREMENTS.length,
  byRegime: {
    IADC: IADC_ENTRIES.length,
    FCC: FCC_ENTRIES.length,
    "NASA-STD": NASA_STD_ENTRIES.length,
    "ESA-STD": ESA_ENTRIES.length,
    "ISO-24113": ISO_ENTRIES.length,
    "UN-COPUOS": UN_COPUOS_ENTRIES.length,
    "EU-SPACE-ACT": EU_SPACE_ACT_ENTRIES.length,
    "UK-SIA": UK_SIA_ENTRIES.length,
  },
  asOf: IADC_FCC_DEBRIS_AS_OF,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Find a single requirement by its code. */
export function findDebrisEntry(
  code: string,
): DebrisRequirementEntry | undefined {
  return DEBRIS_REQUIREMENTS.find((entry) => entry.code === code);
}

/** Find all entries for a given regime. */
export function findDebrisByRegime(
  regime: DebrisRegime,
): ReadonlyArray<DebrisRequirementEntry> {
  return DEBRIS_REQUIREMENTS.filter((entry) => entry.regime === regime);
}

/** Find all entries for a given category. */
export function findDebrisByCategory(
  category: DebrisRequirementCategory,
): ReadonlyArray<DebrisRequirementEntry> {
  return DEBRIS_REQUIREMENTS.filter((entry) => entry.category === category);
}

/**
 * Find all entries that apply to a given orbital regime.
 * "ANY" rules apply everywhere; specific-orbit rules return only when matched.
 */
export function findDebrisByOrbitalRegime(
  orbitalRegime: DebrisOrbitalRegime,
): ReadonlyArray<DebrisRequirementEntry> {
  return DEBRIS_REQUIREMENTS.filter(
    (entry) =>
      entry.orbitalRegimes.includes(orbitalRegime) ||
      entry.orbitalRegimes.includes("ANY"),
  );
}

/** Find all entries by binding nature (MANDATORY / GUIDELINE / STANDARD). */
export function findDebrisByBindingNature(
  bindingNature: DebrisBindingNature,
): ReadonlyArray<DebrisRequirementEntry> {
  return DEBRIS_REQUIREMENTS.filter(
    (entry) => entry.bindingNature === bindingNature,
  );
}

/** Find all entries that have a quantitative threshold. */
export function findDebrisWithThreshold(): ReadonlyArray<DebrisRequirementEntry> {
  return DEBRIS_REQUIREMENTS.filter((entry) => entry.threshold !== undefined);
}

/**
 * Find mandatory requirements applicable to a specific jurisdiction.
 * Maps jurisdiction ISO-2 codes to the regimes that bind operators there.
 */
export function findMandatoryRequirementsForJurisdiction(
  jurisdiction: string,
): ReadonlyArray<DebrisRequirementEntry> {
  const jurisdictionRegimes: Record<string, ReadonlyArray<DebrisRegime>> = {
    US: ["FCC", "NASA-STD"],
    GB: ["UK-SIA"],
    UK: ["UK-SIA"],
    DE: ["EU-SPACE-ACT", "ESA-STD"],
    FR: ["EU-SPACE-ACT", "ESA-STD"],
    IT: ["EU-SPACE-ACT", "ESA-STD"],
    ES: ["EU-SPACE-ACT", "ESA-STD"],
    NL: ["EU-SPACE-ACT", "ESA-STD"],
    BE: ["EU-SPACE-ACT", "ESA-STD"],
    SE: ["EU-SPACE-ACT", "ESA-STD"],
    PL: ["EU-SPACE-ACT", "ESA-STD"],
  };
  const regimes = jurisdictionRegimes[jurisdiction.toUpperCase()] ?? [];
  return DEBRIS_REQUIREMENTS.filter(
    (entry) =>
      regimes.includes(entry.regime) && entry.bindingNature === "MANDATORY",
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
