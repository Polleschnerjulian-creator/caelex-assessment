import { BaseCollector } from "./base-collector.js";
import { MockSIEM } from "../simulator/mock-siem.js";
import type {
  CollectorOutput,
  CronSchedule,
} from "../types/collector-types.js";
import type { SentinelConfig } from "../types/config-types.js";

export class CybersecurityCollector extends BaseCollector {
  readonly name = "Cybersecurity";
  readonly id = "cybersecurity";

  private siem: MockSIEM;

  constructor(_config: SentinelConfig) {
    super();
    this.siem = new MockSIEM();
  }

  getSchedule(): CronSchedule {
    return { expression: "0 * * * *", description: "Every hour" };
  }

  async collect(): Promise<CollectorOutput[]> {
    try {
      const posture = this.siem.readPosture();

      const notes: string[] = [];
      const critVulns = posture["critical_vulns_unpatched"] as number;
      const patchPct = posture["patch_compliance_pct"] as number;
      const mfaPct = posture["mfa_adoption_pct"] as number;
      const reportable = posture["reportable_incidents"] as number;

      if (critVulns > 0)
        notes.push(`${critVulns} critical unpatched vulnerabilities`);
      if (patchPct < 90) notes.push(`Patch compliance below 90%: ${patchPct}%`);
      if (mfaPct < 95) notes.push(`MFA adoption below 95%: ${mfaPct}%`);
      if (reportable > 0)
        notes.push(`${reportable} reportable incidents in last 30 days`);

      this.markSuccess();

      return [
        {
          data_point: "cyber_posture",
          source_system: "siem_aggregator",
          collection_method: "simulator_read",
          compliance_notes: notes,
          values: {
            ...posture,
            collection_timestamp: new Date().toISOString(),
          },
        },
      ];
    } catch (err) {
      this.markError(err);
      throw err;
    }
  }
}
