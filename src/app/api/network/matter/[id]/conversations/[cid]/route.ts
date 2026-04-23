/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET    /api/network/matter/:id/conversations/:cid — history
 * PATCH  /api/network/matter/:id/conversations/:cid — rename
 * DELETE /api/network/matter/:id/conversations/:cid — purge
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function firmGate(userId: string, matterId: string, cid: string) {
  const [membership, matter, conv] = await Promise.all([
    prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { lawFirmOrgId: true },
    }),
    prisma.matterConversation.findUnique({
      where: { id: cid },
      select: { id: true, matterId: true },
    }),
  ]);
  if (!membership || !matter || !conv) return null;
  if (matter.lawFirmOrgId !== membership.organizationId) return null;
  if (conv.matterId !== matterId) return null;
  return { orgId: membership.organizationId };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  const { id, cid } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await firmGate(session.user.id, id, cid);
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const conversation = await prisma.matterConversation.findUnique({
    where: { id: cid },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
          tokensInput: true,
          tokensOutput: true,
        },
      },
    },
  });
  return NextResponse.json({ conversation });
}

const Patch = z.object({ title: z.string().min(1).max(200) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  const { id, cid } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await firmGate(session.user.id, id, cid);
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const parsed = Patch.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const conv = await prisma.matterConversation.update({
    where: { id: cid },
    data: { title: parsed.data.title },
  });
  return NextResponse.json({ conversation: conv });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> },
) {
  const { id, cid } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await firmGate(session.user.id, id, cid);
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.matterConversation.delete({ where: { id: cid } });
  return NextResponse.json({ ok: true });
}
