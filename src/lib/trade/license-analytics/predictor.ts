/**
 * Caelex Trade — Predictive licence-time engine.
 *
 * Sprint Z15. Tier 6 per the Living Execution Plan.
 *
 * Pure function `predictLicenseTime(application)` that consumes the
 * historical-times dataset (`./historical-times.ts`) and a draft
 * application shape, then returns:
 *
 *   - medianDays       — central forecast
 *   - p25Days          — 25th-percentile optimistic
 *   - p75Days          — 75th-percentile conservative
 *   - expectedApprovalDate — submission-date + median
 *   - confidence       — "high" | "medium" | "low"
 *   - dataBasis        — citation of source statistics
 *
 * Confidence tiers (driven by lookup-fallback level and sample size):
 *
 *   high   — exact (authority × formType × destinationGroup × eccnBucket)
 *            match found AND sampleSize ≥ 1,000
 *   medium — exact key match with low sample, OR fallback to
 *            (authority × formType) aggregate
 *   low    — fallback to authority-only aggregate, OR no data at all
 *            (synthetic conservative defaults)
 *
 * Bayesian-style calibration (optional bonus):
 *
 *   If the caller supplies `orgHistorical` — past licence
 *   processing times for the same authority + destination group —
 *   AND there are ≥ 5 samples, the predictor blends the org's
 *   historical median with the industry-baseline median using a
 *   sample-size-weighted average. The blend assumes the industry
 *   baseline carries an effective weight of 200 samples; the org's
 *   median is weighted by its actual sample size. This is a simple
 *   conjugate prior approximation that smoothly transitions from
 *   "trust the industry baseline" (low sample) to "trust the org"
 *   (high sample).
 *
 * Pure function — no I/O, no async, no side-effects. Caller passes
 * `now` explicitly for deterministic testing.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  HISTORICAL_TIME_DATASET,
  findExactEntry,
  findEntriesByAuthorityAndForm,
  findEntriesByAuthority,
  weightedAverage,
  type DestinationGroup,
  type EccnBucket,
  type HistoricalTimeEntry,
  type LicenseAuthority,
  type LicenseFormType,
} from "./historical-times";

// ─── Input shape ────────────────────────────────────────────────────

/**
 * The draft licence application. Required keys are the four
 * dimensions of the dataset; optional keys are:
 *
 *   - submissionDate: the date the operator intends to file (default:
 *     `now`). The expected-approval date is computed as
 *     `submissionDate + medianDays`.
 *   - orgHistorical: past licence outcomes for the same operator
 *     (filtered to the same authority + destinationGroup). When
 *     ≥ 5 samples, used to blend with the industry baseline.
 */
export interface LicenseApplicationDraft {
  authority: LicenseAuthority;
  formType: LicenseFormType;
  destinationGroup: DestinationGroup;
  eccnBucket: EccnBucket;
  submissionDate?: Date;
  orgHistorical?: OrgHistoricalSample[];
}

/**
 * A single past licence outcome from the operator's own records.
 * Caller passes only the days-to-approval; the predictor doesn't
 * care about ECCN / form-type at this granularity (those are
 * accounted-for via the per-dimension industry baseline).
 */
export interface OrgHistoricalSample {
  /** Days from submission to approval. */
  daysToApproval: number;
  /** Authority — must match the application's authority for the
   *  sample to be considered. */
  authority: LicenseAuthority;
  /** Destination group — must match the application for the sample
   *  to be considered. */
  destinationGroup: DestinationGroup;
}

// ─── Output shape ───────────────────────────────────────────────────

export type PredictionConfidence = "high" | "medium" | "low";

export interface LicenseTimePrediction {
  /** 25th-percentile (optimistic) days to approval. */
  p25Days: number;
  /** Median (50th-percentile) days to approval. */
  medianDays: number;
  /** 75th-percentile (conservative) days to approval. */
  p75Days: number;
  /** Submission date + median (calendar days). */
  expectedApprovalDate: Date;
  /** Submission date + p25. */
  optimisticDate: Date;
  /** Submission date + p75. */
  conservativeDate: Date;
  /** Confidence tier — see module-level docstring. */
  confidence: PredictionConfidence;
  /** Source citation. */
  dataBasis: string;
  /** Sample size backing the prediction (industry data only — does
   *  NOT include org-historical samples). */
  industrySampleSize: number;
  /** Whether org-historical was used to calibrate the median. */
  orgCalibrationApplied: boolean;
  /** If calibration applied, the org's sample count. */
  orgSampleSize: number;
  /** Human-readable label for the lookup tier reached. */
  matchTier: "exact" | "authority+form" | "authority-only" | "synthetic";
}

// ─── Constants ──────────────────────────────────────────────────────

/**
 * Effective sample weight assigned to the industry baseline when
 * Bayesian-blending with org-historical samples. A larger value
 * means the org's median has to accumulate more samples before it
 * meaningfully shifts the prediction. 200 is a defensible default
 * for a heavy-tailed dataset where individual outliers shouldn't
 * dominate; cf. Gelman et al. "Bayesian Data Analysis" Ch. 2 for
 * the conjugate-prior intuition.
 */
const INDUSTRY_PRIOR_EFFECTIVE_WEIGHT = 200;

/**
 * Minimum number of org-historical samples before Bayesian blending
 * kicks in. Below this, the predictor uses the industry baseline
 * verbatim. Mirrors the spec's "> 5 past licenses" threshold.
 */
const MIN_ORG_SAMPLES_FOR_CALIBRATION = 5;

/**
 * Sample-size threshold above which an exact-key match earns
 * "high" confidence. Below this, even an exact match falls to
 * "medium" confidence because the underlying distribution is noisy.
 */
const HIGH_CONFIDENCE_MIN_SAMPLE = 1_000;

/**
 * Synthetic fallback when no record is found at all. These
 * deliberately conservative numbers reflect "we have no data —
 * assume a long-tail outcome and warn the operator". They are
 * NOT tied to any agency statistic.
 */
const SYNTHETIC_FALLBACK = {
  p25Days: 30,
  medianDays: 60,
  p75Days: 120,
  citation:
    "Synthetic fallback — no matching statistics in dataset; operator should consult counsel.",
} as const;

// ─── Core function ──────────────────────────────────────────────────

/**
 * Forecast licence-application processing time.
 *
 * Lookup strategy:
 *
 *   1. Exact (authority × formType × destinationGroup × eccnBucket).
 *      → "exact" tier; "high" or "medium" confidence depending on
 *      sample size.
 *   2. (authority × formType) — weighted-average across destinations
 *      / ECCNs. → "authority+form" tier; "medium" confidence.
 *   3. (authority) only — weighted-average across all records.
 *      → "authority-only" tier; "low" confidence.
 *   4. Nothing matched → synthetic conservative defaults; "low"
 *      confidence.
 *
 * If `orgHistorical` filters to ≥ MIN_ORG_SAMPLES_FOR_CALIBRATION
 * matching samples, the median is Bayesian-blended.
 */
export function predictLicenseTime(
  application: LicenseApplicationDraft,
  now: Date = new Date(),
): LicenseTimePrediction {
  const submissionDate = application.submissionDate ?? now;

  // ─── Tier 1: exact match ──────────────────────────────────────────
  const exact = findExactEntry(
    application.authority,
    application.formType,
    application.destinationGroup,
    application.eccnBucket,
  );

  let base: {
    p25Days: number;
    medianDays: number;
    p75Days: number;
    citation: string;
    sampleSize: number;
    matchTier: LicenseTimePrediction["matchTier"];
  };

  if (exact) {
    base = {
      p25Days: exact.p25Days,
      medianDays: exact.medianDays,
      p75Days: exact.p75Days,
      citation: exact.citation,
      sampleSize: exact.sampleSize,
      matchTier: "exact",
    };
  } else {
    // ─── Tier 2: authority + form aggregate ─────────────────────────
    const byAuthAndForm = findEntriesByAuthorityAndForm(
      application.authority,
      application.formType,
    );
    if (byAuthAndForm.length > 0) {
      const totalSamples = byAuthAndForm.reduce((s, e) => s + e.sampleSize, 0);
      base = {
        p25Days: Math.round(weightedAverage(byAuthAndForm, "p25Days")),
        medianDays: Math.round(weightedAverage(byAuthAndForm, "medianDays")),
        p75Days: Math.round(weightedAverage(byAuthAndForm, "p75Days")),
        citation: `${application.authority} ${application.formType} aggregate (${byAuthAndForm.length} records, n=${totalSamples})`,
        sampleSize: totalSamples,
        matchTier: "authority+form",
      };
    } else {
      // ─── Tier 3: authority-only aggregate ─────────────────────────
      const byAuth = findEntriesByAuthority(application.authority);
      if (byAuth.length > 0) {
        const totalSamples = byAuth.reduce((s, e) => s + e.sampleSize, 0);
        base = {
          p25Days: Math.round(weightedAverage(byAuth, "p25Days")),
          medianDays: Math.round(weightedAverage(byAuth, "medianDays")),
          p75Days: Math.round(weightedAverage(byAuth, "p75Days")),
          citation: `${application.authority} authority-wide aggregate (${byAuth.length} records, n=${totalSamples})`,
          sampleSize: totalSamples,
          matchTier: "authority-only",
        };
      } else {
        // ─── Tier 4: synthetic ───────────────────────────────────────
        base = {
          ...SYNTHETIC_FALLBACK,
          sampleSize: 0,
          matchTier: "synthetic",
        };
      }
    }
  }

  // ─── Bayesian org calibration ─────────────────────────────────────
  const matchingOrgSamples = (application.orgHistorical ?? []).filter(
    (s) =>
      s.authority === application.authority &&
      s.destinationGroup === application.destinationGroup,
  );

  let orgCalibrationApplied = false;
  let calibratedMedian = base.medianDays;
  let calibratedP25 = base.p25Days;
  let calibratedP75 = base.p75Days;

  if (matchingOrgSamples.length >= MIN_ORG_SAMPLES_FOR_CALIBRATION) {
    // Org-historical median and rough percentiles
    const sortedDays = [...matchingOrgSamples]
      .map((s) => s.daysToApproval)
      .sort((a, b) => a - b);
    const orgMedian = percentile(sortedDays, 0.5);
    const orgP25 = percentile(sortedDays, 0.25);
    const orgP75 = percentile(sortedDays, 0.75);

    // Bayesian blend: weight industry baseline by
    // INDUSTRY_PRIOR_EFFECTIVE_WEIGHT, weight org by sample count.
    const orgWeight = matchingOrgSamples.length;
    const totalWeight = orgWeight + INDUSTRY_PRIOR_EFFECTIVE_WEIGHT;
    calibratedMedian =
      (base.medianDays * INDUSTRY_PRIOR_EFFECTIVE_WEIGHT +
        orgMedian * orgWeight) /
      totalWeight;
    calibratedP25 =
      (base.p25Days * INDUSTRY_PRIOR_EFFECTIVE_WEIGHT + orgP25 * orgWeight) /
      totalWeight;
    calibratedP75 =
      (base.p75Days * INDUSTRY_PRIOR_EFFECTIVE_WEIGHT + orgP75 * orgWeight) /
      totalWeight;

    orgCalibrationApplied = true;
  }

  // Round to whole calendar days (don't expose half-days).
  const p25 = Math.round(calibratedP25);
  const median = Math.round(calibratedMedian);
  const p75 = Math.round(calibratedP75);

  // ─── Confidence tier ──────────────────────────────────────────────
  const confidence: PredictionConfidence =
    base.matchTier === "exact" && base.sampleSize >= HIGH_CONFIDENCE_MIN_SAMPLE
      ? "high"
      : base.matchTier === "exact" || base.matchTier === "authority+form"
        ? "medium"
        : "low";

  // ─── Approval-date arithmetic ─────────────────────────────────────
  const expectedApprovalDate = addDays(submissionDate, median);
  const optimisticDate = addDays(submissionDate, p25);
  const conservativeDate = addDays(submissionDate, p75);

  const dataBasis = orgCalibrationApplied
    ? `${base.citation}; blended with operator's past ${matchingOrgSamples.length} licence outcomes (Bayesian prior n=${INDUSTRY_PRIOR_EFFECTIVE_WEIGHT}).`
    : base.citation;

  return {
    p25Days: p25,
    medianDays: median,
    p75Days: p75,
    expectedApprovalDate,
    optimisticDate,
    conservativeDate,
    confidence,
    dataBasis,
    industrySampleSize: base.sampleSize,
    orgCalibrationApplied,
    orgSampleSize: matchingOrgSamples.length,
    matchTier: base.matchTier,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Add `days` calendar days to `date`. Returns a new Date — does NOT
 * mutate the input.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Compute the `p` (in [0, 1]) percentile of a pre-sorted ascending
 * array. Uses linear interpolation between adjacent values per the
 * "type 7" definition (R / NumPy default). For empty input, returns
 * 0 — the caller should never invoke this on an empty list, but the
 * fallback keeps the function total.
 */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  if (p <= 0) return sorted[0]!;
  if (p >= 1) return sorted[sorted.length - 1]!;
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const frac = idx - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

/**
 * Sanity check: confirm the dataset is well-formed. Throws if any
 * entry violates the percentile ordering invariant. Called from
 * tests; not exposed as a runtime export beyond that.
 */
export function validateDataset(): void {
  for (const entry of HISTORICAL_TIME_DATASET) {
    if (entry.p25Days > entry.medianDays) {
      throw new Error(
        `Dataset invariant violated: p25 > median for ${entry.authority}/${entry.formType}/${entry.destinationGroup}/${entry.eccnBucket}`,
      );
    }
    if (entry.medianDays > entry.p75Days) {
      throw new Error(
        `Dataset invariant violated: median > p75 for ${entry.authority}/${entry.formType}/${entry.destinationGroup}/${entry.eccnBucket}`,
      );
    }
    if (entry.sampleSize < 0) {
      throw new Error(
        `Dataset invariant violated: negative sampleSize for ${entry.authority}/${entry.formType}/${entry.destinationGroup}/${entry.eccnBucket}`,
      );
    }
  }
}
