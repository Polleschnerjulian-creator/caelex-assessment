/**
 * Maps data points to the regulatory rules that apply to them.
 */

const DATA_POINT_RULES: Record<string, string[]> = {
  orbital_parameters: [
    "eu_space_act_art_68_25yr",
    "eu_space_act_art_70_passivation",
    "eu_space_act_art_66_manoeuvrability",
    "eu_space_act_art_64_collision_avoidance",
    "eu_space_act_art_72_disposal",
    "eu_space_act_art_102_ca_response",
    "iadc_5_3_1_passivation_fuel",
    "iadc_5_2_orbit_lifetime",
  ],
  cyber_posture: [
    "nis2_art_23_incident_reporting",
    "nis2_art_21_vulnerability_mgmt",
    "nis2_art_21_access_control",
    "nis2_art_21_backup",
    "nis2_art_21_encryption",
    "nis2_art_21_training",
  ],
  ground_station_metrics: ["eu_space_act_art_64_gs_contact"],
  document_event: ["eu_space_act_art_7_licensing"],
};

export function getRulesForDataPoint(dataPoint: string): string[] {
  return DATA_POINT_RULES[dataPoint] ?? [];
}
