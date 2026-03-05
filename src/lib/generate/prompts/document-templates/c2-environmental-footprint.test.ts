import { describe, it, expect } from "vitest";
import { getEnvironmentalFootprintTemplate } from "./c2-environmental-footprint";

describe("getEnvironmentalFootprintTemplate", () => {
  it("returns a non-empty string", () => {
    const result = getEnvironmentalFootprintTemplate();
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains the document code C2", () => {
    const result = getEnvironmentalFootprintTemplate();
    expect(result).toContain("C2");
  });

  it("references Art. 44-46 for environmental requirements", () => {
    const result = getEnvironmentalFootprintTemplate();
    expect(result).toContain("Art. 44-46");
  });

  it("references ISO 14040/14044 lifecycle assessment methodology", () => {
    const result = getEnvironmentalFootprintTemplate();
    expect(result).toContain("ISO 14040");
    expect(result).toContain("ISO 14044");
  });

  it("contains key SECTION markers", () => {
    const result = getEnvironmentalFootprintTemplate();
    expect(result).toContain("## SECTION: Executive Summary");
    expect(result).toContain("## SECTION: Mission Profile");
    expect(result).toContain("## SECTION: Lifecycle Assessment Methodology");
    expect(result).toContain("## SECTION: Launch Vehicle Analysis");
    expect(result).toContain("## SECTION: EFD Grade Justification");
    expect(result).toContain("## SECTION: Recommendations");
  });

  it("covers environmental metrics like GWP and ODP", () => {
    const result = getEnvironmentalFootprintTemplate();
    expect(result).toContain("GWP");
    expect(result).toContain("ODP");
    expect(result).toContain("CO2");
  });

  it("includes lifecycle phase breakdown", () => {
    const result = getEnvironmentalFootprintTemplate();
    expect(result).toContain("Manufacturing");
    expect(result).toContain("Launch Phase");
    expect(result).toContain("End-of-Life");
  });
});
