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
