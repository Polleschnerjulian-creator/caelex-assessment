import { describe, it, expect } from "vitest";
import {
  JURISDICTIONS,
  getJurisdictionCodes,
  getJurisdiction,
  getJurisdictionRequirements,
} from "./jurisdiction-data";

describe("jurisdiction-data", () => {
  describe("JURISDICTIONS", () => {
    it("exports 7 jurisdiction profiles", () => {
      expect(Object.keys(JURISDICTIONS)).toHaveLength(7);
    });

    it("contains expected jurisdiction codes", () => {
      const codes = Object.keys(JURISDICTIONS);
      expect(codes).toContain("DE");
      expect(codes).toContain("NO");
      expect(codes).toContain("GB");
      expect(codes).toContain("LU");
      expect(codes).toContain("FR");
      expect(codes).toContain("IT");
      expect(codes).toContain("SE");
    });
  });

  describe("getJurisdictionCodes", () => {
    it("returns all jurisdiction codes", () => {
      const codes = getJurisdictionCodes();
      expect(codes).toHaveLength(7);
      expect(codes).toContain("DE");
      expect(codes).toContain("GB");
    });
  });

  describe("getJurisdiction", () => {
    it("returns a jurisdiction profile for a valid code", () => {
      const de = getJurisdiction("DE");
      expect(de).toBeDefined();
      expect(de!.code).toBe("DE");
      expect(de!.name).toBe("Germany");
    });

    it("handles lowercase input by uppercasing", () => {
      const result = getJurisdiction("de");
      expect(result).toBeDefined();
      expect(result!.code).toBe("DE");
    });

    it("returns undefined for an unknown code", () => {
      const result = getJurisdiction("ZZ");
      expect(result).toBeUndefined();
    });
  });

  describe("getJurisdictionRequirements", () => {
    it("returns requirements for a valid jurisdiction", () => {
      const reqs = getJurisdictionRequirements("DE");
      expect(reqs.length).toBeGreaterThan(0);
      for (const req of reqs) {
        expect(req.jurisdiction).toBe("DE");
        expect(req.regulationRef).toBeTruthy();
        expect(req.name).toBeTruthy();
      }
    });

    it("handles lowercase input", () => {
      const reqs = getJurisdictionRequirements("fr");
      expect(reqs.length).toBeGreaterThan(0);
      expect(reqs[0].jurisdiction).toBe("FR");
    });

    it("returns empty array for unknown jurisdiction (branch: !jurisdiction)", () => {
      const reqs = getJurisdictionRequirements("XX");
      expect(reqs).toEqual([]);
    });

    it("returns the specific requirements for Norway", () => {
      const reqs = getJurisdictionRequirements("NO");
      expect(reqs).toHaveLength(3);
      const categories = reqs.map((r) => r.category);
      expect(categories).toContain("authorization");
      expect(categories).toContain("insurance");
      expect(categories).toContain("debris");
    });
  });
});
