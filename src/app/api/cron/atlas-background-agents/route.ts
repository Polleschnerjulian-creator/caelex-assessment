/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint D3 — Background Agent Cron.
 * ────────────────────────────────────────────────────────────────────
 *   GET /api/cron/atlas-background-agents
 *
 * Hourly Vercel cron. Finds AtlasMandate rows with:
 *   - backgroundAgentEnabled = true
 *   - backgroundAgentNextRunAt <= NOW
 *   - backgroundAgentGoal IS NOT NULL
 *   - backgroundAgentSchedule IS NOT NULL
 *
 * For each, fires `runAgentInBackground()` and updates the schedule's
 * nextRunAt = computeNextRunAt(schedule, now). Runs SEQUENTIALLY (not
 * parallel) to keep per-cron-invocation cost bounded — at typical
 * org-size (10-100 mandates) sequential is fine.
 *
 * Authed via `CRON_SECRET` header (Vercel cron sends it automatically
 * when the route is listed in vercel.json's `crons` array).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  runAgentInBackground,
  computeNextRunAt,
  isValidSchedule,
} from "@/lib/atlas/agent/background-runner.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Allow up to 5 minutes — the cron itself is fast (~ms), but each
   triggered background run can take 30-120s. */
export const maxDuration = 300;

/* A-M18: per-org daily AI spend cap.
   Default: $20 USD / org / calendar day (UTC).
   Override via ATLAS_MAX_ORG_DAILY_AI_SPEND_USD env var.
   Intent: 50 mandates × every-6h = up to 200 billable runs/day; without
   a cap a single misconfigured org could exhaust the Anthropic budget.
   The cap is intentionally org-scoped, not global, so one org can't
   starve another. */
const MAX_ORG_DAILY_AI_SPEND_USD: number = (() => {
  const raw = process.env.ATLAS_MAX_ORG_DAILY_AI_SPEND_USD;
  if (raw) {
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 20;
})();

export async function GET(req: NextRequest) {
  /* CRON_SECRET auth — matches the pattern used by the other 17
     Vercel crons in this repo. */
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  /* Find mandates with a due background run. Cap at 50 per
     invocation to bound wall-clock + cost. */
  const due = await prisma.atlasMandate.findMany({
    where: {
      backgroundAgentEnabled: true,
      backgroundAgentGoal: { not: null },
      backgroundAgentSchedule: { not: null },
      OR: [
        { backgroundAgentNextRunAt: null }, // newly-enabled, never run
        { backgroundAgentNextRunAt: { lte: now } },
      ],
    },
    select: {
      id: true,
      name: true,
      ownerUserId: true,
      organizationId: true,
      backgroundAgentGoal: true,
      backgroundAgentSchedule: true,
    },
    take: 50,
  });

  if (due.length === 0) {
    return NextResponse.json({ ok: true, dispatched: 0 });
  }

  logger.info("[atlas/cron/background-agents] dispatching", {
    count: due.length,
    mandateIds: due.map((m) => m.id),
  });

  /* A-M18: Compute per-org AI spend for today (UTC) ONCE per tick, not
     per mandate, so we do a single aggregate query rather than N queries.
     We sum costUsd for all AtlasAgentRun rows belonging to each org that
     started today and have a terminal or in-progress status (running
     runs already booked to the budget; skipped/cancelled have costUsd=0).
     The Map is keyed by organizationId. Orgs not in due[] are not queried. */
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);

  const dueOrgIds = [...new Set(due.map((m) => m.organizationId))];

  /* Group today's spend by org. Prisma groupBy with _sum is the correct
     approach; the resulting array has one entry per org with a non-zero
     spend today. Orgs with zero spend today won't appear — that's fine,
     we treat missing = $0. */
  const spendRows = await prisma.atlasAgentRun.groupBy({
    by: ["organizationId"],
    where: {
      organizationId: { in: dueOrgIds },
      startedAt: { gte: startOfToday },
    },
    _sum: { costUsd: true },
  });

  const orgSpendToday = new Map<string, number>();
  for (const row of spendRows) {
    orgSpendToday.set(row.organizationId, row._sum.costUsd ?? 0);
  }

  /* Track which orgs we've already decided to skip this tick so we don't
     re-check per mandate (the cap is org-level, one check per org). */
  const orgSkipped = new Set<string>();

  const results: Array<{
    mandateId: string;
    status: string;
    runId?: string;
    error?: string;
  }> = [];

  /* Sequential — parallel would risk burning rate-limit + makes the
     5-min maxDuration math harder to reason about. */
  for (const m of due) {
    if (!m.backgroundAgentGoal || !m.backgroundAgentSchedule) continue;
    if (!isValidSchedule(m.backgroundAgentSchedule)) {
      logger.warn("[atlas/cron/background-agents] invalid schedule", {
        mandateId: m.id,
        schedule: m.backgroundAgentSchedule,
      });
      continue;
    }

    /* A-M18: daily budget gate — check once per org, skip all its
       mandates for the rest of this tick if the cap is reached. */
    if (!orgSkipped.has(m.organizationId)) {
      const spentToday = orgSpendToday.get(m.organizationId) ?? 0;
      if (spentToday >= MAX_ORG_DAILY_AI_SPEND_USD) {
        orgSkipped.add(m.organizationId);
        logger.warn(
          "[atlas/cron/background-agents] org daily AI spend cap reached — skipping remaining mandates for org",
          {
            organizationId: m.organizationId,
            spentTodayUsd: spentToday,
            capUsd: MAX_ORG_DAILY_AI_SPEND_USD,
            mandateId: m.id,
          },
        );
      }
    }
    if (orgSkipped.has(m.organizationId)) {
      results.push({ mandateId: m.id, status: "skipped_budget_cap" });
      continue;
    }

    /* Claim the slot BEFORE the long-running call: advance nextRunAt
       up-front so a maxDuration timeout (runs take 30-120s, budget is
       300s) or a mid-run crash can't leave the mandate still "due" on
       the next tick — which would re-dispatch the same goal (double
       Claude spend) and orphan the in-flight AtlasAgentRun at
       status="running". Halted/errored runs are intentionally deferred
       to their next scheduled slot rather than retried on the very next
       tick; the lawyer can disable via settings if a mandate keeps
       halting. */
    const nextRunAt = computeNextRunAt(m.backgroundAgentSchedule, now);
    await prisma.atlasMandate.update({
      where: { id: m.id },
      data: {
        backgroundAgentLastRunAt: now,
        backgroundAgentNextRunAt: nextRunAt,
      },
    });

    try {
      const result = await runAgentInBackground({
        userId: m.ownerUserId,
        organizationId: m.organizationId,
        mandateId: m.id,
        goal: m.backgroundAgentGoal,
      });

      results.push({
        mandateId: m.id,
        status: result.status,
        runId: result.runId,
        error: result.message,
      });

      /* A-M18: update the in-memory spend tracker so subsequent mandates
         in this same tick see the accumulated cost from runs we already
         dispatched (the DB rows from this tick won't be visible in the
         query we ran above). We use the costUsd recorded on the run result
         when available; fall back to 0 so we don't over-estimate. */
      if (result.costUsd && result.costUsd > 0) {
        const prev = orgSpendToday.get(m.organizationId) ?? 0;
        orgSpendToday.set(m.organizationId, prev + result.costUsd);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[atlas/cron/background-agents] dispatch failed", {
        mandateId: m.id,
        error: msg,
      });
      results.push({ mandateId: m.id, status: "error", error: msg });
    }
  }

  return NextResponse.json({
    ok: true,
    dispatched: results.length,
    results,
  });
}
