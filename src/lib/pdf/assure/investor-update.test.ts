import { describe, it, expect } from "vitest";
import {
  buildInvestorUpdateReport,
  type InvestorUpdateData,
} from "./investor-update";
import type { ReportSection } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalData(): InvestorUpdateData {
  return {
    companyName: "LaunchCo",
    period: "Q1 2026",
    periodType: "quarterly",
  };
}

function fullData(): InvestorUpdateData {
  return {
    companyName: "LaunchCo",
    period: "January 2026",
    periodType: "monthly",
    keyMetrics: [
      { name: "MRR", current: "EUR 100K", previous: "EUR 80K", trend: "up" },
      { name: "Churn", current: "2%", previous: "3%", trend: "down" },
    ],
    completedMilestones: [{ title: "Launched v2.0", date: "2026-01-15" }],
    upcomingMilestones: [
      { title: "Series B close", targetDate: "2026-04-01", status: "On Track" },
    ],
    revenue: 100_000,
    prevRevenue: 80_000,
    burnRate: 50_000,
    runway: 18,
    cashPosition: 900_000,
    highlights: ["Closed 3 new enterprise deals", "Hired VP Engineering"],
    challenges: ["Supply chain delays"],
    asks: ["Intro to Airbus procurement", "Referral for CFO candidate"],
  };
}

function findSection(
  sections: ReportSection[],
  titleFragment: string,
): ReportSection | undefined {
  return sections.find((s) =>
    s.title.toLowerCase().includes(titleFragment.toLowerCase()),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildInvestorUpdateReport", () => {
  it("returns a valid ReportConfig with minimal data", () => {
    const config = buildInvestorUpdateReport(minimalData());

    expect(config.metadata.reportType).toBe("investor_update");
    expect(config.metadata.reportId).toMatch(/^UPDATE-/);
    expect(config.metadata.title).toContain("LaunchCo");
    expect(config.metadata.title).toContain("Q1 2026");
    expect(config.metadata.generatedBy).toBe("Caelex Assure");

    expect(config.header.title).toContain("Quarterly");
    expect(config.header.subtitle).toContain("LaunchCo");
    expect(config.header.subtitle).toContain("Q1 2026");
    expect(config.header.logo).toBe(true);

    expect(config.footer.pageNumbers).toBe(true);
    expect(config.footer.confidentialityNotice).toBeTruthy();
    expect(config.footer.disclaimer).toBeTruthy();
  });

  it("uses Monthly label for monthly periodType", () => {
    const data: InvestorUpdateData = {
      ...minimalData(),
      periodType: "monthly",
    };
    const config = buildInvestorUpdateReport(data);
    expect(config.header.title).toContain("Month");
  });

  it("always includes an Update header section", () => {
    const config = buildInvestorUpdateReport(minimalData());
    const update = findSection(config.sections, "Update");
    expect(update).toBeDefined();
    expect(update!.title).toContain("Q1 2026");
  });

  it("omits Key Metrics section when no metrics provided", () => {
    const config = buildInvestorUpdateReport(minimalData());
    const metrics = findSection(config.sections, "Key Metrics");
    expect(metrics).toBeUndefined();
  });

  it("includes Key Metrics section when metrics provided", () => {
    const data = {
      ...minimalData(),
      keyMetrics: [
        {
          name: "Users",
          current: "1000",
          previous: "800",
          trend: "up" as const,
        },
      ],
    };
    const config = buildInvestorUpdateReport(data);
    const metrics = findSection(config.sections, "Key Metrics");
    expect(metrics).toBeDefined();
    const table = metrics!.content.find((c) => c.type === "table") as {
      type: "table";
      rows: string[][];
    };
    expect(table.rows.length).toBe(1);
    expect(table.rows[0][3]).toBe("[UP]");
  });

  it("omits Milestone Progress when no milestones provided", () => {
    const config = buildInvestorUpdateReport(minimalData());
    const ms = findSection(config.sections, "Milestone Progress");
    expect(ms).toBeUndefined();
  });

  it("includes Milestone Progress with completed milestones only", () => {
    const data = {
      ...minimalData(),
      completedMilestones: [{ title: "Done thing", date: "2026-01-01" }],
    };
    const config = buildInvestorUpdateReport(data);
    const ms = findSection(config.sections, "Milestone Progress");
    expect(ms).toBeDefined();
  });

  it("includes Milestone Progress with upcoming milestones only", () => {
    const data = {
      ...minimalData(),
      upcomingMilestones: [
        { title: "Next thing", targetDate: "2026-06-01", status: "On Track" },
      ],
    };
    const config = buildInvestorUpdateReport(data);
    const ms = findSection(config.sections, "Milestone Progress");
    expect(ms).toBeDefined();
  });

  it("includes spacer between completed and upcoming milestones", () => {
    const data = {
      ...minimalData(),
      completedMilestones: [{ title: "Done", date: "2026-01-01" }],
      upcomingMilestones: [
        { title: "Next", targetDate: "2026-03-01", status: "Planned" },
      ],
    };
    const config = buildInvestorUpdateReport(data);
    const ms = findSection(config.sections, "Milestone Progress");
    expect(ms).toBeDefined();
    const spacers = ms!.content.filter((c) => c.type === "spacer");
    expect(spacers.length).toBeGreaterThanOrEqual(1);
  });

  it("omits Financial Summary when no financial data", () => {
    const config = buildInvestorUpdateReport(minimalData());
    const fin = findSection(config.sections, "Financial Summary");
    expect(fin).toBeUndefined();
  });

  it("includes Financial Summary with revenue", () => {
    const data = { ...minimalData(), revenue: 200_000 };
    const config = buildInvestorUpdateReport(data);
    const fin = findSection(config.sections, "Financial Summary");
    expect(fin).toBeDefined();
  });

  it("includes revenue growth text when both revenue and prevRevenue given", () => {
    const data = {
      ...minimalData(),
      revenue: 120_000,
      prevRevenue: 100_000,
    };
    const config = buildInvestorUpdateReport(data);
    const fin = findSection(config.sections, "Financial Summary");
    const kv = fin!.content.find((c) => c.type === "keyValue") as {
      type: "keyValue";
      items: Array<{ key: string; value: string }>;
    };
    const growth = kv.items.find((i) => i.key === "Revenue Growth");
    expect(growth).toBeDefined();
    expect(growth!.value).toContain("20.0%");
    expect(growth!.value).toContain("increase");
  });

  it("shows decrease when revenue dropped", () => {
    const data = {
      ...minimalData(),
      revenue: 80_000,
      prevRevenue: 100_000,
    };
    const config = buildInvestorUpdateReport(data);
    const fin = findSection(config.sections, "Financial Summary");
    const kv = fin!.content.find((c) => c.type === "keyValue") as {
      type: "keyValue";
      items: Array<{ key: string; value: string }>;
    };
    const growth = kv.items.find((i) => i.key === "Revenue Growth");
    expect(growth!.value).toContain("decrease");
  });

  it("shows N/A for revenue growth when prevRevenue is 0", () => {
    const data = {
      ...minimalData(),
      revenue: 100_000,
      prevRevenue: 0,
    };
    const config = buildInvestorUpdateReport(data);
    const fin = findSection(config.sections, "Financial Summary");
    const kv = fin!.content.find((c) => c.type === "keyValue") as {
      type: "keyValue";
      items: Array<{ key: string; value: string }>;
    };
    const growth = kv.items.find((i) => i.key === "Revenue Growth");
    expect(growth!.value).toBe("N/A");
  });

  it("includes runway warning alert when runway is 6 or below", () => {
    const data = { ...minimalData(), revenue: 50_000, runway: 5 };
    const config = buildInvestorUpdateReport(data);
    const fin = findSection(config.sections, "Financial Summary");
    const alert = fin!.content.find((c) => c.type === "alert") as {
      type: "alert";
      severity: string;
      message: string;
    };
    expect(alert).toBeDefined();
    expect(alert.severity).toBe("warning");
    expect(alert.message).toContain("5 months");
  });

  it("includes critical runway alert when runway is 3 or below", () => {
    const data = { ...minimalData(), burnRate: 100_000, runway: 2 };
    const config = buildInvestorUpdateReport(data);
    const fin = findSection(config.sections, "Financial Summary");
    const alert = fin!.content.find((c) => c.type === "alert") as {
      type: "alert";
      severity: string;
    };
    expect(alert.severity).toBe("error");
  });

  it("does not include runway alert when runway is above 6", () => {
    const data = { ...minimalData(), cashPosition: 500_000, runway: 12 };
    const config = buildInvestorUpdateReport(data);
    const fin = findSection(config.sections, "Financial Summary");
    const alert = fin!.content.find((c) => c.type === "alert");
    expect(alert).toBeUndefined();
  });

  it("includes burn rate and cash position in Financial Summary", () => {
    const data = {
      ...minimalData(),
      burnRate: 30_000,
      cashPosition: 400_000,
    };
    const config = buildInvestorUpdateReport(data);
    const fin = findSection(config.sections, "Financial Summary");
    const kv = fin!.content.find((c) => c.type === "keyValue") as {
      type: "keyValue";
      items: Array<{ key: string; value: string }>;
    };
    expect(kv.items.find((i) => i.key === "Monthly Burn Rate")).toBeDefined();
    expect(kv.items.find((i) => i.key === "Cash Position")).toBeDefined();
  });

  it("omits Highlights section when none provided", () => {
    const config = buildInvestorUpdateReport(minimalData());
    const highlights = findSection(config.sections, "Highlights");
    expect(highlights).toBeUndefined();
  });

  it("includes Highlights section when provided", () => {
    const data = { ...minimalData(), highlights: ["Win 1", "Win 2"] };
    const config = buildInvestorUpdateReport(data);
    const highlights = findSection(config.sections, "Highlights");
    expect(highlights).toBeDefined();
    const list = highlights!.content.find((c) => c.type === "list");
    expect(list).toBeDefined();
  });

  it("omits Challenges section when none provided", () => {
    const config = buildInvestorUpdateReport(minimalData());
    const challenges = findSection(config.sections, "Challenges");
    expect(challenges).toBeUndefined();
  });

  it("includes Challenges section when provided", () => {
    const data = { ...minimalData(), challenges: ["Issue 1"] };
    const config = buildInvestorUpdateReport(data);
    const challenges = findSection(config.sections, "Challenges");
    expect(challenges).toBeDefined();
  });

  it("omits Asks section when none provided", () => {
    const config = buildInvestorUpdateReport(minimalData());
    const asks = findSection(config.sections, "Asks");
    expect(asks).toBeUndefined();
  });

  it("includes Asks section when provided", () => {
    const data = { ...minimalData(), asks: ["Need intro to X"] };
    const config = buildInvestorUpdateReport(data);
    const asks = findSection(config.sections, "Asks");
    expect(asks).toBeDefined();
    const list = asks!.content.find((c) => c.type === "list") as {
      type: "list";
      ordered: boolean;
    };
    expect(list.ordered).toBe(true);
  });

  it("always includes Looking Ahead section", () => {
    const config = buildInvestorUpdateReport(minimalData());
    const ahead = findSection(config.sections, "Looking Ahead");
    expect(ahead).toBeDefined();
  });

  it("Looking Ahead shows upcoming milestones when available", () => {
    const data = {
      ...minimalData(),
      upcomingMilestones: [
        { title: "Next launch", targetDate: "2026-07-01", status: "Planned" },
      ],
    };
    const config = buildInvestorUpdateReport(data);
    const ahead = findSection(config.sections, "Looking Ahead");
    const list = ahead!.content.find((c) => c.type === "list");
    expect(list).toBeDefined();
  });

  it("Looking Ahead shows fallback text when no upcoming milestones", () => {
    const config = buildInvestorUpdateReport(minimalData());
    const ahead = findSection(config.sections, "Looking Ahead");
    const textContent = ahead!.content.filter((c) => c.type === "text");
    const fallbackText = textContent.find((c) =>
      (c as { value: string }).value.includes("Detailed priorities"),
    );
    expect(fallbackText).toBeDefined();
  });

  it("Looking Ahead uses correct period label for quarterly", () => {
    const config = buildInvestorUpdateReport(minimalData());
    const ahead = findSection(config.sections, "Looking Ahead");
    const textContent = ahead!.content.find((c) => c.type === "text") as {
      type: "text";
      value: string;
    };
    expect(textContent.value).toContain("quarter");
  });

  it("Looking Ahead uses correct period label for monthly", () => {
    const data: InvestorUpdateData = {
      ...minimalData(),
      periodType: "monthly",
    };
    const config = buildInvestorUpdateReport(data);
    const ahead = findSection(config.sections, "Looking Ahead");
    const textContent = ahead!.content.find((c) => c.type === "text") as {
      type: "text";
      value: string;
    };
    expect(textContent.value).toContain("month");
  });

  it("produces all sections with full data", () => {
    const config = buildInvestorUpdateReport(fullData());

    expect(findSection(config.sections, "Update")).toBeDefined();
    expect(findSection(config.sections, "Key Metrics")).toBeDefined();
    expect(findSection(config.sections, "Milestone Progress")).toBeDefined();
    expect(findSection(config.sections, "Financial Summary")).toBeDefined();
    expect(findSection(config.sections, "Highlights")).toBeDefined();
    expect(findSection(config.sections, "Challenges")).toBeDefined();
    expect(findSection(config.sections, "Asks")).toBeDefined();
    expect(findSection(config.sections, "Looking Ahead")).toBeDefined();
  });

  it("section numbering increments correctly", () => {
    const config = buildInvestorUpdateReport(fullData());
    for (const section of config.sections) {
      expect(section.title).toMatch(/^\d+\./);
    }
    expect(config.sections[0].title).toMatch(/^1\./);
  });

  it("includes prevRevenue in Financial Summary key values", () => {
    const data = {
      ...minimalData(),
      revenue: 100_000,
      prevRevenue: 90_000,
    };
    const config = buildInvestorUpdateReport(data);
    const fin = findSection(config.sections, "Financial Summary");
    const kv = fin!.content.find((c) => c.type === "keyValue") as {
      type: "keyValue";
      items: Array<{ key: string; value: string }>;
    };
    expect(
      kv.items.find((i) => i.key === "Previous Period Revenue"),
    ).toBeDefined();
  });
});
