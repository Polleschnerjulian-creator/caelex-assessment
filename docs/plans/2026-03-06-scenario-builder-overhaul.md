# Scenario Builder Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the scenario builder from 6 to 55 blocks across 7 categories, add rich results visualization (timeline chart, risk heatmap, confidence bands), and integrate the Ephemeris dark/light theme system.

**Architecture:** Three-layer approach — (1) expand `WhatIfScenarioType` union + add 49 new handler functions organized by category, (2) redesign the block palette with collapsible categories + search, rebuild results panel with SVG charts, (3) convert all UI to use `useEphemerisTheme()`. Backend handlers are pure functions operating on `SatelliteComplianceStateInternal`.

**Tech Stack:** Next.js 15, TypeScript, @dnd-kit (drag-drop), Lucide React icons, SVG for charts, Ephemeris theme system

---

## Task 1: Expand WhatIfScenarioType + WhatIfResult types

**Files:**

- Modify: `src/lib/ephemeris/core/types.ts:432-470`

**Step 1: Update the WhatIfScenarioType union**

Add all 55 scenario types to the union. Replace existing definition at ~line 432:

```typescript
export type WhatIfScenarioType =
  // Orbital Mechanics
  | "ORBIT_RAISE"
  | "ORBIT_LOWER"
  | "ORBIT_PLANE_CHANGE"
  | "ORBITAL_SLOT_CHANGE"
  | "COLLISION_AVOIDANCE"
  | "DEORBIT_EXECUTE"
  | "CONSTELLATION_RESIZE"
  | "ATMOSPHERIC_DRAG_INCREASE"
  // Hardware Failures
  | "THRUSTER_FAILURE"
  | "REACTION_WHEEL_FAILURE"
  | "SOLAR_PANEL_DEGRADATION"
  | "BATTERY_DEGRADATION"
  | "ANTENNA_DEGRADATION"
  | "ATTITUDE_CONTROL_ANOMALY"
  | "THERMAL_CONTROL_FAILURE"
  | "SENSOR_DEGRADATION"
  | "PAYLOAD_FAILURE"
  | "PASSIVATION_FAILURE"
  | "PROPELLANT_LEAK"
  | "POWER_BUS_ANOMALY"
  // Space Environment
  | "SOLAR_STORM"
  | "CORONAL_MASS_EJECTION"
  | "SOLAR_PARTICLE_EVENT"
  | "DEBRIS_CLOUD_EVENT"
  | "MICROMETEOROID_IMPACT"
  | "ELECTROSTATIC_DISCHARGE"
  // Communication & Data
  | "COMM_FAILURE"
  | "GROUND_STATION_LOSS"
  | "FREQUENCY_INTERFERENCE"
  | "CYBER_INCIDENT"
  | "DATA_BREACH"
  // Regulatory & Legal
  | "JURISDICTION_CHANGE"
  | "OPERATOR_TYPE_CHANGE"
  | "REGULATORY_CHANGE"
  | "INSURANCE_LAPSE"
  | "NCA_AUDIT_TRIGGER"
  | "LICENSING_CONDITION_CHANGE"
  | "DEBRIS_REMEDIATION_ORDER"
  | "MANDATORY_MANEUVER_ORDER"
  | "SPECTRUM_REALLOCATION"
  | "TREATY_CHANGE"
  | "LIABILITY_CLAIM"
  | "NIS2_NOTIFICATION_TRIGGER"
  // Operational
  | "EOL_EXTENSION"
  | "LAUNCH_DELAY"
  | "MISSION_SCOPE_CHANGE"
  | "SOFTWARE_ANOMALY"
  | "SERVICE_INTERRUPTION"
  | "OPERATIONS_TEAM_CHANGE"
  | "FREQUENCY_BAND_MIGRATION"
  // Financial & Business
  | "INSURANCE_PREMIUM_INCREASE"
  | "SUPPLY_CHAIN_DISRUPTION"
  | "SANCTIONS_EXPORT_CONTROL"
  | "BUDGET_CUT"
  | "PARTNER_DEFAULT"
  // Legacy (kept for backwards compatibility)
  | "FUEL_BURN"
  | "CONSTELLATION_CHANGE";
```

Also add to `WhatIfResult`:

```typescript
export interface WhatIfResult {
  scenario: WhatIfScenario;
  baselineHorizon: number;
  projectedHorizon: number;
  horizonDelta: number;
  affectedRegulations: Array<{
    regulationRef: string;
    statusBefore: string;
    statusAfter: string;
    crossingDateBefore: string | null;
    crossingDateAfter: string | null;
  }>;
  fuelImpact: { before: number; after: number; delta: number } | null;
  recommendation: string;
  // New fields for enhanced results
  severityLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  moduleImpacts?: Array<{
    moduleKey: string;
    statusBefore: string;
    statusAfter: string;
    scoreDelta: number;
  }>;
  costEstimate?: {
    fuelKg?: number;
    financialUsd?: number;
    description?: string;
  };
  confidenceBand?: {
    optimistic: number; // horizon delta +20%
    pessimistic: number; // horizon delta -20%
  };
  timelineProjection?: Array<{
    monthOffset: number; // 0-11
    baselineScore: number;
    projectedScore: number;
  }>;
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit src/lib/ephemeris/core/types.ts 2>&1 | head -20`
Expected: May show downstream errors (handlers not yet written) — that's fine for now.

**Step 3: Commit**

```bash
git add src/lib/ephemeris/core/types.ts
git commit -m "feat(ephemeris): expand WhatIfScenarioType to 55 types + enhanced WhatIfResult"
```

---

## Task 2: Create backend handler files (7 category files)

**Files:**

- Create: `src/lib/ephemeris/simulation/handlers/orbital.ts`
- Create: `src/lib/ephemeris/simulation/handlers/hardware.ts`
- Create: `src/lib/ephemeris/simulation/handlers/environment.ts`
- Create: `src/lib/ephemeris/simulation/handlers/communication.ts`
- Create: `src/lib/ephemeris/simulation/handlers/regulatory.ts`
- Create: `src/lib/ephemeris/simulation/handlers/operational.ts`
- Create: `src/lib/ephemeris/simulation/handlers/financial.ts`
- Create: `src/lib/ephemeris/simulation/handlers/index.ts`

Each handler file exports functions that take `(baseline: SatelliteComplianceStateInternal, scenario: WhatIfScenario)` and return `WhatIfResult`.

### Step 1: Create `handlers/orbital.ts`

```typescript
import "server-only";
import type {
  WhatIfScenario,
  WhatIfResult,
  SatelliteComplianceStateInternal,
} from "../../core/types";

function getFuelFromModules(
  state: SatelliteComplianceStateInternal,
): number | null {
  const fuelFactor = state.modules.fuel.factors.find(
    (f) => f.id === "fuel_passivation_reserve",
  );
  return fuelFactor?.currentValue ?? null;
}

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

export function runOrbitLower(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const altitudeDeltaKm = (scenario.parameters.altitudeDeltaKm as number) ?? 50;
  const fuelCostPct = (scenario.parameters.fuelCostPct as number) ?? 1;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  // Lower orbit = faster decay, shorter life
  const lifetimeReductionDays = Math.round((altitudeDeltaKm / 50) * 2 * 365);
  const currentFuel = getFuelFromModules(baseline);
  const afterFuel = currentFuel !== null ? currentFuel - fuelCostPct : null;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon - lifetimeReductionDays),
    horizonDelta: -lifetimeReductionDays,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: baseline.modules.orbital.status,
        statusAfter:
          altitudeDeltaKm > 50 ? "WARNING" : baseline.modules.orbital.status,
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact:
      currentFuel !== null && afterFuel !== null
        ? { before: currentFuel, after: afterFuel, delta: -fuelCostPct }
        : null,
    recommendation: `Lowering orbit by ${altitudeDeltaKm} km reduces orbital lifetime by ~${Math.round(lifetimeReductionDays / 365)} years. Useful for deorbit prep or drag-augmented disposal.`,
    severityLevel: lifetimeReductionDays > 365 * 3 ? "HIGH" : "MEDIUM",
    confidenceBand: {
      optimistic: Math.round(-lifetimeReductionDays * 0.8),
      pessimistic: Math.round(-lifetimeReductionDays * 1.2),
    },
  });
}

export function runOrbitPlaneChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const inclinationDelta =
    (scenario.parameters.inclinationDelta as number) ?? 5;
  const fuelCostPct = (scenario.parameters.fuelCostPct as number) ?? 3;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const currentFuel = getFuelFromModules(baseline);
  const afterFuel = currentFuel !== null ? currentFuel - fuelCostPct : null;
  // Plane changes are very fuel-expensive
  const horizonDelta =
    currentFuel !== null && currentFuel > 0
      ? Math.round(-baselineHorizon * (fuelCostPct / currentFuel))
      : 0;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: baseline.modules.orbital.status,
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact:
      currentFuel !== null && afterFuel !== null
        ? { before: currentFuel, after: afterFuel, delta: -fuelCostPct }
        : null,
    recommendation: `Plane change of ${inclinationDelta}° is extremely fuel-intensive (${fuelCostPct}% reserves). Consider operational alternatives before committing.`,
    severityLevel: fuelCostPct > 5 ? "HIGH" : "MEDIUM",
  });
}

export function runOrbitalSlotChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const fuelCostPct = (scenario.parameters.fuelCostPct as number) ?? 2;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const currentFuel = getFuelFromModules(baseline);
  const afterFuel = currentFuel !== null ? currentFuel - fuelCostPct : null;

  return buildResult(scenario, baseline, {
    horizonDelta: -90,
    projectedHorizon: Math.max(0, baselineHorizon - 90),
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
    recommendation: `GEO slot relocation requires ITU coordination and national authority notification. Allow 6-12 months for regulatory clearance.`,
    severityLevel: "MEDIUM",
  });
}

export function runCollisionAvoidance(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const missDistance = (scenario.parameters.missDistanceKm as number) ?? 10;
  const fuelCostPct = (scenario.parameters.fuelCostPct as number) ?? 0.5;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const currentFuel = getFuelFromModules(baseline);
  const afterFuel = currentFuel !== null ? currentFuel - fuelCostPct : null;

  const horizonDelta =
    currentFuel !== null && currentFuel > 0
      ? Math.round(-baselineHorizon * (fuelCostPct / currentFuel))
      : -7;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact:
      currentFuel !== null && afterFuel !== null
        ? { before: currentFuel, after: afterFuel, delta: -fuelCostPct }
        : null,
    recommendation: `COLA maneuver for ${missDistance} km miss distance uses ${fuelCostPct}% fuel. ${missDistance < 5 ? "Critical proximity — maneuver strongly recommended." : "Moderate risk — evaluate probability of collision before committing."}`,
    severityLevel:
      missDistance < 5 ? "CRITICAL" : missDistance < 15 ? "HIGH" : "MEDIUM",
  });
}

export function runDeorbitExecute(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const targetAltKm = (scenario.parameters.targetAltKm as number) ?? 300;
  const fuelCostPct = (scenario.parameters.fuelCostPct as number) ?? 15;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const currentFuel = getFuelFromModules(baseline);
  const afterFuel = currentFuel !== null ? currentFuel - fuelCostPct : null;

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
        regulationRef: "iadc_25yr_rule",
        statusBefore: "WARNING",
        statusAfter: "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact:
      currentFuel !== null && afterFuel !== null
        ? { before: currentFuel, after: afterFuel, delta: -fuelCostPct }
        : null,
    recommendation: `Deorbit to ${targetAltKm} km satisfies IADC 25-year rule and EU Space Act Art. 70 passivation requirements. Ensure sufficient fuel margin for controlled reentry corridor.`,
    severityLevel: "HIGH",
    costEstimate: {
      fuelKg: Math.round(fuelCostPct * 2.5),
      description: `Deorbit burn to ${targetAltKm} km perigee`,
    },
  });
}

export function runConstellationResize(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const fleetDelta = (scenario.parameters.fleetDelta as number) ?? 0;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isGrowing = fleetDelta > 0;

  const horizonDelta = isGrowing ? -60 : 30;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isGrowing ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      ...(Math.abs(fleetDelta) > 3
        ? [
            {
              regulationRef: "eu_space_act_art_10",
              statusBefore: "COMPLIANT" as const,
              statusAfter: "WARNING" as const,
              crossingDateBefore: null,
              crossingDateAfter: null,
            },
          ]
        : []),
    ],
    fuelImpact: null,
    recommendation: isGrowing
      ? `Adding ${fleetDelta} satellites increases collision risk management burden and may trigger updated authorization requirements under Art. 10.`
      : `Reducing constellation by ${Math.abs(fleetDelta)} satellites simplifies compliance but may affect coverage obligations.`,
    severityLevel: Math.abs(fleetDelta) > 5 ? "HIGH" : "MEDIUM",
  });
}

export function runAtmosphericDragIncrease(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const factor = (scenario.parameters.dragFactor as number) ?? 2;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  // Higher drag = faster decay = shorter orbital lifetime
  const lifetimeReductionDays = Math.round(baselineHorizon * (1 - 1 / factor));

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon - lifetimeReductionDays),
    horizonDelta: -lifetimeReductionDays,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: baseline.modules.orbital.status,
        statusAfter:
          lifetimeReductionDays > 365
            ? "WARNING"
            : baseline.modules.orbital.status,
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact: null,
    recommendation: `${factor}x drag increase (solar maximum) reduces orbital lifetime by ~${Math.round(lifetimeReductionDays / 30)} months. Consider station-keeping fuel allocation adjustments.`,
    severityLevel: factor >= 4 ? "HIGH" : factor >= 2.5 ? "MEDIUM" : "LOW",
    confidenceBand: {
      optimistic: Math.round(-lifetimeReductionDays * 0.7),
      pessimistic: Math.round(-lifetimeReductionDays * 1.4),
    },
  });
}
```

### Step 2: Create `handlers/hardware.ts`

```typescript
import "server-only";
import type {
  WhatIfScenario,
  WhatIfResult,
  SatelliteComplianceStateInternal,
} from "../../core/types";

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

export function runReactionWheelFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const wheelsLost = (scenario.parameters.wheelsLost as number) ?? 1;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isCritical = wheelsLost >= 3;
  const horizonDelta = isCritical
    ? -baselineHorizon
    : Math.round(-baselineHorizon * wheelsLost * 0.15);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isCritical ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: isCritical ? new Date().toISOString() : null,
      },
    ],
    recommendation: isCritical
      ? `Loss of ${wheelsLost}/4 reaction wheels is critical — satellite cannot maintain attitude control. Immediate safe mode and contingency deorbit planning required.`
      : `Loss of ${wheelsLost}/4 reaction wheels degrades pointing accuracy. Redundancy mode active but mission capability reduced.`,
    severityLevel: isCritical
      ? "CRITICAL"
      : wheelsLost >= 2
        ? "HIGH"
        : "MEDIUM",
  });
}

export function runSolarPanelDegradation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const capacityLossPct = (scenario.parameters.capacityLossPct as number) ?? 15;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = Math.round(
    -baselineHorizon * (capacityLossPct / 100) * 0.8,
  );

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: capacityLossPct > 30 ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `${capacityLossPct}% solar panel degradation reduces power budget. ${capacityLossPct > 30 ? "Payload operations may need to be curtailed." : "Monitor degradation trend and plan for reduced operations window."}`,
    severityLevel:
      capacityLossPct > 40
        ? "CRITICAL"
        : capacityLossPct > 25
          ? "HIGH"
          : "MEDIUM",
  });
}

export function runBatteryDegradation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const capacityLossPct = (scenario.parameters.capacityLossPct as number) ?? 15;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = Math.round(
    -baselineHorizon * (capacityLossPct / 100) * 0.7,
  );

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: capacityLossPct > 35 ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `${capacityLossPct}% battery capacity loss reduces eclipse survival margin. ${capacityLossPct > 35 ? "Critical — may lose satellite during eclipse season." : "Plan for reduced operational duty cycle."}`,
    severityLevel:
      capacityLossPct > 35
        ? "CRITICAL"
        : capacityLossPct > 20
          ? "HIGH"
          : "MEDIUM",
  });
}

export function runAntennaDegradation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const linkMarginLoss = (scenario.parameters.linkMarginLoss as number) ?? 6;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = Math.round(
    -baselineHorizon * (linkMarginLoss / 20) * 0.5,
  );

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: linkMarginLoss > 12 ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `${linkMarginLoss} dB link margin loss. ${linkMarginLoss > 12 ? "Command & control link at risk — contingency planning required." : "Reduced telemetry rate may be needed. Consider ground station amplifier upgrade."}`,
    severityLevel:
      linkMarginLoss > 15
        ? "CRITICAL"
        : linkMarginLoss > 10
          ? "HIGH"
          : "MEDIUM",
  });
}

export function runAttitudeControlAnomaly(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const severity = (scenario.parameters.severity as string) ?? "drift";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isTumble = severity === "tumble";
  const horizonDelta = isTumble
    ? -baselineHorizon
    : severity === "drift"
      ? Math.round(-baselineHorizon * 0.3)
      : Math.round(-baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isTumble ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: isTumble ? new Date().toISOString() : null,
      },
    ],
    recommendation: isTumble
      ? "Satellite tumbling — all operations suspended. Attempt recovery via magnetic torquer or thruster-based detumble. If unrecoverable, initiate contingency deorbit."
      : `Attitude ${severity} detected. Pointing accuracy degraded. ${severity === "drift" ? "AOCS recalibration needed." : "Bias compensation applied, monitoring."}`,
    severityLevel: isTumble
      ? "CRITICAL"
      : severity === "drift"
        ? "HIGH"
        : "MEDIUM",
  });
}

export function runThermalControlFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(
      0,
      baselineHorizon - Math.round(baselineHorizon * 0.4),
    ),
    horizonDelta: Math.round(-baselineHorizon * 0.4),
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      "Thermal control failure leads to component temperature exceedances. Reduced duty cycle and payload shutdown may extend survival. Critical subsystem — monitor closely.",
    severityLevel: "CRITICAL",
  });
}

export function runSensorDegradation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const sensorType =
    (scenario.parameters.sensorType as string) ?? "star_tracker";
  const severity = (scenario.parameters.severity as string) ?? "degraded";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isTotal = severity === "failed";
  const horizonDelta = isTotal
    ? Math.round(-baselineHorizon * 0.5)
    : Math.round(-baselineHorizon * 0.15);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isTotal ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `${sensorType.replace("_", " ")} ${severity}. ${isTotal ? "Switch to redundant sensor or alternative determination mode." : "Accuracy degraded — increase ground-based orbit determination cadence."}`,
    severityLevel: isTotal ? "HIGH" : "MEDIUM",
  });
}

export function runPayloadFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  return buildResult(scenario, baseline, {
    projectedHorizon: baselineHorizon, // Payload failure doesn't change compliance directly
    horizonDelta: 0,
    affectedRegulations: [],
    recommendation:
      "Primary payload failure. Mission objectives cannot be met. Evaluate: (1) switch to backup payload mode, (2) repurpose for technology demonstration, (3) accelerate deorbit timeline.",
    severityLevel: "HIGH",
    costEstimate: { description: "Revenue loss from payload inoperability" },
  });
}

export function runPassivationFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  return buildResult(scenario, baseline, {
    projectedHorizon: 0,
    horizonDelta: -baselineHorizon,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_70",
        statusBefore: baseline.modules.fuel.status,
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: new Date().toISOString(),
      },
      {
        regulationRef: "iadc_passivation_guideline",
        statusBefore: "COMPLIANT",
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: new Date().toISOString(),
      },
    ],
    recommendation:
      "Passivation system failure — satellite cannot deplete energy sources at EOL. This is a critical debris mitigation non-compliance. NCA notification required. Consider active debris removal (ADR) services.",
    severityLevel: "CRITICAL",
  });
}

export function runPropellantLeak(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const ratePctPerMonth = (scenario.parameters.ratePctPerMonth as number) ?? 2;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const currentFuel =
    baseline.modules.fuel.factors.find(
      (f) => f.id === "fuel_passivation_reserve",
    )?.currentValue ?? null;
  const monthsToEmpty =
    currentFuel !== null && ratePctPerMonth > 0
      ? currentFuel / ratePctPerMonth
      : 999;
  const horizonDelta = Math.round(
    -Math.min(baselineHorizon, monthsToEmpty * 30),
  );

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_70",
        statusBefore: baseline.modules.fuel.status,
        statusAfter: monthsToEmpty < 6 ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact:
      currentFuel !== null
        ? {
            before: currentFuel,
            after: Math.max(0, currentFuel - ratePctPerMonth * 6),
            delta: -(ratePctPerMonth * 6),
          }
        : null,
    recommendation: `Propellant leak at ${ratePctPerMonth}%/month — fuel depleted in ~${Math.round(monthsToEmpty)} months. ${monthsToEmpty < 12 ? "Accelerate EOL operations." : "Monitor and plan for early decommissioning."}`,
    severityLevel:
      monthsToEmpty < 6 ? "CRITICAL" : monthsToEmpty < 18 ? "HIGH" : "MEDIUM",
  });
}

export function runPowerBusAnomaly(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const severity = (scenario.parameters.severity as string) ?? "brownout";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isShutdown = severity === "shutdown";
  const horizonDelta = isShutdown
    ? -baselineHorizon
    : Math.round(-baselineHorizon * 0.25);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isShutdown ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: isShutdown ? new Date().toISOString() : null,
      },
    ],
    recommendation: isShutdown
      ? "Power bus shutdown — satellite in safe mode. All operations suspended pending bus recovery. If unrecoverable, satellite is effectively lost."
      : "Power bus brownout — reduced voltage to subsystems. Non-essential payloads shut down to preserve critical functions.",
    severityLevel: isShutdown ? "CRITICAL" : "HIGH",
  });
}
```

### Step 3: Create `handlers/environment.ts`

```typescript
import "server-only";
import type {
  WhatIfScenario,
  WhatIfResult,
  SatelliteComplianceStateInternal,
} from "../../core/types";

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

export function runSolarStorm(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const intensity = (scenario.parameters.intensity as string) ?? "G3";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const gLevel = parseInt(intensity.replace("G", "")) || 3;
  const horizonDelta = Math.round(-baselineHorizon * gLevel * 0.08);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: gLevel >= 4 ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `G${gLevel} geomagnetic storm. ${gLevel >= 4 ? "Severe radiation damage expected — safe mode recommended. Electronics degradation accelerated." : "Moderate radiation increase — monitor subsystem telemetry and increase orbit determination cadence."}`,
    severityLevel:
      gLevel >= 5
        ? "CRITICAL"
        : gLevel >= 4
          ? "HIGH"
          : gLevel >= 3
            ? "MEDIUM"
            : "LOW",
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.5),
      pessimistic: Math.round(horizonDelta * 2),
    },
  });
}

export function runCoronalMassEjection(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const velocity = (scenario.parameters.velocityKmS as number) ?? 1500;
  const direction = (scenario.parameters.direction as string) ?? "direct";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isDirect = direction === "direct";
  const severityFactor = (velocity / 3000) * (isDirect ? 1.0 : 0.3);
  const horizonDelta = Math.round(-baselineHorizon * severityFactor * 0.3);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: severityFactor > 0.5 ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `CME at ${velocity} km/s (${direction} hit). ${isDirect ? "Direct impact — atmospheric drag spike expected. SEU rate elevated." : "Glancing blow — moderate effects on charged particle environment."}`,
    severityLevel:
      severityFactor > 0.7
        ? "CRITICAL"
        : severityFactor > 0.4
          ? "HIGH"
          : "MEDIUM",
  });
}

export function runSolarParticleEvent(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const fluence = (scenario.parameters.fluenceLevel as string) ?? "moderate";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const factor =
    fluence === "extreme" ? 0.5 : fluence === "severe" ? 0.25 : 0.1;
  const horizonDelta = Math.round(-baselineHorizon * factor);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: fluence === "extreme" ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `Solar particle event (${fluence}). ${fluence === "extreme" ? "Severe — expect permanent electronics damage. Total ionizing dose budget consumed." : "Elevated SEU rate. Increase telemetry monitoring and scrubbing frequency."}`,
    severityLevel:
      fluence === "extreme"
        ? "CRITICAL"
        : fluence === "severe"
          ? "HIGH"
          : "MEDIUM",
  });
}

export function runDebrisCloudEvent(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const proximity = (scenario.parameters.proximity as string) ?? "near";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isDirect = proximity === "direct";
  const factor = isDirect ? 0.9 : proximity === "adjacent" ? 0.4 : 0.1;
  const horizonDelta = Math.round(-baselineHorizon * factor);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isDirect ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: isDirect ? new Date().toISOString() : null,
      },
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: baseline.modules.orbital.status,
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: isDirect
      ? "Debris cloud direct encounter — high probability of impact. Immediate collision avoidance maneuver required if propulsion available."
      : `Debris cloud ${proximity} to orbital plane. Elevated conjunction rate for next 6-12 months. Increase tracking and maneuver readiness.`,
    severityLevel: isDirect
      ? "CRITICAL"
      : proximity === "adjacent"
        ? "HIGH"
        : "MEDIUM",
  });
}

export function runMicrometeroidImpact(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const severity = (scenario.parameters.severity as string) ?? "surface";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isPenetrating = severity === "penetrating";
  const horizonDelta = isPenetrating
    ? Math.round(-baselineHorizon * 0.6)
    : Math.round(-baselineHorizon * 0.05);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isPenetrating
          ? "NON_COMPLIANT"
          : baseline.modules.subsystems.status,
        crossingDateBefore: null,
        crossingDateAfter: isPenetrating ? new Date().toISOString() : null,
      },
    ],
    recommendation: isPenetrating
      ? "Penetrating micrometeoroid impact — potential pressure vessel breach or critical cable damage. Assess subsystem health immediately."
      : "Surface micrometeoroid impact — cosmetic damage or minor solar panel degradation. Monitor affected area.",
    severityLevel: isPenetrating ? "CRITICAL" : "LOW",
  });
}

export function runElectrostaticDischarge(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = Math.round(-baselineHorizon * 0.1);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
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
      "Electrostatic discharge event. May cause phantom commands, sensor noise, or component latch-up. Power cycle affected subsystems and verify telemetry integrity.",
    severityLevel: "MEDIUM",
  });
}
```

### Step 4: Create `handlers/communication.ts`

```typescript
import "server-only";
import type {
  WhatIfScenario,
  WhatIfResult,
  SatelliteComplianceStateInternal,
} from "../../core/types";

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

export function runCommFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const severity = (scenario.parameters.severity as string) ?? "partial";
  const durationDays = (scenario.parameters.durationDays as number) ?? 7;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isTotal = severity === "total";
  const horizonDelta = isTotal
    ? -baselineHorizon
    : Math.round(-durationDays * 2);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isTotal ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: isTotal ? new Date().toISOString() : null,
      },
    ],
    recommendation: isTotal
      ? "Total communication loss — satellite uncontrollable. Cannot perform collision avoidance or EOL operations. NCA notification required."
      : `Partial comm loss for ${durationDays} days. Reduced telemetry and commanding capability. Use backup link or relay satellite if available.`,
    severityLevel: isTotal ? "CRITICAL" : durationDays > 14 ? "HIGH" : "MEDIUM",
  });
}

export function runGroundStationLoss(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const stationsAffected =
    (scenario.parameters.stationsAffected as number) ?? 1;
  const durationDays = (scenario.parameters.durationDays as number) ?? 7;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = Math.round(-durationDays * stationsAffected * 0.5);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: stationsAffected >= 3 ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `${stationsAffected} ground station(s) unavailable for ${durationDays} days. ${stationsAffected >= 3 ? "Critical — contact windows severely reduced. Arrange emergency ground support." : "Reduced contact windows. Prioritize critical commanding during available passes."}`,
    severityLevel: stationsAffected >= 3 ? "HIGH" : "MEDIUM",
  });
}

export function runFrequencyInterference(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const severity = (scenario.parameters.severity as string) ?? "minor";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isMajor = severity === "major";

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + (isMajor ? -180 : -30)),
    horizonDelta: isMajor ? -180 : -30,
    affectedRegulations: [
      {
        regulationRef: "itu_radio_regulations",
        statusBefore: "COMPLIANT",
        statusAfter: isMajor ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: isMajor
      ? "Major frequency interference — primary communication band compromised. File ITU interference complaint and coordinate with offending operator. May need frequency migration."
      : "Minor frequency interference — link margin degraded. Monitor and document for ITU coordination record.",
    severityLevel: isMajor ? "HIGH" : "LOW",
  });
}

export function runCyberIncident(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const severity = (scenario.parameters.severity as string) ?? "medium";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const severityMap: Record<string, number> = {
    low: 0.05,
    medium: 0.15,
    high: 0.35,
    critical: 0.7,
  };
  const factor = severityMap[severity] ?? 0.15;
  const horizonDelta = Math.round(-baselineHorizon * factor);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "nis2_art_21",
        statusBefore: baseline.modules.cybersecurity?.status ?? "COMPLIANT",
        statusAfter: severity === "critical" ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      {
        regulationRef: "nis2_art_23",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `${severity.toUpperCase()} cyber incident. NIS2 notification timeline: 24h early warning → 72h initial notification → 1 month final report to CSIRT. ${severity === "critical" ? "Isolate affected systems immediately." : "Begin incident response and evidence preservation."}`,
    severityLevel:
      severity === "critical"
        ? "CRITICAL"
        : severity === "high"
          ? "HIGH"
          : "MEDIUM",
  });
}

export function runDataBreach(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const personalData = (scenario.parameters.personalData as string) ?? "no";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isPersonal = personalData === "yes";
  const horizonDelta = isPersonal ? -120 : -30;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "nis2_art_23",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      ...(isPersonal
        ? [
            {
              regulationRef: "gdpr_art_33",
              statusBefore: "COMPLIANT" as const,
              statusAfter: "NON_COMPLIANT" as const,
              crossingDateBefore: null,
              crossingDateAfter: new Date().toISOString(),
            },
          ]
        : []),
    ],
    recommendation: isPersonal
      ? "Personal data breach — GDPR Art. 33 notification to DPA within 72 hours required. Assess impact scope and notify affected individuals if high risk."
      : "Non-personal data breach. NIS2 incident notification required. Document scope and remediation actions.",
    severityLevel: isPersonal ? "HIGH" : "MEDIUM",
  });
}
```

### Step 5: Create `handlers/regulatory.ts`

```typescript
import "server-only";
import type {
  WhatIfScenario,
  WhatIfResult,
  SatelliteComplianceStateInternal,
} from "../../core/types";
import { simulateJurisdictionChange } from "../jurisdiction-simulator";

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

export function runOperatorTypeChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const newType = (scenario.parameters.operatorType as string) ?? "SCO";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  // Different operator types have different article applicability
  const complexTypes = ["SCO", "LO", "LSO"];
  const isMoreComplex = complexTypes.includes(newType);
  const horizonDelta = isMoreComplex ? -90 : 60;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
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
    recommendation: `Reclassification to ${newType}. ${isMoreComplex ? "Additional EU Space Act articles now applicable. Updated authorization may be required." : "Simplified requirements under new classification."}`,
    severityLevel: isMoreComplex ? "MEDIUM" : "LOW",
  });
}

export function runRegulatoryChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const framework = (scenario.parameters.framework as string) ?? "EU Space Act";
  const severity = (scenario.parameters.severity as string) ?? "minor";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const severityMap: Record<string, number> = {
    minor: -30,
    major: -120,
    critical: -365,
  };
  const horizonDelta = severityMap[severity] ?? -30;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: `${framework.toLowerCase().replace(/\s+/g, "_")}_amendment`,
        statusBefore: "COMPLIANT",
        statusAfter: severity === "critical" ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `${severity.charAt(0).toUpperCase() + severity.slice(1)} ${framework} amendment. ${severity === "critical" ? "Fundamental compliance approach may need revision. Engage regulatory counsel." : "Review updated requirements and adjust compliance roadmap."}`,
    severityLevel:
      severity === "critical"
        ? "CRITICAL"
        : severity === "major"
          ? "HIGH"
          : "MEDIUM",
  });
}

export function runInsuranceLapse(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const durationMonths = (scenario.parameters.durationMonths as number) ?? 3;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return buildResult(scenario, baseline, {
    projectedHorizon: 0,
    horizonDelta: -baselineHorizon,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_72",
        statusBefore: baseline.modules.insurance.status,
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: new Date().toISOString(),
      },
    ],
    recommendation: `Insurance lapse of ${durationMonths} months. Immediate NON_COMPLIANT status under Art. 72. NCA may suspend authorization. Secure emergency coverage or bridge policy.`,
    severityLevel: "CRITICAL",
    costEstimate: {
      financialUsd: durationMonths * 50000,
      description: `Estimated premium for ${durationMonths}-month emergency bridge policy`,
    },
  });
}

export function runNcaAuditTrigger(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const scope = (scenario.parameters.scope as string) ?? "targeted";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = scope === "full" ? -60 : -14;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
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
    recommendation: `${scope === "full" ? "Full" : "Targeted"} NCA audit triggered. Prepare documentation: authorization records, compliance reports, incident logs, insurance certificates. ${scope === "full" ? "Allow 30-60 days for full audit cycle." : "Targeted audit typically 2-4 weeks."}`,
    severityLevel: scope === "full" ? "HIGH" : "MEDIUM",
  });
}

export function runLicensingConditionChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const changeType = (scenario.parameters.changeType as string) ?? "modify";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta =
    changeType === "add" ? -90 : changeType === "remove" ? 60 : -30;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "national_space_law_license",
        statusBefore: "COMPLIANT",
        statusAfter: changeType === "add" ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `License condition ${changeType === "add" ? "added" : changeType === "remove" ? "removed" : "modified"}. ${changeType === "add" ? "New obligation — assess compliance gap and implementation timeline." : "Review updated conditions and adjust operations accordingly."}`,
    severityLevel: changeType === "add" ? "MEDIUM" : "LOW",
  });
}

export function runDebrisRemediationOrder(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const deadlineDays = (scenario.parameters.deadlineDays as number) ?? 180;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.min(deadlineDays, baselineHorizon),
    horizonDelta: -Math.max(0, baselineHorizon - deadlineDays),
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_70",
        statusBefore: baseline.modules.fuel.status,
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `NCA orders debris remediation within ${deadlineDays} days. Evaluate: (1) active deorbit capability, (2) ADR service procurement, (3) appeal process. Non-compliance may result in authorization revocation.`,
    severityLevel: deadlineDays < 90 ? "CRITICAL" : "HIGH",
    costEstimate: {
      financialUsd: deadlineDays < 90 ? 5000000 : 2000000,
      description: `Estimated ADR service cost for ${deadlineDays}-day deadline`,
    },
  });
}

export function runMandatoryManeuverOrder(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const deadlineDays = (scenario.parameters.deadlineDays as number) ?? 14;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const currentFuel =
    baseline.modules.fuel.factors.find(
      (f) => f.id === "fuel_passivation_reserve",
    )?.currentValue ?? null;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon - 30),
    horizonDelta: -30,
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
      currentFuel !== null
        ? {
            before: currentFuel,
            after: Math.max(0, currentFuel - 1),
            delta: -1,
          }
        : null,
    recommendation: `Mandatory maneuver ordered — deadline ${deadlineDays} days. ${currentFuel !== null && currentFuel < 5 ? "WARNING: Fuel reserves critically low for ordered maneuver." : "Execute maneuver and report completion to NCA."}`,
    severityLevel: deadlineDays < 7 ? "CRITICAL" : "HIGH",
  });
}

export function runSpectrumReallocation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const timelineMonths = (scenario.parameters.timelineMonths as number) ?? 12;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon - timelineMonths * 15),
    horizonDelta: -(timelineMonths * 15),
    affectedRegulations: [
      {
        regulationRef: "itu_radio_regulations",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `Spectrum reallocation in ${timelineMonths} months. Plan frequency migration: (1) identify alternative bands, (2) coordinate with ITU, (3) update ground infrastructure, (4) test new frequencies.`,
    severityLevel: timelineMonths < 6 ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: 500000 + (timelineMonths < 6 ? 200000 : 0),
      description:
        "Frequency migration cost including ground station modifications",
    },
  });
}

export function runTreatyChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon - 180),
    horizonDelta: -180,
    affectedRegulations: [
      {
        regulationRef: "international_treaty_framework",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      "International treaty amendment. Cascading effects on national space laws and EU Space Act implementation. Engage international legal counsel and monitor transposition timelines.",
    severityLevel: "HIGH",
  });
}

export function runLiabilityClaim(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const basis = (scenario.parameters.basis as string) ?? "fault";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon - 90),
    horizonDelta: -90,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_72",
        statusBefore: baseline.modules.insurance.status,
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
      {
        regulationRef: "liability_convention_art_ii",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `Liability claim filed (${basis}-based). ${basis === "absolute" ? "Absolute liability applies for surface damage — no fault defense available." : "Fault-based claim for in-orbit damage. Document operational history and due diligence measures."} Notify insurer immediately.`,
    severityLevel: "HIGH",
  });
}

export function runNis2NotificationTrigger(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const incidentClass =
    (scenario.parameters.incidentClass as string) ?? "significant";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const classMap: Record<string, number> = {
    significant: -30,
    substantial: -90,
    "large-scale": -180,
  };
  const horizonDelta = classMap[incidentClass] ?? -30;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "nis2_art_23",
        statusBefore: "COMPLIANT",
        statusAfter:
          incidentClass === "large-scale" ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `NIS2 ${incidentClass} incident notification. Timeline: 24h early warning to CSIRT → 72h initial notification → 1 month final report. ${incidentClass === "large-scale" ? "Potential penalties: EUR 10M or 2% global turnover (essential entities)." : "Document remediation measures for compliance report."}`,
    severityLevel:
      incidentClass === "large-scale"
        ? "CRITICAL"
        : incidentClass === "substantial"
          ? "HIGH"
          : "MEDIUM",
  });
}
```

### Step 6: Create `handlers/operational.ts`

```typescript
import "server-only";
import type {
  WhatIfScenario,
  WhatIfResult,
  SatelliteComplianceStateInternal,
} from "../../core/types";

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

export function runLaunchDelay(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const delayMonths = (scenario.parameters.delayMonths as number) ?? 6;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon - delayMonths * 30),
    horizonDelta: -(delayMonths * 30),
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_10",
        statusBefore: "COMPLIANT",
        statusAfter: delayMonths > 12 ? "WARNING" : "COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `Launch delayed by ${delayMonths} months. ${delayMonths > 12 ? "Authorization may expire — check validity period and request extension from NCA." : "Update mission timeline and notify stakeholders. Check authorization validity window."}`,
    severityLevel:
      delayMonths > 18 ? "HIGH" : delayMonths > 6 ? "MEDIUM" : "LOW",
    costEstimate: {
      financialUsd: delayMonths * 100000,
      description: `Estimated delay costs (storage, insurance, ground ops)`,
    },
  });
}

export function runMissionScopeChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const direction = (scenario.parameters.direction as string) ?? "expand";
  const magnitude = (scenario.parameters.magnitudePct as number) ?? 20;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isExpanding = direction === "expand";
  const horizonDelta = isExpanding
    ? Math.round(-magnitude * 1.5)
    : Math.round(magnitude * 0.5);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: isExpanding
      ? [
          {
            regulationRef: "eu_space_act_art_10",
            statusBefore: "COMPLIANT",
            statusAfter: magnitude > 30 ? "WARNING" : "COMPLIANT",
            crossingDateBefore: null,
            crossingDateAfter: null,
          },
        ]
      : [],
    recommendation: isExpanding
      ? `Mission scope expanded by ${magnitude}%. ${magnitude > 30 ? "May require authorization amendment for changed operational parameters." : "Review compliance implications of expanded operations."}`
      : `Mission scope reduced by ${magnitude}%. Simplified compliance requirements may apply.`,
    severityLevel: isExpanding && magnitude > 50 ? "HIGH" : "MEDIUM",
  });
}

export function runSoftwareAnomaly(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const subsystem = (scenario.parameters.subsystem as string) ?? "AOCS";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isCritical = subsystem === "AOCS" || subsystem === "TT&C";
  const horizonDelta = isCritical
    ? Math.round(-baselineHorizon * 0.3)
    : Math.round(-baselineHorizon * 0.05);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isCritical
          ? "WARNING"
          : baseline.modules.subsystems.status,
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `Software anomaly in ${subsystem} subsystem. ${isCritical ? "Critical subsystem — enter safe mode and upload patch via redundant path." : "Non-critical — schedule maintenance window for software update."}`,
    severityLevel: isCritical ? "HIGH" : "LOW",
  });
}

export function runServiceInterruption(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const durationHours = (scenario.parameters.durationHours as number) ?? 24;
  const customersAffectedPct =
    (scenario.parameters.customersAffectedPct as number) ?? 50;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = Math.round(
    -(durationHours / 24) * (customersAffectedPct / 100) * 30,
  );

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [],
    recommendation: `Service interruption: ${durationHours}h affecting ${customersAffectedPct}% of customers. ${durationHours > 72 ? "SLA breach likely — prepare customer communications and remediation plan." : "Monitor recovery and document root cause."}`,
    severityLevel:
      durationHours > 48 && customersAffectedPct > 50 ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: Math.round(durationHours * customersAffectedPct * 100),
      description: `Estimated SLA penalty and revenue loss`,
    },
  });
}

export function runOperationsTeamChange(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const personnelLossPct =
    (scenario.parameters.personnelLossPct as number) ?? 30;
  const trainingGapMonths =
    (scenario.parameters.trainingGapMonths as number) ?? 3;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = Math.round(
    -(personnelLossPct / 100) * trainingGapMonths * 20,
  );

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter:
          personnelLossPct > 50
            ? "WARNING"
            : baseline.modules.subsystems.status,
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `${personnelLossPct}% operations team turnover, ${trainingGapMonths}-month training gap. ${personnelLossPct > 50 ? "Critical staffing risk — consider outsourcing or contractor support during transition." : "Plan structured handover and prioritize critical operations training."}`,
    severityLevel: personnelLossPct > 60 ? "HIGH" : "MEDIUM",
  });
}

export function runFrequencyBandMigration(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const timelineMonths = (scenario.parameters.timelineMonths as number) ?? 12;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon - timelineMonths * 10),
    horizonDelta: -(timelineMonths * 10),
    affectedRegulations: [
      {
        regulationRef: "itu_radio_regulations",
        statusBefore: "COMPLIANT",
        statusAfter: "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `Frequency band migration over ${timelineMonths} months. Coordinate with ITU, update ground terminals, test satellite receiver reconfiguration. ${timelineMonths < 6 ? "Aggressive timeline — parallel execution needed." : "Standard migration timeline — plan phased rollout."}`,
    severityLevel: timelineMonths < 6 ? "HIGH" : "MEDIUM",
    costEstimate: {
      financialUsd: 300000 + (timelineMonths < 6 ? 150000 : 0),
      description: "Ground infrastructure modification and testing costs",
    },
  });
}
```

### Step 7: Create `handlers/financial.ts`

```typescript
import "server-only";
import type {
  WhatIfScenario,
  WhatIfResult,
  SatelliteComplianceStateInternal,
} from "../../core/types";

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

export function runInsurancePremiumIncrease(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const increasePct = (scenario.parameters.increasePct as number) ?? 50;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return buildResult(scenario, baseline, {
    projectedHorizon: baselineHorizon,
    horizonDelta: 0,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_72",
        statusBefore: baseline.modules.insurance.status,
        statusAfter:
          increasePct > 100 ? "WARNING" : baseline.modules.insurance.status,
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `Insurance premium increase of ${increasePct}%. ${increasePct > 100 ? "Potential coverage gap risk if premium becomes unaffordable. Explore alternative insurers or risk pooling arrangements." : "Budget impact — review coverage levels and consider adjusting deductibles."}`,
    severityLevel:
      increasePct > 150 ? "HIGH" : increasePct > 75 ? "MEDIUM" : "LOW",
    costEstimate: {
      financialUsd: Math.round(increasePct * 5000),
      description: `Annual additional premium cost`,
    },
  });
}

export function runSupplyChainDisruption(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const leadTimeMonths = (scenario.parameters.leadTimeMonths as number) ?? 12;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = Math.round(-leadTimeMonths * 15);

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter:
          leadTimeMonths > 18 ? "WARNING" : baseline.modules.subsystems.status,
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation: `Critical component unavailable — ${leadTimeMonths}-month lead time. ${leadTimeMonths > 18 ? "Mission-impacting delay. Evaluate alternative suppliers or design-around options." : "Plan ahead for replacement. Increase on-orbit spare monitoring."}`,
    severityLevel: leadTimeMonths > 24 ? "HIGH" : "MEDIUM",
  });
}

export function runSanctionsExportControl(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon - 180),
    horizonDelta: -180,
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
      "Sanctions/export control restriction impacts component availability. Immediate actions: (1) identify affected components, (2) assess alternative sources, (3) apply for export licenses if applicable, (4) engage legal counsel.",
    severityLevel: "HIGH",
  });
}

export function runBudgetCut(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const reductionPct = (scenario.parameters.reductionPct as number) ?? 20;
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = Math.round(
    -baselineHorizon * (reductionPct / 100) * 0.4,
  );

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
    horizonDelta,
    affectedRegulations:
      reductionPct > 30
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
    recommendation: `${reductionPct}% budget reduction. ${reductionPct > 30 ? "Compliance activities at risk. Prioritize: (1) safety-critical operations, (2) mandatory reporting, (3) insurance maintenance." : "Review operational priorities and defer non-essential activities."}`,
    severityLevel:
      reductionPct > 40 ? "HIGH" : reductionPct > 20 ? "MEDIUM" : "LOW",
  });
}

export function runPartnerDefault(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const criticality = (scenario.parameters.criticality as string) ?? "medium";
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const criticalityMap: Record<string, number> = {
    low: -30,
    medium: -90,
    high: -365,
  };
  const horizonDelta = criticalityMap[criticality] ?? -90;

  return buildResult(scenario, baseline, {
    projectedHorizon: Math.max(0, baselineHorizon + horizonDelta),
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
    recommendation: `Partner/supplier default (${criticality} criticality). ${criticality === "high" ? "Critical dependency lost. Activate contingency agreements and identify replacement supplier urgently." : "Assess impact on operations and activate backup arrangements."}`,
    severityLevel:
      criticality === "high"
        ? "CRITICAL"
        : criticality === "medium"
          ? "HIGH"
          : "MEDIUM",
  });
}
```

### Step 8: Create `handlers/index.ts` (router)

```typescript
import "server-only";
import type {
  WhatIfScenario,
  WhatIfResult,
  SatelliteComplianceStateInternal,
} from "../../core/types";

// Orbital
import {
  runOrbitLower,
  runOrbitPlaneChange,
  runOrbitalSlotChange,
  runCollisionAvoidance,
  runDeorbitExecute,
  runConstellationResize,
  runAtmosphericDragIncrease,
} from "./orbital";
// Hardware
import {
  runReactionWheelFailure,
  runSolarPanelDegradation,
  runBatteryDegradation,
  runAntennaDegradation,
  runAttitudeControlAnomaly,
  runThermalControlFailure,
  runSensorDegradation,
  runPayloadFailure,
  runPassivationFailure,
  runPropellantLeak,
  runPowerBusAnomaly,
} from "./hardware";
// Environment
import {
  runSolarStorm,
  runCoronalMassEjection,
  runSolarParticleEvent,
  runDebrisCloudEvent,
  runMicrometeroidImpact,
  runElectrostaticDischarge,
} from "./environment";
// Communication
import {
  runCommFailure,
  runGroundStationLoss,
  runFrequencyInterference,
  runCyberIncident,
  runDataBreach,
} from "./communication";
// Regulatory
import {
  runOperatorTypeChange,
  runRegulatoryChange,
  runInsuranceLapse,
  runNcaAuditTrigger,
  runLicensingConditionChange,
  runDebrisRemediationOrder,
  runMandatoryManeuverOrder,
  runSpectrumReallocation,
  runTreatyChange,
  runLiabilityClaim,
  runNis2NotificationTrigger,
} from "./regulatory";
// Operational
import {
  runLaunchDelay,
  runMissionScopeChange,
  runSoftwareAnomaly,
  runServiceInterruption,
  runOperationsTeamChange,
  runFrequencyBandMigration,
} from "./operational";
// Financial
import {
  runInsurancePremiumIncrease,
  runSupplyChainDisruption,
  runSanctionsExportControl,
  runBudgetCut,
  runPartnerDefault,
} from "./financial";

export type ScenarioHandler = (
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
) => WhatIfResult;

export const SCENARIO_HANDLERS: Record<string, ScenarioHandler> = {
  // Orbital
  ORBIT_LOWER: runOrbitLower,
  ORBIT_PLANE_CHANGE: runOrbitPlaneChange,
  ORBITAL_SLOT_CHANGE: runOrbitalSlotChange,
  COLLISION_AVOIDANCE: runCollisionAvoidance,
  DEORBIT_EXECUTE: runDeorbitExecute,
  CONSTELLATION_RESIZE: runConstellationResize,
  ATMOSPHERIC_DRAG_INCREASE: runAtmosphericDragIncrease,
  // Hardware
  REACTION_WHEEL_FAILURE: runReactionWheelFailure,
  SOLAR_PANEL_DEGRADATION: runSolarPanelDegradation,
  BATTERY_DEGRADATION: runBatteryDegradation,
  ANTENNA_DEGRADATION: runAntennaDegradation,
  ATTITUDE_CONTROL_ANOMALY: runAttitudeControlAnomaly,
  THERMAL_CONTROL_FAILURE: runThermalControlFailure,
  SENSOR_DEGRADATION: runSensorDegradation,
  PAYLOAD_FAILURE: runPayloadFailure,
  PASSIVATION_FAILURE: runPassivationFailure,
  PROPELLANT_LEAK: runPropellantLeak,
  POWER_BUS_ANOMALY: runPowerBusAnomaly,
  // Environment
  SOLAR_STORM: runSolarStorm,
  CORONAL_MASS_EJECTION: runCoronalMassEjection,
  SOLAR_PARTICLE_EVENT: runSolarParticleEvent,
  DEBRIS_CLOUD_EVENT: runDebrisCloudEvent,
  MICROMETEOROID_IMPACT: runMicrometeroidImpact,
  ELECTROSTATIC_DISCHARGE: runElectrostaticDischarge,
  // Communication
  COMM_FAILURE: runCommFailure,
  GROUND_STATION_LOSS: runGroundStationLoss,
  FREQUENCY_INTERFERENCE: runFrequencyInterference,
  CYBER_INCIDENT: runCyberIncident,
  DATA_BREACH: runDataBreach,
  // Regulatory
  OPERATOR_TYPE_CHANGE: runOperatorTypeChange,
  REGULATORY_CHANGE: runRegulatoryChange,
  INSURANCE_LAPSE: runInsuranceLapse,
  NCA_AUDIT_TRIGGER: runNcaAuditTrigger,
  LICENSING_CONDITION_CHANGE: runLicensingConditionChange,
  DEBRIS_REMEDIATION_ORDER: runDebrisRemediationOrder,
  MANDATORY_MANEUVER_ORDER: runMandatoryManeuverOrder,
  SPECTRUM_REALLOCATION: runSpectrumReallocation,
  TREATY_CHANGE: runTreatyChange,
  LIABILITY_CLAIM: runLiabilityClaim,
  NIS2_NOTIFICATION_TRIGGER: runNis2NotificationTrigger,
  // Operational
  LAUNCH_DELAY: runLaunchDelay,
  MISSION_SCOPE_CHANGE: runMissionScopeChange,
  SOFTWARE_ANOMALY: runSoftwareAnomaly,
  SERVICE_INTERRUPTION: runServiceInterruption,
  OPERATIONS_TEAM_CHANGE: runOperationsTeamChange,
  FREQUENCY_BAND_MIGRATION: runFrequencyBandMigration,
  // Financial
  INSURANCE_PREMIUM_INCREASE: runInsurancePremiumIncrease,
  SUPPLY_CHAIN_DISRUPTION: runSupplyChainDisruption,
  SANCTIONS_EXPORT_CONTROL: runSanctionsExportControl,
  BUDGET_CUT: runBudgetCut,
  PARTNER_DEFAULT: runPartnerDefault,
};
```

**Step 9: Commit backend handlers**

```bash
git add src/lib/ephemeris/simulation/handlers/
git commit -m "feat(ephemeris): add 49 new scenario handlers across 7 categories"
```

---

## Task 3: Update what-if-engine.ts to use handler registry

**Files:**

- Modify: `src/lib/ephemeris/simulation/what-if-engine.ts`

**Step 1: Integrate handler registry**

Replace the switch statement with a lookup into `SCENARIO_HANDLERS`. Keep existing 5 handlers as-is, delegate new types to the registry.

```typescript
import { SCENARIO_HANDLERS } from "./handlers";

export async function runWhatIfScenario(
  prisma: PrismaClient,
  orgId: string,
  noradId: string,
  satelliteName: string,
  launchDate: Date | null,
  scenario: WhatIfScenario,
  baselineState: SatelliteComplianceStateInternal,
): Promise<WhatIfResult> {
  // Existing handlers (keep for backwards compatibility)
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
      // New handlers from registry
      const handler = SCENARIO_HANDLERS[scenario.type];
      if (handler) {
        return handler(baselineState, scenario);
      }
      return buildNoImpactResult(scenario, baselineState);
    }
  }
}
```

**Step 2: Verify typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` — Expected: `0`

**Step 3: Commit**

```bash
git add src/lib/ephemeris/simulation/what-if-engine.ts
git commit -m "feat(ephemeris): wire handler registry into what-if engine"
```

---

## Task 4: Expand block-definitions.ts to 55 blocks with categories

**Files:**

- Modify: `src/app/dashboard/ephemeris/components/scenario-builder/block-definitions.ts`

**Step 1: Add category field and expand to 55 blocks**

Add `category` field to `BlockDefinition`, then define all 55 blocks organized by category. Each block maps to a `scenarioType` in the handler registry.

Icons per category:

- Orbital: Orbit, ArrowUpCircle, ArrowDownCircle, Crosshair, Rocket, Target, Minimize2, Wind
- Hardware: AlertTriangle, Cog, Sun, Battery, Radio, RotateCcw, Thermometer, Eye, Zap, Package, CircuitBoard, Droplets
- Environment: CloudLightning, Flame, Radiation, Cloud, Sparkles, Zap
- Communication: Wifi, Satellite, Radio, Shield, Database
- Regulatory: Globe, Users, FileText, ShieldOff, Search, FileCheck, Trash2, AlertOctagon, Waves, ScrollText, Scale, Bell
- Operational: Clock, CalendarX, Maximize2, Code, WifiOff, UserMinus, Radio
- Financial: DollarSign, Truck, Ban, Scissors, UserX

**Step 2: Add `BlockCategory` type and category metadata**

```typescript
export type BlockCategory =
  | "orbital"
  | "hardware"
  | "environment"
  | "communication"
  | "regulatory"
  | "operational"
  | "financial";

export interface CategoryMeta {
  id: BlockCategory;
  label: string;
  icon: string;
  color: string;
}

export const BLOCK_CATEGORIES: CategoryMeta[] = [
  {
    id: "orbital",
    label: "Orbital Mechanics",
    icon: "Orbit",
    color: "text-blue-500",
  },
  {
    id: "hardware",
    label: "Hardware Failures",
    icon: "Cog",
    color: "text-red-500",
  },
  {
    id: "environment",
    label: "Space Environment",
    icon: "CloudLightning",
    color: "text-purple-500",
  },
  {
    id: "communication",
    label: "Communication & Data",
    icon: "Wifi",
    color: "text-cyan-500",
  },
  {
    id: "regulatory",
    label: "Regulatory & Legal",
    icon: "Scale",
    color: "text-indigo-500",
  },
  {
    id: "operational",
    label: "Operational",
    icon: "Clock",
    color: "text-amber-500",
  },
  {
    id: "financial",
    label: "Financial & Business",
    icon: "DollarSign",
    color: "text-emerald-500",
  },
];
```

Add `category: BlockCategory` to `BlockDefinition` interface and set it on all 55 blocks.

**Step 3: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/block-definitions.ts
git commit -m "feat(ephemeris): expand block definitions to 55 blocks in 7 categories"
```

---

## Task 5: Theme-integrate all scenario builder UI files

**Files:**

- Modify: `src/app/dashboard/ephemeris/components/scenario-builder/ScenarioBuilder.tsx`
- Modify: `src/app/dashboard/ephemeris/components/scenario-builder/BlockPalette.tsx`
- Modify: `src/app/dashboard/ephemeris/components/scenario-builder/ScenarioPipeline.tsx`
- Modify: `src/app/dashboard/ephemeris/components/scenario-builder/PipelineBlock.tsx`
- Modify: `src/app/dashboard/ephemeris/components/scenario-builder/ResultsPanel.tsx`

**Step 1: Convert each file**

Replace all hardcoded colors with `useEphemerisTheme()` / prop-passed `EphemerisColors`:

- `#111827` → `C.textPrimary`
- `#374151` → `C.textSecondary`
- `#6B7280` / `#9CA3AF` → `C.textTertiary` / `C.textMuted`
- `#E5E7EB` → `C.border`
- `#D1D5DB` → `C.borderActive`
- `#F7F8FA` → `C.sunken`
- `bg-white` → `C.elevated`
- Convert from Tailwind classes to inline styles using theme colors

Pattern: Components that use hooks directly get `const C = useEphemerisTheme()`. Sub-components that can't use hooks receive `C` as a prop.

**Step 2: Rebuild BlockPalette with collapsible categories + search**

- Add search input at top
- Group blocks by `category` field
- Each category is a collapsible section with count badge
- Filter blocks by search text (name or description match)

**Step 3: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/
git commit -m "feat(ephemeris): theme-integrate scenario builder + collapsible category palette"
```

---

## Task 6: Rebuild ResultsPanel with rich visualizations

**Files:**

- Modify: `src/app/dashboard/ephemeris/components/scenario-builder/ResultsPanel.tsx`

**Step 1: Add Compliance Timeline Chart**

SVG mini-chart component showing 12-month projection:

- X-axis: months (0-11)
- Y-axis: compliance score (0-100)
- Dashed line for baseline, solid line for projected
- Fill area between lines colored by delta direction
- Crossover point highlighted with dot

**Step 2: Add Risk Heatmap**

8-column grid (one per compliance module):

- Color-coded cells: green → amber → red
- Before row and after row
- Module labels along top

**Step 3: Add Impact Summary Card**

- Severity badge (LOW/MEDIUM/HIGH/CRITICAL) with color coding
- Confidence band visualization (optimistic/pessimistic range bar)
- Cost estimate section when applicable

**Step 4: Enhanced Step Breakdown**

- Block icon + name instead of raw scenario type
- Mini delta bar per step
- Cumulative total line

**Step 5: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/ResultsPanel.tsx
git commit -m "feat(ephemeris): rich results panel with timeline chart, heatmap, confidence bands"
```

---

## Task 7: Verify everything compiles and tests pass

**Step 1: Full typecheck**

Run: `npm run typecheck`
Expected: 0 errors

**Step 2: Lint**

Run: `npm run lint`
Expected: 0 errors

**Step 3: Tests**

Run: `npm run test:run`
Expected: All tests pass

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(ephemeris): resolve any remaining type/lint issues from scenario builder overhaul"
```

---

## Build Order Summary

| Task | What                            | Files                                   |
| ---- | ------------------------------- | --------------------------------------- |
| 1    | Expand types                    | `core/types.ts`                         |
| 2    | Create 7 handler files          | `simulation/handlers/*.ts`              |
| 3    | Wire handlers into engine       | `simulation/what-if-engine.ts`          |
| 4    | Expand block definitions to 55  | `scenario-builder/block-definitions.ts` |
| 5    | Theme-integrate all UI files    | `scenario-builder/*.tsx` (5 files)      |
| 6    | Rich results panel              | `scenario-builder/ResultsPanel.tsx`     |
| 7    | Verify typecheck + lint + tests | —                                       |
