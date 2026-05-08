import "server-only";

/**
 * Sprint UF18 — Peer-benchmark lookup for the Posture page.
 *
 * Audit finding P1-15: Posture rendered just an absolute "78%"
 * compliance score with no comparison context — investors had no
 * way to interpret whether 78% is good, bad, or median for the
 * cohort. The RCRBenchmark Prisma model already stores anonymized
 * cohort statistics (median, p25, p75, mean, stdDev) per
 * operator-type per quarter, populated by the existing
 * compute-rcr cron. UF18 just surfaces it.
 *
 * # Why a thin helper instead of folding into getPostureForUser
 *
 * - Benchmark lookup is optional: if the user has no operatorType
 *   set (Sprint UF8 made operatorType nullable for non-operators),
 *   there's nothing to compare to. Returning undefined here lets
 *   the caller render a graceful empty state without changing
 *   PostureSnapshot's contract.
 * - posture.server.ts already does ~24 DB round-trips. One more
 *   tiny lookup is fine, but keeping it separate means we can
 *   skip it for non-investor personas in the future.
 *
 * # Percentile interpretation
 *
 * Uses the normal-CDF approximation (mean + stdDev) — same method
 * as the RCR engine's percentile field. Returns 0-100 where 50 =
 * median, 90 = top decile, 10 = bottom decile.
 */

import { prisma } from "@/lib/prisma";
import { startOfQuarter, format } from "date-fns";

export interface PeerBenchmark {
  /** User's operator type (SCO, LO, ...) — the cohort identifier. */
  operatorType: string;
  /** Quarter label, e.g. "2026-Q1". */
  period: string;
  /** Number of orgs in the cohort. >5 to be statistically meaningful. */
  cohortSize: number;
  /** Median compliance score in this cohort. */
  medianScore: number;
  /** 25th and 75th percentile (the IQR band). */
  p25Score: number;
  p75Score: number;
  /** User's percentile within the cohort, 0-100. null when cohort has
   *  zero variance (everyone scored identically — percentile undefined). */
  userPercentile: number | null;
  /** Where the user sits relative to the cohort. */
  position: "above-p75" | "above-median" | "below-median" | "below-p25";
}

/**
 * Look up the peer benchmark for the user's operatorType in the
 * current quarter. Returns null when:
 *   - the user has no operatorType (e.g. consultant/auditor/investor
 *     persona who chose "Not applicable" in onboarding)
 *   - no benchmark row exists for this cohort + quarter (cohort
 *     too small, or compute-rcr cron hasn't run)
 */
export async function getPeerBenchmarkForUser(
  userId: string,
  userScore: number,
): Promise<PeerBenchmark | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { operatorType: true },
  });

  if (!user?.operatorType) return null;

  const quarterStart = startOfQuarter(new Date());
  const period = format(quarterStart, "yyyy-'Q'Q");

  const benchmark = await prisma.rCRBenchmark.findUnique({
    where: {
      operatorType_period: {
        operatorType: user.operatorType,
        period,
      },
    },
  });

  // No cohort data yet for this operatorType + quarter.
  if (!benchmark || benchmark.count < 5) return null;

  // Percentile via normal-CDF approximation. Identical method to the
  // RCR engine's user-percentile calculation so the two surfaces
  // agree on the same number.
  let userPercentile: number | null = null;
  if (benchmark.stdDev > 0) {
    const zScore = (userScore - benchmark.meanScore) / benchmark.stdDev;
    userPercentile = Math.max(
      0,
      Math.min(100, Math.round(normalCDF(zScore) * 100)),
    );
  }

  // Categorical position derived from the cohort percentiles, not
  // from the percentile estimate (which is normal-CDF-based and
  // can disagree at the tails).
  const position: PeerBenchmark["position"] =
    userScore > benchmark.p75Score
      ? "above-p75"
      : userScore > benchmark.medianScore
        ? "above-median"
        : userScore > benchmark.p25Score
          ? "below-median"
          : "below-p25";

  return {
    operatorType: user.operatorType,
    period,
    cohortSize: benchmark.count,
    medianScore: benchmark.medianScore,
    p25Score: benchmark.p25Score,
    p75Score: benchmark.p75Score,
    userPercentile,
    position,
  };
}

// ─── Math helpers ────────────────────────────────────────────────────────
//
// Standard-normal CDF approximation via Abramowitz-Stegun (max error
// ~7.5e-8). Same approach as rcr-engine.server.ts so the two
// implementations stay numerically aligned.

function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z * 0.5);
  const p =
    d *
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}
