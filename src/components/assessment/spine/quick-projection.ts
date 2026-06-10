/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Quick-tier result projection / view normalizer (plan Task 2.4, consuming the
 * Task 2.2 response shape: scope + regime direction + NIS2 gateway + cluster
 * counts + top finding per cluster + unknowns COUNT — NO full finding bodies,
 * §6b "counts + headlines").
 *
 * PURE module — no `server-only`, no React. Used by:
 *   - the quick results page (server component) to project the stored QUICK
 *     `AssessmentVerdictSnapshot.result` into the view the panel renders, and
 *   - QuickResultPanel tests (fixtures built with the throwing finding
 *     constructors).
 *
 * TOLERANT BY DESIGN: the QUICK snapshot may store the FULL
 * `ObligationMapResult` (the Task 1.9 pipeline output — clusters carry full
 * findings arrays) or the already-projected quick shape returned by the public
 * quick endpoint (`buildQuickProjection`, Task 2.2 — clusters carry counts and
 * one top finding). Both normalize to the same `QuickResultView`. Anything
 * else returns `null` — the page renders an honest "no result" state, never a
 * fabricated verdict.
 *
 * HONESTY INVARIANTS enforced here:
 *   - The withhold guard: every finding surfaced as renderable passes
 *     `isFindingComplete` — an incomplete explanation envelope is WITHHELD
 *     (counted in `withheldCount`), never partially rendered (invariant #5).
 *   - NO overall score: nothing in this module aggregates a 0–100 number;
 *     the view carries per-cluster counts only (invariant #6).
 *   - Counts are taken from the cluster's own `counts` (server-computed),
 *     never re-derived more favourably; `unassessedObligations` (the §6b "M")
 *     is the number of identified obligations whose detailed assessment
 *     (readiness, evidence, full envelope) only happens in the full tier —
 *     i.e. total identified findings minus the headlines actually shown.
 */

import {
  isFindingComplete,
  type AssessmentFinding,
} from "@/lib/assessment/finding";

// ─── View model (what QuickResultPanel renders) ──────────────────────────────

export interface QuickClusterView {
  id: string;
  label: string;
  counts: {
    applicable: number;
    conditional: number;
    contested: number;
    advisory: number;
  };
  /** Total identified findings in this cluster (sum of the counts). */
  totalFindings: number;
  /** The headline finding — null when none passed the withhold guard. */
  topFinding: AssessmentFinding | null;
  /** Findings withheld because their explanation envelope was incomplete. */
  withheldCount: number;
}

export interface QuickResultView {
  rulebookVersion: string;
  computedAt: string;
  /** Gate verdicts incl. dual-use / nexus notes — complete envelopes only. */
  scope: AssessmentFinding[];
  /** Scope findings withheld by the completeness guard. */
  scopeWithheldCount: number;
  nis2Gateway: AssessmentFinding | null;
  regime: AssessmentFinding | null;
  clusters: QuickClusterView[];
  unknownsCount: number;
  /** Σ identified findings across clusters. */
  totalObligations: number;
  /** §6b "M": identified obligations NOT assessed in detail on the quick tier. */
  unassessedObligations: number;
  aggregationDisclosures: string[];
}

// ─── Tolerant readers ────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function readString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function readCount(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
}

/** A finding is renderable ONLY when its envelope is complete (invariant #5). */
function completeFinding(v: unknown): AssessmentFinding | null {
  return isFindingComplete(v).length === 0 ? (v as AssessmentFinding) : null;
}

/** Verdict weight for headline selection: the most consequential first. */
const VERDICT_WEIGHT: Record<string, number> = {
  applicable: 0,
  contested: 1,
  conditional: 2,
  advisory: 3,
  not_applicable: 4,
};

const CONFIDENCE_WEIGHT: Record<string, number> = {
  DETERMINED: 0,
  PROBABLE: 1,
  INDETERMINATE: 2,
};

function pickTopFinding(
  findings: AssessmentFinding[],
): AssessmentFinding | null {
  if (findings.length === 0) return null;
  const sorted = [...findings].sort((a, b) => {
    const dv =
      (VERDICT_WEIGHT[a.verdict] ?? 9) - (VERDICT_WEIGHT[b.verdict] ?? 9);
    if (dv !== 0) return dv;
    return (
      (CONFIDENCE_WEIGHT[a.confidence] ?? 9) -
      (CONFIDENCE_WEIGHT[b.confidence] ?? 9)
    );
  });
  return sorted[0];
}

function readClusterCounts(v: unknown): QuickClusterView["counts"] {
  const rec = isRecord(v) ? v : {};
  return {
    applicable: readCount(rec.applicable),
    conditional: readCount(rec.conditional),
    contested: readCount(rec.contested),
    advisory: readCount(rec.advisory),
  };
}

function projectCluster(raw: unknown): QuickClusterView | null {
  if (!isRecord(raw)) return null;
  const id = readString(raw.id);
  const label = readString(raw.label);
  if (!id || !label) return null;

  const counts = readClusterCounts(raw.counts);
  const totalFindings =
    counts.applicable + counts.conditional + counts.contested + counts.advisory;

  // Full-result shape: `findings: AssessmentFinding[]`.
  // Projected shape (Task 2.2): `topFinding` (or a 1-element `findings`).
  let candidates: unknown[] = [];
  if (Array.isArray(raw.findings)) {
    candidates = raw.findings;
  } else if (raw.topFinding !== undefined && raw.topFinding !== null) {
    candidates = [raw.topFinding];
  }

  const complete: AssessmentFinding[] = [];
  let withheldCount = 0;
  for (const c of candidates) {
    const f = completeFinding(c);
    if (f) complete.push(f);
    else withheldCount += 1;
  }

  return {
    id,
    label,
    counts,
    totalFindings,
    topFinding: pickTopFinding(complete),
    withheldCount,
  };
}

// ─── Projection ──────────────────────────────────────────────────────────────

/**
 * Normalize a stored quick result (full `ObligationMapResult` OR the
 * already-projected Task 2.2 quick shape) into the panel's view model.
 * Returns `null` for anything unrecognizable — the caller renders an honest
 * empty state, never a guessed verdict.
 */
export function projectQuickResult(input: unknown): QuickResultView | null {
  if (!isRecord(input)) return null;

  const rulebookVersion = readString(input.rulebookVersion);
  const computedAt = readString(input.computedAt);
  if (!rulebookVersion || !computedAt) return null;

  // Scope findings — withhold incomplete envelopes, never partially render.
  const scope: AssessmentFinding[] = [];
  let scopeWithheldCount = 0;
  if (Array.isArray(input.scope)) {
    for (const s of input.scope) {
      const f = completeFinding(s);
      if (f) scope.push(f);
      else scopeWithheldCount += 1;
    }
  }

  const nis2Gateway = completeFinding(input.nis2Gateway);
  const regime = completeFinding(input.regime);

  const clusters: QuickClusterView[] = [];
  if (Array.isArray(input.clusters)) {
    for (const c of input.clusters) {
      const view = projectCluster(c);
      if (view) clusters.push(view);
    }
  }

  // Unknowns: full result carries the array; the projected shape the count.
  let unknownsCount = 0;
  if (typeof input.unknownsCount === "number") {
    unknownsCount = readCount(input.unknownsCount);
  } else if (Array.isArray(input.unknowns)) {
    unknownsCount = input.unknowns.length;
  }

  const totalObligations = clusters.reduce(
    (sum, c) => sum + c.totalFindings,
    0,
  );
  // §6b "M": identified, but not assessed in detail on the quick tier — the
  // quick tier shows ONE headline per cluster; the rest (and the readiness /
  // evidence assessment for all of them) live in the full tier.
  const shownHeadlines = clusters.filter((c) => c.topFinding !== null).length;
  const unassessedObligations = Math.max(0, totalObligations - shownHeadlines);

  const aggregationDisclosures = Array.isArray(input.aggregationDisclosures)
    ? input.aggregationDisclosures.filter(
        (d): d is string => typeof d === "string" && d.length > 0,
      )
    : [];

  return {
    rulebookVersion,
    computedAt,
    scope,
    scopeWithheldCount,
    nis2Gateway,
    regime,
    clusters,
    unknownsCount,
    totalObligations,
    unassessedObligations,
    aggregationDisclosures,
  };
}
