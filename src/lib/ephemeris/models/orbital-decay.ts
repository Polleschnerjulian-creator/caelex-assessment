import type {
  ComplianceFactorInternal,
  OrbitalElements,
  OrbitalDecayForecast,
  ForecastPoint,
  Confidence,
} from "../core/types";
import {
  ATMOSPHERIC_LAYERS,
  EARTH_RADIUS_KM,
  EARTH_MU,
  F107_REFERENCE,
  F107_DENSITY_SCALING,
  DESTRUCTION_ALTITUDE_KM,
  WARNING_ALTITUDE_KM,
  DEFAULT_DRAG_COEFFICIENT,
  DEFAULT_AREA_TO_MASS,
  FORECAST_HORIZON_DAYS,
  FORECAST_RESOLUTION_DAYS,
} from "../core/constants";
import { COMPLIANCE_THRESHOLDS } from "@/lib/compliance/thresholds";

/**
 * Semi-analytical atmospheric drag model for orbital decay prediction.
 *
 * NOT SGP4 — SGP4 is for short-term (<7 day) propagation.
 * This model uses exponential atmospheric density with solar flux scaling
 * for multi-year forecasting.
 *
 * Physics:
 *   ρ(h) = ρ₀ × exp(-(h - h₀) / H)                       (exponential density)
 *   ρ_eff = ρ × (1 + scaling × (F10.7 - F10.7_ref))        (solar flux adjustment)
 *   da/dt = -2π × a² × ρ × (A/m) × Cd × v                 (semi-major axis decay rate)
 */

/**
 * Predict orbital decay for a satellite.
 */
export function predictOrbitalDecay(
  elements: OrbitalElements,
  f107: number,
  areaToMass: number = DEFAULT_AREA_TO_MASS,
  dragCoefficient: number = DEFAULT_DRAG_COEFFICIENT,
  kpIndex: number = 3,
): OrbitalDecayForecast {
  const altitudeKm = elements.altitudeKm;

  // High orbits (> 1000 km): negligible drag, very long lifetime
  if (altitudeKm > 1000) {
    return buildHighOrbitForecast(altitudeKm, elements);
  }

  // Run decay simulation
  const { altitudeCurve, reentryDayOffset, warningDayOffset } = simulateDecay(
    altitudeKm,
    f107,
    areaToMass,
    dragCoefficient,
    kpIndex,
  );

  // Calculate estimated lifetime
  const estimatedLifetimeYears = reentryDayOffset
    ? reentryDayOffset / 365.25
    : FORECAST_HORIZON_DAYS / 365.25;

  // Art. 68 status: 25-year orbital lifetime limit
  const art68Threshold = COMPLIANCE_THRESHOLDS.eu_space_act_art_68.threshold;
  const art68Status =
    estimatedLifetimeYears <= art68Threshold
      ? ("COMPLIANT" as const)
      : estimatedLifetimeYears <= art68Threshold + 3
        ? ("WARNING" as const)
        : ("NON_COMPLIANT" as const);

  const now = new Date();
  const reentryDate = reentryDayOffset
    ? new Date(
        now.getTime() + reentryDayOffset * 24 * 60 * 60 * 1000,
      ).toISOString()
    : null;

  return {
    currentAltitudeKm: altitudeKm,
    estimatedLifetimeYears,
    altitudeCurve,
    art68Status,
    art68CrossingDate: null, // Art. 68 is about lifetime, not a crossing event
    reentryDate,
    confidence: getConfidence(elements, warningDayOffset),
  };
}

/**
 * Generate ComplianceFactorInternal entries from orbital decay prediction.
 */
export function getOrbitalDecayFactors(
  forecast: OrbitalDecayForecast,
): ComplianceFactorInternal[] {
  const t = COMPLIANCE_THRESHOLDS.eu_space_act_art_68;

  const daysToThreshold =
    forecast.estimatedLifetimeYears > t.threshold
      ? null // Already non-compliant if lifetime exceeds 25 years
      : null; // Compliant — no breach approaching from this direction

  // For orbit decay, daysToThreshold represents when the satellite will
  // enter the danger zone (low altitude / reentry risk)
  const daysToReentry = forecast.reentryDate
    ? Math.max(
        0,
        Math.floor(
          (new Date(forecast.reentryDate).getTime() - Date.now()) /
            (24 * 60 * 60 * 1000),
        ),
      )
    : null;

  return [
    {
      id: "orbital_lifetime",
      name: `25-Year Orbital Lifetime Limit (Art. 68)`,
      regulationRef: "eu_space_act_art_68",
      thresholdValue: t.threshold,
      thresholdType: t.type,
      unit: t.unit,
      status: forecast.art68Status,
      source: "derived",
      confidence:
        forecast.confidence === "HIGH"
          ? 0.9
          : forecast.confidence === "MEDIUM"
            ? 0.7
            : 0.4,
      lastMeasured: new Date().toISOString(),
      currentValue: forecast.estimatedLifetimeYears,
      daysToThreshold,
    },
    {
      id: "orbital_altitude",
      name: "Current Orbital Altitude",
      regulationRef: "eu_space_act_art_68",
      thresholdValue: WARNING_ALTITUDE_KM,
      thresholdType: "ABOVE",
      unit: "km",
      status:
        forecast.currentAltitudeKm > WARNING_ALTITUDE_KM
          ? "COMPLIANT"
          : forecast.currentAltitudeKm > DESTRUCTION_ALTITUDE_KM
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "derived",
      confidence: forecast.confidence === "HIGH" ? 0.95 : 0.7,
      lastMeasured: new Date().toISOString(),
      currentValue: forecast.currentAltitudeKm,
      daysToThreshold: daysToReentry,
    },
  ];
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

interface DecaySimulationResult {
  altitudeCurve: ForecastPoint[];
  reentryDayOffset: number | null;
  warningDayOffset: number | null;
}

function simulateDecay(
  startAltKm: number,
  f107: number,
  areaToMass: number,
  cd: number,
  kpIndex: number,
): DecaySimulationResult {
  const now = new Date();
  const altitudeCurve: ForecastPoint[] = [];
  let currentAlt = startAltKm;
  let reentryDayOffset: number | null = null;
  let warningDayOffset: number | null = null;

  for (
    let day = 0;
    day <= FORECAST_HORIZON_DAYS;
    day += FORECAST_RESOLUTION_DAYS
  ) {
    // Step through FORECAST_RESOLUTION_DAYS at a time
    for (
      let subDay = 0;
      subDay < FORECAST_RESOLUTION_DAYS &&
      day + subDay <= FORECAST_HORIZON_DAYS;
      subDay++
    ) {
      const decayRate = computeDailyDecayKm(
        currentAlt,
        f107,
        areaToMass,
        cd,
        kpIndex,
      );
      currentAlt -= decayRate;

      if (currentAlt <= DESTRUCTION_ALTITUDE_KM && reentryDayOffset === null) {
        reentryDayOffset = day + subDay;
      }
      if (currentAlt <= WARNING_ALTITUDE_KM && warningDayOffset === null) {
        warningDayOffset = day + subDay;
      }
    }

    // Clamp to minimum
    if (currentAlt < DESTRUCTION_ALTITUDE_KM)
      currentAlt = DESTRUCTION_ALTITUDE_KM;

    const pointDate = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);

    // Best/worst case: ±20% uncertainty on decay rate
    const bestAlt = Math.max(
      startAltKm -
        computeCumulativeDecay(startAltKm, f107 * 0.8, areaToMass, cd, day),
      DESTRUCTION_ALTITUDE_KM,
    );
    const worstAlt = Math.max(
      startAltKm -
        computeCumulativeDecay(startAltKm, f107 * 1.3, areaToMass, cd, day),
      DESTRUCTION_ALTITUDE_KM,
    );

    altitudeCurve.push({
      date: pointDate.toISOString(),
      nominal: Math.round(currentAlt * 100) / 100,
      bestCase: Math.round(bestAlt * 100) / 100,
      worstCase: Math.round(worstAlt * 100) / 100,
      isHistorical: false,
    });

    if (currentAlt <= DESTRUCTION_ALTITUDE_KM) break;
  }

  return { altitudeCurve, reentryDayOffset, warningDayOffset };
}

/**
 * Compute daily altitude decay in km using exponential atmospheric model.
 */
function computeDailyDecayKm(
  altKm: number,
  f107: number,
  areaToMass: number,
  cd: number,
  kpIndex: number = 3,
): number {
  if (altKm <= DESTRUCTION_ALTITUDE_KM) return 0;
  if (altKm > 1000) return 0; // No drag above 1000 km

  const density = getAtmosphericDensity(altKm, f107, kpIndex);
  if (density <= 0) return 0;

  // Semi-major axis in meters
  const a = (EARTH_RADIUS_KM + altKm) * 1000;

  // Orbital velocity: v = sqrt(μ/a)
  const v = Math.sqrt(EARTH_MU / a);

  // Semi-major axis decay rate: da/dt = -2π × a² × ρ × (A/m) × Cd × v
  // Units: m/s → convert to km/day
  const dadt = -2 * Math.PI * a * a * density * areaToMass * cd * v;

  // Convert m/s to km/day (×86400 / 1000)
  const decayKmPerDay = (Math.abs(dadt) * 86400) / 1000;

  return decayKmPerDay;
}

/**
 * Compute cumulative altitude loss over N days (simplified integration).
 */
function computeCumulativeDecay(
  startAltKm: number,
  f107: number,
  areaToMass: number,
  cd: number,
  days: number,
): number {
  let totalDecay = 0;
  let currentAlt = startAltKm;

  for (let d = 0; d < days; d++) {
    const dailyDecay = computeDailyDecayKm(currentAlt, f107, areaToMass, cd);
    totalDecay += dailyDecay;
    currentAlt -= dailyDecay;
    if (currentAlt <= DESTRUCTION_ALTITUDE_KM) break;
  }

  return totalDecay;
}

/**
 * Get atmospheric density at altitude using exponential layer model.
 * ρ(h) = ρ₀ × exp(-(h - h₀) / H) with solar flux scaling.
 */
function getAtmosphericDensity(
  altKm: number,
  f107: number,
  kpIndex: number = 3,
): number {
  if (altKm < ATMOSPHERIC_LAYERS[0]!.baseAlt) {
    // Below model range — use lowest layer extrapolation
    const layer = ATMOSPHERIC_LAYERS[0]!;
    return (
      layer.baseDensity * Math.exp(-(altKm - layer.baseAlt) / layer.scaleHeight)
    );
  }

  // Find appropriate atmospheric layer
  let layer: { baseAlt: number; baseDensity: number; scaleHeight: number } =
    ATMOSPHERIC_LAYERS[0]!;
  for (const l of ATMOSPHERIC_LAYERS) {
    if (altKm >= l.baseAlt) {
      layer = l;
    } else {
      break;
    }
  }

  // Exponential density model
  const rho =
    layer.baseDensity * Math.exp(-(altKm - layer.baseAlt) / layer.scaleHeight);

  // Solar flux scaling: density increases with higher solar activity
  const solarScale = 1 + F107_DENSITY_SCALING * (f107 - F107_REFERENCE);

  // Kp geomagnetic scaling: thermospheric heating increases density
  // Kp=0 → 1.0x, Kp=9 → 1.3x (30% increase at extreme storm)
  const kpScale = 1 + (kpIndex / 9) * 0.3;

  return rho * Math.max(solarScale, 0.1) * kpScale;
}

function buildHighOrbitForecast(
  altitudeKm: number,
  elements: OrbitalElements,
): OrbitalDecayForecast {
  const now = new Date();
  const points: ForecastPoint[] = [];

  // For high orbits, altitude is essentially constant over forecast horizon
  for (
    let day = 0;
    day <= FORECAST_HORIZON_DAYS;
    day += FORECAST_RESOLUTION_DAYS
  ) {
    const pointDate = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
    points.push({
      date: pointDate.toISOString(),
      nominal: altitudeKm,
      bestCase: altitudeKm,
      worstCase: altitudeKm,
      isHistorical: false,
    });
  }

  const lifetimeYears = 100; // Effectively infinite for compliance purposes

  return {
    currentAltitudeKm: altitudeKm,
    estimatedLifetimeYears: lifetimeYears,
    altitudeCurve: points,
    art68Status: "COMPLIANT",
    art68CrossingDate: null,
    reentryDate: null,
    confidence: elements.epoch ? "MEDIUM" : "LOW",
  };
}

function getConfidence(
  elements: OrbitalElements,
  warningDayOffset: number | null,
): Confidence {
  // Confidence based on TLE freshness
  const epochAge =
    (Date.now() - new Date(elements.epoch).getTime()) / (60 * 60 * 1000); // hours

  if (epochAge < 24) return "HIGH";
  if (epochAge < 168) return "MEDIUM"; // < 1 week
  return "LOW";
}
