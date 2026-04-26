/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 *   POST /api/atlas/workspaces/[id]/fork    clone workspace + cards
 *
 * Scenario-Forking: lawyer working on "Mandant — DE Lizenz" wants to
 * explore "what if we route through UK instead?" Forking duplicates
 * the entire workspace + all cards into a new "Kopie von …" board so
 * the lawyer can mutate the copy without losing the original.
 *
 * Source-card-id remapping: ai-clause and ai-answer cards reference
 * the cards they were synthesized from via sourceCardIds. After the
 * fork, those references must point to the NEW card ids in the new
 * workspace, otherwise the "based on cards X, Y" UI shows orphaned
 * pointers.
 *
 * Done in a single transaction so a partial failure can't leave a
 * half-cloned workspace lying around.
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
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

    const { id } = await context.params;

    // Load source workspace + all cards in one go. ownership-check
    // via userId match on the workspace.
    const source = await prisma.atlasWorkspace.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        organizationId: true,
        title: true,
        cards: {
          select: {
            id: true,
            kind: true,
            title: true,
            content: true,
            question: true,
            sourceCardIds: true,
            positionX: true,
            positionY: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!source) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Build the cloned workspace inside a single transaction. We
    // first create the workspace, then create cards in one createMany,
    // but createMany on Postgres doesn't return ids — so we do
    // sequential creates so we can build the old-id → new-id map for
    // sourceCardIds remapping.
    const fork = await prisma.$transaction(async (tx) => {
      const newWs = await tx.atlasWorkspace.create({
        data: {
          userId: session.user.id!,
          organizationId: source.organizationId,
          // Avoid "Kopie von Kopie von Kopie von …" runaway titles by
          // not adding the prefix when the source title already starts
          // with it. Lawyers iterating fast on scenarios benefit.
          title: source.title.startsWith("Kopie von ")
            ? source.title
            : `Kopie von ${source.title}`,
        },
        select: { id: true, title: true, createdAt: true, updatedAt: true },
      });

      // Map old card id → new card id so we can rewrite sourceCardIds.
      const idMap = new Map<string, string>();
      for (const c of source.cards) {
        const created = await tx.atlasWorkspaceCard.create({
          data: {
            workspaceId: newWs.id,
            kind: c.kind,
            title: c.title,
            content: c.content,
            question: c.question,
            // Placeholder — we'll patch the right ids in the second
            // pass once every card has a fresh id allocated.
            sourceCardIds: [],
            positionX: c.positionX,
            positionY: c.positionY,
          },
          select: { id: true },
        });
        idMap.set(c.id, created.id);
      }

      // Second pass: rewrite sourceCardIds on cards that originally
      // had references. Only re-update where the source card had any —
      // skips the no-op write for plain user cards.
      for (const c of source.cards) {
        if (!c.sourceCardIds || c.sourceCardIds.length === 0) continue;
        const remapped = c.sourceCardIds
          .map((oldId) => idMap.get(oldId))
          .filter((x): x is string => typeof x === "string");
        const newCardId = idMap.get(c.id);
        if (!newCardId || remapped.length === 0) continue;
        await tx.atlasWorkspaceCard.update({
          where: { id: newCardId },
          data: { sourceCardIds: remapped },
        });
      }

      return newWs;
    });

    return NextResponse.json({
      workspace: {
        id: fork.id,
        title: fork.title,
        cardCount: source.cards.length,
        createdAt: fork.createdAt.toISOString(),
        updatedAt: fork.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`POST /api/atlas/workspaces/[id]/fork failed: ${msg}`);
    return NextResponse.json({ error: "Fork fehlgeschlagen" }, { status: 500 });
  }
}
