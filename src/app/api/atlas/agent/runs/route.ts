/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Agent-Run History API.
 *
 *   GET /api/atlas/agent/runs?mandateId=<cuid>?&limit=<n>?&status=<s>?
 *
 * Lists Agent-Runs for the calling user (org-scoped). Used by the
 * /atlas/agent/history page. Returns lightweight metadata only —
 * the full step / artifact / citation payload is fetched per-run
 * via /api/atlas/agent/runs/[id].
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  mandateId: z.string().cuid().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  status: z.enum(["running", "complete", "error", "aborted"]).optional(),
  templateId: z.string().min(1).max(100).optional(),
});

export async function GET(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    mandateId: url.searchParams.get("mandateId") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    templateId: url.searchParams.get("templateId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const where: {
    userId: string;
    organizationId: string;
    mandateId?: string;
    status?: string;
    templateId?: string;
  } = {
    userId: atlas.userId,
    organizationId: atlas.organizationId,
  };
  if (parsed.data.mandateId) where.mandateId = parsed.data.mandateId;
  if (parsed.data.status) where.status = parsed.data.status;
  if (parsed.data.templateId) where.templateId = parsed.data.templateId;

  try {
    const runs = await prisma.atlasAgentRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: parsed.data.limit,
      select: {
        id: true,
        goal: true,
        status: true,
        iterations: true,
        inputTokens: true,
        outputTokens: true,
        costUsd: true,
        errorMessage: true,
        startedAt: true,
        completedAt: true,
        mandate: {
          select: {
            id: true,
            name: true,
            clientName: true,
          },
        },
        /* Sprint C1 — surface fork lineage in the history list so the
         UI can render a small "↪ from XXXXXXXX@N" badge under the
         goal-preview. Cheap fields, no join. */
        parentRunId: true,
        forkedFromStep: true,
      },
    });

    /* AUDIT-FIX M04 (2026-05-17): sanitise errorMessage in the list-
     view too (single-run GET [id] already sanitises via M25). Pre-M25
     rows may contain stack traces / internal paths that we don't want
     surfaced. Match getSafeErrorMessage's contract: replace with
     "Run failed" when it looks like a dev-detail message. */
    const SAFE_ERROR_PATTERNS = [
      /at\s+\w+\s*\(/, // stack trace frame
      /\/Users\/|\\Users\\/, // local path leak
      /node_modules/, // module path leak
    ];
    const sanitisedRuns = runs.map((r) => ({
      ...r,
      errorMessage:
        r.errorMessage &&
        SAFE_ERROR_PATTERNS.some((p) => p.test(r.errorMessage!))
          ? "Run failed"
          : r.errorMessage,
    }));
    return NextResponse.json({ runs: sanitisedRuns });
  } catch (err) {
    logger.error("[atlas/agent/runs] list failed", {
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to load runs" }, { status: 500 });
  }
}
