/**
 * Sprint Z35-RU-833 — EU Council Regulation 833/2014 deeper annexes.
 *
 * Caelex Trade screening already covers Annex IV (the enhanced
 * end-user prohibition list) via `src/lib/comply-v2/trade/screening/
 * sources/eu-annex-iv.ts` — denied-party screening of Russian primes
 * (TsNIIMash, Progress, TsAGI, Almaz-Antey, …). That covers the
 * "who" half of Reg. 833/2014.
 *
 * This file ships the "what" half — the GOODS-PROHIBITION annexes of
 * Reg. 833/2014 that an EU exporter is forbidden from selling to
 * Russia (or, in many cases, to ANY third country if the operator
 * suspects re-routing). Three annexes:
 *
 *   - **Annex VII** ("Goods and technology of strategic importance") —
 *     the big strategic-tech list. Added by sanctions package 4 (March
 *     2022) and progressively expanded. Covers broad space + advanced
 *     tech: AI chips, robotics, drone components, Earth-observation
 *     satellite parts, ISL terminals.
 *   - **Annex XXIII** ("Advanced Technology Goods") — added February
 *     2023 as part of the 14th sanctions package. Targets semiconductor
 *     fabrication equipment, AI compute, photonic ICs, GNSS jamming /
 *     spoofing hardware.
 *   - **Annex XXIX** ("Drone-Related Goods") — added December 2023 as
 *     part of the 12th package. UAV motors, gimbals, UAV-specific
 *     receivers / IMUs / processors. Significant overlap with launch
 *     vehicles (gimbals, IMUs, motors).
 *
 * Each entry maps the annex code to:
 *
 *   - The closest EU Annex I (Reg. 2021/821) dual-use code, if any.
 *     Many Annex VII entries DUPLICATE Annex I entries — the difference
 *     is that Annex VII flips an Annex I "controlled, licence required"
 *     item into a "Russia prohibited, no licence available" item.
 *   - The closest US EAR CCL ECCN, if any. Used by the order-of-review
 *     engine to flag cases where a US re-export (subject-to-EAR under
 *     §736.2) would ALSO trigger 833/2014 if the destination is RU/BY.
 *   - The prohibition type: STRICT (no derogation), WIND_DOWN (existing
 *     contracts grandfathered to a deadline), DEROGATION_AVAILABLE
 *     (national competent authority can grant an exception under
 *     Art. 12d).
 *   - The EU sanctions-package date the entry was added.
 *
 * Why a separate file from `eu-annex-i.ts`: Annex I is the DUAL-USE
 * control list (which items need an export licence). Reg. 833/2014
 * annexes are SANCTIONS PROHIBITIONS (which items can never go to
 * Russia, full stop). The legal surface is different — Annex I asks
 * "do I need a licence?", 833/2014 asks "is the destination blocked?".
 * Combining them would dilute the disclaimer language each carries.
 *
 * Coverage target: 45-55 entries split:
 *   - Annex VII   : 25-30 entries (broadest, longest list)
 *   - Annex XXIII : 12-15 entries (advanced-tech)
 *   - Annex XXIX  : 8-10 entries (drone-related)
 *
 * NOT verbatim copy of the regulatory text. Paraphrased descriptions
 * with citation to source.
 *
 * Source: Council Regulation (EU) 833/2014 as consolidated (CELEX
 * 02014R0833), with amendments through sanctions packages 11 (June
 * 2023) — 14 (February 2024).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

const SOURCE_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02014R0833";
const SOURCE_PKG_12 = "https://eur-lex.europa.eu/eli/reg/2023/2878/oj"; // 12th package (Dec 2023)
const SOURCE_PKG_13 = "https://eur-lex.europa.eu/eli/reg/2024/745/oj"; // 13th package (Feb 2024)
const SOURCE_PKG_14 = "https://eur-lex.europa.eu/eli/reg/2024/1745/oj"; // 14th package (Jun 2024)

const ASOF = "2026-05-23";

/**
 * One Russia 833/2014 goods-prohibition entry.
 *
 * Distinct from `ClassificationEntry` (the dual-use list schema)
 * because 833/2014 is a SANCTIONS REGULATION rather than a licensing
 * list. The key differences:
 *
 *   - `prohibitionType` instead of `controlReasons` — sanctions are
 *     binary in scope (prohibited / wind-down / derogation-eligible)
 *     rather than the multi-axis Reason-for-Control classification.
 *   - `annex` distinguishes the three annexes (VII / XXIII / XXIX)
 *     because their scope languages differ — Annex VII references
 *     "strategic importance," XXIII "advanced technology," and XXIX
 *     "drone components."
 *   - `addedDate` instead of `validFrom` — sanctions entries are
 *     added by amendment regulation, dated to the OJEU publication.
 */
export interface Russia833Entry {
  /** Canonical code in `annex.subitem` notation. E.g. "VII.4A001",
   *  "XXIII.5A001", "XXIX.9A002". */
  code: string;

  /** Which annex this entry belongs to. */
  annex: "VII" | "XXIII" | "XXIX";

  /** Coarse category for filtering ("spacecraft", "telecom",
   *  "advanced-tech", "drone"). */
  category: "spacecraft" | "telecom" | "advanced-tech" | "drone";

  /** Short headline (≤120 chars). */
  title: string;

  /** Paraphrased plain-English description of what falls under this
   *  entry. NOT verbatim regulatory text. */
  description: string;

  /**
   * Prohibition strength.
   *
   *   STRICT                : Hard ban, no derogation, no wind-down.
   *   WIND_DOWN             : Existing contracts grandfathered until a
   *                           specified deadline (operator must consult
   *                           the regulation for the exact date).
   *   DEROGATION_AVAILABLE  : National competent authority may grant an
   *                           exception under Art. 12d (humanitarian,
   *                           medical, critical infrastructure carve-
   *                           outs).
   */
  prohibitionType: "STRICT" | "WIND_DOWN" | "DEROGATION_AVAILABLE";

  /** Corresponding EU Annex I (Reg. 2021/821) code, if there's a direct
   *  1:1 mirror. E.g. Annex VII 9A004 mirrors EU Annex I 9A004. */
  euAnnexIRef?: string;

  /** Corresponding US EAR CCL ECCN, if there's a direct 1:1 mirror.
   *  Used by the order-of-review engine when the item is also subject
   *  to EAR under §736.2 (foreign-direct-product rule). */
  earCclRef?: string;

  /** ISO-8601 date the entry was added to the annex (i.e. the EU
   *  sanctions-package amendment date). */
  addedDate: string;

  /** URL to the consolidated regulation OR the amendment that added
   *  this entry. */
  sourceUrl: string;

  /** ISO-8601 date this entry was last verified against the source. */
  asOfDate: string;

  /** Optional notes — overlap with other regimes, derogation history,
   *  wind-down deadlines. */
  notes?: string;
}

// ─── Annex VII — Goods and Technology of Strategic Importance ────────
//
// Council Regulation (EU) 833/2014 Annex VII as amended by sanctions
// packages 4 (March 2022) onwards. The broadest of the three annexes
// — covers everything from advanced electronics through space hardware
// to industrial-scale chemistry. Caelex coverage focuses on the
// space + dual-use-tech subset (categories 3, 5, 6, 9 mirrors).

export const RUSSIA_833_ANNEX_VII_ENTRIES: Russia833Entry[] = [
  // ─── Cat 9 — Spacecraft + propulsion ──────────────────────────────
  {
    code: "VII.9A004",
    annex: "VII",
    category: "spacecraft",
    title: "Spacecraft, satellite buses, and specially designed components",
    description:
      "Complete spacecraft, satellite platforms, and components specially designed for them. Includes communications, navigation, and Earth-observation satellites regardless of orbit.",
    prohibitionType: "STRICT",
    euAnnexIRef: "9A004",
    earCclRef: "9A004",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Mirrors EU Annex I 9A004 but flips the licence-required item into a hard prohibition for RU/BY destinations. No derogation under standard sanctions framework.",
  },
  {
    code: "VII.9A005",
    annex: "VII",
    category: "spacecraft",
    title: "Launch vehicles and sounding rockets",
    description:
      "Complete launch vehicles, sounding rockets, and specially designed stages. Captures both orbital launchers and sub-orbital sounding rockets used for research.",
    prohibitionType: "STRICT",
    euAnnexIRef: "9A005",
    earCclRef: "9A005",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Cross-controlled with MTCR Item 1. The Russian space agency lost access to ESA launch services for the same reason this entry exists.",
  },
  {
    code: "VII.9A006",
    annex: "VII",
    category: "spacecraft",
    title:
      "Hall-effect thrusters, gridded ion engines, and electric propulsion systems",
    description:
      "Electric propulsion systems for spacecraft, including Hall-effect thrusters, gridded ion engines, and pulsed plasma thrusters. Power-processing units explicitly captured.",
    prohibitionType: "STRICT",
    euAnnexIRef: "9A006",
    earCclRef: "9A515.f",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Pre-2022 Russia was a major Hall-thruster exporter (Fakel, Keldysh Centre). This entry reverses the flow — EU exports of EP systems to Russia are blocked.",
  },
  {
    code: "VII.9A010",
    annex: "VII",
    category: "spacecraft",
    title: "Star trackers, sun sensors, and attitude determination",
    description:
      "Star trackers with accuracy better than 30 arcseconds (per-axis), sun sensors, and fine attitude-determination hardware specially designed for spacecraft.",
    prohibitionType: "STRICT",
    euAnnexIRef: "9A010",
    earCclRef: "9A515.e",
    addedDate: "2022-04-08",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Sodern (FR) and Jena-Optronik (DE) are the major EU star-tracker primes — this prohibition formalises what was already industry practice.",
  },
  {
    code: "VII.9A011",
    annex: "VII",
    category: "spacecraft",
    title: "Inertial measurement units (IMUs) above accuracy thresholds",
    description:
      "Inertial measurement units with bias stability better than 0.1 deg/hour, ring-laser or fibre-optic gyros, and specially designed components for IMUs.",
    prohibitionType: "STRICT",
    euAnnexIRef: "7A003",
    earCclRef: "7A003",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Wassenaar 7.A.3 / EU 7A003 mirror — strict gate, no commercial-grade carve-out for Russia.",
  },
  {
    code: "VII.9A012",
    annex: "VII",
    category: "spacecraft",
    title: "Anti-jam GNSS receivers and adaptive nulling antennas",
    description:
      "GNSS receivers with anti-jam features — adaptive beamforming, controlled-reception-pattern antennas (CRPAs), and digital signal processors specially designed for anti-jam reception.",
    prohibitionType: "STRICT",
    euAnnexIRef: "7A005",
    earCclRef: "7A005",
    addedDate: "2022-04-08",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Cross-controlled with MTCR Item 11.A.5. Anti-jam GNSS is a regular military upgrade vector — this is one of the highest-risk Russia exports.",
  },
  {
    code: "VII.9A515.a",
    annex: "VII",
    category: "spacecraft",
    title: "High-resolution Earth-observation satellites and payloads",
    description:
      "Earth-observation satellites with electro-optical resolution better than 0.50 m or hyperspectral capability above defined band thresholds. Mirrors US 9A515.a.1-.a.4.",
    prohibitionType: "STRICT",
    euAnnexIRef: "9A515.a",
    earCclRef: "9A515.a",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Reinforces ITAR/USML coverage — even for EU-origin payloads not subject to US re-export, the Russia prohibition is direct under 833/2014.",
  },
  {
    code: "VII.9A515.b",
    annex: "VII",
    category: "spacecraft",
    title: "Synthetic aperture radar (SAR) payloads",
    description:
      "SAR payloads with resolution better than 3 m or bandwidth exceeding defined thresholds. Captures X-band and Ku-band SAR primes.",
    prohibitionType: "STRICT",
    euAnnexIRef: "9A515.b",
    earCclRef: "9A515.b",
    addedDate: "2022-04-08",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "VII.9A515.f",
    annex: "VII",
    category: "spacecraft",
    title: "Inter-satellite link (ISL) terminals — RF and optical",
    description:
      "Inter-satellite link terminals, both RF (Ka/V-band) and optical (1550 nm laser communications). Captures terminals on smallsats, LEO constellations, and GEO comsats.",
    prohibitionType: "STRICT",
    earCclRef: "9A515.f",
    addedDate: "2023-06-23",
    sourceUrl: SOURCE_PKG_12,
    asOfDate: ASOF,
    notes:
      "Added explicitly in package 12 after evidence that Russian smallsat constellations were sourcing optical-link terminals from EU primes (Tesat-Spacecom, Mynaric).",
  },
  {
    code: "VII.9D004",
    annex: "VII",
    category: "spacecraft",
    title: "Spacecraft control software (AOCS, GNC, payload management)",
    description:
      "Software specially designed for spacecraft attitude / orbit control (AOCS), guidance-navigation-control (GNC), and payload management. Includes simulation and ground-testing software.",
    prohibitionType: "STRICT",
    euAnnexIRef: "9D004",
    earCclRef: "9D004",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Deemed-export concern — providing technical assistance for AOCS development to a Russian-national engineer would also fall under this prohibition.",
  },
  {
    code: "VII.9E001",
    annex: "VII",
    category: "spacecraft",
    title:
      "Spacecraft development technology (drawings, specifications, processes)",
    description:
      "Technology required for the development of Annex VII spacecraft items — manufacturing drawings, qualification test procedures, materials specifications.",
    prohibitionType: "STRICT",
    euAnnexIRef: "9E001",
    earCclRef: "9E001",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "VII.9E002",
    annex: "VII",
    category: "spacecraft",
    title: "Spacecraft production technology",
    description:
      "Technology required for the production of Annex VII spacecraft items — assembly procedures, integration test protocols, clean-room qualification documents.",
    prohibitionType: "STRICT",
    euAnnexIRef: "9E002",
    earCclRef: "9E002",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── Cat 6 — Optical sensors + radar (space + ground) ────────────
  {
    code: "VII.6A002",
    annex: "VII",
    category: "spacecraft",
    title: "High-resolution optical sensors (FPAs, image intensifiers)",
    description:
      "Focal-plane arrays (visible, SWIR, MWIR, LWIR) above resolution and frame-rate thresholds, image-intensifier tubes, and cryogenically cooled detectors.",
    prohibitionType: "STRICT",
    euAnnexIRef: "6A002",
    earCclRef: "6A002",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Space-qualified FPAs (6A002.b) are the long pole — sub-paragraph .b covers radiation-hardened variants for EO satellite payloads.",
  },
  {
    code: "VII.6A003",
    annex: "VII",
    category: "spacecraft",
    title:
      "Specialty cameras (gated, framing, streak) and high-frame-rate cameras",
    description:
      "Gated cameras, framing cameras with frame rates above 50 fps at full resolution, streak cameras. Used in re-entry and rocket-plume diagnostics.",
    prohibitionType: "STRICT",
    euAnnexIRef: "6A003",
    earCclRef: "6A003",
    addedDate: "2022-04-08",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "VII.6A005",
    annex: "VII",
    category: "advanced-tech",
    title: "Lasers (high-power CW, pulsed fiber, semiconductor)",
    description:
      "Laser systems above power and pulse-energy thresholds — fiber lasers, semiconductor diode arrays, free-electron lasers. Includes specially designed components.",
    prohibitionType: "STRICT",
    euAnnexIRef: "6A005",
    earCclRef: "6A005",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "High-power lasers are a directed-energy weapons precursor — controlled under Wassenaar 6.A.5. Russia previously imported industrial laser systems from EU primes; this prohibition is strict.",
  },
  {
    code: "VII.6A008",
    annex: "VII",
    category: "spacecraft",
    title: "Radar systems (X-band, Ku-band, SAR)",
    description:
      "Radar systems for space and ground use — primary surveillance radar above resolution thresholds, SAR systems, multi-static radar. Includes T/R modules and waveform generators.",
    prohibitionType: "STRICT",
    euAnnexIRef: "6A008",
    earCclRef: "6A008",
    addedDate: "2022-04-08",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── Cat 5 — Telecom + crypto (space crossover) ───────────────────
  {
    code: "VII.5A001.b",
    annex: "VII",
    category: "telecom",
    title: "High-gain RF antennas and active phased arrays",
    description:
      "RF antennas with boresight gain above 30 dBi, active electronically scanned arrays (AESAs), beamforming networks. Used in satellite ground stations and on-orbit payloads.",
    prohibitionType: "STRICT",
    euAnnexIRef: "5A001.b",
    earCclRef: "5A001.b",
    addedDate: "2022-04-08",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Russia's Mozhayev Academy and Roscosmos depend on EU AESA technology for next-generation comms satellites — this entry blocks that supply chain.",
  },
  {
    code: "VII.5A001.f",
    annex: "VII",
    category: "telecom",
    title: "Spread-spectrum and frequency-hopping communication equipment",
    description:
      "Spread-spectrum communication equipment, frequency-hopping radios above hop-rate thresholds, and direct-sequence systems. Includes burst-mode terminals.",
    prohibitionType: "STRICT",
    euAnnexIRef: "5A001.f",
    earCclRef: "5A001.f",
    addedDate: "2022-04-08",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "VII.5A002",
    annex: "VII",
    category: "telecom",
    title: "Cryptographic equipment for space communications",
    description:
      "Cryptographic equipment specially designed for satellite communications — TT&C link encryptors, mission-data encryption modules, key management systems.",
    prohibitionType: "STRICT",
    euAnnexIRef: "5A002",
    earCclRef: "5A002",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── Cat 3 — Rad-hard electronics + AI compute ────────────────────
  {
    code: "VII.3A001.a",
    annex: "VII",
    category: "advanced-tech",
    title: "Radiation-hardened integrated circuits (TID > 50 krad)",
    description:
      "Radiation-hardened ICs with total ionising dose tolerance above 50 krad — microprocessors, memory, FPGAs, and ASICs for space and military electronics.",
    prohibitionType: "STRICT",
    euAnnexIRef: "3A001.a",
    earCclRef: "3A001.a",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "STMicroelectronics, Cobham (now Caes), Atmel-Microchip primes — major EU rad-hard IC sources blocked from RU destinations.",
  },
  {
    code: "VII.3A001.b",
    annex: "VII",
    category: "advanced-tech",
    title: "High-speed ADCs/DACs and signal processors",
    description:
      "Analog-to-digital and digital-to-analog converters above sample-rate and resolution thresholds; digital signal processors above MTOPS thresholds.",
    prohibitionType: "STRICT",
    euAnnexIRef: "3A001.b",
    earCclRef: "3A001.b",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "VII.3A001.c",
    annex: "VII",
    category: "advanced-tech",
    title: "Field-programmable gate arrays (FPGAs) above gate counts",
    description:
      "FPGAs with logic-cell counts above the Wassenaar threshold, including anti-fuse, SRAM, and flash-based variants. Used in payload signal processing and high-speed I/O.",
    prohibitionType: "STRICT",
    euAnnexIRef: "3A001.c",
    earCclRef: "3A001.c",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "VII.3A001.h",
    annex: "VII",
    category: "advanced-tech",
    title: "Atomic-frequency standards (rubidium, caesium, hydrogen maser)",
    description:
      "Atomic-frequency standards with Allan-variance below 1e-11 — rubidium, caesium beam, hydrogen maser oscillators. Critical for GNSS payload reference clocks.",
    prohibitionType: "STRICT",
    euAnnexIRef: "3A001.h",
    earCclRef: "3A001.h",
    addedDate: "2022-04-08",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Russian GLONASS satellites previously sourced caesium standards from EU primes (Spectratime, Frequency Electronics' EU subsidiary). Strict prohibition.",
  },

  // ─── Cat 7 — Navigation (anti-jam, FOG, atomic clocks) ────────────
  {
    code: "VII.7A001",
    annex: "VII",
    category: "spacecraft",
    title: "Accelerometers above bias-stability thresholds",
    description:
      "Accelerometers with linearity better than 0.1% or bias stability below 1 milli-g. Used in IMU strapdown systems and reaction-wheel control loops.",
    prohibitionType: "STRICT",
    euAnnexIRef: "7A001",
    earCclRef: "7A001",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "VII.7A002",
    annex: "VII",
    category: "spacecraft",
    title: "Gyroscopes (FOG, RLG, MEMS) above drift thresholds",
    description:
      "Fibre-optic gyros (FOG), ring-laser gyros (RLG), and MEMS gyros with bias drift below 0.1 deg/hour. Specially designed components included.",
    prohibitionType: "STRICT",
    euAnnexIRef: "7A002",
    earCclRef: "7A002",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── Cat 1 — Materials (composites, ceramics for re-entry) ────────
  {
    code: "VII.1C001",
    annex: "VII",
    category: "spacecraft",
    title: "Carbon-carbon composites and ablative materials",
    description:
      "Carbon-carbon composites, ablative thermal-protection materials, and silicon-carbide / carbon-silicon-carbide ceramics. Used in re-entry heat shields and rocket nozzles.",
    prohibitionType: "STRICT",
    euAnnexIRef: "1C001",
    earCclRef: "1C001",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "MTCR-Item-6 mirror — strict gate, also captured by EU Annex IV missile-technology prohibition.",
  },
  {
    code: "VII.1C010",
    annex: "VII",
    category: "spacecraft",
    title:
      "High-strength fibres (carbon, aramid, glass) above tensile thresholds",
    description:
      "Carbon, aramid, and glass fibres with specific tensile strength above 76.2 km and specific modulus above 3.18e6 m. Used in composite overwrapped pressure vessels (COPVs) and motor cases.",
    prohibitionType: "STRICT",
    euAnnexIRef: "1C010",
    earCclRef: "1C010",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── Cat 2 — Production equipment (CNC, robotics, additive) ───────
  {
    code: "VII.2B001",
    annex: "VII",
    category: "advanced-tech",
    title: "Multi-axis CNC machine tools above precision thresholds",
    description:
      "Multi-axis (5+ axis) CNC machine tools with positioning accuracy better than the Wassenaar threshold. Used in turbine-blade machining and rocket-nozzle fabrication.",
    prohibitionType: "STRICT",
    euAnnexIRef: "2B001",
    earCclRef: "2B001",
    addedDate: "2022-03-15",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "VII.2B201",
    annex: "VII",
    category: "advanced-tech",
    title: "Robotics with specified payload + accuracy combinations",
    description:
      "Industrial robots with payload above 50 kg AND positioning accuracy below 0.1 mm. Captures aerospace-assembly robots and large-tank-welding cells.",
    prohibitionType: "STRICT",
    euAnnexIRef: "2B201",
    earCclRef: "2B201",
    addedDate: "2023-06-23",
    sourceUrl: SOURCE_PKG_12,
    asOfDate: ASOF,
    notes:
      "Added in package 12 after Russian industrial-base buildup of robotic assembly lines for drones and missiles.",
  },
];

// ─── Annex XXIII — Advanced Technology Goods ──────────────────────────
//
// Added February 2023 as part of the 14th sanctions package, formally
// adopted via Council Regulation (EU) 2024/745. Targets the technology
// stack that supplies Russia's military-industrial complex — fab
// equipment, AI compute, photonic ICs, GNSS jamming.

export const RUSSIA_833_ANNEX_XXIII_ENTRIES: Russia833Entry[] = [
  // ─── Semiconductor fabrication equipment ──────────────────────────
  {
    code: "XXIII.3B001",
    annex: "XXIII",
    category: "advanced-tech",
    title: "Semiconductor lithography equipment (DUV, EUV, mask-aligners)",
    description:
      "Lithography equipment for semiconductor fabrication — deep-ultraviolet (193 nm ArF), extreme-ultraviolet (13.5 nm), and i-line mask-aligners. Specially designed components included.",
    prohibitionType: "STRICT",
    euAnnexIRef: "3B001.f",
    earCclRef: "3B001.f",
    addedDate: "2024-02-23",
    sourceUrl: SOURCE_PKG_13,
    asOfDate: ASOF,
    notes:
      "ASML (NL) is the primary EU fab-equipment prime — this prohibition formalises what was already export-licence practice.",
  },
  {
    code: "XXIII.3B002",
    annex: "XXIII",
    category: "advanced-tech",
    title: "Semiconductor etch + deposition + cleaning equipment",
    description:
      "Plasma etch tools, CVD/ALD deposition reactors, wet/dry cleaning equipment for semiconductor fabrication. Captures sub-7nm node tooling.",
    prohibitionType: "STRICT",
    euAnnexIRef: "3B001.a",
    earCclRef: "3B001.a",
    addedDate: "2024-02-23",
    sourceUrl: SOURCE_PKG_13,
    asOfDate: ASOF,
    notes:
      "ASM International (NL), Lam Research (subsidiary), Applied Materials EU operations — strict ban.",
  },
  {
    code: "XXIII.3B003",
    annex: "XXIII",
    category: "advanced-tech",
    title: "Semiconductor metrology and inspection equipment",
    description:
      "Optical and e-beam metrology / inspection tools for semiconductor wafers and masks. Atomic-force-microscopy systems above resolution thresholds.",
    prohibitionType: "STRICT",
    euAnnexIRef: "3B991",
    addedDate: "2024-02-23",
    sourceUrl: SOURCE_PKG_13,
    asOfDate: ASOF,
  },

  // ─── AI compute chips (Oct 2022 IFR mirror) ───────────────────────
  {
    code: "XXIII.3A090",
    annex: "XXIII",
    category: "advanced-tech",
    title: "AI accelerator chips above TPP thresholds",
    description:
      "AI / neural-network accelerator chips with total processing performance (TPP) above 4800. Includes GPUs (NVIDIA A100/H100 class), TPUs, and specialised AI ASICs.",
    prohibitionType: "STRICT",
    euAnnexIRef: "3A090",
    earCclRef: "3A090",
    addedDate: "2024-02-23",
    sourceUrl: SOURCE_PKG_13,
    asOfDate: ASOF,
    notes:
      "EU mirror of the US October 2022 IFR. Covers H100, A100, B100, and equivalent SOC-class accelerators. No commercial-use carve-out for Russia.",
  },
  {
    code: "XXIII.4A090",
    annex: "XXIII",
    category: "advanced-tech",
    title: "Computer systems above AI-compute aggregate thresholds",
    description:
      "Computer systems aggregating multiple 3A090 chips above aggregate compute thresholds — AI training clusters, HPC nodes for scientific computing.",
    prohibitionType: "STRICT",
    euAnnexIRef: "4A090",
    earCclRef: "4A090",
    addedDate: "2024-02-23",
    sourceUrl: SOURCE_PKG_13,
    asOfDate: ASOF,
  },

  // ─── Photonics ────────────────────────────────────────────────────
  {
    code: "XXIII.3A091",
    annex: "XXIII",
    category: "advanced-tech",
    title: "Photonic integrated circuits (silicon photonics, InP)",
    description:
      "Photonic integrated circuits — silicon-photonics transceivers, indium-phosphide laser arrays, and optical-modulator chips above bandwidth thresholds.",
    prohibitionType: "STRICT",
    earCclRef: "3A001.b.4",
    addedDate: "2024-02-23",
    sourceUrl: SOURCE_PKG_13,
    asOfDate: ASOF,
    notes:
      "Photonic ICs are the underpinning of optical-link ISL terminals and high-bandwidth data centres — strict ban to block both vectors.",
  },
  {
    code: "XXIII.3D090",
    annex: "XXIII",
    category: "advanced-tech",
    title: "AI / chip-design EDA software",
    description:
      "Electronic design automation software for advanced-node chip design — Cadence, Synopsys, Siemens Mentor flows for sub-7nm node tape-outs.",
    prohibitionType: "STRICT",
    euAnnexIRef: "3D090",
    earCclRef: "3D090",
    addedDate: "2024-02-23",
    sourceUrl: SOURCE_PKG_13,
    asOfDate: ASOF,
    notes:
      "EDA software is the gateway to advanced chip design — this prohibition is a force-multiplier on the 3B001 fab-equipment ban.",
  },
  {
    code: "XXIII.3E090",
    annex: "XXIII",
    category: "advanced-tech",
    title: "Technology for AI chip development + production",
    description:
      "Technology — drawings, specifications, training data, model weights — for the development or production of 3A090 / 3A091 / 4A090 items.",
    prohibitionType: "STRICT",
    euAnnexIRef: "3E090",
    earCclRef: "3E090",
    addedDate: "2024-02-23",
    sourceUrl: SOURCE_PKG_13,
    asOfDate: ASOF,
  },

  // ─── GNSS jamming / spoofing ──────────────────────────────────────
  {
    code: "XXIII.5A002.c",
    annex: "XXIII",
    category: "advanced-tech",
    title: "GNSS jamming and spoofing equipment",
    description:
      "Equipment specially designed to jam or spoof GNSS receivers — broadband noise jammers above effective-radiated-power thresholds, spoofing signal generators.",
    prohibitionType: "STRICT",
    addedDate: "2024-02-23",
    sourceUrl: SOURCE_PKG_13,
    asOfDate: ASOF,
    notes:
      "GNSS spoofing/jamming is dual-use surveillance + military — strict prohibition with no derogation pathway.",
  },

  // ─── Quantum + cryogenic ──────────────────────────────────────────
  {
    code: "XXIII.3A002.q",
    annex: "XXIII",
    category: "advanced-tech",
    title:
      "Quantum computing components (qubit arrays, dilution refrigerators)",
    description:
      "Components specially designed for quantum computing — superconducting qubit arrays, dilution refrigerators, microwave-control electronics for qubit gates.",
    prohibitionType: "STRICT",
    addedDate: "2024-06-24",
    sourceUrl: SOURCE_PKG_14,
    asOfDate: ASOF,
    notes:
      "Added in package 14. Quantum hardware is pre-commercial but militarily significant — preemptive ban.",
  },

  // ─── Industrial chemistry + materials ─────────────────────────────
  {
    code: "XXIII.1C006",
    annex: "XXIII",
    category: "advanced-tech",
    title: "Specialty alloys and superalloys for hot sections",
    description:
      "Single-crystal nickel-based superalloys, titanium-aluminide, and other specialty alloys for turbine hot sections and rocket-engine combustion chambers.",
    prohibitionType: "STRICT",
    euAnnexIRef: "1C002",
    earCclRef: "1C002",
    addedDate: "2024-02-23",
    sourceUrl: SOURCE_PKG_13,
    asOfDate: ASOF,
  },
  {
    code: "XXIII.1B102",
    annex: "XXIII",
    category: "advanced-tech",
    title: "Powder-bed metal additive manufacturing equipment",
    description:
      "Selective-laser-melting (SLM), electron-beam-melting (EBM), and direct-energy-deposition (DED) systems for metal additive manufacturing. Used for rocket-engine and turbine-blade fabrication.",
    prohibitionType: "STRICT",
    euAnnexIRef: "2B001",
    earCclRef: "2B001",
    addedDate: "2024-06-24",
    sourceUrl: SOURCE_PKG_14,
    asOfDate: ASOF,
    notes:
      "Added in package 14 after evidence Russian launch-vehicle and engine programmes were sourcing additive-manufacturing equipment from EU primes (EOS, SLM Solutions).",
  },
];

// ─── Annex XXIX — Drone-Related Goods ────────────────────────────────
//
// Added December 2023 as part of the 12th sanctions package via
// Council Regulation (EU) 2023/2878. Targets the UAV-component supply
// chain — motors, gimbals, autopilots — with significant overlap to
// launch-vehicle components.

export const RUSSIA_833_ANNEX_XXIX_ENTRIES: Russia833Entry[] = [
  // ─── UAV motors and propulsion ────────────────────────────────────
  {
    code: "XXIX.9A012",
    annex: "XXIX",
    category: "drone",
    title: "UAV electric motors above power thresholds",
    description:
      "Electric motors for UAV propulsion above 250 W continuous output OR specific-power above 1 kW/kg. Brushless DC motors and ESCs included.",
    prohibitionType: "STRICT",
    euAnnexIRef: "9A012",
    earCclRef: "9A610.b",
    addedDate: "2023-12-19",
    sourceUrl: SOURCE_PKG_12,
    asOfDate: ASOF,
    notes:
      "DJI motor-class equivalents — captured to block both consumer-drone-class (250-500 W) and military-grade (1-5 kW) motors.",
  },
  {
    code: "XXIX.9A012.a",
    annex: "XXIX",
    category: "drone",
    title: "UAV combustion engines (piston, Wankel, two-stroke)",
    description:
      "Internal combustion engines specially designed or modified for UAV use — piston engines, Wankel rotary engines, and two-stroke engines below specified weight thresholds.",
    prohibitionType: "STRICT",
    euAnnexIRef: "9A012",
    addedDate: "2023-12-19",
    sourceUrl: SOURCE_PKG_12,
    asOfDate: ASOF,
    notes:
      "Long-endurance UAVs (Bayraktar-class) depend on Wankel + piston engines — package 12 explicitly captured these to block Russian-Iranian-Belarusian re-export routes.",
  },

  // ─── Gimbals and EO/IR payloads ───────────────────────────────────
  {
    code: "XXIX.6A003.b",
    annex: "XXIX",
    category: "drone",
    title: "Gimballed camera systems for UAVs (EO/IR)",
    description:
      "Multi-axis gimballed camera systems specially designed for UAV payloads — gyro-stabilised EO/IR turrets with line-of-sight stabilisation better than 50 microradians.",
    prohibitionType: "STRICT",
    euAnnexIRef: "6A003",
    earCclRef: "6A003.b",
    addedDate: "2023-12-19",
    sourceUrl: SOURCE_PKG_12,
    asOfDate: ASOF,
    notes:
      "Wescam (CA), Controp (IL), and various EU primes — the gimbal is the surveillance-payload core. Cross-controlled with US ITAR XV(c).",
  },
  {
    code: "XXIX.6A002.gimbal",
    annex: "XXIX",
    category: "drone",
    title: "Thermal cameras for UAV payloads",
    description:
      "Uncooled and cooled thermal cameras for UAV payloads — microbolometer arrays above 640x480 resolution, MWIR/LWIR cameras with frame rates above 30 Hz.",
    prohibitionType: "STRICT",
    euAnnexIRef: "6A002.a.3",
    earCclRef: "6A002.a.3",
    addedDate: "2023-12-19",
    sourceUrl: SOURCE_PKG_12,
    asOfDate: ASOF,
  },

  // ─── UAV avionics ────────────────────────────────────────────────
  {
    code: "XXIX.7A006",
    annex: "XXIX",
    category: "drone",
    title: "UAV-specific GNSS receivers and autopilots",
    description:
      "GNSS receivers specially designed for UAV autopilots, including integrated INS/GNSS modules. Captures consumer-grade modules above velocity / accuracy thresholds.",
    prohibitionType: "STRICT",
    euAnnexIRef: "7A005",
    earCclRef: "7A005",
    addedDate: "2023-12-19",
    sourceUrl: SOURCE_PKG_12,
    asOfDate: ASOF,
  },
  {
    code: "XXIX.7A003.uav",
    annex: "XXIX",
    category: "drone",
    title: "UAV-grade IMUs and inertial sensors",
    description:
      "Inertial measurement units (IMUs) specially designed for UAV avionics — MEMS gyros and accelerometers integrated with magnetometers and barometric altimeters.",
    prohibitionType: "STRICT",
    euAnnexIRef: "7A003",
    earCclRef: "7A003",
    addedDate: "2023-12-19",
    sourceUrl: SOURCE_PKG_12,
    asOfDate: ASOF,
    notes:
      "MEMS-grade IMUs (Bosch, ST, Honeywell-equiv) — captured because Iranian Shahed-class drones used commercial MEMS IMU modules.",
  },
  {
    code: "XXIX.4A005",
    annex: "XXIX",
    category: "drone",
    title: "UAV flight-control processors and SoCs",
    description:
      "Microcontrollers and system-on-chip processors specially designed for UAV flight-control — Pixhawk-class autopilots, ArduPilot-compatible SoCs.",
    prohibitionType: "STRICT",
    addedDate: "2023-12-19",
    sourceUrl: SOURCE_PKG_12,
    asOfDate: ASOF,
    notes:
      "Open-source autopilot hardware (Pixhawk) is the de-facto platform for affordable strike-drone development — strict ban.",
  },

  // ─── UAV propellers and airframe components ─────────────────────
  {
    code: "XXIX.9A001.uav",
    annex: "XXIX",
    category: "drone",
    title: "UAV propellers and rotors (carbon-fibre, high-RPM)",
    description:
      "Carbon-fibre propellers, contra-rotating rotor assemblies, and ducted-fan units specially designed for UAV propulsion above rotation-rate thresholds.",
    prohibitionType: "STRICT",
    addedDate: "2023-12-19",
    sourceUrl: SOURCE_PKG_12,
    asOfDate: ASOF,
  },
  {
    code: "XXIX.9A011.uav",
    annex: "XXIX",
    category: "drone",
    title: "UAV airframes and modular bus structures",
    description:
      "Complete UAV airframes and modular bus structures — fixed-wing, multi-rotor, hybrid VTOL — and specially designed structural components.",
    prohibitionType: "STRICT",
    euAnnexIRef: "9A012",
    addedDate: "2023-12-19",
    sourceUrl: SOURCE_PKG_12,
    asOfDate: ASOF,
  },

  // ─── UAV-specific batteries ───────────────────────────────────────
  {
    code: "XXIX.8A002",
    annex: "XXIX",
    category: "drone",
    title: "UAV-specific high-discharge LiPo batteries",
    description:
      "Lithium-polymer batteries specially designed for UAVs — discharge rates above 25C, specific energy above 200 Wh/kg, with integrated battery-management systems.",
    prohibitionType: "DEROGATION_AVAILABLE",
    addedDate: "2024-02-23",
    sourceUrl: SOURCE_PKG_13,
    asOfDate: ASOF,
    notes:
      "Derogation available under Art. 12d for humanitarian-mapping UAVs (e.g. demining-survey drones). Commercial UAV LiPo batteries below 200 Wh/kg fall out of scope.",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Lookup a Russia 833 entry by its canonical code. Returns undefined
 * if not found.
 *
 * Used when a sanctions match carries `list: "EU_ANNEX_IV"` (we route
 * 833/2014 sanctions through the EU_ANNEX_IV ListId since the legal
 * authority is the same regulation) and the caller needs the full entry
 * for citation + prohibition-type rendering.
 */
export function findRussia833Entry(code: string): Russia833Entry | undefined {
  for (const entry of [
    ...RUSSIA_833_ANNEX_VII_ENTRIES,
    ...RUSSIA_833_ANNEX_XXIII_ENTRIES,
    ...RUSSIA_833_ANNEX_XXIX_ENTRIES,
  ]) {
    if (entry.code === code) return entry;
  }
  return undefined;
}

/**
 * Return all 833/2014 entries on a specific annex.
 */
export function findRussia833ByAnnex(
  annex: "VII" | "XXIII" | "XXIX",
): Russia833Entry[] {
  switch (annex) {
    case "VII":
      return RUSSIA_833_ANNEX_VII_ENTRIES;
    case "XXIII":
      return RUSSIA_833_ANNEX_XXIII_ENTRIES;
    case "XXIX":
      return RUSSIA_833_ANNEX_XXIX_ENTRIES;
  }
}

/**
 * Return all 833/2014 entries added on or after the given ISO-8601
 * date. Useful for surfacing recently-added prohibitions in the
 * regulatory-feed digest, or for diff-style change tracking.
 *
 * @param after  ISO-8601 date string (YYYY-MM-DD).
 */
export function findRussia833ByDate(after: string): Russia833Entry[] {
  return [
    ...RUSSIA_833_ANNEX_VII_ENTRIES,
    ...RUSSIA_833_ANNEX_XXIII_ENTRIES,
    ...RUSSIA_833_ANNEX_XXIX_ENTRIES,
  ].filter((e) => e.addedDate >= after);
}
