/**
 * Wassenaar Arrangement — Cat 6 (Sensors/Lasers) + Cat 7 (Navigation/
 * Avionics) + Cat 9 (Aerospace).
 *
 * The Wassenaar Arrangement is the 42-state multilateral export-control
 * regime that establishes the BASELINE control language from which
 * national lists (EU Annex I 2021/821, US EAR CCL, DE Anlage AL, UK
 * Strategic Export Control List, JP MITI, etc.) are derived. It is NOT
 * itself enforceable law — each participating state implements it via
 * national regulation.
 *
 * Two lists:
 *   - **Munitions List (ML)** — items "specially designed" for military
 *     end-use. National implementations (USML, EU Common Military List
 *     2020/1505, DE Teil I AL) flow from this.
 *   - **Dual-Use List (DUL)** — civil items with military potential.
 *     Five-categories-deep structure: A (equipment), B (test/prod), C
 *     (materials), D (software), E (technology). Mirrors map 1:1 into
 *     EU Annex I and US CCL Category numbers.
 *
 * This file: aerospace-relevant subsets of Cat 6 + Cat 7 + Cat 9.
 *
 * Why "first-class": Caelex Trade previously referenced Wassenaar as a
 * `seeAlso` cross-walk relationship only — there was no primary dataset
 * for operators to query "is this multilaterally controlled, or just
 * a unilateral US/EU addition?" This file fills that gap.
 *
 * Coverage rationale:
 *   - **ML10**  Aircraft + UAVs (overlaps USML XV launchers)
 *   - **ML15**  Imaging equipment for military use
 *   - **6.A.1** Acoustic sensors (sonar)
 *   - **6.A.2** Optical sensors (THE multilateral baseline for EO arrays)
 *   - **6.A.3** Cameras (gated, framing, streak)
 *   - **6.A.5** Lasers (CW + pulsed, fiber, semiconductor)
 *   - **6.A.8** Radar (incl. SAR)
 *   - **7.A.1-5** Navigation/avionics: accelerometers, gyros, IMU/INS,
 *                 star trackers, controlled GNSS receivers (satellite ADCS/GNC)
 *   - **7.D.1**   Software for development/production of 7.A items
 *   - **7.E.1**   Technology for development of 7.A items
 *   - **9.A.1** Aero gas turbines
 *   - **9.A.4-7** Spacecraft, launch vehicles, propulsion, ground equipment
 *   - **9.A.11** Ramjet / scramjet / combined-cycle engines
 *   - **9.A.12** UAVs (non-military)
 *   - **9.D.1-4** Aerospace software
 *   - **9.E.1-3** Aerospace technology
 *
 * Out of scope here: Cat 3 rad-hard microelectronics (3.A.1 / 3.A.2,
 * EU 3A001/3A002) — covered, if at all, by a dedicated Cat-3 dataset,
 * not this aerospace Cat 6/7/9 file.
 *
 * Coverage descriptors are terse-and-paraphrased. No verbatim
 * regulatory text. Consult the source URL for authoritative language.
 *
 * Source: Wassenaar Arrangement public control lists, WA-LIST (current).
 * https://www.wassenaar.org/control-lists/
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

const SOURCE_URL = "https://www.wassenaar.org/control-lists/";

const ASOF = "2026-05-23";

/**
 * Data-Sprint S5 enrichment (Cat-9 deepening + space-relevant Cat 6/7
 * gaps). Verified against the current public list — WA-LIST (25) 1 Corr.
 * "List of Dual-Use Goods and Technologies and Munitions List", dated
 * 15-01-2026 (December 2025 Plenary) — re-confirmed code-by-code on the
 * date below. The control-lists hub redirects to whichever WA-LIST is
 * current; we keep the durable hub URL as the canonical source per the
 * file convention but pin the exact list edition + page-verified codes
 * in this comment for provenance.
 */
const ASOF_S5 = "2026-06-13";

/**
 * One Wassenaar Arrangement control-list entry.
 *
 * Distinct from `ClassificationEntry` (the national-list schema)
 * because Wassenaar is the upstream multilateral baseline rather than
 * a single jurisdiction. Key differences:
 *
 *   - `list` distinguishes Munitions (ML) from Dual-Use (DUL).
 *   - `category` is the top-level number ("6" or "9").
 *   - `euAnnexIRef` / `earCclRef` give one-shot cross-walk to the two
 *     biggest national implementations (operators almost always need
 *     to know "what does this mean in EU/EAR terms?").
 *   - No `controlReasons` enum — Wassenaar uses regime-internal
 *     categories ("strategic," "WA basic," "WA enhanced") that don't
 *     map cleanly to the national RfC vocabularies.
 */
export interface WassenaarEntry {
  /** Wassenaar code in canonical dot notation (e.g. "6.A.2.a.1"). */
  code: string;

  /** Which Wassenaar list this belongs to. */
  list: "ML" | "DUL";

  /** Top-level Wassenaar category number (e.g. "6", "9", or "ML" for
   *  Munitions entries that don't fit the 1-9 DUL numbering). */
  category: string;

  /** Short headline (≤100 chars). */
  title: string;

  /** Paraphrased plain-English description. NOT verbatim regulatory text. */
  description: string;

  /** Corresponding EU Annex I code, if there's a direct 1:1 mirror.
   *  E.g. Wassenaar 6.A.2.a.1 → EU 6A002.a.1. */
  euAnnexIRef?: string;

  /** Corresponding US EAR CCL ECCN, if there's a direct 1:1 mirror.
   *  E.g. Wassenaar 6.A.5.d.1 → EAR 6A005.d.1. */
  earCclRef?: string;

  /** URL to the official Wassenaar text. */
  sourceUrl: string;

  /** ISO-8601 date this entry was last verified against the source. */
  asOfDate: string;
}

export const WASSENAAR_CAT6_9_ENTRIES: WassenaarEntry[] = [
  // ═══════════════════════════════════════════════════════════════════
  // MUNITIONS LIST (ML) — items specially designed for military use.
  // ═══════════════════════════════════════════════════════════════════

  // ─── ML10 — Aircraft + UAVs for military use ─────────────────────
  {
    code: "ML10.a",
    list: "ML",
    category: "ML",
    title:
      "Combat aircraft and components, specially designed for military use",
    description:
      "Manned aircraft designed or modified for military missions (combat, reconnaissance, ELINT, transport in hostile environments) and their specially-designed components.",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "ML10.b",
    list: "ML",
    category: "ML",
    title: "Other military aircraft",
    description:
      "Aircraft modified for military training, electronic warfare, or carrying military equipment (refueling, surveillance pods). Includes converted civilian airframes.",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "ML10.c",
    list: "ML",
    category: "ML",
    title:
      "Unmanned aerial vehicles (UAVs) specially designed for military use",
    description:
      "Combat UAVs, target drones, military reconnaissance UAVs. Military-grade UAVs flow here from ML; dual-use UAVs flow from DUL 9.A.12.",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "ML10.d",
    list: "ML",
    category: "ML",
    title: "Aero-engines specially designed for ML10.a-c platforms",
    description:
      "Turbojet, turbofan, turboprop, rocket, and ramjet engines specially designed or modified for military aircraft and UAVs.",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "ML10.e",
    list: "ML",
    category: "ML",
    title: "Airborne equipment, specially designed for ML10.a-c platforms",
    description:
      "In-flight refueling equipment, defensive aids suites, military pylons/racks, ejection seats, oxygen systems for combat altitude.",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── ML15 — Imaging equipment for military use ───────────────────
  {
    code: "ML15.a",
    list: "ML",
    category: "ML",
    title: "Image-intensifier tubes, specially designed for military use",
    description:
      "Gen-2 and Gen-3 image-intensifier tubes for night-vision goggles, gun-sights, and helicopter pilotage. Dual-use variants flow through DUL 6.A.2.a.2.",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "ML15.b",
    list: "ML",
    category: "ML",
    title: "Thermal imaging equipment, specially designed for military use",
    description:
      "Cooled and uncooled thermal imagers in militarized housings. Crew-served and individual-soldier sights, vehicle/aircraft FLIR.",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "ML15.c",
    list: "ML",
    category: "ML",
    title: "Military camera/sensor systems for reconnaissance",
    description:
      "Aerial reconnaissance cameras, militarized hyperspectral sensors, target-acquisition sights. The military mirror of DUL 6.A.3 (cameras).",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "ML15.d",
    list: "ML",
    category: "ML",
    title: "Specially designed components for ML15.a-c",
    description:
      "Focal-plane arrays, optics, gimbals, signal processors specially designed for military imaging systems.",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // DUAL-USE LIST (DUL) — civil items with military potential.
  // ═══════════════════════════════════════════════════════════════════

  // ─── 6.A.1 — Acoustic sensors ─────────────────────────────────────
  {
    code: "6.A.1.a",
    list: "DUL",
    category: "6",
    title: "Marine acoustic systems — active sonar",
    description:
      "Active sonar arrays for marine ASW, hydrography, seabed mapping. Multilateral baseline for civilian + naval sonar.",
    euAnnexIRef: "6A001.a",
    earCclRef: "6A001.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.1.b",
    list: "DUL",
    category: "6",
    title: "Marine acoustic systems — passive sonar",
    description:
      "Passive sonar arrays, towed-array sensors, hull-mounted hydrophones. The submarine-detection workhorse.",
    euAnnexIRef: "6A001.b",
    earCclRef: "6A001.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6.A.2 — Optical sensors (mirror EU 6A002) ────────────────────
  {
    code: "6.A.2.a.1",
    list: "DUL",
    category: "6",
    title: "Image intensifier tubes, civil",
    description:
      "Gen-3+ image-intensifier tubes for night-observation devices. Below ML15 threshold; dual-use night vision.",
    euAnnexIRef: "6A002.a.1",
    earCclRef: "6A002.a.1",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.2.a.2",
    list: "DUL",
    category: "6",
    title: "Visible-NIR focal-plane arrays",
    description:
      "Silicon FPAs operating 400-1000 nm with >4 megapixels OR specified data-rate threshold. EO-payload baseline.",
    euAnnexIRef: "6A002.a.2",
    earCclRef: "6A002.a.2",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.2.a.3",
    list: "DUL",
    category: "6",
    title: "Short-wave infrared (SWIR) focal-plane arrays",
    description:
      "InGaAs FPAs operating 0.9-1.7 μm. Mineral-prospecting, agricultural NDVI, military thermal-decoy detection.",
    euAnnexIRef: "6A002.a.3.a",
    earCclRef: "6A002.a.3.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.2.a.4",
    list: "DUL",
    category: "6",
    title: "Mid-wave infrared (MWIR) focal-plane arrays",
    description:
      "InSb, HgCdTe, T2SL FPAs operating 3-5 μm. Cooled to ≤220 K. Premier military and EO-IR satellite imaging.",
    euAnnexIRef: "6A002.a.3.b",
    earCclRef: "6A002.a.3.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.2.a.5",
    list: "DUL",
    category: "6",
    title: "Long-wave infrared (LWIR) focal-plane arrays",
    description:
      "HgCdTe, T2SL, microbolometer arrays 8-14 μm. Wildfire monitoring, gas-leak detection, military target acquisition.",
    euAnnexIRef: "6A002.a.3.c",
    earCclRef: "6A002.a.3.c",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.2.b",
    list: "DUL",
    category: "6",
    title: "Space-qualified optical sensors and components",
    description:
      "Optical sensors specially designed or rated for satellite operation. Radiation-hardened FPAs, space-qualified readouts.",
    euAnnexIRef: "6A002.b",
    earCclRef: "6A002.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.2.c",
    list: "DUL",
    category: "6",
    title: "Hyperspectral and multispectral imaging components",
    description:
      "Imaging arrays with >20 spectral bands OR with hyperspectral grating/prism components. EnMAP/PRISMA-class payloads.",
    euAnnexIRef: "6A002.c",
    earCclRef: "6A002.c",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6.A.3 — Cameras (mirror EU 6A003) ───────────────────────────
  {
    code: "6.A.3.a",
    list: "DUL",
    category: "6",
    title: "High-speed cameras with framing rate >1 kHz",
    description:
      "Ballistic/impact diagnostic cameras, hypersonic-test instrumentation. Civilian R&D + range-instrumentation use.",
    euAnnexIRef: "6A003.a",
    earCclRef: "6A003.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.3.b.1",
    list: "DUL",
    category: "6",
    title: "Streak cameras for sub-50-ns events",
    description:
      "Streak cameras with temporal resolution ≤50 ns. Laser-diagnostic, plasma-physics, high-explosive-test use.",
    euAnnexIRef: "6A003.b.1",
    earCclRef: "6A003.b.1",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.3.b.2",
    list: "DUL",
    category: "6",
    title: "Gated framing cameras",
    description:
      "Gated intensified-CCD cameras for nanosecond exposures. Plasma diagnostics, fluid-dynamics, weapons-effects research.",
    euAnnexIRef: "6A003.b.2",
    earCclRef: "6A003.b.2",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.3.b.3",
    list: "DUL",
    category: "6",
    title: "Electronic cameras with global-shutter ≤1 μs",
    description:
      "Sub-microsecond integration-time cameras with high frame rate. Aerospace flight-test, automotive crash, scientific imaging.",
    euAnnexIRef: "6A003.b.3",
    earCclRef: "6A003.b.3",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.3.b.4",
    list: "DUL",
    category: "6",
    title: "Radiation-hardened cameras",
    description:
      "Cameras hardened to ≥5×10⁴ Gy total dose. Nuclear-facility monitoring, deep-space science payloads, fusion-research diagnostics.",
    euAnnexIRef: "6A003.b.4",
    earCclRef: "6A003.b.4",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.3.c",
    list: "DUL",
    category: "6",
    title: "Cameras with image-intensifier read-out",
    description:
      "Low-light imaging cameras using image-intensifier coupling. Surveillance, astronomy, biomedical fluorescence.",
    euAnnexIRef: "6A003.c",
    earCclRef: "6A003.c",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6.A.5 — Lasers ──────────────────────────────────────────────
  {
    code: "6.A.5.a",
    list: "DUL",
    category: "6",
    title: "Gas lasers — non-tunable above output threshold",
    description:
      "CO₂, CO, HF/DF, excimer, argon-ion lasers exceeding wattage/wavelength thresholds. Industrial cutting, scientific, weapons-direct-energy research.",
    euAnnexIRef: "6A005.a",
    earCclRef: "6A005.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.5.b.1",
    list: "DUL",
    category: "6",
    title: "Semiconductor (diode) lasers, CW",
    description:
      "Single-mode + multi-mode diode lasers above specified average power. Laser pumping, materials processing, optical-comm uplink.",
    euAnnexIRef: "6A005.b.1",
    earCclRef: "6A005.b.1",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.5.b.2",
    list: "DUL",
    category: "6",
    title: "Semiconductor lasers, pulsed",
    description:
      "Pulsed diode lasers above peak-power + pulse-width thresholds. LiDAR transmitters, rangefinders, time-of-flight imaging.",
    euAnnexIRef: "6A005.b.2",
    earCclRef: "6A005.b.2",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.5.c.1",
    list: "DUL",
    category: "6",
    title: "Solid-state lasers, CW",
    description:
      "Nd:YAG, Yb:YAG, Tm:fiber, Er:glass CW lasers above power thresholds. Industrial welding, laser-comm terminals.",
    euAnnexIRef: "6A005.c.1",
    earCclRef: "6A005.c.1",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.5.c.2",
    list: "DUL",
    category: "6",
    title: "Solid-state lasers, pulsed",
    description:
      "Q-switched and mode-locked Nd:YAG, Ti:sapphire, fiber lasers above pulse-energy thresholds. Satellite-laser-ranging, lidar, machining.",
    euAnnexIRef: "6A005.c.2",
    earCclRef: "6A005.c.2",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.5.d.1",
    list: "DUL",
    category: "6",
    title: "Fiber lasers, CW",
    description:
      "Ytterbium- and erbium-doped fiber lasers, CW, above specified output power. Industrial cutting, optical-communications boosters.",
    euAnnexIRef: "6A005.d.1",
    earCclRef: "6A005.d.1",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.5.d.2",
    list: "DUL",
    category: "6",
    title: "Fiber lasers, pulsed",
    description:
      "Pulsed fiber lasers above peak/energy thresholds. Marking, micro-machining, lidar transmitters.",
    euAnnexIRef: "6A005.d.2",
    earCclRef: "6A005.d.2",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.5.e",
    list: "DUL",
    category: "6",
    title: "Tunable lasers",
    description:
      "Wavelength-tunable lasers (dye, OPO, Ti:sapphire tunable) above performance thresholds. Spectroscopy, DIRCM, atmospheric remote sensing.",
    euAnnexIRef: "6A005.e",
    earCclRef: "6A005.e",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6.A.8 — Radar ───────────────────────────────────────────────
  {
    code: "6.A.8.a",
    list: "DUL",
    category: "6",
    title: "Pulse-Doppler radar systems",
    description:
      "Pulse-Doppler radars with specified range, frequency-agility, or ECCM features. ATC, weather, security.",
    euAnnexIRef: "6A008.a",
    earCclRef: "6A008.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.8.b",
    list: "DUL",
    category: "6",
    title: "Radar transmit antennas with electronic beam steering",
    description:
      "Phased-array radar antennas with electronic steering, side-lobe control. AESA technology baseline.",
    euAnnexIRef: "6A008.b",
    earCclRef: "6A008.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.8.d",
    list: "DUL",
    category: "6",
    title: "Pulse compression radar",
    description:
      "Radars employing pulse-compression techniques (chirp, Barker codes) above compression-ratio threshold. Air-traffic, weather, military surveillance.",
    euAnnexIRef: "6A008.d",
    earCclRef: "6A008.d",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.8.h",
    list: "DUL",
    category: "6",
    title: "Inverse synthetic aperture radar (ISAR)",
    description:
      "ISAR systems for ship/target classification. Maritime-domain awareness, defense-targeting.",
    euAnnexIRef: "6A008.h",
    earCclRef: "6A008.h",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.8.j",
    list: "DUL",
    category: "6",
    title: "Synthetic aperture radar (SAR), airborne or spaceborne",
    description:
      "SAR/InSAR/PolSAR systems with ground-resolution ≤3 m and operating above specified power. ICEYE, Capella, Umbra-class smallsat SARs.",
    euAnnexIRef: "6A008.j",
    earCclRef: "6A008.j",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.A.8.k",
    list: "DUL",
    category: "6",
    title: "Radar signal-processing equipment",
    description:
      "Real-time radar-signal-processing equipment above throughput threshold. Backend for SAR/AESA systems.",
    euAnnexIRef: "6A008.k",
    earCclRef: "6A008.k",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // CAT 9 — AEROSPACE & PROPULSION
  // ═══════════════════════════════════════════════════════════════════

  // ─── 9.A.1 — Aero gas turbines ───────────────────────────────────
  {
    code: "9.A.1.a",
    list: "DUL",
    category: "9",
    title: "Aero gas turbine engines with specified performance",
    description:
      "Gas turbine engines for military aircraft application thresholds (thrust, T/W, TET). Single-engine air-superiority + STOVL designs.",
    euAnnexIRef: "9A001.a",
    earCclRef: "9A001.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.1.b",
    list: "DUL",
    category: "9",
    title: "Aero gas turbine engines — military-airworthy components",
    description:
      "Engines with components incorporating CMC, single-crystal blades, or hot-section technologies above thresholds.",
    euAnnexIRef: "9A001.b",
    earCclRef: "9A001.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 9.A.4 — Space launch vehicles ──────────────────────────────
  {
    code: "9.A.4.a",
    list: "DUL",
    category: "9",
    title: "Space launch vehicles (SLVs)",
    description:
      "Complete SLVs and sub-orbital rocket systems. The civilian-launcher home (Ariane, Falcon, RFA ONE class) — military uses route via ML.",
    euAnnexIRef: "9A004.a",
    earCclRef: "9A004.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.4.b",
    list: "DUL",
    category: "9",
    title: "Stages of SLVs",
    description:
      "First/second/upper stages, integrated propulsion modules. Stage-separation, intertank, payload-fairing hardware.",
    euAnnexIRef: "9A004.b",
    earCclRef: "9A004.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 9.A.5 — Liquid + hybrid propulsion ─────────────────────────
  {
    code: "9.A.5.a",
    list: "DUL",
    category: "9",
    title: "Liquid-propellant rocket engines for SLVs",
    description:
      "Liquid-bipropellant engines (LOx/RP-1, LOx/CH4, LOx/LH2) above thrust threshold. Cryogenic upper stages flow here.",
    euAnnexIRef: "9A005.a",
    earCclRef: "9A005.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.5.b",
    list: "DUL",
    category: "9",
    title: "Hybrid rocket engines for SLVs",
    description:
      "Hybrid liquid-solid engines (LOx/HTPB, LOx/paraffin) above thrust threshold. HyImpulse SR75-class engines flow here.",
    euAnnexIRef: "9A005.b",
    earCclRef: "9A005.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 9.A.6 — Systems & components for LIQUID rocket propulsion ────
  // CORRECTION (S5 verify): the prior .a-.e text labelled these as
  // spacecraft / star-trackers / attitude-control thrusters / electric
  // propulsion. That is WRONG. Official WA 9.A.6 (= EU 9A006) is
  // "Systems and components specially designed for LIQUID ROCKET
  // PROPULSION systems"; the .a-.h sub-paragraphs are all liquid-
  // propulsion items (cryogenic systems, slush-H2, turbopumps, thrust
  // chambers, propellant storage/injectors, carbon-carbon chambers).
  // Spacecraft live under 9.A.4 (9A004); star trackers under 7.A.4
  // (7A004); spacecraft AOCS/on-board systems under 9.A.4.e (9A004.e) —
  // each already present in this file. So the .a-.e text is rewritten to
  // the REAL liquid-propulsion scope and the fabricated 9A006.d.1/.d.2
  // sub-sub-codes are corrected to the real flat 9A006.d / 9A006.e.
  // Source: Wassenaar WA-LIST 9.A.6 / EU 2021/821 Annex I 9A006.
  {
    code: "9.A.6.a",
    list: "DUL",
    category: "9",
    title: "Cryogenic refrigerators, dewars, heat pipes (low-loss)",
    description:
      "Cryogenic refrigerators, flightweight dewars, cryogenic heat pipes or cryogenic systems specially designed for liquid rocket propulsion and designed to restrict cryogenic fluid losses to less than 30% per year. Part of WA/EU 9.A.6 'liquid rocket propulsion systems & components'.",
    euAnnexIRef: "9A006.a",
    earCclRef: "9A006.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.6.b",
    list: "DUL",
    category: "9",
    title: "Cryogenic containers / closed-cycle refrigeration (≤100 K)",
    description:
      "Cryogenic containers or closed-cycle refrigeration systems capable of maintaining or producing temperatures less than or equal to 100 K (−173.15 °C) for liquid rocket propulsion. Part of WA/EU 9.A.6 'liquid rocket propulsion systems & components'.",
    euAnnexIRef: "9A006.b",
    earCclRef: "9A006.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.6.c",
    list: "DUL",
    category: "9",
    title: "Slush hydrogen storage or transfer systems",
    description:
      "Slush hydrogen storage or transfer systems specially designed for liquid rocket propulsion. Part of WA/EU 9.A.6 'liquid rocket propulsion systems & components'.",
    euAnnexIRef: "9A006.c",
    earCclRef: "9A006.c",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.6.d",
    list: "DUL",
    category: "9",
    title: "High-pressure turbopumps (>17.5 MPa) and drive systems",
    description:
      "High-pressure (exceeding 17.5 MPa) turbopumps, pump components, or their associated gas-generator or expander-cycle turbine drive systems for liquid rocket engines. Part of WA/EU 9.A.6 'liquid rocket propulsion systems & components'.",
    euAnnexIRef: "9A006.d",
    earCclRef: "9A006.d",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.6.e",
    list: "DUL",
    category: "9",
    title: "High-pressure thrust chambers and nozzles (>10.6 MPa)",
    description:
      "High-pressure (exceeding 10.6 MPa) thrust chambers and nozzles therefor, for liquid rocket engines. Part of WA/EU 9.A.6 'liquid rocket propulsion systems & components'.",
    euAnnexIRef: "9A006.e",
    earCclRef: "9A006.e",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.6.f",
    list: "DUL",
    category: "9",
    title: "Propellant storage systems (capillary / positive-expulsion)",
    description:
      "Propellant storage systems for liquid rocket propulsion using the principle of capillary containment or positive expulsion (i.e. with flexible bladders). Part of WA/EU 9.A.6 'liquid rocket propulsion systems & components'.",
    euAnnexIRef: "9A006.f",
    earCclRef: "9A006.f",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.6.g",
    list: "DUL",
    category: "9",
    title: "Liquid propellant injectors (small-orifice)",
    description:
      "Liquid propellant injectors with individual orifices of 0.381 mm or smaller in diameter (or 1.14 x 10⁻³ cm² or smaller in area for non-circular orifices) and specially designed for liquid rocket engines. Part of WA/EU 9.A.6 'liquid rocket propulsion systems & components'.",
    euAnnexIRef: "9A006.g",
    earCclRef: "9A006.g",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 9.A.7 — Ground equipment for SLVs / spacecraft ─────────────
  {
    code: "9.A.7.a",
    list: "DUL",
    category: "9",
    title: "Launch-vehicle ground support equipment (GSE)",
    description:
      "Specialized GSE — cryogenic-propellant loaders, integrated-launch-control consoles, payload-fairing AIT equipment.",
    euAnnexIRef: "9A007.a",
    earCclRef: "9A007.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.7.b",
    list: "DUL",
    category: "9",
    title: "Spacecraft AIT (assembly, integration, test) equipment",
    description:
      "Thermal-vacuum chambers, vibration tables, EMI/EMC anechoic chambers, mass-properties measurement equipment.",
    euAnnexIRef: "9A007.b",
    earCclRef: "9A007.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.7.c",
    list: "DUL",
    category: "9",
    title: "Satellite-control ground stations",
    description:
      "Ground-control consoles, telemetry/tracking/command (TT&C) equipment, mission-operations-center hardware.",
    euAnnexIRef: "9A007.c",
    earCclRef: "9A007.c",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // NOTE (CORRECTED 2026-06-13): The former "9.A.11.a/.b/.c — UAVs"
  // sub-entries that lived here were a mislabel. Wassenaar 9.A.11
  // (EU 9A011 / CCL 9A011) = ramjet/scramjet/combined-cycle engines
  // (see the 9.A.11 entry below), NOT UAVs. Non-military UAVs are
  // Wassenaar 9.A.12 (EU 9A012 / CCL 9A012) — correctly carried by
  // the 9.A.12.a/.b entries further down (real WA-LIST codes). The
  // mislabeled UAV duplicates were removed rather than re-coded:
  // 9.A.12.a/.b already exist and 9.A.12 has no official .c.
  // Source: BIS Commerce Control List / Wassenaar WA-LIST, Cat. 9.

  // ─── 9.D — Software ─────────────────────────────────────────────
  {
    code: "9.D.1",
    list: "DUL",
    category: "9",
    title: "Software for development of 9.A/9.B controlled items",
    description:
      "Per the General Software Note, GTN-equivalent: software required for development of aerospace items in 9.A or 9.B.",
    euAnnexIRef: "9D001",
    earCclRef: "9D001",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.D.2",
    list: "DUL",
    category: "9",
    title: "Software for production of 9.A/9.B controlled items",
    description:
      "Specially designed software for production (manufacturing, assembly, qualification) of aerospace items in 9.A or 9.B.",
    euAnnexIRef: "9D002",
    earCclRef: "9D002",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.D.3",
    list: "DUL",
    category: "9",
    title: "FADEC software for aero gas turbines",
    description:
      "Full-authority digital engine control software for 9.A.1-controlled engines. Source code + executables.",
    euAnnexIRef: "9D003",
    earCclRef: "9D003",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.D.4",
    list: "DUL",
    category: "9",
    title: "Aerospace use-software — flight, mission, attitude",
    description:
      "Spacecraft AOCS flight software, launch-vehicle guidance + navigation software, formation-flying algorithms.",
    euAnnexIRef: "9D004",
    earCclRef: "9D004",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 9.E — Technology ───────────────────────────────────────────
  {
    code: "9.E.1",
    list: "DUL",
    category: "9",
    title: "Technology for development of 9.A/9.B controlled items",
    description:
      "Per the General Technology Note: technology required for development of aerospace items in 9.A or 9.B. Deemed-export capture.",
    euAnnexIRef: "9E001",
    earCclRef: "9E001",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.E.2",
    list: "DUL",
    category: "9",
    title: "Technology for production of 9.A/9.B controlled items",
    description:
      "Per the GTN: technology required for production of aerospace items in 9.A or 9.B.",
    euAnnexIRef: "9E002",
    earCclRef: "9E002",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.E.3",
    list: "DUL",
    category: "9",
    title: "Other aerospace-specific technology",
    description:
      "Specific manufacturing know-how — single-crystal blade casting, CMC fabrication, tile-bond TPS production, rocket-engine swirl-injector design.",
    euAnnexIRef: "9E003",
    earCclRef: "9E003",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // CAT 6 — Software + technology for sensors and lasers.
  // (6.D + 6.E mirrors of national equivalents.)
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "6.D.1",
    list: "DUL",
    category: "6",
    title: "Software for development of 6.A/6.B/6.C items",
    description:
      "Per the GSN: software required for development of sensor + laser items in Cat 6.",
    euAnnexIRef: "6D001",
    earCclRef: "6D001",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.D.2",
    list: "DUL",
    category: "6",
    title: "Software for production of 6.A/6.B/6.C items",
    description:
      "Per the GSN: software required for production of sensor + laser items in Cat 6.",
    euAnnexIRef: "6D002",
    earCclRef: "6D002",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.D.3",
    list: "DUL",
    category: "6",
    title: "Use-software for sensor and laser items",
    description:
      "SAR signal-processing software, lidar point-cloud processors, IR-FPA non-uniformity correction firmware.",
    euAnnexIRef: "6D003",
    earCclRef: "6D003",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.E.1",
    list: "DUL",
    category: "6",
    title: "Technology for development of 6.A/6.B/6.C items",
    description:
      "Per the GTN: technology for development of sensor + laser items. The deemed-export capture for Cat 6 know-how.",
    euAnnexIRef: "6E001",
    earCclRef: "6E001",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.E.2",
    list: "DUL",
    category: "6",
    title: "Technology for production of 6.A/6.B/6.C items",
    description:
      "Per the GTN: technology for production of sensor + laser items.",
    euAnnexIRef: "6E002",
    earCclRef: "6E002",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6.E.3",
    list: "DUL",
    category: "6",
    title: "Other sensor/laser specific technology",
    description:
      "Sensor-calibration procedures, laser-cavity design, AESA T/R module fabrication, optical-coating deposition recipes.",
    euAnnexIRef: "6E003",
    earCclRef: "6E003",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // DATA-SPRINT S5 ENRICHMENT — verified against WA-LIST (25) 1 Corr.
  // (15-01-2026). New, non-duplicate codes only. Existing entries above
  // are left untouched.
  // ═══════════════════════════════════════════════════════════════════

  // ─── 6.A.2 — Optical-sensor support components (space gaps) ───────
  {
    code: "6.A.2.d",
    list: "DUL",
    category: "6",
    title: "Special support components for optical sensors",
    description:
      "Space-qualified cryocoolers; non-space cryocoolers cooling below 218 K (MTTF/MTBF >2,500 h, or JT minicoolers <8 mm bore); and optical sensing fibres modified to be acoustically/thermally/inertially/EM/radiation sensitive. Enables cooled IR space payloads.",
    euAnnexIRef: "6A002.d",
    earCclRef: "6A002.d",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "6.A.2.f",
    list: "DUL",
    category: "6",
    title: "Read-Out Integrated Circuits (ROIC) for focal-plane arrays",
    description:
      "ROICs specially designed for the focal-plane arrays controlled in 6.A.2.a.3. — the silicon readout layer bonded under an IR detector array that extracts and multiplexes detector charge. Civil-automotive ROICs are excluded.",
    euAnnexIRef: "6A002.f",
    earCclRef: "6A002.f",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ─── 6.A.4 — Optical equipment (deformable mirrors for ADCS/lasercom) ─
  {
    code: "6.A.4.a",
    list: "DUL",
    category: "6",
    title: "Optical mirrors — deformable mirrors above threshold",
    description:
      "Deformable mirrors with active aperture >10 mm having either a mechanical resonant frequency ≥750 Hz with >200 actuators, or a Laser-Induced Damage Threshold above specified CW/pulsed levels. Adaptive-optics + high-power laser-comm beam control.",
    euAnnexIRef: "6A004.a",
    earCclRef: "6A004.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ═══════════════════════════════════════════════════════════════════
  // CAT 7 — NAVIGATION & AVIONICS (new category; satellite ADCS / GNC).
  // The attitude-determination + navigation hardware satellites carry.
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "7.A.1",
    list: "DUL",
    category: "7",
    title: "Accelerometers above bias/scale-factor stability thresholds",
    description:
      "Linear accelerometers with bias stability <130 µg/yr or scale-factor stability <130 ppm/yr (≤15 g class); higher-g classes with tighter repeatability; and any unit designed for inertial navigation/guidance functioning above 100 g. Excludes vibration/shock-only units.",
    euAnnexIRef: "7A001",
    earCclRef: "7A001",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "7.A.2",
    list: "DUL",
    category: "7",
    title: "Gyros and angular-rate sensors above performance thresholds",
    description:
      "Gyros/angular-rate sensors functioning ≤100 g with bias stability <0.5°/h or angle-random-walk ≤0.0035°/√h (low-rate class), tighter bands for high-rate class, or any unit functioning above 100 g. Reaction-wheel + ADCS rate sensing for spacecraft.",
    euAnnexIRef: "7A002",
    earCclRef: "7A002",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "7.A.3",
    list: "DUL",
    category: "7",
    title: "Inertial measurement equipment / systems (IMU, INS, IRU)",
    description:
      "IMUs/INSs/IRSs/AHRSs providing position or heading without positional-aiding references above specified accuracy, or providing acceleration/angular-rate data to those accuracies. Excludes units certified for civil-aircraft use. Spacecraft + launch-vehicle GNC.",
    euAnnexIRef: "7A003",
    earCclRef: "7A003",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "7.A.4",
    list: "DUL",
    category: "7",
    title: "Star trackers and specially designed components",
    description:
      "Star trackers (stellar attitude sensors / gyro-astro compasses) with specified azimuth accuracy ≤20 arc-seconds across the equipment lifetime, plus specially designed optical heads, baffles, and data-processing units. The primary spacecraft fine-attitude sensor.",
    euAnnexIRef: "7A004",
    earCclRef: "7A004",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "7.A.5",
    list: "DUL",
    category: "7",
    title: "Satellite-navigation receiving equipment (controlled features)",
    description:
      "GNSS receivers employing a decryption algorithm designed/modified for government use to access ranging codes, or employing adaptive (null-steering) antenna systems. Anti-jam/anti-spoof navigation; military variants route via ML11.",
    euAnnexIRef: "7A005",
    earCclRef: "7A005",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "7.D.1",
    list: "DUL",
    category: "7",
    title: "Software for development/production of 7.A navigation items",
    description:
      "Per the General Software Note: software specially designed or modified for the development or production of the inertial/navigation/avionics equipment in Cat 7.A.",
    euAnnexIRef: "7D001",
    earCclRef: "7D001",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "7.E.1",
    list: "DUL",
    category: "7",
    title: "Technology for development of 7.A navigation items",
    description:
      "Per the General Technology Note: technology required for the development of the controlled accelerometers, gyros, IMU/INS, star trackers and GNSS receivers in Cat 7.A. Deemed-export capture for ADCS/GNC know-how.",
    euAnnexIRef: "7E001",
    earCclRef: "7E001",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ═══════════════════════════════════════════════════════════════════
  // CAT 9 ENRICHMENT — real WA-LIST (25) structure not yet captured.
  // ═══════════════════════════════════════════════════════════════════

  // ─── 9.A.2 / 9.A.3 — marine turbines + aero-turbine assemblies ────
  {
    code: "9.A.2",
    list: "DUL",
    category: "9",
    title: "Marine gas turbine engines above power + fuel-economy thresholds",
    description:
      "Liquid-fuelled marine gas turbines with maximum continuous power ≥24,245 kW (ISO 3977-2 steady-state) AND corrected specific fuel consumption ≤0.219 kg/kWh at 35% power, plus specially designed assemblies/components. Includes aero-derivative units adapted for ship propulsion/power.",
    euAnnexIRef: "9A002",
    earCclRef: "9A002",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.3",
    list: "DUL",
    category: "9",
    title: "Aero gas turbine assemblies/components with controlled technology",
    description:
      "Specially designed assemblies or components incorporating the hot-section technologies of 9.E.3.a/.h/.i/.k for engines specified in 9.A.1, or for engines whose design/production origin is non-Wassenaar or unknown to the maker.",
    euAnnexIRef: "9A003",
    earCclRef: "9A003",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ─── 9.A.4 — spacecraft sub-paragraphs (real .d-.h) ──────────────
  {
    code: "9.A.4.d",
    list: "DUL",
    category: "9",
    title: "Spacecraft mission equipment incorporating controlled sensors",
    description:
      "Payload (mission) equipment incorporating controlled Cat 3/5/6/9 items — e.g. controlled focal-plane arrays (6.A.2.a), imaging sensors (6.A.2.b), radar items (6.A.8.d/.e/.k/.l), or spacecraft structures (9.A.10.c). The EO/SAR/SIGINT-payload capture.",
    euAnnexIRef: "9A004.d",
    earCclRef: "9A004.d",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.4.e",
    list: "DUL",
    category: "9",
    title: "Spacecraft on-board systems — C&DH, payload data, AOCS",
    description:
      "On-board systems/equipment specially designed for spacecraft performing command-and-telemetry data handling, payload data handling, or attitude-and-orbit control (sensing + actuation). Military variants route via ML11.c.",
    euAnnexIRef: "9A004.e",
    earCclRef: "9A004.e",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.4.f",
    list: "DUL",
    category: "9",
    title: "Terrestrial (ground) equipment for spacecraft — TT&C + simulators",
    description:
      "Telemetry/telecommand equipment for frame-sync/error-correction health monitoring and command formatting to the spacecraft bus, plus simulators specially designed for verification of operational procedures (command-sequence confirmation, training, rehearsals, analysis).",
    euAnnexIRef: "9A004.f",
    earCclRef: "9A004.f",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.4.g",
    list: "DUL",
    category: "9",
    title: "Aircraft modified as air-launch platforms",
    description:
      "Aircraft specially designed or modified to be air-launch platforms for space launch vehicles or sub-orbital craft (e.g. carrier aircraft for horizontally-launched small launchers).",
    euAnnexIRef: "9A004.g",
    earCclRef: "9A004.g",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.4.h",
    list: "DUL",
    category: "9",
    title: "Sub-orbital craft",
    description:
      "Sub-orbital craft (vehicles reaching space without completing an orbit). The home for sub-orbital tourism/research vehicles and sub-orbital UAVs.",
    euAnnexIRef: "9A004.h",
    earCclRef: "9A004.h",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ─── 9.A.6.h — one-piece carbon-carbon thrust chambers ───────────
  {
    code: "9.A.6.h",
    list: "DUL",
    category: "9",
    title: "One-piece carbon-carbon thrust chambers / exit cones",
    description:
      "One-piece carbon-carbon liquid-rocket thrust chambers or exit cones with density >1.4 g/cm³ AND tensile strength >48 MPa. (Note: this S5 entry captures the real 9.A.6.h sub-paragraph for liquid-propulsion components.)",
    euAnnexIRef: "9A006.h",
    earCclRef: "9A006.h",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ─── 9.A.7 — solid rocket propulsion systems (real .d/.e) ────────
  {
    code: "9.A.7.d",
    list: "DUL",
    category: "9",
    title: "Solid rocket propulsion systems — incorporating 9.A.8 components",
    description:
      "Solid rocket propulsion systems controlled by virtue of incorporating any of the specially designed solid-motor components of 9.A.8 (insulation/bonding, large composite cases, high-thrust nozzles, TVC systems).",
    euAnnexIRef: "9A007.d",
    earCclRef: "9A007.d",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.7.e",
    list: "DUL",
    category: "9",
    title: "Solid rocket propulsion — direct-bonded insulation/bonding",
    description:
      "Solid rocket propulsion systems using direct-bonded motor designs whose insulation and propellant-bonding system provides a strong mechanical bond or a chemical-migration barrier between propellant and case insulation.",
    euAnnexIRef: "9A007.e",
    earCclRef: "9A007.e",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ─── 9.A.8 — components for solid rocket propulsion systems ───────
  {
    code: "9.A.8.a",
    list: "DUL",
    category: "9",
    title: "Solid-motor insulation and propellant-bonding systems (liners)",
    description:
      "Insulation and propellant-bonding systems using liners to provide a strong mechanical bond or a chemical-migration barrier between the solid propellant and case insulation material.",
    euAnnexIRef: "9A008.a",
    earCclRef: "9A008.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.8.b",
    list: "DUL",
    category: "9",
    title: "Filament-wound composite motor cases above threshold",
    description:
      "Filament-wound composite solid-motor cases exceeding 0.61 m in diameter, or with a structural efficiency ratio (PV/W = burst pressure × volume / vessel weight) exceeding 25 km.",
    euAnnexIRef: "9A008.b",
    earCclRef: "9A008.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.8.c",
    list: "DUL",
    category: "9",
    title: "Solid-rocket nozzles above thrust / erosion thresholds",
    description:
      "Nozzles with thrust levels exceeding 45 kN, or nozzle-throat erosion rates of less than 0.075 mm/s.",
    euAnnexIRef: "9A008.c",
    earCclRef: "9A008.c",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.8.d",
    list: "DUL",
    category: "9",
    title: "Thrust-vector-control systems for solid motors",
    description:
      "Movable-nozzle or secondary-fluid-injection TVC systems capable of omni-axial movement exceeding ±5°, angular vector rotations ≥20°/s, or angular vector accelerations ≥40°/s².",
    euAnnexIRef: "9A008.d",
    earCclRef: "9A008.d",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ─── 9.A.9 — hybrid rocket propulsion systems ────────────────────
  {
    code: "9.A.9.a",
    list: "DUL",
    category: "9",
    title: "Hybrid rocket propulsion — total impulse >1.1 MNs",
    description:
      "Hybrid rocket propulsion systems with total impulse capacity exceeding 1.1 MN·s. (HyImpulse SR75-class and larger hybrids fall here on impulse.)",
    euAnnexIRef: "9A009.a",
    earCclRef: "9A009.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.9.b",
    list: "DUL",
    category: "9",
    title: "Hybrid rocket propulsion — thrust >220 kN vacuum",
    description:
      "Hybrid rocket propulsion systems with thrust levels exceeding 220 kN in vacuum exit conditions.",
    euAnnexIRef: "9A009.b",
    earCclRef: "9A009.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ─── 9.A.10 — components/structures for launch vehicles + spacecraft ─
  {
    code: "9.A.10.a",
    list: "DUL",
    category: "9",
    title: "Composite launch-vehicle components >10 kg",
    description:
      "Components and structures each exceeding 10 kg, specially designed for launch vehicles and made from controlled composites — fibrous/filamentary materials with controlled resins, metal-matrix composites, or ceramic-matrix composites. Weight cut-off does not apply to nose cones.",
    euAnnexIRef: "9A010.a",
    earCclRef: "9A010.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.10.b",
    list: "DUL",
    category: "9",
    title: "Composite components for launch-vehicle propulsion systems",
    description:
      "Components and structures specially designed for the launch-vehicle propulsion systems of 9.A.5–9.A.9, manufactured from controlled fibrous/filamentary, metal-matrix, or ceramic-matrix composite materials.",
    euAnnexIRef: "9A010.b",
    earCclRef: "9A010.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.10.c",
    list: "DUL",
    category: "9",
    title: "Active structural-control / isolation systems for spacecraft",
    description:
      "Structural components and isolation systems specially designed to actively control the dynamic response or distortion of spacecraft structures (e.g. active vibration isolation for high-stability optical payloads).",
    euAnnexIRef: "9A010.c",
    earCclRef: "9A010.c",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.10.d",
    list: "DUL",
    category: "9",
    title:
      "Pulsed liquid rocket engines — high thrust-to-weight, fast response",
    description:
      "Pulsed liquid rocket engines with thrust-to-weight ratio ≥1 kN/kg AND a response time (time to reach 90% of rated thrust from start-up) of less than 30 ms. Reaction-control / divert-and-attitude engines.",
    euAnnexIRef: "9A010.d",
    earCclRef: "9A010.d",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ─── 9.A.11 — ramjet / scramjet / combined-cycle engines ─────────
  {
    code: "9.A.11",
    list: "DUL",
    category: "9",
    title: "Ramjet, scramjet or combined-cycle engines",
    description:
      "Ramjet, scramjet, or combined-cycle engines (combining two or more of gas-turbine, ramjet/scramjet, and rocket engine types) and specially designed components therefor. Hypersonic + air-breathing access-to-space propulsion.",
    euAnnexIRef: "9A011",
    earCclRef: "9A011",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ─── 9.A.12 — UAVs (real WA-LIST codes) ──────────────────────────
  {
    code: "9.A.12.a",
    list: "DUL",
    category: "9",
    title: "UAVs / unmanned airships — out-of-natural-vision flight",
    description:
      "UAVs or unmanned airships designed for controlled flight beyond the operator's natural vision, with endurance ≥30 min (and gust-tolerant take-off/flight at ≥46.3 km/h) or endurance ≥1 hour. The dual-use long-endurance UAV baseline.",
    euAnnexIRef: "9A012.a",
    earCclRef: "9A012.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.A.12.b",
    list: "DUL",
    category: "9",
    title: "UAV-related equipment and components",
    description:
      "Equipment/components specially designed to convert a manned aircraft/airship into a UAV per 9.A.12.a, and air-breathing reciprocating/rotary IC engines specially designed or modified to propel UAVs at altitudes above 15,240 m (50,000 ft).",
    euAnnexIRef: "9A012.b",
    earCclRef: "9A012.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ─── 9.B — test, inspection and production equipment ─────────────
  {
    code: "9.B.1",
    list: "DUL",
    category: "9",
    title: "Single-crystal / directional-solidification casting equipment",
    description:
      "Manufacturing equipment, tooling or fixtures: directional-solidification or single-crystal casting (or additive-manufacturing) equipment designed for superalloys, and casting tooling for refractory-metal/ceramic turbine blades, vanes or tip-shrouds (cores, shells, combined units).",
    euAnnexIRef: "9B001",
    earCclRef: "9B001",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.B.5",
    list: "DUL",
    category: "9",
    title:
      "Control/instrumentation for high-Mach wind tunnels and flow devices",
    description:
      "Real-time control systems, instrumentation, or automated data-acquisition equipment specially designed for wind tunnels ≥Mach 1.2, flow-simulation devices exceeding Mach 5 (hot-shot, plasma-arc, shock tubes/tunnels, light-gas guns), or devices simulating Reynolds numbers >25×10⁶.",
    euAnnexIRef: "9B005",
    earCclRef: "9B005",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.B.7",
    list: "DUL",
    category: "9",
    title: "Non-destructive rocket-motor integrity inspection equipment",
    description:
      "Equipment specially designed for inspecting rocket-motor integrity using NDT techniques other than planar x-ray or basic physical/chemical analysis.",
    euAnnexIRef: "9B007",
    earCclRef: "9B007",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.B.10",
    list: "DUL",
    category: "9",
    title: "Production equipment for 9.A.12 UAVs",
    description:
      "Equipment specially designed for the production of the unmanned aerial vehicles and related items specified in 9.A.12.",
    euAnnexIRef: "9B010",
    earCclRef: "9B010",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ─── 9.D.5 — operation software for spacecraft on-board/ground ───
  {
    code: "9.D.5",
    list: "DUL",
    category: "9",
    title: "Operation software for spacecraft on-board / ground systems",
    description:
      "Software specially designed or modified for the operation of the spacecraft on-board systems (9.A.4.e) or terrestrial TT&C/simulator equipment (9.A.4.f). Mission-operations + flight software.",
    euAnnexIRef: "9D005",
    earCclRef: "9D005",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },

  // ─── 9.E.3 sub-paragraphs — specific aero-turbine know-how ───────
  {
    code: "9.E.3.c",
    list: "DUL",
    category: "9",
    title: "Cooling-hole manufacturing technology for turbine components",
    description:
      "Technology required to manufacture cooling holes in turbine components incorporating 9.E.3.a.1/.a.2/.a.5 technologies, with controlled cross-sectional area, hole-shape ratio and incidence angle (laser, water-jet, ECM or EDM methods). Excludes straight-through cylindrical holes.",
    euAnnexIRef: "9E003.c",
    earCclRef: "9E003.c",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.E.3.h",
    list: "DUL",
    category: "9",
    title: "FADEC (Full Authority Digital Engine Control) technology",
    description:
      "Technology for gas-turbine FADEC systems: deriving functional requirements, control/diagnostic components, and control-law algorithms (incl. source code) unique to the FADEC and used to regulate engine thrust or shaft power. Excludes civil-published integration data.",
    euAnnexIRef: "9E003.h",
    earCclRef: "9E003.h",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.E.3.i",
    list: "DUL",
    category: "9",
    title: "Adjustable-flow-path-system technology for gas turbines",
    description:
      "Technology for adjustable flow-path systems that maintain engine stability for gas-generator/fan/power turbines or propelling nozzles — functional requirements, unique components, and control-law algorithms (incl. source code). Excludes inlet guide vanes, variable-pitch fans, etc.",
    euAnnexIRef: "9E003.i",
    earCclRef: "9E003.i",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
  {
    code: "9.E.3.k",
    list: "DUL",
    category: "9",
    title: "Sustained-supersonic-cruise propulsion technology",
    description:
      "Technology (not in 9.E.3.a/.h/.i) for developing propulsion inlet/exhaust systems, reheat systems, active thermal-management systems, oil-free engine rotor supports, or compression-system heat-removal systems enabling aircraft to cruise at ≥Mach 1 for >30 minutes.",
    euAnnexIRef: "9E003.k",
    earCclRef: "9E003.k",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_S5,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Lookup a Wassenaar entry by canonical code.
 *
 * Useful when an EU Annex I or EAR CCL entry's cross-walk has a
 * `seeAlso` reference like `{ regime: "WASSENAAR", id: "6.A.2.a.1" }`
 * — call this to retrieve the upstream Wassenaar baseline entry.
 */
export function findWassenaarEntry(id: string): WassenaarEntry | undefined {
  return WASSENAAR_CAT6_9_ENTRIES.find((e) => e.code === id);
}

/**
 * Return all Wassenaar entries belonging to a given top-level category
 * ("6", "9", or "ML").
 */
export function findWassenaarEntriesByCategory(
  category: string,
): WassenaarEntry[] {
  return WASSENAAR_CAT6_9_ENTRIES.filter((e) => e.category === category);
}

/**
 * Return all Wassenaar entries on a specific list (ML vs DUL).
 */
export function findWassenaarEntriesByList(
  list: "ML" | "DUL",
): WassenaarEntry[] {
  return WASSENAAR_CAT6_9_ENTRIES.filter((e) => e.list === list);
}
