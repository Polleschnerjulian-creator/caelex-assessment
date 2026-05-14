/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas pinboard workspaces — list + create.
 *
 *   GET  /api/atlas/workspaces           list non-archived workspaces
 *   POST /api/atlas/workspaces           create a new workspace
 *
 * NOTE: This is the NEW free-floating pinboard ("AI-Mode workspace",
 * the ⌘5 board with cards). It is intentionally distinct from the
 * matter-scoped workspace at /api/atlas/workspace (singular), which
 * lives under a LegalMatter and is shared across firm members.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { getTemplateById } from "@/data/atlas-workspace-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── GET: list workspaces ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    /* AUDIT-FIX C2: gated by getAtlasAuth (LAW_FIRM/BOTH only) — was previously raw auth() with any-org fallback, allowing OPERATOR users to mint Atlas workspaces + share-tokens. */
    const atlas = await getAtlasAuth();
    if (!atlas) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "astra_chat",
      getIdentifier(request, atlas.userId),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    // Return summary rows (no cards) — keeps the switcher dropdown
    // fast even when a lawyer has 50 workspaces. Cards load on-demand
    // when the user opens a specific workspace via [id].
    const workspaces = await prisma.atlasWorkspace.findMany({
      where: {
        userId: atlas.userId,
        organizationId: atlas.organizationId,
        archived: false,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { cards: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      workspaces: workspaces.map((w) => ({
        id: w.id,
        title: w.title,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
        cardCount: w._count.cards,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`GET /api/atlas/workspaces failed: ${msg}`);
    return NextResponse.json({ error: "Failed to list" }, { status: 500 });
  }
}

// ─── POST: create workspace ───────────────────────────────────────────

/** MED-1: per-user cap. Mirrors the Bookmark quota pattern. Without
 *  this, a script can post POST /workspaces in a loop and balloon the
 *  DB (each workspace can carry up to 8000-char cards). 200 is well
 *  above realistic lawyer usage and still bounds storage. */
const MAX_WORKSPACES_PER_USER = 200;

const CreateBody = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  /** Pre-fill the workspace from a template. The template's cards
   *  are inserted in one transaction with the workspace creation. */
  templateId: z.string().min(1).max(60).optional(),
});

export async function POST(request: NextRequest) {
  try {
    /* AUDIT-FIX C2: gated by getAtlasAuth (LAW_FIRM/BOTH only) — was previously raw auth() with any-org fallback, allowing OPERATOR users to mint Atlas workspaces + share-tokens. */
    const atlas = await getAtlasAuth();
    if (!atlas) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "astra_chat",
      getIdentifier(request, atlas.userId),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = CreateBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Look up the template if one was specified. If templateId is set
    // but unknown, we silently fall through to creating a blank
    // workspace — better UX than 400-ing on a stale client cache.
    const template = parsed.data.templateId
      ? getTemplateById(parsed.data.templateId)
      : undefined;

    // Create + (optionally) seed cards in one Serializable
    // transaction. Serializable is needed for MED-1: the quota check
    // must observe other concurrent inserts so two parallel calls
    // can't both pass count=199 and end up with 201 rows.
    const ws = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.atlasWorkspace.count({
          where: {
            userId: atlas.userId,
            organizationId: atlas.organizationId,
            archived: false,
          },
        });
        if (existing >= MAX_WORKSPACES_PER_USER) {
          throw new Error("WORKSPACE_QUOTA_EXCEEDED");
        }

        const created = await tx.atlasWorkspace.create({
          data: {
            userId: atlas.userId,
            organizationId: atlas.organizationId,
            title: parsed.data.title ?? template?.workspaceTitle ?? "Workspace",
          },
          select: {
            id: true,
            title: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (template && template.cards.length > 0) {
          // createMany is faster than sequential creates here because
          // the template cards don't reference each other (no
          // sourceCardIds remapping needed — that's only for the
          // fork endpoint).
          await tx.atlasWorkspaceCard.createMany({
            data: template.cards.map((c) => ({
              workspaceId: created.id,
              kind: c.kind,
              title: c.title,
              content: c.content,
              sourceCardIds: [],
            })),
          });
        }

        return { ws: created, cardCount: template?.cards.length ?? 0 };
      },
      { isolationLevel: "Serializable" },
    );

    return NextResponse.json({
      workspace: {
        id: ws.ws.id,
        title: ws.ws.title,
        createdAt: ws.ws.createdAt.toISOString(),
        updatedAt: ws.ws.updatedAt.toISOString(),
        cardCount: ws.cardCount,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "WORKSPACE_QUOTA_EXCEEDED") {
      return NextResponse.json(
        {
          error: "Workspace quota exceeded",
          limit: MAX_WORKSPACES_PER_USER,
        },
        { status: 409 },
      );
    }
    logger.error(`POST /api/atlas/workspaces failed: ${msg}`);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
