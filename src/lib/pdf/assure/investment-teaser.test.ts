import { describe, it, expect } from "vitest";
import {
  buildInvestmentTeaserReport,
  type InvestmentTeaserData,
} from "./investment-teaser";
import type { ReportSection } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalData(): InvestmentTeaserData {
  return {
    companyName: "StarLink Industries",
    oneLiner: "Affordable constellation management",
    stage: "Seed",
    operatorType: ["LSO"],
    subsector: ["GEO"],
  };
}

function fullData(): InvestmentTeaserData {
  return {
    ...minimalData(),
    missionStatement: "Connecting the unconnected",
    teamSize: 25,
    annualRevenue: 2_000_000,
    totalRaised: 5_000_000,
    runway: 14,
    irsGrade: "B+",
    irsScore: 78,
    headquarters: "Munich, Germany",
    website: "https://starlink-ind.com",
    problemStatement: "Existing solutions are too expensive",
    solutionStatement: "Modular, software-defined approach",
    productName: "ConstellationOS",
    productDescription: "Cloud-native satellite fleet management",
    trlLevel: 7,
    productStatus: "Beta",
    tamValue: 30_000_000_000,
    samValue: 3_000_000_000,
    somValue: 300_000_000,
    founders: [{ name: "Jane Doe", role: "CEO", background: "SpaceX veteran" }],
    boardMembers: [{ name: "John Board", affiliation: "VC Fund" }],
    revenueModel: "SaaS subscription",
    revenueStreams: [
      { stream: "Platform fees", percentage: 70, recurring: true },
      { stream: "Consulting", percentage: 30, recurring: false },
    ],
    revenueProjections: [
      { year: 2026, revenue: 4_000_000 },
      { year: 2027, revenue: 10_000_000 },
    ],
    isRaising: true,
    targetRaise: 10_000_000,
    roundType: "Series A",
    useOfFunds: [
      { category: "Engineering", percentage: 50 },
      { category: "Go-to-market", percentage: 30 },
    ],
    regulatoryStatus: "Licensed in Germany",
    complyVerified: true,
    topAdvantages: ["First mover", "Strong IP portfolio"],
    topRisks: [
      {
        title: "Market timing",
        severity: "high",
        mitigation: "Phased rollout",
      },
    ],
    recentMilestones: [{ title: "MVP Launch", date: "2025-11-01" }],
    upcomingMilestones: [{ title: "First customer", date: "2026-04-01" }],
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

describe("buildInvestmentTeaserReport", () => {
  it("returns a valid ReportConfig with minimal data", () => {
    const config = buildInvestmentTeaserReport(minimalData());

    expect(config.metadata.reportType).toBe("investment_teaser");
    expect(config.metadata.reportId).toMatch(/^TEASER-/);
    expect(config.metadata.title).toContain("StarLink Industries");
    expect(config.metadata.generatedBy).toBe("Caelex Assure");

    expect(config.header.title).toBe("Investment Teaser");
    expect(config.header.logo).toBe(true);

    expect(config.footer.pageNumbers).toBe(true);
    expect(config.footer.confidentialityNotice).toBeTruthy();
    expect(config.footer.disclaimer).toBeTruthy();

    // At least Company Overview
    expect(config.sections.length).toBeGreaterThanOrEqual(1);
  });

  it("includes Company Overview with mission statement when provided", () => {
    const data = { ...minimalData(), missionStatement: "Our big mission" };
    const config = buildInvestmentTeaserReport(data);
    const overview = findSection(config.sections, "Company Overview");
    expect(overview).toBeDefined();

    const textBlocks = overview!.content.filter((c) => c.type === "text");
    const missionTexts = textBlocks.filter(
      (c) =>
        c.type === "text" &&
        (c as { value: string }).value === "Our big mission",
    );
    expect(missionTexts.length).toBe(1);
  });

  it("omits Problem & Solution section when neither statement provided", () => {
    const config = buildInvestmentTeaserReport(minimalData());
    const ps = findSection(config.sections, "Problem & Solution");
    expect(ps).toBeUndefined();
  });

  it("includes Problem & Solution section with only problem statement", () => {
    const data = { ...minimalData(), problemStatement: "Big problem" };
    const config = buildInvestmentTeaserReport(data);
    const ps = findSection(config.sections, "Problem & Solution");
    expect(ps).toBeDefined();
  });

  it("includes Problem & Solution section with only solution statement", () => {
    const data = { ...minimalData(), solutionStatement: "Our answer" };
    const config = buildInvestmentTeaserReport(data);
    const ps = findSection(config.sections, "Problem & Solution");
    expect(ps).toBeDefined();
  });

  it("includes both problem and solution when both are provided", () => {
    const data = {
      ...minimalData(),
      problemStatement: "Problem text",
      solutionStatement: "Solution text",
    };
    const config = buildInvestmentTeaserReport(data);
    const ps = findSection(config.sections, "Problem & Solution");
    expect(ps).toBeDefined();
    // Should have heading + text for each, plus spacer
    expect(ps!.content.length).toBeGreaterThanOrEqual(4);
  });

  it("omits Technology Overview when no product info provided", () => {
    const config = buildInvestmentTeaserReport(minimalData());
    const tech = findSection(config.sections, "Technology Overview");
    expect(tech).toBeUndefined();
  });

  it("includes Technology Overview with product name", () => {
    const data = { ...minimalData(), productName: "TestProduct" };
    const config = buildInvestmentTeaserReport(data);
    const tech = findSection(config.sections, "Technology Overview");
    expect(tech).toBeDefined();
  });

  it("includes Technology Overview with trlLevel only", () => {
    const data = { ...minimalData(), trlLevel: 5 };
    const config = buildInvestmentTeaserReport(data);
    const tech = findSection(config.sections, "Technology Overview");
    expect(tech).toBeDefined();
  });

  it("includes product description and product status in Technology Overview", () => {
    const data = {
      ...minimalData(),
      productName: "Widget",
      productDescription: "A great widget",
      trlLevel: 9,
      productStatus: "Production",
    };
    const config = buildInvestmentTeaserReport(data);
    const tech = findSection(config.sections, "Technology Overview");
    expect(tech).toBeDefined();
    expect(tech!.content.length).toBeGreaterThanOrEqual(3);
  });

  it("handles unknown TRL level gracefully", () => {
    const data = { ...minimalData(), trlLevel: 99 };
    const config = buildInvestmentTeaserReport(data);
    const tech = findSection(config.sections, "Technology Overview");
    expect(tech).toBeDefined();
  });

  it("omits Team section when no founders or board members", () => {
    const config = buildInvestmentTeaserReport(minimalData());
    const team = findSection(config.sections, "Team");
    expect(team).toBeUndefined();
  });

  it("includes Team section with founders only", () => {
    const data = {
      ...minimalData(),
      founders: [{ name: "A", role: "CEO", background: "Ex-NASA" }],
    };
    const config = buildInvestmentTeaserReport(data);
    const team = findSection(config.sections, "Team");
    expect(team).toBeDefined();
  });

  it("includes Team section with board members only", () => {
    const data = {
      ...minimalData(),
      boardMembers: [{ name: "B", affiliation: "Fund X" }],
    };
    const config = buildInvestmentTeaserReport(data);
    const team = findSection(config.sections, "Team");
    expect(team).toBeDefined();
  });

  it("omits Financial Summary when no financial data", () => {
    const config = buildInvestmentTeaserReport(minimalData());
    const fin = findSection(config.sections, "Financial Summary");
    expect(fin).toBeUndefined();
  });

  it("includes Financial Summary with revenue model", () => {
    const data = { ...minimalData(), revenueModel: "SaaS" };
    const config = buildInvestmentTeaserReport(data);
    const fin = findSection(config.sections, "Financial Summary");
    expect(fin).toBeDefined();
  });

  it("includes revenue streams and projections in Financial Summary", () => {
    const data = {
      ...minimalData(),
      revenueStreams: [{ stream: "Subs", percentage: 80, recurring: true }],
      revenueProjections: [{ year: 2027, revenue: 5_000_000 }],
    };
    const config = buildInvestmentTeaserReport(data);
    const fin = findSection(config.sections, "Financial Summary");
    expect(fin).toBeDefined();
    const tables = fin!.content.filter((c) => c.type === "table");
    expect(tables.length).toBe(2); // streams + projections
  });

  it("omits Regulatory Position when no regulatory data", () => {
    const config = buildInvestmentTeaserReport(minimalData());
    const reg = findSection(config.sections, "Regulatory Position");
    expect(reg).toBeUndefined();
  });

  it("includes Regulatory Position with regulatoryStatus only", () => {
    const data = { ...minimalData(), regulatoryStatus: "Compliant" };
    const config = buildInvestmentTeaserReport(data);
    const reg = findSection(config.sections, "Regulatory Position");
    expect(reg).toBeDefined();
  });

  it("includes Regulatory Position with complyVerified true", () => {
    const data = { ...minimalData(), complyVerified: true };
    const config = buildInvestmentTeaserReport(data);
    const reg = findSection(config.sections, "Regulatory Position");
    expect(reg).toBeDefined();
    const alert = reg!.content.find((c) => c.type === "alert");
    expect(alert).toBeDefined();
  });

  it("includes Regulatory Position with complyVerified false", () => {
    const data = { ...minimalData(), complyVerified: false };
    const config = buildInvestmentTeaserReport(data);
    const reg = findSection(config.sections, "Regulatory Position");
    expect(reg).toBeDefined();
    const alert = reg!.content.find((c) => c.type === "alert") as {
      type: "alert";
      severity: string;
      message: string;
    };
    expect(alert.severity).toBe("warning");
  });

  it("omits Top Risks section when none provided", () => {
    const config = buildInvestmentTeaserReport(minimalData());
    const risks = findSection(config.sections, "Top Risks");
    expect(risks).toBeUndefined();
  });

  it("includes Top Risks section when provided", () => {
    const data = {
      ...minimalData(),
      topRisks: [{ title: "Risk 1", severity: "high", mitigation: "Plan A" }],
    };
    const config = buildInvestmentTeaserReport(data);
    const risks = findSection(config.sections, "Top Risks");
    expect(risks).toBeDefined();
  });

  it("produces all sections with full data", () => {
    const config = buildInvestmentTeaserReport(fullData());

    expect(findSection(config.sections, "Company Overview")).toBeDefined();
    expect(findSection(config.sections, "Key Metrics")).toBeDefined();
    expect(findSection(config.sections, "Problem & Solution")).toBeDefined();
    expect(findSection(config.sections, "Technology Overview")).toBeDefined();
    expect(findSection(config.sections, "Market Overview")).toBeDefined();
    expect(findSection(config.sections, "Team")).toBeDefined();
    expect(findSection(config.sections, "Financial Summary")).toBeDefined();
    expect(findSection(config.sections, "Current Raise")).toBeDefined();
    expect(findSection(config.sections, "Regulatory Position")).toBeDefined();
    expect(findSection(config.sections, "Top Advantages")).toBeDefined();
    expect(findSection(config.sections, "Top Risks")).toBeDefined();
    expect(findSection(config.sections, "Milestones")).toBeDefined();
  });

  it("includes IRS grade and website in overview key values", () => {
    const data = {
      ...minimalData(),
      irsGrade: "A",
      irsScore: 90,
      website: "https://test.com",
      headquarters: "London",
    };
    const config = buildInvestmentTeaserReport(data);
    const overview = findSection(config.sections, "Company Overview");
    const kv = overview!.content.find((c) => c.type === "keyValue") as {
      type: "keyValue";
      items: Array<{ key: string; value: string }>;
    };
    expect(kv.items.find((i) => i.key === "IRS Grade")).toBeDefined();
    expect(kv.items.find((i) => i.key === "Website")).toBeDefined();
    expect(kv.items.find((i) => i.key === "Headquarters")).toBeDefined();
  });

  it("section numbering increments correctly", () => {
    const config = buildInvestmentTeaserReport(fullData());
    // Each section title should start with a number followed by "."
    for (const section of config.sections) {
      expect(section.title).toMatch(/^\d+\./);
    }
    // First section is 1
    expect(config.sections[0].title).toMatch(/^1\./);
  });
});
