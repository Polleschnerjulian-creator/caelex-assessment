import "server-only";
import type { PrismaClient } from "@prisma/client";
import { safeLog } from "@/lib/verity/utils/redaction";
import type {
  ForecastCurve,
  ComplianceEvent,
  SatelliteComplianceStateInternal,
  OrbitalElements,
  SentinelTimeSeries,
  Confidence,
} from "../core/types";
import { calculateComplianceHorizon } from "./compliance-horizon";
import { buildForecastCurve, timeSeriestoHistorical } from "./forecast-curve";

// Data adapters
import { getSentinelTimeSeries } from "../data/sentinel-adapter";
import { getCurrentF107 } from "../data/solar-flux-adapter";
import { getOrbitalElements } from "../data/celestrak-adapter";

// Prediction models
import {
  predictOrbitalDecay,
  getOrbitalDecayFactors,
} from "../models/orbital-decay";
import {
  predictFuelDepletion,
  getFuelDepletionFactors,
} from "../models/fuel-depletion";
import {
  predictSubsystemHealth,
  getSubsystemFactors,
} from "../models/subsystem-degradation";

/**
 * Forecast Engine
 *
 * Orchestrates all prediction models to generate:
 * 1. ForecastCurve[] — time-series projections for each metric
 * 2. ComplianceEvent[] — predicted compliance events
 * 3. ComplianceHorizon — days until first breach
 */

export interface ForecastResult {
  forecastCurves: ForecastCurve[];
  complianceEvents: ComplianceEvent[];
  horizonDays: number | null;
  f107Used: number;
}

/**
 * Generate complete forecast for a satellite.
 */
export async function generateForecast(
  prisma: PrismaClient,
  orgId: string,
  noradId: string,
  launchDate: Date | null,
): Promise<ForecastResult> {
  safeLog("Generating forecast", { orgId, noradId });

  // Load data
  const [
    orbitalElements,
    f107,
    fuelSeries,
    thrusterSeries,
    batterySeries,
    solarSeries,
  ] = await Promise.all([
    getOrbitalElements(noradId),
    getCurrentF107(),
    getSentinelTimeSeries(prisma, orgId, noradId, "remaining_fuel_pct"),
    getSentinelTimeSeries(prisma, orgId, noradId, "thruster_status"),
    getSentinelTimeSeries(prisma, orgId, noradId, "battery_state_of_charge"),
    getSentinelTimeSeries(prisma, orgId, noradId, "solar_array_power_pct"),
  ]);

  const missionAgeDays = launchDate
    ? Math.floor((Date.now() - launchDate.getTime()) / (24 * 60 * 60 * 1000))
    : 365;

  const forecastCurves: ForecastCurve[] = [];
  const complianceEvents: ComplianceEvent[] = [];

  // ─── Orbital Decay Forecast ─────────────────────────────────────
  if (orbitalElements) {
    const decayForecast = predictOrbitalDecay(orbitalElements, f107);
    const decayFactors = getOrbitalDecayFactors(decayForecast);

    // Build altitude curve
    forecastCurves.push(
      buildForecastCurve(
        decayFactors[1]!, // altitude factor
        "orbital_decay",
        [], // No historical for derived data
        decayForecast.altitudeCurve,
        null,
      ),
    );

    // Reentry event
    if (decayForecast.reentryDate) {
      const daysToReentry = Math.floor(
        (new Date(decayForecast.reentryDate).getTime() - Date.now()) /
          (24 * 60 * 60 * 1000),
      );
      complianceEvents.push({
        id: `orbital_reentry_${noradId}`,
        date: decayForecast.reentryDate,
        daysFromNow: daysToReentry,
        regulationRef: "eu_space_act_art_68",
        regulationName: "Orbital Lifetime / Reentry",
        eventType: "BREACH",
        severity: "CRITICAL",
        description: `Predicted destructive reentry in ${daysToReentry} days`,
        recommendedAction: "Plan controlled deorbit or orbit raise maneuver",
        confidence: decayForecast.confidence,
        model: "orbital_decay",
      });
    }
  }

  // ─── Fuel Depletion Forecast ────────────────────────────────────
  if (fuelSeries.points.length >= 2) {
    const fuelForecast = predictFuelDepletion(fuelSeries);
    const fuelFactors = getFuelDepletionFactors(fuelForecast);

    // Build fuel curve
    if (fuelForecast.fuelCurve.length > 0) {
      forecastCurves.push(
        buildForecastCurve(
          fuelFactors[0]!, // Art. 70 passivation factor
          "fuel_depletion",
          timeSeriestoHistorical(
            fuelSeries.points.slice(-30).map((p) => ({
              timestamp: p.timestamp,
              value: p.value,
            })),
          ),
          fuelForecast.fuelCurve.filter((p) => !p.isHistorical),
          "eu_space_act_art_70",
        ),
      );
    }

    // Threshold crossing events
    for (const crossing of fuelForecast.thresholdCrossings) {
      if (crossing.daysFromNow.nominal > 0) {
        complianceEvents.push({
          id: `fuel_${crossing.regulationRef}_${noradId}`,
          date: crossing.crossingDate.nominal,
          daysFromNow: crossing.daysFromNow.nominal,
          regulationRef: crossing.regulationRef,
          regulationName: `Fuel below ${crossing.thresholdPct}%`,
          eventType: "WARNING",
          severity:
            crossing.daysFromNow.nominal < 90
              ? "CRITICAL"
              : crossing.daysFromNow.nominal < 365
                ? "HIGH"
                : "MEDIUM",
          description: `Fuel projected to drop below ${crossing.thresholdPct}% in ${crossing.daysFromNow.nominal} days`,
          recommendedAction:
            crossing.thresholdPct >= 25
              ? "Begin end-of-life disposal planning"
              : "Initiate passivation sequence planning",
          confidence: fuelForecast.confidence,
          model: "fuel_depletion",
        });
      }
    }
  }

  // ─── Subsystem Degradation Forecast ─────────────────────────────
  const subsystemForecast = predictSubsystemHealth(
    thrusterSeries.points.length > 0 ? thrusterSeries : null,
    batterySeries.points.length > 0 ? batterySeries : null,
    solarSeries.points.length > 0 ? solarSeries : null,
    missionAgeDays,
  );

  // Battery critical date event
  if (subsystemForecast.battery.criticalDate) {
    const daysToEvent = Math.floor(
      (new Date(subsystemForecast.battery.criticalDate).getTime() -
        Date.now()) /
        (24 * 60 * 60 * 1000),
    );
    if (daysToEvent > 0) {
      complianceEvents.push({
        id: `battery_critical_${noradId}`,
        date: subsystemForecast.battery.criticalDate,
        daysFromNow: daysToEvent,
        regulationRef: "eu_space_act_art_64",
        regulationName: "Battery Critical Capacity",
        eventType: "WARNING",
        severity: daysToEvent < 180 ? "HIGH" : "MEDIUM",
        description: `Battery capacity projected to reach critical level in ${daysToEvent} days`,
        recommendedAction:
          "Review power budget and consider operational adjustments",
        confidence:
          subsystemForecast.battery.status !== "UNKNOWN" ? "MEDIUM" : "LOW",
        model: "subsystem_degradation",
      });
    }
  }

  // Solar array critical date event
  if (subsystemForecast.solarArray.criticalDate) {
    const daysToEvent = Math.floor(
      (new Date(subsystemForecast.solarArray.criticalDate).getTime() -
        Date.now()) /
        (24 * 60 * 60 * 1000),
    );
    if (daysToEvent > 0) {
      complianceEvents.push({
        id: `solar_critical_${noradId}`,
        date: subsystemForecast.solarArray.criticalDate,
        daysFromNow: daysToEvent,
        regulationRef: "eu_space_act_art_64",
        regulationName: "Solar Array Critical Power",
        eventType: "WARNING",
        severity: daysToEvent < 180 ? "HIGH" : "MEDIUM",
        description: `Solar array output projected to reach critical level in ${daysToEvent} days`,
        recommendedAction: "Review power budget and duty cycle adjustments",
        confidence:
          subsystemForecast.solarArray.status !== "UNKNOWN" ? "MEDIUM" : "LOW",
        model: "subsystem_degradation",
      });
    }
  }

  // Sort events by days from now (most urgent first)
  complianceEvents.sort((a, b) => a.daysFromNow - b.daysFromNow);

  // Calculate horizon from all factors
  const allFactors = [
    ...(orbitalElements
      ? getOrbitalDecayFactors(predictOrbitalDecay(orbitalElements, f107))
      : []),
    ...(fuelSeries.points.length >= 2
      ? getFuelDepletionFactors(predictFuelDepletion(fuelSeries))
      : []),
    ...getSubsystemFactors(subsystemForecast),
  ];

  const horizon =
    complianceEvents.length > 0 ? complianceEvents[0]!.daysFromNow : null;

  return {
    forecastCurves,
    complianceEvents,
    horizonDays: horizon,
    f107Used: f107,
  };
}
