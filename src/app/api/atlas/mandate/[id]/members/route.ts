/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST   /api/atlas/mandate/[id]/members — add member by email or userId.
 * DELETE /api/atlas/mandate/[id]/members?userId=… — remove member.
 *
 * Membership-gate: caller must be the mandate owner. Sprint 3 will add
 * delegated-admin (collaborator with role=reviewer can also add members);
 * Sprint 1 keeps the gate tight.
 *
 * Lookup: an added member must be a User in the same organization. We
 * prefer a userId lookup; if only an email is given we resolve via
 * User.email (case-insensitive) within the org.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z
  .object({
    userId: z.string().cuid().optional(),
    email: z.string().email().max(160).optional(),
    role: z
      .enum(["owner", "reviewer", "collaborator", "viewer"])
      .default("collaborator"),
  })
  .refine((b) => b.userId || b.email, {
    message: "Either userId or email required",
  });

async function requireOwnership(
  mandateId: string,
  userId: string,
  organizationId: string,
) {
  return prisma.atlasMandate.findFirst({
    where: {
      id: mandateId,
      organizationId,
      ownerUserId: userId,
    },
    select: { id: true },
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const owns = await requireOwnership(id, atlas.userId, atlas.organizationId);
  if (!owns) {
    return NextResponse.json(
      { error: "Only the mandate owner can manage members" },
      { status: 403 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PostBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  /* Resolve target user. Must be in the same organisation — we don't
     allow inviting strangers; they need to be Caelex-platform members
     of the same firm first. */
  const target = parsed.data.userId
    ? await prisma.user.findFirst({
        where: {
          id: parsed.data.userId,
          isActive: true,
          organizationMemberships: {
            some: { organizationId: atlas.organizationId },
          },
        },
        select: { id: true, email: true, name: true },
      })
    : await prisma.user.findFirst({
        where: {
          email: parsed.data.email!.toLowerCase(),
          isActive: true,
          organizationMemberships: {
            some: { organizationId: atlas.organizationId },
          },
        },
        select: { id: true, email: true, name: true },
      });

  if (!target) {
    return NextResponse.json(
      {
        error:
          "User not found in your organisation. Invite them to your org first.",
      },
      { status: 404 },
    );
  }

  try {
    const member = await prisma.atlasMandateMember.upsert({
      where: {
        mandateId_userId: {
          mandateId: id,
          userId: target.id,
        },
      },
      update: { role: parsed.data.role },
      create: {
        mandateId: id,
        userId: target.id,
        role: parsed.data.role,
      },
      select: {
        id: true,
        role: true,
        addedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json({ member });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/mandate/id/members] POST failed", {
      userId: atlas.userId,
      mandateId: id,
      error: msg,
    });
    return NextResponse.json({ error: "Add member failed" }, { status: 500 });
  }
}

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
  const targetUserId = url.searchParams.get("userId");

  if (!targetUserId) {
    return NextResponse.json(
      { error: "userId query param required" },
      { status: 400 },
    );
  }

  const owns = await requireOwnership(id, atlas.userId, atlas.organizationId);
  if (!owns) {
    return NextResponse.json(
      { error: "Only the mandate owner can manage members" },
      { status: 403 },
    );
  }

  /* The owner cannot remove themselves — to leave their own mandate
     they must transfer ownership first (Sprint 3 feature). */
  if (targetUserId === atlas.userId) {
    return NextResponse.json(
      {
        error:
          "The mandate owner cannot remove themselves. Transfer ownership first.",
      },
      { status: 400 },
    );
  }

  try {
    const removed = await prisma.atlasMandateMember.deleteMany({
      where: { mandateId: id, userId: targetUserId },
    });
    if (removed.count === 0) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/mandate/id/members] DELETE failed", {
      userId: atlas.userId,
      mandateId: id,
      error: msg,
    });
    return NextResponse.json(
      { error: "Remove member failed" },
      { status: 500 },
    );
  }
}
