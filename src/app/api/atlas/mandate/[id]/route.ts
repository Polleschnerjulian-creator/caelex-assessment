/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET    /api/atlas/mandate/[id] — full detail (chats + members + counts).
 * PATCH  /api/atlas/mandate/[id] — update mutable fields (name, instructions,
 *                                    jurisdiction, status …).
 * DELETE /api/atlas/mandate/[id] — soft-archive (sets status=archived +
 *                                    archivedAt). Use ?hard=true to actually
 *                                    delete (cascade chats + files + members).
 *
 * Auth: getAtlasAuth + caller must be owner OR explicit member.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { logger } from "@/lib/logger";
import { deleteMandateAndR2Files } from "@/lib/atlas/document-processor.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchBody = z.object({
  name: z.string().min(1).max(200).optional(),
  clientName: z.string().max(200).nullable().optional(),
  clientContact: z.string().max(200).nullable().optional(),
  customInstructions: z.string().max(8_000).nullable().optional(),
  jurisdiction: z.string().max(8).nullable().optional(),
  operatorType: z.string().max(64).nullable().optional(),
  primaryAuthority: z.string().max(64).nullable().optional(),
  status: z.enum(["active", "archived", "closed"]).optional(),
});

/* ── Membership-gated load. Used by GET, PATCH, DELETE handlers. ──── */
async function loadMandateForUser(
  id: string,
  userId: string,
  organizationId: string,
) {
  return prisma.atlasMandate.findFirst({
    where: {
      id,
      organizationId,
      OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      ownerUserId: true,
      organizationId: true,
    },
  });
}

/* ── GET ───────────────────────────────────────────────────────────── */

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const mandate = await prisma.atlasMandate.findFirst({
    where: {
      id,
      organizationId: atlas.organizationId,
      OR: [
        { ownerUserId: atlas.userId },
        { members: { some: { userId: atlas.userId } } },
      ],
    },
    select: {
      id: true,
      name: true,
      clientName: true,
      clientContact: true,
      customInstructions: true,
      jurisdiction: true,
      operatorType: true,
      primaryAuthority: true,
      status: true,
      archivedAt: true,
      closedAt: true,
      createdAt: true,
      updatedAt: true,
      ownerUserId: true,
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        orderBy: { addedAt: "asc" },
        select: {
          id: true,
          role: true,
          addedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
      chats: {
        where: { archivedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          createdAt: true,
        },
      },
      _count: {
        select: { chats: true, files: true, members: true },
      },
    },
  });

  if (!mandate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ mandate });
}

/* ── PATCH ─────────────────────────────────────────────────────────── */

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const access = await loadMandateForUser(
    id,
    atlas.userId,
    atlas.organizationId,
  );
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  /* Status-transition side-effects: track archivedAt / closedAt
     timestamps automatically when status flips. */
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "archived") {
    data.archivedAt = new Date();
  }
  if (parsed.data.status === "closed") {
    data.closedAt = new Date();
  }
  if (parsed.data.status === "active") {
    data.archivedAt = null;
    data.closedAt = null;
  }

  try {
    const updated = await prisma.atlasMandate.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        clientName: true,
        customInstructions: true,
        jurisdiction: true,
        operatorType: true,
        primaryAuthority: true,
        status: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ mandate: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/mandate/id] PATCH failed", {
      userId: atlas.userId,
      mandateId: id,
      error: msg,
    });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

/* ── DELETE ────────────────────────────────────────────────────────── */

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const url = new URL(req.url);
  const hard = url.searchParams.get("hard") === "true";

  const access = await loadMandateForUser(
    id,
    atlas.userId,
    atlas.organizationId,
  );
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  /* Hard-delete is owner-only — collaborators can soft-archive but
     not destroy the audit trail. */
  if (hard && access.ownerUserId !== atlas.userId) {
    return NextResponse.json(
      { error: "Only the mandate owner can hard-delete" },
      { status: 403 },
    );
  }

  try {
    if (hard) {
      /* AUDIT-FIX C6: route through deleteMandateAndR2Files so the
         R2 binaries are removed BEFORE the Prisma cascade drops the
         AtlasMandateFile rows. Bare prisma.delete leaks R2 objects
         (storage cost + GDPR right-to-erasure violation). */
      const result = await deleteMandateAndR2Files({
        mandateId: id,
        userId: atlas.userId,
        organizationId: atlas.organizationId,
      });
      if (!result.deleted) {
        return NextResponse.json(
          { error: "Delete failed", r2DeletionErrors: result.r2DeletionErrors },
          { status: 500 },
        );
      }
      return NextResponse.json({
        ok: true,
        deleted: true,
        r2DeletionErrors: result.r2DeletionErrors,
      });
    }
    /* Soft archive — keeps chats + files + members intact. */
    await prisma.atlasMandate.update({
      where: { id },
      data: { status: "archived", archivedAt: new Date() },
    });
    return NextResponse.json({ ok: true, archived: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/mandate/id] DELETE failed", {
      userId: atlas.userId,
      mandateId: id,
      error: msg,
    });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
