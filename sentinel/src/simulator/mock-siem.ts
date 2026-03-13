import type { ScenarioRunner } from "./scenario-engine.js";

/**
 * Simulated SIEM / Security Operations Center.
 *
 * Generates realistic cybersecurity posture data:
 * - Incidents vary 0–3 LOW/month, 0–1 MEDIUM, rare HIGH/CRITICAL
 * - Vulnerability counts drift realistically
 * - Patch compliance: 85–98%
 * - MFA adoption: 90–100%
 *
 * When a ScenarioRunner is provided, uses scenario-driven cyber state.
 */
export class MockSIEM {
  private scenario?: ScenarioRunner;
  private scenarioNoradId?: string;

  constructor(scenario?: ScenarioRunner, scenarioNoradId?: string) {
    this.scenario = scenario;
    this.scenarioNoradId = scenarioNoradId;
  }
  // Persistent state that drifts over time
  private criticalVulns = Math.floor(Math.random() * 2);
  private highVulns = 2 + Math.floor(Math.random() * 4);
  private patchCompliance = 88 + Math.random() * 10;
  private mfaAdoption = 93 + Math.random() * 7;
  private privilegedAccounts = 8 + Math.floor(Math.random() * 5);
  private trainingPct = 80 + Math.random() * 15;
  private daysSinceVulnScan = Math.floor(Math.random() * 14);
  private lastPentestDaysAgo = 30 + Math.floor(Math.random() * 120);
  private lastAccessReviewDaysAgo = 10 + Math.floor(Math.random() * 50);
  private lastBackupTestDaysAgo = 3 + Math.floor(Math.random() * 14);
  private backupStatus: "VERIFIED" | "UNVERIFIED" | "FAILED" = "VERIFIED";
  private tickCount = 0;

  readPosture(): Record<string, unknown> {
    this.tickCount++;

    // Scenario mode: return scenario-driven cyber metrics
    if (this.scenario && this.scenarioNoradId) {
      const scenarioState = this.scenario.getState(this.scenarioNoradId);
      if (scenarioState) {
        return {
          incidents_30d: scenarioState.unpatchedCriticalVulns > 0 ? 2 : 0,
          incidents_by_severity: {
            critical: 0,
            high: scenarioState.unpatchedCriticalVulns > 0 ? 1 : 0,
            medium: 0,
            low: scenarioState.unpatchedCriticalVulns > 0 ? 1 : 0,
          },
          mttd_minutes: 30,
          mttr_minutes: scenarioState.incidentResponseMttrMin,
          reportable_incidents:
            scenarioState.unpatchedCriticalVulns > 0 ? 1 : 0,
          critical_vulns_unpatched: scenarioState.unpatchedCriticalVulns,
          high_vulns_unpatched: 0,
          patch_compliance_pct: round2(scenarioState.patchCompliancePct),
          days_since_last_vuln_scan: 3,
          mfa_adoption_pct: round2(scenarioState.mfaAdoptionPct),
          privileged_accounts: 10,
          last_access_review: daysAgoISO(7),
          backup_status: "VERIFIED",
          last_backup_test: daysAgoISO(3),
          encryption_at_rest: "AES-256",
          encryption_in_transit: "TLS-1.3",
          last_pentest_date: daysAgoISO(30),
          security_training_pct: 92,
        };
      }
    }

    this.evolve();

    // Generate incident counts for the last 30 days
    const low = poissonRandom(2.5);
    const medium = poissonRandom(0.8);
    const high = poissonRandom(0.15);
    const critical = poissonRandom(0.03);
    const totalIncidents = low + medium + high + critical;
    const reportable = high + critical;

    return {
      incidents_30d: totalIncidents,
      incidents_by_severity: { critical, high, medium, low },
      mttd_minutes: 15 + Math.floor(Math.random() * 45),
      mttr_minutes: 60 + Math.floor(Math.random() * 360),
      reportable_incidents: reportable,
      critical_vulns_unpatched: this.criticalVulns,
      high_vulns_unpatched: this.highVulns,
      patch_compliance_pct: round2(this.patchCompliance),
      days_since_last_vuln_scan: this.daysSinceVulnScan,
      mfa_adoption_pct: round2(this.mfaAdoption),
      privileged_accounts: this.privilegedAccounts,
      last_access_review: daysAgoISO(this.lastAccessReviewDaysAgo),
      backup_status: this.backupStatus,
      last_backup_test: daysAgoISO(this.lastBackupTestDaysAgo),
      encryption_at_rest: "AES-256",
      encryption_in_transit: "TLS-1.3",
      last_pentest_date: daysAgoISO(this.lastPentestDaysAgo),
      security_training_pct: round2(this.trainingPct),
    };
  }

  private evolve(): void {
    // Vulns drift
    if (Math.random() < 0.05)
      this.criticalVulns += Math.random() < 0.7 ? 1 : -1;
    if (Math.random() < 0.1) this.highVulns += Math.random() < 0.6 ? 1 : -1;
    this.criticalVulns = Math.max(0, Math.min(5, this.criticalVulns));
    this.highVulns = Math.max(0, Math.min(15, this.highVulns));

    // Patch compliance drifts
    this.patchCompliance += (Math.random() - 0.48) * 0.5;
    this.patchCompliance = Math.max(80, Math.min(99, this.patchCompliance));

    // MFA adoption slowly improves
    this.mfaAdoption += Math.random() * 0.1;
    this.mfaAdoption = Math.min(100, this.mfaAdoption);

    // Training completion drifts
    this.trainingPct += (Math.random() - 0.45) * 0.3;
    this.trainingPct = Math.max(70, Math.min(100, this.trainingPct));

    // Days counters advance
    this.daysSinceVulnScan++;
    this.lastPentestDaysAgo++;
    this.lastAccessReviewDaysAgo++;
    this.lastBackupTestDaysAgo++;

    // Periodic resets (simulate scans/reviews happening)
    if (this.daysSinceVulnScan > 7 + Math.random() * 7) {
      this.daysSinceVulnScan = 0;
    }
    if (this.lastAccessReviewDaysAgo > 60 + Math.random() * 30) {
      this.lastAccessReviewDaysAgo = 0;
    }
    if (this.lastBackupTestDaysAgo > 7 + Math.random() * 7) {
      this.lastBackupTestDaysAgo = 0;
      this.backupStatus = Math.random() < 0.95 ? "VERIFIED" : "UNVERIFIED";
    }
  }
}

function poissonRandom(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().split("T")[0]!;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
