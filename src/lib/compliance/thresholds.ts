// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPLIANCE THRESHOLDS
// Single source of truth for both Verity (attestation) and Ephemeris (prediction)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ComplianceThreshold {
  metric: string;
  threshold: number;
  type: "ABOVE" | "BELOW";
  unit: string;
  name: string;
  warningBuffer: number; // Ephemeris fires WARNING at threshold ± buffer
}

/**
 * Canonical compliance thresholds used by:
 * - Verity: attestation evaluation (threshold + type only)
 * - Ephemeris: predictive models (threshold + warningBuffer for early warnings)
 *
 * To add a new threshold:
 * 1. Add it here
 * 2. Add corresponding RegulationThreshold in regulation-thresholds.ts
 * 3. Add prediction model support in Ephemeris if applicable
 */
export const COMPLIANCE_THRESHOLDS = {
  eu_space_act_art_70: {
    metric: "remaining_fuel_pct",
    threshold: 15,
    type: "ABOVE" as const,
    unit: "%",
    name: "End-of-Life Passivation Readiness",
    warningBuffer: 5, // Warning at 20%
  },
  eu_space_act_art_68: {
    metric: "estimated_lifetime_yr",
    threshold: 25,
    type: "BELOW" as const,
    unit: "years",
    name: "25-Year Orbital Lifetime Limit",
    warningBuffer: 3, // Warning at 22 years
  },
  eu_space_act_art_72: {
    metric: "remaining_fuel_pct",
    threshold: 25,
    type: "ABOVE" as const,
    unit: "%",
    name: "End-of-Life Disposal Capability",
    warningBuffer: 5, // Warning at 30%
  },
  eu_space_act_art_64: {
    metric: "ca_maneuver_capability",
    threshold: 1,
    type: "ABOVE" as const,
    unit: "",
    name: "Collision Avoidance Capability",
    warningBuffer: 0, // Binary — no buffer
  },
  nis2_art_21_2_e_patch: {
    metric: "patch_compliance_pct",
    threshold: 80,
    type: "ABOVE" as const,
    unit: "%",
    name: "Vulnerability Management",
    warningBuffer: 5,
  },
  nis2_art_21_2_j: {
    metric: "mfa_adoption_pct",
    threshold: 95,
    type: "ABOVE" as const,
    unit: "%",
    name: "Multi-Factor Authentication",
    warningBuffer: 2,
  },
  nis2_art_21_2_e_vulns: {
    metric: "critical_vulns_unpatched",
    threshold: 1,
    type: "BELOW" as const,
    unit: "",
    name: "Critical Vulnerability Remediation",
    warningBuffer: 0,
  },
  nis2_art_23: {
    metric: "mttr_minutes",
    threshold: 1440,
    type: "BELOW" as const,
    unit: "minutes",
    name: "Incident Response Timeliness",
    warningBuffer: 240, // Warning at 1200 min
  },
  iadc_5_3_1: {
    metric: "remaining_fuel_pct",
    threshold: 10,
    type: "ABOVE" as const,
    unit: "%",
    name: "IADC Passivation Fuel Reserve",
    warningBuffer: 3,
  },
} as const;

export type ComplianceThresholdKey = keyof typeof COMPLIANCE_THRESHOLDS;

/**
 * Get the warning threshold value (threshold adjusted by buffer).
 * For ABOVE thresholds: warning fires at threshold + buffer
 * For BELOW thresholds: warning fires at threshold - buffer
 */
export function getWarningValue(key: ComplianceThresholdKey): number {
  const t = COMPLIANCE_THRESHOLDS[key];
  return t.type === "ABOVE"
    ? t.threshold + t.warningBuffer
    : t.threshold - t.warningBuffer;
}
