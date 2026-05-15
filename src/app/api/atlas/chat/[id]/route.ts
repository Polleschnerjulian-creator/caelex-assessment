/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET    /api/atlas/chat/[id] — load chat + all messages.
 * DELETE /api/atlas/chat/[id] — soft-archive a chat (sets archivedAt).
 *
 * See docs/ATLAS-V2-MASTER-PLAN.md.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { loadChatForUser } from "@/lib/atlas/chat-engine.server";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* AUDIT-FIX L3: Standardise chatId path-param validation on `.cuid()`
   so the route surface matches the body-validation pattern already in
   place at /api/atlas/chat (POST), /notes, /mandate/[id]/time-entries.
   Without this, an attacker can hit /api/atlas/chat/<arbitrary-string>
   and waste a Prisma round-trip per probe. CUID-shape gates the call
   at the edge — invalid shape → 400 before any DB query. */
const CHAT_ID_SCHEMA = z.string().cuid();

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  /* AUDIT-FIX L3: Reject malformed chatIds at the edge — see schema comment. */
  const idCheck = CHAT_ID_SCHEMA.safeParse(id);
  if (!idCheck.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const chat = await loadChatForUser({
    chatId: id,
    userId: atlas.userId,
    organizationId: atlas.organizationId,
  });
  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ chat });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  /* AUDIT-FIX L3: Reject malformed chatIds at the edge — see schema comment. */
  const idCheck = CHAT_ID_SCHEMA.safeParse(id);
  if (!idCheck.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    /* AUDIT-FIX M1: Standardise on findFirst-then-update so the
       handler matches the rest of the Atlas API surface (see
       attach-mandate, mandate/[id], followups). The previous
       updateMany-as-permission-check pattern works correctly (returns
       count=0 when not owner, count=1 on success) but is a one-off
       in this codebase and confuses future readers — they expect a
       distinct 404-vs-500 boundary. The two-query cost is bounded
       (single chat row by primary key, < 1ms each) and the explicit
       findFirst makes the auth gate readable.

       We also include archivedAt in the select so a double-archive
       returns 404 rather than silently bumping the timestamp — the
       sidebar already filters on archivedAt=null, and a no-op
       archive would otherwise look like success to the caller. */
    const existing = await prisma.atlasChat.findFirst({
      where: {
        id,
        organizationId: atlas.organizationId,
        ownerUserId: atlas.userId,
        archivedAt: null,
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.atlasChat.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // AUDIT-FIX M23: mask userId (CUID) before logging
    logger.error("[atlas/chat/id] DELETE failed", {
      userId: maskId(atlas.userId),
      error: msg,
    });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
