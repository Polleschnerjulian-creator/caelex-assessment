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
 * Schedule 1 + 2 has 100+ sub-entries; Caelex covers the most
 * space-relevant (97 entries after the 2026-06-13 S6 deepening — see
 * the S6 provenance note below the source constants). For full lookup,
 * consult the METI English version directly.
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
 * Data-Sprint S6 (2026-06-13) — deepening the space slice from ~40 to
 * 90+ entries.
 *
 * PROVENANCE OF THE NEW ENTRIES. The original ~40 entries (above) used
 * a *Wassenaar-mirroring* code convention ("4(1)" spacecraft, "11(5)"
 * crypto, "16(3)" SAR) — a Caelex-internal scheme cross-referenced to
 * the multilateral category, NOT Japan's own row-numbering. The new
 * S6 entries instead key off METI's **actual** structure as published
 * in the official English provisional translation:
 *
 *   Cabinet Order (輸出貿易管理令) Appended Table 1 → numbered "rows"
 *   1-16, each detailed by an Article of the *Ministerial Order
 *   Specifying Goods and Technologies Pursuant to the Provisions of
 *   Appended Table 1* (貨物等省令). The real row → Article map (verified):
 *     row 4  = Ministerial Order Art. 3  — rockets / UAVs / missiles
 *     row 9  = Art. 8  — telecommunications + cryptography
 *     row 10 = Art. 9  — sensors / optics / lasers / cameras / radar
 *     row 13 = Art. 12 — aero gas-turbines + rocket propulsion +
 *                        "flying objects for outer space" (spacecraft,
 *                        launch vehicles, buses, payloads, TT&C devices)
 *
 *   New S6 codes therefore read "<row>(<Ministerial-Order-item>)" with
 *   the item in lower-case roman numerals exactly as the official
 *   English text numbers them, e.g. "4(xvii)" (accel/gyro nav usable in
 *   MTCR rockets), "9(ix)" (crypto > 56-bit symmetric key), "10(iii)"
 *   (space-use solid optical detectors), "13(iv)" (spacecraft + launch
 *   vehicles). These roman codes do not collide with the legacy arabic
 *   "4(1)…4(8)" entries (distinct strings).
 *
 *   NOTE on the legacy codes (reported, NOT silently changed per the
 *   curation rules): the legacy "4(1)" spacecraft / "11(5)" crypto /
 *   "16(3)" SAR codes do not match METI's real row numbering — under
 *   METI, spacecraft sit in row 13 (Art. 12), crypto in row 9 (Art. 8),
 *   imaging sensors in row 10 (Art. 9). The legacy codes remain as a
 *   Wassenaar cross-walk aid; the S6 codes are the row-faithful set.
 *
 * Source the new entries were verified against (official English
 * provisional translation, accessed 2026-06-13):
 *   - Ministerial Order Specifying Goods and Technologies Pursuant to
 *     the Provisions of Appended Table 1 of the Export Trade Control
 *     Order and the Appended Table of the Foreign Exchange Order —
 *     official English translation hosted by the Japanese Government's
 *     Law Translation service (japaneselawtranslation.go.jp, view/4554).
 *   - METI security-export-control hub (meti.go.jp) is the official
 *     ministry landing page for these instruments; per the dataset's
 *     sourceUrl convention every entry cites a meti.go.jp anchor
 *     (Schedule-1 goods → METI_SCHEDULE_1_URL; technology → METI_FEFTA_URL;
 *     control-list reference → METI_CONTROL_LIST_URL).
 *
 * HONEST EXCLUSIONS (Spec 4.5): where a category's granular numeric
 * thresholds could not be confirmed verbatim in the official English
 * translation (e.g. the dedicated navigation row 11 / Art. 10 INS drift
 * rates, and Art. 8 telecom digital-coding-rate tripwires whose exact
 * Mbit/s figure is set by cross-referenced sub-tables not rendered in
 * the fetched text), those items are EXCLUDED rather than fabricated.
 * See JAPAN_METI_COVERAGE.excluded.
 */
const METI_CONTROL_LIST_URL =
  "https://www.meti.go.jp/english/policy/external_economy/trade_control/index.html";
const ASOF_S6 = "2026-06-13";

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
    // CORRECTED 2026-06-13: EP maps to EU 9A004.f / CCL 9A004.f (→ 9A515) and
    // Wassenaar 9.A.4, NOT 9.A.11 (= ramjet/scramjet/combined-cycle engines).
    euAnnexIRef: "9A004.f",
    earCclRef: "9A004.f",
    wassenaarRef: "9.A.4",
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

  // ═══════════════════════════════════════════════════════════════════
  // S6 DEEPENING — row-faithful METI codes (verified 2026-06-13 against
  // the official English Ministerial Order, japaneselawtranslation.go.jp
  // view/4554, cross-walked to the METI control-list hub).
  //
  // Appended Table 1 ROW 4 — Ministerial Order Article 3
  // Rockets, unmanned aerial vehicles, and MTCR-derived items. Items
  // (i)–(xxvii). Threshold spine: "capable of transporting a payload
  // over a distance of 300 km or more" (MTCR Cat I range gate); many
  // sub-items add the "500 kg payload" gate. Roman-numeral codes mirror
  // the official item numbering.
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "4(i)",
    schedule: "1",
    category: "missiles",
    title: "Complete rockets capable of 300 km+ payload delivery",
    description:
      "Complete rockets (and the equipment, tooling, molds, or test equipment to manufacture them, or components thereof) capable of transporting a payload over a distance of 300 km or more. Item (i)-2 extends the same capture to unmanned aircraft at the 300 km gate; item (i)-3 adds aerosol-spraying UAVs designed to carry payloads exceeding 20 litres.",
    euAnnexIRef: "9A001",
    earCclRef: "9A001",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "MTCR Cat I 300 km range gate. Verified verbatim: 'rockets... capable of transporting a payload over a distance of 300 kilometers or more'.",
  },
  {
    code: "4(ii)",
    schedule: "1",
    category: "missiles",
    title: "Rocket-usable goods: stages, re-entry vehicles, guidance, TVC",
    description:
      "Goods usable in rockets at the 300 km gate: individual stages of multiple-stage rockets, re-entry vehicles, thermal shields and heat sinks, on-board electronics, guidance sets, and thrust-vector controllers. Includes solid/hybrid propulsion units with a total impulse of 841,000 N·s or more, and items for systems carrying 500 kg+ over 300 km+.",
    euAnnexIRef: "9A005, 9A104, 9A105",
    earCclRef: "9A104, 9A105",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Total-impulse tripwire verified verbatim: 'solid rocket propulsion units or hybrid rocket propulsion unit with a total impulse of 841,000 Newton-seconds or more'.",
  },
  {
    code: "4(iii)",
    schedule: "1",
    category: "spacecraft",
    title: "Propulsion units: turbojet/turbofan, ramjet/scramjet, motor cases",
    description:
      "Propulsion units and components — including motor-case linings and insulation. Turbojet/turbofan engines with maximum thrust exceeding 400 N and a fuel-consumption rate of 0.15 kg per newton of thrust per hour or less; plus ramjet, scramjet, pulse-jet, detonation, and combined-cycle engines for 500 kg / 300 km class systems; solid-motor cases, nozzles, propellant controllers, liquid propellant tanks, turboprop engines.",
    euAnnexIRef: "9A005, 9A105",
    earCclRef: "9A005, 9A105",
    wassenaarRef: "9.A.5",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Thrust/SFC tripwire verified verbatim: maximum thrust 'exceeds 400 newtons' and SFC '0.15 kilograms per newton of thrust per hour or less'.",
  },
  {
    code: "4(iv)",
    schedule: "1",
    category: "missiles",
    title: "Separation / staging mechanisms for multi-stage rockets",
    description:
      "Separation mechanisms or staging mechanisms for multiple-stage rockets usable in a rocket capable of transporting payloads weighing 500 kg or more over a distance of 300 km or more, plus the manufacturing tooling and test equipment and components thereof.",
    euAnnexIRef: "9A106",
    earCclRef: "9A106",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "4(v)",
    schedule: "1",
    category: "spacecraft",
    title: "Flow-forming machines for propulsion-unit manufacture",
    description:
      "Flow-forming machines capable of manufacturing propulsion units (or components) for rockets/UAVs at the 500 kg / 300 km class, where the machine is numerical-controller or computer controllable and meets the force/tooling criteria stated in the item.",
    euAnnexIRef: "9B105",
    earCclRef: "9B105",
    wassenaarRef: "9.B.5",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "4(vi)",
    schedule: "1",
    category: "spacecraft",
    title: "Servo valves, pumps, gas turbines for propellant controllers",
    description:
      "Servo valves, pumps, or gas turbines used in propellant controllers — pumps designed for liquid/slurry/gel-state propellant controllers within the stated frequency-range and performance bounds. Item (vi)-2 adds high-precision radial ball bearings (Class 2 tolerance or better) for such pumps.",
    euAnnexIRef: "9A106",
    earCclRef: "9A106",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "4(vii)",
    schedule: "1",
    category: "spacecraft",
    title: "Rocket propellants and raw materials",
    description:
      "Solid, liquid, or gelatinous propellants and their raw materials usable in rockets carrying 500 kg+ over 300 km+ — hydrazine and derivatives, ammonium perchlorate, energetic nitrate esters and nitramines, boron derivatives, liquid oxidisers, and binder polymers, as enumerated.",
    euAnnexIRef: "1C111",
    earCclRef: "1C111",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Long sub-list of named energetic compounds (octogen/HMX, hexogen/RDX, nitrate esters). Verified present in the official item (vii)–(x) enumeration.",
  },
  {
    code: "4(viii)",
    schedule: "1",
    category: "spacecraft",
    title: "Propellant production and test equipment",
    description:
      "Equipment, tooling, or test equipment for the production of rocket propellants or their raw materials (and components), including production lines for octogen/hexogen and composite propellants, as enumerated.",
    euAnnexIRef: "1B115",
    earCclRef: "1B115",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "4(ix)",
    schedule: "1",
    category: "spacecraft",
    title: "Batch mixers for solid/non-liquid propellants",
    description:
      "Batch mixers (other than for liquids) designed or altered for mixing at an absolute pressure between 0 and 13.326 kPa, with temperature control of the mixing chamber, meeting all the stated criteria, or components thereof. Item (ix)-2 covers continuous mixers with dual mixing axes.",
    euAnnexIRef: "1B117",
    earCclRef: "1B117",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Vacuum-mixing pressure window verified verbatim: 'not less than 0 kilopascals and not more than 13.326 kilopascals'.",
  },
  {
    code: "4(x)",
    schedule: "1",
    category: "spacecraft",
    title: "Jet mills and metal-powder production for propellants",
    description:
      "Jet mills for pulverising propellant materials or their components, and powder-production equipment for atomised, globular, or spheroidal metal powders, as enumerated under items (x) and (x)-2.",
    euAnnexIRef: "1B117, 1B118",
    earCclRef: "1B117, 1B118",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "4(xi)",
    schedule: "1",
    category: "spacecraft",
    title: "Composite production equipment (filament winding, tow placement)",
    description:
      "Equipment for producing composites, fibers, prepregs, or preforms usable in rockets/UAVs at the 300 km gate — filament-winding, fiber-placement, tow-placement, and tape-laying machines with three or more coordinated axes, plus parts and accessories.",
    euAnnexIRef: "1B001",
    earCclRef: "1B001",
    wassenaarRef: "1.B.1",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "4(xii)",
    schedule: "1",
    category: "spacecraft",
    title: "CVD nozzles for high-temperature substrate deposition",
    description:
      "Nozzles used to fix substances generated from the thermal decomposition of gas (chemical vapour deposition) onto substrates, operating in the 1,300–2,900 °C temperature range and the 130–20,000 Pa absolute-pressure range, as stated.",
    euAnnexIRef: "1B002",
    earCclRef: "1B002",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Temperature/pressure window verified verbatim: '1,300 degrees centigrade or more and 2,900 degrees centigrade or less' / '130 pascals or more and 20,000 pascals'.",
  },
  {
    code: "4(xiii)",
    schedule: "1",
    category: "spacecraft",
    title: "Production equipment for rocket nozzles / re-entry nose tips",
    description:
      "Equipment for producing nozzles of rocket propulsion systems or re-entry-vehicle nose tips — carbon-densification equipment for structural materials and CVD carbon-fixing equipment, plus their process controls.",
    euAnnexIRef: "1B002",
    earCclRef: "1B002",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "4(xiv)",
    schedule: "1",
    category: "spacecraft",
    title: "Isostatic presses (≥ 69 MPa) for rocket structures",
    description:
      "Isostatic presses with a maximum pressure of 69 MPa or more, capable of temperature control inside the hollow cavity, meeting all stated criteria, or their controllers.",
    euAnnexIRef: "2B104",
    earCclRef: "2B104",
    wassenaarRef: "2.B.4",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Pressure tripwire verified verbatim: 'maximum pressure of 69 megapascals or more'.",
  },
  {
    code: "4(xv)",
    schedule: "1",
    category: "spacecraft",
    title: "CVD carbon-densification furnaces for composites",
    description:
      "Furnaces designed for the densification of carbon in carbon/carbon-fiber composites by chemical vapour deposition, or their controllers — used to fabricate carbon-carbon throat/nozzle and nose-tip structures.",
    euAnnexIRef: "1B002",
    earCclRef: "1B002",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "4(xvi)",
    schedule: "1",
    category: "spacecraft",
    title:
      "Rocket structural materials (composites above specific-property gates)",
    description:
      "Structural materials: fiber-reinforced organic-matrix composites with specific strength exceeding 76,200 m and specific elastic modulus exceeding 3,180,000 m (or metal-matrix), and carbon/carbon composites designed for rocket use — limited to those usable in rockets/UAVs at the 300 km gate.",
    euAnnexIRef: "1C010, 1C210",
    earCclRef: "1C010, 1C210",
    wassenaarRef: "1.C.10",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Specific-property gates verified verbatim: specific strength 'exceeding 76,200 meters' and specific elastic modulus 'exceeding 3,180,000 meters'.",
  },
  {
    code: "4(xvii)",
    schedule: "1",
    category: "missiles",
    title: "Accelerometers, gyroscopes, and navigation usable in MTCR rockets",
    description:
      "Accelerometers, gyroscopes, and the navigation equipment or magnetic-direction sensors using them — limited to those usable in rockets/UAVs. Includes navigation designed for the 300 km class with gyrostabiliser or automated flight controller, gyro-astro compasses, and devices deriving position/orientation by automatically tracking celestial bodies or satellites.",
    euAnnexIRef: "7A103, 7A105",
    earCclRef: "7A103, 7A105",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Verified verbatim: 'accelerometers or gyroscopes, or equipment, navigation equipment or magnetic director sensors using them... limited to those usable in rockets or unmanned aerial vehicles'.",
  },
  {
    code: "4(xviii)",
    schedule: "1",
    category: "missiles",
    title: "Flight / attitude controllers for 500 kg-class rockets and UAVs",
    description:
      "Flight controllers or attitude controllers designed for use in a rocket or UAV capable of transporting 500 kg+ over 300 km+. Item (xviii)-2 covers servo valves rated to withstand effective acceleration exceeding 98 m/s² across 20–2,000 Hz; (xviii)-3 covers their test/calibration/alignment equipment.",
    euAnnexIRef: "7A116, 9A106",
    earCclRef: "7A116",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Servo-valve vibration gate verified verbatim: 'effective rate of acceleration exceeding 98 meters per second squared within the frequency range from 20 hertz to 2,000 hertz'.",
  },
  {
    code: "4(xix)",
    schedule: "1",
    category: "missiles",
    title: "Avionics: radars, passive sensors, GNSS for MTCR rockets/UAVs",
    description:
      "Avionics for 500 kg / 300 km class rockets/UAVs: radars; passive sensors for detecting the bearing of an electromagnetic source or landform features; and equipment for receiving radio waves from a satellite navigation system (incl. GNSS) usable on such systems.",
    euAnnexIRef: "7A106, 7A107",
    earCclRef: "7A106, 7A107",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "4(xx)",
    schedule: "1",
    category: "missiles",
    title:
      "Airborne gravity meters / gradiometers (≤ 0.7 mGal) for MTCR systems",
    description:
      "Aircraft- or ship-mounted gravity meters with precision of 0.7 milligals or less and measurement time within 2 minutes — limited to those usable in 500 kg / 300 km class rockets/UAVs. Item (xx)-2 covers the corresponding gravity gradiometers.",
    euAnnexIRef: "7A116",
    earCclRef: "7A116",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Precision gate verified verbatim: 'precision of 0.7 milligals or less, those the time required for measurement of which is within 2 minutes'.",
  },
  {
    code: "4(xxi)",
    schedule: "1",
    category: "missiles",
    title: "Launch pads and ground launch support equipment",
    description:
      "Launch pads or associated ground launch support equipment for rockets or UAVs — including equipment designed for handling, controlling, operating, or launching systems capable of transporting payloads over 300 km, as enumerated.",
    euAnnexIRef: "9B115, 9B116",
    earCclRef: "9B115, 9B116",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "4(xxii)",
    schedule: "1",
    category: "missiles",
    title: "Radio telemetry / telecontrol for MTCR rockets and UAVs",
    description:
      "Radio telemetry equipment or radio telecontrollers (including ground equipment) designed for rockets/UAVs at the 300 km gate, excluding equipment designed for manned aircraft or artificial satellites, land/sea mobile bodies, or civil safety-of-life satellite-navigation data reception. Item (xxii)-2 covers usable tracking devices.",
    euAnnexIRef: "9A115",
    earCclRef: "9A115",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Important carve-out: equipment 'designed for use in... artificial satellites' is excluded here — commercial sat TT&C is handled under the row-13 spacecraft items, not row-4 missile telemetry.",
  },
  {
    code: "4(xxiii)",
    schedule: "1",
    category: "missiles",
    title: "Rad-hard / wide-temperature computers for MTCR rockets",
    description:
      "Analog or digital computers designed for use in a rocket capable of carrying 500 kg+ over 300 km+, that are either usable from below −45 °C to over 55 °C, or able to withstand a total absorbed dose of 500,000 rads (silicon basis) or more.",
    euAnnexIRef: "9A101",
    earCclRef: "9A101",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Rad-tolerance gate verified verbatim: 'total absorbed dose of which on a silicon conversion basis is 500,000 rads or more'.",
  },
  {
    code: "4(xxiv)",
    schedule: "1",
    category: "missiles",
    title: "Rad-hard ADCs / A-to-D integrated circuits for MTCR rockets",
    description:
      "Integrated circuits for analog-to-digital conversion, or A/D converters, usable in 500 kg / 300 km class rockets/UAVs — those designed to withstand 500,000 rads (silicon basis) or more, or usable at temperatures below −54 °C, as enumerated.",
    euAnnexIRef: "9A101",
    earCclRef: "9A101",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "4(xxv)",
    schedule: "1",
    category: "missiles",
    title: "Vibration / aerodynamic / combustion test equipment for rockets",
    description:
      "Vibration test equipment (digitally controlled, exciting force 50 kN or more bare-table, meeting the stated criteria), aerodynamic test equipment, combustion test equipment, environmental test equipment, or electron accelerators usable in developing/testing rockets/UAVs at the 300 km gate.",
    euAnnexIRef: "9B106",
    earCclRef: "9B106",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Exciting-force gate verified verbatim: 'exciting force of 50 kilonewtons or more in a state with no test object present'.",
  },
  {
    code: "4(xxvi)",
    schedule: "1",
    category: "missiles",
    title: "Stealth (low-observable) materials and equipment for rockets/UAVs",
    description:
      "Materials or equipment using stealth technology to reduce reflection or emission of radio waves, acoustic waves (incl. ultrasound), or light (UV and IR) — usable in rockets/UAVs at the 300 km gate, the spray-UAVs of item (i)-3, or item (ii) goods, plus their test equipment.",
    euAnnexIRef: "9A110",
    earCclRef: "9A110",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "4(xxvii)",
    schedule: "1",
    category: "missiles",
    title: "Nuclear-hardened ICs, detectors, radomes for MTCR rockets",
    description:
      "Integrated circuits, detectors, or radomes usable in 500 kg / 300 km class rockets/UAVs: ICs designed to withstand 500,000 rads (silicon basis) or more and to protect against nuclear effects; detectors for nuclear-effect protection; and radomes able to withstand thermal shock exceeding 4,184 kJ/m² at the stated pressure.",
    euAnnexIRef: "9A107",
    earCclRef: "9A107",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Radome thermal-shock gate verified verbatim: 'thermal shock exceeding 4,184 kilojoules per square meter'.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Appended Table 1 ROW 9 — Ministerial Order Article 8
  // Telecommunications + cryptography. The dual-use comm/crypto slice
  // for ground stations, ISL terminals, sat-comm transponders, and
  // TT&C link encryption. Roman-numeral codes mirror Art. 8 items.
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "9(i)",
    schedule: "1",
    category: "telecommunications",
    title: "Controlled telecommunications equipment (umbrella item)",
    description:
      "Umbrella capture for telecommunication transmission equipment, electronic exchangers, telecommunication optical fibers, phased-array antennas, radio direction-finding monitoring equipment, radio-interception equipment, and communication-jamming equipment meeting the Article 8 specifications.",
    euAnnexIRef: "5A001",
    earCclRef: "5A001",
    wassenaarRef: "5.A.1",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "9(ii)",
    schedule: "1",
    category: "telecommunications",
    title: "Radio transmitters / receivers above performance thresholds",
    description:
      "Telecommunication transmission equipment, components, or accessories — radio transmitters or receivers meeting the stated capability thresholds (employed in satellite ground stations, sat-comm modems, and constellation gateway equipment).",
    euAnnexIRef: "5A001.b",
    earCclRef: "5A001.b",
    wassenaarRef: "5.A.1.b",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "9(iv)",
    schedule: "1",
    category: "telecommunications",
    title: "High-tensile communication optical fibers (> 500 m, ≥ 2 GPa)",
    description:
      "Communication optical fibers longer than 500 m with a tensile strength of 2 GN/m² (2 GPa) or more — high-strength fibers used in survivable ground-segment and shipboard comm links.",
    euAnnexIRef: "5A001.e",
    earCclRef: "5A001.e",
    wassenaarRef: "5.A.1.e",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Tensile-strength gate verified verbatim: 'tensile strength of 2 giganewtons per square meter or more' with length 'exceeding 500 meters'.",
  },
  {
    code: "9(v)",
    schedule: "1",
    category: "telecommunications",
    title: "Electronically-scanned phased-array antennas",
    description:
      "Phased-array antennas capable of electronic scanning and designed to be usable for the controlled devices enumerated in the item (excluding ICAO-conformant microwave landing systems). Direct hit for steerable Ka/Ku phased arrays on flat-panel user terminals and constellation gateways.",
    euAnnexIRef: "5A001.d",
    earCclRef: "5A001.d",
    wassenaarRef: "5.A.1.d",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Verified verbatim: 'phased array antennas capable of electronic scanning'. ICAO-MLS carve-out noted in the official text.",
  },
  {
    code: "9(vi)",
    schedule: "1",
    category: "telecommunications",
    title: "Design / manufacture / test equipment for controlled telecom goods",
    description:
      "Equipment for the design, manufacture, measurement, or testing of controlled telecommunications goods (cross-referenced to specific Article 8 / Article 14 items), or components and accessories thereof.",
    euAnnexIRef: "5B001",
    earCclRef: "5B001",
    wassenaarRef: "5.B.1",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "9(ix)",
    schedule: "1",
    category: "telecommunications",
    title: "Cryptographic equipment (> 56-bit symmetric / asymmetric)",
    description:
      "Cryptographic equipment or components realising a cryptographic function for data confidentiality, using a symmetric algorithm with a key length over 56 bits, or an asymmetric algorithm whose security rests on the stated hard problems. Captures TT&C/telemetry link encryptors and payload-data crypto units on commercial and government satellites.",
    euAnnexIRef: "5A002.a",
    earCclRef: "5A002.a",
    wassenaarRef: "5.A.2.a",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Symmetric key-length gate verified verbatim: 'symmetric key being over 56 bits in length'. This is the row-faithful crypto entry; legacy '11(5)' is the Wassenaar-mirror equivalent (reported, not changed).",
  },
  {
    code: "9(x)",
    schedule: "1",
    category: "telecommunications",
    title: "Information-security management equipment (non-cryptographic)",
    description:
      "Equipment or components realising an information-system security-management function other than a cryptographic function — including communication cable systems with intrusion-detection (tamper-evident) features, as enumerated.",
    euAnnexIRef: "5A003",
    earCclRef: "5A003",
    wassenaarRef: "5.A.3",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },

  // ═══════════════════════════════════════════════════════════════════
  // Appended Table 1 ROW 10 — Ministerial Order Article 9
  // Sensors, optics, lasers, cameras, radar, magnetometers, gravity
  // meters. The space EO/IR/imaging payload slice. Note Art. 9 controls
  // many items with an explicit "designed for space use" gate.
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "10(iii)",
    schedule: "1",
    category: "imaging",
    title: "Solid optical detectors designed for space use",
    description:
      "Optical detectors (and components) — including solid-state optical detectors designed for space use with maximum sensitivity in the >10 nm to ≤300 nm band and the stated out-of-band sensitivity suppression. Captures space-qualified UV/visible focal-plane detectors on EO and astronomy payloads.",
    euAnnexIRef: "6A002.a",
    earCclRef: "6A002.a",
    wassenaarRef: "6.A.2.a",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Space-use band gate verified verbatim: 'solid optical detectors designed for space use... maximum sensitivity within a wavelength range exceeding 10 nanometers and 300 nanometers or less'.",
  },
  {
    code: "10(iv)",
    schedule: "1",
    category: "imaging",
    title:
      "Mono-/multi-spectrum image sensors for remote sensing (< 200 µrad IFOV)",
    description:
      "Mono-spectrum or multi-spectrum image sensors designed for remote sensing with an instantaneous field of view of less than 200 microradians, or those operating within the stated wavelength bands. The high-resolution EO imager tripwire for Earth-observation smallsats.",
    euAnnexIRef: "6A002.b",
    earCclRef: "6A002.b",
    wassenaarRef: "6.A.2.b",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "IFOV gate verified verbatim: 'image sensors with an instant visual field of less than 200 microradians'.",
  },
  {
    code: "10(v)",
    schedule: "1",
    category: "imaging",
    title: "Direct-view image-intensifier (photocathode) equipment",
    description:
      "Equipment using optical detectors with a direct field of view — image-intensifier / photocathode equipment (e.g. GaAs or InGaAs photocathodes), excluding the enumerated medical exceptions. Used in low-light star-tracker and night-imaging payloads.",
    euAnnexIRef: "6A002.a.2",
    earCclRef: "6A002.a.2",
    wassenaarRef: "6.A.2.a.2",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "10(vi)",
    schedule: "1",
    category: "imaging",
    title: "Cryogenic coolers for optical detectors (space-use)",
    description:
      "Coolers for optical detectors — including coolers designed for space use, and non-space coolers cooling below the stated detector temperature. Captures the cryocoolers feeding IR focal planes on thermal-imaging spacecraft.",
    euAnnexIRef: "6A002.d",
    earCclRef: "6A002.d",
    wassenaarRef: "6.A.2.d",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "10(viii)",
    schedule: "1",
    category: "imaging",
    title: "Electronic cameras above intensifier / frame-rate thresholds",
    description:
      "Electronic cameras (and components) — including cameras with built-in image-intensifier tubes meeting the item (iii)(b) tube criteria, and high-frame-rate / high-sensitivity cameras as enumerated. Captures space-borne framing cameras and imaging payload front-ends.",
    euAnnexIRef: "6A003.b",
    earCclRef: "6A003.b",
    wassenaarRef: "6.A.3.b",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "10(x)",
    schedule: "1",
    category: "imaging",
    title: "Laser oscillators above output / wavelength thresholds",
    description:
      "Laser oscillators (and components, accessories, or test equipment) — continuous-wave and pulsed laser sources above the stated power/energy/wavelength thresholds. Captures LIDAR/LADAR transmit lasers, optical-comm laser sources, and laser-altimeter emitters.",
    euAnnexIRef: "6A005",
    earCclRef: "6A005",
    wassenaarRef: "6.A.5",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "10(xi)",
    schedule: "1",
    category: "imaging",
    title: "Magnetometers and magnetic gradiometers above sensitivity gates",
    description:
      "Magnetometers, magnetic gradiometers (excluding medical), or underwater electric-field sensors above the stated sensitivity thresholds, plus calibration equipment and components. Used in scientific and magnetospheric spacecraft.",
    euAnnexIRef: "6A006",
    earCclRef: "6A006",
    wassenaarRef: "6.A.6",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "10(xii)",
    schedule: "1",
    category: "imaging",
    title: "Gravity meters (< 10 µGal) and gravity gradiometers",
    description:
      "Ground-use gravity meters with a static-measurement precision of less than 10 microgals (excluding the Worden-type exception), and gravity gradiometers, as enumerated. Used in geodesy and gravity-field science missions.",
    euAnnexIRef: "6A007",
    earCclRef: "6A007",
    wassenaarRef: "6.A.7",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Precision gate verified verbatim: 'gravity meters designed for ground use with a precision of less than 10 microgals'.",
  },
  {
    code: "10(xiii)",
    schedule: "1",
    category: "imaging",
    title: "Radar systems above performance thresholds (incl. SAR)",
    description:
      "Radar systems (and components) meeting the stated performance thresholds, excluding ICAO-standard secondary surveillance, civil automotive, meteorological, and precision-approach radars. Captures space-borne SAR and ground debris-tracking radar.",
    euAnnexIRef: "6A008",
    earCclRef: "6A008",
    wassenaarRef: "6.A.8",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "This is the row-faithful SAR/radar entry; legacy '16(3)'/'16(7)' are the Wassenaar-mirror equivalents (reported, not changed).",
  },
  {
    code: "10(xiv)",
    schedule: "1",
    category: "imaging",
    title: "High-precision optical measuring equipment (≤ 0.1% reflectance)",
    description:
      "Optical measuring equipment — including reflectance-measuring equipment with absolute-reflectance precision of 0.1 percent or less, as enumerated. Used to characterise optical-payload mirrors and coatings.",
    euAnnexIRef: "6B004",
    earCclRef: "6B004",
    wassenaarRef: "6.B.4",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Precision gate verified verbatim: reflectance precision 'is 0.1 percent or less'.",
  },
  {
    code: "10(xvi)",
    schedule: "1",
    category: "imaging",
    title: "Optical-detector crystals and high-purity optical materials",
    description:
      "Crystals for optical detectors and other materials, or materials for laser-oscillator optical components — including tellurium of 99.9995% purity or more and single-crystal wafers as enumerated. Captures the substrate materials for space-grade IR detectors.",
    euAnnexIRef: "6C002, 6C004",
    earCclRef: "6C002, 6C004",
    wassenaarRef: "6.C.2",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Purity gate verified verbatim: 'tellurium with a purity of 99.9995 % or more'.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Appended Table 1 ROW 13 — Ministerial Order Article 12
  // Aero gas-turbines + rocket propulsion + "flying objects for outer
  // space". Item (iv) is the explicit METI spacecraft / launch-vehicle
  // control — the row-faithful home for satellites, buses, and payloads
  // (the legacy '4(1)' spacecraft code is the Wassenaar-mirror).
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "13(i)",
    schedule: "1",
    category: "spacecraft",
    title: "Aircraft gas-turbine engines (controlled-technology built)",
    description:
      "Gas-turbine engines for aircraft built using controlled design/manufacturing technology (cross-referenced to Article 25 items), or their components. The aero-propulsion anchor of row 13, adjacent to the rocket-propulsion and spacecraft items.",
    euAnnexIRef: "9A001, 9A002",
    earCclRef: "9A001, 9A002",
    wassenaarRef: "9.A.1",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "13(iv)",
    schedule: "1",
    category: "spacecraft",
    title: "Flying objects for outer space: spacecraft, launch vehicles, buses",
    description:
      "'Flying objects for outer space', flying objects for launching them, their components, and sub-orbital craft: (a) launch vehicles; (b) spacecraft; (c) spacecraft buses; (d) payloads incorporating other controlled goods; (e) onboard devices for remote-command/telemetry processing, payload-data processing, or attitude-and-orbit control; (f) suborbital-use spacecraft.",
    euAnnexIRef: "9A004",
    earCclRef: "9A515",
    wassenaarRef: "9.A.4",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Verified verbatim: '(b) flying objects for outer space; (c) buses for flying objects for outer space; (d) payloads for flying objects for outer space...'. This is METI's actual spacecraft control (row 13 / Art. 12); legacy '4(1)' is the Wassenaar-mirror (reported, not changed).",
  },
  {
    code: "13(v)",
    schedule: "1",
    category: "spacecraft",
    title: "Onboard TT&C / data-processing / AOCS devices for spacecraft",
    description:
      "Devices designed to be loaded on a flying object for outer space and providing remote-command or remote-measurement (telemetry) data processing, payload-data processing, or attitude-and-orbit control. Item (iv)-2 covers air-launch carrier aircraft; (iv)-3 covers ground control/monitoring equipment for spacecraft.",
    euAnnexIRef: "9A004.c",
    earCclRef: "9A515.b",
    wassenaarRef: "9.A.4.c",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Onboard-device functions verified verbatim: 'remote command or remote measurement data processing; payload data processing; or attitude and orbit control'.",
  },
  {
    code: "13(vi)",
    schedule: "1",
    category: "spacecraft",
    title: "Liquid rocket propulsion units and components",
    description:
      "Liquid rocket propulsion units (including internally-stored units) and their components — very-low-temperature cooling systems, Dewar vessels, heat pipes, and the other cryogenic and feed-system components enumerated for liquid stages.",
    euAnnexIRef: "9A005",
    earCclRef: "9A005",
    wassenaarRef: "9.A.5",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "13(vii)",
    schedule: "1",
    category: "spacecraft",
    title: "Solid rocket propulsion units (> 1.1 MN·s total impulse)",
    description:
      "Solid rocket propulsion units whose total-impulse capacity exceeds 1.1 meganewton-seconds, or whose specific impulse is 2.4 kN·s/kg or more at the stated nozzle-outlet conditions, as enumerated.",
    euAnnexIRef: "9A007",
    earCclRef: "9A007",
    wassenaarRef: "9.A.7",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Total-impulse gate verified verbatim: 'total impulse capacity exceeds 1.1 meganewtons second'. Specific-impulse gate: '2.4 kilonewtons second per kilogram or more'.",
  },
  {
    code: "13(xvii)",
    schedule: "1",
    category: "spacecraft",
    title: "Non-destructive rocket-motor test equipment",
    description:
      "Equipment used to test rocket motors using non-destructive examination technology — the NDE/inspection rigs for solid and liquid motor qualification.",
    euAnnexIRef: "9B106",
    earCclRef: "9B106",
    wassenaarRef: "9.B.6",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "13(xviii)",
    schedule: "1",
    category: "spacecraft",
    title: "High-temperature wall-friction converters for flow testing",
    description:
      "Converters designed to directly measure the wall friction of a flow whose stagnation-point temperature exceeds 560 °C — instrumentation for hypersonic and high-enthalpy aerothermal testing of propulsion and re-entry hardware.",
    euAnnexIRef: "9B106",
    earCclRef: "9B106",
    wassenaarRef: "9.B.6",
    sourceUrl: METI_SCHEDULE_1_URL,
    asOfDate: ASOF_S6,
    notes:
      "Temperature gate verified verbatim: 'temperatures at stagnation point are greater than 560 degrees centigrade'.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // Schedule 2 (Technology) — S6 additions for the row-faithful goods.
  // Foreign Exchange Order Appended Table — technology corresponding to
  // the new Schedule 1 goods. Same code, schedule "2" (no dup with the
  // Schedule 1 entry above; uniqueness is per schedule+code).
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "13(iv)",
    schedule: "2",
    category: "spacecraft",
    title: "Technology for spacecraft / launch vehicles (row 13 / Art. 12)",
    description:
      "Technology (program, technical data, drawings, know-how) for the design, production, or use of 'flying objects for outer space' and launch vehicles controlled under Schedule 1 row 13 item (iv). Deemed-export (Foreign Exchange Order) rules apply to transfers to foreign nationals resident in Japan.",
    euAnnexIRef: "9E001, 9E002",
    earCclRef: "9E515, 9E001",
    wassenaarRef: "9.E.1, 9.E.2",
    sourceUrl: METI_FEFTA_URL,
    asOfDate: ASOF_S6,
    notes:
      "Row-faithful technology counterpart to the legacy Schedule 2 '4(1)' spacecraft-technology entry.",
  },
  {
    code: "13(vii)",
    schedule: "2",
    category: "spacecraft",
    title: "Technology for solid rocket propulsion units",
    description:
      "Technology for the design, production, or use of solid rocket propulsion units controlled under Schedule 1 row 13 item (vii) — grain design, case/insulation processing, nozzle and throat fabrication, and motor qualification know-how.",
    euAnnexIRef: "9E007",
    earCclRef: "9E007",
    wassenaarRef: "9.E.7",
    sourceUrl: METI_FEFTA_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "9(ix)",
    schedule: "2",
    category: "telecommunications",
    title: "Technology for controlled cryptographic equipment",
    description:
      "Technology (source code, algorithm specifications, side-channel countermeasure designs) for the design, production, or use of cryptographic equipment controlled under Schedule 1 row 9 item (ix).",
    euAnnexIRef: "5E002",
    earCclRef: "5E002",
    wassenaarRef: "5.E.2",
    sourceUrl: METI_FEFTA_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "10(iv)",
    schedule: "2",
    category: "imaging",
    title: "Technology for remote-sensing image sensors",
    description:
      "Technology for the design, production, or use of mono-/multi-spectrum remote-sensing image sensors controlled under Schedule 1 row 10 item (iv) — detector-array design, readout-integrated-circuit design, and radiometric-calibration know-how.",
    euAnnexIRef: "6E001, 6E002",
    earCclRef: "6E001",
    wassenaarRef: "6.E.1, 6.E.2",
    sourceUrl: METI_FEFTA_URL,
    asOfDate: ASOF_S6,
  },
  {
    code: "4(xvii)",
    schedule: "2",
    category: "missiles",
    title: "Technology for MTCR-rocket navigation (accel/gyro)",
    description:
      "Technology for the design, production, or use of accelerometers, gyroscopes, and navigation equipment usable in MTCR rockets/UAVs, controlled under Schedule 1 row 4 item (xvii). MTCR strong-presumption-of-denial policy applies; deemed-export rules apply.",
    euAnnexIRef: "7E001, 7E002",
    earCclRef: "7E001",
    wassenaarRef: "n/a (MTCR-only)",
    sourceUrl: METI_FEFTA_URL,
    asOfDate: ASOF_S6,
  },
];

export const JAPAN_METI_COVERAGE: JapanMetiCoverage = {
  scope:
    "METI Schedule 1 (Goods) + Schedule 2 (Technology). Two code conventions coexist: (a) the legacy Wassenaar-mirror codes for Cat 1 (weapons crossover), Cat 4 (spacecraft/rockets/UAVs), Cat 11 (telecom+crypto), Cat 16 (imaging/sensors); and (b) the S6 row-faithful codes keyed off METI's actual Appended Table 1 row → Ministerial Order Article structure — row 4 / Art. 3 (rockets, UAVs, MTCR items), row 9 / Art. 8 (telecommunications + cryptography), row 10 / Art. 9 (sensors, optics, lasers, cameras, radar), row 13 / Art. 12 (aero gas-turbines + rocket propulsion + 'flying objects for outer space' = spacecraft, launch vehicles, buses, payloads, TT&C devices). Structural entries included so the matcher can walk the Japanese list tree.",
  excluded: [
    "Appended Table 1 row 11 / Ministerial Order Article 10 (dedicated navigation: inertial navigation systems, ring-laser/fibre-optic gyroscopes, accelerometers, GNSS receivers): the standalone navigation row is EXCLUDED from the S6 deepening to avoid mis-categorising it — under the dataset's category rules a code beginning '11' is forced into the 'telecommunications' bucket, which would misrepresent navigation goods. MTCR-context navigation IS covered via row-4 item 4(xvii)–4(xx) (Art. 3 accel/gyro/avionics usable in rockets), which is the space-relevant slice. Standalone civil INS/GNSS thresholds therefore not enumerated here.",
    "Article 8 telecom digital-coding-rate / data-rate tripwires (the exact Mbit/s figure): the numeric gate is set by cross-referenced sub-tables not rendered verbatim in the fetched official English text, so the precise threshold is NOT enumerated rather than fabricated (Spec 4.5). The umbrella telecom captures 9(i)/9(ii) are included; the strict data-rate figure is deferred.",
    "Article 1 (nuclear), Article 2/2-2 (chemical/biological), Article 4 (advanced materials), Article 5 (materials processing), Article 6 (test/measurement), Article 7 (computers, row 8), Article 11 (marine submersibles, row 12), Article 13 (sensitive jamming/info-security goods) — out of the space slice except where an item is explicitly usable in rockets (then captured under row 4 / Art. 3).",
    "Catch-all 'Inform Requirement' specific notices — published per-shipment by METI and not enumerable as a static list.",
    "Open-source / mass-market cryptographic carve-outs — handled at the license-determination stage, not in classification.",
  ],
  asOfDate: ASOF_S6,
  officialTotalEntriesApprox: 100,
  caelexCoverageCount: 97,
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
