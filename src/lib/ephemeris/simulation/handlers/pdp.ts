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
// DATA OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function runPdpDataBreach(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const dataType = (scenario.parameters.dataType as string) ?? "imagery";
  const severity = (scenario.parameters.severity as string) ?? "minor";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isMajor = severity === "major";
  const isRestricted = dataType === "restricted" || dataType === "classified";
  const horizonDelta =
    isMajor && isRestricted
      ? -baselineHorizon
      : isMajor
        ? -Math.round(baselineHorizon * 0.5)
        : -Math.round(baselineHorizon * 0.15);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel:
      isMajor && isRestricted ? "CRITICAL" : isMajor ? "HIGH" : "MEDIUM",
    affectedRegulations: [
      {
        regulationRef: "nis2_art_21",
        statusBefore: "COMPLIANT",
        statusAfter: isMajor ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Data breach: ${dataType} data (${severity}). ` +
      (isMajor && isRestricted
        ? "Critical breach of restricted data — immediate NCA notification required within 24h. Suspend distribution. Engage legal and forensics."
        : isMajor
          ? "Major breach — activate incident response. Notify affected data recipients and assess regulatory impact."
          : "Minor breach — document incident and review access controls."),
    costEstimate: {
      financialUsd:
        isMajor && isRestricted ? 10_000_000 : isMajor ? 2_000_000 : 200_000,
      description: "Data breach remediation estimate",
    },
  });
}

export function runPdpGroundStationOutage(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const stationsAffected =
    (scenario.parameters.stationsAffected as string) ?? "single";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isAll = stationsAffected === "all";
  const horizonDelta = isAll
    ? -Math.round(baselineHorizon * 0.5)
    : -Math.round(baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel: isAll ? "CRITICAL" : "MEDIUM",
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: isAll ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Ground station outage (${stationsAffected.replace(/_/g, " ")}). ` +
      (isAll
        ? "All stations affected — data acquisition halted. Activate backup downlink agreements."
        : "Single station — reroute through partner network and schedule maintenance."),
  });
}

export function runPdpQualityDegradation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const degradationType =
    (scenario.parameters.degradationType as string) ?? "resolution";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isSevere = degradationType === "total_loss";
  const horizonDelta = isSevere
    ? -Math.round(baselineHorizon * 0.4)
    : -Math.round(baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel: isSevere ? "HIGH" : "MEDIUM",
    recommendation:
      `Data quality degradation: ${degradationType.replace(/_/g, " ")}. ` +
      (isSevere
        ? "Total quality loss — suspend distribution. Recalibrate sensors and validate processing pipeline."
        : "Quality degradation detected — review calibration parameters and update quality metadata."),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA SECURITY EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export function runPdpArchiveCorruption(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const extent = (scenario.parameters.extent as string) ?? "partial";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isTotal = extent === "total";
  const horizonDelta = isTotal
    ? -Math.round(baselineHorizon * 0.5)
    : -Math.round(baselineHorizon * 0.15);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel: isTotal ? "CRITICAL" : "HIGH",
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: isTotal ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Archive corruption (${extent}). ` +
      (isTotal
        ? "Total archive corruption — data loss event. Activate backup recovery. Notify data recipients and regulators."
        : "Partial corruption — isolate affected segments. Validate checksums and restore from backups."),
    costEstimate: {
      financialUsd: isTotal ? 5_000_000 : 500_000,
      description: "Archive recovery cost estimate",
    },
  });
}

export function runPdpDistributionViolation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const violationType =
    (scenario.parameters.violationType as string) ?? "unauthorized_access";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isExportViolation = violationType === "export_control";
  const horizonDelta = isExportViolation
    ? -Math.round(baselineHorizon * 0.6)
    : -Math.round(baselineHorizon * 0.2);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel: isExportViolation ? "CRITICAL" : "HIGH",
    affectedRegulations: [
      {
        regulationRef: isExportViolation
          ? "eu_dual_use"
          : "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Distribution violation: ${violationType.replace(/_/g, " ")}. ` +
      (isExportViolation
        ? "Export control violation — suspend all distributions. Engage legal counsel immediately. Self-report to authorities."
        : "Unauthorized data distribution — revoke access, audit distribution logs, and implement corrective controls."),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDP REGULATORY
// ═══════════════════════════════════════════════════════════════════════════════

export function runPdpNis2ClassificationChange(
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
        ? "Reclassified as essential entity — stricter security requirements, 24h incident reporting, and higher penalties."
        : "Classification change — review and update security measures."),
  });
}

export function runPdpDataSovereigntyChange(
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
        ? "Multi-jurisdiction impact — audit data flows, storage locations, and processing agreements across all affected jurisdictions."
        : "Single jurisdiction — update data handling and storage procedures."),
  });
}
