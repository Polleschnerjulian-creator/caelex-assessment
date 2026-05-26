/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/workflows/[id]/run
 *
 * Atlas V3 T1.E.24 + T1.E.26 + T1.E.27 — kicks off a multi-step
 * workflow pipeline. The runner sequences runChat() calls per step,
 * carrying chatId forward so the chat-history accumulates as the
 * pipeline progresses. Returns the structured PipelineRunResult.
 *
 * Approval-gate behaviour (T1.E.26):
 *   - Default: pre-flight halt if any step uses an approval-required
 *     tool (draft_*, create_matter_invite, etc.). Response carries
 *     `awaitingApproval.pendingSteps` so the UI prompts the user.
 *   - Re-invoke with `bypassApproval: true` after user consent to
 *     actually run the pipeline.
 *
 * Retry policy (T1.E.27): default 2 retries / 1s+3s backoff. Caller
 * can override or set maxRetries: 0 to disable.
 *
 * NOTE: this route is synchronous — it awaits the full pipeline
 * (potentially 30-120s for a 3-4-step run) and returns the final
 * result in one HTTP response. For longer pipelines the future
 * upgrade is to fire-and-forget + poll via /api/atlas/workflows/run/
 * [runId]/status (per master plan T1.E.25 — not in scope here).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { runWorkflowPipeline } from "@/lib/atlas/workflow-pipeline-runner.server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Pipelines can take 30-120s — bump the Vercel function timeout
   well above the default 10s. Hobby tier caps at 60s; Pro caps at
   900s. The chat-engine itself sits at 300s for the same reason. */
export const maxDuration = 300;

const BodySchema = z.object({
  /** Approval-gate override (T1.E.26). Default false — pipeline halts
   *  if any step uses an approval-required tool. */
  bypassApproval: z.boolean().optional(),
  /** Mandate-scope applied to every step. */
  mandateId: z.string().nullable().optional(),
  /** UI language passed to chat-engine for system-prompt locale. */
  language: z.enum(["de", "en", "fr", "es"]).optional(),
  /** Halt pipeline on empty assistant turn (no text + no tool-calls).
   *  Default true. */
  abortOnEmptyTurn: z.boolean().optional(),
  /** Override workflow's default toolToggles. */
  toolToggles: z.record(z.string(), z.boolean()).optional(),
  /** Retry policy (T1.E.27). */
  retryPolicy: z
    .object({
      maxRetries: z.number().int().min(0).max(10),
      backoffMs: z.array(z.number().int().min(0).max(60000)),
    })
    .optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const atlas = await getAtlasAuth();
    if (!atlas) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* Rate-limit via the existing `assessment` tier (10/hr Redis,
       5/hr in-memory). Workflow pipelines are heavy multi-step LLM
       chains — same cost profile as a full compliance-assessment run. */
    const id = getIdentifier(atlas.userId);
    const rl = await checkRateLimit("assessment", id);
    if (!rl.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rl.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfter ?? 60),
          },
        },
      );
    }

    const { id: workflowId } = await context.params;
    if (!workflowId || workflowId.length > 200) {
      return NextResponse.json(
        { error: "Invalid workflow id" },
        { status: 400 },
      );
    }

    /* Parse + validate body. Empty body is OK — all fields optional. */
    let body: unknown = {};
    try {
      const raw = await request.text();
      if (raw.length > 0) body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await runWorkflowPipeline({
      workflowId,
      userId: atlas.userId,
      organizationId: atlas.organizationId,
      mandateId: parsed.data.mandateId ?? null,
      language: parsed.data.language,
      toolToggles: parsed.data.toolToggles,
      abortOnEmptyTurn: parsed.data.abortOnEmptyTurn,
      bypassApproval: parsed.data.bypassApproval,
      retryPolicy: parsed.data.retryPolicy,
    });

    /* Hard aborts (workflow not found, no pipeline) → 404/400. */
    if (result.aborted?.code === "WORKFLOW_NOT_FOUND") {
      return NextResponse.json(
        { error: result.aborted.message, code: result.aborted.code },
        { status: 404 },
      );
    }
    if (result.aborted?.code === "NO_PIPELINE") {
      return NextResponse.json(
        { error: result.aborted.message, code: result.aborted.code },
        { status: 400 },
      );
    }

    /* Approval-required halt → 200 (not an error — the UI is supposed
       to prompt the user and re-invoke). Include the full result so
       the UI can show step previews. */
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    logger.error("[atlas/workflows/run] crashed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
