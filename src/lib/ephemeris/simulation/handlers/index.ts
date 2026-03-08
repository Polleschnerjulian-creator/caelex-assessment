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

// ─── ISOS Handlers ──────────────────────────────────────────────────────────
import {
  runApproachAbort,
  runKeepoutZoneViolation,
  runRelativeNavFailure,
  runCaptureMechanismFailure,
  runTargetTumbleIncrease,
  runTargetDebrisCloud,
  runTargetNonCooperation,
  runIsosAuthorizationChange,
  runDebrisRemediationOrderIsos,
  runOosStandardChange,
} from "./isos";

// ─── LSO Handlers ───────────────────────────────────────────────────────────
import {
  runPadDamage,
  runRangeRadarFailure,
  runFtsSystemFailure,
  runWeatherStationOutage,
  runNoiseComplianceViolation,
  runEmissionLimitBreach,
  runWildlifeImpactAssessment,
  runSiteLicenseConditionChange,
  runAirspaceRestrictionChange,
  runNotamConflict,
} from "./lso";

// ─── CAP Handlers ──────────────────────────────────────────────────────────
import {
  runCapServiceOutage,
  runCapCapacityDegradation,
  runCapSlaBreach,
  runCapGroundSegmentFailure,
  runCapBandwidthSaturation,
  runCapCustomerMigration,
  runCapNis2ClassificationChange,
  runCapDataSovereigntyChange,
} from "./cap";

// ─── PDP Handlers ──────────────────────────────────────────────────────────
import {
  runPdpDataBreach,
  runPdpGroundStationOutage,
  runPdpQualityDegradation,
  runPdpArchiveCorruption,
  runPdpDistributionViolation,
  runPdpNis2ClassificationChange,
  runPdpDataSovereigntyChange,
} from "./pdp";

// ─── TCO Handlers ──────────────────────────────────────────────────────────
import {
  runTcoCommandLinkLoss,
  runTcoTrackingAccuracyDegradation,
  runTcoGroundStationFailure,
  runTcoAntennaFailure,
  runTcoTimingSynchronizationLoss,
  runTcoCommandAuthenticationBreach,
  runTcoNis2ClassificationChange,
  runTcoInteroperabilityFailure,
} from "./tco";

// ─── Dependency Handlers ────────────────────────────────────────────────────
import { runDependencyFailure } from "./dependency";

// ─── Launch Operator Handlers ───────────────────────────────────────────────
import {
  runLoLaunchDelay,
  runLoLaunchWindowChange,
  runLoPadTurnaroundDelay,
  runLoMultiManifestChange,
  runLoEngineAnomaly,
  runLoFtsActivation,
  runLoStageSeparationAnomaly,
  runLoFairingFailure,
  runLoUpperStageRestartFailure,
  runLoRangeSafetyViolation,
  runLoWeatherDelay,
  runLoEnvironmentalProtest,
  runLoOverflightRestriction,
  runLoLaunchLicenseConditionChange,
  runLoPayloadClassificationChange,
  runLoTechnologyTransferIssue,
} from "./launch";

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

  // ISOS
  ISOS_APPROACH_ABORT: runApproachAbort,
  ISOS_KEEPOUT_ZONE_VIOLATION: runKeepoutZoneViolation,
  ISOS_RELATIVE_NAV_FAILURE: runRelativeNavFailure,
  ISOS_CAPTURE_MECHANISM_FAILURE: runCaptureMechanismFailure,
  ISOS_TARGET_TUMBLE_INCREASE: runTargetTumbleIncrease,
  ISOS_TARGET_DEBRIS_CLOUD: runTargetDebrisCloud,
  ISOS_TARGET_NON_COOPERATION: runTargetNonCooperation,
  ISOS_AUTHORIZATION_CHANGE: runIsosAuthorizationChange,
  ISOS_DEBRIS_REMEDIATION_ORDER: runDebrisRemediationOrderIsos,
  ISOS_OOS_STANDARD_CHANGE: runOosStandardChange,

  // LSO
  LSO_PAD_DAMAGE: runPadDamage,
  LSO_RANGE_RADAR_FAILURE: runRangeRadarFailure,
  LSO_FTS_SYSTEM_FAILURE: runFtsSystemFailure,
  LSO_WEATHER_STATION_OUTAGE: runWeatherStationOutage,
  LSO_NOISE_COMPLIANCE_VIOLATION: runNoiseComplianceViolation,
  LSO_EMISSION_LIMIT_BREACH: runEmissionLimitBreach,
  LSO_WILDLIFE_IMPACT_ASSESSMENT: runWildlifeImpactAssessment,
  LSO_SITE_LICENSE_CONDITION_CHANGE: runSiteLicenseConditionChange,
  LSO_AIRSPACE_RESTRICTION_CHANGE: runAirspaceRestrictionChange,
  LSO_NOTAM_CONFLICT: runNotamConflict,

  // CAP
  CAP_SERVICE_OUTAGE: runCapServiceOutage,
  CAP_CAPACITY_DEGRADATION: runCapCapacityDegradation,
  CAP_SLA_BREACH: runCapSlaBreach,
  CAP_GROUND_SEGMENT_FAILURE: runCapGroundSegmentFailure,
  CAP_BANDWIDTH_SATURATION: runCapBandwidthSaturation,
  CAP_CUSTOMER_MIGRATION: runCapCustomerMigration,
  CAP_NIS2_CLASSIFICATION_CHANGE: runCapNis2ClassificationChange,
  CAP_DATA_SOVEREIGNTY_CHANGE: runCapDataSovereigntyChange,

  // PDP
  PDP_DATA_BREACH: runPdpDataBreach,
  PDP_GROUND_STATION_OUTAGE: runPdpGroundStationOutage,
  PDP_QUALITY_DEGRADATION: runPdpQualityDegradation,
  PDP_ARCHIVE_CORRUPTION: runPdpArchiveCorruption,
  PDP_DISTRIBUTION_VIOLATION: runPdpDistributionViolation,
  PDP_NIS2_CLASSIFICATION_CHANGE: runPdpNis2ClassificationChange,
  PDP_DATA_SOVEREIGNTY_CHANGE: runPdpDataSovereigntyChange,

  // TCO
  TCO_COMMAND_LINK_LOSS: runTcoCommandLinkLoss,
  TCO_TRACKING_ACCURACY_DEGRADATION: runTcoTrackingAccuracyDegradation,
  TCO_GROUND_STATION_FAILURE: runTcoGroundStationFailure,
  TCO_ANTENNA_FAILURE: runTcoAntennaFailure,
  TCO_TIMING_SYNCHRONIZATION_LOSS: runTcoTimingSynchronizationLoss,
  TCO_COMMAND_AUTHENTICATION_BREACH: runTcoCommandAuthenticationBreach,
  TCO_NIS2_CLASSIFICATION_CHANGE: runTcoNis2ClassificationChange,
  TCO_INTEROPERABILITY_FAILURE: runTcoInteroperabilityFailure,

  // Launch Operator
  LO_LAUNCH_DELAY: runLoLaunchDelay,
  LO_LAUNCH_WINDOW_CHANGE: runLoLaunchWindowChange,
  LO_PAD_TURNAROUND_DELAY: runLoPadTurnaroundDelay,
  LO_MULTI_MANIFEST_CHANGE: runLoMultiManifestChange,
  LO_ENGINE_ANOMALY: runLoEngineAnomaly,
  LO_FTS_ACTIVATION: runLoFtsActivation,
  LO_STAGE_SEPARATION_ANOMALY: runLoStageSeparationAnomaly,
  LO_FAIRING_FAILURE: runLoFairingFailure,
  LO_UPPER_STAGE_RESTART_FAILURE: runLoUpperStageRestartFailure,
  LO_RANGE_SAFETY_VIOLATION: runLoRangeSafetyViolation,
  LO_WEATHER_DELAY: runLoWeatherDelay,
  LO_ENVIRONMENTAL_PROTEST: runLoEnvironmentalProtest,
  LO_OVERFLIGHT_RESTRICTION: runLoOverflightRestriction,
  LO_LAUNCH_LICENSE_CONDITION_CHANGE: runLoLaunchLicenseConditionChange,
  LO_PAYLOAD_CLASSIFICATION_CHANGE: runLoPayloadClassificationChange,
  LO_TECHNOLOGY_TRANSFER_ISSUE: runLoTechnologyTransferIssue,

  // Cross-Type Dependencies
  DEPENDENCY_FAILURE: runDependencyFailure,
};
