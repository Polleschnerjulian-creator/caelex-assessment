/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Caelex Analytics — DB-derived nightly aggregate arithmetic (PURE).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This module owns the deterministic, side-effect-free math that the nightly
 * `analytics-aggregate` cron runs to materialise a generic time-series GRID into
 * `AnalyticsDailyAggregate`. NO Prisma, NO `server-only`, NO React, NO clock — it
 * is unit-testable in isolation. The cron fetches the authoritative DOMAIN rows
 * for "yesterday" (and, for the rolling DAU/WAU/MAU windows, the trailing 30
 * days), hands the plain arrays to these functions, and upserts the returned
 * payloads on the table's compound-unique key
 * `@@unique([date, metricType, dimension, dimensionValue])`.
 *
 * ── WHY DOMAIN TABLES, NOT ANALYTICS EVENTS ─────────────────────────────────
 *   The `AnalyticsEvent` value-event taxonomy (comply_*, trade_*, atlas_* …) is
 *   defined but almost entirely UNWIRED in product code today — only generic
 *   page-views + a single signup fire. So every series below is sourced from an
 *   AUTHORITATIVE DOMAIN TABLE whose rows are written by the real product flow
 *   (a `TradeLicense` with `issuedAt` set IS a licence issued; a `Deadline` in
 *   COMPLETED status with `completedAt` IS a deadline met). This gives the admin
 *   real history even before events are wired. The predicates + timestamp columns
 *   + product attribution MIRROR EXACTLY the steering route
 *   (`src/app/api/admin/v2/steering/route.ts`) and the WACO catalogue
 *   (`src/lib/admin/value-events.ts`), so the two surfaces never disagree about
 *   what counts as a value-outcome.
 *
 * ── GRID SHAPE (no schema change) ───────────────────────────────────────────
 *   Every output is one `AnalyticsDailyAggregate` upsert payload:
 *     { date, metricType, dimension|null, dimensionValue|null, metricValue }
 *   The `date` is the @db.Date key the cron computes once for "yesterday"
 *   (UTC-midnight). `dimension`/`dimensionValue` are null for a scalar series and
 *   a bounded slug pair for a broken-down series (e.g. status, type, product).
 *
 *   metricType keys introduced here (see {@link DOMAIN_METRIC_TYPES}):
 *     • deadlines_created / deadlines_met / deadlines_overdue   (scalar)
 *     • nca_submissions          dim "status"  → NCASubmissionStatus value
 *     • documents_generated      dim "type"    → DocumentGenerationType value
 *     • astra_messages           (scalar)      AstraMessage rows created that day
 *     • active_orgs              (scalar)      distinct orgs w/ ≥1 value-event
 *     • product_dau / product_wau / product_mau / product_stickiness
 *                                dim "product" → comply|trade|atlas|pharos|scholar
 *
 * ── EMPTY DAYS → ZEROS, NEVER NULLS ─────────────────────────────────────────
 *   A scalar series with no rows for the day still emits ONE payload with
 *   `metricValue: 0`, so the time-series is DENSE (the dashboard plots a flat
 *   line, not a gap). Per-product DAU/WAU/MAU/stickiness emit a row for EVERY one
 *   of the five products every day (0 when inactive). Dimensional COUNT series
 *   (nca by status, docs by type) are SPARSE by nature — a status/type with no
 *   rows that day yields no payload — because their dimension domain is an
 *   open-ended enum and the surface lane fills absent buckets with 0 on read.
 *
 * ── DETERMINISM / UTC ───────────────────────────────────────────────────────
 *   The cron runs in UTC and keys every daily rollup off `startOfDay(yesterday)`.
 *   These functions take that `date` (a Date at UTC-midnight) verbatim and never
 *   call `new Date()` internally, so output is reproducible and backfill-safe.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { VALUE_PRODUCTS, type ValueProduct } from "@/lib/admin/value-events";

// ─────────────────────────────────────────────────────────────────────────────
// 0. Output payload + metric-type registry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One `AnalyticsDailyAggregate` upsert payload. Shape matches the Prisma model's
 * writable columns exactly; the cron passes each straight into an idempotent
 * upsert keyed on `@@unique([date, metricType, dimension, dimensionValue])`.
 * `dimension`/`dimensionValue` are BOTH null for a scalar series, or BOTH a
 * bounded slug for a broken-down series (never one without the other).
 */
export interface DailyAggregatePayload {
  date: Date;
  metricType: string;
  dimension: string | null;
  dimensionValue: string | null;
  metricValue: number;
}

/**
 * The canonical set of metricType keys this module emits. Exported as the
 * contract the surface lanes read (so a typo can never silently diverge between
 * the writer here and a reader elsewhere). Stable string literals — renaming one
 * is a breaking change to the series.
 */
export const DOMAIN_METRIC_TYPES = Object.freeze({
  deadlinesCreated: "deadlines_created",
  deadlinesMet: "deadlines_met",
  deadlinesOverdue: "deadlines_overdue",
  ncaSubmissions: "nca_submissions",
  documentsGenerated: "documents_generated",
  astraMessages: "astra_messages",
  activeOrgs: "active_orgs",
  productDau: "product_dau",
  productWau: "product_wau",
  productMau: "product_mau",
  productStickiness: "product_stickiness",
} as const);

/** The dimension keys used by the broken-down series. */
export const DOMAIN_DIMENSIONS = Object.freeze({
  status: "status",
  type: "type",
  product: "product",
} as const);

/** Build a scalar (dimensionless) payload. */
function scalar(
  date: Date,
  metricType: string,
  metricValue: number,
): DailyAggregatePayload {
  return {
    date,
    metricType,
    dimension: null,
    dimensionValue: null,
    metricValue,
  };
}

/** Build a dimensional payload. */
function dimensional(
  date: Date,
  metricType: string,
  dimension: string,
  dimensionValue: string,
  metricValue: number,
): DailyAggregatePayload {
  return { date, metricType, dimension, dimensionValue, metricValue };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Deadlines — created / met / overdue (scalar series)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The minimal projection of a `Deadline` row this module needs. The cron selects
 * exactly these columns over the trailing window; we classify each into the three
 * scalar series with respect to the target day.
 *
 *   • created  — `createdAt` falls within the target UTC day.
 *   • met      — status COMPLETED AND `completedAt` falls within the target day.
 *   • overdue  — became/was overdue ON the target day: `dueDate` is within the
 *                target day AND the deadline was NOT in a terminal-done state
 *                (COMPLETED/CANCELLED) — i.e. a deadline whose due date arrived
 *                that day without being closed. (A row already COMPLETED before
 *                its due date is not overdue; a CANCELLED row is moot.) This is a
 *                point-in-time "due today and still open" count, derived purely
 *                from real columns — no synthetic state.
 */
export interface DeadlineRow {
  createdAt: Date;
  dueDate: Date;
  status: string;
  completedAt: Date | null;
}

/** [dayStartMs, dayEndExclusiveMs) for the UTC day that `date` begins. */
function dayBounds(date: Date): { from: number; to: number } {
  const from = date.getTime();
  return { from, to: from + 86_400_000 };
}

/** True when `ts` is a real Date inside [from, to). */
function within(
  ts: Date | null | undefined,
  from: number,
  to: number,
): boolean {
  if (!ts) return false;
  const t = ts.getTime();
  return t >= from && t < to;
}

/**
 * Three dense scalar payloads (created/met/overdue) for the target day. Empty
 * input → all three are 0 (never omitted), so the series never gaps.
 */
export function rollupDeadlines(
  rows: readonly DeadlineRow[],
  date: Date,
): DailyAggregatePayload[] {
  const { from, to } = dayBounds(date);
  let created = 0;
  let met = 0;
  let overdue = 0;

  for (const r of rows) {
    if (within(r.createdAt, from, to)) created++;
    if (r.status === "COMPLETED" && within(r.completedAt, from, to)) met++;
    // Due that day and not closed (COMPLETED/CANCELLED) → counts as overdue.
    if (
      within(r.dueDate, from, to) &&
      r.status !== "COMPLETED" &&
      r.status !== "CANCELLED"
    ) {
      overdue++;
    }
  }

  return [
    scalar(date, DOMAIN_METRIC_TYPES.deadlinesCreated, created),
    scalar(date, DOMAIN_METRIC_TYPES.deadlinesMet, met),
    scalar(date, DOMAIN_METRIC_TYPES.deadlinesOverdue, overdue),
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. NCA submissions by status (dimensional COUNT series)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal `NCASubmission` projection: the status + the day it was submitted. The
 * cron selects `submittedAt`-windowed rows; we bucket by `status`. A status with
 * no submissions that day yields no payload (sparse — the surface fills absent
 * statuses with 0 on read, since the enum domain is open-ended).
 */
export interface NcaSubmissionRow {
  status: string;
  submittedAt: Date;
}

/**
 * One payload per DISTINCT status present among the day's submissions, in
 * deterministic (sorted) status order. Rows whose `submittedAt` is outside the
 * day are ignored defensively (the cron already windows, but the math stays
 * correct if it does not).
 */
export function rollupNcaSubmissions(
  rows: readonly NcaSubmissionRow[],
  date: Date,
): DailyAggregatePayload[] {
  const { from, to } = dayBounds(date);
  const byStatus = new Map<string, number>();
  for (const r of rows) {
    if (!within(r.submittedAt, from, to)) continue;
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
  }
  return Array.from(byStatus.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([status, count]) =>
      dimensional(
        date,
        DOMAIN_METRIC_TYPES.ncaSubmissions,
        DOMAIN_DIMENSIONS.status,
        status,
        count,
      ),
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Documents generated by type (dimensional COUNT series)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal `GeneratedDocument` projection. The cron selects rows that reached the
 * COMPLETED status with `updatedAt` in the window (mirroring steering's
 * `document_generated` predicate); we bucket the completed rows by
 * `documentType`. We re-check the COMPLETED status here so the function is
 * correct even if handed a wider set.
 */
export interface GeneratedDocumentRow {
  documentType: string;
  status: string;
  updatedAt: Date;
}

/**
 * One payload per DISTINCT document type completed that day, sorted by type. A
 * type with no completions yields no payload (sparse, like the NCA series).
 */
export function rollupDocumentsGenerated(
  rows: readonly GeneratedDocumentRow[],
  date: Date,
): DailyAggregatePayload[] {
  const { from, to } = dayBounds(date);
  const byType = new Map<string, number>();
  for (const r of rows) {
    if (r.status !== "COMPLETED") continue;
    if (!within(r.updatedAt, from, to)) continue;
    byType.set(r.documentType, (byType.get(r.documentType) ?? 0) + 1);
  }
  return Array.from(byType.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([type, count]) =>
      dimensional(
        date,
        DOMAIN_METRIC_TYPES.documentsGenerated,
        DOMAIN_DIMENSIONS.type,
        type,
        count,
      ),
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Astra messages (scalar) + active orgs (scalar)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Count of `AstraMessage` rows created on the target day. One dense scalar
 * payload (0 on an empty day). `createdAt` is the only field needed; the cron
 * windows on it, and we re-check defensively.
 */
export function rollupAstraMessages(
  rows: readonly { createdAt: Date }[],
  date: Date,
): DailyAggregatePayload {
  const { from, to } = dayBounds(date);
  let count = 0;
  for (const r of rows) if (within(r.createdAt, from, to)) count++;
  return scalar(date, DOMAIN_METRIC_TYPES.astraMessages, count);
}

/**
 * Distinct organizations that produced ≥1 value-event ON the target day. The
 * cron passes the same per-product activity tuples it builds for the DAU series
 * (see {@link ProductActivity}); this counts DISTINCT `orgKey`s across them whose
 * activity day is the target day, IGNORING tuples with no org (user-scoped
 * surfaces like Scholar carry no org and must not inflate an "active orgs"
 * tenant count). One dense scalar payload (0 on an empty day).
 *
 * `orgKey` is the raw organization id (or null when the activity is user-scoped);
 * it is used ONLY for distinct-counting and never surfaced.
 */
export function rollupActiveOrgs(
  activity: readonly ProductActivity[],
  date: Date,
): DailyAggregatePayload {
  const dayMs = date.getTime();
  const orgs = new Set<string>();
  for (const a of activity) {
    if (a.dayMs !== dayMs) continue;
    if (a.orgKey) orgs.add(a.orgKey);
  }
  return scalar(date, DOMAIN_METRIC_TYPES.activeOrgs, orgs.size);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Per-product DAU / WAU / MAU + stickiness (dimensional series)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One unit of product activity: a tenant actor produced a value-event for a given
 * product on a given UTC day. The cron builds these from the SAME domain rows +
 * predicates the steering route uses (TradeItem CLASSIFIED, TradeLicense issued,
 * AstraMessage assistant turn, ScholarPlanspielRun started, …), attributing each
 * to its product via the WACO catalogue and to a stable tenant `actorKey`
 * ("org:<id>" when org-scoped, else "user:<id>").
 *
 *   • `product`  — one of the five {@link VALUE_PRODUCTS} slugs.
 *   • `actorKey` — stable tenant identity for distinct-counting (never surfaced).
 *   • `orgKey`   — raw org id, or null for user-scoped activity (Scholar). Used
 *                  ONLY by {@link rollupActiveOrgs}.
 *   • `dayMs`    — UTC-midnight ms of the activity's day (the cron buckets the
 *                  event timestamp to its UTC day before constructing this).
 */
export interface ProductActivity {
  product: ValueProduct;
  actorKey: string;
  orgKey: string | null;
  dayMs: number;
}

/**
 * Distinct ACTIVE tenants per product over a window ending on (and including) the
 * target day. "Active" = produced ≥1 value-event in the window. Counts DISTINCT
 * `actorKey`s per product whose `dayMs` falls in `[targetDayMs - (windowDays-1)d,
 * targetDayMs]` (inclusive both ends — a window of whole UTC days that ends on the
 * target day).
 *
 *   • windowDays = 1  → DAU (the target day only)
 *   • windowDays = 7  → WAU (rolling 7 days)
 *   • windowDays = 30 → MAU (rolling 30 days)
 *
 * Returns a plain map product→count for EVERY one of the five products (0 when
 * none active), so callers can always enumerate all products densely.
 */
export function activeTenantsByProduct(
  activity: readonly ProductActivity[],
  date: Date,
  windowDays: number,
): Record<ValueProduct, number> {
  const targetDayMs = date.getTime();
  // Inclusive lower bound: (windowDays-1) whole days before the target day.
  const fromMs = targetDayMs - (Math.max(1, windowDays) - 1) * 86_400_000;
  // Inclusive upper bound = end of the target day (exclusive of the next day).
  const toMsExclusive = targetDayMs + 86_400_000;

  // product → Set<actorKey> of distinct active tenants in the window.
  const sets = new Map<ValueProduct, Set<string>>();
  for (const product of VALUE_PRODUCTS) sets.set(product, new Set<string>());

  for (const a of activity) {
    if (a.dayMs < fromMs || a.dayMs >= toMsExclusive) continue;
    const set = sets.get(a.product);
    // Defensive: ignore an activity tagged with a product outside the catalogue.
    if (set) set.add(a.actorKey);
  }

  const out = {} as Record<ValueProduct, number>;
  for (const product of VALUE_PRODUCTS) out[product] = sets.get(product)!.size;
  return out;
}

/**
 * Stickiness ratio DAU/MAU, rounded to 3dp, guarded so MAU=0 → 0 (not NaN/∞).
 * A standard engagement ratio (how much of the monthly base is active on a given
 * day). Pure helper, exported for the surface lane / tests to reuse the exact
 * definition.
 */
export function stickiness(dau: number, mau: number): number {
  if (!Number.isFinite(dau) || !Number.isFinite(mau) || mau <= 0) return 0;
  return Math.round((dau / mau) * 1000) / 1000;
}

/**
 * The full per-product engagement block for the target day: for each of the five
 * products, four dimensional payloads (product_dau, product_wau, product_mau,
 * product_stickiness) with `dimension="product"`, `dimensionValue=<slug>`. DENSE:
 * every product gets all four rows every day (0 / 0 / 0 / 0 when inactive), so the
 * per-product time-series never gaps. Products are emitted in catalogue order.
 */
export function rollupProductEngagement(
  activity: readonly ProductActivity[],
  date: Date,
): DailyAggregatePayload[] {
  const dau = activeTenantsByProduct(activity, date, 1);
  const wau = activeTenantsByProduct(activity, date, 7);
  const mau = activeTenantsByProduct(activity, date, 30);

  const out: DailyAggregatePayload[] = [];
  for (const product of VALUE_PRODUCTS) {
    out.push(
      dimensional(
        date,
        DOMAIN_METRIC_TYPES.productDau,
        DOMAIN_DIMENSIONS.product,
        product,
        dau[product],
      ),
      dimensional(
        date,
        DOMAIN_METRIC_TYPES.productWau,
        DOMAIN_DIMENSIONS.product,
        product,
        wau[product],
      ),
      dimensional(
        date,
        DOMAIN_METRIC_TYPES.productMau,
        DOMAIN_DIMENSIONS.product,
        product,
        mau[product],
      ),
      dimensional(
        date,
        DOMAIN_METRIC_TYPES.productStickiness,
        DOMAIN_DIMENSIONS.product,
        product,
        stickiness(dau[product], mau[product]),
      ),
    );
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Convenience composer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The raw bundle the cron assembles for one day: each field is the projected row
 * set (or activity-tuple set) for that series. Grouped so the cron has ONE typed
 * hand-off point and the test can drive the whole pipeline from one fixture.
 */
export interface DomainRollupInput {
  date: Date;
  deadlines: readonly DeadlineRow[];
  ncaSubmissions: readonly NcaSubmissionRow[];
  documents: readonly GeneratedDocumentRow[];
  astraMessages: readonly { createdAt: Date }[];
  /** Per-product value-event activity for the trailing 30 days (for DAU/WAU/MAU). */
  productActivity: readonly ProductActivity[];
}

/**
 * Build EVERY domain-derived payload for the target day in one call. The cron
 * upserts each returned payload idempotently on the compound-unique key. Pure +
 * deterministic: identical input ⇒ identical output. Active-orgs reads the SAME
 * `productActivity` the DAU series uses (the value-event activity that day), so
 * the two definitions can never drift.
 */
export function buildDomainRollups(
  input: DomainRollupInput,
): DailyAggregatePayload[] {
  const { date } = input;
  return [
    ...rollupDeadlines(input.deadlines, date),
    ...rollupNcaSubmissions(input.ncaSubmissions, date),
    ...rollupDocumentsGenerated(input.documents, date),
    rollupAstraMessages(input.astraMessages, date),
    rollupActiveOrgs(input.productActivity, date),
    ...rollupProductEngagement(input.productActivity, date),
  ];
}
