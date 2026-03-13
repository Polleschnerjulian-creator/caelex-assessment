import { BaseCollector } from "./base-collector.js";
import { MockGroundStation } from "../simulator/mock-ground-station.js";
import type { ScenarioRunner } from "../simulator/scenario-engine.js";
import type {
  CollectorOutput,
  CronSchedule,
} from "../types/collector-types.js";
import type { SentinelConfig } from "../types/config-types.js";

export class GroundStationCollector extends BaseCollector {
  readonly name = "Ground Station";
  readonly id = "ground_station";

  private gs: MockGroundStation;

  constructor(_config: SentinelConfig, scenario?: ScenarioRunner) {
    super();
    this.gs = new MockGroundStation(scenario);
  }

  getSchedule(): CronSchedule {
    return { expression: "0 */6 * * *", description: "Every 6 hours" };
  }

  async collect(): Promise<CollectorOutput[]> {
    try {
      const stationMetrics = this.gs.readMetrics();

      const outputs: CollectorOutput[] = stationMetrics.map((metrics) => {
        const notes: string[] = [];
        const successRate = metrics["contact_success_rate_pct"] as number;
        const availability = metrics[
          "ground_station_availability_pct"
        ] as number;
        const signalDb = metrics["signal_margin_db"] as number;
        const freqStatus = metrics["frequency_coordination_status"] as string;

        if (successRate < 95)
          notes.push(`Contact success rate below 95%: ${successRate}%`);
        if (availability < 97)
          notes.push(`Availability below 97%: ${availability}%`);
        if (signalDb < 5) notes.push(`Low signal margin: ${signalDb} dB`);
        if (freqStatus === "EXPIRED")
          notes.push("Frequency coordination expired");

        return {
          data_point: "ground_station_metrics",
          source_system: "ground_station_mgmt",
          collection_method: "simulator_read",
          compliance_notes: notes,
          values: {
            ...metrics,
            collection_timestamp: new Date().toISOString(),
          },
        };
      });

      this.markSuccess();
      return outputs;
    } catch (err) {
      this.markError(err);
      throw err;
    }
  }
}
