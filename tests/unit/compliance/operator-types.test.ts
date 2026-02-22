import { describe, it, expect } from "vitest";
import {
  toCanonical,
  fromCanonical,
  getOperatorLabel,
  isValidCanonicalType,
  EU_TO_CANONICAL,
} from "@/lib/compliance/operator-types";

describe("operator-types", () => {
  // ─── toCanonical ───

  describe("toCanonical", () => {
    it('should map EU "SCO" to "spacecraft_operator"', () => {
      expect(toCanonical("SCO", "eu")).toBe("spacecraft_operator");
    });

    it('should map UK "satellite_operator" to "spacecraft_operator"', () => {
      expect(toCanonical("satellite_operator", "uk")).toBe(
        "spacecraft_operator",
      );
    });

    it('should map US "launch_operator" to "launch_operator"', () => {
      expect(toCanonical("launch_operator", "us")).toBe("launch_operator");
    });

    it("should throw for unknown operator type", () => {
      expect(() => toCanonical("UNKNOWN_TYPE", "eu")).toThrow(
        'Unknown operator type "UNKNOWN_TYPE" for framework "eu"',
      );
    });

    it("should throw for unknown type in UK framework", () => {
      expect(() => toCanonical("SCO", "uk")).toThrow();
    });

    it("should throw for unknown type in US framework", () => {
      expect(() => toCanonical("ISOS", "us")).toThrow();
    });
  });

  // ─── fromCanonical ───

  describe("fromCanonical", () => {
    it('should map "spacecraft_operator" to EU "SCO"', () => {
      expect(fromCanonical("spacecraft_operator", "eu")).toBe("SCO");
    });

    it('should map "spacecraft_operator" to UK "satellite_operator"', () => {
      expect(fromCanonical("spacecraft_operator", "uk")).toBe(
        "satellite_operator",
      );
    });

    it('should map "spacecraft_operator" to US "satellite_operator"', () => {
      expect(fromCanonical("spacecraft_operator", "us")).toBe(
        "satellite_operator",
      );
    });

    it("should throw for unmapped canonical type in EU", () => {
      expect(() => fromCanonical("reentry_operator", "eu")).toThrow(
        'No mapping for canonical type "reentry_operator" in framework "eu"',
      );
    });

    it("should throw for unmapped canonical type in UK", () => {
      expect(() => fromCanonical("primary_data_provider", "uk")).toThrow();
    });

    it("should throw for unmapped canonical type in US", () => {
      expect(() => fromCanonical("primary_data_provider", "us")).toThrow();
    });
  });

  // ─── getOperatorLabel ───

  describe("getOperatorLabel", () => {
    it('should return English label for "spacecraft_operator"', () => {
      expect(getOperatorLabel("spacecraft_operator", "en")).toBe(
        "Spacecraft Operator",
      );
    });

    it('should return German label for "spacecraft_operator"', () => {
      expect(getOperatorLabel("spacecraft_operator", "de")).toBe(
        "Raumfahrzeugbetreiber",
      );
    });

    it('should return English label for "launch_operator"', () => {
      expect(getOperatorLabel("launch_operator", "en")).toBe("Launch Operator");
    });

    it('should return German label for "launch_operator"', () => {
      expect(getOperatorLabel("launch_operator", "de")).toBe(
        "Startdienstbetreiber",
      );
    });

    it("should default to English when no locale is specified", () => {
      expect(getOperatorLabel("spacecraft_operator")).toBe(
        "Spacecraft Operator",
      );
    });
  });

  // ─── isValidCanonicalType ───

  describe("isValidCanonicalType", () => {
    it('should return true for "spacecraft_operator"', () => {
      expect(isValidCanonicalType("spacecraft_operator")).toBe(true);
    });

    it('should return true for "launch_operator"', () => {
      expect(isValidCanonicalType("launch_operator")).toBe(true);
    });

    it('should return true for "reentry_operator"', () => {
      expect(isValidCanonicalType("reentry_operator")).toBe(true);
    });

    it('should return false for "unknown_type"', () => {
      expect(isValidCanonicalType("unknown_type")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidCanonicalType("")).toBe(false);
    });

    it("should return false for arbitrary string", () => {
      expect(isValidCanonicalType("not_a_real_operator")).toBe(false);
    });
  });

  // ─── EU abbreviations mapping ───

  describe("EU abbreviation mappings", () => {
    it('should map SCO to "spacecraft_operator"', () => {
      expect(EU_TO_CANONICAL.SCO).toBe("spacecraft_operator");
    });

    it('should map LO to "launch_operator"', () => {
      expect(EU_TO_CANONICAL.LO).toBe("launch_operator");
    });

    it('should map LSO to "launch_site_operator"', () => {
      expect(EU_TO_CANONICAL.LSO).toBe("launch_site_operator");
    });

    it('should map ISOS to "in_space_services_provider"', () => {
      expect(EU_TO_CANONICAL.ISOS).toBe("in_space_services_provider");
    });

    it('should map CAP to "capsule_operator"', () => {
      expect(EU_TO_CANONICAL.CAP).toBe("capsule_operator");
    });

    it('should map PDP to "primary_data_provider"', () => {
      expect(EU_TO_CANONICAL.PDP).toBe("primary_data_provider");
    });

    it('should map TCO to "third_country_operator"', () => {
      expect(EU_TO_CANONICAL.TCO).toBe("third_country_operator");
    });

    it('should map ALL to "spacecraft_operator" (default)', () => {
      expect(EU_TO_CANONICAL.ALL).toBe("spacecraft_operator");
    });
  });
});
