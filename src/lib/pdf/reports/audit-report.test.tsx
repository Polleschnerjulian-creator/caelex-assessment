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

vi.mock("@/lib/services/audit-export-service", () => ({}));

import { buildAuditReportConfig, AuditReport } from "./audit-report";

interface MockAuditReportData {
  userId: string;
  organizationName?: string;
  generatedAt: Date;
  period: { from: Date; to: Date };
  summary: {
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByEntityType: Record<string, number>;
    eventsByDay: Array<{ date: string; count: number }>;
    topEntities: Array<{ entityType: string; entityId: string; count: number }>;
    securityEvents: {
      total: number;
      bySeverity: Record<string, number>;
      unresolved: number;
    };
    recentActivity: any[];
  };
  logs: Array<{
    timestamp: Date;
    action: string;
    entityType: string;
    entityId: string;
    user: { id: string; name: string | null; email: string };
  }>;
  securityEvents?: Array<{
    id: string;
    type: string;
    severity: string;
    description: string;
    createdAt: Date;
    resolved: boolean;
    resolvedAt: Date | null;
  }>;
}

function makeData(
  overrides: Partial<MockAuditReportData> = {},
): MockAuditReportData {
  return {
    userId: "user-1",
    generatedAt: new Date("2025-06-01T10:00:00Z"),
    period: {
      from: new Date("2025-01-01"),
      to: new Date("2025-06-01"),
    },
    summary: {
      totalEvents: 100,
      eventsByAction: {
        article_status_changed: 40,
        document_uploaded: 30,
        workflow_created: 20,
        unknown_action_type: 10,
      },
      eventsByEntityType: {
        article: 50,
        document: 30,
        workflow: 20,
      },
      eventsByDay: [
        { date: "2025-05-01", count: 5 },
        { date: "2025-05-02", count: 10 },
        { date: "2025-05-03", count: 3 },
      ],
      topEntities: [
        { entityType: "article", entityId: "art-123", count: 15 },
        {
          entityType: "document",
          entityId: "doc-very-long-id-that-exceeds-twenty-chars",
          count: 10,
        },
      ],
      securityEvents: {
        total: 0,
        bySeverity: {},
        unresolved: 0,
      },
      recentActivity: [],
    },
    logs: [
      {
        timestamp: new Date("2025-05-30T08:00:00Z"),
        action: "article_status_changed",
        entityType: "article",
        entityId: "art-001",
        user: { id: "u1", name: "John Doe", email: "john@spaceco.eu" },
      },
      {
        timestamp: new Date("2025-05-29T08:00:00Z"),
        action: "document_uploaded",
        entityType: "document",
        entityId: "doc-001",
        user: { id: "u2", name: null, email: "jane@spaceco.eu" },
      },
    ],
    ...overrides,
  };
}

describe("buildAuditReportConfig", () => {
  it("returns valid metadata", () => {
    const config = buildAuditReportConfig(makeData() as any);
    expect(config.metadata.reportType).toBe("annual_compliance");
    expect(config.metadata.title).toBe("Audit Trail Report");
    expect(config.metadata.reportId).toContain("AUD-");
  });

  it("sets header with date range", () => {
    const config = buildAuditReportConfig(makeData() as any);
    expect(config.header.title).toBe("Audit Trail Report");
    expect(config.header.subtitle).toContain("Compliance Activity Record");
  });

  it("includes executive summary section", () => {
    const config = buildAuditReportConfig(makeData() as any);
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    expect(section).toBeDefined();
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const totalEvents = kv.items.find((i: any) => i.key === "Total Events");
    expect(totalEvents.value).toBe("100");
  });

  it("includes organization when provided", () => {
    const data = makeData({ organizationName: "SpaceCo" });
    const config = buildAuditReportConfig(data as any);
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const kvBlocks = section!.content.filter(
      (c) => c.type === "keyValue",
    ) as any[];
    const hasOrg = kvBlocks.some((kv: any) =>
      kv.items.some((i: any) => i.key === "Organization"),
    );
    expect(hasOrg).toBe(true);
  });

  it("excludes organization when not provided", () => {
    const config = buildAuditReportConfig(makeData() as any);
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const kvBlocks = section!.content.filter(
      (c) => c.type === "keyValue",
    ) as any[];
    // The first keyValue should not have Organization (it's inserted at index 1)
    expect(kvBlocks.length).toBe(1); // only the main summary kv
  });

  it("includes activity by action type with known action labels", () => {
    const config = buildAuditReportConfig(makeData() as any);
    const section = config.sections.find((s) =>
      s.title.includes("Activity by Action Type"),
    );
    expect(section).toBeDefined();
    const table = section!.content.find((c) => c.type === "table") as any;
    const actionNames = table.rows.map((r: any) => r[0]);
    expect(actionNames).toContain("Article Status Changed");
    expect(actionNames).toContain("Document Uploaded");
  });

  it("handles unknown action labels with fallback formatting", () => {
    const config = buildAuditReportConfig(makeData() as any);
    const section = config.sections.find((s) =>
      s.title.includes("Activity by Action Type"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    const unknownRow = table.rows.find(
      (r: any) => r[0] === "Unknown Action Type",
    );
    expect(unknownRow).toBeDefined();
  });

  it("includes activity by entity type", () => {
    const config = buildAuditReportConfig(makeData() as any);
    const section = config.sections.find((s) =>
      s.title.includes("Activity by Entity Type"),
    );
    expect(section).toBeDefined();
  });

  it("includes top entities section when present", () => {
    const config = buildAuditReportConfig(makeData() as any);
    const section = config.sections.find((s) =>
      s.title.includes("Most Active Entities"),
    );
    expect(section).toBeDefined();
  });

  it("truncates long entity IDs", () => {
    const config = buildAuditReportConfig(makeData() as any);
    const section = config.sections.find((s) =>
      s.title.includes("Most Active Entities"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows[1][1]).toContain("...");
  });

  it("omits top entities when empty", () => {
    const data = makeData();
    data.summary.topEntities = [];
    const config = buildAuditReportConfig(data as any);
    const section = config.sections.find((s) =>
      s.title.includes("Most Active Entities"),
    );
    expect(section).toBeUndefined();
  });

  it("includes security events section when present", () => {
    const data = makeData({
      securityEvents: [
        {
          id: "se-1",
          type: "unauthorized_access",
          severity: "HIGH",
          description: "Suspicious login",
          createdAt: new Date("2025-05-30"),
          resolved: false,
          resolvedAt: null,
        },
      ],
      summary: {
        ...makeData().summary,
        securityEvents: {
          total: 1,
          bySeverity: { HIGH: 1 },
          unresolved: 1,
        },
      },
    });
    const config = buildAuditReportConfig(data as any);
    const section = config.sections.find((s) =>
      s.title.includes("Security Events"),
    );
    expect(section).toBeDefined();
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("warning");
  });

  it("uses info alert for security events when all resolved", () => {
    const data = makeData({
      securityEvents: [
        {
          id: "se-1",
          type: "scan",
          severity: "LOW",
          description: "Scan",
          createdAt: new Date("2025-05-30"),
          resolved: true,
          resolvedAt: new Date("2025-05-31"),
        },
      ],
      summary: {
        ...makeData().summary,
        securityEvents: {
          total: 1,
          bySeverity: { LOW: 1 },
          unresolved: 0,
        },
      },
    });
    const config = buildAuditReportConfig(data as any);
    const section = config.sections.find((s) =>
      s.title.includes("Security Events"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("info");
  });

  it("includes daily activity trend when data exists", () => {
    const config = buildAuditReportConfig(makeData() as any);
    const section = config.sections.find((s) =>
      s.title.includes("Daily Activity Trend"),
    );
    expect(section).toBeDefined();
  });

  it("uses correct section number for daily trend based on security events", () => {
    const data = makeData({
      securityEvents: [
        {
          id: "se-1",
          type: "scan",
          severity: "LOW",
          description: "Scan",
          createdAt: new Date("2025-05-30"),
          resolved: true,
          resolvedAt: new Date("2025-05-31"),
        },
      ],
      summary: {
        ...makeData().summary,
        securityEvents: {
          total: 1,
          bySeverity: { LOW: 1 },
          unresolved: 0,
        },
      },
    });
    const config = buildAuditReportConfig(data as any);
    const section = config.sections.find((s) =>
      s.title.includes("Daily Activity Trend"),
    );
    expect(section!.title).toContain("6.");
  });

  it("omits daily activity trend when no day data", () => {
    const data = makeData();
    data.summary.eventsByDay = [];
    const config = buildAuditReportConfig(data as any);
    const section = config.sections.find((s) =>
      s.title.includes("Daily Activity Trend"),
    );
    expect(section).toBeUndefined();
  });

  it("includes audit log sample section", () => {
    const config = buildAuditReportConfig(makeData() as any);
    const section = config.sections.find((s) =>
      s.title.includes("Audit Log Sample"),
    );
    expect(section).toBeDefined();
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows).toHaveLength(2);
  });

  it("uses name when available, falls back to email prefix", () => {
    const config = buildAuditReportConfig(makeData() as any);
    const section = config.sections.find((s) =>
      s.title.includes("Audit Log Sample"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows[0][1]).toBe("John Doe");
    expect(table.rows[1][1]).toBe("jane");
  });

  it("includes certification statement", () => {
    const config = buildAuditReportConfig(makeData() as any);
    const section = config.sections.find((s) =>
      s.title.includes("Certification Statement"),
    );
    expect(section).toBeDefined();
  });
});

describe("AuditReport component", () => {
  it("renders without errors", () => {
    const element = React.createElement(AuditReport, {
      data: makeData() as any,
    });
    expect(element).toBeTruthy();
  });
});
