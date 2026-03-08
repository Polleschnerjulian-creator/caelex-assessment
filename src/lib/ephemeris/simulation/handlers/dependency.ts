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
// DEPENDENCY FAILURE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simulates the impact of a dependency failure on this entity.
 *
 * Parameters:
 *   - dependencyType: Type of dependency that fails (e.g., TTC_PROVIDER, LAUNCH_PROVIDER)
 *   - strength: Strength of the dependency (CRITICAL, HIGH, MEDIUM, LOW)
 *   - scoreDelta: How much the upstream entity's score dropped
 *
 * This handler models the local effect on the current entity's compliance.
 * The cross-type impact propagation engine (impact-propagation.ts) handles
 * the network-wide ripple, but this handler simulates what happens to a
 * single entity when one of its dependencies fails.
 */
export function runDependencyFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const dependencyType =
    (scenario.parameters.dependencyType as string) ?? "TTC_PROVIDER";
  const strength = (scenario.parameters.strength as string) ?? "HIGH";
  const scoreDelta = (scenario.parameters.scoreDelta as number) ?? -20;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  // Strength multipliers (matching impact-propagation.ts)
  const strengthMultipliers: Record<string, number> = {
    CRITICAL: 0.8,
    HIGH: 0.5,
    MEDIUM: 0.3,
    LOW: 0.1,
  };
  const multiplier = strengthMultipliers[strength] ?? 0.3;
  const propagatedDelta = Math.round(scoreDelta * multiplier);

  // Map dependency type to affected modules
  const moduleMapping: Record<string, string[]> = {
    TTC_PROVIDER: ["ground", "cyber"],
    LAUNCH_PROVIDER: ["orbital", "registration"],
    LAUNCH_SITE: ["orbital", "registration"],
    CAPACITY_SOURCE: ["service_continuity", "sla_compliance"],
    DATA_SOURCE: ["data_quality", "data_security"],
    SERVICING_TARGET: ["target_compliance", "proximity_ops"],
    DATA_PROVIDER: ["data_quality"],
    GROUND_NETWORK: ["ground", "ground_infrastructure"],
    INSURANCE_SHARED: ["insurance"],
  };

  const affectedModules = moduleMapping[dependencyType] ?? ["ground"];

  // Calculate horizon impact
  const horizonImpact = Math.round(propagatedDelta * 2);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonImpact);

  // Determine severity
  const severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" =
    strength === "CRITICAL"
      ? "CRITICAL"
      : strength === "HIGH"
        ? "HIGH"
        : strength === "MEDIUM"
          ? "MEDIUM"
          : "LOW";

  // Build affected regulations based on modules
  const regulationMap: Record<string, string> = {
    ground: "eu_space_act_art_42",
    ground_infrastructure: "eu_space_act_art_42",
    cyber: "nis2_art_21",
    orbital: "eu_space_act_art_5",
    registration: "eu_space_act_art_7",
    service_continuity: "eu_space_act_art_64",
    sla_compliance: "eu_space_act_art_64",
    data_quality: "eu_space_act_art_66",
    data_security: "nis2_art_21",
    target_compliance: "eu_space_act_art_68",
    proximity_ops: "eu_space_act_art_68",
    insurance: "eu_space_act_art_8",
  };

  const affectedRegulations = affectedModules
    .map((mod) => regulationMap[mod])
    .filter(Boolean)
    .map((ref) => ({
      regulationRef: ref!,
      statusBefore: "COMPLIANT" as const,
      statusAfter:
        severity === "CRITICAL"
          ? ("NON_COMPLIANT" as const)
          : ("WARNING" as const),
      crossingDateBefore: null,
      crossingDateAfter: null,
    }));

  const depLabel = dependencyType.replace(/_/g, " ").toLowerCase();

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta: horizonImpact,
    severityLevel: severity,
    affectedRegulations,
    moduleImpacts: affectedModules.map((mod) => ({
      moduleKey: mod,
      statusBefore: "COMPLIANT",
      statusAfter: severity === "CRITICAL" ? "NON_COMPLIANT" : "WARNING",
      scoreDelta: propagatedDelta,
    })),
    recommendation:
      `Upstream ${depLabel} dependency failure (${strength} strength, ${Math.abs(scoreDelta)} point drop). ` +
      `Propagated impact: ${Math.abs(propagatedDelta)} points across ${affectedModules.join(", ")}. ` +
      (severity === "CRITICAL"
        ? "Activate contingency plan. Identify alternative providers immediately."
        : severity === "HIGH"
          ? "Monitor closely. Begin sourcing backup providers."
          : "Track upstream recovery. No immediate action required."),
    costEstimate: {
      financialUsd:
        severity === "CRITICAL"
          ? 200_000
          : severity === "HIGH"
            ? 75_000
            : 25_000,
      description: `Estimated cost of ${depLabel} dependency failure (${strength})`,
    },
  });
}
