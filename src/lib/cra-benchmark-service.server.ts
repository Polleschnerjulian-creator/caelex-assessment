/**
 * CRA Cross-Customer Benchmarking Service — Server Only
 *
 * Computes anonymized, cross-organization CRA compliance benchmarks.
 * NEVER returns org IDs, names, or any identifying information.
 *
 * Privacy rules:
 * - Minimum 5 organizations required to return any benchmark data
 * - Only aggregate/anonymized statistics are returned
 * - Per-org data is discarded after aggregation
 *
 * Caching:
 * - Global benchmark data (all orgs) cached for 24h via Upstash Redis
 * - Per-org percentile is calculated fresh on each call (fast, no DB query)
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { withCache } from "@/lib/cache.server";

// ─── Constants ───

const BENCHMARK_CACHE_KEY = "cra:benchmark:global";
const BENCHMARK_CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
const MIN_ORGS_FOR_BENCHMARK = 5;

// ─── Types ───

export interface CRABenchmark {
  // Overall
  averageMaturityScore: number;
  medianMaturityScore: number;
  percentile: number; // Where requesting org ranks (0-100)
  totalOrganizations: number;

  // By product class
  byProductClass: {
    class_II: { avgScore: number; count: number };
    class_I: { avgScore: number; count: number };
    default: { avgScore: number; count: number };
  };

  // By category
  byCategory: Array<{
    category: string;
    avgComplianceRate: number; // 0-100 across all orgs
    orgComplianceRate: number; // This org's rate for this category
  }>;

  // Top gaps (most common non-compliant requirements across all orgs)
  topGaps: Array<{
    requirementId: string;
    title: string;
    nonCompliantPercent: number; // % of orgs that are non-compliant
  }>;
}

/**
 * Global benchmark snapshot — computed from all orgs, cached 24h.
 * Does NOT include any per-org data.
 */
interface GlobalBenchmarkSnapshot {
  // Sorted array of per-org maturity scores (anonymized)
  orgScores: number[];

  // Per product class: scores per class
  classCounts: {
    class_II: number[];
    class_I: number[];
    default: number[];
  };

  // Per category: { [category]: { totalRate: number; orgCount: number } }
  categoryRates: Record<string, { totalRate: number; orgCount: number }>;

  // Per requirementId: { title, nonCompliantOrgCount, totalOrgCount }
  requirementStats: Record<
    string,
    { title: string; nonCompliantOrgCount: number; totalOrgCount: number }
  >;

  // Total distinct orgs counted
  totalOrganizations: number;
}

// ─── CRA requirement metadata lookup ───

interface CRAReqMeta {
  title: string;
  category: string;
}

let _craReqMeta: Record<string, CRAReqMeta> | null = null;

async function getCRARequirementMeta(): Promise<Record<string, CRAReqMeta>> {
  if (_craReqMeta) return _craReqMeta;
  try {
    const mod = await import("@/data/cra-requirements");
    const reqs = mod.CRA_REQUIREMENTS;
    _craReqMeta = Object.fromEntries(
      reqs.map((r) => [
        r.id,
        { title: r.title, category: r.category as string },
      ]),
    );
  } catch {
    _craReqMeta = {};
  }
  return _craReqMeta!;
}

// ─── Helpers ───

function median(sortedArr: number[]): number {
  if (sortedArr.length === 0) return 0;
  const mid = Math.floor(sortedArr.length / 2);
  return sortedArr.length % 2 === 0
    ? (sortedArr[mid - 1] + sortedArr[mid]) / 2
    : sortedArr[mid];
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * Calculate the percentile rank of a given score within a sorted array.
 * Returns 0-100.
 */
function percentileRank(sortedScores: number[], score: number): number {
  if (sortedScores.length === 0) return 50;
  const below = sortedScores.filter((s) => s < score).length;
  return Math.round((below / sortedScores.length) * 100);
}

// ─── Global snapshot computation ───

/**
 * Compute the global benchmark snapshot from all in-scope CRA assessments.
 * This is the expensive DB query that is cached for 24h.
 */
async function computeGlobalSnapshot(): Promise<GlobalBenchmarkSnapshot | null> {
  const allAssessments = await prisma.cRAAssessment.findMany({
    where: {
      isOutOfScope: false,
      organizationId: { not: null },
    },
    select: {
      organizationId: true,
      maturityScore: true,
      productClassification: true,
      requirements: {
        select: { requirementId: true, status: true },
      },
    },
  });

  // Group by organization
  const byOrg = new Map<
    string,
    {
      scores: number[];
      classifications: string[];
      requirements: Array<{ requirementId: string; status: string }>;
    }
  >();

  for (const a of allAssessments) {
    if (!a.organizationId) continue;
    const existing = byOrg.get(a.organizationId) ?? {
      scores: [],
      classifications: [],
      requirements: [],
    };
    if (a.maturityScore !== null) {
      existing.scores.push(a.maturityScore);
    }
    existing.classifications.push(a.productClassification);
    existing.requirements.push(...a.requirements);
    byOrg.set(a.organizationId, existing);
  }

  const orgCount = byOrg.size;
  if (orgCount < MIN_ORGS_FOR_BENCHMARK) {
    return null;
  }

  // Aggregate per-org average maturity scores
  const orgScores: number[] = [];
  const classCounts: GlobalBenchmarkSnapshot["classCounts"] = {
    class_II: [],
    class_I: [],
    default: [],
  };

  // category → { requirementIds in category }
  // We'll use requirementId prefix as a proxy for category, but need real data
  // Build per-category compliance data per org
  const categoryOrgRates: Record<string, number[]> = {};

  // requirement → { nonCompliantOrgs count, total orgs with that req }
  const reqStats: GlobalBenchmarkSnapshot["requirementStats"] = {};

  // Load requirement metadata (title + category) once
  const reqMeta = await getCRARequirementMeta();

  for (const [, orgData] of byOrg) {
    // Per-org average maturity
    const orgAvgScore = orgData.scores.length > 0 ? average(orgData.scores) : 0;
    orgScores.push(orgAvgScore);

    // Per-class scores — track per org-classification pair
    for (const cls of orgData.classifications) {
      const key = cls as keyof typeof classCounts;
      if (key in classCounts) {
        classCounts[key].push(orgAvgScore);
      } else {
        classCounts.default.push(orgAvgScore);
      }
    }

    // Per-category compliance rate for this org
    const categoryReqMap: Record<string, { total: number; compliant: number }> =
      {};
    for (const req of orgData.requirements) {
      // Use real category from requirement metadata
      const meta = reqMeta[req.requirementId];
      const category = meta?.category ?? "other";

      if (!categoryReqMap[category]) {
        categoryReqMap[category] = { total: 0, compliant: 0 };
      }
      categoryReqMap[category].total++;
      if (req.status === "compliant") {
        categoryReqMap[category].compliant++;
      }

      // Per-requirement non-compliance tracking
      if (!reqStats[req.requirementId]) {
        reqStats[req.requirementId] = {
          title: meta?.title ?? req.requirementId,
          nonCompliantOrgCount: 0,
          totalOrgCount: 0,
        };
      }
      // not_assessed or non_compliant both count as non-compliant for gap analysis
      const isNonCompliant =
        req.status === "non_compliant" || req.status === "not_assessed";
      if (isNonCompliant) {
        reqStats[req.requirementId].nonCompliantOrgCount++;
      }
      reqStats[req.requirementId].totalOrgCount++;
    }

    for (const [cat, data] of Object.entries(categoryReqMap)) {
      const rate = data.total > 0 ? (data.compliant / data.total) * 100 : 0;
      if (!categoryOrgRates[cat]) categoryOrgRates[cat] = [];
      categoryOrgRates[cat].push(rate);
    }
  }

  // Aggregate category rates across orgs
  const categoryRates: GlobalBenchmarkSnapshot["categoryRates"] = {};
  for (const [cat, rates] of Object.entries(categoryOrgRates)) {
    categoryRates[cat] = {
      totalRate: rates.reduce((s, v) => s + v, 0),
      orgCount: rates.length,
    };
  }

  // Sort org scores for percentile computation
  orgScores.sort((a, b) => a - b);

  return {
    orgScores,
    classCounts,
    categoryRates,
    requirementStats: reqStats,
    totalOrganizations: orgCount,
  };
}

// ─── Per-org data fetcher ───

interface OrgCRAData {
  avgMaturityScore: number;
  categoryRates: Record<string, number>; // category → compliance %
}

async function getOrgCRAData(organizationId: string): Promise<OrgCRAData> {
  const assessments = await prisma.cRAAssessment.findMany({
    where: { organizationId, isOutOfScope: false },
    select: {
      maturityScore: true,
      requirements: {
        select: { requirementId: true, status: true },
      },
    },
  });

  const scores = assessments
    .map((a) => a.maturityScore)
    .filter((s): s is number => s !== null);
  const avgMaturityScore = scores.length > 0 ? average(scores) : 0;

  // Aggregate all requirements across all org assessments
  const reqMeta = await getCRARequirementMeta();
  const categoryMap: Record<string, { total: number; compliant: number }> = {};
  for (const a of assessments) {
    for (const req of a.requirements) {
      const meta = reqMeta[req.requirementId];
      const category = meta?.category ?? "other";
      if (!categoryMap[category]) {
        categoryMap[category] = { total: 0, compliant: 0 };
      }
      categoryMap[category].total++;
      if (req.status === "compliant") {
        categoryMap[category].compliant++;
      }
    }
  }

  const categoryRates: Record<string, number> = {};
  for (const [cat, data] of Object.entries(categoryMap)) {
    categoryRates[cat] =
      data.total > 0 ? (data.compliant / data.total) * 100 : 0;
  }

  return { avgMaturityScore, categoryRates };
}

// ─── Main export ───

/**
 * Calculate the CRA compliance benchmark for a given organization.
 *
 * Returns null if fewer than MIN_ORGS_FOR_BENCHMARK organizations have
 * CRA assessments (privacy threshold).
 *
 * The global snapshot is cached for 24h. The per-org comparison is
 * computed fresh each call.
 */
export async function calculateCRABenchmark(
  organizationId: string,
): Promise<CRABenchmark | null> {
  // 1. Get global snapshot (cached 24h)
  const snapshot = await withCache<GlobalBenchmarkSnapshot | null>(
    BENCHMARK_CACHE_KEY,
    computeGlobalSnapshot,
    BENCHMARK_CACHE_TTL,
  );

  if (!snapshot || snapshot.totalOrganizations < MIN_ORGS_FOR_BENCHMARK) {
    return null;
  }

  // 2. Get this org's data (fresh, not cached — fast query)
  const orgData = await getOrgCRAData(organizationId);

  // 3. Percentile rank
  const percentile = percentileRank(
    snapshot.orgScores,
    orgData.avgMaturityScore,
  );

  // 4. By-class averages
  const byProductClass = {
    class_II: {
      avgScore: Math.round(average(snapshot.classCounts.class_II)),
      count: snapshot.classCounts.class_II.length,
    },
    class_I: {
      avgScore: Math.round(average(snapshot.classCounts.class_I)),
      count: snapshot.classCounts.class_I.length,
    },
    default: {
      avgScore: Math.round(average(snapshot.classCounts.default)),
      count: snapshot.classCounts.default.length,
    },
  };

  // 5. By-category comparison
  const byCategory = Object.entries(snapshot.categoryRates)
    .map(([category, data]) => ({
      category,
      avgComplianceRate: Math.round(
        data.orgCount > 0 ? data.totalRate / data.orgCount : 0,
      ),
      orgComplianceRate: Math.round(orgData.categoryRates[category] ?? 0),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));

  // 6. Top gaps: requirements where most orgs are non-compliant
  const topGaps = Object.entries(snapshot.requirementStats)
    .map(([requirementId, stats]) => ({
      requirementId,
      title: stats.title,
      nonCompliantPercent: Math.round(
        stats.totalOrgCount > 0
          ? (stats.nonCompliantOrgCount / stats.totalOrgCount) * 100
          : 0,
      ),
    }))
    .filter((g) => g.nonCompliantPercent > 0)
    .sort((a, b) => b.nonCompliantPercent - a.nonCompliantPercent)
    .slice(0, 5);

  return {
    averageMaturityScore: Math.round(average(snapshot.orgScores)),
    medianMaturityScore: Math.round(median(snapshot.orgScores)),
    percentile,
    totalOrganizations: snapshot.totalOrganizations,
    byProductClass,
    byCategory,
    topGaps,
  };
}
