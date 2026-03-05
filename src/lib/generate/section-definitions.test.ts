import { describe, it, expect } from "vitest";
import { SECTION_DEFINITIONS } from "./section-definitions";

describe("section-definitions", () => {
  it("exports definitions for all 19 NCA document types", () => {
    const keys = Object.keys(SECTION_DEFINITIONS);
    expect(keys.length).toBe(19);
  });

  it("each document type has at least 1 section", () => {
    for (const [key, sections] of Object.entries(SECTION_DEFINITIONS)) {
      expect(sections.length).toBeGreaterThan(0);
    }
  });

  it("each section has a number and title", () => {
    for (const sections of Object.values(SECTION_DEFINITIONS)) {
      for (const section of sections) {
        expect(typeof section.number).toBe("number");
        expect(section.title).toBeTruthy();
      }
    }
  });

  it("DMP has 11 sections", () => {
    expect(SECTION_DEFINITIONS.DMP).toHaveLength(11);
  });
});
