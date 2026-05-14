/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/mandate — create a new mandate (Claude-Projects equivalent).
 * GET  /api/atlas/mandate — list user's mandates (own + member-of).
 *
 * See docs/ATLAS-V2-MASTER-PLAN.md.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({
  name: z.string().min(1).max(200),
  clientName: z.string().max(200).optional(),
  clientContact: z.string().max(200).optional(),
  customInstructions: z.string().max(8_000).optional(),
  jurisdiction: z.string().max(8).optional(),
  operatorType: z.string().max(64).optional(),
  primaryAuthority: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  try {
    const created = await prisma.atlasMandate.create({
      data: {
        organizationId: atlas.organizationId,
        ownerUserId: atlas.userId,
        name: parsed.data.name,
        clientName: parsed.data.clientName,
        clientContact: parsed.data.clientContact,
        customInstructions: parsed.data.customInstructions,
        jurisdiction: parsed.data.jurisdiction,
        operatorType: parsed.data.operatorType,
        primaryAuthority: parsed.data.primaryAuthority,
        /* Ensure the owner is also persisted as an explicit member
           row so member-based queries always include them. */
        members: {
          create: { userId: atlas.userId, role: "owner" },
        },
      },
      select: {
        id: true,
        name: true,
        clientName: true,
        jurisdiction: true,
        status: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ mandate: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // AUDIT-FIX M23: mask userId (CUID) before logging
    logger.error("[atlas/mandate] POST failed", {
      userId: maskId(atlas.userId),
      error: msg,
    });
    return NextResponse.json(
      { error: "Mandate creation failed" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  /* Return mandates where the user is owner OR explicit member.
     Filter out archived/closed for the sidebar default; the Korpus
     surface can list those separately.

     AUDIT-FIX H16: Cap result-size at 100 mandates per page +
     cursor-pagination. Prior to this fix the GET handler returned
     ALL mandates with no `take`, so a test-org with 5000 mandates
     would emit a 5MB+ JSON payload. Cursor follows the same shape
     as M18 (deadlines): `?cursor=<id>` resumes after the given id
     in the existing `updatedAt desc` ordering, and the response
     carries `nextCursor` (null when the page is partial = end of
     list). The cursor is stable because Prisma's `cursor:` skips to
     the row by id, so pagination is consistent even if `updatedAt`
     ties exist (id is the unique tie-breaker in the underlying
     b-tree).

     Note: the existing `_count` subselect stays — it adds two
     denormalised joins per row (chats + files), but at TAKE=100
     that is bounded and Prisma compiles it into a single SQL with
     CTEs (no per-row N+1). A later optimisation could move counts
     into a denormalised column on AtlasMandate if dashboard render
     becomes a hotspot. */
  const TAKE = 100;
  const cursor = req.nextUrl.searchParams.get("cursor");
  const mandates = await prisma.atlasMandate.findMany({
    where: {
      organizationId: atlas.organizationId,
      status: "active",
      OR: [
        { ownerUserId: atlas.userId },
        { members: { some: { userId: atlas.userId } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: TAKE,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    select: {
      id: true,
      name: true,
      clientName: true,
      jurisdiction: true,
      operatorType: true,
      primaryAuthority: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      _count: {
        select: { chats: true, files: true },
      },
    },
  });

  /* nextCursor is the last id only when the page is full — a partial
     page means we have hit the end. Clients pass it back as
     `?cursor=…` to fetch the next page. */
  const nextCursor =
    mandates.length === TAKE ? mandates[mandates.length - 1].id : null;

  return NextResponse.json({ mandates, nextCursor });
}
