import { describe, it, expect } from "vitest";
import {
  REGULATION_THRESHOLDS,
  findThreshold,
  renderClaimStatement,
} from "./regulation-thresholds";

describe("regulation-thresholds", () => {
  describe("REGULATION_THRESHOLDS", () => {
    it("exports a non-empty array of thresholds", () => {
      expect(REGULATION_THRESHOLDS).toBeDefined();
      expect(Array.isArray(REGULATION_THRESHOLDS)).toBe(true);
      expect(REGULATION_THRESHOLDS.length).toBeGreaterThan(0);
    });

    it("each threshold has required fields", () => {
      for (const t of REGULATION_THRESHOLDS) {
        expect(t.id).toBeTruthy();
        expect(t.regulation_ref).toBeTruthy();
        expect(t.regulation_name).toBeTruthy();
        expect(t.data_point).toBeTruthy();
        expect(["ABOVE", "BELOW"]).toContain(t.threshold_type);
        expect(typeof t.threshold_value).toBe("number");
        expect(typeof t.unit).toBe("string");
        expect(t.claim_template).toBeTruthy();
      }
    });
  });

  describe("findThreshold", () => {
    it("returns a threshold when given a valid regulation_ref", () => {
      const result = findThreshold("eu_space_act_art_70");
      expect(result).toBeDefined();
      expect(result!.id).toBe("eu_art70_fuel_passivation");
      expect(result!.regulation_ref).toBe("eu_space_act_art_70");
    });

    it("returns undefined for an unknown regulation_ref", () => {
      const result = findThreshold("nonexistent_regulation");
      expect(result).toBeUndefined();
    });

    it("finds thresholds for various known regulation refs", () => {
      expect(findThreshold("eu_space_act_art_68")).toBeDefined();
      expect(findThreshold("eu_space_act_art_72")).toBeDefined();
      expect(findThreshold("eu_space_act_art_64")).toBeDefined();
      expect(findThreshold("nis2_art_21_2_e")).toBeDefined();
      expect(findThreshold("nis2_art_21_2_j")).toBeDefined();
      expect(findThreshold("nis2_art_23")).toBeDefined();
      expect(findThreshold("iadc_5_3_1")).toBeDefined();
    });
  });

  describe("renderClaimStatement", () => {
    it("replaces {threshold} and {unit} placeholders", () => {
      const threshold = REGULATION_THRESHOLDS.find(
        (t) => t.id === "eu_art70_fuel_passivation",
      )!;
      const result = renderClaimStatement(threshold);
      expect(result).toContain(String(threshold.threshold_value));
      expect(result).toContain(threshold.unit);
      expect(result).not.toContain("{threshold}");
      expect(result).not.toContain("{unit}");
    });

    it("renders correctly for a threshold with empty unit", () => {
      const threshold = REGULATION_THRESHOLDS.find(
        (t) => t.id === "eu_art64_ca_capability",
      )!;
      const result = renderClaimStatement(threshold);
      expect(result).toBe(
        "Collision avoidance maneuver capability confirmed per Art. 64",
      );
    });

    it("renders correctly for a threshold with word unit", () => {
      const threshold = REGULATION_THRESHOLDS.find(
        (t) => t.id === "eu_art68_orbital_lifetime",
      )!;
      const result = renderClaimStatement(threshold);
      expect(result).toContain("25");
      expect(result).toContain("years");
    });
  });
});
