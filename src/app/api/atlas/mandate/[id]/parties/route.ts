/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate Parties API (LIST + CREATE).
 *
 *   GET   /api/atlas/mandate/[id]/parties      list all parties for mandate
 *   POST  /api/atlas/mandate/[id]/parties      create new party
 *
 * Closes the audit-finding "kein Parties-Model" — previously alle Parteien
 * außer dem clientName-Freitext lebten nur in customInstructions als
 * Plaintext (keine Suche, keine Wiederverwendung).
 *
 * Auth: mandate-membership + org-scope via relation filter (same pattern
 * as the existing deadlines / files / members routes).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Allowed party types — UI groups by these. "other" is the catch-all
   so new categories (court, expert_witness, etc.) can be added without
   schema migration. */
const PARTY_TYPES = [
  "client",
  "opponent",
  "authority",
  "co_counsel",
  "other",
] as const;

async function checkMembership(
  mandateId: string,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const hit = await prisma.atlasMandate.findFirst({
    where: {
      id: mandateId,
      organizationId,
      OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  return !!hit;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id: mandateId } = await ctx.params;

  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const parties = await prisma.atlasMandateParty.findMany({
      where: {
        mandateId,
        mandate: {
          organizationId: atlas.organizationId,
          OR: [
            { ownerUserId: atlas.userId },
            { members: { some: { userId: atlas.userId } } },
          ],
        },
      },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      take: 200,
      select: {
        id: true,
        type: true,
        name: true,
        role: true,
        contact: true,
        address: true,
        reference: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ parties });
  } catch (err) {
    logger.error("[atlas/parties] list failed", {
      mandateId,
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to load parties" },
      { status: 500 },
    );
  }
}

const PostBody = z.object({
  type: z.enum(PARTY_TYPES),
  name: z.string().trim().min(1).max(200),
  role: z.string().trim().max(120).optional(),
  contact: z.string().trim().max(500).optional(),
  address: z.string().trim().max(500).optional(),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().max(4000).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id: mandateId } = await ctx.params;

  if (!(await checkMembership(mandateId, atlas.userId, atlas.organizationId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
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
    const created = await prisma.atlasMandateParty.create({
      data: {
        mandateId,
        organizationId: atlas.organizationId,
        type: parsed.data.type,
        name: parsed.data.name,
        role: parsed.data.role ?? null,
        contact: parsed.data.contact ?? null,
        address: parsed.data.address ?? null,
        reference: parsed.data.reference ?? null,
        notes: parsed.data.notes ?? null,
        createdByUserId: atlas.userId,
      },
      select: {
        id: true,
        type: true,
        name: true,
        role: true,
        contact: true,
        address: true,
        reference: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    logger.info("[atlas/parties] created", {
      mandateId,
      userId: atlas.userId,
      partyId: created.id,
      type: created.type,
    });
    return NextResponse.json({ party: created });
  } catch (err) {
    logger.error("[atlas/parties] create failed", {
      mandateId,
      userId: atlas.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
