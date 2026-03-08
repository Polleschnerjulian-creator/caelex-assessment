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
// LAUNCH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function runLoLaunchDelay(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const delayDays = (scenario.parameters.delayDays as number) ?? 30;
  const reason = (scenario.parameters.reason as string) ?? "technical";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -delayDays;
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  const licenseExpiry = delayDays > 180;
  const insuranceExpiry = delayDays > 90;
  const isCritical = licenseExpiry || insuranceExpiry;

  const affectedRegulations: WhatIfResult["affectedRegulations"] = [
    {
      regulationRef: "eu_space_act_art_5",
      statusBefore: "COMPLIANT",
      statusAfter: licenseExpiry ? "NON_COMPLIANT" : "WARNING",
      crossingDateBefore: null,
      crossingDateAfter: null,
    },
  ];

  if (insuranceExpiry) {
    affectedRegulations.push({
      regulationRef: "eu_space_act_art_8",
      statusBefore: "COMPLIANT",
      statusAfter: "WARNING",
      crossingDateBefore: null,
      crossingDateAfter: null,
    });
  }

  const reasonNarratives: Record<string, string> = {
    technical:
      "Technical delay requires updated flight safety analysis and FTS re-certification.",
    weather: "Weather delay — short-term impact, insurance coverage continues.",
    regulatory:
      "Regulatory hold — may require additional compliance documentation before clearance.",
    customer:
      "Customer-driven delay — check payload manifest insurance endorsements.",
    range_conflict:
      "Range conflict — coordinate with range authority for new window allocation.",
  };

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations,
    recommendation:
      `Launch delay of ${delayDays} days due to ${reason}. ` +
      (reasonNarratives[reason] ?? "") +
      (licenseExpiry
        ? " Delay exceeds 180 days — launch license validity at risk. File extension immediately."
        : "") +
      (insuranceExpiry
        ? " Insurance endorsement may need renewal for extended window."
        : ""),
    severityLevel: isCritical ? "CRITICAL" : delayDays > 30 ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: delayDays * 25000,
      description: `Storage, ground ops, and team retention for ${delayDays}-day delay`,
    },
  });
}

export function runLoLaunchWindowChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const windowShiftDays = (scenario.parameters.windowShiftDays as number) ?? 14;
  const windowDurationDays =
    (scenario.parameters.windowDurationDays as number) ?? 7;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta =
    windowShiftDays > 0
      ? -Math.abs(windowShiftDays)
      : Math.abs(windowShiftDays);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_62",
        statusBefore: "COMPLIANT",
        statusAfter: Math.abs(windowShiftDays) > 30 ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Launch window shifted by ${windowShiftDays > 0 ? "+" : ""}${windowShiftDays} days ` +
      `with new duration of ${windowDurationDays} days. ` +
      (Math.abs(windowShiftDays) > 30
        ? "Significant shift — update range safety review and flight safety analysis. "
        : "Minor shift — notify range authority and update mission timeline. ") +
      "Verify all campaign-specific deadlines remain achievable.",
    severityLevel:
      Math.abs(windowShiftDays) > 60
        ? "HIGH"
        : Math.abs(windowShiftDays) > 30
          ? "MEDIUM"
          : "LOW",
  });
}

export function runLoPadTurnaroundDelay(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const additionalDays = (scenario.parameters.additionalDays as number) ?? 14;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -additionalDays;
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_62",
        statusBefore: "COMPLIANT",
        statusAfter: additionalDays > 30 ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Pad turnaround delayed by ${additionalDays} additional days. ` +
      `Cascading impact on subsequent campaigns. ` +
      (additionalDays > 30
        ? "Extended delay — re-evaluate campaign manifest and insurance endorsements."
        : "Review integration schedule and coordinate with payload customers."),
    severityLevel: additionalDays > 30 ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: additionalDays * 15000,
      description: `Pad reservation and crew costs for ${additionalDays}-day extension`,
    },
  });
}

export function runLoMultiManifestChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const action = (scenario.parameters.action as string) ?? "add_payload";
  const classification =
    (scenario.parameters.payloadClassification as string) ?? "unclassified";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isItarRestricted = classification === "itar_restricted";
  const isControlled = classification === "controlled";
  const isAdding = action === "add_payload";

  const horizonDelta = isAdding
    ? isItarRestricted
      ? -90
      : isControlled
        ? -30
        : -7
    : 0;
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  const affectedRegulations: WhatIfResult["affectedRegulations"] = [];

  if (isAdding) {
    affectedRegulations.push({
      regulationRef: "eu_space_act_art_64",
      statusBefore: "COMPLIANT",
      statusAfter: "WARNING",
      crossingDateBefore: null,
      crossingDateAfter: null,
    });
  }

  if (isItarRestricted || isControlled) {
    affectedRegulations.push({
      regulationRef: "eu_dual_use",
      statusBefore: "COMPLIANT",
      statusAfter: isItarRestricted ? "NON_COMPLIANT" : "WARNING",
      crossingDateBefore: null,
      crossingDateAfter: null,
    });
  }

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations,
    recommendation: isAdding
      ? `Adding ${classification} payload to manifest. ` +
        (isItarRestricted
          ? "ITAR-restricted payload requires TAA/export license — 60-90 day lead time. " +
            "Coordinate with DDTC and verify all technology transfer agreements."
          : isControlled
            ? "Controlled payload requires export license verification. " +
              "File dual-use notification with relevant authority."
            : "Unclassified payload — standard payload safety review required.") +
        " Update payload integration timeline and insurance endorsement."
      : "Removing payload from manifest. Update integration schedule, " +
        "recalculate mass margins, and notify customer. " +
        "May simplify export control requirements.",
    severityLevel: isItarRestricted ? "HIGH" : isControlled ? "MEDIUM" : "LOW",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VEHICLE ANOMALIES
// ═══════════════════════════════════════════════════════════════════════════════

export function runLoEngineAnomaly(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const stage = (scenario.parameters.stage as string) ?? "first_stage";
  const severity = (scenario.parameters.severity as string) ?? "major";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isCatastrophic = severity === "catastrophic";
  const isMajor = severity === "major";

  const horizonDelta = isCatastrophic
    ? -baselineHorizon
    : isMajor
      ? -Math.round(baselineHorizon * 0.6)
      : -Math.round(baselineHorizon * 0.15);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  const costEstimates: Record<string, number> = {
    catastrophic: 50_000_000,
    major: 15_000_000,
    minor: 2_000_000,
  };

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_62",
        statusBefore: "COMPLIANT",
        statusAfter: isCatastrophic
          ? "NON_COMPLIANT"
          : isMajor
            ? "WARNING"
            : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      {
        regulationRef: "eu_space_act_art_5",
        statusBefore: "COMPLIANT",
        statusAfter: isCatastrophic || isMajor ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Engine anomaly (${severity}) on ${stage.replace(/_/g, " ")}. ` +
      (isCatastrophic
        ? "Catastrophic failure — full investigation required per Art. 62. " +
          "Launch license suspended pending root cause analysis (6-12 months). " +
          "Total vehicle loss. Notify NCA immediately."
        : isMajor
          ? "Major anomaly — mandatory investigation and corrective action. " +
            "Stand-down period typically 3-6 months. " +
            "Update flight safety analysis and re-certify affected systems."
          : "Minor anomaly — document findings and update maintenance records. " +
            "Engine qualification review required before next campaign."),
    severityLevel: isCatastrophic ? "CRITICAL" : isMajor ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: costEstimates[severity] ?? 5_000_000,
      description: `${severity} engine anomaly on ${stage.replace(/_/g, " ")}`,
    },
  });
}

export function runLoFtsActivation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const flightPhase =
    (scenario.parameters.flightPhase as string) ?? "first_stage_burn";

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
      {
        regulationRef: "eu_space_act_art_5",
        statusBefore: "COMPLIANT",
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      {
        regulationRef: "eu_space_act_art_8",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Flight Termination System activated during ${flightPhase.replace(/_/g, " ")}. ` +
      "CRITICAL — mandatory investigation period (6-12 months typical). " +
      "Launch license suspended immediately. Notify NCA and EASA within 24 hours. " +
      "Full debris footprint analysis required. Insurance claim process initiated. " +
      "Root cause analysis and corrective action plan required before re-licensing.",
    severityLevel: "CRITICAL",
    costEstimate: {
      financialUsd: 35_000_000,
      description:
        "Vehicle loss, investigation, debris recovery, insurance excess",
    },
  });
}

export function runLoStageSeparationAnomaly(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const outcome =
    (scenario.parameters.outcome as string) ?? "delayed_separation";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isFailed = outcome === "failed_separation";
  const isPartial = outcome === "partial_separation";

  const horizonDelta = isFailed
    ? -baselineHorizon
    : isPartial
      ? -Math.round(baselineHorizon * 0.5)
      : -Math.round(baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_62",
        statusBefore: "COMPLIANT",
        statusAfter: isFailed ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Stage separation anomaly: ${outcome.replace(/_/g, " ")}. ` +
      (isFailed
        ? "Complete failure — mission lost. Full investigation required."
        : isPartial
          ? "Partial separation — mission may continue with degraded performance. " +
            "Investigation required before next campaign."
          : "Delayed separation — review mechanisms and update qualification data."),
    severityLevel: isFailed ? "CRITICAL" : isPartial ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: isFailed ? 40_000_000 : isPartial ? 10_000_000 : 1_000_000,
      description: `Stage separation ${outcome.replace(/_/g, " ")}`,
    },
  });
}

export function runLoFairingFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const failureType =
    (scenario.parameters.failureType as string) ?? "delayed_separation";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isNoSeparation = failureType === "no_separation";

  const horizonDelta = isNoSeparation
    ? -baselineHorizon
    : -Math.round(baselineHorizon * 0.2);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: isNoSeparation ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Fairing failure: ${failureType.replace(/_/g, " ")}. ` +
      (isNoSeparation
        ? "Complete fairing failure — payload cannot deploy. Mission failure. " +
          "Customer insurance claims initiated. Investigation and redesign required."
        : "Fairing anomaly — review separation mechanism and update qualification."),
    severityLevel: isNoSeparation ? "CRITICAL" : "MEDIUM",
    costEstimate: {
      financialUsd: isNoSeparation ? 25_000_000 : 2_000_000,
      description: `Fairing ${failureType.replace(/_/g, " ")}`,
    },
  });
}

export function runLoUpperStageRestartFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const restartAttempt = (scenario.parameters.restartAttempt as number) ?? 2;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -Math.round(baselineHorizon * 0.4);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_62",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Upper stage restart failure on attempt ${restartAttempt}. ` +
      "Payload delivered to incorrect orbit. Customer may claim partial mission failure. " +
      "Investigation required — review engine restart sequence, propellant management, " +
      "and thermal conditioning. Stand-down for upper stage campaigns until root cause identified.",
    severityLevel: "HIGH",
    costEstimate: {
      financialUsd: 15_000_000,
      description: "Partial mission failure — incorrect orbit insertion",
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// RANGE & ENVIRONMENT
// ═══════════════════════════════════════════════════════════════════════════════

export function runLoRangeSafetyViolation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const deviationType =
    (scenario.parameters.deviationType as string) ?? "azimuth";
  const severity = (scenario.parameters.severity as string) ?? "major";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isCritical = severity === "critical";
  const horizonDelta = isCritical
    ? -baselineHorizon
    : severity === "major"
      ? -Math.round(baselineHorizon * 0.4)
      : -Math.round(baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_62",
        statusBefore: "COMPLIANT",
        statusAfter: isCritical ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Range safety violation: ${deviationType} deviation (${severity}). ` +
      (isCritical
        ? "Critical violation — FTS activation may be required. " +
          "Full investigation mandated. Launch operations suspended pending review."
        : `${severity === "major" ? "Major" : "Minor"} deviation — ` +
          "review trajectory guidance and update flight safety analysis. " +
          "Notify range safety officer."),
    severityLevel: isCritical
      ? "CRITICAL"
      : severity === "major"
        ? "HIGH"
        : "MEDIUM",
  });
}

export function runLoWeatherDelay(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const delayDays = (scenario.parameters.delayDays as number) ?? 3;
  const weatherType = (scenario.parameters.weatherType as string) ?? "wind";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -delayDays;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [],
    recommendation:
      `Weather delay of ${delayDays} days due to ${weatherType.replace(/_/g, " ")}. ` +
      "Standard operational delay — no regulatory impact unless it pushes past launch window. " +
      "Monitor weather forecast and coordinate with range for updated slot.",
    severityLevel: delayDays > 14 ? "MEDIUM" : "LOW",
  });
}

export function runLoEnvironmentalProtest(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const challengeType =
    (scenario.parameters.type as string) ?? "regulatory_review";
  const estimatedDelayDays =
    (scenario.parameters.estimatedDelayDays as number) ?? 60;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -estimatedDelayDays;

  const isInjunction = challengeType === "legal_injunction";

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_66",
        statusBefore: "COMPLIANT",
        statusAfter: isInjunction ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Environmental ${challengeType.replace(/_/g, " ")} — estimated ${estimatedDelayDays}-day delay. ` +
      (isInjunction
        ? "Legal injunction — all launch operations halted pending court resolution. " +
          "Engage legal counsel immediately. Prepare updated EIA documentation."
        : "Engage with environmental authorities and stakeholders. " +
          "Prepare supplementary environmental documentation."),
    severityLevel: isInjunction ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd:
        estimatedDelayDays * 20000 + (isInjunction ? 500000 : 50000),
      description: `Legal and operational costs for ${challengeType.replace(/_/g, " ")}`,
    },
  });
}

export function runLoOverflightRestriction(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const restrictionType =
    (scenario.parameters.restrictionType as string) ?? "new_restriction";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta =
    restrictionType === "expanded_zone"
      ? -Math.round(baselineHorizon * 0.2)
      : -Math.round(baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_62",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Overflight restriction change: ${restrictionType.replace(/_/g, " ")}. ` +
      "Requires launch azimuth re-evaluation and updated flight safety analysis. " +
      "Coordinate with neighboring states and update NOTAM filings. " +
      "May reduce available launch windows.",
    severityLevel: "MEDIUM",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAUNCH REGULATORY
// ═══════════════════════════════════════════════════════════════════════════════

export function runLoLaunchLicenseConditionChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const conditionType =
    (scenario.parameters.conditionType as string) ?? "additional_safety_review";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const impactMap: Record<
    string,
    { horizonFactor: number; severity: WhatIfResult["severityLevel"] }
  > = {
    insurance_increase: { horizonFactor: 0.05, severity: "MEDIUM" },
    additional_safety_review: { horizonFactor: 0.15, severity: "HIGH" },
    environmental_restriction: { horizonFactor: 0.1, severity: "MEDIUM" },
    frequency_restriction: { horizonFactor: 0.05, severity: "LOW" },
    launch_rate_limit: { horizonFactor: 0.1, severity: "MEDIUM" },
  };

  const impact = impactMap[conditionType] ?? {
    horizonFactor: 0.1,
    severity: "MEDIUM" as const,
  };
  const horizonDelta = -Math.round(baselineHorizon * impact.horizonFactor);

  const narratives: Record<string, string> = {
    insurance_increase:
      "NCA mandates increased insurance coverage. Review current policy and obtain quotes for expanded coverage.",
    additional_safety_review:
      "Additional safety review required — 30-90 day timeline. Prepare supplementary safety documentation.",
    environmental_restriction:
      "New environmental restriction imposed. Update EIA and operational procedures.",
    frequency_restriction:
      "Frequency restriction change — coordinate with spectrum authority for alternative allocation.",
    launch_rate_limit:
      "Launch rate limit imposed. Re-evaluate campaign schedule and customer commitments.",
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
      `Launch license condition change: ${conditionType.replace(/_/g, " ")}. ` +
      (narratives[conditionType] ??
        "Review new conditions and update compliance documentation."),
    severityLevel: impact.severity,
  });
}

export function runLoPayloadClassificationChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const newClassification =
    (scenario.parameters.newClassification as string) ?? "controlled";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isItar = newClassification === "itar_restricted";
  const horizonDelta = isItar ? -90 : -30;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_dual_use",
        statusBefore: "COMPLIANT",
        statusAfter: isItar ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Payload reclassified as ${newClassification.replace(/_/g, " ")}. ` +
      (isItar
        ? "ITAR restriction — may require Technical Assistance Agreement (TAA). " +
          "Coordinate with DDTC. 60-90 day lead time for export license. " +
          "Launch may be delayed if TAA not in place."
        : "Controlled classification — dual-use export license required. " +
          "File application with relevant export control authority."),
    severityLevel: isItar ? "HIGH" : "MEDIUM",
  });
}

export function runLoTechnologyTransferIssue(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const issueType =
    (scenario.parameters.issueType as string) ?? "additional_review";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isDenied = issueType === "denied_license";

  const horizonDelta = isDenied
    ? -Math.round(baselineHorizon * 0.5)
    : issueType === "partner_country_restriction"
      ? -Math.round(baselineHorizon * 0.3)
      : -Math.round(baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_dual_use",
        statusBefore: "COMPLIANT",
        statusAfter: isDenied ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Technology transfer issue: ${issueType.replace(/_/g, " ")}. ` +
      (isDenied
        ? "Export license denied — cannot proceed with current configuration. " +
          "Evaluate alternative components or partners not subject to restrictions."
        : issueType === "partner_country_restriction"
          ? "Partner country restriction — review supply chain for restricted components. " +
            "Evaluate alternative sourcing."
          : "Additional review required — prepare supplementary documentation. " +
            "Timeline: 30-60 days for review completion."),
    severityLevel: isDenied ? "HIGH" : "MEDIUM",
  });
}
