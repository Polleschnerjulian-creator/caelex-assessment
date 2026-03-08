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
// SITE INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

export function runPadDamage(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const severity = (scenario.parameters.severity as string) ?? "structural";
  const padId = (scenario.parameters.padId as string) ?? "pad_1";
  const repairTimeDays = (scenario.parameters.repairTimeDays as number) ?? 90;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isMajor = severity === "major_destruction";
  const isAllPads = padId === "all_pads";
  const horizonDelta =
    isMajor && isAllPads
      ? -baselineHorizon
      : isMajor
        ? -Math.round(baselineHorizon * 0.6)
        : severity === "structural"
          ? -Math.round(baselineHorizon * 0.3)
          : -Math.round(baselineHorizon * 0.05);

  const costEstimates: Record<string, number> = {
    minor_surface: 1_000_000,
    structural: 15_000_000,
    major_destruction: 100_000_000,
  };

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_62",
        statusBefore: "COMPLIANT",
        statusAfter: isMajor
          ? "NON_COMPLIANT"
          : severity === "structural"
            ? "WARNING"
            : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Pad damage (${severity.replace(/_/g, " ")}) to ${padId.replace(/_/g, " ")}. ` +
      `Estimated repair time: ${repairTimeDays} days. ` +
      (isMajor
        ? "Major destruction — all launches suspended. Full structural assessment required. " +
          "Notify NCA and update site license conditions."
        : severity === "structural"
          ? "Structural damage — affected pad(s) offline for repair. " +
            "Review impact on launch schedule and customer commitments."
          : "Minor surface damage — schedule repair during next maintenance window.") +
      (isAllPads
        ? " All pads affected — complete site stand-down until repairs complete."
        : ""),
    severityLevel: isMajor
      ? "CRITICAL"
      : severity === "structural"
        ? "HIGH"
        : "LOW",
    costEstimate: {
      financialUsd:
        (costEstimates[severity] ?? 15_000_000) * (isAllPads ? 2 : 1),
      description: `${severity.replace(/_/g, " ")} damage to ${padId.replace(/_/g, " ")}`,
    },
  });
}

export function runRangeRadarFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const failureType =
    (scenario.parameters.failureType as string) ?? "degraded_accuracy";
  const redundancyAvailable =
    (scenario.parameters.redundancyAvailable as string) ?? "yes";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isTotal = failureType === "total_failure";
  const noBackup = redundancyAvailable === "no";
  const horizonDelta =
    isTotal && noBackup
      ? -Math.round(baselineHorizon * 0.6)
      : isTotal
        ? -Math.round(baselineHorizon * 0.2)
        : -Math.round(baselineHorizon * 0.05);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_62",
        statusBefore: "COMPLIANT",
        statusAfter:
          isTotal && noBackup
            ? "NON_COMPLIANT"
            : isTotal
              ? "WARNING"
              : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Range radar failure: ${failureType.replace(/_/g, " ")} (backup: ${redundancyAvailable}). ` +
      (isTotal && noBackup
        ? "Total failure with no backup — launches suspended per Art. 62. " +
          "Range safety cannot be assured. Emergency procurement of replacement system."
        : isTotal
          ? "Total failure but backup available. Switch to backup radar. " +
            "Schedule primary repair and recalibration."
          : "Degraded accuracy — monitor and schedule maintenance. " +
            "May restrict launch windows requiring tighter tracking margins."),
    severityLevel:
      isTotal && noBackup ? "CRITICAL" : isTotal ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: isTotal ? 5_000_000 : 500_000,
      description: `Radar ${failureType.replace(/_/g, " ")}`,
    },
  });
}

export function runFtsSystemFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const component =
    (scenario.parameters.component as string) ?? "command_transmitter";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return buildResult(scenario, baseline, {
    projectedHorizon: 0,
    horizonDelta: -baselineHorizon,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_62",
        statusBefore: "COMPLIANT",
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `FTS system failure: ${component.replace(/_/g, " ")}. ` +
      "CRITICAL — no launches until repaired and re-certified per Art. 62. " +
      "Art. 62 violation if any launches proceed. " +
      "Initiate emergency repair, schedule re-certification with NCA. " +
      "Notify all customers of launch hold.",
    severityLevel: "CRITICAL",
    costEstimate: {
      financialUsd: 3_000_000,
      description: `FTS ${component.replace(/_/g, " ")} failure and re-certification`,
    },
  });
}

export function runWeatherStationOutage(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const systemsAffected =
    (scenario.parameters.systemsAffected as string) ?? "wind_profiler";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isAll = systemsAffected === "all";
  const horizonDelta = isAll
    ? -Math.round(baselineHorizon * 0.3)
    : -Math.round(baselineHorizon * 0.05);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_62",
        statusBefore: "COMPLIANT",
        statusAfter: isAll ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Weather station outage: ${systemsAffected.replace(/_/g, " ")}. ` +
      (isAll
        ? "All meteorological systems offline — launches on hold until weather capability restored. " +
          "Cannot assess launch weather criteria."
        : `${systemsAffected.replace(/_/g, " ")} offline — use alternative data source or manual observations. ` +
          "May restrict launch windows."),
    severityLevel: isAll ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: isAll ? 500_000 : 100_000,
      description: `Weather system ${systemsAffected.replace(/_/g, " ")} outage`,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SITE ENVIRONMENTAL
// ═══════════════════════════════════════════════════════════════════════════════

export function runNoiseComplianceViolation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const excessDb = (scenario.parameters.excessDb as number) ?? 5;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isCritical = excessDb > 15;
  const isSignificant = excessDb > 5;
  const horizonDelta = isCritical
    ? -Math.round(baselineHorizon * 0.3)
    : isSignificant
      ? -Math.round(baselineHorizon * 0.1)
      : -Math.round(baselineHorizon * 0.03);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_66",
        statusBefore: "COMPLIANT",
        statusAfter: isCritical
          ? "NON_COMPLIANT"
          : isSignificant
            ? "WARNING"
            : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Noise compliance violation: ${excessDb} dB above limit. ` +
      (isCritical
        ? "Severe violation (>15 dB) — site license at risk. " +
          "Implement immediate mitigation. May require launch schedule reduction."
        : isSignificant
          ? "Significant violation — submit noise mitigation plan to environmental authority. " +
            "Consider sound suppression system upgrades."
          : "Marginal violation — document and monitor. " +
            "Review noise prediction models for accuracy."),
    severityLevel: isCritical ? "CRITICAL" : isSignificant ? "HIGH" : "MEDIUM",
  });
}

export function runEmissionLimitBreach(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const emissionType = (scenario.parameters.emissionType as string) ?? "hcl";
  const severity = (scenario.parameters.severity as string) ?? "marginal";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isMajor = severity === "major";
  const horizonDelta = isMajor
    ? -Math.round(baselineHorizon * 0.3)
    : severity === "significant"
      ? -Math.round(baselineHorizon * 0.1)
      : -Math.round(baselineHorizon * 0.03);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_66",
        statusBefore: "COMPLIANT",
        statusAfter: isMajor
          ? "NON_COMPLIANT"
          : severity === "significant"
            ? "WARNING"
            : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Emission limit breach: ${emissionType.toUpperCase()} (${severity}). ` +
      (isMajor
        ? "Major breach — environmental permit at risk. " +
          "Immediate launch suspension may be required. Engage environmental authority."
        : severity === "significant"
          ? "Significant breach — submit corrective action plan. " +
            "Review propellant type and launch frequency."
          : "Marginal breach — document and improve monitoring. " +
            "Review emission dispersion models."),
    severityLevel: isMajor
      ? "HIGH"
      : severity === "significant"
        ? "MEDIUM"
        : "LOW",
  });
}

export function runWildlifeImpactAssessment(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const species = (scenario.parameters.species as string) ?? "nesting_birds";
  const assessmentTimeDays =
    (scenario.parameters.assessmentTimeDays as number) ?? 90;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -assessmentTimeDays;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_66",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Wildlife impact assessment required: ${species.replace(/_/g, " ")} (${assessmentTimeDays} days). ` +
      "Environmental authority mandates assessment before continued operations. " +
      "May result in seasonal launch restrictions or noise mitigation requirements. " +
      "Engage qualified ecological consultant.",
    severityLevel: assessmentTimeDays > 180 ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: 200_000 + assessmentTimeDays * 2000,
      description: `Wildlife impact assessment for ${species.replace(/_/g, " ")}`,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SITE REGULATORY
// ═══════════════════════════════════════════════════════════════════════════════

export function runSiteLicenseConditionChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const conditionType =
    (scenario.parameters.conditionType as string) ?? "launch_rate_reduction";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const impactMap: Record<
    string,
    { horizonFactor: number; severity: WhatIfResult["severityLevel"] }
  > = {
    launch_rate_reduction: { horizonFactor: 0.15, severity: "HIGH" },
    operating_hours_restriction: { horizonFactor: 0.1, severity: "MEDIUM" },
    additional_environmental_monitoring: {
      horizonFactor: 0.05,
      severity: "LOW",
    },
    safety_zone_expansion: { horizonFactor: 0.2, severity: "HIGH" },
    insurance_increase: { horizonFactor: 0.05, severity: "MEDIUM" },
  };

  const impact = impactMap[conditionType] ?? {
    horizonFactor: 0.1,
    severity: "MEDIUM" as const,
  };
  const horizonDelta = -Math.round(baselineHorizon * impact.horizonFactor);

  const narratives: Record<string, string> = {
    launch_rate_reduction:
      "Launch rate limit reduced — directly impacts revenue model. " +
      "Re-evaluate customer commitments and scheduling.",
    operating_hours_restriction:
      "Operating hours restricted — may affect launch window availability. " +
      "Coordinate with range authority.",
    additional_environmental_monitoring:
      "Additional monitoring required. Install monitoring equipment and establish reporting procedures.",
    safety_zone_expansion:
      "Safety zone expanded — may require land acquisition or easements. " +
      "Significant infrastructure and legal implications.",
    insurance_increase:
      "Insurance coverage increase mandated. Review current policy and obtain updated quotes.",
  };

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_5",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Site license condition change: ${conditionType.replace(/_/g, " ")}. ` +
      (narratives[conditionType] ??
        "Review new conditions and update operations."),
    severityLevel: impact.severity,
  });
}

export function runAirspaceRestrictionChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const changeType =
    (scenario.parameters.changeType as string) ?? "new_air_route";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isRestrictedExpansion = changeType === "restricted_zone_expansion";
  const isMilitary = changeType === "military_exercise";
  const horizonDelta = isRestrictedExpansion
    ? -Math.round(baselineHorizon * 0.15)
    : -Math.round(baselineHorizon * 0.05);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_62",
        statusBefore: "COMPLIANT",
        statusAfter: isRestrictedExpansion ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Airspace restriction change: ${changeType.replace(/_/g, " ")}. ` +
      (isRestrictedExpansion
        ? "Restricted zone expansion — may permanently reduce available launch windows. " +
          "Coordinate with aviation authority for deconfliction procedures."
        : isMilitary
          ? "Military exercise — temporary restriction. Coordinate scheduling and NOTAM filings."
          : "Update launch azimuth analysis and NOTAM procedures. " +
            "Coordinate with air traffic control for new deconfliction windows."),
    severityLevel: isRestrictedExpansion ? "HIGH" : "MEDIUM",
  });
}

export function runNotamConflict(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const conflictType =
    (scenario.parameters.conflictType as string) ?? "overlapping_notam";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isMilitary = conflictType === "military_priority";
  const horizonDelta = isMilitary
    ? -Math.round(baselineHorizon * 0.1)
    : -Math.round(baselineHorizon * 0.03);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_62",
        statusBefore: "COMPLIANT",
        statusAfter: isMilitary ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `NOTAM conflict: ${conflictType.replace(/_/g, " ")}. ` +
      (isMilitary
        ? "Military priority — launch window yields to military operations. " +
          "Coordinate with defense ministry for alternative scheduling."
        : "NOTAM conflict — coordinate with air traffic control for resolution. " +
          "May require launch window adjustment."),
    severityLevel: isMilitary ? "HIGH" : "MEDIUM",
  });
}
