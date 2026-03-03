import { GROUND_STATIONS, type GroundStationState } from "./seed-data.js";

/**
 * Simulated Ground Station Management System.
 *
 * Generates per-station metrics:
 * - 12–15 contacts/day per satellite
 * - Success rate: 92–99%
 * - Signal margin: 3–12 dB
 * - Availability: 95–99.9%
 */
export class MockGroundStation {
  private stations: GroundStationState[];
  private dayStartTime: number;

  constructor() {
    this.stations = GROUND_STATIONS.map((s) => ({ ...s }));
    this.dayStartTime = startOfDay(Date.now());
  }

  readMetrics(): Array<Record<string, unknown>> {
    this.advanceDay();

    return this.stations.map((gs) => {
      // Simulate contacts that have happened since last read
      const newContacts = 2 + Math.floor(Math.random() * 3);
      const newSuccesses = newContacts - (Math.random() < 0.08 ? 1 : 0);

      gs.contacts_today += newContacts;
      gs.successes_today += Math.max(0, newSuccesses);

      // Availability drifts slightly
      gs.availability_pct += (Math.random() - 0.4) * 0.1;
      gs.availability_pct = Math.max(94, Math.min(99.9, gs.availability_pct));

      const successRate =
        gs.contacts_today > 0
          ? (gs.successes_today / gs.contacts_today) * 100
          : 100;

      const timeSinceLastContact = Math.floor(Math.random() * 120); // 0-120 min
      const signalMargin = 4 + Math.random() * 8; // 4-12 dB
      const freqStatus: "CURRENT" | "PENDING" | "EXPIRED" =
        Math.random() < 0.92
          ? "CURRENT"
          : Math.random() < 0.5
            ? "PENDING"
            : "EXPIRED";

      return {
        station_id: gs.station_id,
        station_name: gs.station_name,
        location: gs.location,
        contacts_24h: gs.contacts_today,
        contact_success_rate_pct: round2(successRate),
        ground_station_availability_pct: round2(gs.availability_pct),
        command_uplink_success_pct: round2(
          successRate * (0.97 + Math.random() * 0.03),
        ),
        time_since_last_contact_min: timeSinceLastContact,
        signal_margin_db: round2(signalMargin),
        frequency_coordination_status: freqStatus,
      };
    });
  }

  private advanceDay(): void {
    const today = startOfDay(Date.now());
    if (today > this.dayStartTime) {
      // New day — reset daily counters
      this.dayStartTime = today;
      for (const gs of this.stations) {
        gs.contacts_today = 0;
        gs.successes_today = 0;
      }
    }
  }
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
