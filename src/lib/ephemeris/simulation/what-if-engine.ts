import "server-only";
import type { PrismaClient } from "@prisma/client";
import type {
  WhatIfScenario,
  WhatIfResult,
  SatelliteComplianceStateInternal,
} from "../core/types";
import { simulateJurisdictionChange } from "./jurisdiction-simulator";
import { SCENARIO_HANDLERS } from "./handlers";

/**
 * What-If Engine
 *
 * Runs hypothetical scenarios against a satellite's compliance state.
 *
 * Scenario types:
 * - Physical: orbit raise, thruster failure, fuel burn
 * - Regulatory: jurisdiction change, regulatory change
 * - Operational: constellation change, EOL extension
 */

/**
 * Run a what-if scenario and return the impact.
 */
export async function runWhatIfScenario(
  prisma: PrismaClient,
  orgId: string,
  noradId: string,
  satelliteName: string,
  launchDate: Date | null,
  scenario: WhatIfScenario,
  baselineState: SatelliteComplianceStateInternal,
): Promise<WhatIfResult> {
  switch (scenario.type) {
    case "JURISDICTION_CHANGE":
      return runJurisdictionChange(baselineState, scenario);
    case "ORBIT_RAISE":
      return runOrbitRaise(baselineState, scenario);
    case "FUEL_BURN":
      return runFuelBurn(baselineState, scenario);
    case "THRUSTER_FAILURE":
      return runThrusterFailure(baselineState, scenario);
    case "EOL_EXTENSION":
      return runEolExtension(baselineState, scenario);
    default: {
      // Route through modular handler registry for all 49+ new scenario types
      const handler = SCENARIO_HANDLERS[scenario.type];
      if (handler) {
        return handler(baselineState, scenario);
      }
      return buildNoImpactResult(scenario, baselineState);
    }
  }
}

// ─── Scenario Handlers ───────────────────────────────────────────────────────

function runJurisdictionChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const toJurisdiction = scenario.parameters.toJurisdiction as string;
  const fromJurisdiction =
    (scenario.parameters.fromJurisdiction as string) ?? "DE";

  const sim = simulateJurisdictionChange(
    fromJurisdiction,
    toJurisdiction,
    { noradId: baseline.noradId, name: baseline.satelliteName },
    baseline.overallScore,
  );

  const projectedHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  // Jurisdiction change primarily affects non-physical requirements
  const horizonDelta = sim.complianceDelta.scoreDelta > 0 ? 30 : -30;

  return {
    scenario,
    baselineHorizon: baseline.complianceHorizon.daysUntilFirstBreach ?? 9999,
    projectedHorizon: Math.max(0, projectedHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: sim.requirementsAdded.map((r) => ({
      regulationRef: r.regulationRef,
      statusBefore: "N/A",
      statusAfter: "NEW_REQUIREMENT",
      crossingDateBefore: null,
      crossingDateAfter: null,
    })),
    fuelImpact: null,
    recommendation:
      sim.complianceDelta.scoreDelta >= 0
        ? `Re-flagging to ${toJurisdiction} would improve compliance by ${Math.abs(sim.complianceDelta.scoreDelta)} points. Approval duration: ${sim.estimatedTimeline.approvalDuration}.`
        : `Re-flagging to ${toJurisdiction} would reduce compliance by ${Math.abs(sim.complianceDelta.scoreDelta)} points due to additional requirements.`,
  };
}

function runOrbitRaise(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const altitudeDeltaKm = (scenario.parameters.altitudeDeltaKm as number) ?? 50;
  const fuelCostPct = (scenario.parameters.fuelCostPct as number) ?? 2;

  // Orbit raise extends lifetime but costs fuel
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  // Rough estimate: each 50km raise extends orbital life by ~5 years for LEO
  const lifetimeExtensionDays = Math.round((altitudeDeltaKm / 50) * 5 * 365);
  const projectedHorizon = baselineHorizon + lifetimeExtensionDays;

  // Fuel impact
  const currentFuel = getFuelFromModules(baseline);
  const afterFuel = currentFuel !== null ? currentFuel - fuelCostPct : null;

  return {
    scenario,
    baselineHorizon,
    projectedHorizon,
    horizonDelta: lifetimeExtensionDays,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: baseline.modules.orbital.status,
        statusAfter: "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact:
      currentFuel !== null && afterFuel !== null
        ? { before: currentFuel, after: afterFuel, delta: -fuelCostPct }
        : null,
    recommendation:
      `Orbit raise of ${altitudeDeltaKm} km would extend compliance horizon by ~${Math.round(lifetimeExtensionDays / 365)} years` +
      (fuelCostPct > 0 ? `, costing ~${fuelCostPct}% fuel.` : "."),
  };
}

function runFuelBurn(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const burnPct = (scenario.parameters.burnPct as number) ?? 5;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const currentFuel = getFuelFromModules(baseline);
  const afterFuel = currentFuel !== null ? currentFuel - burnPct : null;

  // Fuel burn shortens horizon by proportional amount
  const horizonReduction =
    currentFuel !== null && currentFuel > 0
      ? Math.round(baselineHorizon * (burnPct / currentFuel))
      : 0;

  return {
    scenario,
    baselineHorizon,
    projectedHorizon: Math.max(0, baselineHorizon - horizonReduction),
    horizonDelta: -horizonReduction,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_70",
        statusBefore: baseline.modules.fuel.status,
        statusAfter:
          afterFuel !== null && afterFuel < 15 ? "NON_COMPLIANT" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact:
      currentFuel !== null && afterFuel !== null
        ? { before: currentFuel, after: afterFuel, delta: -burnPct }
        : null,
    recommendation: `Burning ${burnPct}% fuel would reduce compliance horizon by ~${horizonReduction} days.`,
  };
}

function runThrusterFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return {
    scenario,
    baselineHorizon,
    projectedHorizon: 0,
    horizonDelta: -baselineHorizon,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: new Date().toISOString(),
      },
      {
        regulationRef: "eu_space_act_art_70",
        statusBefore: baseline.modules.fuel.status,
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: new Date().toISOString(),
      },
    ],
    fuelImpact: null,
    recommendation:
      "Complete thruster failure would immediately trigger NON_COMPLIANT status for collision avoidance and passivation. Safety gate caps overall score at 49. Consider contingency planning and ADR options.",
  };
}

function runEolExtension(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const extensionYears = (scenario.parameters.extensionYears as number) ?? 2;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  // EOL extension means more fuel consumption, more subsystem wear
  const additionalDays = extensionYears * 365;
  // But also extends the window for regulatory compliance
  const horizonDelta = Math.round(additionalDays * -0.3); // Net negative due to wear

  return {
    scenario,
    baselineHorizon,
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: baseline.modules.orbital.status,
        statusAfter:
          extensionYears > 5 ? "WARNING" : baseline.modules.orbital.status,
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact: null,
    recommendation:
      `Extending mission by ${extensionYears} years would increase subsystem degradation risk and reduce fuel margins. ` +
      `Ensure sufficient fuel reserves for passivation at extended EOL date.`,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFuelFromModules(
  state: SatelliteComplianceStateInternal,
): number | null {
  const fuelFactor = state.modules.fuel.factors.find(
    (f) => f.id === "fuel_passivation_reserve",
  );
  return fuelFactor?.currentValue ?? null;
}

function buildNoImpactResult(
  scenario: WhatIfScenario,
  baseline: SatelliteComplianceStateInternal,
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
    recommendation: "This scenario type is not yet supported.",
  };
}
