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

function getFuelFromModules(
  state: SatelliteComplianceStateInternal,
): number | null {
  const fuelFactor = state.modules.fuel.factors.find(
    (f) => f.id === "fuel_passivation_reserve",
  );
  return fuelFactor?.currentValue ?? null;
}

// ─── Scenario Handlers ───────────────────────────────────────────────────────

/**
 * Simulate lowering the orbit by a given altitude delta.
 * Lower orbit reduces orbital lifetime (~2 years per 50 km).
 */
export function runOrbitLower(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const altitudeDeltaKm = (scenario.parameters.altitudeDeltaKm as number) ?? 50;
  const fuelCostPct = (scenario.parameters.fuelCostPct as number) ?? 1.5;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  // Each 50 km lower reduces orbital lifetime by ~2 years
  const lifetimeReductionDays = Math.round((altitudeDeltaKm / 50) * 2 * 365);
  const projectedHorizon = Math.max(0, baselineHorizon - lifetimeReductionDays);

  const currentFuel = getFuelFromModules(baseline);
  const afterFuel = currentFuel !== null ? currentFuel - fuelCostPct : null;

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta: -lifetimeReductionDays,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: baseline.modules.orbital.status,
        statusAfter:
          lifetimeReductionDays > baselineHorizon ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact:
      currentFuel !== null && afterFuel !== null
        ? { before: currentFuel, after: afterFuel, delta: -fuelCostPct }
        : null,
    recommendation:
      `Lowering orbit by ${altitudeDeltaKm} km reduces orbital lifetime by ~${Math.round(lifetimeReductionDays / 365)} years. ` +
      `Fuel cost: ~${fuelCostPct}%. Ensure compliance with EU Space Act Art. 68 orbital operations requirements. ` +
      `Verify that the reduced orbital lifetime still satisfies the 25-year deorbit rule (IADC guidelines).`,
    severityLevel: lifetimeReductionDays > 365 * 3 ? "HIGH" : "MEDIUM",
    costEstimate: {
      fuelKg: fuelCostPct * 0.5,
      description: `Orbit lowering maneuver fuel expenditure (~${fuelCostPct}% of reserves)`,
    },
    confidenceBand: {
      optimistic: -Math.round(lifetimeReductionDays * 0.7),
      pessimistic: -Math.round(lifetimeReductionDays * 1.3),
    },
  });
}

/**
 * Simulate an orbital plane change maneuver.
 * Extremely fuel-expensive; large inclination changes can consume most reserves.
 */
export function runOrbitPlaneChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const inclinationDelta =
    (scenario.parameters.inclinationDelta as number) ?? 5;
  const fuelCostPct =
    (scenario.parameters.fuelCostPct as number) ?? inclinationDelta * 8;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const currentFuel = getFuelFromModules(baseline);
  const afterFuel =
    currentFuel !== null ? Math.max(0, currentFuel - fuelCostPct) : null;

  // Large fuel expenditure shortens compliance horizon proportionally
  const horizonReduction =
    currentFuel !== null && currentFuel > 0
      ? Math.round(baselineHorizon * (fuelCostPct / currentFuel))
      : Math.round(baselineHorizon * 0.3);
  const projectedHorizon = Math.max(0, baselineHorizon - horizonReduction);

  const isCritical = fuelCostPct > 40;
  const isNonCompliant = afterFuel !== null && afterFuel < 15;

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta: -horizonReduction,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: baseline.modules.orbital.status,
        statusAfter: isNonCompliant ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      {
        regulationRef: "eu_space_act_art_70",
        statusBefore: baseline.modules.fuel.status,
        statusAfter: isNonCompliant
          ? "NON_COMPLIANT"
          : baseline.modules.fuel.status,
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact:
      currentFuel !== null && afterFuel !== null
        ? { before: currentFuel, after: afterFuel, delta: -fuelCostPct }
        : null,
    recommendation:
      `Plane change of ${inclinationDelta}deg is extremely fuel-expensive (~${fuelCostPct}% of reserves). ` +
      (isNonCompliant
        ? `This would drop fuel below passivation threshold, triggering NON_COMPLIANT status per Art. 70. Consider alternative mission planning.`
        : `Ensure remaining fuel reserves satisfy passivation requirements per Art. 70 and Art. 68 orbital operations standards.`),
    severityLevel: isCritical ? "CRITICAL" : "HIGH",
    costEstimate: {
      fuelKg: fuelCostPct * 0.8,
      description: `Plane change maneuver: ~${fuelCostPct}% fuel expenditure for ${inclinationDelta}deg inclination change`,
    },
    confidenceBand: {
      optimistic: -Math.round(horizonReduction * 0.8),
      pessimistic: -Math.round(horizonReduction * 1.4),
    },
  });
}

/**
 * Simulate relocation to a new GEO orbital slot.
 * Involves regulatory coordination (ITU) and fuel expenditure.
 */
export function runOrbitalSlotChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const fuelCostPct = (scenario.parameters.fuelCostPct as number) ?? 3;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -90;
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  const currentFuel = getFuelFromModules(baseline);
  const afterFuel = currentFuel !== null ? currentFuel - fuelCostPct : null;

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: baseline.modules.orbital.status,
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      {
        regulationRef: "itu_radio_regulations",
        statusBefore: "COMPLIANT",
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
      `GEO slot relocation reduces compliance horizon by ~90 days due to regulatory re-coordination. ` +
      `ITU frequency coordination filing required. Ensure compliance with Art. 68 orbital operations and ` +
      `ITU Radio Regulations. Allow 6-12 months for ITU coordination process.`,
    severityLevel: "MEDIUM",
    costEstimate: {
      fuelKg: fuelCostPct * 0.5,
      financialUsd: 250000,
      description: "GEO slot relocation: ITU coordination fees + maneuver fuel",
    },
  });
}

/**
 * Simulate a collision avoidance maneuver.
 * Severity depends on miss distance; fuel expenditure is typically small.
 */
export function runCollisionAvoidance(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const missDistanceKm = (scenario.parameters.missDistanceKm as number) ?? 1.0;
  const fuelCostPct = (scenario.parameters.fuelCostPct as number) ?? 0.5;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const currentFuel = getFuelFromModules(baseline);
  const afterFuel = currentFuel !== null ? currentFuel - fuelCostPct : null;

  // Shorter miss distance = more severe
  let severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  let horizonDelta: number;
  if (missDistanceKm < 0.1) {
    severityLevel = "CRITICAL";
    horizonDelta = -30;
  } else if (missDistanceKm < 0.5) {
    severityLevel = "HIGH";
    horizonDelta = -14;
  } else if (missDistanceKm < 1.0) {
    severityLevel = "MEDIUM";
    horizonDelta = -7;
  } else {
    severityLevel = "LOW";
    horizonDelta = -3;
  }

  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: missDistanceKm < 0.1 ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter:
          missDistanceKm < 0.1 ? new Date().toISOString() : null,
      },
    ],
    fuelImpact:
      currentFuel !== null && afterFuel !== null
        ? { before: currentFuel, after: afterFuel, delta: -fuelCostPct }
        : null,
    recommendation:
      `Collision avoidance maneuver with miss distance ${missDistanceKm} km. ` +
      `Fuel cost: ~${fuelCostPct}%. Art. 64 requires collision avoidance capability. ` +
      (missDistanceKm < 0.5
        ? `Close approach detected; recommend enhanced conjunction screening and coordination with 18th Space Defense Squadron.`
        : `Standard avoidance maneuver within nominal parameters.`),
    severityLevel,
    costEstimate: {
      fuelKg: fuelCostPct * 0.3,
      description: `CA maneuver fuel cost (~${fuelCostPct}% reserves)`,
    },
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.5),
      pessimistic: Math.round(horizonDelta * 2),
    },
  });
}

/**
 * Simulate executing a controlled deorbit.
 * End-of-mission scenario — compliance horizon goes to 0 but status is COMPLIANT.
 */
export function runDeorbitExecute(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const currentFuel = getFuelFromModules(baseline);

  return buildResult(scenario, baseline, {
    projectedHorizon: 0,
    horizonDelta: -baselineHorizon,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_70",
        statusBefore: baseline.modules.fuel.status,
        statusAfter: "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: baseline.modules.orbital.status,
        statusAfter: "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      {
        regulationRef: "iadc_25_year_rule",
        statusBefore: baseline.modules.orbital.status,
        statusAfter: "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact:
      currentFuel !== null
        ? { before: currentFuel, after: 0, delta: -currentFuel }
        : null,
    recommendation:
      `Controlled deorbit execution satisfies Art. 70 passivation requirements, Art. 68 end-of-life obligations, ` +
      `and IADC 25-year deorbit guidelines. File mission termination notification with NCA. ` +
      `Ensure passivation sequence completes before atmospheric reentry.`,
    severityLevel: "LOW",
  });
}

/**
 * Simulate resizing a constellation (adding or removing satellites).
 * Growing increases compliance burden; large additions trigger Art. 10 re-authorization.
 */
export function runConstellationResize(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const fleetDelta = (scenario.parameters.fleetDelta as number) ?? 0;
  const isGrowing = fleetDelta > 0;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  // Growing = more coordination burden; shrinking = less
  const horizonDelta = isGrowing
    ? -Math.round(fleetDelta * 15)
    : Math.round(Math.abs(fleetDelta) * 5);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  const affectedRegulations: WhatIfResult["affectedRegulations"] = [
    {
      regulationRef: "eu_space_act_art_64",
      statusBefore: baseline.modules.subsystems.status,
      statusAfter: isGrowing ? "WARNING" : baseline.modules.subsystems.status,
      crossingDateBefore: null,
      crossingDateAfter: null,
    },
  ];

  // Adding more than 3 satellites triggers re-authorization
  if (fleetDelta > 3) {
    affectedRegulations.push({
      regulationRef: "eu_space_act_art_10",
      statusBefore: "COMPLIANT",
      statusAfter: "WARNING",
      crossingDateBefore: null,
      crossingDateAfter: null,
    });
  }

  const severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" =
    fleetDelta > 10 ? "HIGH" : fleetDelta > 3 ? "MEDIUM" : "LOW";

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations,
    recommendation: isGrowing
      ? `Adding ${fleetDelta} satellite(s) increases collision avoidance coordination burden per Art. 64. ` +
        (fleetDelta > 3
          ? `Fleet expansion >3 satellites may require re-authorization per Art. 10. `
          : "") +
        `Update constellation management plan and ITU filings accordingly.`
      : `Removing ${Math.abs(fleetDelta)} satellite(s) reduces coordination burden. ` +
        `Ensure decommissioned satellites comply with Art. 70 passivation requirements.`,
    severityLevel,
    costEstimate: isGrowing
      ? {
          financialUsd: fleetDelta * 500000,
          description: `Estimated regulatory and coordination cost for ${fleetDelta} additional satellite(s)`,
        }
      : undefined,
  });
}

/**
 * Simulate increased atmospheric drag affecting orbital lifetime.
 * Higher drag factor accelerates orbital decay.
 */
export function runAtmosphericDragIncrease(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const dragFactor = (scenario.parameters.dragFactor as number) ?? 1.5;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  // Increased drag reduces orbital lifetime proportionally
  const lifetimeReductionFraction = 1 - 1 / dragFactor;
  const horizonDelta = -Math.round(baselineHorizon * lifetimeReductionFraction);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  const severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" =
    dragFactor > 3
      ? "CRITICAL"
      : dragFactor > 2
        ? "HIGH"
        : dragFactor > 1.5
          ? "MEDIUM"
          : "LOW";

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: baseline.modules.orbital.status,
        statusAfter: dragFactor > 2 ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      `Atmospheric drag increase (factor ${dragFactor}x) accelerates orbital decay, reducing compliance horizon ` +
      `by ~${Math.abs(horizonDelta)} days. Review Art. 68 orbital operations requirements. ` +
      (dragFactor > 2
        ? `Consider orbit-raising maneuver to compensate for accelerated decay. Update reentry predictions.`
        : `Monitor TLE updates for decay rate changes. Solar activity forecast should inform planning.`),
    severityLevel,
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.6),
      pessimistic: Math.round(horizonDelta * 1.5),
    },
  });
}
