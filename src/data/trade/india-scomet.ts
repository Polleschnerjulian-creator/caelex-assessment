/**
 * India DGFT SCOMET — Special Chemicals, Organisms, Materials,
 * Equipment and Technologies — Aerospace + dual-use subset.
 *
 * India's strategic-goods export-control list is the SCOMET List,
 * Schedule 2 of the ITC(HS) Classifications administered by the
 * Directorate General of Foreign Trade (DGFT) under the Ministry of
 * Commerce. Authorisation flows from the Foreign Trade (Development
 * and Regulation) Act, 1992 ("FT(D&R) Act"), implemented through the
 * Foreign Trade Policy and DGFT Notifications.
 *
 * SCOMET has 9 categories (numbered 0-8):
 *   - Category 0 — Nuclear materials, nuclear-related goods
 *   - Category 1 — Toxic chemical agents & precursors
 *   - Category 2 — Microorganisms, toxins
 *   - Category 3 — Materials, processing & related equipment
 *   - Category 4 — Nuclear-related (mirror IAEA / NSG)
 *   - Category 5 — Aerospace systems, equipment and components
 *     (the "Munitions List" + space items — SCOMET Annex 4 in some
 *     conventions; renumbered Category 5 in the 2018 list).
 *   - Category 6 — Electronics, sensors, lasers
 *   - Category 7 — Computers
 *   - Category 8 — Telecommunications, information security
 *
 * **Indian Space Policy 2023 (ISP-2023)** liberalised commercial space
 * activity (private launches, satellite manufacturing, ground stations)
 * while leaving SCOMET licensing as the principal export-control gate.
 * NSIL (NewSpace India Limited) is ISRO's commercial arm; private
 * NewSpace players (Pixxel, Skyroot Aerospace, Agnikul Cosmos, Bellatrix
 * Aerospace, Dhruva Space, Digantara) still require SCOMET clearance
 * for any export of listed items or related technology.
 *
 * **Licensing authorities** (Indian-specific quirk):
 *   - DGFT — issues the SCOMET licence (default authority).
 *   - DRDO — technical clearance for items with defence/strategic use.
 *   - DAE — Department of Atomic Energy clearance for Cat 0/4.
 *   - ISRO — Indian Space Research Organisation provides
 *     no-objection / technical input for spacecraft items, and certain
 *     ISRO partner exports go via the "ISRO direct-application" route
 *     (Inter-Ministerial Working Group routing) under the Space Policy.
 *
 * Sources (accessed 2026-05-22):
 *   - DGFT SCOMET List (Foreign Trade Policy Schedule-2 Appendix 3)
 *     https://www.dgft.gov.in/CP/?opt=scomet-list
 *   - Foreign Trade (Development & Regulation) Act, 1992
 *     https://commerce.gov.in/about-us/divisions/foreign-trade/
 *   - Indian Space Policy — 2023
 *     https://www.isro.gov.in/Indian_Space_Policy_2023.html
 *
 * NOT a verbatim transcription. Descriptions are paraphrased
 * screening-level drafts; authoritative classification requires a
 * DGFT advance ruling or qualified Indian export-control counsel.
 */

/** Source URL constants. */
const DGFT_SCOMET_URL = "https://www.dgft.gov.in/CP/?opt=scomet-list";
const FT_DR_ACT_URL =
  "https://commerce.gov.in/about-us/divisions/foreign-trade/";
const ISP_2023_URL = "https://www.isro.gov.in/Indian_Space_Policy_2023.html";

/**
 * Direct link to the official Appendix-3 SCOMET List 2024 PDF
 * (DGFT Notification No. 25 dated 02.09.2024, in force 02.10.2024).
 * This is the verbatim source from which the 2026-06-13 deepening
 * batch was paraphrased. The PDF is image-rendered (JFIF streams) so
 * its text was recovered by decompressing the embedded content
 * streams — the codes/parameters below were read from that text.
 *
 * POST-VERIFICATION CORRECTION (2026-06-13, W6 finding S6): the 8A6
 * Sensors & Lasers entries 8A604 and 8A607 were re-verified against the
 * PDF text layer and found mislabelled. 8A604 (head "OPTICS") is optical
 * mirrors/reflectors + optical control equipment — corrected; the
 * displaced detector/focal-plane-array content was re-homed to its real
 * code 8A602 ("OPTICAL SENSORS"). 8A607 (head "GRAVIMETERS") is gravity
 * meters/gradiometers — corrected; the displaced SAR/radar content was
 * re-homed to its real code 8A608 ("RADAR", whose 8A608.d covers SAR).
 * Cross-walks (euAnnexIRef/etc.) are best-effort screening mappings, not
 * part of the verbatim SCOMET text.
 */
const DGFT_SCOMET_2024_PDF_URL =
  "https://content.dgft.gov.in/Website/UPDATED%20SCOMET%20List%202024%20as%20on%2002.09.2024.pdf";

/** As-of date for the file as a whole (original 2026-05-22 batch). */
export const INDIA_SCOMET_AS_OF = "2026-05-22";

/**
 * Verification date for the 2026-06-13 deepening batch (S6) — entries
 * grounded verbatim in the Appendix-3 SCOMET List 2024 PDF. The 8A604
 * (optics/mirrors) and 8A607 (gravimeters) codes were corrected
 * post-verification on the same date (W6 finding S6) — see file header.
 */
export const INDIA_SCOMET_DEEPEN_AS_OF = "2026-06-13";

/**
 * One entry in the Indian SCOMET List.
 *
 * `code` is the canonical SCOMET reference (e.g. "4A001", "8A001").
 * Codes mirror Wassenaar Arrangement structure (digit + letter + 3
 * digits) but the Category-prefix digit is the SCOMET category (0-8),
 * NOT the Wassenaar category — confusingly, SCOMET Category 5 ≈
 * Wassenaar Categories 9 + USML XV (aerospace + spacecraft).
 */
export interface IndiaScometEntry {
  /** Code as written in the SCOMET List, e.g. "4A001", "5A001". */
  code: string;

  /**
   * SCOMET category prefix ("0"-"8"). String to preserve the leading
   * zero where SCOMET writes "Category 0".
   */
  category: string;

  /** Short headline (≤120 chars). */
  title: string;

  /**
   * Paraphrased description — what falls under this code, in plain
   * language for an exporter. NOT a verbatim copy of the List entry.
   */
  description: string;

  /** Cross-reference to the closest EU Annex I (EU 2021/821) code. */
  euAnnexIRef?: string;

  /** Cross-reference to the closest US EAR / CCL ECCN. */
  earCclRef?: string;

  /** Cross-reference to the closest Wassenaar Arrangement code. */
  wassenaarRef?: string;

  /** Cross-reference to the closest MTCR Annex item, if applicable. */
  mtcrRef?: string;

  /** URL to the official text. */
  sourceUrl: string;

  /**
   * Date this entry was last verified against the official source.
   * Format: ISO-8601 (YYYY-MM-DD).
   */
  asOfDate: string;

  /**
   * Indian-specific licensing authority. DGFT is the default issuer;
   * DRDO/DAE/ISRO provide technical clearance / no-objection.
   * Pure spacecraft items often flow via the ISRO direct-application
   * route (Inter-Ministerial Working Group) under ISP-2023.
   */
  licensingAuthority: "DGFT" | "DRDO" | "DAE" | "ISRO";

  /** Optional editor notes (Indian-specific nuance, ISRO partner notes). */
  notes?: string;
}

/**
 * Coverage metadata for the SCOMET data file.
 */
export const INDIA_SCOMET_COVERAGE = {
  jurisdiction: "IN_SCOMET" as const,
  scope:
    "SCOMET Categories 3-8 entries relevant to space and dual-use aerospace exports. Per the official Appendix-3 SCOMET List 2024 (Notification 25 dated 02.09.2024), Category 5 is 'Aerospace systems' (5A Rocket Systems incl. SLVs & sounding rockets, 5B UAVs, 5C Avionics & navigation, 5A3 technology/software — the missile/MTCR space spine), and Category 8 is the large dual-use category (Special Materials, Material Processing, Electronics, Computers, Telecommunications, Information Security, Sensors & Lasers, Navigation & Avionics, Marine, Aerospace & Propulsion) whose 8A7 (Navigation & Avionics), 8A9 (Aerospace & Propulsion — 8A904 spacecraft/SLVs/buses, 8A905-8A910 propulsion, 8A911 ramjet/scramjet, 8A912 UAVs) and 8A6 (Sensors & Lasers) sub-categories carry the Wassenaar-aligned space items. The 2026-06-13 deepening batch (S6) added codes read verbatim from that PDF. Selected Category 3 (materials) and Category 4 (nuclear-related, where space-overlap exists — RTGs, nuclear thermal propulsion).",
  excluded: [
    "Category 0 (raw nuclear materials), Category 1 (chemical agents), Category 2 (biological agents) — out of aerospace scope",
    "Category 6 (Munitions List) — full enumeration omitted; only space/aerospace-relevant overlaps are cross-referenced (e.g. 6A004 ballistic/cruise-missile reclassification, 6A011 military spacecraft/GNSS)",
    "Category 7 (7A-7E) — largely Reserved in the 2024 list; no verifiable space sub-codes to transcribe",
    "Category 8 non-space sub-codes: most of 8B (test/inspection/production equipment), 8C (materials), and the Marine (8A8), Telecommunications (8A4) and Information Security (8A5 Part I/II, GAET/GAEIS) blocks are only partially represented — only the directly space-facing items were transcribed",
    "5B detailed sub-paragraphs and the General Authorisation for Export of Drones (GAED) carve-out detail (only headline 5B/8A912 UAV controls captured)",
    "Special Materials & Equipment Programme (SMP) clearances administered separately by DRDO",
    "ITC(HS) tariff codes — these are import duty codes, not export-control codes",
    "HONEST EXCLUSIONS: any sub-code or controlling parameter not legible in the recovered Appendix-3 PDF text was left out rather than guessed. Cross-references (euAnnexIRef/earCclRef/wassenaarRef/mtcrRef) are best-effort screening cross-walks, NOT part of the verbatim SCOMET text.",
    "POST-VERIFICATION CORRECTION (2026-06-13, W6 finding S6): 8A604 was corrected from mis-coded detectors to its real OPTICS/mirrors scope and 8A607 from mis-coded SAR to its real GRAVIMETERS scope. No control coverage was dropped — the displaced detector/focal-plane-array content was re-homed to 8A602 (OPTICAL SENSORS) and the displaced SAR/radar content to 8A608 (RADAR), both verified against the PDF text layer.",
    "SYNTHETIC 5A1/5A2 CROSS-WALK SLOTS (base-corpus audit 2026-06-13): the original 2026-05-22 Category-5 spacecraft/launch entries (5A101–5A105, 5A201–5A205) use synthetic Wassenaar-mirror sub-numbering that does NOT match the official Appendix-3 SCOMET sub-codes — official 5A101 = complete rocket systems and 5A102 = rocket subsystems/components (MTCR Items 1–2), not spacecraft. These entries are retained as screening cross-walk slots (codes/titles unchanged to preserve cross-walk stability) with per-entry OFFICIAL-CODE NOTEs documenting the divergence; the genuine Wassenaar-aligned space controls live in the 2026-06-13 batch codes 8A904 (spacecraft/buses), 8A905–8A910 (propulsion) and 8A701–8A704 (navigation/avionics incl. star-trackers).",
  ],
  asOfDate: INDIA_SCOMET_AS_OF,
  sourceUrl: DGFT_SCOMET_URL,
  officialTotalEntriesApprox: 300,
  caelexCoverageCount: 0, // set below
};

/**
 * The SCOMET entries. Coverage is intentionally Aerospace-focused.
 */
export const INDIA_SCOMET_ENTRIES: IndiaScometEntry[] = [
  // ─── Category 3 — Materials, Processing ─────────────────────────────
  {
    code: "3A001",
    category: "3",
    title: "Aerospace-grade composite materials and prepregs",
    description:
      "Carbon-fibre / aramid prepregs, ablative composites for re-entry heat shields, and high-temperature ceramic-matrix composites used in launch vehicle nozzles and re-entry vehicles. Mirrors EU 1C010 / Wassenaar 1C010.",
    euAnnexIRef: "1C010",
    earCclRef: "1C010",
    wassenaarRef: "1C010",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DGFT",
    notes:
      "ISRO/VSSC sources Indian composites for PSLV/GSLV/LVM3 nozzles. Indian-origin re-export via private players (Skyroot Vikram, Agnikul Agnibaan) is SCOMET-controlled.",
  },
  {
    code: "3A101",
    category: "3",
    title: "High-purity refractory metals (W, Mo, Re) for re-entry",
    description:
      "Refractory metal powders and forms (tungsten, molybdenum, rhenium, niobium, tantalum) above specified purity / particle-size thresholds. Used in re-entry vehicle nose-cones and rocket engine combustion chambers.",
    euAnnexIRef: "1C513",
    earCclRef: "1C117",
    wassenaarRef: "1C117",
    mtcrRef: "6.C.1",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DGFT",
  },
  {
    code: "3A002",
    category: "3",
    title: "Carbon-carbon composites and ablative materials",
    description:
      "Carbon-carbon composites and ablative materials engineered for surface temperatures > 1500°C — re-entry capsule heat shields, rocket throat inserts, leading-edge thermal protection.",
    euAnnexIRef: "1C107",
    earCclRef: "1C107",
    wassenaarRef: "1C107",
    mtcrRef: "6.C.2",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DRDO",
    notes:
      "DRDO clearance required for ablative materials with re-entry / TPS heritage. Gaganyaan-related supply chain typically routed via DRDO/VSSC.",
  },

  // ─── Category 4 — Nuclear-Related (space-overlap subset) ────────────
  {
    code: "4A001",
    category: "4",
    title: "Radioisotope thermoelectric generators (RTGs) and components",
    description:
      "Radioisotope thermoelectric generators using Pu-238 / Sr-90 / Am-241 for deep-space spacecraft power. Includes thermoelectric conversion modules and radiation shielding designed for space applications.",
    euAnnexIRef: "0A001",
    earCclRef: "0A001",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DAE",
    notes:
      "DAE clearance is mandatory (no DGFT-only route). India's Chandrayaan-3 used radioisotope heater units; future Mangalyaan-2 / lunar polar missions likely SCOMET 4A001 affected.",
  },
  {
    code: "4A002",
    category: "4",
    title: "Nuclear thermal propulsion components",
    description:
      "Reactor cores, fuel elements and nozzles designed for or modified for nuclear thermal rocket propulsion. Pre-emptive control for future deep-space missions; no commercial Indian programme yet.",
    euAnnexIRef: "0A001",
    earCclRef: "0A001",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DAE",
  },

  // ─── Category 5 — Aerospace Systems (the SPACE category) ────────────
  // 5A001-099 — Aircraft + UAVs (paraphrased)
  {
    code: "5A001",
    category: "5",
    title: "Manned aircraft and UAVs above MTCR thresholds",
    description:
      "Complete manned aircraft and unmanned aerial vehicles (UAVs) capable of payload ≥ 500 kg to range ≥ 300 km. MTCR Category I — strong presumption of denial.",
    euAnnexIRef: "9A012",
    earCclRef: "9A012",
    wassenaarRef: "9A012",
    mtcrRef: "1.A.2",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DRDO",
  },
  {
    code: "5A002",
    category: "5",
    title: "Sub-MTCR UAVs (below Category I thresholds)",
    description:
      "UAVs below MTCR Cat I thresholds (e.g. tactical drones, surveillance UAVs). Subject to DGFT case-by-case review under the General Authorisation for Export of Drones (GAED) framework.",
    euAnnexIRef: "9A012",
    earCclRef: "9A012",
    wassenaarRef: "9A012",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DGFT",
    notes:
      "Recent 2024 amendment allows General Authorisation for non-MTCR UAV exports to friendly destinations.",
  },

  // 5A100-199 — Spacecraft + components (cross-walk slots for ISRO partners)
  //
  // PROVENANCE NOTE (base-corpus audit 2026-06-13): these 5A1xx codes are
  // SYNTHETIC Wassenaar-mirror cross-walk slots, NOT the official Appendix-3
  // SCOMET sub-codes. In the official list the 5A1 group is the MTCR missile
  // spine — 5A101 = COMPLETE ROCKET SYSTEMS (ballistic missiles, SLVs, sounding
  // rockets) + complete UAV systems (Item 1); 5A102 = rocket SUBSYSTEMS &
  // COMPONENTS (Item 2). The Wassenaar-aligned spacecraft/bus + spacecraft-
  // component controls live at 8A904 / 8A905-8A910 / 8A701-8A704 (added in the
  // same batch). Codes/titles are kept stable here for cross-walk continuity;
  // each entry carries an OFFICIAL-CODE NOTE flagging the divergence.
  {
    code: "5A101", // Z35-IN-SCOMET — parametric spacecraft (synthetic slot)
    category: "5",
    title: "Complete spacecraft and satellite buses",
    description:
      "Complete spacecraft including communication, Earth-observation, navigation and scientific satellites; satellite platforms (buses) and integrated subsystems. Covers anything that operates in orbit.",
    euAnnexIRef: "9A004",
    earCclRef: "9A515.a",
    wassenaarRef: "9A004",
    mtcrRef: "1.A.1",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "OFFICIAL-CODE NOTE (base-corpus audit 2026-06-13): in the official Appendix-3 SCOMET List 2024, code 5A101 actually means COMPLETE ROCKET SYSTEMS (ballistic missiles, space-launch vehicles, sounding rockets) and complete UAV systems — MTCR Item 1, the missile spine — NOT spacecraft. This entry keeps the synthetic Wassenaar-mirror 'spacecraft/bus' framing as a screening cross-walk slot for orbital hardware exported from an Indian seat; the genuine Wassenaar-aligned spacecraft/bus control home is 8A904 (EU 9A004), added in the same batch. ISRO direct-application route under ISP-2023 — Pixxel, Dhruva Space, Digantara, Bellatrix typically file via the Inter-Ministerial Working Group rather than the DGFT online portal.",
  },
  {
    code: "5A102",
    category: "5",
    title: "Spacecraft propulsion subsystems (chemical, electric)",
    description:
      "Spacecraft chemical thrusters (monoprop, biprop), Hall-effect thrusters, gridded ion thrusters, electric propulsion power processing units (PPUs). MTCR Cat II for systems usable on launch vehicles.",
    // CORRECTED 2026-06-13: electric propulsion = EU 9A004.f / Wassenaar 9.A.4,
    // NOT 9A011 (= ramjet/scramjet/combined-cycle). US side already 9A515.f.
    euAnnexIRef: "9A004.f",
    earCclRef: "9A515.f",
    wassenaarRef: "9.A.4",
    mtcrRef: "9.A.6",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "OFFICIAL-CODE NOTE (base-corpus audit 2026-06-13): official SCOMET 5A102 actually means SUBSYSTEMS & COMPONENTS usable in rocket systems — individual rocket stages, solid/liquid rocket engines, motor cases & liners, nozzles, staging mechanisms, propellant control, re-entry vehicles, guidance sets and thrust-vector control (MTCR Item 2) — NOT spacecraft propulsion. This entry retains the synthetic 'spacecraft chemical/electric propulsion' framing as a cross-walk slot; the genuine Wassenaar-aligned homes are 8A905/8A906 (liquid propulsion systems/components) and EU 9A004.f / Wassenaar 9.A.4 for spacecraft electric propulsion. Bellatrix Aerospace electric-propulsion exports screen here.",
  },
  {
    code: "5A103",
    category: "5",
    title: "Space-qualified solar arrays and power systems",
    description:
      "Triple-junction GaAs solar cells, deployable solar arrays, space-qualified batteries (Li-ion), and power conditioning electronics rated for space radiation environments.",
    euAnnexIRef: "9A515.d",
    earCclRef: "9A515.d",
    wassenaarRef: "9A001",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "OFFICIAL-CODE NOTE (base-corpus audit 2026-06-13): official SCOMET Category-5 sub-numbering does NOT allocate 5A103 to spacecraft power — official 5A1 enumerates only 5A101 (complete rocket systems) and 5A102 (rocket subsystems/components). Synthetic cross-walk slot; the Wassenaar-aligned home for space-qualified solar arrays/power is the spacecraft-bus/structures block 8A904 / 8A910 (Wassenaar 9A001 / 9A515).",
  },
  {
    code: "5A104",
    category: "5",
    title: "Spacecraft thermal control and structural components",
    description:
      "Space-qualified thermal control hardware (heat pipes, MLI blankets, radiators) and spacecraft structural components (composite panels, deployable booms).",
    earCclRef: "9A515.e",
    wassenaarRef: "9A515",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "OFFICIAL-CODE NOTE (base-corpus audit 2026-06-13): 5A104 is not an official SCOMET 5A1 sub-code (the official 5A1 group stops at 5A101/5A102, the MTCR missile spine). Synthetic cross-walk slot; spacecraft thermal-control and structural hardware is Wassenaar-aligned at 8A910 (launch-vehicle/spacecraft structures and components, EU 9A010 / Wassenaar 9A515).",
  },
  {
    code: "5A105",
    category: "5",
    title: "Star trackers, sun sensors, attitude determination",
    description:
      "Spacecraft attitude-determination hardware: star trackers, sun sensors, Earth sensors, magnetometers, fibre-optic gyroscopes meeting space radiation tolerance.",
    euAnnexIRef: "7A004",
    earCclRef: "7A004",
    wassenaarRef: "7A004",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "OFFICIAL-CODE NOTE (base-corpus audit 2026-06-13): 5A105 is not an official SCOMET 5A1 sub-code. Synthetic cross-walk slot; the genuine Wassenaar-aligned homes for these attitude-determination items are 8A704 (star trackers, EU/Wassenaar 7A004) and 8A703 (IMU/INS, 7A003) in the 8A7 Navigation & Avionics block added in the same batch.",
  },

  // 5A200-299 — Launch vehicle components (synthetic cross-walk slots)
  //
  // PROVENANCE NOTE (base-corpus audit 2026-06-13): like the 5A1xx block, these
  // original 5A201-5A205 codes are SYNTHETIC. In the official Appendix-3 list a
  // complete SLV is 5A101 and its stages/engines/RVs/guidance/TVC are 5A102
  // (MTCR Items 1-2); the official 5A2xx codes are PRODUCTION & TEST EQUIPMENT
  // (see the 2026-06-13 batch 5A206-5A218). Engine/motor hardware is also
  // Wassenaar-aligned at 8A905-8A910. Kept stable for cross-walk continuity;
  // each entry carries an OFFICIAL-CODE NOTE.
  {
    code: "5A201", // Z35-IN-SCOMET — launch vehicle stages (synthetic slot)
    category: "5",
    title: "Complete launch vehicles and launch vehicle stages",
    description:
      "Complete space-launch vehicles (SLVs) and complete launch vehicle stages capable of delivering ≥ 500 kg payload to ≥ 300 km. MTCR Category I — strong presumption of denial.",
    euAnnexIRef: "9A004",
    earCclRef: "9A004",
    wassenaarRef: "9A004",
    mtcrRef: "1.A.1",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DRDO",
    notes:
      "OFFICIAL-CODE NOTE (base-corpus audit 2026-06-13): in the official Appendix-3 list a complete space-launch vehicle is 5A101 and an individual launch-vehicle stage is a 5A102 subsystem (MTCR Items 1-2) — the synthetic '5A201' code is a cross-walk slot, not an official SCOMET sub-code. PSLV / GSLV / LVM3 (NSIL commercial launches) and private SLVs (Skyroot Vikram-1, Agnikul Agnibaan) are MTCR Cat I. Joint clearance via DRDO + ISRO + DGFT.",
  },
  {
    code: "5A202",
    category: "5",
    title: "Liquid propellant rocket engines",
    description:
      "Liquid-propellant rocket engines (LOx/kerosene, LOx/methane, LOx/LH2, hypergolic) with total impulse ≥ 1.1 × 10⁶ N·s. MTCR Category II.",
    euAnnexIRef: "9A005",
    earCclRef: "9A005",
    wassenaarRef: "9A005",
    mtcrRef: "2.A.1",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DRDO",
    notes:
      "OFFICIAL-CODE NOTE (base-corpus audit 2026-06-13): liquid rocket engines are an official 5A102 subsystem (MTCR Item 2) and are Wassenaar-aligned at 8A905/8A906 (liquid propulsion systems/components) — the synthetic '5A202' code is a cross-walk slot, not an official SCOMET sub-code. ISRO CE-20 cryogenic engine, Skyroot Raman / Kalam engines, Agnikul Agnilet 3D-printed engine all screen here (official home 8A906).",
  },
  {
    code: "5A203",
    category: "5",
    title: "Solid propellant rocket motors and grains",
    description:
      "Solid-propellant rocket motors (cases, igniters, nozzles, propellant grains) above MTCR impulse thresholds. Used in PSLV strap-on boosters and many private SLV first stages.",
    euAnnexIRef: "9A007",
    earCclRef: "9A007",
    wassenaarRef: "9A007",
    mtcrRef: "2.A.1",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DRDO",
    notes:
      "OFFICIAL-CODE NOTE (base-corpus audit 2026-06-13): solid rocket motors are an official 5A102 subsystem (MTCR Item 2) and are Wassenaar-aligned at 8A907/8A908 (solid propulsion systems/components, EU/Wassenaar 9A007/9A008) — the synthetic '5A203' code is a cross-walk slot, not an official SCOMET sub-code.",
  },
  {
    code: "5A204",
    category: "5",
    title: "Launch vehicle guidance, navigation and control",
    description:
      "Launch vehicle GNC subsystems: inertial measurement units (IMUs) above gyro-drift thresholds, flight computers, thrust vector control actuators.",
    euAnnexIRef: "7A103",
    earCclRef: "7A103",
    wassenaarRef: "7A103",
    mtcrRef: "9.A.5",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DRDO",
    notes:
      "OFFICIAL-CODE NOTE (base-corpus audit 2026-06-13): launch-vehicle GNC is an official 5A102 subsystem (guidance sets / TVC, MTCR Item 2) and is itemised in the official 5C avionics block (5C001-5C003 guidance/gyros/accelerometers) and the dual-use 8A7 block (8A701-8A703) — the synthetic '5A204' code is a cross-walk slot, not an official SCOMET sub-code.",
  },
  {
    code: "5A205",
    category: "5",
    title: "Re-entry vehicles and recovery systems",
    description:
      "Re-entry vehicle structures, heat shields, recovery parachutes and drag chutes designed for orbital or sub-orbital re-entry. Encompasses Gaganyaan crew module and future reusable launch programmes.",
    euAnnexIRef: "9A004",
    earCclRef: "9A004",
    wassenaarRef: "9A004",
    mtcrRef: "1.A.1",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DRDO",
    notes:
      "OFFICIAL-CODE NOTE (base-corpus audit 2026-06-13): re-entry vehicles are an official 5A102 subsystem (MTCR Item 2.A.1.c) — the synthetic '5A205' code is a cross-walk slot, not an official SCOMET sub-code. Manned/recovery spacecraft structures are additionally Wassenaar-aligned at 8A904/8A910.",
  },

  // ─── Category 6 — Electronics, Sensors ──────────────────────────────
  {
    code: "6A001",
    category: "6",
    title: "Radiation-hardened integrated circuits (rad-hard ICs)",
    description:
      "Radiation-hardened ICs, MCUs, FPGAs and memories rated for total ionising dose ≥ 5×10⁴ rad(Si) and single-event-upset criteria. Mirror of EU Cat 3 + Wassenaar 3A001.a.1.",
    euAnnexIRef: "3A001.a.1",
    earCclRef: "3A001.a.1",
    wassenaarRef: "3A001.a.1",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DGFT",
    notes:
      "ISRO Semiconductor Lab (SCL) Chandigarh produces rad-hard ICs for Indian satellites; commercial export licence via DGFT with ISRO no-objection.",
  },
  {
    code: "6A002", // Z35-IN-SCOMET — sensors (high-resolution EO)
    category: "6",
    title: "High-resolution electro-optical imaging sensors",
    description:
      "Electro-optical sensors and focal plane arrays (FPAs) with spatial resolution sufficient to resolve ≤ 0.50 m GSD from orbit. Includes silicon CCD/CMOS and HgCdTe IR detectors for space-based imaging.",
    euAnnexIRef: "6A002",
    earCclRef: "6A002",
    wassenaarRef: "6A002",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "Pixxel Firefly hyperspectral, Dhruva Space EO payloads — covered. ISRO no-objection often required even for sub-resolution sensors.",
  },
  {
    code: "6A003",
    category: "6",
    title: "Optical sensors and infrared focal plane arrays",
    description:
      "IR FPAs (SWIR, MWIR, LWIR) and uncooled bolometers above defined pixel-pitch / NETD thresholds. Used in thermal Earth-observation and weather satellites.",
    euAnnexIRef: "6A002",
    earCclRef: "6A002",
    wassenaarRef: "6A002",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DGFT",
  },
  {
    code: "6A008",
    category: "6",
    title: "Spaceborne synthetic aperture radar (SAR)",
    description:
      "Spaceborne SAR systems: X-band / C-band / L-band SAR with bandwidth and antenna parameters meeting Wassenaar 6A008.l.3 thresholds. Includes ISRO RISAT heritage and private SAR programmes.",
    euAnnexIRef: "6A008",
    earCclRef: "6A008",
    wassenaarRef: "6A008",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "ISRO",
  },
  {
    code: "6E001",
    category: "6",
    title: "Technology for development of rad-hard electronics",
    description:
      "Technology (design data, process know-how) for development or production of radiation-hardened ICs and space-qualified electronics. Intangible technology transfer is in scope.",
    euAnnexIRef: "3E001",
    earCclRef: "3E001",
    wassenaarRef: "3E001",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DGFT",
  },

  // ─── Category 7 — Computers ─────────────────────────────────────────
  {
    code: "7A001",
    category: "7",
    title: "High-performance computers for satellite imaging",
    description:
      "Digital computers and electronic assemblies with adjusted peak performance (APP) above Wassenaar 4A003 thresholds. Used for ground-segment satellite imagery processing and on-board SAR processing.",
    euAnnexIRef: "4A003",
    earCclRef: "4A003",
    wassenaarRef: "4A003",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DGFT",
  },
  {
    code: "7A002",
    category: "7",
    title: "Space-qualified onboard computers",
    description:
      "Space-qualified onboard computers and processing units rated for radiation environment with redundancy and error-correcting architectures. Cross-controlled by 6A001 (rad-hard).",
    earCclRef: "9A515.d",
    wassenaarRef: "4A003",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "ISRO",
  },
  {
    code: "7D001",
    category: "7",
    title: "Software for high-performance computing in aerospace",
    description:
      "Software specially designed for use of computers above 7A001 thresholds, or for aerospace simulation (CFD, structural FEA, orbit-determination, satellite imagery processing pipelines).",
    euAnnexIRef: "4D001",
    earCclRef: "4D001",
    wassenaarRef: "4D001",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DGFT",
  },

  // ─── Category 8 — Telecommunications, Information Security ───────────
  {
    code: "8A001", // Z35-IN-SCOMET — telecom (uplink/downlink, ISL)
    category: "8",
    title: "Spacecraft telecommunications — uplink, downlink, TT&C",
    description:
      "Spacecraft telemetry / tracking / command (TT&C) systems, mission-data downlink transmitters, and uplink command receivers. Includes high-bandwidth Ka / Ku / X-band space-segment hardware.",
    euAnnexIRef: "5A001.b",
    earCclRef: "5A001.b",
    wassenaarRef: "5A001.b",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "ISRO ISAC builds heritage TT&C; private players (Astrome, Ananth Technologies) routed via ISRO/DGFT joint clearance.",
  },
  {
    code: "8A002",
    category: "8",
    title: "Inter-satellite optical communication terminals (OISL)",
    description:
      "Free-space optical inter-satellite links: laser communication terminals with bandwidth / divergence parameters above Wassenaar 5A001.f thresholds. Emerging area for Indian LEO constellations.",
    euAnnexIRef: "5A001.f",
    earCclRef: "5A001.f",
    wassenaarRef: "5A001.f",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "ISRO",
  },
  {
    code: "8A003",
    category: "8",
    title: "Anti-jam / anti-spoof satellite navigation receivers",
    description:
      "GNSS receivers (GPS, NavIC, Galileo, BeiDou) with anti-jam / anti-spoof / military-code capability. Mirror of Wassenaar 7A005 stricter band.",
    euAnnexIRef: "7A005",
    earCclRef: "7A005",
    wassenaarRef: "7A005",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DRDO",
    notes:
      "India's NavIC (IRNSS) regional system: receiver designs are DRDO-clearance items even though NavIC is civilian.",
  },
  {
    code: "8A004",
    category: "8",
    title: "Information security — cryptographic equipment for space links",
    description:
      "Cryptographic equipment, components and software designed or modified for satellite uplink/downlink protection (anti-jam waveforms, secure TT&C). Mirrors Wassenaar 5A002.",
    euAnnexIRef: "5A002",
    earCclRef: "5A002",
    wassenaarRef: "5A002",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DRDO",
  },
  {
    code: "8E001",
    category: "8",
    title: "Technology for development of space-segment telecom hardware",
    description:
      "Technology, design data and intangible technology transfer (ITT) for development or production of space-segment TT&C and inter-satellite link hardware listed in 8A001-8A004.",
    euAnnexIRef: "5E001",
    earCclRef: "5E001",
    wassenaarRef: "5E001",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "DGFT",
  },

  // ─── Category 5 — Software & Technology (aerospace) ─────────────────
  {
    code: "5D001",
    category: "5",
    title: "Software for spacecraft and launch vehicle systems",
    description:
      "Software specially designed for the development, production, operation or maintenance of items in SCOMET Category 5 (spacecraft, launch vehicles, propulsion, GNC). Includes flight software and ground-system control software.",
    euAnnexIRef: "9D001",
    earCclRef: "9D515",
    wassenaarRef: "9D001",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "ISRO",
  },
  {
    code: "5E001",
    category: "5",
    title: "Technology for spacecraft and launch vehicle development",
    description:
      "Technology (technical data, technical assistance) for the development, production, operation or maintenance of items in SCOMET Category 5. Intangible technology transfer (e.g. cloud-based engineering data, foreign engineer training) is in scope under DGFT Notification 11/2018.",
    euAnnexIRef: "9E001",
    earCclRef: "9E515",
    wassenaarRef: "9E001",
    mtcrRef: "1.E.1",
    sourceUrl: DGFT_SCOMET_URL,
    asOfDate: INDIA_SCOMET_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "Cross-border deemed-export (foreign nationals working on Indian spacecraft programmes) is technology transfer for SCOMET purposes — same logic as US ITAR deemed-export.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2026-06-13 DEEPENING BATCH (S6) — codes read verbatim from the
  // Appendix-3 SCOMET List 2024 PDF (Notification 25, 02.09.2024).
  // Category 5 (Aerospace / Rocket systems) is the space spine; Category
  // 8's 8A7 (Navigation & Avionics), 8A9 (Aerospace & Propulsion) and the
  // related 8D/8E software & technology carry the dual-use space items.
  // ═══════════════════════════════════════════════════════════════════

  // ─── Category 5A2 — Rocket-system production & test equipment ────────
  {
    code: "5A206",
    category: "5",
    title: "Filament-winding and fibre-placement machines (2+ axes)",
    description:
      "Filament-winding or fibre-placement machines whose motion for positioning, wrapping and winding fibres can be coordinated and programmed in two or more axes; precision mandrels and the coordinating/programming controls therefor. Core to motor-case and pressure-vessel manufacture.",
    euAnnexIRef: "9B105",
    earCclRef: "1B101",
    mtcrRef: "6.B.1",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes:
      "SCOMET 5A206 (5A2 production equipment). Used to wind composite motor cases for PSLV strap-ons and private SLV stages.",
  },
  {
    code: "5A208",
    category: "5",
    title: "Isostatic presses (≥69 MPa, ≥600°C, ≥152 mm cavity)",
    description:
      "Isostatic presses with maximum working pressure ≥ 69 MPa, designed to achieve and maintain a controlled thermal environment of ≥ 600°C, and possessing a chamber cavity with inside diameter ≥ 152 mm. Densifies composite and refractory rocket-motor components.",
    euAnnexIRef: "2B104",
    earCclRef: "2B104",
    mtcrRef: "6.B.3",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5A208.",
  },
  {
    code: "5A209",
    category: "5",
    title: "Vibration test environmental chambers (≥15 km altitude sim)",
    description:
      "Environmental chambers simulating vibration environments with altitude simulation ≥ 15 km, or temperature ranging between −50°C and +125°C. Qualification testing of launch-vehicle and spacecraft hardware.",
    euAnnexIRef: "9B105",
    earCclRef: "9B105",
    mtcrRef: "15.B.1",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5A209 (paired with acoustic chambers in 5A210).",
  },
  {
    code: "5A210",
    category: "5",
    title: "Acoustic test environmental chambers (≥140 dB / ≥4 kW)",
    description:
      "Environmental chambers simulating an acoustic pressure level of ≥ 140 dB or rated acoustic power output ≥ 4 kW, with altitude simulation ≥ 15 km or temperature between −50°C and +125°C. Acoustic qualification of payloads and stages.",
    euAnnexIRef: "9B105",
    earCclRef: "9B105",
    mtcrRef: "15.B.1",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5A210.",
  },
  {
    code: "5A213",
    category: "5",
    title: "Precision radial ball bearings (ISO 492 Class 2 or better)",
    description:
      "Radial ball bearings meeting ISO 492 Tolerance Class 2 or better, with inner-ring bore 12–50 mm, outer-ring outside diameter 25–100 mm and width 10–20 mm. Precision bearings for inertial instruments and turbopumps.",
    euAnnexIRef: "2A001",
    earCclRef: "2A001",
    mtcrRef: "9.A.7",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5A213.",
  },
  {
    code: "5A214",
    category: "5",
    title: "Liquid-propellant tanks for rocket systems",
    description:
      "Liquid-propellant tanks specially designed for the propellants controlled in 3A3 or other liquid propellants used in the systems specified in 5A and 5B. Flightweight propellant tankage for launch-vehicle stages.",
    euAnnexIRef: "9A006",
    earCclRef: "9A106",
    mtcrRef: "3.A.4",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5A214.",
  },
  {
    code: "5A215",
    category: "5",
    title: "Production facilities for 5A101/5A102 rocket items",
    description:
      "Production facilities and production equipment specially designed for the equipment or materials of 5A101 (complete rocket systems/stages/engines) and 5A102 (rocket subsystems and components). The plant that builds the rocket spine.",
    euAnnexIRef: "9B106",
    earCclRef: "9B106",
    mtcrRef: "2.B.1",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5A215.",
  },
  {
    code: "5A217",
    category: "5",
    title: "Launch and ground support equipment for rocket systems",
    description:
      "Launch and ground-support equipment and facilities usable for rocket systems (ballistic-missile systems, space-launch vehicles, sounding rockets) and UAVs: transport/handling/launch apparatus, airborne/marine gravimeters and gravity gradiometers, telemetry and tele-command ground equipment, EMP-hardened radomes, post-flight data-processing software, and thermal batteries.",
    euAnnexIRef: "9B115",
    earCclRef: "9A117",
    mtcrRef: "12.A.1",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes:
      "SCOMET 5A217. Note 5A217.c carves out equipment for navigation-satellite-system services and equipment for manned aircraft/satellites.",
  },
  {
    code: "5A218",
    category: "5",
    title: "Radar cross-section measurement systems for rocket systems",
    description:
      "Systems specially designed for radar cross-section measurement, usable for rocket systems (ballistic-missile systems, space-launch vehicles, sounding rockets), unmanned airborne systems, cruise missiles and their subsystems. Signature characterisation hardware.",
    euAnnexIRef: "9B116",
    earCclRef: "9B116",
    mtcrRef: "15.B.1",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5A218.",
  },
  {
    code: "5A211",
    category: "5",
    title: "Bremsstrahlung accelerators (electromagnetic radiation)",
    description:
      "Accelerators delivering electro-magnetic radiation produced by Bremsstrahlung from accelerated electrons, usable for hardening-effects testing of rocket-system electronics. Equipment specially designed for medical purposes is excluded.",
    euAnnexIRef: "9B117",
    earCclRef: "3A201",
    mtcrRef: "15.B.1",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5A211.",
  },

  // ─── Category 5A3 — Rocket-system technology & software ─────────────
  {
    code: "5A301",
    category: "5",
    title: "Technology for development/production of 5A1 & 5A2 items",
    description:
      "Technology related to the development, production, testing and use of the rocket-system items in 5A1 (complete systems, engines, subsystems) and 5A2 (production/test equipment). Intangible technology transfer is in scope.",
    euAnnexIRef: "9E101",
    earCclRef: "9E101",
    mtcrRef: "1.E.1",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5A301.",
  },
  {
    code: "5A302",
    category: "5",
    title: "Software for development/production of 5A1 & 5A2 items",
    description:
      "Software for the development, production, testing and use of the rocket-system items specified in 5A1 and 5A2. Includes design, trajectory and propulsion analysis codes.",
    euAnnexIRef: "9D101",
    earCclRef: "9D101",
    mtcrRef: "1.D.1",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5A302.",
  },
  {
    code: "5A303",
    category: "5",
    title: "Software coordinating multiple rocket subsystems",
    description:
      "Software which coordinates the function of more than one subsystem, specially designed or modified for use in the rocket systems specified in 5A1 and 5A2 — i.e. integrated flight/mission management software for launch vehicles.",
    euAnnexIRef: "9D104",
    earCclRef: "9D104",
    mtcrRef: "1.D.2",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5A303.",
  },

  // ─── Category 5C — Avionics & navigation for rocket systems ─────────
  {
    code: "5C001",
    category: "5",
    title: "Guidance systems — gyros and inertial reference units",
    description:
      "Guidance systems and their components, such as gyros and inertial reference units, and specially designed components therefor, usable in rocket systems, UAVs and cruise missiles. The guidance heart of a launch vehicle.",
    euAnnexIRef: "7A103",
    earCclRef: "7A103",
    mtcrRef: "9.A.5",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5C001.",
  },
  {
    code: "5C002",
    category: "5",
    title: "Integrated flight instrument systems (autopilots)",
    description:
      "Integrated flight-instrument systems which include gyro-stabilisers or automatic pilots, and specially designed components therefor, for rocket systems, UAVs and cruise missiles.",
    euAnnexIRef: "7A003",
    earCclRef: "7A003",
    mtcrRef: "9.A.6",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5C002.",
  },
  {
    code: "5C003",
    category: "5",
    title: "Compasses, gyroscopes, accelerometers, inertial equipment",
    description:
      "Compasses (including gyro-astro compasses), gyroscopes, accelerometers and inertial equipment, and specially designed software and components therefor, for rocket systems, UAVs and cruise missiles.",
    euAnnexIRef: "7A101",
    earCclRef: "7A101",
    mtcrRef: "9.A.3",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5C003.",
  },
  {
    code: "5C010",
    category: "5",
    title: "Avionics — radar/laser-radar, anti-jam GNSS receivers",
    description:
      "Avionics equipment and embedded/specially-designed software including radar and laser-radar (altimeter) systems, EMP/EMI-protection design technology, direction-finding passive sensors, and navigation-satellite-system receivers usable in missiles/rockets providing navigation above 600 m/s, using decryption for secure signals, or employing anti-jam features. Note carves out commercial/civil/Safety-of-Life GNSS.",
    euAnnexIRef: "7A105",
    earCclRef: "7A105",
    mtcrRef: "11.A.3",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes:
      "SCOMET 5C010. 5C010.e covers GNSS/RNSS incl. NavIC, QZSS, GPS, GLONASS, Galileo, BeiDou.",
  },
  {
    code: "5C011",
    category: "5",
    title: "On-board electronic equipment and manufacturing know-how",
    description:
      "On-board electronic equipment, devices and their design and manufacturing know-how (except warhead fuses, timers and sequencers), and embedded or specially designed software thereof, for rocket systems, UAVs and cruise missiles.",
    euAnnexIRef: "7A106",
    earCclRef: "7A106",
    mtcrRef: "11.A.2",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes: "SCOMET 5C011.",
  },

  // ─── Category 8A7 — Navigation & Avionics (dual-use, space-grade) ───
  {
    code: "8A701",
    category: "8",
    title: "High-performance linear and angular accelerometers",
    description:
      "Accelerometers with controlled bias/scale-factor stability: linear accelerometers ≤15 g with bias stability better than 130 µg/yr or scale-factor stability better than 130 ppm/yr; units functioning at 15–100 g or >100 g for inertial navigation/guidance; and angular/rotational accelerometers above 100 g. Vibration/shock-only accelerometers are excluded.",
    euAnnexIRef: "7A001",
    earCclRef: "7A001",
    wassenaarRef: "7A001",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DGFT",
    notes:
      "SCOMET 8A701 (8A7 Navigation & Avionics). Space-grade accelerometers for launch-vehicle and spacecraft IMUs.",
  },
  {
    code: "8A702",
    category: "8",
    title: "Gyros and angular-rate sensors (controlled bias / ARW)",
    description:
      "Gyros or angular-rate sensors with controlled performance: ≤100 g and angular-rate range <500°/s with bias stability better than 0.5°/hr or angle-random-walk ≤0.0035°/√hr; ≥500°/s variants with bias stability better than 4°/hr or ARW ≤0.1°/√hr; and units functioning above 100 g. Excludes spinning-mass gyros for the ARW limbs.",
    euAnnexIRef: "7A002",
    earCclRef: "7A002",
    wassenaarRef: "7A002",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DGFT",
    notes: "SCOMET 8A702. Fibre-optic / ring-laser gyros for spacecraft AOCS.",
  },
  {
    code: "8A703",
    category: "8",
    title: "Inertial measurement equipment and systems (IMU/INS/IRS)",
    description:
      "Inertial measurement equipment/systems (AHRS, gyrocompasses, IMUs, INS, IRS, IRU) with controlled accuracy without positional aiding (e.g. ≤0.8 nm/hr CEP for aircraft), embedded-aided variants, heading/true-north determination units, and 8A703.d.2 space-qualified units providing angular-rate ARW ≤0.1°/√hr along any axis. Excludes systems certified for civil aircraft by a Wassenaar state.",
    euAnnexIRef: "7A003",
    earCclRef: "7A003",
    wassenaarRef: "7A003",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DGFT",
    notes:
      "SCOMET 8A703. 8A703.d.2 explicitly controls 'space-qualified' IMUs — the spacecraft attitude-determination line item.",
  },
  {
    code: "8A704",
    category: "8",
    title: "Star trackers (azimuth accuracy ≤20 arc-sec) and components",
    description:
      "Star trackers (stellar attitude sensors / gyro-astro compasses) with specified azimuth accuracy ≤ 20 seconds of arc over the equipment lifetime, and specially designed components — optical heads, baffles and data-processing units.",
    euAnnexIRef: "7A004",
    earCclRef: "7A004",
    wassenaarRef: "7A004",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "SCOMET 8A704. Primary spacecraft attitude-determination sensor; ISRO no-objection typically required for star-tracker exports.",
  },
  {
    code: "8A705",
    category: "8",
    title: "GNSS receivers with decryption or adaptive-antenna anti-jam",
    description:
      "Global Navigation Satellite System (GNSS) receiving equipment employing a decryption algorithm specially designed/modified for government use to access ranging code for position and time, or employing adaptive antenna systems (spatial nulling), and specially designed components. Anti-jam / secure-code receivers.",
    euAnnexIRef: "7A005",
    earCclRef: "7A005",
    wassenaarRef: "7A005",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes:
      "SCOMET 8A705. For military-use GNSS receivers see 6A011 (Munitions). NavIC secure-service receivers fall here.",
  },
  {
    code: "8A706",
    category: "8",
    title: "Airborne altimeters with power management or PSK modulation",
    description:
      "Airborne altimeters operating at frequencies other than 4.2–4.4 GHz inclusive and having power management (varying transmitted power so received power at altitude is the minimum necessary) or using phase-shift-key modulation.",
    euAnnexIRef: "7A006",
    earCclRef: "7A006",
    wassenaarRef: "7A006",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DGFT",
    notes: "SCOMET 8A706 (8A7 Navigation & Avionics).",
  },

  // ─── Category 8A9 — Aerospace & Propulsion (the space spine) ────────
  {
    code: "8A904",
    category: "8",
    title: "Space launch vehicles, spacecraft, buses, payloads, on-board",
    description:
      "Space-launch vehicles; 'spacecraft'; 'spacecraft buses'; 'spacecraft payloads' incorporating listed sensor/telecom items; on-board systems/equipment specially designed for spacecraft performing command-and-telemetry data handling, payload data handling or attitude-and-orbit control; terrestrial telemetry/telecommand and verification simulators; air-launch platforms; and sub-orbital craft.",
    euAnnexIRef: "9A004",
    earCclRef: "9A515.a",
    wassenaarRef: "9A004",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "SCOMET 8A904 — the Wassenaar-aligned spacecraft entry (distinct from the missile-spine 5A101). Pixxel, Dhruva Space, Digantara satellites file via the ISRO Inter-Ministerial route under ISP-2023. For military-use equipment see 6A011.c.",
  },
  {
    code: "8A905",
    category: "8",
    title: "Liquid rocket propulsion systems (8A906-containing)",
    description:
      "Liquid rocket propulsion systems containing any of the systems or components specified by 8A906 — the gateway entry that pulls cryogenic, turbopump, thrust-chamber and propellant-management hardware into control.",
    euAnnexIRef: "9A005",
    earCclRef: "9A005",
    wassenaarRef: "9A005",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes: "SCOMET 8A905.",
  },
  {
    code: "8A906",
    category: "8",
    title: "Liquid rocket propulsion components (cryo, turbopumps)",
    description:
      "Components specially designed for liquid rocket propulsion: cryogenic refrigerators/dewars/heat-pipes limiting fluid loss <30%/yr; closed-cycle systems ≤100 K; slush-hydrogen systems; high-pressure (>17.5 MPa) turbopumps and drive turbines; >10.6 MPa thrust chambers and nozzles; capillary/positive-expulsion propellant tanks; fine-orifice (≤0.381 mm) injectors; and dense (>1.4 g/cm³, >48 MPa) one-piece carbon-carbon thrust chambers or exit cones.",
    euAnnexIRef: "9A006",
    earCclRef: "9A006",
    wassenaarRef: "9A006",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "SCOMET 8A906. ISRO CE-20 cryogenic engine + Skyroot/Agnikul cryo and high-pressure hardware sit here.",
  },
  {
    code: "8A907",
    category: "8",
    title: "Solid rocket propulsion systems (≥1.1 MNs impulse)",
    description:
      "Solid rocket propulsion systems with total impulse capacity >1.1 MNs; or specific impulse ≥2.4 kNs/kg (nozzle expanded to sea level, 7 MPa chamber); or stage mass fractions >88% and propellant solid loadings >86%; or containing 8A908 components; or using direct-bonded insulation/propellant-bonding systems.",
    euAnnexIRef: "9A007",
    earCclRef: "9A007",
    wassenaarRef: "9A007",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes: "SCOMET 8A907.",
  },
  {
    code: "8A908",
    category: "8",
    title: "Solid rocket propulsion components (motor cases, nozzles, TVC)",
    description:
      "Components for solid rocket propulsion: liner-based insulation/propellant bonding; filament-wound composite motor cases >0.61 m diameter or structural-efficiency ratio (PV/W) >25 km; nozzles >45 kN thrust or throat-erosion rate <0.075 mm/s; and movable-nozzle / secondary-fluid-injection thrust-vector-control systems with omni-axial movement >±5°, rotation ≥20°/s or acceleration ≥40°/s².",
    euAnnexIRef: "9A008",
    earCclRef: "9A108",
    wassenaarRef: "9A008",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes: "SCOMET 8A908.",
  },
  {
    code: "8A909",
    category: "8",
    title: "Hybrid rocket propulsion systems (≥1.1 MNs / ≥220 kN)",
    description:
      "Hybrid rocket propulsion systems with total impulse capacity >1.1 MNs or thrust levels >220 kN in vacuum exit conditions.",
    euAnnexIRef: "9A009",
    earCclRef: "9A009",
    wassenaarRef: "9A009",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "SCOMET 8A909. Relevant to hybrid-motor NewSpace developers in India.",
  },
  {
    code: "8A910",
    category: "8",
    title: "Launch-vehicle / spacecraft structures, pulsed liquid engines",
    description:
      "Specially designed components, systems and structures for launch vehicles, launch-vehicle propulsion or spacecraft: composite/metal-matrix/ceramic-matrix structures >10 kg for launch vehicles or propulsion systems; active structural-response/distortion control and isolation systems for spacecraft structures; and pulsed liquid rocket engines with thrust-to-weight ≥1 kN/kg and response time <30 ms.",
    euAnnexIRef: "9A010",
    earCclRef: "9A110",
    wassenaarRef: "9A010",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "SCOMET 8A910. 8A910.c (active control of spacecraft structural dynamics) and 8A910.d (pulsed liquid engines) are pure-space items.",
  },
  {
    code: "8A911",
    category: "8",
    title: "Ramjet, scramjet and combined-cycle engines",
    description:
      "Ramjet, scramjet or 'combined-cycle' engines, and specially designed components therefor. Combined-cycle engines combine two or more of gas-turbine, ramjet/scramjet and rocket motor/engine types — relevant to reusable and air-breathing launch concepts.",
    euAnnexIRef: "9A011",
    earCclRef: "9A011",
    wassenaarRef: "9A011",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DRDO",
    notes:
      "SCOMET 8A911 — the genuine SCOMET home for ramjet/scramjet/combined-cycle (cf. the corrected note on 5A102 which is electric/spacecraft propulsion).",
  },
  {
    code: "8A912",
    category: "8",
    title: "Unmanned aerial vehicles and unmanned airships (endurance)",
    description:
      "UAVs and unmanned airships designed for controlled flight out of the operator's natural vision and having maximum endurance ≥30 min but <1 hr with stable controlled flight in ≥46.3 km/h gusts, or maximum endurance ≥1 hr; plus related equipment and components (manned-to-UAV conversion kits, specially designed engines). Sub-orbital UAVs fall under 8A904.h.",
    euAnnexIRef: "9A012",
    earCclRef: "9A012",
    wassenaarRef: "9A012",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "DGFT",
    notes:
      "SCOMET 8A912 (Wassenaar-aligned UAV entry, distinct from the 5B missile-spine UAV list).",
  },

  // ─── Category 8D9 / 8E9 — Aerospace & Propulsion software/technology ─
  {
    code: "8D901",
    category: "8",
    title: "Software for development of aerospace/propulsion equipment",
    description:
      "Software, not specified in 8D903/8D904, specially designed or modified for the development of equipment or technology specified by 8A9 (aerospace and propulsion) or 8B9, or technology specified by 8E903.",
    euAnnexIRef: "9D001",
    earCclRef: "9D001",
    wassenaarRef: "9D001",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes: "SCOMET 8D901.",
  },
  {
    code: "8D902",
    category: "8",
    title: "Software for production of aerospace/propulsion equipment",
    description:
      "Software, not specified in 8D903/8D904, specially designed or modified for the production of equipment specified by 8A9 (aerospace and propulsion) or 8B9.",
    euAnnexIRef: "9D002",
    earCclRef: "9D002",
    wassenaarRef: "9D002",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes: "SCOMET 8D902.",
  },
  {
    code: "8D905",
    category: "8",
    title: "Software for operation of spacecraft on-board / ground systems",
    description:
      "Software specially designed or modified for the operation of the items specified by 8A904.e (spacecraft on-board command/telemetry, payload data handling, attitude-and-orbit control) or 8A904.f (terrestrial telemetry/telecommand and verification simulators).",
    euAnnexIRef: "9D004",
    earCclRef: "9D515",
    wassenaarRef: "9D004",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "SCOMET 8D905 — spacecraft flight/ground operations software (AOCS, TT&C ground-segment software).",
  },
  {
    code: "8E901",
    category: "8",
    title: "Technology for development of aerospace/propulsion items",
    description:
      "Technology per the General Technology Note for the development of equipment or software specified by 8A904–8A912 (space-launch vehicles, spacecraft, propulsion, UAVs), 8B901–8B910 or 8D901–8D905. Intangible technology transfer is in scope.",
    euAnnexIRef: "9E001",
    earCclRef: "9E001",
    wassenaarRef: "9E001",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "SCOMET 8E901 — covers spacecraft and launch-vehicle development technology; deemed-export logic applies to foreign nationals.",
  },
  {
    code: "8E902",
    category: "8",
    title: "Technology for production of aerospace/propulsion items",
    description:
      "Technology per the General Technology Note for the production of equipment specified by 8A904–8A911 (space-launch vehicles, spacecraft, propulsion) or 8B901–8B910. Repair technology for specified structures/laminates/materials is at 8E902.f.",
    euAnnexIRef: "9E002",
    earCclRef: "9E002",
    wassenaarRef: "9E002",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes: "SCOMET 8E902.",
  },

  // ─── Category 8A6 — Sensors & Lasers (space-imaging subset) ─────────
  {
    // CORRECTED 2026-06-13 (W6 finding S6): the prior entry mislabelled
    // 8A604 as optical sensors/focal-plane arrays. Official 8A604 (head
    // "OPTICS") is "Optical equipment and components" — optical mirrors
    // (reflectors), incl. deformable mirrors and lightweight monolithic /
    // composite / foam mirror structures, plus optical control equipment.
    // The displaced detector content is re-homed to 8A602 below.
    code: "8A604",
    category: "8",
    title: "Optical mirrors, reflectors and optical control equipment",
    description:
      "Optical equipment and components in the 8A6 Sensors & Lasers (OPTICS) sub-category: optical mirrors (reflectors) including 'deformable' (adaptive-optic) mirrors, lightweight monolithic mirrors and lightweight composite or foam mirror structures, ZnSe/ZnS optical components, and optical control equipment such as beam-steering mirror stages and resonator-alignment equipment. Controlled on aperture, equivalent density, laser-induced damage threshold and slew/bandwidth/pointing parameters.",
    euAnnexIRef: "6A004",
    earCclRef: "6A004",
    wassenaarRef: "6A004",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "SCOMET 8A604 (8A6 Sensors & Lasers — OPTICS). Mirrors/optical control for Indian EO and laser-comms payloads.",
  },
  {
    // RE-HOMED 2026-06-13 (W6 finding S6): the optical-sensor / focal-plane
    // array / image-intensifier / photodetector content formerly mis-coded
    // as 8A604 belongs under official 8A602 (head "OPTICAL SENSORS").
    code: "8A602",
    category: "8",
    title: "Optical sensors, focal-plane arrays and space-grade detectors",
    description:
      "Optical sensors or equipment and components in the 8A6 Sensors & Lasers (OPTICAL SENSORS) sub-category: optical detectors including 'space-qualified' solid-state detectors and focal-plane arrays, image-intensifier tubes, and other photodetector hardware — the dual-use spine for space-based electro-optical and infrared imaging detectors. Controlled on spectral band, response time and noise parameters.",
    euAnnexIRef: "6A002",
    earCclRef: "6A002",
    wassenaarRef: "6A002",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "SCOMET 8A602 (8A6 Sensors & Lasers — OPTICAL SENSORS). Earth-observation focal-plane arrays for Indian EO satellites.",
  },
  {
    // CORRECTED 2026-06-13 (W6 finding S6): the prior entry mislabelled
    // 8A607 as SAR/radar. Official 8A607 (head "GRAVIMETERS") is gravity
    // meters and gravity gradiometers. SAR/radar is official 8A608 below.
    code: "8A607",
    category: "8",
    title: "Gravity meters (gravimeters) and gravity gradiometers",
    description:
      "Gravity meters (gravimeters) and gravity gradiometers in the 8A6 Sensors & Lasers (GRAVIMETERS) sub-category: ground-use gravity meters with static accuracy better than 10 µGal (quartz/Worden-type excluded), gravity meters for mobile platforms above the controlled accuracy/response thresholds, and gravity gradiometers — relevant to space geodesy and gravity-field missions.",
    euAnnexIRef: "6A007",
    earCclRef: "6A007",
    wassenaarRef: "6A007",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "SCOMET 8A607 (8A6 Sensors & Lasers — GRAVIMETERS). Gravity-field instrumentation for geodesy missions.",
  },
  {
    // RE-HOMED 2026-06-13 (W6 finding S6): the spaceborne SAR / radar
    // content formerly mis-coded as 8A607 belongs under official 8A608
    // (head "RADAR"), whose 8A608.d explicitly covers SAR/ISAR/SLAR modes.
    code: "8A608",
    category: "8",
    title: "Spaceborne synthetic-aperture radar and radar systems",
    description:
      "Radar systems, equipment and assemblies and specially designed components in the 8A6 Sensors & Lasers (RADAR) sub-category, including equipment capable of operating in synthetic-aperture (SAR), inverse-synthetic-aperture (ISAR) or side-looking-airborne (SLAR) modes — the control spine for spaceborne X/C/L-band orbital SAR. Controlled on operating frequency, output power, locating accuracy, tunable bandwidth and multi-carrier operation (SSR, civil automotive, ATC displays, weather and ICAO PAR radar excluded).",
    euAnnexIRef: "6A008",
    earCclRef: "6A008",
    wassenaarRef: "6A008",
    sourceUrl: DGFT_SCOMET_2024_PDF_URL,
    asOfDate: INDIA_SCOMET_DEEPEN_AS_OF,
    licensingAuthority: "ISRO",
    notes:
      "SCOMET 8A608 (8A6 Sensors & Lasers — RADAR). ISRO RISAT heritage and private SAR constellations.",
  },
];

// Set the coverage count from the actual array length.
INDIA_SCOMET_COVERAGE.caelexCoverageCount = INDIA_SCOMET_ENTRIES.length;

// ─── Helper functions ───────────────────────────────────────────────

/**
 * Find a SCOMET entry by its canonical code (case-sensitive).
 */
export function findIndiaScometEntry(
  code: string,
): IndiaScometEntry | undefined {
  if (!code) return undefined;
  return INDIA_SCOMET_ENTRIES.find((e) => e.code === code);
}

/**
 * Return all SCOMET entries in a given category prefix ("0"-"8").
 */
export function findIndiaScometByCategory(
  category: string,
): IndiaScometEntry[] {
  return INDIA_SCOMET_ENTRIES.filter((e) => e.category === category);
}

/**
 * Return all SCOMET entries that flow via a specific Indian licensing
 * authority (DGFT, DRDO, DAE, ISRO).
 */
export function findIndiaScometByAuthority(
  authority: IndiaScometEntry["licensingAuthority"],
): IndiaScometEntry[] {
  return INDIA_SCOMET_ENTRIES.filter((e) => e.licensingAuthority === authority);
}

/**
 * Return all SCOMET entries that map to a given EU Annex I code.
 */
export function findIndiaScometByEuRef(euCode: string): IndiaScometEntry[] {
  return INDIA_SCOMET_ENTRIES.filter((e) => e.euAnnexIRef === euCode);
}

// Re-export source constants for tests and consumers.
export { DGFT_SCOMET_URL, FT_DR_ACT_URL, ISP_2023_URL };
