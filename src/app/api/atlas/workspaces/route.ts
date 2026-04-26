/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { getTemplateById } from "@/data/atlas-workspace-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolve the org for the current user. Mirrors the strategy used by
 * the rest of the Atlas surface (LAW_FIRM/BOTH preferred, falls back
 * to any active membership). Returns the orgId or null.
 *
 * Centralised here so list/create/[id] all behave consistently — no
 * subtle differences in which org a workspace gets attached to.
 */
async function resolveOrgId(userId: string): Promise<string | null> {
  const m =
    (await prisma.organizationMember.findFirst({
      where: {
        userId,
        organization: {
          orgType: { in: ["LAW_FIRM", "BOTH"] },
          isActive: true,
        },
      },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    })) ??
    (await prisma.organizationMember.findFirst({
      where: { userId, organization: { isActive: true } },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    }));
  return m?.organizationId ?? null;
}

// ─── GET: list workspaces ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
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

    const orgId = await resolveOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No active organisation" },
        { status: 403 },
      );
    }

    // Return summary rows (no cards) — keeps the switcher dropdown
    // fast even when a lawyer has 50 workspaces. Cards load on-demand
    // when the user opens a specific workspace via [id].
    const workspaces = await prisma.atlasWorkspace.findMany({
      where: {
        userId: session.user.id,
        organizationId: orgId,
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

const CreateBody = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  /** Pre-fill the workspace from a template. The template's cards
   *  are inserted in one transaction with the workspace creation. */
  templateId: z.string().min(1).max(60).optional(),
});

export async function POST(request: NextRequest) {
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

    const orgId = await resolveOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No active organisation" },
        { status: 403 },
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

    // Create + (optionally) seed cards in one transaction so a partial
    // failure can't leave a workspace with half its template cards.
    const ws = await prisma.$transaction(async (tx) => {
      const created = await tx.atlasWorkspace.create({
        data: {
          userId: session.user.id!,
          organizationId: orgId,
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
    });

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
    logger.error(`POST /api/atlas/workspaces failed: ${msg}`);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
