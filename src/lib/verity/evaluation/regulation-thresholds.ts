import { COMPLIANCE_THRESHOLDS } from "@/lib/compliance/thresholds";

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

// Maps shared threshold keys → Verity regulation threshold format
// Threshold values are sourced from COMPLIANCE_THRESHOLDS (single source of truth)
const T = COMPLIANCE_THRESHOLDS;

export const REGULATION_THRESHOLDS: RegulationThreshold[] = [
  {
    id: "eu_art70_fuel_passivation",
    regulation_ref: "eu_space_act_art_70",
    regulation_name: T.eu_space_act_art_70.name,
    data_point: T.eu_space_act_art_70.metric,
    threshold_type: T.eu_space_act_art_70.type,
    threshold_value: T.eu_space_act_art_70.threshold,
    unit: "%",
    claim_template:
      "Fuel reserve exceeds Art. 70 passivation threshold ({threshold}{unit})",
  },
  {
    id: "eu_art68_orbital_lifetime",
    regulation_ref: "eu_space_act_art_68",
    regulation_name: T.eu_space_act_art_68.name,
    data_point: T.eu_space_act_art_68.metric,
    threshold_type: T.eu_space_act_art_68.type,
    threshold_value: T.eu_space_act_art_68.threshold,
    unit: " years",
    claim_template: "Orbital lifetime within Art. 68 limit ({threshold}{unit})",
  },
  {
    id: "eu_art72_disposal_fuel",
    regulation_ref: "eu_space_act_art_72",
    regulation_name: T.eu_space_act_art_72.name,
    data_point: T.eu_space_act_art_72.metric,
    threshold_type: T.eu_space_act_art_72.type,
    threshold_value: T.eu_space_act_art_72.threshold,
    unit: "%",
    claim_template:
      "Fuel reserve sufficient for controlled disposal per Art. 72 ({threshold}{unit})",
  },
  {
    id: "eu_art64_ca_capability",
    regulation_ref: "eu_space_act_art_64",
    regulation_name: T.eu_space_act_art_64.name,
    data_point: T.eu_space_act_art_64.metric,
    threshold_type: T.eu_space_act_art_64.type,
    threshold_value: T.eu_space_act_art_64.threshold,
    unit: "",
    claim_template:
      "Collision avoidance maneuver capability confirmed per Art. 64",
  },
  {
    id: "nis2_art21_patch_compliance",
    regulation_ref: "nis2_art_21_2_e",
    regulation_name: T.nis2_art_21_2_e_patch.name,
    data_point: T.nis2_art_21_2_e_patch.metric,
    threshold_type: T.nis2_art_21_2_e_patch.type,
    threshold_value: T.nis2_art_21_2_e_patch.threshold,
    unit: "%",
    claim_template:
      "Patch compliance meets NIS2 Art. 21 minimum ({threshold}{unit})",
  },
  {
    id: "nis2_art21_mfa",
    regulation_ref: "nis2_art_21_2_j",
    regulation_name: T.nis2_art_21_2_j.name,
    data_point: T.nis2_art_21_2_j.metric,
    threshold_type: T.nis2_art_21_2_j.type,
    threshold_value: T.nis2_art_21_2_j.threshold,
    unit: "%",
    claim_template:
      "MFA adoption meets NIS2 Art. 21 requirements ({threshold}{unit})",
  },
  {
    id: "nis2_art21_zero_critical_vulns",
    regulation_ref: "nis2_art_21_2_e",
    regulation_name: T.nis2_art_21_2_e_vulns.name,
    data_point: T.nis2_art_21_2_e_vulns.metric,
    threshold_type: T.nis2_art_21_2_e_vulns.type,
    threshold_value: T.nis2_art_21_2_e_vulns.threshold,
    unit: "",
    claim_template: "No unpatched critical vulnerabilities per NIS2 Art. 21",
  },
  {
    id: "nis2_art23_incident_response",
    regulation_ref: "nis2_art_23",
    regulation_name: T.nis2_art_23.name,
    data_point: T.nis2_art_23.metric,
    threshold_type: T.nis2_art_23.type,
    threshold_value: T.nis2_art_23.threshold,
    unit: " minutes",
    claim_template:
      "Incident response within NIS2 Art. 23 reporting window ({threshold} min)",
  },
  {
    id: "iadc_fuel_reserve",
    regulation_ref: "iadc_5_3_1",
    regulation_name: T.iadc_5_3_1.name,
    data_point: T.iadc_5_3_1.metric,
    threshold_type: T.iadc_5_3_1.type,
    threshold_value: T.iadc_5_3_1.threshold,
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
