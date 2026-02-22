import { describe, it, expect, vi } from "vitest";

// Mock server-only to allow importing in test environment
vi.mock("server-only", () => ({}));

// Import after mocking server-only
const {
  isLEO,
  isGEO,
  calculateDeorbitDeadline,
  getDeorbitSummary,
  LEO_THRESHOLDS,
} = await import("@/lib/compliance/deorbit-calculator");

describe("deorbit-calculator", () => {
  // ─── LEO_THRESHOLDS ───

  describe("LEO_THRESHOLDS", () => {
    it("should define thresholds for all four regulations", () => {
      expect(LEO_THRESHOLDS).toHaveProperty("euSpaceAct");
      expect(LEO_THRESHOLDS).toHaveProperty("fcc");
      expect(LEO_THRESHOLDS).toHaveProperty("copuos");
      expect(LEO_THRESHOLDS).toHaveProperty("iadc");
    });

    it("should have all thresholds set to 2000 km", () => {
      expect(LEO_THRESHOLDS.euSpaceAct).toBe(2000);
      expect(LEO_THRESHOLDS.fcc).toBe(2000);
      expect(LEO_THRESHOLDS.copuos).toBe(2000);
      expect(LEO_THRESHOLDS.iadc).toBe(2000);
    });
  });

  // ─── isLEO ───

  describe("isLEO", () => {
    it("should return true for 400 km (typical ISS orbit)", () => {
      expect(isLEO(400)).toBe(true);
    });

    it("should return true for 2000 km (upper LEO boundary)", () => {
      expect(isLEO(2000)).toBe(true);
    });

    it("should return false for 0 km (surface level)", () => {
      expect(isLEO(0)).toBe(false);
    });

    it("should return false for 2001 km (above LEO threshold)", () => {
      expect(isLEO(2001)).toBe(false);
    });

    it("should return false for -100 km (negative altitude)", () => {
      expect(isLEO(-100)).toBe(false);
    });
  });

  // ─── isGEO ───

  describe("isGEO", () => {
    it("should return true for 35786 km (exact GEO altitude)", () => {
      expect(isGEO(35786)).toBe(true);
    });

    it("should return true for 35586 km (GEO lower bound, -200 km)", () => {
      expect(isGEO(35586)).toBe(true);
    });

    it("should return true for 35986 km (GEO upper bound, +200 km)", () => {
      expect(isGEO(35986)).toBe(true);
    });

    it("should return false for 35585 km (just below GEO range)", () => {
      expect(isGEO(35585)).toBe(false);
    });

    it("should return false for 35987 km (just above GEO range)", () => {
      expect(isGEO(35987)).toBe(false);
    });

    it("should return false for 400 km (LEO altitude)", () => {
      expect(isGEO(400)).toBe(false);
    });
  });

  // ─── calculateDeorbitDeadline: LEO (400 km) ───

  describe("calculateDeorbitDeadline for LEO (400 km)", () => {
    const leoResult = calculateDeorbitDeadline({
      orbitType: "LEO",
      altitudeKm: 400,
    });

    it("should require EU Space Act deorbit with 5-year deadline", () => {
      expect(leoResult.euSpaceAct.required).toBe(true);
      expect(leoResult.euSpaceAct.maxYears).toBe(5);
    });

    it("should require FCC deorbit with 5-year deadline", () => {
      expect(leoResult.fcc.required).toBe(true);
      expect(leoResult.fcc.maxYears).toBe(5);
    });

    it("should require COPUOS deorbit with 25-year guideline", () => {
      expect(leoResult.copuos.required).toBe(true);
      expect(leoResult.copuos.maxYears).toBe(25);
    });

    it("should require IADC deorbit with 25-year guideline", () => {
      expect(leoResult.iadc.required).toBe(true);
      expect(leoResult.iadc.maxYears).toBe(25);
    });

    it("should identify 5-year rule as most restrictive", () => {
      expect(leoResult.mostRestrictive.required).toBe(true);
      expect(leoResult.mostRestrictive.maxYears).toBe(5);
    });
  });

  // ─── calculateDeorbitDeadline: GEO (35786 km) ───

  describe("calculateDeorbitDeadline for GEO (35786 km)", () => {
    const geoResult = calculateDeorbitDeadline({
      orbitType: "GEO",
      altitudeKm: 35786,
    });

    it("should require EU Space Act re-orbit with maxYears=0 (immediate)", () => {
      expect(geoResult.euSpaceAct.required).toBe(true);
      expect(geoResult.euSpaceAct.maxYears).toBe(0);
    });

    it("should require COPUOS disposal with maxYears=0 (immediate)", () => {
      expect(geoResult.copuos.required).toBe(true);
      expect(geoResult.copuos.maxYears).toBe(0);
    });

    it("should NOT require FCC deorbit (FCC rule is LEO-only)", () => {
      expect(geoResult.fcc.required).toBe(false);
    });

    it("should require IADC re-orbit for GEO", () => {
      expect(geoResult.iadc.required).toBe(true);
      expect(geoResult.iadc.maxYears).toBe(0);
    });

    it("should set most restrictive to immediate action", () => {
      expect(geoResult.mostRestrictive.required).toBe(true);
      expect(geoResult.mostRestrictive.maxYears).toBe(0);
    });
  });

  // ─── calculateDeorbitDeadline: MEO (10000 km) ───

  describe("calculateDeorbitDeadline for MEO (10000 km)", () => {
    const meoResult = calculateDeorbitDeadline({
      orbitType: "MEO",
      altitudeKm: 10000,
    });

    it("should NOT require EU Space Act deorbit", () => {
      expect(meoResult.euSpaceAct.required).toBe(false);
    });

    it("should NOT require FCC deorbit", () => {
      expect(meoResult.fcc.required).toBe(false);
    });

    it("should NOT require COPUOS deorbit", () => {
      expect(meoResult.copuos.required).toBe(false);
    });

    it("should NOT require IADC deorbit", () => {
      expect(meoResult.iadc.required).toBe(false);
    });

    it("should indicate no deorbit requirement in mostRestrictive", () => {
      expect(meoResult.mostRestrictive.required).toBe(false);
    });
  });

  // ─── calculateDeorbitDeadline: constellation >100 ───

  describe("calculateDeorbitDeadline with large constellation (>100 satellites)", () => {
    const constellationResult = calculateDeorbitDeadline({
      orbitType: "LEO",
      altitudeKm: 550,
      isConstellation: true,
      constellationSize: 150,
    });

    it("should add constellation-related notes for EU Space Act", () => {
      const notes = constellationResult.euSpaceAct.notes;
      const hasConstellationNote = notes.some((n) =>
        n.includes("Large constellation"),
      );
      expect(hasConstellationNote).toBe(true);
    });

    it("should mention enhanced debris management plan", () => {
      const notes = constellationResult.euSpaceAct.notes;
      const hasDebrisManagement = notes.some((n) =>
        n.includes("enhanced debris management plan"),
      );
      expect(hasDebrisManagement).toBe(true);
    });

    it("should mention Art. 60 for coordinated deorbit", () => {
      const notes = constellationResult.euSpaceAct.notes;
      const hasArt60 = notes.some((n) => n.includes("Art. 60"));
      expect(hasArt60).toBe(true);
    });
  });

  // ─── calculateDeorbitDeadline: large satellite >1000 kg ───

  describe("calculateDeorbitDeadline with large satellite (>1000 kg)", () => {
    const heavyResult = calculateDeorbitDeadline({
      orbitType: "LEO",
      altitudeKm: 600,
      satelliteMassKg: 1500,
    });

    it("should add casualty risk note for FCC", () => {
      const notes = heavyResult.fcc.notes;
      const hasCasualtyNote = notes.some((n) => n.includes("casualty risk"));
      expect(hasCasualtyNote).toBe(true);
    });

    it("should mention uncontrolled reentry assessment", () => {
      const notes = heavyResult.fcc.notes;
      const hasReentryNote = notes.some((n) =>
        n.includes("uncontrolled reentry"),
      );
      expect(hasReentryNote).toBe(true);
    });
  });

  // ─── getDeorbitSummary ───

  describe("getDeorbitSummary", () => {
    it("should return no-requirement message for MEO orbit", () => {
      const meoResult = calculateDeorbitDeadline({
        orbitType: "MEO",
        altitudeKm: 10000,
      });
      const summary = getDeorbitSummary(meoResult);
      expect(summary).toBe(
        "No deorbit requirement applies for this orbital regime.",
      );
    });

    it("should return immediate re-orbit message for GEO orbit", () => {
      const geoResult = calculateDeorbitDeadline({
        orbitType: "GEO",
        altitudeKm: 35786,
      });
      const summary = getDeorbitSummary(geoResult);
      expect(summary).toContain("Immediate re-orbit/disposal required");
      expect(summary).toContain(geoResult.mostRestrictive.regulation);
      expect(summary).toContain(geoResult.mostRestrictive.article);
    });

    it("should return N-years message for LEO orbit", () => {
      const leoResult = calculateDeorbitDeadline({
        orbitType: "LEO",
        altitudeKm: 400,
      });
      const summary = getDeorbitSummary(leoResult);
      expect(summary).toContain("Deorbit within 5 years of mission end");
      expect(summary).toContain(leoResult.mostRestrictive.regulation);
      expect(summary).toContain(leoResult.mostRestrictive.article);
    });
  });

  // ─── Deadline date calculation ───

  describe("deadline date calculation with missionEndDate", () => {
    const missionEnd = new Date("2030-06-15T00:00:00.000Z");
    const resultWithDate = calculateDeorbitDeadline({
      orbitType: "LEO",
      altitudeKm: 400,
      missionEndDate: missionEnd,
    });

    it("should calculate EU Space Act deadline as mission end + 5 years", () => {
      expect(resultWithDate.euSpaceAct.deadlineDate).toBeInstanceOf(Date);
      expect(resultWithDate.euSpaceAct.deadlineDate!.getFullYear()).toBe(2035);
      expect(resultWithDate.euSpaceAct.deadlineDate!.getMonth()).toBe(5); // June = 5
      expect(resultWithDate.euSpaceAct.deadlineDate!.getDate()).toBe(15);
    });

    it("should calculate FCC deadline as mission end + 5 years", () => {
      expect(resultWithDate.fcc.deadlineDate).toBeInstanceOf(Date);
      expect(resultWithDate.fcc.deadlineDate!.getFullYear()).toBe(2035);
    });

    it("should calculate COPUOS deadline as mission end + 25 years", () => {
      expect(resultWithDate.copuos.deadlineDate).toBeInstanceOf(Date);
      expect(resultWithDate.copuos.deadlineDate!.getFullYear()).toBe(2055);
      expect(resultWithDate.copuos.deadlineDate!.getMonth()).toBe(5);
      expect(resultWithDate.copuos.deadlineDate!.getDate()).toBe(15);
    });

    it("should calculate IADC deadline as mission end + 25 years", () => {
      expect(resultWithDate.iadc.deadlineDate).toBeInstanceOf(Date);
      expect(resultWithDate.iadc.deadlineDate!.getFullYear()).toBe(2055);
    });

    it("should not set deadline date when missionEndDate is omitted", () => {
      const noDateResult = calculateDeorbitDeadline({
        orbitType: "LEO",
        altitudeKm: 400,
      });
      expect(noDateResult.euSpaceAct.deadlineDate).toBeUndefined();
      expect(noDateResult.fcc.deadlineDate).toBeUndefined();
      expect(noDateResult.copuos.deadlineDate).toBeUndefined();
      expect(noDateResult.iadc.deadlineDate).toBeUndefined();
    });
  });
});
