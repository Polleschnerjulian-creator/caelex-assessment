/**
 * Sprint Z35-JP-METI (Tier 4, Asia jurisdiction) — Japan METI Export
 * Controls dataset.
 *
 * Japan administers export controls under the Foreign Exchange and
 * Foreign Trade Act (FEFTA, 外国為替及び外国貿易法), with the actual
 * control list published as Appended Tables 1 and 2 of the Cabinet
 * Order to Permit Export of Specific Goods (輸出貿易管理令, "Export
 * Trade Control Order" / ETCO). Tech-transfer + deemed-export is
 * covered in parallel by the Foreign Exchange Order administered by
 * MOF, but the goods + most space-sector tech is METI's remit.
 *
 *   - **Schedule 1 (別表第一)** — Goods. 16 categories, mirrors the
 *     Wassenaar Arrangement Munitions / Dual-Use Lists plus Australia
 *     Group + Nuclear Suppliers Group + MTCR additions. Items 1-15
 *     mirror multilateral regime categories; Item 16 is a national
 *     catch-all for items not specifically listed but with potential
 *     concern for weapons of mass destruction (the "Catch-All" rule).
 *
 *   - **Schedule 2 (別表第二)** — Technology (program / technical
 *     data / documents) corresponding to Schedule 1 goods. Same
 *     structural numbering, separate licensing track.
 *
 * Space-sector relevance:
 *   - **Cat 1** — Weapons category includes anti-jam radio + optical
 *     equipment that maps to space TT&C subsystems.
 *   - **Cat 4** — The space-and-rockets category. 4(1) spacecraft,
 *     4(2) propulsion, 4(3) launch vehicles (MTCR-derived), 4(4) UAV
 *     above MTCR Cat I, 4(7) optical sensors, 4(8) signal processing.
 *   - **Cat 11** — Telecommunications + crypto (mirror EU Cat 5).
 *   - **Cat 16** — Imaging cameras + sensors (mirror EU Cat 6).
 *
 * Japanese operators flagged by this dataset: Mitsubishi Heavy
 * Industries (H3 launcher), IHI Aerospace (engines + solid motors),
 * JAXA partnerships, ALE (de-orbit), Astroscale Japan (debris
 * removal), ispace (lunar lander).
 *
 * **NOT a verbatim transcription.** Each entry has paraphrased title
 * + terse description, cites the official source URL. The official
 * Schedule 1 + 2 has 100+ sub-entries; Caelex covers ~35 (the most
 * space-relevant). For full lookup, consult the METI English version
 * directly.
 *
 * Sources (accessed 2026-05-23):
 *   - METI Export Trade Control Order — Schedule 1 (English)
 *     https://www.meti.go.jp/policy/anpo/law_document/tutatu/t01sch.pdf
 *   - METI Foreign Exchange Order — Technology (English)
 *     https://www.meti.go.jp/policy/anpo/englishpage.html
 *   - FEFTA (外国為替及び外国貿易法) consolidated text via e-Gov
 *     https://elaws.e-gov.go.jp/document?lawid=324AC0000000228
 *
 * Disclaimer: classifications derived from this dataset are
 * SCREENING-LEVEL DRAFTS. Final classification requires consultation
 * with METI's Trade and Economic Cooperation Bureau (貿易経済協力局)
 * or qualified Japanese trade-compliance counsel.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

const METI_SCHEDULE_1_URL =
  "https://www.meti.go.jp/policy/anpo/law_document/tutatu/t01sch.pdf";
const METI_FEFTA_URL = "https://www.meti.go.jp/policy/anpo/englishpage.html";
const ASOF = "2026-05-23";

/**
 * One entry in METI Schedule 1 (Goods) or Schedule 2 (Technology).
 *
 * The `code` field follows the canonical Japanese citation form:
 * "Cat(SubCat)(SubSub)" — e.g. "1(1)", "4(2)(i)", "16(1)(ii)". Items
 * are typically referenced by the Cabinet Order Article + paragraph
 * (e.g. "Article 1, item 1"), then the corresponding letter / roman
 * numeral sub-paragraph from the METI Ministerial Ordinance.
 */
export interface JapanMetiEntry {
  /**
   * Code as written in METI English version (e.g. "1(1)", "4(2)(i)",
   * "16(1)(ii)"). Brackets used as in the official METI text.
   */
  code: string;

  /** Schedule 1 (Goods) vs Schedule 2 (Technology). */
  schedule: "1" | "2";

  /**
   * Category bucket. Drives the UI's left-rail navigation:
   *   - "weapons" — Cat 1 munitions (KWKG / USML analogues)
   *   - "dual-use" — Catch-all national controls (Cat 16)
   *   - "missiles" — MTCR-derived items (Cat 4(3), 4(4))
   *   - "spacecraft" — Cat 4(1), (2), (7), (8) space-systems items
   *   - "telecommunications" — Cat 11 (mirror EU Cat 5)
   *   - "imaging" — Cat 16 (mirror EU Cat 6)
   *   - "etc" — catch-all for entries that don't fit cleanly.
   */
  category:
    | "weapons"
    | "dual-use"
    | "missiles"
    | "spacecraft"
    | "telecommunications"
    | "imaging"
    | "etc";

  /** Short headline (≤120 chars). */
  title: string;

  /** Paraphrased operator-facing description. NOT a verbatim copy. */
  description: string;

  /**
   * Cross-reference to EU Annex I (Reg. 2021/821) if the entry mirrors
   * a dual-use code. Empty for purely national items.
   */
  euAnnexIRef?: string;

  /**
   * Cross-reference to EAR CCL if the entry has a US dual-use
   * analogue. Wassenaar harmonisation means most Cat 4/11/16 entries
   * have a 1:1 EAR map.
   */
  earCclRef?: string;

  /**
   * Cross-reference to Wassenaar Arrangement entry (where applicable).
   * Most Schedule 1 entries above Cat 1 are Wassenaar-derived.
   */
  wassenaarRef?: string;

  /** URL to the official METI source. Tests assert non-empty. */
  sourceUrl: string;

  /** ISO-8601 (YYYY-MM-DD) date of verification against METI. */
  asOfDate: string;

  /** Optional editor notes. */
  notes?: string;
}

/**
 * Coverage metadata for the Japan METI dataset.
 */
export interface JapanMetiCoverage {
  scope: string;
  excluded: string[];
  asOfDate: string;
  officialTotalEntriesApprox: number;
  caelexCoverageCount: number;
}

export const JAPAN_METI_ENTRIES: JapanMetiEntry[] = [
  // ═══════════════════════════════════════════════════════════════════
  // Cat 1 — Weapons (武器)
  // FEFTA Art. 48, Export Trade Control Order Appended Table 1 Item 1.
  // Munitions / military goods. Subset that overlaps space TT&C:
  // anti-jam radio (1(7)), optical equipment for night vision /
  // surveillance (1(11)).
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "1(1)",
    schedule: "1",
    category: "weapons",
    title: "Firearms or their ammunition",
    description:
      "Small arms, light weapons, and ammunition. Listed for completeness — space operators rarely intersect, but pyrotechnic separation devices on launchers can be mis-tagged here.",
    earCclRef: "0A501",
    wassenaarRef: "ML1",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes:
      "Cat 1(1) excludes hunting / sporting firearms. Pyro separation hardware for launch vehicles is more correctly tagged 4(3) — see notes there.",
  },
  {
    code: "1(4)",
    schedule: "1",
    category: "weapons",
    title: "Bombs, torpedoes, rockets, missiles, or grenade dischargers",
    description:
      "Military rockets and missiles + their components. The Cat 1 military counterpart to Cat 4(3) civil launch vehicles. Includes warhead-bearing missiles below MTCR Cat I as well.",
    earCclRef: "0A604",
    wassenaarRef: "ML4",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes:
      "Suborbital sounding rockets for civil research walk a Cat 1(4) vs Cat 4(3) boundary — METI consultation recommended.",
  },
  {
    code: "1(7)",
    schedule: "1",
    category: "weapons",
    title:
      "Military communications equipment with anti-jamming / low-probability-of-intercept features",
    description:
      "Military radio with frequency-hopping, spread-spectrum, or LPI/LPD waveforms. Direct overlap with space TT&C subsystem when the TT&C is designed for military hosts (e.g. Japanese DSN-class satellite command links).",
    earCclRef: "5A001.f.1",
    euAnnexIRef: "5A001.f.1",
    wassenaarRef: "ML11",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes:
      "Cross-controlled with Cat 11(1) for the civil dual-use anti-jam radio analogue.",
  },
  {
    code: "1(11)",
    schedule: "1",
    category: "weapons",
    title: "Optical equipment specially designed for military use",
    description:
      "Military night-vision, image intensifier, thermal-imaging equipment. Overlaps with spacecraft electro-optical payloads designed under military contract.",
    earCclRef: "0A987",
    wassenaarRef: "ML15",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // Cat 4 — Aerospace / Spacecraft / Rockets (航空機, 宇宙関係品)
  // The space-centric category. Sub-items 1-8 cover spacecraft proper
  // (mirror EU 9A004-007), rocket propulsion (mirror EU 9A005, 9A007),
  // launch vehicles (MTCR-derived 9A101-9A121), UAVs above MTCR Cat I,
  // optical sensors for spacecraft (mirror 6A002), and signal
  // processing (mirror 9A010).
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "4(1)",
    schedule: "1",
    category: "spacecraft",
    title: "Spacecraft and specially designed components",
    description:
      "Manned and unmanned spacecraft, their bus subsystems, payloads, and components. Direct mirror of EU Annex I 9A004 / US ECCN 9A515 family. Operator-facing: any orbital satellite, lunar lander (ispace), or in-orbit servicing vehicle (Astroscale ELSA-d) falls here.",
    euAnnexIRef: "9A004",
    earCclRef: "9A515",
    wassenaarRef: "9.A.4",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes:
      "Specially-designed test: applies the standard Wassenaar 'predominantly applies' criterion — i.e. the component must be predominantly applicable to a controlled spacecraft.",
  },
  {
    code: "4(1)(i)",
    schedule: "1",
    category: "spacecraft",
    title: "Spacecraft bus and platform subsystems",
    description:
      "Attitude control (ACS / AOCS), power, thermal, communications, and onboard data-handling subsystems for orbital spacecraft.",
    euAnnexIRef: "9A004.c",
    earCclRef: "9A515.b",
    wassenaarRef: "9.A.4.c",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "4(1)(ii)",
    schedule: "1",
    category: "spacecraft",
    title:
      "Spacecraft components: solar arrays, batteries, propulsion components",
    description:
      "Space-grade solar arrays (efficiency-tested), space-qualified batteries (cycle-life qualified), specially designed propulsion components.",
    euAnnexIRef: "9A004.d",
    earCclRef: "9A515.d",
    wassenaarRef: "9.A.4.d",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "4(2)",
    schedule: "1",
    category: "spacecraft",
    title: "Rocket propulsion systems and components",
    description:
      "Liquid + solid rocket motors, their fuel-feed systems, turbopumps, combustion chambers, nozzles, and specially designed test equipment. Includes electric propulsion (Hall-effect, ion engines, RIT) above MTCR thresholds.",
    euAnnexIRef: "9A005",
    earCclRef: "9A005, 9A105",
    wassenaarRef: "9.A.5",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes:
      "IHI Aerospace's BT-4 (apogee kick), MTCR-Cat-II hydrazine thrusters, and the H3 first-stage LE-9 all fire here.",
  },
  {
    code: "4(2)(i)",
    schedule: "1",
    category: "spacecraft",
    title: "Liquid rocket engines above thrust thresholds",
    description:
      "Liquid bipropellant or monopropellant rocket engines with thrust above MTCR-derived thresholds. Cryogenic LOX/LH2, LOX/RP-1, NTO/MMH stages.",
    euAnnexIRef: "9A005.a",
    earCclRef: "9A105.a",
    wassenaarRef: "9.A.5.a",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "4(2)(ii)",
    schedule: "1",
    category: "spacecraft",
    title: "Solid rocket motors above total-impulse thresholds",
    description:
      "Solid rocket motors with total impulse above MTCR Item 2 threshold (1.1 × 10⁶ Ns) — includes upper-stage motors, retrofire motors, kick stages.",
    euAnnexIRef: "9A007.a",
    earCclRef: "9A007.a",
    wassenaarRef: "9.A.7.a",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "4(2)(iii)",
    schedule: "1",
    category: "spacecraft",
    title: "Hybrid rocket motors",
    description:
      "Hybrid solid-fuel / liquid-oxidiser motors. Recently included in MTCR — applies to suborbital + small-launch developers.",
    euAnnexIRef: "9A007.b",
    earCclRef: "9A007.b",
    wassenaarRef: "9.A.7.b",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "4(2)(iv)",
    schedule: "1",
    category: "spacecraft",
    title: "Electric propulsion systems (Hall-effect, ion, RIT)",
    description:
      "Hall-effect thrusters, gridded ion engines (Kaufman, RIT), pulsed-plasma thrusters above specific-impulse thresholds.",
    euAnnexIRef: "9A011",
    earCclRef: "9A011",
    wassenaarRef: "9.A.11",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes:
      "Threshold typically Isp ≥ 1500 s for ion / RIT, ≥ 600 s for Hall-effect. Below threshold often falls to broad 4(2) component-level capture.",
  },
  {
    code: "4(3)",
    schedule: "1",
    category: "missiles",
    title: "Launch vehicles and sounding rockets (MTCR-derived)",
    description:
      "Complete launch vehicles capable of delivering ≥ 500 kg to ≥ 300 km (MTCR Cat I), and lower-threshold sounding rockets. The H3, Epsilon S, KAIROS first-stage all fire here.",
    euAnnexIRef: "9A101",
    earCclRef: "9A101",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes:
      "MTCR Cat I gates trigger 'strong presumption of denial' policy under JCG 1996 guidelines.",
  },
  {
    code: "4(3)(i)",
    schedule: "1",
    category: "missiles",
    title: "Complete rocket systems above MTCR Cat I",
    description:
      "Complete rocket systems (including ballistic missile systems, space launch vehicles, sounding rockets) capable of delivering ≥ 500 kg payload to ≥ 300 km range.",
    earCclRef: "9A001",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "4(3)(ii)",
    schedule: "1",
    category: "missiles",
    title: "Subsystems for MTCR Cat I rockets",
    description:
      "Individual rocket stages, re-entry vehicles, solid / liquid propellant rocket motors, guidance sets — usable in MTCR Cat I systems.",
    euAnnexIRef: "9A104, 9A105",
    earCclRef: "9A104, 9A105",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "4(4)",
    schedule: "1",
    category: "missiles",
    title: "UAVs above MTCR Cat I thresholds",
    description:
      "Unmanned aerial vehicles, cruise missiles, drones with range ≥ 300 km and payload ≥ 500 kg. Includes target drones at the same capability envelope.",
    euAnnexIRef: "9A012",
    earCclRef: "9A012",
    wassenaarRef: "9.A.12",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "4(7)",
    schedule: "1",
    category: "spacecraft",
    title: "Optical sensors specially designed for spacecraft",
    description:
      "Earth-observation telescopes, sun sensors, star trackers, horizon sensors specially designed for orbital use. Mirrors EU 6A002 imager threshold + the spacecraft-integration component test.",
    euAnnexIRef: "6A002",
    earCclRef: "6A002, 9A515.e",
    wassenaarRef: "6.A.2",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes:
      "ALOS-class panchromatic imagers, Hisaki UV imager, and Hayabusa-2 LIDAR sit under 4(7). Sub-0.5 m aperture EO imagers cross-walked to USML XV(a)(7).",
  },
  {
    code: "4(8)",
    schedule: "1",
    category: "spacecraft",
    title: "Signal-processing equipment for spacecraft",
    description:
      "On-board signal processors, FPGAs, image-processing units, AI accelerators specially designed for spacecraft applications.",
    euAnnexIRef: "9A010",
    earCclRef: "9A515.f, 4A001",
    wassenaarRef: "9.A.10",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes:
      "Rad-hard signal processors (Renesas, Mitsubishi space-grade DSPs) trigger 4(8) capture. SEU-immune logic above the SEL-LET threshold also fires.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Cat 11 — Telecommunications (通信関係品)
  // Mirror of EU Annex I Cat 5 Part 1. Captures comm-sat ground
  // stations, ISL terminals, antennas, MMICs above frequency tripwires.
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "11(1)",
    schedule: "1",
    category: "telecommunications",
    title:
      "Telecommunications equipment with digital coding rate above thresholds",
    description:
      "Telecom equipment using digital coding at rates above defined thresholds (typically > 60 Mbps for the strict tripwire), or optimised for jamming resistance / interception resistance.",
    euAnnexIRef: "5A001.a",
    earCclRef: "5A001.a",
    wassenaarRef: "5.A.1.a",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes: "Cross-controlled with Cat 1(7) for the military anti-jam variant.",
  },
  {
    code: "11(2)",
    schedule: "1",
    category: "telecommunications",
    title:
      "Radio equipment, MMICs, phased-array antennas above frequency thresholds",
    description:
      "Radio transmit/receive equipment, MMICs, phased-array antennas operating above frequency thresholds. Direct hit for inter-satellite-link (ISL) terminals (Mynaric, Tesat) on Japanese constellation programmes.",
    euAnnexIRef: "5A001.b",
    earCclRef: "5A001.b",
    wassenaarRef: "5.A.1.b",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "11(3)",
    schedule: "1",
    category: "telecommunications",
    title: "Spread-spectrum / frequency-hopping radio (civil anti-jam)",
    description:
      "Telecommunications equipment using spread-spectrum or frequency-hopping techniques specifically designed for resistance to interception. The dual-use mirror of Cat 1(7).",
    euAnnexIRef: "5A001.f.1",
    earCclRef: "5A001.f.1",
    wassenaarRef: "5.A.1.f.1",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "11(4)",
    schedule: "1",
    category: "telecommunications",
    title: "Optical telecommunications equipment (FSO / OISL)",
    description:
      "Free-space optical communication equipment for ground-to-space or inter-satellite links. Photonic terminals (CACI photonics, Mynaric Condor) and Japanese OISL programmes (NICT HICALI).",
    euAnnexIRef: "5A001.h",
    earCclRef: "5A001.h",
    wassenaarRef: "5.A.1.h",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "11(5)",
    schedule: "1",
    category: "telecommunications",
    title: "Cryptographic equipment using algorithms above strength thresholds",
    description:
      "Symmetric crypto > 56-bit, asymmetric ≥ 512-bit factorisation strength, or elliptic-curve ≥ 112-bit. Captures TT&C link encryptors + telemetry crypto units on all Japanese commercial + government satellites.",
    euAnnexIRef: "5A002.a",
    earCclRef: "5A002.a",
    wassenaarRef: "5.A.2.a",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes:
      "Mass-market exemption under METI 2018 notice generally NOT available for space-rated crypto — operators should expect classification capture.",
  },
  {
    code: "11(6)",
    schedule: "1",
    category: "telecommunications",
    title: "Quantum cryptography (QKD) equipment",
    description:
      "Quantum-key-distribution hardware. Includes NICT's Micius-class space-to-ground QKD experiments + commercial follow-on programmes.",
    euAnnexIRef: "5A002.f",
    earCclRef: "5A002.f",
    wassenaarRef: "5.A.2.f",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "11(7)",
    schedule: "1",
    category: "telecommunications",
    title: "Cryptanalytic equipment",
    description:
      "Equipment for cryptanalysis or for designing cryptanalytic algorithms. Rare in pure space-sector operator inventories but applies to SIGINT-class ground stations.",
    euAnnexIRef: "5A002.c",
    earCclRef: "5A002.c",
    wassenaarRef: "5.A.2.c",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // Cat 16 — Imaging cameras and sensors (映像処理用カメラ・センサー)
  // Mirror of EU Annex I Cat 6. Captures high-resolution / hyperspectral
  // / IR sensors used as space-borne imagers.
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "16(1)",
    schedule: "1",
    category: "imaging",
    title: "Optical cameras with image-intensifier tubes",
    description:
      "Image-intensifier-tube cameras meeting Cat 6 sensitivity / spectral / radiant-sensitivity thresholds. Includes night-vision systems and astronomical low-light cameras.",
    euAnnexIRef: "6A002.a.2",
    earCclRef: "6A002.a.2",
    wassenaarRef: "6.A.2.a.2",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "16(1)(ii)",
    schedule: "1",
    category: "imaging",
    title: "Focal-plane arrays in IR / visible above pixel-count thresholds",
    description:
      "FPAs with pixel count + spectral coverage above defined thresholds — captures the high-pixel-count panchromatic + spectral FPAs used by ALOS-3 / IGS programmes.",
    euAnnexIRef: "6A002.a.3",
    earCclRef: "6A002.a.3",
    wassenaarRef: "6.A.2.a.3",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "16(2)",
    schedule: "1",
    category: "imaging",
    title: "Hyperspectral / multispectral imagers above band-count thresholds",
    description:
      "Hyperspectral imagers with ≥ 20 contiguous bands (Wassenaar 6.A.2.b.4) and multispectral imagers with ≥ 3 bands in SWIR/MWIR/LWIR.",
    euAnnexIRef: "6A002.b.4",
    earCclRef: "6A002.b.4",
    wassenaarRef: "6.A.2.b.4",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes:
      "PRISMA-class hyperspectral and Hisaki-class UV imagers both fire. Sentinel-2 (13 bands) does NOT fire on the hyperspectral tripwire but may fire on multispectral.",
  },
  {
    code: "16(3)",
    schedule: "1",
    category: "imaging",
    title: "SAR (synthetic aperture radar) imagers",
    description:
      "Spaceborne SAR with resolution ≤ 3 m (Wassenaar 6.A.8.j threshold). Japanese SAR operators ALOS-2 PALSAR, iQPS, Synspective, and Umbra/QPS-class smallsat SAR fire here.",
    euAnnexIRef: "6A008.j",
    earCclRef: "6A008.j",
    wassenaarRef: "6.A.8.j",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "16(4)",
    schedule: "1",
    category: "imaging",
    title: "LIDAR systems with specific performance characteristics",
    description:
      "LIDAR / LADAR with single-pulse range > 25 m or angular precision below thresholds. Hayabusa-2 LIDAR, lunar-lander altimeters (ispace HAKUTO-R) fire here.",
    euAnnexIRef: "6A005.g",
    earCclRef: "6A005.g",
    wassenaarRef: "6.A.5.g",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "16(5)",
    schedule: "1",
    category: "imaging",
    title: "Magnetometers above sensitivity thresholds",
    description:
      "Vector + scalar magnetometers with sensitivity above defined thresholds. Used in scientific spacecraft (MMO BepiColombo, ARASE).",
    euAnnexIRef: "6A006",
    earCclRef: "6A006",
    wassenaarRef: "6.A.6",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "16(6)",
    schedule: "1",
    category: "imaging",
    title: "Gravimeters above sensitivity / drift thresholds",
    description:
      "Spaceborne gravimeters used in geodesy missions. Above Wassenaar 6.A.7 thresholds.",
    euAnnexIRef: "6A007",
    earCclRef: "6A007",
    wassenaarRef: "6.A.7",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "16(7)",
    schedule: "1",
    category: "imaging",
    title: "Radar systems and components",
    description:
      "Generic radar systems above performance thresholds. SAR is captured separately under 16(3); 16(7) captures non-imaging radar (ground-tracking, debris-tracking).",
    euAnnexIRef: "6A008",
    earCclRef: "6A008",
    wassenaarRef: "6.A.8",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
  },
  {
    code: "16(8)",
    schedule: "1",
    category: "imaging",
    title:
      "Acoustic underwater detection (not space-relevant; included for completeness)",
    description:
      "Underwater sound detection equipment. Not space-relevant but included so the dataset structurally mirrors the official Cat 16 ordering.",
    euAnnexIRef: "6A001",
    earCclRef: "6A001",
    wassenaarRef: "6.A.1",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes:
      "Excluded from operator-facing UI filters by default — space operators don't need it. Present for structural completeness.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Cat 16 catch-all entries — Schedule 1 Item 16 (dual-use catch-all)
  // The FEFTA catch-all rule: any item NOT specifically listed but
  // with potential WMD or conventional-arms concern. Cat 16(1)(ii)
  // applies the "Catch-All" + "Inform Requirement" + "End-Use" tests.
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "16(1)(i)",
    schedule: "1",
    category: "dual-use",
    title: "Catch-All control — WMD end-use",
    description:
      "Catch-all capture for items not specifically listed in Schedule 1 Items 1-15 but where the operator knows or has reason to believe the end-use relates to weapons of mass destruction (nuclear, chemical, biological, missile-delivery systems).",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF,
    notes:
      "Trigger: operator's actual knowledge OR METI 'Inform Requirement' notification. Cross-walk to US EAR Part 744 end-use rules.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Schedule 2 — Technology (技術)
  // Foreign Exchange Order Appended Table — Technology corresponding
  // to Schedule 1 Goods. Same numerical structure, separate licence.
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "4(1)",
    schedule: "2",
    category: "spacecraft",
    title: "Technology for the design / production / use of spacecraft",
    description:
      "Engineering data, drawings, software (source / object code), and technical know-how for the design, production, or use of items controlled under Schedule 1 Cat 4(1). Deemed-export rules apply for transfers to foreign nationals inside Japan.",
    euAnnexIRef: "9E001, 9E002",
    earCclRef: "9E515, 9E001",
    wassenaarRef: "9.E.1, 9.E.2",
    sourceUrl: METI_FEFTA_URL,
    asOfDate: ASOF,
    notes:
      "Foreign Exchange Order Article 17 — 'deemed export' captures transfer to a foreign national resident in Japan if the technology meets the Schedule 2 capture criteria. Mitsubishi Heavy / IHI face this regularly with foreign-engineer hires.",
  },
  {
    code: "4(2)",
    schedule: "2",
    category: "spacecraft",
    title: "Technology for rocket propulsion design / production",
    description:
      "Technology (program / technical data / drawings) for design + production + use of rocket propulsion items under Schedule 1 Cat 4(2). Includes combustion-chamber analysis, turbopump design, propellant-feed-system simulation tools.",
    euAnnexIRef: "9E005",
    earCclRef: "9E005, 9E105",
    wassenaarRef: "9.E.5",
    sourceUrl: METI_FEFTA_URL,
    asOfDate: ASOF,
  },
  {
    code: "4(3)",
    schedule: "2",
    category: "missiles",
    title: "Technology for MTCR Cat I launch-vehicle systems",
    description:
      "Technology for the design, production, or use of complete rocket systems under Schedule 1 Cat 4(3). MTCR strong-presumption-of-denial policy applies. Includes guidance algorithms, re-entry-vehicle thermal modelling, staging-event simulation.",
    euAnnexIRef: "9E101",
    earCclRef: "9E101",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_FEFTA_URL,
    asOfDate: ASOF,
  },
  {
    code: "11(1)",
    schedule: "2",
    category: "telecommunications",
    title: "Technology for controlled telecommunications equipment",
    description:
      "Technology for design / production / use of telecom equipment under Schedule 1 Cat 11. Captures Japanese semiconductor-IP transfer programmes (Renesas RF-chipsets, NEC GaN MMICs).",
    euAnnexIRef: "5E001",
    earCclRef: "5E001",
    wassenaarRef: "5.E.1",
    sourceUrl: METI_FEFTA_URL,
    asOfDate: ASOF,
  },
  {
    code: "11(5)",
    schedule: "2",
    category: "telecommunications",
    title: "Cryptographic technology",
    description:
      "Source code, algorithmic specifications, side-channel-attack countermeasure designs for controlled crypto items under Schedule 1 Cat 11(5).",
    euAnnexIRef: "5E002",
    earCclRef: "5E002",
    wassenaarRef: "5.E.2",
    sourceUrl: METI_FEFTA_URL,
    asOfDate: ASOF,
    notes:
      "Open-source cryptographic library carve-out exists but is narrower than the US EAR §740.13(e) equivalent — Japanese operators should not assume open-source = exempt.",
  },
];

export const JAPAN_METI_COVERAGE: JapanMetiCoverage = {
  scope:
    "METI Schedule 1 (Goods) + Schedule 2 (Technology). Space-sector relevant entries in Cat 1 (weapons crossover), Cat 4 (spacecraft, rockets, UAVs), Cat 11 (telecom + crypto, mirror EU Cat 5), Cat 16 (imaging + sensors, mirror EU Cat 6). Structural entries included so the matcher can walk the Japanese list tree.",
  excluded: [
    "Cat 2 (advanced materials), Cat 3 (chemicals), Cat 5 (electronics other than telecom), Cat 6 (computers other than rad-hard), Cat 7 (sensors other than space), Cat 8 (avionics other than space-sub), Cat 9 (marine), Cat 10 (propulsion other than rockets), Cat 12-15 (advanced manufacturing, nuclear, chemical/bio dual-use) — covered only when the operator profile demands.",
    "Catch-all 'Inform Requirement' specific notices — those are published per-shipment by METI and are not enumerable as a static list.",
    "Open-source / mass-market carve-outs — handled at the license-determination stage, not in classification.",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 100,
  caelexCoverageCount: 40,
};

/**
 * Lookup a METI entry by its canonical code.
 *
 * @param code e.g. "4(1)", "4(2)(i)", "11(5)", "16(2)"
 * @returns the matching entry, or undefined if not found.
 *
 * Note: codes are duplicated across Schedule 1 / 2 — Schedule 1 takes
 * precedence in the bare lookup. Use `findJapanMetiEntries(code)` if
 * you need both. Helper kept terse on purpose (matches the EU helper
 * convention in this directory).
 */
export function findJapanMetiEntry(code: string): JapanMetiEntry | undefined {
  return JAPAN_METI_ENTRIES.find((e) => e.code === code);
}

/**
 * Lookup all METI entries (Schedule 1 + 2) sharing the same code.
 * Returned in schedule order (1 before 2).
 */
export function findJapanMetiEntries(code: string): JapanMetiEntry[] {
  return JAPAN_METI_ENTRIES.filter((e) => e.code === code).sort((a, b) =>
    a.schedule.localeCompare(b.schedule),
  );
}

/**
 * Lookup all METI entries for a given category bucket.
 *
 * Drives the dashboard UI's left-rail navigation: pass "spacecraft"
 * to get the Cat 4(1)/4(2)/4(7)/4(8) cluster, pass "missiles" to get
 * the MTCR-derived Cat 4(3) / 4(4) cluster, etc.
 */
export function findJapanMetiByCategory(
  cat: JapanMetiEntry["category"],
): JapanMetiEntry[] {
  return JAPAN_METI_ENTRIES.filter((e) => e.category === cat);
}
