import "server-only";
import type {
  WhatIfScenario,
  WhatIfResult,
  SatelliteComplianceStateInternal,
} from "../../core/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════════════════════
// CAPACITY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export function runCapServiceOutage(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const scope = (scenario.parameters.scope as string) ?? "partial";
  const durationHours = (scenario.parameters.durationHours as number) ?? 24;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isTotalOutage = scope === "total";
  const isExtended = durationHours > 72;
  const horizonDelta =
    isTotalOutage && isExtended
      ? -baselineHorizon
      : isTotalOutage
        ? -Math.round(baselineHorizon * 0.5)
        : isExtended
          ? -Math.round(baselineHorizon * 0.3)
          : -Math.round(baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel:
      isTotalOutage && isExtended
        ? "CRITICAL"
        : isTotalOutage || isExtended
          ? "HIGH"
          : "MEDIUM",
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: isTotalOutage ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Service outage (${scope}) lasting ${durationHours}h. ` +
      (isTotalOutage
        ? "Total outage — activate disaster recovery plan. Notify all customers and NCA immediately."
        : "Partial outage — reroute affected services. Assess SLA impact and notify impacted customers."),
    costEstimate: {
      financialUsd: isTotalOutage
        ? durationHours * 50_000
        : durationHours * 15_000,
      description: `Service outage cost estimate (${scope}, ${durationHours}h)`,
    },
  });
}

export function runCapCapacityDegradation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const degradationPct = (scenario.parameters.degradationPct as number) ?? 20;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isSevere = degradationPct >= 50;
  const horizonDelta = isSevere
    ? -Math.round(baselineHorizon * 0.4)
    : -Math.round(baselineHorizon * 0.15);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel: isSevere ? "HIGH" : "MEDIUM",
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: isSevere ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Capacity degradation of ${degradationPct}%. ` +
      (isSevere
        ? "Severe degradation — SLA breaches likely. Activate capacity expansion plan and notify affected customers."
        : "Moderate degradation — monitor closely and prepare mitigation options."),
  });
}

export function runCapSlaBreach(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const severity = (scenario.parameters.severity as string) ?? "minor";
  const customersAffected =
    (scenario.parameters.customersAffected as number) ?? 1;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isMajor = severity === "major";
  const horizonDelta = isMajor
    ? -Math.round(baselineHorizon * 0.35)
    : -Math.round(baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel: isMajor ? "HIGH" : "MEDIUM",
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: isMajor ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `SLA breach (${severity}) affecting ${customersAffected} customer(s). ` +
      (isMajor
        ? "Major SLA breach — financial penalties likely. Initiate root cause analysis and customer remediation."
        : "Minor SLA breach — document incident and implement corrective measures."),
    costEstimate: {
      financialUsd: isMajor
        ? customersAffected * 500_000
        : customersAffected * 50_000,
      description: "SLA penalty estimate",
    },
  });
}

export function runCapGroundSegmentFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const component = (scenario.parameters.component as string) ?? "noc";
  const redundancy = (scenario.parameters.redundancy as string) ?? "yes";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const noBackup = redundancy === "no";
  const isCritical = component === "noc" || component === "gateway";
  const horizonDelta =
    isCritical && noBackup
      ? -Math.round(baselineHorizon * 0.6)
      : isCritical
        ? -Math.round(baselineHorizon * 0.2)
        : -Math.round(baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel:
      isCritical && noBackup ? "CRITICAL" : isCritical ? "HIGH" : "MEDIUM",
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: isCritical && noBackup ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Ground segment failure: ${component.replace(/_/g, " ")} (redundancy: ${redundancy}). ` +
      (isCritical && noBackup
        ? "Critical failure with no redundancy — service continuity at risk. Activate emergency operations."
        : "Initiate failover procedures and assess service impact."),
  });
}

export function runCapBandwidthSaturation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const utilizationPct = (scenario.parameters.utilizationPct as number) ?? 95;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isCritical = utilizationPct >= 100;
  const horizonDelta = isCritical
    ? -Math.round(baselineHorizon * 0.25)
    : -Math.round(baselineHorizon * 0.05);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel: isCritical ? "HIGH" : "LOW",
    recommendation:
      `Bandwidth utilization at ${utilizationPct}%. ` +
      (isCritical
        ? "Saturation reached — quality of service degrading. Implement traffic management or procure additional capacity."
        : "Approaching saturation — monitor trends and plan capacity expansion."),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function runCapCustomerMigration(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const scale = (scenario.parameters.scale as string) ?? "single";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isFleetWide = scale === "fleet_wide";
  const horizonDelta = isFleetWide
    ? -Math.round(baselineHorizon * 0.2)
    : -Math.round(baselineHorizon * 0.05);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel: isFleetWide ? "HIGH" : "LOW",
    recommendation:
      `Customer migration (${scale.replace(/_/g, " ")}). ` +
      (isFleetWide
        ? "Fleet-wide migration — high risk of service disruption. Coordinate carefully with all customers."
        : "Single customer migration — standard procedures. Ensure SLA continuity."),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAP REGULATORY
// ═══════════════════════════════════════════════════════════════════════════════

export function runCapNis2ClassificationChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const newClassification =
    (scenario.parameters.newClassification as string) ?? "essential";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isEssential = newClassification === "essential";
  const horizonDelta = isEssential
    ? -Math.round(baselineHorizon * 0.3)
    : -Math.round(baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel: isEssential ? "HIGH" : "MEDIUM",
    affectedRegulations: [
      {
        regulationRef: "nis2_art_21",
        statusBefore: "COMPLIANT",
        statusAfter: isEssential ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `NIS2 classification change to "${newClassification}". ` +
      (isEssential
        ? "Reclassified as essential entity — stricter incident reporting (24h), supply chain audits, and potential fines up to €10M or 2% global turnover."
        : "Classification change — review compliance requirements and update security measures accordingly."),
  });
}

export function runCapDataSovereigntyChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const scope = (scenario.parameters.scope as string) ?? "single_jurisdiction";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isMultiJurisdiction = scope === "multi_jurisdiction";
  const horizonDelta = isMultiJurisdiction
    ? -Math.round(baselineHorizon * 0.35)
    : -Math.round(baselineHorizon * 0.15);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel: isMultiJurisdiction ? "HIGH" : "MEDIUM",
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_5",
        statusBefore: "COMPLIANT",
        statusAfter: isMultiJurisdiction ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Data sovereignty change (${scope.replace(/_/g, " ")}). ` +
      (isMultiJurisdiction
        ? "Multi-jurisdiction impact — review data routing, storage locations, and cross-border transfer agreements. Legal review required."
        : "Single jurisdiction — update data handling procedures and notify affected customers."),
  });
}
