// ═══════════════════════════════════════════════════════════════════════════════
// EPHEMERIS — Physical Constants, Atmospheric Model, and Configuration
// ═══════════════════════════════════════════════════════════════════════════════

import type { TrackedDeadlineDefinition, AlertSeverity } from "./types";

// ─── Physical Constants ──────────────────────────────────────────────────────

export const EARTH_RADIUS_KM = 6371.0;
export const EARTH_MU = 3.986004418e14; // m³/s² — Standard gravitational parameter
export const EARTH_J2 = 1.08263e-3; // J2 oblateness coefficient

// ─── Atmospheric Density Model ───────────────────────────────────────────────
// Exponential model: ρ(h) = ρ₀ × exp(-(h - h₀) / H)
// Sources: CIRA/COSPAR International Reference Atmosphere
// Each layer: { baseAlt (km), baseDensity (kg/m³), scaleHeight (km) }

export const ATMOSPHERIC_LAYERS = [
  { baseAlt: 200, baseDensity: 2.53e-10, scaleHeight: 37.105 },
  { baseAlt: 300, baseDensity: 7.22e-11, scaleHeight: 53.628 },
  { baseAlt: 400, baseDensity: 2.8e-11, scaleHeight: 58.515 },
  { baseAlt: 500, baseDensity: 1.17e-11, scaleHeight: 60.828 },
  { baseAlt: 600, baseDensity: 5.24e-12, scaleHeight: 63.822 },
  { baseAlt: 700, baseDensity: 2.54e-12, scaleHeight: 65.654 },
  { baseAlt: 800, baseDensity: 1.32e-12, scaleHeight: 68.532 },
  { baseAlt: 900, baseDensity: 7.49e-13, scaleHeight: 71.835 },
  { baseAlt: 1000, baseDensity: 4.55e-13, scaleHeight: 75.042 },
] as const;

// ─── Solar Flux Constants ────────────────────────────────────────────────────

export const F107_REFERENCE = 150; // Solar Flux Units
export const F107_DENSITY_SCALING = 0.003; // Per SFU over/under reference: ±0.3% density

// ─── Orbital Decay Thresholds ────────────────────────────────────────────────

export const DESTRUCTION_ALTITUDE_KM = 120; // Below this: destructive reentry
export const WARNING_ALTITUDE_KM = 200; // Below this: warning zone

// ─── Default Drag Parameters ─────────────────────────────────────────────────

export const DEFAULT_DRAG_COEFFICIENT = 2.2; // Cd for typical satellite
export const DEFAULT_AREA_TO_MASS = 0.01; // m²/kg — typical for LEO satellite

// ─── Forecast Configuration ──────────────────────────────────────────────────

export const FORECAST_HORIZON_DAYS = 1825; // 5 years
export const FORECAST_RESOLUTION_DAYS = 7; // 1 data point per week
export const HISTORY_LOOKBACK_DAYS = 365; // 1 year of history for trend calculation

// ─── Default Subsystem Degradation Rates ─────────────────────────────────────

export const DEFAULT_DEGRADATION = {
  thruster: {
    meanLifetimeCycles: 50000,
    degradationOnsetPct: 70, // DEGRADED events begin at 70% lifetime
  },
  battery: {
    capacityLossPerYear: 2.5, // % capacity loss per year (typical LEO)
    criticalCapacityPct: 60, // Below 60%: critical
  },
  solarArray: {
    degradationPerYear: 2.75, // % power loss per year (typical LEO, radiation)
    criticalPowerPct: 70, // Below 70% nominal: critical
  },
} as const;

// ─── Module Weights (Aggregation Engine) ─────────────────────────────────────

export const MODULE_WEIGHTS: Record<
  string,
  { weight: number; rationale: string; safetyGate: boolean }
> = {
  orbital: {
    weight: 15,
    rationale: "Orbit control, lifetime, reentry risk",
    safetyGate: true,
  },
  fuel: {
    weight: 20,
    rationale: "4 regulations depend directly on fuel (Art. 64/66/70/72)",
    safetyGate: true,
  },
  subsystems: {
    weight: 15,
    rationale: "Thruster/battery/solar — prerequisite for all operations",
    safetyGate: true,
  },
  cyber: {
    weight: 10,
    rationale: "NIS2 critical infrastructure protection",
    safetyGate: false,
  },
  ground: {
    weight: 10,
    rationale: "Ground station availability for command & control",
    safetyGate: false,
  },
  documentation: {
    weight: 8,
    rationale: "Authorization documents, plans, certificates",
    safetyGate: false,
  },
  insurance: {
    weight: 7,
    rationale: "Third party liability coverage",
    safetyGate: false,
  },
  registration: {
    weight: 5,
    rationale: "UN registry obligations",
    safetyGate: false,
  },
};

// ─── Safety Gate Threshold ───────────────────────────────────────────────────
// If ANY safety-critical module is NON_COMPLIANT, overall score capped here
export const SAFETY_GATE_MAX_SCORE = 49;

// ─── Data Freshness Thresholds (minutes) ─────────────────────────────────────

export const DATA_FRESHNESS_THRESHOLDS = {
  LIVE: 60, // < 1 hour
  RECENT: 1440, // < 24 hours
  STALE: 10080, // < 7 days
  // > 7 days or no data → NO_DATA
} as const;

// ─── Sentinel Metric Validation Ranges ───────────────────────────────────────

export const METRIC_RANGES: Record<string, { min: number; max: number }> = {
  remaining_fuel_pct: { min: 0, max: 100 },
  altitude_km: { min: 150, max: 50000 },
  thruster_status: { min: 0, max: 1 },
  battery_state_of_charge: { min: 0, max: 100 },
  solar_array_power_pct: { min: 0, max: 100 },
  patch_compliance_pct: { min: 0, max: 100 },
  mfa_adoption_pct: { min: 0, max: 100 },
  critical_vulns_unpatched: { min: 0, max: 1000 },
  mttr_minutes: { min: 0, max: 100000 },
};

// ─── Tracked Deadlines ───────────────────────────────────────────────────────

export const TRACKED_DEADLINES: TrackedDeadlineDefinition[] = [
  {
    id: "pentest",
    name: "Penetration Test",
    regulationRef: "nis2_art_21_2_e",
    intervalDays: 365,
    leadTimeDays: 56,
    sourceMetric: "days_since_last_pentest",
    severity: "HIGH" as AlertSeverity,
    action: "Commission penetration test from certified provider",
  },
  {
    id: "vuln_scan",
    name: "Vulnerability Scan",
    regulationRef: "nis2_art_21_2_e",
    intervalDays: 90,
    leadTimeDays: 7,
    sourceMetric: "days_since_last_vuln_scan",
    severity: "MEDIUM" as AlertSeverity,
    action: "Run automated vulnerability scan",
  },
  {
    id: "access_review",
    name: "Access Review",
    regulationRef: "nis2_art_21_2_i",
    intervalDays: 180,
    leadTimeDays: 14,
    sourceMetric: "days_since_last_access_review",
    severity: "MEDIUM" as AlertSeverity,
    action: "Conduct access rights review",
  },
  {
    id: "security_training",
    name: "Security Awareness Training",
    regulationRef: "nis2_art_21_2_g",
    intervalDays: 365,
    leadTimeDays: 30,
    sourceMetric: "days_since_last_training",
    severity: "MEDIUM" as AlertSeverity,
    action: "Schedule security awareness training for staff",
  },
  {
    id: "insurance_renewal",
    name: "TPL Insurance Renewal",
    regulationRef: "eu_space_act_art_8",
    intervalDays: 365,
    leadTimeDays: 90,
    sourceMetric: "insurance_expiry_date",
    severity: "CRITICAL" as AlertSeverity,
    action: "Initiate insurance renewal process with broker",
  },
  {
    id: "frequency_license",
    name: "Frequency License Renewal",
    regulationRef: "itu_radio_regulations",
    intervalDays: 365 * 5,
    leadTimeDays: 180,
    sourceMetric: "frequency_license_expiry",
    severity: "HIGH" as AlertSeverity,
    action: "Begin frequency license renewal with national authority",
  },
];
