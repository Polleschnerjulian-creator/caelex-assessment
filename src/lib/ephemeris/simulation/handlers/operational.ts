import "server-only";
import type {
  WhatIfScenario,
  WhatIfResult,
  SatelliteComplianceStateInternal,
} from "../../core/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildResult(
  scenario: WhatIfScenario,
  baseline: SatelliteComplianceStateInternal,
  overrides: Partial<WhatIfResult>,
): WhatIfResult {
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  return {
    scenario,
    baselineHorizon,
    projectedHorizon: baselineHorizon,
    horizonDelta: 0,
    affectedRegulations: [],
    fuelImpact: null,
    recommendation: "",
    ...overrides,
  };
}

// ─── Scenario Handlers ───────────────────────────────────────────────────────

/**
 * Simulate a launch delay.
 * >12 months risks authorization expiry per Art. 10.
 */
export function runLaunchDelay(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const delayMonths = (scenario.parameters.delayMonths as number) ?? 6;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -Math.round(delayMonths * 20);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  const expiryRisk = delayMonths > 12;

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_10",
        statusBefore: "COMPLIANT",
        statusAfter: expiryRisk ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Launch delay of ${delayMonths} months. ` +
      (expiryRisk
        ? `Delay exceeds 12 months — authorization may expire per Art. 10. ` +
          `File for authorization extension immediately. Re-authorization process may require ` +
          `updated compliance documentation, insurance renewal, and fresh environmental assessment. `
        : `Authorization remains valid. Update mission timeline and notify NCA of revised launch date. `) +
      `Review insurance policy dates and extend coverage as needed. ` +
      `Storage and ground operations costs will accumulate.`,
    severityLevel: expiryRisk ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: delayMonths * 150000,
      description: `Estimated delay cost: ${delayMonths} months of storage, ground ops, and team retention`,
    },
  });
}

/**
 * Simulate mission scope change (expand or reduce).
 * Expansion >30% may trigger Art. 10 re-authorization warning.
 */
export function runMissionScopeChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const changeType = (scenario.parameters.changeType as string) ?? "expand";
  const magnitude = (scenario.parameters.magnitude as number) ?? 20;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isExpand = changeType === "expand";

  const horizonDelta = isExpand
    ? -Math.round(magnitude * 3)
    : Math.round(magnitude * 1.5);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  const requiresReauth = isExpand && magnitude > 30;

  const affectedRegulations: WhatIfResult["affectedRegulations"] = [];
  if (requiresReauth) {
    affectedRegulations.push({
      regulationRef: "eu_space_act_art_10",
      statusBefore: "COMPLIANT",
      statusAfter: "WARNING",
      crossingDateBefore: null,
      crossingDateAfter: null,
    });
  }

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations,
    recommendation: isExpand
      ? `Mission scope expansion of ${magnitude}%. ` +
        (requiresReauth
          ? `Expansion >30% may require Art. 10 authorization amendment. ` +
            `Notify NCA and file scope change notification. Additional compliance assessments likely required.`
          : `Within normal operational flexibility. Update mission plan documentation. ` +
            `Monitor resource utilization against original authorization parameters.`)
      : `Mission scope reduction of ${magnitude}%. Reduced operational complexity. ` +
        `Update mission documentation. Consider whether reduced scope enables ` +
        `simplified compliance posture.`,
    severityLevel: requiresReauth ? "HIGH" : isExpand ? "MEDIUM" : "LOW",
  });
}

/**
 * Simulate software anomaly in spacecraft systems.
 * AOCS and TT&C are critical subsystems per Art. 64.
 */
export function runSoftwareAnomaly(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const affectedSystem =
    (scenario.parameters.affectedSystem as string) ?? "payload";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isCritical = affectedSystem === "AOCS" || affectedSystem === "TTC";

  const horizonDelta = isCritical
    ? -Math.round(baselineHorizon * 0.4)
    : -Math.round(baselineHorizon * 0.1);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: isCritical
      ? [
          {
            regulationRef: "eu_space_act_art_64",
            statusBefore: baseline.modules.subsystems.status,
            statusAfter: "WARNING",
            crossingDateBefore: null,
            crossingDateAfter: null,
          },
        ]
      : [],
    recommendation: isCritical
      ? `Software anomaly in ${affectedSystem} — critical subsystem per Art. 64. ` +
        `${affectedSystem === "AOCS" ? "Attitude and orbit control" : "Telemetry, tracking, and command"} ` +
        `capability degraded. Enter safe mode if anomaly persists. ` +
        `Prepare software patch for uplink. Validate patch thoroughly before upload ` +
        `to avoid compounding the anomaly.`
      : `Software anomaly in ${affectedSystem} system. Not a critical subsystem for Art. 64 compliance. ` +
        `Investigate root cause and prepare corrective patch. ` +
        `Monitor for cascading effects on other subsystems.`,
    severityLevel: isCritical ? "HIGH" : "MEDIUM",
  });
}

/**
 * Simulate service interruption.
 * Duration and customer impact determine severity. Includes SLA cost estimate.
 */
export function runServiceInterruption(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const durationHours = (scenario.parameters.durationHours as number) ?? 8;
  const customersAffectedPct =
    (scenario.parameters.customersAffectedPct as number) ?? 50;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -Math.round(
    (durationHours / 24) * (customersAffectedPct / 100) * 30,
  );
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  const isSignificant = durationHours > 24 && customersAffectedPct > 50;

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [],
    recommendation:
      `Service interruption: ${durationHours}h affecting ${customersAffectedPct}% of customers. ` +
      (isSignificant
        ? `Significant service disruption. May trigger NIS2 Art. 23 notification if ` +
          `satellite service is classified as essential/important infrastructure. ` +
          `Activate business continuity plan. Communicate with affected customers per SLA terms.`
        : `Limited service impact. Standard incident management procedures apply. ` +
          `Log incident for reporting purposes. Review root cause to prevent recurrence.`),
    severityLevel: isSignificant
      ? "HIGH"
      : durationHours > 8
        ? "MEDIUM"
        : "LOW",
    costEstimate: {
      financialUsd: Math.round(
        durationHours * (customersAffectedPct / 100) * 25000,
      ),
      description: `Estimated SLA penalty and revenue loss for ${durationHours}h interruption (${customersAffectedPct}% customers)`,
    },
  });
}

/**
 * Simulate operations team change (personnel loss + training gap).
 * >50% personnel loss = warning per Art. 64 operational requirements.
 */
export function runOperationsTeamChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const personnelLossPct =
    (scenario.parameters.personnelLossPct as number) ?? 20;
  const trainingGapMonths =
    (scenario.parameters.trainingGapMonths as number) ?? 3;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isWarning = personnelLossPct > 50;

  const horizonDelta = isWarning
    ? -Math.round(trainingGapMonths * 30)
    : -Math.round(trainingGapMonths * 10);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: isWarning
      ? [
          {
            regulationRef: "eu_space_act_art_64",
            statusBefore: baseline.modules.subsystems.status,
            statusAfter: "WARNING",
            crossingDateBefore: null,
            crossingDateAfter: null,
          },
        ]
      : [],
    recommendation:
      `Operations team change: ${personnelLossPct}% personnel loss, ${trainingGapMonths}-month training gap. ` +
      (isWarning
        ? `Significant personnel loss (>${50}%) threatens operational continuity per Art. 64. ` +
          `Critical knowledge at risk. Implement emergency cross-training. ` +
          `Consider contracting experienced operators to bridge the gap.`
        : `Personnel change within manageable range. Ensure knowledge transfer documentation ` +
          `is complete. Accelerate training for replacement personnel. ` +
          `Maintain minimum staffing for 24/7 operations coverage.`),
    severityLevel: isWarning ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: Math.round(personnelLossPct * 1000 * trainingGapMonths),
      description: `Recruitment and training cost for ${personnelLossPct}% team replacement over ${trainingGapMonths} months`,
    },
  });
}

/**
 * Simulate frequency band migration.
 * ITU Radio Regulations compliance. Includes migration cost estimate.
 */
export function runFrequencyBandMigration(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const timelineMonths = (scenario.parameters.timelineMonths as number) ?? 12;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -Math.round(timelineMonths * 8);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "itu_radio_regulations",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Frequency band migration required within ${timelineMonths} months per ITU Radio Regulations. ` +
      `Plan migration phases: (1) New frequency coordination filing, (2) Ground segment update, ` +
      `(3) Onboard transponder reconfiguration, (4) Testing and validation, (5) Switchover. ` +
      `Coordinate with other operators and national frequency authority. ` +
      `Ensure continuity of service during migration.`,
    severityLevel: timelineMonths < 6 ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: 600000 + (timelineMonths < 6 ? 400000 : 0),
      description: `Frequency migration cost: ground segment + space segment updates${timelineMonths < 6 ? " (expedited)" : ""}`,
    },
  });
}
