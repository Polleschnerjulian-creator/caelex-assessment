import { describe, it, expect } from "vitest";
import {
  COMPLIANCE_THRESHOLDS,
  getWarningValue,
  type ComplianceThresholdKey,
} from "@/lib/compliance/thresholds";
import { REGULATION_THRESHOLDS } from "@/lib/verity/evaluation/regulation-thresholds";

/**
 * Critical CI test: verify Verity + Ephemeris thresholds match.
 *
 * The shared thresholds file (`compliance/thresholds.ts`) is the single
 * source of truth for both Verity (attestation evaluation) and Ephemeris
 * (prediction models). This test ensures they stay in sync.
 */

describe("Shared Compliance Thresholds", () => {
  it("COMPLIANCE_THRESHOLDS has expected keys", () => {
    const keys = Object.keys(COMPLIANCE_THRESHOLDS);
    expect(keys.length).toBeGreaterThanOrEqual(6);

    // Core thresholds used by Ephemeris prediction models
    expect(keys).toContain("eu_space_act_art_70");
    expect(keys).toContain("eu_space_act_art_68");
    expect(keys).toContain("eu_space_act_art_64");
  });

  it("each threshold has required fields", () => {
    for (const [key, t] of Object.entries(COMPLIANCE_THRESHOLDS)) {
      expect(t.threshold).toBeTypeOf("number");
      expect(t.type).toMatch(/^(ABOVE|BELOW)$/);
      expect(t.unit).toBeTypeOf("string");
      expect(t.warningBuffer).toBeTypeOf("number");
      expect(t.warningBuffer).toBeGreaterThanOrEqual(0);
    }
  });

  it("getWarningValue returns correct values", () => {
    const art70 = COMPLIANCE_THRESHOLDS["eu_space_act_art_70"]!;

    // For ABOVE type: warning = threshold + buffer
    if (art70.type === "ABOVE") {
      expect(getWarningValue("eu_space_act_art_70")).toBe(
        art70.threshold + art70.warningBuffer,
      );
    }
  });

  it("Verity regulation thresholds reference shared values", () => {
    // Each Verity threshold should have a matching shared threshold
    for (const vt of REGULATION_THRESHOLDS) {
      const sharedKey = vt.regulation_ref as ComplianceThresholdKey;
      const shared = COMPLIANCE_THRESHOLDS[sharedKey];

      if (shared) {
        // The Verity threshold should match the shared threshold
        expect(vt.threshold_value).toBe(shared.threshold);
        expect(vt.threshold_type).toBe(shared.type);
      }
    }
  });

  it("Verity and Ephemeris agree on threshold values", () => {
    // For every shared threshold that Verity uses, values must match
    const verityByRef = new Map(
      REGULATION_THRESHOLDS.map((t) => [t.regulation_ref, t]),
    );

    for (const [key, shared] of Object.entries(COMPLIANCE_THRESHOLDS)) {
      const verity = verityByRef.get(key);
      if (verity) {
        expect(verity.threshold_value).toBe(shared.threshold);
        expect(verity.threshold_type).toBe(shared.type);
      }
    }
  });

  it("all threshold values are physically reasonable", () => {
    for (const [key, t] of Object.entries(COMPLIANCE_THRESHOLDS)) {
      // Thresholds should be within reasonable physical ranges
      expect(t.threshold).toBeGreaterThanOrEqual(0);
      expect(t.threshold).toBeLessThanOrEqual(100000); // No absurd values
    }
  });
});
