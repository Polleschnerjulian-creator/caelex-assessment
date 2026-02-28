/**
 * Client-side IRS preview calculator for the onboarding wizard.
 * Lightweight mirror of irs-engine.server.ts — deterministic, no DB, no API.
 */

export interface IRSPreviewInput {
  // Step 1: Company Identity
  companyName?: string;
  stage?: string;
  operatorType?: string;
  oneLiner?: string;

  // Step 2: Market & Technology
  tam?: number;
  sam?: number;
  som?: number;
  trl?: number;
  patentCount?: number;
  productStage?: string;

  // Step 3: Team
  founderCount?: number;
  hasSpaceBackground?: boolean;
  keyHiresCount?: number;
  advisorCount?: number;

  // Step 4: Financials
  mrr?: number;
  burnRate?: number;
  runwayMonths?: number;
  previousFunding?: number;

  // Step 5: Comply Integration
  complyLinked?: boolean;
  assessmentsCompleted?: number;
  complianceScore?: number;

  // Step 6: Fundraising
  targetRaise?: number;
  roundType?: string;
}

export interface IRSPreviewComponent {
  id: string;
  label: string;
  score: number;
  weight: number;
  weightedScore: number;
  dataAvailable: boolean;
}

export interface IRSPreviewResult {
  overallScore: number;
  grade: string;
  gradeLabel: string;
  components: IRSPreviewComponent[];
  delta: number;
}

const WEIGHTS = {
  market: 0.2,
  technology: 0.2,
  team: 0.15,
  financial: 0.15,
  regulatory: 0.15,
  traction: 0.15,
} as const;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function scoreMarket(input: IRSPreviewInput): {
  score: number;
  available: boolean;
} {
  let score = 0;
  let fields = 0;
  let filled = 0;

  fields++;
  if (input.tam && input.tam > 0) {
    filled++;
    score +=
      input.tam >= 1_000_000_000 ? 30 : input.tam >= 100_000_000 ? 20 : 10;
  }
  fields++;
  if (input.sam && input.sam > 0) {
    filled++;
    score += input.sam >= 100_000_000 ? 20 : input.sam >= 10_000_000 ? 15 : 8;
  }
  fields++;
  if (input.som && input.som > 0) {
    filled++;
    score += input.som >= 10_000_000 ? 20 : input.som >= 1_000_000 ? 15 : 8;
  }
  fields++;
  if (input.stage) {
    filled++;
    score += 10;
  }

  const completeness = fields > 0 ? filled / fields : 0;
  if (completeness < 0.3)
    return { score: Math.min(score, 30), available: filled > 0 };
  return { score: clamp(score, 0, 100), available: filled > 0 };
}

function scoreTechnology(input: IRSPreviewInput): {
  score: number;
  available: boolean;
} {
  let score = 0;
  let filled = 0;

  if (input.trl && input.trl > 0) {
    filled++;
    score += Math.min(input.trl * 10, 40);
  }
  if (input.patentCount && input.patentCount > 0) {
    filled++;
    score += Math.min(input.patentCount * 10, 30);
  }
  if (input.productStage) {
    filled++;
    const stages: Record<string, number> = {
      concept: 5,
      prototype: 15,
      mvp: 25,
      beta: 30,
      revenue: 30,
    };
    score += stages[input.productStage] || 10;
  }

  return { score: clamp(score, 0, 100), available: filled > 0 };
}

function scoreTeam(input: IRSPreviewInput): {
  score: number;
  available: boolean;
} {
  let score = 0;
  let filled = 0;

  if (input.founderCount && input.founderCount > 0) {
    filled++;
    score += input.founderCount >= 2 ? 25 : 15;
  }
  if (input.hasSpaceBackground) {
    filled++;
    score += 25;
  }
  if (input.keyHiresCount && input.keyHiresCount > 0) {
    filled++;
    score += Math.min(input.keyHiresCount * 5, 25);
  }
  if (input.advisorCount && input.advisorCount > 0) {
    filled++;
    score += Math.min(input.advisorCount * 5, 25);
  }

  return { score: clamp(score, 0, 100), available: filled > 0 };
}

function scoreFinancial(input: IRSPreviewInput): {
  score: number;
  available: boolean;
} {
  let score = 0;
  let filled = 0;

  if (input.mrr && input.mrr > 0) {
    filled++;
    score += input.mrr >= 50_000 ? 30 : input.mrr >= 10_000 ? 20 : 10;
  }
  if (input.runwayMonths && input.runwayMonths > 0) {
    filled++;
    score += input.runwayMonths >= 18 ? 30 : input.runwayMonths >= 12 ? 20 : 10;
  }
  if (input.burnRate && input.burnRate > 0) {
    filled++;
    score += 15;
  }
  if (input.previousFunding && input.previousFunding > 0) {
    filled++;
    score += 15;
  }

  return { score: clamp(score, 0, 100), available: filled > 0 };
}

function scoreRegulatory(input: IRSPreviewInput): {
  score: number;
  available: boolean;
} {
  let score = 0;
  let filled = 0;

  if (input.complyLinked) {
    filled++;
    score += 20;
  }
  if (input.assessmentsCompleted && input.assessmentsCompleted > 0) {
    filled++;
    score += Math.min(input.assessmentsCompleted * 15, 40);
  }
  if (input.complianceScore && input.complianceScore > 0) {
    filled++;
    score += Math.round(input.complianceScore * 0.4);
  }

  return { score: clamp(score, 0, 100), available: filled > 0 };
}

function scoreTraction(input: IRSPreviewInput): {
  score: number;
  available: boolean;
} {
  let score = 0;
  let filled = 0;

  if (input.mrr && input.mrr > 0) {
    filled++;
    score += 30;
  }
  if (input.targetRaise && input.targetRaise > 0) {
    filled++;
    score += 20;
  }
  if (input.operatorType) {
    filled++;
    score += 15;
  }

  return { score: clamp(score, 0, 100), available: filled > 0 };
}

function getGrade(score: number): { grade: string; label: string } {
  if (score >= 90) return { grade: "A+", label: "Exceptional" };
  if (score >= 80) return { grade: "A", label: "Excellent" };
  if (score >= 70) return { grade: "A-", label: "Very Strong" };
  if (score >= 60) return { grade: "B+", label: "Strong" };
  if (score >= 50) return { grade: "B", label: "Good" };
  if (score >= 40) return { grade: "B-", label: "Developing" };
  if (score >= 30) return { grade: "C+", label: "Early Stage" };
  if (score >= 20) return { grade: "C", label: "Needs Work" };
  return { grade: "C-", label: "Getting Started" };
}

let lastScore = 0;

export function calculateIRSPreview(input: IRSPreviewInput): IRSPreviewResult {
  const market = scoreMarket(input);
  const technology = scoreTechnology(input);
  const team = scoreTeam(input);
  const financial = scoreFinancial(input);
  const regulatory = scoreRegulatory(input);
  const traction = scoreTraction(input);

  const components: IRSPreviewComponent[] = [
    {
      id: "market",
      label: "Market & Opportunity",
      score: market.score,
      weight: WEIGHTS.market,
      weightedScore: market.score * WEIGHTS.market,
      dataAvailable: market.available,
    },
    {
      id: "technology",
      label: "Technology & Product",
      score: technology.score,
      weight: WEIGHTS.technology,
      weightedScore: technology.score * WEIGHTS.technology,
      dataAvailable: technology.available,
    },
    {
      id: "team",
      label: "Team & Leadership",
      score: team.score,
      weight: WEIGHTS.team,
      weightedScore: team.score * WEIGHTS.team,
      dataAvailable: team.available,
    },
    {
      id: "financial",
      label: "Financial Health",
      score: financial.score,
      weight: WEIGHTS.financial,
      weightedScore: financial.score * WEIGHTS.financial,
      dataAvailable: financial.available,
    },
    {
      id: "regulatory",
      label: "Regulatory Position",
      score: regulatory.score,
      weight: WEIGHTS.regulatory,
      weightedScore: regulatory.score * WEIGHTS.regulatory,
      dataAvailable: regulatory.available,
    },
    {
      id: "traction",
      label: "Traction & Validation",
      score: traction.score,
      weight: WEIGHTS.traction,
      weightedScore: traction.score * WEIGHTS.traction,
      dataAvailable: traction.available,
    },
  ];

  const overallScore = Math.round(
    components.reduce((sum, c) => sum + c.weightedScore, 0),
  );
  const { grade, label } = getGrade(overallScore);
  const delta = overallScore - lastScore;
  lastScore = overallScore;

  return { overallScore, grade, gradeLabel: label, components, delta };
}
