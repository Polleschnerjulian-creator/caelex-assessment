import { describe, it, expect } from "vitest";
import { getCyberRiskTemplate } from "./b2-cyber-risk";

describe("getCyberRiskTemplate", () => {
  it("returns a non-empty string", () => {
    const result = getCyberRiskTemplate();
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains the document code B2-CRA", () => {
    const result = getCyberRiskTemplate();
    expect(result).toContain("B2");
    expect(result).toContain("CRA");
  });

  it("references Art. 77-78 for risk assessment", () => {
    const result = getCyberRiskTemplate();
    expect(result).toContain("Art. 77");
    expect(result).toContain("Art. 78");
  });

  it("contains SECTION markers for required sections", () => {
    const result = getCyberRiskTemplate();
    expect(result).toContain("## SECTION: Cover Page & Document Control");
    expect(result).toContain("## SECTION: Executive Summary");
    expect(result).toContain("## SECTION: Risk Assessment Methodology");
    expect(result).toContain("## SECTION: Asset Inventory & Classification");
    expect(result).toContain("## SECTION: Threat Landscape Analysis");
    expect(result).toContain("## SECTION: Risk Register & Evaluation");
    expect(result).toContain("## SECTION: Risk Treatment Plan");
  });

  it("references CCSDS 350.1-G-3 for space-specific threats", () => {
    const result = getCyberRiskTemplate();
    expect(result).toContain("CCSDS 350.1-G-3");
  });

  it("references NIST SP 800-30 methodology", () => {
    const result = getCyberRiskTemplate();
    expect(result).toContain("NIST SP 800-30");
  });
});
