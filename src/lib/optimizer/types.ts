import type {
  SpaceLawActivityType,
  EntityNationality,
  SpaceLawCountryCode,
} from "@/lib/space-law-types";

// ── Input ─────────────────────────────────────────────────────────

export interface OptimizationInput {
  // Satellite Specs
  activityType: SpaceLawActivityType;
  entityNationality: EntityNationality;
  entitySize: "small" | "medium" | "large";
  primaryOrbit: "LEO" | "MEO" | "GEO" | "beyond";
  constellationSize: number;
  missionDurationYears: number;
  hasDesignForDemise: boolean;

  // Optimization Preferences
  weightProfile: WeightProfileName;
  customWeights?: OptimizationWeights;

  // Re-Flagging Context (optional)
  currentJurisdiction?: SpaceLawCountryCode;
  currentNoradId?: string;
}

export type WeightProfileName =
  | "startup"
  | "enterprise"
  | "government"
  | "balanced"
  | "custom";

export interface OptimizationWeights {
  timeline: number; // 0-100
  cost: number; // 0-100
  compliance: number; // 0-100
  insurance: number; // 0-100
  liability: number; // 0-100
  debrisFlex: number; // 0-100
}

// ── Output ────────────────────────────────────────────────────────

export interface OptimizationOutput {
  rankings: JurisdictionRanking[];
  tradeOffData: TradeOffPoint[];
  migrationPath?: MigrationStep[];
  summary: {
    bestOverall: string;
    bestForTimeline: string;
    bestForCost: string;
    bestForCompliance: string;
  };
}

export interface JurisdictionRanking {
  jurisdiction: SpaceLawCountryCode;
  jurisdictionName: string;
  flagEmoji: string;
  totalScore: number; // 0-100 weighted composite
  dimensionScores: {
    timeline: number;
    cost: number;
    compliance: number;
    insurance: number;
    liability: number;
    debris: number;
  };
  badges: OptimizerBadge[];
  timeline: { min: number; max: number }; // Weeks
  estimatedCost: { application: string; annual: string };
  keyAdvantages: string[];
  keyRisks: string[];
}

export type OptimizerBadge =
  | "BEST_OVERALL"
  | "FASTEST"
  | "CHEAPEST"
  | "MOST_COMPLIANT"
  | "BEST_LIABILITY"
  | "BEST_INSURANCE";

export interface TradeOffPoint {
  jurisdiction: SpaceLawCountryCode;
  x: number; // Normalized cost (0-1)
  y: number; // Compliance score (0-100)
  size: number; // Timeline weeks (for bubble size)
  label: string; // Country name
}

export interface MigrationStep {
  order: number;
  title: string;
  description: string;
  estimatedDuration: string;
  documents: string[];
  cost?: string;
  authority?: string;
}
