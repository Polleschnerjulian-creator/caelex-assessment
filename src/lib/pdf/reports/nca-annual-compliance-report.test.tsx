import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: any) => <div data-testid="document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="page">{children}</div>,
  Text: ({ children, render: renderProp, ...props }: any) => (
    <span {...props}>
      {renderProp ? renderProp({ pageNumber: 1, totalPages: 1 }) : children}
    </span>
  ),
  View: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (styles: any) => styles },
  Font: { register: vi.fn() },
}));

import {
  buildNCAAnnualComplianceReportConfig,
  NCAAnnualComplianceReport,
} from "./nca-annual-compliance-report";
import type { NCAAnnualComplianceReportData } from "./nca-annual-compliance-report";

function makeData(
  overrides: Partial<NCAAnnualComplianceReportData> = {},
): NCAAnnualComplianceReportData {
  return {
    reportYear: "2025",
    reportDate: new Date("2025-12-01"),
    organization: "SpaceCo Ltd",
    generatedBy: "admin@spaceco.eu",
    operatorType: "Satellite Operator",
    operatorDetails: {
      legalName: "SpaceCo Ltd",
      primaryNCA: "BNetzA",
    },
    fleetOverview: {
      totalSpacecraft: 10,
      activeSpacecraft: 8,
      decommissioned: 2,
      orbitalRegime: "LEO",
      missionTypes: ["EO", "Comms"],
    },
    complianceStatus: {
      overallScore: 85,
      authorizationCompliant: true,
      debrisCompliant: true,
      cybersecurityCompliant: true,
      insuranceCompliant: true,
      efdCompliant: true,
      reportingCompliant: true,
    },
    incidentsSummary: {
      totalIncidents: 5,
      criticalIncidents: 0,
      highIncidents: 1,
      mediumIncidents: 2,
      lowIncidents: 2,
      resolvedIncidents: 4,
      ncaNotifications: 1,
    },
    keyActivities: [
      {
        date: new Date("2025-03-01"),
        activity: "Launched SAT-5",
        status: "Completed",
      },
    ],
    debrisMitigation: {
      passivationCompliance: true,
      deorbitCompliance: true,
      collisionAvoidanceManeuvers: 3,
      debrisGeneratingEvents: 0,
    },
    cybersecurity: {
      incidentCount: 1,
      certifications: ["ISO 27001"],
    },
    insurance: {
      coverageAmount: 5000000,
      insurer: "SpaceInsure AG",
    },
    environmental: {
      efdSubmitted: true,
    },
    plannedActivities: ["Launch SAT-11", "Decommission SAT-2"],
    ...overrides,
  };
}

describe("buildNCAAnnualComplianceReportConfig", () => {
  it("returns valid metadata with report year", () => {
    const config = buildNCAAnnualComplianceReportConfig(makeData());
    expect(config.metadata.reportId).toBe("ACR-2025");
    expect(config.metadata.reportType).toBe("annual_compliance");
    expect(config.metadata.title).toContain("2025");
  });

  it("sets header and footer correctly", () => {
    const config = buildNCAAnnualComplianceReportConfig(makeData());
    expect(config.header.title).toBe("Annual Compliance Report");
    expect(config.header.subtitle).toContain("2025");
    expect(config.footer.confidentialityNotice).toBe("OFFICIAL");
  });

  it("assigns Excellent grade for score >= 90", () => {
    const data = makeData({
      complianceStatus: {
        ...makeData().complianceStatus,
        overallScore: 95,
      },
    });
    const config = buildNCAAnnualComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const text = section!.content.find((c) => c.type === "text") as any;
    expect(text.value).toContain("Excellent");
  });

  it("assigns Good grade for score >= 75 and < 90", () => {
    const config = buildNCAAnnualComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const text = section!.content.find((c) => c.type === "text") as any;
    expect(text.value).toContain("Good");
  });

  it("assigns Satisfactory grade for score >= 60 and < 75", () => {
    const data = makeData({
      complianceStatus: { ...makeData().complianceStatus, overallScore: 65 },
    });
    const config = buildNCAAnnualComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const text = section!.content.find((c) => c.type === "text") as any;
    expect(text.value).toContain("Satisfactory");
  });

  it("assigns Requires Improvement grade for score < 60", () => {
    const data = makeData({
      complianceStatus: { ...makeData().complianceStatus, overallScore: 40 },
    });
    const config = buildNCAAnnualComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const text = section!.content.find((c) => c.type === "text") as any;
    expect(text.value).toContain("Requires Improvement");
  });

  it("uses info alert for score >= 75", () => {
    const config = buildNCAAnnualComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Compliance Status"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("info");
  });

  it("uses warning alert for score 60-74", () => {
    const data = makeData({
      complianceStatus: { ...makeData().complianceStatus, overallScore: 65 },
    });
    const config = buildNCAAnnualComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Compliance Status"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("warning");
  });

  it("uses error alert for score < 60", () => {
    const data = makeData({
      complianceStatus: { ...makeData().complianceStatus, overallScore: 30 },
    });
    const config = buildNCAAnnualComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Compliance Status"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("error");
  });

  it("shows non-compliant status markers", () => {
    const data = makeData({
      complianceStatus: {
        overallScore: 30,
        authorizationCompliant: false,
        debrisCompliant: false,
        cybersecurityCompliant: false,
        insuranceCompliant: false,
        efdCompliant: false,
        reportingCompliant: false,
      },
    });
    const config = buildNCAAnnualComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Compliance Status"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const authVal = kv.items.find((i: any) => i.key === "Authorization");
    expect(authVal.value).toContain("Non-Compliant");
  });

  it("handles optional operator details", () => {
    const data = makeData({
      operatorDetails: {
        legalName: "SpaceCo",
        primaryNCA: "BNetzA",
        registrationNumber: "REG-001",
        address: "Berlin, DE",
        authorizationNumber: "AUTH-001",
        authorizationDate: new Date("2024-01-15"),
      },
    });
    const config = buildNCAAnnualComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Operator Information"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const reg = kv.items.find((i: any) => i.key === "Registration Number");
    expect(reg.value).toBe("REG-001");
  });

  it("shows N/A for missing optional operator details", () => {
    const config = buildNCAAnnualComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Operator Information"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const reg = kv.items.find((i: any) => i.key === "Registration Number");
    expect(reg.value).toBe("N/A");
  });

  it("handles zero total incidents without division error", () => {
    const data = makeData({
      incidentsSummary: {
        totalIncidents: 0,
        criticalIncidents: 0,
        highIncidents: 0,
        mediumIncidents: 0,
        lowIncidents: 0,
        resolvedIncidents: 0,
        ncaNotifications: 0,
      },
    });
    const config = buildNCAAnnualComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Incidents Summary"),
    );
    expect(section).toBeDefined();
  });

  it("includes planned activities when provided", () => {
    const config = buildNCAAnnualComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Planned Activities"),
    );
    expect(section).toBeDefined();
  });

  it("omits planned activities when empty", () => {
    const data = makeData({ plannedActivities: [] });
    const config = buildNCAAnnualComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Planned Activities"),
    );
    expect(section).toBeUndefined();
  });

  it("shows Not completed for missing cybersecurity last assessment date", () => {
    const config = buildNCAAnnualComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Cybersecurity"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const la = kv.items.find((i: any) => i.key === "Last Assessment");
    expect(la.value).toBe("Not completed");
  });

  it("shows assessment date when provided", () => {
    const data = makeData({
      cybersecurity: {
        incidentCount: 0,
        lastAssessmentDate: new Date("2025-08-15"),
        certifications: [],
      },
    });
    const config = buildNCAAnnualComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Cybersecurity"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const la = kv.items.find((i: any) => i.key === "Last Assessment");
    expect(la.value).not.toBe("Not completed");
  });

  it("shows No certifications for empty certifications", () => {
    const data = makeData({
      cybersecurity: { incidentCount: 0, certifications: [] },
    });
    const config = buildNCAAnnualComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Cybersecurity"),
    );
    const list = section!.content.find((c) => c.type === "list") as any;
    expect(list.items[0]).toContain("No certifications");
  });

  it("handles optional insurance fields", () => {
    const data = makeData({
      insurance: {
        coverageAmount: 1000000,
        insurer: "Test Insurer",
        policyExpiry: new Date("2026-06-01"),
      },
    });
    const config = buildNCAAnnualComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Insurance Coverage"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const expiry = kv.items.find((i: any) => i.key === "Policy Expiry");
    expect(expiry.value).not.toBe("N/A");
  });

  it("handles optional environmental fields", () => {
    const data = makeData({
      environmental: {
        efdSubmitted: true,
        totalGWP: 5000,
        efdGrade: "B",
      },
    });
    const config = buildNCAAnnualComplianceReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Environmental"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const gwp = kv.items.find((i: any) => i.key === "Total GWP");
    expect(gwp.value).toContain("CO");
  });

  it("shows contact defaults when not provided", () => {
    const config = buildNCAAnnualComplianceReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Designated Contact"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const name = kv.items.find((i: any) => i.key === "Name");
    expect(name.value).toBe("Not specified");
  });
});

describe("NCAAnnualComplianceReport component", () => {
  it("renders without errors", () => {
    const element = React.createElement(NCAAnnualComplianceReport, {
      data: makeData(),
    });
    expect(element).toBeTruthy();
  });

  it("renders the header title via BaseReport", () => {
    const { container } = render(
      <NCAAnnualComplianceReport data={makeData()} />,
    );
    expect(container.textContent).toContain("Annual Compliance Report");
  });

  it("renders section content from the config", () => {
    const { container } = render(
      <NCAAnnualComplianceReport data={makeData()} />,
    );
    expect(container.textContent).toContain("Executive Summary");
    expect(container.textContent).toContain("SpaceCo Ltd");
  });

  it("renders footer with OFFICIAL notice", () => {
    const { container } = render(
      <NCAAnnualComplianceReport data={makeData()} />,
    );
    expect(container.textContent).toContain("OFFICIAL");
  });

  it("renders with all optional fields populated", () => {
    const data = makeData({
      operatorDetails: {
        legalName: "SpaceCo Ltd",
        primaryNCA: "BNetzA",
        registrationNumber: "REG-001",
        address: "Berlin",
        authorizationNumber: "AUTH-001",
        authorizationDate: new Date("2024-01-15"),
      },
      cybersecurity: {
        incidentCount: 2,
        lastAssessmentDate: new Date("2025-06-01"),
        certifications: ["ISO 27001", "SOC2"],
      },
      insurance: {
        coverageAmount: 10000000,
        insurer: "SpaceInsure",
        policyExpiry: new Date("2026-12-31"),
      },
      environmental: {
        efdSubmitted: true,
        totalGWP: 12000,
        efdGrade: "A",
      },
      contactName: "Jane Doe",
      contactEmail: "jane@spaceco.eu",
    });
    const { container } = render(<NCAAnnualComplianceReport data={data} />);
    expect(container.textContent).toContain("REG-001");
    expect(container.textContent).toContain("Jane Doe");
  });

  it("renders without planned activities when list is empty", () => {
    const data = makeData({ plannedActivities: [] });
    const { container } = render(<NCAAnnualComplianceReport data={data} />);
    expect(container.textContent).not.toContain("Planned Activities");
  });
});
