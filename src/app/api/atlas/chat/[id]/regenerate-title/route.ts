/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — POST /api/atlas/chat/[id]/regenerate-title
 *
 * Manually re-generates the AI-summarised title for a chat.
 * Membership-gated to the chat owner.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateAndPersistChatTitle } from "@/lib/atlas/chat-title-generator.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await ctx.params;

  /* AUDIT-FIX H04 (2026-05-17): validate cuid at the edge — matches
     CHAT_ID_SCHEMA pattern used by every other /chat/[id]/* route
     (regenerate-title was the lone outlier letting non-cuid strings
     hit the DB and waste a round-trip). */
  if (!/^c[a-z0-9]{24}$/.test(id)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  /* Membership-gate: chat must exist and belong to this user+org. */
  const chat = await prisma.atlasChat.findFirst({
    where: {
      id,
      ownerUserId: atlas.userId,
      organizationId: atlas.organizationId,
    },
    select: { id: true, title: true },
  });
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  /* AUDIT-FIX M29 (2026-05-17): generateAndPersistChatTitle now
     returns the title directly — saved a Prisma round-trip. */
  const title = await generateAndPersistChatTitle(id, atlas.organizationId);
  if (title === null) {
    return NextResponse.json(
      { error: "Title generation failed" },
      { status: 500 },
    );
  }
  logger.info("[atlas/chat/regenerate-title] done", {
    userId: atlas.userId,
    chatId: id,
  });
  return NextResponse.json({ ok: true, title });
}
