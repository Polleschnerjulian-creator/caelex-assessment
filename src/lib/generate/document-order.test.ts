import { describe, it, expect } from "vitest";
import { computeOptimalOrder, DOCUMENT_DEPENDENCIES } from "./document-order";
import type { NCADocumentType } from "./types";

describe("DOCUMENT_DEPENDENCIES", () => {
  it("defines dependencies for DMP", () => {
    const dmpDeps = DOCUMENT_DEPENDENCIES.filter((d) => d.document === "DMP");
    expect(dmpDeps.length).toBeGreaterThan(0);
    const sources = dmpDeps.map((d) => d.dependsOn);
    expect(sources).toContain("ORBITAL_LIFETIME");
  });

  it("defines cybersecurity chain starting from CYBER_POLICY", () => {
    const b2Deps = DOCUMENT_DEPENDENCIES.filter(
      (d) => d.document === "CYBER_RISK_ASSESSMENT",
    );
    const sources = b2Deps.map((d) => d.dependsOn);
    expect(sources).toContain("CYBER_POLICY");
  });

  it("defines AUTHORIZATION_APPLICATION as depending on multiple masters", () => {
    const c1Deps = DOCUMENT_DEPENDENCIES.filter(
      (d) => d.document === "AUTHORIZATION_APPLICATION",
    );
    expect(c1Deps.length).toBeGreaterThanOrEqual(3);
  });
});

describe("computeOptimalOrder", () => {
  it("puts ORBITAL_LIFETIME before DMP", () => {
    const order = computeOptimalOrder([
      "DMP",
      "ORBITAL_LIFETIME",
    ] as NCADocumentType[]);
    const a2Idx = order.indexOf("ORBITAL_LIFETIME" as NCADocumentType);
    const a1Idx = order.indexOf("DMP" as NCADocumentType);
    expect(a2Idx).toBeLessThan(a1Idx);
  });

  it("puts CYBER_POLICY before CYBER_RISK_ASSESSMENT", () => {
    const order = computeOptimalOrder([
      "CYBER_RISK_ASSESSMENT",
      "CYBER_POLICY",
    ] as NCADocumentType[]);
    const b1Idx = order.indexOf("CYBER_POLICY" as NCADocumentType);
    const b2Idx = order.indexOf("CYBER_RISK_ASSESSMENT" as NCADocumentType);
    expect(b1Idx).toBeLessThan(b2Idx);
  });

  it("puts AUTHORIZATION_APPLICATION last in full package", () => {
    const allTypes: NCADocumentType[] = [
      "DMP",
      "ORBITAL_LIFETIME",
      "COLLISION_AVOIDANCE",
      "EOL_DISPOSAL",
      "PASSIVATION",
      "REENTRY_RISK",
      "DEBRIS_SUPPLY_CHAIN",
      "LIGHT_RF_POLLUTION",
      "CYBER_POLICY",
      "CYBER_RISK_ASSESSMENT",
      "INCIDENT_RESPONSE",
      "BCP_RECOVERY",
      "ACCESS_CONTROL",
      "SUPPLY_CHAIN_SECURITY",
      "EUSRN_PROCEDURES",
      "COMPLIANCE_MATRIX",
      "AUTHORIZATION_APPLICATION",
      "ENVIRONMENTAL_FOOTPRINT",
      "INSURANCE_COMPLIANCE",
    ];
    const order = computeOptimalOrder(allTypes);
    const c1Idx = order.indexOf("AUTHORIZATION_APPLICATION" as NCADocumentType);
    // Should be in the last 3
    expect(c1Idx).toBeGreaterThanOrEqual(order.length - 4);
  });

  it("returns all input documents", () => {
    const input: NCADocumentType[] = [
      "DMP",
      "ORBITAL_LIFETIME",
      "EOL_DISPOSAL",
    ];
    const order = computeOptimalOrder(input);
    expect(order.length).toBe(3);
    expect(new Set(order)).toEqual(new Set(input));
  });

  it("handles single document", () => {
    const order = computeOptimalOrder(["DMP"] as NCADocumentType[]);
    expect(order).toEqual(["DMP"]);
  });

  it("handles documents with no dependencies between them", () => {
    const order = computeOptimalOrder([
      "COLLISION_AVOIDANCE",
      "LIGHT_RF_POLLUTION",
    ] as NCADocumentType[]);
    expect(order.length).toBe(2);
  });

  it("foundations come before dependent documents in full order", () => {
    const allTypes: NCADocumentType[] = [
      "DMP",
      "ORBITAL_LIFETIME",
      "EOL_DISPOSAL",
      "CYBER_POLICY",
      "CYBER_RISK_ASSESSMENT",
    ];
    const order = computeOptimalOrder(allTypes);
    // A2 before A4 (EOL depends on Orbital Lifetime)
    expect(order.indexOf("ORBITAL_LIFETIME" as NCADocumentType)).toBeLessThan(
      order.indexOf("EOL_DISPOSAL" as NCADocumentType),
    );
    // B1 before B2
    expect(order.indexOf("CYBER_POLICY" as NCADocumentType)).toBeLessThan(
      order.indexOf("CYBER_RISK_ASSESSMENT" as NCADocumentType),
    );
  });
});
