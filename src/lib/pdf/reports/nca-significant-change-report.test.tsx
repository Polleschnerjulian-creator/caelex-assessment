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
  buildNCASignificantChangeReportConfig,
  getChangeTypeInfo,
  NCASignificantChangeReport,
} from "./nca-significant-change-report";
import type { NCASignificantChangeReportData } from "./nca-significant-change-report";

function makeData(
  overrides: Partial<NCASignificantChangeReportData> = {},
): NCASignificantChangeReportData {
  return {
    notificationNumber: "SCN-2025-001",
    reportDate: new Date("2025-07-01"),
    organization: "SpaceCo Ltd",
    generatedBy: "admin@spaceco.eu",
    authorizationNumber: "AUTH-2024-100",
    primaryNCA: "BNetzA",
    changeType: "operational_change",
    changeTypeDescription: "Frequency band change",
    notificationDeadlineDays: 14,
    requiresPreApproval: false,
    changeTitle: "Frequency Band Update",
    changeDescription: "Switching from X to Ka band",
    justification: "Better throughput",
    effectiveDate: new Date("2025-08-01"),
    currentState: [{ field: "Band", value: "X" }],
    proposedState: [{ field: "Band", value: "Ka" }],
    impactAssessment: {
      safetyImpact: "none",
      debrisImpact: "none",
      thirdPartyImpact: "low",
      regulatoryImpact: "low",
    },
    affectedSpacecraft: [{ name: "SAT-1", cosparId: "2025-001A" }],
    ...overrides,
  };
}

describe("getChangeTypeInfo", () => {
  it("returns info for ownership_transfer", () => {
    const info = getChangeTypeInfo("ownership_transfer");
    expect(info.description).toContain("Ownership");
    expect(info.articleRef).toContain("Art. 27");
    expect(info.deadlineDays).toBe(30);
    expect(info.requiresPreApproval).toBe(true);
  });

  it("returns info for mission_modification", () => {
    const info = getChangeTypeInfo("mission_modification");
    expect(info.requiresPreApproval).toBe(true);
  });

  it("returns info for technical_change", () => {
    const info = getChangeTypeInfo("technical_change");
    expect(info.deadlineDays).toBe(30);
  });

  it("returns info for operational_change", () => {
    const info = getChangeTypeInfo("operational_change");
    expect(info.requiresPreApproval).toBe(false);
    expect(info.deadlineDays).toBe(14);
  });

  it("returns info for orbital_change", () => {
    const info = getChangeTypeInfo("orbital_change");
    expect(info.articleRef).toContain("55-73");
  });

  it("returns info for end_of_life_update", () => {
    const info = getChangeTypeInfo("end_of_life_update");
    expect(info.requiresPreApproval).toBe(true);
  });

  it("returns info for insurance_change", () => {
    const info = getChangeTypeInfo("insurance_change");
    expect(info.deadlineDays).toBe(14);
  });

  it("returns info for contact_change", () => {
    const info = getChangeTypeInfo("contact_change");
    expect(info.deadlineDays).toBe(7);
    expect(info.requiresPreApproval).toBe(false);
  });

  it("returns info for other", () => {
    const info = getChangeTypeInfo("other");
    expect(info.description).toContain("Other");
  });
});

describe("buildNCASignificantChangeReportConfig", () => {
  it("returns valid metadata", () => {
    const config = buildNCASignificantChangeReportConfig(makeData());
    expect(config.metadata.reportId).toBe("SCN-2025-001");
    expect(config.metadata.reportType).toBe("significant_change");
    expect(config.metadata.title).toContain("SCN-2025-001");
  });

  it("sets header and footer correctly", () => {
    const config = buildNCASignificantChangeReportConfig(makeData());
    expect(config.header.title).toBe("Significant Change Notification");
    expect(config.header.subtitle).toContain("Art. 27");
  });

  it("uses OFFICIAL confidentiality when no pre-approval", () => {
    const config = buildNCASignificantChangeReportConfig(makeData());
    expect(config.footer.confidentialityNotice).toBe("OFFICIAL");
  });

  it("uses REQUIRES APPROVAL confidentiality when pre-approval needed", () => {
    const data = makeData({ requiresPreApproval: true });
    const config = buildNCASignificantChangeReportConfig(data);
    expect(config.footer.confidentialityNotice).toContain("REQUIRES APPROVAL");
  });

  it("shows warning alert when pre-approval required", () => {
    const data = makeData({ requiresPreApproval: true });
    const config = buildNCASignificantChangeReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Change Notification Overview"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("warning");
    expect(alert.message).toContain("prior NCA approval");
  });

  it("shows info alert when notification only", () => {
    const config = buildNCASignificantChangeReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Change Notification Overview"),
    );
    const alert = section!.content.find((c) => c.type === "alert") as any;
    expect(alert.severity).toBe("info");
  });

  it("includes authorization date when provided", () => {
    const data = makeData({ authorizationDate: new Date("2024-03-15") });
    const config = buildNCASignificantChangeReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Authorization Reference"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const authDate = kv.items.find((i: any) => i.key === "Authorization Date");
    expect(authDate.value).not.toBe("N/A");
  });

  it("shows N/A for missing authorization date", () => {
    const config = buildNCASignificantChangeReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Authorization Reference"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const authDate = kv.items.find((i: any) => i.key === "Authorization Date");
    expect(authDate.value).toBe("N/A");
  });

  it("creates before/after comparison table", () => {
    const config = buildNCASignificantChangeReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Before/After"),
    );
    expect(section).toBeDefined();
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows).toHaveLength(1);
  });

  it("omits comparison when both states empty", () => {
    const data = makeData({ currentState: [], proposedState: [] });
    const config = buildNCASignificantChangeReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Before/After"),
    );
    expect(section).toBeUndefined();
  });

  it("handles uneven current/proposed state lengths", () => {
    const data = makeData({
      currentState: [
        { field: "A", value: "1" },
        { field: "B", value: "2" },
      ],
      proposedState: [{ field: "A", value: "X" }],
    });
    const config = buildNCASignificantChangeReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Before/After"),
    );
    const table = section!.content.find((c) => c.type === "table") as any;
    expect(table.rows).toHaveLength(2);
    expect(table.rows[1][2]).toBe("N/A");
  });

  it("includes affected spacecraft table", () => {
    const config = buildNCASignificantChangeReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Affected Spacecraft"),
    );
    expect(section).toBeDefined();
  });

  it("omits affected spacecraft when empty", () => {
    const data = makeData({ affectedSpacecraft: [] });
    const config = buildNCASignificantChangeReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Affected Spacecraft"),
    );
    expect(section).toBeUndefined();
  });

  it("includes impact description and mitigation when provided", () => {
    const data = makeData({
      impactDescription: "Some impact",
      mitigationMeasures: ["Measure A"],
    });
    const config = buildNCASignificantChangeReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Impact Assessment"),
    );
    const headings = section!.content
      .filter((c) => c.type === "heading")
      .map((c: any) => c.value);
    expect(headings).toContain("Impact Details");
    expect(headings).toContain("Mitigation Measures");
  });

  it("excludes impact description and mitigation when not provided", () => {
    const config = buildNCASignificantChangeReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Impact Assessment"),
    );
    const headings = section!.content
      .filter((c) => c.type === "heading")
      .map((c: any) => c.value);
    expect(headings).not.toContain("Impact Details");
    expect(headings).not.toContain("Mitigation Measures");
  });

  it("includes ownership transfer section for ownership_transfer type", () => {
    const data = makeData({
      changeType: "ownership_transfer",
      ownershipTransfer: {
        currentOwner: "SpaceCo",
        newOwner: "NewSpace Inc",
        newOwnerCountry: "France",
        transferDate: new Date("2025-09-01"),
        liabilityTransfer: true,
      },
    });
    const config = buildNCASignificantChangeReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Ownership Transfer"),
    );
    expect(section).toBeDefined();
  });

  it("includes supporting documents when provided", () => {
    const data = makeData({
      supportingDocuments: [
        { name: "Analysis.pdf", type: "Impact Analysis", reference: "DOC-001" },
      ],
    });
    const config = buildNCASignificantChangeReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Supporting Documents"),
    );
    expect(section).toBeDefined();
  });

  it("includes planned implementation date when provided", () => {
    const data = makeData({
      plannedImplementationDate: new Date("2025-09-15"),
    });
    const config = buildNCASignificantChangeReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Implementation Timeline"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const planned = kv.items.find(
      (i: any) => i.key === "Planned Implementation",
    );
    expect(planned.value).not.toBe("Upon approval");
  });

  it("shows Upon approval when no planned implementation date", () => {
    const config = buildNCASignificantChangeReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Implementation Timeline"),
    );
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const planned = kv.items.find(
      (i: any) => i.key === "Planned Implementation",
    );
    expect(planned.value).toBe("Upon approval");
  });

  it("includes contact section when contact info provided", () => {
    const data = makeData({
      contactName: "Jane",
      contactEmail: "jane@spaceco.eu",
    });
    const config = buildNCASignificantChangeReportConfig(data);
    const section = config.sections.find((s) =>
      s.title.includes("Designated Contact"),
    );
    expect(section).toBeDefined();
  });

  it("omits contact section when no contact info", () => {
    const config = buildNCASignificantChangeReportConfig(makeData());
    const section = config.sections.find((s) =>
      s.title.includes("Designated Contact"),
    );
    expect(section).toBeUndefined();
  });

  it("uses custom declaration text when provided", () => {
    const data = makeData({ declarationText: "Custom declaration" });
    const config = buildNCASignificantChangeReportConfig(data);
    const section = config.sections.find((s) => s.title === "Declaration");
    const text = section!.content.find((c) => c.type === "text") as any;
    expect(text.value).toBe("Custom declaration");
  });

  it("uses default declaration when not provided", () => {
    const config = buildNCASignificantChangeReportConfig(makeData());
    const section = config.sections.find((s) => s.title === "Declaration");
    const text = section!.content.find((c) => c.type === "text") as any;
    expect(text.value).toContain("hereby declare");
  });

  it("uses declarantName when provided", () => {
    const data = makeData({ declarantName: "John Smith" });
    const config = buildNCASignificantChangeReportConfig(data);
    const section = config.sections.find((s) => s.title === "Declaration");
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const declarant = kv.items.find((i: any) => i.key === "Declarant");
    expect(declarant.value).toBe("John Smith");
  });

  it("falls back to generatedBy when no declarantName", () => {
    const config = buildNCASignificantChangeReportConfig(makeData());
    const section = config.sections.find((s) => s.title === "Declaration");
    const kv = section!.content.find((c) => c.type === "keyValue") as any;
    const declarant = kv.items.find((i: any) => i.key === "Declarant");
    expect(declarant.value).toBe("admin@spaceco.eu");
  });

  it("numbers sections correctly for ownership transfer with supporting docs", () => {
    const data = makeData({
      changeType: "ownership_transfer",
      ownershipTransfer: {
        currentOwner: "A",
        newOwner: "B",
        newOwnerCountry: "DE",
        transferDate: new Date("2025-09-01"),
        liabilityTransfer: false,
      },
      supportingDocuments: [{ name: "Doc", type: "Analysis" }],
    });
    const config = buildNCASignificantChangeReportConfig(data);
    const supportingSection = config.sections.find((s) =>
      s.title.includes("Supporting Documents"),
    );
    expect(supportingSection!.title).toContain("8.");
    const timelineSection = config.sections.find((s) =>
      s.title.includes("Implementation Timeline"),
    );
    expect(timelineSection!.title).toContain("9.");
  });
});

describe("NCASignificantChangeReport component", () => {
  it("renders without errors", () => {
    const element = React.createElement(NCASignificantChangeReport, {
      data: makeData(),
    });
    expect(element).toBeTruthy();
  });
});
