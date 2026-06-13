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

/** As-of date for the file as a whole. */
export const INDIA_SCOMET_AS_OF = "2026-05-22";

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
    "SCOMET Categories 3-8 entries relevant to space and dual-use aerospace exports. Focus on Category 5 (aerospace + spacecraft), Category 6 (electronics + sensors), Category 7 (computers) and Category 8 (telecommunications). Selected Category 3 (materials) and Category 4 (nuclear-related, where space-overlap exists — nuclear thermal propulsion).",
  excluded: [
    "Category 0 (raw nuclear materials), Category 1 (chemical agents), Category 2 (biological agents) — out of aerospace scope",
    "Full enumeration of Category 5 munitions list (only aerospace-relevant subset)",
    "Special Materials & Equipment Programme (SMP) clearances administered separately by DRDO",
    "ITC(HS) tariff codes — these are import duty codes, not export-control codes",
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

  // 5A100-199 — Spacecraft + components (PRIMARY CATEGORY for ISRO partners)
  {
    code: "5A101", // Z35-IN-SCOMET — parametric spacecraft
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
      "ISRO direct-application route under ISP-2023 — Pixxel, Dhruva Space, Digantara, Bellatrix typically file via the Inter-Ministerial Working Group rather than the DGFT online portal.",
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
      "Bellatrix Aerospace electric propulsion exports — primary SCOMET 5A102 line item.",
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
  },

  // 5A200-299 — Launch vehicle components
  {
    code: "5A201", // Z35-IN-SCOMET — launch vehicle stages
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
      "PSLV / GSLV / LVM3 (NSIL commercial launches) and private SLVs (Skyroot Vikram-1, Agnikul Agnibaan) are MTCR Cat I. Joint clearance via DRDO + ISRO + DGFT.",
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
      "ISRO CE-20 cryogenic engine, Skyroot Raman / Kalam engines, Agnikul Agnilet 3D-printed engine — all SCOMET 5A202.",
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
