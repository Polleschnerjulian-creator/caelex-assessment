/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET  /api/network/matter/:id/conversations  — list
 * POST /api/network/matter/:id/conversations  — create new
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

const Create = z.object({
  title: z.string().min(1).max(200).optional(),
});

async function firmGate(userId: string, matterId: string) {
  const [membership, matter] = await Promise.all([
    prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { lawFirmOrgId: true, status: true },
    }),
  ]);
  if (!membership || !matter) return null;
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
    const gate = await firmGate(session.user.id, id);
    if (!gate)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const conversations = await prisma.matterConversation.findMany({
      where: { matterId: id },
      orderBy: { lastMessageAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        lastMessageAt: true,
        messageCount: true,
        totalTokens: true,
      },
    });
    return NextResponse.json({ conversations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Conversations list failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to load conversations" },
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
    const gate = await firmGate(session.user.id, id);
    if (!gate)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (gate.matter.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Matter must be ACTIVE to chat", code: "MATTER_NOT_ACTIVE" },
        { status: 409 },
      );
    }

    const raw = await req.json().catch(() => ({}));
    const parsed = Create.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const conversation = await prisma.matterConversation.create({
      data: {
        matterId: id,
        title: parsed.data.title ?? "Neues Gespräch",
        createdBy: session.user.id,
      },
    });
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Conversation create failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 },
    );
  }
}
