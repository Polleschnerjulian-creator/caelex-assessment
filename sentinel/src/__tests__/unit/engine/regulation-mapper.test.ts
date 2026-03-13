import { describe, it, expect } from "vitest";
import { getRulesForDataPoint } from "../../../engine/regulation-mapper.js";

describe("Regulation Mapper", () => {
  it("orbital_parameters → 8 rules", () => {
    const rules = getRulesForDataPoint("orbital_parameters");
    expect(rules).toHaveLength(8);
    expect(rules).toContain("eu_space_act_art_68_25yr");
    expect(rules).toContain("eu_space_act_art_70_passivation");
    expect(rules).toContain("eu_space_act_art_66_manoeuvrability");
    expect(rules).toContain("eu_space_act_art_64_collision_avoidance");
    expect(rules).toContain("eu_space_act_art_72_disposal");
    expect(rules).toContain("eu_space_act_art_102_ca_response");
    expect(rules).toContain("iadc_5_3_1_passivation_fuel");
    expect(rules).toContain("iadc_5_2_orbit_lifetime");
  });

  it("cyber_posture → 6 rules", () => {
    const rules = getRulesForDataPoint("cyber_posture");
    expect(rules).toHaveLength(6);
    expect(rules).toContain("nis2_art_23_incident_reporting");
    expect(rules).toContain("nis2_art_21_vulnerability_mgmt");
    expect(rules).toContain("nis2_art_21_access_control");
    expect(rules).toContain("nis2_art_21_backup");
    expect(rules).toContain("nis2_art_21_encryption");
    expect(rules).toContain("nis2_art_21_training");
  });

  it("ground_station_metrics → 1 rule", () => {
    const rules = getRulesForDataPoint("ground_station_metrics");
    expect(rules).toHaveLength(1);
    expect(rules).toContain("eu_space_act_art_64_gs_contact");
  });

  it("document_event → 1 rule", () => {
    const rules = getRulesForDataPoint("document_event");
    expect(rules).toHaveLength(1);
    expect(rules).toContain("eu_space_act_art_7_licensing");
  });

  it("unknown data_point → empty array", () => {
    const rules = getRulesForDataPoint("unknown_data_point");
    expect(rules).toEqual([]);
  });
});
