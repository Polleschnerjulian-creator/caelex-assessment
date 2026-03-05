import { describe, it, expect } from "vitest";
import * as assure from "./index";

// ---------------------------------------------------------------------------
// Re-export verification
// ---------------------------------------------------------------------------

describe("assure/index re-exports", () => {
  // Formatting utilities
  it("exports formatEUR", () => {
    expect(typeof assure.formatEUR).toBe("function");
  });

  it("exports formatEURCompact", () => {
    expect(typeof assure.formatEURCompact).toBe("function");
  });

  it("exports formatPercent", () => {
    expect(typeof assure.formatPercent).toBe("function");
  });

  it("exports formatFraction", () => {
    expect(typeof assure.formatFraction).toBe("function");
  });

  it("exports formatDate", () => {
    expect(typeof assure.formatDate).toBe("function");
  });

  it("exports formatNumber", () => {
    expect(typeof assure.formatNumber).toBe("function");
  });

  it("exports trendIndicator", () => {
    expect(typeof assure.trendIndicator).toBe("function");
  });

  it("exports generateReportId", () => {
    expect(typeof assure.generateReportId).toBe("function");
  });

  // Report builders
  it("exports buildExecutiveSummaryReport", () => {
    expect(typeof assure.buildExecutiveSummaryReport).toBe("function");
  });

  it("exports buildInvestmentTeaserReport", () => {
    expect(typeof assure.buildInvestmentTeaserReport).toBe("function");
  });

  it("exports buildCompanyProfileReport", () => {
    expect(typeof assure.buildCompanyProfileReport).toBe("function");
  });

  it("exports buildRiskReport", () => {
    expect(typeof assure.buildRiskReport).toBe("function");
  });

  it("exports buildInvestorUpdateReport", () => {
    expect(typeof assure.buildInvestorUpdateReport).toBe("function");
  });

  // Smoke test: calling an exported function produces correct output
  it("formatEUR from index works correctly", () => {
    expect(assure.formatEUR(1000)).toMatch(/EUR/);
  });

  it("generateReportId from index works correctly", () => {
    expect(assure.generateReportId("TEST")).toMatch(/^TEST-/);
  });

  it("buildExecutiveSummaryReport from index produces ReportConfig", () => {
    const config = assure.buildExecutiveSummaryReport({
      companyName: "Test",
      oneLiner: "Test company",
      stage: "Seed",
      operatorType: [],
      subsector: [],
    });
    expect(config.metadata).toBeDefined();
    expect(config.sections).toBeDefined();
  });
});
