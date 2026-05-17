/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate Party detail API (PATCH + DELETE).
 *
 *   PATCH  /api/atlas/mandate/[id]/parties/[partyId]   update mutable fields
 *   DELETE /api/atlas/mandate/[id]/parties/[partyId]   hard-delete party
 *
 * Both operations gate via mandate-membership relation filter on the
 * findFirst — refuses to act on parties outside the user's reach even
 * if the partyId is guessed.
 *
 * Delete is hard (not soft) because parties are user-curated metadata,
 * not transactional records — when the lawyer deletes a party, it's
 * usually because it was a typo or no-longer-relevant; no audit trail
 * needed. (AtlasAuditLog already captures the action via the api-audit
 * middleware if enabled.)
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

const PARTY_TYPES = [
  "client",
  "opponent",
  "authority",
  "co_counsel",
  "other",
] as const;

const PatchBody = z.object({
  type: z.enum(PARTY_TYPES).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  role: z.string().trim().max(120).nullable().optional(),
  contact: z.string().trim().max(500).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  reference: z.string().trim().max(120).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

async function findPartyForUser(
  partyId: string,
  mandateId: string,
  userId: string,
  organizationId: string,
) {
  return prisma.atlasMandateParty.findFirst({
    where: {
      id: partyId,
      mandateId,
      mandate: {
        organizationId,
        OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
      },
    },
    select: { id: true },
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; partyId: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id: mandateId, partyId } = await ctx.params;

  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const access = await findPartyForUser(
    partyId,
    mandateId,
    atlas.userId,
    atlas.organizationId,
  );
  if (!access) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.atlasMandateParty.update({
      where: { id: partyId },
      data: parsed.data,
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
    logger.info("[atlas/parties] updated", {
      mandateId,
      partyId,
      userId: atlas.userId,
    });
    return NextResponse.json({ party: updated });
  } catch (err) {
    logger.error("[atlas/parties] update failed", {
      mandateId,
      partyId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; partyId: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id: mandateId, partyId } = await ctx.params;

  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const access = await findPartyForUser(
    partyId,
    mandateId,
    atlas.userId,
    atlas.organizationId,
  );
  if (!access) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  try {
    await prisma.atlasMandateParty.delete({ where: { id: partyId } });
    logger.info("[atlas/parties] deleted", {
      mandateId,
      partyId,
      userId: atlas.userId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[atlas/parties] delete failed", {
      mandateId,
      partyId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
