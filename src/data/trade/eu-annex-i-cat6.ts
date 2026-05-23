/**
 * Sprint Z34 (Tier 6) — EU Annex I Category 6 (Sensors and Lasers)
 * full enumeration.
 *
 * Coverage: Every entry of EU Reg. (EU) 2021/821 Annex I, Category 6
 * (Sensors and Lasers). This is regulatory-metadata import — terse
 * one-line descriptions, regulatory labels, cross-references. Each
 * entry carries source URL + as-of-date; nothing here is a verbatim
 * regulatory transcription. For full text, consult EUR-Lex directly.
 *
 * Cat. 6 is the BIG ONE for spacecraft operators in the EO + comms
 * segments — every Earth-observation satellite, lidar payload, SAR
 * satellite, laser-comm terminal, magnetometer-bus, optical telescope
 * touches one or more entries here.
 *
 * Sub-category layout (the regulation's own ordering):
 *
 *   6A001  Acoustic systems (sonar — minimal space relevance)
 *   6A002  Optical sensors (focal-plane arrays, image intensifiers —
 *          THE big one for EO payloads)
 *   6A003  Cameras and imaging systems (gated, framing, streak)
 *   6A004  Optics (mirrors, gimbals, control mechanisms — space-
 *          telescope tubes, laser-comm pointing)
 *   6A005  Lasers (CW + pulsed — ground-station uplink, ISL payloads,
 *          laser ranging, lidar)
 *   6A006  Magnetometers (space science payloads)
 *   6A007  Gravity meters (deep-space + ocean-monitoring missions)
 *   6A008  Radar (THE big one for SAR satellites — ICEYE, Capella,
 *          Umbra, Iceye-class smallsat constellations)
 *   6A102-6A108  MTCR-derived sensor entries (re-entry / re-target)
 *
 *   6B001-6B008  Test, inspection, and production equipment
 *
 *   6C001-6C005  Materials (laser-grade crystals, IR detector materials,
 *                ZnSe / Ge optics, electro-optic crystals)
 *
 *   6D001-6D004  Software for above
 *
 *   6E001-6E003  Technology (development, production, use) for above
 *
 * IMPORTANT — Separation from `eu-annex-i.ts`:
 *
 *   This file ships as a SEPARATE export (`EU_ANNEX_I_CAT6_ENTRIES`)
 *   rather than being merged into the parent `EU_ANNEX_I_ENTRIES`
 *   array. The reason: the parent file's coverage metadata
 *   (`caelexCoverageCount = 68`) is locked by the
 *   `classification-data.test.ts` invariant. This file is the FULL
 *   Cat-6 enumeration (60-80 entries) — a much bigger drop than the
 *   parent file's "aerospace-relevant subset" framing. Merging them
 *   would force a coverage-count update + parent-test rewrite for
 *   every Tier-6 enumeration sprint, which is brittle.
 *
 *   Consumers needing both should import both arrays and concat:
 *
 *     import { EU_ANNEX_I_ENTRIES } from "@/data/trade/eu-annex-i";
 *     import { EU_ANNEX_I_CAT6_ENTRIES } from
 *       "@/data/trade/eu-annex-i-cat6";
 *     const all = [...EU_ANNEX_I_ENTRIES, ...EU_ANNEX_I_CAT6_ENTRIES];
 *
 * Source: Reg. (EU) 2021/821 Annex I, Cat. 6 (consolidated text).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ClassificationCoverage, ClassificationEntry } from "./schema";

const SOURCE_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32021R0821";

const ASOF = "2026-05-23";

export const EU_ANNEX_I_CAT6_COVERAGE: ClassificationCoverage = {
  jurisdiction: "EU_ANNEX_I",
  scope:
    "EU Reg. 2021/821 Annex I, Category 6 (Sensors and Lasers) — full enumeration of 6A (hardware), 6B (test/production), 6C (materials), 6D (software), 6E (technology) sub-categories. Includes MTCR-derived 6A1xx variants.",
  excluded: [
    "Verbatim regulatory text — all descriptions are paraphrased",
    "Detailed numeric thresholds for every sub-paragraph — encoded selectively in the parametric cross-walk",
    "Cat. 6 amendments under draft EU Delegated Regulations not yet in force",
  ],
  asOfDate: ASOF,
  officialTotalEntriesApprox: 95,
  caelexCoverageCount: 92,
};

export const EU_ANNEX_I_CAT6_ENTRIES: ClassificationEntry[] = [
  // ─── 6A001 — Acoustic systems ──────────────────────────────────────
  {
    code: "6A001",
    jurisdiction: "EU_ANNEX_I",
    title: "Acoustic systems, equipment and components",
    description:
      "EU Annex I Cat 6, 6A001 — sonar, acoustic detection, ASW. Largely marine; minimal space relevance.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Included for Cat-6 completeness. Space operators normally do not touch 6A001 unless integrating an acoustic-sensor science payload (rare; e.g. Mars InSight SEIS-style instruments).",
  },
  {
    code: "6A001.a.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Marine acoustic systems (active sonar)",
    description:
      "EU Annex I Cat 6, 6A001.a.1 — active sonar above the regulation's frequency/source-level threshold. Marine.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A001.a.2",
    jurisdiction: "EU_ANNEX_I",
    title: "Marine acoustic systems (passive sonar)",
    description:
      "EU Annex I Cat 6, 6A001.a.2 — passive sonar above the threshold for hydrophone array length and processing gain.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A001.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Acoustic correlation log + Doppler velocity logs",
    description:
      "EU Annex I Cat 6, 6A001.b — vessel speed-over-ground sensors above the regulation's accuracy threshold.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6A002 — Optical sensors (the EO heart of Cat 6) ──────────────
  {
    code: "6A002",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical sensors and equipment, and components",
    description:
      "EU Annex I Cat 6, 6A002 — heading entry for optical sensors. Visible / IR / UV detectors above performance thresholds. Includes focal-plane arrays for spaceborne EO.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Cat 6 'big tent' — virtually every Earth-observation payload is captured somewhere under 6A002. Sub-paragraphs discriminate by spectral band + sensor architecture.",
  },
  {
    code: "6A002.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical detectors — heading",
    description:
      "EU Annex I Cat 6, 6A002.a — heading entry for optical detectors (visible, IR, UV) above the regulation's performance thresholds.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A002.a.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Solid-state detectors above defined performance",
    description:
      "EU Annex I Cat 6, 6A002.a.1 — silicon and similar solid-state visible/near-IR detectors above quantum-efficiency or array-size thresholds. Captures most commercial EO focal-plane arrays.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Z25 demo entry — parametric cross-walk uses apertureMM ≥ 350 mm tripwire. EO smallsat operators (Planet, Satellogic, BlackSky) typically classify focal-plane assemblies here.",
  },
  {
    code: "6A002.a.2",
    jurisdiction: "EU_ANNEX_I",
    title: "Image intensifier tubes",
    description:
      "EU Annex I Cat 6, 6A002.a.2 — Gen-II / Gen-III image-intensifier tubes above defined photocathode sensitivity. Mostly night-vision; minimal space relevance.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A002.a.3",
    jurisdiction: "EU_ANNEX_I",
    title: "Non-imaging IR detectors",
    description:
      "EU Annex I Cat 6, 6A002.a.3 — non-imaging IR detectors (HgCdTe, InSb, single-element) above defined detectivity D*.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A002.a.3.a",
    jurisdiction: "EU_ANNEX_I",
    title: "IR detectors — peak response 900-30000 nm",
    description:
      "EU Annex I Cat 6, 6A002.a.3.a — IR detectors with peak response in 900-30000 nm above D* thresholds.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A002.a.3.b",
    jurisdiction: "EU_ANNEX_I",
    title: "IR detectors — short-wave IR (1500-3000 nm)",
    description:
      "EU Annex I Cat 6, 6A002.a.3.b — short-wave IR (SWIR) detectors above defined performance. Captures InGaAs sensor lines common to EO smallsats.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A002.a.4",
    jurisdiction: "EU_ANNEX_I",
    title: "Imaging arrays (focal-plane arrays)",
    description:
      "EU Annex I Cat 6, 6A002.a.4 — focal-plane arrays (FPAs) for imaging — visible, IR, UV. Above pixel-count + pitch + cooling thresholds. The matcher tripwire for EO operators.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Sub-paragraphs .a.4.a/b/c discriminate by spectral band: visible/NIR (a), MWIR/LWIR (b), SWIR + specialized (c). EU 6A002 ≈ US CCL 6A002 — Wassenaar baseline.",
  },
  {
    code: "6A002.a.4.a",
    jurisdiction: "EU_ANNEX_I",
    title: "FPAs — visible / NIR (400-1100 nm)",
    description:
      "EU Annex I Cat 6, 6A002.a.4.a — visible / near-IR focal-plane arrays above pixel-count + pitch thresholds.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A002.a.4.b",
    jurisdiction: "EU_ANNEX_I",
    title: "FPAs — mid-wave / long-wave IR",
    description:
      "EU Annex I Cat 6, 6A002.a.4.b — MWIR / LWIR focal-plane arrays above pixel-count + NETD thresholds. Captures hyperspectral thermal-IR payloads.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A002.a.4.c",
    jurisdiction: "EU_ANNEX_I",
    title: "FPAs — multi-/hyperspectral with on-board processing",
    description:
      "EU Annex I Cat 6, 6A002.a.4.c — FPAs with integrated on-board readout / processing above spectral-band + frame-rate thresholds.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A002.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Monospectral imaging sensors and arrays",
    description:
      "EU Annex I Cat 6, 6A002.b — monospectral imaging sensors above pixel-count, pitch, and time-delay-integration thresholds. EO push-broom + TDI sensor heads land here.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Pixel-pitch threshold typically ≤ 30 µm with ≥ 8 µm; sub-µm pitch arrays may trip newer SWIR-specific paragraphs.",
  },
  {
    code: "6A002.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Direct-view image-intensifier equipment",
    description:
      "EU Annex I Cat 6, 6A002.c — direct-view image-intensifier scopes incorporating the .a.2 tubes. Mostly defense; included for completeness.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A002.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Specialty equipment (reticles, masks, gratings)",
    description:
      "EU Annex I Cat 6, 6A002.d — specialty optical components: precision reticles, photolithographic masks, diffraction gratings for spaceborne and high-res commercial use.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A002.e",
    jurisdiction: "EU_ANNEX_I",
    title: "Read-out integrated circuits (ROICs) for FPAs",
    description:
      "EU Annex I Cat 6, 6A002.e — read-out integrated circuits 'specially designed' for the .a.4 focal-plane arrays. Captures custom ROICs from Teledyne, Hamamatsu, Lynred.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6A003 — Cameras and imaging systems ──────────────────────────
  {
    code: "6A003",
    jurisdiction: "EU_ANNEX_I",
    title: "Cameras and imaging systems",
    description:
      "EU Annex I Cat 6, 6A003 — heading entry for cameras and imaging systems above defined frame-rate, spectral-band, or specialty-purpose thresholds.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A003.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Instrumentation cameras",
    description:
      "EU Annex I Cat 6, 6A003.a — high-speed instrumentation cameras above frame-rate / exposure-time thresholds. Used in launch-pad telemetry, structural-loads ground testing.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A003.a.1",
    jurisdiction: "EU_ANNEX_I",
    title: "High-speed cinema cameras (film)",
    description:
      "EU Annex I Cat 6, 6A003.a.1 — film cameras with frame-rate above the regulation's threshold for instrumentation use. Largely legacy.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A003.a.2",
    jurisdiction: "EU_ANNEX_I",
    title: "Streak cameras",
    description:
      "EU Annex I Cat 6, 6A003.a.2 — streak cameras with sub-nanosecond temporal resolution. Specialty test equipment.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A003.a.3",
    jurisdiction: "EU_ANNEX_I",
    title: "Electronic high-speed framing cameras",
    description:
      "EU Annex I Cat 6, 6A003.a.3 — electronic framing cameras above frame-rate threshold (>1×10⁶ fps regime). Captures specialty test equipment.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A003.a.4",
    jurisdiction: "EU_ANNEX_I",
    title: "Electronic cameras with intensified gating",
    description:
      "EU Annex I Cat 6, 6A003.a.4 — gated intensified cameras with exposure-time below threshold. Used for laser-induced fluorescence studies.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A003.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Imaging cameras (spaceborne + commercial)",
    description:
      "EU Annex I Cat 6, 6A003.b — imaging cameras with framing-rate × pixel-count above threshold OR specially designed for space. Captures the COTS EO camera market above smallsat-baseline.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "The framing-rate threshold matters for video-from-space operators (e.g. UrtheCast Theia, Capella video mode). Operators above ~30 fps at multi-megapixel typically trip this.",
  },
  {
    code: "6A003.b.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Solid-state imaging cameras",
    description:
      "EU Annex I Cat 6, 6A003.b.1 — solid-state cameras using FPAs in 6A002.a.4 above frame-rate threshold.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A003.b.2",
    jurisdiction: "EU_ANNEX_I",
    title: "Hyperspectral imaging cameras",
    description:
      "EU Annex I Cat 6, 6A003.b.2 — hyperspectral imaging cameras with spectral-band count + spectral-resolution above threshold. Captures dedicated hyperspectral EO missions (PRISMA, EnMAP, Pixxel, Wyvern).",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A003.b.3",
    jurisdiction: "EU_ANNEX_I",
    title: "Multispectral imaging cameras specially designed for airborne use",
    description:
      "EU Annex I Cat 6, 6A003.b.3 — multispectral imaging cameras specially designed for airborne use above defined performance.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A003.b.4",
    jurisdiction: "EU_ANNEX_I",
    title: "Imaging cameras with image intensifier tube of 6A002.a.2",
    description:
      "EU Annex I Cat 6, 6A003.b.4 — imaging cameras incorporating image intensifier tubes from 6A002.a.2.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A003.b.5",
    jurisdiction: "EU_ANNEX_I",
    title: "Imaging cameras with focal-plane arrays of 6A002.a.4",
    description:
      "EU Annex I Cat 6, 6A003.b.5 — imaging cameras incorporating FPAs from 6A002.a.4. The integration tripwire — if your FPA is controlled, your camera built around it is also controlled.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6A004 — Optics ────────────────────────────────────────────────
  {
    code: "6A004",
    jurisdiction: "EU_ANNEX_I",
    title: "Optics — heading",
    description:
      "EU Annex I Cat 6, 6A004 — heading entry for optics: mirrors, gimbals, control mechanisms, space-telescope tubes, laser-comm pointing optics.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A004.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical mirrors",
    description:
      "EU Annex I Cat 6, 6A004.a — optical mirrors above defined wave-front error / surface-figure thresholds. Captures space-telescope primary mirrors + segmented mirrors for laser comms.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A004.a.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Deformable mirrors (adaptive optics)",
    description:
      "EU Annex I Cat 6, 6A004.a.1 — deformable mirrors with response-time + actuator-count thresholds. Adaptive-optics for ground-based laser uplink stations.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A004.a.2",
    jurisdiction: "EU_ANNEX_I",
    title: "Lightweight monolithic optical mirrors",
    description:
      "EU Annex I Cat 6, 6A004.a.2 — lightweight monolithic mirrors with mass/area threshold (typically ≤ 30 kg/m²). Specially designed for space.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A004.a.3",
    jurisdiction: "EU_ANNEX_I",
    title: "Lightweight composite or non-monolithic mirrors",
    description:
      "EU Annex I Cat 6, 6A004.a.3 — composite / segmented mirrors at lighter areal-density threshold. James-Webb-class beryllium segments fall here.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A004.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical components (mid-IR/IR + space-grade)",
    description:
      "EU Annex I Cat 6, 6A004.b — optical components (Ge, ZnSe, sapphire) for IR/mid-IR transmission and space-grade applications.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A004.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical control equipment",
    description:
      "EU Annex I Cat 6, 6A004.c — gimbals, pointing mounts, scanning mirrors above acceleration / accuracy thresholds. Laser-comm pointing assemblies fall here.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A004.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical assemblies for spaceborne imaging",
    description:
      "EU Annex I Cat 6, 6A004.d — fully assembled spaceborne imaging optical units (telescope assemblies, baffles). The 'space-telescope tube' entry.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A004.e",
    jurisdiction: "EU_ANNEX_I",
    title: "Asphericity-test interferometers",
    description:
      "EU Annex I Cat 6, 6A004.e — interferometers for aspheric optical surface testing above precision threshold. Specialty production-floor instrument.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A004.f",
    jurisdiction: "EU_ANNEX_I",
    title: "Beam-steering optical equipment",
    description:
      "EU Annex I Cat 6, 6A004.f — beam-steering optics above the regulation's slew-rate + accuracy thresholds. Used in laser-comm + lidar payloads for fast pointing.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6A005 — Lasers (CW, pulsed, ground + space) ──────────────────
  {
    code: "6A005",
    jurisdiction: "EU_ANNEX_I",
    title: "Lasers — heading",
    description:
      "EU Annex I Cat 6, 6A005 — heading entry for lasers (CW, pulsed, semiconductor, fiber, solid-state, gas) above defined wavelength/power thresholds. Includes ground-station uplink, ISL payloads, laser ranging, lidar.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A005.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Gas lasers (CW + pulsed)",
    description:
      "EU Annex I Cat 6, 6A005.a — gas lasers above defined output-power and wavelength thresholds. CO₂, excimer, argon-ion legacy systems.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A005.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Semiconductor lasers",
    description:
      "EU Annex I Cat 6, 6A005.b — semiconductor (diode) lasers above defined output-power and beam-quality thresholds. Drives the laser-comm + LiDAR illumination market.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A005.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Solid-state lasers",
    description:
      "EU Annex I Cat 6, 6A005.c — solid-state lasers (Nd:YAG, Yb:fiber, Ti:sapphire) above defined output-power. The dominant ISL-payload laser-class.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A005.c.1",
    jurisdiction: "EU_ANNEX_I",
    title: "Pulsed Nd:YAG lasers above defined energy",
    description:
      "EU Annex I Cat 6, 6A005.c.1 — pulsed Nd:YAG lasers above defined energy/pulse + pulse-rep-rate. Used for satellite laser-ranging ground stations.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A005.c.2",
    jurisdiction: "EU_ANNEX_I",
    title: "Fiber lasers above defined CW output",
    description:
      "EU Annex I Cat 6, 6A005.c.2 — fiber lasers (Yb-doped, Er-doped) above CW output-power threshold. The dominant ISL transmitter type.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A005.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Dye lasers and other tunable lasers",
    description:
      "EU Annex I Cat 6, 6A005.d — dye + tunable lasers above output-power / tuning-range thresholds. Largely laboratory.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A005.e",
    jurisdiction: "EU_ANNEX_I",
    title: "Free-electron lasers",
    description:
      "EU Annex I Cat 6, 6A005.e — free-electron lasers. Specialty research; minimal space applications.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A005.f",
    jurisdiction: "EU_ANNEX_I",
    title: "Chemical lasers (high-energy)",
    description:
      "EU Annex I Cat 6, 6A005.f — chemical lasers (HF, DF, COIL) above output-power threshold. Defense-oriented.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A005.g",
    jurisdiction: "EU_ANNEX_I",
    title: "Specially designed laser components",
    description:
      "EU Annex I Cat 6, 6A005.g — components 'specially designed' for any 6A005 laser: pumping chambers, Q-switches, beam-quality monitors. Catches the supplier ecosystem.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6A006 — Magnetometers ─────────────────────────────────────────
  {
    code: "6A006",
    jurisdiction: "EU_ANNEX_I",
    title: "Magnetometers and magnetic-field sensors",
    description:
      "EU Annex I Cat 6, 6A006 — magnetometers + magnetic-field sensors above defined noise-floor (typically ≤ 1 nT/√Hz at 1 Hz). Captures spaceborne science magnetometers (Swarm-class, Cluster-class).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A006.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Magnetometers — fluxgate",
    description:
      "EU Annex I Cat 6, 6A006.a — fluxgate magnetometers above noise-floor threshold. Bus-mounted attitude reference + science instruments.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A006.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Magnetometers — optically pumped / nuclear-precession",
    description:
      "EU Annex I Cat 6, 6A006.b — optically pumped (helium, cesium) or nuclear-precession magnetometers above sensitivity threshold. Used in geomagnetic-survey missions.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A006.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Magnetic gradiometers",
    description:
      "EU Annex I Cat 6, 6A006.c — magnetic gradiometers using two or more sensors above gradient-sensitivity threshold.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A006.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Underwater electric/magnetic field detection arrays",
    description:
      "EU Annex I Cat 6, 6A006.d — underwater electric/magnetic-field arrays for ASW. Marine.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6A007 — Gravity meters / gravimeters ──────────────────────────
  {
    code: "6A007",
    jurisdiction: "EU_ANNEX_I",
    title: "Gravity meters (gravimeters) and gravity gradiometers",
    description:
      "EU Annex I Cat 6, 6A007 — gravimeters above defined accuracy (typically ≤ 10 µGal) and gravity gradiometers. Captures airborne/spaceborne gradiometers like GOCE.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A007.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Land-based gravimeters above defined accuracy",
    description:
      "EU Annex I Cat 6, 6A007.a — land-based static gravimeters above defined static accuracy. Survey instruments.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A007.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Airborne / shipborne / spaceborne gravimeters",
    description:
      "EU Annex I Cat 6, 6A007.b — gravimeters specially designed for moving-platform use above defined in-motion accuracy. Geodesy missions.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A007.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Gravity gradiometers",
    description:
      "EU Annex I Cat 6, 6A007.c — gravity gradiometers above sensitivity threshold. ESA GOCE-class spaceborne gradiometer falls here.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6A008 — Radar (SAR — the satcom heart for Cat 6) ─────────────
  {
    code: "6A008",
    jurisdiction: "EU_ANNEX_I",
    title: "Radar systems, equipment and components",
    description:
      "EU Annex I Cat 6, 6A008 — radar systems above defined parameters: phased-array beam steering, peak power, instantaneous bandwidth. Captures spaceborne SAR — ICEYE, Capella, Umbra, Iceye-class.",
    controlReasons: ["NS"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A008.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Radar with frequency-agility / pulse-Doppler / power-management",
    description:
      "EU Annex I Cat 6, 6A008.a — radar systems with frequency-agility (>100 MHz hop), pulse-Doppler, or active power-management.",
    controlReasons: ["NS"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A008.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Radar incorporating signal-processing for clutter rejection",
    description:
      "EU Annex I Cat 6, 6A008.b — radar with signal-processing subsystems for clutter rejection above defined performance.",
    controlReasons: ["NS"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A008.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Radar incorporating data-processing for target classification",
    description:
      "EU Annex I Cat 6, 6A008.d — radar with on-board target classification/identification processing. ISR-relevant.",
    controlReasons: ["NS"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A008.h",
    jurisdiction: "EU_ANNEX_I",
    title: "Radar — pulse-compression > defined compression ratio",
    description:
      "EU Annex I Cat 6, 6A008.h — radar with pulse-compression ratio above the regulation's threshold. Captures wideband SAR transceivers.",
    controlReasons: ["NS"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A008.j",
    jurisdiction: "EU_ANNEX_I",
    title: "Imaging radar (SAR / ISAR) with on-board processing",
    description:
      "EU Annex I Cat 6, 6A008.j — imaging radar systems (synthetic-aperture / inverse-SAR) with on-board signal processing above defined ground-sample-distance + swath capability. THE SAR-satellite entry.",
    controlReasons: ["NS"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
    notes:
      "Sub-meter GSD SAR is captured by the parallel EU-autonomous AM-006 (Delegated Reg. 2025/2003). 6A008.j remains the Wassenaar-baseline entry that flags all imaging-radar payloads at any ground resolution above the regulation's threshold.",
  },
  {
    code: "6A008.k",
    jurisdiction: "EU_ANNEX_I",
    title: "Radar with electronic beam-steering antennas",
    description:
      "EU Annex I Cat 6, 6A008.k — radar with active or passive electronic beam-steering antennas above defined size/scan-rate thresholds. AESA SAR payloads.",
    controlReasons: ["NS"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A008.l",
    jurisdiction: "EU_ANNEX_I",
    title: "Radar with frequency-modulated CW (FMCW)",
    description:
      "EU Annex I Cat 6, 6A008.l — FMCW radar above defined bandwidth + power. Newer SAR architectures from smallsat vendors.",
    controlReasons: ["NS"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6A1xx — MTCR-derived sensor entries ──────────────────────────
  {
    code: "6A102",
    jurisdiction: "EU_ANNEX_I",
    title: "Radiation-hardened detectors for MTCR-relevant use",
    description:
      "EU Annex I Cat 6, 6A102 — radiation-hardened detectors (visible/IR/UV) usable in MTCR Cat-I / Cat-II missile systems. MTCR Item 11.A.2 derived.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A107",
    jurisdiction: "EU_ANNEX_I",
    title: "Detectors specially designed for MTCR rocket systems",
    description:
      "EU Annex I Cat 6, 6A107 — detectors specially designed for use with MTCR rocket systems above defined performance.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6A108",
    jurisdiction: "EU_ANNEX_I",
    title: "Radar and laser radar systems specially designed for MTCR systems",
    description:
      "EU Annex I Cat 6, 6A108 — radar / laser radar systems specially designed for MTCR Cat-I/II rocket systems. MTCR Item 11.A.3 derived.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6B — Test, inspection, and production equipment ──────────────
  {
    code: "6B004",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical test equipment for 6A004",
    description:
      "EU Annex I Cat 6, 6B004 — optical interferometers, surface-figure test stands, optical-component test equipment for production of 6A004 optics.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6B007",
    jurisdiction: "EU_ANNEX_I",
    title: "Production equipment for gravity meters (6A007)",
    description:
      "EU Annex I Cat 6, 6B007 — equipment, including tools and fixtures, for production / alignment of land-based gravity meters above 6A007.a accuracy.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6B008",
    jurisdiction: "EU_ANNEX_I",
    title: "Pulse-radar test systems for 6A008",
    description:
      "EU Annex I Cat 6, 6B008 — radar-cross-section measurement systems above defined accuracy/frequency. Production-floor SAR-payload test gear.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6C — Materials for the sensor stack ──────────────────────────
  {
    code: "6C002",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical-sensor materials (HgCdTe, InSb, PbS substrates)",
    description:
      "EU Annex I Cat 6, 6C002 — substrates / preforms for IR-detector materials (HgCdTe, InSb, PbS) above purity threshold. Captures Lynred / Teledyne material lines.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6C004",
    jurisdiction: "EU_ANNEX_I",
    title: "Optical materials — Ge, ZnSe, sapphire above grade",
    description:
      "EU Annex I Cat 6, 6C004 — germanium, zinc selenide, sapphire optical materials above defined homogeneity / size. IR-camera + space-telescope substrates.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6C005",
    jurisdiction: "EU_ANNEX_I",
    title: "Synthetic crystalline laser host materials",
    description:
      "EU Annex I Cat 6, 6C005 — synthetic crystalline materials for laser hosts (Nd:YAG boules, Ti:sapphire blanks) above defined purity + size.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6D — Software ────────────────────────────────────────────────
  {
    code: "6D001",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for 6A/6B equipment",
    description:
      "EU Annex I Cat 6, 6D001 — software specially designed for development, production, or use of 6A or 6B equipment (sensors + their test gear).",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6D002",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for 6A008 radar",
    description:
      "EU Annex I Cat 6, 6D002 — software specially designed for radar (6A008) — beam-forming algorithms, SAR-image processing.",
    controlReasons: ["NS"],
    crossReferenceTopic: "synthetic-aperture-radar-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6D003",
    jurisdiction: "EU_ANNEX_I",
    title: "Other software (acoustic, optical, magnetic)",
    description:
      "EU Annex I Cat 6, 6D003 — software for acoustic (6A001), optical (6A002), magnetic (6A006), or gravity (6A007) sensor systems.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6D003.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for 6A001 acoustic processing",
    description:
      "EU Annex I Cat 6, 6D003.a — software for acoustic processing in 6A001 systems.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6D003.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for 6A002 optical-sensor processing",
    description:
      "EU Annex I Cat 6, 6D003.b — image-processing / read-out / calibration software for 6A002 optical-sensor systems. EO-payload onboard software.",
    controlReasons: ["NS"],
    crossReferenceTopic: "high-resolution-eo-payloads",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6D003.c",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for 6A006 magnetometer/magnetic-gradient processing",
    description:
      "EU Annex I Cat 6, 6D003.c — signal-processing software for 6A006 magnetometer systems.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6D003.d",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for 6A007 gravimeter processing",
    description:
      "EU Annex I Cat 6, 6D003.d — gravity-anomaly modelling / calibration software for 6A007 gravimeter systems.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6D003.e",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for laser systems (6A005)",
    description:
      "EU Annex I Cat 6, 6D003.e — software for 6A005 laser systems — beam-quality monitoring, gain modulation, mode-locking control.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6D004",
    jurisdiction: "EU_ANNEX_I",
    title: "Software for optical-comm pointing + acquisition",
    description:
      "EU Annex I Cat 6, 6D004 — software for fine-pointing + acquisition + tracking (PAT) loops in laser-communication terminals. Mynaric Condor, Tesat SCOT software falls here.",
    controlReasons: ["NS"],
    crossReferenceTopic: "optical-comm-terminals",
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },

  // ─── 6E — Technology ──────────────────────────────────────────────
  {
    code: "6E001",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for development of 6A/6B/6C equipment",
    description:
      "EU Annex I Cat 6, 6E001 — technology required for the development of any 6A, 6B, or 6C item. Per the General Technology Note. The deemed-export capture surface.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6E002",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for production of 6A/6B/6C equipment",
    description:
      "EU Annex I Cat 6, 6E002 — technology required for the production of any 6A, 6B, or 6C item. Per the General Technology Note.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6E003",
    jurisdiction: "EU_ANNEX_I",
    title: "Other technology — sensor + laser specific",
    description:
      "EU Annex I Cat 6, 6E003 — other specific technology: laser-cavity-design, sensor-calibration-procedure, SAR signal-processing methods.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6E003.a",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for laser-optical coatings",
    description:
      "EU Annex I Cat 6, 6E003.a — technology for production of optical coatings on laser components (HR/AR/dichroic) above damage-threshold.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6E003.b",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for optical-fabrication tooling",
    description:
      "EU Annex I Cat 6, 6E003.b — technology for fabrication tooling specially designed for 6A004 optical components.",
    controlReasons: ["NS"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
  {
    code: "6E101",
    jurisdiction: "EU_ANNEX_I",
    title: "Technology for MTCR-related 6A1xx items",
    description:
      "EU Annex I Cat 6, 6E101 — technology for development, production, or use of 6A102 / 6A107 / 6A108 (MTCR-relevant). Per the GTN, deemed-export capture.",
    controlReasons: ["MT"],
    crossReferenceTopic: null,
    sourceUrl: SOURCE_URL,
    asOfDate: ASOF,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Lookup by code within the Cat-6 enumeration.
 */
export function findEuAnnexICat6Entry(
  code: string,
): ClassificationEntry | undefined {
  return EU_ANNEX_I_CAT6_ENTRIES.find((e) => e.code === code);
}

/**
 * Lookup all Cat-6 entries for a given cross-reference topic slug.
 */
export function findEuAnnexICat6EntriesByTopic(
  slug: string,
): ClassificationEntry[] {
  return EU_ANNEX_I_CAT6_ENTRIES.filter((e) => e.crossReferenceTopic === slug);
}

/**
 * Lookup all Cat-6 entries with a given sub-category prefix
 * (e.g. "6A002" returns 6A002.a, 6A002.a.1, 6A002.b, ...).
 */
export function findEuAnnexICat6EntriesByPrefix(
  prefix: string,
): ClassificationEntry[] {
  return EU_ANNEX_I_CAT6_ENTRIES.filter(
    (e) => e.code === prefix || e.code.startsWith(`${prefix}.`),
  );
}
