import { describe, it, expect } from "vitest";
import { DEPENDENCY_MAP, getDependencies } from "./impact-dependencies";

describe("DEPENDENCY_MAP", () => {
  it("has entries for key debris fields", () => {
    const fields = DEPENDENCY_MAP.map((d) => d.field);
    expect(fields).toContain("altitudeKm");
    expect(fields).toContain("orbitType");
    expect(fields).toContain("deorbitStrategy");
    expect(fields).toContain("satelliteCount");
    expect(fields).toContain("hasPropulsion");
  });

  it("has entries for key cybersecurity fields", () => {
    const fields = DEPENDENCY_MAP.map((d) => d.field);
    expect(fields).toContain("organizationSize");
    expect(fields).toContain("hasIncidentResponsePlan");
    expect(fields).toContain("isSimplifiedRegime");
  });

  it("altitudeKm affects multiple documents", () => {
    const deps = getDependencies("altitudeKm", "debris");
    expect(deps.length).toBeGreaterThanOrEqual(5);
    const docTypes = deps.map((d) => d.documentType);
    expect(docTypes).toContain("ORBITAL_LIFETIME");
    expect(docTypes).toContain("DMP");
    expect(docTypes).toContain("EOL_DISPOSAL");
  });

  it("returns empty array for unknown field", () => {
    const deps = getDependencies("unknownField", "debris");
    expect(deps).toEqual([]);
  });

  it("each dependency has required fields", () => {
    for (const mapping of DEPENDENCY_MAP) {
      for (const dep of mapping.affects) {
        expect(dep.documentType).toBeTruthy();
        expect(dep.sectionIndex).toBeGreaterThanOrEqual(0);
        expect(dep.sectionTitle).toBeTruthy();
        expect(["invalidates", "requires_review", "minor_update"]).toContain(
          dep.impactLevel,
        );
        expect(dep.reason).toBeTruthy();
      }
    }
  });
});
