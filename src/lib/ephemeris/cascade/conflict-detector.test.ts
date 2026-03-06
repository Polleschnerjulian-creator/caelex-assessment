import { describe, it, expect } from "vitest";
import {
  ConflictDetector,
  KNOWN_REQUIREMENTS,
  type RequirementSpec,
} from "./conflict-detector";

describe("ConflictDetector", () => {
  const detector = new ConflictDetector();

  // ─── Basic Detection ──────────────────────────────────────────────────

  describe("detectConflicts", () => {
    it("returns a complete conflict report", () => {
      const report = detector.detectConflicts(
        { noradId: "25544", name: "SAT-ALPHA" },
        ["DE-SatDSiG", "FR-LOS"],
      );

      expect(report.satellite.noradId).toBe("25544");
      expect(report.satellite.name).toBe("SAT-ALPHA");
      expect(report.generatedAt).toBeDefined();

      // Should always include EU-level frameworks
      expect(report.jurisdictions).toContain("EU Space Act");
      expect(report.jurisdictions).toContain("NIS2");
      expect(report.jurisdictions).toContain("IADC");

      // Plus the specified national ones
      expect(report.jurisdictions).toContain("DE-SatDSiG");
      expect(report.jurisdictions).toContain("FR-LOS");
    });

    it("detects overlapping fuel requirements", () => {
      const report = detector.detectConflicts(
        { noradId: "25544", name: "SAT-ALPHA" },
        ["FR-LOS"],
      );

      // EU-SA-70 (15%), EU-SA-72 (25%), IADC (10%), FR-CNES (20%)
      // All "fuel" domain, "ABOVE" direction → overlaps with stricter dominating
      const fuelOverlaps = report.overlaps.filter(
        (o) =>
          o.requirementA.domain === "fuel" && o.requirementB.domain === "fuel",
      );
      expect(fuelOverlaps.length).toBeGreaterThan(0);
    });

    it("detects cybersecurity overlaps across EU-SA, NIS2, DE", () => {
      const report = detector.detectConflicts(
        { noradId: "25544", name: "SAT-ALPHA" },
        ["DE-SatDSiG"],
      );

      const cyberOverlaps = report.overlaps.filter(
        (o) =>
          o.requirementA.domain === "cyber" ||
          o.requirementB.domain === "cyber",
      );
      expect(cyberOverlaps.length).toBeGreaterThan(0);
    });

    it("identifies aligned deorbit thresholds as low-severity overlaps", () => {
      const report = detector.detectConflicts(
        { noradId: "25544", name: "SAT-ALPHA" },
        ["DE-SatDSiG", "FR-LOS", "UK-SIA"],
      );

      // EU-SA-68, FR-LOS-deorbit, UK-SIA-deorbit, DE-WRG-disposal
      // All have 25-year threshold → identical overlap
      const deorbitOverlaps = report.overlaps.filter(
        (o) =>
          o.requirementA.domain === "orbital" &&
          o.requirementB.domain === "orbital" &&
          o.reason.includes("Identical threshold"),
      );
      expect(deorbitOverlaps.length).toBeGreaterThan(0);
    });

    it("calculates summary statistics", () => {
      const report = detector.detectConflicts(
        { noradId: "25544", name: "SAT-ALPHA" },
        ["DE-SatDSiG", "FR-LOS"],
      );

      expect(report.summary.totalPairs).toBe(
        report.summary.conflictCount +
          report.summary.overlapCount +
          report.summary.compatibleCount,
      );
      expect(report.summary.totalPairs).toBeGreaterThan(0);
      expect(report.summary.estimatedOverlapSavingsWeeks).toBe(
        report.summary.overlapCount * 2,
      );
    });

    it("sorts conflicts by severity (highest first)", () => {
      const report = detector.detectConflicts(
        { noradId: "25544", name: "SAT-ALPHA" },
        ["DE-SatDSiG", "FR-LOS", "UK-SIA"],
      );

      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      for (let i = 1; i < report.conflicts.length; i++) {
        expect(
          severityOrder[report.conflicts[i - 1]!.severity],
        ).toBeGreaterThanOrEqual(severityOrder[report.conflicts[i]!.severity]);
      }
    });
  });

  // ─── Threshold Comparison Logic ───────────────────────────────────────

  describe("threshold comparison", () => {
    it("detects stricter requirement in same-direction thresholds", () => {
      const customReqs: RequirementSpec[] = [
        {
          id: "reg-a",
          framework: "EU Space Act",
          article: "Art. X",
          domain: "fuel",
          description: "20% fuel reserve",
          threshold: { value: 20, unit: "%", direction: "ABOVE" },
        },
        {
          id: "reg-b",
          framework: "FR-LOS",
          article: "Art. Y",
          domain: "fuel",
          description: "30% fuel reserve",
          threshold: { value: 30, unit: "%", direction: "ABOVE" },
        },
      ];

      const customDetector = new ConflictDetector(customReqs);
      const report = customDetector.detectConflicts(
        { noradId: "25544", name: "TEST" },
        ["FR-LOS"],
      );

      expect(report.overlaps).toHaveLength(1);
      expect(report.overlaps[0]!.reason).toContain("stricter");
    });

    it("detects true conflict when ABOVE > BELOW thresholds", () => {
      const customReqs: RequirementSpec[] = [
        {
          id: "reg-a",
          framework: "EU Space Act",
          article: "Art. X",
          domain: "fuel",
          description: "Must have ≥50% fuel",
          threshold: { value: 50, unit: "%", direction: "ABOVE" },
        },
        {
          id: "reg-b",
          framework: "FR-LOS",
          article: "Art. Y",
          domain: "fuel",
          description: "Must have ≤30% fuel (to limit mass)",
          threshold: { value: 30, unit: "%", direction: "BELOW" },
        },
      ];

      const customDetector = new ConflictDetector(customReqs);
      const report = customDetector.detectConflicts(
        { noradId: "25544", name: "TEST" },
        ["FR-LOS"],
      );

      expect(report.conflicts).toHaveLength(1);
      expect(report.conflicts[0]!.type).toBe("CONFLICT");
      expect(report.conflicts[0]!.severity).toBe("CRITICAL");
      expect(report.conflicts[0]!.reason).toContain("Irreconcilable");
    });

    it("detects narrow feasible range for opposing but non-conflicting thresholds", () => {
      const customReqs: RequirementSpec[] = [
        {
          id: "reg-a",
          framework: "EU Space Act",
          article: "Art. X",
          domain: "fuel",
          description: "≥20% fuel",
          threshold: { value: 20, unit: "%", direction: "ABOVE" },
        },
        {
          id: "reg-b",
          framework: "FR-LOS",
          article: "Art. Y",
          domain: "fuel",
          description: "≤40% fuel",
          threshold: { value: 40, unit: "%", direction: "BELOW" },
        },
      ];

      const customDetector = new ConflictDetector(customReqs);
      const report = customDetector.detectConflicts(
        { noradId: "25544", name: "TEST" },
        ["FR-LOS"],
      );

      // Feasible range 20-40% → OVERLAP with HIGH severity
      expect(report.overlaps).toHaveLength(1);
      expect(report.overlaps[0]!.severity).toBe("HIGH");
      expect(report.overlaps[0]!.recommendation).toContain("midpoint");
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles empty jurisdictions (still includes EU-level)", () => {
      const report = detector.detectConflicts(
        { noradId: "25544", name: "SAT" },
        [],
      );

      expect(report.jurisdictions).toContain("EU Space Act");
      expect(report.jurisdictions).toContain("NIS2");
      expect(report.summary.totalPairs).toBeGreaterThan(0);
    });

    it("handles single national jurisdiction", () => {
      const report = detector.detectConflicts(
        { noradId: "25544", name: "SAT" },
        ["NO-SpaceAct"],
      );

      // Should compare NO requirements with EU-level
      expect(report.jurisdictions).toContain("NO-SpaceAct");
    });

    it("known requirements registry is non-empty", () => {
      expect(KNOWN_REQUIREMENTS.length).toBeGreaterThan(15);
    });
  });
});
