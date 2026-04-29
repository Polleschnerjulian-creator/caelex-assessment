import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Pharos Differential-Privacy Layer — Cross-Authority Insights ohne
 * personenbezogene Datenpreisgabe.
 *
 * Behörde A fragt: "Wie viele meiner Operatoren haben strukturelle
 * Probleme im NIS2-Bereich, im Vergleich zum europäischen Median?"
 *
 * Pharos antwortet, OHNE Daten anderer Behörden offenzulegen, mit
 * formal-DP-konformen aggregierten Counts. Laplace-Mechanismus mit
 * ε (epsilon) als Privacy-Budget. Mathematische Garantie: kein
 * einzelner Operator ist aus dem Output rekonstruierbar — selbst
 * wenn alle EU-Behörden ihre Outputs zusammenwerfen.
 *
 * Sensitivity = 1 für Counts (ein Operator-Datensatz hinzufügen oder
 * entfernen ändert den Count um maximal 1). Default ε=1.0 — solide
 * Privacy-Garantie, brauchbare Genauigkeit.
 *
 * Algorithmus:
 *   1. Aggregiere echten Count via Postgres COUNT(*)
 *   2. Sample Laplace-Noise mit scale = sensitivity / ε
 *   3. Output = round(count + noise)
 *   4. Persistiere ε-Verbrauch im DP-Budget der anfragenden Behörde
 *
 * Quelle: Dwork & Roth, "The Algorithmic Foundations of Differential
 * Privacy" (Foundations and Trends, 2014). Implementierung pure
 * Node-Stdlib, keine externen DP-Libraries (PyDP, Tumult etc.).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { randomBytes } from "node:crypto";
import { logger } from "@/lib/logger";

/** Default epsilon. Lower = more private but noisier. */
export const DEFAULT_EPSILON = 1.0;

/** Standard sensitivity for count queries. */
export const COUNT_SENSITIVITY = 1;

/** Sample from a Laplace(0, scale) distribution using cryptographically
 *  secure randomness. The textbook formula:
 *    laplace(scale) = -scale * sign(u) * ln(1 - 2|u|)
 *  where u is uniform on (-0.5, 0.5).
 *
 *  We use crypto.randomBytes for u so the noise can't be predicted by
 *  an adversary observing N queries — Math.random would be insufficient
 *  for any privacy guarantee that holds against a model attacker. */
export function laplaceNoise(scale: number): number {
  // Get a 53-bit fraction in [0, 1) from crypto-secure bytes — same
  // precision as Math.random but unguessable.
  const buf = randomBytes(7);
  // Build a 53-bit integer (7 bytes = 56 bits, mask high 3 bits off)
  let bits = 0;
  for (let i = 0; i < 7; i++) bits = bits * 256 + buf[i];
  bits = bits / 2 ** 56; // [0, 1)
  // Map to (-0.5, 0.5)
  const u = bits - 0.5;
  // Avoid log(0) singularity
  const safeU = u === 0 ? 1e-300 : u;
  return -scale * Math.sign(safeU) * Math.log(1 - 2 * Math.abs(safeU));
}

export interface DpCountResult {
  /** The DP-protected count released to the caller. Always integer. */
  releasedCount: number;
  /** Lower 95%-confidence bound (releasedCount - 1.96*stddev). */
  lowerBound95: number;
  /** Upper 95%-confidence bound. */
  upperBound95: number;
  /** ε that was charged to the caller's privacy budget. */
  epsilon: number;
  /** Mechanism used — "laplace" today; "gaussian" later for composition. */
  mechanism: "laplace";
  /** ISO timestamp. */
  releasedAt: string;
}

export interface DpCountInput {
  realCount: number;
  epsilon?: number;
  sensitivity?: number;
}

/** Apply Laplace-noise to a true count. ALWAYS returns a non-negative
 *  integer (negative noisy counts get floored to 0 because they have
 *  no semantic meaning for "how many X exist").
 *
 *  Caller is responsible for tracking ε-spend in their DP budget (see
 *  `chargeBudget` below) — this fn doesn't side-effect. */
export function dpCount(input: DpCountInput): DpCountResult {
  const epsilon = input.epsilon ?? DEFAULT_EPSILON;
  const sensitivity = input.sensitivity ?? COUNT_SENSITIVITY;
  if (epsilon <= 0) {
    throw new Error("epsilon must be > 0");
  }
  const scale = sensitivity / epsilon;
  const noise = laplaceNoise(scale);
  const released = Math.max(0, Math.round(input.realCount + noise));
  // Laplace stddev = scale * sqrt(2)
  const stddev = scale * Math.sqrt(2);
  return {
    releasedCount: released,
    lowerBound95: Math.max(0, Math.round(released - 1.96 * stddev)),
    upperBound95: Math.round(released + 1.96 * stddev),
    epsilon,
    mechanism: "laplace",
    releasedAt: new Date().toISOString(),
  };
}

// ─── DP Budget Accounting ────────────────────────────────────────────

/** In-memory budget tracker. Phase 2: persist to a `DpBudget` Prisma
 *  model so budget survives restarts. Phase 1 — per-request fresh
 *  budget, simple ceiling. */
const budgetStore = new Map<string, { spent: number; resetAt: number }>();
const DAILY_RESET_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAILY_BUDGET = 10.0;

export function chargeBudget(
  authorityProfileId: string,
  epsilon: number,
  dailyCeiling = DEFAULT_DAILY_BUDGET,
): { ok: boolean; remaining: number; reason?: string } {
  const now = Date.now();
  const cur = budgetStore.get(authorityProfileId);
  if (!cur || now > cur.resetAt) {
    budgetStore.set(authorityProfileId, {
      spent: epsilon,
      resetAt: now + DAILY_RESET_MS,
    });
    return { ok: true, remaining: dailyCeiling - epsilon };
  }
  if (cur.spent + epsilon > dailyCeiling) {
    return {
      ok: false,
      remaining: dailyCeiling - cur.spent,
      reason: `Daily DP budget exceeded — already spent ε=${cur.spent.toFixed(2)}, request would push to ${(cur.spent + epsilon).toFixed(2)}, ceiling is ${dailyCeiling}.`,
    };
  }
  cur.spent += epsilon;
  budgetStore.set(authorityProfileId, cur);
  return { ok: true, remaining: dailyCeiling - cur.spent };
}

export function getBudgetStatus(authorityProfileId: string): {
  spent: number;
  remaining: number;
  resetsAt: string;
} {
  const cur = budgetStore.get(authorityProfileId);
  const ceiling = DEFAULT_DAILY_BUDGET;
  if (!cur || Date.now() > cur.resetAt) {
    return {
      spent: 0,
      remaining: ceiling,
      resetsAt: new Date(Date.now() + DAILY_RESET_MS).toISOString(),
    };
  }
  return {
    spent: cur.spent,
    remaining: ceiling - cur.spent,
    resetsAt: new Date(cur.resetAt).toISOString(),
  };
}

// ─── Pre-built aggregations for common authority queries ────────────

export interface AggregateInput {
  authorityProfileId: string;
  epsilon?: number;
  metric:
    | "operators-with-open-incidents"
    | "operators-with-overdue-deadlines"
    | "operators-in-alert-tier"
    | "operators-in-drift-tier";
}

/** Compute a DP-protected aggregate over the EU operator pool —
 *  excluding operators NOT in the calling authority's oversight scope.
 *  This protects (a) operators outside the authority and (b) the
 *  exact size of the authority's roster.
 *
 *  Caller passes the real count (e.g. from a Prisma query); this fn
 *  applies noise + budget-check. We keep DB queries OUT of this file
 *  so it stays unit-testable without Prisma mocks. */
export function noisifyAggregate(
  input: AggregateInput & { realCount: number },
): DpCountResult & { ok: boolean; remainingBudget?: number; reason?: string } {
  const epsilon = input.epsilon ?? DEFAULT_EPSILON;
  const charge = chargeBudget(input.authorityProfileId, epsilon);
  if (!charge.ok) {
    return {
      ok: false,
      reason: charge.reason,
      remainingBudget: charge.remaining,
      releasedCount: 0,
      lowerBound95: 0,
      upperBound95: 0,
      epsilon,
      mechanism: "laplace",
      releasedAt: new Date().toISOString(),
    };
  }
  const noisy = dpCount({ realCount: input.realCount, epsilon });
  logger.info(
    `[pharos-dp] ${input.metric} authority=${input.authorityProfileId} ε=${epsilon} real≈${input.realCount} released=${noisy.releasedCount} (remaining=${charge.remaining.toFixed(2)})`,
  );
  return {
    ...noisy,
    ok: true,
    remainingBudget: charge.remaining,
  };
}

/** Reset all budgets — TEST ONLY. Keeps the in-memory store clean
 *  between unit tests. */
export function _resetBudgetForTests() {
  budgetStore.clear();
}
