import "server-only";

import {
  ATMOSPHERIC_LAYERS,
  EARTH_RADIUS_KM,
  EARTH_MU,
  F107_REFERENCE,
  F107_DENSITY_SCALING,
} from "@/lib/ephemeris/core/constants";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OrbitalLifetimeEstimate {
  estimatedLifetimeYears: number;
  estimatedDecayDate: string;
  confidenceLevel: "high" | "medium" | "low";
  assumptions: string[];
  isWithin25Years: boolean;
  isWithin5Years: boolean;
  solarActivityAssumption: string;
}

// ─── Main Function ──────────────────────────────────────────────────────────

/**
 * Estimate post-mission orbital lifetime using the same atmospheric density
 * model as the Ephemeris engine's orbital-decay predictor.
 *
 * For the debris module, users supply altitude + optional parameters rather
 * than a full TLE set. We run a simplified daily-step simulation reusing
 * the Ephemeris layer-based exponential atmosphere.
 */
export function estimateOrbitalLifetime(params: {
  altitudeKm: number;
  inclinationDeg: number;
  ballisticCoefficientKgPerM2?: number;
  solarFluxF107?: number;
}): OrbitalLifetimeEstimate {
  const {
    altitudeKm,
    inclinationDeg,
    ballisticCoefficientKgPerM2 = 50,
    solarFluxF107 = 120,
  } = params;

  // Convert ballistic coefficient to area-to-mass ratio
  // β = m / (Cd × A)  →  A/m = 1 / (Cd × β)
  const cd = 2.2; // Same as DEFAULT_DRAG_COEFFICIENT
  const areaToMass = 1 / (cd * ballisticCoefficientKgPerM2);

  // High orbits (> 1000 km): negligible drag
  if (altitudeKm > 1000) {
    const lifetimeYears =
      altitudeKm > 2000 ? 1000 : 100 + (altitudeKm - 1000) * 0.5;
    return buildResult(
      lifetimeYears,
      altitudeKm,
      inclinationDeg,
      ballisticCoefficientKgPerM2,
      solarFluxF107,
    );
  }

  // Run day-by-day decay simulation using the Ephemeris atmospheric model
  let currentAlt = altitudeKm;
  let dayCount = 0;
  const maxDays = 365.25 * 200; // Cap at 200 years
  const destructionAlt = 120; // km

  while (currentAlt > destructionAlt && dayCount < maxDays) {
    const decayKmPerDay = computeDailyDecayKm(
      currentAlt,
      solarFluxF107,
      areaToMass,
      cd,
    );
    currentAlt -= decayKmPerDay;
    dayCount++;

    // Adaptive step: skip ahead when decay rate is negligible
    if (decayKmPerDay < 0.0001 && currentAlt > 300) {
      // Estimate remaining time linearly at this rate
      const remainingAlt = currentAlt - destructionAlt;
      const daysRemaining =
        decayKmPerDay > 0 ? remainingAlt / decayKmPerDay : maxDays;
      dayCount += Math.min(daysRemaining, maxDays - dayCount);
      break;
    }
  }

  const lifetimeYears = dayCount / 365.25;
  return buildResult(
    lifetimeYears,
    altitudeKm,
    inclinationDeg,
    ballisticCoefficientKgPerM2,
    solarFluxF107,
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildResult(
  lifetimeYears: number,
  altitudeKm: number,
  inclinationDeg: number,
  bc: number,
  f107: number,
): OrbitalLifetimeEstimate {
  const roundedLifetime = Math.round(lifetimeYears * 10) / 10;
  const decayDate = new Date(
    Date.now() + roundedLifetime * 365.25 * 86400 * 1000,
  );

  const solarLabel =
    f107 < 80
      ? "Solar minimum (conservative)"
      : f107 > 200
        ? "Solar maximum (optimistic)"
        : "Moderate solar activity";

  return {
    estimatedLifetimeYears: roundedLifetime,
    estimatedDecayDate: decayDate.toISOString().split("T")[0],
    confidenceLevel:
      altitudeKm < 600 ? "high" : altitudeKm < 800 ? "medium" : "low",
    assumptions: [
      `Altitude: ${altitudeKm} km`,
      `Inclination: ${inclinationDeg}\u00B0`,
      `Ballistic coefficient: ${bc} kg/m\u00B2`,
      `Solar flux F10.7: ${f107} sfu (${solarLabel.toLowerCase()})`,
      "Ephemeris CIRA exponential atmospheric model",
      "Circular orbit assumption",
    ],
    isWithin25Years: roundedLifetime <= 25,
    isWithin5Years: roundedLifetime <= 5,
    solarActivityAssumption: solarLabel,
  };
}

/**
 * Compute daily altitude decay in km.
 * Reuses the same physics as src/lib/ephemeris/models/orbital-decay.ts
 */
function computeDailyDecayKm(
  altKm: number,
  f107: number,
  areaToMass: number,
  cd: number,
): number {
  if (altKm <= 120) return 0;
  if (altKm > 1000) return 0;

  const density = getAtmosphericDensity(altKm, f107);
  if (density <= 0) return 0;

  const a = (EARTH_RADIUS_KM + altKm) * 1000; // semi-major axis in meters
  const v = Math.sqrt(EARTH_MU / a); // orbital velocity m/s

  // da/dt = -2pi * a^2 * rho * (A/m) * Cd * v
  const dadt = 2 * Math.PI * a * a * density * areaToMass * cd * v;

  // Convert m/s to km/day
  return (Math.abs(dadt) * 86400) / 1000;
}

/**
 * Atmospheric density using Ephemeris CIRA layer model with solar flux scaling.
 */
function getAtmosphericDensity(altKm: number, f107: number): number {
  if (altKm < ATMOSPHERIC_LAYERS[0].baseAlt) {
    const layer = ATMOSPHERIC_LAYERS[0];
    return (
      layer.baseDensity * Math.exp(-(altKm - layer.baseAlt) / layer.scaleHeight)
    );
  }

  let layer: {
    readonly baseAlt: number;
    readonly baseDensity: number;
    readonly scaleHeight: number;
  } = ATMOSPHERIC_LAYERS[0];
  for (const l of ATMOSPHERIC_LAYERS) {
    if (altKm >= l.baseAlt) {
      layer = l;
    } else {
      break;
    }
  }

  const rho =
    layer.baseDensity * Math.exp(-(altKm - layer.baseAlt) / layer.scaleHeight);
  const solarScale = 1 + F107_DENSITY_SCALING * (f107 - F107_REFERENCE);

  return rho * Math.max(solarScale, 0.1);
}
