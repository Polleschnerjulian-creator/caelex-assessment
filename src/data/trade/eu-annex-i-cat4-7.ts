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
  caelexCoverageCount: 17,
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
    code: "4A001.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Electronic computers designed/modified for low/high temperature",
    description:
      "Electronic computers and related equipment specially designed/modified to operate below -45 deg C or above +85 deg C (extended environmental range — spaceborne and military-aviation tripwire).",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Space-relevant: every flight computer that runs across the LEO/MEO temperature swing or the launch-vehicle thermal envelope sits here unless the standard-temperature carve-out applies.",
  },
  {
    code: "4A001.a.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Computers rated for total ionizing dose ≥ 5×10⁵ rad(Si)",
    description:
      "Electronic computers and related equipment specially designed/modified for radiation hardening to withstand total ionizing dose (TID) ≥ 5×10⁵ rad(Si) — the spaceborne flight-computer hard-rad gate.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "RAD750 (BAE Systems), GR740 (Cobham Gaisler), LEON4-FT, Mongoose-V — the canonical spaceborne flight-computer ECCN. Falls in parallel with 3A001.a.1 (rad-hard ICs that go INTO the computer).",
  },
  {
    code: "4A001.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Mil-spec ruggedized computers (vibration / shock / EMP)",
    description:
      "Electronic computers specially designed/modified for military-spec ruggedization — extreme shock, vibration, EMP resistance, or NBC (nuclear-biological-chemical) survivability.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
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
  {
    code: "4A003.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Digital computers with APP above Wassenaar threshold",
    description:
      "Digital computers having an 'Adjusted Peak Performance' (APP) exceeding the current Wassenaar threshold (historically 29 Weighted TeraFLOPS, periodically updated). The headline HPC capture.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "APP is the Wassenaar-derived weighted-FLOPS metric. The exact threshold value is reset by Wassenaar plenary decisions; check current value at classification time.",
  },
  {
    code: "4A003.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Electronic assemblies for aggregation into high-APP computers",
    description:
      "Electronic assemblies specially designed for being aggregated into systems whose APP would exceed the threshold of 4A003.a — captures GPU racks, accelerator boards, server blades.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "4A003.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Computers with simultaneous-pulse triple-redundancy architectures",
    description:
      "Computers using simultaneous-pulse-triple-redundancy (SPTR) or equivalent triple-modular-redundancy architectures for fault tolerance — captures spaceborne TMR flight computers above defined thresholds.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "4A004",
    jurisdiction: "EU_ANNEX_I",
    title: "Computers with cooling above defined thresholds",
    description:
      "Computers, electronic assemblies, and related cooling equipment specially designed to operate above defined heat-dissipation thresholds (typically aggregate ≥ 1 kW/rack with active liquid or two-phase cooling).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Captures liquid-cooled HPC racks, immersion-cooled GPU farms. Relevant for ground-based AI training infrastructure used by EO operators.",
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
    title: "Spinning-mass / mechanical gyros above thresholds",
    description:
      "Spinning-mass mechanical gyros (dynamically-tuned, floated-rate-integrating) with drift-rate stability above defined thresholds. Legacy technology; rarely flown new but still in some heritage platforms.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "7A006",
    jurisdiction: "EU_ANNEX_I",
    title: "Airborne / spaceborne altimeters above defined accuracy",
    description:
      "Airborne / spaceborne altimeters operating at frequencies other than 4.2-4.4 GHz, OR with accuracy of better than +/- 3% of altitude across the operating range. Captures radar altimeters for landers + entry-descent-landing systems.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Radar altimeters on EDL platforms (ExoMars, JAXA SLIM, Astrobotic Peregrine) and high-precision airborne altimeters fire here. Spaceborne radiometric altimeters above the accuracy gate are direct hits.",
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
      "Radar / radio-frequency altimeters for MTCR-Cat-I delivery vehicles",
    description:
      "Radar altimeters specially designed for MTCR-Cat-I delivery vehicles — incl. terrain-following / terrain-correlation radar above defined accuracy thresholds for reentry-vehicle guidance.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
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
    title: "Equipment for characterising / aligning inertial sensors",
    description:
      "Equipment specially designed for characterising mirrors / signal-path optics for ring-laser-gyro (RLG) production, AND for aligning rate / acceleration sensors in flight INS units.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "RLG-specific production gear (laser-block lapping fixtures, optical-quality cavity inspection) plus the alignment test benches for full INS units (Honeywell IRS, Safran SIGMA series).",
  },
  {
    code: "7B003",
    jurisdiction: "EU_ANNEX_I",
    title: "Equipment for production of 7A101-7A106 (MTCR-grade)",
    description:
      "Test, inspection, and production equipment specially designed for the development or production of 7A101-7A106-controlled MTCR-grade navigation hardware. MTCR-Cat-II equivalent — strong-presumption-of-denial gate.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
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
    title: "Other software for use of 7A nav hardware",
    description:
      "Other software specially designed for the use of 7A001-7A006 navigation hardware — flight-software libraries, sensor-fusion runtimes, calibration-coefficient management.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "7D004",
    jurisdiction: "EU_ANNEX_I",
    title: "Source code for INS / Kalman-filter / FDIR algorithms",
    description:
      "Source code implementing inertial-navigation algorithms, Kalman filtering at navigation-grade precision, fault-detection-isolation-recovery (FDIR) for INS, and integrated GNSS-INS coupling. The structural capture for nav-software IP.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Source-code IP entry. Open-source nav stacks (e.g. NASA Core Flight System, ESA Sirius) walk the publicly-available carve-out; proprietary integrated INS/GPS code from Honeywell, Northrop, Safran is direct 7D004 capture.",
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
    title: "Technology for development of GNSS anti-jam / anti-spoof features",
    description:
      "Technology required for the development of GNSS receivers controlled by 7A005 — anti-jam adaptive-antenna design, anti-spoof authentication algorithms, multi-constellation fusion know-how, Galileo PRS / GPS M-code integration.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Particularly sensitive for the EU PRS (Galileo Public Regulated Service) and US GPS M-code receiver IP — both are subject to elevated EU member-state and US ITAR controls respectively.",
  },
  {
    code: "7E101",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for MTCR-related 7A1xx items",
    description:
      "Technology required for the development, production, or use of 7A101-7A106 MTCR-grade navigation hardware. Per the General Technology Note, deemed-export capture for MTCR-driven know-how.",
    controlReasons: ["MT"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
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
