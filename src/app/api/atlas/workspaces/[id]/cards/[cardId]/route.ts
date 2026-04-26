/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 *   PATCH  /api/atlas/workspaces/[id]/cards/[cardId]   edit a card
 *   DELETE /api/atlas/workspaces/[id]/cards/[cardId]   remove a card
 *
 * Both ownership-checked via a nested where on the parent workspace
 * (single query, no race window).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── PATCH: edit card ────────────────────────────────────────────────

const PatchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(8000).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; cardId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "astra_chat",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const { id: workspaceId, cardId } = await context.params;
    const card = await prisma.atlasWorkspaceCard.findFirst({
      where: {
        id: cardId,
        workspace: { id: workspaceId, userId: session.user.id },
      },
      select: { id: true, workspaceId: true },
    });
    if (!card) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = PatchBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    if (parsed.data.title === undefined && parsed.data.content === undefined) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.atlasWorkspaceCard.update({
        where: { id: card.id },
        data: {
          ...(parsed.data.title !== undefined && {
            title: parsed.data.title,
          }),
          ...(parsed.data.content !== undefined && {
            content: parsed.data.content,
          }),
        },
        select: {
          id: true,
          kind: true,
          title: true,
          content: true,
          question: true,
          sourceCardIds: true,
          createdAt: true,
        },
      });
      // Bump parent updatedAt — same logic as add/delete so the
      // workspace list stays sorted by activity.
      await tx.atlasWorkspace.update({
        where: { id: card.workspaceId },
        data: { updatedAt: new Date() },
      });
      return next;
    });

    return NextResponse.json({
      card: {
        id: updated.id,
        kind: updated.kind,
        title: updated.title,
        content: updated.content,
        question: updated.question,
        sourceCardIds: updated.sourceCardIds,
        createdAt: updated.createdAt.getTime(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      `PATCH /api/atlas/workspaces/[id]/cards/[cardId] failed: ${msg}`,
    );
    return NextResponse.json(
      { error: "Failed to update card" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; cardId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "astra_chat",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const { id: workspaceId, cardId } = await context.params;

    // Verify workspace ownership. We lookup the card joined with the
    // workspace's userId so we can prove the card belongs to a
    // workspace that belongs to the current user — single query, no
    // race window between ownership-check and delete.
    const card = await prisma.atlasWorkspaceCard.findFirst({
      where: {
        id: cardId,
        workspace: { id: workspaceId, userId: session.user.id },
      },
      select: { id: true, workspaceId: true },
    });
    if (!card) {
      // Idempotent — the lawyer might have multiple tabs and one
      // already deleted this card. No reason to surface 404.
      return NextResponse.json({ deleted: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.atlasWorkspaceCard.delete({ where: { id: card.id } });
      // Bump the parent workspace's updatedAt so it stays at the top
      // of the switcher list when the lawyer is actively editing.
      await tx.atlasWorkspace.update({
        where: { id: card.workspaceId },
        data: { updatedAt: new Date() },
      });
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(
      `DELETE /api/atlas/workspaces/[id]/cards/[cardId] failed: ${msg}`,
    );
    return NextResponse.json(
      { error: "Failed to delete card" },
      { status: 500 },
    );
  }
}
