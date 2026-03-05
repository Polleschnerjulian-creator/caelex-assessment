import { describe, it, expect } from "vitest";
import {
  buildExecutiveSummaryReport,
  type ExecutiveSummaryData,
} from "./executive-summary";
import type { ReportConfig, ReportSection } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid data for the builder. */
function minimalData(): ExecutiveSummaryData {
  return {
    companyName: "Acme Space",
    oneLiner: "Next-gen satellite operator",
    stage: "Series A",
    operatorType: ["SCO"],
    subsector: ["LEO"],
  };
}

/** Full data with every optional field filled. */
function fullData(): ExecutiveSummaryData {
  return {
    ...minimalData(),
    teamSize: 42,
    annualRevenue: 3_500_000,
    totalRaised: 10_000_000,
    runway: 18,
    irsGrade: "A",
    irsScore: 85,
    tamValue: 50_000_000_000,
    samValue: 5_000_000_000,
    somValue: 500_000_000,
    isRaising: true,
    targetRaise: 5_000_000,
    roundType: "Series B",
    useOfFunds: [
      { category: "R&D", percentage: 40 },
      { category: "Sales", percentage: 30 },
    ],
    topAdvantages: ["Patented propulsion", "First-mover in LEO segment"],
    recentMilestones: [{ title: "Launched Sat-1", date: "2025-06-15" }],
    upcomingMilestones: [{ title: "Sat-2 integration", date: "2026-09-01" }],
    website: "https://acme.space",
    headquarters: "Dublin, Ireland",
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

describe("buildExecutiveSummaryReport", () => {
  it("returns a valid ReportConfig with minimal data", () => {
    const config = buildExecutiveSummaryReport(minimalData());

    expect(config.metadata).toBeDefined();
    expect(config.metadata.reportType).toBe("executive_summary");
    expect(config.metadata.reportId).toMatch(/^EXEC-/);
    expect(config.metadata.title).toContain("Acme Space");
    expect(config.metadata.generatedBy).toBe("Caelex Assure");
    expect(config.metadata.organization).toBe("Acme Space");
    expect(config.metadata.generatedAt).toBeInstanceOf(Date);

    expect(config.header.title).toBe("Executive Summary");
    expect(config.header.subtitle).toContain("Acme Space");
    expect(config.header.logo).toBe(true);

    expect(config.footer.pageNumbers).toBe(true);
    expect(config.footer.confidentialityNotice).toBeTruthy();
    expect(config.footer.disclaimer).toBeTruthy();

    expect(config.sections.length).toBeGreaterThanOrEqual(1);
  });

  it("includes Company Overview section with key/value pairs", () => {
    const config = buildExecutiveSummaryReport(minimalData());
    const overview = findSection(config.sections, "Company Overview");
    expect(overview).toBeDefined();

    // Should contain heading, text, spacer, keyValue
    const types = overview!.content.map((c) => c.type);
    expect(types).toContain("heading");
    expect(types).toContain("text");
    expect(types).toContain("keyValue");
  });

  it("omits Key Metrics section when no metrics provided", () => {
    const config = buildExecutiveSummaryReport(minimalData());
    const metrics = findSection(config.sections, "Key Metrics");
    expect(metrics).toBeUndefined();
  });

  it("includes Key Metrics section when metrics are provided", () => {
    const data = { ...minimalData(), teamSize: 10, annualRevenue: 500_000 };
    const config = buildExecutiveSummaryReport(data);
    const metrics = findSection(config.sections, "Key Metrics");
    expect(metrics).toBeDefined();
    const table = metrics!.content.find((c) => c.type === "table");
    expect(table).toBeDefined();
  });

  it("omits Market Overview when no TAM/SAM/SOM provided", () => {
    const config = buildExecutiveSummaryReport(minimalData());
    const market = findSection(config.sections, "Market Overview");
    expect(market).toBeUndefined();
  });

  it("includes Market Overview when TAM is provided", () => {
    const data = { ...minimalData(), tamValue: 1_000_000_000 };
    const config = buildExecutiveSummaryReport(data);
    const market = findSection(config.sections, "Market Overview");
    expect(market).toBeDefined();
  });

  it("includes partial market data (only SAM)", () => {
    const data = { ...minimalData(), samValue: 500_000_000 };
    const config = buildExecutiveSummaryReport(data);
    const market = findSection(config.sections, "Market Overview");
    expect(market).toBeDefined();
  });

  it("omits Current Raise section when isRaising is false/undefined", () => {
    const config = buildExecutiveSummaryReport(minimalData());
    const raise = findSection(config.sections, "Current Raise");
    expect(raise).toBeUndefined();
  });

  it("includes Current Raise section when isRaising is true", () => {
    const data: ExecutiveSummaryData = {
      ...minimalData(),
      isRaising: true,
      targetRaise: 2_000_000,
      roundType: "Seed",
    };
    const config = buildExecutiveSummaryReport(data);
    const raise = findSection(config.sections, "Current Raise");
    expect(raise).toBeDefined();
  });

  it("includes Use of Funds table when useOfFunds is provided with isRaising", () => {
    const data: ExecutiveSummaryData = {
      ...minimalData(),
      isRaising: true,
      useOfFunds: [{ category: "Engineering", percentage: 60 }],
    };
    const config = buildExecutiveSummaryReport(data);
    const raise = findSection(config.sections, "Current Raise");
    expect(raise).toBeDefined();
    const tables = raise!.content.filter((c) => c.type === "table");
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });

  it("includes Current Raise without optional targetRaise or roundType", () => {
    const data: ExecutiveSummaryData = {
      ...minimalData(),
      isRaising: true,
    };
    const config = buildExecutiveSummaryReport(data);
    const raise = findSection(config.sections, "Current Raise");
    expect(raise).toBeDefined();
  });

  it("omits Top Advantages section when none provided", () => {
    const config = buildExecutiveSummaryReport(minimalData());
    const adv = findSection(config.sections, "Top Advantages");
    expect(adv).toBeUndefined();
  });

  it("includes Top Advantages section when provided", () => {
    const data = { ...minimalData(), topAdvantages: ["Speed", "Cost"] };
    const config = buildExecutiveSummaryReport(data);
    const adv = findSection(config.sections, "Top Advantages");
    expect(adv).toBeDefined();
    const list = adv!.content.find((c) => c.type === "list");
    expect(list).toBeDefined();
  });

  it("omits Milestones section when none provided", () => {
    const config = buildExecutiveSummaryReport(minimalData());
    const ms = findSection(config.sections, "Milestones");
    expect(ms).toBeUndefined();
  });

  it("includes Milestones section when recentMilestones provided", () => {
    const data = {
      ...minimalData(),
      recentMilestones: [{ title: "Launch", date: "2025-01-01" }],
    };
    const config = buildExecutiveSummaryReport(data);
    const ms = findSection(config.sections, "Milestones");
    expect(ms).toBeDefined();
  });

  it("includes Milestones section when upcomingMilestones provided", () => {
    const data = {
      ...minimalData(),
      upcomingMilestones: [{ title: "Deploy", date: "2026-06-01" }],
    };
    const config = buildExecutiveSummaryReport(data);
    const ms = findSection(config.sections, "Milestones");
    expect(ms).toBeDefined();
  });

  it("omits Contact section when no website or headquarters", () => {
    const config = buildExecutiveSummaryReport(minimalData());
    const contact = findSection(config.sections, "Contact");
    expect(contact).toBeUndefined();
  });

  it("includes Contact section when website is provided", () => {
    const data = { ...minimalData(), website: "https://example.com" };
    const config = buildExecutiveSummaryReport(data);
    const contact = findSection(config.sections, "Contact");
    expect(contact).toBeDefined();
  });

  it("includes IRS grade in Company Overview when provided", () => {
    const data = { ...minimalData(), irsGrade: "B+", irsScore: 72 };
    const config = buildExecutiveSummaryReport(data);
    const overview = findSection(config.sections, "Company Overview");
    const kv = overview!.content.find((c) => c.type === "keyValue") as {
      type: "keyValue";
      items: Array<{ key: string; value: string }>;
    };
    const irsItem = kv.items.find((i) => i.key === "IRS Grade");
    expect(irsItem).toBeDefined();
    expect(irsItem!.value).toContain("B+");
    expect(irsItem!.value).toContain("72");
  });

  it("includes IRS grade without score", () => {
    const data = { ...minimalData(), irsGrade: "A" };
    const config = buildExecutiveSummaryReport(data);
    const overview = findSection(config.sections, "Company Overview");
    const kv = overview!.content.find((c) => c.type === "keyValue") as {
      type: "keyValue";
      items: Array<{ key: string; value: string }>;
    };
    const irsItem = kv.items.find((i) => i.key === "IRS Grade");
    expect(irsItem).toBeDefined();
    expect(irsItem!.value).toBe("A");
  });

  it("produces all sections with full data", () => {
    const config = buildExecutiveSummaryReport(fullData());

    // With full data we expect all optional sections to be present
    expect(findSection(config.sections, "Company Overview")).toBeDefined();
    expect(findSection(config.sections, "Key Metrics")).toBeDefined();
    expect(findSection(config.sections, "Market Overview")).toBeDefined();
    expect(findSection(config.sections, "Current Raise")).toBeDefined();
    expect(findSection(config.sections, "Top Advantages")).toBeDefined();
    expect(findSection(config.sections, "Milestones")).toBeDefined();
    expect(findSection(config.sections, "Contact")).toBeDefined();
  });

  it("includes headquarters in Company Overview key values", () => {
    const data = { ...minimalData(), headquarters: "Berlin, Germany" };
    const config = buildExecutiveSummaryReport(data);
    const overview = findSection(config.sections, "Company Overview");
    const kv = overview!.content.find((c) => c.type === "keyValue") as {
      type: "keyValue";
      items: Array<{ key: string; value: string }>;
    };
    const hqItem = kv.items.find((i) => i.key === "Headquarters");
    expect(hqItem).toBeDefined();
    expect(hqItem!.value).toBe("Berlin, Germany");
  });

  it("includes all key metrics rows when provided", () => {
    const data = {
      ...minimalData(),
      teamSize: 5,
      annualRevenue: 100_000,
      totalRaised: 500_000,
      runway: 12,
    };
    const config = buildExecutiveSummaryReport(data);
    const metrics = findSection(config.sections, "Key Metrics");
    const table = metrics!.content.find((c) => c.type === "table") as {
      type: "table";
      rows: string[][];
    };
    expect(table.rows.length).toBe(4);
  });
});
