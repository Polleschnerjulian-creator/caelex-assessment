/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Agent-Run Approval API (Sprint B1).
 * ────────────────────────────────────────────────────────────────────
 *   POST /api/atlas/agent/runs/[id]/approve
 *
 * Records the lawyer's decision on a pending approval-gate. This is
 * the partner to the /resume endpoint (which handles cost-budget
 * pauses) — they share the "thin endpoint, client re-POSTs main route
 * to continue" v1 pattern.
 *
 * Body shape:
 *   {
 *     toolUseId: string,             // the pending tool_use block id
 *     decision: "approved" | "rejected" | "modified",
 *     modifiedInput?: Record<string, unknown>  // required when modified
 *   }
 *
 * Behaviour:
 *   approved  → tool runs with original input
 *   rejected  → tool is skipped, model is told "user cancelled"
 *   modified  → tool runs with lawyer-edited input (modifiedInput)
 *
 * What this endpoint does NOT do:
 *   - It does not resume the run. The client must POST to
 *     /api/atlas/agent with `resumeFromRunId` set to pick the loop
 *     back up. Same shape as Sprint A1's /resume endpoint — keeps
 *     state-transitions decoupled from the long-lived SSE stream.
 *
 * Membership-gated by userId + organizationId — only the run owner
 * can approve.
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
import type { ApprovalGate } from "@/lib/atlas/agent/approval-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Sprint E2 — Batched body. Lawyer decides ALL pending dangerous
   tools in one round. Min 1, max 4 (matches MAX_PARALLEL_SUBTASKS
   and the approvalGates UI scroll-comfort cap). */
const DecisionEntry = z
  .object({
    toolUseId: z.string().min(1).max(200),
    decision: z.enum(["approved", "rejected", "modified"]),
    /* Free-form Json — must be a plain object when decision === "modified".
       Validation of the shape vs. the tool's actual input-schema happens
       at execution time in the agent route. We accept anything serialisable
       here to keep the endpoint generic across all 15+ tools. Zod v4
       requires explicit (keySchema, valueSchema) on z.record. */
    modifiedInput: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (b) =>
      b.decision !== "modified" ||
      (b.modifiedInput !== undefined && b.modifiedInput !== null),
    {
      message: "modifiedInput is required when decision === 'modified'",
      path: ["modifiedInput"],
    },
  );

const PostBody = z.object({
  decisions: z.array(DecisionEntry).min(1).max(4),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  /* Same `api` tier as /resume — these are user-driven, low-volume
     state-flip endpoints. */
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

  /* Membership-gate: lawyer can only approve own runs. findFirst with
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
      pausedForApproval: true,
      approvalGates: true,
    },
  });
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  /* Only paused-for-approval runs accept decisions. Reject any other
     state — guards against accidental double-clicks from the UI after
     the run has already moved on, or against trying to approve a run
     that paused for budget (use /resume for that). */
  if (!run.pausedForApproval || run.status !== "awaiting_approval") {
    return NextResponse.json(
      { error: "Run is not paused for approval" },
      { status: 409 },
    );
  }

  /* Find the pending gates by toolUseId. We expect each to exist (the
     route inserted it on pause) and to have decision === null. */
  const gates: ApprovalGate[] = Array.isArray(run.approvalGates)
    ? (run.approvalGates as unknown as ApprovalGate[])
    : [];

  /* Sprint E2 — Validate ALL decisions before applying any. Each
     toolUseId must exist in gates AND must still have decision=null
     (not yet decided). Bail fast if any check fails. */
  for (const d of parsed.data.decisions) {
    const target = gates.find((g) => g.toolUseId === d.toolUseId);
    if (!target) {
      return NextResponse.json(
        { error: `Tool-use ${d.toolUseId} not found in approval gates` },
        { status: 404 },
      );
    }
    if (target.decision !== null) {
      return NextResponse.json(
        { error: `Decision already recorded for ${d.toolUseId}` },
        { status: 409 },
      );
    }
  }

  /* Apply all decisions atomically — single update. */
  const decidedAt = new Date().toISOString();
  const decisionsByToolUseId = new Map(
    parsed.data.decisions.map((d) => [d.toolUseId, d] as const),
  );
  const updatedGates: ApprovalGate[] = gates.map((g) => {
    const d = decisionsByToolUseId.get(g.toolUseId);
    if (!d) return g;
    return {
      ...g,
      decision: d.decision,
      decidedAt,
      ...(d.decision === "modified" && d.modifiedInput
        ? { modifiedInput: d.modifiedInput }
        : {}),
    };
  });

  try {
    await prisma.atlasAgentRun.update({
      where: { id },
      data: {
        approvalGates: updatedGates as unknown as object,
      },
    });
    logger.info("[atlas/agent/approve] decisions recorded (batched)", {
      userId: atlas.userId,
      runId: id,
      count: parsed.data.decisions.length,
      decisions: parsed.data.decisions.map((d) => ({
        toolUseId: d.toolUseId,
        decision: d.decision,
      })),
    });
    return NextResponse.json({
      ok: true,
      runId: id,
      decisions: parsed.data.decisions.map((d) => ({
        toolUseId: d.toolUseId,
        decision: d.decision,
      })),
      decidedAt,
    });
  } catch (err) {
    logger.error("[atlas/agent/approve] failed", {
      userId: atlas.userId,
      runId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: getSafeErrorMessage(err, "Approve failed") },
      { status: 500 },
    );
  }
}
