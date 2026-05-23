/**
 * Sprint B2 — EU 2021/821 Annex I — Aerospace + cross-cutting subset.
 *
 * Coverage: Aerospace-relevant entries from Cat. 9 (full focus), plus
 * cross-cutting entries from Cat. 1 (materials), Cat. 3 (electronics),
 * Cat. 5 (telecom + crypto), Cat. 6 (sensors/optics/SAR), Cat. 7
 * (navigation), and the new EU-autonomous 5xx entries from Delegated
 * Reg. 2025/2003.
 *
 * Source: EUR-Lex Reg. 2021/821 consolidated + Delegated Reg.
 * 2025/2003 (OJ L 2025/2003 of 14.11.2025, in force 15.11.2025).
 *
 * **NOT a verbatim transcription.** Each entry has paraphrased title +
 * description, cites the official source URL. The official Annex I has
 * approx. 11,000 lines; Caelex covers ~30 entries (the most space-
 * relevant). For full lookup, the user must consult EUR-Lex directly.
 *
 * Sprint Z24a (Tier 3) — added 9A006 (components for liquid rocket
 * propulsion), 9A008 (components for solid rocket motors), and 9A012
 * (unmanned aerial vehicles). The other Annex I Cat. 9 core entries
 * referenced by the Z24a brief (9A007, 9A009, 9A010, 9A011) were
 * already present and untouched. Parametric thresholds for 9A011 +
 * 9A012 live in `src/lib/comply-v2/trade/classification/
 * control-list-cross-walk.ts` per the matcher engine architecture
 * (Sprint Z3b/Z3c) — `ClassificationEntry` itself does not carry a
 * `parameters` field; thresholds are encoded textually here and
 * machine-readably in the cross-walk.
 *
 * Sprint Z24b (Tier 3) — added the remaining MTCR-derived 9A1xx
 * entries: 9A102, 9A103, 9A108, 9A109, 9A110, 9A111, 9A115, 9A116,
 * 9A117, 9A118, 9A119, 9A120, 9A121. 9A101/9A104/9A105/9A106/9A107
 * were already present and remain untouched. Parametric predicates
 * for the MTCR Cat-I tripwires (9A102 / 9A103 / 9A108 / 9A116 /
 * 9A119) live in the cross-walk.
 *
 * Sprint Z24c (Tier 3) — added EU Annex I Cat-9 software entries
 * (9D001, 9D002, 9D003, 9D004, 9D005, 9D101, 9D103, 9D104) and
 * technology entries (9E001, 9E002, 9E003, 9E101, 9E102, 9E103,
 * 9E104). These are the companion entries to the 9A hardware
 * ECCNs covered by Z24a + Z24b. Software/tech entries are
 * predominantly textual — the matcher engine treats them as
 * "deemed-export" capture surfaces, so no parametric thresholds
 * apply for most. Sources: Reg. (EU) 2021/821 Annex I, Cat. 9
 * Sections D + E (consolidated).
 */

import type { ClassificationEntry, ClassificationCoverage } from "./schema";

const SOURCE_BASE =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02021R0821";
const SOURCE_DELEG_2025_2003 =
  "https://eur-lex.europa.eu/eli/reg_del/2025/2003/oj";

const ASOF = "2026-05-07";

export const EU_ANNEX_I_COVERAGE: ClassificationCoverage = {
  jurisdiction: "EU_ANNEX_I",
  scope:
    "Aerospace-relevant entries from Cat. 9 (full subset), plus cross-cutting items from Cat. 1, 3, 5, 6, 7 + EU-autonomous 5xx from Delegated Reg. 2025/2003.",
  excluded: [
    "Cat. 0 (nuclear) — covered separately by NSG/Zangger",
    "Cat. 2 (most material processing equipment)",
    "Cat. 4 (computers — except cross-control items)",
    "Cat. 8 (marine systems)",
    "Most non-aerospace 5A/5B/5D entries",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 11000,
  caelexCoverageCount: 60,
};

export const EU_ANNEX_I_ENTRIES: ClassificationEntry[] = [
  // ─── Cat. 1 — Materials ─────────────────────────────────────────────
  {
    code: "1C002",
    jurisdiction: "EU_ANNEX_I",
    title: "Metallic alloys, alloy powders & alloyed materials",
    description:
      "Nickel-, niobium-, titanium-, magnesium-aluminides and certain superalloys for high-temperature aerospace applications. Cross-control by US CCL 1C002 + USML IV(h).",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-temp-coatings-aerospace",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "Drives composite-cycle propulsion + RV-nose-cone thermal protection.",
  },
  {
    code: "1C513",
    jurisdiction: "EU_ANNEX_I",
    title: "High-entropy alloys & refractory metal powders",
    description:
      "EU-autonomous control (introduced by Delegated Reg. 2025/2003): HEAs and refractory metal powders (W, Ta, Mo, Nb, Re) above defined purity and particle-size thresholds.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-entropy-alloys-refractory",
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
    notes:
      "First-time EU-autonomous listing without Wassenaar consensus. Aerospace use: regenerative-cooled rocket-engine combustion chambers.",
  },

  // ─── Cat. 2 — Material Processing ──────────────────────────────────
  {
    code: "2B510",
    jurisdiction: "EU_ANNEX_I",
    title: "Metal additive manufacturing equipment",
    description:
      "EU-autonomous control (Delegated Reg. 2025/2003): metal AM machines (DMLS, SLM, EBM) above thermal-cycle and build-rate thresholds.",
    controlReasons: ["NS"],
    crossReferenceTopic: "metal-additive-manufacturing-aerospace",
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
    notes:
      "Drives Isar / RFA / MaiaSpace regenerative-engine production lines.",
  },
  {
    code: "2E503",
    jurisdiction: "EU_ANNEX_I",
    title: "High-temperature coating technology",
    description:
      "EU-autonomous control (Delegated Reg. 2025/2003): technology for thermal-barrier coatings rated above defined operating temperatures + thermal-cycle counts.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-temp-coatings-aerospace",
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
  },

  // ─── Cat. 3 — Electronics ──────────────────────────────────────────
  {
    code: "3A001.a.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Radiation-hardened ICs",
    description:
      "Integrated circuits designed or rated for total-ionizing-dose ≥ 5×10⁴ rad(Si), single-event-upset ≤ 1×10⁻⁸ errors/bit/day, or single-event-latch-up immunity ≥ 80 MeV·cm²/mg LET.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "Frequently-traded BoM line for satellite avionics. PCUs/PPUs from US fabs trigger De-minimis.",
  },
  {
    code: "3A504",
    jurisdiction: "EU_ANNEX_I",
    title: "Cryogenic cooling subsystems",
    description:
      "EU-autonomous control (Delegated Reg. 2025/2003): cryogenic cooling subsystems operating below 4 K (≤ -269 °C). Covers Stirling-cycle, pulse-tube, and dilution refrigerators.",
    controlReasons: ["NS"],
    crossReferenceTopic: "cryogenic-systems-spacecraft",
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
    notes:
      "Quantum-computer-driven addition; carries spillover into IR-sensor cooling for satellites.",
  },

  // ─── Cat. 5 Part 1 — Telecom ───────────────────────────────────────
  {
    code: "5A001.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Phased-array antennas operating above 31.8 GHz",
    description:
      "Phased-array antennas with electronic beam-steering at frequencies above 31.8 GHz, OR with capabilities for adaptive nulling.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-tt-c-and-comms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "5A001.f",
    jurisdiction: "EU_ANNEX_I",
    title: "Free-space optical communication terminals",
    description:
      "Laser communication terminals: data-rate × range product above defined threshold; tracking systems; specific wavelength bands.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "Mynaric Condor Mk3, Tesat SCOT20/SCOT80 fall here. 'ITAR-free' marketing requires verified zero US-DNA — see Caelex De-Minimis-Calculator (Sprint B5).",
  },

  // ─── Cat. 6 — Sensors / Optics / SAR ───────────────────────────────
  {
    code: "6A002",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical sensors & detectors",
    description:
      "Visible / IR / UV detectors above defined performance thresholds (NETD for IR; quantum efficiency for VIS). Includes focal-plane arrays for spaceborne EO.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "6A003",
    jurisdiction: "EU_ANNEX_I",
    title: "Imaging cameras",
    description:
      "Cameras (image-intensifier-based, IR, ICCD, special-purpose) above defined frame-rate / resolution thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "6A008",
    jurisdiction: "EU_ANNEX_I",
    title: "Radar systems including SAR",
    description:
      "Radar systems above defined power × aperture thresholds, including spaceborne synthetic-aperture radar. ICEYE, Capella, Iceye-class smallsat SAR fall here.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Cat. 7 — Navigation ───────────────────────────────────────────
  {
    code: "7A003",
    jurisdiction: "EU_ANNEX_I",
    title: "Inertial measurement units & gyroscopes",
    description:
      "IMUs and gyros above gyro-bias-stability thresholds (≤ 0.5 deg/h for non-MTCR; finer for MTCR).",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "7A004",
    jurisdiction: "EU_ANNEX_I",
    title: "Star-trackers and other celestial navigation systems",
    description:
      "Star-trackers with attitude-update rate × accuracy above defined thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "7A005",
    jurisdiction: "EU_ANNEX_I",
    title: "GNSS receivers (anti-jam / anti-spoof variants)",
    description:
      "GNSS receivers with adaptive antenna arrays for anti-jamming, OR designed to operate in jamming environments above defined thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "7A103",
    jurisdiction: "EU_ANNEX_I",
    title: "Inertial guidance systems for missiles (MTCR)",
    description:
      "Inertial guidance systems / equipment usable in rockets, missiles or UAVs capable of MTCR Cat. I delivery (≥ 300 km / ≥ 500 kg payload).",
    controlReasons: ["MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },

  // ─── Cat. 9 — Aerospace & Propulsion (focus area) ──────────────────
  {
    code: "9A001",
    jurisdiction: "EU_ANNEX_I",
    title: "Aero gas turbine engines",
    description:
      "Aero gas turbine engines with characteristics above Wassenaar thresholds (e.g. specific fuel consumption, thrust-to-weight ratio, specific TIT levels).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A004",
    jurisdiction: "EU_ANNEX_I",
    title: "Space launch vehicles & spacecraft",
    description:
      "Complete space launch vehicles (SLVs) AND spacecraft above defined thresholds. Cross-control by 9A104 for MTCR-Cat-I systems.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "Isar Spectrum, RFA One, HyImpulse SL1 all fall here. MTCR Cat. I → strong-presumption-of-denial.",
  },
  {
    code: "9A005",
    jurisdiction: "EU_ANNEX_I",
    title: "Liquid-propellant rocket propulsion systems",
    description:
      "Complete liquid-propellant rocket engines with vacuum thrust ≥ 1 kN AND certain performance thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  // ─── Sprint Z24a — Core 9A006-9A012 (added 2026-05-22) ──────────────
  {
    code: "9A006",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Components & support equipment for liquid-propellant rocket engines",
    description:
      "Components specially designed for liquid-propellant rocket engines (9A005): turbopumps, gas generators, pre-burners, injector heads, combustion chambers, regeneratively-cooled nozzles, thrust-vector-control actuators, and specially-designed liquid-propellant tanks (excluding cryogenic tanks covered by 9A010). Per Delegated Reg. (EU) 2025/2003, the entry now also captures cryogenic propellant feed systems operating at temperatures ≤ 100 K (LH2/LCH4 feed lines, cryo-valves, density-flow meters).",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "2025/2003 amendment added the cryogenic-feed-system carve-in (T ≤ 100 K). MTCR Cat. II default; flips to Cat. I when paired with a complete Cat-I propulsion system. See parametric cross-walk EU:9A006 for the typed predicates.",
  },
  {
    code: "9A007",
    jurisdiction: "EU_ANNEX_I",
    title: "Solid-propellant rocket motors",
    description:
      "Solid-propellant rocket motors with total impulse capacity above thresholds. Includes case, igniter, nozzle, propellant grain.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "rocket-propulsion-solid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A008",
    jurisdiction: "EU_ANNEX_I",
    title: "Components for solid-propellant rocket motors",
    description:
      "Components specially designed for solid-propellant rocket motors (9A007): motor cases & insulation; propellant grains; nozzles (incl. ablative, carbon-carbon, graphite, refractory-metal); igniters & pyrotechnic safe-arm devices; thrust-vector-control sub-systems (movable nozzles, fluid injection, jet-vanes); and thrust-termination / blow-down vents. Carbon-carbon nozzle throats and case-bonded propellant interfaces are specifically called out.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "rocket-propulsion-solid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "Cross-controlled by USML IV(h) and MTCR Item 3. Carbon-carbon throats above defined density × thermal-cycle thresholds escalate to MTCR Cat I when combined with a Cat-I motor case.",
  },
  {
    code: "9A009",
    jurisdiction: "EU_ANNEX_I",
    title: "Hybrid rocket motors",
    description:
      "Hybrid rocket motors (solid fuel + liquid oxidizer) above thresholds. HyImpulse SR75/SL1 architecture.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "cryogenic-systems-spacecraft",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A010",
    jurisdiction: "EU_ANNEX_I",
    title: "Cryogenic propellant tanks for rocket stages",
    description:
      "Tanks specifically designed for cryogenic rocket propellants (LOx, LH2, LCH4, LN2). Material/insulation/tank-pressure thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "cryogenic-systems-spacecraft",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A011",
    jurisdiction: "EU_ANNEX_I",
    title: "Electric propulsion (Hall-effect, ion, FEEP, PPT)",
    description:
      "Electric propulsion systems for spacecraft: Hall-effect thrusters, gridded ion thrusters, field-emission thrusters, pulsed plasma thrusters above defined Isp / thrust thresholds. Typical capture threshold: specific impulse ≥ 1,500 s OR input power ≥ 15 kW — see parametric cross-walk EU:9A011 for the typed predicates.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "hall-thrusters-electric-propulsion",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9A012",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Unmanned aerial vehicles, specially designed components & related ground equipment",
    description:
      "Unmanned aerial vehicles (UAVs), unmanned airships, and remotely-piloted aircraft systems (RPAS) with either: (a) autonomous flight-control / navigation capability (no continuous human-in-the-loop required), OR (b) maximum range ≥ 300 km with payload ≥ 500 kg (MTCR Cat. I overlap with 9A104), OR (c) ability to controlled-fly out-of-natural-line-of-sight of the human operator at altitudes ≥ 6,096 m (FL200). Excludes hobbyist / civil-certified aircraft expressly designed for non-military use below all three thresholds. Cross-control by USML VIII(a) for ITAR-controlled UAVs.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
    notes:
      "MTCR Cat. II default; escalates to Cat. I when range ≥ 300 km AND payload ≥ 500 kg (then 9A104 also applies). The 300 km / 500 kg coupling is the same MTCR-Cat-I tripwire that drives 9A004/9A104 — see parametric cross-walk EU:9A012 for typed predicates. ITAR-controlled UAVs (military-grade RPAS, armed variants) are out-of-scope here; they sit under USML VIII.",
  },
  {
    code: "9A101",
    jurisdiction: "EU_ANNEX_I",
    title: "Turbojet/turbofan engines for missiles (MTCR)",
    description:
      "Turbojet and turbofan engines with maximum thrust > 400 N (excluding civil-certified variants), usable in MTCR-relevant unmanned air vehicles.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A104",
    jurisdiction: "EU_ANNEX_I",
    title: "Sounding rockets above MTCR thresholds",
    description:
      "Sounding rockets with maximum range ≥ 300 km. MTCR Cat. I if also ≥ 500 kg payload.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
  },
  {
    code: "9A105",
    jurisdiction: "EU_ANNEX_I",
    title: "Liquid-propellant rocket engines (MTCR Cat. II)",
    description:
      "Liquid-propellant rocket engines with total impulse ≥ 1.1 × 10⁶ N·s — MTCR-controlled even below Cat. I.",
    controlReasons: ["MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A106",
    jurisdiction: "EU_ANNEX_I",
    title: "Subsystems usable in rocket systems (MTCR)",
    description:
      "Subsystems and components usable in MTCR-relevant systems: thrust vector control, separation mechanisms, staging mechanisms, attitude control thrusters.",
    controlReasons: ["MT"],
    crossReferenceTopic: "hall-thrusters-electric-propulsion",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A107",
    jurisdiction: "EU_ANNEX_I",
    title: "Solid-propellant rocket motors (MTCR Cat. II)",
    description:
      "Solid-propellant rocket motors with total impulse ≥ 1.1 × 10⁶ N·s — MTCR-controlled even below Cat. I.",
    controlReasons: ["MT"],
    crossReferenceTopic: "rocket-propulsion-solid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A350",
    jurisdiction: "EU_ANNEX_I",
    title: "Aerosol-generating systems (dual-use, CB-controlled)",
    description:
      "Aerosol-generating systems that could be adapted for CB-agent dispersal. Controlled for Chemical/Biological reasons under Wassenaar. Payload-delivery cross-check required for aerial platforms.",
    controlReasons: ["CB"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },

  // ─── Z24b — MTCR-derived 9A101-9A121 (EU Reg. 2021/821 Annex I) ─────
  // Source: EU Reg. (EU) 2021/821 Annex I, Cat. 9 (consolidated text)
  //         + MTCR Equipment, Software and Technology Annex
  // The 9A1xx family transposes MTCR Items 1-20 into EU Annex I. Items
  // that were already shipped (9A101 turbojets, 9A104 sounding rockets,
  // 9A105 liquid engines Cat-II, 9A106 sub-systems, 9A107 solid motors)
  // are untouched. This section adds the remaining 9A102, 9A103, 9A108,
  // 9A109, 9A110, 9A111, 9A115, 9A116, 9A117, 9A118, 9A119, 9A120, 9A121.
  {
    code: "9A102",
    jurisdiction: "EU_ANNEX_I",
    title: "Reusable space vehicles (MTCR-derived)",
    description:
      "Complete reusable space vehicles AND specially-designed subsystems for them, when usable in MTCR Cat. I delivery systems (range ≥ 300 km, payload ≥ 500 kg). Captures the X-37B-class spaceplane envelope; commercial reusable launchers (Falcon 9 first-stage class) are also in scope when their MTCR thresholds are met.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
    notes:
      "Reusability does not lift the MTCR Cat-I presumption-of-denial — the range × payload product, not the operational concept, drives the determination.",
  },
  {
    code: "9A103",
    jurisdiction: "EU_ANNEX_I",
    title: "Ramjet, scramjet & combined-cycle propulsion subsystems (MTCR)",
    description:
      "Specially-designed subsystems for ramjet, scramjet, pulse-jet or combined-cycle engines (MTCR Item 3.A.5) usable in MTCR Cat. I systems: combustors, fuel-injection systems, fuel-management systems, hypersonic-flow ducts. Cross-control with 9A011 for the electric-propulsion path remains separate.",
    controlReasons: ["MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
    notes:
      "Air-breathing propulsion. MTCR Item 3 covers parts + subsystems even when the full engine is not yet end-of-life — i.e. development-stage scramjet IP is in scope.",
  },
  {
    code: "9A108",
    jurisdiction: "EU_ANNEX_I",
    title: "Components for rocket-propulsion systems (MTCR Item 3.A.4)",
    description:
      "Components specially designed for MTCR rocket-propulsion systems (9A105/9A107): combustion chambers, nozzles, gas generators, turbopumps, fluid-control valves rated for cryogenic / corrosive propellants, igniters, and integral propellant tanks. Distinct from the 9A006/9A008 EU-Cat-9-core entries which capture the same items at the broader-than-MTCR thresholds.",
    controlReasons: ["MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
    notes:
      "9A108 escalates to MTCR Cat I when the parent engine/motor crosses the 1.1×10⁶ N·s total-impulse threshold (i.e. flies in a 9A105/9A107 Cat-I host). See parametric cross-walk EU:9A108 for the typed predicates.",
  },
  {
    code: "9A109",
    jurisdiction: "EU_ANNEX_I",
    title: "Hybrid rocket motors (MTCR Cat. II)",
    description:
      "Hybrid rocket motors (solid fuel + liquid/gas oxidiser) with total impulse capacity ≥ 1.1×10⁶ N·s. Distinct from the broader 9A009 EU-Cat-9-core entry which captures all hybrid motors regardless of impulse. HyImpulse SR75/SL1, Gilmour Space Eris fall here when the impulse threshold is met.",
    controlReasons: ["MT"],
    crossReferenceTopic: "cryogenic-systems-spacecraft",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A110",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Composite structures, laminates & re-entry-vehicle structures (MTCR Item 6)",
    description:
      "Composite structures, laminates and manufactures specially designed for use in 9A004 spacecraft, 9A104 sounding rockets, or other MTCR systems, where material properties (density, specific tensile strength, modulus) exceed defined thresholds. Includes carbon-carbon, carbon-fibre + resin laminates, ceramic matrix composites for ablative thermal protection.",
    controlReasons: ["MT"],
    crossReferenceTopic: "high-temp-coatings-aerospace",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
    notes:
      "9A010 (EU-Cat-9-core composites) and 9A110 (MTCR-aligned composites) frequently both apply — they encode the same materials family at two threshold tiers. 9A110 has stricter material-property thresholds.",
  },
  {
    code: "9A111",
    jurisdiction: "EU_ANNEX_I",
    title: "Pulse-jet engines (MTCR-controlled)",
    description:
      "Pulse-jet engines specially designed for use in MTCR-relevant unmanned air vehicles (9A012-Cat-I corner, cruise missiles). Maximum thrust > 1 kN (excluding civil-certified variants). Captures legacy V-1-style pulse-jets and modern resonance-based variants used in some long-range UAV concepts.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A115",
    jurisdiction: "EU_ANNEX_I",
    title: "Launch support equipment for MTCR systems (MTCR Item 12)",
    description:
      "Specialised equipment supporting the launch, handling, storage, fuelling or recovery of MTCR Cat. I systems: transporters, erectors, launchers, propellant-loading equipment, gantries, range-safety-flight-termination receivers, telemetry uplink stations specifically rated for MTCR Cat-I trajectory profiles.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
    notes:
      "Commercial spaceport ground equipment (Esrange, SaxaVord, Andøya) frequently triggers 9A115 capture even when the launch vehicle itself is a sub-Cat-I sounding rocket — review the equipment's MTCR-Cat-I-rating-capability not the operational use.",
  },
  {
    code: "9A116",
    jurisdiction: "EU_ANNEX_I",
    title: "Re-entry vehicles & equipment (MTCR Item 10)",
    description:
      "Re-entry vehicles, re-entry-vehicle thermal protection systems, heat shields, and equipment specially designed to protect MTCR-relevant payloads during atmospheric re-entry. Includes ablative TPS, leading-edge thermal protection, and aero-thermo-shape recovery components. Captures both crewed (Dream Chaser-class) and uncrewed (Atmos Space SR-class) commercial re-entry vehicle envelopes.",
    controlReasons: ["MT"],
    crossReferenceTopic: "high-temp-coatings-aerospace",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
    notes:
      "Re-entry capability is itself an MTCR Cat-I tripwire when paired with a controllable trajectory — even a small re-entry capsule can carry a Cat-I weight if the design supports it.",
  },
  {
    code: "9A117",
    jurisdiction: "EU_ANNEX_I",
    title: "Staging mechanisms, separation mechanisms & interstages (MTCR)",
    description:
      "Mechanisms for stage separation, interstage-attach-release, payload-release, fairing-jettison or shroud-separation specifically designed for use in MTCR systems. Pyrotechnic, frangible-bolt, marman-clamp-band, and pneumatic actuator variants all captured.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A118",
    jurisdiction: "EU_ANNEX_I",
    title: "Devices to regulate combustion (TVC, attitude-control jets, MTCR)",
    description:
      "Devices to regulate combustion in MTCR-relevant rocket systems: thrust-vector-control nozzles, gimbal mechanisms, fluid-injection-TVC subsystems, jet-vane assemblies, and movable-aerospike attitude-control jets. Cross-control with 9A106 (rocket subsystems) and 9A008 (solid-motor components).",
    controlReasons: ["MT"],
    crossReferenceTopic: "hall-thrusters-electric-propulsion",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9A119",
    jurisdiction: "EU_ANNEX_I",
    title: "Individual rocket stages (MTCR Cat. II)",
    description:
      "Individual rocket stages — complete, integrated propulsion + tank + airframe sub-assemblies — when usable in MTCR Cat-I systems. The stage's own total impulse (≥ 1.1×10⁶ N·s) is the threshold, not the host vehicle's. Captures the standalone-stage commercial market (upper-stage kits, kick-stages from D-Orbit, Momentus, Impulse Space).",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
    notes:
      "9A119 is the entry that catches upper-stage kit suppliers (kick-stages, OTVs, in-space-tugs) — their stages often clear the 1.1×10⁶ N·s threshold even though their own mission profiles are sub-orbital station-keeping.",
  },
  {
    code: "9A120",
    jurisdiction: "EU_ANNEX_I",
    title: "Production equipment for MTCR rocket components (MTCR Item 1.B)",
    description:
      "Production equipment specially designed for the manufacture of MTCR-controlled rocket components: precision-machining centres rated for tolerances ≤ 10 µm on rocket-component-size envelopes, filament-winding machines for composite-overwrapped pressure vessels, isostatic presses for propellant-grain manufacture, and dedicated NDT (non-destructive-testing) stations for MTCR-grade solid-propellant grains.",
    controlReasons: ["MT"],
    crossReferenceTopic: "metal-additive-manufacturing-aerospace",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
    notes:
      "Production equipment travels with the controls of the items it makes — a filament-winding machine licensed for non-MTCR pressure vessels can become MTCR-controlled simply by being re-tasked for COPV production above MTCR thresholds.",
  },
  {
    code: "9A121",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Electronic computers and accelerometers for MTCR systems (MTCR Item 13)",
    description:
      "Electronic computers, hybrid-analog-digital flight controllers, accelerometers and angular-rate sensors specially designed or modified for use in MTCR-controlled rocket systems and unmanned air vehicles. Bias-stability, scale-factor accuracy, and shock-resistance thresholds align with MTCR Item 13. Cross-control with 7A103 (inertial guidance) and 7A105 (GNSS receivers for missiles).",
    controlReasons: ["MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
    notes:
      "MTCR Item 13 thresholds are typically tighter than Wassenaar 7A003/7A005 — a flight-controller IMU may be Wassenaar-uncontrolled but MTCR-controlled (Cat II). Always test both regimes.",
  },

  // ─── Cat. 9 — Spacecraft Bus & Platforms ───────────────────────────
  {
    code: "9A515",
    jurisdiction: "EU_ANNEX_I",
    title: "Spacecraft and spacecraft platforms",
    description:
      "Spacecraft designed or modified for military/intelligence use, OR with anti-jam/anti-spoof capabilities, OR above defined radiation tolerance thresholds. Commercial EO/comms sats may still fall here if mil-spec subsystems are present.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "ECR 2014 (US) moved commercial sats from USML XV → ECCN 9A515. EU Annex I 9A515 mirrors this post-2014 Wassenaar alignment. Check for mil-spec avionics before assuming commercial exemption.",
  },

  // ─── Z24c — Cat. 9 Software (9D) entries ───────────────────────────
  // Source: Reg. (EU) 2021/821 Annex I, Cat. 9 Section D (consolidated).
  // 9D entries are the software companions to 9A hardware. Capture
  // surface is "deemed-export" (technology transfer to foreign nationals
  // even within the EU). No parametric thresholds — textual capture only.
  {
    code: "9D001",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for development of 9A001-9A012 items",
    description:
      "EU Annex I 9D001 — software specially designed for the development of items in 9A001 (gas turbines), 9A004 (SLVs/spacecraft), 9A005-9A011 (rocket propulsion families), or 9A012 (UAVs). Controls flow from Wassenaar 9.D.1. Typical capture: flight-software toolchains, CFD model libraries, control-law simulators.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9D002",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for production of 9A001-9A012 items",
    description:
      "EU Annex I 9D002 — software specially designed for the production of items in 9A001-9A012. Captures manufacturing-execution-system (MES) software, CAM toolpath generators for aerospace machining, and propellant-grain-cure controllers. Controls flow from Wassenaar 9.D.2.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9D003",
    jurisdiction: "EU_ANNEX_I",
    title: "FADEC software for aero gas turbines",
    description:
      "EU Annex I 9D003 — software for Full-Authority Digital Engine Control (FADEC) systems for aero gas turbines covered by 9A001. Includes the source code, executables, and parameter files implementing control laws. Controls flow from Wassenaar 9.D.3.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9D004",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for development of gas turbine engine components",
    description:
      "EU Annex I 9D004 — software specially designed for the development of digital electronic engine controls or aerodynamic test data libraries for items in 9A001. Captures wind-tunnel-data correlation tools and engine-design optimization suites. Controls flow from Wassenaar 9.D.4.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9D005",
    jurisdiction: "EU_ANNEX_I",
    title: "Computational fluid dynamics (CFD) software for hypersonic flows",
    description:
      "EU Annex I 9D005 — CFD software for design and analysis of hypersonic-flow regimes (Mach ≥ 5) usable in aerospace vehicles, scramjets, or re-entry-vehicle aerothermodynamics. Cross-reference 9A103 (scramjet subsystems) and 9A116 (re-entry vehicles). Controls flow from Wassenaar 9.D.5.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-temp-coatings-aerospace",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9D101",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for MTCR Cat. II items (9A101-9A121)",
    description:
      "EU Annex I 9D101 — software specially designed for use of items in 9A101 (turbojets/turbofans for missiles), 9A102 (reusable space vehicles), 9A104 (sounding rockets), 9A105 (Cat-II liquid engines), 9A106-9A121 (MTCR-derived subsystems). MTCR Item 16.D.1 transposition. Deemed-export capture for missile-program-relevant simulation, guidance, and integration software.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9D103",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for modelling MTCR-relevant trajectory & integration",
    description:
      "EU Annex I 9D103 — software for modelling, simulating, or design-integration analysis of MTCR-relevant systems: trajectory simulators, multi-body dynamics for stage separation, guidance-navigation-control synthesis tools. MTCR Item 16.D.3 transposition.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9D104",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for ramjet/scramjet & combined-cycle propulsion design",
    description:
      "EU Annex I 9D104 — software specifically designed for the design or production of ramjet, scramjet, pulse-jet or combined-cycle propulsion systems covered by 9A103. Captures aerothermodynamic codes, combustor-design suites, and hypersonic-fuel-injection simulators. MTCR Item 3.D.1 transposition.",
    controlReasons: ["MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
    notes:
      "Hypersonic-propulsion design software remains the long-pole IP-transfer risk for European New-Space. Many universities and SMEs use US-origin CFD code (ANSYS Fluent, STAR-CCM+, OpenFOAM derivatives) which may also trigger US EAR 9D004 / 9D104 on the US side.",
  },

  // ─── Z24c — Cat. 9 Technology (9E) entries ─────────────────────────
  // Source: Reg. (EU) 2021/821 Annex I, Cat. 9 Section E (consolidated).
  // 9E entries cover the technology (drawings, specs, know-how, training)
  // for development, production, or use of 9A items. Deemed-export
  // capture is the dominant compliance surface here.
  {
    code: "9E001",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for development of 9A & 9B items",
    description:
      "EU Annex I 9E001 — technology, according to the General Technology Note, for the development of items in 9A001-9A012 or 9B (test/inspection/production equipment for aerospace). Captures drawings, specifications, manufacturing processes, integration know-how. Controls flow from Wassenaar 9.E.1.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    notes:
      "9E001 is the dominant deemed-export trigger for European New-Space — every supplier datasheet, integration drawing, and process-spec shared with a non-EU employee or visitor falls within this scope.",
  },
  {
    code: "9E002",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for production of 9A & 9B items",
    description:
      "EU Annex I 9E002 — technology, per the General Technology Note, for the production of items in 9A or 9B. Captures detailed manufacturing-process technology, jig/fixture designs, and qualification-test procedures. Controls flow from Wassenaar 9.E.2.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-bus-platforms",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9E003",
    jurisdiction: "EU_ANNEX_I",
    title: "Specific aerospace technology (repair, hot-section, FOD)",
    description:
      "EU Annex I 9E003 — specific aerospace-engine technology: hot-section components, single-crystal blade alloys, FOD-resistant turbine-blade coatings, gas-path-component repair, and FADEC integration. Targets the technical know-how that distinguishes a competitive engine vendor from a sub-contractor. Controls flow from Wassenaar 9.E.3.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-temp-coatings-aerospace",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
  },
  {
    code: "9E101",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for MTCR Cat. II items (9A101-9A111)",
    description:
      "EU Annex I 9E101 — technology, per the General Technology Note, for the development or production of MTCR-derived items in 9A101-9A111. Captures the full IP-transfer surface for missile-relevant aerospace: rocket-engine drawings, composite-fabrication specs, GNC algorithms. MTCR Item 16.E.1 transposition.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
    notes:
      "9E101 + 9D101 together are the most common license-trigger pair for European New-Space engineering services exports. Deemed-export to non-EU nationals at EU sites is the largest unmanaged risk.",
  },
  {
    code: "9E102",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for use of MTCR Cat. II items",
    description:
      "EU Annex I 9E102 — technology, per the General Technology Note, for the use of items in 9A101-9A112 or 9D101. Captures operating manuals, mission-planning know-how, and operator-training materials. MTCR Item 16.E.2 transposition.",
    controlReasons: ["MT"],
    crossReferenceTopic: "complete-launch-vehicles",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9E103",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for ramjet/scramjet design (MTCR Item 3)",
    description:
      "EU Annex I 9E103 — technology, per the General Technology Note, for the development or production of ramjet, scramjet, pulse-jet or combined-cycle propulsion systems covered by 9A103. Captures hypersonic-flow design know-how. MTCR Item 3.E.1 transposition.",
    controlReasons: ["MT"],
    crossReferenceTopic: "rocket-propulsion-liquid-engines",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "9E104",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for re-entry vehicles & TPS (MTCR Item 10)",
    description:
      "EU Annex I 9E104 — technology, per the General Technology Note, for the development or production of re-entry vehicles, heat shields, and thermal protection systems covered by 9A116. Captures ablative-TPS material specs, aero-thermal-shape design, and trajectory-recovery know-how. MTCR Item 10.E.1 transposition.",
    controlReasons: ["MT"],
    crossReferenceTopic: "high-temp-coatings-aerospace",
    sourceUrl: SOURCE_BASE,
    asOfDate: ASOF,
    mtcrCategory: "I",
    notes:
      "9E104 carries the MTCR-Cat-I strong-presumption-of-denial when the underlying re-entry vehicle (9A116) clears Cat-I payload thresholds. Commercial re-entry vehicle programs (Atmos Space, The Exploration Company) intersect heavily with this entry.",
  },
];

/**
 * Lookup by code within EU Annex I.
 */
export function findEuAnnexIEntry(
  code: string,
): ClassificationEntry | undefined {
  return EU_ANNEX_I_ENTRIES.find((e) => e.code === code);
}

/**
 * Lookup all EU Annex I entries for a given cross-reference topic slug.
 */
export function findEuAnnexIEntriesByTopic(
  slug: string,
): ClassificationEntry[] {
  return EU_ANNEX_I_ENTRIES.filter((e) => e.crossReferenceTopic === slug);
}
