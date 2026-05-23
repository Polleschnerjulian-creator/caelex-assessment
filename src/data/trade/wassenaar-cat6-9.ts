/**
 * Wassenaar Arrangement — Cat 6 (Sensors/Lasers) + Cat 9 (Aerospace).
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
 * This file: aerospace-relevant subsets of Cat 6 + Cat 9 only.
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
 *   - **9.A.1** Aero gas turbines
 *   - **9.A.4-7** Spacecraft, launch vehicles, propulsion, ground equipment
 *   - **9.A.11** UAVs
 *   - **9.D.1-4** Aerospace software
 *   - **9.E.1-3** Aerospace technology
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
      "Combat UAVs, target drones, military reconnaissance UAVs. Military-grade UAVs flow here from ML; dual-use UAVs flow from DUL 9.A.11.",
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

  // ─── 9.A.6 — Spacecraft and components ──────────────────────────
  {
    code: "9.A.6.a",
    list: "DUL",
    category: "9",
    title: "Spacecraft (satellites, probes, space stations)",
    description:
      "Civilian-mission spacecraft above payload thresholds. EO, comms, science, navigation satellites. Military spacecraft route via ML15/USML XV.",
    euAnnexIRef: "9A006.a",
    earCclRef: "9A006.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.6.b",
    list: "DUL",
    category: "9",
    title: "Star trackers and sun sensors for spacecraft",
    description:
      "Attitude-determination sensors above performance thresholds (FoV, NEA, drift rate). Sodern, Jena-Optronik, Terma class.",
    euAnnexIRef: "9A006.b",
    earCclRef: "9A006.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.6.c",
    list: "DUL",
    category: "9",
    title: "Spacecraft attitude-control thrusters",
    description:
      "Cold-gas, monopropellant, bipropellant, and electric ACS thrusters above specific-impulse + thrust thresholds.",
    euAnnexIRef: "9A006.c",
    earCclRef: "9A006.c",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.6.d",
    list: "DUL",
    category: "9",
    title: "Electric propulsion — Hall-effect thrusters (HETs)",
    description:
      "Hall-effect thrusters above thrust + Isp thresholds. Snecma PPS-1350 class and below; ENPULSION TUS, ThrustMe NPT-30, Exotrail XL units.",
    euAnnexIRef: "9A006.d.1",
    earCclRef: "9A006.d.1",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.6.e",
    list: "DUL",
    category: "9",
    title: "Electric propulsion — gridded ion engines",
    description:
      "Gridded ion engines (Kaufman, RIT, etc.) above thrust + Isp thresholds. Bus-class deep-space propulsion.",
    euAnnexIRef: "9A006.d.2",
    earCclRef: "9A006.d.2",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.6.f",
    list: "DUL",
    category: "9",
    title: "Spacecraft solar arrays and deployment mechanisms",
    description:
      "Multi-junction GaAs solar arrays + deployment mechanisms above efficiency/power-density thresholds.",
    euAnnexIRef: "9A006.f",
    earCclRef: "9A006.f",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.6.g",
    list: "DUL",
    category: "9",
    title: "Radiation-hardened space electronics",
    description:
      "Rad-hard ASICs, FPGAs, processors above TID + SEL thresholds. The space-qualified-microelectronics workhorse.",
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

  // ─── 9.A.11 — UAVs (dual-use) ───────────────────────────────────
  {
    code: "9.A.11.a",
    list: "DUL",
    category: "9",
    title: "UAVs and unmanned airships — endurance ≥30 min",
    description:
      "UAVs with autonomous flight-control + endurance ≥30 min at ≥300 km range. Below ML10.c military threshold.",
    euAnnexIRef: "9A011.a",
    earCclRef: "9A011.a",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.11.b",
    list: "DUL",
    category: "9",
    title: "UAV autonomous flight-control systems",
    description:
      "GPS/INS-aided autopilots, vision-based-navigation systems specially designed for autonomous UAV flight.",
    euAnnexIRef: "9A011.b",
    earCclRef: "9A011.b",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "9.A.11.c",
    list: "DUL",
    category: "9",
    title: "UAV swarming + command-link equipment",
    description:
      "Multi-UAV coordination systems, anti-jam C2 links, BVLOS C2 ground stations.",
    euAnnexIRef: "9A011.c",
    earCclRef: "9A011.c",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

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
