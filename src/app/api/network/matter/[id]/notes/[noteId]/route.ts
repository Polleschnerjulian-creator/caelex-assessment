/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PATCH/DELETE /api/network/matter/:id/notes/:noteId
 *
 * Edits create a new version (parentNoteId link); the old row is
 * marked isLatest=false but kept for history. Delete wipes the whole
 * version chain for this note.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PatchNote = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(100_000).optional(),
});

async function resolveFirmAuth(userId: string, matterId: string) {
  const [membership, matter] = await Promise.all([
    prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { lawFirmOrgId: true },
    }),
  ]);
  if (!membership || !matter) return null;
  if (matter.lawFirmOrgId !== membership.organizationId) return null;
  return { orgId: membership.organizationId };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { id, noteId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await resolveFirmAuth(session.user.id, id);
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const parsed = PatchNote.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.matterNote.findUnique({
    where: { id: noteId },
    select: {
      matterId: true,
      title: true,
      content: true,
      createdBy: true,
      isLatest: true,
    },
  });
  if (!existing || existing.matterId !== id || !existing.isLatest) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  // Create a new version, mark old as superseded. Keeps the edit
  // history lossless — useful later for "what did this memo say
  // when we sent it to the client on 2026-04-01" questions.
  const next = await prisma.$transaction(async (tx) => {
    await tx.matterNote.update({
      where: { id: noteId },
      data: { isLatest: false },
    });
    return tx.matterNote.create({
      data: {
        matterId: id,
        title: parsed.data.title ?? existing.title,
        content: parsed.data.content ?? existing.content,
        createdBy: existing.createdBy,
        lastEditBy: session.user.id,
        parentNoteId: noteId,
        isLatest: true,
      },
    });
  });
  return NextResponse.json({ note: next });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { id, noteId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await resolveFirmAuth(session.user.id, id);
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Walk the version chain: find the head (this or its descendants),
  // then delete every note in the chain that belongs to this matter.
  // Simpler approach for Phase 2: delete matching parentNoteId tree.
  const head = await prisma.matterNote.findUnique({
    where: { id: noteId },
    select: { matterId: true, parentNoteId: true },
  });
  if (!head || head.matterId !== id) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  // Find root: walk up parentNoteId chain
  let rootId = noteId;
  let current = head;
  while (current.parentNoteId) {
    const parent = await prisma.matterNote.findUnique({
      where: { id: current.parentNoteId },
      select: { parentNoteId: true, matterId: true },
    });
    if (!parent) break;
    rootId = current.parentNoteId;
    current = parent;
  }
  // Delete root + all descendants by recursive matter+root filter.
  // SQL-level CASCADE would be cleaner, but we don't want an FK on
  // parentNoteId (self-ref + onDelete:Cascade has cycle issues).
  await prisma.$executeRaw`
    WITH RECURSIVE tree AS (
      SELECT id FROM "MatterNote" WHERE id = ${rootId}
      UNION ALL
      SELECT n.id FROM "MatterNote" n
      INNER JOIN tree t ON n."parentNoteId" = t.id
    )
    DELETE FROM "MatterNote" WHERE id IN (SELECT id FROM tree)
  `;
  return NextResponse.json({ ok: true });
}
