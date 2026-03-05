import { describe, it, expect } from "vitest";
import {
  companyProfileSchema,
  techProfileSchema,
  marketProfileSchema,
  teamProfileSchema,
  financialProfileSchema,
  regulatoryProfileSchema,
  competitiveProfileSchema,
  tractionProfileSchema,
  riskSchema,
  milestoneSchema,
  dataRoomLinkSchema,
  materialGenerateSchema,
} from "./validations";

describe("Assure Validation Schemas", () => {
  // ─── companyProfileSchema ───

  describe("companyProfileSchema", () => {
    it("accepts a valid partial company profile", () => {
      const result = companyProfileSchema.safeParse({
        companyName: "SpaceTech GmbH",
        stage: "SEED",
        operatorType: ["SCO"],
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object (all fields partial)", () => {
      const result = companyProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects invalid stage enum", () => {
      const result = companyProfileSchema.safeParse({
        stage: "INVALID_STAGE",
      });
      expect(result.success).toBe(false);
    });

    it("rejects companyName exceeding max length (300)", () => {
      const result = companyProfileSchema.safeParse({
        companyName: "a".repeat(301),
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid stage values", () => {
      const stages = [
        "PRE_SEED",
        "SEED",
        "SERIES_A",
        "SERIES_B",
        "SERIES_C_PLUS",
        "PRE_IPO",
        "PUBLIC",
      ];
      for (const stage of stages) {
        const result = companyProfileSchema.safeParse({ stage });
        expect(result.success).toBe(true);
      }
    });

    it("accepts valid website URL", () => {
      const result = companyProfileSchema.safeParse({
        website: "https://example.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid website URL", () => {
      const result = companyProfileSchema.safeParse({
        website: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("accepts null for optional fields", () => {
      const result = companyProfileSchema.safeParse({
        legalName: null,
        headquarters: null,
        oneLiner: null,
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative employeeCount", () => {
      const result = companyProfileSchema.safeParse({
        employeeCount: -1,
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── techProfileSchema ───

  describe("techProfileSchema", () => {
    it("accepts a valid tech profile", () => {
      const result = techProfileSchema.safeParse({
        trlLevel: 5,
        productStatus: "PROTOTYPE",
      });
      expect(result.success).toBe(true);
    });

    it("rejects TRL below 1", () => {
      const result = techProfileSchema.safeParse({
        trlLevel: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects TRL above 9", () => {
      const result = techProfileSchema.safeParse({
        trlLevel: 10,
      });
      expect(result.success).toBe(false);
    });

    it("accepts TRL boundary values 1 and 9", () => {
      expect(techProfileSchema.safeParse({ trlLevel: 1 }).success).toBe(true);
      expect(techProfileSchema.safeParse({ trlLevel: 9 }).success).toBe(true);
    });

    it("accepts valid productStatus enum values", () => {
      const statuses = [
        "CONCEPT",
        "PROTOTYPE",
        "TESTING",
        "BETA",
        "PRODUCTION",
        "OPERATIONAL",
      ];
      for (const s of statuses) {
        const result = techProfileSchema.safeParse({ productStatus: s });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid productStatus", () => {
      const result = techProfileSchema.safeParse({
        productStatus: "INVALID",
      });
      expect(result.success).toBe(false);
    });

    it("accepts patents array with valid entries", () => {
      const result = techProfileSchema.safeParse({
        patents: [
          { title: "Space patent", status: "granted", jurisdiction: "US" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects patent with invalid status enum", () => {
      const result = techProfileSchema.safeParse({
        patents: [{ title: "Bad patent", status: "INVALID_STATUS" }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts empty object (all partial)", () => {
      const result = techProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  // ─── marketProfileSchema ───

  describe("marketProfileSchema", () => {
    it("accepts valid market profile with floats", () => {
      const result = marketProfileSchema.safeParse({
        tamValue: 1_000_000_000.5,
        samValue: 500_000_000.25,
        somValue: 100_000_000.1,
        marketGrowthRate: 15.5,
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional arrays", () => {
      const result = marketProfileSchema.safeParse({
        marketDrivers: [
          { driver: "Regulation", description: "New EU space act" },
        ],
        targetCustomers: [{ segment: "Satellite operators", size: 500 }],
        distributionChannels: ["Direct sales"],
      });
      expect(result.success).toBe(true);
    });

    it("accepts null for optional fields", () => {
      const result = marketProfileSchema.safeParse({
        marketDrivers: null,
        targetCustomers: null,
        distributionChannels: null,
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative tamValue", () => {
      const result = marketProfileSchema.safeParse({
        tamValue: -100,
      });
      expect(result.success).toBe(false);
    });

    it("accepts empty object", () => {
      const result = marketProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  // ─── teamProfileSchema ───

  describe("teamProfileSchema", () => {
    it("accepts valid team profile", () => {
      const result = teamProfileSchema.safeParse({
        teamSize: 15,
        engineeringRatio: 60,
        glassdoorRating: 4.2,
      });
      expect(result.success).toBe(true);
    });

    it("glassdoorRating must be 0-5", () => {
      expect(teamProfileSchema.safeParse({ glassdoorRating: 0 }).success).toBe(
        true,
      );
      expect(teamProfileSchema.safeParse({ glassdoorRating: 5 }).success).toBe(
        true,
      );
      expect(
        teamProfileSchema.safeParse({ glassdoorRating: 5.1 }).success,
      ).toBe(false);
      expect(
        teamProfileSchema.safeParse({ glassdoorRating: -0.1 }).success,
      ).toBe(false);
    });

    it("engineeringRatio must be 0-100", () => {
      expect(teamProfileSchema.safeParse({ engineeringRatio: 0 }).success).toBe(
        true,
      );
      expect(
        teamProfileSchema.safeParse({ engineeringRatio: 100 }).success,
      ).toBe(true);
      expect(
        teamProfileSchema.safeParse({ engineeringRatio: 101 }).success,
      ).toBe(false);
      expect(
        teamProfileSchema.safeParse({ engineeringRatio: -1 }).success,
      ).toBe(false);
    });

    it("accepts valid key hires", () => {
      const result = teamProfileSchema.safeParse({
        keyHires: [{ role: "CTO", name: "Jane", status: "filled" }],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid keyHire status enum", () => {
      const result = teamProfileSchema.safeParse({
        keyHires: [{ role: "CTO", status: "INVALID" }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts board members with valid type enum", () => {
      const result = teamProfileSchema.safeParse({
        boardMembers: [
          { name: "John", type: "independent" },
          { name: "Jane", type: "investor" },
          { name: "Bob", type: "founder" },
          { name: "Alice", type: "observer" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts hiring plan with priority enum", () => {
      const result = teamProfileSchema.safeParse({
        hiringPlan: [{ role: "Engineer", priority: "critical" }],
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── financialProfileSchema ───

  describe("financialProfileSchema", () => {
    it("accepts valid financial profile", () => {
      const result = financialProfileSchema.safeParse({
        annualRevenue: 1_000_000,
        runway: 18,
        grossMargin: 60.5,
      });
      expect(result.success).toBe(true);
    });

    it("runway must be 0-120", () => {
      expect(financialProfileSchema.safeParse({ runway: 0 }).success).toBe(
        true,
      );
      expect(financialProfileSchema.safeParse({ runway: 120 }).success).toBe(
        true,
      );
      expect(financialProfileSchema.safeParse({ runway: 121 }).success).toBe(
        false,
      );
      expect(financialProfileSchema.safeParse({ runway: -1 }).success).toBe(
        false,
      );
    });

    it("grossMargin must be -100 to 100", () => {
      expect(
        financialProfileSchema.safeParse({ grossMargin: -100 }).success,
      ).toBe(true);
      expect(
        financialProfileSchema.safeParse({ grossMargin: 100 }).success,
      ).toBe(true);
      expect(
        financialProfileSchema.safeParse({ grossMargin: 101 }).success,
      ).toBe(false);
      expect(
        financialProfileSchema.safeParse({ grossMargin: -101 }).success,
      ).toBe(false);
    });

    it("accepts funding rounds array", () => {
      const result = financialProfileSchema.safeParse({
        fundingRounds: [
          {
            name: "Series A",
            amount: 5_000_000,
            leadInvestor: "VC Fund",
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts revenue projections with year range", () => {
      const result = financialProfileSchema.safeParse({
        revenueProjections: [
          { year: 2025, revenue: 1_000_000 },
          { year: 2026, revenue: 2_000_000 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects year out of range in projections", () => {
      const result = financialProfileSchema.safeParse({
        revenueProjections: [{ year: 2019, revenue: 100 }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts use of funds with percentage constraints", () => {
      const result = financialProfileSchema.safeParse({
        useOfFunds: [
          { category: "R&D", percentage: 60, description: "Product dev" },
        ],
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── regulatoryProfileSchema ───

  describe("regulatoryProfileSchema", () => {
    it("accepts valid regulatory profile", () => {
      const result = regulatoryProfileSchema.safeParse({
        complyLinked: true,
        rrsScore: 85,
      });
      expect(result.success).toBe(true);
    });

    it("complyLinked must be boolean", () => {
      const result = regulatoryProfileSchema.safeParse({
        complyLinked: "yes",
      });
      expect(result.success).toBe(false);
    });

    it("rrsScore must be 0-100", () => {
      expect(regulatoryProfileSchema.safeParse({ rrsScore: 0 }).success).toBe(
        true,
      );
      expect(regulatoryProfileSchema.safeParse({ rrsScore: 100 }).success).toBe(
        true,
      );
      expect(regulatoryProfileSchema.safeParse({ rrsScore: 101 }).success).toBe(
        false,
      );
      expect(regulatoryProfileSchema.safeParse({ rrsScore: -1 }).success).toBe(
        false,
      );
    });

    it("accepts regulatory risks array with impact enum", () => {
      const result = regulatoryProfileSchema.safeParse({
        regulatoryRisks: [{ risk: "Spectrum interference", impact: "high" }],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid impact enum in regulatory risks", () => {
      const result = regulatoryProfileSchema.safeParse({
        regulatoryRisks: [{ risk: "Bad risk", impact: "INVALID" }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts jurisdictions array", () => {
      const result = regulatoryProfileSchema.safeParse({
        jurisdictions: ["DE", "FR", "UK"],
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── competitiveProfileSchema ───

  describe("competitiveProfileSchema", () => {
    it("accepts valid competitive profile", () => {
      const result = competitiveProfileSchema.safeParse({
        competitors: [{ name: "SpaceX", description: "Launch provider" }],
        winRate: 75,
      });
      expect(result.success).toBe(true);
    });

    it("accepts moats with valid durability enum", () => {
      const result = competitiveProfileSchema.safeParse({
        moats: [
          { type: "IP", description: "Patent portfolio", durability: "strong" },
          { type: "Network", description: "Ecosystem", durability: "moderate" },
          { type: "Brand", description: "Reputation", durability: "weak" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid moat durability enum", () => {
      const result = competitiveProfileSchema.safeParse({
        moats: [{ type: "IP", description: "Patents", durability: "INVALID" }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts empty object (all partial)", () => {
      const result = competitiveProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("winRate must be 0-100", () => {
      expect(competitiveProfileSchema.safeParse({ winRate: 101 }).success).toBe(
        false,
      );
    });
  });

  // ─── tractionProfileSchema ───

  describe("tractionProfileSchema", () => {
    it("accepts valid traction profile", () => {
      const result = tractionProfileSchema.safeParse({
        lois: 5,
        signedContracts: 3,
        pilotPrograms: 2,
      });
      expect(result.success).toBe(true);
    });

    it("accepts key metrics with trend enum", () => {
      const result = tractionProfileSchema.safeParse({
        keyMetrics: [
          { name: "MRR", value: 50000, trend: "up" },
          { name: "Churn", value: "2.5%", trend: "down" },
          { name: "DAU", value: 1000, trend: "flat" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid trend enum", () => {
      const result = tractionProfileSchema.safeParse({
        keyMetrics: [{ name: "MRR", value: 50000, trend: "INVALID" }],
      });
      expect(result.success).toBe(false);
    });

    it("accepts conferences with role enum", () => {
      const result = tractionProfileSchema.safeParse({
        conferences: [
          { name: "IAC 2024", role: "speaker" },
          { name: "NewSpace", role: "panelist" },
          { name: "Satellite Show", role: "exhibitor" },
          { name: "Other", role: "attendee" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object", () => {
      const result = tractionProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  // ─── riskSchema ───

  describe("riskSchema", () => {
    it("accepts a valid risk with all enums", () => {
      const result = riskSchema.safeParse({
        category: "TECHNOLOGY",
        title: "Component failure",
        description: "Risk of critical component failure",
        probability: "HIGH",
        impact: "MAJOR",
        mitigationStatus: "PLANNED",
        sortOrder: 1,
      });
      expect(result.success).toBe(true);
    });

    it("validates all category enum values", () => {
      const categories = [
        "TECHNOLOGY",
        "MARKET",
        "REGULATORY",
        "FINANCIAL",
        "OPERATIONAL",
        "COMPETITIVE",
        "GEOPOLITICAL",
      ];
      for (const category of categories) {
        const result = riskSchema.safeParse({ category });
        expect(result.success).toBe(true);
      }
    });

    it("validates all probability enum values", () => {
      const probs = ["VERY_LOW", "LOW", "MODERATE", "HIGH", "VERY_HIGH"];
      for (const probability of probs) {
        const result = riskSchema.safeParse({ probability });
        expect(result.success).toBe(true);
      }
    });

    it("validates all impact enum values", () => {
      const impacts = [
        "NEGLIGIBLE",
        "MINOR",
        "MODERATE_IMPACT",
        "MAJOR",
        "CATASTROPHIC",
      ];
      for (const impact of impacts) {
        const result = riskSchema.safeParse({ impact });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid category", () => {
      const result = riskSchema.safeParse({ category: "INVALID" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid probability", () => {
      const result = riskSchema.safeParse({ probability: "INVALID" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid impact", () => {
      const result = riskSchema.safeParse({ impact: "INVALID" });
      expect(result.success).toBe(false);
    });

    it("sortOrder must be 0-999", () => {
      expect(riskSchema.safeParse({ sortOrder: 0 }).success).toBe(true);
      expect(riskSchema.safeParse({ sortOrder: 999 }).success).toBe(true);
      expect(riskSchema.safeParse({ sortOrder: 1000 }).success).toBe(false);
      expect(riskSchema.safeParse({ sortOrder: -1 }).success).toBe(false);
    });

    it("validates all mitigation status values", () => {
      const statuses = [
        "IDENTIFIED",
        "PLANNED",
        "IN_PROGRESS_M",
        "MITIGATED",
        "ACCEPTED",
        "TRANSFERRED",
      ];
      for (const mitigationStatus of statuses) {
        const result = riskSchema.safeParse({ mitigationStatus });
        expect(result.success).toBe(true);
      }
    });

    it("residualRisk must be 0-100", () => {
      expect(riskSchema.safeParse({ residualRisk: 0 }).success).toBe(true);
      expect(riskSchema.safeParse({ residualRisk: 100 }).success).toBe(true);
      expect(riskSchema.safeParse({ residualRisk: 101 }).success).toBe(false);
    });
  });

  // ─── milestoneSchema ───

  describe("milestoneSchema", () => {
    it("accepts a valid milestone", () => {
      const result = milestoneSchema.safeParse({
        title: "Launch vehicle integration",
        category: "PRODUCT",
        targetDate: "2025-06-01T00:00:00.000Z",
        status: "ON_TRACK",
      });
      expect(result.success).toBe(true);
    });

    it("validates all category enum values", () => {
      const categories = [
        "PRODUCT",
        "BUSINESS",
        "FINANCIAL",
        "REGULATORY_M",
        "TEAM",
        "PARTNERSHIP",
      ];
      for (const category of categories) {
        const result = milestoneSchema.safeParse({ category });
        expect(result.success).toBe(true);
      }
    });

    it("validates all status enum values", () => {
      const statuses = [
        "ON_TRACK",
        "AT_RISK",
        "DELAYED",
        "COMPLETED_M",
        "CANCELLED",
      ];
      for (const status of statuses) {
        const result = milestoneSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid category", () => {
      const result = milestoneSchema.safeParse({ category: "INVALID" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid status", () => {
      const result = milestoneSchema.safeParse({ status: "INVALID" });
      expect(result.success).toBe(false);
    });

    it("targetDate must be a datetime string", () => {
      const result = milestoneSchema.safeParse({
        targetDate: "not-a-date",
      });
      expect(result.success).toBe(false);
    });

    it("accepts completedDate as datetime", () => {
      const result = milestoneSchema.safeParse({
        completedDate: "2025-05-15T12:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("accepts null completedDate", () => {
      const result = milestoneSchema.safeParse({
        completedDate: null,
      });
      expect(result.success).toBe(true);
    });
  });

  // ─── dataRoomLinkSchema ───

  describe("dataRoomLinkSchema", () => {
    it("accepts a valid data room link", () => {
      const result = dataRoomLinkSchema.safeParse({
        recipientName: "John Doe",
        recipientEmail: "john@example.com",
        expiresAt: "2025-12-31T23:59:59.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("requires recipientEmail", () => {
      const result = dataRoomLinkSchema.safeParse({
        recipientName: "John Doe",
        expiresAt: "2025-12-31T23:59:59.000Z",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email", () => {
      const result = dataRoomLinkSchema.safeParse({
        recipientName: "John Doe",
        recipientEmail: "not-an-email",
        expiresAt: "2025-12-31T23:59:59.000Z",
      });
      expect(result.success).toBe(false);
    });

    it("pin must be at least 4 characters", () => {
      const result = dataRoomLinkSchema.safeParse({
        recipientName: "John Doe",
        recipientEmail: "john@example.com",
        expiresAt: "2025-12-31T23:59:59.000Z",
        pin: "abc",
      });
      expect(result.success).toBe(false);
    });

    it("pin of 4 chars is valid", () => {
      const result = dataRoomLinkSchema.safeParse({
        recipientName: "John Doe",
        recipientEmail: "john@example.com",
        expiresAt: "2025-12-31T23:59:59.000Z",
        pin: "1234",
      });
      expect(result.success).toBe(true);
    });

    it("expiresAt must be a datetime string", () => {
      const result = dataRoomLinkSchema.safeParse({
        recipientName: "John Doe",
        recipientEmail: "john@example.com",
        expiresAt: "not-a-date",
      });
      expect(result.success).toBe(false);
    });

    it("defaults canDownload to false, canPrint to false, watermark to true", () => {
      const result = dataRoomLinkSchema.safeParse({
        recipientName: "John Doe",
        recipientEmail: "john@example.com",
        expiresAt: "2025-12-31T23:59:59.000Z",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canDownload).toBe(false);
        expect(result.data.canPrint).toBe(false);
        expect(result.data.watermark).toBe(true);
      }
    });

    it("requires recipientName", () => {
      const result = dataRoomLinkSchema.safeParse({
        recipientEmail: "john@example.com",
        expiresAt: "2025-12-31T23:59:59.000Z",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── materialGenerateSchema ───

  describe("materialGenerateSchema", () => {
    it("accepts a valid material generate request", () => {
      const result = materialGenerateSchema.safeParse({
        type: "EXECUTIVE_SUMMARY",
        title: "Q4 Executive Summary",
        includedSections: ["overview", "financials"],
      });
      expect(result.success).toBe(true);
    });

    it("validates all type enum values", () => {
      const types = [
        "EXECUTIVE_SUMMARY",
        "INVESTMENT_TEASER",
        "COMPANY_PROFILE_MAT",
        "RISK_REPORT",
        "CUSTOM",
      ];
      for (const type of types) {
        const result = materialGenerateSchema.safeParse({
          type,
          title: "Test",
          includedSections: ["section1"],
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid type enum", () => {
      const result = materialGenerateSchema.safeParse({
        type: "INVALID_TYPE",
        title: "Test",
        includedSections: ["section1"],
      });
      expect(result.success).toBe(false);
    });

    it("requires type", () => {
      const result = materialGenerateSchema.safeParse({
        title: "Test",
        includedSections: ["section1"],
      });
      expect(result.success).toBe(false);
    });

    it("includedSections must have at least 1 item", () => {
      const result = materialGenerateSchema.safeParse({
        type: "EXECUTIVE_SUMMARY",
        title: "Test",
        includedSections: [],
      });
      expect(result.success).toBe(false);
    });

    it("accepts customizations with tone enum", () => {
      const result = materialGenerateSchema.safeParse({
        type: "EXECUTIVE_SUMMARY",
        title: "Test",
        includedSections: ["overview"],
        customizations: {
          tone: "formal",
          targetAudience: "VC investors",
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid tone enum in customizations", () => {
      const result = materialGenerateSchema.safeParse({
        type: "EXECUTIVE_SUMMARY",
        title: "Test",
        includedSections: ["overview"],
        customizations: {
          tone: "INVALID",
        },
      });
      expect(result.success).toBe(false);
    });

    it("accepts customizations with valid hex color", () => {
      const result = materialGenerateSchema.safeParse({
        type: "CUSTOM",
        title: "Branded Report",
        includedSections: ["overview"],
        customizations: {
          customBranding: {
            primaryColor: "#10B981",
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid hex color in customBranding", () => {
      const result = materialGenerateSchema.safeParse({
        type: "CUSTOM",
        title: "Branded Report",
        includedSections: ["overview"],
        customizations: {
          customBranding: {
            primaryColor: "red",
          },
        },
      });
      expect(result.success).toBe(false);
    });

    it("accepts null customizations", () => {
      const result = materialGenerateSchema.safeParse({
        type: "EXECUTIVE_SUMMARY",
        title: "Test",
        includedSections: ["overview"],
        customizations: null,
      });
      expect(result.success).toBe(true);
    });
  });
});
