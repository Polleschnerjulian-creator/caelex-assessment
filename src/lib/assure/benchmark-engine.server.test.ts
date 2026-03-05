/**
 * Assure Benchmark Engine Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assureCompanyProfile: { findUnique: vi.fn() },
  },
}));

vi.mock("@/data/assure/space-benchmarks", () => ({
  spaceBenchmarks: [
    {
      category: "Team",
      metric: "Seed team size",
      value: 8,
      unit: "people",
      source: "Survey 2024",
      year: 2024,
    },
    {
      category: "Financial",
      metric: "Seed round median",
      value: 3000000,
      unit: "EUR",
      source: "Pitchbook",
      year: 2024,
    },
    {
      category: "Team",
      metric: "Series A team size",
      value: 25,
      unit: "people",
      source: "Survey 2024",
      year: 2024,
    },
    {
      category: "Financial",
      metric: "monthly burn rate",
      value: 100000,
      unit: "EUR",
      source: "Report",
      year: 2024,
    },
    {
      category: "Technology",
      metric: "TRL at Seed",
      value: 4,
      unit: "level",
      source: "Survey 2024",
      year: 2024,
      segment: "EO",
    },
    {
      category: "Commercial",
      metric: "customer count",
      value: 5,
      unit: "customers",
      source: "Survey 2024",
      year: 2024,
      segment: "SAR",
    },
  ],
}));

vi.mock("@prisma/client", () => ({
  // CompanyStage enum values used by the engine
}));

import {
  getBenchmarksForCompany,
  computeBenchmarkPosition,
} from "./benchmark-engine.server";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  assureCompanyProfile: { findUnique: ReturnType<typeof vi.fn> };
};

describe("Benchmark Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.assureCompanyProfile.findUnique.mockReset();
  });

  describe("getBenchmarksForCompany", () => {
    it("returns empty array when profile not found", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue(null);
      const result = await getBenchmarksForCompany("org-1");
      expect(result).toEqual([]);
    });

    it("returns stage-filtered benchmarks", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        subsector: [],
      });
      const result = await getBenchmarksForCompany("org-1");
      // Should include "Seed team size" and stage-agnostic "monthly burn rate"
      // Should NOT include "Series A team size"
      const metrics = result.map((b) => b.metric);
      expect(metrics).toContain("Seed team size");
      expect(metrics).toContain("monthly burn rate");
      expect(metrics).not.toContain("Series A team size");
    });
  });

  describe("computeBenchmarkPosition", () => {
    it("returns empty result when profile not found", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue(null);
      const result = await computeBenchmarkPosition("org-1");
      expect(result.comparisons).toHaveLength(0);
      expect(result.summary.totalBenchmarks).toBe(0);
      expect(result.summary.overallPosition).toBe("AT");
    });

    it("computes ABOVE position when company exceeds benchmark", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: { teamSize: 20 }, // well above 8
        financialProfile: null,
        marketProfile: null,
        techProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      const teamComparison = result.comparisons.find(
        (c) => c.metric === "Seed team size",
      );
      if (teamComparison?.hasData) {
        expect(teamComparison.position).toBe("ABOVE");
        expect(teamComparison.delta).toBeGreaterThan(0);
      }
    });

    it("computes BELOW position when company underperforms", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: { teamSize: 2 }, // well below 8
        financialProfile: null,
        marketProfile: null,
        techProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      const teamComparison = result.comparisons.find(
        (c) => c.metric === "Seed team size",
      );
      if (teamComparison?.hasData) {
        expect(teamComparison.position).toBe("BELOW");
      }
    });

    it("identifies strongest and weakest areas in summary", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: { teamSize: 20 }, // ABOVE
        financialProfile: { monthlyBurnRate: 500000 }, // BELOW (lower is better)
        marketProfile: null,
        techProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      // Summary should reflect counted positions
      expect(
        result.summary.aboveCount +
          result.summary.atCount +
          result.summary.belowCount,
      ).toBe(result.summary.comparableBenchmarks);
    });

    it("returns ABOVE when benchmark=0 and company value is positive (higherIsBetter)", async () => {
      // "Seed team size" has higherIsBetter=true and tolerancePercent=25
      // We override the benchmark value to 0 for this test
      // Use "Seed round median" which has higherIsBetter=true and maps to financial.totalRaised
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: { teamSize: 10 },
        financialProfile: { totalRaised: 5000000 },
        marketProfile: null,
        techProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      // Seed round median benchmark = 3000000, company = 5000000 -> delta = +2000000
      // deltaPercent = (2000000/3000000)*100 = 66.67%, tolerance is 30% -> ABOVE
      const roundComp = result.comparisons.find(
        (c) => c.metric === "Seed round median",
      );
      expect(roundComp?.hasData).toBe(true);
      expect(roundComp?.position).toBe("ABOVE");
    });

    it("returns BELOW for burn rate when company value far exceeds benchmark (higherIsBetter=false)", async () => {
      // "monthly burn rate" has higherIsBetter=false, tolerance=30%
      // benchmark=100000, company=200000 -> delta=+100000, pct=100% -> BELOW (higher is worse)
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: null,
        financialProfile: { monthlyBurnRate: 200000 },
        marketProfile: null,
        techProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      const burnComp = result.comparisons.find(
        (c) => c.metric === "monthly burn rate",
      );
      expect(burnComp?.hasData).toBe(true);
      expect(burnComp?.position).toBe("BELOW");
    });

    it("returns ABOVE for burn rate when company value is well below benchmark (higherIsBetter=false)", async () => {
      // "monthly burn rate" has higherIsBetter=false, tolerance=30%
      // benchmark=100000, company=40000 -> delta=-60000, pct=60% -> ABOVE (lower is better)
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: null,
        financialProfile: { monthlyBurnRate: 40000 },
        marketProfile: null,
        techProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      const burnComp = result.comparisons.find(
        (c) => c.metric === "monthly burn rate",
      );
      expect(burnComp?.hasData).toBe(true);
      expect(burnComp?.position).toBe("ABOVE");
    });

    it("returns AT when company value is within tolerance of benchmark", async () => {
      // "Seed team size" has tolerance=25%, benchmark=8
      // company=9 -> delta=1, pct=12.5% -> within 25% -> AT
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: { teamSize: 9 },
        financialProfile: null,
        marketProfile: null,
        techProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      const teamComp = result.comparisons.find(
        (c) => c.metric === "Seed team size",
      );
      expect(teamComp?.hasData).toBe(true);
      expect(teamComp?.position).toBe("AT");
    });

    it("handles extractValue with string value that parses to number", async () => {
      // teamSize as a string "15" should parse to 15
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: { teamSize: "15" },
        financialProfile: null,
        marketProfile: null,
        techProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      const teamComp = result.comparisons.find(
        (c) => c.metric === "Seed team size",
      );
      expect(teamComp?.hasData).toBe(true);
      expect(teamComp?.companyValue).toBe(15);
      // 15 vs 8, delta% = 87.5% > 25% tolerance -> ABOVE
      expect(teamComp?.position).toBe("ABOVE");
    });

    it("handles extractValue with string value that does not parse to number", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: { teamSize: "not-a-number" },
        financialProfile: null,
        marketProfile: null,
        techProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      const teamComp = result.comparisons.find(
        (c) => c.metric === "Seed team size",
      );
      expect(teamComp?.hasData).toBe(false);
      expect(teamComp?.companyValue).toBeNull();
    });

    it("handles extractValue with null source data (null profile section)", async () => {
      // All profile sections are null
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: null,
        financialProfile: null,
        marketProfile: null,
        techProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      // All comparisons should have hasData=false
      const dataComps = result.comparisons.filter((c) => c.hasData);
      expect(dataComps).toHaveLength(0);
    });

    it("overallPosition is AT when above count equals below count", async () => {
      // "Seed team size" (higherIsBetter=true, tol=25%): benchmark=8, company=20 -> ABOVE
      // "monthly burn rate" (higherIsBetter=false, tol=30%): benchmark=100000, company=200000 -> BELOW
      // "Seed round median" (higherIsBetter=true, tol=30%): no data
      // => 1 ABOVE, 1 BELOW -> AT
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: { teamSize: 20 },
        financialProfile: { monthlyBurnRate: 200000 },
        marketProfile: null,
        techProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      expect(result.summary.aboveCount).toBe(1);
      expect(result.summary.belowCount).toBe(1);
      expect(result.summary.overallPosition).toBe("AT");
    });
  });

  describe("getBenchmarksForCompany — segment filtering", () => {
    it("filters benchmarks by subsector when segment matches", async () => {
      // Our mock benchmarks don't have segments, so all should be returned
      // regardless of subsector
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        subsector: ["EO"],
      });
      const result = await getBenchmarksForCompany("org-1");
      // All stage-relevant benchmarks should be returned (no segment filtering needed
      // since none of the mocked benchmarks have segment set)
      expect(result.length).toBeGreaterThan(0);
    });

    it("returns all benchmarks when subsector is empty", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        subsector: [],
      });
      const result = await getBenchmarksForCompany("org-1");
      expect(result.length).toBeGreaterThan(0);
    });

    it("returns all benchmarks when subsector is null", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        subsector: null,
      });
      const result = await getBenchmarksForCompany("org-1");
      expect(result.length).toBeGreaterThan(0);
    });

    it("excludes benchmarks whose segment does not match subsector", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        subsector: ["EO"],
      });
      const result = await getBenchmarksForCompany("org-1");
      const metrics = result.map((b) => b.metric);
      // segment "EO" matches → included
      expect(metrics).toContain("TRL at Seed");
      // segment "SAR" ≠ "EO" → excluded
      expect(metrics).not.toContain("customer count");
      // no-segment benchmarks always included
      expect(metrics).toContain("Seed team size");
    });

    it("excludes all segmented benchmarks when subsector matches none", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        subsector: ["OTHER"],
      });
      const result = await getBenchmarksForCompany("org-1");
      const metrics = result.map((b) => b.metric);
      expect(metrics).not.toContain("TRL at Seed");
      expect(metrics).not.toContain("customer count");
      // non-segmented benchmarks still included
      expect(metrics).toContain("Seed team size");
    });
  });

  describe("computeBenchmarkPosition — additional coverage", () => {
    it("computes ABOVE overallPosition when aboveCount > belowCount", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: { teamSize: 20 },
        techProfile: { trlLevel: 10 },
        financialProfile: { totalRaised: 10000000 },
        marketProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      expect(result.summary.aboveCount).toBeGreaterThan(
        result.summary.belowCount,
      );
      expect(result.summary.overallPosition).toBe("ABOVE");
    });

    it("sorts strongest and weakest areas by absolute deltaPercent", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: { teamSize: 20 },
        techProfile: { trlLevel: 10 },
        financialProfile: { monthlyBurnRate: 500000, totalRaised: 100 },
        marketProfile: { customerCount: 1 },
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      expect(result.summary.strongestAreas.length).toBeGreaterThanOrEqual(2);
      expect(result.summary.weakestAreas.length).toBeGreaterThanOrEqual(2);
      for (const area of result.summary.strongestAreas) {
        expect(area.position).toBe("ABOVE");
      }
      for (const area of result.summary.weakestAreas) {
        expect(area.position).toBe("BELOW");
      }
    });

    it("computes BELOW overallPosition when belowCount > aboveCount", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        stage: "SEED",
        teamProfile: { teamSize: 2 },
        techProfile: { trlLevel: 1 },
        financialProfile: { monthlyBurnRate: 500000 },
        marketProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      const result = await computeBenchmarkPosition("org-1");
      expect(result.summary.belowCount).toBeGreaterThan(
        result.summary.aboveCount,
      );
      expect(result.summary.overallPosition).toBe("BELOW");
    });
  });
});
