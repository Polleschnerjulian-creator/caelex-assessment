import { describe, it, expect } from "vitest";
import { SECTION_DATA_MAP, getSectionDataFields } from "./section-data-map";
import { SECTION_DEFINITIONS } from "./section-definitions";

describe("SECTION_DATA_MAP", () => {
  it("has entries for all document types with sections", () => {
    for (const [docType, sections] of Object.entries(SECTION_DEFINITIONS)) {
      const map = SECTION_DATA_MAP[docType as keyof typeof SECTION_DATA_MAP];
      expect(map, `Missing map for ${docType}`).toBeDefined();
    }
  });

  it("DMP section indices match section definitions", () => {
    const dmpMap = SECTION_DATA_MAP.DMP;
    const dmpSections = SECTION_DEFINITIONS.DMP;
    for (const entry of dmpMap) {
      expect(entry.sectionIndex).toBeGreaterThanOrEqual(0);
      expect(entry.sectionIndex).toBeLessThan(dmpSections.length);
    }
  });
});

describe("getSectionDataFields", () => {
  it("returns fields for a valid DMP section", () => {
    const fields = getSectionDataFields("DMP", 4);
    expect(fields.length).toBeGreaterThan(0);
    const fieldNames = fields.map((f) => f.field);
    expect(fieldNames).toContain("altitudeKm");
    expect(fieldNames).toContain("orbitType");
  });

  it("returns empty array for cover page section (index 0)", () => {
    const fields = getSectionDataFields("DMP", 0);
    expect(fields.length).toBeLessThanOrEqual(2);
  });

  it("returns empty array for invalid section index", () => {
    const fields = getSectionDataFields("DMP", 99);
    expect(fields).toEqual([]);
  });
});
