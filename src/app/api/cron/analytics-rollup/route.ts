import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, endOfDay, subWeeks } from "date-fns";
import { logger } from "@/lib/logger";
import { productFromPath, type Product } from "@/lib/analytics/events";
import { deriveFeature } from "@/lib/analytics/feature-map";
import {
  isoWeekStart,
  reconstructPathEdges,
  computeRetentionGrid,
  computeFunnelDaily,
  averageDwellByFeature,
  DEFAULT_FUNNELS,
  type PageHit,
  type FunnelEvent,
  type SignupRow,
  type ActivityRow,
  type DwellSample,
} from "@/lib/analytics/rollups";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Cron-secret gate — copied VERBATIM from the sibling analytics-aggregate cron
 * so both crons share one constant-time comparison path. `timingSafeEqual`
 * over equal-length buffers avoids leaking the secret via response timing.
 */
function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const headerBuffer = Buffer.from(header);
    const expectedBuffer = Buffer.from(`Bearer ${secret}`);
    if (headerBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(headerBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Cron endpoint for the cross-product analytics ROLLUPS (Phase 3).
 * Schedule: Daily, after analytics-aggregate (which owns the simpler DAU/MAU
 * aggregates). This heavier cron materialises the four "graph-shaped" rollups
 * the product-analytics surface renders:
 *
 *   1. AnalyticsPathEdge          — session-journey Sankey edges (per day)
 *   2. AnalyticsFunnelDaily       — per-step funnel entry/completion (per day)
 *   3. AnalyticsRetentionCohort   — cohort × activity-week retention grid (12wk)
 *   4. FeatureUsageDaily.avgDurationSecs — per-feature foreground dwell (per day)
 *
 * ── WHY a SEPARATE cron from analytics-aggregate ────────────────────────────
 * These four passes are O(events) graph reconstructions, not simple counts, so
 * they get their own `maxDuration=120` budget and their own try/catch. All the
 * deterministic math lives in the PURE `@/lib/analytics/rollups` module; this
 * route only does I/O (fetch rows → hand plain arrays to the pure fns → upsert).
 *
 * ── EVENT-TYPE DUALITY ──────────────────────────────────────────────────────
 * The NEW provider emits `page_viewed`; LEGACY code still emits `page_view`.
 * Pass 1 (path edges) therefore selects BOTH strings. The funnel definitions
 * (DEFAULT_FUNNELS) already list both in their acquisition step, so Pass 2's
 * event set inherits the duality automatically.
 *
 * ── DETERMINISM / UTC ───────────────────────────────────────────────────────
 * Crons run in UTC. We key every daily rollup off `startOfDay(yesterday)` and
 * every weekly rollup off `isoWeekStart(...)` (pure UTC math), so the output is
 * reproducible regardless of the server's local timezone.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  if (!isValidCronSecret(auth, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Yesterday's full UTC day is the daily window. `day` is the @db.Date key
  // shared by every daily rollup (path edges, funnel, dwell).
  const yesterday = subDays(new Date(), 1);
  const dayStart = startOfDay(yesterday);
  const dayEnd = endOfDay(yesterday);
  const day = dayStart;

  const results = {
    pathEdges: 0,
    funnelRows: 0,
    retentionCells: 0,
    dwellFeatures: 0,
  };

  try {
    // ───────────────────────────────────────────────────────────────────────
    // PASS 1 — Path edges (AnalyticsPathEdge)
    // Reconstruct the per-session page journey into a weighted directed graph.
    // ───────────────────────────────────────────────────────────────────────
    const hits = await prisma.analyticsEvent.findMany({
      where: {
        timestamp: { gte: dayStart, lte: dayEnd },
        // DUALITY: match both the new `page_viewed` and the legacy `page_view`.
        eventType: { in: ["page_viewed", "page_view"] },
        path: { not: null },
      },
      select: {
        sessionId: true,
        timestamp: true,
        path: true,
        product: true,
      },
      orderBy: [{ sessionId: "asc" }, { timestamp: "asc" }],
    });

    // Map DB rows → PageHit. `path` is non-null by the WHERE filter; fall back
    // to productFromPath for legacy rows whose `product` column is still null.
    const pageHits: PageHit[] = hits.map((h) => ({
      sessionId: h.sessionId,
      timestamp: h.timestamp,
      path: h.path as string,
      product: (h.product as Product) ?? productFromPath(h.path),
    }));

    // maxEdges caps cardinality so one pathological day cannot unbound the table.
    const edges = reconstructPathEdges(pageHits, { maxEdges: 2000 });
    if (edges.length >= 2000) {
      // reconstructPathEdges slices to exactly maxEdges, so hitting the cap means
      // the day MAY have had more distinct edges than we kept (the long tail is
      // dropped lowest-traffic-first). Surfaced as a capacity signal, not a hard error.
      logger.warn(
        "[Analytics Rollup] Path edges at the maxEdges=2000 cap — long tail may be truncated",
      );
    }

    for (const e of edges) {
      await prisma.analyticsPathEdge.upsert({
        where: {
          // Prisma compound-unique arg name for @@unique([date,product,fromPath,toPath]).
          date_product_fromPath_toPath: {
            date: day,
            product: e.product,
            fromPath: e.fromPath,
            toPath: e.toPath,
          },
        },
        update: { transitions: e.transitions },
        create: {
          date: day,
          product: e.product,
          fromPath: e.fromPath,
          toPath: e.toPath,
          transitions: e.transitions,
        },
      });
    }
    results.pathEdges = edges.length;

    // ───────────────────────────────────────────────────────────────────────
    // PASS 2 — Funnel (AnalyticsFunnelDaily)
    // Per funnel, per step: usersEntered / usersCompleted / medianMsToNext.
    // ───────────────────────────────────────────────────────────────────────
    // Collect every eventType any default funnel references → a single IN list.
    const funnelEventTypes = new Set<string>();
    for (const f of DEFAULT_FUNNELS) {
      for (const step of f.steps) {
        for (const t of step.eventTypes) funnelEventTypes.add(t);
      }
    }

    const funnelRowsRaw = await prisma.analyticsEvent.findMany({
      where: {
        timestamp: { gte: dayStart, lte: dayEnd },
        eventType: { in: Array.from(funnelEventTypes) },
      },
      select: {
        userId: true,
        sessionId: true,
        eventType: true,
        timestamp: true,
      },
    });

    // subject = userId when authenticated, else the anonymous sessionId, so an
    // anonymous visit still flows through the early (acq → signup) steps.
    const funnelEvents: FunnelEvent[] = funnelRowsRaw.map((ev) => ({
      subject: ev.userId ?? ev.sessionId,
      eventType: ev.eventType,
      timestamp: ev.timestamp,
    }));

    const funnelRows = computeFunnelDaily(funnelEvents, DEFAULT_FUNNELS);

    for (const r of funnelRows) {
      await prisma.analyticsFunnelDaily.upsert({
        where: {
          date_funnelId_step: {
            date: day,
            funnelId: r.funnelId,
            step: r.step,
          },
        },
        update: {
          stepKey: r.stepKey,
          // product is null for the cross-product growth funnel.
          product: r.product ?? null,
          usersEntered: r.usersEntered,
          usersCompleted: r.usersCompleted,
          medianMsToNext: r.medianMsToNext,
        },
        create: {
          date: day,
          funnelId: r.funnelId,
          step: r.step,
          stepKey: r.stepKey,
          product: r.product ?? null,
          usersEntered: r.usersEntered,
          usersCompleted: r.usersCompleted,
          medianMsToNext: r.medianMsToNext,
        },
      });
    }
    results.funnelRows = funnelRows.length;

    // ───────────────────────────────────────────────────────────────────────
    // PASS 3 — Retention (AnalyticsRetentionCohort), 12-week rolling window.
    // Cohort = the ISO week a user signed up; grid counts who returned, per
    // product scope, in each later activity week.
    // ───────────────────────────────────────────────────────────────────────
    // Window start = Monday of the ISO week 11 weeks ago → a 12-week-wide grid
    // (weeks 0..11 inclusive) anchored on whole ISO weeks.
    const cohortStart = isoWeekStart(subWeeks(new Date(), 11));

    const users = await prisma.user.findMany({
      where: { createdAt: { gte: cohortStart } },
      select: { id: true, createdAt: true },
    });
    // Each user's signup is bucketed to the Monday of its ISO week.
    const signups: SignupRow[] = users.map((u) => ({
      userId: u.id,
      cohortWeek: isoWeekStart(u.createdAt),
    }));

    const acts = await prisma.analyticsEvent.findMany({
      where: {
        timestamp: { gte: cohortStart },
        userId: { not: null },
      },
      select: {
        userId: true,
        timestamp: true,
        product: true,
        path: true,
      },
    });

    // Dedupe raw events to DISTINCT (userId, activityWeek, product) rows so the
    // activity array is bounded by users×weeks×products, not by event volume.
    // The Set key encodes the same triple the cohort grid groups on.
    const seenActivity = new Set<string>();
    const activity: ActivityRow[] = [];
    for (const a of acts) {
      // userId is non-null by the WHERE filter.
      const userId = a.userId as string;
      const activityWeek = isoWeekStart(a.timestamp);
      const product = (a.product as Product) ?? productFromPath(a.path);
      const key = `${userId}|${activityWeek.getTime()}|${product}`;
      if (seenActivity.has(key)) continue;
      seenActivity.add(key);
      activity.push({ userId, activityWeek, product });
    }

    // Scopes: "all" (any-product retention) + the five logged-in ProductCodes.
    // `marketing` is deliberately omitted — it is the pre-login top-of-funnel and
    // carries no userId, so a per-marketing retention curve would always be empty.
    const cells = computeRetentionGrid(signups, activity, [
      "all",
      "comply",
      "trade",
      "atlas",
      "pharos",
      "scholar",
    ]);

    for (const c of cells) {
      await prisma.analyticsRetentionCohort.upsert({
        where: {
          cohortWeek_productScope_activityWeek: {
            cohortWeek: c.cohortWeek,
            productScope: c.productScope,
            activityWeek: c.activityWeek,
          },
        },
        update: {
          cohortSize: c.cohortSize,
          returnedUsers: c.returnedUsers,
          weeksSince: c.weeksSince,
        },
        create: {
          cohortWeek: c.cohortWeek,
          productScope: c.productScope,
          activityWeek: c.activityWeek,
          cohortSize: c.cohortSize,
          returnedUsers: c.returnedUsers,
          weeksSince: c.weeksSince,
        },
      });
    }
    results.retentionCells = cells.length;

    // ───────────────────────────────────────────────────────────────────────
    // PASS 4 — Dwell (FeatureUsageDaily.avgDurationSecs)
    // Average foreground dwell per derived feature, written onto the existing
    // per-feature daily row (other columns are owned by analytics-aggregate).
    // ───────────────────────────────────────────────────────────────────────
    const dw = await prisma.analyticsEvent.findMany({
      where: {
        timestamp: { gte: dayStart, lte: dayEnd },
        eventType: "screen_dwelled",
      },
      select: {
        path: true,
        product: true,
        durationMs: true,
        eventData: true,
      },
    });

    // Build dwell samples + remember each feature's display name/category so the
    // CREATE branch of the upsert can populate them on first sight.
    const samples: DwellSample[] = [];
    const featureMeta = new Map<string, { name: string; category: string }>();
    for (const row of dw) {
      // Prefer the typed `durationMs` column; fall back to the envelope payload
      // (`eventData.payload.durationMs`) for rows written before the column.
      const ms =
        row.durationMs ??
        (row.eventData as { payload?: { durationMs?: unknown } } | null)
          ?.payload?.durationMs;
      if (!(typeof ms === "number" && ms > 0)) continue;

      const prod = (row.product as Product) ?? productFromPath(row.path);
      const f = deriveFeature(prod, row.path);
      if (!f) continue; // non-feature path (api/_next/static) → skip

      samples.push({ featureId: f.featureId, durationMs: ms });
      if (!featureMeta.has(f.featureId)) {
        featureMeta.set(f.featureId, {
          name: f.featureName,
          category: f.moduleCategory,
        });
      }
    }

    const avgs = averageDwellByFeature(samples);

    for (const a of avgs) {
      const known = featureMeta.get(a.featureId);
      await prisma.featureUsageDaily.upsert({
        where: {
          date_featureId: {
            date: day,
            featureId: a.featureId,
          },
        },
        // Only the dwell column is ours; the count columns belong to
        // analytics-aggregate, so we never clobber them here.
        update: { avgDurationSecs: a.avgDurationSecs },
        create: {
          date: day,
          featureId: a.featureId,
          featureName: known?.name ?? a.featureId,
          moduleCategory: known?.category ?? "unknown",
          avgDurationSecs: a.avgDurationSecs,
        },
      });
    }
    results.dwellFeatures = avgs.length;

    return NextResponse.json({
      success: true,
      date: day.toISOString(),
      results,
    });
  } catch (error) {
    // Log the real error server-side; return a generic message (no detail leak).
    logger.error("[Analytics Rollup] Error", error);
    return NextResponse.json({ error: "Rollup failed" }, { status: 500 });
  }
}
