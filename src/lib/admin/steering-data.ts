/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Steering — pure data-shaping for the founder-home / PMF screen.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The steering PAGE is a thin renderer and the steering ROUTE is a thin reader;
 * ALL of the WACO arithmetic + PMF aggregation lives here as PURE, exported
 * functions so it can be unit-tested in isolation (no React, no DOM, no Prisma,
 * no clock). The route collects raw value-outcome rows from the authoritative
 * domain tables, normalises each into a {@link ValueOutcomeRow}, and hands the
 * flat list to {@link buildSteering} — which is deterministic given its inputs.
 *
 * This file also OWNS the steering API ⇄ UI response contract (the `Steering*`
 * interfaces below). The cockpit keeps its contract in `analytics-types.ts`;
 * steering keeps its own here next to the math, since both the route and the
 * page import from this single module and the compiler enforces the boundary.
 *
 * KEY DEFINITIONS
 *   WACO (North Star) = the product-WEIGHTED count of REAL value-outcomes in the
 *   trailing 7 days. We also report `distinctTenants` (how many tenants produced
 *   ≥1 outcome) for the canonical "active tenants" reading. "Tenant" = a stable
 *   actor key (`org:<id>` when org-scoped, else `user:<id>` for user-scoped
 *   surfaces like Scholar). The actor key is used ONLY to count distinct
 *   tenants — it is NEVER returned in the payload, which carries integers only.
 *
 *   PMF matrix = product × jurisdiction outcome counts (jurisdiction from
 *   `User.establishmentCountry`, an ISO code, when known — else "unknown"),
 *   with this-week vs prior-week growth so the UI can plot adoption × momentum.
 *
 *   Friction map = per-product started-vs-completed ratio for the core flow,
 *   derived from the SAME domain tables (NOT the unwired analytics funnels), so
 *   the worst-leaking step is always backed by real rows.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  VALUE_PRODUCTS,
  VALUE_PRODUCT_LABELS,
  VALUE_OUTCOME_BY_ID,
  weightedOutcome,
  type ValueProduct,
  type ValueOutcomeId,
} from "@/lib/admin/value-events";

// ─────────────────────────────────────────────────────────────────────────────
// Raw input — one normalised value-outcome occurrence (built by the route).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single occurrence of a value-outcome, normalised from whichever domain
 * table produced it. The route maps every source row into this shape so the
 * pure layer can aggregate without knowing about Prisma models.
 */
export interface ValueOutcomeRow {
  /** Which canonical outcome this row is (drives product + weight). */
  outcomeId: ValueOutcomeId;
  /**
   * Stable tenant identity for distinct-counting ONLY. Never surfaced.
   * Convention: "org:<orgId>" when org-scoped, else "user:<userId>".
   */
  actorKey: string;
  /**
   * ISO-ish jurisdiction bucket (e.g. "DE", "NL"), or "unknown" when the
   * source row has no associated `establishmentCountry`. Always a bounded slug.
   */
  jurisdiction: string;
  /** When the outcome occurred (epoch ms). The route resolves the real ts. */
  occurredAtMs: number;
}

/**
 * Per-product started-vs-completed tallies for the friction map, built by the
 * route from raw domain counts (e.g. all TradeItems vs CLASSIFIED TradeItems).
 * Kept separate from {@link ValueOutcomeRow} because "started" rows are not
 * themselves value-outcomes — they are the denominator of a completion ratio.
 */
export interface FrictionInput {
  product: ValueProduct;
  /** Human label for the flow, e.g. "Classify export items". */
  flowLabel: string;
  /** Count of flows that were STARTED in the window (the denominator). */
  started: number;
  /** Count of those that reached COMPLETION (the numerator). */
  completed: number;
}

/**
 * The full raw bundle the route assembles and hands to {@link buildSteering}.
 * `nowMs` makes the 7d/prior-7d windows deterministic for tests (the route
 * passes `Date.now()`; tests pass a fixed instant).
 */
export interface SteeringInput {
  nowMs: number;
  /** Outcomes within the last ~14 days (enough for this-week + prior-week). */
  rows: ValueOutcomeRow[];
  /** Per-product friction tallies for the current week. */
  friction: FrictionInput[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Output — the steering API ⇄ UI contract.
// ─────────────────────────────────────────────────────────────────────────────

/** Per-product slice of the WACO total (weighted outcome contribution). */
export interface ProductContribution {
  product: ValueProduct;
  /** Display name ("Comply", "Passage", …). */
  label: string;
  /** Weighted outcome score this product contributed this week. */
  weighted: number;
  /** Raw (unweighted) outcome count this product produced this week. */
  rawOutcomes: number;
  /** Distinct tenants that produced ≥1 outcome for this product this week. */
  tenants: number;
}

/** The North-Star header block. */
export interface SteeringNorthStar {
  /** Weighted WACO score for the trailing 7 days (the headline number). */
  wacoWeighted: number;
  /** Raw (unweighted) value-outcome count for the trailing 7 days. */
  wacoRawOutcomes: number;
  /** Distinct tenants that produced ≥1 outcome in the trailing 7 days. */
  activeTenants: number;
  /** Week-over-week change in the weighted WACO, as a ratio (null when prior=0). */
  wowChange: number | null;
  /** Month-over-month change: this-week weighted vs the week 4 weeks ago. */
  momChange: number | null;
  /** Per-product contribution to this week's weighted WACO (catalogue order). */
  perProduct: ProductContribution[];
}

/** One cell of the PMF traction matrix: a product × jurisdiction intersection. */
export interface PmfCell {
  product: ValueProduct;
  /** ISO jurisdiction bucket or "unknown". */
  jurisdiction: string;
  /** Weighted outcomes for this product+jurisdiction this week (adoption). */
  weighted: number;
  /** Raw outcome count for this product+jurisdiction this week. */
  rawOutcomes: number;
  /** Distinct tenants in this product+jurisdiction this week. */
  tenants: number;
  /** Week-over-week growth in weighted outcomes (ratio; null when prior=0). */
  wowGrowth: number | null;
}

/** The PMF traction matrix + its axes (for a stable grid/bubble layout). */
export interface PmfMatrix {
  /** Jurisdictions present this week, busiest-first (weighted). */
  jurisdictions: string[];
  /** Products present this week, busiest-first (weighted). */
  products: ValueProduct[];
  /** Occupied cells only (no row for an empty intersection), busiest-first. */
  cells: PmfCell[];
}

/** One product's friction reading for the core-flow drop-off map. */
export interface FrictionRow {
  product: ValueProduct;
  label: string;
  flowLabel: string;
  started: number;
  completed: number;
  /** completed / started, 0..1 (0 when started is 0). */
  completionRate: number;
  /** started - completed (absolute drop-off). */
  dropped: number;
}

export interface SteeringResponse {
  /** ISO timestamp the payload was computed (server now()). */
  generatedAt: string;
  /** ISO date (yyyy-mm-dd) of the most recent COMPLETE day, for an "as of" note. */
  asOf: string;
  northStar: SteeringNorthStar;
  pmf: PmfMatrix;
  /** Per-product friction, worst completion-rate first (only flows with starts). */
  friction: FrictionRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Window helpers — deterministic given `nowMs` (no `new Date()` inside).
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** True when `ts` falls in [fromMs, toMs) — half-open so windows never overlap. */
function inWindow(ts: number, fromMs: number, toMs: number): boolean {
  return ts >= fromMs && ts < toMs;
}

/**
 * Guard a ratio against a zero/negative/non-finite denominator → 0 (not NaN),
 * so the UI prints "0%" and a bar collapses rather than rendering "NaN%".
 */
function safeRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return 0;
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

/**
 * Period-over-period change as a ratio: (current - prior) / prior. Returns null
 * when there is no prior baseline (prior === 0), because "+∞%" is meaningless —
 * the UI shows "new" instead. Rounds to 3dp to avoid float-dust in the payload.
 */
export function periodChange(current: number, prior: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(prior)) return null;
  if (prior === 0) return null;
  return Math.round(((current - prior) / prior) * 1000) / 1000;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core aggregation.
// ─────────────────────────────────────────────────────────────────────────────

/** Internal: weighted + raw + distinct-tenant tallies for a row subset. */
interface Tally {
  weighted: number;
  rawOutcomes: number;
  tenants: Set<string>;
}

function emptyTally(): Tally {
  return { weighted: 0, rawOutcomes: 0, tenants: new Set<string>() };
}

function addToTally(t: Tally, row: ValueOutcomeRow): void {
  t.weighted += weightedOutcome(row.outcomeId, 1);
  t.rawOutcomes += 1;
  t.tenants.add(row.actorKey);
}

/**
 * Compute the weighted WACO score for a set of rows. Pure sum of each row's
 * `count(1) × weight`. Exported so a future cockpit NSM tile can reuse the exact
 * same definition over its own row slice.
 */
export function wacoWeighted(rows: readonly ValueOutcomeRow[]): number {
  // Round to 2dp — weights can be fractional (e.g. bookmark 0.25), so a sum can
  // carry float-dust we don't want in the headline.
  const sum = rows.reduce((acc, r) => acc + weightedOutcome(r.outcomeId, 1), 0);
  return Math.round(sum * 100) / 100;
}

/**
 * Count DISTINCT tenants (actorKeys) across a set of rows. Exported for reuse.
 */
export function distinctTenants(rows: readonly ValueOutcomeRow[]): number {
  const set = new Set<string>();
  for (const r of rows) set.add(r.actorKey);
  return set.size;
}

/**
 * Build the per-product contribution breakdown for one row slice (one week),
 * always emitting ALL five products in catalogue order (a product with no
 * outcomes contributes a zero row, so the UI can render its empty state).
 */
export function productContributions(
  rows: readonly ValueOutcomeRow[],
): ProductContribution[] {
  const byProduct = new Map<ValueProduct, Tally>();
  for (const product of VALUE_PRODUCTS) byProduct.set(product, emptyTally());

  for (const row of rows) {
    const def = VALUE_OUTCOME_BY_ID[row.outcomeId];
    if (!def) continue; // unknown id → ignore (never invent a product)
    const tally = byProduct.get(def.product);
    if (tally) addToTally(tally, row);
  }

  return VALUE_PRODUCTS.map((product) => {
    const t = byProduct.get(product) ?? emptyTally();
    return {
      product,
      label: VALUE_PRODUCT_LABELS[product],
      weighted: Math.round(t.weighted * 100) / 100,
      rawOutcomes: t.rawOutcomes,
      tenants: t.tenants.size,
    };
  });
}

/**
 * Build the PMF traction matrix (product × jurisdiction) for the current week,
 * with each cell's week-over-week growth vs the prior week. Only OCCUPIED
 * intersections become cells; axes list the jurisdictions/products that have any
 * weighted activity this week, busiest-first, so a heatmap/bubble layout stays
 * stable and compact.
 */
export function buildPmfMatrix(
  thisWeek: readonly ValueOutcomeRow[],
  priorWeek: readonly ValueOutcomeRow[],
): PmfMatrix {
  const key = (p: ValueProduct, j: string) => `${p} ${j}`;

  const cur = new Map<string, Tally>();
  for (const row of thisWeek) {
    const def = VALUE_OUTCOME_BY_ID[row.outcomeId];
    if (!def) continue;
    const k = key(def.product, row.jurisdiction);
    let t = cur.get(k);
    if (!t) {
      t = emptyTally();
      cur.set(k, t);
    }
    addToTally(t, row);
  }

  // Prior-week weighted totals per cell, for WoW growth (weighted only).
  const priorWeighted = new Map<string, number>();
  for (const row of priorWeek) {
    const def = VALUE_OUTCOME_BY_ID[row.outcomeId];
    if (!def) continue;
    const k = key(def.product, row.jurisdiction);
    priorWeighted.set(
      k,
      (priorWeighted.get(k) ?? 0) + weightedOutcome(row.outcomeId, 1),
    );
  }

  const cells: PmfCell[] = [];
  for (const [k, t] of cur.entries()) {
    const sep = k.indexOf(" ");
    const product = k.slice(0, sep) as ValueProduct;
    const jurisdiction = k.slice(sep + 1);
    const weighted = Math.round(t.weighted * 100) / 100;
    cells.push({
      product,
      jurisdiction,
      weighted,
      rawOutcomes: t.rawOutcomes,
      tenants: t.tenants.size,
      wowGrowth: periodChange(weighted, priorWeighted.get(k) ?? 0),
    });
  }

  // Busiest cells first (weighted desc), with a stable tiebreak so the order is
  // deterministic for snapshot-style tests.
  cells.sort(
    (a, b) =>
      b.weighted - a.weighted ||
      a.product.localeCompare(b.product) ||
      a.jurisdiction.localeCompare(b.jurisdiction),
  );

  // Axes: rank jurisdictions + products by their total weighted activity.
  const jWeight = new Map<string, number>();
  const pWeight = new Map<ValueProduct, number>();
  for (const c of cells) {
    jWeight.set(
      c.jurisdiction,
      (jWeight.get(c.jurisdiction) ?? 0) + c.weighted,
    );
    pWeight.set(c.product, (pWeight.get(c.product) ?? 0) + c.weighted);
  }
  const jurisdictions = Array.from(jWeight.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([j]) => j);
  const products = Array.from(pWeight.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([p]) => p);

  return { jurisdictions, products, cells };
}

/**
 * Build the friction rows from per-product started/completed tallies, worst
 * completion-rate first. Flows with ZERO starts are dropped (an empty flow has
 * no meaningful drop-off and would otherwise sort to a misleading 0%). Pure.
 */
export function buildFriction(inputs: readonly FrictionInput[]): FrictionRow[] {
  return inputs
    .filter((f) => f.started > 0)
    .map((f) => {
      // Clamp completed to [0, started] so a data anomaly can't yield >100%.
      const completed = Math.max(0, Math.min(f.completed, f.started));
      return {
        product: f.product,
        label: VALUE_PRODUCT_LABELS[f.product],
        flowLabel: f.flowLabel,
        started: f.started,
        completed,
        completionRate: safeRatio(completed, f.started),
        dropped: f.started - completed,
      };
    })
    .sort(
      (a, b) =>
        // Worst completion first; tiebreak by larger absolute drop-off, then
        // product for determinism.
        a.completionRate - b.completionRate ||
        b.dropped - a.dropped ||
        a.product.localeCompare(b.product),
    );
}

/**
 * The single composer the route calls. Splits `rows` into this-week / prior-week
 * / month-ago windows off `nowMs`, then assembles the full {@link SteeringResponse}.
 * Deterministic: identical input ⇒ identical output (no internal clock).
 */
export function buildSteering(input: SteeringInput): SteeringResponse {
  const { nowMs, rows, friction } = input;

  // Half-open windows anchored on `nowMs`:
  //   thisWeek  = [now-7d,  now)
  //   priorWeek = [now-14d, now-7d)
  //   monthAgo  = [now-35d, now-28d)  (the "week 4 weeks ago" for MoM)
  const thisFrom = nowMs - WEEK_MS;
  const priorFrom = nowMs - 2 * WEEK_MS;
  const monthFrom = nowMs - 5 * WEEK_MS;
  const monthTo = nowMs - 4 * WEEK_MS;

  const thisWeek = rows.filter((r) =>
    inWindow(r.occurredAtMs, thisFrom, nowMs),
  );
  const priorWeek = rows.filter((r) =>
    inWindow(r.occurredAtMs, priorFrom, thisFrom),
  );
  const monthAgoWeek = rows.filter((r) =>
    inWindow(r.occurredAtMs, monthFrom, monthTo),
  );

  const curWeighted = wacoWeighted(thisWeek);
  const priorWeighted = wacoWeighted(priorWeek);
  const monthWeighted = wacoWeighted(monthAgoWeek);

  const northStar: SteeringNorthStar = {
    wacoWeighted: curWeighted,
    wacoRawOutcomes: thisWeek.length,
    activeTenants: distinctTenants(thisWeek),
    wowChange: periodChange(curWeighted, priorWeighted),
    momChange: periodChange(curWeighted, monthWeighted),
    perProduct: productContributions(thisWeek),
  };

  return {
    generatedAt: new Date(nowMs).toISOString(),
    // "as of" = the start of today (the most recent fully-covered point).
    asOf: new Date(nowMs).toISOString().slice(0, 10),
    northStar,
    pmf: buildPmfMatrix(thisWeek, priorWeek),
    friction: buildFriction(friction),
  };
}

/**
 * True when there is genuinely nothing to show this week — no outcomes AND no
 * friction flows with any starts. The steering page renders a friendly
 * explainer instead of a wall of zeros. Pure predicate, mirrors the cockpit's
 * `isCockpitEmpty` discipline so the page stays a thin state machine.
 */
export function isSteeringEmpty(resp: {
  northStar: { wacoRawOutcomes: number };
  pmf: { cells: unknown[] };
  friction: unknown[];
}): boolean {
  return (
    resp.northStar.wacoRawOutcomes === 0 &&
    resp.pmf.cells.length === 0 &&
    resp.friction.length === 0
  );
}
