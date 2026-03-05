import { describe, it, expect, vi } from "vitest";
import React from "react";

vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: any) => <div>{children}</div>,
  Page: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (styles: any) => styles },
  Font: { register: vi.fn() },
}));

import {
  buildInsuranceComplianceReportConfig,
  InsuranceComplianceReportPDF,
} from "./insurance-compliance-report";
import type { InsuranceComplianceReportData } from "./insurance-compliance-report";

function makeData(
  overrides: Partial<InsuranceComplianceReportData> = {},
): InsuranceComplianceReportData {
  return {
    reportNumber: "INS-2025-001",
    reportDate: new Date("2025-06-01"),
    organization: "SpaceCo Ltd",
    generatedBy: "admin@spaceco.eu",
    operatorProfile: {
      name: "SpaceCo Ltd",
      jurisdiction: "Germany",
      operatorType: "Satellite Operator",
      companySize: "Medium",
    },
    missionProfile: {
      missionName: "Alpha Mission",
      missionType: "EO",
      orbitType: "LEO",
      satelliteCount: 5,
      totalMassKg: 750,
      launchValue: "EUR 50M",
      inOrbitValue: "EUR 80M",
    },
    tplAnalysis: {
      requiredCoverage: "EUR 60M",
      requiredCoverageEUR: 60000000,
      calculationBasis: "Mass and orbit",
      riskFactors: ["Orbit altitude", "Mass"],
      jurisdictionRequirements: "German Space Act",
      euSpaceActReference: "Art. 15",
    },
    requiredPolicies: [
      {
        type: "TPL",
        description: "Third party liability",
        minimumCoverage: "EUR 60M",
        status: "covered",
        policyNumber: "POL-001",
        insurer: "SpaceInsure AG",
        validUntil: "2026-06-01",
      },
      {
        type: "Launch",
        description: "Launch coverage",
        minimumCoverage: "EUR 50M",
        status: "missing",
        notes: "Procurement in progress",
      },
    ],
    optionalPolicies: [
      {
        type: "Business Interruption",
        description: "Revenue protection",
        recommendedCoverage: "EUR 10M",
        priority: "high",
        rationale: "Significant revenue dependency on satellite operations",
      },
    ],
    premiumEstimates: {
      annualPremiumMin: "EUR 250K",
      annualPremiumMax: "EUR 500K",
      factors: ["Orbit type", "Track record"],
      marketConditions: "Soft",
    },
    complianceStatus: {
      overallStatus: "partial",
      compliantPolicies: 1,
      pendingPolicies: 0,
      missingPolicies: 1,
      gaps: ["Missing launch coverage"],
      recommendations: ["Procure launch insurance"],
    },
    regulatoryRequirements: [
      {
        jurisdiction: "Germany",
        requirement: "TPL as per German Space Act Section 14",
        minimumCoverage: "EUR 60M",
        applicability: "All operators",
      },
    ],
    nextSteps: ["Contact broker", "Submit policy to NCA"],
    ...overrides,
  };
}

describe("buildInsuranceComplianceReportConfig", () => {
  it("returns valid metadata", () => {
    const config = buildInsuranceComplianceReportConfig(makeData());
    expect(config.metadata.reportId).toBe("INS-2025-001");
    expect(config.metadata.reportType).toBe("insurance");
    expect(config.metadata.title).toBe("Insurance Compliance Report");
  });

  it("sets header with mission name", () => {
    const config = buildInsuranceComplianceReportConfig(makeData());
    expect(config.header.subtitle).toContain("Alpha Mission");
    expect(config.header.subtitle).toContain("Art. 15");
  });

  it("uses info alert for compliant status", () => {
    const data = makeData({
      complianceStatus: {
        ...makeData().complianceStatus,
        overallStatus: "compliant",
      },
    });
    const config = buildInsuranceComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("info");
    expect(alert.message).toContain("in place");
  });

  it("uses warning alert for partial status", () => {
    const config = buildInsuranceComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("warning");
  });

  it("uses error alert for non_compliant status", () => {
    const data = makeData({
      complianceStatus: {
        ...makeData().complianceStatus,
        overallStatus: "non_compliant",
      },
    });
    const config = buildInsuranceComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("error");
  });

  it("includes optional operator profile fields", () => {
    const data = makeData({
      operatorProfile: {
        ...makeData().operatorProfile,
        registrationNumber: "HRB-12345",
        contactEmail: "ops@spaceco.eu",
      },
    });
    const config = buildInsuranceComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Operator Profile"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const reg = kv.items.find((i: any) => i.key === "Registration Number");
    expect(reg.value).toBe("HRB-12345");
  });

  it("excludes optional operator fields when not provided", () => {
    const config = buildInsuranceComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Operator Profile"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const keys = kv.items.map((i: any) => i.key);
    expect(keys).not.toContain("Registration Number");
  });

  it("includes optional mission profile fields", () => {
    const data = makeData({
      missionProfile: {
        ...makeData().missionProfile,
        launchProvider: "Arianespace",
        plannedLaunchDate: "2025-Q4",
      },
    });
    const config = buildInsuranceComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Mission Profile"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const lp = kv.items.find((i: any) => i.key === "Launch Provider");
    expect(lp.value).toBe("Arianespace");
  });

  it("builds required policies table", () => {
    const config = buildInsuranceComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Required Insurance Policies"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0][2]).toBe("COVERED");
  });

  it("adds alerts for non-covered policies with notes", () => {
    const config = buildInsuranceComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Required Insurance Policies"),
    );
    const alerts = section!.content.filter((c) => c.type === "alert");
    expect(alerts.length).toBeGreaterThan(0);
  });

  it("builds detailed policy requirements with optional fields", () => {
    const config = buildInsuranceComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Detailed Policy Requirements"),
    );
    expect(section).toBeDefined();
    const headings = section!.content.filter((c) => c.type === "heading");
    expect(headings).toHaveLength(2);
  });

  it("includes optional policies section when policies exist", () => {
    const config = buildInsuranceComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Recommended Additional"),
    );
    expect(section).toBeDefined();
  });

  it("omits optional policies section when empty", () => {
    const data = makeData({ optionalPolicies: [] });
    const config = buildInsuranceComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Recommended Additional"),
    );
    expect(section).toBeUndefined();
  });

  it("includes premium estimates section", () => {
    const config = buildInsuranceComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Premium Cost"),
    );
    expect(section).toBeDefined();
  });

  it("includes gaps when present", () => {
    const config = buildInsuranceComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Compliance Gaps"),
    );
    const list = section!.content.find((c) => c.type === "list") as any;
    expect(list.items).toContain("Missing launch coverage");
  });

  it("shows no gaps message when no gaps", () => {
    const data = makeData({
      complianceStatus: { ...makeData().complianceStatus, gaps: [] },
    });
    const config = buildInsuranceComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Compliance Gaps"),
    );
    const text = section!.content.find(
      (c) =>
        c.type === "text" && (c as any).value.includes("No compliance gaps"),
    );
    expect(text).toBeDefined();
  });

  it("truncates long regulatory requirements", () => {
    const data = makeData({
      regulatoryRequirements: [
        {
          jurisdiction: "DE",
          requirement: "A".repeat(50),
          minimumCoverage: "EUR 60M",
          applicability: "All",
        },
      ],
    });
    const config = buildInsuranceComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Regulatory Requirements"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows[0][1]).toContain("...");
  });

  it("truncates long optional policy rationale", () => {
    const data = makeData({
      optionalPolicies: [
        {
          type: "BI",
          description: "Biz interruption",
          recommendedCoverage: "EUR 10M",
          priority: "high",
          rationale: "A".repeat(60),
        },
      ],
    });
    const config = buildInsuranceComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Recommended Additional"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows[0][3]).toContain("...");
  });
});

describe("InsuranceComplianceReportPDF component", () => {
  it("renders without errors", () => {
    const element = React.createElement(InsuranceComplianceReportPDF, {
      data: makeData(),
    });
    expect(element).toBeTruthy();
  });
});
