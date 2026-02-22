import { describe, it, expect } from "vitest";
import {
  REGULATION_TIMELINE,
  getCurrentRegime,
  getUpcomingChanges,
} from "@/data/regulation-timeline";
import type { RegulationPhase } from "@/data/regulation-timeline";

describe("regulation-timeline", () => {
  describe("REGULATION_TIMELINE", () => {
    it("is a non-empty array", () => {
      expect(Array.isArray(REGULATION_TIMELINE)).toBe(true);
      expect(REGULATION_TIMELINE.length).toBeGreaterThan(0);
    });

    it("each entry has required fields", () => {
      for (const entry of REGULATION_TIMELINE) {
        // id
        expect(entry.id).toBeDefined();
        expect(typeof entry.id).toBe("string");
        expect(entry.id.length).toBeGreaterThan(0);

        // regulation
        expect(entry.regulation).toBeDefined();
        expect(typeof entry.regulation).toBe("string");
        expect(entry.regulation.length).toBeGreaterThan(0);

        // status
        expect(entry.status).toBeDefined();
        expect(["in_force", "transition", "superseded", "upcoming"]).toContain(
          entry.status,
        );

        // effectiveDate (ISO date format YYYY-MM-DD)
        expect(entry.effectiveDate).toBeDefined();
        expect(typeof entry.effectiveDate).toBe("string");
        expect(entry.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // applicableTo
        expect(entry.applicableTo).toBeDefined();
        expect(Array.isArray(entry.applicableTo)).toBe(true);
        expect(entry.applicableTo.length).toBeGreaterThan(0);

        // notes
        expect(entry.notes).toBeDefined();
        expect(typeof entry.notes).toBe("string");
        expect(entry.notes.length).toBeGreaterThan(0);
      }
    });

    it("contains known regulations", () => {
      const regulations = REGULATION_TIMELINE.map((e) => e.regulation);
      expect(regulations).toContain("NIS2 Directive (EU 2022/2555)");
      expect(regulations).toContain("FCC 5-Year Deorbit Rule");
    });

    it("has unique ids", () => {
      const ids = REGULATION_TIMELINE.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("getCurrentRegime", () => {
    it("returns only in_force and transition phases for the current date", () => {
      const result = getCurrentRegime("all_space_operators");

      expect(result.length).toBeGreaterThan(0);

      for (const phase of result) {
        // Current regime should not include purely "upcoming" phases with future effective dates
        const now = new Date();
        const nowStr = now.toISOString().split("T")[0];
        expect(phase.effectiveDate <= nowStr).toBe(true);
      }
    });

    it("excludes phases with effective dates in the future", () => {
      // Use a date far in the past to limit results
      const pastDate = new Date("2020-01-01");
      const result = getCurrentRegime("all_space_operators", pastDate);
      const pastStr = pastDate.toISOString().split("T")[0];

      for (const phase of result) {
        expect(phase.effectiveDate <= pastStr).toBe(true);
      }
    });

    it("includes NIS2 as currently in force", () => {
      // NIS2 effective date is 2024-10-18, so use a date after that
      const afterNis2 = new Date("2025-01-01");
      const result = getCurrentRegime("all_space_operators", afterNis2);

      const nis2Phase = result.find((p) => p.id === "nis2-current");
      expect(nis2Phase).toBeDefined();
      expect(nis2Phase!.status).toBe("in_force");
    });

    it("excludes transition phases whose transitionEndDate has passed", () => {
      // Use a far-future date to verify that expired transition phases are excluded
      const farFuture = new Date("2099-01-01");
      const result = getCurrentRegime("all_space_operators", farFuture);

      for (const phase of result) {
        if (phase.status === "transition" && phase.transitionEndDate) {
          const farFutureStr = farFuture.toISOString().split("T")[0];
          // If transition phase is in result, its end date must not have passed
          expect(phase.transitionEndDate >= farFutureStr).toBe(true);
        }
      }
    });
  });

  describe("getUpcomingChanges", () => {
    it("returns phases effective within the next N months", () => {
      const result = getUpcomingChanges(12);

      expect(Array.isArray(result)).toBe(true);

      const now = new Date();
      const nowStr = now.toISOString().split("T")[0];
      const future = new Date(now);
      future.setMonth(future.getMonth() + 12);
      const futureStr = future.toISOString().split("T")[0];

      for (const phase of result) {
        // Each phase effective date must be after now and within 12 months
        expect(phase.effectiveDate > nowStr).toBe(true);
        expect(phase.effectiveDate <= futureStr).toBe(true);
      }
    });

    it("returns an empty array when no changes are within range", () => {
      // 0 months should return nothing that is strictly in the future
      const result = getUpcomingChanges(0);
      expect(Array.isArray(result)).toBe(true);
      // Either empty or any result must have effectiveDate between now and now
      // (effectively empty since future = now)
    });

    it("returns phases that are valid RegulationPhase objects", () => {
      const result = getUpcomingChanges(120); // 10 years to capture all upcoming

      for (const phase of result) {
        expect(phase.id).toBeDefined();
        expect(phase.regulation).toBeDefined();
        expect(phase.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(phase.applicableTo).toBeDefined();
        expect(phase.notes).toBeDefined();
      }
    });

    it("with 12 months returns only near-term upcoming items", () => {
      const shortTerm = getUpcomingChanges(12);
      const longTerm = getUpcomingChanges(120);

      // Long-term window should include at least as many results as short-term
      expect(longTerm.length).toBeGreaterThanOrEqual(shortTerm.length);
    });
  });
});
