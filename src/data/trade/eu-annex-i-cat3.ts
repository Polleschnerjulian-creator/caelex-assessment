/**
 * Sprint Z32a (Tier 4) — EU Annex I Category 3 (Electronics) full
 * enumeration.
 *
 * Category 3 covers electronic components and assemblies, test/inspection/
 * production equipment, materials, software, and technology. Every space-
 * grade flight computer, AOCS, and payload chain ultimately rides on
 * Cat-3 parts — rad-hardened ICs, FPGAs, GaN HEMTs, ASICs, AI compute,
 * atomic-frequency standards, ADCs/DACs.
 *
 * Why a separate file: `src/data/trade/eu-annex-i.ts` already ships the
 * Cat-9-focussed aerospace subset of Annex I plus selected cross-cutting
 * entries from Cat 1/3/5/6/7 — including the headline 3A001.a.1 (general
 * rad-hard ICs) and 3A504 (cryogenic cooling). Tier 4 (Z32a) extends
 * Caelex coverage to the FULL Cat-3 enumeration without mutating that
 * file (parallel agents are doing the same for Cat-5 telecom and Cat-6
 * sensors). The new entries live under `EU_ANNEX_I_CAT3_ENTRIES` and are
 * NOT folded into the canonical `EU_ANNEX_I_ENTRIES` array — that array
 * stays a curated headline set; consumers wanting deep Cat-3 reach
 * import this file directly.
 *
 * Scope:
 *   3A001 / 3A002         Hardware
 *   3A090 / 3A091 / 3A092 Advanced computing AI chips + supporting EUV
 *                         lithography (Oct 2022 IFR transposition)
 *   3A201 / 3A225 / 3A228 Nuclear-relevant electronics (cross-controlled)
 *   3A501 / 3A611         EU-autonomous Wassenaar-derived electronics
 *   3B001-3B991           Production equipment (chip-fab tooling)
 *   3C001-3C992           Materials (substrates, photoresists, dopants)
 *   3D001-3D993           Software (EDA, lithography software, control)
 *   3E001-3E994           Technology (drawings, specs, processes)
 *
 * Space-critical entries (call-outs from Z32a brief):
 *   3A001.a.2  — rad-hardened TID-tolerance (parametric cross-walk
 *                uses Z25 `radHardenedTID_krad` attribute)
 *   3A001.b.*  — ADCs/DACs above sample-rate thresholds
 *   3A001.c.*  — FPGAs (anti-fuse, SRAM, flash) above gate counts
 *   3A001.h.1  — atomic-frequency standards (GNSS payloads,
 *                long-baseline interferometry — Allan-variance gate)
 *   3A090      — AI accelerators with TPP > 4800 (Oct 2022 IFR)
 *   3A092      — EUV lithography (≤ 13.5 nm) production equipment
 *
 * Source: EUR-Lex Reg. (EU) 2021/821, Annex I, Cat 3, consolidated
 * + Delegated Reg. (EU) 2025/2003 amendments + EU transposition of
 * the US Oct-2022 advanced-computing IFR (3A090 / 3D090 / 3E090
 * mirrors).
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

export const EU_ANNEX_I_CAT3_COVERAGE: ClassificationCoverage = {
  jurisdiction: "EU_ANNEX_I",
  scope:
    "Full EU Annex I Category 3 (Electronics) enumeration — hardware (3A), test/production equipment (3B), materials (3C), software (3D), technology (3E). Includes Oct 2022 IFR AI-compute additions (3A090/3D090/3E090) and EU-autonomous 3A501/3A504/3A611 entries.",
  excluded: [
    "Non-aerospace Cat-3 specialised sub-paragraphs (e.g. 3A001.e.4 batteries for chemical/biological detectors, 3A001.b.7.b travelling-wave-tubes for ground broadcasting)",
    "Cat-3 entries already covered in eu-annex-i.ts (3A001.a.1, 3A504) are NOT duplicated here — see that file for the headline definitions",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 220,
  caelexCoverageCount: 61,
};

export const EU_ANNEX_I_CAT3_ENTRIES: ClassificationEntry[] = [
  // ═══════════════════════════════════════════════════════════════════
  // 3A — Systems, Equipment and Components
  // ═══════════════════════════════════════════════════════════════════

  // ─── 3A001.a — Integrated Circuits (general & rad-hard) ────────────
  {
    code: "3A001.a.2",
    jurisdiction: "EU_ANNEX_I",
    title: "Microprocessors with composite theoretical performance (CTP)",
    description:
      "Microprocessor microcircuits with a Composite Theoretical Performance (CTP) above the Wassenaar threshold (the historic 'CTP > 75,000 MTOPS' gate). General-purpose CPU/MCU silicon for spaceborne flight computers typically falls here when modern (post-2015) silicon process nodes are used.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "3A001.a.2 is the 'commercial-grade' microprocessor cell — rad-hard variants escalate to 3A001.a.3/a.5 or fall under 9A515.d/.e (US ECR-aligned). See parametric cross-walk EU:3A001.a.2 for the TID predicate using Z25 radHardenedTID_krad.",
  },
  {
    code: "3A001.a.3",
    jurisdiction: "EU_ANNEX_I",
    title: "Memory ICs (SRAM, DRAM, NV-RAM) above density thresholds",
    description:
      "Memory integrated circuits exceeding defined density (storage-cell-count) thresholds. Includes SRAM, DRAM, NVRAM, MRAM, PCM, ReRAM. Rad-hard spaceborne memory (e.g. 3D Plus, Cobham Gaisler, Honeywell HX series) escalates to .a.5 when SEU/TID thresholds are met.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.a.4",
    jurisdiction: "EU_ANNEX_I",
    title: "Analog-to-digital and digital-to-analog converters (ADC/DAC)",
    description:
      "ADC ICs with: (i) ≥ 8-bit resolution AND sample rate > 1.3 GSPS, OR (ii) ≥ 10-bit resolution AND sample rate > 600 MSPS, OR (iii) ≥ 12-bit resolution AND sample rate > 105 MSPS. DAC ICs at the matching settling-time × resolution thresholds. Spaceborne ADC/DAC drives EO sensor read-out and SAR digital back-ends.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Threshold pair (resolution × sample-rate) is the EU 2021/821 wording. Texas Instruments ADC12DJ5200RF, Analog Devices AD9213, and TI ADC10DV200 are common space-grade examples that exceed at least one threshold.",
  },
  {
    code: "3A001.a.5",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Microprocessors / FPGAs / memory hardened for radiation tolerance (TID/SEU)",
    description:
      "EU Annex I 3A001.a.5 — microprocessors, FPGAs, ASICs, and memory ICs RATED OR DESIGNED for total-ionizing-dose tolerance ≥ 5×10⁴ rad(Si) AND meeting at least one of: (a) SEU ≤ 1×10⁻⁸ errors/bit/day; (b) SEL-immune at LET ≥ 80 MeV·cm²/mg; (c) latch-up-immunity above defined dose-rate. Captures the European space-grade microelectronics core: STMicro BAE RAD750-class processors, Microchip ATMEGA-S64M1, Cobham GR716, NanoXplore NG-MEDIUM/NG-LARGE FPGA.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "3A001.a.5 is the dominant 'space-grade rad-hard processor / FPGA' capture entry in the EU regime. Parametric cross-walk EU:3A001.a.5 encodes the TID gate via the Z25 radHardenedTID_krad attribute; US-side analogue is 9A515.d (five-criteria conjunctive) or 9A515.e (TID-only).",
  },
  {
    code: "3A001.a.7",
    jurisdiction: "EU_ANNEX_I",
    title: "Microcontrollers and microcomputers (general MCU)",
    description:
      "Microcontroller microcircuits with embedded memory and peripherals, controlled when designed for high-temperature operation (≥ 125 °C ambient) or when supplied as part of an MTCR-controlled flight controller. Captures the embedded-MCU layer below the .a.2 microprocessor tier.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.a.10",
    jurisdiction: "EU_ANNEX_I",
    title: "Custom integrated circuits (ASICs) for spacecraft systems",
    description:
      "Application-specific integrated circuits (ASICs) specially designed for use in MTCR-relevant or spacecraft-relevant systems. Captures the standard-cell ASIC layer commonly seen in payload-dedicated signal-conditioning silicon (e.g. integrated AFEs for EO focal-plane arrays).",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.a.12",
    jurisdiction: "EU_ANNEX_I",
    title: "Programmable logic devices (FPGA, CPLD) above gate-count threshold",
    description:
      "Field-programmable gate arrays (FPGAs), complex programmable logic devices (CPLDs), and reconfigurable logic above defined gate-count thresholds (typically > 30,000 4-input LUTs or equivalent). Anti-fuse and SRAM-based FPGAs both captured. Drives spaceborne payload-processor logic, on-board AI feature pipelines, AOCS decision logic.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Microchip RTG4 (anti-fuse), Xilinx Virtex-5QV (SRAM), NanoXplore NG-LARGE all fall under 3A001.a.12 with the .a.5 rad-hard escalation typically also applying.",
  },

  // ─── 3A001.b — Discrete devices & power semiconductors ─────────────
  {
    code: "3A001.b.1",
    jurisdiction: "EU_ANNEX_I",
    title: "GaN / GaAs HEMTs (high-electron-mobility transistors)",
    description:
      "Gallium-nitride (GaN) or gallium-arsenide (GaAs) high-electron-mobility transistors (HEMTs) rated for operating frequency above defined RF thresholds, OR power-density / breakdown-voltage above thresholds. Captures the RF power-amp silicon in satellite TT&C, X/Ka-band downlink amplifiers, and active phased-array T/R modules.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "GaN HEMTs are the dominant RF power technology for modern Ka/Ku phased-arrays. UMS GaN30, Wolfspeed CGHV1J, and STMicroelectronics MMICs commonly trigger 3A001.b.1.",
  },
  {
    code: "3A001.b.3",
    jurisdiction: "EU_ANNEX_I",
    title: "Travelling-wave tubes (TWTs) above frequency threshold",
    description:
      "Travelling-wave tubes (TWTs) operating above defined RF frequency thresholds (typically > 31 GHz) OR with average power output above defined thresholds. Spaceborne TWTAs in Ka/Ku-band high-power downlink chains, deep-space high-gain transmitters, and military SATCOM payloads.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.b.4",
    jurisdiction: "EU_ANNEX_I",
    title: "Monolithic microwave integrated circuits (MMICs)",
    description:
      "Monolithic microwave integrated circuits (MMICs) — amplifiers, mixers, switches — operating above defined RF thresholds and power-add-efficiency / saturated-output-power gates. Captures the integrated RF front-end silicon used in satellite TT&C transponders and active electronically-scanned arrays (AESA).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.b.5",
    jurisdiction: "EU_ANNEX_I",
    title: "Discrete microwave transistors (FETs/BJTs) above thresholds",
    description:
      "Discrete microwave power transistors (FETs, bipolar) operating above defined frequency × power-output thresholds. Distinct from MMIC capture — covers the standalone power-stage devices used in modular satellite payload amplifier strings.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 3A001.c — Memory ──────────────────────────────────────────────
  {
    code: "3A001.c.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Programmable-logic-based memory ICs for spacecraft",
    description:
      "Programmable-logic-based memory ICs (PLD-memory hybrids, including memory blocks embedded in FPGAs above gate-count threshold) when specifically designed or rated for spaceborne use. Captures the embedded-block-RAM in NanoXplore NG-LARGE and Microchip RTG4 FPGAs at the memory side.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 3A001.d — Optoelectronic devices ───────────────────────────────
  {
    code: "3A001.d.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Optoelectronic detector arrays for spacecraft sensing",
    description:
      "Optoelectronic detector arrays (CCD, CMOS image sensors, IR focal-plane arrays, single-photon-avalanche diode arrays) above defined dark-current / quantum-efficiency / array-size thresholds. Cross-control with 6A002 for end-product spaceborne imagers. Spaceborne CMOS image sensors from CMOSIS / ams OSRAM / Teledyne e2v typically captured.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.d.3",
    jurisdiction: "EU_ANNEX_I",
    title: "Laser diodes for free-space optical communications",
    description:
      "Laser diodes operating above defined wavelength × power × beam-quality thresholds, when usable in inter-satellite or ground-to-space optical communication terminals. Cross-control with 5A001.f / AM-005 at the system level.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 3A001.e — Discrete-component devices ──────────────────────────
  {
    code: "3A001.e.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Solar cells and arrays for spaceborne power generation",
    description:
      "Solar cells (typically triple-junction GaInP/GaAs/Ge, or IMM cells) and complete solar arrays designed for spaceborne use with end-of-life efficiency ≥ 20% AND radiation-resistance above defined thresholds. Captures the dominant European satellite-PV supply (AzurSpace, Spectrolab, SolAero) for LEO/MEO/GEO platforms.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.e.2",
    jurisdiction: "EU_ANNEX_I",
    title: "High-energy density capacitors (super-/ultra-cap) for pulsed power",
    description:
      "Super-capacitors and energy-dense capacitors above defined volumetric-energy-density × pulse-discharge-rate thresholds. Captures pulsed-power conditioning capacitors in spacecraft electric-propulsion power-processor units (PPUs) and high-current launch-platform support.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 3A001.h — Frequency standards & timing ─────────────────────────
  {
    code: "3A001.h.1",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Atomic-frequency standards (rubidium, cesium, hydrogen-maser) for spaceborne PNT",
    description:
      "Atomic-frequency standards (rubidium-vapour, cesium-beam, hydrogen-maser, optical-clock) with Allan-variance ≤ 1×10⁻¹¹ at 1 s averaging time AND aging rate ≤ 1×10⁻¹¹/month, designed for spaceborne use. Captures the GNSS payload-clock segment (Galileo PHM, GPS-III RAFS, BeiDou) and long-baseline-interferometry / deep-space communications timing chains.",
    controlReasons: ["NS"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Allan-variance threshold is the headline parametric — see cross-walk EU:3A001.h.1 for the typed predicate. Spectratime PHM (Galileo IOV/FOC), Frequency Electronics Inc. RAFS (GPS-IIIF), and the new ESA-funded SAFRAN ASCAR rubidium-vapour line all fall here.",
  },
  {
    code: "3A001.h.2",
    jurisdiction: "EU_ANNEX_I",
    title: "Quartz oscillators (OCXO/TCXO) above stability thresholds",
    description:
      "Oven-controlled and temperature-compensated crystal oscillators (OCXO, TCXO) with frequency stability ≤ 1×10⁻⁹ over the operating temperature range AND aging rate ≤ 1×10⁻⁸/year. Spaceborne secondary-reference oscillators ride here when the atomic-clock thresholds (3A001.h.1) are not yet engaged.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 3A002 — Test, inspection, production equipment ────────────────
  {
    code: "3A002.a",
    jurisdiction: "EU_ANNEX_I",
    title: "RF test equipment above frequency thresholds",
    description:
      "Spectrum analysers, signal generators, network analysers, and vector signal analysers operating above defined RF frequency thresholds (typically > 31 GHz) with phase-noise / amplitude-accuracy gates. Captures the satellite-payload ground-test segment that is itself controlled even when the device-under-test is not.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A002.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Atomic-frequency standard test & measurement equipment",
    description:
      "Test equipment specifically designed for the calibration, performance test, or aging characterisation of atomic-frequency standards captured by 3A001.h.1. Captures the Allan-variance / phase-noise measurement chains used in satellite payload clock acceptance test (PAT) at ESTEC / OHB / Thales.",
    controlReasons: ["NS"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A002.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Radiation test equipment for spaceborne electronics qualification",
    description:
      "Test equipment for the radiation qualification of microelectronic devices: cobalt-60 TID sources, proton/heavy-ion accelerators rated for SEU/SEL screening, neutron sources for SET characterisation. Captures the JANUS / RADEF / TID-50 / HCI test infrastructure used by European space-grade IC vendors.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A002.g",
    jurisdiction: "EU_ANNEX_I",
    title: "Digital instrumentation (DSO, LA, AWG) above bandwidth thresholds",
    description:
      "Digital oscilloscopes, logic analysers, arbitrary waveform generators with sample rate × bandwidth above defined thresholds. Cross-controlled when used in production-test of 3A001 or 3A090 ICs.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 3A090 / 3A091 / 3A092 — Oct 2022 AI / advanced-computing IFR ───
  {
    code: "3A090.a",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Advanced-computing AI accelerators (TPP > 4800, interconnect bandwidth > 600 GB/s)",
    description:
      "EU transposition of the US Oct 2022 IFR: integrated circuits with Total Processing Performance (TPP) > 4800 OR a Performance Density above defined thresholds. Captures AI training/inference accelerators (Nvidia H100/H200/B100/B200, AMD MI300/MI325, Intel Gaudi3, Google TPU v5e/v5p). Performance metric: TPP = 2 × MacTOPS × bit-length, where MacTOPS counts dense MAC throughput across all numerical formats supported.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Originally a US-only IFR; EU members applied via national catch-all (Art. 9, Reg. 2021/821) and the Council's Dual-Use Coordination Group memo of Q1 2024. Hard-coded EU Annex I inclusion came with the 2025/2003 Delegated Reg. Spaceborne on-board-AI inference engines (Hailo-8, Coral Edge TPU, Loihi-2-class) typically fall BELOW the TPP threshold but operators should still flag — re-classification is plausible if the part is paired with high-bandwidth memory.",
  },
  {
    code: "3A090.b",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Advanced-computing AI accelerators (TPP > 1600, Performance Density > 5.92)",
    description:
      "EU transposition of the US Oct 2023 IFR amendment lowering the controlled-IC threshold: TPP > 1600 AND Performance Density (TPP / die-area) > 5.92 TPP/mm². Captures the 'middle-tier' AI accelerator segment (smaller variants of H100, mid-range Tenstorrent / Groq parts) that fell out of 3A090.a's compute-only threshold.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A091",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Inspection equipment for advanced-computing integrated circuits (Oct 2022 IFR)",
    description:
      "Inspection, metrology, and test equipment specially designed for the production-line characterisation of 3A090 advanced-computing ICs: high-resolution e-beam inspection, atomic-force-microscopy metrology, EUV-mask defect-inspection. Cross-control with 3B001 lithography production equipment.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A092",
    jurisdiction: "EU_ANNEX_I",
    title: "EUV lithography equipment and components for sub-7-nm fabrication",
    description:
      "Extreme-ultraviolet (EUV) lithography exposure systems (typically operating at 13.5 nm wavelength) and specially-designed sub-components (mirrors, masks, sources, mask handling). ASML NXE:3400, NXE:3600D, EXE:5000 (High-NA) systems all captured. The dominant production tool for sub-7-nm logic and DRAM nodes that underpin the 3A090 AI-accelerator supply chain.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Politically the highest-stakes item in EU Annex I Cat-3. The Netherlands had to negotiate a special export-licence régime with the US (Wassenaar+) for ASML EUV exports to China. EU-internal use is not licence-controlled; extra-EU export is.",
  },

  // ─── 3A201 / 3A225 / 3A228 — Nuclear-relevant electronics ───────────
  {
    code: "3A201.a",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Nuclear-relevant high-voltage DC capacitors (energy ≥ 1.6 µF × 5 kV)",
    description:
      "DC capacitors with capacitance × voltage² product ≥ 6.4 J AND voltage ≥ 5 kV AND service-life > 10 charge/discharge cycles per second. NSG-derived control transposed into EU Annex I. Aerospace nexus: legacy pulsed-power upper-stage ignition systems and some non-EU electric-propulsion PPU designs.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A225",
    jurisdiction: "EU_ANNEX_I",
    title: "Frequency changers / inverters for centrifuge applications",
    description:
      "Frequency changers / inverters with multiphase output, output power ≥ 40 VA at frequency ≥ 600 Hz, AND total harmonic distortion ≤ 10%. Primary control rationale: gas-centrifuge enrichment (NSG-derived). Aerospace nexus is thin but non-zero — some launch-platform ground support equipment intersects.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A228",
    jurisdiction: "EU_ANNEX_I",
    title: "Pulse-power switches & high-current pulse generators (NSG-derived)",
    description:
      "Cold-cathode tubes, krytrons, sprytrons, triggered spark gaps, and complete high-current pulse generators (peak current ≥ 100 kA, rise time ≤ 1 µs). NSG nuclear-weapon-detonator-precursor control rationale. Caelex flags for screening completeness; aerospace cross-control is minimal.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 3A501 / 3A611 — EU-autonomous Wassenaar-derived ────────────────
  {
    code: "3A501",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Cyber-surveillance integrated circuits & telecommunications equipment",
    description:
      "EU Annex I 3A501 — integrated circuits and telecommunications equipment specially designed for the interception or analysis of telecommunications traffic. EU-autonomous control (Wassenaar Cat-5-derived but with broader scope). Predominantly cyber-surveillance — aerospace cross-control is rare but possible when satellite-based interception payloads are involved.",
    controlReasons: ["NS", "HR"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A611",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Specially-designed electronics for military and military-aerospace use",
    description:
      "Electronic equipment and components specially designed for military use, including military-grade variants of items otherwise captured under 3A001. Captures the mil-spec / mil-aerospace electronics tier (anti-tamper-coated processors, military secure-boot ROMs, MIL-STD-1553B bus controllers). Cross-control with USML XI(c) for the strictly military variants.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3B — Test, Inspection and Production Equipment
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "3B001.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Semiconductor manufacturing equipment — deposition (CVD, PVD, ALD)",
    description:
      "Equipment for chemical-vapour-deposition (CVD), physical-vapour-deposition (PVD), atomic-layer-deposition (ALD) for semiconductor wafer processing above defined wafer-throughput / film-uniformity / process-temperature thresholds. Applied Materials Endura, Lam Research ALTUS, ASM PE-ALD systems all captured.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3B001.c",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Semiconductor lithography equipment (DUV ArF, immersion ArF, EUV pre-7-nm)",
    description:
      "Deep-ultraviolet (DUV) and immersion DUV lithography exposure systems with critical-dimension capability above defined nm thresholds. Captures the ArF-immersion segment (ASML NXT:2050/2100i) that underpins production of 28/14/7 nm logic and DRAM. EUV systems sit one step higher in 3A092.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3B001.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Semiconductor etch equipment (RIE, ICP, ALE)",
    description:
      "Plasma etch equipment for semiconductor wafer processing: reactive-ion etch (RIE), inductively-coupled-plasma (ICP), atomic-layer-etch (ALE) above wafer-throughput × selectivity × CD-uniformity thresholds. Lam Research Kiyo, Tokyo Electron Tactras, Applied Materials Sym3 systems captured.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3B001.e",
    jurisdiction: "EU_ANNEX_I",
    title: "Wafer ion-implantation equipment (medium- and high-energy)",
    description:
      "Ion-implantation equipment for semiconductor wafer processing above defined beam-current × beam-energy × dose-uniformity thresholds. Captures the dopant-introduction step common to all advanced-node logic and analog parts. Axcelis Purion, Applied Materials VIISta systems.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3B001.h",
    jurisdiction: "EU_ANNEX_I",
    title: "Wafer-bonding and 3D-stacking equipment",
    description:
      "Direct wafer-bonding, hybrid-bonding, through-silicon-via (TSV) assembly equipment for 3D-stacked memory and logic. Captures the HBM (high-bandwidth-memory) stack assembly chain and the chiplet-bonding tooling that underpins modern AI-accelerator packages.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3B002",
    jurisdiction: "EU_ANNEX_I",
    title: "Test equipment for semiconductor wafer/die characterisation",
    description:
      "Probe stations, parametric test systems, and automated test equipment (ATE) for wafer/die-level electrical characterisation above defined throughput × accuracy thresholds. Captures Teradyne, Advantest, Tokyo Electron ATE in the production test step.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3B991",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Non-specially-designed semiconductor production equipment (catch-all)",
    description:
      "Semiconductor manufacturing equipment not specifically captured by 3B001/3B002 but still rising to anti-terrorism control. Catch-all entry — operators should consult BAFA when the primary 3B001/.d sub-classifications fail to fit.",
    controlReasons: ["AT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3C — Materials
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "3C001",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Hetero-epitaxial semiconductor substrates (Si, GaAs, GaN, SiC, InP)",
    description:
      "Hetero-epitaxial semiconductor wafers / substrates (Silicon-on-Insulator, GaAs-on-Si, GaN-on-Si, GaN-on-SiC, InP, diamond) above defined diameter × layer-thickness × defect-density thresholds. Captures the front-end substrate supply for RF power amplifiers (GaN-on-SiC) and high-speed digital (SOI).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3C002",
    jurisdiction: "EU_ANNEX_I",
    title: "Photoresists for advanced-node lithography",
    description:
      "Positive-tone and negative-tone photoresists specifically formulated for ArF (193 nm) or EUV (13.5 nm) lithography above defined resolution × line-edge-roughness thresholds. JSR, Tokyo Ohka Kogyo, Shin-Etsu, Sumitomo Chemical EUV resists captured.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3C003",
    jurisdiction: "EU_ANNEX_I",
    title: "Organo-metallic compounds for MOCVD epitaxy",
    description:
      "Organo-metallic precursor compounds (trimethylgallium, trimethylindium, trimethylaluminium and analogues) used in metal-organic chemical-vapour-deposition (MOCVD) epitaxy for III-V semiconductor production. Captures the precursor supply for HEMT and laser-diode fabrication.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3C004",
    jurisdiction: "EU_ANNEX_I",
    title: "Phosphorus, arsenic, antimony hydride dopant gases",
    description:
      "High-purity gaseous dopant compounds (phosphine PH₃, arsine AsH₃, stibine SbH₃) above defined purity thresholds for use in semiconductor doping. NSG-controlled (centrifuge applications) AND aerospace-relevant for HBT/HEMT fabrication.",
    controlReasons: ["NS", "NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3C005",
    jurisdiction: "EU_ANNEX_I",
    title: "Silicon-carbide (SiC) substrates for power semiconductors",
    description:
      "Silicon-carbide (SiC) substrates above defined diameter (typically ≥ 150 mm) and micropipe-density thresholds. Captures the SiC supply for high-power discrete power transistors used in spaceborne power-conditioning units (PCUs) and electric-propulsion PPUs.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3C006",
    jurisdiction: "EU_ANNEX_I",
    title: "GaN-on-SiC substrates for RF power applications",
    description:
      "Gallium-nitride (GaN) epitaxial layers on silicon-carbide (SiC) substrates above defined epi-thickness × surface-defect-density thresholds. Captures the dominant RF-power-amp substrate for Ka/Ku-band phased-array T/R modules (Wolfspeed, IQE, UMS supply chain).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3D — Software
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "3D001",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for development of 3A001-3A002 items",
    description:
      "EU Annex I 3D001 — software specially designed for the development of items in 3A001 (ICs) or 3A002 (test/production equipment). Captures the EDA (electronic design automation) tools: Cadence Virtuoso/Genus, Synopsys IC Compiler/PrimeTime, Siemens Calibre, and the device-modelling / TCAD code suites.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "EDA tools sit at the heart of the controlled tech surface — deemed-export to non-EU nationals at EU sites is the dominant compliance risk for European silicon-design houses.",
  },
  {
    code: "3D002",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Software for the use of equipment in 3B001 (semiconductor production)",
    description:
      "EU Annex I 3D002 — software specially designed for the operation of 3B001 deposition / lithography / etch / implant equipment. Captures the recipe-execution layer that ships with the production tool itself (ASML TWINSCAN control software, Lam Research Equipment Front End Module software).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3D003",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Physics-based simulation software for IC design (TCAD, device modelling)",
    description:
      "EU Annex I 3D003 — physics-based device-modelling and TCAD (technology-computer-aided-design) simulation software for semiconductor device development. Synopsys Sentaurus, Silvaco Atlas, Crosslight APSYS captured.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3D004",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for operation of 3B002 IC test equipment",
    description:
      "EU Annex I 3D004 — software specially designed for the operation of 3B002 IC test equipment (ATE). Captures the test-program-generation and test-pattern libraries used in production-line and characterisation test of advanced-node parts.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3D090",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Software for development of advanced-computing ICs (3A090 companion)",
    description:
      "EU Annex I 3D090 — software specially designed for the development or production of 3A090 advanced-computing AI accelerator ICs. Captures compiler toolchains (CUDA Toolkit, ROCm, OpenAI Triton), AI-accelerator microarchitecture simulators, and hyperparameter-tuned silicon-validation suites. Oct 2022 IFR transposition.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3D101",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for MTCR-controlled electronics (3A001 missile use)",
    description:
      "EU Annex I 3D101 — software for the use of items in 3A001 when those items are usable in MTCR-relevant rocket systems or unmanned air vehicles. Includes flight-software toolchains for missile-grade flight controllers and radiation-test analysis software for screening MTCR-applicable parts.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "3D991",
    jurisdiction: "EU_ANNEX_I",
    title: "Catch-all software for 3A/3B items below specific thresholds",
    description:
      "EU Annex I 3D991 — software for the development, production, or use of 3A/3B items not specifically captured at the .001-.005 thresholds. Anti-terrorism control rationale; lower license-friction than 3D001 in most operator workflows.",
    controlReasons: ["AT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3E — Technology
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "3E001",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Technology for development or production of 3A001-3A002 / 3B001-3B002 items",
    description:
      "EU Annex I 3E001 — technology, per the General Technology Note, for the development or production of items in 3A001-3A002 (electronic components, test/production equipment) or 3B001-3B002 (semiconductor production tooling). Captures the dominant deemed-export trigger for European silicon-design houses and fab operators — IP transfer (drawings, masks, process specs, training) to non-EU nationals is in scope.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "3E001 is the workhorse Cat-3 deemed-export trigger. Every supplier datasheet shared with a non-EU engineer, every process-spec PDF emailed to a non-EU joint-venture partner, every design-review presentation to a non-EU customer falls within scope. Internal-controls programmes (ICP) under BAFA Merkblatt 2021/1 are the primary mitigation.",
  },
  {
    code: "3E002",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Technology for development of specially-designed multi-chip integrated circuits",
    description:
      "EU Annex I 3E002 — technology specifically for the development of multi-chip integrated circuits (chiplets, HBM stacks, package-on-package, 3D wafer stacks) above defined integration thresholds. Captures the advanced-packaging IP that underpins modern AI-accelerator and high-end MCU production.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3E003",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Specific aerospace-electronics technology (rad-hardening, SEU mitigation)",
    description:
      "EU Annex I 3E003 — specific technology for radiation-hardening IC design, SEU/SEL mitigation techniques (TMR triple-modular-redundancy, EDAC error-detection-and-correction, latch-up-protection circuitry), and spaceborne IC qualification. The EU pendant to MIL-PRF-38535 / MIL-STD-883 class-S testing know-how.",
    controlReasons: ["NS", "MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3E090",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for advanced-computing IC development (3A090 companion)",
    description:
      "EU Annex I 3E090 — technology for the development or production of 3A090 advanced-computing AI accelerator ICs. Captures the architectural know-how (custom matrix-multiply units, sparse-tensor engines, novel HBM controllers), the lithography-process IP for sub-7-nm nodes, and the training know-how for the AI-microarchitecture validation team. Oct 2022 IFR transposition with EU-autonomous expansion in 2025/2003.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3E101",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for MTCR-relevant electronics (3A001 missile use)",
    description:
      "EU Annex I 3E101 — technology for the development, production, or use of 3A001 items when usable in MTCR-relevant rocket systems or unmanned air vehicles. Captures the rad-hard / mil-spec design know-how applied to missile-grade flight controllers. MTCR Item 16.E.1 transposition.",
    controlReasons: ["MT"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
  },
  {
    code: "3E201",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for nuclear-relevant electronics (3A201/.a)",
    description:
      "EU Annex I 3E201 — technology for the development or production of 3A201 nuclear-relevant electronics (high-voltage DC capacitors and analogues). NSG-derived; aerospace cross-control is thin.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3E991",
    jurisdiction: "EU_ANNEX_I",
    title: "Catch-all technology for 3A/3B items below specific thresholds",
    description:
      "EU Annex I 3E991 — technology for the development, production, or use of 3A/3B items not captured at the .001-.005 thresholds. Anti-terrorism control rationale. Catch-all entry — operators with electronics-technology transfers to non-EU recipients should consult BAFA when the primary 3E001-3E003 sub-classifications fail to fit.",
    controlReasons: ["AT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ═══════════════════════════════════════════════════════════════════
  // EU-autonomous AM-prefix Cat-3 additions (Delegated Reg. 2025/2003)
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "AM-3A-001",
    jurisdiction: "EU_ANNEX_I",
    title:
      "On-board AI neural-network accelerators for spaceborne edge inference (EU-autonomous)",
    description:
      "EU Annex I AM-3A-001 — neural-network accelerator integrated circuits specially designed or rated for spaceborne on-board AI inference, with TPP > 800 OR die-area-normalised throughput above defined thresholds. Captures the on-board-edge-compute generation between commercial NPUs (Coral, Hailo) and the 3A090 advanced-computing tier. EU-autonomous entry (Delegated Reg. 2025/2003).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
    notes:
      "AM-3A-001 is the EU's forward-looking entry for on-board-AI spaceborne payloads — distinct from the 3A090 advanced-computing tier in two ways: (1) lower TPP threshold (800 vs 4800), and (2) explicit spaceborne-rating requirement. Drafted in anticipation of the on-board EO/IR inference generation captured by AM-007 at the system level.",
  },
  {
    code: "AM-3A-002",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Quantum-key-distribution receiver hardware for spaceborne secure-comms (EU-autonomous)",
    description:
      "EU Annex I AM-3A-002 — single-photon-detector arrays, polarisation analysers, and quantum-state-preparation hardware specifically designed for spaceborne quantum-key-distribution (QKD) receivers / transmitters. Captures the EuroQCI / SAGA / NESS-class QKD payload hardware supply. EU-autonomous entry (Delegated Reg. 2025/2003).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
  },
  {
    code: "AM-3A-003",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical-clock atomic standards for spaceborne PNT (EU-autonomous)",
    description:
      "EU Annex I AM-3A-003 — optical atomic clocks (Sr-87 lattice, Yb-171 ion, neutral-atom variants) specially designed for spaceborne use, with Allan-variance ≤ 1×10⁻¹⁵ at 1 s averaging time. Next-generation PNT-payload supply (anticipated for Galileo G2 second-generation and ESA in-orbit demonstrator). EU-autonomous entry (Delegated Reg. 2025/2003) supplementing the 3A001.h.1 atomic-clock control.",
    controlReasons: ["NS"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_DELEG_2025_2003,
    asOfDate: ASOF,
    notes:
      "Optical-clock TRL is still ≤ 5 for spaceborne hardware (2026), but the EU drafted AM-3A-003 to lock in the controls before the technology matures into commercial supply. Cross-reference with 3A001.h.1 — the rubidium/cesium/H-maser tier remains under Wassenaar Cat-3, while optical clocks now sit under EU-autonomous AM-3A-003.",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Lookup by code within the Cat-3 enumeration. Returns undefined when
 * the code is not in this file. Callers wanting full EU Annex I reach
 * (Cat-3 + the Cat-9 headline set) should consult both
 * `findEuAnnexIEntry` (eu-annex-i.ts) and this helper.
 */
export function findEuAnnexICat3Entry(
  code: string,
): ClassificationEntry | undefined {
  return EU_ANNEX_I_CAT3_ENTRIES.find((e) => e.code === code);
}

/**
 * Lookup all Cat-3 entries for a given cross-reference topic slug.
 */
export function findEuAnnexICat3EntriesByTopic(
  slug: string,
): ClassificationEntry[] {
  return EU_ANNEX_I_CAT3_ENTRIES.filter((e) => e.crossReferenceTopic === slug);
}
