import { describe, it, expect } from "vitest";
import { getDocumentTemplate } from "./index";
import type { NCADocumentType } from "../../types";

describe("getDocumentTemplate", () => {
  describe("P0 document types with dedicated templates", () => {
    const p0Types: NCADocumentType[] = [
      "DMP",
      "ORBITAL_LIFETIME",
      "EOL_DISPOSAL",
      "CYBER_POLICY",
      "CYBER_RISK_ASSESSMENT",
      "INCIDENT_RESPONSE",
      "AUTHORIZATION_APPLICATION",
      "ENVIRONMENTAL_FOOTPRINT",
      "INSURANCE_COMPLIANCE",
    ];

    for (const docType of p0Types) {
      it(`returns a non-empty template for ${docType}`, () => {
        const result = getDocumentTemplate(docType);
        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });

      it(`template for ${docType} contains SECTION markers`, () => {
        const result = getDocumentTemplate(docType);
        expect(result).toContain("## SECTION:");
      });
    }
  });

  describe("P1/P2 document types use generic template", () => {
    const genericTypes: NCADocumentType[] = [
      "COLLISION_AVOIDANCE",
      "PASSIVATION",
      "REENTRY_RISK",
      "DEBRIS_SUPPLY_CHAIN",
      "LIGHT_RF_POLLUTION",
      "BCP_RECOVERY",
      "ACCESS_CONTROL",
      "SUPPLY_CHAIN_SECURITY",
      "EUSRN_PROCEDURES",
      "COMPLIANCE_MATRIX",
    ];

    for (const docType of genericTypes) {
      it(`returns a non-empty generic template for ${docType}`, () => {
        const result = getDocumentTemplate(docType);
        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });

      it(`generic template for ${docType} contains document-specific instructions`, () => {
        const result = getDocumentTemplate(docType);
        expect(result).toContain("Document-Specific Instructions");
      });

      it(`generic template for ${docType} contains SECTION markers`, () => {
        const result = getDocumentTemplate(docType);
        expect(result).toContain("## SECTION:");
      });
    }
  });

  it("generic template for debris type includes debris category detail", () => {
    const result = getDocumentTemplate("COLLISION_AVOIDANCE");
    expect(result).toContain("Debris Mitigation");
    expect(result).toContain("Title IV");
  });

  it("generic template for cybersecurity type includes cybersecurity category detail", () => {
    const result = getDocumentTemplate("BCP_RECOVERY");
    expect(result).toContain("Cybersecurity");
    expect(result).toContain("Title V");
  });
});
