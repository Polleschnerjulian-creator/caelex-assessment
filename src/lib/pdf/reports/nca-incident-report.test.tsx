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
  buildNCAIncidentReportConfig,
  NCAIncidentReport,
} from "./nca-incident-report";
import type { NCAIncidentReportData } from "./nca-incident-report";

function makeData(
  overrides: Partial<NCAIncidentReportData> = {},
): NCAIncidentReportData {
  return {
    incidentNumber: "INC-2025-001",
    reportDate: new Date("2025-06-01T10:00:00Z"),
    organization: "SpaceCo Ltd",
    generatedBy: "admin@spaceco.eu",
    title: "Signal Loss Event",
    category: "Comms",
    categoryDescription: "Communication failure",
    severity: "high",
    status: "Investigating",
    articleReference: "Art. 30",
    detectedAt: new Date("2025-05-30T08:00:00Z"),
    detectedBy: "OPS Team",
    detectionMethod: "Automated monitoring",
    affectedAssets: [
      { name: "SAT-1", cosparId: "2025-001A", noradId: "55001" },
    ],
    immediateActions: ["Switched to backup channel"],
    containmentMeasures: ["Isolated affected subsystem"],
    resolutionSteps: ["Patched firmware"],
    requiresNCANotification: true,
    ncaDeadlineHours: 24,
    reportedToNCA: false,
    reportedToEUSPA: false,
    ...overrides,
  };
}

describe("buildNCAIncidentReportConfig", () => {
  it("returns a valid ReportConfig with correct metadata", () => {
    const data = makeData();
    const config = buildNCAIncidentReportConfig(data);

    expect(config.metadata.reportId).toBe("INC-2025-001");
    expect(config.metadata.reportType).toBe("incident");
    expect(config.metadata.title).toContain("INC-2025-001");
    expect(config.metadata.generatedBy).toBe("admin@spaceco.eu");
    expect(config.metadata.organization).toBe("SpaceCo Ltd");
  });

  it("sets header and footer correctly", () => {
    const config = buildNCAIncidentReportConfig(makeData());

    expect(config.header.title).toBe("NCA Incident Report");
    expect(config.header.subtitle).toContain("EU Space Act");
    expect(config.header.logo).toBe(true);
    expect(config.footer.pageNumbers).toBe(true);
    expect(config.footer.confidentialityNotice).toBe("OFFICIAL - SENSITIVE");
    expect(config.footer.disclaimer).toBeDefined();
  });

  it("includes incident overview section", () => {
    const config = buildNCAIncidentReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Incident Overview"),
    );
    expect(section).toBeDefined();
    const kvContent = section!.content.find((c) => c.type === "keyValue");
    expect(kvContent).toBeDefined();
  });

  it("includes timeline section with containedAt and resolvedAt", () => {
    const data = makeData({
      containedAt: new Date("2025-05-30T12:00:00Z"),
      resolvedAt: new Date("2025-05-31T08:00:00Z"),
    });
    const config = buildNCAIncidentReportConfig(data);
    const section = config.sections.find((s) => s.title.includes("Timeline"));
    expect(section).toBeDefined();
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const keys = kv.items.map((i: any) => i.key);
    expect(keys).toContain("Contained At");
    expect(keys).toContain("Resolved At");
  });

  it("omits containedAt and resolvedAt from timeline when not provided", () => {
    const config = buildNCAIncidentReportConfig(makeData());
    const section = config.sections.find((s) => s.title.includes("Timeline"));
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const keys = kv.items.map((i: any) => i.key);
    expect(keys).not.toContain("Contained At");
    expect(keys).not.toContain("Resolved At");
  });

  it("includes root cause and impact assessment when provided", () => {
    const data = makeData({
      rootCause: "Hardware failure",
      impactAssessment: "Minor service disruption",
    });
    const config = buildNCAIncidentReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Incident Description"),
    );
    expect(section).toBeDefined();
    const headings = section!.content
      .filter((c) => c.type === "heading")
      .map((c: any) => c.value);
    expect(headings).toContain("Root Cause Analysis");
    expect(headings).toContain("Impact Assessment");
  });

  it("excludes root cause and impact assessment when not provided", () => {
    const config = buildNCAIncidentReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Incident Description"),
    );
    const headings = section!.content
      .filter((c) => c.type === "heading")
      .map((c: any) => c.value);
    expect(headings).not.toContain("Root Cause Analysis");
    expect(headings).not.toContain("Impact Assessment");
  });

  it("includes affected assets table when assets exist", () => {
    const config = buildNCAIncidentReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Affected Assets"),
    );
    expect(section).toBeDefined();
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0][0]).toBe("SAT-1");
  });

  it("omits affected assets section when no assets", () => {
    const data = makeData({ affectedAssets: [] });
    const config = buildNCAIncidentReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Affected Assets"),
    );
    expect(section).toBeUndefined();
  });

  it("includes response actions when actions exist", () => {
    const config = buildNCAIncidentReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Response Actions"),
    );
    expect(section).toBeDefined();
  });

  it("omits response actions when all lists empty", () => {
    const data = makeData({
      immediateActions: [],
      containmentMeasures: [],
      resolutionSteps: [],
    });
    const config = buildNCAIncidentReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Response Actions"),
    );
    expect(section).toBeUndefined();
  });

  it("includes lessons learned when provided", () => {
    const data = makeData({ lessonsLearned: "Use redundant channels" });
    const config = buildNCAIncidentReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Response Actions"),
    );
    const headings = section!.content
      .filter((c) => c.type === "heading")
      .map((c: any) => c.value);
    expect(headings).toContain("Lessons Learned");
  });

  it("sets alert to warning when NCA not yet reported", () => {
    const data = makeData({
      requiresNCANotification: true,
      reportedToNCA: false,
    });
    const config = buildNCAIncidentReportConfig(data);
    const section = config.sections.find((s) => s.title.includes("Regulatory"));
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("warning");
    expect(alert.message).toContain("required within");
  });

  it("sets alert to info when NCA reported", () => {
    const data = makeData({
      requiresNCANotification: true,
      reportedToNCA: true,
      ncaReportDate: new Date("2025-05-30T14:00:00Z"),
    });
    const config = buildNCAIncidentReportConfig(data);
    const section = config.sections.find((s) => s.title.includes("Regulatory"));
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("info");
    expect(alert.message).toContain("completed");
  });

  it("omits NCA alert when notification not required", () => {
    const data = makeData({ requiresNCANotification: false });
    const config = buildNCAIncidentReportConfig(data);
    const section = config.sections.find((s) => s.title.includes("Regulatory"));
    const alerts = section!.content.filter((c) => c.type === "alert");
    expect(alerts).toHaveLength(0);
  });

  it("includes contact section when contact info provided", () => {
    const data = makeData({
      contactName: "Jane Doe",
      contactEmail: "jane@spaceco.eu",
      contactPhone: "+49 123 456",
      contactRole: "Compliance Officer",
    });
    const config = buildNCAIncidentReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Designated Contact"),
    );
    expect(section).toBeDefined();
  });

  it("omits contact section when no contact info", () => {
    const config = buildNCAIncidentReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Designated Contact"),
    );
    expect(section).toBeUndefined();
  });

  it("handles asset without cosparId/noradId", () => {
    const data = makeData({
      affectedAssets: [{ name: "SAT-X" }],
    });
    const config = buildNCAIncidentReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Affected Assets"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows[0][1]).toBe("N/A");
    expect(table.rows[0][2]).toBe("N/A");
  });

  it("shows ncaReferenceNumber when provided", () => {
    const data = makeData({ ncaReferenceNumber: "NCA-REF-123" });
    const config = buildNCAIncidentReportConfig(data);
    const section = config.sections.find((s) => s.title.includes("Regulatory"));
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const ncaRef = kv.items.find((i: any) => i.key === "NCA Reference Number");
    expect(ncaRef.value).toBe("NCA-REF-123");
  });
});

describe("NCAIncidentReport component", () => {
  it("renders without errors", () => {
    const data = makeData();
    const element = React.createElement(NCAIncidentReport, { data });
    expect(element).toBeTruthy();
  });

  it("renders the header title via BaseReport", () => {
    const { container } = render(<NCAIncidentReport data={makeData()} />);
    expect(container.textContent).toContain("NCA Incident Report");
  });

  it("renders section content from the config", () => {
    const { container } = render(<NCAIncidentReport data={makeData()} />);
    expect(container.textContent).toContain("Incident Overview");
    expect(container.textContent).toContain("Signal Loss Event");
  });

  it("renders footer with OFFICIAL - SENSITIVE notice", () => {
    const { container } = render(<NCAIncidentReport data={makeData()} />);
    expect(container.textContent).toContain("OFFICIAL - SENSITIVE");
  });

  it("renders with all optional fields populated", () => {
    const data = makeData({
      containedAt: new Date("2025-05-30T12:00:00Z"),
      resolvedAt: new Date("2025-05-31T08:00:00Z"),
      rootCause: "Hardware failure",
      impactAssessment: "Minor disruption",
      lessonsLearned: "Redundancy needed",
      requiresNCANotification: true,
      reportedToNCA: true,
      ncaReportDate: new Date("2025-05-30T14:00:00Z"),
      ncaReferenceNumber: "NCA-REF-001",
      contactName: "Jane Doe",
      contactEmail: "jane@spaceco.eu",
      contactPhone: "+49 123 456",
      contactRole: "Compliance Officer",
    });
    const { container } = render(<NCAIncidentReport data={data} />);
    expect(container.textContent).toContain("Jane Doe");
    expect(container.textContent).toContain("NCA-REF-001");
  });

  it("renders without contact section when no contact info", () => {
    const { container } = render(<NCAIncidentReport data={makeData()} />);
    expect(container.textContent).not.toContain("Designated Contact");
  });

  it("renders with empty action lists", () => {
    const data = makeData({
      immediateActions: [],
      containmentMeasures: [],
      resolutionSteps: [],
      affectedAssets: [],
    });
    const { container } = render(<NCAIncidentReport data={data} />);
    expect(container.textContent).toContain("Incident Overview");
    expect(container.textContent).not.toContain("Response Actions");
  });
});
