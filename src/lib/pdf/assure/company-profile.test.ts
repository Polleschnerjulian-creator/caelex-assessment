import { describe, it, expect } from "vitest";
import {
  buildCompanyProfileReport,
  type CompanyProfileData,
} from "./company-profile";
import type { ReportSection } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalData(): CompanyProfileData {
  return {
    companyName: "OrbitTech",
    oneLiner: "Space debris tracking platform",
    stage: "Growth",
    operatorType: ["ISOS"],
    subsector: ["SSA"],
  };
}

function fullData(): CompanyProfileData {
  return {
    ...minimalData(),
    missionStatement: "Making space sustainable",
    teamSize: 60,
    annualRevenue: 8_000_000,
    totalRaised: 25_000_000,
    runway: 24,
    irsGrade: "A+",
    irsScore: 95,
    headquarters: "Paris, France",
    website: "https://orbittech.eu",
    problemStatement: "Debris collisions are increasing",
    solutionStatement: "AI-powered tracking and avoidance",
    productName: "OrbitSafe",
    productDescription: "Real-time collision avoidance system",
    trlLevel: 8,
    productStatus: "Production",
    tamValue: 100_000_000_000,
    samValue: 10_000_000_000,
    somValue: 1_000_000_000,
    competitors: [
      {
        name: "SpaceTrack Inc",
        strengths: "Established brand",
        weaknesses: "Legacy tech",
        differentiation: "AI advantage",
      },
    ],
    founders: [{ name: "Marie Curie", role: "CEO", background: "ESA alum" }],
    boardMembers: [{ name: "Albert E.", affiliation: "Science Fund" }],
    revenueModel: "Subscription + data licensing",
    revenueStreams: [
      { stream: "Subscription", percentage: 60, recurring: true },
      { stream: "Data licensing", percentage: 40, recurring: false },
    ],
    revenueProjections: [{ year: 2027, revenue: 15_000_000 }],
    unitEconomics: [
      { metric: "CAC", value: "EUR 5,000" },
      { metric: "LTV", value: "EUR 50,000" },
    ],
    fundingRounds: [
      {
        round: "Series A",
        date: "2024-03-15",
        amount: 10_000_000,
        valuation: 50_000_000,
        leadInvestor: "Space Ventures",
      },
    ],
    isRaising: true,
    targetRaise: 20_000_000,
    roundType: "Series B",
    useOfFunds: [
      { category: "R&D", percentage: 40 },
      { category: "Sales", percentage: 35 },
    ],
    allRisks: [
      {
        title: "Regulatory change",
        category: "Regulatory",
        probability: "High",
        impact: "High",
        riskScore: 9,
        mitigation: "Legal monitoring",
        status: "Open",
      },
      {
        title: "Tech obsolescence",
        category: "Technology",
        probability: "Low",
        impact: "Medium",
        riskScore: 3,
        mitigation: "R&D investment",
        status: "Mitigated",
      },
    ],
    regulatoryStatus: "CNES licensed",
    complyVerified: true,
    patents: {
      filed: 5,
      granted: 3,
      descriptions: ["AI tracking algo", "Avoidance manoeuvre system"],
    },
    ipStrategy: "Defensive + licensing",
    partnerships: [
      { partner: "ESA", type: "Agency", value: 2_000_000, status: "Active" },
      { partner: "Airbus", type: "OEM", status: "In Negotiation" },
    ],
    awards: [
      {
        name: "Best SpaceTech 2025",
        date: "2025-09-10",
        issuer: "SpaceAwards",
      },
    ],
    keyMetrics: [{ name: "MRR", value: "EUR 600K", trend: "up" }],
    topAdvantages: ["AI-first approach", "ESA partnership"],
    recentMilestones: [{ title: "100th customer", date: "2025-12-01" }],
    upcomingMilestones: [{ title: "US expansion", date: "2026-06-01" }],
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

describe("buildCompanyProfileReport", () => {
  it("returns a valid ReportConfig with minimal data", () => {
    const config = buildCompanyProfileReport(minimalData());

    expect(config.metadata.reportType).toBe("assure_company_profile");
    expect(config.metadata.reportId).toMatch(/^PROFILE-/);
    expect(config.metadata.title).toContain("OrbitTech");
    expect(config.metadata.generatedBy).toBe("Caelex Assure");

    expect(config.header.title).toBe("Company Profile");
    expect(config.header.subtitle).toContain("Comprehensive Due Diligence");
    expect(config.header.logo).toBe(true);

    expect(config.footer.pageNumbers).toBe(true);
    expect(config.footer.confidentialityNotice).toBeTruthy();

    // Should always have at least Company Overview + Appendices
    expect(config.sections.length).toBeGreaterThanOrEqual(2);
  });

  it("always includes Appendices section", () => {
    const config = buildCompanyProfileReport(minimalData());
    const appendices = findSection(config.sections, "Appendices");
    expect(appendices).toBeDefined();
  });

  it("includes mission statement in Company Overview when provided", () => {
    const data = { ...minimalData(), missionStatement: "Our mission" };
    const config = buildCompanyProfileReport(data);
    const overview = findSection(config.sections, "Company Overview");
    const headings = overview!.content.filter(
      (c) =>
        c.type === "heading" &&
        (c as { value: string }).value === "Mission Statement",
    );
    expect(headings.length).toBe(1);
  });

  it("omits Competitive Landscape when no competitors", () => {
    const config = buildCompanyProfileReport(minimalData());
    const comp = findSection(config.sections, "Competitive Landscape");
    expect(comp).toBeUndefined();
  });

  it("includes Competitive Landscape when competitors provided", () => {
    const data = {
      ...minimalData(),
      competitors: [
        {
          name: "Rival",
          strengths: "S",
          weaknesses: "W",
          differentiation: "D",
        },
      ],
    };
    const config = buildCompanyProfileReport(data);
    const comp = findSection(config.sections, "Competitive Landscape");
    expect(comp).toBeDefined();
  });

  it("includes Full Risk Register with critical risk alert", () => {
    const data = {
      ...minimalData(),
      allRisks: [
        {
          title: "Critical one",
          category: "Operations",
          probability: "High",
          impact: "High",
          riskScore: 10,
          mitigation: "Plan",
          status: "Open",
        },
      ],
    };
    const config = buildCompanyProfileReport(data);
    const risks = findSection(config.sections, "Full Risk Register");
    expect(risks).toBeDefined();
    const alert = risks!.content.find((c) => c.type === "alert");
    expect(alert).toBeDefined();
  });

  it("includes Full Risk Register without critical alert when none critical", () => {
    const data = {
      ...minimalData(),
      allRisks: [
        {
          title: "Low risk",
          category: "Market",
          probability: "Low",
          impact: "Low",
          riskScore: 2,
          mitigation: "Monitor",
          status: "Resolved",
        },
      ],
    };
    const config = buildCompanyProfileReport(data);
    const risks = findSection(config.sections, "Full Risk Register");
    expect(risks).toBeDefined();
    const alert = risks!.content.find((c) => c.type === "alert");
    expect(alert).toBeUndefined();
  });

  it("falls back to Key Risks when allRisks empty but topRisks provided", () => {
    const data = {
      ...minimalData(),
      topRisks: [
        { title: "Some risk", severity: "medium", mitigation: "Handle it" },
      ],
    };
    const config = buildCompanyProfileReport(data);
    const risks = findSection(config.sections, "Key Risks");
    expect(risks).toBeDefined();
  });

  it("omits risk section entirely when no risks of any kind", () => {
    const config = buildCompanyProfileReport(minimalData());
    const fullRisks = findSection(config.sections, "Full Risk Register");
    const keyRisks = findSection(config.sections, "Key Risks");
    expect(fullRisks).toBeUndefined();
    expect(keyRisks).toBeUndefined();
  });

  it("includes IP Portfolio with patents and strategy", () => {
    const data = {
      ...minimalData(),
      patents: { filed: 3, granted: 1, descriptions: ["Patent A"] },
      ipStrategy: "Aggressive filing",
    };
    const config = buildCompanyProfileReport(data);
    const ip = findSection(config.sections, "IP Portfolio");
    expect(ip).toBeDefined();
    // Should have keyValue for counts, list for descriptions, heading + text for strategy
    expect(ip!.content.length).toBeGreaterThanOrEqual(4);
  });

  it("includes IP Portfolio with only ipStrategy", () => {
    const data = { ...minimalData(), ipStrategy: "Defensive" };
    const config = buildCompanyProfileReport(data);
    const ip = findSection(config.sections, "IP Portfolio");
    expect(ip).toBeDefined();
  });

  it("includes IP Portfolio with patents that have empty descriptions", () => {
    const data = {
      ...minimalData(),
      patents: { filed: 2, granted: 0, descriptions: [] },
    };
    const config = buildCompanyProfileReport(data);
    const ip = findSection(config.sections, "IP Portfolio");
    expect(ip).toBeDefined();
  });

  it("omits Partnerships section when none provided", () => {
    const config = buildCompanyProfileReport(minimalData());
    const partnerships = findSection(config.sections, "Partnerships");
    expect(partnerships).toBeUndefined();
  });

  it("includes Partnerships section with value and without", () => {
    const data = {
      ...minimalData(),
      partnerships: [
        { partner: "ESA", type: "Agency", value: 1_000_000, status: "Active" },
        { partner: "NASA", type: "Gov", status: "Pending" },
      ],
    };
    const config = buildCompanyProfileReport(data);
    const partnerships = findSection(config.sections, "Partnerships");
    expect(partnerships).toBeDefined();
  });

  it("omits Awards section when none provided", () => {
    const config = buildCompanyProfileReport(minimalData());
    const awards = findSection(config.sections, "Awards");
    expect(awards).toBeUndefined();
  });

  it("includes Awards section when provided", () => {
    const data = {
      ...minimalData(),
      awards: [
        { name: "Best Startup", date: "2025-01-01", issuer: "TechCrunch" },
      ],
    };
    const config = buildCompanyProfileReport(data);
    const awards = findSection(config.sections, "Awards");
    expect(awards).toBeDefined();
  });

  it("omits Traction & Metrics when keyMetrics not provided", () => {
    const config = buildCompanyProfileReport(minimalData());
    const traction = findSection(config.sections, "Traction");
    expect(traction).toBeUndefined();
  });

  it("includes Traction & Metrics when keyMetrics provided", () => {
    const data = {
      ...minimalData(),
      keyMetrics: [{ name: "ARR", value: "EUR 5M", trend: "up" }],
    };
    const config = buildCompanyProfileReport(data);
    const traction = findSection(config.sections, "Traction");
    expect(traction).toBeDefined();
  });

  it("omits Funding History when no funding rounds", () => {
    const config = buildCompanyProfileReport(minimalData());
    const funding = findSection(config.sections, "Funding History");
    expect(funding).toBeUndefined();
  });

  it("includes Funding History when fundingRounds provided", () => {
    const data = {
      ...minimalData(),
      fundingRounds: [
        {
          round: "Seed",
          date: "2023-01-01",
          amount: 1_000_000,
          valuation: 5_000_000,
          leadInvestor: "Angel Fund",
        },
      ],
    };
    const config = buildCompanyProfileReport(data);
    const funding = findSection(config.sections, "Funding History");
    expect(funding).toBeDefined();
  });

  it("includes Financial Detail with unitEconomics", () => {
    const data = {
      ...minimalData(),
      unitEconomics: [{ metric: "CAC", value: "EUR 1000" }],
    };
    const config = buildCompanyProfileReport(data);
    const fin = findSection(config.sections, "Financial Detail");
    expect(fin).toBeDefined();
  });

  it("includes Regulatory Position with complyVerified false", () => {
    const data = { ...minimalData(), complyVerified: false };
    const config = buildCompanyProfileReport(data);
    const reg = findSection(config.sections, "Regulatory Position");
    expect(reg).toBeDefined();
    const alert = reg!.content.find((c) => c.type === "alert") as {
      type: "alert";
      severity: string;
    };
    expect(alert.severity).toBe("warning");
  });

  it("produces all sections with full data", () => {
    const config = buildCompanyProfileReport(fullData());

    expect(findSection(config.sections, "Company Overview")).toBeDefined();
    expect(findSection(config.sections, "Key Metrics")).toBeDefined();
    expect(findSection(config.sections, "Problem & Solution")).toBeDefined();
    expect(findSection(config.sections, "Technology Overview")).toBeDefined();
    expect(findSection(config.sections, "Market Overview")).toBeDefined();
    expect(findSection(config.sections, "Competitive Landscape")).toBeDefined();
    expect(findSection(config.sections, "Team")).toBeDefined();
    expect(findSection(config.sections, "Financial Detail")).toBeDefined();
    expect(findSection(config.sections, "Funding History")).toBeDefined();
    expect(findSection(config.sections, "Current Raise")).toBeDefined();
    expect(findSection(config.sections, "Full Risk Register")).toBeDefined();
    expect(findSection(config.sections, "Regulatory Position")).toBeDefined();
    expect(findSection(config.sections, "IP Portfolio")).toBeDefined();
    expect(findSection(config.sections, "Partnerships")).toBeDefined();
    expect(findSection(config.sections, "Awards")).toBeDefined();
    expect(findSection(config.sections, "Traction")).toBeDefined();
    expect(
      findSection(config.sections, "Competitive Advantages"),
    ).toBeDefined();
    expect(findSection(config.sections, "Milestones")).toBeDefined();
    expect(findSection(config.sections, "Appendices")).toBeDefined();
  });

  it("section numbering increments correctly", () => {
    const config = buildCompanyProfileReport(fullData());
    for (const section of config.sections) {
      expect(section.title).toMatch(/^\d+\./);
    }
    expect(config.sections[0].title).toMatch(/^1\./);
  });

  it("critical risk count shows plural when multiple", () => {
    const data = {
      ...minimalData(),
      allRisks: [
        {
          title: "R1",
          category: "Cat",
          probability: "High",
          impact: "High",
          riskScore: 10,
          mitigation: "M1",
          status: "Open",
        },
        {
          title: "R2",
          category: "Cat",
          probability: "High",
          impact: "High",
          riskScore: 9,
          mitigation: "M2",
          status: "Open",
        },
      ],
    };
    const config = buildCompanyProfileReport(data);
    const risks = findSection(config.sections, "Full Risk Register");
    const alert = risks!.content.find((c) => c.type === "alert") as {
      type: "alert";
      message: string;
    };
    expect(alert.message).toContain("risks");
    expect(alert.message).toContain("2");
  });
});
