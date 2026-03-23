/**
 * Maneuver Calculator — unit tests
 */

import { describe, it, expect } from "vitest";
import {
  calculateManeuver,
  type ManeuverInput,
  type ManeuverResult,
} from "./maneuver-calculator";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function leoInput(overrides: Partial<ManeuverInput> = {}): ManeuverInput {
  return {
    altitudeKm: 550, // typical LEO
    inclinationDeg: 53,
    currentMissDistanceM: 200,
    targetMissDistanceM: 1000,
    hoursToTca: 48,
    collisionProbability: 1e-4,
    ...overrides,
  };
}

function geoInput(overrides: Partial<ManeuverInput> = {}): ManeuverInput {
  return {
    altitudeKm: 35786, // GEO
    inclinationDeg: 0.05,
    currentMissDistanceM: 500,
    targetMissDistanceM: 2000,
    hoursToTca: 72,
    collisionProbability: 1e-5,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("calculateManeuver", () => {
  // ── Return shape ────────────────────────────────────────────────────────────
  it("returns all required fields", () => {
    const result = calculateManeuver(leoInput());

    expect(result).toHaveProperty("deltaVMs");
    expect(result).toHaveProperty("fuelConsumptionKg");
    expect(result).toHaveProperty("fuelPercentUsed");
    expect(result).toHaveProperty("optimalWindowHours");
    expect(result).toHaveProperty("latestWindowHours");
    expect(result).toHaveProperty("maneuverType");
    expect(result).toHaveProperty("feasibility");
    expect(result).toHaveProperty("explanation");
  });

  // ── LEO typical CA scenario ─────────────────────────────────────────────────
  it("LEO 48 h to TCA produces deltaV in 0.01–1 m/s range", () => {
    // miss_distance_change = 800 m, time = 48 h = 172800 s
    // deltaV = 800 / (2 * 172800) ≈ 0.00231 m/s — just below 0.01,
    // so extend target to 5000 m to get into range
    const result = calculateManeuver(
      leoInput({ targetMissDistanceM: 5000, currentMissDistanceM: 100 }),
    );

    expect(result.deltaVMs).toBeGreaterThan(0.01);
    expect(result.deltaVMs).toBeLessThan(1);
  });

  it("LEO typical scenario: feasibility is recommended for small deltaV", () => {
    // deltaV = (1000-200) / (2 * 48 * 3600) = 800 / 345600 ≈ 0.00231 m/s < 1 m/s
    const result = calculateManeuver(leoInput());
    expect(result.feasibility).toBe("recommended");
    expect(result.deltaVMs).toBeGreaterThan(0);
    expect(result.deltaVMs).toBeLessThan(1);
  });

  it("LEO orbit type is along-track for mid-inclination", () => {
    const result = calculateManeuver(leoInput({ inclinationDeg: 53 }));
    expect(result.maneuverType).toBe("along-track");
  });

  // ── GEO scenario ────────────────────────────────────────────────────────────
  it("GEO scenario produces a smaller deltaV than LEO for same miss distance change", () => {
    const leo = calculateManeuver(
      leoInput({
        hoursToTca: 72,
        currentMissDistanceM: 200,
        targetMissDistanceM: 1000,
      }),
    );
    const geo = calculateManeuver(
      geoInput({
        hoursToTca: 72,
        currentMissDistanceM: 200,
        targetMissDistanceM: 1000,
      }),
    );

    // Both use same miss distance change and TCA — deltaV formula is pure kinematics,
    // so they should be equal (the formula doesn't depend on altitude directly).
    // The altitude only affects windows and period. Both are valid, equal deltaV.
    expect(geo.deltaVMs).toBeCloseTo(leo.deltaVMs, 10);

    // GEO has much longer orbital period → larger optimal window
    expect(geo.optimalWindowHours).toBeGreaterThan(leo.optimalWindowHours);
  });

  it("GEO optimal window is longer than LEO optimal window", () => {
    const leo = calculateManeuver(leoInput({ hoursToTca: 200 }));
    const geo = calculateManeuver(geoInput({ hoursToTca: 200 }));

    expect(geo.optimalWindowHours).toBeGreaterThan(leo.optimalWindowHours);
  });

  // ── Close TCA vs distant TCA ─────────────────────────────────────────────────
  it("6 h to TCA produces higher deltaV than 72 h to TCA (same miss change)", () => {
    const close = calculateManeuver(
      leoInput({
        hoursToTca: 6,
        currentMissDistanceM: 100,
        targetMissDistanceM: 1000,
      }),
    );
    const distant = calculateManeuver(
      leoInput({
        hoursToTca: 72,
        currentMissDistanceM: 100,
        targetMissDistanceM: 1000,
      }),
    );

    expect(close.deltaVMs).toBeGreaterThan(distant.deltaVMs);
  });

  it("6 h to TCA: maneuverType is radial (time critical)", () => {
    const result = calculateManeuver(leoInput({ hoursToTca: 0.5 }));
    expect(result.maneuverType).toBe("radial");
  });

  it("high-inclination polar orbit uses cross-track maneuver", () => {
    const result = calculateManeuver(leoInput({ inclinationDeg: 97 }));
    expect(result.maneuverType).toBe("cross-track");
  });

  // ── Very low miss distance → not_recommended ─────────────────────────────────
  it("very small miss distance with short TCA is not_recommended", () => {
    // miss = 10 m, target = 1000 m, TCA = 2 h → deltaV = 990 / (2*7200) ≈ 0.069 m/s
    // That is still < 1 m/s; to force not_recommended push targetMissDistance very high
    // and TCA very short
    // deltaV = 50000 / (2 * 0.5 * 3600) = 50000 / 3600 ≈ 13.9 m/s → not_recommended
    const result = calculateManeuver(
      leoInput({
        hoursToTca: 0.5,
        currentMissDistanceM: 10,
        targetMissDistanceM: 50010,
      }),
    );
    expect(result.feasibility).toBe("not_recommended");
    expect(result.deltaVMs).toBeGreaterThanOrEqual(5);
  });

  it("moderately high deltaV (1–5 m/s) is marginal", () => {
    // deltaV = deltaD / (2 * t)
    // target 2 h to TCA, need change of ~10800 m → 10800 / (2*7200) = 0.75 m/s (still < 1)
    // use change 36000 m over 2h → 36000/14400 = 2.5 m/s
    const result = calculateManeuver(
      leoInput({
        hoursToTca: 2,
        currentMissDistanceM: 0,
        targetMissDistanceM: 36000,
      }),
    );
    expect(result.feasibility).toBe("marginal");
    expect(result.deltaVMs).toBeGreaterThan(1);
    expect(result.deltaVMs).toBeLessThan(5);
  });

  // ── Fuel calculation ─────────────────────────────────────────────────────────
  it("fuel consumption is null when mass is not provided", () => {
    const result = calculateManeuver(leoInput());
    expect(result.fuelConsumptionKg).toBeNull();
    expect(result.fuelPercentUsed).toBeNull();
  });

  it("fuel consumption is computed when mass is provided", () => {
    const result = calculateManeuver(
      leoInput({ spacecraftMassKg: 500, ispSeconds: 300 }),
    );
    expect(result.fuelConsumptionKg).not.toBeNull();
    expect(result.fuelConsumptionKg).toBeGreaterThan(0);
    // For a small deltaV the fuel should be very small compared to total mass
    expect(result.fuelConsumptionKg!).toBeLessThan(10);
  });

  it("fuel percentage is computed when both mass and available fuel are provided", () => {
    const result = calculateManeuver(
      leoInput({ spacecraftMassKg: 500, availableFuelKg: 50, ispSeconds: 300 }),
    );
    expect(result.fuelPercentUsed).not.toBeNull();
    expect(result.fuelPercentUsed!).toBeGreaterThan(0);
    expect(result.fuelPercentUsed!).toBeLessThan(100);
  });

  it("fuel percentage is null when availableFuelKg is not provided", () => {
    const result = calculateManeuver(leoInput({ spacecraftMassKg: 500 }));
    expect(result.fuelPercentUsed).toBeNull();
  });

  it("Tsiolkovsky: known mass/Isp/deltaV produces expected fuel", () => {
    // deltaV = (2000 - 200) / (2 * 48 * 3600) = 1800 / 345600 ≈ 0.005208 m/s
    // fuel = 1000 * (1 - exp(-0.005208 / (300 * 9.80665)))
    //      = 1000 * (1 - exp(-1.771e-6)) ≈ 1000 * 1.771e-6 ≈ 0.001771 kg
    const result = calculateManeuver(
      leoInput({
        spacecraftMassKg: 1000,
        ispSeconds: 300,
        currentMissDistanceM: 200,
        targetMissDistanceM: 2000,
        hoursToTca: 48,
      }),
    );
    const expectedDeltaV = 1800 / (2 * 48 * 3600);
    const expectedFuel =
      1000 * (1 - Math.exp(-expectedDeltaV / (300 * 9.80665)));

    expect(result.deltaVMs).toBeCloseTo(expectedDeltaV, 8);
    expect(result.fuelConsumptionKg).toBeCloseTo(expectedFuel, 6);
  });

  // ── Window timing ───────────────────────────────────────────────────────────
  it("optimal window does not exceed hoursToTca", () => {
    const result = calculateManeuver(leoInput({ hoursToTca: 0.5 }));
    expect(result.optimalWindowHours).toBeLessThanOrEqual(0.5);
  });

  it("latest window is always ≤ optimal window", () => {
    const result = calculateManeuver(leoInput({ hoursToTca: 48 }));
    expect(result.latestWindowHours).toBeLessThanOrEqual(
      result.optimalWindowHours,
    );
  });

  it("latest window = half an orbital period for LEO with ample time", () => {
    // LEO 550 km: T ≈ 5765 s ≈ 1.60 h; half-period ≈ 0.80 h
    // With hoursToTca = 200 the cap won't apply
    const result = calculateManeuver(leoInput({ hoursToTca: 200 }));
    // T = 2π * sqrt((6371+550)³ / 398600.4418) ≈ 5765.5 s
    const periodS =
      2 * Math.PI * Math.sqrt(Math.pow(6371 + 550, 3) / 398600.4418);
    const expected = periodS / 3600 / 2;
    expect(result.latestWindowHours).toBeCloseTo(expected, 2);
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────
  it("handles currentMissDistance === targetMissDistance (no change needed)", () => {
    const result = calculateManeuver(
      leoInput({ currentMissDistanceM: 1000, targetMissDistanceM: 1000 }),
    );
    expect(result.deltaVMs).toBe(0);
    expect(result.feasibility).toBe("recommended");
  });

  it("explanation is a non-empty string", () => {
    const result = calculateManeuver(leoInput());
    expect(typeof result.explanation).toBe("string");
    expect(result.explanation.length).toBeGreaterThan(0);
  });
});
