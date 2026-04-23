/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET/POST /api/network/matter/:id/notes
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateNote = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(100_000).default(""),
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await resolveFirmAuth(session.user.id, id);
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Only latest versions; history is available via parentNoteId chain
  // in a future dedicated endpoint.
  const notes = await prisma.matterNote.findMany({
    where: { matterId: id, isLatest: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ notes });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await resolveFirmAuth(session.user.id, id);
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const parsed = CreateNote.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const note = await prisma.matterNote.create({
    data: {
      matterId: id,
      title: parsed.data.title,
      content: parsed.data.content,
      createdBy: session.user.id,
    },
  });
  return NextResponse.json({ note }, { status: 201 });
}
