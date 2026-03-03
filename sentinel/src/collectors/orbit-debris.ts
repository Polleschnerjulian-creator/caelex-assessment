import { BaseCollector } from "./base-collector.js";
import { MockMissionControl } from "../simulator/mock-mission-control.js";
import type {
  CollectorOutput,
  CronSchedule,
} from "../types/collector-types.js";
import type { SentinelConfig } from "../types/config-types.js";

export class OrbitDebrisCollector extends BaseCollector {
  readonly name = "Orbit & Debris";
  readonly id = "orbit_debris";

  private mc: MockMissionControl;
  private satellites: SentinelConfig["sentinel"]["satellites"];

  constructor(config: SentinelConfig) {
    super();
    this.mc = new MockMissionControl();
    this.satellites = config.sentinel.satellites;
    this.mc.initialize(this.satellites);
  }

  getSchedule(): CronSchedule {
    return { expression: "*/15 * * * *", description: "Every 15 minutes" };
  }

  async collect(): Promise<CollectorOutput[]> {
    try {
      const outputs: CollectorOutput[] = [];

      for (const sat of this.satellites) {
        const telemetry = this.mc.readTelemetry(sat.norad_id);
        if (!telemetry) continue;

        const now = new Date();
        const thirtyDaysAgo = Date.now() - 30 * 86400000;
        const recentCA = telemetry.ca_events_log.filter(
          (e) => new Date(e.date).getTime() > thirtyDaysAgo,
        );

        const fuelPct =
          telemetry.initial_fuel_kg > 0
            ? (telemetry.remaining_fuel_kg / telemetry.initial_fuel_kg) * 100
            : 0;

        // Estimate orbital lifetime based on altitude and decay rate
        const lifetimeYr = estimateLifetime(telemetry.altitude_km);

        // Deorbit capability assessment
        const deorbitCap =
          telemetry.thruster_status === "FAILED"
            ? "IMPOSSIBLE"
            : fuelPct < 5
              ? "DEGRADED"
              : "NOMINAL";

        const notes: string[] = [];
        if (fuelPct < 15)
          notes.push(`Low fuel warning: ${fuelPct.toFixed(1)}%`);
        if (telemetry.thruster_status !== "NOMINAL")
          notes.push(`Thruster status: ${telemetry.thruster_status}`);
        if (lifetimeYr > 20)
          notes.push(
            `Estimated lifetime ${lifetimeYr.toFixed(1)}yr exceeds 25yr guideline`,
          );
        if (recentCA.filter((e) => e.pc > 1e-4).length > 0)
          notes.push(`High-risk conjunction events in last 30 days`);

        outputs.push({
          data_point: "orbital_parameters",
          satellite_norad_id: sat.norad_id,
          source_system: "mission_control_fds",
          collection_method: "simulator_read",
          compliance_notes: notes,
          values: {
            altitude_km: round3(telemetry.altitude_km),
            semi_major_axis_km: round3(telemetry.semi_major_axis_km),
            eccentricity: round6(telemetry.eccentricity),
            inclination_deg: round3(telemetry.inclination_deg),
            remaining_fuel_kg: round3(telemetry.remaining_fuel_kg),
            remaining_fuel_pct: round2(fuelPct),
            thruster_status: telemetry.thruster_status,
            last_maneuver_timestamp: telemetry.last_maneuver_timestamp,
            last_maneuver_delta_v: round4(telemetry.last_maneuver_delta_v),
            ca_events_30d: recentCA.length,
            high_risk_ca_events: recentCA.filter((e) => e.pc > 1e-4).length,
            ca_maneuvers_30d: recentCA.filter((e) => e.maneuvered).length,
            attitude_status: telemetry.attitude_status,
            solar_array_power_w: round2(telemetry.solar_array_power_w),
            battery_soc_pct: round2(telemetry.battery_soc_pct),
            estimated_lifetime_yr: round2(lifetimeYr),
            deorbit_capability: deorbitCap,
            collection_timestamp: now.toISOString(),
          },
        });
      }

      this.markSuccess();
      return outputs;
    } catch (err) {
      this.markError(err);
      throw err;
    }
  }
}

/**
 * Rough orbital lifetime estimate based on altitude.
 * Uses simplified atmospheric density model.
 */
function estimateLifetime(altitudeKm: number): number {
  if (altitudeKm > 800) return 100;
  if (altitudeKm > 600) return 25 + (altitudeKm - 600) * 0.375;
  if (altitudeKm > 400) return 5 + (altitudeKm - 400) * 0.1;
  if (altitudeKm > 300) return 1 + (altitudeKm - 300) * 0.04;
  return altitudeKm / 300;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
function round6(n: number): number {
  return Math.round(n * 1000000) / 1000000;
}
