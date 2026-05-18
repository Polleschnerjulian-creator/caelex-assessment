/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/chat/[id]/truncate-from-message
 *
 * Body: { messageId: string, includeMessage?: boolean }
 *
 * Deletes all messages from messageId onward (or strictly after, if
 * includeMessage=false). Used by the chat UI's "Edit message" + "Retry"
 * affordances:
 *
 *   - Edit: includeMessage=true → user-message + assistant-response
 *           gone; UI immediately sends new prompt.
 *   - Retry: includeMessage=false → only the assistant-response gone;
 *           UI re-triggers generation on the same user-prompt.
 *
 * Access-model mirrors the rest of /api/atlas/chat/[id]: chat-owner OR
 * mandate-member can mutate. Auth via getAtlasAuth (NextAuth session +
 * organization scoping).
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

const CHAT_ID_SCHEMA = z.string().cuid();
const BODY_SCHEMA = z.object({
  messageId: z.string().cuid(),
  includeMessage: z.boolean().optional().default(true),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const idCheck = CHAT_ID_SCHEMA.safeParse(id);
  if (!idCheck.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const parsed = BODY_SCHEMA.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  /* Access-check: chat must exist within org AND user must be chat-owner
     OR mandate-member. Same pattern as followups + DELETE. */
  const chat = await prisma.atlasChat.findFirst({
    where: {
      id,
      organizationId: atlas.organizationId,
      OR: [
        { ownerUserId: atlas.userId },
        { mandate: { members: { some: { userId: atlas.userId } } } },
      ],
    },
    select: { id: true },
  });
  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  /* Find the pivot message to anchor the truncate window. */
  const pivot = await prisma.atlasMessage.findFirst({
    where: { id: parsed.data.messageId, chatId: id },
    select: { id: true, createdAt: true },
  });
  if (!pivot) {
    return NextResponse.json(
      { error: "Message not found in this chat" },
      { status: 404 },
    );
  }

  /* Delete the truncate-window. includeMessage controls whether the
     pivot itself is removed (Edit) or kept (Retry). */
  const result = await prisma.atlasMessage.deleteMany({
    where: {
      chatId: id,
      OR: [
        { createdAt: { gt: pivot.createdAt } },
        ...(parsed.data.includeMessage ? [{ id: pivot.id }] : []),
      ],
    },
  });

  logger.info("[atlas/chat/truncate-from-message] truncated", {
    chatId: id,
    pivotId: pivot.id,
    deletedCount: result.count,
    includePivot: parsed.data.includeMessage,
    userId: atlas.userId,
  });

  return NextResponse.json({ ok: true, deletedCount: result.count });
}
