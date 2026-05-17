/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Resolve a single deadline-suggestion.
 *
 *   PATCH /api/atlas/mandate/[id]/deadline-suggestions/[suggestionId]
 *     body: { action: "accept" } | { action: "dismiss" }
 *
 * Accept: creates an AtlasMandateDeadline from the suggestion (title,
 * dueAt, description, default warnDays=7), sets suggestion.status =
 * accepted, links suggestion.resolvedAsDeadlineId. Both writes happen
 * in a transaction so a partial create doesn't leave an orphan suggestion.
 *
 * Dismiss: sets suggestion.status = dismissed. The unique-constraint
 * @@unique([mandateId, sourceFileId, title]) prevents the same suggestion
 * from being re-extracted, so dismissed = permanently hidden.
 *
 * Auth: mandate-membership scoped via relation-filter on the suggestion
 * itself — refuses to act on suggestions outside the user's reach.
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

const PatchBody = z.object({
  action: z.enum(["accept", "dismiss"]),
  /* Optional override on accept — lawyer may want a different warn-window
     than the default 7 days for high-stakes deadlines. */
  warnDays: z.number().int().min(0).max(180).optional(),
});

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; suggestionId: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id: mandateId, suggestionId } = await ctx.params;

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
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  /* Locate suggestion AND verify mandate-membership in one query.
     Without the relation filter, a user could PATCH a suggestion from
     a different mandate by guessing the id. */
  const suggestion = await prisma.atlasMandateDeadlineSuggestion.findFirst({
    where: {
      id: suggestionId,
      mandateId,
      status: "pending",
      mandate: {
        organizationId: atlas.organizationId,
        OR: [
          { ownerUserId: atlas.userId },
          { members: { some: { userId: atlas.userId } } },
        ],
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      dueAt: true,
    },
  });

  if (!suggestion) {
    return NextResponse.json(
      { error: "Suggestion not found or already resolved" },
      { status: 404 },
    );
  }

  try {
    if (parsed.data.action === "dismiss") {
      await prisma.atlasMandateDeadlineSuggestion.update({
        where: { id: suggestionId },
        data: {
          status: "dismissed",
          resolvedAt: new Date(),
          resolvedByUserId: atlas.userId,
        },
      });
      logger.info("[atlas/deadline-suggestions] dismissed", {
        mandateId,
        userId: atlas.userId,
        suggestionId,
      });
      return NextResponse.json({ ok: true, action: "dismissed" });
    }

    /* action === "accept" — transactional create + link. */
    const result = await prisma.$transaction(async (tx) => {
      const deadline = await tx.atlasMandateDeadline.create({
        data: {
          mandateId,
          title: suggestion.title,
          description: suggestion.description,
          dueAt: suggestion.dueAt,
          warnDays: parsed.data.warnDays ?? 7,
          createdByUserId: atlas.userId,
        },
        select: {
          id: true,
          title: true,
          dueAt: true,
          warnDays: true,
          status: true,
        },
      });
      await tx.atlasMandateDeadlineSuggestion.update({
        where: { id: suggestionId },
        data: {
          status: "accepted",
          resolvedAt: new Date(),
          resolvedByUserId: atlas.userId,
          resolvedAsDeadlineId: deadline.id,
        },
      });
      return deadline;
    });

    logger.info("[atlas/deadline-suggestions] accepted", {
      mandateId,
      userId: atlas.userId,
      suggestionId,
      deadlineId: result.id,
    });
    return NextResponse.json({
      ok: true,
      action: "accepted",
      deadline: result,
    });
  } catch (err) {
    logger.error("[atlas/deadline-suggestions] patch failed", {
      mandateId,
      suggestionId,
      action: parsed.data.action,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
