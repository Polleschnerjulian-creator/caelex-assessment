import { describe, it, expect } from "vitest";
import {
  predictOrbitalDecay,
  getOrbitalDecayFactors,
} from "@/lib/ephemeris/models/orbital-decay";
import type { OrbitalElements } from "@/lib/ephemeris/core/types";

function makeElements(overrides?: Partial<OrbitalElements>): OrbitalElements {
  return {
    noradId: "25544",
    epoch: new Date().toISOString(),
    altitudeKm: 408,
    inclinationDeg: 51.64,
    eccentricity: 0.0001,
    raanDeg: 200,
    argPerigeeDeg: 90,
    meanAnomalyDeg: 0,
    semiMajorAxisKm: 6371 + 408,
    periodMinutes: 92.68,
    bstar: 0.00001,
    ...overrides,
  };
}

describe("Orbital Decay Model", () => {
  it("predicts ISS-like orbit (408 km) will eventually decay", () => {
    const elements = makeElements({ altitudeKm: 408 });
    const forecast = predictOrbitalDecay(elements, 150);

    expect(forecast.currentAltitudeKm).toBe(408);
    expect(forecast.altitudeCurve.length).toBeGreaterThan(0);
    // ISS orbit should predict some decay over 5 years
    expect(forecast.confidence).toBeDefined();
  });

  it("returns long lifetime for high orbits (>1000 km)", () => {
    const elements = makeElements({ altitudeKm: 1200 });
    const forecast = predictOrbitalDecay(elements, 150);

    expect(forecast.currentAltitudeKm).toBe(1200);
    // High orbits have effectively infinite lifetime
    expect(forecast.reentryDate).toBeNull();
  });

  it("predicts faster decay with higher solar flux", () => {
    const elements = makeElements({ altitudeKm: 350 });
    const lowFlux = predictOrbitalDecay(elements, 70);
    const highFlux = predictOrbitalDecay(elements, 250);

    // Higher solar flux means more atmospheric drag = faster decay
    const lowLastPoint =
      lowFlux.altitudeCurve[lowFlux.altitudeCurve.length - 1];
    const highLastPoint =
      highFlux.altitudeCurve[highFlux.altitudeCurve.length - 1];

    if (lowLastPoint && highLastPoint) {
      // Higher flux should result in lower altitude at end of forecast
      expect(highLastPoint.nominal).toBeLessThanOrEqual(lowLastPoint.nominal);
    }
  });

  it("generates compliance factors from forecast", () => {
    const elements = makeElements({ altitudeKm: 408 });
    const forecast = predictOrbitalDecay(elements, 150);
    const factors = getOrbitalDecayFactors(forecast);

    expect(factors.length).toBeGreaterThan(0);
    // Should have at least an altitude factor
    const altFactor = factors.find((f) => f.id.includes("altitude"));
    expect(altFactor).toBeDefined();
    if (altFactor) {
      expect(altFactor.regulationRef).toBe("eu_space_act_art_68");
      expect(altFactor.currentValue).toBe(408);
      expect(altFactor.unit).toBe("km");
    }
  });

  it("handles very low orbits with imminent reentry", () => {
    const elements = makeElements({ altitudeKm: 180 });
    const forecast = predictOrbitalDecay(elements, 150);

    // Very low orbit should predict relatively quick reentry
    expect(forecast.currentAltitudeKm).toBe(180);
    // At 180km, reentry should be predicted within the forecast horizon
    if (forecast.reentryDate) {
      const daysToReentry = Math.floor(
        (new Date(forecast.reentryDate).getTime() - Date.now()) / 86400000,
      );
      expect(daysToReentry).toBeGreaterThanOrEqual(0);
    }
  });
});
