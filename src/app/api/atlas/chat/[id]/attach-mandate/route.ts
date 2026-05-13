/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/chat/[id]/attach-mandate
 *   Body: { mandateId: string | null }
 *
 * Setzt (mandateId: string) oder löscht (mandateId: null) die Mandat-
 * Verknüpfung eines bestehenden Chats. Wird vom MandateAttachModal
 * im ChatInput Plus-Menü aufgerufen.
 *
 * Auth-Checks:
 *   - User muss authenticated sein (401)
 *   - Chat muss org-scope + owner sein (404 sonst)
 *   - Wenn mandateId !== null: Mandate muss existieren + org-scope +
 *     owner-or-member sein (404 sonst)
 *
 * Antwort: { ok: true, chat: { id, mandateId, title, updatedAt } }
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  mandateId: z.string().min(1).max(40).nullable(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { mandateId } = parsed.data;
  const { id: chatId } = await context.params;

  /* Chat-Existenz + Owner-Check. */
  const chat = await prisma.atlasChat.findFirst({
    where: {
      id: chatId,
      organizationId: atlas.organizationId,
      ownerUserId: atlas.userId,
    },
    select: { id: true },
  });
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  /* Mandate-Existenz + Member-or-Owner-Check (skipped beim Detach). */
  if (mandateId !== null) {
    const mandate = await prisma.atlasMandate.findFirst({
      where: {
        id: mandateId,
        organizationId: atlas.organizationId,
        OR: [
          { ownerUserId: atlas.userId },
          { members: { some: { userId: atlas.userId } } },
        ],
      },
      select: { id: true },
    });
    if (!mandate) {
      return NextResponse.json(
        { error: "Mandate not found or no access" },
        { status: 404 },
      );
    }
  }

  try {
    const updated = await prisma.atlasChat.update({
      where: { id: chatId },
      data: { mandateId },
      select: {
        id: true,
        mandateId: true,
        title: true,
        updatedAt: true,
      },
    });
    logger.info("[atlas/chat/attach-mandate] ok", {
      userId: atlas.userId,
      chatId,
      mandateId,
    });
    return NextResponse.json({ ok: true, chat: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/chat/attach-mandate] update failed", {
      userId: atlas.userId,
      chatId,
      mandateId,
      error: msg,
    });
    return NextResponse.json({ error: "Attach failed" }, { status: 500 });
  }
}
