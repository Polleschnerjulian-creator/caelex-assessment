import { describe, it, expect } from "vitest";
import { buildRiskReport, type RiskReportData } from "./risk-report";
import type { ReportSection } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function minimalData(): RiskReportData {
  return {
    companyName: "SatCo",
    risks: [
      {
        title: "Launch delay",
        category: "Operations",
        probability: "Medium",
        impact: "High",
        riskScore: 6,
        mitigationStatus: "In Progress",
      },
    ],
    heatmapSummary: { critical: 0, high: 1, medium: 0, low: 0 },
    mitigationCoverage: 0.6,
  };
}

function fullData(): RiskReportData {
  return {
    companyName: "SatCo",
    irsGrade: "B",
    irsScore: 70,
    risks: [
      {
        title: "Regulatory change",
        category: "Regulatory",
        probability: "High",
        impact: "High",
        riskScore: 9,
        financialExposure: 5_000_000,
        mitigationStrategy: "Legal monitoring",
        mitigationStatus: "Mitigated",
        timeHorizon: "12 months",
      },
      {
        title: "Supply chain",
        category: "Operations",
        probability: "Medium",
        impact: "Medium",
        riskScore: 5,
        financialExposure: 1_000_000,
        mitigationStrategy: "Dual sourcing",
        mitigationStatus: "In Progress",
      },
      {
        title: "Talent retention",
        category: "People",
        probability: "Low",
        impact: "Medium",
        riskScore: 3,
        mitigationStatus: "Pending",
      },
      {
        title: "Market risk",
        category: "Market",
        probability: "Low",
        impact: "Low",
        riskScore: 1,
        mitigationStatus: "Resolved",
      },
    ],
    heatmapSummary: { critical: 1, high: 0, medium: 1, low: 2 },
    mitigationCoverage: 0.45,
    scenarios: [
      {
        name: "Worst case regulation",
        description: "Major regulatory shift impacts all operations",
        financialImpact: {
          bestCase: 1_000_000,
          mostLikely: 3_000_000,
          worstCase: 10_000_000,
        },
        triggeredRisks: 2,
      },
    ],
    totalFinancialExposure: 6_000_000,
    regulatoryRisks: [
      { risk: "EU Space Act compliance gap", status: "Under review" },
    ],
    complyVerified: false,
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

describe("buildRiskReport", () => {
  it("returns a valid ReportConfig with minimal data", () => {
    const config = buildRiskReport(minimalData());

    expect(config.metadata.reportType).toBe("assure_risk_report");
    expect(config.metadata.reportId).toMatch(/^RISK-/);
    expect(config.metadata.title).toContain("SatCo");
    expect(config.metadata.generatedBy).toBe("Caelex Assure");

    expect(config.header.title).toBe("Risk Analysis Report");
    expect(config.header.subtitle).toContain("SatCo");
    expect(config.header.logo).toBe(true);

    expect(config.footer.pageNumbers).toBe(true);
  });

  it("always includes Executive Summary section", () => {
    const config = buildRiskReport(minimalData());
    const exec = findSection(config.sections, "Executive Summary");
    expect(exec).toBeDefined();
  });

  it("Executive Summary includes high severity alert for high risks", () => {
    const config = buildRiskReport(minimalData());
    const exec = findSection(config.sections, "Executive Summary");
    const alert = exec!.content.find((c) => c.type === "alert") as {
      type: "alert";
      severity: string;
    };
    expect(alert).toBeDefined();
    expect(alert.severity).toBe("warning"); // high but not critical
  });

  it("Executive Summary includes critical alert when critical risks exist", () => {
    const data = {
      ...minimalData(),
      heatmapSummary: { critical: 2, high: 0, medium: 0, low: 0 },
    };
    const config = buildRiskReport(data);
    const exec = findSection(config.sections, "Executive Summary");
    const alert = exec!.content.find((c) => c.type === "alert") as {
      type: "alert";
      severity: string;
      message: string;
    };
    expect(alert.severity).toBe("error");
    expect(alert.message).toContain("2 critical risks");
  });

  it("Executive Summary shows single critical risk without plural", () => {
    const data = {
      ...minimalData(),
      heatmapSummary: { critical: 1, high: 0, medium: 0, low: 0 },
    };
    const config = buildRiskReport(data);
    const exec = findSection(config.sections, "Executive Summary");
    const alert = exec!.content.find((c) => c.type === "alert") as {
      type: "alert";
      message: string;
    };
    expect(alert.message).toContain("1 critical risk ");
    expect(alert.message).not.toContain("risks");
  });

  it("Executive Summary shows info alert when no critical or high risks", () => {
    const data = {
      ...minimalData(),
      heatmapSummary: { critical: 0, high: 0, medium: 1, low: 1 },
    };
    const config = buildRiskReport(data);
    const exec = findSection(config.sections, "Executive Summary");
    const alert = exec!.content.find((c) => c.type === "alert") as {
      type: "alert";
      severity: string;
    };
    expect(alert.severity).toBe("info");
  });

  it("includes IRS grade in Executive Summary when provided", () => {
    const data = { ...minimalData(), irsGrade: "A", irsScore: 90 };
    const config = buildRiskReport(data);
    const exec = findSection(config.sections, "Executive Summary");
    const kv = exec!.content.find((c) => c.type === "keyValue") as {
      type: "keyValue";
      items: Array<{ key: string; value: string }>;
    };
    const irsItem = kv.items.find((i) => i.key === "IRS Grade");
    expect(irsItem).toBeDefined();
    expect(irsItem!.value).toContain("A");
    expect(irsItem!.value).toContain("90");
  });

  it("includes total financial exposure in Executive Summary when provided", () => {
    const data = { ...minimalData(), totalFinancialExposure: 3_000_000 };
    const config = buildRiskReport(data);
    const exec = findSection(config.sections, "Executive Summary");
    const kv = exec!.content.find((c) => c.type === "keyValue") as {
      type: "keyValue";
      items: Array<{ key: string; value: string }>;
    };
    const exposure = kv.items.find((i) => i.key === "Total Financial Exposure");
    expect(exposure).toBeDefined();
  });

  it("always includes Risk Heat Map Summary section", () => {
    const config = buildRiskReport(minimalData());
    const heatmap = findSection(config.sections, "Risk Heat Map");
    expect(heatmap).toBeDefined();
  });

  it("handles heatmap with all zeros", () => {
    const data = {
      ...minimalData(),
      heatmapSummary: { critical: 0, high: 0, medium: 0, low: 0 },
    };
    const config = buildRiskReport(data);
    const heatmap = findSection(config.sections, "Risk Heat Map");
    expect(heatmap).toBeDefined();
    // When total is 0, percentages should show "0%"
    const table = heatmap!.content.find((c) => c.type === "table") as {
      type: "table";
      rows: string[][];
    };
    // CRITICAL row percentage
    expect(table.rows[0][2]).toBe("0%");
  });

  it("always includes Risk Register section", () => {
    const config = buildRiskReport(minimalData());
    const register = findSection(config.sections, "Risk Register");
    expect(register).toBeDefined();
  });

  it("Risk Register shows table when risks exist", () => {
    const config = buildRiskReport(minimalData());
    const register = findSection(config.sections, "Risk Register");
    const table = register!.content.find((c) => c.type === "table");
    expect(table).toBeDefined();
  });

  it("Risk Register shows message when no risks", () => {
    const data: RiskReportData = {
      companyName: "EmptyCo",
      risks: [],
      heatmapSummary: { critical: 0, high: 0, medium: 0, low: 0 },
      mitigationCoverage: 0,
    };
    const config = buildRiskReport(data);
    const register = findSection(config.sections, "Risk Register");
    const textContent = register!.content.filter((c) => c.type === "text");
    const noRisksText = textContent.find((c) =>
      (c as { value: string }).value.includes("No risks"),
    );
    expect(noRisksText).toBeDefined();
  });

  it("always includes Category Analysis section", () => {
    const config = buildRiskReport(minimalData());
    const cat = findSection(config.sections, "Category Analysis");
    expect(cat).toBeDefined();
  });

  it("Category Analysis groups risks by category", () => {
    const data: RiskReportData = {
      companyName: "MultiCat",
      risks: [
        {
          title: "R1",
          category: "Tech",
          probability: "High",
          impact: "High",
          riskScore: 8,
          mitigationStatus: "Mitigated",
        },
        {
          title: "R2",
          category: "Market",
          probability: "Low",
          impact: "Low",
          riskScore: 2,
          mitigationStatus: "Open",
        },
        {
          title: "R3",
          category: "Tech",
          probability: "Medium",
          impact: "Medium",
          riskScore: 5,
          mitigationStatus: "Resolved",
        },
      ],
      heatmapSummary: { critical: 0, high: 1, medium: 1, low: 1 },
      mitigationCoverage: 0.66,
    };
    const config = buildRiskReport(data);
    const cat = findSection(config.sections, "Category Analysis");
    // Should have summary table with 2 categories (Tech, Market)
    const table = cat!.content.find((c) => c.type === "table") as {
      type: "table";
      rows: string[][];
    };
    expect(table.rows.length).toBe(2);
  });

  it("Category Analysis includes optional risk fields in detailed breakdown", () => {
    const data: RiskReportData = {
      companyName: "Detail",
      risks: [
        {
          title: "R1",
          category: "Ops",
          probability: "High",
          impact: "High",
          riskScore: 9,
          financialExposure: 500_000,
          mitigationStrategy: "Hedging",
          mitigationStatus: "In Progress",
          timeHorizon: "6 months",
        },
      ],
      heatmapSummary: { critical: 1, high: 0, medium: 0, low: 0 },
      mitigationCoverage: 0.5,
    };
    const config = buildRiskReport(data);
    const cat = findSection(config.sections, "Category Analysis");
    // Detailed breakdown should include keyValue with financial exposure and time horizon
    const kvBlocks = cat!.content.filter(
      (c) => c.type === "keyValue",
    ) as Array<{
      type: "keyValue";
      items: Array<{ key: string; value: string }>;
    }>;
    expect(kvBlocks.length).toBeGreaterThanOrEqual(1);
    const lastKv = kvBlocks[kvBlocks.length - 1];
    expect(
      lastKv.items.find((i) => i.key === "Financial Exposure"),
    ).toBeDefined();
    expect(
      lastKv.items.find((i) => i.key === "Mitigation Strategy"),
    ).toBeDefined();
    expect(lastKv.items.find((i) => i.key === "Time Horizon")).toBeDefined();
  });

  it("always includes Mitigation Coverage section", () => {
    const config = buildRiskReport(minimalData());
    const cov = findSection(config.sections, "Mitigation Coverage");
    expect(cov).toBeDefined();
  });

  it("Mitigation Coverage shows warning when below 50%", () => {
    const data = { ...minimalData(), mitigationCoverage: 0.3 };
    const config = buildRiskReport(data);
    const cov = findSection(config.sections, "Mitigation Coverage");
    const alert = cov!.content.find((c) => c.type === "alert");
    expect(alert).toBeDefined();
  });

  it("Mitigation Coverage does not show warning when at 50% or above", () => {
    const data = { ...minimalData(), mitigationCoverage: 0.5 };
    const config = buildRiskReport(data);
    const cov = findSection(config.sections, "Mitigation Coverage");
    const alert = cov!.content.find((c) => c.type === "alert");
    expect(alert).toBeUndefined();
  });

  it("Mitigation Coverage handles various statuses", () => {
    const data: RiskReportData = {
      companyName: "StatusCo",
      risks: [
        {
          title: "R1",
          category: "A",
          probability: "H",
          impact: "H",
          riskScore: 9,
          mitigationStatus: "Mitigated",
        },
        {
          title: "R2",
          category: "A",
          probability: "M",
          impact: "M",
          riskScore: 5,
          mitigationStatus: "In Progress",
        },
        {
          title: "R3",
          category: "A",
          probability: "L",
          impact: "L",
          riskScore: 2,
          mitigationStatus: "Pending",
        },
        {
          title: "R4",
          category: "A",
          probability: "L",
          impact: "L",
          riskScore: 1,
          mitigationStatus: "Open",
        },
        {
          title: "R5",
          category: "A",
          probability: "L",
          impact: "L",
          riskScore: 1,
          mitigationStatus: "Resolved",
        },
        {
          title: "R6",
          category: "A",
          probability: "L",
          impact: "L",
          riskScore: 1,
          mitigationStatus: "Other Status",
        },
      ],
      heatmapSummary: { critical: 0, high: 1, medium: 1, low: 4 },
      mitigationCoverage: 0.7,
    };
    const config = buildRiskReport(data);
    const cov = findSection(config.sections, "Mitigation Coverage");
    expect(cov).toBeDefined();
    const table = cov!.content.find((c) => c.type === "table") as {
      type: "table";
      rows: string[][];
    };
    // Should have 4 rows: Mitigated/Resolved, In Progress, Pending/Open, Other
    expect(table.rows.length).toBe(4);
  });

  it("omits Scenario Analysis when no scenarios", () => {
    const config = buildRiskReport(minimalData());
    const scen = findSection(config.sections, "Scenario Analysis");
    expect(scen).toBeUndefined();
  });

  it("includes Scenario Analysis when scenarios provided", () => {
    const config = buildRiskReport(fullData());
    const scen = findSection(config.sections, "Scenario Analysis");
    expect(scen).toBeDefined();
  });

  it("always includes Financial Exposure Summary section", () => {
    const config = buildRiskReport(minimalData());
    const fin = findSection(config.sections, "Financial Exposure");
    expect(fin).toBeDefined();
  });

  it("Financial Exposure shows no-data message when no exposures quantified", () => {
    const config = buildRiskReport(minimalData());
    const fin = findSection(config.sections, "Financial Exposure");
    const textContent = fin!.content.filter((c) => c.type === "text");
    const noDataText = textContent.find((c) =>
      (c as { value: string }).value.includes("No risks have quantified"),
    );
    expect(noDataText).toBeDefined();
  });

  it("Financial Exposure shows sorted table when risks have exposure", () => {
    const config = buildRiskReport(fullData());
    const fin = findSection(config.sections, "Financial Exposure");
    const table = fin!.content.find((c) => c.type === "table");
    expect(table).toBeDefined();
  });

  it("always includes Regulatory Risk Detail section", () => {
    const config = buildRiskReport(minimalData());
    const reg = findSection(config.sections, "Regulatory Risk Detail");
    expect(reg).toBeDefined();
  });

  it("Regulatory Risk Detail shows table when regulatoryRisks provided", () => {
    const config = buildRiskReport(fullData());
    const reg = findSection(config.sections, "Regulatory Risk Detail");
    const table = reg!.content.find((c) => c.type === "table");
    expect(table).toBeDefined();
  });

  it("Regulatory Risk Detail shows no-risks message when no regulatory risks", () => {
    const config = buildRiskReport(minimalData());
    const reg = findSection(config.sections, "Regulatory Risk Detail");
    const textContent = reg!.content.filter((c) => c.type === "text");
    const noRisks = textContent.find((c) =>
      (c as { value: string }).value.includes("No specific regulatory"),
    );
    expect(noRisks).toBeDefined();
  });

  it("Regulatory Risk Detail includes complyVerified alert (true)", () => {
    const data = { ...minimalData(), complyVerified: true };
    const config = buildRiskReport(data);
    const reg = findSection(config.sections, "Regulatory Risk Detail");
    const alert = reg!.content.find((c) => c.type === "alert") as {
      type: "alert";
      severity: string;
    };
    expect(alert).toBeDefined();
    expect(alert.severity).toBe("info");
  });

  it("Regulatory Risk Detail includes complyVerified alert (false)", () => {
    const data = { ...minimalData(), complyVerified: false };
    const config = buildRiskReport(data);
    const reg = findSection(config.sections, "Regulatory Risk Detail");
    const alert = reg!.content.find((c) => c.type === "alert") as {
      type: "alert";
      severity: string;
    };
    expect(alert.severity).toBe("warning");
  });

  it("always includes Disclaimer section", () => {
    const config = buildRiskReport(minimalData());
    const disc = findSection(config.sections, "Disclaimer");
    expect(disc).toBeDefined();
  });

  it("produces all sections with full data", () => {
    const config = buildRiskReport(fullData());

    expect(findSection(config.sections, "Executive Summary")).toBeDefined();
    expect(findSection(config.sections, "Risk Heat Map")).toBeDefined();
    expect(findSection(config.sections, "Risk Register")).toBeDefined();
    expect(findSection(config.sections, "Category Analysis")).toBeDefined();
    expect(findSection(config.sections, "Mitigation Coverage")).toBeDefined();
    expect(findSection(config.sections, "Scenario Analysis")).toBeDefined();
    expect(findSection(config.sections, "Financial Exposure")).toBeDefined();
    expect(
      findSection(config.sections, "Regulatory Risk Detail"),
    ).toBeDefined();
    expect(findSection(config.sections, "Disclaimer")).toBeDefined();
  });

  it("handles risks with empty category (falls back to Uncategorized)", () => {
    const data: RiskReportData = {
      companyName: "NoCat",
      risks: [
        {
          title: "R1",
          category: "",
          probability: "Medium",
          impact: "Medium",
          riskScore: 5,
          mitigationStatus: "Open",
        },
      ],
      heatmapSummary: { critical: 0, high: 0, medium: 1, low: 0 },
      mitigationCoverage: 0,
    };
    const config = buildRiskReport(data);
    const cat = findSection(config.sections, "Category Analysis");
    const headings = cat!.content.filter(
      (c) =>
        c.type === "heading" &&
        (c as { value: string }).value === "Uncategorized",
    );
    expect(headings.length).toBe(1);
  });

  it("high severity alert uses plural for multiple high risks", () => {
    const data = {
      ...minimalData(),
      heatmapSummary: { critical: 0, high: 3, medium: 0, low: 0 },
    };
    const config = buildRiskReport(data);
    const exec = findSection(config.sections, "Executive Summary");
    const alert = exec!.content.find((c) => c.type === "alert") as {
      type: "alert";
      message: string;
    };
    expect(alert.message).toContain("3 high-severity risks");
  });

  it("high severity alert uses singular for one high risk", () => {
    const data = {
      ...minimalData(),
      heatmapSummary: { critical: 0, high: 1, medium: 0, low: 0 },
    };
    const config = buildRiskReport(data);
    const exec = findSection(config.sections, "Executive Summary");
    const alert = exec!.content.find((c) => c.type === "alert") as {
      type: "alert";
      message: string;
    };
    expect(alert.message).toContain("1 high-severity risk ");
    expect(alert.message).not.toContain("risks");
  });
});
