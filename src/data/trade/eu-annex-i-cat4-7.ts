/**
 * Sprint Z34-Cat4-7 (Tier 4) — EU Annex I Categories 4 (Computers) +
 * 7 (Navigation + Avionics) full enumeration.
 *
 * **Category 4 — Computers.** Captures the high-performance compute
 * silicon, AI accelerators, supercomputer-class assemblies, and the
 * supporting software + technology that the EU lists under Annex I
 * Cat. 4. The space-critical sub-set is small (most spaceborne flight
 * computers are below Cat-4 performance thresholds), but Cat-4 matters
 * to operators in two scenarios:
 *
 *   1. Ground-side mission infrastructure: the AI/ML training cluster
 *      a constellation operator runs to retrain its imagery models,
 *      the on-prem GPU farm an EO downstream provider uses for
 *      Level-2 product generation. 4A003 (digital computers) +
 *      4A090 (advanced-computing AI accelerators) routinely fire
 *      here.
 *
 *   2. On-board AI inference engines on new-generation smallsats
 *      (e.g. ESA Phi-Sat-2, OPS-SAT, Hyperscout). Most flight units
 *      are below the 4A090 TPP gate but the operator MUST classify
 *      to confirm. The 2022 Oct BIS IFR (transposed into EU via
 *      Delegated Reg. 2025/2003) added the 4A090/4D090/4E090 family.
 *
 * **Category 7 — Navigation + Avionics.** Captures every IMU,
 * accelerometer, gyroscope, star-tracker, GNSS receiver, INS, altimeter,
 * and the supporting test gear, software, and technology that goes into
 * spacecraft AOCS (Attitude and Orbit Control System) and launch GNC
 * (Guidance, Navigation & Control). Every imaging satellite, every
 * spacecraft with active attitude control, and every launch vehicle
 * sits under Cat-7 for its sensor + control chain.
 *
 *   - The 7A001-7A006 cluster is the Wassenaar-derived "civilian"
 *     navigation baseline — captures commercial-grade flight
 *     instruments.
 *   - The 7A101-7A106 cluster is the MTCR-derived "missile-equivalent"
 *     navigation cluster — applies whenever the same nav hardware is
 *     suitable for a MTCR Cat-I delivery vehicle.
 *   - 7B is test/inspection/production equipment for the above.
 *   - 7D is software (Kalman filters, FDIR, nav-data fusion).
 *   - 7E is technology (development know-how).
 *
 * Why a separate file: `src/data/trade/eu-annex-i.ts` already ships the
 * Cat-9-focussed aerospace subset of Annex I plus selected cross-cutting
 * Cat-7 entries (7A003, 7A004, 7A005, 7A103). Tier 4 (Z34-Cat4-7)
 * extends Caelex coverage to the FULL Cat-4 + Cat-7 enumeration without
 * mutating that file (parallel agents are doing the same for Wassenaar).
 * The new entries live under EU_ANNEX_I_CAT4_ENTRIES / CAT7_ENTRIES.
 *
 * Scope:
 *   Cat 4:
 *     4A001 / 4A003 / 4A004      Hardware (computers)
 *     4A090                       Advanced-computing AI compute (Oct 2022 IFR)
 *     4D001 / 4D090              Software
 *     4E001                       Technology
 *   Cat 7:
 *     7A001-7A006                 Wassenaar nav sensors + INS
 *     7A101-7A106                 MTCR-derived nav for delivery vehicles
 *     7B001-7B003                 Test equipment
 *     7D001-7D004                 Software (Kalman, FDIR, INS algos)
 *     7E001-7E004                 Technology
 *
 * Source: EUR-Lex Reg. (EU) 2021/821, Annex I, Cat. 4 + Cat. 7
 * (consolidated text) + Delegated Reg. (EU) 2025/2003 amendments
 * (4A090 family transposition).
 *
 * NOT verbatim copy of the regulatory text. Paraphrased descriptions
 * with citation to source. Caelex coverage is screening-level — final
 * classification requires authorised compliance officer review.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ClassificationEntry, ClassificationCoverage } from "./schema";

const SOURCE_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02021R0821";
const SOURCE_DELEG_2025_2003 =
  "https://eur-lex.europa.eu/eli/reg_del/2025/2003/oj";

const ASOF = "2026-05-23";

// Base-corpus correctness audit (2026-06-13): re-verified Cat-4 + Cat-7
// sub-paragraph lettering against current EUR-Lex 02021R0821 / Wassenaar
// WA-LIST (HK STC cat_4/cat_7 mirror). Corrected wrong-item mislabels;
// touched entries carry this as-of date.
const ASOF_AUDIT = "2026-06-13";

// ═══════════════════════════════════════════════════════════════════
// COVERAGE METADATA
// ═══════════════════════════════════════════════════════════════════

export const EU_ANNEX_I_CAT4_COVERAGE: ClassificationCoverage = {
  jurisdiction: "EU_ANNEX_I",
  scope:
    "EU Annex I Cat. 4 (Computers) hardware (4A001/4A003/4A004), advanced-computing AI accelerators (4A090, Oct 2022 IFR transposition), software (4D001/4D090), and technology (4E001/4E090).",
  excluded: [
    "Non-aerospace specialised sub-paragraphs (4A001.b consumer ruggedized handhelds, 4A003.g specific gaming-graphics carve-outs).",
    "Mass-market hybrid-compute exemptions under the General Computer Note (Note 2 to Cat. 4) — handled at the license-determination stage.",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 35,
  caelexCoverageCount: 15,
};

export const EU_ANNEX_I_CAT7_COVERAGE: ClassificationCoverage = {
  jurisdiction: "EU_ANNEX_I",
  scope:
    "EU Annex I Cat. 7 (Navigation + Avionics) hardware (7A001-7A006 Wassenaar; 7A101-7A106 MTCR-derived), test/production equipment (7B001-7B003), software (7D001-7D004), and technology (7E001-7E004).",
  excluded: [
    "Cat-7 entries already covered in eu-annex-i.ts (7A003, 7A004, 7A005, 7A103) are NOT duplicated here — see that file for the headline definitions.",
    "Non-aerospace specialised sub-paragraphs (7A005.b marine-only GPS, 7A006.a sonar-only altimeters).",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 60,
  caelexCoverageCount: 25,
};

// ═══════════════════════════════════════════════════════════════════
// CAT 4 — COMPUTERS
// ═══════════════════════════════════════════════════════════════════

export const EU_ANNEX_I_CAT4_ENTRIES: ClassificationEntry[] = [
  // ─── 4A — Hardware ───────────────────────────────────────────────

  {
    code: "4A001",
    jurisdiction: "EU_ANNEX_I",
    title: "Electronic computers and related equipment — header",
    description:
      "Header entry for the electronic-computer hardware family. Captures any computer, electronic assembly, or specially-designed component meeting one of the sub-entry tripwires (4A001.a through 4A001.b).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Header — operators classify against the most-specific sub-entry that applies. The General Computer Note (Note 2 to Cat. 4) governs the threshold below which a computer ceases to be a Cat-4 capture.",
  },
  {
    code: "4A001.a.1",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Electronic computers rated for operation below -45 °C or above +85 °C",
    description:
      "Electronic computers and related equipment rated for operation at an ambient temperature below 228 K (-45 °C) or above 358 K (+85 °C) — the extended-environmental-range tripwire (spaceborne / military-aviation).",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    notes:
      "Base-corpus audit 2026-06-13: 4A001.a.1 is the TEMPERATURE sub-paragraph (the radiation entry is 4A001.a.2). Every flight computer across the LEO/MEO thermal swing or launch-vehicle envelope sits here unless the standard-temperature carve-out applies.",
  },
  {
    code: "4A001.a.2",
    jurisdiction: "EU_ANNEX_I",
    title: "Computers rated for total ionizing dose ≥ 5×10⁵ rad(Si)",
    description:
      "Electronic computers and related equipment specially designed/modified for radiation hardening to withstand total ionizing dose (TID) ≥ 5×10⁵ rad(Si) — the spaceborne flight-computer hard-rad gate.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    notes:
      "Base-corpus audit 2026-06-13: radiation hardening is 4A001.a.2 (was mislabelled 4A001.a.1, which is the temperature sub-paragraph). RAD750 (BAE), GR740 (Cobham Gaisler), LEON4-FT, Mongoose-V — the canonical spaceborne flight-computer ECCN. Parallels 3A001.a.1 (rad-hard ICs inside the computer).",
  },
  // 4A001.b — REMOVED (base-corpus audit 2026-06-13): official 4A001.b is
  // deleted (L.N. 45/2010). The "mil-spec ruggedized computers" content was a
  // phantom — military ruggedization is not a 4A001.b dual-use control.
  {
    code: "4A003",
    jurisdiction: "EU_ANNEX_I",
    title: "Digital computers above performance thresholds — header",
    description:
      "Header entry for high-performance digital computers. Sub-entries cover Adjusted Peak Performance (APP) thresholds, vector-processing thresholds, multi-processor architectures, and specially-designed cooling.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "4A003 is the historical Wassenaar high-performance-computing gate. Sub-entries .a-.g use APP (Adjusted Peak Performance) thresholds in weighted TeraFLOPS.",
  },
  // 4A003.a — REMOVED (base-corpus audit 2026-06-13): official 4A003.a is
  // repealed. The "Adjusted Peak Performance" HPC threshold it described now
  // lives at 4A003.b (> 70 Weighted TeraFLOPS) — relocated below.
  {
    code: "4A003.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Digital computers with APP exceeding 70 Weighted TeraFLOPS",
    description:
      "'Digital computers' having an 'Adjusted Peak Performance' (APP) exceeding 70 Weighted TeraFLOPS (WT) — the headline high-performance-computing capture. (The exact WT value is reset by Wassenaar plenary decisions; verify at classification time.)",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    notes:
      "Base-corpus audit 2026-06-13: corrected from an 'assemblies for aggregation' mislabel. Official 4A003.b = digital computers above the APP (> 70 WT) gate; the aggregation-assemblies item is 4A003.c.",
  },
  {
    code: "4A003.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Electronic assemblies for aggregating processors above 4A003.b",
    description:
      "'Electronic assemblies' specially designed or modified for enhancing performance by aggregation of processors so that the 'APP' of the aggregation exceeds the limit in 4A003.b. Captures GPU racks, accelerator boards, server blades built into above-threshold clusters.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    notes:
      "Base-corpus audit 2026-06-13: corrected from a 'simultaneous-pulse triple-redundancy (SPTR/TMR)' mislabel. Official 4A003.c = processor-aggregation assemblies that push aggregate APP past the 4A003.b limit.",
  },
  {
    code: "4A004",
    jurisdiction: "EU_ANNEX_I",
    title: "Systolic array, neural, and optical computers",
    description:
      "Computers, and specially designed related equipment / electronic assemblies / components therefor, of any of the following architectures: 'systolic array computers'; 'neural computers'; 'optical computers'.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    notes:
      "Base-corpus audit 2026-06-13: corrected from a 'cooling-threshold computers' mislabel. Official 4A004 = systolic-array / neural / optical computers (architecture classes), not a heat-dissipation gate.",
  },
  {
    code: "4A090",
    jurisdiction: "EU_ANNEX_I",
    title: "Advanced-computing AI accelerators (Oct 2022 IFR)",
    description:
      "Advanced-computing items employing 'integrated circuits with high-bandwidth interfaces above defined thresholds' — direct EU transposition of the US Oct-2022 BIS Interim Final Rule advanced-computing controls.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
    notes:
      "Headline AI export-control of the decade. 4A090 mirrors the US 4A090 ECCN added by the Oct 2022 BIS IFR. Captures Nvidia H100/H200/B100/B200-class accelerators when integrated at the server/system level (companion to 3A090 which captures the bare-die ICs).",
  },
  {
    code: "4A090.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Advanced-computing assemblies with TPP > threshold",
    description:
      "Computer servers and electronic assemblies incorporating integrated circuits whose Total Processing Performance (TPP) × performance density exceeds the BIS Oct-2022-IFR threshold — captures DGX H100, HGX H200, and equivalent OEM systems.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
    notes:
      "Composite gate (TPP × density). The US 4A090.a sub-paragraph uses both metrics to bracket the rack-level AI training cluster.",
  },

  // ─── 4D — Software ───────────────────────────────────────────────

  {
    code: "4D001",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for development/production/use of 4A001/4A003 computers",
    description:
      "Software specially designed for the development, production, or use of computers controlled by 4A001 or 4A003 — incl. compilers targeting rad-hard cores (SPARC-V8 for LEON, PowerPC for RAD750), HPC scheduler stacks.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Header — captures cross-compilers, debuggers, FPGA synthesis tools, and FT (fault-tolerant) middleware for the controlled hardware.",
  },
  {
    code: "4D001.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for development of 4A001 / 4A003 hardware",
    description:
      "Software specially designed for the development of 4A001 / 4A003 computers — incl. SoC simulators, place-and-route tools targeting rad-hard libraries, validation suites for fault-tolerant compute.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "4D001.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for use of 4A001 / 4A003 hardware",
    description:
      "Software specially designed for the operational use of 4A001 / 4A003 hardware — flight-software stacks for rad-hard CPUs (RTEMS, VxWorks 653 rad-hard ports), HPC mission-software middleware.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "4D090",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for advanced-computing AI accelerators (4A090)",
    description:
      "Software specially designed for the development, production, or use of 4A090 advanced-computing items — incl. CUDA/ROCm toolchains, vendor compiler suites (NVCC, HIPCC), inference-serving frameworks targeted at controlled accelerators.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
    notes:
      "Companion to 4A090. Open-source AI frameworks (PyTorch, JAX, TensorFlow) are generally evaluated against the publicly-available carve-out — but vendor SDKs (CUDA Toolkit, cuDNN, TensorRT) are squarely 4D090 capture.",
  },

  // ─── 4E — Technology ─────────────────────────────────────────────

  {
    code: "4E001",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for 4A001 / 4A003 / 4D001",
    description:
      "Technology (per the General Technology Note) required for the development, production, or use of computers / software controlled by 4A001, 4A003, or 4D001 — incl. design notes, calibration procedures, fault-injection test methodologies.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Deemed-export tripwire for HPC + rad-hard-compute know-how transferred to foreign nationals / non-EU recipients.",
  },
  {
    code: "4E001.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Development/production technology for 4A001 / 4A003",
    description:
      "Technology required for the development or production of 4A001 / 4A003 hardware — design notes for radiation hardening, fault-tolerant architectures, TMR voting logic, HPC interconnect topologies.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
];

// ═══════════════════════════════════════════════════════════════════
// CAT 7 — NAVIGATION + AVIONICS
// ═══════════════════════════════════════════════════════════════════

export const EU_ANNEX_I_CAT7_ENTRIES: ClassificationEntry[] = [
  // ─── 7A — Hardware (Wassenaar baseline) ──────────────────────────

  {
    code: "7A001",
    jurisdiction: "EU_ANNEX_I",
    title: "Accelerometers above defined performance thresholds — header",
    description:
      "Header entry for the accelerometer family. Captures linear and angular accelerometers whose bias, scale-factor stability, or g-range exceeds the Wassenaar thresholds. Sub-entries split by sensor class and use.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Header — sub-entries .a (linear), .b (angular) carry their own performance gates. MT control reason fires when the accelerometer is suitable for MTCR Cat-I delivery vehicle guidance.",
  },
  {
    code: "7A001.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Linear accelerometers (bias / scale-factor thresholds)",
    description:
      "Linear accelerometers with bias stability ≤ 130 micro-g over one year, or scale-factor stability ≤ 130 ppm over one year — the Wassenaar baseline for spaceborne / launch-vehicle inertial sensors.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Honeywell QA-2000, Northrop Grumman LN-200 IMU accelerometers, Kearfott Monolithic Ring Laser — all clear this gate. Spaceborne IMUs (LN-200S, ASTRIX) are direct hits.",
  },
  {
    code: "7A001.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Angular accelerometers above defined thresholds",
    description:
      "Angular accelerometers with bias / scale-factor stability above defined thresholds. Less common than linear accelerometers but used in high-precision rate-sensing AOCS subsystems.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "7A002",
    jurisdiction: "EU_ANNEX_I",
    title: "Gyros / angular-rate sensors above defined performance — header",
    description:
      "Header entry for the gyroscope / angular-rate-sensor family. Captures mechanical gyros, ring-laser gyros (RLG), fibre-optic gyros (FOG), hemispherical-resonator gyros (HRG), and MEMS gyros above bias / drift thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Header — every spacecraft attitude-control subsystem and every launch-vehicle GNC sits behind a 7A002 gyro. Sub-entries split by gyro technology (.a non-spinning, .b other).",
  },
  {
    code: "7A002.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Non-spinning gyros (RLG / FOG / HRG / MEMS)",
    description:
      "Non-spinning gyros — ring-laser, fibre-optic, hemispherical-resonator, MEMS — with rated drift-rate stability (1 sigma over one month) ≤ 0.5 deg/h. Captures all space-qualified RLG/FOG flight units.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Northrop Grumman LN-200, KVH DSP-1500, iXBlue Astrix series, Safran SPACENAUTE — all clear the 0.5 deg/h drift gate. Parametric capture lives in cross-walk EU:7A002.a.",
  },
  {
    code: "7A002.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Gyros specified to function above 100 g linear acceleration",
    description:
      "Gyros or angular-rate sensors specified to function at linear-acceleration levels exceeding 100 g — the sole criterion (no separate performance gate). High-g-survivable rate sensing for gun-hard / launch-shock environments.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    notes:
      "Base-corpus audit 2026-06-13: corrected from a 'spinning-mass mechanical gyros' mislabel. Official 7A002.b = gyros functioning above 100 g linear acceleration (technology-neutral).",
  },
  {
    code: "7A006",
    jurisdiction: "EU_ANNEX_I",
    title: "Airborne altimeters (non-4.2–4.4 GHz) with power management or PSK",
    description:
      "Airborne altimeters operating at frequencies other than 4.2-4.4 GHz inclusive and having either: (a) 'power management'; or (b) using phase-shift-key modulation. (There is no ±-accuracy criterion in 7A006.)",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    notes:
      "Base-corpus audit 2026-06-13: corrected the trigger — official 7A006 fires on power management OR phase-shift-key modulation (outside 4.2–4.4 GHz), NOT on an 'accuracy better than ±3%' figure (which was not in the regulation).",
  },

  // ─── 7A — MTCR-derived navigation hardware ───────────────────────

  {
    code: "7A101",
    jurisdiction: "EU_ANNEX_I",
    title: "Accelerometers for MTCR-Cat-I delivery vehicles",
    description:
      "Linear accelerometers specially designed for use in inertial navigation / guidance systems usable in rockets, missiles, or UAVs capable of MTCR Cat-I delivery (≥ 300 km range / ≥ 500 kg payload).",
    controlReasons: ["MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
    notes:
      "MTCR-driven entry — fires whenever the accelerometer is operationally suitable for delivery-vehicle guidance, even if the same part also clears 7A001 commercial gates.",
  },
  {
    code: "7A102",
    jurisdiction: "EU_ANNEX_I",
    title: "Gyros for MTCR-Cat-I delivery vehicles",
    description:
      "Gyros and angular-rate sensors specially designed for use in inertial navigation / guidance systems usable in MTCR-Cat-I delivery vehicles (≥ 300 km / ≥ 500 kg payload). Drift gate stricter than 7A002.a.",
    controlReasons: ["MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "7A104",
    jurisdiction: "EU_ANNEX_I",
    title: "Gyro-astro compasses / celestial-attitude sensors (MTCR)",
    description:
      "Gyro-astro compasses, celestial-attitude sensors, or other devices designed to derive position or orientation from celestial-body observation, specially designed for MTCR-Cat-I delivery vehicles.",
    controlReasons: ["MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "7A105",
    jurisdiction: "EU_ANNEX_I",
    title: "GNSS receivers for MTCR-Cat-I delivery vehicles",
    description:
      "GNSS receivers (GPS, Galileo, GLONASS, BeiDou) specially designed for use in MTCR-Cat-I delivery vehicles, OR operationally usable above the 600 m/s velocity / 18 km altitude COCOM-limit envelope.",
    controlReasons: ["MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
    notes:
      "The COCOM-limit envelope is the historical export-control gate around which GNSS chipset firmware is sliced. Receivers that disable above 18 km / 600 m/s are EAR-99; receivers without that lockout fire 7A105 / 7A005.",
  },
  {
    code: "7A106",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Radar / laser-radar altimeters for space launch vehicles / sounding rockets",
    description:
      "Altimeters, other than those controlled by 7A006, of radar or laser-radar type, designed or modified for use in space launch vehicles controlled by 9A004 or sounding rockets controlled by 9A104.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    mtcrCategory: "II",
    notes:
      "Base-corpus audit 2026-06-13: corrected from a 'radar altimeters for missiles / reentry guidance' mislabel. Official 7A106 cites 9A004 SLVs / 9A104 sounding rockets, not missiles.",
  },

  // ─── 7B — Test, Inspection, Production Equipment ─────────────────

  {
    code: "7B001",
    jurisdiction: "EU_ANNEX_I",
    title: "Test/inspection/production equipment for 7A nav hardware — header",
    description:
      "Header entry for test, inspection, and production equipment specially designed for the development or production of 7A001-7A006 navigation hardware — incl. accelerometer / gyro calibration rigs, centrifuges, rate tables.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Header — captures inertial-instrument calibration centrifuges, precision rate tables (Acutronic, Ideal-Aerosmith), Schuler-tuning test stands.",
  },
  {
    code: "7B001.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Production equipment for accelerometers (7A001)",
    description:
      "Production equipment specially designed for the manufacture of 7A001-controlled linear / angular accelerometers — incl. proof-mass deposition tooling, MEMS-accelerometer wafer-level packaging, hermetic-seal calibration ovens.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "7B002",
    jurisdiction: "EU_ANNEX_I",
    title: "Equipment for characterising ring-laser-gyro mirrors",
    description:
      "Equipment specially designed to characterise mirrors for ring 'laser' gyros: scatterometers measuring scatter losses ≤ 10 ppm, and profilometers measuring surfaces with accuracy ≤ 0.5 nm.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    notes:
      "Base-corpus audit 2026-06-13: narrowed from a 'characterising RLG mirrors AND aligning INS sensors' over-scope. Official 7B002 = RLG-mirror characterisation only (scatterometers/profilometers); INS alignment is not in scope.",
  },
  {
    code: "7B003",
    jurisdiction: "EU_ANNEX_I",
    title: "Equipment for the production of equipment specified in 7A",
    description:
      "Equipment specially designed for the 'production' of equipment specified in 7A — e.g. gyro tuning-test equipment, gyro motor-mass dynamic-balance machines, gyro/accelerometer alignment fixtures, fibre-optic-gyro coil-winding machines. Covers ALL of Category 7A, not only the MTCR 7A1xx items.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    mtcrCategory: "II",
    notes:
      "Base-corpus audit 2026-06-13: corrected the scope — official 7B003 = production equipment for the whole 7A family, not a MTCR-only (7A101–7A106) gate.",
  },

  // ─── 7D — Software ───────────────────────────────────────────────

  {
    code: "7D001",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for development/production of 7A nav hardware",
    description:
      "Software specially designed for the development or production of 7A001-7A006 hardware — incl. sensor-fusion design tools, Kalman-filter simulation environments, fault-detection-isolation-recovery (FDIR) modelling kits.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Header — captures MATLAB/Simulink toolbox add-ons for INS development, GNC modelling environments, sensor-driver IP code.",
  },
  {
    code: "7D002",
    jurisdiction: "EU_ANNEX_I",
    title: "Source code for use of inertial navigation equipment",
    description:
      "Source code for the operational use of inertial-navigation equipment (incl. integrated GNSS-aided INS / GPS-IMU fusion). Captures the Kalman-filter / FDIR / GNSS-INS-coupling implementation for flight code.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Source-code level capture — fires on the flight-software repo for tightly-coupled GPS/INS systems even when the executable is below performance thresholds. Critical for launch-vehicle GNC and spacecraft autonomous orbit determination.",
  },
  {
    code: "7D003",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Other navigation software (performance-improvement, hybrid, helicopter FCS)",
    description:
      "Other 'software' as follows: (a) software improving the operational performance or reducing the navigational error of systems to the levels of 7A003/7A004/7A008; (b) 'source code' for hybrid integrated systems combining a navigation heading with flight-control, Doppler/sonar/satellite/data-base-referenced-navigation data; (e) CAD 'software' for the development of helicopter active flight-control systems.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    notes:
      "Base-corpus audit 2026-06-13: corrected from a generic 'other software for use of 7A hardware' mislabel to the official 7D003 sub-scopes (performance-improvement, hybrid-system source code, helicopter-FCS CAD).",
  },
  {
    code: "7D004",
    jurisdiction: "EU_ANNEX_I",
    title: "Source code for flight-management / active-flight-control systems",
    description:
      "'Source code' incorporating 'development' 'technology' controlled by 7E004, for any of: digital flight-management systems; integrated propulsion + flight-control systems; fly-by-wire / fly-by-light systems; fault-tolerant / reconfigurable active flight-control systems; air-data systems; 3-D aircraft displays. Excludes common computer utilities.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    notes:
      "Base-corpus audit 2026-06-13: corrected from an 'INS / Kalman / FDIR / GNSS-INS source code' mislabel. Official 7D004 = source code (incorporating 7E004 technology) for flight-management / active-flight-control systems.",
  },

  // ─── 7E — Technology ─────────────────────────────────────────────

  {
    code: "7E001",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for development of 7A / 7B / 7D items",
    description:
      "Technology (per the General Technology Note) required for the development of items controlled by 7A001-7A006, 7B001-7B003, or 7D001-7D004 — incl. design notes, calibration procedures, error-budget analyses.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Deemed-export tripwire — fires when sensor-design know-how is transferred to foreign nationals / non-EU recipients (e.g. a German-Indian INS joint design review).",
  },
  {
    code: "7E002",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for production of 7A / 7B items",
    description:
      "Technology required for the production of 7A / 7B navigation hardware — incl. process know-how for RLG laser-block fabrication, FOG fibre-coil winding, MEMS-gyro die-level packaging, IMU integration procedures.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "7E003",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for repair / overhaul / refurbishment of 7A items",
    description:
      "Technology required for the repair, overhaul, or refurbishment of 7A001-7A006 navigation hardware — incl. recalibration procedures, fault-isolation troubleshooting, and component-level rework.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "7E004",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for active flight-control systems",
    description:
      "Other 'technology' for the 'development' of active flight-control systems and avionics: air-data systems, 3-D displays, electric/electro-hydrostatic actuators for primary flight control, optical-sensor flight-control arrays, database-referenced-navigation (DBRN) underwater systems; fly-by-wire / fly-by-light functional and integration technology; and helicopter multi-axis fly-by-wire / circulation-control / variable-geometry-rotor controls.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    notes:
      "Base-corpus audit 2026-06-13: corrected from a 'GNSS anti-jam / anti-spoof technology' mislabel — that is unrelated to 7E004. Official 7E004 = active-flight-control-system development technology.",
  },
  {
    code: "7E101",
    jurisdiction: "EU_ANNEX_I",
    title: "Use technology for 7A001–7A006 / 7A101–7A106 / 7B001–7B003 items",
    description:
      "Technology according to the General Technology Note for the 'use' of equipment controlled by 7A001 to 7A006, 7A101 to 7A106, 7A115 to 7A117, 7B001 to 7B003, and 7B102 to 7B103. Note the verb is 'use' (not development/production) and the scope INCLUDES the Wassenaar 7A001–7A006 baseline, not only the MTCR 7A1xx items.",
    controlReasons: ["MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF_AUDIT,
    mtcrCategory: "II",
    notes:
      "Base-corpus audit 2026-06-13: corrected from a 'dev/production/use of 7A101–7A106 (MTCR-only)' mislabel. Official 7E101 = USE technology spanning 7A001–7A006 + 7A101–7A106 + 7A115–7A117 + 7B001–7B003.",
  },
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Lookup a Cat-4 entry by code. The barrel `EU_ANNEX_I_ENTRIES` in
 * `eu-annex-i.ts` is intentionally NOT concatenated with this list —
 * operators querying "all Cat-4 entries" use this file's export
 * directly.
 */
export function findEuAnnexICat4Entry(
  code: string,
): ClassificationEntry | undefined {
  return EU_ANNEX_I_CAT4_ENTRIES.find((e) => e.code === code);
}

/**
 * Lookup a Cat-7 entry by code. Same caveat as findEuAnnexICat4Entry —
 * the canonical `EU_ANNEX_I_ENTRIES` keeps the headline Cat-7 entries
 * (7A003, 7A004, 7A005, 7A103); the extended enumeration here covers
 * the rest.
 */
export function findEuAnnexICat7Entry(
  code: string,
): ClassificationEntry | undefined {
  return EU_ANNEX_I_CAT7_ENTRIES.find((e) => e.code === code);
}

/**
 * Lookup all Cat-7 entries for a given cross-reference topic slug.
 * Useful for the gnss-receivers-imus-star-trackers cluster view.
 */
export function findEuAnnexICat7EntriesByTopic(
  slug: string,
): ClassificationEntry[] {
  return EU_ANNEX_I_CAT7_ENTRIES.filter((e) => e.crossReferenceTopic === slug);
}

/**
 * Lookup all Cat-4 entries with a given sub-category prefix
 * (e.g. "4A003" returns 4A003, 4A003.a, 4A003.b, ...).
 */
export function findEuAnnexICat4EntriesByPrefix(
  prefix: string,
): ClassificationEntry[] {
  return EU_ANNEX_I_CAT4_ENTRIES.filter(
    (e) => e.code === prefix || e.code.startsWith(`${prefix}.`),
  );
}

/**
 * Lookup all Cat-7 entries with a given sub-category prefix.
 */
export function findEuAnnexICat7EntriesByPrefix(
  prefix: string,
): ClassificationEntry[] {
  return EU_ANNEX_I_CAT7_ENTRIES.filter(
    (e) => e.code === prefix || e.code.startsWith(`${prefix}.`),
  );
}
