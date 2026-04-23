/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PATCH/DELETE /api/network/matter/:id/tasks/:taskId
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PatchTask = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"])
    .optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignedTo: z.string().cuid().nullable().optional(),
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
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id, taskId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await resolveFirmAuth(session.user.id, id);
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const parsed = PatchTask.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const existing = await prisma.matterTask.findUnique({
    where: { id: taskId },
    select: { matterId: true },
  });
  if (!existing || existing.matterId !== id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // When a task transitions to DONE/CANCELLED, stamp completedAt
  // so later analytics know when it closed.
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.dueDate !== undefined) {
    data.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  }
  if (parsed.data.status === "DONE" || parsed.data.status === "CANCELLED") {
    data.completedAt = new Date();
  } else if (parsed.data.status) {
    data.completedAt = null;
  }

  const task = await prisma.matterTask.update({
    where: { id: taskId },
    data,
  });
  return NextResponse.json({ task });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> },
) {
  const { id, taskId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await resolveFirmAuth(session.user.id, id);
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const existing = await prisma.matterTask.findUnique({
    where: { id: taskId },
    select: { matterId: true },
  });
  if (!existing || existing.matterId !== id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  await prisma.matterTask.delete({ where: { id: taskId } });
  return NextResponse.json({ ok: true });
}
