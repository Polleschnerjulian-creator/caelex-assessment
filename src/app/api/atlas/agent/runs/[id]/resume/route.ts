/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Agent-Run Resume API (Sprint A1).
 * ────────────────────────────────────────────────────────────────────
 *   POST /api/atlas/agent/runs/[id]/resume
 *
 * The lawyer-confirmation gate for cost-budget-paused runs. When the
 * agent route hits the budget threshold, it pauses (sets
 * `pausedForBudget: true` + `status: "paused"`) and the SSE-stream
 * closes. The UI then surfaces a confirmation modal; the lawyer's
 * answer comes back here.
 *
 * Body shape:
 *   {
 *     approve: boolean,            // continue or stop
 *     increaseBudgetTo?: number    // optional bump to a new budget
 *   }
 *
 * Behaviour:
 *   approve === false  → status = "stopped_for_budget"
 *   approve === true   → pausedForBudget = false, optional new budget
 *
 * v1 trade-off (DOCUMENTED):
 *   This endpoint ONLY clears the pause-flag + records the lawyer's
 *   decision. The actual continuation requires the UI to re-POST the
 *   original /api/atlas/agent request — the conversation-history
 *   replay across two HTTP requests is non-trivial (we'd need to
 *   serialise + restore the in-flight Anthropic.MessageParam[] from
 *   AtlasAgentRun.steps + reasoning). v2 will move continuation
 *   server-side via a "resume-from-DB" path.
 *
 * Membership-gated by userId + organizationId — only the run owner
 * can resume.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({
  approve: z.boolean(),
  /* Optional new budget. Capped at $100/run same as the start-route
     so a malicious / runaway client can't bump itself to $10k. */
  increaseBudgetTo: z.number().positive().max(100).nullable().optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PostBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;

  /* Membership-gate: lawyer can only act on own runs. findFirst with
     full WHERE so a 404 leaks no info about runs they don't own. */
  const run = await prisma.atlasAgentRun.findFirst({
    where: {
      id,
      userId: atlas.userId,
      organizationId: atlas.organizationId,
    },
    select: {
      id: true,
      status: true,
      pausedForBudget: true,
      budgetUsd: true,
      costUsd: true,
    },
  });
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  /* Only paused runs can be resumed. Reject when the run is in any
     other state — guards against accidental double-clicks from the UI
     after the run has already moved on. */
  if (!run.pausedForBudget || run.status !== "paused") {
    return NextResponse.json(
      { error: "Run is not paused for budget" },
      { status: 409 },
    );
  }

  try {
    if (parsed.data.approve === false) {
      /* Lawyer chose to stop. Mark the run as terminally stopped-for-
         budget so the history view can render the right badge. */
      await prisma.atlasAgentRun.update({
        where: { id },
        data: {
          status: "stopped_for_budget",
          pausedForBudget: false,
          completedAt: new Date(),
        },
      });
      logger.info("[atlas/agent/resume] stopped for budget", {
        userId: atlas.userId,
        runId: id,
        costUsd: run.costUsd,
        budgetUsd: run.budgetUsd ? Number(run.budgetUsd) : null,
      });
      return NextResponse.json({ ok: true, decision: "stopped" });
    }

    /* Approved — clear the pause-flag. Optionally bump the budget.
       Status moves back to "running" so the next /api/atlas/agent
       re-POST can pick up where we left off (v1 client-side
       re-POST; see file-docblock). */
    await prisma.atlasAgentRun.update({
      where: { id },
      data: {
        pausedForBudget: false,
        status: "running",
        ...(parsed.data.increaseBudgetTo !== undefined &&
        parsed.data.increaseBudgetTo !== null
          ? { budgetUsd: parsed.data.increaseBudgetTo }
          : {}),
      },
    });
    logger.info("[atlas/agent/resume] approved", {
      userId: atlas.userId,
      runId: id,
      costUsd: run.costUsd,
      previousBudget: run.budgetUsd ? Number(run.budgetUsd) : null,
      newBudget: parsed.data.increaseBudgetTo ?? null,
    });
    return NextResponse.json({ ok: true, decision: "approved" });
  } catch (err) {
    logger.error("[atlas/agent/resume] failed", {
      userId: atlas.userId,
      runId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: getSafeErrorMessage(err, "Resume failed") },
      { status: 500 },
    );
  }
}
