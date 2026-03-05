import { describe, it, expect } from "vitest";
import { getDMPTemplate } from "./a1-dmp";

describe("getDMPTemplate", () => {
  it("returns a non-empty string", () => {
    const result = getDMPTemplate();
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains the document code A1-DMP", () => {
    const result = getDMPTemplate();
    expect(result).toContain("A1");
    expect(result).toContain("DMP");
  });

  it("references the correct EU Space Act articles for debris mitigation", () => {
    const result = getDMPTemplate();
    expect(result).toContain("Art. 67");
    expect(result).toContain("Art. 58-73");
    expect(result).toContain("ISO 24113");
  });

  it("contains SECTION markers for the required sections", () => {
    const result = getDMPTemplate();
    expect(result).toContain("## SECTION: Cover Page & Document Control");
    expect(result).toContain("## SECTION: Executive Summary");
    expect(result).toContain("## SECTION: Compliance Verification Matrix");
    expect(result).toContain("## SECTION: Gap Analysis & Remediation Roadmap");
  });

  it("references IADC guidelines", () => {
    const result = getDMPTemplate();
    expect(result).toContain("IADC");
    expect(result).toContain("IADC-02-01");
  });

  it("includes cross-references to other documents", () => {
    const result = getDMPTemplate();
    expect(result).toContain("Document A2");
    expect(result).toContain("Document A3");
    expect(result).toContain("Document A4");
  });
});
