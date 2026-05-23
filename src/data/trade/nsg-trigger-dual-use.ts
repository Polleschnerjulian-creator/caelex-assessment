/**
 * Caelex Trade — NSG (Nuclear Suppliers Group) Trigger List + Dual-Use Annex.
 *
 * The Nuclear Suppliers Group is a 48-state multilateral export-control
 * arrangement covering nuclear-related exports. It maintains two control
 * lists, published as IAEA INFCIRC documents:
 *
 *   - Part 1 (Trigger List)    INFCIRC/254/Rev.14/Part 1
 *                              Items "especially designed or prepared"
 *                              (EDP) for nuclear use — reactors, fuel-
 *                              cycle equipment, heavy water, nuclear-
 *                              grade graphite, reprocessing/enrichment
 *                              plants, tritium production, Li-6
 *                              separation.
 *   - Part 2 (Dual-Use Annex)  INFCIRC/254/Rev.11/Part 2
 *                              Items "of potential significance for
 *                              nuclear weapons or fuel cycle" — 5-axis
 *                              CNC machine tools, vacuum furnaces,
 *                              frequency converters, maraging steel,
 *                              isotope-separation equipment, related
 *                              software + technology.
 *
 * Space-sector relevance:
 *
 *   1. Nuclear Thermal Propulsion (NTP) — NASA's NTP programme + BWXT
 *      Advanced Reactor Technologies are reactor-bearing spacecraft.
 *      Captured by Trigger List 1.1 (nuclear reactors) + 1.4 (heavy
 *      water / nuclear-grade graphite for moderators).
 *   2. Radioisotope Thermoelectric Generators (RTGs) — Cassini,
 *      Curiosity, Perseverance, Dragonfly. Captured by Trigger List
 *      source-material entries (Pu-238) + dual-use thermal handling.
 *   3. Nuclear Electric Propulsion (NEP) — emerging for Mars cargo
 *      missions. Captured by the same reactor-bearing entries.
 *   4. Spacecraft structural manufacturing — Dual-Use Annex 2.A.1
 *      (5-axis CNC machine tools) is the single most-used NSG entry
 *      for ordinary smallsat bus + payload-bracket manufacturing.
 *      Dual-Use 2.B.3 (vacuum-induction furnaces) covers composite
 *      and metal-matrix-composite spacecraft components.
 *   5. Maraging steel — Dual-Use Annex Cat 6 — used in pressure-fed
 *      spacecraft propellant tanks (and ballistic-missile cases, which
 *      is why it's NSG-controlled).
 *
 * Each member state implements the NSG lists via national law:
 *
 *   - EU:  Reg. (EU) 2021/821 Annex IV (Nuclear Items) + Annex I parts
 *          (the dual-use items appear in Cat 0-2 of EU Annex I).
 *   - US:  CCL Category 0 (Nuclear), Cat 1 (Materials), Cat 2 (Machine
 *          Tools — 2B201). Trigger List items also under 10 CFR Part
 *          110 (NRC export licensing).
 *   - Japan: METI Schedule 1 Items 1-5.
 *
 * Cross-references in `euAnnexIRef`, `earCclRef`, `wassenaarRef` point
 * operators at the national implementations.
 *
 * Source documents (public):
 *   - https://www.nuclearsuppliersgroup.org/en/guidelines (master)
 *   - INFCIRC/254/Rev.14/Part 1 (2023) — Trigger List
 *   - INFCIRC/254/Rev.11/Part 2 (2023) — Dual-Use Annex
 *
 * NOT a verbatim transcription. Descriptions are paraphrases for
 * operator screening. Authoritative source = the IAEA INFCIRC documents
 * and the implementing-state national law. Caelex output is screening-
 * level draft only; human compliance officer review required.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

const ASOF = "2026-05-23";
const TRIGGER_LIST_URL =
  "https://www.iaea.org/sites/default/files/publications/documents/infcircs/1978/infcirc254r14p1.pdf";
const DUAL_USE_URL =
  "https://www.iaea.org/sites/default/files/publications/documents/infcircs/1978/infcirc254r11p2.pdf";

// ─── Types ────────────────────────────────────────────────────────────

/**
 * Which NSG list the entry comes from.
 *   TRIGGER  — Part 1 (especially-designed-or-prepared nuclear items)
 *   DUAL_USE — Part 2 (items of potential nuclear-weapons significance)
 */
export type NsgList = "TRIGGER" | "DUAL_USE";

/**
 * Top-level category groupings used to organise the entries. These are
 * Caelex labels (not NSG-official) — chosen to make the dataset usable
 * for filtering in the classifier UI.
 */
export type NsgCategory =
  | "reactor" // Nuclear reactors + components
  | "materials" // Source material, fissionable material, moderators
  | "isotope-separation" // Enrichment + reprocessing equipment
  | "heavy-water" // Heavy water + production
  | "machine-tools" // CNC machine tools (dual-use)
  | "electronics" // Frequency converters, etc. (dual-use)
  | "metallurgy" // Vacuum furnaces, maraging steel
  | "software-tech" // Software + technology for above
  | "test-equipment" // Inspection, measurement, NDT
  | "instrumentation" // Sensors, vibration test, radiation detection
  | "other";

export interface NsgEntry {
  /**
   * NSG code as written in the INFCIRC (e.g. "1.1", "1.4.1",
   * "DU.3.A.1"). Trigger List entries use the "X.Y" or "X.Y.Z"
   * numbering; Dual-Use Annex entries prefix with "DU." for
   * dataset-level disambiguation.
   */
  code: string;
  list: NsgList;
  category: NsgCategory;
  /** Short headline (≤120 chars). */
  title: string;
  /** Paraphrased description. NOT verbatim. */
  description: string;
  /** EU Annex I or Annex IV reference (e.g. "0A001", "0C001"). */
  euAnnexIRef?: string;
  /** US CCL ECCN reference (e.g. "0A001", "2B201"). */
  earCclRef?: string;
  /** Wassenaar Arrangement reference (where applicable). */
  wassenaarRef?: string;
  /** Authoritative source URL. */
  sourceUrl: string;
  /** ISO-8601 (YYYY-MM-DD) — last verified against source. */
  asOfDate: string;
  /**
   * True when the entry is meaningfully relevant for spacecraft
   * operators (NTP, RTG, NEP, spacecraft-structures manufacturing,
   * composite spacecraft components). False = NSG entry shipped for
   * Part-1/Part-2 completeness but with negligible space relevance.
   */
  spaceRelevant: boolean;
  /** Optional editor notes — caveats, edge cases, recent amendments. */
  notes?: string;
}

// ─── Trigger List (Part 1) — INFCIRC/254/Rev.14/Part 1 ───────────────

export const NSG_TRIGGER_LIST_ENTRIES: NsgEntry[] = [
  // ─── 1.1 — Nuclear reactors and equipment ────────────────────────
  {
    code: "1.1",
    list: "TRIGGER",
    category: "reactor",
    title: "Complete nuclear reactors",
    description:
      "Nuclear reactors capable of sustained controlled fission chain reaction, including reactors specially designed or modified for space-based propulsion or power.",
    euAnnexIRef: "0A001.a",
    earCclRef: "0A001.a",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Covers NTP reactors (NASA + BWXT NTP, Lockheed Martin DRACO programme) + NEP reactors. NRC 10 CFR Part 110 export licensing required for US exports.",
  },
  {
    code: "1.2",
    list: "TRIGGER",
    category: "reactor",
    title: "Reactor pressure vessels",
    description:
      "Metal vessels — and major shop-fabricated parts — especially designed or prepared to contain the reactor core, including the reactor vessel head.",
    euAnnexIRef: "0A001.b",
    earCclRef: "0A001.b",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },
  {
    code: "1.3",
    list: "TRIGGER",
    category: "reactor",
    title: "Reactor fuel charging and discharging machines",
    description:
      "Equipment especially designed or prepared for inserting or removing fuel in a nuclear reactor.",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },
  {
    code: "1.4",
    list: "TRIGGER",
    category: "reactor",
    title: "Reactor control rods and equipment",
    description:
      "Bars, plates, or tubes especially designed or prepared for control of the reaction rate in a nuclear reactor, including the neutron-absorbing portions and support/suspension structures.",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Relevant for space reactors (NTP, NEP) — control mechanisms must survive launch loads + space-thermal environment.",
  },
  {
    code: "1.5",
    list: "TRIGGER",
    category: "reactor",
    title: "Reactor pressure tubes",
    description:
      "Tubes especially designed or prepared to contain fuel elements and the primary coolant in a reactor at operating pressure above 5 MPa.",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },
  {
    code: "1.6",
    list: "TRIGGER",
    category: "reactor",
    title: "Zirconium tubes (cladding)",
    description:
      "Zirconium metal and alloys in the form of tubes (or assemblies) especially designed or prepared for use as cladding in a nuclear reactor, of mass exceeding 500 kg in any 12-month period.",
    earCclRef: "0A001.f",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },
  {
    code: "1.7",
    list: "TRIGGER",
    category: "reactor",
    title: "Primary coolant pumps",
    description:
      "Pumps especially designed or prepared for circulating the primary coolant for nuclear reactors.",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },

  // ─── 2 — Non-nuclear materials for reactors ──────────────────────
  {
    code: "2.1",
    list: "TRIGGER",
    category: "heavy-water",
    title: "Deuterium and heavy water",
    description:
      "Deuterium, heavy water (deuterium oxide) and any other deuterium compound in which the deuterium-to-hydrogen atom ratio exceeds 1:5000, for use in nuclear reactors, in quantities exceeding 200 kg of deuterium atoms in any 12-month period.",
    euAnnexIRef: "0C003",
    earCclRef: "0C003",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },
  {
    code: "2.2",
    list: "TRIGGER",
    category: "materials",
    title: "Nuclear-grade graphite",
    description:
      "Graphite having a purity level better than 5 ppm boron equivalent and a density greater than 1.50 g/cm³, in quantities exceeding 1 kg, for use in a nuclear reactor.",
    euAnnexIRef: "0C004",
    earCclRef: "0C004",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Used as moderator in space NTP reactors. Also a tripwire for ground-test rigs — nuclear-grade graphite procurement is heavily watched.",
  },

  // ─── 3 — Reprocessing of irradiated fuel ─────────────────────────
  {
    code: "3.1",
    list: "TRIGGER",
    category: "isotope-separation",
    title: "Plants for reprocessing irradiated fuel",
    description:
      "Complete plants and equipment especially designed or prepared for the reprocessing of irradiated fuel elements to separate plutonium from uranium and fission products.",
    euAnnexIRef: "0B001",
    earCclRef: "0B001",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
    notes:
      "Triggers the strongest NSG presumption-of-denial. Effectively non-exportable except under full-scope IAEA safeguards.",
  },
  {
    code: "3.2",
    list: "TRIGGER",
    category: "isotope-separation",
    title: "Solvent extractors and equipment for reprocessing",
    description:
      "Solvent extractors and ion-exchange equipment especially designed or prepared for use in a reprocessing plant.",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },

  // ─── 4 — Enrichment of uranium ────────────────────────────────────
  {
    code: "4.1",
    list: "TRIGGER",
    category: "isotope-separation",
    title: "Plants for enrichment of uranium",
    description:
      "Complete plants and equipment especially designed or prepared for separation of isotopes of uranium, including centrifuges, gaseous-diffusion barriers, laser-based separation systems, electromagnetic isotope separators, and plasma separation systems.",
    euAnnexIRef: "0B001.b",
    earCclRef: "0B001.b",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
    notes:
      "Strongest presumption-of-denial entry alongside reprocessing plants. Effectively non-exportable.",
  },
  {
    code: "4.2",
    list: "TRIGGER",
    category: "isotope-separation",
    title: "Gas centrifuges for uranium enrichment",
    description:
      "Gas centrifuges, assemblies, and components especially designed or prepared for the separation of uranium isotopes (rotor tubes, end caps, magnetic suspension bearings, molecular pumps, frequency changers).",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },
  {
    code: "4.3",
    list: "TRIGGER",
    category: "isotope-separation",
    title: "Laser-based uranium-enrichment systems",
    description:
      "Lasers and components especially designed or prepared for laser-based separation of uranium isotopes (AVLIS, MLIS, CRISLA processes), including high-power CO₂ and excimer lasers, optical multi-pass cells, and laser-illumination chambers.",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },

  // ─── 5 — Heavy water production ──────────────────────────────────
  {
    code: "5.1",
    list: "TRIGGER",
    category: "heavy-water",
    title: "Plants for production of heavy water",
    description:
      "Complete plants and equipment especially designed for the production of heavy water (deuterium-water exchange, ammonia-hydrogen exchange, hydrogen distillation, water electrolysis processes).",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },

  // ─── 6 — Lithium-6 separation ────────────────────────────────────
  {
    code: "6.1",
    list: "TRIGGER",
    category: "isotope-separation",
    title: "Plants for separation of lithium isotopes (Li-6)",
    description:
      "Complete plants and equipment especially designed or prepared for the separation of lithium isotopes (COLEX, lithium amalgam process), including columns, mixer-settlers, and lithium-mercury alloy handling equipment.",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Lithium-6 is relevant to fusion fuel research (tritium breeding); deep-future relevance for fusion-powered spacecraft.",
  },

  // ─── 7 — Tritium production ──────────────────────────────────────
  {
    code: "7.1",
    list: "TRIGGER",
    category: "materials",
    title: "Plants and equipment for tritium production",
    description:
      "Plants for the production, recovery, extraction, concentration, or handling of tritium, including detritiation systems and tritium-handling glove boxes.",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
    notes:
      "Tritium is used as initiator in nuclear weapons. NSG presumption of denial applies.",
  },

  // ─── 8 — Source material / fissionable material ──────────────────
  {
    code: "8.1",
    list: "TRIGGER",
    category: "materials",
    title: "Source material — natural and depleted uranium, thorium",
    description:
      "Natural uranium, depleted uranium (other than in small quantities < 10 kg when used in non-nuclear applications such as shielding), thorium, in quantities exceeding 500 kg of uranium or 1000 kg of thorium.",
    euAnnexIRef: "0C001",
    earCclRef: "0C001",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },
  {
    code: "8.2",
    list: "TRIGGER",
    category: "materials",
    title: "Special fissionable material — plutonium, U-233, U-235 enriched",
    description:
      "Plutonium-239, uranium-233, and uranium enriched in U-235 or U-233. Includes Pu-238 used in RTGs above isotopic-purity thresholds.",
    euAnnexIRef: "0C002",
    earCclRef: "0C002",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Pu-238 (the RTG isotope, NOT weapons-Pu-239) flows through this entry — RTGs for Cassini, Curiosity, Perseverance, Dragonfly. DOE NNSA controls US Pu-238 production; export requires DOE + NRC + DDTC coordination.",
  },
  {
    code: "8.3",
    list: "TRIGGER",
    category: "materials",
    title: "Uranium hexafluoride (UF6)",
    description:
      "Uranium hexafluoride, the form used as feedstock in uranium-enrichment plants.",
    earCclRef: "0C001",
    sourceUrl: TRIGGER_LIST_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },
];

// ─── Dual-Use Annex (Part 2) — INFCIRC/254/Rev.11/Part 2 ──────────────

export const NSG_DUAL_USE_ENTRIES: NsgEntry[] = [
  // ─── 1 — Industrial equipment ────────────────────────────────────
  {
    code: "DU.1.A.1",
    list: "DUAL_USE",
    category: "instrumentation",
    title: "Radiation-hardened TV cameras and lenses",
    description:
      "Radiation-hardened television cameras specially designed or rated to withstand total dose > 5×10⁴ Gy (Si) without operational degradation. Used for hot-cell inspection in nuclear facilities.",
    euAnnexIRef: "1A004",
    earCclRef: "1A004",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Overlap with rad-hard spacecraft imagers — though spacecraft TID requirements (typically 100-300 krad) are below the NSG dual-use 5 MRad threshold. Operators should verify whether their specific FPA also clears 9A515.e / 6A002.a.",
  },
  {
    code: "DU.1.B.1",
    list: "DUAL_USE",
    category: "instrumentation",
    title: "Vibration test systems",
    description:
      "Vibration test systems with electrodynamic shakers capable of imparting > 50 kN root-mean-square force and digital control, used for qualification of nuclear-fuel-cycle components.",
    earCclRef: "2B116",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Spacecraft qualification test labs frequently use vibration shakers meeting this threshold (LDS, IMV, MB Dynamics > 50 kN). End-use-control attention required when exporting test equipment to dual-use jurisdictions.",
  },

  // ─── 2 — Materials processing ────────────────────────────────────
  {
    code: "DU.2.A.1",
    list: "DUAL_USE",
    category: "machine-tools",
    title: "Numerically-controlled (NC) machine tools — 5-axis or better",
    description:
      "Machine tools (turning, milling, grinding, EDM) with two or more axes which can be coordinated simultaneously for contour control, having one-way positioning accuracy ≤ 6 µm and capable of operating with five or more axes simultaneously coordinated. Universally used in advanced spacecraft and propulsion-component manufacturing.",
    euAnnexIRef: "2B201",
    earCclRef: "2B201",
    wassenaarRef: "2.B.1",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "THE highest-volume NSG dual-use entry by satellite-industry impact. Used for: thruster injectors, payload structures, propellant tank flanges, mirror substrates. EU 2B201 + CCL 2B201 are direct mirrors. End-use statements + ICP recommended.",
  },
  {
    code: "DU.2.A.2",
    list: "DUAL_USE",
    category: "machine-tools",
    title:
      "Dimensional inspection machines — coordinate-measuring machines (CMM)",
    description:
      "Coordinate-measuring machines (CMM) with measurement accuracy (E) along any axis ≤ (1.7 + L/1000) µm at length L (in mm), used for high-precision dimensional verification of nuclear-grade components.",
    earCclRef: "2B206",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Spacecraft metrology labs (mirror polishing, antenna-dish curvature, primary-structure inspection) routinely operate CMMs at this accuracy (Zeiss, Mitutoyo, Hexagon). Common space-bus AIT-room equipment.",
  },
  {
    code: "DU.2.A.3",
    list: "DUAL_USE",
    category: "machine-tools",
    title: "Spin-forming and flow-forming machines",
    description:
      "Spin-forming and flow-forming machines, having a force exceeding 60 kN and specially designed components, capable of producing rotationally-symmetric metal parts (e.g. nozzles, pressure vessels, centrifuge rotor tubes).",
    earCclRef: "2B109",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Used for spacecraft propellant-tank dome production (titanium, Inconel). Also flagged under MTCR 2B009 for missile-related production.",
  },
  {
    code: "DU.2.B.1",
    list: "DUAL_USE",
    category: "metallurgy",
    title: "Isostatic presses (hot isostatic presses, HIP)",
    description:
      "Isostatic presses capable of achieving a maximum working pressure ≥ 69 MPa and having a chamber cavity with an inside diameter ≥ 152 mm, with a controlled thermal environment ≥ 873 K (600 °C).",
    earCclRef: "2B204",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "HIPing is standard for spacecraft titanium and Inconel propulsion components (turbopump impellers, thruster injector heads). Common in AM (additive manufacturing) post-processing.",
  },
  {
    code: "DU.2.B.2",
    list: "DUAL_USE",
    category: "metallurgy",
    title: "Vacuum-arc-remelting and vacuum-induction-melting furnaces",
    description:
      "Vacuum or controlled-environment (inert gas) metallurgical melting and casting furnaces capable of achieving temperatures > 1873 K (1600 °C), used to produce nuclear-grade alloys + reactive metals.",
    earCclRef: "2B226",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Used for spacecraft refractory-alloy components (rhenium-iridium thruster chambers, columbium nozzles).",
  },
  {
    code: "DU.2.B.3",
    list: "DUAL_USE",
    category: "metallurgy",
    title: "Vacuum-induction furnaces (composite manufacturing)",
    description:
      "Vacuum induction furnaces capable of operating above 1123 K (850 °C) with a power input ≥ 5 kW, with controlled atmosphere capability. Includes furnaces for hot pressing of composites.",
    earCclRef: "2B227",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Used for spacecraft carbon-carbon composite (C-C) and metal-matrix-composite (MMC) component manufacturing — re-entry heat shields, gimbal bearings.",
  },

  // ─── 3 — Electronics ──────────────────────────────────────────────
  {
    code: "DU.3.A.1",
    list: "DUAL_USE",
    category: "electronics",
    title: "Frequency converters (used for gas-centrifuge motor drives)",
    description:
      "Frequency converters (also known as inverters, converters, generators) having a multi-phase output capable of providing power ≥ 40 VA at any frequency in the range 600-2000 Hz, with frequency control better than 0.1 %.",
    euAnnexIRef: "3A225",
    earCclRef: "3A225",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
    notes:
      "Used to drive gas-centrifuge motors. Lower space relevance — spacecraft power conditioning systems typically operate at different frequency / power profiles. Included for Dual-Use Annex completeness.",
  },
  {
    code: "DU.3.A.2",
    list: "DUAL_USE",
    category: "electronics",
    title: "Mass spectrometers",
    description:
      "Mass spectrometers, components, and related equipment capable of measuring ions of 230 atomic mass units or greater and having a resolution better than 2 parts in 230, with specific detector types (ion sources, magnetic sectors, time-of-flight).",
    earCclRef: "3A233",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Spacecraft mass spectrometers (Rosetta ROSINA, Cassini INMS) typically exceed these performance criteria. Science-payload export licensing flows through this entry.",
  },
  {
    code: "DU.3.A.3",
    list: "DUAL_USE",
    category: "electronics",
    title: "High-voltage power supplies",
    description:
      "Direct-current high-voltage power supplies capable of continuously providing, over a time period of 8 hours, an output voltage ≥ 10 kV with output power ≥ 5 kW, with voltage regulation better than 0.1 %.",
    earCclRef: "3A228",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },
  {
    code: "DU.3.A.4",
    list: "DUAL_USE",
    category: "electronics",
    title: "Strong electric magnets",
    description:
      "Superconducting electromagnets with a magnetic field intensity ≥ 2 T, and components, used in isotope-separation systems and accelerators.",
    earCclRef: "3A001.e",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },

  // ─── 4 — Sensors and lasers ───────────────────────────────────────
  {
    code: "DU.6.A.1",
    list: "DUAL_USE",
    category: "instrumentation",
    title: "Pulsed lasers — high-pulse-energy",
    description:
      "Pulsed lasers (Nd:YAG, ruby, dye, CO₂) having a wavelength between 500 nm and 600 nm OR between 9000 nm and 11000 nm, with output pulse energies ≥ 100 J. Used in laser-based isotope separation (AVLIS, MLIS).",
    euAnnexIRef: "6A005",
    earCclRef: "6A005",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Adjacent to 6A005 spacecraft uplink + laser-comm lasers (TESAT, Mynaric). Different parameter envelope but operators must screen against both Wassenaar 6A005 and NSG dual-use 6.A.1.",
  },
  {
    code: "DU.6.A.2",
    list: "DUAL_USE",
    category: "instrumentation",
    title: "Tunable lasers (CW)",
    description:
      "Tunable continuous-wave (CW) lasers having an output power exceeding 1 W and wavelength tunable over a range exceeding 50 nm. Used in laser-based isotope-separation feedback systems.",
    earCclRef: "6A005",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },

  // ─── 5 — Materials (maraging steel, alloys) ─────────────────────
  {
    code: "DU.5.A.1",
    list: "DUAL_USE",
    category: "metallurgy",
    title: "Maraging steel",
    description:
      "Maraging steel having an ultimate tensile strength ≥ 2050 MPa at 293 K (20 °C), in forms of sheet, plate, or tubing with a wall or plate thickness ≤ 5 mm. Used in centrifuge rotor tubes, missile motor cases, and pressure vessels.",
    euAnnexIRef: "1C216",
    earCclRef: "1C216",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Used in pressure-fed spacecraft propellant tanks + bipropellant systems. Also flagged under MTCR Cat-II for missile-motor cases. End-use control critical.",
  },
  {
    code: "DU.5.A.2",
    list: "DUAL_USE",
    category: "metallurgy",
    title: "Tungsten-rhenium alloys",
    description:
      "Tungsten, tungsten carbide, and alloys containing > 90 % tungsten by weight, in solid forms with cylindrical symmetry (tubes, cylinders, spheres, hemispheres) with diameter > 100 mm and mass > 20 kg.",
    earCclRef: "1C226",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Used in spacecraft electric-propulsion thruster electrodes (Hall-effect thruster cathodes) — though spacecraft thrusters use much smaller pieces than the 100 mm / 20 kg dual-use threshold.",
  },
  {
    code: "DU.5.A.3",
    list: "DUAL_USE",
    category: "metallurgy",
    title: "Fibrous and filamentary materials — carbon, aramid",
    description:
      "Fibrous and filamentary materials (carbon fibre, aramid) with specific modulus exceeding 12.7 × 10⁶ m and specific tensile strength exceeding 23.5 × 10⁴ m, used in centrifuge rotors, missile motor cases, and pressure vessels.",
    euAnnexIRef: "1C010",
    earCclRef: "1C010",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Universally used in spacecraft structures (CFRP panels, payload adapters, antenna reflectors). Toray T800/T1000, Hexcel IM7/IM10 routinely clear this threshold.",
  },
  {
    code: "DU.5.A.4",
    list: "DUAL_USE",
    category: "metallurgy",
    title: "Aluminium alloys for centrifuge rotors",
    description:
      "Aluminium alloys having an ultimate tensile strength of ≥ 460 MPa at 293 K (20 °C), in forms of tubes or cylindrical solid forms with outside diameter > 75 mm.",
    earCclRef: "1C202",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },

  // ─── 6 — Isotope-separation equipment (Dual-Use) ────────────────
  {
    code: "DU.7.A.1",
    list: "DUAL_USE",
    category: "isotope-separation",
    title: "Electrolytic cells for fluorine production",
    description:
      "Electrolytic cells for production of fluorine, with output ≥ 250 g/hour, used in UF6 conversion.",
    earCclRef: "1B231",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },
  {
    code: "DU.7.A.2",
    list: "DUAL_USE",
    category: "isotope-separation",
    title: "Centrifugal multiplane balancing machines",
    description:
      "Centrifugal multiplane balancing machines, fixed or portable, capable of balancing flexible rotors with a length ≥ 600 mm.",
    earCclRef: "2B225",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },

  // ─── 7 — Software ─────────────────────────────────────────────────
  {
    code: "DU.8.D.1",
    list: "DUAL_USE",
    category: "software-tech",
    title: "Software for NC machine tools (5+ axis)",
    description:
      "Software specially designed for the development, production, or use of numerically-controlled machine tools controlled under 2.A.1, including post-processors and CAM software outputting toolpaths for ≥ 5-axis simultaneous control.",
    earCclRef: "2D201",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Catches Siemens NX CAM, Mastercam, Hypermill outputs for 5-axis spacecraft component machining. Software exports under EAR 2D201 are treated identically to the hardware.",
  },
  {
    code: "DU.8.D.2",
    list: "DUAL_USE",
    category: "software-tech",
    title: "Software for centrifuge design and operation",
    description:
      "Software specially designed for the development, production, or operation of gas centrifuges and related cascade-control systems.",
    earCclRef: "0D001",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },

  // ─── 8 — Technology ───────────────────────────────────────────────
  {
    code: "DU.9.E.1",
    list: "DUAL_USE",
    category: "software-tech",
    title: "Technology — nuclear-related production and use",
    description:
      "Technology (in the form of technical data and technical assistance) for the development, production, or use of items controlled under the Dual-Use Annex. Includes blueprints, plans, formulae, instructions, training.",
    earCclRef: "2E201",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Catches deemed-export rules for foreign-national engineers receiving training on 2.A.1 machine tools. Critical for spacecraft factories employing non-domestic engineers — see Caelex deemed-exports module.",
  },
  {
    code: "DU.9.E.2",
    list: "DUAL_USE",
    category: "software-tech",
    title: "Technology — maraging steel production",
    description:
      "Technology for production of maraging steels (vacuum-induction melting, vacuum-arc remelting, heat-treatment cycles) covered under 5.A.1.",
    earCclRef: "1E202",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: true,
    notes:
      "Adjacent to spacecraft propellant-tank technology transfer. Watch for re-export controls when subcontracting tank manufacturing to foreign suppliers.",
  },

  // ─── 9 — Test equipment ──────────────────────────────────────────
  {
    code: "DU.10.A.1",
    list: "DUAL_USE",
    category: "test-equipment",
    title: "Neutron-generator systems",
    description:
      "Neutron-generator systems, including tubes, designed for operation without an external vacuum system and utilising electrostatic acceleration to induce a tritium-deuterium nuclear reaction.",
    earCclRef: "3A231",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },
  {
    code: "DU.10.A.2",
    list: "DUAL_USE",
    category: "test-equipment",
    title: "Flash X-ray generators",
    description:
      "Flash X-ray generators or pulsed electron accelerators having a peak energy ≥ 500 keV, peak power ≥ 5 GW, and (for electron accelerators) average beam power exceeding 1 kW.",
    earCclRef: "3A229",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },
  {
    code: "DU.10.A.3",
    list: "DUAL_USE",
    category: "test-equipment",
    title: "Detonator firing sets and multipoint initiation systems",
    description:
      "Multipoint detonator firing sets capable of firing multiple detonators with a timing precision better than 5 µs.",
    earCclRef: "3A232",
    sourceUrl: DUAL_USE_URL,
    asOfDate: ASOF,
    spaceRelevant: false,
  },
];

// ─── Combined export ─────────────────────────────────────────────────

/**
 * All NSG entries — Trigger List (Part 1) + Dual-Use Annex (Part 2).
 * Consumers needing a single iterable should use this; tests iterate
 * over the individual TRIGGER_LIST / DUAL_USE arrays where the list
 * distribution matters.
 */
export const NSG_ENTRIES: NsgEntry[] = [
  ...NSG_TRIGGER_LIST_ENTRIES,
  ...NSG_DUAL_USE_ENTRIES,
];

// ─── Coverage metadata ───────────────────────────────────────────────

export interface NsgCoverage {
  list: NsgList;
  source: string;
  scope: string;
  excluded: string[];
  asOfDate: string;
  /** Approximate count of entries in the official list. */
  officialTotalEntriesApprox: number;
  /** Caelex coverage count (actual entries in this file). */
  caelexCoverageCount: number;
}

export const NSG_TRIGGER_LIST_COVERAGE: NsgCoverage = {
  list: "TRIGGER",
  source: "INFCIRC/254/Rev.14/Part 1",
  scope:
    "NSG Trigger List — items 'especially designed or prepared for nuclear use'. Coverage prioritises space-relevant entries (reactors, nuclear-grade graphite, Pu-238 for RTGs) + the core fuel-cycle entries for completeness.",
  excluded: [
    "Detailed numeric thresholds for every sub-paragraph — operators must consult the INFCIRC for parametric verification",
    "Non-space-relevant sub-entries (e.g. centrifuge bellows specific dimensions)",
    "Recent amendments not yet adopted by all 48 NSG participating states",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 60,
  caelexCoverageCount: NSG_TRIGGER_LIST_ENTRIES.length,
};

export const NSG_DUAL_USE_COVERAGE: NsgCoverage = {
  list: "DUAL_USE",
  source: "INFCIRC/254/Rev.11/Part 2",
  scope:
    "NSG Dual-Use Annex — items 'of potential significance for nuclear weapons or fuel cycle'. Coverage prioritises space-relevant entries (5-axis CNC machine tools, vacuum furnaces, maraging steel, carbon fibre) + the core dual-use entries for completeness.",
  excluded: [
    "Detailed numeric thresholds for every sub-paragraph",
    "Cat. 4 (computers — see EU/CCL Cat 4 for the parametric envelope)",
    "Cat. 5 (telecom + information security — see EU/CCL Cat 5 for the parametric envelope)",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 80,
  caelexCoverageCount: NSG_DUAL_USE_ENTRIES.length,
};

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Look up an NSG entry by its code (e.g. "1.1", "DU.2.A.1"). Returns
 * undefined if no entry matches.
 */
export function findNsgEntry(code: string): NsgEntry | undefined {
  return NSG_ENTRIES.find((e) => e.code === code);
}

/**
 * Return all entries belonging to the given list (Trigger or
 * Dual-Use).
 */
export function findNsgByList(list: NsgList): NsgEntry[] {
  return NSG_ENTRIES.filter((e) => e.list === list);
}

/**
 * Return all entries marked `spaceRelevant: true`. Useful for the
 * space-sector classifier UI when filtering the catalogue down to the
 * NSG entries operators are most likely to touch.
 */
export function findNsgSpaceRelevant(): NsgEntry[] {
  return NSG_ENTRIES.filter((e) => e.spaceRelevant);
}

/**
 * Return all entries in a given category (reactor, machine-tools,
 * metallurgy, etc.). Useful for category-faceted browsing in the UI.
 */
export function findNsgByCategory(category: NsgCategory): NsgEntry[] {
  return NSG_ENTRIES.filter((e) => e.category === category);
}
