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
});
