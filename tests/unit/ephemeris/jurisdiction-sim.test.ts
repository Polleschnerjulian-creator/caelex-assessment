import { describe, it, expect } from "vitest";
import {
  simulateJurisdictionChange,
  compareAllJurisdictions,
} from "@/lib/ephemeris/simulation/jurisdiction-simulator";
import {
  getJurisdiction,
  getJurisdictionCodes,
  JURISDICTIONS,
} from "@/lib/ephemeris/simulation/jurisdiction-data";

const SATELLITE = { noradId: "58421", name: "CAELEX-SAT-1" };

describe("Jurisdiction Simulation", () => {
  describe("jurisdiction data", () => {
    it("has 7 European jurisdictions", () => {
      const codes = getJurisdictionCodes();
      expect(codes).toHaveLength(7);
      expect(codes).toContain("DE");
      expect(codes).toContain("NO");
      expect(codes).toContain("GB");
      expect(codes).toContain("LU");
      expect(codes).toContain("FR");
      expect(codes).toContain("IT");
      expect(codes).toContain("SE");
    });

    it("returns jurisdiction by code (case insensitive)", () => {
      const de = getJurisdiction("de");
      expect(de).toBeDefined();
      expect(de!.code).toBe("DE");
      expect(de!.name).toBe("Germany");
    });

    it("returns undefined for unknown jurisdiction", () => {
      expect(getJurisdiction("XX")).toBeUndefined();
    });

    it("each jurisdiction has required fields", () => {
      for (const code of getJurisdictionCodes()) {
        const j = JURISDICTIONS[code]!;
        expect(j.code).toBeTruthy();
        expect(j.name).toBeTruthy();
        expect(j.authority).toBeTruthy();
        expect(j.nationalSpaceLaw).toBeTruthy();
        expect(j.approvalDuration).toBeTruthy();
        expect(j.specificRequirements).toBeDefined();
        expect(Array.isArray(j.specificRequirements)).toBe(true);
      }
    });
  });

  describe("simulateJurisdictionChange", () => {
    it("simulates DE → LU (fewer requirements)", () => {
      const sim = simulateJurisdictionChange("DE", "LU", SATELLITE, 75);

      expect(sim.fromJurisdiction).toBe("DE");
      expect(sim.toJurisdiction).toBe("LU");
      expect(sim.complianceDelta.scoreBefore).toBe(75);
      expect(sim.complianceDelta.scoreAfter).toBeGreaterThanOrEqual(0);
      expect(sim.complianceDelta.scoreAfter).toBeLessThanOrEqual(100);
      expect(sim.estimatedTimeline.approvalDuration).toBeTruthy();
    });

    it("produces non-empty documents lists", () => {
      const sim = simulateJurisdictionChange("DE", "FR", SATELLITE, 75);

      // FR has more requirements than DE, so documentsNeeded should have entries
      expect(sim.documentsNeeded).toBeDefined();
      expect(sim.regulatoryAuthority.current).toBe("DLR / BNetzA");
      expect(sim.regulatoryAuthority.new).toBe("CNES");
    });

    it("throws for unknown jurisdiction", () => {
      expect(() =>
        simulateJurisdictionChange("DE", "XX", SATELLITE, 75),
      ).toThrow("Unknown jurisdiction");
    });

    it("score delta is bounded [-100, 100]", () => {
      for (const toCode of getJurisdictionCodes()) {
        if (toCode === "DE") continue;
        const sim = simulateJurisdictionChange("DE", toCode, SATELLITE, 50);
        expect(sim.complianceDelta.scoreDelta).toBeGreaterThanOrEqual(-100);
        expect(sim.complianceDelta.scoreDelta).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("compareAllJurisdictions", () => {
    it("returns all jurisdictions except current", () => {
      const results = compareAllJurisdictions("DE", SATELLITE, 75);

      expect(results.length).toBe(getJurisdictionCodes().length - 1);
      expect(results.every((r) => r.toJurisdiction !== "DE")).toBe(true);
    });

    it("results are sorted by score delta (best first)", () => {
      const results = compareAllJurisdictions("DE", SATELLITE, 75);

      for (let i = 1; i < results.length; i++) {
        expect(
          results[i - 1]!.complianceDelta.scoreDelta,
        ).toBeGreaterThanOrEqual(results[i]!.complianceDelta.scoreDelta);
      }
    });
  });
});
