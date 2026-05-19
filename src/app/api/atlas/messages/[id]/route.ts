/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/atlas/messages/[id] — fetch a single AtlasMessage by id.
 *
 * Created as part of PERF-T1-2 (wave 11D) to replace the heavy
 * post-stream `reload(true)` call in AtlasChatView. After the SSE
 * `done` event fires with a messageId, the client now hydrates ONLY
 * that single message (citations, tokens, costUsd, dedupedTools)
 * instead of re-fetching the entire 200-message chat.
 *
 * Payload size: ~5-50KB per message vs ~1-50MB for a full chat reload.
 *
 * Authz: caller must be the parent chat's ownerUserId and belong to
 * the chat's organization (standard atlas-auth pattern).
 *
 * Decryption: AtlasMessage.content is encrypted at rest (SEC-T0-1
 * step 3). decryptAtlasMessageContent walks the JSONB array,
 * decrypting only text-blocks + tool_result nested content. Image
 * blocks pass through unchanged.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";
import { decryptAtlasMessageContent } from "@/lib/atlas/atlas-encryption";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MESSAGE_ID_SCHEMA = z.string().cuid();

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: rawId } = await context.params;
  const parsed = MESSAGE_ID_SCHEMA.safeParse(rawId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const messageId = parsed.data;

  try {
    /* Single-row fetch with the chat-relation include carrying the
       authz fields (organizationId + ownerUserId). Avoids a second
       round-trip just for the gate. */
    const row = await prisma.atlasMessage.findFirst({
      where: {
        id: messageId,
        chat: {
          organizationId: atlas.organizationId,
          ownerUserId: atlas.userId,
        },
      },
      select: {
        id: true,
        role: true,
        content: true,
        inputTokens: true,
        outputTokens: true,
        costUsd: true,
        toolsUsed: true,
        citations: true,
        createdAt: true,
      },
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    /* SEC-T0-1 step 3: decrypt content (text-blocks + tool_result
       nested content). Dual-read tolerant — legacy plaintext rows
       pass through unchanged. */
    const decryptedContent = (await decryptAtlasMessageContent(
      row.content,
    ).catch(() => row.content)) as Prisma.JsonValue;

    return NextResponse.json({
      message: { ...row, content: decryptedContent },
    });
  } catch (err) {
    logger.error("[atlas/messages/id] GET failed", {
      userId: maskId(atlas.userId),
      messageId: maskId(messageId),
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Message fetch failed" },
      { status: 500 },
    );
  }
}
