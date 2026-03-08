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
// PROXIMITY OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function runApproachAbort(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const abortPhase =
    (scenario.parameters.abortPhase as string) ?? "close_approach";
  const reason = (scenario.parameters.reason as string) ?? "target_tumble";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const phaseSeverity: Record<string, { horizonFactor: number; cost: number }> =
    {
      far_approach: { horizonFactor: 0.05, cost: 5_000_000 },
      close_approach: { horizonFactor: 0.15, cost: 15_000_000 },
      final_approach: { horizonFactor: 0.4, cost: 35_000_000 },
      docking: { horizonFactor: 0.6, cost: 50_000_000 },
    };

  const phase = phaseSeverity[abortPhase] ?? phaseSeverity.close_approach!;
  const horizonDelta = -Math.round(baselineHorizon * phase.horizonFactor);
  const isCritical =
    abortPhase === "final_approach" || abortPhase === "docking";

  const reasonNarratives: Record<string, string> = {
    target_tumble:
      "Target tumble rate exceeds safe capture threshold. Wait for stabilization or re-evaluate capture method.",
    sensor_failure:
      "Relative navigation sensor failure. Cannot maintain safe approach trajectory.",
    fuel_low:
      "Fuel reserves below abort threshold. Mission replanning required.",
    ground_command:
      "Ground command abort — external factors. Await clearance for re-approach.",
    collision_risk:
      "Collision risk detected — conjunction event in approach corridor.",
  };

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_63",
        statusBefore: "COMPLIANT",
        statusAfter: isCritical ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Approach abort during ${abortPhase.replace(/_/g, " ")} phase due to ${reason.replace(/_/g, " ")}. ` +
      (reasonNarratives[reason] ?? "") +
      (isCritical
        ? " Late-phase abort — significant fuel expenditure. Re-approach may require new proximity authorization."
        : " Early abort — replanning possible with moderate impact."),
    severityLevel: isCritical ? "CRITICAL" : "MEDIUM",
    costEstimate: {
      financialUsd: phase.cost,
      description: `Abort during ${abortPhase.replace(/_/g, " ")} — fuel and mission timeline impact`,
    },
  });
}

export function runKeepoutZoneViolation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const violationDistanceKm =
    (scenario.parameters.violationDistanceKm as number) ?? 0.5;
  const duration = (scenario.parameters.duration as string) ?? "minutes";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isSustained = duration === "sustained";
  const horizonDelta = isSustained
    ? -baselineHorizon
    : -Math.round(baselineHorizon * 0.5);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_63",
        statusBefore: "COMPLIANT",
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Keep-out zone violation at ${violationDistanceKm} km (duration: ${duration}). ` +
      "CRITICAL — Art. 63 violation. Regulatory investigation triggered. " +
      (isSustained
        ? "Sustained violation — license revocation risk. Immediate abort and stand-down required. " +
          "Notify NCA within 24 hours."
        : "Transient violation — document incident, submit root cause analysis to NCA within 72 hours."),
    severityLevel: "CRITICAL",
    costEstimate: {
      financialUsd: isSustained ? 25_000_000 : 5_000_000,
      description: `Keep-out zone violation — investigation and potential license action`,
    },
  });
}

export function runRelativeNavFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const sensorType = (scenario.parameters.sensorType as string) ?? "lidar";
  const redundancy = (scenario.parameters.redundancy as string) ?? "degraded";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isTotal = sensorType === "all" || redundancy === "none";
  const horizonDelta = isTotal
    ? -Math.round(baselineHorizon * 0.6)
    : redundancy === "degraded"
      ? -Math.round(baselineHorizon * 0.2)
      : -Math.round(baselineHorizon * 0.05);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_63",
        statusBefore: "COMPLIANT",
        statusAfter: isTotal ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Relative navigation failure: ${sensorType} (backup: ${redundancy}). ` +
      (isTotal
        ? "Total navigation failure — immediate abort required. Cannot maintain safe proximity operations. " +
          "Mission stand-down until navigation system restored."
        : redundancy === "degraded"
          ? "Degraded navigation — continue with reduced approach rate and increased safety margins. " +
            "Schedule backup sensor activation and update mission timeline."
          : "Single sensor failure with full backup available. Switch to backup and continue with monitoring."),
    severityLevel: isTotal
      ? "CRITICAL"
      : redundancy === "degraded"
        ? "HIGH"
        : "MEDIUM",
    costEstimate: {
      financialUsd: isTotal ? 20_000_000 : 3_000_000,
      description: `Relative navigation ${sensorType} failure`,
    },
  });
}

export function runCaptureMechanismFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const failureType =
    (scenario.parameters.failureType as string) ?? "partial_grip";
  const retryPossible = (scenario.parameters.retryPossible as string) ?? "yes";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isNoRetry = retryPossible === "no";
  const isTotalFailure =
    failureType === "no_grip" || failureType === "stuck_closed";

  const horizonDelta =
    isTotalFailure && isNoRetry
      ? -baselineHorizon
      : isTotalFailure
        ? -Math.round(baselineHorizon * 0.4)
        : -Math.round(baselineHorizon * 0.15);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_63",
        statusBefore: "COMPLIANT",
        statusAfter: isTotalFailure && isNoRetry ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Capture mechanism failure: ${failureType.replace(/_/g, " ")} (retry: ${retryPossible}). ` +
      (isTotalFailure && isNoRetry
        ? "Complete capture failure with no retry possible — mission failure. " +
          "For debris removal: failed capture may create additional debris risk. " +
          "Retreat to safe distance and assess disposal options."
        : isTotalFailure
          ? "Total failure but retry possible. Retreat to safe distance, " +
            "diagnose mechanism, attempt reset sequence."
          : "Partial failure — adjust grip parameters and retry. " +
            "Monitor mechanism telemetry closely."),
    severityLevel:
      isTotalFailure && isNoRetry
        ? "CRITICAL"
        : isTotalFailure
          ? "HIGH"
          : "MEDIUM",
    costEstimate: {
      financialUsd: isTotalFailure && isNoRetry ? 40_000_000 : 5_000_000,
      description: `Capture mechanism ${failureType.replace(/_/g, " ")}`,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TARGET EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export function runTargetTumbleIncrease(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const tumbleRate = (scenario.parameters.tumbleRate as string) ?? "moderate";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const tumbleImpact: Record<
    string,
    { horizonFactor: number; severity: WhatIfResult["severityLevel"] }
  > = {
    slow_stable: { horizonFactor: 0.02, severity: "LOW" },
    moderate: { horizonFactor: 0.1, severity: "MEDIUM" },
    fast: { horizonFactor: 0.3, severity: "HIGH" },
    chaotic: { horizonFactor: 0.6, severity: "CRITICAL" },
  };

  const impact = tumbleImpact[tumbleRate] ?? tumbleImpact.moderate!;
  const horizonDelta = -Math.round(baselineHorizon * impact.horizonFactor);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_63",
        statusBefore: "COMPLIANT",
        statusAfter:
          tumbleRate === "chaotic"
            ? "NON_COMPLIANT"
            : tumbleRate === "fast"
              ? "WARNING"
              : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Target tumble rate: ${tumbleRate.replace(/_/g, " ")}. ` +
      (tumbleRate === "chaotic"
        ? "Chaotic tumble — capture impossible with current approach. " +
          "Consider waiting for natural de-tumble or switching to non-cooperative capture method."
        : tumbleRate === "fast"
          ? "Fast tumble — capture significantly more difficult. " +
            "May require extended observation period and fuel-intensive matching maneuvers."
          : tumbleRate === "moderate"
            ? "Moderate tumble — adjust approach timeline and fuel budget for tumble matching."
            : "Slow stable tumble — minimal impact on approach plan."),
    severityLevel: impact.severity,
  });
}

export function runTargetDebrisCloud(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const source = (scenario.parameters.source as string) ?? "nearby_collision";
  const debrisDensity =
    (scenario.parameters.debrisDensity as string) ?? "medium";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isHigh = debrisDensity === "high";
  const isFromTarget = source === "target_breakup";
  const horizonDelta = isFromTarget
    ? -baselineHorizon
    : isHigh
      ? -Math.round(baselineHorizon * 0.5)
      : -Math.round(baselineHorizon * 0.15);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: "COMPLIANT",
        statusAfter: isFromTarget
          ? "NON_COMPLIANT"
          : isHigh
            ? "WARNING"
            : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      {
        regulationRef: "eu_space_act_art_63",
        statusBefore: "COMPLIANT",
        statusAfter: isFromTarget || isHigh ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Debris cloud event: ${source.replace(/_/g, " ")} (density: ${debrisDensity}). ` +
      (isFromTarget
        ? "Target breakup — mission objective destroyed. Abort approach immediately. " +
          "Assess servicer safety and plan collision avoidance maneuvers."
        : isHigh
          ? "High-density debris cloud — suspend approach operations. " +
            "Perform conjunction assessment for servicer. Await debris cloud dispersion."
          : "Low/medium debris density — monitor situation and update conjunction analysis. " +
            "Maintain heightened awareness during approach."),
    severityLevel: isFromTarget ? "CRITICAL" : isHigh ? "HIGH" : "MEDIUM",
  });
}

export function runTargetNonCooperation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const reason = (scenario.parameters.reason as string) ?? "commercial_dispute";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isBankrupt = reason === "operator_bankrupt";
  const horizonDelta = -Math.round(baselineHorizon * 0.5);

  const reasonNarratives: Record<string, string> = {
    commercial_dispute:
      "Commercial dispute — legal basis for cooperative approach removed. " +
      "Suspend operations pending resolution. May need Art. 63 re-authorization as non-cooperative.",
    regulatory_order:
      "Regulatory order blocking cooperation — comply with authority directive. " +
      "Seek legal clarification on mission continuation.",
    changed_plans:
      "Target operator changed plans — re-evaluate mission scope. " +
      "Negotiate new terms or seek alternative target.",
    operator_bankrupt:
      "Target operator bankrupt — legal entity may no longer exist. " +
      "May trigger debris removal mandate under Art. 68. " +
      "Seek regulatory guidance on non-cooperative approach authorization.",
  };

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_63",
        statusBefore: "COMPLIANT",
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Target operator non-cooperation: ${reason.replace(/_/g, " ")}. ` +
      "CRITICAL for cooperative missions — legal basis for approach removed. " +
      (reasonNarratives[reason] ?? ""),
    severityLevel: "CRITICAL",
    costEstimate: {
      financialUsd: isBankrupt ? 10_000_000 : 5_000_000,
      description: `Mission replanning due to target ${reason.replace(/_/g, " ")}`,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ISOS REGULATORY
// ═══════════════════════════════════════════════════════════════════════════════

export function runIsosAuthorizationChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const changeType =
    (scenario.parameters.changeType as string) ?? "keepout_zone_increase";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const impactMap: Record<
    string,
    { horizonFactor: number; severity: WhatIfResult["severityLevel"] }
  > = {
    keepout_zone_increase: { horizonFactor: 0.15, severity: "HIGH" },
    additional_safety_review: { horizonFactor: 0.2, severity: "HIGH" },
    insurance_increase: { horizonFactor: 0.05, severity: "MEDIUM" },
    consent_revocation: { horizonFactor: 0.6, severity: "CRITICAL" },
    approach_speed_limit: { horizonFactor: 0.1, severity: "MEDIUM" },
  };

  const impact = impactMap[changeType] ?? {
    horizonFactor: 0.1,
    severity: "MEDIUM" as const,
  };
  const horizonDelta = -Math.round(baselineHorizon * impact.horizonFactor);

  const narratives: Record<string, string> = {
    keepout_zone_increase:
      "Keep-out zone increased — requires mission replanning (30-90 day impact). " +
      "Update approach trajectory and fuel budget.",
    additional_safety_review:
      "Additional safety review mandated — 60-120 day timeline. " +
      "Prepare supplementary safety case documentation.",
    insurance_increase:
      "Insurance coverage increase required. Obtain updated quotes and renew policy.",
    consent_revocation:
      "Target consent revoked — CRITICAL for cooperative missions. " +
      "Cannot proceed with approach. Seek re-authorization or convert to non-cooperative mandate.",
    approach_speed_limit:
      "New approach speed limit imposed. Update flight dynamics and approach timeline.",
  };

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_63",
        statusBefore: "COMPLIANT",
        statusAfter:
          changeType === "consent_revocation" ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `ISOS authorization change (Art. 63): ${changeType.replace(/_/g, " ")}. ` +
      (narratives[changeType] ??
        "Review new conditions and update compliance documentation."),
    severityLevel: impact.severity,
  });
}

export function runDebrisRemediationOrderIsos(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const timelineDays = (scenario.parameters.timelineDays as number) ?? 180;
  const targetCount = (scenario.parameters.targetCount as number) ?? 1;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -Math.round(baselineHorizon * 0.3);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Debris remediation order: ${targetCount} object(s) within ${timelineDays} days. ` +
      "Regulatory mandate for active debris removal. " +
      "Assess servicer capability, fuel budget, and mission timeline. " +
      `${targetCount > 1 ? "Multi-target campaign requires sequential planning and additional fuel reserves. " : ""}` +
      "Update insurance for mandated operations and coordinate with target registrar.",
    severityLevel: targetCount > 3 ? "CRITICAL" : "HIGH",
    costEstimate: {
      financialUsd: targetCount * 15_000_000,
      description: `ADR mandate: ${targetCount} target(s) in ${timelineDays} days`,
    },
  });
}

export function runOosStandardChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const standard =
    (scenario.parameters.standard as string) ?? "confers_best_practices";
  const impact = (scenario.parameters.impact as string) ?? "significant_change";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const impactFactors: Record<string, number> = {
    minor_update: 0.03,
    significant_change: 0.1,
    major_overhaul: 0.25,
  };

  const horizonDelta = -Math.round(
    baselineHorizon * (impactFactors[impact] ?? 0.1),
  );

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_63",
        statusBefore: "COMPLIANT",
        statusAfter: impact === "major_overhaul" ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `OOS standard change: ${standard.replace(/_/g, " ")} (${impact.replace(/_/g, " ")}). ` +
      (impact === "major_overhaul"
        ? "Major overhaul — significant compliance work required. " +
          "Review all proximity operations procedures and safety cases."
        : impact === "significant_change"
          ? "Significant change — update relevant documentation and procedures within 6 months."
          : "Minor update — review and incorporate into next documentation cycle."),
    severityLevel:
      impact === "major_overhaul"
        ? "HIGH"
        : impact === "significant_change"
          ? "MEDIUM"
          : "LOW",
  });
}
