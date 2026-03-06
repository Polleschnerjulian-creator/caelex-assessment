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
 * Simulate communication failure (partial or total).
 * Total comm failure = satellite is uncontrollable.
 */
export function runCommFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const failureType = (scenario.parameters.failureType as string) ?? "partial";
  const durationHours = (scenario.parameters.durationHours as number) ?? 24;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isTotal = failureType === "total";
  const isExtended = durationHours > 72;

  let horizonDelta: number;
  let severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  if (isTotal && isExtended) {
    horizonDelta = -baselineHorizon;
    severityLevel = "CRITICAL";
  } else if (isTotal) {
    horizonDelta = -Math.round(baselineHorizon * 0.5);
    severityLevel = "CRITICAL";
  } else if (isExtended) {
    horizonDelta = -Math.round(baselineHorizon * 0.3);
    severityLevel = "HIGH";
  } else {
    horizonDelta = -Math.round(baselineHorizon * 0.1);
    severityLevel = "MEDIUM";
  }

  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isTotal ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: isTotal ? new Date().toISOString() : null,
      },
    ],
    recommendation: isTotal
      ? `Total communication failure for ${durationHours}h renders satellite uncontrollable. ` +
        `Art. 64 requires command and control capability. Satellite cannot perform collision avoidance. ` +
        (isExtended
          ? `Extended loss of contact — notify NCA. Coordinate with ground network for emergency recovery attempts. ` +
            `If contact not re-established, satellite becomes uncontrolled space object.`
          : `Attempt recovery via alternative ground stations, frequencies, or relay satellites. ` +
            `Activate onboard autonomous safe mode if available.`)
      : `Partial communication failure. ${isExtended ? "Extended" : "Temporary"} degradation of telemetry/command link. ` +
        `Art. 64 compliance maintained with reduced margin. ` +
        `Switch to backup transponder or alternative frequency. Reduce data rate to maintain link.`,
    severityLevel,
    confidenceBand: isTotal
      ? {
          optimistic: Math.round(horizonDelta * 0.5),
          pessimistic: horizonDelta,
        }
      : undefined,
  });
}

/**
 * Simulate ground station loss.
 * Loss of 3+ stations = NON_COMPLIANT (insufficient coverage).
 */
export function runGroundStationLoss(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const stationsLost = (scenario.parameters.stationsLost as number) ?? 1;
  const durationDays = (scenario.parameters.durationDays as number) ?? 7;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isNonCompliant = stationsLost >= 3;

  const horizonDelta = isNonCompliant
    ? -Math.round(Math.min(durationDays * 10, baselineHorizon * 0.6))
    : -Math.round(durationDays * 2);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore:
          baseline.modules.ground?.status ?? baseline.modules.subsystems.status,
        statusAfter: isNonCompliant ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: isNonCompliant ? new Date().toISOString() : null,
      },
    ],
    recommendation: isNonCompliant
      ? `Loss of ${stationsLost} ground stations for ${durationDays} days. Insufficient ground coverage ` +
        `for continuous command and control — NON_COMPLIANT per Art. 64. ` +
        `Contact gaps exceed maximum allowable loss-of-signal duration. ` +
        `Activate partner/commercial ground network agreements. Extend onboard autonomy if possible.`
      : `Loss of ${stationsLost} ground station(s) for ${durationDays} days. ` +
        `Reduced contact windows but Art. 64 compliance maintained. ` +
        `Reschedule passes through remaining stations. Prioritize critical housekeeping contacts.`,
    severityLevel: isNonCompliant
      ? "CRITICAL"
      : stationsLost >= 2
        ? "HIGH"
        : "MEDIUM",
    costEstimate: {
      financialUsd: stationsLost * 50000 * durationDays,
      description: `Emergency ground network lease cost for ${durationDays} days`,
    },
  });
}

/**
 * Simulate frequency interference (minor or major).
 * Governed by ITU Radio Regulations.
 */
export function runFrequencyInterference(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const interferenceLevel =
    (scenario.parameters.interferenceLevel as string) ?? "minor";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isMajor = interferenceLevel === "major";

  const horizonDelta = isMajor
    ? -Math.round(baselineHorizon * 0.25)
    : -Math.round(baselineHorizon * 0.05);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "itu_radio_regulations",
        statusBefore: "COMPLIANT",
        statusAfter: isMajor ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: isMajor
      ? `Major frequency interference detected. ITU Radio Regulations require harmful interference resolution. ` +
        `File interference report with national frequency authority and ITU. ` +
        `Implement frequency hopping or switch to backup allocation. ` +
        `Service degradation may affect SLA obligations.`
      : `Minor frequency interference detected. ITU Radio Regulations compliance maintained. ` +
        `Monitor interference pattern and log for ITU coordination records. ` +
        `Consider adaptive power control or filtering to mitigate.`,
    severityLevel: isMajor ? "HIGH" : "LOW",
  });
}

/**
 * Simulate a cybersecurity incident.
 * NIS2 Art. 21 measures + Art. 23 notification obligations.
 */
export function runCyberIncident(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const severity = (scenario.parameters.severity as string) ?? "medium";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const severityMap: Record<
    string,
    {
      horizonFraction: number;
      level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      nonCompliant: boolean;
    }
  > = {
    low: { horizonFraction: 0.05, level: "LOW", nonCompliant: false },
    medium: { horizonFraction: 0.15, level: "MEDIUM", nonCompliant: false },
    high: { horizonFraction: 0.35, level: "HIGH", nonCompliant: true },
    critical: { horizonFraction: 0.6, level: "CRITICAL", nonCompliant: true },
  };

  const impact = severityMap[severity] ?? severityMap.medium;
  const horizonDelta = -Math.round(baselineHorizon * impact.horizonFraction);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "nis2_art_21",
        statusBefore: baseline.modules.cyber?.status ?? "UNKNOWN",
        statusAfter: impact.nonCompliant ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: impact.nonCompliant
          ? new Date().toISOString()
          : null,
      },
      {
        regulationRef: "nis2_art_23",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Cybersecurity incident (${severity} severity). NIS2 Art. 21 cybersecurity measures apply. ` +
      `NIS2 Art. 23 notification timeline: ` +
      `(1) Early warning to CSIRT within 24 hours, ` +
      `(2) Incident notification within 72 hours, ` +
      `(3) Final report within 1 month. ` +
      (impact.nonCompliant
        ? `Significant incident — potential command/control compromise. Isolate affected systems. ` +
          `Engage incident response team. Penalties for non-notification: up to EUR 10M or 2% annual turnover.`
        : `Implement containment measures. Document incident for compliance records. ` +
          `Review NIS2 Art. 21(2) measures (a)-(j) for gaps.`),
    severityLevel: impact.level,
    costEstimate: impact.nonCompliant
      ? {
          financialUsd: severity === "critical" ? 2000000 : 500000,
          description: `Estimated incident response and remediation cost (${severity} severity)`,
        }
      : undefined,
  });
}

/**
 * Simulate a data breach.
 * Personal data involvement triggers GDPR Art. 33. NIS2 Art. 23 always applies.
 */
export function runDataBreach(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const personalData = (scenario.parameters.personalData as boolean) ?? false;
  const recordsAffected =
    (scenario.parameters.recordsAffected as number) ?? 1000;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = personalData
    ? -Math.round(baselineHorizon * 0.3)
    : -Math.round(baselineHorizon * 0.15);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  const affectedRegulations: WhatIfResult["affectedRegulations"] = [
    {
      regulationRef: "nis2_art_23",
      statusBefore: "COMPLIANT",
      statusAfter: "WARNING",
      crossingDateBefore: null,
      crossingDateAfter: null,
    },
  ];

  if (personalData) {
    affectedRegulations.push({
      regulationRef: "gdpr_art_33",
      statusBefore: "COMPLIANT",
      statusAfter: "NON_COMPLIANT",
      crossingDateBefore: null,
      crossingDateAfter: new Date().toISOString(),
    });
  }

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations,
    recommendation:
      `Data breach affecting ~${recordsAffected.toLocaleString()} records. ` +
      `NIS2 Art. 23 incident notification required (24h early warning, 72h notification, 1-month report). ` +
      (personalData
        ? `Personal data involved — GDPR Art. 33 breach notification to supervisory authority within 72 hours required. ` +
          `GDPR Art. 34 notification to affected individuals may also be required if high risk. ` +
          `Potential GDPR penalties: up to EUR 20M or 4% annual turnover.`
        : `No personal data involved — GDPR notification not triggered. ` +
          `Focus on NIS2 compliance and operational data protection measures.`),
    severityLevel: personalData ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: personalData ? recordsAffected * 150 : recordsAffected * 50,
      description: `Estimated breach response cost (${recordsAffected.toLocaleString()} records${personalData ? ", includes GDPR compliance" : ""})`,
    },
  });
}
