/**
 * Assure Benchmark Intelligence Engine — Server Only
 *
 * Compares company metrics against space industry benchmarks
 * filtered by stage and sector.
 *
 * Returns traffic light indicators (ABOVE / AT / BELOW) for each
 * metric relative to the benchmark values.
 *
 * Deterministic: same input data always produces the same result.
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  spaceBenchmarks,
  type SpaceBenchmark,
} from "@/data/assure/space-benchmarks";
import type { CompanyStage } from "@prisma/client";

// ─── Types ───

export type TrafficLight = "ABOVE" | "AT" | "BELOW";

export interface BenchmarkComparison {
  category: string;
  metric: string;
  benchmarkValue: number | string;
  unit: string;
  source: string;
  year: number;
  segment?: string;

  companyValue: number | null;
  hasData: boolean;

  position: TrafficLight;
  delta: number | null; // difference from benchmark (positive = above)
  deltaPercent: number | null; // percentage difference from benchmark
}

export interface BenchmarkResult {
  organizationId: string;
  stage: CompanyStage;
  comparisons: BenchmarkComparison[];
  summary: BenchmarkSummary;
  computedAt: Date;
}

export interface BenchmarkSummary {
  totalBenchmarks: number;
  comparableBenchmarks: number;
  aboveCount: number;
  atCount: number;
  belowCount: number;
  overallPosition: TrafficLight;
  strongestAreas: Array<{
    metric: string;
    category: string;
    position: TrafficLight;
  }>;
  weakestAreas: Array<{
    metric: string;
    category: string;
    position: TrafficLight;
  }>;
}

export interface AvailableBenchmark {
  category: string;
  metric: string;
  value: number | string;
  unit: string;
  source: string;
  year: number;
  segment?: string;
}

// ─── Stage Label Mapping ───

const STAGE_LABELS: Record<CompanyStage, string> = {
  PRE_SEED: "Pre-Seed",
  SEED: "Seed",
  SERIES_A: "Series A",
  SERIES_B: "Series B",
  SERIES_C_PLUS: "Series C",
  PRE_IPO: "Series C",
  PUBLIC: "Series C",
};

// ─── Metric-to-Profile Field Mapping ───

interface MetricMapping {
  /** Pattern to match against the benchmark metric string (case-insensitive) */
  pattern: RegExp;
  /** Profile section */
  source:
    | "company"
    | "tech"
    | "market"
    | "team"
    | "financial"
    | "regulatory"
    | "competitive"
    | "traction";
  /** Field name in the profile model */
  field: string;
  /** Whether higher values are better for this metric */
  higherIsBetter: boolean;
  /** Tolerance range: values within +/- this percentage of benchmark are "AT" */
  tolerancePercent: number;
}

const METRIC_MAPPINGS: MetricMapping[] = [
  // Team
  {
    pattern: /team size/i,
    source: "team",
    field: "teamSize",
    higherIsBetter: true,
    tolerancePercent: 25,
  },
  {
    pattern: /engineering share|engineering ratio/i,
    source: "team",
    field: "engineeringRatio",
    higherIsBetter: true,
    tolerancePercent: 15,
  },

  // Financial
  {
    pattern: /monthly burn rate/i,
    source: "financial",
    field: "monthlyBurnRate",
    higherIsBetter: false,
    tolerancePercent: 30,
  },
  {
    pattern: /runway target/i,
    source: "financial",
    field: "runway",
    higherIsBetter: true,
    tolerancePercent: 25,
  },
  {
    pattern: /round median|total.*investment/i,
    source: "financial",
    field: "totalRaised",
    higherIsBetter: true,
    tolerancePercent: 30,
  },
  {
    pattern: /pre-money valuation/i,
    source: "financial",
    field: "currentValuation",
    higherIsBetter: true,
    tolerancePercent: 30,
  },

  // Technology
  {
    pattern: /TRL at/i,
    source: "tech",
    field: "trlLevel",
    higherIsBetter: true,
    tolerancePercent: 15,
  },

  // Commercial / Market
  {
    pattern: /customer count/i,
    source: "market",
    field: "customerCount",
    higherIsBetter: true,
    tolerancePercent: 30,
  },
  {
    pattern: /LOI.*count|MOU.*count/i,
    source: "traction",
    field: "lois",
    higherIsBetter: true,
    tolerancePercent: 30,
  },
];

// ─── Helpers ───

/**
 * Get benchmarks relevant to a given company stage.
 * Filters by stage label appearing in the metric name.
 */
function getBenchmarksForStage(stage: CompanyStage): SpaceBenchmark[] {
  const stageLabel = STAGE_LABELS[stage];

  return spaceBenchmarks.filter((b) => {
    // Include benchmarks that mention the stage in their metric name
    const mentionsStage = b.metric.includes(stageLabel);

    // Include stage-agnostic benchmarks (those that don't mention any stage)
    const isStageAgnostic = !Object.values(STAGE_LABELS).some((label) =>
      b.metric.includes(label),
    );

    return mentionsStage || isStageAgnostic;
  });
}

/**
 * Find the metric mapping for a benchmark.
 */
function findMapping(benchmark: SpaceBenchmark): MetricMapping | undefined {
  return METRIC_MAPPINGS.find((m) => m.pattern.test(benchmark.metric));
}

/**
 * Extract a metric value from the profile data.
 */
function extractValue(
  mapping: MetricMapping,
  profileData: Record<string, Record<string, unknown> | null>,
): number | null {
  const sourceData = profileData[mapping.source];
  if (!sourceData) return null;

  const value = sourceData[mapping.field];
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Determine traffic light position for a value against a benchmark.
 */
function getPosition(
  companyValue: number,
  benchmarkValue: number,
  higherIsBetter: boolean,
  tolerancePercent: number,
): TrafficLight {
  if (benchmarkValue === 0) {
    // If benchmark is 0, any positive value is above
    if (companyValue > 0) return higherIsBetter ? "ABOVE" : "BELOW";
    return "AT";
  }

  const delta = companyValue - benchmarkValue;
  const pct = Math.abs(delta / benchmarkValue) * 100;

  // Within tolerance = AT
  if (pct <= tolerancePercent) return "AT";

  if (higherIsBetter) {
    return delta > 0 ? "ABOVE" : "BELOW";
  } else {
    return delta < 0 ? "ABOVE" : "BELOW";
  }
}

// ─── Main Functions ───

/**
 * Get available benchmarks for a company based on its stage and sector.
 */
export async function getBenchmarksForCompany(
  organizationId: string,
): Promise<AvailableBenchmark[]> {
  const profile = await prisma.assureCompanyProfile.findUnique({
    where: { organizationId },
    select: {
      stage: true,
      subsector: true,
    },
  });

  if (!profile) return [];

  const stageBenchmarks = getBenchmarksForStage(profile.stage);

  // Optionally filter by segment if subsector matches
  const subsector = profile.subsector?.[0];

  return stageBenchmarks
    .filter((b) => {
      // Include if no segment restriction or segment matches
      if (!b.segment) return true;
      if (!subsector) return true;
      return b.segment.toLowerCase() === subsector.toLowerCase();
    })
    .map((b) => ({
      category: b.category,
      metric: b.metric,
      value: b.value,
      unit: b.unit,
      source: b.source,
      year: b.year,
      segment: b.segment,
    }));
}

/**
 * Compare company metrics against benchmarks and return
 * traffic light indicators for each metric.
 */
export async function computeBenchmarkPosition(
  organizationId: string,
): Promise<BenchmarkResult> {
  const now = new Date();

  // Fetch the full profile
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
    return {
      organizationId,
      stage: "SEED",
      comparisons: [],
      summary: {
        totalBenchmarks: 0,
        comparableBenchmarks: 0,
        aboveCount: 0,
        atCount: 0,
        belowCount: 0,
        overallPosition: "AT",
        strongestAreas: [],
        weakestAreas: [],
      },
      computedAt: now,
    };
  }

  const stage = profile.stage;
  const relevantBenchmarks = getBenchmarksForStage(stage);

  // Build profile data map
  const profileData: Record<string, Record<string, unknown> | null> = {
    company: profile as unknown as Record<string, unknown>,
    tech: profile.techProfile as unknown as Record<string, unknown> | null,
    market: profile.marketProfile as unknown as Record<string, unknown> | null,
    team: profile.teamProfile as unknown as Record<string, unknown> | null,
    financial: profile.financialProfile as unknown as Record<
      string,
      unknown
    > | null,
    regulatory: profile.regulatoryProfile as unknown as Record<
      string,
      unknown
    > | null,
    competitive: profile.competitiveProfile as unknown as Record<
      string,
      unknown
    > | null,
    traction: profile.tractionProfile as unknown as Record<
      string,
      unknown
    > | null,
  };

  // Compare each benchmark
  const comparisons: BenchmarkComparison[] = [];

  for (const benchmark of relevantBenchmarks) {
    // Skip non-numeric benchmarks for comparison
    const benchmarkNumeric =
      typeof benchmark.value === "number" ? benchmark.value : null;

    const mapping = findMapping(benchmark);

    let companyValue: number | null = null;
    let position: TrafficLight = "AT";
    let delta: number | null = null;
    let deltaPercent: number | null = null;
    let hasData = false;

    if (mapping && benchmarkNumeric !== null) {
      companyValue = extractValue(mapping, profileData);
      hasData = companyValue !== null;

      if (hasData && companyValue !== null) {
        position = getPosition(
          companyValue,
          benchmarkNumeric,
          mapping.higherIsBetter,
          mapping.tolerancePercent,
        );
        delta = Math.round((companyValue - benchmarkNumeric) * 100) / 100;
        deltaPercent =
          benchmarkNumeric !== 0
            ? Math.round(
                ((companyValue - benchmarkNumeric) / benchmarkNumeric) * 10000,
              ) / 100
            : null;
      }
    }

    comparisons.push({
      category: benchmark.category,
      metric: benchmark.metric,
      benchmarkValue: benchmark.value,
      unit: benchmark.unit,
      source: benchmark.source,
      year: benchmark.year,
      segment: benchmark.segment,
      companyValue,
      hasData,
      position,
      delta,
      deltaPercent,
    });
  }

  // Compute summary
  const comparable = comparisons.filter((c) => c.hasData);
  const aboveCount = comparable.filter((c) => c.position === "ABOVE").length;
  const atCount = comparable.filter((c) => c.position === "AT").length;
  const belowCount = comparable.filter((c) => c.position === "BELOW").length;

  let overallPosition: TrafficLight;
  if (comparable.length === 0) {
    overallPosition = "AT";
  } else if (aboveCount > belowCount) {
    overallPosition = "ABOVE";
  } else if (belowCount > aboveCount) {
    overallPosition = "BELOW";
  } else {
    overallPosition = "AT";
  }

  // Identify strongest and weakest areas
  const aboveComparisons = comparable
    .filter((c) => c.position === "ABOVE")
    .sort(
      (a, b) => Math.abs(b.deltaPercent ?? 0) - Math.abs(a.deltaPercent ?? 0),
    );

  const belowComparisons = comparable
    .filter((c) => c.position === "BELOW")
    .sort(
      (a, b) => Math.abs(b.deltaPercent ?? 0) - Math.abs(a.deltaPercent ?? 0),
    );

  const strongestAreas = aboveComparisons.slice(0, 3).map((c) => ({
    metric: c.metric,
    category: c.category,
    position: c.position,
  }));

  const weakestAreas = belowComparisons.slice(0, 3).map((c) => ({
    metric: c.metric,
    category: c.category,
    position: c.position,
  }));

  return {
    organizationId,
    stage,
    comparisons,
    summary: {
      totalBenchmarks: comparisons.length,
      comparableBenchmarks: comparable.length,
      aboveCount,
      atCount,
      belowCount,
      overallPosition,
      strongestAreas,
      weakestAreas,
    },
    computedAt: now,
  };
}
