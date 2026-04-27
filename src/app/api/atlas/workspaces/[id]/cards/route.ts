/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 *   POST /api/atlas/workspaces/[id]/cards    add a card to a workspace
 *
 * Cards are tightly coupled to their workspace — read+remove flow
 * through the parent workspace endpoint (cascade) or the cardId-
 * specific DELETE endpoint. This file handles only card-creation.
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

/** MED-4: explicit allowlist of card kinds. Was previously a free
 *  z.string() up to 40 chars on the assumption that the frontend
 *  union was authoritative — but a script-driven caller could store
 *  arbitrary `kind` values that downstream renderers might switch on.
 *
 *  Keep this set in sync with:
 *    - frontend visual-treatment switch (atlas pinboard)
 *    - workspace-template seeded card kinds (`src/data/atlas-workspace-templates.ts`)
 *    - the suggest endpoint output (`./[id]/suggest/route.ts` — emits
 *      "source" / "question" / "client" / "note")
 *
 *  Adding a new kind now requires a 1-line code change here, which is
 *  cheaper than the cleanup risk of a permissive column. */
const CardKind = z.enum([
  "user",
  "ai-clause",
  "ai-answer",
  "ai-suggestion",
  "ai-conflict",
  "source",
  "client",
  "question",
  "note",
]);

const Body = z.object({
  kind: CardKind.optional().default("user"),
  title: z.string().min(1).max(200),
  content: z.string().max(8000),
  question: z.string().max(2000).nullable().optional(),
  sourceCardIds: z.array(z.string().min(1).max(120)).max(20).optional(),
});

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

    const { id: workspaceId } = await context.params;

    // Verify workspace exists AND is owned by the current user. Single
    // findFirst by (id, userId) is the cheapest auth check — no need
    // for a separate ownership query.
    const ws = await prisma.atlasWorkspace.findFirst({
      where: { id: workspaceId, userId: session.user.id },
      select: { id: true },
    });
    if (!ws) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Bumping the workspace's updatedAt too keeps the switcher list
    // sorted by "most recently active". Done in one transaction so a
    // partial failure can't leave the workspace ordering stale.
    const card = await prisma.$transaction(async (tx) => {
      const created = await tx.atlasWorkspaceCard.create({
        data: {
          workspaceId: ws.id,
          kind: parsed.data.kind,
          title: parsed.data.title,
          content: parsed.data.content,
          question: parsed.data.question ?? null,
          sourceCardIds: parsed.data.sourceCardIds ?? [],
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
      await tx.atlasWorkspace.update({
        where: { id: ws.id },
        data: { updatedAt: new Date() },
      });
      return created;
    });

    return NextResponse.json({
      card: {
        id: card.id,
        kind: card.kind,
        title: card.title,
        content: card.content,
        question: card.question,
        sourceCardIds: card.sourceCardIds,
        createdAt: card.createdAt.getTime(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`POST /api/atlas/workspaces/[id]/cards failed: ${msg}`);
    return NextResponse.json({ error: "Failed to add card" }, { status: 500 });
  }
}
