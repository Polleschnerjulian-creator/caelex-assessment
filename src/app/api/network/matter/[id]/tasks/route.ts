/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET/POST /api/network/matter/:id/tasks
 *
 * Firm-side task list for a matter. Only law-firm members of the
 * matter's firm org can read/write (operator is blocked; their view
 * comes later in Phase 2 via a dedicated read-only endpoint).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateTask = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignedTo: z.string().cuid().optional(),
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
      select: { lawFirmOrgId: true, clientOrgId: true, status: true },
    }),
  ]);
  if (!membership || !matter) return null;
  // Phase 2 first iteration: only the law firm side writes tasks.
  // Operator access will be added once we know the UX pattern.
  if (matter.lawFirmOrgId !== membership.organizationId) return null;
  return { orgId: membership.organizationId, matter };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const gate = await resolveFirmAuth(session.user.id, id);
    if (!gate) {
      return NextResponse.json(
        { error: "Not a firm-side member of this matter" },
        { status: 403 },
      );
    }
    const tasks = await prisma.matterTask.findMany({
      where: { matterId: id },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ tasks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Tasks list failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to load tasks" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const gate = await resolveFirmAuth(session.user.id, id);
    if (!gate) {
      return NextResponse.json(
        { error: "Not a firm-side member of this matter" },
        { status: 403 },
      );
    }
    const raw = await req.json().catch(() => null);
    const parsed = CreateTask.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const task = await prisma.matterTask.create({
      data: {
        matterId: id,
        title: parsed.data.title,
        description: parsed.data.description,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        priority: parsed.data.priority ?? "NORMAL",
        assignedTo: parsed.data.assignedTo,
        createdBy: session.user.id,
      },
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Task create failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}
