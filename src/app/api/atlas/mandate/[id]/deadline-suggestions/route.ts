/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate Deadline-Suggestions API.
 *
 *   GET    /api/atlas/mandate/[id]/deadline-suggestions
 *
 * Lists PENDING deadline suggestions for a mandate. The
 * `AtlasMandateDeadlineSuggestion` schema has existed since M3 (auto-
 * extracted Fristen from vault files) but was completely dark — no API,
 * no UI surface. The audit (2026-05-17) identified this as a high-ROI
 * gap: schema fully wired, only the surface missing.
 *
 * Pending only, by design: dismissed + accepted suggestions disappear
 * from the lawyer's worklist after they decide. Accepted suggestions
 * are findable via the resulting AtlasMandateDeadline (resolvedAsDeadlineId).
 *
 * Auth: org-scoped + mandate-membership-scoped via relation filter.
 * Same gate as the existing deadlines route.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id: mandateId } = await ctx.params;

  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  /* Membership-via-relation-filter same pattern as deadlines GET — single
     query gates both existence and access. Empty list if either fails. */
  try {
    const suggestions = await prisma.atlasMandateDeadlineSuggestion.findMany({
      where: {
        mandateId,
        status: "pending",
        mandate: {
          organizationId: atlas.organizationId,
          OR: [
            { ownerUserId: atlas.userId },
            { members: { some: { userId: atlas.userId } } },
          ],
        },
      },
      orderBy: [{ confidence: "desc" }, { dueAt: "asc" }],
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        dueAt: true,
        confidence: true,
        suggestedAt: true,
        sourceFile: {
          select: { id: true, filename: true },
        },
      },
    });

    return NextResponse.json({ suggestions });
  } catch (err) {
    /* Observability: surface DB-level failures so production issues
       (schema drift, connection pool exhaustion, transient Neon hiccups)
       are visible without needing to repro the user-facing 500. */
    logger.error("[atlas/deadline-suggestions] list failed", {
      mandateId,
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to load suggestions" },
      { status: 500 },
    );
  }
}
