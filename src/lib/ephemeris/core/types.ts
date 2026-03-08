// ═══════════════════════════════════════════════════════════════════════════════
// EPHEMERIS — Predictive Compliance Intelligence Types
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Status Enums (string literal unions) ────────────────────────────────────

export type ModuleStatus =
  | "COMPLIANT"
  | "WARNING"
  | "NON_COMPLIANT"
  | "UNKNOWN";
export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type DataFreshness = "LIVE" | "RECENT" | "STALE" | "NO_DATA";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type DataSource =
  | "sentinel"
  | "assessment"
  | "verity"
  | "derived"
  | "none";
export type ForecastModel =
  | "orbital_decay"
  | "fuel_depletion"
  | "subsystem_degradation"
  | "deadline"
  | "regulatory";

export type AlertType =
  | "FUEL_LOW"
  | "THRUSTER_DEGRADED"
  | "ORBIT_DECAY"
  | "ATTESTATION_EXPIRING"
  | "CERT_EXPIRING"
  | "DEADLINE_APPROACHING"
  | "REGULATORY_CHANGE"
  | "DATA_STALE"
  | "HORIZON_SHORTENED"
  | "CA_EVENT"
  | "DEPENDENCY_IMPACT";

export type EventType =
  | "BREACH"
  | "WARNING"
  | "DEADLINE"
  | "EXPIRY"
  | "REGULATORY_CHANGE";

export type SubsystemStatus = "NOMINAL" | "DEGRADING" | "CRITICAL" | "UNKNOWN";

// ─── Compliance Factors ──────────────────────────────────────────────────────

/** Public-facing compliance factor — NO currentValue (data leakage prevention) */
export interface ComplianceFactor {
  id: string;
  name: string;
  regulationRef: string;
  thresholdValue: number;
  thresholdType: "ABOVE" | "BELOW";
  unit: string;
  status: ModuleStatus;
  source: DataSource;
  confidence: number; // 0-1
  lastMeasured: string | null;
  daysToThreshold: number | null;
}

/** Internal compliance factor — includes currentValue for computation only */
export interface ComplianceFactorInternal extends ComplianceFactor {
  currentValue: number | null;
}

// ─── Module Scores ───────────────────────────────────────────────────────────

/** Public module score — factors are sanitized */
export interface ModuleScore {
  score: number; // 0-100
  status: ModuleStatus;
  factors: ComplianceFactor[];
  dataSource: DataSource;
  lastUpdated: string | null;
}

/** Internal module score — factors contain currentValue */
export interface ModuleScoreInternal extends Omit<ModuleScore, "factors"> {
  factors: ComplianceFactorInternal[];
}

// ─── Module Keys ─────────────────────────────────────────────────────────────

export type ModuleKey =
  | "orbital"
  | "fuel"
  | "subsystems"
  | "cyber"
  | "ground"
  | "documentation"
  | "insurance"
  | "registration";

export type ModuleScores = Record<ModuleKey, ModuleScore>;
export type ModuleScoresInternal = Record<ModuleKey, ModuleScoreInternal>;

// ─── Data Sources Status ─────────────────────────────────────────────────────

export interface DataSourcesStatus {
  sentinel: {
    connected: boolean;
    lastPacket: string | null;
    packetsLast24h: number;
  };
  verity: {
    attestations: number;
    latestTrustLevel: string | null;
  };
  assessment: {
    completedModules: number;
    totalModules: number;
    lastUpdated: string | null;
  };
  celestrak: {
    lastTle: string | null;
    tleAge: number | null; // Minutes since last TLE
  };
}

// ─── Compliance Horizon ──────────────────────────────────────────────────────

export interface ComplianceHorizon {
  daysUntilFirstBreach: number | null; // null = no breach predictable
  firstBreachRegulation: string | null;
  firstBreachType: string | null;
  confidence: Confidence;
}

// ─── Satellite Alert ─────────────────────────────────────────────────────────

export interface SatelliteAlert {
  id: string;
  noradId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  regulationRef: string | null;
  triggeredAt: string;
  resolvedAt: string | null;
  acknowledged: boolean;
}

// ─── Satellite Compliance State ──────────────────────────────────────────────

/** Public-facing state — returned from API endpoints */
export interface SatelliteComplianceState {
  noradId: string;
  satelliteName: string;
  operatorId: string;
  overallScore: number; // 0-100
  modules: ModuleScores;
  dataSources: DataSourcesStatus;
  complianceHorizon: ComplianceHorizon;
  activeAlerts: SatelliteAlert[];
  calculatedAt: string;
  dataFreshness: DataFreshness;
}

/** Internal state — includes currentValue in all factors */
export type SatelliteComplianceStateInternal = Omit<
  SatelliteComplianceState,
  "modules"
> & {
  modules: ModuleScoresInternal;
};

// ─── Forecast Types ──────────────────────────────────────────────────────────

export interface ForecastPoint {
  date: string; // ISO 8601
  nominal: number;
  bestCase: number;
  worstCase: number;
  isHistorical: boolean;
}

export interface ForecastCurve {
  regulationRef: string;
  regulationName: string;
  metric: string;
  unit: string;
  thresholdValue: number;
  thresholdType: "ABOVE" | "BELOW";
  dataPoints: ForecastPoint[];
  crossingDate: string | null;
  crossingDaysFromNow: number | null;
  confidence: Confidence;
  model: ForecastModel;
}

export interface ComplianceEvent {
  id: string;
  date: string;
  daysFromNow: number;
  regulationRef: string;
  regulationName: string;
  eventType: EventType;
  severity: AlertSeverity;
  description: string;
  recommendedAction: string;
  confidence: Confidence;
  model: string;
}

// ─── Prediction Model Outputs ────────────────────────────────────────────────

export interface OrbitalDecayForecast {
  currentAltitudeKm: number;
  estimatedLifetimeYears: number;
  altitudeCurve: ForecastPoint[];
  art68Status: ModuleStatus;
  art68CrossingDate: string | null;
  reentryDate: string | null;
  confidence: Confidence;
}

export interface FuelDepletionForecast {
  currentFuelPct: number;
  consumptionRatePerDay: {
    nominal: number;
    withCA: number;
    worstCase: number;
  };
  fuelCurve: ForecastPoint[];
  thresholdCrossings: Array<{
    regulationRef: string;
    thresholdPct: number;
    crossingDate: {
      bestCase: string;
      nominal: string;
      worstCase: string;
    };
    daysFromNow: {
      bestCase: number;
      nominal: number;
      worstCase: number;
    };
  }>;
  disposalDecisionDeadline: string | null;
  confidence: Confidence;
}

export interface SubsystemForecast {
  thruster: {
    status: SubsystemStatus;
    degradedEventFrequency: number | null;
    failureProbability12m: number | null;
    complianceImpact: string[];
  };
  battery: {
    status: SubsystemStatus;
    capacityTrend: number | null; // % loss per year
    criticalDate: string | null;
  };
  solarArray: {
    status: SubsystemStatus;
    powerTrend: number | null; // % loss per year
    criticalDate: string | null;
  };
  overallSubsystemHealth: number; // 0-100
}

export interface DeadlineEvent {
  regulationRef: string;
  name: string;
  eventType: "EXPIRY" | "OVERDUE" | "RENEWAL" | "REVIEW";
  dueDate: string;
  daysFromNow: number;
  leadTimeDays: number;
  warningDate: string;
  isOverdue: boolean;
  severity: AlertSeverity;
  recommendedAction: string;
}

export interface RegulatoryChangeImpact {
  event: {
    id: string;
    title: string;
    eurLexUrl: string;
    publishedAt: string;
    severity: AlertSeverity;
  };
  affectedSatellites: Array<{
    noradId: string;
    name: string;
    impactType:
      | "NEW_REQUIREMENT"
      | "THRESHOLD_CHANGE"
      | "DEADLINE_CHANGE"
      | "EXEMPTION";
    scoreDelta: number;
    details: string;
  }>;
  totalAffected: number;
  worstCaseImpact: string;
}

// ─── Data Adapter Types ──────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  timestamp: string; // ISO 8601
  value: number;
  source: "orbit" | "cyber" | "ground" | "document";
  verified: boolean;
  trustScore: number;
}

export interface SentinelTimeSeries {
  metric: string;
  noradId: string;
  points: TimeSeriesPoint[];
}

export interface OrbitalElements {
  noradId: string;
  epoch: string;
  semiMajorAxisKm: number;
  eccentricity: number;
  inclinationDeg: number;
  raanDeg: number;
  argPerigeeDeg: number;
  meanAnomalyDeg: number;
  meanMotion: number; // rev/day
  bstar: number;
  altitudeKm: number; // Derived: sma - EARTH_RADIUS_KM
  periodMinutes: number;
}

export interface VerityAttestationSummary {
  attestationId: string;
  regulationRef: string;
  dataPoint: string;
  result: boolean;
  trustScore: number;
  trustLevel: string;
  issuedAt: string;
  expiresAt: string;
}

export interface AssessmentDataBundle {
  debris: {
    deorbitPlanExists: boolean;
    passivationPlanExists: boolean;
    lastUpdated: string | null;
  } | null;
  cyber: {
    patchCompliancePct: number | null;
    mfaAdoptionPct: number | null;
    criticalVulns: number | null;
    lastUpdated: string | null;
  } | null;
  insurance: {
    hasActivePolicy: boolean;
    coverageEur: number | null;
    expiresAt: string | null;
    lastUpdated: string | null;
  } | null;
  environmental: {
    impactAssessed: boolean;
    lastUpdated: string | null;
  } | null;
  nis2: {
    isEssential: boolean | null;
    complianceScore: number | null;
    lastUpdated: string | null;
  } | null;
}

// ─── Jurisdiction Simulation Types ───────────────────────────────────────────

export interface JurisdictionProfile {
  code: string;
  name: string;
  authority: string;
  nationalSpaceLaw: string;
  euMember: boolean;
  esaMember: boolean;
  specificRequirements: JurisdictionRequirement[];
  approvalDuration: string;
  frequencyAuthority: string;
}

export interface JurisdictionRequirement {
  regulationRef: string;
  name: string;
  jurisdiction: string;
  category: string;
}

export interface JurisdictionRequirementChange {
  regulationRef: string;
  name: string;
  changeType: "STRICTER" | "LOOSER" | "DIFFERENT";
  before: string;
  after: string;
}

export interface JurisdictionSimulation {
  fromJurisdiction: string;
  toJurisdiction: string;
  satellite: { noradId: string; name: string };
  complianceDelta: {
    scoreBefore: number;
    scoreAfter: number;
    scoreDelta: number;
  };
  requirementsAdded: JurisdictionRequirement[];
  requirementsRemoved: JurisdictionRequirement[];
  requirementsChanged: JurisdictionRequirementChange[];
  requirementsUnchanged: number;
  documentsNeeded: string[];
  documentsRemoved: string[];
  documentsModified: string[];
  estimatedTimeline: {
    approvalDuration: string;
    additionalComplianceWork: string;
  };
  regulatoryAuthority: {
    current: string;
    new: string;
  };
}

// ─── What-If Types ───────────────────────────────────────────────────────────

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
  // ISOS-specific
  | "ISOS_APPROACH_ABORT"
  | "ISOS_KEEPOUT_ZONE_VIOLATION"
  | "ISOS_RELATIVE_NAV_FAILURE"
  | "ISOS_CAPTURE_MECHANISM_FAILURE"
  | "ISOS_TARGET_TUMBLE_INCREASE"
  | "ISOS_TARGET_DEBRIS_CLOUD"
  | "ISOS_TARGET_NON_COOPERATION"
  | "ISOS_AUTHORIZATION_CHANGE"
  | "ISOS_DEBRIS_REMEDIATION_ORDER"
  | "ISOS_OOS_STANDARD_CHANGE"
  // LSO-specific
  | "LSO_PAD_DAMAGE"
  | "LSO_RANGE_RADAR_FAILURE"
  | "LSO_FTS_SYSTEM_FAILURE"
  | "LSO_WEATHER_STATION_OUTAGE"
  | "LSO_NOISE_COMPLIANCE_VIOLATION"
  | "LSO_EMISSION_LIMIT_BREACH"
  | "LSO_WILDLIFE_IMPACT_ASSESSMENT"
  | "LSO_SITE_LICENSE_CONDITION_CHANGE"
  | "LSO_AIRSPACE_RESTRICTION_CHANGE"
  | "LSO_NOTAM_CONFLICT"
  // Launch Operations (LO-specific)
  | "LO_LAUNCH_DELAY"
  | "LO_LAUNCH_WINDOW_CHANGE"
  | "LO_PAD_TURNAROUND_DELAY"
  | "LO_MULTI_MANIFEST_CHANGE"
  | "LO_ENGINE_ANOMALY"
  | "LO_FTS_ACTIVATION"
  | "LO_STAGE_SEPARATION_ANOMALY"
  | "LO_FAIRING_FAILURE"
  | "LO_UPPER_STAGE_RESTART_FAILURE"
  | "LO_RANGE_SAFETY_VIOLATION"
  | "LO_WEATHER_DELAY"
  | "LO_ENVIRONMENTAL_PROTEST"
  | "LO_OVERFLIGHT_RESTRICTION"
  | "LO_LAUNCH_LICENSE_CONDITION_CHANGE"
  | "LO_PAYLOAD_CLASSIFICATION_CHANGE"
  | "LO_TECHNOLOGY_TRANSFER_ISSUE"
  // CAP-specific
  | "CAP_SERVICE_OUTAGE"
  | "CAP_CAPACITY_DEGRADATION"
  | "CAP_SLA_BREACH"
  | "CAP_GROUND_SEGMENT_FAILURE"
  | "CAP_BANDWIDTH_SATURATION"
  | "CAP_CUSTOMER_MIGRATION"
  | "CAP_NIS2_CLASSIFICATION_CHANGE"
  | "CAP_DATA_SOVEREIGNTY_CHANGE"
  // PDP-specific
  | "PDP_DATA_BREACH"
  | "PDP_GROUND_STATION_OUTAGE"
  | "PDP_QUALITY_DEGRADATION"
  | "PDP_ARCHIVE_CORRUPTION"
  | "PDP_DISTRIBUTION_VIOLATION"
  | "PDP_NIS2_CLASSIFICATION_CHANGE"
  | "PDP_DATA_SOVEREIGNTY_CHANGE"
  // TCO-specific
  | "TCO_COMMAND_LINK_LOSS"
  | "TCO_TRACKING_ACCURACY_DEGRADATION"
  | "TCO_GROUND_STATION_FAILURE"
  | "TCO_ANTENNA_FAILURE"
  | "TCO_TIMING_SYNCHRONIZATION_LOSS"
  | "TCO_COMMAND_AUTHENTICATION_BREACH"
  | "TCO_NIS2_CLASSIFICATION_CHANGE"
  | "TCO_INTEROPERABILITY_FAILURE"
  // Cross-Type
  | "DEPENDENCY_FAILURE"
  // Legacy
  | "FUEL_BURN"
  | "CONSTELLATION_CHANGE";

export interface WhatIfScenario {
  type: WhatIfScenarioType;
  parameters: Record<string, unknown>;
}

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
  // Enhanced result fields
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
    optimistic: number;
    pessimistic: number;
  };
  timelineProjection?: Array<{
    monthOffset: number;
    baselineScore: number;
    projectedScore: number;
  }>;
}

// ─── Conversion Functions (Data Leakage Prevention) ──────────────────────────

/** Strip currentValue from a factor before API response */
export function toPublicFactor(
  factor: ComplianceFactorInternal,
): ComplianceFactor {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { currentValue, ...publicFactor } = factor;
  return publicFactor;
}

/** Strip currentValue from all module factors before API response */
export function toPublicState(
  state: SatelliteComplianceStateInternal,
): SatelliteComplianceState {
  return {
    ...state,
    modules: Object.fromEntries(
      Object.entries(state.modules).map(([key, mod]) => [
        key,
        {
          ...mod,
          factors: mod.factors.map(toPublicFactor),
        },
      ]),
    ) as ModuleScores,
  };
}

// ─── Operator Entity Types ──────────────────────────────────────────────────

export type { OperatorType } from "@prisma/client";

export interface EntityIdentifiers {
  type: string; // OperatorType string: "SCO" | "LO" | "LSO" | etc.
  noradId?: string; // SCO
  cosparId?: string; // SCO
  vehicleId?: string; // LO
  launchLicenseId?: string; // LO
  facilityId?: string; // LSO, TCO
  siteCode?: string; // LSO
  missionId?: string; // ISOS
  targetNoradId?: string; // ISOS
  serviceId?: string; // CAP
  systemId?: string; // PDP
  networkId?: string; // TCO
}

export interface OperatorEntityInput {
  id: string;
  organizationId: string;
  operatorType: string; // OperatorType string
  name: string;
  identifiers: EntityIdentifiers;
  metadata: Record<string, unknown>;
  jurisdictions: string[];
  status: "ACTIVE" | "PLANNED" | "DECOMMISSIONED";
}

// ─── Module Registry Types ──────────────────────────────────────────────────

export interface ModuleRegistration {
  key: string;
  label: string;
  weight: number;
  safetyCritical: boolean;
  regulationRefs: string[];
  requiredDataSources: DataSource[];
  predictionModel?: string;
}

export type ModuleRegistry = Record<string, ModuleRegistration[]>;

// ─── Launch Operator Types ───────────────────────────────────────────────────

export interface LaunchVehicleProfile {
  vehicleClass: "micro" | "small" | "medium" | "heavy" | "super_heavy";
  payloadCapacityKg: number;
  propulsionType: "solid" | "liquid" | "hybrid";
  stageCount: number;
  reusable: boolean;
  launchSite: string;
  launchSiteJurisdiction: string;
  targetOrbits: string[];
}

export interface LaunchCampaign {
  id: string;
  vehicleEntityId: string;
  campaignName: string;
  targetLaunchDate?: Date;
  launchWindowStart?: Date;
  launchWindowEnd?: Date;
  payloadManifest: PayloadEntry[];
  status: "planning" | "integration" | "on_pad" | "launched" | "scrubbed";
}

export interface PayloadEntry {
  name: string;
  operatorName: string;
  massKg: number;
  classification: "unclassified" | "controlled" | "itar_restricted";
}

export interface LaunchDeadline {
  key: string;
  label: string;
  regulationRef: string;
  frequency: "once" | "per_campaign" | "annual" | "biannual";
  leadTimeDays: number;
  baseSeverity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export type LaunchModuleKey =
  | "launch_authorization"
  | "range_safety"
  | "third_party_liability"
  | "environmental_impact"
  | "payload_integration"
  | "cyber"
  | "documentation"
  | "frequency_coordination"
  | "export_control";

// LO-specific What-If Scenario Types
export type LaunchWhatIfScenarioType =
  // Launch Operations
  | "LO_LAUNCH_DELAY"
  | "LO_LAUNCH_WINDOW_CHANGE"
  | "LO_PAD_TURNAROUND_DELAY"
  | "LO_MULTI_MANIFEST_CHANGE"
  // Vehicle Anomalies
  | "LO_ENGINE_ANOMALY"
  | "LO_FTS_ACTIVATION"
  | "LO_STAGE_SEPARATION_ANOMALY"
  | "LO_FAIRING_FAILURE"
  | "LO_UPPER_STAGE_RESTART_FAILURE"
  // Range & Environment
  | "LO_RANGE_SAFETY_VIOLATION"
  | "LO_WEATHER_DELAY"
  | "LO_ENVIRONMENTAL_PROTEST"
  | "LO_OVERFLIGHT_RESTRICTION"
  // Launch Regulatory
  | "LO_LAUNCH_LICENSE_CONDITION_CHANGE"
  | "LO_PAYLOAD_CLASSIFICATION_CHANGE"
  | "LO_TECHNOLOGY_TRANSFER_ISSUE";

// Launch Jurisdiction Profile for jurisdiction simulator
export interface LaunchJurisdictionProfile {
  name: string;
  primaryLaw: string;
  authority: string;
  primaryLaunchSite: string;
  latitude: number;
  insuranceMinimumEur: number;
  approvalTimelineMonths: number;
  environmentalAssessment: string;
  exportControl: string;
  polarOrbitAccess: string;
  equatorialAccess: string;
  maxLaunchRateYear: number;
  strengths: string[];
  challenges: string[];
}

export interface LaunchJurisdictionSimulation {
  fromJurisdiction: string;
  toJurisdiction: string;
  vehicle: { vehicleId: string; name: string };
  complianceDelta: {
    scoreBefore: number;
    scoreAfter: number;
    scoreDelta: number;
  };
  insuranceDelta: {
    currentMinEur: number;
    newMinEur: number;
    deltaEur: number;
  };
  approvalTimelineDelta: {
    currentMonths: number;
    newMonths: number;
    deltaMonths: number;
  };
  orbitAccessComparison: {
    polar: { current: string; new: string };
    equatorial: { current: string; new: string };
  };
  environmentalComparison: {
    current: string;
    new: string;
  };
  strengths: string[];
  challenges: string[];
  narrative: string;
}

// ─── ISOS Types ─────────────────────────────────────────────────────────────

export interface ISOSMissionProfile {
  missionType:
    | "servicing"
    | "refueling"
    | "debris_removal"
    | "assembly"
    | "inspection"
    | "life_extension";
  servicerNoradId?: string;
  targetNoradId?: string;
  targetName?: string;
  targetOperator?: string;
  approachMethod: "cooperative" | "non_cooperative";
  captureMethod?:
    | "robotic_arm"
    | "net"
    | "harpoon"
    | "magnetic"
    | "tentacles"
    | "docking";
  keepOutZoneKm: number;
  plannedProximityDate?: Date;
  missionDurationDays?: number;
  hasTargetConsent: boolean;
}

export interface ProximityOperationsState {
  currentDistanceKm: number | null;
  approachVelocityMps: number | null;
  relativeAttitude: "stable" | "drifting" | "tumbling" | null;
  communicationStatus: "nominal" | "intermittent" | "lost" | null;
  abortCapability: boolean;
  fuelForAbortKg: number | null;
}

export type ISOSModuleKey =
  | "mission_authorization"
  | "proximity_operations"
  | "fuel"
  | "target_compliance"
  | "cyber"
  | "debris_risk"
  | "insurance"
  | "documentation";

// ─── LSO Types ──────────────────────────────────────────────────────────────

export interface LaunchSiteProfile {
  locationType: "coastal" | "inland" | "offshore" | "airborne";
  latitude: number;
  longitude: number;
  capabilities: ("orbital" | "suborbital" | "sounding_rocket" | "balloon")[];
  maxLaunchRateYear: number;
  padCount: number;
  rangeLength: string;
  environmentalZone?: string;
}

export interface GroundSystemHealth {
  ftsStatus: "operational" | "degraded" | "offline" | null;
  radarStatus: "operational" | "degraded" | "offline" | null;
  telemetryStatus: "operational" | "degraded" | "offline" | null;
  weatherStationStatus: "operational" | "degraded" | "offline" | null;
  powerSystemStatus: "operational" | "degraded" | "offline" | null;
  communicationsStatus: "operational" | "degraded" | "offline" | null;
}

export type LSOModuleKey =
  | "site_authorization"
  | "range_safety_systems"
  | "environmental_compliance"
  | "ground_infrastructure"
  | "cyber"
  | "insurance"
  | "emergency_response"
  | "documentation";

// ─── CAP Types ──────────────────────────────────────────────────────────────

export interface CapacityProviderProfile {
  serviceType:
    | "transponder_lease"
    | "managed_service"
    | "hosted_payload"
    | "ground_segment";
  bandwidthMhz: number;
  coverageRegion: string;
  uplinkSites: string[];
  customerCount: number;
  slaAvailabilityPct: number;
  redundancyLevel: "none" | "partial" | "full";
}

export type CAPModuleKey =
  | "service_authorization"
  | "service_continuity"
  | "capacity_management"
  | "cyber"
  | "sla_compliance"
  | "insurance"
  | "spectrum_coordination"
  | "documentation";

// ─── PDP Types ──────────────────────────────────────────────────────────────

export interface PayloadDataProfile {
  dataType:
    | "earth_observation"
    | "sar"
    | "optical"
    | "hyperspectral"
    | "rf_monitoring"
    | "weather";
  processingLevel: "raw" | "l1" | "l2" | "l3" | "l4";
  archiveSizeTb: number;
  distributionChannels: string[];
  securityClassification: "open" | "restricted" | "classified";
  groundStationCount: number;
  dailyAcquisitionGb: number;
}

export type PDPModuleKey =
  | "data_authorization"
  | "data_security"
  | "data_quality"
  | "cyber"
  | "distribution_compliance"
  | "insurance"
  | "spectrum_rights"
  | "documentation";

// ─── TCO Types ──────────────────────────────────────────────────────────────

export interface TCOFacilityProfile {
  facilityType: "primary_moc" | "backup_moc" | "ground_station" | "relay";
  antennaCount: number;
  supportedBands: ("s_band" | "x_band" | "ka_band" | "uhf" | "vhf")[];
  satellitesSupported: number;
  commandEncryption: "aes256" | "triple_des" | "proprietary" | "none";
  timingSource: "gps" | "cesium" | "rubidium" | "network";
  ccsdsCompliant: boolean;
  crossSupportCapable: boolean;
}

export interface TCOGroundStationHealth {
  antennaStatus: "operational" | "degraded" | "offline" | null;
  commandLinkStatus: "operational" | "degraded" | "offline" | null;
  telemetryLinkStatus: "operational" | "degraded" | "offline" | null;
  timingStatus: "operational" | "degraded" | "offline" | null;
  powerSystemStatus: "operational" | "degraded" | "offline" | null;
  networkStatus: "operational" | "degraded" | "offline" | null;
}

export type TCOModuleKey =
  | "operations_authorization"
  | "ground_infrastructure"
  | "cyber"
  | "command_integrity"
  | "tracking_accuracy"
  | "insurance"
  | "interoperability"
  | "documentation";

// ─── Cross-Type Intelligence Types ──────────────────────────────────────────

export type DependencyType =
  | "TTC_PROVIDER"
  | "LAUNCH_PROVIDER"
  | "LAUNCH_SITE"
  | "CAPACITY_SOURCE"
  | "DATA_SOURCE"
  | "SERVICING_TARGET"
  | "DATA_PROVIDER"
  | "GROUND_NETWORK"
  | "INSURANCE_SHARED";

export type DependencyStrength = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface EntityDependencyInput {
  sourceEntityId: string;
  targetEntityId: string;
  dependencyType: DependencyType;
  strength: DependencyStrength;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface DependencyImpact {
  sourceEntityId: string;
  sourceEntityName: string;
  sourceOperatorType: string;
  targetEntityId: string;
  targetEntityName: string;
  targetOperatorType: string;
  dependencyType: string;
  strength: string;
  impactScore: number;
  propagatedScoreDelta: number;
  propagatedHorizonDelta: number;
  affectedModules: string[];
  narrative: string;
}

export interface EntityDependencyGraph {
  nodes: EntityGraphNode[];
  edges: EntityGraphEdge[];
  clusters: EntityCluster[];
}

export interface EntityGraphNode {
  entityId: string;
  name: string;
  operatorType: string;
  score: number;
  horizon: number | null;
  riskCategory: string;
  dependencyCount: number;
  dependentCount: number;
  criticality: number;
}

export interface EntityGraphEdge {
  sourceEntityId: string;
  targetEntityId: string;
  dependencyType: string;
  strength: string;
  impactMultiplier: number;
}

export interface EntityCluster {
  id: string;
  name: string;
  entityIds: string[];
  clusterScore: number;
  weakestLink: string;
  criticalPath: string[];
}

export interface CrossTypeImpactResult {
  triggerEntityId: string;
  triggerEvent: string;
  directImpacts: DependencyImpact[];
  cascadeImpacts: DependencyImpact[];
  totalEntitiesAffected: number;
  totalScoreImpact: number;
  criticalPathLength: number;
}

export interface CrossTypeFleetIntelligence {
  fleetScore: number;
  entityCount: number;
  riskDistribution: Record<string, number>;
  dependencyGraph: EntityDependencyGraph;
  singlePointsOfFailure: EntityGraphNode[];
  riskConcentration: RiskConcentration[];
  cascadeRisk: CascadeRiskAssessment;
  typeCorrelation: TypeCorrelationMatrix;
}

export interface RiskConcentration {
  clusterId: string;
  clusterName: string;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  reason: string;
}

export interface CascadeRiskAssessment {
  maxCascadeDepth: number;
  highRiskChains: CascadeChain[];
}

export interface CascadeChain {
  entities: string[];
  weakestScore: number;
  weakestEntity: string;
  chainType: string;
}

export interface TypeCorrelationMatrix {
  correlations: { typeA: string; typeB: string; correlation: number }[];
}

// ─── Tracked Deadlines ───────────────────────────────────────────────────────

export interface TrackedDeadlineDefinition {
  id: string;
  name: string;
  regulationRef: string;
  intervalDays: number;
  leadTimeDays: number;
  sourceMetric: string;
  severity: AlertSeverity;
  action: string;
}
