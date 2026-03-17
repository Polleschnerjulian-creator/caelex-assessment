import { describe, it, expect } from "vitest";
import { getBaseRegulatoryPrompt } from "./base-regulatory";

describe("getBaseRegulatoryPrompt", () => {
  it("returns a non-empty string", () => {
    const result = getBaseRegulatoryPrompt();
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains EU Space Act reference", () => {
    const result = getBaseRegulatoryPrompt();
    expect(result).toContain("EU Space Act");
    expect(result).toContain("COM(2025) 335");
  });

  it("describes operator types", () => {
    const result = getBaseRegulatoryPrompt();
    expect(result).toContain("SCO");
    expect(result).toContain("LO");
    expect(result).toContain("LSO");
    expect(result).toContain("ISOS");
    expect(result).toContain("CAP");
    expect(result).toContain("PDP");
    expect(result).toContain("TCO");
  });

  it("covers both debris and cybersecurity articles", () => {
    const result = getBaseRegulatoryPrompt();
    // Debris articles
    expect(result).toContain("Art. 58");
    expect(result).toContain("Art. 67");
    expect(result).toContain("Art. 72");
    // Cybersecurity articles
    expect(result).toContain("Art. 74");
    expect(result).toContain("Art. 89");
  });

  it("references NCA institutions", () => {
    const result = getBaseRegulatoryPrompt();
    expect(result).toContain("CNES");
    expect(result).toContain("BNetzA");
    expect(result).toContain("UKSA");
  });

  it("references key standards", () => {
    const result = getBaseRegulatoryPrompt();
    expect(result).toContain("IADC");
    expect(result).toContain("ISO 24113");
    expect(result).toContain("NIST");
    expect(result).toContain("ISO/IEC 27001");
  });

  it("includes document interrelationships", () => {
    const result = getBaseRegulatoryPrompt();
    expect(result).toContain("Document Interrelationships");
    expect(result).toContain("Debris Document Chain");
    expect(result).toContain("Cybersecurity Document Chain");
  });

  it("mentions the light/simplified regime under Art. 10", () => {
    const result = getBaseRegulatoryPrompt();
    expect(result).toContain("Art. 10");
    expect(result).toContain("Simplified");
  });

  // --- Enacted-law-first structure tests ---

  it("presents enacted standards as PRIMARY before EU Space Act", () => {
    const result = getBaseRegulatoryPrompt();
    const primaryIdx = result.indexOf("PRIMARY REGULATORY FRAMEWORK");
    const tertiaryIdx = result.indexOf("TERTIARY REGULATORY FRAMEWORK");
    expect(primaryIdx).toBeGreaterThan(-1);
    expect(tertiaryIdx).toBeGreaterThan(-1);
    expect(primaryIdx).toBeLessThan(tertiaryIdx);
  });

  it("presents national law as SECONDARY", () => {
    const result = getBaseRegulatoryPrompt();
    const secondaryIdx = result.indexOf("SECONDARY REGULATORY FRAMEWORK");
    const tertiaryIdx = result.indexOf("TERTIARY REGULATORY FRAMEWORK");
    expect(secondaryIdx).toBeGreaterThan(-1);
    expect(secondaryIdx).toBeLessThan(tertiaryIdx);
  });

  it("marks EU Space Act as LEGISLATIVE PROPOSAL", () => {
    const result = getBaseRegulatoryPrompt();
    expect(result).toContain("LEGISLATIVE PROPOSAL");
    expect(result).toContain("legislative proposal");
  });

  it("references IADC guidelines in the PRIMARY section", () => {
    const result = getBaseRegulatoryPrompt();
    const primaryIdx = result.indexOf("PRIMARY REGULATORY FRAMEWORK");
    const secondaryIdx = result.indexOf("SECONDARY REGULATORY FRAMEWORK");
    const iadcIdx = result.indexOf("IADC Space Debris Mitigation Guidelines");
    expect(iadcIdx).toBeGreaterThan(primaryIdx);
    expect(iadcIdx).toBeLessThan(secondaryIdx);
  });

  it("references NIS2 as enacted in the PRIMARY section", () => {
    const result = getBaseRegulatoryPrompt();
    const primaryIdx = result.indexOf("PRIMARY REGULATORY FRAMEWORK");
    const secondaryIdx = result.indexOf("SECONDARY REGULATORY FRAMEWORK");
    const nis2Idx = result.indexOf("NIS2 Directive (EU) 2022/2555");
    expect(nis2Idx).toBeGreaterThan(primaryIdx);
    expect(nis2Idx).toBeLessThan(secondaryIdx);
  });

  it("references COPUOS LTS guidelines in the PRIMARY section", () => {
    const result = getBaseRegulatoryPrompt();
    const primaryIdx = result.indexOf("PRIMARY REGULATORY FRAMEWORK");
    const secondaryIdx = result.indexOf("SECONDARY REGULATORY FRAMEWORK");
    const copuosIdx = result.indexOf("COPUOS Long-Term Sustainability");
    expect(copuosIdx).toBeGreaterThan(primaryIdx);
    expect(copuosIdx).toBeLessThan(secondaryIdx);
  });

  it("includes national law jurisdictions in the SECONDARY section", () => {
    const result = getBaseRegulatoryPrompt();
    expect(result).toContain("France:");
    expect(result).toContain("LOS");
    expect(result).toContain("Germany:");
    expect(result).toContain("SatDSiG");
    expect(result).toContain("United Kingdom:");
    expect(result).toContain("SIA");
    expect(result).toContain("Space Industry Act 2018");
  });

  it("adds PROPOSAL markers to EU Space Act subsections", () => {
    const result = getBaseRegulatoryPrompt();
    expect(result).toContain("Structural Overview (PROPOSAL)");
    expect(result).toContain("Subsection Detail (PROPOSAL)");
  });
});
