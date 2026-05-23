/**
 * Caelex Trade — TradeItem → parametric matcher bridge.
 *
 * Sprint Z3l.
 *
 * Pure function that marshals a TradeItem row into the matcher's
 * ItemAttributeBag and returns the full MatcherResult. This is the
 * integration seam between the data layer (TradeItem with typed
 * parametric columns from Z3a + Z3e) and the matcher engine (Z3c +
 * Z3d + Z3f + Z3g + Z3h + Z3i + Z3j + Z3k).
 *
 * Architecture notes:
 *   - The function takes a *snapshot* shape, not the Prisma TradeItem
 *     type directly. Caller marshals their DB row into the snapshot at
 *     the service boundary. This keeps the engine decoupled from the
 *     ORM and trivially unit-testable with plain objects.
 *   - All `unknown` JSON fields are read as-is — the matcher's three-
 *     valued logic handles null/undefined attributes correctly.
 *   - Result shape is identical to `MatcherResult` from the matcher,
 *     so consumers (server actions, API routes, UI) get the full
 *     candidate / possibleMatch / nearMiss surface.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  matchAgainstCrossWalk,
  type ItemAttributeBag,
  type MatcherResult,
} from "@/lib/comply-v2/trade/classification/parametric-matcher";

// ─── Input shape ────────────────────────────────────────────────────

/**
 * Subset of `TradeItem` columns the matcher consumes. Mirrors the
 * Prisma column names exactly so the marshal step is a 1:1 copy.
 *
 * Note: keep this list in sync with:
 *   - The Z3a + Z3e migrations that added the columns to TradeItem
 *   - The AttributeName union in control-list-cross-walk.ts
 *   - The ItemAttributeBag interface in parametric-matcher.ts
 *
 * Any new typed attribute needs an entry here too.
 */
export interface TradeItemParametricSnapshot {
  // ── Z3a Tier-1 parametric columns ─────────────────────────────────
  apertureMeters?: number | null;
  payloadKg?: number | null;
  rangeKm?: number | null;
  IspSeconds?: number | null;
  deltaVMetersPerSecond?: number | null;
  gsdMeters?: number | null;
  transmitPowerW?: number | null;
  frequencyGhz?: number | null;
  radHardTidKrad?: number | null;
  seuRateErrorsPerBitDay?: number | null;
  isRadHardened?: boolean | null;
  isMilSpec?: boolean | null;
  isAntiJam?: boolean | null;
  itemClass?: string | null;
  // ── Z3e extended ontology vocabulary ──────────────────────────────
  spectralBandCount?: number | null;
  peakWavelengthNm?: number | null;
  radarCenterFreqGhz?: number | null;
  radarBandwidthMhz?: number | null;
  antennaDiameterM?: number | null;
  starTrackerAccuracyArcsec?: number | null;
  starTrackerSlewRateDegPerS?: number | null;
  totalImpulseNs?: number | null;
  neutronFluenceNPerCm2?: number | null;
  selLetThresholdMevCm2Mg?: number | null;
  doseRateUpsetRadSiPerS?: number | null;
  gnssMaxVelocityMPerS?: number | null;
  antennaActiveScanning?: boolean | null;
  antennaAdaptiveBeamforming?: boolean | null;
  // ── Z3g universal qualifier ───────────────────────────────────────
  isSpeciallyDesigned?: boolean | null;
  // ── Z25 tier-3 extended parametric attributes ─────────────────────
  // Added 2026-05-22. These are TypeScript-typed BOM/Item fields (not
  // DB columns) — they flow into the matcher via the parametricAttributes
  // JSON bag in the same way as Z3e extended attributes.
  apertureMM?: number | null;
  groundResolutionMeters?: number | null;
  signalBandwidthMHz?: number | null;
  focalLengthMM?: number | null;
  pixelPitchMicrons?: number | null;
  maxOrbitAltitudeKm?: number | null;
  minOrbitAltitudeKm?: number | null;
  crossLinkBandwidthMbps?: number | null;
  radHardenedTID_krad?: number | null;
  temperatureRangeCelsius?: number | null;
  // ── Z34c tier-4 extended parametric attributes ────────────────────
  // Added 2026-05-23 to expand classification coverage from ~25 to 44+
  // typed attributes. Like Z25, these route via the parametricAttributes
  // JSON bag — no Prisma schema changes are required because the moat
  // is the predicate logic, not the column layout. See Z34c demo
  // entries at the bottom of control-list-cross-walk.ts for the ECCN
  // drivers per attribute.
  //
  // Tier 1 — spacecraft hardware
  /** BOL conversion efficiency of solar cells, percent. 9A515.e tripwire. */
  solarCellEfficiencyPercent?: number | null;
  /** Specific energy of the spacecraft battery, Wh per kg. 9A515.x components. */
  batterySpecificEnergyWhPerKg?: number | null;
  /** End-of-life electrical-power generation, watts. Bus-class discriminator. */
  peakPowerWatts?: number | null;
  /** Antenna boresight gain, dBi. 5A001.b / 9A515 RF payload tier. */
  antennaGainDbi?: number | null;
  /** RF bands the antenna / transmitter supports, GHz. Array — use `contains`. */
  frequencyBandsGhz?: number[] | null;
  /** Antenna polarisation: 'LP' | 'RHCP' | 'LHCP' | 'dual'. 5A001.b RF tier. */
  polarisationType?: string | null;
  /** Hardware-in-the-loop thermal qualification cycles. 9A515.x qual depth. */
  thermalCycleCount?: number | null;
  // Tier 2 — propulsion
  /** Propellant family: 'chemical' | 'electric' | 'hybrid' | 'cold-gas'. 9A005 / 9A515.g sub. */
  propellantType?: string | null;
  /** Steady-state thrust at vacuum, newtons. MTCR 2.A.1 / 9A005 boundary. */
  thrustNewtons?: number | null;
  /** Nozzle expansion ratio (Aₑ/Aₜ). MTCR 3.A.3 / 9A101 sub-criteria. */
  nozzleExpansionRatio?: number | null;
  /** Specific impulse measured at vacuum, seconds. Distinct from Z3a `IspSeconds` (sea-level). */
  specificImpulseSecondsVacuum?: number | null;
  // Tier 3 — mission ops
  /** Design mission lifetime, years. 9A515 long-life qualifier. */
  missionDurationYears?: number | null;
  /** Orbital inclination, degrees. SSO / GEO / polar discrimination. */
  inclinationDegrees?: number | null;
  /** Apogee altitude, km. Duplicate-check vs `maxOrbitAltitudeKm` (Z25). */
  apogeeKm?: number | null;
  /** Perigee altitude, km. Duplicate-check vs `minOrbitAltitudeKm` (Z25). */
  perigeeKm?: number | null;
  // Tier 4 — imaging payloads
  /** Short-wave infrared spectral-band count (0.9–2.5 µm). 6A002.b.5 hook. */
  swirSpectralBands?: number | null;
  /** Mid-wave infrared spectral-band count (3–5 µm). 6A002.b.6 hook. */
  mwirSpectralBands?: number | null;
  /** Long-wave infrared spectral-band count (8–14 µm). 6A002.b.7 hook. */
  lwirSpectralBands?: number | null;
  /** Hyperspectral band count. ≥ 20 contiguous bands triggers 6A002.b.4. */
  hyperspectralBandCount?: number | null;
  // ── Catch-all freeform JSON ───────────────────────────────────────
  parametricAttributes?: Record<string, unknown> | null;
}

// ─── Service ────────────────────────────────────────────────────────

/**
 * Classify a TradeItem against the parametric control-list cross-walk.
 *
 * Pure function — no I/O, no Prisma. Caller is responsible for loading
 * the TradeItem and projecting into the snapshot shape.
 *
 * Returns the full MatcherResult (candidates + possibleMatches +
 * nearMisses + noAttributesPopulated + disclaimer). Consumers should
 * render all three result lanes and the disclaimer in the UI.
 */
export function classifyTradeItemParametric(
  item: TradeItemParametricSnapshot,
): MatcherResult {
  return matchAgainstCrossWalk(itemToAttributeBag(item));
}

/**
 * Marshal a TradeItem snapshot into the matcher's input shape.
 *
 * Exported for tests + advanced callers that want to inspect the bag
 * before running the matcher (e.g. logging, fixture verification).
 */
export function itemToAttributeBag(
  item: TradeItemParametricSnapshot,
): ItemAttributeBag {
  return {
    // ── Z3a tier-1 ────────────────────────────────────────────────────
    apertureMeters: item.apertureMeters,
    payloadKg: item.payloadKg,
    rangeKm: item.rangeKm,
    IspSeconds: item.IspSeconds,
    deltaVMetersPerSecond: item.deltaVMetersPerSecond,
    gsdMeters: item.gsdMeters,
    transmitPowerW: item.transmitPowerW,
    frequencyGhz: item.frequencyGhz,
    radHardTidKrad: item.radHardTidKrad,
    seuRateErrorsPerBitDay: item.seuRateErrorsPerBitDay,
    isRadHardened: item.isRadHardened,
    isMilSpec: item.isMilSpec,
    isAntiJam: item.isAntiJam,
    itemClass: item.itemClass,
    // ── Z3e extended ──────────────────────────────────────────────────
    // These attributes don't have typed positions in ItemAttributeBag
    // directly; they flow through via the parametricAttributes catch-
    // all. The matcher's readAttribute helper falls through to the
    // JSON bag when the typed column is null/undefined.
    parametricAttributes: mergeExtendedAttributes(item),
    // ── Z3g universal ────────────────────────────────────────────────
    isSpeciallyDesigned: item.isSpeciallyDesigned,
  };
}

/**
 * Combine the operator-supplied `parametricAttributes` JSON with the
 * Z3e typed columns. Typed columns take precedence — if both are set,
 * the typed value wins (per the matcher's readAttribute contract).
 */
function mergeExtendedAttributes(
  item: TradeItemParametricSnapshot,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...(item.parametricAttributes ?? {}),
  };

  // Z3e attributes — emit only when the typed column is non-null so
  // that the JSON bag fallback still works for legacy items where only
  // parametricAttributes was populated.
  const z3eFields: Array<keyof TradeItemParametricSnapshot> = [
    "spectralBandCount",
    "peakWavelengthNm",
    "radarCenterFreqGhz",
    "radarBandwidthMhz",
    "antennaDiameterM",
    "starTrackerAccuracyArcsec",
    "starTrackerSlewRateDegPerS",
    "totalImpulseNs",
    "neutronFluenceNPerCm2",
    "selLetThresholdMevCm2Mg",
    "doseRateUpsetRadSiPerS",
    "gnssMaxVelocityMPerS",
    "antennaActiveScanning",
    "antennaAdaptiveBeamforming",
  ];

  for (const key of z3eFields) {
    const value = item[key];
    if (value !== null && value !== undefined) {
      merged[key] = value;
    }
  }

  // Z25 tier-3 attributes — same JSON-bag routing pattern as Z3e. Added
  // 2026-05-22 to cover sensor-level apertures (mm), ground resolution,
  // signal bandwidth, focal-plane parameters, orbit altitudes, cross-
  // link rates, rad-hardness, and operating temperature ranges.
  const z25Fields: Array<keyof TradeItemParametricSnapshot> = [
    "apertureMM",
    "groundResolutionMeters",
    "signalBandwidthMHz",
    "focalLengthMM",
    "pixelPitchMicrons",
    "maxOrbitAltitudeKm",
    "minOrbitAltitudeKm",
    "crossLinkBandwidthMbps",
    "radHardenedTID_krad",
    "temperatureRangeCelsius",
  ];

  for (const key of z25Fields) {
    const value = item[key];
    if (value !== null && value !== undefined) {
      merged[key] = value;
    }
  }

  // Z34c tier-4 attributes — added 2026-05-23. Same merge semantics:
  // typed-snapshot field takes precedence over any pre-existing
  // parametricAttributes JSON entry. Arrays (frequencyBandsGhz) are
  // emitted as-is — the matcher's `contains` predicate handles them.
  const z34cFields: Array<keyof TradeItemParametricSnapshot> = [
    // Tier 1 — spacecraft hardware
    "solarCellEfficiencyPercent",
    "batterySpecificEnergyWhPerKg",
    "peakPowerWatts",
    "antennaGainDbi",
    "frequencyBandsGhz",
    "polarisationType",
    "thermalCycleCount",
    // Tier 2 — propulsion
    "propellantType",
    "thrustNewtons",
    "nozzleExpansionRatio",
    "specificImpulseSecondsVacuum",
    // Tier 3 — mission ops
    "missionDurationYears",
    "inclinationDegrees",
    "apogeeKm",
    "perigeeKm",
    // Tier 4 — imaging payloads
    "swirSpectralBands",
    "mwirSpectralBands",
    "lwirSpectralBands",
    "hyperspectralBandCount",
  ];

  for (const key of z34cFields) {
    const value = item[key];
    if (value !== null && value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}
