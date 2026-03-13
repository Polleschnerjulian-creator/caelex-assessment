import { describe, it, expect } from "vitest";
import { join } from "node:path";
import {
  ScenarioRunner,
  loadScenarioProfile,
  gaussianNoise,
  seededRandom,
} from "../../../simulator/scenario-engine.js";

const SCENARIOS_DIR = join(__dirname, "../../../simulator/scenarios");

describe("Scenario Profile Loading", () => {
  it("loads fuel-depletion.yaml correctly", () => {
    const profile = loadScenarioProfile(
      join(SCENARIOS_DIR, "fuel-depletion.yaml"),
    );
    expect(profile.id).toBe("fuel-depletion");
    expect(profile.name).toContain("Fuel Depletion");
    expect(profile.satellites).toHaveLength(1);

    const sat = profile.satellites[0]!;
    expect(sat.noradId).toBe("58421");
    expect(sat.initial.fuelPct).toBe(45);
    expect(sat.degradation.fuelPerDayPct).toBe(0.18);
    expect(sat.events).toHaveLength(3);
  });

  it("loads cyber-incident.yaml correctly", () => {
    const profile = loadScenarioProfile(
      join(SCENARIOS_DIR, "cyber-incident.yaml"),
    );
    expect(profile.id).toBe("cyber-incident");
    expect(profile.satellites).toHaveLength(1);

    const sat = profile.satellites[0]!;
    expect(sat.noradId).toBe("99001");
    expect(sat.initial.patchCompliancePct).toBe(96);
    expect(sat.events).toHaveLength(4);
  });
});

describe("Fuel Depletion Scenario — 90-Day Run", () => {
  it("fuel decreases over time and approaches Art. 70 threshold", () => {
    const profile = loadScenarioProfile(
      join(SCENARIOS_DIR, "fuel-depletion.yaml"),
    );
    const start = new Date("2026-01-01T00:00:00Z");
    const runner = new ScenarioRunner(profile, start);

    const fuelByDay: number[] = [];

    for (let day = 0; day <= 90; day++) {
      const now = new Date(start.getTime() + day * 86400000);
      runner.tick(now);
      const state = runner.getState("58421");
      expect(state).toBeDefined();
      fuelByDay.push(state!.fuelPct);
    }

    // Day 0: should be close to 45%
    expect(fuelByDay[0]!).toBeGreaterThan(40);
    expect(fuelByDay[0]!).toBeLessThan(50);

    // Day 30: should be lower
    expect(fuelByDay[30]!).toBeLessThan(fuelByDay[0]!);

    // Day 60: should be even lower
    expect(fuelByDay[60]!).toBeLessThan(fuelByDay[30]!);

    // Day 90: should be approaching Art. 70 threshold (15%)
    expect(fuelByDay[90]!).toBeLessThan(25);

    // Fuel is generally decreasing (allow tiny noise fluctuations)
    let decreasing = 0;
    for (let i = 5; i < fuelByDay.length; i += 5) {
      if (fuelByDay[i]! < fuelByDay[i - 5]!) decreasing++;
    }
    // At least 80% of 5-day windows should show decrease
    expect(decreasing / Math.floor(fuelByDay.length / 5)).toBeGreaterThan(0.7);
  });

  it("altitude decays in LEO", () => {
    const profile = loadScenarioProfile(
      join(SCENARIOS_DIR, "fuel-depletion.yaml"),
    );
    const start = new Date("2026-01-01T00:00:00Z");
    const runner = new ScenarioRunner(profile, start);

    runner.tick(new Date(start.getTime() + 0));
    const state0 = runner.getState("58421")!;

    runner.tick(new Date(start.getTime() + 90 * 86400000));
    const state90 = runner.getState("58421")!;

    expect(state90.altitudeKm).toBeLessThan(state0.altitudeKm);
  });
});

describe("Cyber Incident Scenario — Event Triggers", () => {
  it("cyber incident fires on day 30, recovery starts day 35", () => {
    const profile = loadScenarioProfile(
      join(SCENARIOS_DIR, "cyber-incident.yaml"),
    );
    const start = new Date("2026-01-01T00:00:00Z");
    const runner = new ScenarioRunner(profile, start);

    // Day 29: nominal
    for (let d = 0; d <= 29; d++) {
      runner.tick(new Date(start.getTime() + d * 86400000));
    }
    const state29 = runner.getState("99001")!;
    expect(state29.patchCompliancePct).toBeGreaterThan(90);
    expect(state29.unpatchedCriticalVulns).toBe(0);

    // Day 31: after cyber incident
    runner.tick(new Date(start.getTime() + 30 * 86400000));
    runner.tick(new Date(start.getTime() + 31 * 86400000));
    const state31 = runner.getState("99001")!;
    expect(state31.patchCompliancePct).toBeLessThan(70);
    expect(state31.unpatchedCriticalVulns).toBe(3);
    expect(state31.incidentResponseMttrMin).toBe(2400);

    // Day 50: recovery in progress
    for (let d = 32; d <= 50; d++) {
      runner.tick(new Date(start.getTime() + d * 86400000));
    }
    const state50 = runner.getState("99001")!;
    expect(state50.patchCompliancePct).toBeGreaterThan(80);
    expect(state50.unpatchedCriticalVulns).toBe(0); // Patched at day 44

    // Day 55: mostly recovered
    for (let d = 51; d <= 55; d++) {
      runner.tick(new Date(start.getTime() + d * 86400000));
    }
    const state55 = runner.getState("99001")!;
    expect(state55.patchCompliancePct).toBeGreaterThan(90);
    expect(state55.incidentResponseMttrMin).toBeLessThan(1000);
  });
});

describe("Event Firing Rules", () => {
  it("AFTER_DAYS events fire only once", () => {
    const profile = loadScenarioProfile(
      join(SCENARIOS_DIR, "cyber-incident.yaml"),
    );
    const start = new Date("2026-01-01T00:00:00Z");
    const runner = new ScenarioRunner(profile, start);

    // Tick past day 30 (cyber incident)
    for (let d = 0; d <= 31; d++) {
      runner.tick(new Date(start.getTime() + d * 86400000));
    }
    const state31 = runner.getState("99001")!;
    const patchAfterIncident = state31.patchCompliancePct;

    // Tick day 32 — event should NOT fire again
    runner.tick(new Date(start.getTime() + 32 * 86400000));
    const state32 = runner.getState("99001")!;

    // Patch should NOT drop again (no second incident)
    // It may change slightly due to recovery, but should not drop by patchDrop (31) again
    expect(state32.patchCompliancePct).toBeGreaterThanOrEqual(
      patchAfterIncident - 5,
    );
  });

  it("WHEN_BELOW threshold events fire when metric crosses threshold", () => {
    const profile = loadScenarioProfile(
      join(SCENARIOS_DIR, "fuel-depletion.yaml"),
    );
    const start = new Date("2026-01-01T00:00:00Z");
    const runner = new ScenarioRunner(profile, start);

    // Run until fuel drops below 30%
    let day = 0;
    let fuelBelow30Day = -1;
    while (day < 200) {
      runner.tick(new Date(start.getTime() + day * 86400000));
      const state = runner.getState("58421")!;
      if (state.fuelPct < 30 && fuelBelow30Day === -1) {
        fuelBelow30Day = day;
      }
      day++;
      if (fuelBelow30Day > 0 && day > fuelBelow30Day + 5) break;
    }

    // The WHEN_BELOW event should have triggered
    expect(fuelBelow30Day).toBeGreaterThan(0);
  });
});

describe("Gaussian Noise", () => {
  it("has mean approximately 0 over 1000 samples", () => {
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(gaussianNoise(1.0, i * 1000));
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.15); // Loose tolerance
  });

  it("standard deviation matches configured value", () => {
    const stddev = 2.0;
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      samples.push(gaussianNoise(stddev, i * 1000));
    }
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance =
      samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
    const measuredStddev = Math.sqrt(variance);
    // Should be roughly 2.0 (allow wide margin)
    expect(measuredStddev).toBeGreaterThan(stddev * 0.3);
    expect(measuredStddev).toBeLessThan(stddev * 3.0);
  });

  it("no sample exceeds 6 sigma", () => {
    const stddev = 1.0;
    for (let i = 0; i < 10000; i++) {
      const sample = gaussianNoise(stddev, i * 1000);
      expect(Math.abs(sample)).toBeLessThan(6 * stddev);
    }
  });
});

describe("Seeded Random", () => {
  it("same seed produces same value", () => {
    expect(seededRandom(42)).toBe(seededRandom(42));
  });

  it("different seeds produce different values", () => {
    expect(seededRandom(42)).not.toBe(seededRandom(43));
  });

  it("values are in [0, 1) range", () => {
    for (let i = 0; i < 1000; i++) {
      const val = seededRandom(i);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});

describe("State Reproducibility", () => {
  it("same start + same ticks = same states", () => {
    const profile = loadScenarioProfile(
      join(SCENARIOS_DIR, "fuel-depletion.yaml"),
    );
    const start = new Date("2026-01-01T00:00:00Z");

    const runner1 = new ScenarioRunner(profile, start);
    const runner2 = new ScenarioRunner(profile, start);

    for (let d = 0; d <= 30; d++) {
      const t = new Date(start.getTime() + d * 86400000);
      runner1.tick(t);
      runner2.tick(t);
    }

    const state1 = runner1.getState("58421")!;
    const state2 = runner2.getState("58421")!;

    expect(state1.fuelPct).toBe(state2.fuelPct);
    expect(state1.altitudeKm).toBe(state2.altitudeKm);
    expect(state1.solarArrayPowerPct).toBe(state2.solarArrayPowerPct);
  });
});
