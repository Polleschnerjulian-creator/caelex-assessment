import { describe, it, expect } from "vitest";
import { getOrbitalLifetimeTemplate } from "./a2-orbital-lifetime";

describe("getOrbitalLifetimeTemplate", () => {
  it("returns a non-empty string", () => {
    const result = getOrbitalLifetimeTemplate();
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains the document code A2-OLA", () => {
    const result = getOrbitalLifetimeTemplate();
    expect(result).toContain("A2");
    expect(result).toContain("OLA");
  });

  it("references Art. 72 for orbital lifetime", () => {
    const result = getOrbitalLifetimeTemplate();
    expect(result).toContain("Art. 72");
    expect(result).toContain("25-year");
  });

  it("contains required SECTION markers", () => {
    const result = getOrbitalLifetimeTemplate();
    expect(result).toContain("## SECTION: Cover Page & Document Control");
    expect(result).toContain("## SECTION: Executive Summary");
    expect(result).toContain("## SECTION: Orbital Parameters");
    expect(result).toContain("## SECTION: Sensitivity Analysis");
    expect(result).toContain("## SECTION: Conclusions & Recommendations");
  });

  it("references atmospheric drag and solar activity analysis", () => {
    const result = getOrbitalLifetimeTemplate();
    expect(result).toContain("Atmospheric Drag");
    expect(result).toContain("Solar Activity");
  });

  it("references decay modeling", () => {
    const result = getOrbitalLifetimeTemplate();
    expect(result).toContain("Decay Modeling");
  });

  it("references relevant standards", () => {
    const result = getOrbitalLifetimeTemplate();
    expect(result).toContain("ISO 24113");
    expect(result).toContain("IADC");
  });
});
