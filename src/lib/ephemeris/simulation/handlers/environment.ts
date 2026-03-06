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
 * Simulate a solar storm (geomagnetic storm).
 * G1-G5 scale. G4+ = NON_COMPLIANT. Wide confidence band due to unpredictability.
 */
export function runSolarStorm(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const stormLevel = (scenario.parameters.stormLevel as string) ?? "G2";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  // G-scale impacts
  const levelMap: Record<
    string,
    {
      horizonFraction: number;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      nonCompliant: boolean;
    }
  > = {
    G1: { horizonFraction: 0.05, severity: "LOW", nonCompliant: false },
    G2: { horizonFraction: 0.1, severity: "MEDIUM", nonCompliant: false },
    G3: { horizonFraction: 0.25, severity: "HIGH", nonCompliant: false },
    G4: { horizonFraction: 0.5, severity: "CRITICAL", nonCompliant: true },
    G5: { horizonFraction: 0.8, severity: "CRITICAL", nonCompliant: true },
  };

  const impact = levelMap[stormLevel] ?? levelMap.G2;
  const horizonDelta = -Math.round(baselineHorizon * impact.horizonFraction);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: impact.nonCompliant ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: impact.nonCompliant
          ? new Date().toISOString()
          : null,
      },
    ],
    recommendation:
      `${stormLevel} geomagnetic storm event. ` +
      (impact.nonCompliant
        ? `Severe radiation environment — subsystem damage likely. NON_COMPLIANT per Art. 64. ` +
          `Enter safe mode, power down non-essential systems. Perform full subsystem health check post-storm. ` +
          `Report anomalies to NCA.`
        : `Elevated radiation environment. Art. 64 compliance maintained with increased monitoring. ` +
          `Monitor single-event effects in electronics. Increase telemetry cadence for anomaly detection.`),
    severityLevel: impact.severity,
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.3),
      pessimistic: Math.round(horizonDelta * 2.5),
    },
  });
}

/**
 * Simulate a coronal mass ejection (CME).
 * Velocity and direction determine severity. Direct hit = severe.
 */
export function runCoronalMassEjection(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const velocity = (scenario.parameters.velocity as number) ?? 800;
  const direction = (scenario.parameters.direction as string) ?? "glancing";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isDirect = direction === "direct";
  const isHighVelocity = velocity > 1500;

  let horizonFraction: number;
  let severityLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  if (isDirect && isHighVelocity) {
    horizonFraction = 0.7;
    severityLevel = "CRITICAL";
  } else if (isDirect) {
    horizonFraction = 0.4;
    severityLevel = "HIGH";
  } else if (isHighVelocity) {
    horizonFraction = 0.2;
    severityLevel = "MEDIUM";
  } else {
    horizonFraction = 0.08;
    severityLevel = "LOW";
  }

  const horizonDelta = -Math.round(baselineHorizon * horizonFraction);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter:
          isDirect && isHighVelocity
            ? "NON_COMPLIANT"
            : isDirect
              ? "WARNING"
              : baseline.modules.subsystems.status,
        crossingDateBefore: null,
        crossingDateAfter:
          isDirect && isHighVelocity ? new Date().toISOString() : null,
      },
    ],
    recommendation:
      `CME event: ${velocity} km/s, ${direction} impact. ` +
      (isDirect
        ? `Direct CME impact expected. ${isHighVelocity ? "Extreme" : "Significant"} radiation and plasma influx. ` +
          `Art. 64 subsystem integrity at risk. Enter safe mode before arrival. ` +
          `Expect increased atmospheric drag (LEO), surface charging, and potential SEU events.`
        : `Glancing CME impact. Limited direct exposure. Monitor for secondary effects ` +
          `(geomagnetic storm, radiation belt enhancement). Art. 64 compliance maintained.`),
    severityLevel,
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.4),
      pessimistic: Math.round(horizonDelta * 2.0),
    },
  });
}

/**
 * Simulate a solar particle event (SPE).
 * Severity levels: moderate, severe, extreme.
 */
export function runSolarParticleEvent(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const fluence = (scenario.parameters.fluence as string) ?? "moderate";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const fluenceMap: Record<
    string,
    {
      horizonFraction: number;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      nonCompliant: boolean;
    }
  > = {
    moderate: { horizonFraction: 0.1, severity: "MEDIUM", nonCompliant: false },
    severe: { horizonFraction: 0.35, severity: "HIGH", nonCompliant: false },
    extreme: { horizonFraction: 0.6, severity: "CRITICAL", nonCompliant: true },
  };

  const impact = fluenceMap[fluence] ?? fluenceMap.moderate;
  const horizonDelta = -Math.round(baselineHorizon * impact.horizonFraction);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: impact.nonCompliant ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: impact.nonCompliant
          ? new Date().toISOString()
          : null,
      },
    ],
    recommendation:
      `Solar particle event (${fluence} fluence). ` +
      (fluence === "extreme"
        ? `Extreme particle fluence — significant total ionizing dose accumulation. ` +
          `Electronics degradation likely. Art. 64 non-compliance expected. ` +
          `Implement radiation safing procedures. Full component assessment required post-event.`
        : fluence === "severe"
          ? `Severe particle environment. Increased SEU rates and cumulative dose. ` +
            `Art. 64 compliance at risk. Monitor error rates in critical avionics. ` +
            `Activate error correction and scrubbing routines.`
          : `Moderate particle event. Art. 64 compliance maintained. ` +
            `Standard radiation monitoring protocols apply. Log total dose contribution.`),
    severityLevel: impact.severity,
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.5),
      pessimistic: Math.round(horizonDelta * 1.8),
    },
  });
}

/**
 * Simulate a debris cloud event (fragmentation, collision, or ASAT test).
 * Proximity determines impact: direct = CRITICAL.
 */
export function runDebrisCloudEvent(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const proximity = (scenario.parameters.proximity as string) ?? "distant";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;

  const proximityMap: Record<
    string,
    {
      horizonFraction: number;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      nonCompliant: boolean;
    }
  > = {
    direct: { horizonFraction: 0.9, severity: "CRITICAL", nonCompliant: true },
    near: { horizonFraction: 0.4, severity: "HIGH", nonCompliant: false },
    moderate: {
      horizonFraction: 0.15,
      severity: "MEDIUM",
      nonCompliant: false,
    },
    distant: { horizonFraction: 0.05, severity: "LOW", nonCompliant: false },
  };

  const impact = proximityMap[proximity] ?? proximityMap.distant;
  const horizonDelta = -Math.round(baselineHorizon * impact.horizonFraction);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: impact.nonCompliant
          ? "NON_COMPLIANT"
          : proximity === "near"
            ? "WARNING"
            : baseline.modules.subsystems.status,
        crossingDateBefore: null,
        crossingDateAfter: impact.nonCompliant
          ? new Date().toISOString()
          : null,
      },
      {
        regulationRef: "eu_space_act_art_68",
        statusBefore: baseline.modules.orbital.status,
        statusAfter: impact.nonCompliant
          ? "NON_COMPLIANT"
          : proximity === "near"
            ? "WARNING"
            : baseline.modules.orbital.status,
        crossingDateBefore: null,
        crossingDateAfter: null,
      },
    ],
    recommendation:
      proximity === "direct"
        ? `Direct exposure to debris cloud — high probability of impact. CRITICAL per Art. 64 and Art. 68. ` +
          `Execute emergency collision avoidance if possible. Assess satellite health post-event. ` +
          `Multiple conjunction events likely over coming weeks.`
        : proximity === "near"
          ? `Debris cloud in proximity. Elevated collision risk over extended period. ` +
            `Art. 64 and Art. 68 compliance requires enhanced conjunction screening. ` +
            `Increase maneuver readiness level. Coordinate with Space Surveillance network.`
          : `Debris cloud at ${proximity} range. Limited direct risk. ` +
            `Monitor catalog updates for new tracked objects. Art. 64/68 compliance maintained. ` +
            `Long-term environment degradation may increase future CA frequency.`,
    severityLevel: impact.severity,
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.5),
      pessimistic: Math.round(horizonDelta * 2.0),
    },
  });
}

/**
 * Simulate a micrometeoroid impact.
 * Surface impact vs penetrating impact (penetrating = CRITICAL).
 */
export function runMicrometeroidImpact(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const impactType = (scenario.parameters.impactType as string) ?? "surface";

  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const isPenetrating = impactType === "penetrating";

  const horizonDelta = isPenetrating
    ? -Math.round(baselineHorizon * 0.7)
    : -Math.round(baselineHorizon * 0.1);
  const projectedHorizon = Math.max(0, baselineHorizon + horizonDelta);

  return buildResult(scenario, baseline, {
    projectedHorizon,
    horizonDelta,
    affectedRegulations: [
      {
        regulationRef: "eu_space_act_art_64",
        statusBefore: baseline.modules.subsystems.status,
        statusAfter: isPenetrating ? "NON_COMPLIANT" : "WARNING",
        crossingDateBefore: null,
        crossingDateAfter: isPenetrating ? new Date().toISOString() : null,
      },
    ],
    recommendation: isPenetrating
      ? `Penetrating micrometeoroid impact — structural integrity compromised. CRITICAL per Art. 64. ` +
        `Potential pressure loss, fluid leaks, or component damage. ` +
        `Perform immediate subsystem health assessment. Risk of secondary debris generation.`
      : `Surface micrometeoroid impact. Minor surface damage (solar cell, thermal blanket). ` +
        `Art. 64 compliance maintained. Monitor affected area via telemetry for progressive degradation.`,
    severityLevel: isPenetrating ? "CRITICAL" : "MEDIUM",
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.5),
      pessimistic: Math.round(horizonDelta * 1.5),
    },
  });
}

/**
 * Simulate electrostatic discharge event.
 * Moderate impact, reduces horizon by ~10%.
 */
export function runElectrostaticDischarge(
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
): WhatIfResult {
  const baselineHorizon =
    baseline.complianceHorizon.daysUntilFirstBreach ?? 9999;
  const horizonDelta = -Math.round(baselineHorizon * 0.1);
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
      `Electrostatic discharge event detected. ~${Math.abs(horizonDelta)}-day horizon reduction. ` +
      `Art. 64 compliance maintained at WARNING level. Monitor for recurring ESD events ` +
      `(surface charging in eclipse exit). Review grounding and charge dissipation design. ` +
      `Increase telemetry monitoring for anomalous resets or sensor glitches.`,
    severityLevel: "MEDIUM",
    confidenceBand: {
      optimistic: Math.round(horizonDelta * 0.5),
      pessimistic: Math.round(horizonDelta * 2.0),
    },
  });
}
