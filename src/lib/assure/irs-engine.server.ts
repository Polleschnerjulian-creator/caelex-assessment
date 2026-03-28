/**
 * Assure Investment Readiness Score (IRS) Engine — Server Only
 *
 * Computes a composite investment readiness score (0-100) from
 * company profile data across 6 weighted components.
 *
 * Components and Weights:
 *   Market Opportunity      20%  (AssureMarketProfile)
 *   Technology & Product    20%  (AssureTechProfile)
 *   Team & Leadership       15%  (AssureTeamProfile)
 *   Financial Health        15%  (AssureFinancialProfile)
 *   Regulatory Position     15%  (AssureRegulatoryProfile)
 *   Traction & Validation   15%  (AssureTractionProfile)
 *
 * Scoring Rules:
 *   1. Data completeness penalty: <30% data → cap score at 30
 *   2. Cross-component consistency checks (5+)
 *   3. Stage-appropriate scoring adjustments
 *   4. Comply bonus: complyLinked=true → +5 on regulatory (cap 100)
 *   5. Deterministic: same input → same output
 *
 * Methodology version: 1.0.0
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import type { CompanyStage } from "@prisma/client";

// ─── Types ───

export interface IRSSubScore {
  id: string;
  name: string;
  score: number; // 0-100
  weight: number; // 0-1, sums to 1.0 within component
  weightedScore: number;
  dataAvailable: boolean;
  rationale: string;
}

export interface IRSComponentScore {
  component: string;
  label: string;
  weight: number; // 0-1
  rawScore: number; // 0-100 before adjustments
  adjustedScore: number; // 0-100 after completeness penalty
  weightedScore: number;
  dataCompleteness: number; // 0-1
  subScores: IRSSubScore[];
}

export interface ConsistencyCheck {
  id: string;
  description: string;
  passed: boolean;
  penalty: number;
  affectedComponent: string;
}

export interface ImprovementAction {
  component: string;
  componentLabel: string;
  subScore: string;
  subScoreLabel: string;
  currentScore: number;
  targetScore: number;
  profileFields: string[];
  estimatedImpact: number;
  effort: "LOW" | "MEDIUM" | "HIGH";
  timeframe: string;
  priority: number;
}

export interface IRSResult {
  overallScore: number; // 0-100
  grade: string;
  gradeLabel: string;
  components: IRSComponentScore[];
  consistencyChecks: ConsistencyCheck[];
  topStrengths: Array<{ component: string; label: string; score: number }>;
  topWeaknesses: Array<{ component: string; label: string; score: number }>;
  improvementPlan: ImprovementAction[];
  profileCompleteness: number;
  stage: CompanyStage;
  computedAt: Date;
}

// ─── Constants ───

const IRS_METHODOLOGY_VERSION = "1.0.0";

const COMPONENT_WEIGHTS = {
  market: 0.2,
  technology: 0.2,
  team: 0.15,
  financial: 0.15,
  regulatory: 0.15,
  traction: 0.15,
} as const;

// ─── Grade Mapping ───

interface GradeBand {
  grade: string;
  label: string;
  min: number;
  max: number;
}

const GRADE_BANDS: GradeBand[] = [
  { grade: "A+", label: "Exceptional", min: 90, max: 100 },
  { grade: "A", label: "Strong", min: 80, max: 89 },
  { grade: "A-", label: "Good", min: 75, max: 79 },
  { grade: "B+", label: "Solid", min: 70, max: 74 },
  { grade: "B", label: "Developing", min: 60, max: 69 },
  { grade: "B-", label: "Early", min: 55, max: 59 },
  { grade: "C+", label: "Needs Work", min: 45, max: 54 },
  { grade: "C", label: "Significant Gaps", min: 35, max: 44 },
  { grade: "C-", label: "Major Gaps", min: 25, max: 34 },
  { grade: "D", label: "Not Ready", min: 0, max: 24 },
];

function mapScoreToGrade(score: number): { grade: string; label: string } {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const band = GRADE_BANDS.find((b) => clamped >= b.min && clamped <= b.max);
  return band
    ? { grade: band.grade, label: band.label }
    : { grade: "D", label: "Not Ready" };
}

// ─── Stage Thresholds ───

/**
 * Stage-appropriate scoring adjustments.
 * For early-stage companies, certain missing data is expected and
 * shouldn't penalize as harshly as for later-stage companies.
 */
interface StageThresholds {
  revenueExpected: boolean;
  minTRL: number;
  minTeamSize: number;
  fundingRoundsExpected: boolean;
  tractionExpected: boolean;
  regulatoryDetailExpected: boolean;
}

const STAGE_THRESHOLDS: Record<CompanyStage, StageThresholds> = {
  PRE_SEED: {
    revenueExpected: false,
    minTRL: 1,
    minTeamSize: 1,
    fundingRoundsExpected: false,
    tractionExpected: false,
    regulatoryDetailExpected: false,
  },
  SEED: {
    revenueExpected: false,
    minTRL: 2,
    minTeamSize: 3,
    fundingRoundsExpected: false,
    tractionExpected: false,
    regulatoryDetailExpected: false,
  },
  SERIES_A: {
    revenueExpected: true,
    minTRL: 5,
    minTeamSize: 10,
    fundingRoundsExpected: true,
    tractionExpected: true,
    regulatoryDetailExpected: true,
  },
  SERIES_B: {
    revenueExpected: true,
    minTRL: 7,
    minTeamSize: 25,
    fundingRoundsExpected: true,
    tractionExpected: true,
    regulatoryDetailExpected: true,
  },
  SERIES_C_PLUS: {
    revenueExpected: true,
    minTRL: 8,
    minTeamSize: 50,
    fundingRoundsExpected: true,
    tractionExpected: true,
    regulatoryDetailExpected: true,
  },
  PRE_IPO: {
    revenueExpected: true,
    minTRL: 9,
    minTeamSize: 100,
    fundingRoundsExpected: true,
    tractionExpected: true,
    regulatoryDetailExpected: true,
  },
  PUBLIC: {
    revenueExpected: true,
    minTRL: 9,
    minTeamSize: 100,
    fundingRoundsExpected: true,
    tractionExpected: true,
    regulatoryDetailExpected: true,
  },
};

// ─── Helpers ───

function isPresent(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === "string" && val.trim() === "") return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
}

function jsonArrayLength(val: unknown): number {
  if (Array.isArray(val)) return val.length;
  return 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildSubScore(
  id: string,
  name: string,
  score: number,
  weight: number,
  dataAvailable: boolean,
  rationale: string,
): IRSSubScore {
  const clamped = clamp(Math.round(score), 0, 100);
  return {
    id,
    name,
    score: clamped,
    weight,
    weightedScore: Math.round(clamped * weight),
    dataAvailable,
    rationale,
  };
}

// ─── Component Scoring Functions ───

function scoreMarketOpportunity(
  market: {
    tamValue?: number | null;
    samValue?: number | null;
    somValue?: number | null;
    marketGrowthRate?: number | null;
    whyNow?: string | null;
    marketDrivers?: unknown;
    targetCustomers?: unknown;
    customerCount?: number | null;
    pipelineValue?: number | null;
    contractedRevenue?: number | null;
    gtmStrategy?: string | null;
    salesCycle?: string | null;
    distributionChannels?: unknown;
  } | null,
  stage: CompanyStage,
): { subScores: IRSSubScore[]; dataCompleteness: number } {
  let dataFields = 0;
  let presentFields = 0;

  const checkField = (val: unknown) => {
    dataFields++;
    if (isPresent(val)) presentFields++;
  };

  // Sub-score 1: Market Size (weight 0.30)
  let marketSizeScore = 0;
  checkField(market?.tamValue);
  checkField(market?.samValue);
  checkField(market?.somValue);
  if (market?.tamValue && market.tamValue > 0) {
    marketSizeScore = 40;
    if (market.tamValue > 1e9) marketSizeScore = 70;
    if (market.tamValue > 10e9) marketSizeScore = 90;
    if (market.samValue && market.samValue > 0) marketSizeScore += 5;
    if (market.somValue && market.somValue > 0) marketSizeScore += 5;
    marketSizeScore = clamp(marketSizeScore, 0, 100);
  }

  // Sub-score 2: Market Growth (weight 0.20)
  let growthScore = 0;
  checkField(market?.marketGrowthRate);
  checkField(market?.whyNow);
  if (market?.marketGrowthRate != null) {
    if (market.marketGrowthRate >= 30) growthScore = 90;
    else if (market.marketGrowthRate >= 20) growthScore = 75;
    else if (market.marketGrowthRate >= 10) growthScore = 60;
    else if (market.marketGrowthRate >= 5) growthScore = 40;
    else growthScore = 20;
  }
  if (isPresent(market?.whyNow)) growthScore = Math.min(100, growthScore + 10);

  // Sub-score 3: Customer Validation (weight 0.25)
  let customerScore = 0;
  checkField(market?.customerCount);
  checkField(market?.pipelineValue);
  checkField(market?.contractedRevenue);
  const thresholds = STAGE_THRESHOLDS[stage];
  if (!thresholds.tractionExpected) {
    // Early-stage: any customer data is a bonus
    if (market?.customerCount && market.customerCount > 0) customerScore = 70;
    else customerScore = 40; // Not penalized at early stage
  } else {
    if (market?.customerCount && market.customerCount >= 10) customerScore = 80;
    else if (market?.customerCount && market.customerCount >= 3)
      customerScore = 60;
    else if (market?.customerCount && market.customerCount > 0)
      customerScore = 40;
    else customerScore = 10;
  }
  if (market?.pipelineValue && market.pipelineValue > 0)
    customerScore = Math.min(100, customerScore + 10);
  if (market?.contractedRevenue && market.contractedRevenue > 0)
    customerScore = Math.min(100, customerScore + 10);

  // Sub-score 4: Go-to-Market (weight 0.25)
  let gtmScore = 0;
  checkField(market?.gtmStrategy);
  checkField(market?.salesCycle);
  checkField(market?.distributionChannels);
  checkField(market?.targetCustomers);
  if (isPresent(market?.gtmStrategy)) gtmScore += 40;
  if (isPresent(market?.targetCustomers)) gtmScore += 25;
  if (isPresent(market?.salesCycle)) gtmScore += 15;
  if (isPresent(market?.distributionChannels)) gtmScore += 20;

  const dataCompleteness = dataFields > 0 ? presentFields / dataFields : 0;

  return {
    subScores: [
      buildSubScore(
        "mkt_size",
        "Market Size",
        marketSizeScore,
        0.3,
        isPresent(market?.tamValue),
        marketSizeScore > 0 ? `TAM: ${market?.tamValue}` : "TAM data missing",
      ),
      buildSubScore(
        "mkt_growth",
        "Market Growth",
        growthScore,
        0.2,
        isPresent(market?.marketGrowthRate),
        growthScore > 0 ? `Growth rate factored in` : "Growth data missing",
      ),
      buildSubScore(
        "mkt_customer",
        "Customer Validation",
        customerScore,
        0.25,
        isPresent(market?.customerCount),
        `${market?.customerCount ?? 0} customers reported`,
      ),
      buildSubScore(
        "mkt_gtm",
        "Go-to-Market Strategy",
        gtmScore,
        0.25,
        isPresent(market?.gtmStrategy),
        gtmScore > 40 ? "GTM strategy documented" : "GTM details incomplete",
      ),
    ],
    dataCompleteness,
  };
}

function scoreTechnology(
  tech: {
    trlLevel?: number | null;
    productStatus?: string | null;
    productDescription?: string | null;
    keyFeatures?: unknown;
    patents?: unknown;
    ipStrategy?: string | null;
    milestones?: unknown;
    technicalSpecs?: unknown;
    trlJustification?: string | null;
    trlEvidence?: unknown;
  } | null,
  stage: CompanyStage,
): { subScores: IRSSubScore[]; dataCompleteness: number } {
  let dataFields = 0;
  let presentFields = 0;
  const checkField = (val: unknown) => {
    dataFields++;
    if (isPresent(val)) presentFields++;
  };

  const thresholds = STAGE_THRESHOLDS[stage];

  // Sub-score 1: Technology Readiness (weight 0.35)
  let trlScore = 0;
  checkField(tech?.trlLevel);
  checkField(tech?.trlJustification);
  if (tech?.trlLevel != null) {
    const trl = tech.trlLevel;
    const minTRL = thresholds.minTRL;
    if (trl >= 9) trlScore = 100;
    else if (trl >= 7) trlScore = 85;
    else if (trl >= 5) trlScore = 65;
    else if (trl >= 3) trlScore = 45;
    else trlScore = 25;
    // Stage adjustment: if at or above minimum for stage, no penalty
    if (trl >= minTRL) trlScore = Math.max(trlScore, 50);
    if (isPresent(tech.trlJustification))
      trlScore = Math.min(100, trlScore + 5);
  }

  // Sub-score 2: Product Maturity (weight 0.25)
  let productScore = 0;
  checkField(tech?.productStatus);
  checkField(tech?.productDescription);
  checkField(tech?.keyFeatures);
  const statusScores: Record<string, number> = {
    OPERATIONAL: 100,
    PRODUCTION: 85,
    BETA: 65,
    TESTING: 50,
    PROTOTYPE: 35,
    CONCEPT: 15,
  };
  if (tech?.productStatus) {
    productScore = statusScores[tech.productStatus] ?? 30;
  }
  if (isPresent(tech?.productDescription))
    productScore = Math.min(100, productScore + 5);
  if (isPresent(tech?.keyFeatures))
    productScore = Math.min(100, productScore + 5);

  // Sub-score 3: IP & Patents (weight 0.20)
  let ipScore = 0;
  checkField(tech?.patents);
  checkField(tech?.ipStrategy);
  const patentCount = jsonArrayLength(tech?.patents);
  if (patentCount >= 3) ipScore = 80;
  else if (patentCount >= 1) ipScore = 60;
  else ipScore = 20;
  if (isPresent(tech?.ipStrategy)) ipScore = Math.min(100, ipScore + 20);

  // Sub-score 4: Technical Roadmap (weight 0.20)
  let roadmapScore = 0;
  checkField(tech?.milestones);
  checkField(tech?.technicalSpecs);
  checkField(tech?.trlEvidence);
  if (isPresent(tech?.milestones)) roadmapScore += 40;
  if (isPresent(tech?.technicalSpecs)) roadmapScore += 30;
  if (isPresent(tech?.trlEvidence)) roadmapScore += 30;

  const dataCompleteness = dataFields > 0 ? presentFields / dataFields : 0;

  return {
    subScores: [
      buildSubScore(
        "tech_trl",
        "Technology Readiness",
        trlScore,
        0.35,
        isPresent(tech?.trlLevel),
        `TRL ${tech?.trlLevel ?? "N/A"}`,
      ),
      buildSubScore(
        "tech_product",
        "Product Maturity",
        productScore,
        0.25,
        isPresent(tech?.productStatus),
        `Status: ${tech?.productStatus ?? "N/A"}`,
      ),
      buildSubScore(
        "tech_ip",
        "IP & Patents",
        ipScore,
        0.2,
        isPresent(tech?.patents) || isPresent(tech?.ipStrategy),
        `${patentCount} patent(s)`,
      ),
      buildSubScore(
        "tech_roadmap",
        "Technical Roadmap",
        roadmapScore,
        0.2,
        isPresent(tech?.milestones),
        roadmapScore > 40 ? "Roadmap documented" : "Roadmap incomplete",
      ),
    ],
    dataCompleteness,
  };
}

function scoreTeam(
  team: {
    founders?: unknown;
    cSuite?: unknown;
    keyHires?: unknown;
    boardMembers?: unknown;
    advisors?: unknown;
    teamSize?: number | null;
    engineeringRatio?: number | null;
    averageExperience?: number | null;
    keyPersonRisk?: string | null;
    hiringPlan?: unknown;
    employeeTurnover?: number | null;
    glassdoorRating?: number | null;
  } | null,
  stage: CompanyStage,
): { subScores: IRSSubScore[]; dataCompleteness: number } {
  let dataFields = 0;
  let presentFields = 0;
  const checkField = (val: unknown) => {
    dataFields++;
    if (isPresent(val)) presentFields++;
  };

  const thresholds = STAGE_THRESHOLDS[stage];

  // Sub-score 1: Founding Team (weight 0.30)
  let founderScore = 0;
  checkField(team?.founders);
  const founderCount = jsonArrayLength(team?.founders);
  if (founderCount >= 3) founderScore = 80;
  else if (founderCount >= 2) founderScore = 70;
  else if (founderCount >= 1) founderScore = 50;
  else founderScore = 10;
  if (
    isPresent(team?.averageExperience) &&
    (team?.averageExperience ?? 0) >= 10
  ) {
    founderScore = Math.min(100, founderScore + 20);
  } else if (
    isPresent(team?.averageExperience) &&
    (team?.averageExperience ?? 0) >= 5
  ) {
    founderScore = Math.min(100, founderScore + 10);
  }

  // Sub-score 2: Team Depth (weight 0.25)
  let depthScore = 0;
  checkField(team?.teamSize);
  checkField(team?.cSuite);
  checkField(team?.keyHires);
  const teamSize = team?.teamSize ?? 0;
  if (teamSize >= thresholds.minTeamSize * 2) depthScore = 90;
  else if (teamSize >= thresholds.minTeamSize) depthScore = 70;
  else if (teamSize >= Math.max(1, thresholds.minTeamSize / 2)) depthScore = 50;
  else if (teamSize > 0) depthScore = 30;
  else depthScore = 10;
  if (isPresent(team?.cSuite)) depthScore = Math.min(100, depthScore + 5);
  if (isPresent(team?.keyHires)) depthScore = Math.min(100, depthScore + 5);

  // Sub-score 3: Governance (weight 0.20)
  let governanceScore = 0;
  checkField(team?.boardMembers);
  checkField(team?.advisors);
  if (isPresent(team?.boardMembers)) governanceScore += 50;
  if (isPresent(team?.advisors)) governanceScore += 30;
  if (isPresent(team?.keyPersonRisk)) governanceScore += 20;

  // Sub-score 4: Org Health (weight 0.25)
  let healthScore = 50; // baseline
  checkField(team?.engineeringRatio);
  checkField(team?.hiringPlan);
  checkField(team?.employeeTurnover);
  checkField(team?.glassdoorRating);
  if (team?.engineeringRatio != null && team.engineeringRatio >= 0.5)
    healthScore += 15;
  if (isPresent(team?.hiringPlan)) healthScore += 15;
  if (team?.employeeTurnover != null && team.employeeTurnover < 15)
    healthScore += 10;
  if (team?.glassdoorRating != null && team.glassdoorRating >= 4.0)
    healthScore += 10;
  healthScore = clamp(healthScore, 0, 100);

  const dataCompleteness = dataFields > 0 ? presentFields / dataFields : 0;

  return {
    subScores: [
      buildSubScore(
        "team_founders",
        "Founding Team",
        founderScore,
        0.3,
        isPresent(team?.founders),
        `${founderCount} founder(s)`,
      ),
      buildSubScore(
        "team_depth",
        "Team Depth",
        depthScore,
        0.25,
        isPresent(team?.teamSize),
        `${teamSize} employees`,
      ),
      buildSubScore(
        "team_governance",
        "Governance",
        governanceScore,
        0.2,
        isPresent(team?.boardMembers),
        governanceScore >= 50 ? "Board in place" : "Governance gaps",
      ),
      buildSubScore(
        "team_health",
        "Organizational Health",
        healthScore,
        0.25,
        isPresent(team?.engineeringRatio),
        `Health score: ${healthScore}`,
      ),
    ],
    dataCompleteness,
  };
}

function scoreFinancial(
  financial: {
    annualRevenue?: number | null;
    revenueGrowthYoY?: number | null;
    monthlyBurnRate?: number | null;
    runway?: number | null;
    grossMargin?: number | null;
    cashPosition?: number | null;
    revenueModel?: string | null;
    revenueStreams?: unknown;
    unitEconomics?: unknown;
    totalRaised?: number | null;
    fundingRounds?: unknown;
    currentValuation?: number | null;
    isRaising?: boolean;
    targetRaise?: number | null;
    targetValuation?: number | null;
    useOfFunds?: unknown;
    revenueProjections?: unknown;
    profitabilityTimeline?: string | null;
    breakEvenDate?: unknown;
  } | null,
  stage: CompanyStage,
): { subScores: IRSSubScore[]; dataCompleteness: number } {
  let dataFields = 0;
  let presentFields = 0;
  const checkField = (val: unknown) => {
    dataFields++;
    if (isPresent(val)) presentFields++;
  };

  const thresholds = STAGE_THRESHOLDS[stage];

  // Sub-score 1: Revenue & Growth (weight 0.25)
  let revenueScore = 0;
  checkField(financial?.annualRevenue);
  checkField(financial?.revenueGrowthYoY);
  checkField(financial?.revenueModel);
  if (!thresholds.revenueExpected) {
    // Early stage: no revenue penalty
    revenueScore = 50;
    if (financial?.annualRevenue && financial.annualRevenue > 0)
      revenueScore = 80;
  } else {
    if (financial?.annualRevenue && financial.annualRevenue > 0) {
      revenueScore = 50;
      if (
        financial.revenueGrowthYoY != null &&
        financial.revenueGrowthYoY > 100
      )
        revenueScore = 90;
      else if (
        financial.revenueGrowthYoY != null &&
        financial.revenueGrowthYoY > 50
      )
        revenueScore = 75;
      else if (
        financial.revenueGrowthYoY != null &&
        financial.revenueGrowthYoY > 0
      )
        revenueScore = 60;
    } else {
      revenueScore = 15;
    }
  }
  if (isPresent(financial?.revenueModel))
    revenueScore = Math.min(100, revenueScore + 10);

  // Sub-score 2: Cash & Runway (weight 0.25)
  let cashScore = 0;
  checkField(financial?.runway);
  checkField(financial?.monthlyBurnRate);
  checkField(financial?.cashPosition);
  if (financial?.runway != null) {
    if (financial.runway >= 24) cashScore = 95;
    else if (financial.runway >= 18) cashScore = 80;
    else if (financial.runway >= 12) cashScore = 65;
    else if (financial.runway >= 6) cashScore = 40;
    else cashScore = 15;
  }

  // Sub-score 3: Fundraising Track Record (weight 0.25)
  let fundraisingScore = 0;
  checkField(financial?.totalRaised);
  checkField(financial?.fundingRounds);
  checkField(financial?.targetRaise);
  if (!thresholds.fundingRoundsExpected) {
    fundraisingScore = 50; // Not penalized
    if (isPresent(financial?.totalRaised)) fundraisingScore = 70;
  } else {
    const roundCount = jsonArrayLength(financial?.fundingRounds);
    if (roundCount >= 3) fundraisingScore = 85;
    else if (roundCount >= 2) fundraisingScore = 70;
    else if (roundCount >= 1) fundraisingScore = 55;
    else fundraisingScore = 20;
    if (isPresent(financial?.targetRaise))
      fundraisingScore = Math.min(100, fundraisingScore + 10);
  }

  // Sub-score 4: Unit Economics & Projections (weight 0.25)
  let economicsScore = 0;
  checkField(financial?.grossMargin);
  checkField(financial?.unitEconomics);
  checkField(financial?.revenueProjections);
  checkField(financial?.useOfFunds);
  if (financial?.grossMargin != null) {
    if (financial.grossMargin >= 70) economicsScore = 80;
    else if (financial.grossMargin >= 50) economicsScore = 65;
    else if (financial.grossMargin >= 30) economicsScore = 45;
    else economicsScore = 25;
  }
  if (isPresent(financial?.unitEconomics))
    economicsScore = Math.min(100, economicsScore + 10);
  if (isPresent(financial?.revenueProjections))
    economicsScore = Math.min(100, economicsScore + 5);
  if (isPresent(financial?.useOfFunds))
    economicsScore = Math.min(100, economicsScore + 5);

  const dataCompleteness = dataFields > 0 ? presentFields / dataFields : 0;

  return {
    subScores: [
      buildSubScore(
        "fin_revenue",
        "Revenue & Growth",
        revenueScore,
        0.25,
        isPresent(financial?.annualRevenue),
        thresholds.revenueExpected
          ? `Revenue: ${financial?.annualRevenue ?? "N/A"}`
          : "Pre-revenue stage",
      ),
      buildSubScore(
        "fin_cash",
        "Cash & Runway",
        cashScore,
        0.25,
        isPresent(financial?.runway),
        `${financial?.runway ?? "N/A"} months runway`,
      ),
      buildSubScore(
        "fin_fundraising",
        "Fundraising Track Record",
        fundraisingScore,
        0.25,
        isPresent(financial?.fundingRounds),
        `${jsonArrayLength(financial?.fundingRounds)} round(s)`,
      ),
      buildSubScore(
        "fin_economics",
        "Unit Economics & Projections",
        economicsScore,
        0.25,
        isPresent(financial?.grossMargin),
        financial?.grossMargin != null
          ? `Margin: ${financial.grossMargin}%`
          : "Margin data missing",
      ),
    ],
    dataCompleteness,
  };
}

function scoreRegulatory(
  regulatory: {
    complyLinked?: boolean;
    rrsScore?: number | null;
    rrsComponents?: unknown;
    jurisdictions?: string[];
    authorizationStatus?: string | null;
    nis2Status?: string | null;
    spaceDebrisCompliance?: string | null;
    insuranceStatus?: string | null;
    regulatoryMoatDescription?: string | null;
    barrierToEntry?: string | null;
    timeToReplicate?: string | null;
    regulatoryRisks?: unknown;
  } | null,
  stage: CompanyStage,
): {
  subScores: IRSSubScore[];
  dataCompleteness: number;
  complyLinked: boolean;
} {
  let dataFields = 0;
  let presentFields = 0;
  const checkField = (val: unknown) => {
    dataFields++;
    if (isPresent(val)) presentFields++;
  };

  const thresholds = STAGE_THRESHOLDS[stage];
  const complyLinked = regulatory?.complyLinked ?? false;

  // Sub-score 1: Compliance Posture (weight 0.30)
  let complianceScore = 0;
  checkField(regulatory?.rrsScore);
  checkField(regulatory?.authorizationStatus);
  checkField(regulatory?.nis2Status);
  if (regulatory?.rrsScore != null) {
    complianceScore = clamp(regulatory.rrsScore, 0, 100);
  } else if (!thresholds.regulatoryDetailExpected) {
    complianceScore = 40; // Not penalized at early stage
  } else {
    complianceScore = 10;
  }

  // Sub-score 2: Jurisdictional Coverage (weight 0.20)
  let jurisdictionScore = 0;
  checkField(regulatory?.jurisdictions);
  const jurisdictionCount = regulatory?.jurisdictions?.length ?? 0;
  if (jurisdictionCount >= 3) jurisdictionScore = 85;
  else if (jurisdictionCount >= 2) jurisdictionScore = 70;
  else if (jurisdictionCount >= 1) jurisdictionScore = 55;
  else if (!thresholds.regulatoryDetailExpected) jurisdictionScore = 40;
  else jurisdictionScore = 15;

  // Sub-score 3: Regulatory Moat (weight 0.25)
  let moatScore = 0;
  checkField(regulatory?.regulatoryMoatDescription);
  checkField(regulatory?.barrierToEntry);
  checkField(regulatory?.timeToReplicate);
  if (isPresent(regulatory?.regulatoryMoatDescription)) moatScore += 40;
  if (isPresent(regulatory?.barrierToEntry)) moatScore += 30;
  if (isPresent(regulatory?.timeToReplicate)) moatScore += 30;

  // Sub-score 4: Risk Management (weight 0.25)
  let riskMgmtScore = 0;
  checkField(regulatory?.spaceDebrisCompliance);
  checkField(regulatory?.insuranceStatus);
  checkField(regulatory?.regulatoryRisks);
  if (isPresent(regulatory?.spaceDebrisCompliance)) riskMgmtScore += 35;
  if (isPresent(regulatory?.insuranceStatus)) riskMgmtScore += 35;
  if (isPresent(regulatory?.regulatoryRisks)) riskMgmtScore += 30;

  const dataCompleteness = dataFields > 0 ? presentFields / dataFields : 0;

  return {
    subScores: [
      buildSubScore(
        "reg_compliance",
        "Compliance Posture",
        complianceScore,
        0.3,
        isPresent(regulatory?.rrsScore),
        regulatory?.rrsScore != null
          ? `RRS: ${regulatory.rrsScore}`
          : "No RRS score",
      ),
      buildSubScore(
        "reg_jurisdiction",
        "Jurisdictional Coverage",
        jurisdictionScore,
        0.2,
        jurisdictionCount > 0,
        `${jurisdictionCount} jurisdiction(s)`,
      ),
      buildSubScore(
        "reg_moat",
        "Regulatory Moat",
        moatScore,
        0.25,
        isPresent(regulatory?.regulatoryMoatDescription),
        moatScore >= 40 ? "Moat documented" : "Moat details missing",
      ),
      buildSubScore(
        "reg_risk",
        "Risk Management",
        riskMgmtScore,
        0.25,
        isPresent(regulatory?.regulatoryRisks),
        riskMgmtScore >= 50 ? "Risks documented" : "Risk data incomplete",
      ),
    ],
    dataCompleteness,
    complyLinked,
  };
}

function scoreTraction(
  traction: {
    keyMetrics?: unknown;
    milestonesAchieved?: unknown;
    partnerships?: unknown;
    lois?: number | null;
    signedContracts?: number | null;
    pilotPrograms?: number | null;
    awards?: unknown;
    mediaFeatures?: unknown;
    conferences?: unknown;
    upcomingMilestones?: unknown;
  } | null,
  stage: CompanyStage,
): { subScores: IRSSubScore[]; dataCompleteness: number } {
  let dataFields = 0;
  let presentFields = 0;
  const checkField = (val: unknown) => {
    dataFields++;
    if (isPresent(val)) presentFields++;
  };

  const thresholds = STAGE_THRESHOLDS[stage];

  // Sub-score 1: Commercial Traction (weight 0.35)
  let commercialScore = 0;
  checkField(traction?.signedContracts);
  checkField(traction?.lois);
  checkField(traction?.pilotPrograms);
  const contracts = traction?.signedContracts ?? 0;
  const lois = traction?.lois ?? 0;
  const pilots = traction?.pilotPrograms ?? 0;
  if (!thresholds.tractionExpected) {
    commercialScore = 40; // baseline for early stage
    if (contracts > 0 || lois > 0 || pilots > 0) commercialScore = 70;
  } else {
    if (contracts >= 5) commercialScore = 85;
    else if (contracts >= 2) commercialScore = 65;
    else if (contracts >= 1) commercialScore = 50;
    else if (lois > 0 || pilots > 0) commercialScore = 35;
    else commercialScore = 10;
  }
  if (lois > 0) commercialScore = Math.min(100, commercialScore + 5);
  if (pilots > 0) commercialScore = Math.min(100, commercialScore + 5);

  // Sub-score 2: Milestones & Partnerships (weight 0.25)
  let milestoneScore = 0;
  checkField(traction?.milestonesAchieved);
  checkField(traction?.partnerships);
  const milestoneCount = jsonArrayLength(traction?.milestonesAchieved);
  const partnerCount = jsonArrayLength(traction?.partnerships);
  if (milestoneCount >= 5) milestoneScore = 70;
  else if (milestoneCount >= 2) milestoneScore = 50;
  else if (milestoneCount >= 1) milestoneScore = 30;
  if (partnerCount >= 3) milestoneScore = Math.min(100, milestoneScore + 30);
  else if (partnerCount >= 1)
    milestoneScore = Math.min(100, milestoneScore + 15);

  // Sub-score 3: Market Recognition (weight 0.20)
  let recognitionScore = 0;
  checkField(traction?.awards);
  checkField(traction?.mediaFeatures);
  checkField(traction?.conferences);
  if (isPresent(traction?.awards)) recognitionScore += 35;
  if (isPresent(traction?.mediaFeatures)) recognitionScore += 35;
  if (isPresent(traction?.conferences)) recognitionScore += 30;

  // Sub-score 4: Forward Momentum (weight 0.20)
  let momentumScore = 0;
  checkField(traction?.keyMetrics);
  checkField(traction?.upcomingMilestones);
  if (isPresent(traction?.keyMetrics)) momentumScore += 50;
  if (isPresent(traction?.upcomingMilestones)) momentumScore += 50;

  const dataCompleteness = dataFields > 0 ? presentFields / dataFields : 0;

  return {
    subScores: [
      buildSubScore(
        "trac_commercial",
        "Commercial Traction",
        commercialScore,
        0.35,
        contracts > 0 || lois > 0,
        `${contracts} contract(s), ${lois} LOI(s)`,
      ),
      buildSubScore(
        "trac_milestones",
        "Milestones & Partnerships",
        milestoneScore,
        0.25,
        milestoneCount > 0,
        `${milestoneCount} milestone(s), ${partnerCount} partner(s)`,
      ),
      buildSubScore(
        "trac_recognition",
        "Market Recognition",
        recognitionScore,
        0.2,
        isPresent(traction?.awards),
        recognitionScore >= 50
          ? "Recognition documented"
          : "Limited recognition data",
      ),
      buildSubScore(
        "trac_momentum",
        "Forward Momentum",
        momentumScore,
        0.2,
        isPresent(traction?.keyMetrics),
        momentumScore >= 50 ? "Metrics tracked" : "Limited forward data",
      ),
    ],
    dataCompleteness,
  };
}

// ─── Consistency Checks ───

function runConsistencyChecks(profile: {
  stage: CompanyStage;
  financialProfile: {
    annualRevenue?: number | null;
    runway?: number | null;
    totalRaised?: number | null;
  } | null;
  techProfile: {
    trlLevel?: number | null;
    productStatus?: string | null;
  } | null;
  teamProfile: { teamSize?: number | null; founders?: unknown } | null;
  marketProfile: {
    tamValue?: number | null;
    customerCount?: number | null;
  } | null;
  tractionProfile: { signedContracts?: number | null } | null;
}): ConsistencyCheck[] {
  const checks: ConsistencyCheck[] = [];

  // Check 1: Series A+ but zero revenue
  const isPostSeed = [
    "SERIES_A",
    "SERIES_B",
    "SERIES_C_PLUS",
    "PRE_IPO",
    "PUBLIC",
  ].includes(profile.stage);
  const hasRevenue = (profile.financialProfile?.annualRevenue ?? 0) > 0;
  checks.push({
    id: "CC-001",
    description: "Series A+ stage should have revenue",
    passed: !isPostSeed || hasRevenue,
    penalty: isPostSeed && !hasRevenue ? 5 : 0,
    affectedComponent: "financial",
  });

  // Check 2: High TRL but product status is CONCEPT
  const highTRL = (profile.techProfile?.trlLevel ?? 0) >= 6;
  const conceptStatus = profile.techProfile?.productStatus === "CONCEPT";
  checks.push({
    id: "CC-002",
    description: "High TRL (6+) should not have CONCEPT product status",
    passed: !highTRL || !conceptStatus,
    penalty: highTRL && conceptStatus ? 5 : 0,
    affectedComponent: "technology",
  });

  // Check 3: Claiming customers but no contracts in traction
  const hasCustomers = (profile.marketProfile?.customerCount ?? 0) > 5;
  const hasContracts = (profile.tractionProfile?.signedContracts ?? 0) > 0;
  checks.push({
    id: "CC-003",
    description: "Multiple customers should have signed contracts",
    passed: !hasCustomers || hasContracts,
    penalty: hasCustomers && !hasContracts ? 3 : 0,
    affectedComponent: "traction",
  });

  // Check 4: Large team but no founders documented
  const largeTeam = (profile.teamProfile?.teamSize ?? 0) >= 20;
  const hasFounders = jsonArrayLength(profile.teamProfile?.founders) > 0;
  checks.push({
    id: "CC-004",
    description: "Team of 20+ should have founders documented",
    passed: !largeTeam || hasFounders,
    penalty: largeTeam && !hasFounders ? 4 : 0,
    affectedComponent: "team",
  });

  // Check 5: Short runway but not actively raising
  const shortRunway = (profile.financialProfile?.runway ?? 99) < 6;
  const notRaising = !(
    profile.financialProfile as { isRaising?: boolean } | null
  )?.isRaising;
  checks.push({
    id: "CC-005",
    description: "Runway under 6 months should be actively raising",
    passed: !shortRunway || !notRaising,
    penalty: shortRunway && notRaising ? 4 : 0,
    affectedComponent: "financial",
  });

  // Check 6: Large TAM but no go-to-market described
  const largeTAM = (profile.marketProfile?.tamValue ?? 0) > 1e9;
  const noCustomers = (profile.marketProfile?.customerCount ?? 0) === 0;
  checks.push({
    id: "CC-006",
    description:
      "Billion-dollar TAM with zero customers raises credibility concern",
    passed: !largeTAM || !noCustomers || !isPostSeed,
    penalty: largeTAM && noCustomers && isPostSeed ? 3 : 0,
    affectedComponent: "market",
  });

  return checks;
}

// ─── Improvement Plan ───

function generateImprovementPlan(
  components: IRSComponentScore[],
): ImprovementAction[] {
  const actions: ImprovementAction[] = [];

  const fieldMapping: Record<string, string[]> = {
    mkt_size: ["tamValue", "samValue", "somValue"],
    mkt_growth: ["marketGrowthRate", "whyNow"],
    mkt_customer: ["customerCount", "pipelineValue", "contractedRevenue"],
    mkt_gtm: [
      "gtmStrategy",
      "targetCustomers",
      "salesCycle",
      "distributionChannels",
    ],
    tech_trl: ["trlLevel", "trlJustification", "trlEvidence"],
    tech_product: ["productStatus", "productDescription", "keyFeatures"],
    tech_ip: ["patents", "ipStrategy"],
    tech_roadmap: ["milestones", "technicalSpecs"],
    team_founders: ["founders", "averageExperience"],
    team_depth: ["teamSize", "cSuite", "keyHires"],
    team_governance: ["boardMembers", "advisors", "keyPersonRisk"],
    team_health: ["engineeringRatio", "hiringPlan", "employeeTurnover"],
    fin_revenue: ["annualRevenue", "revenueGrowthYoY", "revenueModel"],
    fin_cash: ["runway", "monthlyBurnRate", "cashPosition"],
    fin_fundraising: ["totalRaised", "fundingRounds", "targetRaise"],
    fin_economics: [
      "grossMargin",
      "unitEconomics",
      "revenueProjections",
      "useOfFunds",
    ],
    reg_compliance: ["rrsScore", "authorizationStatus", "nis2Status"],
    reg_jurisdiction: ["jurisdictions"],
    reg_moat: [
      "regulatoryMoatDescription",
      "barrierToEntry",
      "timeToReplicate",
    ],
    reg_risk: ["spaceDebrisCompliance", "insuranceStatus", "regulatoryRisks"],
    trac_commercial: ["signedContracts", "lois", "pilotPrograms"],
    trac_milestones: ["milestonesAchieved", "partnerships"],
    trac_recognition: ["awards", "mediaFeatures", "conferences"],
    trac_momentum: ["keyMetrics", "upcomingMilestones"],
  };

  const effortMapping: Record<string, "LOW" | "MEDIUM" | "HIGH"> = {
    mkt_size: "MEDIUM",
    mkt_growth: "LOW",
    mkt_customer: "HIGH",
    mkt_gtm: "MEDIUM",
    tech_trl: "HIGH",
    tech_product: "MEDIUM",
    tech_ip: "HIGH",
    tech_roadmap: "MEDIUM",
    team_founders: "LOW",
    team_depth: "HIGH",
    team_governance: "MEDIUM",
    team_health: "MEDIUM",
    fin_revenue: "HIGH",
    fin_cash: "LOW",
    fin_fundraising: "MEDIUM",
    fin_economics: "MEDIUM",
    reg_compliance: "HIGH",
    reg_jurisdiction: "LOW",
    reg_moat: "MEDIUM",
    reg_risk: "MEDIUM",
    trac_commercial: "HIGH",
    trac_milestones: "MEDIUM",
    trac_recognition: "MEDIUM",
    trac_momentum: "LOW",
  };

  const timeframeMapping: Record<string, string> = {
    LOW: "1-2 weeks",
    MEDIUM: "2-4 weeks",
    HIGH: "1-3 months",
  };

  let priority = 0;

  for (const component of components) {
    if (component.adjustedScore >= 70) continue;

    // Find lowest sub-scores
    const weakSubScores = [...component.subScores]
      .sort((a, b) => a.score - b.score)
      .filter((ss) => ss.score < 70);

    for (const ss of weakSubScores) {
      priority++;
      const effort = effortMapping[ss.id] || "MEDIUM";
      const targetScore = Math.min(80, ss.score + 30);
      const impact = Math.round(
        (targetScore - ss.score) * ss.weight * component.weight,
      );

      actions.push({
        component: component.component,
        componentLabel: component.label,
        subScore: ss.id,
        subScoreLabel: ss.name,
        currentScore: ss.score,
        targetScore,
        profileFields: fieldMapping[ss.id] || [],
        estimatedImpact: impact,
        effort,
        timeframe: timeframeMapping[effort],
        priority,
      });
    }
  }

  // Sort by estimated impact descending
  actions.sort((a, b) => b.estimatedImpact - a.estimatedImpact);

  // Re-assign priority after sorting
  return actions.map((a, idx) => ({ ...a, priority: idx + 1 }));
}

// ─── Main Computation ───

/**
 * Compute the Investment Readiness Score for an organization.
 * Deterministic: same DB state produces the same score.
 */
export async function computeIRS(organizationId: string): Promise<IRSResult> {
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

  if (!profile) {
    // Return a zero-score result if no profile exists
    const zeroGrade = mapScoreToGrade(0);
    return {
      overallScore: 0,
      grade: zeroGrade.grade,
      gradeLabel: zeroGrade.label,
      components: [],
      consistencyChecks: [],
      topStrengths: [],
      topWeaknesses: [],
      improvementPlan: [],
      profileCompleteness: 0,
      stage: "SEED" as CompanyStage,
      computedAt: now,
    };
  }

  const stage = profile.stage;

  // Score each component
  const marketResult = scoreMarketOpportunity(profile.marketProfile, stage);
  const techResult = scoreTechnology(profile.techProfile, stage);
  const teamResult = scoreTeam(profile.teamProfile, stage);
  const financialResult = scoreFinancial(profile.financialProfile, stage);
  const regulatoryResult = scoreRegulatory(profile.regulatoryProfile, stage);
  const tractionResult = scoreTraction(profile.tractionProfile, stage);

  // Build component scores with data completeness penalty
  function buildComponent(
    key: string,
    label: string,
    weight: number,
    subScores: IRSSubScore[],
    dataCompleteness: number,
    bonusPoints: number = 0,
  ): IRSComponentScore {
    const rawScore = subScores.reduce((sum, ss) => sum + ss.weightedScore, 0);
    let adjustedScore = rawScore + bonusPoints;

    // Data completeness penalty: <30% data → cap at 30
    if (dataCompleteness < 0.3) {
      adjustedScore = Math.min(adjustedScore, 30);
    }
    adjustedScore = clamp(adjustedScore, 0, 100);

    return {
      component: key,
      label,
      weight,
      rawScore,
      adjustedScore,
      weightedScore: Math.round(adjustedScore * weight),
      dataCompleteness: Math.round(dataCompleteness * 100) / 100,
      subScores,
    };
  }

  // Apply Comply bonus to regulatory component
  const complyBonus = regulatoryResult.complyLinked ? 5 : 0;

  const components: IRSComponentScore[] = [
    buildComponent(
      "market",
      "Market Opportunity",
      COMPONENT_WEIGHTS.market,
      marketResult.subScores,
      marketResult.dataCompleteness,
    ),
    buildComponent(
      "technology",
      "Technology & Product",
      COMPONENT_WEIGHTS.technology,
      techResult.subScores,
      techResult.dataCompleteness,
    ),
    buildComponent(
      "team",
      "Team & Leadership",
      COMPONENT_WEIGHTS.team,
      teamResult.subScores,
      teamResult.dataCompleteness,
    ),
    buildComponent(
      "financial",
      "Financial Health",
      COMPONENT_WEIGHTS.financial,
      financialResult.subScores,
      financialResult.dataCompleteness,
    ),
    buildComponent(
      "regulatory",
      "Regulatory Position",
      COMPONENT_WEIGHTS.regulatory,
      regulatoryResult.subScores,
      regulatoryResult.dataCompleteness,
      complyBonus,
    ),
    buildComponent(
      "traction",
      "Traction & Validation",
      COMPONENT_WEIGHTS.traction,
      tractionResult.subScores,
      tractionResult.dataCompleteness,
    ),
  ];

  // Run consistency checks
  const consistencyChecks = runConsistencyChecks({
    stage,
    financialProfile: profile.financialProfile,
    techProfile: profile.techProfile,
    teamProfile: profile.teamProfile,
    marketProfile: profile.marketProfile,
    tractionProfile: profile.tractionProfile,
  });

  // Apply consistency penalties
  for (const check of consistencyChecks) {
    if (!check.passed && check.penalty > 0) {
      const comp = components.find(
        (c) => c.component === check.affectedComponent,
      );
      if (comp) {
        comp.adjustedScore = clamp(comp.adjustedScore - check.penalty, 0, 100);
        comp.weightedScore = Math.round(comp.adjustedScore * comp.weight);
      }
    }
  }

  // Compute overall score
  const overallScore = clamp(
    Math.round(components.reduce((sum, c) => sum + c.weightedScore, 0)),
    0,
    100,
  );

  // Grade mapping
  const { grade, label: gradeLabel } = mapScoreToGrade(overallScore);

  // Profile completeness (average of all component data completeness)
  const profileCompleteness =
    components.length > 0
      ? Math.round(
          (components.reduce((sum, c) => sum + c.dataCompleteness, 0) /
            components.length) *
            100,
        ) / 100
      : 0;

  // Top strengths and weaknesses
  const sorted = [...components].sort(
    (a, b) => b.adjustedScore - a.adjustedScore,
  );
  const topStrengths = sorted.slice(0, 3).map((c) => ({
    component: c.component,
    label: c.label,
    score: c.adjustedScore,
  }));
  const topWeaknesses = sorted
    .slice(-3)
    .reverse()
    .map((c) => ({
      component: c.component,
      label: c.label,
      score: c.adjustedScore,
    }));

  // Improvement plan
  const improvementPlan = generateImprovementPlan(components);

  return {
    overallScore,
    grade,
    gradeLabel,
    components,
    consistencyChecks,
    topStrengths,
    topWeaknesses,
    improvementPlan,
    profileCompleteness,
    stage,
    computedAt: now,
  };
}

// ─── Persistence ───

/**
 * Compute and save the IRS to the database.
 */
export async function computeAndSaveIRS(
  organizationId: string,
): Promise<IRSResult> {
  const result = await computeIRS(organizationId);

  await prisma.investmentReadinessScore.create({
    data: {
      organizationId,
      overallScore: result.overallScore,
      grade: result.grade,
      components: structuredClone(result.components),
      topStrengths: structuredClone(result.topStrengths),
      topWeaknesses: structuredClone(result.topWeaknesses),
      improvementPlan: structuredClone(result.improvementPlan),
      profileCompleteness: result.profileCompleteness,
      stage: result.stage,
      computedAt: result.computedAt,
    },
  });

  return result;
}
