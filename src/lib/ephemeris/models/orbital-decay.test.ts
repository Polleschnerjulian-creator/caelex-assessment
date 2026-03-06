/**
 * Orbital Decay Prediction Model Tests
 *
 * Pure computation — no mocks needed.
 */

import { describe, it, expect } from "vitest";
import { predictOrbitalDecay, getOrbitalDecayFactors } from "./orbital-decay";
import type { OrbitalElements } from "../core/types";
import {
  DESTRUCTION_ALTITUDE_KM,
  WARNING_ALTITUDE_KM,
} from "../core/constants";

function makeElements(
  overrides: Partial<OrbitalElements> = {},
): OrbitalElements {
  return {
    noradId: "25544",
    epoch: new Date().toISOString(),
    semiMajorAxisKm: 6371 + 400,
    eccentricity: 0.0001,
    inclinationDeg: 51.6,
    raanDeg: 0,
    argPerigeeDeg: 0,
    meanAnomalyDeg: 0,
    meanMotion: 15.5,
    bstar: 0.0001,
    altitudeKm: 400,
    periodMinutes: 92.9,
    ...overrides,
  };
}

describe("predictOrbitalDecay", () => {
  // ─── Normal cases ───

  it("returns a valid forecast for ISS-like orbit (400 km)", () => {
    const result = predictOrbitalDecay(makeElements({ altitudeKm: 400 }), 150);

    expect(result.currentAltitudeKm).toBe(400);
    expect(result.estimatedLifetimeYears).toBeGreaterThan(0);
    expect(result.altitudeCurve.length).toBeGreaterThan(0);
    expect(result.confidence).toMatch(/^(HIGH|MEDIUM|LOW)$/);
  });

  it("predicts decay over 1 year — altitude decreases", () => {
    const result = predictOrbitalDecay(makeElements({ altitudeKm: 400 }), 150);

    // First and last altitude curve points
    const firstAlt = result.altitudeCurve[0]!.nominal;
    const lastAlt =
      result.altitudeCurve[result.altitudeCurve.length - 1]!.nominal;

    expect(lastAlt).toBeLessThanOrEqual(firstAlt);
  });

  it("predicts faster decay with higher solar flux", () => {
    const lowFlux = predictOrbitalDecay(makeElements({ altitudeKm: 400 }), 70);
    const highFlux = predictOrbitalDecay(
      makeElements({ altitudeKm: 400 }),
      250,
    );

    // Higher F10.7 = more atmospheric drag = shorter lifetime
    expect(highFlux.estimatedLifetimeYears).toBeLessThanOrEqual(
      lowFlux.estimatedLifetimeYears,
    );
  });

  it("predicts faster decay with larger area-to-mass ratio", () => {
    const small = predictOrbitalDecay(
      makeElements({ altitudeKm: 400 }),
      150,
      0.005,
    );
    const large = predictOrbitalDecay(
      makeElements({ altitudeKm: 400 }),
      150,
      0.05,
    );

    expect(large.estimatedLifetimeYears).toBeLessThanOrEqual(
      small.estimatedLifetimeYears,
    );
  });

  it("generates uncertainty bands (best/worst case)", () => {
    const result = predictOrbitalDecay(makeElements({ altitudeKm: 400 }), 150);

    for (const point of result.altitudeCurve) {
      expect(point.bestCase).toBeGreaterThanOrEqual(point.worstCase);
      expect(point.bestCase).toBeGreaterThanOrEqual(point.nominal - 1); // nominal ≈ between best and worst
    }
  });

  // ─── High orbit (> 1000 km) ───

  it("returns stable forecast for high orbits (> 1000 km)", () => {
    const result = predictOrbitalDecay(makeElements({ altitudeKm: 1200 }), 150);

    expect(result.currentAltitudeKm).toBe(1200);
    expect(result.estimatedLifetimeYears).toBe(100);
    expect(result.art68Status).toBe("COMPLIANT");
    expect(result.reentryDate).toBeNull();

    // All altitude curve points should be the same
    for (const point of result.altitudeCurve) {
      expect(point.nominal).toBe(1200);
    }
  });

  it("returns COMPLIANT Art. 68 status for high orbits", () => {
    const result = predictOrbitalDecay(makeElements({ altitudeKm: 2000 }), 150);
    expect(result.art68Status).toBe("COMPLIANT");
  });

  // ─── Edge cases: very low orbits (< 300 km) ───

  it("predicts faster decay for 250 km than 400 km (fewer forecast points or earlier reentry)", () => {
    const low = predictOrbitalDecay(makeElements({ altitudeKm: 250 }), 150);
    const mid = predictOrbitalDecay(makeElements({ altitudeKm: 400 }), 150);

    // 250 km orbit decays faster — either shorter curve or earlier reentry
    const lowReachedFloor =
      low.altitudeCurve.length <= mid.altitudeCurve.length;
    const lowLowerMidpoint =
      low.altitudeCurve[Math.min(1, low.altitudeCurve.length - 1)]!.nominal <=
      mid.altitudeCurve[Math.min(1, mid.altitudeCurve.length - 1)]!.nominal;

    expect(lowReachedFloor || lowLowerMidpoint).toBe(true);
  });

  it("predicts faster decay for 150 km than 250 km", () => {
    const low = predictOrbitalDecay(makeElements({ altitudeKm: 150 }), 150);
    const higher = predictOrbitalDecay(makeElements({ altitudeKm: 250 }), 150);

    // 150 km has much denser atmosphere — faster decay
    expect(low.estimatedLifetimeYears).toBeLessThanOrEqual(
      higher.estimatedLifetimeYears,
    );
  });

  // ─── Edge cases: very high LEO (> 800 km) ───

  it("predicts very slow decay for 800 km orbit", () => {
    const result = predictOrbitalDecay(makeElements({ altitudeKm: 800 }), 150);

    // At 800 km, atmospheric drag is minimal — lifetime close to forecast horizon
    expect(result.estimatedLifetimeYears).toBeGreaterThan(4);
  });

  it("handles borderline high orbit (999 km)", () => {
    const result = predictOrbitalDecay(makeElements({ altitudeKm: 999 }), 150);

    // Should still compute drag (just barely under 1000 km threshold)
    expect(result.altitudeCurve.length).toBeGreaterThan(0);
    expect(result.estimatedLifetimeYears).toBeGreaterThan(0);
  });

  // ─── Output validation ───

  it("never returns negative altitude in forecast curve", () => {
    const result = predictOrbitalDecay(makeElements({ altitudeKm: 200 }), 250);

    for (const point of result.altitudeCurve) {
      expect(point.nominal).toBeGreaterThanOrEqual(DESTRUCTION_ALTITUDE_KM);
      expect(point.bestCase).toBeGreaterThanOrEqual(DESTRUCTION_ALTITUDE_KM);
      expect(point.worstCase).toBeGreaterThanOrEqual(DESTRUCTION_ALTITUDE_KM);
    }
  });

  it("all altitude curve dates are ISO strings in the future", () => {
    const result = predictOrbitalDecay(makeElements({ altitudeKm: 400 }), 150);
    const nowMs = Date.now() - 60_000; // 1 minute tolerance

    for (const point of result.altitudeCurve) {
      const ts = new Date(point.date).getTime();
      expect(ts).toBeGreaterThan(nowMs);
      expect(point.isHistorical).toBe(false);
    }
  });

  // ─── Confidence ───

  it("returns HIGH confidence for fresh TLE (< 24h epoch age)", () => {
    const result = predictOrbitalDecay(
      makeElements({ epoch: new Date().toISOString(), altitudeKm: 400 }),
      150,
    );
    expect(result.confidence).toBe("HIGH");
  });

  it("returns LOW confidence for stale TLE (> 1 week epoch age)", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const result = predictOrbitalDecay(
      makeElements({ epoch: twoWeeksAgo.toISOString(), altitudeKm: 400 }),
      150,
    );
    expect(result.confidence).toBe("LOW");
  });
});

describe("getOrbitalDecayFactors", () => {
  it("returns 2 compliance factors", () => {
    const forecast = predictOrbitalDecay(
      makeElements({ altitudeKm: 400 }),
      150,
    );
    const factors = getOrbitalDecayFactors(forecast);

    expect(factors).toHaveLength(2);
    expect(factors[0]!.id).toBe("orbital_lifetime");
    expect(factors[1]!.id).toBe("orbital_altitude");
  });

  it("marks orbital_altitude as COMPLIANT when well above warning zone", () => {
    const forecast = predictOrbitalDecay(
      makeElements({ altitudeKm: 400 }),
      150,
    );
    const factors = getOrbitalDecayFactors(forecast);

    const altFactor = factors.find((f) => f.id === "orbital_altitude")!;
    expect(altFactor.status).toBe("COMPLIANT");
    expect(altFactor.currentValue).toBe(400);
    expect(altFactor.thresholdValue).toBe(WARNING_ALTITUDE_KM);
  });

  it("marks orbital_altitude as WARNING near warning zone", () => {
    const forecast = predictOrbitalDecay(
      makeElements({ altitudeKm: 180 }),
      150,
    );
    const factors = getOrbitalDecayFactors(forecast);

    const altFactor = factors.find((f) => f.id === "orbital_altitude")!;
    expect(altFactor.status).toBe("WARNING");
  });

  it("marks orbital_altitude as NON_COMPLIANT below destruction altitude", () => {
    // Can't really go below destruction alt since the model clamps,
    // but the factor uses currentAltitudeKm from the forecast
    const forecast = predictOrbitalDecay(
      makeElements({ altitudeKm: 400 }),
      150,
    );
    // Override for testing
    forecast.currentAltitudeKm = 110;
    const factors = getOrbitalDecayFactors(forecast);

    const altFactor = factors.find((f) => f.id === "orbital_altitude")!;
    expect(altFactor.status).toBe("NON_COMPLIANT");
  });
});
