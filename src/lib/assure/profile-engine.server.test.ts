/**
 * Assure Profile Completion Engine Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    assureCompanyProfile: { findUnique: vi.fn(), update: vi.fn() },
    assureTechProfile: { update: vi.fn() },
    assureMarketProfile: { update: vi.fn() },
    assureTeamProfile: { update: vi.fn() },
    assureFinancialProfile: { update: vi.fn() },
    assureRegulatoryProfile: { update: vi.fn() },
    assureCompetitiveProfile: { update: vi.fn() },
    assureTractionProfile: { update: vi.fn() },
  },
}));

import {
  computeProfileCompleteness,
  getNextSteps,
} from "./profile-engine.server";
import { prisma } from "@/lib/prisma";

const mockPrisma = prisma as unknown as {
  assureCompanyProfile: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  [key: string]: { update?: ReturnType<typeof vi.fn> };
};

describe("Profile Completion Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.assureCompanyProfile.findUnique.mockReset();
    mockPrisma.assureCompanyProfile.update.mockReset();
  });

  describe("computeProfileCompleteness", () => {
    it("returns 0% when profile not found", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue(null);
      const result = await computeProfileCompleteness("org-1");
      expect(result.overallScore).toBe(0);
      expect(result.sections).toHaveLength(8);
      // All sections should be 0%
      for (const section of result.sections) {
        expect(section.score).toBe(0);
      }
    });

    it("computes correct score for partially filled profile", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        id: "profile-1",
        companyName: "SpaceCo",
        operatorType: "SCO",
        stage: "SEED",
        oneLiner: "Building satellites",
        // Rest are null
        legalName: null,
        foundedDate: null,
        headquarters: null,
        legalForm: null,
        registrationNumber: null,
        website: null,
        linkedIn: null,
        subsector: null,
        employeeCount: null,
        employeeGrowth6M: null,
        missionStatement: null,
        problemStatement: null,
        solutionStatement: null,
        techProfile: null,
        marketProfile: null,
        teamProfile: null,
        financialProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      mockPrisma.assureCompanyProfile.update.mockResolvedValue({});

      const result = await computeProfileCompleteness("org-1");
      // 4 critical fields filled (weight 3 each = 12) out of total weight
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThan(100);

      // Company section should have some completion
      const company = result.sections.find((s) => s.section === "company")!;
      expect(company.completedFields).toBe(4);
      expect(company.score).toBeGreaterThan(0);
    });

    it("returns 100% for fully filled profile", async () => {
      // Build a fully filled profile
      const fullCompany: Record<string, unknown> = {
        id: "profile-1",
        companyName: "SpaceCo",
        operatorType: "SCO",
        stage: "SEED",
        oneLiner: "Building",
        legalName: "SpaceCo GmbH",
        foundedDate: "2024-01-01",
        headquarters: "Berlin",
        legalForm: "GmbH",
        registrationNumber: "HRB12345",
        website: "https://spaceco.eu",
        linkedIn: "https://linkedin.com/spaceco",
        subsector: ["EO"],
        employeeCount: 15,
        employeeGrowth6M: 20,
        missionStatement: "Mission",
        problemStatement: "Problem",
        solutionStatement: "Solution",
      };

      const fullTech = {
        id: "tech-1",
        trlLevel: 7,
        productStatus: "MVP",
        trlJustification: "J",
        trlEvidence: "E",
        productName: "SatX",
        productDescription: "Desc",
        launchDate: "2025",
        keyFeatures: ["f1"],
        technicalSpecs: "specs",
        patents: ["p1"],
        tradeSecrets: "ts",
        ipStrategy: "ip",
        milestones: ["m1"],
      };

      const fullSection = (fields: string[]) => {
        const obj: Record<string, unknown> = { id: "s-1" };
        for (const f of fields) obj[f] = "filled";
        return obj;
      };

      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        ...fullCompany,
        techProfile: fullTech,
        marketProfile: fullSection([
          "tamValue",
          "samValue",
          "somValue",
          "tamSource",
          "marketGrowthRate",
          "whyNow",
          "marketDrivers",
          "targetCustomers",
          "customerCount",
          "pipelineValue",
          "contractedRevenue",
          "gtmStrategy",
          "salesCycle",
          "distributionChannels",
        ]),
        teamProfile: fullSection([
          "founders",
          "teamSize",
          "cSuite",
          "keyHires",
          "boardMembers",
          "advisors",
          "engineeringRatio",
          "averageExperience",
          "keyPersonRisk",
          "hiringPlan",
          "employeeTurnover",
          "glassdoorRating",
        ]),
        financialProfile: fullSection([
          "targetRaise",
          "revenueModel",
          "fundingRounds",
          "annualRevenue",
          "revenueGrowthYoY",
          "monthlyBurnRate",
          "runway",
          "grossMargin",
          "cashPosition",
          "revenueStreams",
          "unitEconomics",
          "totalRaised",
          "currentValuation",
          "isRaising",
          "targetValuation",
          "roundType",
          "useOfFunds",
          "targetCloseDate",
          "revenueProjections",
          "profitabilityTimeline",
          "breakEvenDate",
        ]),
        regulatoryProfile: fullSection([
          "jurisdictions",
          "complyLinked",
          "rrsScore",
          "rrsComponents",
          "authorizationStatus",
          "authorizationDetails",
          "nis2Status",
          "spaceDebrisCompliance",
          "insuranceStatus",
          "regulatoryMoatDescription",
          "barrierToEntry",
          "timeToReplicate",
          "regulatoryRisks",
        ]),
        competitiveProfile: fullSection([
          "competitiveAdvantage",
          "competitors",
          "moats",
          "differentiators",
          "marketPosition",
          "winRate",
          "keyWins",
          "keyLosses",
        ]),
        tractionProfile: fullSection([
          "keyMetrics",
          "milestonesAchieved",
          "partnerships",
          "lois",
          "signedContracts",
          "pilotPrograms",
          "awards",
          "mediaFeatures",
          "conferences",
          "upcomingMilestones",
        ]),
      });

      // Mock all sub-profile updates
      for (const key of Object.keys(mockPrisma)) {
        if (key.startsWith("assure") && mockPrisma[key]?.update) {
          mockPrisma[key].update!.mockResolvedValue({});
        }
      }

      const result = await computeProfileCompleteness("org-1");
      expect(result.overallScore).toBe(100);
    });

    it("persists completion scores back to database", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        id: "profile-1",
        companyName: "SpaceCo",
        techProfile: null,
        marketProfile: null,
        teamProfile: null,
        financialProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      mockPrisma.assureCompanyProfile.update.mockResolvedValue({});

      await computeProfileCompleteness("org-1");
      expect(mockPrisma.assureCompanyProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { completionScore: expect.any(Number) },
        }),
      );
    });
  });

  describe("getNextSteps", () => {
    it("returns prioritized next steps (critical first)", async () => {
      mockPrisma.assureCompanyProfile.findUnique.mockResolvedValue({
        id: "profile-1",
        companyName: "SpaceCo",
        // Most fields missing → many next steps
        techProfile: null,
        marketProfile: null,
        teamProfile: null,
        financialProfile: null,
        regulatoryProfile: null,
        competitiveProfile: null,
        tractionProfile: null,
      });
      mockPrisma.assureCompanyProfile.update.mockResolvedValue({});

      const steps = await getNextSteps("org-1");
      expect(steps.length).toBeGreaterThan(0);
      // First steps should be critical priority
      expect(steps[0]!.priority).toBe("critical");
      // Should have time estimates
      expect(steps[0]!.estimatedTimeMinutes).toBeGreaterThan(0);
    });
  });
});
