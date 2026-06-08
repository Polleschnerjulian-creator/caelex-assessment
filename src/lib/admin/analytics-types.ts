/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — the API ⇄ UI response contract (Phase 4).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This is the SINGLE SOURCE OF TRUTH for the JSON shapes the /api/admin/v2/*
 * read endpoints return and the /admin pages consume. It is a PURE module (no
 * React, no Prisma, no server-only) so both the route handlers and the client
 * pages import the same types — the compiler is then the contract enforcer
 * across the API ⇄ UI boundary.
 *
 * Every endpoint reads ONLY the PII-free Phase-3 rollup tables
 * (AnalyticsDailyAggregate, FeatureUsageDaily, AnalyticsFunnelDaily,
 * AnalyticsRetentionCohort, AnalyticsPathEdge) — never raw AnalyticsEvent — so
 * the cockpit never re-scans events and never touches a personal identifier.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/** The supported look-back windows (mirrors the existing analytics page). */
export type AdminRange = "7d" | "30d" | "90d";

/** Number of days each range covers. */
export const ADMIN_RANGE_DAYS: Record<AdminRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** Type guard for an untrusted `?range=` query param. */
export function isAdminRange(v: unknown): v is AdminRange {
  return v === "7d" || v === "30d" || v === "90d";
}

// ─────────────────────────────────────────────────────────────────────────────
// Cockpit — GET /api/admin/v2/cockpit?range=30d
// ─────────────────────────────────────────────────────────────────────────────

/** Per-product usage roll-up for the cross-product overview. */
export interface CockpitProductUsage {
  /** comply | trade | atlas | pharos | scholar | marketing */
  product: string;
  /** distinct featureIds touched in the range */
  features: number;
  /** peak single-day unique users across the range (approx headcount) */
  peakDailyUsers: number;
  /** total actions (page-view rows) summed across the range */
  totalActions: number;
  /** mean foreground dwell across this product's features, seconds (1dp), or null */
  avgDwellSecs: number | null;
}

/** Headline KPI tiles. DAU/WAU/MAU are the latest day's point-in-time values;
 * signups/pageViews/revenue are summed across the range. */
export interface CockpitKpis {
  dau: number;
  wau: number;
  mau: number;
  signups: number;
  pageViews: number;
  revenue: number;
}

/** One step of the cross-product "growth" funnel (latest snapshot). */
export interface CockpitFunnelStep {
  stepKey: string;
  usersEntered: number;
  usersCompleted: number;
}

/** A single point on the DAU sparkline. */
export interface TrendPoint {
  /** ISO date (yyyy-mm-dd) */
  date: string;
  value: number;
}

export interface CockpitResponse {
  range: AdminRange;
  /** ISO timestamp the payload was computed (server now()). */
  generatedAt: string;
  kpis: CockpitKpis;
  perProduct: CockpitProductUsage[];
  dauTrend: TrendPoint[];
  growthFunnel: CockpitFunnelStep[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Retention — GET /api/admin/v2/retention?scope=all
// ─────────────────────────────────────────────────────────────────────────────

/** One cell of a cohort's retention row. */
export interface RetentionCell {
  weeksSince: number;
  returnedUsers: number;
  /** returnedUsers / cohortSize, 0..1 (0 when cohortSize is 0). */
  pct: number;
}

/** One signup-cohort row of the retention grid. */
export interface RetentionCohortRow {
  /** ISO week-start date (Monday) the cohort signed up. */
  cohortWeek: string;
  cohortSize: number;
  /** dense, ascending by weeksSince. */
  cells: RetentionCell[];
}

export interface RetentionResponse {
  /** all | comply | trade | atlas | pharos | scholar */
  scope: string;
  /** the scopes that actually have data (for the scope switcher). */
  availableScopes: string[];
  /** cohorts newest-first. */
  cohorts: RetentionCohortRow[];
  /** widest weeksSince observed (for a stable column count). */
  maxWeeksSince: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funnels — GET /api/admin/v2/funnels?range=30d
// ─────────────────────────────────────────────────────────────────────────────

export interface FunnelStepView {
  step: number;
  stepKey: string;
  usersEntered: number;
  usersCompleted: number;
  /** median ms to the next step (null for the terminal step / no data). */
  medianMsToNext: number | null;
}

export interface FunnelView {
  funnelId: string;
  /** null for the cross-product growth funnel. */
  product: string | null;
  steps: FunnelStepView[];
}

export interface FunnelsResponse {
  range: AdminRange;
  funnels: FunnelView[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Paths — GET /api/admin/v2/paths?product=comply
// ─────────────────────────────────────────────────────────────────────────────

/** A directed page-to-page transition edge (already path-normalised, PII-free).
 * `fromPath`/`toPath` may be the "(entry)" / "(exit)" sentinels. */
export interface PathEdgeView {
  fromPath: string;
  toPath: string;
  transitions: number;
}

export interface PathsResponse {
  product: string;
  /** ISO date of the day these edges are for (latest day with data). */
  date: string | null;
  /** edges sorted by transitions desc (already capped server-side). */
  edges: PathEdgeView[];
}
