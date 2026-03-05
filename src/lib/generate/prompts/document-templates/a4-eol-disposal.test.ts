import { describe, it, expect } from "vitest";
import { getEOLDisposalTemplate } from "./a4-eol-disposal";

describe("getEOLDisposalTemplate", () => {
  it("returns a non-empty string", () => {
    const result = getEOLDisposalTemplate();
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains the document code A4-EOL", () => {
    const result = getEOLDisposalTemplate();
    expect(result).toContain("A4");
    expect(result).toContain("EOL");
  });

  it("references Art. 72 for disposal requirements", () => {
    const result = getEOLDisposalTemplate();
    expect(result).toContain("Art. 72");
    expect(result).toContain("Art. 72(1)-(5)");
  });

  it("contains key SECTION markers", () => {
    const result = getEOLDisposalTemplate();
    expect(result).toContain("## SECTION: Cover Page & Document Control");
    expect(result).toContain("## SECTION: Executive Summary");
    expect(result).toContain("## SECTION: Disposal Strategy Selection");
    expect(result).toContain("## SECTION: Fuel Budget Analysis");
    expect(result).toContain("## SECTION: Success Probability");
    expect(result).toContain("## SECTION: Contingency Procedures");
  });

  it("discusses disposal maneuver design", () => {
    const result = getEOLDisposalTemplate();
    expect(result).toContain("Disposal Maneuver");
    expect(result).toContain("delta-V");
  });

  it("references ISO 24113 success probability target", () => {
    const result = getEOLDisposalTemplate();
    expect(result).toContain("ISO 24113");
    expect(result).toContain("90%");
  });
});
