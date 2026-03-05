import { describe, it, expect } from "vitest";
import { getCyberPolicyTemplate } from "./b1-cyber-policy";

describe("getCyberPolicyTemplate", () => {
  it("returns a non-empty string", () => {
    const result = getCyberPolicyTemplate();
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains the document code B1-CSP", () => {
    const result = getCyberPolicyTemplate();
    expect(result).toContain("B1");
    expect(result).toContain("CSP");
  });

  it("references Art. 74 for cybersecurity policy", () => {
    const result = getCyberPolicyTemplate();
    expect(result).toContain("Art. 74");
    expect(result).toContain("Art. 74(1)-(4)");
  });

  it("contains key SECTION markers", () => {
    const result = getCyberPolicyTemplate();
    expect(result).toContain("## SECTION: Cover Page & Document Control");
    expect(result).toContain("## SECTION: Executive Summary");
    expect(result).toContain("## SECTION: Policy Scope & Applicability");
    expect(result).toContain("## SECTION: Roles & Responsibilities");
    expect(result).toContain("## SECTION: Compliance Matrix");
  });

  it("references NIST CSF 2.0 and ISO 27001", () => {
    const result = getCyberPolicyTemplate();
    expect(result).toContain("NIST CSF 2.0");
    expect(result).toContain("ISO/IEC 27001");
  });

  it("references NIS2 Directive", () => {
    const result = getCyberPolicyTemplate();
    expect(result).toContain("NIS2");
  });

  it("references all B-series documents as cross-references", () => {
    const result = getCyberPolicyTemplate();
    expect(result).toContain("Document B2");
    expect(result).toContain("Document B3");
    expect(result).toContain("Document B4");
    expect(result).toContain("Document B5");
  });
});
