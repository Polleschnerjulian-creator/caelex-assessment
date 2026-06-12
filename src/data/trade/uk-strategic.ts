/**
 * Data-Sprint S3 — UK Strategic Export Control List (space slice).
 *
 * The UK consolidated "Strategic Export Control List" (gov.uk, edition
 * **16 December 2025**) is the post-Brexit successor to the EU dual-use +
 * military control framework. Since EU exit, a UK→EU dual-use export needs
 * a UK licence in its own right; the ECJU (Export Control Joint Unit)
 * administers it. This file gives Passage a first-class UK corpus so a
 * GB-seat exporter sees precise UK ratings/chips instead of falling through
 * to a generic "non-EU" path.
 *
 * ─── WHAT THE UK CONSOLIDATED LIST CONTAINS (source TOC) ──────────────────
 * It bundles SEVEN component lists under one cover. This file curates the
 * SPACE SLICE of three of them:
 *
 *   1. **UK Dual-Use List (Annex I)** — assimilated Council Reg. (EC)
 *      428/2009 Annex I (last amended SI 2025/1197), the five-deep
 *      Wassenaar-derived structure (Categories 0–9, codes like `9A004`,
 *      `5A002`, `6A008`). Structurally IDENTICAL to the EU Annex I the
 *      sibling `eu-annex-i*.ts` files cover — the UK assimilated the EU
 *      regime, so most codes are byte-identical. Curated here only insofar
 *      as each code was VERIFIED to exist in the UK source (Dec 2025
 *      edition) with matching scope; descriptions paraphrase the UK text.
 *   2. **UK Military List (Schedule 2)** — `ML1`–`ML22` (Export Control
 *      Order 2008, last amended SI 2025/1197). Space-relevant positions
 *      only: ML4 (rockets/missiles), ML10 (aircraft/sub-orbital craft),
 *      ML11 ("spacecraft" — the explicit space munitions position), ML15
 *      (military imaging), ML18 (production), ML20 (cryo/superconductive
 *      for space), ML21 (software), ML22 (technology).
 *   3. **UK national controls (Schedule 3 / Article 4A)** — `PL` ratings,
 *      GB-specific supplemental controls with NO EU equivalent. Space/
 *      aerospace-adjacent ones only (PL9002 energetic materials, PL9005
 *      tropo-scatter comms, PL9006/PL8001 explosives-detection, PL9009
 *      aircraft/lighter-than-air, PL9012 submersibles — included for
 *      completeness of the national layer).
 *
 * ─── REGIME CODE LETTERS (preserved as `controlReason`) ───────────────────
 * The UK source prints the originating multilateral regime as a bracketed
 * code letter beneath each classification: `[W]` Wassenaar, `[M…]` MTCR
 * (with the precise MTCR item ref, e.g. `[M2A1a*]`), `[N…]` NSG, `[A…]`
 * Australia Group, `[C…]` CWC. An asterisk means "refer to the source text
 * for full detail". We map these onto the corpus `controlReason` vocabulary
 * (NS/MT/NP/CB) — verified per entry against the bracket in the source, never
 * fabricated.
 *
 * ─── EDITORIAL RULES (same bar as the sibling control-list files) ─────────
 *   - codes are EXACT as written in the UK Dec-2025 edition;
 *   - descriptions are conservative PARAPHRASES of the UK control text —
 *     NOT verbatim copies — and defer to the entry's own thresholds
 *     ("thresholds in the entry govern") rather than restating every number;
 *   - suggestion-level data: the matcher surfaces these as candidates for
 *     HUMAN review, never as legal determinations.
 *
 * ─── HONEST SCOPE (see UK_STRATEGIC_COVERAGE.excluded) ────────────────────
 * This is the SPACE SLICE, not the whole list: the Non-military Firearms
 * List, the Human Rights List, the UK Security & Human Rights List, the
 * Radioactive Source List, the chemical/biological per-substance Annex I
 * detail (1C350+/Cat 7 bio), and the non-space Categories 0/4/8 are NOT
 * enumerated. Cat 1/2 materials are represented by their headline
 * space-relevant codes only (the sibling EU files carry the depth).
 *
 * Source: UK Strategic Export Control List, consolidated edition published
 *   16 December 2025.
 *   Landing page: https://www.gov.uk/government/publications/uk-strategic-export-control-lists-the-consolidated-list-of-strategic-military-and-dual-use-items-that-require-export-authorisation
 *   PDF asset:    https://assets.publishing.service.gov.uk/media/69415ba1f065108822537524/uk_export_control_list_2025.pdf
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

const LANDING_URL =
  "https://www.gov.uk/government/publications/uk-strategic-export-control-lists-the-consolidated-list-of-strategic-military-and-dual-use-items-that-require-export-authorisation";
const PDF_URL =
  "https://assets.publishing.service.gov.uk/media/69415ba1f065108822537524/uk_export_control_list_2025.pdf";

/**
 * As-of date = verification date (the schema contract used across the trade
 * corpus). The UK SOURCE EDITION date is 2025-12-16 (recorded in the header
 * and `UK_STRATEGIC_COVERAGE.scope`); this `asOfDate` records when the
 * Passage entries were checked against that edition.
 */
export const UK_STRATEGIC_AS_OF = "2026-06-13";

/** The UK source edition date (when the consolidated list was published). */
export const UK_STRATEGIC_EDITION_DATE = "2025-12-16";

/**
 * UK corpus control-reason vocabulary — the bracketed regime code letters the
 * UK source prints under each entry, mapped onto the shared trade vocabulary.
 *   NS = Wassenaar ([W]/[WS]/[WVS])   MT = MTCR ([M…])
 *   NP = NSG ([N…])                    CB = chem/bio (AG/CWC)
 *   NAT = UK national control (PL ratings — no multilateral regime letter)
 */
export type UkControlReason = "NS" | "MT" | "NP" | "CB" | "NAT";

/**
 * One UK Strategic Export Control List entry.
 *
 * Distinct from `ClassificationEntry` (whose `jurisdiction` enum does not
 * include the UK) — mirrors how `WassenaarEntry` / `JapanMetiEntry` carry
 * their own shape. The `scheme` discriminates the three real UK code
 * families so the UI and the normalizer can label them correctly.
 */
export interface UkStrategicEntry {
  /** Code exactly as written in the UK Dec-2025 edition. */
  code: string;

  /** Constant tag for the normalized-corpus regime. */
  regime: "UK_STRATEGIC";

  /** Which UK component list this code belongs to. */
  scheme: "DUAL_USE" | "MILITARY" | "NATIONAL";

  /** Short headline (≤ 100 chars). */
  title: string;

  /** Paraphrased plain-English description. NOT verbatim regulatory text. */
  description: string;

  /** Originating-regime reason codes (from the UK source's bracket letters). */
  controlReason: UkControlReason[];

  /** Corresponding EU Annex I code (the UK dual-use codes mirror EU 1:1). */
  euAnnexIRef?: string;

  /** MTCR Annex category when the UK source flags it ([IV*]/[II]/[M…]). */
  mtcrCategory?: "I" | "II" | null;

  sourceUrl: string;
  asOfDate: string;
  notes?: string;
}

// ════════════════════════════════════════════════════════════════════════
// 1. UK DUAL-USE LIST (Annex I) — space slice
//    Assimilated Reg. 428/2009 Annex I, edition 16 Dec 2025.
//    Codes verified present in the UK source; scope matches the EU mirror.
// ════════════════════════════════════════════════════════════════════════

const DUAL_USE_ENTRIES: UkStrategicEntry[] = [
  // ─── Category 3 — Electronics ──────────────────────────────────────
  {
    code: "3A001",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Electronic devices and components (incl. radiation-hardened ICs)",
    description:
      "The broad electronics entry: general-purpose ICs, microwave/millimetre " +
      "components, and — at 3A001.a — integrated circuits rated, qualified or " +
      "certified as radiation-hardened against total dose, single-event upset or " +
      "dose-rate per the entry's gates. The rad-hard OBC/space-electronics entry; " +
      "thresholds in the entry govern.",
    controlReason: ["NS"],
    euAnnexIRef: "3A001",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "3A002",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "General-purpose electronic test, measurement and recording equipment",
    description:
      "Signal generators, network/spectrum analysers, oscilloscopes, atomic " +
      "frequency standards and waveform recorders exceeding the entry's gates — " +
      "satellite-payload and TT&C test-bench equipment.",
    controlReason: ["NS"],
    euAnnexIRef: "3A002",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "3A101",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Electronic equipment usable in rocket systems (MTCR-derived)",
    description:
      "Electronic equipment, devices and components other than 3A001, usable in " +
      "rocket systems or UAVs — analogue-to-digital converters and accelerometer " +
      "test equipment hardened for the entry's environments.",
    controlReason: ["MT"],
    euAnnexIRef: "3A101",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },

  // ─── Category 5 Part 1 — Telecommunications ────────────────────────
  {
    code: "5A001",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Telecommunications systems, equipment and components",
    description:
      "Telecoms equipment including the entry's phased-array, frequency-hopping, " +
      "and laser-communication gates — satellite TT&C and inter-satellite-link " +
      "hardware fall under the relevant sub-paragraphs.",
    controlReason: ["NS"],
    euAnnexIRef: "5A001",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "5A002",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Information security systems (cryptography)",
    description:
      "Information-security ('cryptography') systems, equipment and components " +
      "employing symmetric or asymmetric algorithms above the entry's key-length " +
      "and capability gates. The encrypted-TT&C / command-uplink entry for ground " +
      "and space segments; the entry's decontrol notes govern mass-market items.",
    controlReason: ["NS"],
    euAnnexIRef: "5A002",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    notes:
      "Mass-market / publicly-available cryptography may be decontrolled — verify against the entry's Cryptography and General Software/Technology Notes.",
  },
  {
    code: "5A101",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Telemetry and telecontrol equipment for missiles (MTCR-derived)",
    description:
      "Telemetry and telecontrol equipment, including ground equipment, designed " +
      "or modified for 'missiles' — the MTCR-derived flight-termination and " +
      "range-safety telemetry entry.",
    controlReason: ["MT"],
    euAnnexIRef: "5A101",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },

  // ─── Category 6 — Sensors and lasers ───────────────────────────────
  {
    code: "6A002",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Optical sensors and equipment (focal-plane arrays, image intensifiers)",
    description:
      "Optical detectors, focal-plane arrays (visible to IR), image-intensifier " +
      "tubes, and space-qualified detector assemblies exceeding the entry's " +
      "wavelength, pixel and rad-tolerance gates. The EO-payload detector entry.",
    controlReason: ["NS"],
    euAnnexIRef: "6A002",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "6A003",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Cameras, imaging systems and equipment",
    description:
      "Instrumentation, framing and streak cameras, and imaging systems with the " +
      "entry's frame-rate, radiation-tolerance or spectral gates — the EO/optical " +
      "imager body entry that pairs with the 6A002 detectors.",
    controlReason: ["NS"],
    euAnnexIRef: "6A003",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "6A007",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Gravity meters (gravimeters) and gravity gradiometers",
    description:
      "Gravimeters and gravity gradiometers meeting the entry's stability and " +
      "resolution gates — geodetic and inertial-aiding payloads.",
    controlReason: ["NS"],
    euAnnexIRef: "6A007",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "6A008",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Radar systems, equipment and assemblies (incl. SAR)",
    description:
      "Radar systems and assemblies with the entry's frequency-agility, pulse, " +
      "power-aperture or imaging gates — synthetic-aperture-radar (SAR) payloads " +
      "fall here when they exceed the stated parameters; thresholds govern.",
    controlReason: ["NS"],
    euAnnexIRef: "6A008",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },

  // ─── Category 7 — Navigation and avionics ──────────────────────────
  {
    code: "7A001",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Accelerometers",
    description:
      "Linear and angular accelerometers exceeding the entry's bias, scale-factor " +
      "and operating-environment gates — AOCS and launch-vehicle inertial sensors.",
    controlReason: ["NS"],
    euAnnexIRef: "7A001",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "7A003",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Inertial measurement equipment or systems (IMU/INS)",
    description:
      "Inertial measurement units and navigation systems meeting the entry's " +
      "accuracy gates — the satellite/launcher attitude-and-navigation IMU entry.",
    controlReason: ["NS"],
    euAnnexIRef: "7A003",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "7A004",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Star trackers and components",
    description:
      "'Star trackers' and specially designed components — the celestial-attitude " +
      "determination sensor central to 3-axis-stabilised spacecraft; accuracy and " +
      "field-of-view gates in the entry govern.",
    controlReason: ["NS"],
    euAnnexIRef: "7A004",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "7A005",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Satellite navigation receiving equipment (GNSS)",
    description:
      "'Satellite navigation system' (GNSS) receiving equipment with the entry's " +
      "anti-jam, high-dynamics (above the velocity/altitude civil cut-off) or " +
      "decryption gates — the controlled-GNSS-receiver entry for launchers and " +
      "high-dynamic platforms.",
    controlReason: ["NS"],
    euAnnexIRef: "7A005",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "7A006",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Airborne altimeters (non-standard frequency band)",
    description:
      "Airborne altimeters operating outside 4.2–4.4 GHz and meeting the entry's " +
      "power/resolution gates — terrain-aiding and re-entry altimetry.",
    controlReason: ["NS"],
    euAnnexIRef: "7A006",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "7A101",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Linear accelerometers for missiles (MTCR-derived)",
    description:
      "Linear accelerometers other than 7A001, designed for inertial navigation " +
      "or guidance systems usable in 'missiles' — the MTCR-derived guidance-sensor " +
      "entry.",
    controlReason: ["MT"],
    euAnnexIRef: "7A101",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "7A103",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Navigation instrumentation and systems for missiles (MTCR-derived)",
    description:
      "Instrumentation, navigation equipment and integrated flight-control/GNSS " +
      "systems other than 7A003, usable in 'missiles' — the MTCR-derived guidance " +
      "set entry.",
    controlReason: ["MT"],
    euAnnexIRef: "7A103",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },

  // ─── Category 9 — Aerospace and Propulsion (the space spine) ───────
  {
    code: "9A001",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Aero gas turbine engines (specially designed/modified controls)",
    description:
      "Aero gas turbine engines incorporating the controlled technologies of " +
      "9E003 or designed for the entry's environments — the aero-propulsion entry " +
      "that anchors the Category 9 software/technology cross-references.",
    controlReason: ["NS"],
    euAnnexIRef: "9A001",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9A004",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Space launch vehicles and spacecraft (buses, payloads, on-board systems)",
    description:
      "Space launch vehicles, 'spacecraft', 'spacecraft buses', 'spacecraft " +
      "mission equipment', on-board systems and equipment, terrestrial equipment, " +
      "air-launch platforms and 'sub-orbital craft'. The headline satellite-bus / " +
      "launch-vehicle dual-use entry; carries Wassenaar and MTCR (Cat I context) " +
      "regime letters in the source. See also 9A104.",
    controlReason: ["NS", "MT"],
    euAnnexIRef: "9A004",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A005",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Liquid rocket propulsion systems",
    description:
      "Liquid rocket propulsion systems containing any of the systems or " +
      "components specified in 9A006. See also 9A105 and 9A119. Wassenaar + MTCR " +
      "(Cat I context) in the source.",
    controlReason: ["NS", "MT"],
    euAnnexIRef: "9A005",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A006",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Components for liquid rocket propulsion systems",
    description:
      "Systems and components specially designed for liquid rocket propulsion: " +
      "flight-weight cryogenic refrigerators/dewars and heat pipes (≤30%/yr fluid " +
      "loss), propellant tanks, turbopumps, thrust chambers and control valves per " +
      "the entry's sub-paragraphs. See also 9A106/9A108/9A120.",
    controlReason: ["NS", "MT"],
    euAnnexIRef: "9A006",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A007",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Solid rocket propulsion systems (≥1.1 MNs total impulse)",
    description:
      "Solid rocket propulsion systems having total impulse exceeding 1.1 MNs, or " +
      "specific impulse ≥ 2.4 kNs/kg under the stated nozzle/chamber conditions — " +
      "the 1.1 MNs total-impulse band carries the MTCR Cat I context [IV*]. See " +
      "also 9A107 and 9A119.",
    controlReason: ["NS", "MT"],
    euAnnexIRef: "9A007",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "I",
  },
  {
    code: "9A008",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Components for solid rocket propulsion systems",
    description:
      "Components specially designed for solid rocket propulsion: insulation and " +
      "propellant-bonding (liner) systems providing a strong mechanical bond or " +
      "chemical-migration barrier, nozzles and thrust-vector-control sub-systems " +
      "per the entry. See also 9A108.",
    controlReason: ["NS", "MT"],
    euAnnexIRef: "9A008",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A009",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Hybrid rocket propulsion systems (≥1.1 MNs or >220 kN thrust)",
    description:
      "Hybrid rocket propulsion systems having total impulse exceeding 1.1 MNs or " +
      "vacuum thrust exceeding 220 kN — the MTCR Cat II hybrid-motor entry. See " +
      "also 9A109 and 9A119.",
    controlReason: ["NS", "MT"],
    euAnnexIRef: "9A009",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A010",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Specially designed components/structures for launch vehicles & spacecraft",
    description:
      "Components and structures (each >10 kg) specially designed for launch " +
      "vehicles, launch-vehicle propulsion or 'spacecraft' and manufactured from " +
      "composite materials, pyrolytic/fibrous-reinforced graphite or ceramic " +
      "composites per the entry. See also 1A002 and 9A110.",
    controlReason: ["NS", "MT"],
    euAnnexIRef: "9A010",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A011",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Ramjet, scramjet or combined-cycle engines and components",
    description:
      "Ramjet, scramjet or 'combined cycle engines' and specially designed " +
      "components — air-breathing high-speed propulsion. See also 9A111 and 9A118.",
    controlReason: ["NS", "MT"],
    euAnnexIRef: "9A011",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A012",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Unmanned aerial vehicles (UAVs) and related equipment",
    description:
      "'UAVs', unmanned 'airships' and related equipment/components designed for " +
      "controlled flight beyond the operator's direct natural vision per the entry " +
      "(for 'sub-orbital craft' UAVs see 9A004.h). See also 9A112.",
    controlReason: ["NS"],
    euAnnexIRef: "9A012",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9A101",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Turbojet/turbofan engines usable in missiles (MTCR-derived)",
    description:
      "Turbojet and turbofan engines other than 9A001 with maximum thrust > 400 N " +
      "(excluding civil-certified engines > 8 890 N) and specific fuel consumption " +
      "≤ 0.15 kg/N·h — the MTCR-derived cruise-missile-engine entry.",
    controlReason: ["MT"],
    euAnnexIRef: "9A101",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A104",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Sounding rockets (range ≥ 300 km)",
    description:
      "Sounding rockets capable of a range of at least 300 km — the MTCR Cat I " +
      "context [IV*] sounding-rocket entry. See also 9A004.",
    controlReason: ["MT"],
    euAnnexIRef: "9A104",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "I",
  },
  {
    code: "9A105",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Liquid/gel propellant rocket engines usable in missiles (MTCR-derived)",
    description:
      "Liquid-propellant rocket engines or gel-propellant rocket motors usable in " +
      "'missiles', other than 9A005, integrated or designed to be integrated into " +
      "a propulsion system. See also 9A119.",
    controlReason: ["MT"],
    euAnnexIRef: "9A105",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A106",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Components for liquid/gel rocket propulsion (incl. thrust-vector control)",
    description:
      "Systems or components other than 9A006 specially designed for liquid/gel " +
      "rocket propulsion — including thrust-vector-control sub-systems usable in " +
      "'missiles' and attitude-control thrusters per the entry.",
    controlReason: ["MT"],
    euAnnexIRef: "9A106",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A107",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Solid propellant rocket motors usable in missiles (≥0.841 MNs)",
    description:
      "Solid-propellant rocket motors usable in complete rocket systems or UAVs of " +
      "range ≥ 300 km, other than 9A007, with total impulse ≥ 0.841 MNs — the MTCR " +
      "Cat II solid-motor band. See also 9A119.",
    controlReason: ["MT"],
    euAnnexIRef: "9A107",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A108",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Components for solid/hybrid rocket propulsion usable in missiles",
    description:
      "Components other than 9A008 specially designed for solid and hybrid rocket " +
      "propulsion: motor cases and insulation usable in 9A007/9A009/9A107/9A109 " +
      "subsystems, and nozzles usable in those subsystems.",
    controlReason: ["MT"],
    euAnnexIRef: "9A108",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A110",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Composite structures for missiles/rocket subsystems (MTCR-derived)",
    description:
      "Composite structures, laminates and manufactures thereof, other than " +
      "9A010, specially designed for 'missiles' or the subsystems of 9A005/9A007/" +
      "9A105/9A106.c/9A107/9A108.c/9A116/9A119. See also 1A002.",
    controlReason: ["MT"],
    euAnnexIRef: "9A110",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A115",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Launch support equipment (MTCR-derived)",
    description:
      "Launch support equipment: apparatus and devices for handling, control, " +
      "activation or launching, designed or modified for the space launch vehicles " +
      "of 9A004, the sounding rockets of 9A104 or 'missiles'.",
    controlReason: ["MT"],
    euAnnexIRef: "9A115",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A116",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Re-entry vehicles and equipment usable in missiles (MTCR-derived)",
    description:
      "Re-entry vehicles usable in 'missiles' and equipment designed/modified " +
      "therefor: heat shields and components of ceramic or ablative materials, and " +
      "heat sinks of light-weight high-heat-capacity materials.",
    controlReason: ["MT"],
    euAnnexIRef: "9A116",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A117",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Staging/separation mechanisms and interstages usable in missiles",
    description:
      "Staging mechanisms, separation mechanisms and interstages usable in " +
      "'missiles' — the MTCR Cat II stage-separation hardware entry. See also " +
      "9A121.",
    controlReason: ["MT"],
    euAnnexIRef: "9A117",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A119",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Individual rocket stages usable in complete rocket systems",
    description:
      "Individual rocket stages usable in complete rocket systems or UAVs of " +
      "range ≥ 300 km, other than those in 9A005/9A007/9A009/9A105/9A107/9A109 — " +
      "the MTCR Cat I context [IV*] individual-stage entry.",
    controlReason: ["MT"],
    euAnnexIRef: "9A119",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "I",
  },
  {
    code: "9A120",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Liquid/gel propellant tanks for rocket systems (MTCR-derived)",
    description:
      "Liquid or gel propellant tanks other than 9A006, specially designed for the " +
      "propellants of 1C111 or other liquid/gel propellants used in rocket systems " +
      "capable of delivering ≥ 500 kg payload to ≥ 300 km range.",
    controlReason: ["MT"],
    euAnnexIRef: "9A120",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A350",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Spraying/fogging systems and components (CB-derived aerospace)",
    description:
      "Spraying or fogging systems and components designed or modified for fitting " +
      "to aircraft, lighter-than-air vehicles or UAVs, capable of dispersing an " +
      "aerosol per the entry — the Australia-Group-derived aerial-dispersal entry.",
    controlReason: ["CB"],
    euAnnexIRef: "9A350",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9B001",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Equipment for producing gas-turbine blades, vanes or castings",
    description:
      "Equipment specially designed for the production of gas-turbine blades, " +
      "vanes or tip-shroud castings — directionally-solidified / single-crystal " +
      "casting equipment per the entry.",
    controlReason: ["NS"],
    euAnnexIRef: "9B001",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9B005",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Wind tunnels and test environments for aero/space systems",
    description:
      "Wind tunnels and test rigs capable of the entry's Mach range, plus on-line " +
      "computer systems specially designed for them — aerodynamic-qualification " +
      "infrastructure.",
    controlReason: ["NS"],
    euAnnexIRef: "9B005",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9B006",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Acoustic vibration test equipment for aerospace",
    description:
      "Acoustic vibration test equipment capable of the entry's sound-pressure " +
      "level and components therefor — payload acoustic-qualification rigs.",
    controlReason: ["NS"],
    euAnnexIRef: "9B006",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9B105",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Aerodynamic test facilities usable for missiles (MTCR-derived)",
    description:
      "Wind tunnels and test facilities usable for 'missiles' and their " +
      "subsystems at the entry's Mach range — MTCR-derived aerothermodynamic test " +
      "infrastructure.",
    controlReason: ["MT"],
    euAnnexIRef: "9B105",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9B106",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Environmental chambers and anechoic chambers (MTCR-derived)",
    description:
      "Environmental chambers and anechoic chambers capable of simulating the " +
      "flight conditions of the entry, usable for 'missiles', rocket systems or " +
      "their subsystems — space-environment test chambers.",
    controlReason: ["MT"],
    euAnnexIRef: "9B106",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9B115",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Production equipment for missile propulsion systems (MTCR-derived)",
    description:
      "Specially designed 'production equipment' for the systems, subsystems and " +
      "components of the 9A005–9A009 / 9A105–9A111 propulsion families — MTCR-" +
      "derived motor/engine manufacturing equipment.",
    controlReason: ["MT"],
    euAnnexIRef: "9B115",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9B116",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Production facilities for missile/launch systems (MTCR-derived)",
    description:
      "Specially designed 'production facilities' for the space launch vehicles of " +
      "9A004, the systems of 9A005–9A009, or the 'missiles' and subsystems of the " +
      "MTCR-derived 9A1xx series.",
    controlReason: ["MT"],
    euAnnexIRef: "9B116",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9B117",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Test benches and stands for rocket engines/motors (MTCR-derived)",
    description:
      "Test benches and test stands for solid or liquid propellant rockets/motors " +
      "having the entry's thrust-measurement capacity or simultaneous-axis " +
      "measurement — static-fire test infrastructure.",
    controlReason: ["MT"],
    euAnnexIRef: "9B117",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9C108",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Insulation/liner materials for rocket motor cases (MTCR-derived)",
    description:
      "'Insulation' material in bulk and 'interior lining' for rocket motor cases " +
      "usable in the subsystems of 9A008/9A108 or 'missiles' — MTCR-derived motor " +
      "internal-insulation materials.",
    controlReason: ["MT"],
    euAnnexIRef: "9C108",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9C110",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Resin-impregnated fibre prepregs for missile structures (MTCR-derived)",
    description:
      "Resin-impregnated fibre prepregs and metal-coated fibre preforms for the " +
      "composite structures of 9A110, made with the entry's matrix and fibre — " +
      "MTCR-derived structural-composite feedstock.",
    controlReason: ["MT"],
    euAnnexIRef: "9C110",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9D001",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Software for development of aerospace/propulsion equipment",
    description:
      "'Software', other than 9D003/9D004, specially designed or modified for the " +
      "'development' of equipment or technology in 9A001–9A119, 9B or 9E003 — the " +
      "AOCS / propulsion / launch development-software entry.",
    controlReason: ["NS"],
    euAnnexIRef: "9D001",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9D002",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Software for production of aerospace/propulsion equipment",
    description:
      "'Software', other than 9D003/9D004, specially designed or modified for the " +
      "'production' of equipment specified in 9A001–9A119 or 9B.",
    controlReason: ["NS"],
    euAnnexIRef: "9D002",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9D003",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "FADEC software for controlled engines/equipment",
    description:
      "'Software' incorporating the technology of 9E003.h and used in FADEC " +
      "(full-authority digital engine control) systems for 9A systems or 9B " +
      "equipment.",
    controlReason: ["NS"],
    euAnnexIRef: "9D003",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9D004",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Other aerospace software (CFD, engine test, digital control)",
    description:
      "Other 'software' as listed: 2D/3D viscous CFD validated against tunnel or " +
      "flight data for engine flow modelling, aero-gas-turbine test software, and " +
      "digital electronic engine-control software per the entry.",
    controlReason: ["NS"],
    euAnnexIRef: "9D004",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9D101",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Software for use of MTCR-derived aerospace goods",
    description:
      "'Software' specially designed or modified for the 'use' of the MTCR-derived " +
      "goods of the 9A1xx / 9B1xx series — the missile/launch use-software entry.",
    controlReason: ["MT"],
    euAnnexIRef: "9D101",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9D103",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Software for modelling/simulation of missile subsystems (MTCR-derived)",
    description:
      "'Software' for the modelling, simulation or design integration of the space " +
      "launch vehicles of 9A004 or the MTCR-derived 'missile' subsystems per the " +
      "entry.",
    controlReason: ["MT"],
    euAnnexIRef: "9D103",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9E001",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Technology for development of aerospace equipment/software (GTN)",
    description:
      "'Technology' per the General Technology Note for the 'development' of the " +
      "equipment or software of 9A004–9A012, 9A350, 9B or 9D — covers deemed " +
      "exports (technical data, design know-how). Carries Wassenaar + MTCR + " +
      "Australia-Group + ITAR-context letters in the source.",
    controlReason: ["NS", "MT"],
    euAnnexIRef: "9E001",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9E002",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Technology for production of aerospace equipment (GTN)",
    description:
      "'Technology' per the General Technology Note for the 'production' of the " +
      "equipment specified in 9A004–9A012 or 9A350.",
    controlReason: ["NS"],
    euAnnexIRef: "9E002",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9E101",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Technology for development/production of MTCR-derived aerospace goods",
    description:
      "'Technology' per the GTN for the 'development' of the 9A1xx goods and for " +
      "the 'production' of the UAVs of 9A012 or the MTCR-derived 9A1xx series.",
    controlReason: ["MT"],
    euAnnexIRef: "9E101",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9E102",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Technology for use of space launch vehicles & MTCR-derived goods",
    description:
      "'Technology' per the GTN for the 'use' of the space launch vehicles of " +
      "9A004, the goods of 9A005–9A011, the UAVs of 9A012 or the MTCR-derived " +
      "9A1xx series — the launch/operations technology-transfer entry.",
    controlReason: ["MT"],
    euAnnexIRef: "9E102",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },

  // ─── Category 9 — further verified aerospace/propulsion codes ──────
  // (present in the UK Dec-2025 source; added for completeness of the
  //  Category 9 space spine — engines, production/test equipment, software.)
  {
    code: "9A002",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Marine gas turbine engines (liquid-fuel, controlled thresholds)",
    description:
      "'Marine gas turbine engines' designed to use liquid fuel and meeting all of " +
      "the entry's ISO-continuous-power and temperature gates, and specially " +
      "designed assemblies/components — adjacent aero-derivative propulsion.",
    controlReason: ["NS"],
    euAnnexIRef: "9A002",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9A003",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Specially designed assemblies/components incorporating controlled engine tech",
    description:
      "Specially designed assemblies or components incorporating any of the " +
      "controlled technologies, usable in the propulsion systems of 9A001 or " +
      "9A101 — the engine-subassembly entry.",
    controlReason: ["NS"],
    euAnnexIRef: "9A003",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9A102",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Turboprop engine systems for UAVs (MTCR-derived)",
    description:
      "'Turboprop engine systems' specially designed for UAVs and meeting the " +
      "entry's power gate — the MTCR-derived UAV-propulsion entry.",
    controlReason: ["MT"],
    euAnnexIRef: "9A102",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A109",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Hybrid rocket motors usable in missiles (MTCR-derived)",
    description:
      "Hybrid rocket motors usable in 'missiles' (other than 9A009) and specially " +
      "designed components, including thrust-vector-control sub-systems — the MTCR-" +
      "derived hybrid-motor entry.",
    controlReason: ["MT"],
    euAnnexIRef: "9A109",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A111",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Pulse-jet or detonation engines usable in missiles (MTCR-derived)",
    description:
      "Pulse-jet or detonation engines usable in 'missiles' or UAVs and specially " +
      "designed components — the MTCR-derived air-breathing-engine entry. See also " +
      "9A011/9A118.",
    controlReason: ["MT"],
    euAnnexIRef: "9A111",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A112",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Unmanned aerial vehicles usable in missiles (MTCR-derived)",
    description:
      "'UAVs' other than those of 9A012 with the entry's range/payload " +
      "capability — the MTCR-derived UAV airframe entry. See also 9A012.",
    controlReason: ["MT"],
    euAnnexIRef: "9A112",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A118",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Combustion-regulating devices for missile engines (MTCR-derived)",
    description:
      "Devices to regulate combustion, usable in the engines of 9A011/9A111 which " +
      "are themselves usable in 'missiles' or UAVs — the MTCR-derived " +
      "combustion-control entry.",
    controlReason: ["MT"],
    euAnnexIRef: "9A118",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9A121",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Umbilical and interstage electrical connectors for missiles (MTCR-derived)",
    description:
      "Umbilical and interstage electrical connectors specially designed for " +
      "'missiles', space launch vehicles or sounding rockets — the MTCR-derived " +
      "stage-interface connector entry. See also 9A117.",
    controlReason: ["MT"],
    euAnnexIRef: "9A121",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9B002",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "On-line control systems/instrumentation for gas-turbine engine production",
    description:
      "On-line (real-time) control systems, instrumentation (including sensors) or " +
      "automated data-acquisition and processing equipment specially designed for " +
      "the 'development' of gas turbine engines, assemblies or components.",
    controlReason: ["NS"],
    euAnnexIRef: "9B002",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9B003",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Equipment for producing/testing gas-turbine engine brush seals",
    description:
      "Equipment specially designed for the 'production' or test of gas turbine " +
      "engine brush seals designed to operate at the entry's tip speeds.",
    controlReason: ["NS"],
    euAnnexIRef: "9B003",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9B004",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Tools/dies/fixtures for solid-state joining of superalloy/titanium parts",
    description:
      "Tools, dies or fixtures for the solid-state joining of 'superalloy', " +
      "titanium or intermetallic-aluminide gas-turbine blades, vanes or tip-shrouds " +
      "to discs — directional/single-crystal blade-joining tooling.",
    controlReason: ["NS"],
    euAnnexIRef: "9B004",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9B007",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Equipment for inspecting rocket-motor integrity (MTCR-derived)",
    description:
      "Equipment specially designed for inspecting the integrity of rocket motors " +
      "using non-destructive test techniques other than planar X-ray or basic " +
      "physical/chemical analysis — MTCR-derived motor NDT equipment.",
    controlReason: ["MT"],
    euAnnexIRef: "9B007",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9B008",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Direct-measurement wall skin-friction transducers",
    description:
      "Direct-measurement wall skin-friction transducers specially designed to " +
      "operate at the entry's stagnation temperature — aerothermodynamic test " +
      "instrumentation.",
    controlReason: ["NS"],
    euAnnexIRef: "9B008",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9B009",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Tooling for gas-turbine powder-metallurgy rotor production",
    description:
      "Tooling specially designed for producing gas turbine engine powder-" +
      "metallurgy rotor components capable of operating at the entry's stress and " +
      "temperature gates.",
    controlReason: ["NS"],
    euAnnexIRef: "9B009",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9B010",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Equipment for producing the UAVs of 9A012",
    description:
      "Equipment specially designed for the 'production' of the UAVs and related " +
      "items specified in 9A012.",
    controlReason: ["NS"],
    euAnnexIRef: "9B010",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9B107",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Aerothermodynamic test facilities usable for missiles (MTCR-derived)",
    description:
      "'Aerothermodynamic test facilities' usable for 'missiles', missile rocket " +
      "propulsion systems or their subsystems — MTCR-derived high-enthalpy test " +
      "infrastructure.",
    controlReason: ["MT"],
    euAnnexIRef: "9B107",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9D005",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Software for operation of UAVs (9A012)",
    description:
      "'Software' specially designed or modified for the operation of the UAVs and " +
      "related items specified in 9A012 — the UAV mission/flight-management " +
      "software entry.",
    controlReason: ["NS"],
    euAnnexIRef: "9D005",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "9D104",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Software for use of MTCR-derived rocket/UAV goods",
    description:
      "'Software' specially designed or modified for the 'use' of the MTCR-derived " +
      "goods of the 9A1xx series — a use-software entry distinct from 9D101.",
    controlReason: ["MT"],
    euAnnexIRef: "9D104",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "9D105",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Software coordinating missile subsystem functions (MTCR-derived)",
    description:
      "'Software' specially designed or modified to coordinate the function of " +
      "more than one subsystem of a space launch vehicle or 'missile' — the " +
      "flight-integration / mission-computer software entry.",
    controlReason: ["MT"],
    euAnnexIRef: "9D105",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },

  // ─── Categories 3/6/7 — further verified sensor/laser/nav codes ────
  // (present in the UK Dec-2025 source; the EO/laser/IMU/GNSS payload and
  //  guidance space surface, plus their MTCR-derived siblings.)
  {
    code: "3A201",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Electronic components for nuclear/pulse applications (NSG-derived)",
    description:
      "Electronic components other than 3A001 — capacitors, pulse generators, " +
      "high-speed switches and the like meeting the entry's gates — the NSG-derived " +
      "pulsed-power component entry.",
    controlReason: ["NP"],
    euAnnexIRef: "3A201",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "6A004",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Optical equipment and components (mirrors, gimbals, optics)",
    description:
      "Optical mirrors, lightweight deformable/segmented mirrors, gimbals and " +
      "optical control equipment meeting the entry's gates — telescope and " +
      "EO-payload optical assemblies.",
    controlReason: ["NS"],
    euAnnexIRef: "6A004",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "6A005",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Lasers and laser components",
    description:
      "'Lasers' (other than the listed nuclear-equipment lasers) and components — " +
      "fibre, solid-state, semiconductor and gas lasers exceeding the entry's " +
      "wavelength/power/pulse gates. Laser-communications and lidar payloads.",
    controlReason: ["NS"],
    euAnnexIRef: "6A005",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "6A006",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Magnetometers and magnetic gradiometers",
    description:
      "'Magnetometers', 'magnetic gradiometers' and 'intrinsic magnetic " +
      "gradiometers' and compensation systems exceeding the entry's sensitivity " +
      "gates — magnetic-field science payloads and attitude sensors.",
    controlReason: ["NS"],
    euAnnexIRef: "6A006",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "6A102",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Radiation-hardened detectors usable in missiles (MTCR-derived)",
    description:
      "Radiation-hardened 'detectors' other than 6A002, specially designed or " +
      "modified for protection against nuclear effects and usable in 'missiles' — " +
      "the MTCR-derived hardened-sensor entry.",
    controlReason: ["MT"],
    euAnnexIRef: "6A102",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "6A108",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Radar/tracking systems and radomes usable in missiles (MTCR-derived)",
    description:
      "Radar systems, tracking systems and radomes other than 6A008, specially " +
      "designed or modified for use in 'missiles' — the MTCR-derived seeker/" +
      "tracking-radar entry.",
    controlReason: ["MT"],
    euAnnexIRef: "6A108",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "6A203",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "High-speed cameras and components (NSG-derived)",
    description:
      "Cameras and components other than 6A003 — streak, framing and solid-state " +
      "high-speed cameras meeting the entry's framing-rate gates — the NSG-derived " +
      "diagnostic-imaging entry.",
    controlReason: ["NP"],
    euAnnexIRef: "6A203",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "6A205",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Lasers, amplifiers and oscillators (NSG-derived)",
    description:
      "'Lasers', 'laser' amplifiers and oscillators other than 6A005 meeting the " +
      "entry's wavelength/power gates — the NSG-derived high-energy-laser entry.",
    controlReason: ["NP"],
    euAnnexIRef: "6A205",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "7A002",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Gyros and angular-rate sensors",
    description:
      "Gyros or angular-rate sensors meeting the entry's rated-range/bias/" +
      "scale-factor stability gates, and specially designed components — the " +
      "satellite/launcher rate-sensor entry (incl. fibre-optic and ring-laser gyros).",
    controlReason: ["NS"],
    euAnnexIRef: "7A002",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "7A102",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Gyros usable in missiles (MTCR-derived)",
    description:
      "All types of gyros other than 7A002, usable in 'missiles', with a rated " +
      "drift-rate stability of less than the entry's threshold — the MTCR-derived " +
      "guidance-gyro entry.",
    controlReason: ["MT"],
    euAnnexIRef: "7A102",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "7A116",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Flight-control systems and servo valves for missiles (MTCR-derived)",
    description:
      "Flight-control systems and servo valves designed or modified for use in " +
      "'missiles' — the MTCR-derived actuation/thrust-vector flight-control entry.",
    controlReason: ["MT"],
    euAnnexIRef: "7A116",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "7B001",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Test/calibration/alignment equipment for navigation equipment",
    description:
      "Test, calibration or alignment equipment specially designed for the " +
      "navigation equipment of Category 7 — IMU/gyro/accelerometer characterisation " +
      "rigs.",
    controlReason: ["NS"],
    euAnnexIRef: "7B001",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "7B003",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Equipment for production of Category 7 navigation equipment",
    description:
      "Equipment specially designed for the 'production' of the navigation " +
      "equipment specified in Category 7A — inertial-sensor manufacturing equipment.",
    controlReason: ["NS"],
    euAnnexIRef: "7B003",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "7D002",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Source code for inertial navigation equipment operation/maintenance",
    description:
      "'Source code' for the operation or maintenance of any inertial navigation " +
      "equipment — the controlled INS/IMU firmware-source entry (a deemed-export " +
      "surface).",
    controlReason: ["NS"],
    euAnnexIRef: "7D002",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "6A107",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Gravimeter components usable in missiles (MTCR-derived)",
    description:
      "Gravity meters (gravimeters) and components for gravimeters/gravity " +
      "gradiometers other than 6A007, usable in 'missiles' — the MTCR-derived " +
      "gravity-aiding component entry.",
    controlReason: ["MT"],
    euAnnexIRef: "6A107",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "7D003",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Other navigation software (integrated flight-instrument/GNSS systems)",
    description:
      "Other 'software' of Category 7 as listed — integrated flight-instrument, " +
      "GPS-aided INS, and air-data/attitude-heading-reference system software per " +
      "the entry. A navigation use/integration software surface.",
    controlReason: ["NS"],
    euAnnexIRef: "7D003",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "7E001",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Technology for development of Category 7 navigation/avionics (GTN)",
    description:
      "'Technology' per the General Technology Note for the 'development' of the " +
      "navigation and avionics equipment or software of Category 7 — the " +
      "guidance/navigation technology-transfer entry.",
    controlReason: ["NS"],
    euAnnexIRef: "7E001",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "7D101",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Software for use of MTCR-derived navigation equipment",
    description:
      "'Software' specially designed or modified for the 'use' of the navigation " +
      "equipment of 7A001–7A006 and the MTCR-derived 7A1xx series — guidance " +
      "use-software.",
    controlReason: ["MT"],
    euAnnexIRef: "7D101",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "7E101",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Technology for use of MTCR-derived navigation equipment",
    description:
      "'Technology' per the GTN for the 'use' of the navigation equipment of " +
      "7A001–7A006 and the MTCR-derived 7A1xx series — guidance use-technology " +
      "(deemed-export surface).",
    controlReason: ["MT"],
    euAnnexIRef: "7E101",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },

  {
    code: "6D003",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title:
      "Other sensor software (image processing, real-time signal handling)",
    description:
      "Other 'software' of Category 6 as listed — including image-processing, " +
      "phased-array beam-forming and real-time sensor signal-processing software " +
      "per the entry. An EO/radar payload software surface.",
    controlReason: ["NS"],
    euAnnexIRef: "6D003",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "6E001",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Technology for development of Category 6 sensors/lasers (GTN)",
    description:
      "'Technology' per the General Technology Note for the 'development' of the " +
      "sensors, lasers and equipment of Category 6 — the EO/laser payload " +
      "technology-transfer entry (a deemed-export surface).",
    controlReason: ["NS"],
    euAnnexIRef: "6E001",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "7E002",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Technology for production of Category 7 navigation equipment (GTN)",
    description:
      "'Technology' per the General Technology Note for the 'production' of the " +
      "navigation and avionics equipment of Category 7 — inertial-sensor " +
      "manufacturing know-how.",
    controlReason: ["NS"],
    euAnnexIRef: "7E002",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },

  // ─── Category 1/2 — space-relevant materials/processing (headline) ──
  {
    code: "1A002",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Composite structures or laminates of controlled fibrous materials",
    description:
      "Structures and laminates of an organic or metal matrix using the fibrous/" +
      "filamentary materials of 1C010 or 1C210 — the CFRP satellite/launcher " +
      "structure entry. Fibre properties decide (see 1C010). Headline depth here; " +
      "the EU sibling files carry the full Cat 1 enumeration.",
    controlReason: ["NS"],
    euAnnexIRef: "1A002",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "1C010",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Fibrous/filamentary materials and prepregs (carbon/aramid/glass)",
    description:
      "Organic, carbon and glass fibrous or filamentary materials exceeding the " +
      "entry's specific-modulus AND specific-tensile-strength gates, plus " +
      "resin-impregnated prepregs made from them. Controlled fibre makes downstream " +
      "structures 1A002; standard-modulus commercial fibre is often below the gate.",
    controlReason: ["NS"],
    euAnnexIRef: "1C010",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "1C111",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Propellants and constituent chemicals (MTCR-derived)",
    description:
      "Propellant chemistry usable in rocket systems: spherical aluminium powder, " +
      "metal fuels, oxidisers, binders (e.g. HTPB), plasticisers and bonding agents " +
      "per the entry's sub-paragraphs. Headline depth; verify each substance " +
      "against the entry list.",
    controlReason: ["MT"],
    euAnnexIRef: "1C111",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "2B004",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Hot isostatic presses (HIP)",
    description:
      "Hot isostatic presses with controlled thermal environment and a chamber " +
      "cavity at/above the entry's size and pressure gates — additive-manufacturing " +
      "post-processing and carbon-carbon densification equipment. Headline depth.",
    controlReason: ["NS"],
    euAnnexIRef: "2B004",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "2B009",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Spin-forming and flow-forming machines",
    description:
      "Spin/flow-forming machines meeting the entry's roller-force and axis-control " +
      "conditions — motor-case and pressure-vessel forming equipment. Headline " +
      "depth; see the regime twins 2B109/2B209.",
    controlReason: ["NS"],
    euAnnexIRef: "2B009",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "2B104",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Isostatic presses usable in missile production (MTCR-derived)",
    description:
      "Isostatic presses other than 2B004 meeting the entry's pressure and chamber " +
      "gates, usable for production related to 9A004/9A104 systems.",
    controlReason: ["MT"],
    euAnnexIRef: "2B104",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "2B109",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Flow-forming machines usable in missile production (MTCR-derived)",
    description:
      "Flow-forming machines and specially designed components other than 2B009, " +
      "usable in producing propulsion components (motor cases, domes) for 9A004/" +
      "9A104 systems.",
    controlReason: ["MT"],
    euAnnexIRef: "2B109",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
  {
    code: "2B116",
    regime: "UK_STRATEGIC",
    scheme: "DUAL_USE",
    title: "Vibration test systems and components (MTCR-derived)",
    description:
      "Vibration test systems with digital control feedback capable of the entry's " +
      "acceleration band, plus controllers and shakers — the satellite AIT " +
      "qualification-shaker entry.",
    controlReason: ["MT"],
    euAnnexIRef: "2B116",
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "II",
  },
];

// ════════════════════════════════════════════════════════════════════════
// 2. UK MILITARY LIST (Schedule 2) — space-relevant ML positions
//    Export Control Order 2008 Sch. 2, last amended SI 2025/1197.
//    Headline-depth: the ML positions are broad "specially designed for
//    military use" categories; we capture the headline + space relevance,
//    not every sub-paragraph (declared in coverage.excluded).
// ════════════════════════════════════════════════════════════════════════

const MILITARY_ENTRIES: UkStrategicEntry[] = [
  {
    code: "ML4",
    regime: "UK_STRATEGIC",
    scheme: "MILITARY",
    title: "Bombs, torpedoes, rockets, missiles and related equipment",
    description:
      "Bombs, torpedoes, rockets, 'missiles', other explosive devices and charges " +
      "and related equipment specially designed for military use, and specially " +
      "designed components — the military rocket/missile munitions position. " +
      "Carries NSG and MTCR-technology context letters in the source.",
    controlReason: ["MT", "NP"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    mtcrCategory: "I",
  },
  {
    code: "ML10",
    regime: "UK_STRATEGIC",
    scheme: "MILITARY",
    title: "Military aircraft, sub-orbital craft, UAVs and aero-engines",
    description:
      "'Aircraft', 'lighter-than-air vehicles', UAVs, aero-engines, 'sub-orbital " +
      "craft' and aircraft equipment, related goods and components specially " +
      "designed or modified for military use — the military air/sub-orbital " +
      "platform position.",
    controlReason: ["NS"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "ML11",
    regime: "UK_STRATEGIC",
    scheme: "MILITARY",
    title:
      "Military electronic equipment and spacecraft (the space munitions entry)",
    description:
      "Electronic equipment, 'spacecraft' and components not specified elsewhere " +
      "in the Schedule, specially designed or modified for military use — including " +
      "military satellites and their specially designed components. THE explicit " +
      "military-spacecraft position (the UK equivalent of USML Cat XV / Wassenaar " +
      "ML11). MTCR context letter [M-4] in the source.",
    controlReason: ["NS"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "ML15",
    regime: "UK_STRATEGIC",
    scheme: "MILITARY",
    title: "Military imaging and countermeasure equipment",
    description:
      "Imaging or countermeasure equipment specially designed for military use — " +
      "recorders, image-processing equipment, cameras, thermal/IR and image-" +
      "intensification gear, and specially designed components. The military-EO " +
      "position that pairs with dual-use 6A002/6A003. MTCR context letters in the " +
      "source.",
    controlReason: ["NS"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "ML18",
    regime: "UK_STRATEGIC",
    scheme: "MILITARY",
    title: "Production equipment and environmental test facilities (military)",
    description:
      "Equipment specially designed or modified for the 'production' of goods " +
      "specified in the UK Military List, and environmental test facilities and " +
      "components therefor — the military manufacturing/AIT-infrastructure " +
      "position. NSG/MTCR context letters in the source.",
    controlReason: ["NS"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "ML20",
    regime: "UK_STRATEGIC",
    scheme: "MILITARY",
    title: "Cryogenic and superconductive equipment (incl. space applications)",
    description:
      "Cryogenic and 'superconductive' equipment and specially designed " +
      "components, including equipment configured for installation in a vehicle for " +
      "military ground, marine, airborne or SPACE applications — the cryo-cooled " +
      "military sensor/electronics position.",
    controlReason: ["NS"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "ML21",
    regime: "UK_STRATEGIC",
    scheme: "MILITARY",
    title: "Military software",
    description:
      "'Software' specially designed or modified for the 'development', " +
      "'production' or 'use' of goods or technology in the UK Military List, and " +
      "software specially designed for military operations — the military-software " +
      "position covering satellite/launcher mission software. MTCR context [M-7].",
    controlReason: ["NS"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "ML22",
    regime: "UK_STRATEGIC",
    scheme: "MILITARY",
    title: "Military technology",
    description:
      "'Technology' required for the 'development', 'production' or 'use' of goods " +
      "specified in the UK Military List (subject to the Schedule's notes/General " +
      "Technology Note) — the military technology-transfer / deemed-export position. " +
      "MTCR context [M-8].",
    controlReason: ["NS"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
];

// ════════════════════════════════════════════════════════════════════════
// 3. UK NATIONAL CONTROLS (Schedule 3 / Article 4A) — PL ratings
//    GB-specific supplemental controls; no EU equivalent. Space/aerospace-
//    adjacent ratings only. Most PL ratings are DESTINATION-specific (Iran,
//    Russia, Afghanistan/Iraq) national prohibitions.
// ════════════════════════════════════════════════════════════════════════

const NATIONAL_ENTRIES: UkStrategicEntry[] = [
  {
    code: "PL8001",
    regime: "UK_STRATEGIC",
    scheme: "NATIONAL",
    title:
      "Explosives-detection and IED-protection equipment (national control)",
    description:
      "Equipment and devices (other than Schedule 2 or the listed Annex I codes) " +
      "for detecting 'explosives' or for dealing with/protecting against " +
      "'improvised explosive devices' — UK national control: export prohibited to " +
      "destinations outside a named allied group (EU, AU, NZ, CA, NO, CH, US, JP).",
    controlReason: ["NAT"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    notes:
      "National (PL) control with a destination carve-out, not a multilateral regime code.",
  },
  {
    code: "PL9002",
    regime: "UK_STRATEGIC",
    scheme: "NATIONAL",
    title: "Energetic materials (national control, all destinations)",
    description:
      "'Energetic materials' and mixtures containing them — nitrocellulose " +
      "(>12.5% nitrogen), nitroglycol, PETN, picryl chloride, tetryl and the other " +
      "substances listed — UK national control: export prohibited to ANY " +
      "destination. Propellant/explosive constituents relevant to launch.",
    controlReason: ["NAT"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "PL9005",
    regime: "UK_STRATEGIC",
    scheme: "NATIONAL",
    title:
      "Tropospheric-scatter communication equipment (national control — Iran)",
    description:
      "Tropospheric-scatter communication equipment using analogue or digital " +
      "modulation and specially designed components, plus related technology — UK " +
      "national control: export prohibited to Iran.",
    controlReason: ["NAT"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "PL9006",
    regime: "UK_STRATEGIC",
    scheme: "NATIONAL",
    title:
      "Electro-statically powered explosives-detection equipment (national control)",
    description:
      "Electro-statically powered equipment for detecting 'explosives' (other than " +
      "Schedule 2 / PL8001.a.1 / the listed Annex I code) — UK national control: " +
      "export prohibited to Afghanistan or Iraq.",
    controlReason: ["NAT"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "PL9009",
    regime: "UK_STRATEGIC",
    scheme: "NATIONAL",
    title:
      "Aircraft, lighter-than-air vehicles and steerable parachutes (national control — Iran)",
    description:
      "'Aircraft', 'lighter-than-air vehicles' and steerable parachutes and " +
      "related equipment and components (other than Schedule 2 or the listed Annex " +
      "I codes) — UK national control: export prohibited to Iran. Captures " +
      "aerospace platforms not otherwise on the military/dual-use lists.",
    controlReason: ["NAT"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
  },
  {
    code: "PL9012",
    regime: "UK_STRATEGIC",
    scheme: "NATIONAL",
    title:
      "Submersible vehicles and related systems (national control — Russia)",
    description:
      "'Submersible vehicles' and related systems, equipment and components " +
      "(other than Schedule 2 or the listed Annex I codes), including remote-" +
      "operation control systems and subsea-cable detection/handling equipment — " +
      "UK national control: export prohibited to Russia.",
    controlReason: ["NAT"],
    sourceUrl: PDF_URL,
    asOfDate: UK_STRATEGIC_AS_OF,
    notes:
      "Included for completeness of the national-control layer; marine, not space, but a current GB-specific Russia control.",
  },
];

// ════════════════════════════════════════════════════════════════════════
// Union + coverage + helpers
// ════════════════════════════════════════════════════════════════════════

export const UK_STRATEGIC_ENTRIES: UkStrategicEntry[] = [
  ...DUAL_USE_ENTRIES,
  ...MILITARY_ENTRIES,
  ...NATIONAL_ENTRIES,
];

export interface UkStrategicCoverage {
  jurisdiction: "UK_STRATEGIC";
  scope: string;
  excluded: string[];
  asOfDate: string;
  editionDate: string;
  officialTotalEntriesApprox: number;
  caelexCoverageCount: number;
}

export const UK_STRATEGIC_COVERAGE: UkStrategicCoverage = {
  jurisdiction: "UK_STRATEGIC",
  scope:
    "Space slice of the UK Strategic Export Control List, consolidated edition " +
    "published 16 December 2025. Covers: (1) UK Dual-Use List (assimilated Reg. " +
    "428/2009 Annex I) Category 9 (Aerospace & Propulsion) in depth plus the " +
    "space-relevant codes of Categories 1/2/3/5/6/7; (2) the space-relevant UK " +
    "Military List positions (ML4, ML10, ML11 'spacecraft', ML15, ML18, ML20, " +
    "ML21, ML22) at headline depth; (3) the aerospace-adjacent UK national PL " +
    "ratings (PL8001/9002/9005/9006/9009/9012). The UK dual-use codes mirror the " +
    "EU Annex I 1:1 (post-Brexit assimilation) — each code here was verified to " +
    "exist in the UK Dec-2025 source with matching scope.",
  excluded: [
    "Non-military Firearms List, Human Rights List, UK Security & Human Rights List, and UK Radioactive Source List (not space scope)",
    "UK Dual-Use Categories 0 (nuclear), 4 (computers) and 8 (marine) — out of the space slice",
    "Chemical/biological Annex I per-substance enumerations (Cat 1C350+ / Cat 7 bio) — represented at headline level only",
    "UK Military List positions ML1–ML3, ML5–ML9, ML12–ML14, ML16, ML17, ML19 — not space-relevant",
    "Sub-paragraph detail of the ML positions and most dual-use 9B/9C entries beyond the curated space spine",
    "PL ratings PL9003 (vaccines), PL9004 (americium), PL9008 (Iran vessels), PL9010/PL9011 (firearms) — not space-relevant",
    "Annex IV (intra-UK transfer-licensing subset) — licensing-pathway metadata, not a distinct rating scheme",
  ],
  asOfDate: UK_STRATEGIC_AS_OF,
  editionDate: UK_STRATEGIC_EDITION_DATE,
  // The full UK consolidated list runs to ~398 pages across seven component
  // lists with thousands of sub-paragraphs; this is the space slice.
  officialTotalEntriesApprox: 2000,
  caelexCoverageCount: 0, // set just below to the real length (single source of truth)
};
// Single source of truth: derive the coverage count from the actual array so
// the count can never drift from the data (the test asserts they match).
UK_STRATEGIC_COVERAGE.caelexCoverageCount = UK_STRATEGIC_ENTRIES.length;

/** Case-insensitive exact-code lookup. */
export function findUkStrategicEntry(
  code: string,
): UkStrategicEntry | undefined {
  const needle = code.trim().toUpperCase();
  return UK_STRATEGIC_ENTRIES.find((e) => e.code.toUpperCase() === needle);
}

/** Entries belonging to one of the three UK component schemes. */
export function getUkStrategicByScheme(
  scheme: UkStrategicEntry["scheme"],
): UkStrategicEntry[] {
  return UK_STRATEGIC_ENTRIES.filter((e) => e.scheme === scheme);
}

/** Short citation for UI / provenance surfaces. */
export function getUkStrategicSourceCitation(): string {
  return `UK Strategic Export Control List (consolidated edition ${UK_STRATEGIC_EDITION_DATE}), gov.uk. ${LANDING_URL}`;
}
