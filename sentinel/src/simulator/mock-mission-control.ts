import { type SatelliteState, createInitialState } from "./seed-data.js";

/**
 * Simulated Mission Control / Flight Dynamics System.
 *
 * Maintains evolving satellite state with:
 * - Orbital decay (~0.01–0.03 km/day in LEO)
 * - Fuel consumption (~0.05–0.15%/day, more during maneuvers)
 * - Occasional thruster degradation events
 * - Conjunction assessments (2–5/month, ~0.5 maneuvers/month)
 * - Rare safe-mode events
 */
export class MockMissionControl {
  private states = new Map<string, SatelliteState>();
  private tickCount = 0;

  initialize(
    satellites: Array<{
      norad_id: string;
      name: string;
      orbit_type: string;
      initial_altitude_km?: number;
      initial_inclination_deg?: number;
    }>,
  ): void {
    for (const sat of satellites) {
      this.states.set(
        sat.norad_id,
        createInitialState(
          sat.norad_id,
          sat.name,
          sat.orbit_type,
          sat.initial_altitude_km,
          sat.initial_inclination_deg,
        ),
      );
    }
  }

  /**
   * Advance the simulation and return current telemetry.
   * Called every 15 minutes by the orbit collector.
   */
  readTelemetry(noradId: string): SatelliteState | null {
    const state = this.states.get(noradId);
    if (!state) return null;

    this.tickCount++;
    this.evolve(state);

    return { ...state };
  }

  private evolve(s: SatelliteState): void {
    // Time step: ~15 minutes = 1/96 of a day
    const dt = 1 / 96;

    // --- Orbital decay ---
    if (s.altitude_km < 2000) {
      // LEO atmospheric drag — stronger at lower altitudes
      const dragFactor = s.altitude_km < 400 ? 0.04 : 0.015;
      const decayKm = dragFactor * dt * (1 + jitter(0.3));
      s.altitude_km -= decayKm;
      s.semi_major_axis_km = 6371 + s.altitude_km;
    }

    // --- Fuel consumption ---
    const baseFuelRate = 0.001 * dt; // ~0.1%/day
    s.remaining_fuel_kg -= baseFuelRate * s.initial_fuel_kg * (1 + jitter(0.2));
    s.remaining_fuel_kg = Math.max(0, s.remaining_fuel_kg);

    // --- Conjunction assessment events ---
    // ~3 per month ≈ 0.1 per day ≈ 0.001 per tick
    if (Math.random() < 0.001) {
      const pc = Math.pow(10, -(3 + Math.random() * 4)); // 1e-7 to 1e-3
      const isHighRisk = pc > 1e-4;
      const maneuvered =
        isHighRisk && Math.random() < 0.7 && s.thruster_status !== "FAILED";

      s.ca_events_log.push({
        date: new Date().toISOString(),
        pc,
        maneuvered,
      });

      // Keep only last 60 days
      const cutoff = Date.now() - 60 * 86400000;
      s.ca_events_log = s.ca_events_log.filter(
        (e) => new Date(e.date).getTime() > cutoff,
      );

      if (maneuvered) {
        const dv = 0.01 + Math.random() * 0.05;
        s.last_maneuver_timestamp = new Date().toISOString();
        s.last_maneuver_delta_v = dv;
        s.remaining_fuel_kg -= 0.3 + Math.random() * 0.4;
        s.remaining_fuel_kg = Math.max(0, s.remaining_fuel_kg);
      }
    }

    // --- Thruster status degradation (rare) ---
    if (s.thruster_status === "NOMINAL" && Math.random() < 0.00005) {
      s.thruster_status = "DEGRADED";
    } else if (s.thruster_status === "DEGRADED" && Math.random() < 0.001) {
      // Sometimes recovers
      s.thruster_status = "NOMINAL";
    }

    // --- Attitude anomaly (very rare) ---
    if (s.attitude_status === "NOMINAL" && Math.random() < 0.00002) {
      s.attitude_status = "SAFE_MODE";
    } else if (s.attitude_status === "SAFE_MODE" && Math.random() < 0.01) {
      s.attitude_status = "NOMINAL";
    }

    // --- Solar array + battery ---
    s.solar_array_power_w += jitter(0.005) * s.solar_array_power_w;
    s.solar_array_power_w = clamp(s.solar_array_power_w, 600, 1000);
    s.battery_soc_pct += jitter(0.01) * 100;
    s.battery_soc_pct = clamp(s.battery_soc_pct, 60, 100);

    // --- Eccentricity small drift ---
    s.eccentricity += jitter(0.01) * 0.0001;
    s.eccentricity = clamp(s.eccentricity, 0.00001, 0.01);
  }
}

function jitter(magnitude: number): number {
  return (Math.random() - 0.5) * 2 * magnitude;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
