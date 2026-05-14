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
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { loadChatForUser } from "@/lib/atlas/chat-engine.server";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
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
  try {
    const updated = await prisma.atlasChat.updateMany({
      where: {
        id,
        organizationId: atlas.organizationId,
        ownerUserId: atlas.userId,
      },
      data: { archivedAt: new Date() },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
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
