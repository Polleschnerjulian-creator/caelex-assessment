/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate Time-Entry detail API (PATCH + DELETE).
 *
 *   PATCH  /api/atlas/mandate/[id]/time-entries/[entryId]   update mutable fields
 *   DELETE /api/atlas/mandate/[id]/time-entries/[entryId]   hard-delete entry
 *
 * Closes the billing-correctness gap: a typo'd duration or description
 * previously required deleting via DB console. Edit/delete makes the
 * Stundenerfassung abrechnungsfest — the lawyer can fix an entry before
 * the DATEV export runs.
 *
 * Auth pattern mirrors the sibling routes exactly:
 *   getAtlasAuth → 401 · checkMandateMembership → 403 · Zod → 400 ·
 *   org-scoped findFirst on the entry → 404 (refuses to act on entries
 *   outside the caller's reach even if the entryId is guessed).
 *
 * The PATCH body mirrors the POST schema in ../route.ts as a partial
 * (minutes, description, billable, hourlyRateEur, workedOn). chatId is
 * deliberately NOT editable — it links the entry to its source chat and
 * rewriting that link after the fact would falsify the audit trail.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";
import { checkMandateMembership } from "@/lib/atlas/mandate-membership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Partial mirror of the POST body in ../route.ts — same bounds. */
const PatchBody = z.object({
  minutes: z
    .number()
    .int()
    .min(1)
    .max(60 * 24)
    .optional(),
  description: z.string().min(1).max(500).optional(),
  billable: z.boolean().optional(),
  hourlyRateEur: z.number().min(0).max(5000).nullable().optional(),
  workedOn: z.string().datetime().optional(),
});

/* Org-scoped entry lookup gated via the mandate-membership relation
   filter — same shape as findPartyForUser in ../../parties/[partyId]. */
async function findEntryForUser(
  entryId: string,
  mandateId: string,
  userId: string,
  organizationId: string,
) {
  return prisma.atlasTimeEntry.findFirst({
    where: {
      id: entryId,
      mandateId,
      mandate: {
        organizationId,
        OR: [{ ownerUserId: userId }, { members: { some: { userId } } }],
      },
    },
    select: { id: true },
  });
}

const ENTRY_SELECT = {
  id: true,
  minutes: true,
  description: true,
  billable: true,
  hourlyRateEur: true,
  workedOn: true,
  chatId: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } },
} as const;

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; entryId: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: mandateId, entryId } = await ctx.params;
  if (
    !(await checkMandateMembership(
      mandateId,
      atlas.userId,
      atlas.organizationId,
    ))
  ) {
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
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const access = await findEntryForUser(
    entryId,
    mandateId,
    atlas.userId,
    atlas.organizationId,
  );
  if (!access) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.minutes !== undefined) data.minutes = parsed.data.minutes;
  if (parsed.data.description !== undefined)
    data.description = parsed.data.description;
  if (parsed.data.billable !== undefined) data.billable = parsed.data.billable;
  if (parsed.data.hourlyRateEur !== undefined)
    data.hourlyRateEur = parsed.data.hourlyRateEur;
  if (parsed.data.workedOn !== undefined)
    data.workedOn = new Date(parsed.data.workedOn);

  try {
    const updated = await prisma.atlasTimeEntry.update({
      where: { id: entryId },
      data,
      select: ENTRY_SELECT,
    });
    logger.info("[atlas/time-entries] updated", {
      userId: maskId(atlas.userId),
      mandateId,
      entryId,
    });
    return NextResponse.json({ entry: updated });
  } catch (err) {
    logger.error("[atlas/time-entries] update failed", {
      userId: maskId(atlas.userId),
      mandateId,
      entryId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; entryId: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: mandateId, entryId } = await ctx.params;
  if (
    !(await checkMandateMembership(
      mandateId,
      atlas.userId,
      atlas.organizationId,
    ))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const access = await findEntryForUser(
    entryId,
    mandateId,
    atlas.userId,
    atlas.organizationId,
  );
  if (!access) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  try {
    await prisma.atlasTimeEntry.delete({ where: { id: entryId } });
    logger.info("[atlas/time-entries] deleted", {
      userId: maskId(atlas.userId),
      mandateId,
      entryId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("[atlas/time-entries] delete failed", {
      userId: maskId(atlas.userId),
      mandateId,
      entryId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
