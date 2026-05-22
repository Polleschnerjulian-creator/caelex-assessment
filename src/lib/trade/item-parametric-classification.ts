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

  return merged;
}
