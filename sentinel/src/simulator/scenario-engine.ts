import { readFileSync } from "node:fs";
import { parse } from "yaml";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface ScenarioProfile {
  id: string;
  name: string;
  satellites: SatelliteScenario[];
}

export interface SatelliteScenario {
  noradId: string;
  name: string;
  orbitType: "LEO" | "MEO" | "GEO" | "SSO" | "HEO";
  initial: {
    altitudeKm: number;
    inclinationDeg: number;
    eccentricity: number;
    fuelPct: number;
    thrusterStatus: 0 | 1;
    batterySOC: number;
    solarArrayPowerPct: number;
    patchCompliancePct: number;
    mfaAdoptionPct: number;
    unpatchedCriticalVulns: number;
    incidentResponseMttrMin: number;
  };
  degradation: {
    fuelPerDayPct: number;
    fuelPerManeuverPct: number;
    maneuverIntervalDays: number;
    solarDegradationPerYearPct: number;
    altitudeDecayKmPerDay: number;
  };
  events: ScenarioEvent[];
}

export interface ScenarioEvent {
  label: string;
  trigger:
    | { type: "AFTER_DAYS"; days: number }
    | { type: "WHEN_BELOW"; metric: string; value: number }
    | { type: "WHEN_ABOVE"; metric: string; value: number }
    | { type: "RANDOM_PER_DAY"; probability: number };
  action:
    | { type: "SET"; metric: string; value: number }
    | { type: "MULTIPLY_RATE"; metric: string; multiplier: number }
    | {
        type: "CYBER_INCIDENT";
        patchDrop: number;
        vulnsAdded: number;
        mttrSpike: number;
      }
    | {
        type: "RECOVERY";
        metric: string;
        recoveryPerDay: number;
        target: number;
      }
    | { type: "MANEUVER"; fuelCostPct: number };
}

/** Runtime state for a single satellite in a scenario. */
export interface SatelliteRuntimeState {
  // Orbital
  altitudeKm: number;
  inclinationDeg: number;
  eccentricity: number;
  fuelPct: number;
  thrusterStatus: 0 | 1;
  batterySOC: number;
  solarArrayPowerPct: number;
  // Cyber
  patchCompliancePct: number;
  mfaAdoptionPct: number;
  unpatchedCriticalVulns: number;
  incidentResponseMttrMin: number;
}

// ═══════════════════════════════════════════════════════════════════════
// SCENARIO RUNNER
// ═══════════════════════════════════════════════════════════════════════

export class ScenarioRunner {
  private profile: ScenarioProfile;
  private states = new Map<string, SatelliteRuntimeState>();
  private startTime: Date;
  private lastTickTime: Date;
  private firedEvents = new Map<string, Set<string>>(); // noradId → set of fired event labels
  private rateMultipliers = new Map<string, Map<string, number>>(); // noradId → metric → multiplier
  private activeRecoveries = new Map<
    string,
    Array<{ metric: string; recoveryPerDay: number; target: number }>
  >();
  private maneuverTracker = new Map<string, number>(); // noradId → last maneuver day
  private noiseSeed: number;

  constructor(profile: ScenarioProfile, startTime?: Date) {
    this.profile = profile;
    this.startTime = startTime ?? new Date();
    this.lastTickTime = this.startTime;
    this.noiseSeed = 42;

    for (const sat of profile.satellites) {
      this.states.set(sat.noradId, { ...sat.initial });
      this.firedEvents.set(sat.noradId, new Set());
      this.rateMultipliers.set(sat.noradId, new Map());
      this.activeRecoveries.set(sat.noradId, []);
      this.maneuverTracker.set(sat.noradId, -Infinity);
    }
  }

  /**
   * Advance the simulation to the given time (or +1 day from last tick).
   * Fuel degradation is incremental (respects rate multipliers).
   * Altitude/solar are computed relative to startTime.
   * Events are evaluated after degradation.
   */
  tick(now?: Date): void {
    const currentTime = now ?? new Date(this.lastTickTime.getTime() + 86400000);
    const elapsedDays =
      (currentTime.getTime() - this.startTime.getTime()) / 86400000;
    const deltaDays =
      (currentTime.getTime() - this.lastTickTime.getTime()) / 86400000;

    for (const sat of this.profile.satellites) {
      const state = this.states.get(sat.noradId);
      if (!state) continue;

      // Apply degradation (fuel is incremental, altitude/solar are absolute)
      this.applyDegradation(sat, state, elapsedDays, deltaDays);

      // Evaluate events
      this.evaluateEvents(sat, state, elapsedDays);

      // Apply active recoveries (per-day incremental)
      this.applyRecoveries(sat.noradId, state);
    }

    this.lastTickTime = currentTime;
  }

  getState(noradId: string): SatelliteRuntimeState | undefined {
    const state = this.states.get(noradId);
    return state ? { ...state } : undefined;
  }

  getElapsedDays(): number {
    return (this.lastTickTime.getTime() - this.startTime.getTime()) / 86400000;
  }

  getProfile(): ScenarioProfile {
    return this.profile;
  }

  // ─────────────────────────────────────────────────────────
  // DEGRADATION
  // ─────────────────────────────────────────────────────────

  private applyDegradation(
    sat: SatelliteScenario,
    state: SatelliteRuntimeState,
    elapsedDays: number,
    deltaDays: number,
  ): void {
    const deg = sat.degradation;

    // Fuel: INCREMENTAL — respects rate multipliers applied mid-simulation
    const fuelRateMultiplier =
      this.rateMultipliers.get(sat.noradId)?.get("fuelPerDayPct") ?? 1;
    const dailyFuelLoss = deg.fuelPerDayPct * fuelRateMultiplier * deltaDays;

    // Scheduled maneuvers: check if a new maneuver should occur this tick
    const lastManeuverDay = this.maneuverTracker.get(sat.noradId) ?? -Infinity;
    let maneuverFuelLoss = 0;
    if (
      deg.maneuverIntervalDays > 0 &&
      elapsedDays - lastManeuverDay >= deg.maneuverIntervalDays
    ) {
      maneuverFuelLoss = deg.fuelPerManeuverPct;
      this.maneuverTracker.set(sat.noradId, elapsedDays);
    }

    state.fuelPct = Math.max(
      0,
      state.fuelPct -
        dailyFuelLoss -
        maneuverFuelLoss +
        gaussianNoise(0.02, this.nextSeed()),
    );

    // Altitude decay (absolute from start — no rate changes)
    state.altitudeKm = Math.max(
      100,
      sat.initial.altitudeKm -
        deg.altitudeDecayKmPerDay * elapsedDays +
        gaussianNoise(0.01, this.nextSeed()),
    );

    // Solar degradation (absolute from start — no rate changes)
    const solarLoss = (deg.solarDegradationPerYearPct / 365) * elapsedDays;
    state.solarArrayPowerPct = Math.max(
      0,
      sat.initial.solarArrayPowerPct -
        solarLoss +
        gaussianNoise(0.02, this.nextSeed()),
    );
  }

  // ─────────────────────────────────────────────────────────
  // EVENTS
  // ─────────────────────────────────────────────────────────

  private evaluateEvents(
    sat: SatelliteScenario,
    state: SatelliteRuntimeState,
    elapsedDays: number,
  ): void {
    const fired = this.firedEvents.get(sat.noradId)!;

    for (const event of sat.events) {
      // Skip already-fired non-random events
      if (event.trigger.type !== "RANDOM_PER_DAY" && fired.has(event.label)) {
        continue;
      }

      if (!this.checkTrigger(event.trigger, state, elapsedDays)) {
        continue;
      }

      // Fire the event
      if (event.trigger.type !== "RANDOM_PER_DAY") {
        fired.add(event.label);
      }

      this.applyAction(sat.noradId, event.action, state);
    }
  }

  private checkTrigger(
    trigger: ScenarioEvent["trigger"],
    state: SatelliteRuntimeState,
    elapsedDays: number,
  ): boolean {
    switch (trigger.type) {
      case "AFTER_DAYS":
        return elapsedDays >= trigger.days;
      case "WHEN_BELOW":
        return this.getMetricValue(state, trigger.metric) < trigger.value;
      case "WHEN_ABOVE":
        return this.getMetricValue(state, trigger.metric) > trigger.value;
      case "RANDOM_PER_DAY":
        // Use seeded random for reproducibility
        return seededRandom(this.nextSeed()) < trigger.probability;
    }
  }

  private applyAction(
    noradId: string,
    action: ScenarioEvent["action"],
    state: SatelliteRuntimeState,
  ): void {
    switch (action.type) {
      case "SET":
        this.setMetricValue(state, action.metric, action.value);
        break;
      case "MULTIPLY_RATE": {
        const mults = this.rateMultipliers.get(noradId)!;
        const current = mults.get(action.metric) ?? 1;
        mults.set(action.metric, current * action.multiplier);
        break;
      }
      case "CYBER_INCIDENT":
        state.patchCompliancePct = Math.max(
          0,
          state.patchCompliancePct - action.patchDrop,
        );
        state.unpatchedCriticalVulns += action.vulnsAdded;
        state.incidentResponseMttrMin = action.mttrSpike;
        break;
      case "RECOVERY":
        this.activeRecoveries.get(noradId)!.push({
          metric: action.metric,
          recoveryPerDay: action.recoveryPerDay,
          target: action.target,
        });
        break;
      case "MANEUVER":
        state.fuelPct = Math.max(0, state.fuelPct - action.fuelCostPct);
        break;
    }
  }

  // ─────────────────────────────────────────────────────────
  // RECOVERIES
  // ─────────────────────────────────────────────────────────

  private applyRecoveries(noradId: string, state: SatelliteRuntimeState): void {
    const recoveries = this.activeRecoveries.get(noradId)!;
    const remaining: typeof recoveries = [];

    for (const rec of recoveries) {
      const current = this.getMetricValue(state, rec.metric);
      if (rec.recoveryPerDay > 0 && current < rec.target) {
        this.setMetricValue(
          state,
          rec.metric,
          Math.min(rec.target, current + rec.recoveryPerDay),
        );
        remaining.push(rec);
      } else if (rec.recoveryPerDay < 0 && current > rec.target) {
        this.setMetricValue(
          state,
          rec.metric,
          Math.max(rec.target, current + rec.recoveryPerDay),
        );
        remaining.push(rec);
      }
      // If target reached, recovery is done (not pushed to remaining)
    }

    this.activeRecoveries.set(noradId, remaining);
  }

  // ─────────────────────────────────────────────────────────
  // METRIC ACCESS
  // ─────────────────────────────────────────────────────────

  private getMetricValue(state: SatelliteRuntimeState, metric: string): number {
    const val = (state as Record<string, unknown>)[metric];
    return typeof val === "number" ? val : 0;
  }

  private setMetricValue(
    state: SatelliteRuntimeState,
    metric: string,
    value: number,
  ): void {
    (state as Record<string, number>)[metric] = value;
  }

  // ─────────────────────────────────────────────────────────
  // NOISE & SEEDED RANDOM
  // ─────────────────────────────────────────────────────────

  private nextSeed(): number {
    // Simple LCG for reproducible noise
    this.noiseSeed = (this.noiseSeed * 1664525 + 1013904223) & 0x7fffffff;
    return this.noiseSeed;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PROFILE LOADING
// ═══════════════════════════════════════════════════════════════════════

export function loadScenarioProfile(path: string): ScenarioProfile {
  const content = readFileSync(path, "utf-8");
  const raw = parse(content) as Record<string, unknown>;

  const profile: ScenarioProfile = {
    id: raw["id"] as string,
    name: raw["name"] as string,
    satellites: ((raw["satellites"] as unknown[]) ?? []).map(
      parseSatelliteScenario,
    ),
  };

  return profile;
}

function parseSatelliteScenario(raw: unknown): SatelliteScenario {
  const r = raw as Record<string, unknown>;
  const initial = r["initial"] as Record<string, unknown>;
  const degradation = r["degradation"] as Record<string, unknown>;
  const events = (r["events"] as unknown[]) ?? [];

  return {
    noradId: r["noradId"] as string,
    name: r["name"] as string,
    orbitType: r["orbitType"] as SatelliteScenario["orbitType"],
    initial: {
      altitudeKm: initial["altitudeKm"] as number,
      inclinationDeg: initial["inclinationDeg"] as number,
      eccentricity: initial["eccentricity"] as number,
      fuelPct: initial["fuelPct"] as number,
      thrusterStatus: initial["thrusterStatus"] as 0 | 1,
      batterySOC: initial["batterySOC"] as number,
      solarArrayPowerPct: initial["solarArrayPowerPct"] as number,
      patchCompliancePct: initial["patchCompliancePct"] as number,
      mfaAdoptionPct: initial["mfaAdoptionPct"] as number,
      unpatchedCriticalVulns: initial["unpatchedCriticalVulns"] as number,
      incidentResponseMttrMin: initial["incidentResponseMttrMin"] as number,
    },
    degradation: {
      fuelPerDayPct: degradation["fuelPerDayPct"] as number,
      fuelPerManeuverPct: degradation["fuelPerManeuverPct"] as number,
      maneuverIntervalDays: degradation["maneuverIntervalDays"] as number,
      solarDegradationPerYearPct: degradation[
        "solarDegradationPerYearPct"
      ] as number,
      altitudeDecayKmPerDay: degradation["altitudeDecayKmPerDay"] as number,
    },
    events: events.map(parseEvent),
  };
}

function parseEvent(raw: unknown): ScenarioEvent {
  const r = raw as Record<string, unknown>;
  return {
    label: r["label"] as string,
    trigger: r["trigger"] as ScenarioEvent["trigger"],
    action: r["action"] as ScenarioEvent["action"],
  };
}

// ═══════════════════════════════════════════════════════════════════════
// NOISE FUNCTIONS (exported for testing)
// ═══════════════════════════════════════════════════════════════════════

/**
 * Gaussian noise using Box-Muller transform.
 * Seeded for reproducibility in tests.
 */
export function gaussianNoise(stddev: number, seed: number): number {
  const u1 = seededRandom(seed);
  const u2 = seededRandom(seed + 7919); // Use different seed for second uniform
  // Box-Muller transform
  const z =
    Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  return z * stddev;
}

/**
 * Seeded pseudo-random number in [0, 1).
 * Uses a hash of the seed for uniform distribution.
 */
export function seededRandom(seed: number): number {
  // Mulberry32
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
