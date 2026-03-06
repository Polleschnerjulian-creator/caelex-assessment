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
 * Simulate operator type change (SCO, LO, LSO, etc.).
 * More complex operator types face stricter requirements.
 */
export function runOperatorTypeChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const newOperatorType =
    (scenario.parameters.newOperatorType as string) ?? "SCO";
  const currentOperatorType =
    (scenario.parameters.currentOperatorType as string) ?? "LO";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  // Complexity ranking: higher = more requirements
  const complexityRank: Record<string, number> = {
    LO: 1,
    LSO: 2,
    SCO: 3,
    ISOS: 3,
    CAP: 4,
    PDP: 4,
    TCO: 5,
  };

  const currentRank = complexityRank[currentOperatorType] ?? 2;
  const newRank = complexityRank[newOperatorType] ?? 2;
  const isMoreComplex = newRank > currentRank;

  const horizonDelta = isMoreComplex
    ? -Math.round((newRank - currentRank) * 60)
    : Math.round((currentRank - newRank) * 30);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_10",
        statusBefore: "COMPLIANT",
        statusAfter: isMoreComplex ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Operator type change from ${currentOperatorType} to ${newOperatorType}. ` +
      (isMoreComplex
        ? `Increased regulatory burden — Art. 10 authorization requirements expand. ` +
          `Additional compliance documentation, reporting obligations, and potentially ` +
          `higher insurance thresholds apply. Allow 6-12 months for transition.`
        : `Reduced regulatory burden. Simpler authorization requirements under Art. 10. ` +
          `Review which existing compliance activities can be streamlined.`),
    severityLevel: isMoreComplex ? "MEDIUM" : "LOW",
  });
}

/**
 * Simulate a regulatory framework change.
 * Severity determines horizon impact — critical changes = -365 days.
 */
export function runRegulatoryChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const framework = (scenario.parameters.framework as string) ?? "eu_space_act";
  const changeSeverity = (scenario.parameters.severity as string) ?? "moderate";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const severityMap: Record<
    string,
    { horizonDelta: number; level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }
  > = {
    minor: { horizonDelta: -30, level: "LOW" },
    moderate: { horizonDelta: -90, level: "MEDIUM" },
    major: { horizonDelta: -180, level: "HIGH" },
    critical: { horizonDelta: -365, level: "CRITICAL" },
  };

  const impact = severityMap[changeSeverity] ?? severityMap.moderate;
  const projectedHorizon = Math.max(0, baselineHorizon + impact.horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta: impact.horizonDelta,
    affectedRegulations: [
      {
        regulationRef: framework,
        statusBefore: "COMPLIANT",
        statusAfter:
          changeSeverity === "critical" ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Regulatory change in ${framework} (${changeSeverity} severity). ` +
      `Compliance horizon reduced by ~${Math.abs(impact.horizonDelta)} days. ` +
      (changeSeverity === "critical"
        ? `Fundamental regulatory shift — existing compliance posture insufficient. ` +
          `Engage regulatory counsel immediately. Full compliance gap assessment required.`
        : changeSeverity === "major"
          ? `Significant new requirements. Initiate compliance gap analysis within 30 days. ` +
            `Budget for additional compliance activities and potential system modifications.`
          : `Review updated requirements and update compliance documentation accordingly. ` +
            `Standard regulatory change management process applies.`),
    severityLevel: impact.level,
    confidenceBand: {
      optimistic: Math.round(impact.horizonDelta * 0.5),
      pessimistic: Math.round(impact.horizonDelta * 1.5),
    },
  });
}

/**
 * Simulate insurance policy lapse.
 * Immediate NON_COMPLIANT per Art. 72. CRITICAL severity.
 */
export function runInsuranceLapse(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const coverageEur = (scenario.parameters.coverageEur as number) ?? 10000000;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return buildResult(scenario, baseline, {
    projectedHorizon: 0,
    horizonDelta: -baselineHorizon,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_72",
        statusBefore: baseline.modules.insurance?.status ?? "COMPLIANT",
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: new Date().toISOString(),
      },
    ],
    recommendation:
      `Insurance policy lapse — immediate NON_COMPLIANT per Art. 72 insurance requirements. ` +
      `Third-party liability coverage is a mandatory authorization condition. ` +
      `Secure replacement coverage immediately. Operations may need to be suspended ` +
      `until insurance is reinstated. Notify NCA of coverage gap. ` +
      `Previous coverage: EUR ${coverageEur.toLocaleString()}.`,
    severityLevel: "CRITICAL",
    costEstimate: {
      financialUsd: Math.round(coverageEur * 0.03 * 1.1),
      description: `Estimated emergency insurance premium (rush placement, ~3% of EUR ${coverageEur.toLocaleString()} coverage with 10% surcharge)`,
    },
  });
}

/**
 * Simulate NCA audit trigger (full or targeted).
 * Art. 42 supervision provisions.
 */
export function runNcaAuditTrigger(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const auditType = (scenario.parameters.auditType as string) ?? "targeted";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isFull = auditType === "full";

  const horizonDelta = isFull ? -60 : -30;
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_42",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `NCA ${auditType} audit triggered per Art. 42 supervision provisions. ` +
      (isFull
        ? `Full compliance audit — all modules will be reviewed. Prepare comprehensive documentation: ` +
          `authorization records, insurance certificates, debris mitigation plans, cybersecurity assessments, ` +
          `incident reports, and operational logs. Allocate 3-6 months for audit process.`
        : `Targeted audit — specific compliance area under review. Prepare relevant documentation ` +
          `and ensure all records are current. Typical duration: 1-3 months.`),
    severityLevel: isFull ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: isFull ? 200000 : 75000,
      description: `Estimated audit preparation and response cost (${auditType} audit)`,
    },
  });
}

/**
 * Simulate licensing condition change (add, modify, or remove conditions).
 * National space law compliance impact.
 */
export function runLicensingConditionChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const changeType = (scenario.parameters.changeType as string) ?? "modify";
  const conditionCount = (scenario.parameters.conditionCount as number) ?? 1;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  let horizonDelta: number;
  let severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  switch (changeType) {
    case "add":
      horizonDelta = -Math.round(conditionCount * 45);
      severityLevel = conditionCount > 3 ? "HIGH" : "MEDIUM";
      break;
    case "modify":
      horizonDelta = -Math.round(conditionCount * 20);
      severityLevel = "MEDIUM";
      break;
    case "remove":
      horizonDelta = Math.round(conditionCount * 15);
      severityLevel = "LOW";
      break;
    default:
      horizonDelta = -30;
      severityLevel = "MEDIUM";
  }

  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "national_space_law",
        statusBefore: "COMPLIANT",
        statusAfter: changeType === "add" ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      changeType === "add"
        ? `${conditionCount} new licensing condition(s) added under national space law. ` +
          `Review new requirements and assess compliance gaps. ` +
          `Update compliance documentation and procedures within the specified transition period.`
        : changeType === "modify"
          ? `${conditionCount} licensing condition(s) modified. Review changes against current compliance posture. ` +
            `Update affected procedures and documentation.`
          : `${conditionCount} licensing condition(s) removed. Compliance burden reduced. ` +
            `Update compliance matrix to reflect simplified requirements.`,
    severityLevel,
  });
}

/**
 * Simulate debris remediation order.
 * Art. 70 obligation with deadline. Includes ADR cost estimate.
 */
export function runDebrisRemediationOrder(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const deadlineDays = (scenario.parameters.deadlineDays as number) ?? 180;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -Math.max(0, baselineHorizon - deadlineDays);
  const projectedHorizon = Math.min(baselineHorizon, deadlineDays);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_70",
        statusBefore: baseline.modules.fuel?.status ?? "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Debris remediation order issued per Art. 70. Deadline: ${deadlineDays} days. ` +
      `Options: (1) Self-deorbit using remaining propellant, (2) Contract Active Debris Removal (ADR) service, ` +
      `(3) Demonstrate accelerated natural decay within deadline. ` +
      `Non-compliance may result in authorization suspension and financial penalties. ` +
      `Begin coordination with ADR providers immediately if self-deorbit is not feasible.`,
    severityLevel:
      deadlineDays < 90 ? "CRITICAL" : deadlineDays < 180 ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: 15000000,
      description:
        "Estimated Active Debris Removal service cost (if self-deorbit not feasible)",
    },
  });
}

/**
 * Simulate mandatory maneuver order from NCA.
 * Art. 64 obligation with deadline. Small fuel impact.
 */
export function runMandatoryManeuverOrder(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const deadlineDays = (scenario.parameters.deadlineDays as number) ?? 30;
  const fuelCostPct = (scenario.parameters.fuelCostPct as number) ?? 1;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -Math.round(deadlineDays * 0.5);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  const currentFuel =
    baseline.modules.fuel.factors.find(
      (f) => f.id === "fuel_passivation_reserve",
    )?.currentValue ?? null;
  const afterFuel = currentFuel !== null ? currentFuel - fuelCostPct : null;

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact:
      currentFuel !== null && afterFuel !== null
        ? { before: currentFuel, after: afterFuel, delta: -fuelCostPct }
        : null,
    recommendation:
      `Mandatory maneuver order per Art. 64. Deadline: ${deadlineDays} days. ` +
      `Fuel cost: ~${fuelCostPct}%. Plan and execute maneuver within deadline. ` +
      `Non-compliance with NCA order may result in authorization review. ` +
      `Document maneuver execution and report completion to NCA.`,
    severityLevel:
      deadlineDays < 7 ? "CRITICAL" : deadlineDays < 30 ? "HIGH" : "MEDIUM",
  });
}

/**
 * Simulate spectrum reallocation by ITU or national authority.
 * Timeline in months. Includes migration cost.
 */
export function runSpectrumReallocation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const timelineMonths = (scenario.parameters.timelineMonths as number) ?? 18;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -Math.round(timelineMonths * 10);
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
      `Spectrum reallocation with ${timelineMonths}-month transition timeline per ITU Radio Regulations. ` +
      `Begin frequency migration planning immediately. Update ground segment receivers and ` +
      `onboard transponder configuration. File updated frequency coordination with ITU. ` +
      `Coordinate with other operators in the affected band.`,
    severityLevel: timelineMonths < 12 ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: 800000 + (timelineMonths < 12 ? 500000 : 0),
      description: `Frequency migration cost (ground + space segment updates${timelineMonths < 12 ? ", expedited timeline surcharge" : ""})`,
    },
  });
}

/**
 * Simulate international treaty change affecting space operations.
 * -180 days horizon impact. HIGH severity.
 */
export function runTreatyChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const treatyName =
    (scenario.parameters.treatyName as string) ??
    "Outer Space Treaty amendment";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -180;
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "international_treaty",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `International treaty change: ${treatyName}. Compliance horizon reduced by 180 days. ` +
      `Treaty changes cascade into national implementing legislation. ` +
      `Monitor transposition into EU and national space law. ` +
      `Engage regulatory counsel to assess impact on current authorization and operations. ` +
      `Anticipate 12-24 month implementation period.`,
    severityLevel: "HIGH",
    confidenceBand: {
      optimistic: -90,
      pessimistic: -270,
    },
  });
}

/**
 * Simulate a liability claim against the operator.
 * Art. 72 + Liability Convention. Fault or absolute basis.
 */
export function runLiabilityClaim(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const basis = (scenario.parameters.basis as string) ?? "fault";
  const claimAmountEur =
    (scenario.parameters.claimAmountEur as number) ?? 5000000;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isAbsolute = basis === "absolute";

  const horizonDelta = isAbsolute ? -120 : -60;
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_72",
        statusBefore: baseline.modules.insurance?.status ?? "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      {
        regulationRef: "liability_convention",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Liability claim filed on ${basis} basis for EUR ${claimAmountEur.toLocaleString()}. ` +
      (isAbsolute
        ? `Absolute liability applies (Liability Convention Art. II — damage on Earth surface). ` +
          `No fault defense available. Verify insurance coverage adequacy per Art. 72.`
        : `Fault-based liability (Liability Convention Art. III — damage in outer space). ` +
          `Document compliance history and operational decisions as defense evidence.`) +
      ` Notify insurer immediately. Engage space law counsel. ` +
      `Review insurance coverage limits against claim amount.`,
    severityLevel: isAbsolute ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: Math.round(claimAmountEur * 1.1),
      description: `Estimated liability exposure: EUR ${claimAmountEur.toLocaleString()} claim + legal costs`,
    },
  });
}

/**
 * Simulate NIS2 notification trigger.
 * Severity levels: significant, substantial, large-scale. NIS2 Art. 23 applies.
 */
export function runNis2NotificationTrigger(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const incidentScale =
    (scenario.parameters.incidentScale as string) ?? "significant";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const scaleMap: Record<
    string,
    {
      horizonFraction: number;
      level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      penaltyInfo: string;
    }
  > = {
    significant: {
      horizonFraction: 0.1,
      level: "MEDIUM",
      penaltyInfo:
        "Penalties for non-notification: up to EUR 7M or 1.4% annual turnover (important entities)",
    },
    substantial: {
      horizonFraction: 0.25,
      level: "HIGH",
      penaltyInfo:
        "Penalties for non-notification: up to EUR 10M or 2% annual turnover (essential entities)",
    },
    "large-scale": {
      horizonFraction: 0.5,
      level: "CRITICAL",
      penaltyInfo:
        "Maximum penalties apply: EUR 10M or 2% annual turnover. Potential management liability under NIS2 Art. 32",
    },
  };

  const impact = scaleMap[incidentScale] ?? scaleMap.significant;
  const horizonDelta = -Math.round(baselineHorizon * impact.horizonFraction);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "nis2_art_23",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `NIS2 Art. 23 notification triggered (${incidentScale} incident). ` +
      `Mandatory notification timeline: (1) Early warning to CSIRT/competent authority within 24 hours, ` +
      `(2) Incident notification with initial assessment within 72 hours, ` +
      `(3) Intermediate report upon request, (4) Final report within 1 month. ` +
      `${impact.penaltyInfo}. ` +
      `Ensure incident response plan is activated and all notifications are documented.`,
    severityLevel: impact.level,
    costEstimate: {
      financialUsd:
        incidentScale === "large-scale"
          ? 3000000
          : incidentScale === "substantial"
            ? 1000000
            : 300000,
      description: `Estimated incident response and compliance cost (${incidentScale} incident)`,
    },
  });
}
