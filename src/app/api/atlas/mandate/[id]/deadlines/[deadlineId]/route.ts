/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate Deadline mutations.
 *
 *   PATCH   /api/atlas/mandate/[id]/deadlines/[deadlineId]   toggle status / edit
 *   DELETE  /api/atlas/mandate/[id]/deadlines/[deadlineId]   hard-delete
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

const PatchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  dueAt: z.string().datetime().optional(),
  warnDays: z.number().int().min(0).max(180).optional(),
  status: z.enum(["open", "done"]).optional(),
  url: z.string().url().max(500).nullable().optional(),
});

/* AUDIT-FIX C03 (2026-05-17): the helper returns the membership-gated
   WHERE clause that BOTH the authorize check AND the subsequent
   update/delete use. By feeding the same filter into `updateMany` /
   `deleteMany` we close the TOCTOU window where a concurrent
   member-removal between the authorize check and the mutation could
   let an ex-member's request still complete. updateMany / deleteMany
   accept relation filters that `update` / `delete` (which require
   unique-WHERE) do not. */
function buildAuthorizedWhere(
  mandateId: string,
  deadlineId: string,
  userId: string,
  organizationId: string,
) {
  return {
    id: deadlineId,
    mandate: {
      id: mandateId,
      organizationId,
      OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
    },
  } as const;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; deadlineId: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id, deadlineId } = await ctx.params;
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
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.description !== undefined)
    data.description = parsed.data.description;
  if (parsed.data.dueAt !== undefined) data.dueAt = new Date(parsed.data.dueAt);
  if (parsed.data.warnDays !== undefined) data.warnDays = parsed.data.warnDays;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;
  if (parsed.data.url !== undefined) data.url = parsed.data.url;

  try {
    /* AUDIT-FIX C03: atomic membership-gated update via updateMany
       (which supports relation filters; `update` requires unique
       WHERE and can't combine the membership-OR). count=0 means
       either the deadline doesn't exist or the user lost access
       between check and mutation — both surface as 403. */
    const where = buildAuthorizedWhere(
      id,
      deadlineId,
      atlas.userId,
      atlas.organizationId,
    );
    const result = await prisma.atlasMandateDeadline.updateMany({
      where,
      data,
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    /* Refetch the row for the response — small overhead, but keeps the
       API contract (returning the updated row) unchanged. */
    const updated = await prisma.atlasMandateDeadline.findUnique({
      where: { id: deadlineId },
      select: {
        id: true,
        title: true,
        description: true,
        dueAt: true,
        warnDays: true,
        status: true,
        url: true,
      },
    });
    logger.info("[atlas/deadlines] updated", {
      mandateId: id,
      deadlineId,
      userId: atlas.userId,
      statusChange: parsed.data.status,
    });
    return NextResponse.json({ deadline: updated });
  } catch (err) {
    logger.error("[atlas/deadlines] update failed", {
      mandateId: id,
      deadlineId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; deadlineId: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id, deadlineId } = await ctx.params;
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  try {
    /* AUDIT-FIX C03: atomic membership-gated delete via deleteMany. */
    const where = buildAuthorizedWhere(
      id,
      deadlineId,
      atlas.userId,
      atlas.organizationId,
    );
    const result = await prisma.atlasMandateDeadline.deleteMany({ where });
    if (result.count === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    logger.info("[atlas/deadlines] deleted", {
      mandateId: id,
      deadlineId,
      userId: atlas.userId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[atlas/deadlines] delete failed", {
      mandateId: id,
      deadlineId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
