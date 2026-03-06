import "server-only";
import type {
  WhatIfScenario,
  WhatIfResult,
  SatelliteComplianceStateInternal,
} from "../../core/types";

// ─── Orbital Handlers ────────────────────────────────────────────────────────
import {
  runOrbitLower,
  runOrbitPlaneChange,
  runOrbitalSlotChange,
  runCollisionAvoidance,
  runDeorbitExecute,
  runConstellationResize,
  runAtmosphericDragIncrease,
} from "./orbital";

// ─── Hardware Handlers ───────────────────────────────────────────────────────
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

// ─── Environment Handlers ────────────────────────────────────────────────────
import {
  runSolarStorm,
  runCoronalMassEjection,
  runSolarParticleEvent,
  runDebrisCloudEvent,
  runMicrometeroidImpact,
  runElectrostaticDischarge,
} from "./environment";

// ─── Communication Handlers ──────────────────────────────────────────────────
import {
  runCommFailure,
  runGroundStationLoss,
  runFrequencyInterference,
  runCyberIncident,
  runDataBreach,
} from "./communication";

// ─── Regulatory Handlers ─────────────────────────────────────────────────────
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

// ─── Operational Handlers ────────────────────────────────────────────────────
import {
  runLaunchDelay,
  runMissionScopeChange,
  runSoftwareAnomaly,
  runServiceInterruption,
  runOperationsTeamChange,
  runFrequencyBandMigration,
} from "./operational";

// ─── Financial Handlers ──────────────────────────────────────────────────────
import {
  runInsurancePremiumIncrease,
  runSupplyChainDisruption,
  runSanctionsExportControl,
  runBudgetCut,
  runPartnerDefault,
} from "./financial";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScenarioHandler = (
  baseline: SatelliteComplianceStateInternal,
  scenario: WhatIfScenario,
) => WhatIfResult;

// ─── Handler Registry ────────────────────────────────────────────────────────

export const SCENARIO_HANDLERS: Record<string, ScenarioHandler> = {
  // Orbital Mechanics
  ORBIT_LOWER: runOrbitLower,
  ORBIT_PLANE_CHANGE: runOrbitPlaneChange,
  ORBITAL_SLOT_CHANGE: runOrbitalSlotChange,
  COLLISION_AVOIDANCE: runCollisionAvoidance,
  DEORBIT_EXECUTE: runDeorbitExecute,
  CONSTELLATION_RESIZE: runConstellationResize,
  ATMOSPHERIC_DRAG_INCREASE: runAtmosphericDragIncrease,

  // Hardware Failures
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

  // Space Environment
  SOLAR_STORM: runSolarStorm,
  CORONAL_MASS_EJECTION: runCoronalMassEjection,
  SOLAR_PARTICLE_EVENT: runSolarParticleEvent,
  DEBRIS_CLOUD_EVENT: runDebrisCloudEvent,
  MICROMETEOROID_IMPACT: runMicrometeroidImpact,
  ELECTROSTATIC_DISCHARGE: runElectrostaticDischarge,

  // Communication & Data
  COMM_FAILURE: runCommFailure,
  GROUND_STATION_LOSS: runGroundStationLoss,
  FREQUENCY_INTERFERENCE: runFrequencyInterference,
  CYBER_INCIDENT: runCyberIncident,
  DATA_BREACH: runDataBreach,

  // Regulatory & Legal
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

  // Financial & Business
  INSURANCE_PREMIUM_INCREASE: runInsurancePremiumIncrease,
  SUPPLY_CHAIN_DISRUPTION: runSupplyChainDisruption,
  SANCTIONS_EXPORT_CONTROL: runSanctionsExportControl,
  BUDGET_CUT: runBudgetCut,
  PARTNER_DEFAULT: runPartnerDefault,
};
