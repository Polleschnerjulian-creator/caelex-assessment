/**
 * Assure Input Validation Schemas
 *
 * Centralized Zod validation schemas for all Assure module inputs.
 * All user input MUST be validated against these schemas before processing.
 *
 * Conventions:
 *   - All update schemas use .partial() so any subset of fields can be sent
 *   - Numeric ranges are enforced (e.g., TRL 1-9, scores 0-100)
 *   - String lengths are bounded to prevent abuse
 *   - JSON array fields use z.array() with item schemas where possible
 */

import { z } from "zod";

// ─── Enum Values ───

const companyStageValues = [
  "PRE_SEED",
  "SEED",
  "SERIES_A",
  "SERIES_B",
  "SERIES_C_PLUS",
  "PRE_IPO",
  "PUBLIC",
] as const;

const productStatusValues = [
  "CONCEPT",
  "PROTOTYPE",
  "TESTING",
  "BETA",
  "PRODUCTION",
  "OPERATIONAL",
] as const;

const riskCategoryValues = [
  "TECHNOLOGY",
  "MARKET",
  "REGULATORY",
  "FINANCIAL",
  "OPERATIONAL",
  "COMPETITIVE",
  "GEOPOLITICAL",
] as const;

const riskProbabilityValues = [
  "VERY_LOW",
  "LOW",
  "MODERATE",
  "HIGH",
  "VERY_HIGH",
] as const;

const riskImpactValues = [
  "NEGLIGIBLE",
  "MINOR",
  "MODERATE_IMPACT",
  "MAJOR",
  "CATASTROPHIC",
] as const;

const mitigationStatusValues = [
  "IDENTIFIED",
  "PLANNED",
  "IN_PROGRESS_M",
  "MITIGATED",
  "ACCEPTED",
  "TRANSFERRED",
] as const;

const milestoneCategoryValues = [
  "PRODUCT",
  "BUSINESS",
  "FINANCIAL",
  "REGULATORY_M",
  "TEAM",
  "PARTNERSHIP",
] as const;

const milestoneStatusValues = [
  "ON_TRACK",
  "AT_RISK",
  "DELAYED",
  "COMPLETED_M",
  "CANCELLED",
] as const;

const materialTypeValues = [
  "EXECUTIVE_SUMMARY",
  "INVESTMENT_TEASER",
  "COMPANY_PROFILE_MAT",
  "RISK_REPORT",
  "CUSTOM",
] as const;

// ─── Reusable Schemas ───

const safeString = (maxLen: number = 500) =>
  z.string().trim().min(1).max(maxLen);

const optionalSafeString = (maxLen: number = 500) =>
  z.string().trim().max(maxLen).optional().nullable();

const safeText = (maxLen: number = 5000) => z.string().trim().max(maxLen);

const optionalSafeText = (maxLen: number = 5000) =>
  z.string().trim().max(maxLen).optional().nullable();

const optionalUrl = z.string().trim().url().max(2048).optional().nullable();

const optionalEmail = z.string().trim().email().max(320).optional().nullable();

const score0to100 = z.number().min(0).max(100);
const optionalScore = z.number().min(0).max(100).optional().nullable();

const positiveFloat = z.number().min(0);
const optionalPositiveFloat = z.number().min(0).optional().nullable();

const positiveInt = z.number().int().min(0);
const optionalPositiveInt = z.number().int().min(0).optional().nullable();

const percentFloat = z.number().min(-100).max(1000);
const optionalPercentFloat = z
  .number()
  .min(-100)
  .max(1000)
  .optional()
  .nullable();

// ─── Founder Schema (used inside JSON fields) ───

const founderSchema = z.object({
  name: safeString(200),
  title: optionalSafeString(200),
  linkedIn: optionalUrl,
  bio: optionalSafeText(2000),
  experience: optionalPositiveInt,
  previousExits: optionalPositiveInt,
});

// ─── Funding Round Schema ───

const fundingRoundSchema = z.object({
  name: safeString(200),
  date: z.string().optional().nullable(),
  amount: optionalPositiveFloat,
  valuation: optionalPositiveFloat,
  leadInvestor: optionalSafeString(200),
  investors: z.array(safeString(200)).optional(),
});

// ─── Company Profile Schema ───

export const companyProfileSchema = z
  .object({
    companyName: safeString(300),
    legalName: optionalSafeString(300),
    foundedDate: z.string().datetime().optional().nullable(),
    headquarters: optionalSafeString(200),
    legalForm: optionalSafeString(100),
    registrationNumber: optionalSafeString(100),
    website: optionalUrl,
    linkedIn: optionalUrl,
    operatorType: z.array(safeString(50)).min(1).max(10),
    subsector: z.array(safeString(100)).max(10).optional(),
    stage: z.enum(companyStageValues),
    employeeCount: optionalPositiveInt,
    employeeGrowth6M: optionalPercentFloat,
    oneLiner: optionalSafeString(500),
    missionStatement: optionalSafeText(3000),
    problemStatement: optionalSafeText(3000),
    solutionStatement: optionalSafeText(3000),
  })
  .partial();

// ─── Tech Profile Schema ───

export const techProfileSchema = z
  .object({
    trlLevel: z.number().int().min(1).max(9),
    trlJustification: optionalSafeText(3000),
    trlEvidence: z
      .array(
        z.object({
          type: safeString(100),
          description: safeText(1000),
          url: optionalUrl,
        }),
      )
      .max(20)
      .optional()
      .nullable(),
    productName: optionalSafeString(300),
    productDescription: optionalSafeText(5000),
    productStatus: z.enum(productStatusValues),
    launchDate: z.string().datetime().optional().nullable(),
    keyFeatures: z.array(safeString(500)).max(20).optional().nullable(),
    technicalSpecs: z
      .record(z.string().max(200), z.string().max(1000))
      .optional()
      .nullable(),
    patents: z
      .array(
        z.object({
          title: safeString(500),
          number: optionalSafeString(100),
          status: z.enum(["filed", "pending", "granted", "expired"]).optional(),
          jurisdiction: optionalSafeString(50),
        }),
      )
      .max(50)
      .optional()
      .nullable(),
    tradeSecrets: optionalSafeText(3000),
    ipStrategy: optionalSafeText(3000),
    milestones: z
      .array(
        z.object({
          name: safeString(300),
          date: z.string().optional().nullable(),
          status: z.enum(["completed", "in_progress", "planned"]).optional(),
        }),
      )
      .max(50)
      .optional()
      .nullable(),
  })
  .partial();

// ─── Market Profile Schema ───

export const marketProfileSchema = z
  .object({
    tamValue: optionalPositiveFloat,
    tamSource: optionalSafeString(500),
    samValue: optionalPositiveFloat,
    somValue: optionalPositiveFloat,
    marketGrowthRate: optionalPercentFloat,
    whyNow: optionalSafeText(3000),
    marketDrivers: z
      .array(
        z.object({
          driver: safeString(300),
          description: optionalSafeText(1000),
        }),
      )
      .max(10)
      .optional()
      .nullable(),
    targetCustomers: z
      .array(
        z.object({
          segment: safeString(200),
          description: optionalSafeText(1000),
          size: optionalPositiveInt,
        }),
      )
      .max(10)
      .optional()
      .nullable(),
    customerCount: optionalPositiveInt,
    pipelineValue: optionalPositiveFloat,
    contractedRevenue: optionalPositiveFloat,
    gtmStrategy: optionalSafeText(5000),
    salesCycle: optionalSafeString(200),
    distributionChannels: z
      .array(safeString(200))
      .max(10)
      .optional()
      .nullable(),
  })
  .partial();

// ─── Team Profile Schema ───

export const teamProfileSchema = z
  .object({
    founders: z.array(founderSchema).max(10).optional().nullable(),
    cSuite: z
      .array(
        z.object({
          name: safeString(200),
          title: safeString(200),
          linkedIn: optionalUrl,
          bio: optionalSafeText(2000),
        }),
      )
      .max(20)
      .optional()
      .nullable(),
    keyHires: z
      .array(
        z.object({
          role: safeString(200),
          name: optionalSafeString(200),
          status: z.enum(["filled", "open", "planned"]).optional(),
        }),
      )
      .max(30)
      .optional()
      .nullable(),
    boardMembers: z
      .array(
        z.object({
          name: safeString(200),
          title: optionalSafeString(200),
          affiliation: optionalSafeString(200),
          type: z
            .enum(["independent", "investor", "founder", "observer"])
            .optional(),
        }),
      )
      .max(15)
      .optional()
      .nullable(),
    advisors: z
      .array(
        z.object({
          name: safeString(200),
          expertise: optionalSafeString(200),
          affiliation: optionalSafeString(200),
        }),
      )
      .max(20)
      .optional()
      .nullable(),
    teamSize: optionalPositiveInt,
    engineeringRatio: z.number().min(0).max(100).optional().nullable(),
    averageExperience: z.number().min(0).max(50).optional().nullable(),
    keyPersonRisk: optionalSafeText(3000),
    hiringPlan: z
      .array(
        z.object({
          role: safeString(200),
          timeline: optionalSafeString(100),
          priority: z.enum(["critical", "high", "medium", "low"]).optional(),
        }),
      )
      .max(30)
      .optional()
      .nullable(),
    employeeTurnover: z.number().min(0).max(100).optional().nullable(),
    glassdoorRating: z.number().min(0).max(5).optional().nullable(),
  })
  .partial();

// ─── Financial Profile Schema ───

export const financialProfileSchema = z
  .object({
    annualRevenue: optionalPositiveFloat,
    revenueGrowthYoY: optionalPercentFloat,
    monthlyBurnRate: optionalPositiveFloat,
    runway: z.number().int().min(0).max(120).optional().nullable(),
    grossMargin: z.number().min(-100).max(100).optional().nullable(),
    cashPosition: optionalPositiveFloat,
    revenueModel: optionalSafeString(200),
    revenueStreams: z
      .array(
        z.object({
          name: safeString(200),
          percentage: z.number().min(0).max(100).optional(),
          description: optionalSafeText(500),
        }),
      )
      .max(10)
      .optional()
      .nullable(),
    unitEconomics: z
      .record(z.string().max(100), z.number())
      .optional()
      .nullable(),
    totalRaised: optionalPositiveFloat,
    fundingRounds: z.array(fundingRoundSchema).max(15).optional().nullable(),
    currentValuation: optionalPositiveFloat,
    isRaising: z.boolean().optional(),
    targetRaise: optionalPositiveFloat,
    targetValuation: optionalPositiveFloat,
    roundType: optionalSafeString(100),
    useOfFunds: z
      .array(
        z.object({
          category: safeString(200),
          percentage: z.number().min(0).max(100),
          description: optionalSafeText(500),
        }),
      )
      .max(10)
      .optional()
      .nullable(),
    targetCloseDate: z.string().datetime().optional().nullable(),
    revenueProjections: z
      .array(
        z.object({
          year: z.number().int().min(2020).max(2040),
          revenue: positiveFloat,
          notes: optionalSafeString(500),
        }),
      )
      .max(10)
      .optional()
      .nullable(),
    profitabilityTimeline: optionalSafeString(500),
    breakEvenDate: z.string().datetime().optional().nullable(),
  })
  .partial();

// ─── Regulatory Profile Schema ───

export const regulatoryProfileSchema = z
  .object({
    complyLinked: z.boolean(),
    complyOrgId: optionalSafeString(100),
    rrsScore: optionalScore,
    rrsComponents: z
      .record(z.string().max(100), z.number())
      .optional()
      .nullable(),
    jurisdictions: z.array(safeString(10)).max(20).optional(),
    authorizationStatus: optionalSafeString(100),
    authorizationDetails: optionalSafeText(5000),
    nis2Status: optionalSafeString(100),
    spaceDebrisCompliance: optionalSafeString(100),
    insuranceStatus: optionalSafeString(100),
    regulatoryMoatDescription: optionalSafeText(5000),
    barrierToEntry: optionalSafeText(3000),
    timeToReplicate: optionalSafeString(200),
    regulatoryRisks: z
      .array(
        z.object({
          risk: safeString(500),
          impact: z.enum(["low", "medium", "high", "critical"]).optional(),
          mitigation: optionalSafeText(1000),
        }),
      )
      .max(20)
      .optional()
      .nullable(),
  })
  .partial();

// ─── Competitive Profile Schema ───

export const competitiveProfileSchema = z
  .object({
    competitors: z
      .array(
        z.object({
          name: safeString(200),
          description: optionalSafeText(1000),
          website: optionalUrl,
          strengths: z.array(safeString(300)).max(5).optional(),
          weaknesses: z.array(safeString(300)).max(5).optional(),
          fundingRaised: optionalPositiveFloat,
        }),
      )
      .max(20)
      .optional()
      .nullable(),
    competitiveAdvantage: optionalSafeText(5000),
    moats: z
      .array(
        z.object({
          type: safeString(100),
          description: safeText(1000),
          durability: z.enum(["weak", "moderate", "strong"]).optional(),
        }),
      )
      .max(10)
      .optional()
      .nullable(),
    differentiators: z
      .array(
        z.object({
          area: safeString(200),
          description: safeText(1000),
        }),
      )
      .max(10)
      .optional()
      .nullable(),
    marketPosition: optionalSafeString(200),
    winRate: z.number().min(0).max(100).optional().nullable(),
    keyWins: z
      .array(
        z.object({
          customer: safeString(200),
          value: optionalPositiveFloat,
          description: optionalSafeText(1000),
        }),
      )
      .max(20)
      .optional()
      .nullable(),
    keyLosses: z
      .array(
        z.object({
          customer: safeString(200),
          competitor: optionalSafeString(200),
          reason: optionalSafeText(1000),
        }),
      )
      .max(20)
      .optional()
      .nullable(),
  })
  .partial();

// ─── Traction Profile Schema ───

export const tractionProfileSchema = z
  .object({
    keyMetrics: z
      .array(
        z.object({
          name: safeString(200),
          value: z.union([z.string().max(100), z.number()]),
          unit: optionalSafeString(50),
          trend: z.enum(["up", "down", "flat"]).optional(),
        }),
      )
      .max(20)
      .optional()
      .nullable(),
    milestonesAchieved: z
      .array(
        z.object({
          title: safeString(300),
          date: z.string().optional().nullable(),
          description: optionalSafeText(1000),
        }),
      )
      .max(30)
      .optional()
      .nullable(),
    partnerships: z
      .array(
        z.object({
          partner: safeString(200),
          type: optionalSafeString(100),
          description: optionalSafeText(1000),
          startDate: z.string().optional().nullable(),
        }),
      )
      .max(20)
      .optional()
      .nullable(),
    lois: optionalPositiveInt,
    signedContracts: optionalPositiveInt,
    pilotPrograms: optionalPositiveInt,
    awards: z
      .array(
        z.object({
          name: safeString(300),
          issuer: optionalSafeString(200),
          date: z.string().optional().nullable(),
        }),
      )
      .max(30)
      .optional()
      .nullable(),
    mediaFeatures: z
      .array(
        z.object({
          outlet: safeString(200),
          title: safeString(500),
          url: optionalUrl,
          date: z.string().optional().nullable(),
        }),
      )
      .max(30)
      .optional()
      .nullable(),
    conferences: z
      .array(
        z.object({
          name: safeString(300),
          role: z
            .enum(["speaker", "panelist", "exhibitor", "attendee"])
            .optional(),
          date: z.string().optional().nullable(),
        }),
      )
      .max(30)
      .optional()
      .nullable(),
    upcomingMilestones: z
      .array(
        z.object({
          title: safeString(300),
          targetDate: z.string().optional().nullable(),
          description: optionalSafeText(1000),
        }),
      )
      .max(20)
      .optional()
      .nullable(),
  })
  .partial();

// ─── Risk Schema ───

export const riskSchema = z
  .object({
    category: z.enum(riskCategoryValues),
    title: safeString(300),
    description: safeText(5000),
    probability: z.enum(riskProbabilityValues),
    impact: z.enum(riskImpactValues),
    financialExposure: optionalPositiveFloat,
    mitigationStrategy: optionalSafeText(5000),
    mitigationStatus: z.enum(mitigationStatusValues),
    mitigationEvidence: z
      .array(
        z.object({
          type: safeString(100),
          description: safeText(1000),
          url: optionalUrl,
        }),
      )
      .max(10)
      .optional()
      .nullable(),
    residualRisk: optionalScore,
    timeHorizon: optionalSafeString(100),
    triggerEvents: z.array(safeString(500)).max(10).optional().nullable(),
    earlyWarnings: z.array(safeString(500)).max(10).optional().nullable(),
    sortOrder: z.number().int().min(0).max(999).optional(),
  })
  .partial();

// ─── Milestone Schema ───

export const milestoneSchema = z
  .object({
    title: safeString(300),
    description: optionalSafeText(3000),
    category: z.enum(milestoneCategoryValues),
    targetDate: z.string().datetime(),
    completedDate: z.string().datetime().optional().nullable(),
    status: z.enum(milestoneStatusValues),
    evidence: z
      .array(
        z.object({
          type: safeString(100),
          description: safeText(1000),
          url: optionalUrl,
        }),
      )
      .max(10)
      .optional()
      .nullable(),
    isInvestorVisible: z.boolean().optional(),
    investorNote: optionalSafeText(3000),
  })
  .partial();

// ─── Data Room Link Schema ───

export const dataRoomLinkSchema = z.object({
  recipientName: safeString(200),
  recipientEmail: z.string().trim().email().max(320),
  recipientOrg: optionalSafeString(200),
  expiresAt: z.string().datetime(),
  pin: z.string().min(4).max(20).optional().nullable(),
  canDownload: z.boolean().default(false),
  canPrint: z.boolean().default(false),
  watermark: z.boolean().default(true),
  accessibleFolders: z.array(safeString(50)).max(20).optional().nullable(),
});

// ─── Material Generate Schema ───

export const materialGenerateSchema = z.object({
  type: z.enum(materialTypeValues),
  title: safeString(300),
  includedSections: z.array(safeString(100)).min(1).max(20),
  customizations: z
    .object({
      tone: z.enum(["formal", "conversational", "technical"]).optional(),
      targetAudience: optionalSafeString(200),
      focusAreas: z.array(safeString(200)).max(10).optional(),
      excludeSections: z.array(safeString(100)).max(10).optional(),
      customBranding: z
        .object({
          primaryColor: z
            .string()
            .regex(/^#[0-9A-Fa-f]{6}$/)
            .optional(),
          logoUrl: optionalUrl,
          companyName: optionalSafeString(200),
        })
        .optional(),
    })
    .optional()
    .nullable(),
});

// ─── Type Exports ───

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
export type TechProfileInput = z.infer<typeof techProfileSchema>;
export type MarketProfileInput = z.infer<typeof marketProfileSchema>;
export type TeamProfileInput = z.infer<typeof teamProfileSchema>;
export type FinancialProfileInput = z.infer<typeof financialProfileSchema>;
export type RegulatoryProfileInput = z.infer<typeof regulatoryProfileSchema>;
export type CompetitiveProfileInput = z.infer<typeof competitiveProfileSchema>;
export type TractionProfileInput = z.infer<typeof tractionProfileSchema>;
export type RiskInput = z.infer<typeof riskSchema>;
export type MilestoneInput = z.infer<typeof milestoneSchema>;
export type DataRoomLinkInput = z.infer<typeof dataRoomLinkSchema>;
export type MaterialGenerateInput = z.infer<typeof materialGenerateSchema>;
