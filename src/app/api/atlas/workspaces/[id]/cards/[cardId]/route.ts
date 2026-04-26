/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 *   DELETE /api/atlas/workspaces/[id]/cards/[cardId]
 *
 * Removes a single card from a workspace. Idempotent — re-deleting a
 * non-existent card returns 200 rather than 404 because the lawyer
 * may have multiple tabs open and only one needs to "win" the delete.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
