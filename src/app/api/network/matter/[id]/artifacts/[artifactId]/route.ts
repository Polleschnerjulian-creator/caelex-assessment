/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PATCH/DELETE /api/network/matter/:id/artifacts/:artifactId
 *
 * PATCH: toggle pinned, update position (drag-and-drop future).
 * DELETE: remove card from pinboard.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const Patch = z.object({
  pinned: z.boolean().optional(),
  position: z.number().int().min(0).max(10_000).optional(),
  title: z.string().min(1).max(200).optional(),
});

async function gate(userId: string, matterId: string, artifactId: string) {
  const [membership, matter, artifact] = await Promise.all([
    prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { lawFirmOrgId: true },
    }),
    prisma.matterArtifact.findUnique({
      where: { id: artifactId },
      select: { matterId: true },
    }),
  ]);
  if (!membership || !matter || !artifact) return null;
  if (matter.lawFirmOrgId !== membership.organizationId) return null;
  if (artifact.matterId !== matterId) return null;
  return true;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; artifactId: string }> },
) {
  const { id, artifactId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await gate(session.user.id, id, artifactId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const raw = await req.json().catch(() => null);
  const parsed = Patch.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const artifact = await prisma.matterArtifact.update({
    where: { id: artifactId },
    data: parsed.data,
  });
  return NextResponse.json({ artifact });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; artifactId: string }> },
) {
  const { id, artifactId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await gate(session.user.id, id, artifactId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.matterArtifact.delete({ where: { id: artifactId } });
  return NextResponse.json({ ok: true });
}
