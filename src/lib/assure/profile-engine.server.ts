/**
 * Assure Profile Completion Engine — Server Only
 *
 * Computes weighted profile completeness scores across all 8 profile
 * sections (company + 7 sub-profiles) and generates prioritized
 * next-step recommendations to improve completeness.
 *
 * Field Weighting:
 *   Critical (3): companyName, operatorType, stage, oneLiner, trlLevel,
 *                 productStatus, targetRaise, teamSize, founders
 *   Important (2): revenueModel, competitiveAdvantage, tamValue, samValue,
 *                  somValue, fundingRounds, jurisdictions
 *   Supporting (1): everything else
 *
 * Deterministic: same input data always produces the same result.
 */

import "server-only";

import { prisma } from "@/lib/prisma";

// ─── Types ───

export interface SectionCompletion {
  section: string;
  label: string;
  totalWeight: number;
  completedWeight: number;
  score: number; // 0-100
  missingFields: MissingField[];
  fieldCount: number;
  completedFields: number;
}

export interface MissingField {
  field: string;
  label: string;
  weight: FieldWeight;
  priority: "critical" | "important" | "supporting";
  section: string;
}

export interface ProfileCompletenessResult {
  overallScore: number; // 0-100
  totalWeight: number;
  completedWeight: number;
  sections: SectionCompletion[];
  computedAt: Date;
}

export interface NextStep {
  priority: "critical" | "important" | "supporting";
  section: string;
  sectionLabel: string;
  field: string;
  fieldLabel: string;
  weight: FieldWeight;
  impact: string;
  estimatedTimeMinutes: number;
}

export type FieldWeight = 1 | 2 | 3;

// ─── Field Definitions ───

interface FieldDefinition {
  field: string;
  label: string;
  weight: FieldWeight;
}

const COMPANY_FIELDS: FieldDefinition[] = [
  { field: "companyName", label: "Company Name", weight: 3 },
  { field: "operatorType", label: "Operator Type", weight: 3 },
  { field: "stage", label: "Company Stage", weight: 3 },
  { field: "oneLiner", label: "One-Liner", weight: 3 },
  { field: "legalName", label: "Legal Name", weight: 1 },
  { field: "foundedDate", label: "Founded Date", weight: 1 },
  { field: "headquarters", label: "Headquarters", weight: 1 },
  { field: "legalForm", label: "Legal Form", weight: 1 },
  { field: "registrationNumber", label: "Registration Number", weight: 1 },
  { field: "website", label: "Website", weight: 1 },
  { field: "linkedIn", label: "LinkedIn", weight: 1 },
  { field: "subsector", label: "Subsector", weight: 1 },
  { field: "employeeCount", label: "Employee Count", weight: 1 },
  { field: "employeeGrowth6M", label: "Employee Growth (6M)", weight: 1 },
  { field: "missionStatement", label: "Mission Statement", weight: 1 },
  { field: "problemStatement", label: "Problem Statement", weight: 1 },
  { field: "solutionStatement", label: "Solution Statement", weight: 1 },
];

const TECH_FIELDS: FieldDefinition[] = [
  { field: "trlLevel", label: "TRL Level", weight: 3 },
  { field: "productStatus", label: "Product Status", weight: 3 },
  { field: "trlJustification", label: "TRL Justification", weight: 1 },
  { field: "trlEvidence", label: "TRL Evidence", weight: 1 },
  { field: "productName", label: "Product Name", weight: 1 },
  { field: "productDescription", label: "Product Description", weight: 1 },
  { field: "launchDate", label: "Launch Date", weight: 1 },
  { field: "keyFeatures", label: "Key Features", weight: 1 },
  { field: "technicalSpecs", label: "Technical Specifications", weight: 1 },
  { field: "patents", label: "Patents", weight: 1 },
  { field: "tradeSecrets", label: "Trade Secrets", weight: 1 },
  { field: "ipStrategy", label: "IP Strategy", weight: 1 },
  { field: "milestones", label: "Technology Milestones", weight: 1 },
];

const MARKET_FIELDS: FieldDefinition[] = [
  { field: "tamValue", label: "Total Addressable Market (TAM)", weight: 2 },
  {
    field: "samValue",
    label: "Serviceable Addressable Market (SAM)",
    weight: 2,
  },
  {
    field: "somValue",
    label: "Serviceable Obtainable Market (SOM)",
    weight: 2,
  },
  { field: "tamSource", label: "TAM Source", weight: 1 },
  { field: "marketGrowthRate", label: "Market Growth Rate", weight: 1 },
  { field: "whyNow", label: "Why Now", weight: 1 },
  { field: "marketDrivers", label: "Market Drivers", weight: 1 },
  { field: "targetCustomers", label: "Target Customers", weight: 1 },
  { field: "customerCount", label: "Customer Count", weight: 1 },
  { field: "pipelineValue", label: "Pipeline Value", weight: 1 },
  { field: "contractedRevenue", label: "Contracted Revenue", weight: 1 },
  { field: "gtmStrategy", label: "Go-to-Market Strategy", weight: 1 },
  { field: "salesCycle", label: "Sales Cycle", weight: 1 },
  { field: "distributionChannels", label: "Distribution Channels", weight: 1 },
];

const TEAM_FIELDS: FieldDefinition[] = [
  { field: "founders", label: "Founders", weight: 3 },
  { field: "teamSize", label: "Team Size", weight: 3 },
  { field: "cSuite", label: "C-Suite Team", weight: 1 },
  { field: "keyHires", label: "Key Hires", weight: 1 },
  { field: "boardMembers", label: "Board Members", weight: 1 },
  { field: "advisors", label: "Advisors", weight: 1 },
  { field: "engineeringRatio", label: "Engineering Ratio", weight: 1 },
  { field: "averageExperience", label: "Average Experience", weight: 1 },
  { field: "keyPersonRisk", label: "Key Person Risk Assessment", weight: 1 },
  { field: "hiringPlan", label: "Hiring Plan", weight: 1 },
  { field: "employeeTurnover", label: "Employee Turnover", weight: 1 },
  { field: "glassdoorRating", label: "Glassdoor Rating", weight: 1 },
];

const FINANCIAL_FIELDS: FieldDefinition[] = [
  { field: "targetRaise", label: "Target Raise Amount", weight: 3 },
  { field: "revenueModel", label: "Revenue Model", weight: 2 },
  { field: "fundingRounds", label: "Funding Rounds", weight: 2 },
  { field: "annualRevenue", label: "Annual Revenue", weight: 1 },
  { field: "revenueGrowthYoY", label: "Revenue Growth YoY", weight: 1 },
  { field: "monthlyBurnRate", label: "Monthly Burn Rate", weight: 1 },
  { field: "runway", label: "Cash Runway", weight: 1 },
  { field: "grossMargin", label: "Gross Margin", weight: 1 },
  { field: "cashPosition", label: "Cash Position", weight: 1 },
  { field: "revenueStreams", label: "Revenue Streams", weight: 1 },
  { field: "unitEconomics", label: "Unit Economics", weight: 1 },
  { field: "totalRaised", label: "Total Raised", weight: 1 },
  { field: "currentValuation", label: "Current Valuation", weight: 1 },
  { field: "isRaising", label: "Currently Raising", weight: 1 },
  { field: "targetValuation", label: "Target Valuation", weight: 1 },
  { field: "roundType", label: "Round Type", weight: 1 },
  { field: "useOfFunds", label: "Use of Funds", weight: 1 },
  { field: "targetCloseDate", label: "Target Close Date", weight: 1 },
  { field: "revenueProjections", label: "Revenue Projections", weight: 1 },
  {
    field: "profitabilityTimeline",
    label: "Profitability Timeline",
    weight: 1,
  },
  { field: "breakEvenDate", label: "Break-Even Date", weight: 1 },
];

const REGULATORY_FIELDS: FieldDefinition[] = [
  { field: "jurisdictions", label: "Operating Jurisdictions", weight: 2 },
  { field: "complyLinked", label: "Comply Platform Linked", weight: 1 },
  { field: "rrsScore", label: "RRS Score", weight: 1 },
  { field: "rrsComponents", label: "RRS Component Breakdown", weight: 1 },
  { field: "authorizationStatus", label: "Authorization Status", weight: 1 },
  { field: "authorizationDetails", label: "Authorization Details", weight: 1 },
  { field: "nis2Status", label: "NIS2 Status", weight: 1 },
  {
    field: "spaceDebrisCompliance",
    label: "Space Debris Compliance",
    weight: 1,
  },
  { field: "insuranceStatus", label: "Insurance Status", weight: 1 },
  {
    field: "regulatoryMoatDescription",
    label: "Regulatory Moat Description",
    weight: 1,
  },
  { field: "barrierToEntry", label: "Barrier to Entry", weight: 1 },
  { field: "timeToReplicate", label: "Time to Replicate", weight: 1 },
  { field: "regulatoryRisks", label: "Regulatory Risks", weight: 1 },
];

const COMPETITIVE_FIELDS: FieldDefinition[] = [
  { field: "competitiveAdvantage", label: "Competitive Advantage", weight: 2 },
  { field: "competitors", label: "Competitors", weight: 1 },
  { field: "moats", label: "Moats", weight: 1 },
  { field: "differentiators", label: "Differentiators", weight: 1 },
  { field: "marketPosition", label: "Market Position", weight: 1 },
  { field: "winRate", label: "Win Rate", weight: 1 },
  { field: "keyWins", label: "Key Wins", weight: 1 },
  { field: "keyLosses", label: "Key Losses", weight: 1 },
];

const TRACTION_FIELDS: FieldDefinition[] = [
  { field: "keyMetrics", label: "Key Metrics", weight: 1 },
  { field: "milestonesAchieved", label: "Milestones Achieved", weight: 1 },
  { field: "partnerships", label: "Partnerships", weight: 1 },
  { field: "lois", label: "Letters of Intent", weight: 1 },
  { field: "signedContracts", label: "Signed Contracts", weight: 1 },
  { field: "pilotPrograms", label: "Pilot Programs", weight: 1 },
  { field: "awards", label: "Awards", weight: 1 },
  { field: "mediaFeatures", label: "Media Features", weight: 1 },
  { field: "conferences", label: "Conferences", weight: 1 },
  { field: "upcomingMilestones", label: "Upcoming Milestones", weight: 1 },
];

// ─── Helpers ───

function isFieldPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  // For JSON fields, check if they contain meaningful data
  if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) return value.length > 0;
    return Object.keys(value).length > 0;
  }
  return true;
}

function computeSection(
  sectionKey: string,
  sectionLabel: string,
  fields: FieldDefinition[],
  data: Record<string, unknown> | null,
): SectionCompletion {
  const missingFields: MissingField[] = [];
  let totalWeight = 0;
  let completedWeight = 0;
  let completedFields = 0;

  for (const fd of fields) {
    totalWeight += fd.weight;
    const value = data ? data[fd.field] : undefined;

    if (isFieldPresent(value)) {
      completedWeight += fd.weight;
      completedFields++;
    } else {
      const priority: MissingField["priority"] =
        fd.weight === 3
          ? "critical"
          : fd.weight === 2
            ? "important"
            : "supporting";
      missingFields.push({
        field: fd.field,
        label: fd.label,
        weight: fd.weight,
        priority,
        section: sectionKey,
      });
    }
  }

  const score =
    totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  return {
    section: sectionKey,
    label: sectionLabel,
    totalWeight,
    completedWeight,
    score,
    missingFields,
    fieldCount: fields.length,
    completedFields,
  };
}

// ─── Main Computation ───

/**
 * Compute profile completeness scores for each section and overall.
 * Deterministic: same DB state produces the same result.
 */
export async function computeProfileCompleteness(
  organizationId: string,
): Promise<ProfileCompletenessResult> {
  const now = new Date();

  // Fetch the full profile with all sub-profiles
  const profile = await prisma.assureCompanyProfile.findUnique({
    where: { organizationId },
    include: {
      techProfile: true,
      marketProfile: true,
      teamProfile: true,
      financialProfile: true,
      regulatoryProfile: true,
      competitiveProfile: true,
      tractionProfile: true,
    },
  });

  // Compute each section
  const companyData = profile
    ? (profile as unknown as Record<string, unknown>)
    : null;

  const sections: SectionCompletion[] = [
    computeSection("company", "Company Profile", COMPANY_FIELDS, companyData),
    computeSection(
      "tech",
      "Technology & Product",
      TECH_FIELDS,
      profile?.techProfile as unknown as Record<string, unknown> | null,
    ),
    computeSection(
      "market",
      "Market Opportunity",
      MARKET_FIELDS,
      profile?.marketProfile as unknown as Record<string, unknown> | null,
    ),
    computeSection(
      "team",
      "Team & Leadership",
      TEAM_FIELDS,
      profile?.teamProfile as unknown as Record<string, unknown> | null,
    ),
    computeSection(
      "financial",
      "Financial Health",
      FINANCIAL_FIELDS,
      profile?.financialProfile as unknown as Record<string, unknown> | null,
    ),
    computeSection(
      "regulatory",
      "Regulatory Position",
      REGULATORY_FIELDS,
      profile?.regulatoryProfile as unknown as Record<string, unknown> | null,
    ),
    computeSection(
      "competitive",
      "Competitive Landscape",
      COMPETITIVE_FIELDS,
      profile?.competitiveProfile as unknown as Record<string, unknown> | null,
    ),
    computeSection(
      "traction",
      "Traction & Validation",
      TRACTION_FIELDS,
      profile?.tractionProfile as unknown as Record<string, unknown> | null,
    ),
  ];

  // Compute overall score as a weighted average across all sections
  const totalWeight = sections.reduce((sum, s) => sum + s.totalWeight, 0);
  const completedWeight = sections.reduce(
    (sum, s) => sum + s.completedWeight,
    0,
  );
  const overallScore =
    totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  // Persist the completion scores back to the profile
  if (profile) {
    const updates: Array<Promise<unknown>> = [
      prisma.assureCompanyProfile.update({
        where: { id: profile.id },
        data: { completionScore: overallScore },
      }),
    ];

    const sectionMap: Record<string, string> = {
      tech: "assureTechProfile",
      market: "assureMarketProfile",
      team: "assureTeamProfile",
      financial: "assureFinancialProfile",
      regulatory: "assureRegulatoryProfile",
      competitive: "assureCompetitiveProfile",
      traction: "assureTractionProfile",
    };

    for (const section of sections) {
      if (section.section === "company") continue;
      const modelName = sectionMap[section.section];
      const subProfile = profile[
        `${section.section}Profile` as keyof typeof profile
      ] as { id: string } | null;

      if (modelName && subProfile) {
        // Use a dynamic update via prisma
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = prisma[modelName as keyof typeof prisma] as any;
        updates.push(
          model.update({
            where: { id: subProfile.id },
            data: { completionScore: section.score },
          }),
        );
      }
    }

    await Promise.all(updates);
  }

  return {
    overallScore,
    totalWeight,
    completedWeight,
    sections,
    computedAt: now,
  };
}

/**
 * Get prioritized next steps to improve profile completeness.
 * Returns actions sorted by priority (critical first) and impact.
 */
export async function getNextSteps(
  organizationId: string,
): Promise<NextStep[]> {
  const completeness = await computeProfileCompleteness(organizationId);

  const allMissing: MissingField[] = completeness.sections.flatMap(
    (s) => s.missingFields,
  );

  const sectionLabels: Record<string, string> = {};
  for (const s of completeness.sections) {
    sectionLabels[s.section] = s.label;
  }

  // Map missing fields to next steps with impact estimation
  const steps: NextStep[] = allMissing.map((mf) => {
    const totalWeight = completeness.totalWeight;
    const impactPct =
      totalWeight > 0
        ? Math.round((mf.weight / totalWeight) * 100 * 10) / 10
        : 0;

    // Estimate time based on field complexity
    const timeEstimates: Record<string, number> = {
      // Quick fills (2-5 min)
      companyName: 2,
      legalName: 2,
      stage: 2,
      oneLiner: 5,
      headquarters: 2,
      legalForm: 2,
      registrationNumber: 2,
      website: 2,
      linkedIn: 2,
      teamSize: 2,
      employeeCount: 2,
      trlLevel: 3,
      productStatus: 2,
      productName: 2,
      customerCount: 2,
      isRaising: 2,
      roundType: 2,
      // Medium fills (5-15 min)
      operatorType: 5,
      founders: 10,
      revenueModel: 5,
      competitiveAdvantage: 10,
      targetRaise: 5,
      tamValue: 10,
      samValue: 10,
      somValue: 10,
      fundingRounds: 10,
      jurisdictions: 5,
      authorizationStatus: 5,
      // Detailed fills (15-30 min)
      missionStatement: 15,
      problemStatement: 15,
      solutionStatement: 15,
      trlJustification: 15,
      productDescription: 15,
      gtmStrategy: 20,
      ipStrategy: 15,
      keyPersonRisk: 15,
      regulatoryMoatDescription: 20,
    };

    return {
      priority: mf.priority,
      section: mf.section,
      sectionLabel: sectionLabels[mf.section] || mf.section,
      field: mf.field,
      fieldLabel: mf.label,
      weight: mf.weight,
      impact: `+${impactPct}% overall completion`,
      estimatedTimeMinutes: timeEstimates[mf.field] || 10,
    };
  });

  // Sort: critical first, then important, then supporting
  // Within each priority level, sort by weight descending, then estimated time ascending
  const priorityOrder = { critical: 0, important: 1, supporting: 2 };
  steps.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    const wDiff = b.weight - a.weight;
    if (wDiff !== 0) return wDiff;
    return a.estimatedTimeMinutes - b.estimatedTimeMinutes;
  });

  return steps;
}
