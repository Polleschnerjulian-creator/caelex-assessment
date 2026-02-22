import { describe, it, expect } from "vitest";
import {
  cybersecurityRequirements,
  type CybersecurityRequirement,
} from "@/data/cybersecurity-requirements";

describe("cybersecurity-enisa", () => {
  describe("ENISA guidance coverage", () => {
    it("imports cybersecurityRequirements as a non-empty array", () => {
      expect(Array.isArray(cybersecurityRequirements)).toBe(true);
      expect(cybersecurityRequirements.length).toBeGreaterThan(0);
    });

    it("at least 20 of 24 requirements have enisaGuidance defined", () => {
      const withGuidance = cybersecurityRequirements.filter(
        (req) => req.enisaGuidance && req.enisaGuidance.length > 0,
      );
      expect(withGuidance.length).toBeGreaterThanOrEqual(20);
    });

    it("each enisaGuidance entry has controlId starting with ENISA-", () => {
      for (const req of cybersecurityRequirements) {
        if (!req.enisaGuidance) continue;
        for (const guidance of req.enisaGuidance) {
          expect(typeof guidance.controlId).toBe("string");
          expect(guidance.controlId.startsWith("ENISA-")).toBe(true);
        }
      }
    });

    it("each enisaGuidance entry has a controlName string", () => {
      for (const req of cybersecurityRequirements) {
        if (!req.enisaGuidance) continue;
        for (const guidance of req.enisaGuidance) {
          expect(typeof guidance.controlName).toBe("string");
          expect(guidance.controlName.length).toBeGreaterThan(0);
        }
      }
    });

    it("each enisaGuidance entry has a valid segment", () => {
      const validSegments = ["space", "ground", "user", "link"];

      for (const req of cybersecurityRequirements) {
        if (!req.enisaGuidance) continue;
        for (const guidance of req.enisaGuidance) {
          expect(validSegments).toContain(guidance.segment);
        }
      }
    });

    it("each enisaGuidance entry has non-empty implementationSteps", () => {
      for (const req of cybersecurityRequirements) {
        if (!req.enisaGuidance) continue;
        for (const guidance of req.enisaGuidance) {
          expect(Array.isArray(guidance.implementationSteps)).toBe(true);
          expect(guidance.implementationSteps.length).toBeGreaterThan(0);

          // Each step should be a non-empty string
          for (const step of guidance.implementationSteps) {
            expect(typeof step).toBe("string");
            expect(step.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe("governance requirements have ENISA governance controls", () => {
    it("requirements in governance category have at least one ENISA control from governance_risk category", () => {
      const governanceReqs = cybersecurityRequirements.filter(
        (req) => req.category === "governance",
      );
      expect(governanceReqs.length).toBeGreaterThan(0);

      for (const req of governanceReqs) {
        expect(req.enisaGuidance).toBeDefined();
        expect(req.enisaGuidance!.length).toBeGreaterThan(0);

        // ENISA governance/risk controls use "ENISA-SPACE-1.1." prefix
        // (section 1 = Governance & Risk Management)
        const hasGovernanceControl = req.enisaGuidance!.some(
          (g) =>
            g.controlId.includes("1.1") ||
            g.controlName.toLowerCase().includes("governance") ||
            g.controlName.toLowerCase().includes("risk") ||
            g.controlName.toLowerCase().includes("policy") ||
            g.controlName.toLowerCase().includes("roles") ||
            g.controlName.toLowerCase().includes("responsibilities"),
        );
        expect(hasGovernanceControl).toBe(true);
      }
    });
  });

  describe("cryptography requirements reference ENISA cryptography controls", () => {
    it("requirements in cryptography category reference ENISA cryptography controls", () => {
      const cryptoReqs = cybersecurityRequirements.filter(
        (req) => req.category === "cryptography",
      );
      expect(cryptoReqs.length).toBeGreaterThan(0);

      for (const req of cryptoReqs) {
        expect(req.enisaGuidance).toBeDefined();
        expect(req.enisaGuidance!.length).toBeGreaterThan(0);

        // ENISA cryptography controls use "ENISA-SPACE-4.1." prefix
        // (section 4 = Cryptography)
        const hasCryptoControl = req.enisaGuidance!.some(
          (g) =>
            g.controlId.includes("4.1") ||
            g.controlName.toLowerCase().includes("crypto") ||
            g.controlName.toLowerCase().includes("encryption") ||
            g.controlName.toLowerCase().includes("key management"),
        );
        expect(hasCryptoControl).toBe(true);
      }
    });

    it("cryptography requirements cover multiple ENISA control areas", () => {
      const cryptoReqs = cybersecurityRequirements.filter(
        (req) => req.category === "cryptography",
      );

      // Collect all unique ENISA control IDs across crypto requirements
      const allCryptoControlIds = new Set<string>();
      for (const req of cryptoReqs) {
        if (!req.enisaGuidance) continue;
        for (const guidance of req.enisaGuidance) {
          allCryptoControlIds.add(guidance.controlId);
        }
      }

      // Should have multiple distinct ENISA controls mapped
      expect(allCryptoControlIds.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe("structural integrity of all requirements", () => {
    it("each requirement has an id, category, title, and description", () => {
      for (const req of cybersecurityRequirements) {
        expect(req.id).toBeDefined();
        expect(typeof req.id).toBe("string");
        expect(req.category).toBeDefined();
        expect(req.title).toBeDefined();
        expect(req.description).toBeDefined();
      }
    });

    it("all expected categories are represented", () => {
      const categories = new Set(
        cybersecurityRequirements.map((r) => r.category),
      );
      expect(categories.has("governance")).toBe(true);
      expect(categories.has("risk_assessment")).toBe(true);
      expect(categories.has("infosec")).toBe(true);
      expect(categories.has("cryptography")).toBe(true);
      expect(categories.has("detection_monitoring")).toBe(true);
      expect(categories.has("business_continuity")).toBe(true);
      expect(categories.has("incident_reporting")).toBe(true);
      expect(categories.has("eusrn")).toBe(true);
    });
  });
});
