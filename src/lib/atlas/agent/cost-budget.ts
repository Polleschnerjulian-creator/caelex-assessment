/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint A1 — Cost-Budget Helper.
 * ────────────────────────────────────────────────────────────────────
 * Computes whether to pause an agent-run that's about to exceed its
 * lawyer-set budget. The estimate for the next iteration uses the
 * average cost-per-iteration so far (with a small safety margin).
 *
 * Pure helper — no I/O, no Prisma. The route in
 * src/app/api/atlas/agent/route.ts calls this BEFORE every new
 * Anthropic-call inside the tool-use loop, and pauses the run if
 * `shouldPause === true`.
 *
 * Design choices:
 *   - `budgetUsd === null` (or <= 0) → no budget, never pauses.
 *   - The 20% safety margin on the projected next-iteration cost
 *     accounts for variance — a corpus-search tool-call can spike
 *     a single iteration's output-token-count by 2-3× relative to
 *     the running average. Without the margin we'd routinely pause
 *     ON the boundary and waste a confirmation round-trip when the
 *     real cost lands just under budget.
 *   - The `usedRatio >= 0.8` gate exists so very-fast small runs
 *     (3 iterations totalling $0.15 against a $5 budget) don't pause
 *     prematurely the moment `projectedTotal > budgetUsd` — that
 *     check fires only once we've actually consumed 80%+ of budget.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

export interface BudgetCheck {
  /// True when the run should pause and wait for lawyer-confirmation
  /// before invoking another Anthropic-call.
  shouldPause: boolean;
  /// Cumulative cost so far (USD).
  currentCost: number;
  /// Lawyer-set budget (USD); 0 when no budget.
  budget: number;
  /// Projected additional cost of the next iteration (USD).
  /// 0 when the helper was called outside a pre-iteration check.
  etaCost: number;
  /// Remaining headroom (USD); Infinity when no budget set.
  remainingBudget: number;
}

export interface CheckBudgetArgs {
  /// Cumulative spend across all iterations completed so far (USD).
  currentCostUsd: number;
  /// Lawyer-set max budget for this run (USD); null = unlimited.
  budgetUsd: number | null;
  /// How many Anthropic-iterations have ALREADY completed.
  iterationsCompleted: number;
  /// True when the caller is about to start the NEXT iteration.
  /// When false (e.g. post-run accounting), no eta is computed.
  beforeNextIteration: boolean;
}

/// Sprint A1 safety margin — bump the avg-per-iter projection by 20%
/// to absorb cost-variance from single-iteration spikes (heavy tool
/// outputs, big cache-creation rounds, etc.).
const SAFETY_MARGIN = 1.2;
/// Don't pause runs that have only used a small fraction of their
/// budget — even if the projected next-iter would tip over, the
/// ETA is unreliable when N is small. Once we've burned 80%+ of
/// the budget the projection is accurate enough to act on.
const PAUSE_USED_RATIO_FLOOR = 0.8;

export function checkBudget(args: CheckBudgetArgs): BudgetCheck {
  const {
    currentCostUsd,
    budgetUsd,
    iterationsCompleted,
    beforeNextIteration,
  } = args;

  /* No budget set → never pause. */
  if (budgetUsd === null || budgetUsd <= 0) {
    return {
      shouldPause: false,
      currentCost: currentCostUsd,
      budget: 0,
      etaCost: 0,
      remainingBudget: Number.POSITIVE_INFINITY,
    };
  }

  const avgPerIter =
    iterationsCompleted > 0 ? currentCostUsd / iterationsCompleted : 0;
  const etaCost = beforeNextIteration ? avgPerIter * SAFETY_MARGIN : 0;
  const projectedTotal = currentCostUsd + etaCost;
  const usedRatio = currentCostUsd / budgetUsd;

  const shouldPause =
    projectedTotal > budgetUsd && usedRatio >= PAUSE_USED_RATIO_FLOOR;

  return {
    shouldPause,
    currentCost: currentCostUsd,
    budget: budgetUsd,
    etaCost,
    remainingBudget: Math.max(0, budgetUsd - currentCostUsd),
  };
}
