import { describe, it, expect } from "vitest";
import { computeImpact } from "./impact-analysis";
import type { NCADocumentType } from "./types";

describe("computeImpact", () => {
  it("returns affected documents when altitudeKm changes", () => {
    const results = computeImpact(
      [
        {
          field: "altitudeKm",
          source: "debris",
          oldValue: 550,
          newValue: 1200,
        },
      ],
      new Set<NCADocumentType>(["DMP", "ORBITAL_LIFETIME", "EOL_DISPOSAL"]),
    );
    expect(results.length).toBe(1);
    expect(results[0].changedField).toBe("altitudeKm");
    expect(results[0].affectedDocuments.length).toBeGreaterThan(0);
    // Should only include documents that exist
    const docTypes = results[0].affectedDocuments.map((d) => d.documentType);
    for (const dt of docTypes) {
      expect([
        "DMP",
        "ORBITAL_LIFETIME",
        "EOL_DISPOSAL",
        "REENTRY_RISK",
        "LIGHT_RF_POLLUTION",
      ]).toContain(dt);
    }
  });

  it("marks existing documents correctly", () => {
    const results = computeImpact(
      [
        {
          field: "altitudeKm",
          source: "debris",
          oldValue: 550,
          newValue: 1200,
        },
      ],
      new Set<NCADocumentType>(["ORBITAL_LIFETIME"]),
    );
    const orbitDoc = results[0].affectedDocuments.find(
      (d) => d.documentType === "ORBITAL_LIFETIME",
    );
    expect(orbitDoc?.hasExistingDocument).toBe(true);
    const dmpDoc = results[0].affectedDocuments.find(
      (d) => d.documentType === "DMP",
    );
    expect(dmpDoc?.hasExistingDocument).toBe(false);
  });

  it("computes total sections affected", () => {
    const results = computeImpact(
      [
        {
          field: "altitudeKm",
          source: "debris",
          oldValue: 550,
          newValue: 1200,
        },
      ],
      new Set<NCADocumentType>(),
    );
    expect(results[0].totalSectionsAffected).toBeGreaterThan(0);
  });

  it("estimates regeneration time", () => {
    const results = computeImpact(
      [
        {
          field: "altitudeKm",
          source: "debris",
          oldValue: 550,
          newValue: 1200,
        },
      ],
      new Set<NCADocumentType>(),
    );
    expect(results[0].estimatedRegenerationTime).toMatch(/~\d+ min/);
  });

  it("handles multiple field changes", () => {
    const results = computeImpact(
      [
        {
          field: "altitudeKm",
          source: "debris",
          oldValue: 550,
          newValue: 1200,
        },
        {
          field: "deorbitStrategy",
          source: "debris",
          oldValue: "controlled_reentry",
          newValue: "graveyard",
        },
      ],
      new Set<NCADocumentType>(),
    );
    expect(results.length).toBe(2);
    expect(results[0].changedField).toBe("altitudeKm");
    expect(results[1].changedField).toBe("deorbitStrategy");
  });

  it("returns empty for unknown fields", () => {
    const results = computeImpact(
      [
        {
          field: "unknownField",
          source: "debris",
          oldValue: "a",
          newValue: "b",
        },
      ],
      new Set<NCADocumentType>(),
    );
    expect(results.length).toBe(0);
  });

  it("groups sections by document", () => {
    const results = computeImpact(
      [
        {
          field: "altitudeKm",
          source: "debris",
          oldValue: 550,
          newValue: 1200,
        },
      ],
      new Set<NCADocumentType>(),
    );
    // ORBITAL_LIFETIME should have multiple affected sections
    const orbitDoc = results[0].affectedDocuments.find(
      (d) => d.documentType === "ORBITAL_LIFETIME",
    );
    expect(orbitDoc).toBeDefined();
    expect(orbitDoc!.sections.length).toBeGreaterThanOrEqual(3);
  });
});
