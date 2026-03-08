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
  | "CA_EVENT";

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
