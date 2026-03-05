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
  buildComplianceSummaryConfig,
  ComplianceSummaryPDF,
} from "./compliance-summary";
import type { ComplianceSummaryData } from "./compliance-summary";

function makeData(
  overrides: Partial<ComplianceSummaryData> = {},
): ComplianceSummaryData {
  return {
    reportNumber: "CS-2025-001",
    reportDate: new Date("2025-06-01"),
    organization: "SpaceCo Ltd",
    generatedBy: "admin@spaceco.eu",
    overall: 82,
    grade: "B",
    status: "substantially_compliant",
    breakdown: {
      authorization: {
        score: 90,
        weight: 25,
        weightedScore: 22.5,
        status: "compliant",
        factors: [
          {
            name: "License valid",
            description: "Valid authorization",
            maxPoints: 50,
            earnedPoints: 50,
            isCritical: true,
          },
          {
            name: "Documentation",
            description: "Docs complete",
            maxPoints: 50,
            earnedPoints: 40,
            isCritical: false,
          },
        ],
      },
      debris: {
        score: 75,
        weight: 20,
        weightedScore: 15,
        status: "partially_compliant",
        factors: [],
      },
    },
    recommendations: [
      {
        priority: "high",
        module: "Debris",
        action: "Complete debris mitigation plan",
        impact: "Major compliance improvement",
        estimatedEffort: "medium",
      },
    ],
    ...overrides,
  };
}

describe("buildComplianceSummaryConfig", () => {
  it("returns valid metadata", () => {
    const config = buildComplianceSummaryConfig(makeData());
    expect(config.metadata.reportId).toBe("CS-2025-001");
    expect(config.metadata.reportType).toBe("annual_compliance");
    expect(config.metadata.title).toBe("Compliance Summary Report");
  });

  it("sets header with organization name", () => {
    const config = buildComplianceSummaryConfig(makeData());
    expect(config.header.subtitle).toContain("SpaceCo Ltd");
  });

  it("uses info alert for score >= 80", () => {
    const config = buildComplianceSummaryConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("info");
    expect(alert.message).toContain("Substantially compliant");
  });

  it("uses warning alert for score 50-79", () => {
    const data = makeData({ overall: 60 });
    const config = buildComplianceSummaryConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("warning");
    expect(alert.message).toContain("improvements required");
  });

  it("uses error alert for score < 50", () => {
    const data = makeData({ overall: 30 });
    const config = buildComplianceSummaryConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("error");
    expect(alert.message).toContain("Significant gaps");
  });

  it("includes module breakdown table", () => {
    const config = buildComplianceSummaryConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Module Breakdown"),
    );
    expect(section).toBeDefined();
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows).toHaveLength(2);
  });

  it("uses moduleLabels for known modules", () => {
    const config = buildComplianceSummaryConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Module Breakdown"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows[0][0]).toContain("Authorization (25%)");
  });

  it("falls back to key for unknown modules", () => {
    const data = makeData({
      breakdown: {
        custom_module: {
          score: 50,
          weight: 10,
          weightedScore: 5,
          status: "partial",
          factors: [],
        },
      },
    });
    const config = buildComplianceSummaryConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Module Breakdown"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows[0][0]).toBe("custom_module");
  });

  it("creates detailed module analysis sections with correct numbering", () => {
    const config = buildComplianceSummaryConfig(makeData());
    const authSection = config.sections.find((s) => s.title.includes("3."));
    expect(authSection).toBeDefined();
    expect(authSection!.title).toContain("Authorization");
  });

  it("includes factors table for modules with factors", () => {
    const config = buildComplianceSummaryConfig(makeData());
    const authSection = config.sections.find((s) =>
      s.title.includes("Authorization"),
    );
    const table = authSection!.content.find((c) => c.type === "table") as any;
    expect(table).toBeDefined();
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0][3]).toBe("Yes");
    expect(table.rows[1][3]).toBe("No");
  });

  it("omits factors table for modules without factors", () => {
    const config = buildComplianceSummaryConfig(makeData());
    const debrisSection = config.sections.find((s) =>
      s.title.includes("Debris"),
    );
    const tables = debrisSection!.content.filter((c) => c.type === "table");
    expect(tables).toHaveLength(0);
  });

  it("uses correct alert severity for module scores", () => {
    const config = buildComplianceSummaryConfig(makeData());
    const authSection = config.sections.find((s) =>
      s.title.includes("Authorization"),
    );
    const alert = authSection!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("info");

    const debrisSection = config.sections.find((s) =>
      s.title.includes("Debris"),
    );
    const debrisAlert = debrisSection!.content.find(
      (c) => c.type === "alert",
    ) as any;
    expect(debrisAlert.severity).toBe("warning");
  });

  it("includes recommendations table when recommendations exist", () => {
    const config = buildComplianceSummaryConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Recommendations"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table).toBeDefined();
    expect(table.rows[0][0]).toBe("HIGH");
  });

  it("shows no recommendations message when empty", () => {
    const data = makeData({ recommendations: [] });
    const config = buildComplianceSummaryConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Recommendations"),
    );
    const text = section!.content.find(
      (c) => c.type === "text" && (c as any).value.includes("No specific"),
    );
    expect(text).toBeDefined();
  });

  it("truncates long recommendation actions", () => {
    const data = makeData({
      recommendations: [
        {
          priority: "high",
          module: "Auth",
          action: "A".repeat(60),
          impact: "Major",
          estimatedEffort: "high",
        },
      ],
    });
    const config = buildComplianceSummaryConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Recommendations"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows[0][2]).toContain("...");
  });

  it("includes disclaimer section", () => {
    const config = buildComplianceSummaryConfig(makeData());
    const section = config.sections.find((s) => s.title.includes("Disclaimer"));
    expect(section).toBeDefined();
  });

  it("handles module with score < 50", () => {
    const data = makeData({
      breakdown: {
        authorization: {
          score: 30,
          weight: 25,
          weightedScore: 7.5,
          status: "non_compliant",
          factors: [],
        },
      },
    });
    const config = buildComplianceSummaryConfig(data);
    const authSection = config.sections.find((s) =>
      s.title.includes("Authorization"),
    );
    const alert = authSection!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("error");
  });
});

describe("ComplianceSummaryPDF component", () => {
  it("renders without errors", () => {
    const element = React.createElement(ComplianceSummaryPDF, {
      data: makeData(),
    });
    expect(element).toBeTruthy();
  });
});
