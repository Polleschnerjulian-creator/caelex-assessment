import { describe, it, expect } from "vitest";
import { getQualityRules } from "./quality-rules";

describe("getQualityRules", () => {
  it("returns a non-empty string", () => {
    const result = getQualityRules();
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains document classification requirements", () => {
    const result = getQualityRules();
    expect(result).toContain("NCA CONFIDENTIAL");
  });

  it("contains cover page standard", () => {
    const result = getQualityRules();
    expect(result).toContain("Cover Page Standard");
    expect(result).toContain("Document Control Block");
    expect(result).toContain("Approval Block");
  });

  it("contains executive summary standard", () => {
    const result = getQualityRules();
    expect(result).toContain("Executive Summary Standard");
    expect(result).toContain("Mission Context");
    expect(result).toContain("Compliance Determination");
  });

  it("contains compliance matrix standard", () => {
    const result = getQualityRules();
    expect(result).toContain("Compliance Matrix Standard");
    expect(result).toContain("Compliant");
    expect(result).toContain("Non-Compliant");
  });

  it("contains marker conventions", () => {
    const result = getQualityRules();
    expect(result).toContain("[ACTION REQUIRED:");
    expect(result).toContain("[EVIDENCE:");
  });

  it("defines section structure format", () => {
    const result = getQualityRules();
    expect(result).toContain("## SECTION:");
    expect(result).toContain("### SUBSECTION:");
  });

  it("specifies language and tone requirements", () => {
    const result = getQualityRules();
    expect(result).toContain("third-person");
    expect(result).toContain("shall");
  });

  it("contains disclaimer text", () => {
    const result = getQualityRules();
    expect(result).toContain("DISCLAIMER");
    expect(result).toContain("Caelex");
  });

  it("contains footer standard", () => {
    const result = getQualityRules();
    expect(result).toContain("Footer Standard");
    expect(result).toContain("caelex.eu");
  });
});
