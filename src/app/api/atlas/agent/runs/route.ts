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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  mandateId: z.string().cuid().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  status: z.enum(["running", "complete", "error", "aborted"]).optional(),
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
  } = {
    userId: atlas.userId,
    organizationId: atlas.organizationId,
  };
  if (parsed.data.mandateId) where.mandateId = parsed.data.mandateId;
  if (parsed.data.status) where.status = parsed.data.status;

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
    },
  });

  return NextResponse.json({ runs });
}
