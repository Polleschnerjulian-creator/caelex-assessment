/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Notes mutations.
 *
 *   PATCH   /api/atlas/notes/[id]   edit annotation/tags
 *   DELETE  /api/atlas/notes/[id]   hard-delete (notes are personal,
 *                                    no audit-trail requirement)
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
  note: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(40)).max(10).optional(),
});

async function authorize(noteId: string, userId: string): Promise<boolean> {
  const hit = await prisma.atlasNote.findFirst({
    where: { id: noteId, userId },
    select: { id: true },
  });
  return !!hit;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!(await authorize(id, atlas.userId))) {
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
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const data: Record<string, unknown> = {};
  if (parsed.data.note !== undefined) data.note = parsed.data.note;
  if (parsed.data.tags !== undefined) data.tags = parsed.data.tags;

  try {
    /* L1: atomic owner-scoped mutation — no find-then-mutate-by-bare-id. */
    const res = await prisma.atlasNote.updateMany({
      where: { id, userId: atlas.userId },
      data,
    });
    if (res.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const updated = await prisma.atlasNote.findUnique({
      where: { id },
      select: {
        id: true,
        excerpt: true,
        note: true,
        tags: true,
        chatId: true,
        mandateId: true,
        updatedAt: true,
      },
    });
    logger.info("[atlas/notes] updated", { userId: atlas.userId, noteId: id });
    return NextResponse.json({ note: updated });
  } catch (err) {
    logger.error("[atlas/notes] update failed", {
      userId: atlas.userId,
      noteId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!(await authorize(id, atlas.userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  try {
    /* L1: atomic owner-scoped delete — no find-then-delete-by-bare-id. */
    const res = await prisma.atlasNote.deleteMany({
      where: { id, userId: atlas.userId },
    });
    if (res.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    logger.info("[atlas/notes] deleted", { userId: atlas.userId, noteId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[atlas/notes] delete failed", {
      userId: atlas.userId,
      noteId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
