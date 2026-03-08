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
// GROUND OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function runTcoCommandLinkLoss(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const duration = (scenario.parameters.duration as string) ?? "temporary";
  const affectedSatellites =
    (scenario.parameters.affectedSatellites as number) ?? 1;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isPermanent = duration === "permanent";
  const isFleetWide = affectedSatellites > 5;
  const horizonDelta =
    isPermanent && isFleetWide
      ? -baselineHorizon
      : isPermanent
        ? -Math.round(baselineHorizon * 0.6)
        : -Math.round(baselineHorizon * 0.15);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel:
      isPermanent && isFleetWide
        ? "CRITICAL"
        : isPermanent
          ? "CRITICAL"
          : "HIGH",
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: isPermanent ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Command link loss (${duration}) affecting ${affectedSatellites} satellite(s). ` +
      (isPermanent
        ? "Permanent link loss — satellite(s) uncontrollable. Notify NCA immediately. Assess collision risk and coordinate with SSA."
        : "Temporary loss — activate backup ground stations and restore link. Monitor satellite autonomous safing."),
  });
}

export function runTcoTrackingAccuracyDegradation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const degradationLevel =
    (scenario.parameters.degradationLevel as string) ?? "moderate";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isSevere =
    degradationLevel === "severe" || degradationLevel === "total_loss";
  const horizonDelta = isSevere
    ? -Math.round(baselineHorizon * 0.4)
    : -Math.round(baselineHorizon * 0.1);

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
      `Tracking accuracy degradation: ${degradationLevel.replace(/_/g, " ")}. ` +
      (isSevere
        ? "Severe degradation — SSA contributions unreliable. Cross-reference with SSN/CSpOC data. Recalibrate tracking systems."
        : "Moderate degradation — review calibration and increase tracking update frequency."),
  });
}

export function runTcoGroundStationFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const failureType = (scenario.parameters.failureType as string) ?? "partial";
  const redundancy = (scenario.parameters.redundancy as string) ?? "yes";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isTotal = failureType === "total";
  const noBackup = redundancy === "no";
  const horizonDelta =
    isTotal && noBackup
      ? -Math.round(baselineHorizon * 0.7)
      : isTotal
        ? -Math.round(baselineHorizon * 0.3)
        : -Math.round(baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel:
      isTotal && noBackup ? "CRITICAL" : isTotal ? "HIGH" : "MEDIUM",
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: isTotal && noBackup ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Ground station failure: ${failureType.replace(/_/g, " ")} (redundancy: ${redundancy}). ` +
      (isTotal && noBackup
        ? "Total failure with no redundancy — command and tracking capability lost. Emergency operations required."
        : "Activate backup systems and coordinate pass schedule across network."),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export function runTcoAntennaFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const antennaType = (scenario.parameters.antennaType as string) ?? "primary";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isPrimary = antennaType === "primary";
  const horizonDelta = isPrimary
    ? -Math.round(baselineHorizon * 0.35)
    : -Math.round(baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel: isPrimary ? "HIGH" : "MEDIUM",
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: isPrimary ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Antenna failure: ${antennaType}. ` +
      (isPrimary
        ? "Primary antenna failure — switch to backup antenna. Schedule emergency maintenance and reroute traffic."
        : "Secondary antenna failure — schedule maintenance. Ensure primary system redundancy."),
    costEstimate: {
      financialUsd: isPrimary ? 2_000_000 : 500_000,
      description: "Antenna repair/replacement estimate",
    },
  });
}

export function runTcoTimingSynchronizationLoss(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(
      0,
      baselineHorizon - Math.round(baselineHorizon * 0.3),
    ),
    horizonDelta: -Math.round(baselineHorizon * 0.3),
    severityLevel: "HIGH",
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      "Timing synchronization loss — ranging and Doppler measurements unreliable. " +
      "Switch to GPS-disciplined backup oscillator. Validate time reference across network.",
  });
}

export function runTcoCommandAuthenticationBreach(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return buildResult(scenario, baseline, {
    projectedHorizon: 0,
    horizonDelta: -baselineHorizon,
    severityLevel: "CRITICAL",
    affectedRegulations: [
      {
        regulationRef: "nis2_art_21",
        statusBefore: "COMPLIANT",
        statusAfter: "NON_COMPLIANT",
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
      "Command authentication breach — CRITICAL. " +
      "Immediately suspend all commanding operations. Rotate all encryption keys. " +
      "Notify NCA within 24h per NIS2. Engage cybersecurity incident response team. " +
      "Assess potential unauthorized commands sent to spacecraft.",
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TCO REGULATORY
// ═══════════════════════════════════════════════════════════════════════════════

export function runTcoNis2ClassificationChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const newClassification =
    (scenario.parameters.newClassification as string) ?? "essential";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isEssential = newClassification === "essential";
  const horizonDelta = isEssential
    ? -Math.round(baselineHorizon * 0.35)
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
        ? "TCO reclassified as essential — command link security now under strictest NIS2 requirements. " +
          "24h incident reporting mandatory. Supply chain security audit required."
        : "Classification change — review and update security posture."),
  });
}

export function runTcoInteroperabilityFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const scope = (scenario.parameters.scope as string) ?? "single_protocol";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isMultiProtocol = scope === "multi_protocol";
  const horizonDelta = isMultiProtocol
    ? -Math.round(baselineHorizon * 0.25)
    : -Math.round(baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    severityLevel: isMultiProtocol ? "HIGH" : "MEDIUM",
    recommendation:
      `Interoperability failure (${scope.replace(/_/g, " ")}). ` +
      (isMultiProtocol
        ? "Multi-protocol failure — cross-support services disrupted. Engage CCSDS working group and coordinate with partner stations."
        : "Single protocol failure — implement workaround and schedule protocol update."),
  });
}
