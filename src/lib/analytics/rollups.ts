/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Caelex Analytics — pure rollup arithmetic for the cross-product spine (PURE).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This module owns the deterministic, side-effect-free math that the nightly
 * aggregation crons run to materialise the three rollup tables
 * (`AnalyticsPathEdge`, `AnalyticsRetentionCohort`, `AnalyticsFunnelDaily`) plus
 * the per-feature dwell averages. It is a PURE module — NO Prisma, NO
 * `server-only`, NO React, NO `Date.now()` at import — so it is unit-testable in
 * isolation and reusable from any caller. The crons fetch rows, hand the plain
 * arrays to these functions, and upsert the returned rows; ALL the logic worth
 * testing lives HERE rather than entangled with SQL.
 *
 * ── WHY THE SHAPES ARE WHAT THEY ARE ─────────────────────────────────────────
 *
 *  • CARDINALITY IS THE ENEMY. Path-graph and funnel rollups explode if raw
 *    paths (with ids) become dimensions. Every path that enters an edge is run
 *    through {@link normalizePath} (owned by ./feature-map) so `/atlas/cases/<cuid>`
 *    collapses to `/atlas/cases/:id`. `opts.maxEdges` lets the cron keep only the
 *    heaviest N edges so one pathological session cannot unbound the table.
 *
 *  • DETERMINISM / UTC. Crons run in UTC and MUST be reproducible regardless of
 *    the server's local timezone. {@link isoWeekStart} is therefore pure UTC math
 *    (NOT date-fns `startOfISOWeek`, which is local-tz). Week comparisons are done
 *    on UTC-midnight milliseconds. Callers pass already-isoWeekStart'd week dates.
 *
 *  • EVENT-TYPE DUALITY. The new provider emits `page_viewed`; legacy code still
 *    emits `page_view`. The default funnels' acquisition step lists BOTH strings,
 *    and the cron that builds {@link PageHit}s for {@link reconstructPathEdges}
 *    must select BOTH (this module is agnostic — it just consumes the hits it is
 *    given — but the contract is documented here so the cron stays correct).
 *
 *  • STABLE / DENSE ROWS. Grid surfaces (funnels especially) want one row per
 *    (funnel, step) EVEN when nobody entered, so the dashboard renders a stable
 *    skeleton instead of a ragged one. The reducers below emit dense rows.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { normalizePath } from "./feature-map";
import type { Product } from "./events";

// ─────────────────────────────────────────────────────────────────────────────
// 0. ISO-week start (pure UTC)
// ─────────────────────────────────────────────────────────────────────────────

/** Milliseconds in one day (UTC days are exactly 86_400_000 ms — no DST in UTC). */
const MS_PER_DAY = 86_400_000;
/** Milliseconds in one (7-day) week. */
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Monday 00:00:00.000 **UTC** of the ISO week containing `d`.
 *
 * Implemented in pure UTC arithmetic: we take `d`'s UTC calendar date, find its
 * UTC weekday (0=Sun … 6=Sat), shift back to the Monday of that week by
 * `(weekday + 6) % 7` days (so Mon→0, Tue→1, …, Sun→6), and rebuild a fresh date
 * at midnight UTC. We deliberately do NOT use `date-fns/startOfISOWeek`, which
 * operates in the host's LOCAL timezone and would make the cohort grid drift by a
 * day for any server not on UTC. Returns a fresh `Date` (never mutates `d`).
 */
export function isoWeekStart(d: Date): Date {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();
  // Midnight UTC of d's calendar day (drops any intra-day time component).
  const midnightUtcMs = Date.UTC(year, month, day);
  // getUTCDay: 0=Sun..6=Sat. Days to subtract to land on Monday.
  const weekday = new Date(midnightUtcMs).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return new Date(midnightUtcMs - daysSinceMonday * MS_PER_DAY);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Path edges — session journey → weighted directed graph
// ─────────────────────────────────────────────────────────────────────────────

/** One page hit inside a session (already product-attributed by the cron). */
export interface PageHit {
  sessionId: string;
  timestamp: Date;
  path: string;
  product: Product;
}

/** One aggregated directed edge of the path graph for a day. */
export interface PathEdgeRow {
  product: Product;
  fromPath: string;
  toPath: string;
  transitions: number;
}

/** Synthetic node prepended to every session's first real page. */
const ENTRY_NODE = "(entry)";
/** Synthetic node appended after every session's last real page. */
const EXIT_NODE = "(exit)";

/**
 * Build a collision-free composite map key from an edge's three string
 * dimensions. We use `JSON.stringify([...])` rather than a delimiter-joined
 * string so the key can NEVER collide no matter what characters survive into a
 * normalised path (JSON escapes them), and the source stays plain ASCII (no
 * fragile embedded control byte). The array is decoded back via `JSON.parse` when
 * materialising rows.
 */
function edgeKey(product: Product, fromPath: string, toPath: string): string {
  return JSON.stringify([product, fromPath, toPath]);
}

/**
 * Reconstruct the per-day path graph from a flat list of page hits.
 *
 * Algorithm:
 *   1. Bucket hits by `sessionId`.
 *   2. Sort each bucket by `timestamp` ascending (STABLE, so equal-timestamp hits
 *      keep their input order — important for deterministic edges).
 *   3. For each session emit, with both endpoints run through {@link normalizePath}:
 *        (entry) → first
 *        h[i]    → h[i+1]   for every consecutive pair
 *        last    → (exit)
 *      The synthetic `(entry)`/`(exit)` nodes are NOT normalised (they are not
 *      paths) — they let the dashboard show where journeys begin and drop off.
 *   4. The `product` of an edge is the product of its FROM hit. For the
 *      `(entry) → first` edge the FROM is synthetic, so we attribute it to the
 *      FIRST hit's product (the session's landing product).
 *   5. Aggregate `transitions` per `(product, fromPath, toPath)`.
 *
 * If `opts.maxEdges` is set, only the top-N rows by `transitions` desc are
 * returned (stable tie-break by `product, fromPath, toPath` ascending) so a busy
 * day cannot blow up the table.
 */
export function reconstructPathEdges(
  hits: PageHit[],
  opts?: { maxEdges?: number },
): PathEdgeRow[] {
  // 1. Bucket by session.
  const bySession = new Map<string, PageHit[]>();
  for (const hit of hits) {
    const bucket = bySession.get(hit.sessionId);
    if (bucket) bucket.push(hit);
    else bySession.set(hit.sessionId, [hit]);
  }

  // Aggregation map: JSON([product, fromPath, toPath]) → transitions.
  const edgeCounts = new Map<string, number>();

  const bump = (product: Product, fromPath: string, toPath: string) => {
    const key = edgeKey(product, fromPath, toPath);
    edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
  };

  for (const bucket of bySession.values()) {
    // 2. Stable ascending sort by timestamp. Array.prototype.sort is stable in
    // modern V8/Node, so equal timestamps preserve input order.
    bucket.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (bucket.length === 0) continue; // defensive; buckets are never empty here

    // The landing product attributes the synthetic entry edge.
    const landingProduct = bucket[0].product;
    const firstPath = normalizePath(bucket[0].path);

    // 3a. (entry) → first
    bump(landingProduct, ENTRY_NODE, firstPath);

    // 3b. consecutive pairs — edge product = FROM hit's product.
    for (let i = 0; i < bucket.length - 1; i++) {
      const from = bucket[i];
      const to = bucket[i + 1];
      bump(from.product, normalizePath(from.path), normalizePath(to.path));
    }

    // 3c. last → (exit) — attributed to the last hit's product.
    const last = bucket[bucket.length - 1];
    bump(last.product, normalizePath(last.path), EXIT_NODE);
  }

  // 5. Materialise rows from the aggregation map (decode the JSON key back).
  let rows: PathEdgeRow[] = [];
  for (const [key, transitions] of edgeCounts) {
    const [product, fromPath, toPath] = JSON.parse(key) as [
      Product,
      string,
      string,
    ];
    rows.push({ product, fromPath, toPath, transitions });
  }

  // top-N by weight, with a deterministic tie-break so the output is stable
  // across runs (and so tests can assert an exact ordering).
  if (opts?.maxEdges !== undefined) {
    rows.sort(comparePathEdgeRows);
    rows = rows.slice(0, Math.max(0, opts.maxEdges));
  }

  return rows;
}

/**
 * Stable ordering for path-edge rows: heaviest first, then lexicographic by
 * `(product, fromPath, toPath)` so ties resolve deterministically. Kept as a
 * named fn for clarity; used only by {@link reconstructPathEdges}.
 */
function comparePathEdgeRows(a: PathEdgeRow, b: PathEdgeRow): number {
  if (b.transitions !== a.transitions) return b.transitions - a.transitions;
  if (a.product !== b.product) return a.product < b.product ? -1 : 1;
  if (a.fromPath !== b.fromPath) return a.fromPath < b.fromPath ? -1 : 1;
  if (a.toPath !== b.toPath) return a.toPath < b.toPath ? -1 : 1;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Retention cohort grid
// ─────────────────────────────────────────────────────────────────────────────

/** A signup row — `cohortWeek` is ALREADY {@link isoWeekStart}'d by the cron. */
export interface SignupRow {
  userId: string;
  cohortWeek: Date;
}

/** An activity row — `activityWeek` is ALREADY {@link isoWeekStart}'d. */
export interface ActivityRow {
  userId: string;
  activityWeek: Date;
  product: Product;
}

/** One cell of the cohort × activity-week × scope retention grid. */
export interface RetentionCell {
  cohortWeek: Date;
  productScope: string;
  activityWeek: Date;
  cohortSize: number;
  returnedUsers: number;
  weeksSince: number;
}

/**
 * Build the retention grid: for each signup cohort (the ISO week a user first
 * signed up), for each scope, count how many of that cohort's users were active
 * in each later activity week.
 *
 * `scopes` is typically `["all","comply","trade","atlas","pharos","scholar"]`.
 *   - `cohortSize` = distinct users who signed up in `cohortWeek`. It is STABLE
 *     across every scope + activityWeek of that cohort (the denominator never
 *     changes — only the numerator does).
 *   - scope `"all"`: `returnedUsers` = distinct cohort users with ANY product
 *     activity in `activityWeek`.
 *   - scope `P`: distinct cohort users with `product === P` activity in
 *     `activityWeek`.
 *
 * Only cells with `activityWeek >= cohortWeek` are emitted (you cannot retain
 * before you sign up); `weeksSince` = whole UTC weeks between the two
 * (0 = the signup week itself). One cell is emitted per
 * (cohortWeek, productScope, activityWeek) for which `cohortSize > 0`.
 *
 * Weeks are compared by their UTC-midnight millisecond value (the inputs are
 * already isoWeekStart'd, so this is exact).
 */
export function computeRetentionGrid(
  signups: SignupRow[],
  activity: ActivityRow[],
  scopes: string[],
): RetentionCell[] {
  // ── Index signups → cohort membership. ──
  // cohortWeekMs → Set<userId> who signed up that week.
  const cohortMembers = new Map<number, Set<string>>();
  // userId → their cohortWeekMs (first/only signup week). If a user appears with
  // two signup weeks, the EARLIEST wins (a user belongs to one cohort).
  const userCohort = new Map<string, number>();

  for (const s of signups) {
    const cwMs = s.cohortWeek.getTime();
    let members = cohortMembers.get(cwMs);
    if (!members) {
      members = new Set<string>();
      cohortMembers.set(cwMs, members);
    }
    members.add(s.userId);

    const existing = userCohort.get(s.userId);
    if (existing === undefined || cwMs < existing) {
      userCohort.set(s.userId, cwMs);
    }
  }

  // ── Index activity per scope. ──
  // For each scope: Map<`${cohortWeekMs}|${activityWeekMs}`, Set<userId>> of
  // cohort users active that week under the scope filter ("all" = any product).
  // We attribute each activity row to its user's COHORT week, so a cell only ever
  // counts users who actually belong to that cohort.
  const scopeActive = new Map<string, Map<string, Set<string>>>();
  for (const scope of scopes) scopeActive.set(scope, new Map());

  for (const a of activity) {
    const cohortMs = userCohort.get(a.userId);
    // Activity from a user with no signup row in this window has no cohort → skip.
    if (cohortMs === undefined) continue;

    const activityMs = a.activityWeek.getTime();
    // Retention is forward-only: ignore activity strictly before the signup week.
    if (activityMs < cohortMs) continue;

    const cellKey = `${cohortMs}|${activityMs}`;

    for (const scope of scopes) {
      // Scope filter: "all" accepts any product; otherwise product must match.
      if (scope !== "all" && a.product !== scope) continue;
      const map = scopeActive.get(scope)!;
      let set = map.get(cellKey);
      if (!set) {
        set = new Set<string>();
        map.set(cellKey, set);
      }
      set.add(a.userId);
    }
  }

  // ── Emit cells. ──
  // We iterate cohorts × scopes × (the activity weeks that actually have data for
  // that cohort under "all"), so the grid is driven by observed activity. Week-0
  // is always emitted for every cohort+scope (even with 0 returned) so the
  // dashboard has a stable anchor column; later weeks are emitted only where some
  // activity exists for the cohort.
  const cells: RetentionCell[] = [];

  // Pre-compute, per cohort, the set of activity-week ms that appeared under ANY
  // scope, so every scope emits the SAME column set for that cohort — giving the
  // grid dense, aligned rows. We union across ALL scope maps (not just "all"): when
  // "all" is in `scopes` it is a superset of every per-product scope, so this is
  // identical to keying off "all"; but when a caller passes a per-product-only
  // `scopes` (no "all"), keying off "all" alone would silently drop every week-1+
  // column for every scope. Unioning keeps the function correct for its full
  // signature, not just the production call that happens to lead with "all".
  const cohortActivityWeeks = new Map<number, Set<number>>();
  for (const scopeMap of scopeActive.values()) {
    for (const cellKey of scopeMap.keys()) {
      const [cohortStr, activityStr] = cellKey.split("|");
      const cohortMs = Number(cohortStr);
      const activityMs = Number(activityStr);
      let set = cohortActivityWeeks.get(cohortMs);
      if (!set) {
        set = new Set<number>();
        cohortActivityWeeks.set(cohortMs, set);
      }
      set.add(activityMs);
    }
  }

  for (const [cohortMs, members] of cohortMembers) {
    const cohortSize = members.size;
    if (cohortSize <= 0) continue; // only cohorts with members

    // Column set for this cohort: week-0 (the signup week) ALWAYS, plus every
    // later activity week observed under ANY scope.
    const weekSet = new Set<number>([cohortMs]);
    const observed = cohortActivityWeeks.get(cohortMs);
    if (observed) for (const w of observed) weekSet.add(w);

    // Deterministic ascending column order.
    const weeks = Array.from(weekSet).sort((x, y) => x - y);

    for (const scope of scopes) {
      const scopeMap = scopeActive.get(scope)!;
      for (const activityMs of weeks) {
        // Forward-only guard (week-0 included; nothing earlier ever in weekSet).
        if (activityMs < cohortMs) continue;

        const cellKey = `${cohortMs}|${activityMs}`;
        const returnedUsers = scopeMap.get(cellKey)?.size ?? 0;
        const weeksSince = Math.round((activityMs - cohortMs) / MS_PER_WEEK);

        cells.push({
          cohortWeek: new Date(cohortMs),
          productScope: scope,
          activityWeek: new Date(activityMs),
          cohortSize,
          returnedUsers,
          weeksSince,
        });
      }
    }
  }

  return cells;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Funnels (per-day)
// ─────────────────────────────────────────────────────────────────────────────

/** One step of a funnel: a key + the event types that "complete" the step. */
export interface FunnelStepDef {
  stepKey: string;
  eventTypes: string[];
}

/** A funnel definition. `product = null` for a cross-product (growth) funnel. */
export interface FunnelDef {
  funnelId: string;
  product: Product | null;
  steps: FunnelStepDef[];
}

/** One funnel-relevant event. `subject` = userId ?? sessionId (chosen by cron). */
export interface FunnelEvent {
  subject: string;
  eventType: string;
  timestamp: Date;
}

/** One materialised funnel-step row for the day. */
export interface FunnelRow {
  product: Product | null;
  funnelId: string;
  step: number;
  stepKey: string;
  usersEntered: number;
  usersCompleted: number;
  medianMsToNext: number | null;
}

/**
 * Compute per-day funnel rows.
 *
 * For each funnel, we first reduce the day's events to, per subject, the FIRST
 * timestamp at which they hit each step (a subject "has" step k if ANY of its
 * events' type ∈ `steps[k].eventTypes`). Then per step k:
 *
 *   - `usersEntered`   = number of subjects that have step k.
 *   - Non-terminal k:
 *       `usersCompleted` = entered subjects that ALSO have a step (k+1) event with
 *         `firstNextTs >= firstThisTs` (the next step happened at-or-after this
 *         one — a subject who triggered the "next" event BEFORE this step is NOT
 *         counted as a completion, since that is not a forward progression).
 *       `medianMsToNext` = median over completed subjects of
 *         `(firstNextTs - firstThisTs)` ms (always ≥ 0), or `null` if none.
 *   - Terminal step: `usersCompleted = 0`, `medianMsToNext = null` (a terminal
 *     step has no "next" to progress to — documented, not a bug).
 *
 * One {@link FunnelRow} is emitted per (funnel, step) EVEN when `usersEntered = 0`,
 * so the dashboard grid has stable, dense rows.
 */
export function computeFunnelDaily(
  events: FunnelEvent[],
  funnels: FunnelDef[],
): FunnelRow[] {
  const rows: FunnelRow[] = [];

  for (const funnel of funnels) {
    const stepCount = funnel.steps.length;

    // Build, per step index, a lookup of eventType → true for O(1) membership,
    // so we do not re-scan the (possibly large) eventTypes array per event.
    const stepTypeSets: Array<Set<string>> = funnel.steps.map(
      (s) => new Set(s.eventTypes),
    );

    // subject → array (length = stepCount) of FIRST hit ts (ms) per step, or
    // undefined if the subject never hit that step.
    const firstHit = new Map<string, Array<number | undefined>>();

    for (const ev of events) {
      const ts = ev.timestamp.getTime();
      for (let k = 0; k < stepCount; k++) {
        if (!stepTypeSets[k].has(ev.eventType)) continue;
        let perStep = firstHit.get(ev.subject);
        if (!perStep) {
          perStep = new Array<number | undefined>(stepCount).fill(undefined);
          firstHit.set(ev.subject, perStep);
        }
        // Keep the EARLIEST timestamp for this step.
        const cur = perStep[k];
        if (cur === undefined || ts < cur) perStep[k] = ts;
        // NB: do NOT break — one event type could (in principle) belong to two
        // steps; we record the first-hit for every matching step.
      }
    }

    for (let k = 0; k < stepCount; k++) {
      const isTerminal = k === stepCount - 1;
      let usersEntered = 0;
      const deltas: number[] = [];

      for (const perStep of firstHit.values()) {
        const thisTs = perStep[k];
        if (thisTs === undefined) continue; // subject did not enter step k
        usersEntered++;

        if (!isTerminal) {
          const nextTs = perStep[k + 1];
          // Completion requires a forward (>=) progression to the next step.
          if (nextTs !== undefined && nextTs >= thisTs) {
            deltas.push(nextTs - thisTs);
          }
        }
      }

      const usersCompleted = isTerminal ? 0 : deltas.length;
      const medianMsToNext =
        isTerminal || deltas.length === 0 ? null : median(deltas);

      rows.push({
        product: funnel.product,
        funnelId: funnel.funnelId,
        step: k,
        stepKey: funnel.steps[k].stepKey,
        usersEntered,
        usersCompleted,
        medianMsToNext,
      });
    }
  }

  return rows;
}

/**
 * Median of a non-empty number array. For an even count, the arithmetic mean of
 * the two middle values (so a 2-element `[a,b]` → `(a+b)/2`). Sorts a COPY so the
 * caller's array is not mutated. Caller guarantees non-empty (we still return 0
 * defensively for an empty array rather than NaN).
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * The default funnels materialised every night. EXACT step keys + event-type
 * allow-lists per the Phase-3 contract.
 *
 * EVENT-TYPE DUALITY is honoured in the `growth` funnel's acquisition step,
 * which lists `acq_page_viewed` (marketing-specific), the NEW provider's
 * `page_viewed`, AND the LEGACY `page_view` — so a visit counts no matter which
 * emitter produced it. The activation step unions one "aha" event per product so
 * a signup that did ANYTHING meaningful in any product counts as activated.
 */
export const DEFAULT_FUNNELS: FunnelDef[] = [
  {
    funnelId: "growth",
    product: null,
    steps: [
      {
        stepKey: "acq_visit",
        // new + marketing + legacy page-view strings (duality).
        eventTypes: ["acq_page_viewed", "page_viewed", "page_view"],
      },
      {
        stepKey: "signup",
        eventTypes: ["signup", "acq_signup_completed"],
      },
      {
        stepKey: "activation",
        // One activation ("aha") event per product, unioned.
        eventTypes: [
          "feature_used",
          "comply_module_opened",
          "atlas_search_ran",
          "trade_classify_started",
          "scholar_source_read",
          "pharos_oversight_initiated",
        ],
      },
    ],
  },
  {
    funnelId: "trade_classify_to_license",
    product: "trade",
    steps: [
      {
        stepKey: "classify_started",
        eventTypes: ["trade_classify_started"],
      },
      {
        stepKey: "classify_completed",
        eventTypes: ["trade_classify_completed"],
      },
      {
        stepKey: "license_granted",
        eventTypes: ["trade_license_granted"],
      },
    ],
  },
  {
    funnelId: "comply_activation",
    product: "comply",
    steps: [
      {
        stepKey: "signup",
        eventTypes: ["signup"],
      },
      {
        stepKey: "module_opened",
        eventTypes: ["comply_module_opened"],
      },
      {
        stepKey: "assessment_completed",
        eventTypes: ["comply_assessment_completed"],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. Dwell averages
// ─────────────────────────────────────────────────────────────────────────────

/** One dwell sample: a feature id + the foreground ms spent on it. */
export interface DwellSample {
  featureId: string;
  durationMs: number;
}

/** Mean foreground dwell per feature, in seconds (1 decimal place). */
export interface DwellAverage {
  featureId: string;
  avgDurationSecs: number;
  sampleCount: number;
}

/**
 * Average `durationMs` per `featureId`, converted to SECONDS rounded to one
 * decimal place. `avgDurationSecs = round1dp(mean(durationMs) / 1000)`;
 * `sampleCount` = number of samples for that feature. Seconds (not ms) because
 * the dashboard renders human-readable engaged-time; 1dp keeps it precise without
 * implying false accuracy.
 */
export function averageDwellByFeature(samples: DwellSample[]): DwellAverage[] {
  // featureId → { sum of durationMs, count }.
  const acc = new Map<string, { sum: number; count: number }>();
  for (const s of samples) {
    const cur = acc.get(s.featureId);
    if (cur) {
      cur.sum += s.durationMs;
      cur.count += 1;
    } else {
      acc.set(s.featureId, { sum: s.durationMs, count: 1 });
    }
  }

  const out: DwellAverage[] = [];
  for (const [featureId, { sum, count }] of acc) {
    // Mean ms → seconds, rounded to 1dp. count > 0 by construction.
    const avgDurationSecs = Math.round((sum / count / 1000) * 10) / 10;
    out.push({ featureId, avgDurationSecs, sampleCount: count });
  }
  return out;
}
