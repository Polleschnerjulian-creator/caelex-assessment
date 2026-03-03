export interface RegulationThreshold {
  id: string;
  regulation_ref: string;
  regulation_name: string;
  data_point: string; // Measured field (MUST match Evidence data_point)
  threshold_type: "ABOVE" | "BELOW";
  threshold_value: number;
  unit: string;
  claim_template: string;
}

export const REGULATION_THRESHOLDS: RegulationThreshold[] = [
  {
    id: "eu_art70_fuel_passivation",
    regulation_ref: "eu_space_act_art_70",
    regulation_name: "End-of-Life Passivation Readiness",
    data_point: "remaining_fuel_pct",
    threshold_type: "ABOVE",
    threshold_value: 15,
    unit: "%",
    claim_template:
      "Fuel reserve exceeds Art. 70 passivation threshold ({threshold}{unit})",
  },
  {
    id: "eu_art68_orbital_lifetime",
    regulation_ref: "eu_space_act_art_68",
    regulation_name: "25-Year Orbital Lifetime Limit",
    data_point: "estimated_lifetime_yr",
    threshold_type: "BELOW",
    threshold_value: 25,
    unit: " years",
    claim_template: "Orbital lifetime within Art. 68 limit ({threshold}{unit})",
  },
  {
    id: "eu_art72_disposal_fuel",
    regulation_ref: "eu_space_act_art_72",
    regulation_name: "End-of-Life Disposal Capability",
    data_point: "remaining_fuel_pct",
    threshold_type: "ABOVE",
    threshold_value: 25,
    unit: "%",
    claim_template:
      "Fuel reserve sufficient for controlled disposal per Art. 72 ({threshold}{unit})",
  },
  {
    id: "eu_art64_ca_capability",
    regulation_ref: "eu_space_act_art_64",
    regulation_name: "Collision Avoidance Capability",
    data_point: "ca_maneuver_capability",
    threshold_type: "ABOVE",
    threshold_value: 1,
    unit: "",
    claim_template:
      "Collision avoidance maneuver capability confirmed per Art. 64",
  },
  {
    id: "nis2_art21_patch_compliance",
    regulation_ref: "nis2_art_21_2_e",
    regulation_name: "Vulnerability Management",
    data_point: "patch_compliance_pct",
    threshold_type: "ABOVE",
    threshold_value: 80,
    unit: "%",
    claim_template:
      "Patch compliance meets NIS2 Art. 21 minimum ({threshold}{unit})",
  },
  {
    id: "nis2_art21_mfa",
    regulation_ref: "nis2_art_21_2_j",
    regulation_name: "Multi-Factor Authentication",
    data_point: "mfa_adoption_pct",
    threshold_type: "ABOVE",
    threshold_value: 95,
    unit: "%",
    claim_template:
      "MFA adoption meets NIS2 Art. 21 requirements ({threshold}{unit})",
  },
  {
    id: "nis2_art21_zero_critical_vulns",
    regulation_ref: "nis2_art_21_2_e",
    regulation_name: "Critical Vulnerability Remediation",
    data_point: "critical_vulns_unpatched",
    threshold_type: "BELOW",
    threshold_value: 1,
    unit: "",
    claim_template: "No unpatched critical vulnerabilities per NIS2 Art. 21",
  },
  {
    id: "nis2_art23_incident_response",
    regulation_ref: "nis2_art_23",
    regulation_name: "Incident Response Timeliness",
    data_point: "mttr_minutes",
    threshold_type: "BELOW",
    threshold_value: 1440,
    unit: " minutes",
    claim_template:
      "Incident response within NIS2 Art. 23 reporting window ({threshold} min)",
  },
  {
    id: "iadc_fuel_reserve",
    regulation_ref: "iadc_5_3_1",
    regulation_name: "IADC Passivation Fuel Reserve",
    data_point: "remaining_fuel_pct",
    threshold_type: "ABOVE",
    threshold_value: 10,
    unit: "%",
    claim_template:
      "Fuel reserve meets IADC \u00A75.3.1 passivation guideline ({threshold}{unit})",
  },
];

export function findThreshold(
  regulationRef: string,
): RegulationThreshold | undefined {
  return REGULATION_THRESHOLDS.find((t) => t.regulation_ref === regulationRef);
}

/**
 * Renders a claim statement from a threshold template.
 */
export function renderClaimStatement(threshold: RegulationThreshold): string {
  return threshold.claim_template
    .replace("{threshold}", String(threshold.threshold_value))
    .replace("{unit}", threshold.unit);
}
