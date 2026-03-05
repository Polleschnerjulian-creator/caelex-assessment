import { describe, it, expect } from "vitest";
import { getInsuranceComplianceTemplate } from "./c3-insurance-compliance";

describe("getInsuranceComplianceTemplate", () => {
  it("returns a non-empty string", () => {
    const result = getInsuranceComplianceTemplate();
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains the document code C3", () => {
    const result = getInsuranceComplianceTemplate();
    expect(result).toContain("C3");
  });

  it("references Art. 47-50 for insurance requirements", () => {
    const result = getInsuranceComplianceTemplate();
    expect(result).toContain("Art. 47-50");
    expect(result).toContain("Art. 48");
  });

  it("contains key SECTION markers", () => {
    const result = getInsuranceComplianceTemplate();
    expect(result).toContain("## SECTION: Executive Summary");
    expect(result).toContain("## SECTION: Organization Risk Profile");
    expect(result).toContain("## SECTION: Third-Party Liability Analysis");
    expect(result).toContain("## SECTION: Coverage Overview");
    expect(result).toContain("## SECTION: Gap Analysis");
    expect(result).toContain("## SECTION: Recommendations");
  });

  it("covers TPL (third-party liability)", () => {
    const result = getInsuranceComplianceTemplate();
    expect(result).toContain("TPL");
    expect(result).toContain("third-party liability");
  });

  it("includes jurisdiction requirements", () => {
    const result = getInsuranceComplianceTemplate();
    expect(result).toContain("## SECTION: Jurisdiction Requirements");
    expect(result).toContain("Liability Convention");
  });

  it("includes premium estimates section", () => {
    const result = getInsuranceComplianceTemplate();
    expect(result).toContain("## SECTION: Premium Estimates");
  });
});
