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
 * Simulate reaction wheel failure.
 * 3+ wheels lost = CRITICAL (no attitude control capability).
 */
export function runReactionWheelFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const wheelsLost = (scenario.parameters.wheelsLost as number) ?? 1;
  const totalWheels = (scenario.parameters.totalWheels as number) ?? 4;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const isCritical = wheelsLost >= 3;
  const isNonCompliant = wheelsLost >= 2;

  // Severity-based horizon impact
  let horizonDelta: number;
  if (isCritical) {
    horizonDelta = -baselineHorizon; // Total loss
  } else if (isNonCompliant) {
    horizonDelta = -Math.round(baselineHorizon * 0.6);
  } else {
    horizonDelta = -Math.round(baselineHorizon * 0.2);
  }
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isCritical
          ? "NON_COMPLIANT"
          : isNonCompliant
            ? "NON_COMPLIANT"
            : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: isCritical ? new Date().toISOString() : null,
      },
    ],
    recommendation: isCritical
      ? `Loss of ${wheelsLost}/${totalWheels} reaction wheels results in complete attitude control failure. ` +
        `Satellite is uncontrollable — immediate NON_COMPLIANT per Art. 64. Initiate emergency procedures ` +
        `and notify NCA. Consider ADR (Active Debris Removal) options.`
      : isNonCompliant
        ? `Loss of ${wheelsLost}/${totalWheels} reaction wheels severely degrades attitude control. ` +
          `Reduced pointing accuracy impacts collision avoidance capability per Art. 64. ` +
          `Switch to degraded-mode operations and plan corrective action.`
        : `Loss of ${wheelsLost}/${totalWheels} reaction wheels reduces redundancy. ` +
          `Art. 64 subsystem requirements still met but margin reduced. ` +
          `Monitor remaining wheels closely and prepare contingency plan.`,
    severityLevel: isCritical ? "CRITICAL" : isNonCompliant ? "HIGH" : "MEDIUM",
  });
}

/**
 * Simulate solar panel degradation.
 * >30% capacity loss = NON_COMPLIANT (insufficient power for operations).
 */
export function runSolarPanelDegradation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const capacityLossPct = (scenario.parameters.capacityLossPct as number) ?? 10;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isNonCompliant = capacityLossPct > 30;
  const isCritical = capacityLossPct > 50;

  const horizonDelta = isNonCompliant
    ? -Math.round(baselineHorizon * 0.7)
    : -Math.round(baselineHorizon * (capacityLossPct / 100));
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isNonCompliant ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: isNonCompliant ? new Date().toISOString() : null,
      },
    ],
    recommendation: isNonCompliant
      ? `Solar panel degradation of ${capacityLossPct}% exceeds operational threshold. ` +
        `Insufficient power generation for safe operations per Art. 64. ` +
        (isCritical
          ? `Critical power deficit — prioritize essential systems only. Consider early decommissioning.`
          : `Implement power rationing and reduce non-essential payload operations.`)
      : `Solar panel degradation of ${capacityLossPct}% reduces power margin. ` +
        `Art. 64 requirements still met. Monitor degradation rate and plan for reduced ` +
        `power budget in extended mission phases.`,
    severityLevel: isCritical ? "CRITICAL" : isNonCompliant ? "HIGH" : "MEDIUM",
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.7),
      pessimistic: Math.round(horizonDelta * 1.3),
    },
  });
}

/**
 * Simulate battery degradation.
 * >35% capacity loss = critical (eclipse survival at risk).
 */
export function runBatteryDegradation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const capacityLossPct = (scenario.parameters.capacityLossPct as number) ?? 10;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isCritical = capacityLossPct > 35;
  const isNonCompliant = capacityLossPct > 25;

  const horizonDelta = isCritical
    ? -Math.round(baselineHorizon * 0.8)
    : isNonCompliant
      ? -Math.round(baselineHorizon * 0.5)
      : -Math.round(baselineHorizon * (capacityLossPct / 100));
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isCritical
          ? "NON_COMPLIANT"
          : isNonCompliant
            ? "WARNING"
            : baseline.modules.subsystems.status,
        crossingDateBefore: null,
        crossingDateAfter: isCritical ? new Date().toISOString() : null,
      },
    ],
    recommendation: isCritical
      ? `Battery degradation of ${capacityLossPct}% critically impacts eclipse survival capability. ` +
        `Satellite may not survive orbital eclipse periods. Immediate Art. 64 non-compliance. ` +
        `Consider mission termination planning.`
      : isNonCompliant
        ? `Battery degradation of ${capacityLossPct}% reduces eclipse survival margin. ` +
          `Art. 64 subsystem status at risk. Implement reduced duty-cycle operations during eclipse seasons.`
        : `Battery degradation of ${capacityLossPct}% is within acceptable limits. ` +
          `Monitor degradation trend per Art. 64. Plan for reduced eclipse operations in later mission phases.`,
    severityLevel: isCritical ? "CRITICAL" : isNonCompliant ? "HIGH" : "MEDIUM",
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.7),
      pessimistic: Math.round(horizonDelta * 1.4),
    },
  });
}

/**
 * Simulate antenna degradation reducing link margin.
 * >12 dB loss = NON_COMPLIANT (cannot maintain control link).
 */
export function runAntennaDegradation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const linkMarginLoss = (scenario.parameters.linkMarginLoss as number) ?? 3;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isNonCompliant = linkMarginLoss > 12;
  const isWarning = linkMarginLoss > 6;

  const horizonDelta = isNonCompliant
    ? -Math.round(baselineHorizon * 0.8)
    : isWarning
      ? -Math.round(baselineHorizon * 0.3)
      : -Math.round(baselineHorizon * 0.1);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isNonCompliant
          ? "NON_COMPLIANT"
          : isWarning
            ? "WARNING"
            : baseline.modules.subsystems.status,
        crossingDateBefore: null,
        crossingDateAfter: isNonCompliant ? new Date().toISOString() : null,
      },
    ],
    recommendation: isNonCompliant
      ? `Link margin loss of ${linkMarginLoss} dB exceeds recoverable threshold. ` +
        `Command and control link compromised — NON_COMPLIANT per Art. 64. ` +
        `Satellite may become uncontrollable. Initiate emergency ground-station coordination.`
      : isWarning
        ? `Link margin loss of ${linkMarginLoss} dB degrades communication reliability. ` +
          `Art. 64 compliance at risk. Switch to lower data rates and prioritize housekeeping telemetry.`
        : `Link margin loss of ${linkMarginLoss} dB is within operational tolerance. ` +
          `Monitor antenna performance trend. Art. 64 subsystem status maintained.`,
    severityLevel: isNonCompliant ? "CRITICAL" : isWarning ? "HIGH" : "LOW",
  });
}

/**
 * Simulate attitude control anomaly (tumble, drift, or bias).
 * Tumble = CRITICAL — satellite is uncontrollable.
 */
export function runAttitudeControlAnomaly(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const anomalyType = (scenario.parameters.anomalyType as string) ?? "drift";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  let horizonDelta: number;
  let severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  let statusAfter: string;

  switch (anomalyType) {
    case "tumble":
      horizonDelta = -baselineHorizon;
      severityLevel = "CRITICAL";
      statusAfter = "NON_COMPLIANT";
      break;
    case "drift":
      horizonDelta = -Math.round(baselineHorizon * 0.4);
      severityLevel = "HIGH";
      statusAfter = "WARNING";
      break;
    case "bias":
    default:
      horizonDelta = -Math.round(baselineHorizon * 0.15);
      severityLevel = "MEDIUM";
      statusAfter = "WARNING";
      break;
  }

  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter,
        crossingDateBefore: null,
        crossingDateAfter:
          anomalyType === "tumble" ? new Date().toISOString() : null,
      },
    ],
    recommendation:
      anomalyType === "tumble"
        ? `Satellite in tumble mode — complete loss of attitude control. Immediate NON_COMPLIANT per Art. 64. ` +
          `Cannot perform collision avoidance or maintain orbital station. Notify NCA immediately. ` +
          `Attempt recovery via momentum dumping; if unsuccessful, initiate ADR coordination.`
        : anomalyType === "drift"
          ? `Attitude drift anomaly detected. Pointing accuracy degraded — collision avoidance capability ` +
            `reduced per Art. 64. Investigate root cause (reaction wheel, star tracker, gyroscope). ` +
            `Implement safe-hold mode if drift rate increases.`
          : `Attitude bias anomaly detected. Pointing offset within recoverable range per Art. 64. ` +
            `Calibrate attitude sensors and update onboard ephemeris. Monitor for progression to drift mode.`,
    severityLevel,
  });
}

/**
 * Simulate thermal control system failure.
 * Reduces compliance horizon by 40%. Always CRITICAL.
 */
export function runThermalControlFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -Math.round(baselineHorizon * 0.4);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: new Date().toISOString(),
      },
    ],
    recommendation:
      `Thermal control failure reduces compliance horizon by ~${Math.abs(horizonDelta)} days. ` +
      `Component temperature exceedances likely — subsystem degradation will accelerate. ` +
      `NON_COMPLIANT per Art. 64 subsystem requirements. Implement emergency thermal management ` +
      `(sun-pointing, heater redistribution). If unrecoverable, plan early mission termination.`,
    severityLevel: "CRITICAL",
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.7),
      pessimistic: Math.round(horizonDelta * 1.5),
    },
  });
}

/**
 * Simulate sensor degradation (star tracker, sun sensor, gyroscope, etc.).
 * Failed status = 50% horizon reduction.
 */
export function runSensorDegradation(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const sensorType =
    (scenario.parameters.sensorType as string) ?? "star_tracker";
  const severity = (scenario.parameters.severity as string) ?? "degraded";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isFailed = severity === "failed";
  const horizonDelta = isFailed
    ? -Math.round(baselineHorizon * 0.5)
    : -Math.round(baselineHorizon * 0.15);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isFailed ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: isFailed ? new Date().toISOString() : null,
      },
    ],
    recommendation: isFailed
      ? `${sensorType} failure results in ${Math.abs(horizonDelta)}-day horizon reduction. ` +
        `NON_COMPLIANT per Art. 64. ${sensorType === "star_tracker" ? "Attitude determination severely impacted. " : ""}` +
        `Switch to backup sensor if available. If no redundancy, evaluate mission continuation viability.`
      : `${sensorType} degradation reduces measurement accuracy. Art. 64 compliance maintained ` +
        `with reduced margin. Monitor degradation trend and prepare for potential backup sensor activation.`,
    severityLevel: isFailed ? "HIGH" : "MEDIUM",
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.6),
      pessimistic: Math.round(horizonDelta * 1.4),
    },
  });
}

/**
 * Simulate payload failure.
 * No direct compliance impact but HIGH severity — mission value loss.
 */
export function runPayloadFailure(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const payloadType = (scenario.parameters.payloadType as string) ?? "primary";

  return buildResult(scenario, baseline, {
    horizonDelta: 0,
    affectedRegulations: [],
    recommendation:
      `${payloadType === "primary" ? "Primary" : "Secondary"} payload failure does not directly affect regulatory compliance. ` +
      `However, mission value is ${payloadType === "primary" ? "critically" : "significantly"} reduced. ` +
      `Evaluate whether continued operations are justified given remaining mission value. ` +
      `Art. 70 passivation and deorbit obligations remain regardless of payload status.`,
    severityLevel: "HIGH",
    costEstimate: {
      financialUsd: payloadType === "primary" ? 50000000 : 10000000,
      description: `Estimated mission value loss from ${payloadType} payload failure`,
    },
  });
}

/**
 * Simulate passivation system failure.
 * Immediate NON_COMPLIANT — fundamental Art. 70 and IADC obligation.
 */
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
        regulationRef: "iadc_passivation",
        statusBefore: "COMPLIANT",
        statusAfter: "NON_COMPLIANT",
        crossingDateBefore: null,
        crossingDateAfter: new Date().toISOString(),
      },
    ],
    recommendation:
      `Passivation system failure is an immediate NON_COMPLIANT condition per Art. 70 and IADC passivation guidelines. ` +
      `Unable to deplete stored energy sources (fuel, batteries, pressure vessels) at end of life. ` +
      `Notify NCA immediately. Explore alternative passivation methods or coordinate Active Debris Removal (ADR). ` +
      `This is a CRITICAL safety concern — unpassivated satellites pose explosion/fragmentation risk.`,
    severityLevel: "CRITICAL",
    costEstimate: {
      financialUsd: 5000000,
      description:
        "Estimated ADR coordination cost if passivation cannot be restored",
    },
  });
}

/**
 * Simulate propellant leak.
 * Calculate months until fuel depletion based on leak rate.
 */
export function runPropellantLeak(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const ratePctPerMonth = (scenario.parameters.ratePctPerMonth as number) ?? 2;

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const currentFuel = getFuelFromModules(baseline);

  // Calculate months until fuel reaches passivation threshold (15%)
  const monthsToEmpty =
    currentFuel !== null && ratePctPerMonth > 0
      ? Math.max(0, (currentFuel - 15) / ratePctPerMonth)
      : null;

  const daysToThreshold =
    monthsToEmpty !== null ? Math.round(monthsToEmpty * 30) : null;

  const horizonDelta =
    daysToThreshold !== null
      ? -Math.max(0, baselineHorizon - daysToThreshold)
      : -Math.round(baselineHorizon * 0.5);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  const afterFuel =
    currentFuel !== null && monthsToEmpty !== null
      ? Math.max(0, currentFuel - ratePctPerMonth * 6)
      : null;

  const severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" =
    monthsToEmpty !== null && monthsToEmpty < 3
      ? "CRITICAL"
      : monthsToEmpty !== null && monthsToEmpty < 12
        ? "HIGH"
        : "MEDIUM";

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_70",
        statusBefore: baseline.modules.fuel.status,
        statusAfter:
          monthsToEmpty !== null && monthsToEmpty < 6
            ? "NON_COMPLIANT"
            : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    fuelImpact:
      currentFuel !== null && afterFuel !== null
        ? {
            before: currentFuel,
            after: afterFuel,
            delta: afterFuel - currentFuel,
          }
        : null,
    recommendation:
      `Propellant leak at ${ratePctPerMonth}%/month. ` +
      (monthsToEmpty !== null
        ? `Estimated ${monthsToEmpty.toFixed(1)} months until fuel drops below passivation threshold. `
        : `Unable to estimate fuel depletion timeline. `) +
      `Art. 70 requires sufficient fuel for passivation and deorbit. ` +
      (severityLevel === "CRITICAL"
        ? `Initiate emergency passivation/deorbit before fuel is lost. Notify NCA.`
        : `Investigate leak source. Consider early deorbit if leak cannot be isolated.`),
    severityLevel,
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.7),
      pessimistic: Math.round(horizonDelta * 1.5),
    },
  });
}

/**
 * Simulate power bus anomaly (brownout or shutdown).
 * Shutdown = CRITICAL — satellite may be unrecoverable.
 */
export function runPowerBusAnomaly(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const anomalyType = (scenario.parameters.anomalyType as string) ?? "brownout";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isShutdown = anomalyType === "shutdown";

  const horizonDelta = isShutdown
    ? -baselineHorizon
    : -Math.round(baselineHorizon * 0.3);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
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
      ? `Power bus shutdown renders satellite non-operational. Immediate NON_COMPLIANT per Art. 64. ` +
        `All subsystems offline — no command/control capability. Attempt power bus reset via ` +
        `autonomous recovery mode. If unrecoverable, satellite becomes uncontrolled debris.`
      : `Power bus brownout degrades subsystem performance. Art. 64 compliance at risk. ` +
        `Identify and isolate faulty load. Reduce non-essential power consumers. ` +
        `Monitor bus voltage telemetry for recurrence pattern.`,
    severityLevel: isShutdown ? "CRITICAL" : "HIGH",
  });
}
