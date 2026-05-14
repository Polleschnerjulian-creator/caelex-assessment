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
import { maskId } from "@/lib/atlas/log-masking";

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

  /* AUDIT-FIX M4: Reject attach during an in-flight chat turn.
     ─────────────────────────────────────────────────────────────
     Race scenario: user kicks off a chat turn (chat-engine starts
     streaming, has already read the chat row including its old
     `mandateId`), then immediately opens the mandate-attach modal
     and confirms a new mandate. The attach-update flips the row's
     mandateId, but the in-flight engine has cached the old value
     in scope — its current turn runs with neither the old nor the
     new mandate-context cleanly, and the resulting AtlasMessage
     ends up attributed to whichever mandate happens to win the
     read race in any downstream tool calls. From the lawyer's
     POV: random turn-content not matching the mandate they just
     selected = trust-breaker.

     Detection: the chat-engine writes a placeholder AtlasMessage
     row at the start of every turn (see chat-engine.server.ts
     ~L955, AUDIT-FIX H1) with `citations.{_streamingPlaceholder:
     true}` and overwrites it on completion or failure. So an
     active stream is detectable as: latest assistant-message in
     the chat has `citations._streamingPlaceholder === true` AND
     was created within the last 60 s (the stream's hard timeout
     window — anything older is a stuck/abandoned placeholder that
     the engine's catch-block should have cleaned up but didn't,
     and we should not block on it).

     Response: 409 Conflict with a friendly message — the UI can
     show "Wait for the current turn to finish before changing
     the mandate" and re-enable the modal once the message
     completes. Detach (mandateId=null) is allowed during a
     stream because clearing the link is harmless — worst case
     the in-flight turn finishes with stale mandate context, but
     no NEW context is being added behind its back. */
  const STREAM_PLACEHOLDER_TTL_MS = 60_000;
  const recentCutoff = new Date(Date.now() - STREAM_PLACEHOLDER_TTL_MS);
  const inFlight =
    mandateId !== null
      ? await prisma.atlasMessage.findFirst({
          where: {
            chatId,
            role: "assistant",
            createdAt: { gte: recentCutoff },
            /* JSON-path filter: citations is `{ _streamingPlaceholder:
               true }` while the engine streams; on completion the
               engine overwrites it with an array of citation objects
               (so the path no longer resolves). Postgres jsonb
               supports `path` equality directly via Prisma. */
            citations: {
              path: ["_streamingPlaceholder"],
              equals: true,
            },
          },
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        })
      : null;
  if (inFlight) {
    logger.info("[atlas/chat/attach-mandate] blocked: turn in-flight", {
      userId: maskId(atlas.userId),
      chatId,
      placeholderId: inFlight.id,
    });
    return NextResponse.json(
      {
        error:
          "Cannot change the mandate while a turn is streaming. Please wait for the current response to finish, then try again.",
        code: "STREAM_IN_FLIGHT",
      },
      { status: 409 },
    );
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
    // AUDIT-FIX M23: mask userId (CUID); leave chatId/mandateId for ops debugging
    logger.info("[atlas/chat/attach-mandate] ok", {
      userId: maskId(atlas.userId),
      chatId,
      mandateId,
    });
    return NextResponse.json({ ok: true, chat: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/chat/attach-mandate] update failed", {
      userId: maskId(atlas.userId),
      chatId,
      mandateId,
      error: msg,
    });
    return NextResponse.json({ error: "Attach failed" }, { status: 500 });
  }
}
