import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock cross-references data
vi.mock("@/data/cross-references", () => ({
  EXPORT_CYBER_CROSS_REFS: [
    {
      id: "ec-01",
      exportControl: {
        regulation: "ITAR",
        section: "22 CFR 120.17",
        topic: "Deemed Export",
      },
      cybersecurity: {
        regulation: "EU Space Act",
        article: "Art. 79",
        topic: "Information Security",
      },
      conflict:
        "Foreign nationals implementing cybersecurity controls may trigger deemed export.",
      resolution:
        "Obtain TAA before granting access to USML-listed cybersecurity systems.",
      severity: "high" as const,
    },
    {
      id: "ec-02",
      exportControl: {
        regulation: "EAR",
        section: "15 CFR 734.13",
        topic: "Encryption Export Controls",
      },
      cybersecurity: {
        regulation: "EU Space Act",
        article: "Art. 81-82",
        topic: "Cryptography & Encryption",
      },
      conflict:
        "EU Space Act mandates encryption but exporting encryption technology requires BIS license.",
      resolution: "Use License Exception ENC for commercial encryption.",
      severity: "medium" as const,
    },
    {
      id: "ec-03",
      exportControl: {
        regulation: "ITAR",
        section: "22 CFR 121 Cat. XV",
        topic: "Spacecraft Systems & Equipment",
      },
      cybersecurity: {
        regulation: "NIS2 Directive",
        article: "Art. 21(2)(d)",
        topic: "Supply Chain Security",
      },
      conflict:
        "NIS2 supply chain transparency may conflict with ITAR restrictions.",
      resolution: "Implement compartmentalized supply chain audits.",
      severity: "high" as const,
    },
  ],
  SPECTRUM_DEBRIS_CROSS_REFS: [
    {
      id: "sd-01",
      spectrum: {
        regulation: "ITU RR",
        article: "Art. 44",
        topic: "Spectrum License Duration",
      },
      debris: {
        regulation: "EU Space Act",
        article: "Art. 59",
        topic: "5-Year Deorbit Rule",
      },
      interaction:
        "Spectrum license expiry date should align with debris compliance deadlines.",
      recommendation:
        "Ensure ITU filing duration covers planned mission + maximum deorbit window.",
    },
    {
      id: "sd-02",
      spectrum: {
        regulation: "ITU RR",
        article: "Art. 11 & Res. 35 (WRC-23)",
        topic: "NGSO Milestone-Based Deployment",
      },
      debris: {
        regulation: "EU Space Act",
        article: "Art. 67",
        topic: "Debris Mitigation Plan",
      },
      interaction:
        "ITU milestone deployment deadlines may pressure operators to launch before debris mitigation plan approval.",
      recommendation:
        "Submit debris mitigation plan in parallel with ITU milestone notifications.",
    },
  ],
  INSURANCE_NATIONAL_CROSS_REFS: [
    {
      id: "in-01",
      country: "France",
      countryCode: "FR",
      euSpaceAct: { article: "Art. 44-51", topic: "Insurance Requirements" },
      nationalLaw: {
        name: "French Space Operations Act (LOS 2008)",
        provision: "Art. 6 & Decree 2009-643",
        topic: "Third-Party Liability Insurance",
      },
      minimumTPL: "\u20AC60,000,000",
      interaction: "French LOS mandates higher TPL insurance.",
      recommendation:
        "Comply with French TPL as it exceeds EU Space Act minimum.",
    },
    {
      id: "in-02",
      country: "United Kingdom",
      countryCode: "UK",
      euSpaceAct: { article: "Art. 44-51", topic: "Insurance Requirements" },
      nationalLaw: {
        name: "UK Space Industry Act 2018",
        provision: "Section 38 & Regulations 2021/792",
        topic: "Licensee Liability & Insurance",
      },
      minimumTPL: "\u00A360,000,000",
      interaction:
        "UK operators seeking EU market access must comply with both.",
      recommendation: "Maintain dual-compliant insurance.",
    },
    {
      id: "in-03",
      country: "Belgium",
      countryCode: "BE",
      euSpaceAct: { article: "Art. 44-51", topic: "Insurance Requirements" },
      nationalLaw: {
        name: "Belgian Space Activities Act 2005",
        provision: "Art. 15-17",
        topic: "Insurance Obligation",
      },
      minimumTPL: "Risk-based (set by Royal Decree)",
      interaction: "Belgian law delegates TPL amount to Royal Decree.",
      recommendation: "Engage BELSPO early to determine national TPL.",
    },
    {
      id: "in-04",
      country: "Netherlands",
      countryCode: "NL",
      euSpaceAct: { article: "Art. 44-51", topic: "Insurance Requirements" },
      nationalLaw: {
        name: "Dutch Space Activities Act 2007",
        provision: "Art. 3(2)(f)",
        topic: "Financial Security",
      },
      minimumTPL: "Risk-based (Minister determination)",
      interaction: "Dutch law requires adequate financial security.",
      recommendation:
        "Prepare for transition from discretionary to harmonized regime.",
    },
  ],
}));

// Mock regulation-timeline data
vi.mock("@/data/regulation-timeline", () => ({
  REGULATION_TIMELINE: [
    {
      id: "nis2-current",
      regulation: "NIS2 Directive (EU 2022/2555)",
      status: "in_force",
      effectiveDate: "2024-10-18",
      applicableTo: ["all_space_operators"],
      notes: "Currently binding for space operators.",
    },
  ],
  getUpcomingChanges: vi.fn().mockReturnValue([
    {
      id: "eu-space-act-transition",
      regulation: "EU Space Act -- Transition Period",
      status: "upcoming",
      effectiveDate: "2027-01-01",
      applicableTo: ["all_eu_operators"],
      notes:
        "Existing operators must achieve full compliance by end of transition.",
    },
  ]),
}));

import { detectCrossRegulationIssues } from "@/lib/services/cross-regulation-alert-service";
import type { CrossRegulationAlert } from "@/lib/services/cross-regulation-alert-service";

describe("cross-regulation-alert-service", () => {
  describe("detectCrossRegulationIssues", () => {
    let alerts: CrossRegulationAlert[];

    beforeEach(async () => {
      alerts = await detectCrossRegulationIssues("org-test-123");
    });

    it("returns alerts sorted by severity (high first, then medium, then low)", () => {
      const severities = alerts.map((a) => a.severity);
      const highIndices = severities
        .map((s, i) => (s === "high" ? i : -1))
        .filter((i) => i >= 0);
      const mediumIndices = severities
        .map((s, i) => (s === "medium" ? i : -1))
        .filter((i) => i >= 0);
      const lowIndices = severities
        .map((s, i) => (s === "low" ? i : -1))
        .filter((i) => i >= 0);

      // All high alerts come before all medium alerts
      if (highIndices.length > 0 && mediumIndices.length > 0) {
        expect(Math.max(...highIndices)).toBeLessThan(
          Math.min(...mediumIndices),
        );
      }

      // All medium alerts come before all low alerts
      if (mediumIndices.length > 0 && lowIndices.length > 0) {
        expect(Math.max(...mediumIndices)).toBeLessThan(
          Math.min(...lowIndices),
        );
      }

      // Verify we actually have all three severity levels
      expect(severities).toContain("high");
      expect(severities).toContain("medium");
      expect(severities).toContain("low");
    });

    it("includes export/cyber cross-reference alerts", () => {
      const exportCyberAlerts = alerts.filter((a) =>
        a.id.startsWith("alert-ec-"),
      );
      expect(exportCyberAlerts.length).toBe(3);

      // Verify first alert has ITAR reference
      const itarAlert = exportCyberAlerts.find((a) => a.id === "alert-ec-01");
      expect(itarAlert).toBeDefined();
      expect(itarAlert!.title).toContain("ITAR");
      expect(itarAlert!.title).toContain("EU Space Act");
      expect(itarAlert!.regulations).toContain("ITAR");
      expect(itarAlert!.regulations).toContain("EU Space Act");
      expect(itarAlert!.affectedModules).toContain("cybersecurity");
      expect(itarAlert!.affectedModules).toContain("authorization");
    });

    it("includes spectrum/debris cross-reference alerts", () => {
      const spectrumDebrisAlerts = alerts.filter((a) =>
        a.id.startsWith("alert-sd-"),
      );
      expect(spectrumDebrisAlerts.length).toBe(2);

      // All spectrum/debris alerts have medium severity
      for (const alert of spectrumDebrisAlerts) {
        expect(alert.severity).toBe("medium");
      }

      // Verify first alert references ITU RR and EU Space Act
      const firstAlert = spectrumDebrisAlerts.find(
        (a) => a.id === "alert-sd-01",
      );
      expect(firstAlert).toBeDefined();
      expect(firstAlert!.regulations).toContain("ITU RR");
      expect(firstAlert!.regulations).toContain("EU Space Act");
      expect(firstAlert!.affectedModules).toContain("debris");
      expect(firstAlert!.affectedModules).toContain("registration");
    });

    it("includes insurance/national law alerts capped at 3", () => {
      const insuranceAlerts = alerts.filter((a) =>
        a.id.startsWith("alert-in-"),
      );
      // We provided 4 entries in the mock but service caps at 3
      expect(insuranceAlerts.length).toBe(3);

      // All insurance alerts have low severity
      for (const alert of insuranceAlerts) {
        expect(alert.severity).toBe("low");
      }

      // Verify the 4th entry (Netherlands) is NOT included
      const netherlandsAlert = alerts.find((a) => a.id === "alert-in-04");
      expect(netherlandsAlert).toBeUndefined();

      // Verify country name appears in title
      const franceAlert = insuranceAlerts.find((a) => a.id === "alert-in-01");
      expect(franceAlert).toBeDefined();
      expect(franceAlert!.title).toContain("France");
      expect(franceAlert!.regulations).toContain("EU Space Act");
      expect(franceAlert!.affectedModules).toContain("insurance");
    });

    it("includes upcoming regulatory changes", () => {
      const upcomingAlerts = alerts.filter((a) =>
        a.id.startsWith("alert-upcoming-"),
      );
      expect(upcomingAlerts.length).toBe(1);

      const transitionAlert = upcomingAlerts[0];
      expect(transitionAlert.title).toContain("Upcoming:");
      expect(transitionAlert.title).toContain("EU Space Act");
      expect(transitionAlert.description).toContain("2027-01-01");
      expect(transitionAlert.severity).toBe("medium");
      expect(transitionAlert.regulations).toContain(
        "EU Space Act -- Transition Period",
      );
      expect(transitionAlert.affectedModules).toContain("authorization");
      expect(transitionAlert.affectedModules).toContain("cybersecurity");
    });

    it("each alert has all required fields", () => {
      expect(alerts.length).toBeGreaterThan(0);

      for (const alert of alerts) {
        // id
        expect(alert.id).toBeDefined();
        expect(typeof alert.id).toBe("string");
        expect(alert.id.length).toBeGreaterThan(0);

        // severity
        expect(alert.severity).toBeDefined();
        expect(["high", "medium", "low"]).toContain(alert.severity);

        // title
        expect(alert.title).toBeDefined();
        expect(typeof alert.title).toBe("string");
        expect(alert.title.length).toBeGreaterThan(0);

        // description
        expect(alert.description).toBeDefined();
        expect(typeof alert.description).toBe("string");
        expect(alert.description.length).toBeGreaterThan(0);

        // regulations
        expect(alert.regulations).toBeDefined();
        expect(Array.isArray(alert.regulations)).toBe(true);
        expect(alert.regulations.length).toBeGreaterThan(0);

        // resolution
        expect(alert.resolution).toBeDefined();
        expect(typeof alert.resolution).toBe("string");
        expect(alert.resolution.length).toBeGreaterThan(0);

        // affectedModules
        expect(alert.affectedModules).toBeDefined();
        expect(Array.isArray(alert.affectedModules)).toBe(true);
        expect(alert.affectedModules.length).toBeGreaterThan(0);
      }
    });

    it("returns the expected total number of alerts", () => {
      // 3 export/cyber + 2 spectrum/debris + 3 insurance (capped) + 1 upcoming = 9
      expect(alerts.length).toBe(9);
    });
  });
});
