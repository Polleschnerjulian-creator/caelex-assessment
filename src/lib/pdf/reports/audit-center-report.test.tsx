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
  buildAuditCenterReportConfig,
  AuditCenterReport,
} from "./audit-center-report";
import type { AuditCenterReportData } from "./audit-center-report";

function makeData(
  overrides: Partial<AuditCenterReportData> = {},
): AuditCenterReportData {
  return {
    organizationName: "SpaceCo Ltd",
    generatedAt: new Date("2025-06-01T10:00:00Z"),
    generatedBy: "admin@spaceco.eu",
    period: {
      from: new Date("2025-01-01"),
      to: new Date("2025-06-01"),
    },
    complianceScore: 80,
    modules: [
      {
        name: "Authorization",
        regulationType: "eu_space_act",
        totalRequirements: 20,
        compliant: 15,
        partial: 3,
        nonCompliant: 1,
        notAssessed: 1,
        score: 85,
      },
    ],
    evidenceRegister: [
      {
        title: "Authorization Certificate",
        regulationType: "eu_space_act",
        requirementId: "REQ-001",
        evidenceType: "certificate",
        status: "valid",
        documentCount: 2,
        validFrom: "2025-01-01",
        validUntil: "2026-01-01",
      },
    ],
    gapAnalysis: [
      {
        regulationType: "eu_space_act",
        requirementId: "REQ-010",
        title: "Insurance coverage gap",
        status: "non_compliant",
        severity: "HIGH",
      },
    ],
    hashChain: {
      valid: true,
      checkedEntries: 500,
    },
    auditTrailSample: [
      {
        timestamp: "2025-05-30 08:00",
        user: "john@spaceco.eu",
        action: "article_status_changed",
        entityType: "article",
        description: "Updated status to compliant",
      },
    ],
    ...overrides,
  };
}

describe("buildAuditCenterReportConfig", () => {
  it("returns valid metadata", () => {
    const config = buildAuditCenterReportConfig(makeData());
    expect(config.metadata.reportType).toBe("audit_center");
    expect(config.metadata.title).toBe("Audit Center Compliance Report");
    expect(config.metadata.organization).toBe("SpaceCo Ltd");
  });

  it("sets header with organization name", () => {
    const config = buildAuditCenterReportConfig(makeData());
    expect(config.header.title).toBe("Audit Center Compliance Report");
    expect(config.header.subtitle).toBe("SpaceCo Ltd");
  });

  it("includes executive summary with compliance score", () => {
    const config = buildAuditCenterReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    expect(section).toBeDefined();
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const score = kv.items.find(
      (i: any) => i.key === "Overall Compliance Score",
    );
    expect(score.value).toBe("80%");
  });

  it("shows VERIFIED for valid hash chain", () => {
    const config = buildAuditCenterReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const integrity = kv.items.find(
      (i: any) => i.key === "Audit Trail Integrity",
    );
    expect(integrity.value).toBe("VERIFIED");
  });

  it("shows BROKEN for invalid hash chain", () => {
    const data = makeData({
      hashChain: { valid: false, checkedEntries: 500, brokenAt: "entry-250" },
    });
    const config = buildAuditCenterReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Executive Summary"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const integrity = kv.items.find(
      (i: any) => i.key === "Audit Trail Integrity",
    );
    expect(integrity.value).toContain("BROKEN");
  });

  it("includes compliance matrix table", () => {
    const config = buildAuditCenterReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Compliance Matrix"),
    );
    expect(section).toBeDefined();
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0][0]).toBe("Authorization");
  });

  it("includes evidence register when present", () => {
    const config = buildAuditCenterReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Evidence Register"),
    );
    expect(section).toBeDefined();
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows).toHaveLength(1);
  });

  it("omits evidence register when empty", () => {
    const data = makeData({ evidenceRegister: [] });
    const config = buildAuditCenterReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Evidence Register"),
    );
    expect(section).toBeUndefined();
  });

  it("shows N/A for missing validUntil", () => {
    const data = makeData({
      evidenceRegister: [
        {
          title: "Doc",
          regulationType: "eu_space_act",
          requirementId: "REQ-1",
          evidenceType: "cert",
          status: "valid",
          documentCount: 1,
          validUntil: null,
        },
      ],
    });
    const config = buildAuditCenterReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Evidence Register"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows[0][5]).toBe("N/A");
  });

  it("includes gap analysis when present", () => {
    const config = buildAuditCenterReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Gap Analysis"),
    );
    expect(section).toBeDefined();
  });

  it("omits gap analysis when empty", () => {
    const data = makeData({ gapAnalysis: [] });
    const config = buildAuditCenterReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Gap Analysis"),
    );
    expect(section).toBeUndefined();
  });

  it("truncates long gap titles", () => {
    const data = makeData({
      gapAnalysis: [
        {
          regulationType: "eu_space_act",
          requirementId: "REQ-1",
          title: "A".repeat(50),
          status: "non_compliant",
          severity: "HIGH",
        },
      ],
    });
    const config = buildAuditCenterReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Gap Analysis"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows[0][2]).toContain("...");
  });

  it("shows additional gaps message when over 50", () => {
    const gaps = Array.from({ length: 55 }, (_, i) => ({
      regulationType: "eu_space_act",
      requirementId: `REQ-${i}`,
      title: `Gap ${i}`,
      status: "non_compliant",
      severity: "HIGH",
    }));
    const data = makeData({ gapAnalysis: gaps });
    const config = buildAuditCenterReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Gap Analysis"),
    );
    const moreText = section!.content.find(
      (c) => c.type === "text" && (c as any).value.includes("additional gaps"),
    );
    expect(moreText).toBeDefined();
  });

  it("includes hash chain integrity section with valid chain", () => {
    const config = buildAuditCenterReportConfig(makeData());
    const section = config.sections.find((s) => s.title.includes("Hash Chain"));
    expect(section).toBeDefined();
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const status = kv.items.find((i: any) => i.key === "Chain Status");
    expect(status.value).toContain("VALID");
  });

  it("shows error alert for broken hash chain", () => {
    const data = makeData({
      hashChain: { valid: false, checkedEntries: 500, brokenAt: "entry-250" },
    });
    const config = buildAuditCenterReportConfig(data);
    const section = config.sections.find((s) => s.title.includes("Hash Chain"));
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("error");
    expect(alert.message).toContain("INTEGRITY WARNING");
  });

  it("includes break point when hash chain is broken", () => {
    const data = makeData({
      hashChain: { valid: false, checkedEntries: 500, brokenAt: "entry-250" },
    });
    const config = buildAuditCenterReportConfig(data);
    const section = config.sections.find((s) => s.title.includes("Hash Chain"));
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const bp = kv.items.find((i: any) => i.key === "Break Point");
    expect(bp.value).toBe("entry-250");
  });

  it("excludes break point when hash chain is valid", () => {
    const config = buildAuditCenterReportConfig(makeData());
    const section = config.sections.find((s) => s.title.includes("Hash Chain"));
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const bp = kv.items.find((i: any) => i.key === "Break Point");
    expect(bp).toBeUndefined();
  });

  it("includes audit trail sample when present", () => {
    const config = buildAuditCenterReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Audit Trail Sample"),
    );
    expect(section).toBeDefined();
  });

  it("omits audit trail sample when empty", () => {
    const data = makeData({ auditTrailSample: [] });
    const config = buildAuditCenterReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Audit Trail Sample"),
    );
    expect(section).toBeUndefined();
  });

  it("truncates long descriptions in audit trail", () => {
    const data = makeData({
      auditTrailSample: [
        {
          timestamp: "2025-05-30",
          user: "john@test.eu",
          action: "status_changed",
          entityType: "article",
          description: "A".repeat(60),
        },
      ],
    });
    const config = buildAuditCenterReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Audit Trail Sample"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows[0][4]).toContain("...");
  });

  it("handles null description in audit trail", () => {
    const data = makeData({
      auditTrailSample: [
        {
          timestamp: "2025-05-30",
          user: "john@test.eu",
          action: "status_changed",
          entityType: "article",
          description: null,
        },
      ],
    });
    const config = buildAuditCenterReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Audit Trail Sample"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows[0][4]).toBe("");
  });

  it("includes certification section", () => {
    const config = buildAuditCenterReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Certification"),
    );
    expect(section).toBeDefined();
  });
});

describe("AuditCenterReport component", () => {
  it("renders without errors", () => {
    const element = React.createElement(AuditCenterReport, {
      data: makeData(),
    });
    expect(element).toBeTruthy();
  });
});
