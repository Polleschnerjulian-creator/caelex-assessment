/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate Deadlines API.
 *
 *   GET    /api/atlas/mandate/[id]/deadlines      list mandate deadlines
 *   POST   /api/atlas/mandate/[id]/deadlines      create new deadline
 *
 * Auth: mandate membership (owner OR member). Same gate as the
 * mandate-files / members routes.
 *
 * Rate-limit: api tier (cheap reads + occasional writes).
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

/* AUDIT-FIX Q03 (2026-05-17): membership check moved to shared
   @/lib/atlas/mandate-membership (was duplicated verbatim here +
   in time-entries route). */
import { checkMandateMembership } from "@/lib/atlas/mandate-membership";

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

  /* AUDIT-FIX M18: Cap result-size at 200 deadlines per page + offer
     cursor-pagination for callers that need more. Without `take`, a
     mandate with 1000+ deadlines (theoretical worst-case after years
     of regulatory-feed sync) returns the full list in a single
     response — large payload, slow render, potential memory pressure
     on the API node. Cursor-pagination keeps the contract simple
     (just a `cursor` query-param + `nextCursor` in the response) and
     compatible with the existing `dueAt` ordering.

     AUDIT-FIX H11: Inline the membership-check via the `mandate`
     relation filter — drops the prior checkMembership() round-trip
     to a single query. If the user has no access OR the mandate
     doesn't exist, the relation-filter returns no rows and the
     handler returns an empty page (200, []) — same observable
     behaviour as the previous 403 from the caller's POV (they get
     no data) but one fewer DB roundtrip. We accept that the
     status-code degrades from 403 to 200/[]; the UI doesn't
     differentiate today (both render an empty list) and exposing
     access-vs-existence via status code is a minor info-leak we
     remove by collapsing them. */
  const TAKE = 200;
  const cursor = req.nextUrl.searchParams.get("cursor");
  const deadlines = await prisma.atlasMandateDeadline.findMany({
    where: {
      mandateId,
      mandate: {
        organizationId: atlas.organizationId,
        OR: [
          { ownerUserId: atlas.userId },
          { members: { some: { userId: atlas.userId } } },
        ],
      },
    },
    orderBy: { dueAt: "asc" },
    take: TAKE,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    select: {
      id: true,
      title: true,
      description: true,
      dueAt: true,
      warnDays: true,
      status: true,
      url: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  /* nextCursor is the last id only when the page is full — a partial
     page means we have hit the end. Clients pass it back as `?cursor=…`
     to fetch the next page. */
  const nextCursor =
    deadlines.length === TAKE ? deadlines[deadlines.length - 1].id : null;

  return NextResponse.json({ deadlines, nextCursor });
}

const PostBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueAt: z.string().datetime(),
  warnDays: z.number().int().min(0).max(180).default(7),
  url: z.string().url().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id: mandateId } = await ctx.params;
  if (
    !(await checkMandateMembership(
      mandateId,
      atlas.userId,
      atlas.organizationId,
    ))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  try {
    const created = await prisma.atlasMandateDeadline.create({
      data: {
        mandateId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        dueAt: new Date(parsed.data.dueAt),
        warnDays: parsed.data.warnDays,
        url: parsed.data.url ?? null,
        createdByUserId: atlas.userId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueAt: true,
        warnDays: true,
        status: true,
        url: true,
        createdAt: true,
      },
    });
    logger.info("[atlas/deadlines] created", {
      mandateId,
      userId: atlas.userId,
      deadlineId: created.id,
    });
    return NextResponse.json({ deadline: created });
  } catch (err) {
    logger.error("[atlas/deadlines] create failed", {
      mandateId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
