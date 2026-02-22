import { describe, it, expect } from "vitest";
import {
  classifyByAltitude,
  isValidOrbit,
  isCanonicalOrbit,
  getOrbitLabel,
  getOrbitAltitudeRange,
  getOrbitRegulatoryProperties,
} from "@/lib/compliance/orbit-types";

describe("orbit-types", () => {
  // ─── classifyByAltitude ───

  describe("classifyByAltitude", () => {
    it('should classify 400 km as "LEO"', () => {
      expect(classifyByAltitude(400)).toBe("LEO");
    });

    it('should classify 2000 km as "LEO" (upper boundary)', () => {
      expect(classifyByAltitude(2000)).toBe("LEO");
    });

    it('should classify 2001 km as "MEO" (just above LEO)', () => {
      expect(classifyByAltitude(2001)).toBe("MEO");
    });

    it('should classify 35786 km as "GEO"', () => {
      expect(classifyByAltitude(35786)).toBe("GEO");
    });

    it('should classify 100000 km as "cislunar"', () => {
      expect(classifyByAltitude(100000)).toBe("cislunar");
    });

    it('should classify 500000 km as "deep_space"', () => {
      expect(classifyByAltitude(500000)).toBe("deep_space");
    });

    it("should throw for 0 km altitude", () => {
      expect(() => classifyByAltitude(0)).toThrow("Altitude must be positive");
    });

    it("should throw for negative altitude", () => {
      expect(() => classifyByAltitude(-500)).toThrow(
        "Altitude must be positive",
      );
    });
  });

  // ─── isValidOrbit ───

  describe("isValidOrbit", () => {
    it('should accept "LEO" as valid for "debris" framework', () => {
      expect(isValidOrbit("LEO", "debris")).toBe(true);
    });

    it('should reject "NGSO" for "debris" framework', () => {
      expect(isValidOrbit("NGSO", "debris")).toBe(false);
    });

    it('should accept "NGSO" for "spectrum" framework', () => {
      expect(isValidOrbit("NGSO", "spectrum")).toBe(true);
    });

    it('should accept "GEO" for "copuos" framework', () => {
      expect(isValidOrbit("GEO", "copuos")).toBe(true);
    });

    it('should accept "SSO" for "eu_space_act" framework', () => {
      expect(isValidOrbit("SSO", "eu_space_act")).toBe(true);
    });

    it("should return false for unknown framework", () => {
      expect(isValidOrbit("LEO", "unknown_framework")).toBe(false);
    });

    it("should return false for unknown orbit type in valid framework", () => {
      expect(isValidOrbit("INVALID", "debris")).toBe(false);
    });
  });

  // ─── isCanonicalOrbit ───

  describe("isCanonicalOrbit", () => {
    const allCanonical = [
      "LEO",
      "MEO",
      "GEO",
      "GTO",
      "HEO",
      "SSO",
      "cislunar",
      "deep_space",
      "NGSO",
    ];

    it.each(allCanonical)(
      'should return true for canonical orbit type "%s"',
      (orbit) => {
        expect(isCanonicalOrbit(orbit)).toBe(true);
      },
    );

    it('should return false for non-canonical type "XYZ"', () => {
      expect(isCanonicalOrbit("XYZ")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isCanonicalOrbit("")).toBe(false);
    });

    it("should return false for lowercase variants", () => {
      expect(isCanonicalOrbit("leo")).toBe(false);
      expect(isCanonicalOrbit("geo")).toBe(false);
    });
  });

  // ─── getOrbitLabel ───

  describe("getOrbitLabel", () => {
    it('should return English label for "LEO"', () => {
      expect(getOrbitLabel("LEO", "en")).toBe("Low Earth Orbit (LEO)");
    });

    it('should return German label for "GEO"', () => {
      expect(getOrbitLabel("GEO", "de")).toBe("Geostationäre Umlaufbahn (GEO)");
    });

    it('should return English label for "deep_space"', () => {
      expect(getOrbitLabel("deep_space", "en")).toBe("Deep Space");
    });

    it('should return German label for "cislunar"', () => {
      expect(getOrbitLabel("cislunar", "de")).toBe("Zislunarer Raum");
    });

    it("should default to English when no locale is specified", () => {
      expect(getOrbitLabel("MEO")).toBe("Medium Earth Orbit (MEO)");
    });
  });

  // ─── getOrbitAltitudeRange ───

  describe("getOrbitAltitudeRange", () => {
    it("should return min=160 and max=2000 for LEO", () => {
      const range = getOrbitAltitudeRange("LEO");
      expect(range.min).toBe(160);
      expect(range.max).toBe(2000);
    });

    it("should return correct range for GEO (min=max=35786)", () => {
      const range = getOrbitAltitudeRange("GEO");
      expect(range.min).toBe(35786);
      expect(range.max).toBe(35786);
    });

    it("should return correct range for MEO", () => {
      const range = getOrbitAltitudeRange("MEO");
      expect(range.min).toBe(2000);
      expect(range.max).toBe(35786);
    });

    it("should include a description string for each orbit type", () => {
      const range = getOrbitAltitudeRange("LEO");
      expect(range.description).toBe("Low Earth Orbit");
    });

    it("should return Infinity as max for deep_space", () => {
      const range = getOrbitAltitudeRange("deep_space");
      expect(range.max).toBe(Infinity);
    });
  });

  // ─── getOrbitRegulatoryProperties ───

  describe("getOrbitRegulatoryProperties", () => {
    it("should indicate LEO requires deorbit", () => {
      const props = getOrbitRegulatoryProperties("LEO");
      expect(props.requiresDeorbit).toBe(true);
    });

    it("should indicate LEO is a protected region", () => {
      const props = getOrbitRegulatoryProperties("LEO");
      expect(props.protectedRegion).toBe(true);
    });

    it("should indicate LEO requires debris plan", () => {
      const props = getOrbitRegulatoryProperties("LEO");
      expect(props.requiresDebrisPlan).toBe(true);
    });

    it("should indicate LEO requires space traffic coordination", () => {
      const props = getOrbitRegulatoryProperties("LEO");
      expect(props.requiresSpaceTrafficCoordination).toBe(true);
    });

    it("should indicate GEO does NOT require deorbit (re-orbit instead)", () => {
      const props = getOrbitRegulatoryProperties("GEO");
      expect(props.requiresDeorbit).toBe(false);
    });

    it("should indicate GEO is a protected region", () => {
      const props = getOrbitRegulatoryProperties("GEO");
      expect(props.protectedRegion).toBe(true);
    });

    it("should indicate GEO requires space traffic coordination", () => {
      const props = getOrbitRegulatoryProperties("GEO");
      expect(props.requiresSpaceTrafficCoordination).toBe(true);
    });

    it("should indicate deep_space does NOT require space traffic coordination", () => {
      const props = getOrbitRegulatoryProperties("deep_space");
      expect(props.requiresSpaceTrafficCoordination).toBe(false);
    });

    it("should indicate deep_space does NOT require deorbit", () => {
      const props = getOrbitRegulatoryProperties("deep_space");
      expect(props.requiresDeorbit).toBe(false);
    });

    it("should indicate deep_space still requires a debris plan", () => {
      const props = getOrbitRegulatoryProperties("deep_space");
      expect(props.requiresDebrisPlan).toBe(true);
    });

    it("should indicate cislunar does NOT require space traffic coordination", () => {
      const props = getOrbitRegulatoryProperties("cislunar");
      expect(props.requiresSpaceTrafficCoordination).toBe(false);
    });
  });
});
