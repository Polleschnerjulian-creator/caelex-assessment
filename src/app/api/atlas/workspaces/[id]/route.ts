/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 *   GET    /api/atlas/workspaces/[id]    load workspace + cards
 *   PATCH  /api/atlas/workspaces/[id]    rename / archive
 *   DELETE /api/atlas/workspaces/[id]    delete (cascades to cards)
 *
 * All operations are user-scoped — a workspace is private to its
 * owner. We could expose share links later, but for now ownership =
 * userId match.
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

/**
 * Look up the workspace and verify the current user owns it. Returns
 * the workspace row (no cards) or null. Centralises the auth check so
 * GET/PATCH/DELETE all use identical logic.
 */
async function findOwnedWorkspace(workspaceId: string, userId: string) {
  return prisma.atlasWorkspace.findFirst({
    where: { id: workspaceId, userId },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      title: true,
      archived: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// ─── GET: load workspace with cards ──────────────────────────────────

export async function GET(
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
    const ws = await findOwnedWorkspace(id, session.user.id);
    if (!ws) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const cards = await prisma.atlasWorkspaceCard.findMany({
      where: { workspaceId: ws.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        kind: true,
        title: true,
        content: true,
        question: true,
        sourceCardIds: true,
        positionX: true,
        positionY: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      workspace: {
        id: ws.id,
        title: ws.title,
        archived: ws.archived,
        createdAt: ws.createdAt.toISOString(),
        updatedAt: ws.updatedAt.toISOString(),
      },
      cards: cards.map((c) => ({
        id: c.id,
        kind: c.kind,
        title: c.title,
        content: c.content,
        question: c.question,
        sourceCardIds: c.sourceCardIds,
        createdAt: c.createdAt.getTime(),
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`GET /api/atlas/workspaces/[id] failed: ${msg}`);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

// ─── PATCH: rename / archive ─────────────────────────────────────────

const PatchBody = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(
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
    const ws = await findOwnedWorkspace(id, session.user.id);
    if (!ws) {
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
    if (parsed.data.title === undefined && parsed.data.archived === undefined) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const updated = await prisma.atlasWorkspace.update({
      where: { id: ws.id },
      data: {
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.archived !== undefined && {
          archived: parsed.data.archived,
        }),
      },
      select: {
        id: true,
        title: true,
        archived: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      workspace: {
        id: updated.id,
        title: updated.title,
        archived: updated.archived,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`PATCH /api/atlas/workspaces/[id] failed: ${msg}`);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────

export async function DELETE(
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
    const ws = await findOwnedWorkspace(id, session.user.id);
    if (!ws) {
      // 200 idempotent — re-deleting an already-deleted workspace
      // shouldn't surface a confusing error to the lawyer.
      return NextResponse.json({ deleted: true });
    }

    await prisma.atlasWorkspace.delete({ where: { id: ws.id } });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`DELETE /api/atlas/workspaces/[id] failed: ${msg}`);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
