/**
 * SHIELD — Maneuver Calculator
 *
 * Pure functions for estimating delta-V, fuel consumption, and optimal maneuver
 * window for collision avoidance. No server-only import — safe for client use.
 *
 * Physics constants:
 *   EARTH_RADIUS_KM = 6371 km
 *   μ (standard gravitational parameter) = 398600.4418 km³/s²
 *   g0 (standard gravity) = 9.80665 m/s²
 */

const EARTH_RADIUS_KM = 6371;
const MU_KM3_S2 = 398600.4418; // km³/s²
const G0_M_S2 = 9.80665; // m/s²

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface ManeuverInput {
  /** Current altitude in km */
  altitudeKm: number;
  /** Current inclination in degrees */
  inclinationDeg: number;
  /** Current miss distance in meters */
  currentMissDistanceM: number;
  /** Desired miss distance in meters (target) */
  targetMissDistanceM: number;
  /** Hours until TCA */
  hoursToTca: number;
  /** Collision probability */
  collisionProbability: number;
  /** Spacecraft dry mass in kg (optional, for fuel calc) */
  spacecraftMassKg?: number;
  /** Available fuel in kg (optional) */
  availableFuelKg?: number;
  /** Specific impulse in seconds (optional, default 300 for hydrazine) */
  ispSeconds?: number;
}

export interface ManeuverResult {
  /** Estimated delta-V needed in m/s */
  deltaVMs: number;
  /** Estimated fuel consumption in kg (if mass provided) */
  fuelConsumptionKg: number | null;
  /** Fuel percentage of available (if fuel provided) */
  fuelPercentUsed: number | null;
  /** Optimal maneuver window: hours before TCA */
  optimalWindowHours: number;
  /** Latest possible maneuver: hours before TCA */
  latestWindowHours: number;
  /** Maneuver type recommendation */
  maneuverType: "along-track" | "cross-track" | "radial";
  /** Risk assessment */
  feasibility: "recommended" | "marginal" | "not_recommended";
  /** Explanation */
  explanation: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Orbital period in seconds for a circular orbit at given altitude.
 * T = 2π * sqrt((R+h)³ / μ)
 */
function orbitalPeriodSeconds(altitudeKm: number): number {
  const semiMajorAxisKm = EARTH_RADIUS_KM + altitudeKm;
  return 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxisKm, 3) / MU_KM3_S2);
}

/**
 * Tsiolkovsky rocket equation: mass of propellant consumed.
 * fuel = mass * (1 - exp(-deltaV / (Isp * g0)))
 * deltaV must be in m/s, g0 in m/s², result in kg.
 */
function tsiolkovskyFuel(
  massKg: number,
  deltaVMs: number,
  ispSeconds: number,
): number {
  return massKg * (1 - Math.exp(-deltaVMs / (ispSeconds * G0_M_S2)));
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Calculate collision avoidance maneuver parameters.
 *
 * Delta-V rule of thumb (standard CA sizing):
 *   deltaV ≈ miss_distance_change / (2 * time_to_tca)
 * where miss_distance_change is in metres and time_to_tca is in seconds,
 * giving deltaV in m/s.
 */
export function calculateManeuver(input: ManeuverInput): ManeuverResult {
  const {
    altitudeKm,
    inclinationDeg,
    currentMissDistanceM,
    targetMissDistanceM,
    hoursToTca,
    collisionProbability,
    spacecraftMassKg,
    availableFuelKg,
    ispSeconds = 300,
  } = input;

  // Guard: ensure positive time to TCA
  const safeHoursToTca = Math.max(hoursToTca, 0.01);
  const timeToTcaSeconds = safeHoursToTca * 3600;

  // ── Delta-V (standard CA rule of thumb) ──────────────────────────────────
  // deltaV ≈ deltaDistance / (2 * timeToTca)
  const missDistanceChange = Math.abs(
    targetMissDistanceM - currentMissDistanceM,
  );
  const deltaVMs = missDistanceChange / (2 * timeToTcaSeconds);

  // ── Orbital period ────────────────────────────────────────────────────────
  const periodSeconds = orbitalPeriodSeconds(altitudeKm);
  const periodHours = periodSeconds / 3600;

  // ── Maneuver timing windows ───────────────────────────────────────────────
  // Optimal: 1–2 orbital periods before TCA (use 1.5 periods as midpoint)
  // Cap at hoursToTca so the window is never in the past.
  const optimalWindowHours = Math.min(1.5 * periodHours, safeHoursToTca);

  // Latest: half an orbital period before TCA
  const latestWindowHours = Math.min(0.5 * periodHours, safeHoursToTca);

  // ── Fuel consumption ──────────────────────────────────────────────────────
  let fuelConsumptionKg: number | null = null;
  let fuelPercentUsed: number | null = null;

  if (spacecraftMassKg != null && spacecraftMassKg > 0) {
    fuelConsumptionKg = tsiolkovskyFuel(spacecraftMassKg, deltaVMs, ispSeconds);

    if (availableFuelKg != null && availableFuelKg > 0) {
      fuelPercentUsed = (fuelConsumptionKg / availableFuelKg) * 100;
    }
  }

  // ── Maneuver type selection ───────────────────────────────────────────────
  // Along-track is most efficient for miss distance changes in the
  // along-track direction (most LEO/MEO conjunctions).
  // Cross-track preferred for high-inclination / polar orbits (>70°).
  // Radial is least efficient but useful when time to TCA is very short.
  let maneuverType: ManeuverResult["maneuverType"];
  if (safeHoursToTca < 1) {
    maneuverType = "radial";
  } else if (Math.abs(inclinationDeg) > 70) {
    maneuverType = "cross-track";
  } else {
    maneuverType = "along-track";
  }

  // ── Feasibility ───────────────────────────────────────────────────────────
  const fuelPct = fuelPercentUsed ?? 0;
  let feasibility: ManeuverResult["feasibility"];

  if (deltaVMs < 1 && (fuelPercentUsed == null || fuelPct < 10)) {
    feasibility = "recommended";
  } else if (deltaVMs < 5) {
    feasibility = "marginal";
  } else {
    feasibility = "not_recommended";
  }

  // ── Explanation ───────────────────────────────────────────────────────────
  const pcFormatted = collisionProbability.toExponential(2);
  const orbitLabel =
    altitudeKm < 2000 ? "LEO" : altitudeKm < 35000 ? "MEO" : "GEO";

  const explanationParts: string[] = [
    `${orbitLabel} orbit at ${altitudeKm} km altitude.`,
    `Collision probability ${pcFormatted} requires a ${maneuverType} maneuver of ${deltaVMs.toFixed(4)} m/s`,
    `to increase miss distance from ${currentMissDistanceM.toFixed(0)} m to ${targetMissDistanceM.toFixed(0)} m.`,
  ];

  if (fuelConsumptionKg != null) {
    explanationParts.push(
      `Estimated fuel: ${fuelConsumptionKg.toFixed(3)} kg (Isp=${ispSeconds} s).`,
    );
  }

  explanationParts.push(
    `Optimal burn window: ${optimalWindowHours.toFixed(1)} h before TCA;`,
    `latest actionable window: ${latestWindowHours.toFixed(1)} h before TCA.`,
  );

  if (feasibility === "not_recommended") {
    explanationParts.push(
      "Delta-V exceeds operational threshold — consider alternative risk mitigation.",
    );
  } else if (feasibility === "marginal") {
    explanationParts.push(
      "Maneuver is feasible but at the margins of typical CA budgets.",
    );
  }

  return {
    deltaVMs,
    fuelConsumptionKg,
    fuelPercentUsed,
    optimalWindowHours,
    latestWindowHours,
    maneuverType,
    feasibility,
    explanation: explanationParts.join(" "),
  };
}
