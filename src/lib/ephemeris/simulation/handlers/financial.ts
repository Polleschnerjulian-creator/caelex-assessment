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
 * Simulate insurance premium increase.
 * >100% increase = coverage risk (operator may drop coverage). Art. 72.
 */
export function runInsurancePremiumIncrease(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const increasePct = (scenario.parameters.increasePct as number) ?? 25;
  const currentPremiumEur =
    (scenario.parameters.currentPremiumEur as number) ?? 500000;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isCoverageRisk = increasePct > 100;

  const horizonDelta = isCoverageRisk
    ? -Math.round(baselineHorizon * 0.4)
    : -Math.round(increasePct * 0.5);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  const newPremium = Math.round(currentPremiumEur * (1 + increasePct / 100));

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_72",
        statusBefore: baseline.modules.insurance?.status ?? "COMPLIANT",
        statusAfter: isCoverageRisk ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Insurance premium increase of ${increasePct}% (EUR ${currentPremiumEur.toLocaleString()} -> EUR ${newPremium.toLocaleString()}). ` +
      (isCoverageRisk
        ? `Premium increase >100% creates coverage sustainability risk. Art. 72 requires continuous ` +
          `third-party liability insurance. If coverage becomes unaffordable, authorization may be at risk. ` +
          `Explore alternative insurers, risk mitigation measures to reduce premiums, or captive insurance options.`
        : `Premium increase within manageable range. Art. 72 compliance maintained. ` +
          `Review risk profile to identify premium reduction opportunities. ` +
          `Consider multi-year policy for rate stability.`),
    severityLevel: isCoverageRisk ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: Math.round((newPremium - currentPremiumEur) * 1.1),
      description: `Additional annual insurance cost: EUR ${(newPremium - currentPremiumEur).toLocaleString()} (${increasePct}% increase)`,
    },
  });
}

/**
 * Simulate supply chain disruption affecting spare parts or ground equipment.
 * >18 months lead time = Art. 64 warning (cannot maintain subsystems).
 */
export function runSupplyChainDisruption(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const leadTimeMonths = (scenario.parameters.leadTimeMonths as number) ?? 12;
  const componentType =
    (scenario.parameters.componentType as string) ?? "ground_equipment";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isWarning = leadTimeMonths > 18;

  const horizonDelta = isWarning
    ? -Math.round(leadTimeMonths * 8)
    : -Math.round(leadTimeMonths * 3);
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
      `Supply chain disruption: ${leadTimeMonths}-month lead time for ${componentType}. ` +
      (isWarning
        ? `Extended lead time >18 months threatens ability to maintain subsystem compliance per Art. 64. ` +
          `Identify alternative suppliers or equivalent components. ` +
          `Consider stockpiling critical spares. Review supply chain resilience plan.`
        : `Lead time within manageable range. Monitor supply chain status. ` +
          `Maintain buffer stock of critical components where possible.`),
    severityLevel: isWarning ? "HIGH" : leadTimeMonths > 12 ? "MEDIUM" : "LOW",
    costEstimate: {
      financialUsd: leadTimeMonths > 18 ? 500000 : 150000,
      description: `Estimated cost of supply chain mitigation (alternative sourcing, expedited procurement)`,
    },
  });
}

/**
 * Simulate sanctions or export control restrictions.
 * Immediate -180 day horizon impact. HIGH severity.
 */
export function runSanctionsExportControl(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const restrictionType =
    (scenario.parameters.restrictionType as string) ?? "export_control";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -180;
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

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
    recommendation:
      `${restrictionType === "sanctions" ? "Sanctions" : "Export control"} restrictions imposed. ` +
      `180-day compliance horizon reduction. ` +
      `Immediate impact on component sourcing, technology transfer, and potentially ground operations. ` +
      `Engage export control counsel. Review all supply chain dependencies for affected jurisdictions. ` +
      `Art. 64 subsystem maintenance capability may be compromised if spare parts are restricted. ` +
      `File for export license exceptions where applicable.`,
    severityLevel: "HIGH",
    confidenceBand: {
      optimistic: -90,
      pessimistic: -365,
    },
  });
}

/**
 * Simulate a budget cut affecting mission operations.
 * >30% reduction = Art. 64 warning (operational capability at risk).
 */
export function runBudgetCut(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const reductionPct = (scenario.parameters.reductionPct as number) ?? 15;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isWarning = reductionPct > 30;

  const horizonDelta = isWarning
    ? -Math.round(reductionPct * 5)
    : -Math.round(reductionPct * 2);
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
      `Budget cut of ${reductionPct}%. ` +
      (isWarning
        ? `Reduction >30% threatens operational capability per Art. 64. ` +
          `Critical compliance activities (collision avoidance, subsystem monitoring, ` +
          `insurance payments) must be protected from cuts. ` +
          `Identify non-compliance-critical activities that can be deferred or eliminated.`
        : `Budget reduction within manageable range. Prioritize compliance-critical expenditures. ` +
          `Review discretionary spending and optimize operational efficiency.`),
    severityLevel: isWarning ? "HIGH" : reductionPct > 20 ? "MEDIUM" : "LOW",
    costEstimate: {
      financialUsd: reductionPct * 10000,
      description: `Annual budget impact from ${reductionPct}% reduction`,
    },
  });
}

/**
 * Simulate partner default (service provider, manufacturer, etc.).
 * Criticality determines severity. High criticality = CRITICAL.
 */
export function runPartnerDefault(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const criticality = (scenario.parameters.criticality as string) ?? "medium";
  const partnerType =
    (scenario.parameters.partnerType as string) ?? "service_provider";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  let horizonDelta: number;
  let severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  switch (criticality) {
    case "high":
      horizonDelta = -Math.round(baselineHorizon * 0.5);
      severityLevel = "CRITICAL";
      break;
    case "medium":
      horizonDelta = -Math.round(baselineHorizon * 0.2);
      severityLevel = "HIGH";
      break;
    case "low":
    default:
      horizonDelta = -Math.round(baselineHorizon * 0.05);
      severityLevel = "MEDIUM";
      break;
  }

  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations:
      criticality === "high"
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
      `Partner default: ${partnerType} (${criticality} criticality). ` +
      (criticality === "high"
        ? `Critical partner failure — immediate impact on operations. Art. 64 compliance at risk ` +
          `if partner provides essential services (ground operations, component supply, insurance). ` +
          `Activate contingency agreements. Source replacement partner immediately. ` +
          `Notify NCA if operational continuity is affected.`
        : criticality === "medium"
          ? `Partner default impacts operations but alternatives available. ` +
            `Begin replacement procurement. Bridge service gaps with interim solutions. ` +
            `Review dependency risk for remaining critical partners.`
          : `Low-criticality partner default. Minimal operational impact. ` +
            `Proceed with standard replacement procurement process.`),
    severityLevel,
    costEstimate: {
      financialUsd:
        criticality === "high"
          ? 2000000
          : criticality === "medium"
            ? 500000
            : 100000,
      description: `Estimated cost of partner replacement and service transition (${criticality} criticality)`,
    },
  });
}
