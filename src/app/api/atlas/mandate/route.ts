/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/mandate — create a new mandate (Claude-Projects equivalent).
 * GET  /api/atlas/mandate — list user's mandates (own + member-of).
 *
 * See docs/ATLAS-V2-MASTER-PLAN.md.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z.object({
  name: z.string().min(1).max(200),
  clientName: z.string().max(200).optional(),
  clientContact: z.string().max(200).optional(),
  customInstructions: z.string().max(8_000).optional(),
  jurisdiction: z.string().max(8).optional(),
  operatorType: z.string().max(64).optional(),
  primaryAuthority: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  try {
    const created = await prisma.atlasMandate.create({
      data: {
        organizationId: atlas.organizationId,
        ownerUserId: atlas.userId,
        name: parsed.data.name,
        clientName: parsed.data.clientName,
        clientContact: parsed.data.clientContact,
        customInstructions: parsed.data.customInstructions,
        jurisdiction: parsed.data.jurisdiction,
        operatorType: parsed.data.operatorType,
        primaryAuthority: parsed.data.primaryAuthority,
        /* Ensure the owner is also persisted as an explicit member
           row so member-based queries always include them. */
        members: {
          create: { userId: atlas.userId, role: "owner" },
        },
      },
      select: {
        id: true,
        name: true,
        clientName: true,
        jurisdiction: true,
        status: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ mandate: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // AUDIT-FIX M23: mask userId (CUID) before logging
    logger.error("[atlas/mandate] POST failed", {
      userId: maskId(atlas.userId),
      error: msg,
    });
    return NextResponse.json(
      { error: "Mandate creation failed" },
      { status: 500 },
    );
  }
}

export async function GET(_req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  /* Return mandates where the user is owner OR explicit member.
     Filter out archived/closed for the sidebar default; the Korpus
     surface can list those separately. */
  const mandates = await prisma.atlasMandate.findMany({
    where: {
      organizationId: atlas.organizationId,
      status: "active",
      OR: [
        { ownerUserId: atlas.userId },
        { members: { some: { userId: atlas.userId } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      clientName: true,
      jurisdiction: true,
      operatorType: true,
      primaryAuthority: true,
      status: true,
      updatedAt: true,
      createdAt: true,
      _count: {
        select: { chats: true, files: true },
      },
    },
  });
  return NextResponse.json({ mandates });
}
