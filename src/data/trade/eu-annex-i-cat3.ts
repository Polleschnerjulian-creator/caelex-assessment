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
 *   3A090                 Advanced-computing AI chips (Oct 2022 IFR
 *                         transposition; EUV litho tooling is 3B001.f)
 *   3A201 / 3A225 / 3A228 Nuclear-relevant electronics (cross-controlled)
 *   3A501                 EU-autonomous quantum/cryogenic electronics
 *                         (2025 Annex I update)
 *   3B001 / 3B002         Production equipment (chip-fab tooling)
 *   3C001-3C006           Materials (substrates, photoresists, dopants)
 *   3D001-3D101           Software (EDA, lithography software, control)
 *   3E001-3E201           Technology (drawings, specs, processes)
 *
 * Space-critical entries (re-verified vs current 02021R0821, 2026-06-13):
 *   3A001.a.1  — radiation-hardened ICs (headline entry lives in
 *                eu-annex-i.ts; parametric gate EU:3A001.a.1 uses the
 *                Z25 `radHardenedTID_krad` attribute)
 *   3A001.a.5  — ADCs/DACs above resolution × sample-rate thresholds
 *   3A001.a.7  — FPGAs/CPLDs (> 700 single-ended I/O or ≥ 500 Gb/s)
 *   3A002.g    — atomic-frequency standards (GNSS payloads,
 *                long-baseline interferometry — Allan-variance gate)
 *   3A090      — AI accelerators with TPP > 4800 (Oct 2022 IFR)
 *   3B001.f    — DUV/EUV lithography (≤ 13.5 nm) production equipment
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
const ASOF = "2026-06-13";

export const EU_ANNEX_I_CAT3_COVERAGE: ClassificationCoverage = {
  jurisdiction: "EU_ANNEX_I",
  scope:
    "Full EU Annex I Category 3 (Electronics) enumeration — hardware (3A), test/production equipment (3B), materials (3C), software (3D), technology (3E). Includes Oct 2022 IFR AI-compute additions (3A090/3D090/3E090) and EU-autonomous 3A501/3A504/3A611 entries.",
  excluded: [
    "Officially 'not used' Annex I sub-paragraphs (e.g. 3A001.a.4, 3B001.c, 3B001.d) and US-only catch-all/600-series codes (3A611, 3B991, 3D991, 3E991) are deliberately NOT modelled — they carry no EU control",
    "Cat-3 entries already covered in eu-annex-i.ts (3A001.a.1 radiation-hardened ICs, 3A504) are NOT duplicated here — see that file for the headline definitions",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 220,
  caelexCoverageCount: 51,
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
    title: "Compound-semiconductor microprocessor / MCU ICs above 40 MHz",
    description:
      "EU Annex I 3A001.a.3 — 'microprocessor microcircuits', 'micro-computer microcircuits' and microcontroller microcircuits manufactured from a compound semiconductor and operating at a clock frequency exceeding 40 MHz. The compound-semiconductor process (GaAs / SiGe / InP etc.), not silicon storage density, is the control trigger; relevant to high-speed spaceborne signal-processing front-ends.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.a.5",
    jurisdiction: "EU_ANNEX_I",
    title: "Analogue-to-digital and digital-to-analogue converters (ADC/DAC)",
    description:
      "EU Annex I 3A001.a.5 — analogue-to-digital converter ICs with a resolution × sample-rate above: 8–10 bit > 1.3 GSPS; 10–12 bit > 600 MSPS; 12–14 bit > 400 MSPS; 14–16 bit > 250 MSPS; ≥ 16 bit > 65 MSPS. Includes digital-to-analogue converters with settling time < 9 ns OR spurious-free dynamic range > 68 dBc, and ICs integrating an ADC/DAC with on-chip storage or processing (3A001.a.14). Spaceborne ADC/DAC drives EO sensor read-out and SAR digital back-ends.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Radiation-hardened ICs are a SEPARATE control at 3A001.a.1 (modelled in eu-annex-i.ts, cross-walk EU:3A001.a.1) — they are NOT 3A001.a.5. Texas Instruments ADC12DJ5200RF, Analog Devices AD9213, and TI ADC10DV200 are common space-grade ADCs that exceed at least one threshold.",
  },
  {
    code: "3A001.a.7",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Field-programmable logic devices (FPGA / CPLD) above I/O or data-rate",
    description:
      "EU Annex I 3A001.a.7 — field-programmable logic devices having either more than 700 single-ended digital input/outputs, OR an aggregate one-way serial transceiver data rate of 500 Gb/s or more. Captures the large reconfigurable-logic parts (FPGAs, CPLDs) that drive spaceborne payload-processor logic, on-board AI feature pipelines and AOCS decision logic. Microchip RTG4, Xilinx Virtex-5QV and NanoXplore NG-LARGE typically fall here.",
    controlReasons: ["NS"],
    crossReferenceTopic: "spacecraft-rad-hard-electronics",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.a.10",
    jurisdiction: "EU_ANNEX_I",
    title: "Custom integrated circuits of unknown function",
    description:
      "EU Annex I 3A001.a.10 — integrated circuits for which either the function is unknown, OR the control status of the equipment in which they will be used is unknown to the manufacturer, having any of: more than 1 500 terminals; a typical 'basic gate propagation delay time' of less than 0,02 ns; or an operating frequency exceeding 3 GHz. The unknown-function / unknown-end-use catch keeps high-pin-count custom silicon in scope when the datasheet does not resolve classification.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.a.12",
    jurisdiction: "EU_ANNEX_I",
    title: "Fast Fourier Transform (FFT) processor ICs",
    description:
      "EU Annex I 3A001.a.12 — 'Fast Fourier Transform (FFT) processors' having a rated execution time for an N-point complex FFT of less than (N log₂ N) / 20 480 ms (i.e. faster than the listed throughput). Captures dedicated spectral-transform silicon used in SAR back-ends, spectrum-monitoring payloads and on-board signal-intelligence processing chains.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 3A001.b — Discrete devices & power semiconductors ─────────────
  {
    code: "3A001.b.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Vacuum electronic devices / travelling-wave tubes above 31.8 GHz",
    description:
      "EU Annex I 3A001.b.1 — vacuum electronic devices and cathodes: travelling-wave tubes/devices operating above 31.8 GHz, OR with cathode turn-on < 3 s, coupled-cavity tubes with > 7% instantaneous bandwidth or > 2.5 kW peak power, helix / folded-waveguide / serpentine tubes with > 1-octave instantaneous bandwidth and (average power × frequency) > 0.5, space-qualified or gridded-gun tubes, and crossed-field amplifiers with gain > 17 dB. The RF-power-source layer for Ka/Ku-band high-power downlink and deep-space transmitters.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Vacuum electronic devices (TWTs) remain the dominant high-power RF source above 31.8 GHz where solid-state amplifiers cannot reach the power × frequency product. Discrete GaN/GaAs transistors are controlled separately under 3A001.b.3.",
  },
  {
    code: "3A001.b.3",
    jurisdiction: "EU_ANNEX_I",
    title: "Discrete microwave transistors above frequency × power thresholds",
    description:
      "EU Annex I 3A001.b.3 — discrete microwave transistors (including GaN and GaAs HEMTs and bipolar devices) rated for operation above frequency-banded peak-power thresholds (e.g. > 400 W at 2.7–2.9 GHz, > 60 W at 3.7–6.8 GHz, > 7 W at 16–31.8 GHz, descending into the sub-watt range above 43.5 GHz). Captures the standalone RF power-stage devices used in satellite TT&C and modular payload amplifier strings; GaN HEMTs (Wolfspeed CGHV1J, UMS GaN30) are the dominant modern technology.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.b.4",
    jurisdiction: "EU_ANNEX_I",
    title: "Microwave solid-state amplifiers, assemblies and modules",
    description:
      "EU Annex I 3A001.b.4 — microwave solid-state power amplifiers, and assemblies or modules containing them, rated above frequency-banded peak-power × fractional-bandwidth thresholds (e.g. > 500 W with > 15% bandwidth at 2.7–2.9 GHz, > 90 W at 3.7–6.8 GHz, descending to the milliwatt range above 75 GHz). Captures MMIC-based amplifier modules and T/R assemblies used in satellite transponders and active electronically-scanned arrays (AESA). Bare-die MMIC amplifiers fall under 3A001.b.2.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.b.5",
    jurisdiction: "EU_ANNEX_I",
    title: "Electronically or magnetically tunable bandpass / bandstop filters",
    description:
      "EU Annex I 3A001.b.5 — electronically or magnetically tunable filters having more than 5 tunable resonators capable of tuning across a 1.5:1 frequency band in less than 10 µs, with either a bandpass greater than 0.5% of centre frequency OR a bandstop less than 0.5% of centre frequency. Captures the agile pre-select / channelising filters used in wideband SIGINT and frequency-agile satellite receivers.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 3A001.c — Acoustic wave devices ───────────────────────────────
  {
    code: "3A001.c.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Surface / surface-skimming acoustic wave devices",
    description:
      "EU Annex I 3A001.c.1 — surface-acoustic-wave and surface-skimming (shallow bulk) acoustic-wave devices having either a carrier frequency exceeding 6 GHz, or (1–6 GHz) sidelobe rejection > 65 dB / bandwidth > 250 MHz / dispersive delay > 10 µs / (max delay × bandwidth) > 100, or the equivalent delay-bandwidth products at ≤ 1 GHz. SAW filters and delay-lines used in agile satellite-receiver IF chains and radar pulse compression.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 3A001.d — Superconductive electronic devices ──────────────────
  {
    code: "3A001.d.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Superconductive digital circuits",
    description:
      "EU Annex I 3A001.d.1 — superconductive electronic devices that switch current using superconductive gates with a product of delay time per gate (s) × power dissipation per gate (W) of less than 10⁻¹⁴ J. Rapid-single-flux-quantum (RSFQ) and adiabatic superconductive logic used in cryogenic high-speed / low-power computing and quantum-control electronics. (Optoelectronic detector arrays and laser diodes are NOT 3A001.d — they are controlled under Cat 6, 6A002 / 6A005.)",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.d.2",
    jurisdiction: "EU_ANNEX_I",
    title: "Superconductive resonant / frequency-selection circuits",
    description:
      "EU Annex I 3A001.d.2 — superconductive electronic devices for frequency selection that use resonant circuits with a Q-value (quality factor) exceeding 10 000. High-Q superconductive filters for low-noise cryogenic receiver front-ends and precision-timing distribution.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 3A001.e — High-energy storage devices & power sources ─────────
  {
    code: "3A001.e.1",
    jurisdiction: "EU_ANNEX_I",
    title: "High-energy primary and secondary battery cells",
    description:
      "EU Annex I 3A001.e.1 — battery cells: primary cells with an energy density exceeding 550 Wh/kg (and continuous power density > 50 W/kg) OR exceeding 50 Wh/kg with continuous power density > 350 W/kg; and secondary cells with an energy density exceeding 350 Wh/kg, all measured at 20 °C. Captures high-specific-energy electrochemical cells for spacecraft and high-endurance UAV power systems. (Space-qualified solar cells/arrays are a separate control at 3A001.e.4.)",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.e.2",
    jurisdiction: "EU_ANNEX_I",
    title: "High-energy storage capacitors for pulsed power",
    description:
      "EU Annex I 3A001.e.2 — energy-storage capacitors: single-shot (repetition rate < 10 Hz) with voltage rating ≥ 5 kV, energy density ≥ 250 J/kg and total energy ≥ 25 kJ; OR repetition-rated (≥ 10 Hz) with voltage rating ≥ 5 kV, energy density ≥ 50 J/kg, total energy ≥ 100 J and ≥ 10 000 charge/discharge cycles. Pulsed-power conditioning for spacecraft electric-propulsion power-processor units (PPUs) and launch-platform support.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A001.e.4",
    jurisdiction: "EU_ANNEX_I",
    title: "Space-qualified solar cells and arrays",
    description:
      "EU Annex I 3A001.e.4 — space-qualified solar cells, cover-glass-interconnected-cells (CIC) and panels with a minimum average efficiency exceeding 20% at an operating temperature of 28 °C (301 K) under AM0 illumination (1 367 W/m²). The dominant European satellite-PV supply (AzurSpace, Spectrolab, SolAero) for LEO/MEO/GEO platforms.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 3A001.h — Power semiconductor switches ────────────────────────
  {
    code: "3A001.h",
    jurisdiction: "EU_ANNEX_I",
    title: "High-temperature power semiconductor switches, diodes and modules",
    description:
      "EU Annex I 3A001.h — power switches, diodes or modules having all of: a maximum junction-temperature rating exceeding 488 K (215 °C); a repetitive peak off-state (blocking) voltage exceeding 300 V; and a continuous current exceeding 1 A. Wide-bandgap (SiC / GaN) high-temperature power devices for spacecraft power-conditioning units and electric-propulsion PPUs. (Atomic-frequency standards are controlled at 3A002.g, not 3A001.h.)",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 3A002 — Test, inspection, production equipment ────────────────
  {
    code: "3A002.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Recording equipment and real-time oscilloscopes",
    description:
      "EU Annex I 3A002.a — recording equipment and specially designed test equipment therefor: instrumentation magnetic-tape recorders (> 4 MHz bandwidth), digital instrumentation data recorders / digital video recorders (> 360 Mbit/s sustained transfer rate), and real-time oscilloscopes (3A002.a.7) above defined sample-rate × bandwidth thresholds. The payload-test instrumentation layer that is itself controlled even when the device-under-test is not.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A002.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Signal analysers above 31.8 GHz",
    description:
      "EU Annex I 3A002.c — signal analysers (including spectrum and vector-signal analysers) having a 3 dB resolution bandwidth exceeding 10 MHz anywhere above 31.8 GHz, OR meeting the specified displayed-average-noise-level / real-time analysis-bandwidth thresholds. The wideband payload and SIGINT measurement segment.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A002.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Signal generators above frequency / phase-noise thresholds",
    description:
      "EU Annex I 3A002.d — signal generators producing output frequencies above defined thresholds with pulse-modulation, output-power, frequency-switching-time and single-sideband phase-noise specifications (e.g. frequency switching < 100 µs, or SSB phase noise better than the listed mask). The synthesised-source side of satellite-payload and radar test benches.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3A002.g",
    jurisdiction: "EU_ANNEX_I",
    title: "Atomic frequency standards (Rb / Cs / H-maser) for spaceborne PNT",
    description:
      "EU Annex I 3A002.g — atomic frequency standards: non-space-qualified units meeting the stability thresholds, OR space-qualified caesium-beam, rubidium-vapour, hydrogen-maser or other atomic clocks with a long-term aging (drift) better than 1×10⁻¹¹/month. Captures the GNSS payload-clock segment (Galileo PHM, GPS-IIIF RAFS, BeiDou) and long-baseline-interferometry / deep-space timing chains.",
    controlReasons: ["NS"],
    crossReferenceTopic: "gnss-receivers-imus-star-trackers",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Atomic-frequency standards live at 3A002.g — they were previously mis-modelled at 3A001.h.1 (3A001.h is power semiconductor switches). Cross-walk gate is EU:3A002.g; Spectratime PHM (Galileo IOV/FOC) and Frequency Electronics RAFS (GPS-IIIF) fall here.",
  },

  // ─── 3A090 — Oct 2022 AI / advanced-computing IFR ──────────────────
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
  // ─── 3A201 / 3A225 / 3A228 — Nuclear-relevant electronics ───────────
  {
    code: "3A201.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Nuclear-relevant pulse-discharge capacitors",
    description:
      "EU Annex I 3A201.a — capacitors with either: (i) a voltage rating greater than 1.4 kV, energy storage greater than 10 J, capacitance greater than 0.5 µF and series inductance less than 50 nH; OR (ii) a voltage rating greater than 750 V, capacitance greater than 0.25 µF and series inductance less than 10 nH. NSG-derived pulse-discharge control (nuclear-weapon firing-set precursor). Aerospace nexus: legacy pulsed-power upper-stage ignition and some non-EU electric-propulsion PPU designs.",
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

  // ─── 3A501 — EU-autonomous quantum / cryogenic electronics ─────────
  {
    code: "3A501",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Cryogenic CMOS control ICs and parametric (quantum-limited) amplifiers",
    description:
      "EU Annex I 3A501 — EU-autonomous control added by the 2025 Annex I update (Delegated Regulation of 8 September 2025) on quantum-enabling electronics: integrated circuits designed to operate at cryogenic temperatures (cryogenic-CMOS qubit-control chips placed at 1–5 K and directly connected to qubits), and parametric / quantum-limited signal amplifiers (Josephson and travelling-wave parametric amplifiers) used to read out superconducting and spin qubits. Companion to the 2025 cryogenic-cooling-system and cryogenic-wafer-prober controls.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Previously mis-modelled as 'cyber-surveillance ICs'. The EU's cyber-surveillance interception controls live in Cat 5 (e.g. 5A001.j IP-network surveillance), not 3A501 — which is a 2025 quantum/cryogenic addition.",
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3B — Test, Inspection and Production Equipment
  // ═══════════════════════════════════════════════════════════════════
  {
    code: "3B001.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Epitaxial growth equipment (MOCVD / MBE)",
    description:
      "EU Annex I 3B001.a — equipment designed for epitaxial growth: metal-organic chemical-vapour-deposition (MOCVD) reactors and molecular-beam-epitaxy (MBE) systems for compound-semiconductor growth, above the specified wafer-handling / process-control thresholds. The front-end III-V and wide-bandgap epi layer for RF-power (GaN/GaAs) and photonic devices.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3B001.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Ion-implantation manufacturing equipment",
    description:
      "EU Annex I 3B001.b — ion-implantation manufacturing equipment having beam-energy / beam-current parameters above the listed thresholds, OR specially designed and optimised for hydrogen, helium, oxygen or silicon implantation. The dopant-introduction and layer-transfer step for advanced-node logic, SOI and power devices. Axcelis Purion, Applied Materials VIISta systems.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3B001.e",
    jurisdiction: "EU_ANNEX_I",
    title: "Automatic multi-chamber central wafer-handling systems",
    description:
      "EU Annex I 3B001.e — automatic loading multi-chamber central wafer-handling systems with interfaces for multiple semiconductor process tools, designed to transfer wafers under vacuum for sequential, in-vacuo multi-step processing. The cluster-tool backbone of an advanced-node fab line.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3B001.f",
    jurisdiction: "EU_ANNEX_I",
    title: "Semiconductor lithography equipment (DUV, EUV, mask-making)",
    description:
      "EU Annex I 3B001.f — lithography equipment: step-and-repeat or step-and-scan exposure systems using light of wavelength less than 193 nm (immersion ArF and EUV at 13.5 nm) or capable of a minimum resolvable feature of 45 nm or less; imprint-lithography equipment; and mask/reticle-making equipment using electron- or ion-beams with FWHM spot size below 65 nm. ASML NXT immersion and NXE/EXE EUV scanners — the dominant sub-7-nm production tool underpinning the 3A090 AI-accelerator supply chain. (EUV mask substrate blanks are 3B001.j.)",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "EUV lithography is 3B001.f — there is no EU '3A092'. The Netherlands operates a special export-licence régime (Wassenaar+) for ASML EUV exports; EU-internal use is not licence-controlled, extra-EU export is.",
  },
  {
    code: "3B001.h",
    jurisdiction: "EU_ANNEX_I",
    title: "Multi-layer phase-shift masks",
    description:
      "EU Annex I 3B001.h — multi-layer masks with a phase-shift layer designed for lithography equipment using light of a wavelength less than 245 nm. Phase-shift reticles are a resolution-enhancement enabler for advanced-node patterning.",
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
      "EU Annex I 3B002 — equipment specially designed for testing finished or unfinished semiconductor devices controlled by 3A001: probe stations, parametric test systems and automated test equipment (ATE) for wafer/die-level electrical characterisation. Captures Teradyne, Advantest and Tokyo Electron ATE in the production-test step.",
    controlReasons: ["NS"],
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
    title: "Computational lithography software (EUV mask OPC / RET)",
    description:
      "EU Annex I 3D003 — 'computational lithography' software specially designed for the development of patterns on EUV-lithography masks or reticles: optical-proximity-correction (OPC), resolution-enhancement-technology (RET), inverse-lithography and source-mask-optimisation tools (Synopsys Proteus, Siemens Calibre nmOPC for EUV). Distinct from TCAD device modelling, which sits in the 3D001 EDA layer.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3D004",
    jurisdiction: "EU_ANNEX_I",
    title:
      "Software for development of 3A003 spray-cooling thermal-management systems",
    description:
      "EU Annex I 3D004 — software specially designed for the development of equipment specified in 3A003 (spray-cooling thermal-management systems using closed-loop fluid handling and reconditioning equipment in a sealed enclosure). The thermal-management design-software layer for high-power-density electronics.",
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
    title: "Software for use of 3A101.b bremsstrahlung accelerators",
    description:
      "EU Annex I 3D101 — software specially designed or modified for the 'use' of equipment specified in 3A101.b (accelerators capable of delivering electromagnetic radiation produced by bremsstrahlung from accelerated electrons of 2 MeV or more, and systems containing them). MTCR-relevant control software for the radiation-effects / flash-X-ray test chain.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    mtcrCategory: "II",
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
    title: "Technology for ≥ 32-bit processor-core microcircuit development",
    description:
      "EU Annex I 3E002 — technology, other than that specified in 3E001, for the development or production of a microprocessor, micro-computer or microcontroller microcircuit core having an arithmetic-logic unit with an access width of 32 bits or more, and meeting the listed performance features (3E002.a/.b/.c). The processor-core IP layer, distinct from the general 3E001 production technology.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "3E003",
    jurisdiction: "EU_ANNEX_I",
    title: "Other technology for advanced electronic devices",
    description:
      "EU Annex I 3E003 — 'other technology' for the development or production of: vacuum microelectronic devices; hetero-structure semiconductor devices (HEMT, HBT, quantum-well and super-lattice devices); superconductive electronic devices; substrates of diamond, silicon-on-insulator (SOI), silicon carbide or gallium oxide for electronic components; and vacuum electronic devices operating at 31.8 GHz or higher.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
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
    title: "Technology for use of 3A001.e/.g, 3A201, 3A225–3A234 electronics",
    description:
      "EU Annex I 3E201 — technology, per the General Technology Note, for the 'use' of equipment specified in 3A001.e.2, 3A001.e.3, 3A001.g, 3A201, and 3A225 to 3A234 (energy-storage capacitors, superconductive electromagnets, pulsed-power thyristors, and the NSG-derived nuclear-relevant electronics). NSG-derived use-technology control.",
    controlReasons: ["NP"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
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
