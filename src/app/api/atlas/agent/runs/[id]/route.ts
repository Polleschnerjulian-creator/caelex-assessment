/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Agent-Run Detail API.
 *
 *   GET /api/atlas/agent/runs/[id]
 *
 * Returns the full Agent-Run record including steps, reasoning,
 * artifacts, and citation-verification. Used by the per-run detail
 * page in /atlas/agent/history/[id]. Membership-gated by userId +
 * organizationId — lawyer can only see own runs.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await ctx.params;
  const run = await prisma.atlasAgentRun.findFirst({
    where: {
      id,
      userId: atlas.userId,
      organizationId: atlas.organizationId,
    },
    include: {
      mandate: {
        select: {
          id: true,
          name: true,
          clientName: true,
        },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  /* AUDIT-FIX M25: defense-in-depth — even though /api/atlas/agent now
     sanitizes errorMessage at write-time, we re-sanitize on read so any
     historical row written before the M25 patch (or any future write
     path that forgets to sanitize) can't leak internals to the client.
     getSafeErrorMessage is a no-op-ish in dev (preserves the message
     for debugging) and returns a generic string in production. */
  const safeRun =
    run.errorMessage !== null && run.errorMessage !== undefined
      ? {
          ...run,
          errorMessage: getSafeErrorMessage(
            new Error(run.errorMessage),
            "Agent run failed",
          ),
        }
      : run;

  return NextResponse.json({ run: safeRun });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await ctx.params;
  /* Owner-only delete (membership-gate via userId WHERE clause).
     Hard delete — agent runs are personal records, no audit-trail
     requirement (the AtlasAuditLog covers org-level audit). */
  const result = await prisma.atlasAgentRun.deleteMany({
    where: {
      id,
      userId: atlas.userId,
      organizationId: atlas.organizationId,
    },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  /* Destructive action — log for org-level audit trail. */
  logger.info("[atlas/agent/runs] deleted", {
    userId: atlas.userId,
    runId: id,
  });
  return NextResponse.json({ ok: true });
}
