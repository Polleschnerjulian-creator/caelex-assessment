/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — AI Context Settings Route
 * ──────────────────────────────────────
 *
 * GET  /api/atlas/settings/ai-context
 *   Returns { firmHouseStyle, userInstructions, canEditFirm }.
 *
 * PATCH /api/atlas/settings/ai-context
 *   Updates firmHouseStyle (Owner/Admin only) and/or userInstructions
 *   (any authenticated user, own record only).
 *
 * Auth and error-masking mirrors /api/atlas/settings/firm/route.ts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageFirm, getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { maskId } from "@/lib/atlas/log-masking";
import { loadAtlasAiContext } from "@/lib/atlas/ai-context.server";

export const runtime = "nodejs";

const MAX_CHARS = 4000;

const AiContextPatchSchema = z
  .object({
    /** Kanzlei-wide AI house style — Owner/Admin only. */
    firmHouseStyle: z.string().max(MAX_CHARS).nullable().optional(),
    /** Personal AI instructions — any authenticated user (own record). */
    userInstructions: z.string().max(MAX_CHARS).nullable().optional(),
  })
  .strict();

// GET /api/atlas/settings/ai-context
export async function GET() {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await loadAtlasAiContext(atlas.organizationId, atlas.userId);

  return NextResponse.json({
    firmHouseStyle: ctx.firmHouseStyle,
    userInstructions: ctx.userInstructions,
    canEditFirm: canManageFirm(atlas.role),
  });
}

// PATCH /api/atlas/settings/ai-context
export async function PATCH(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = AiContextPatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    logger.warn("Atlas ai-context settings payload rejected", {
      issues: parsed.error.issues,
      userId: maskId(atlas.userId),
    });
    const fields = parsed.error.issues
      .map((i) => i.path.join("."))
      .filter(Boolean);
    return NextResponse.json(
      { error: "Invalid payload", fields },
      { status: 400 },
    );
  }

  const { firmHouseStyle, userInstructions } = parsed.data;

  // Require Owner/Admin for firm-level field
  if (firmHouseStyle !== undefined && !canManageFirm(atlas.role)) {
    return NextResponse.json(
      { error: "Only owners and admins can edit firm AI settings" },
      { status: 403 },
    );
  }

  if (firmHouseStyle === undefined && userInstructions === undefined) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  try {
    const updatedFields: string[] = [];

    if (firmHouseStyle !== undefined) {
      // Upsert so the branding row doesn't need to pre-exist
      await prisma.atlasOrgBranding.upsert({
        where: { organizationId: atlas.organizationId },
        update: { aiHouseStyle: firmHouseStyle },
        create: {
          organizationId: atlas.organizationId,
          aiHouseStyle: firmHouseStyle,
        },
      });
      updatedFields.push("firmHouseStyle");
    }

    if (userInstructions !== undefined) {
      await prisma.user.update({
        where: { id: atlas.userId },
        data: { atlasAiInstructions: userInstructions },
      });
      updatedFields.push("userInstructions");
    }

    logger.info("Atlas ai-context settings updated", {
      organizationId: maskId(atlas.organizationId),
      userId: maskId(atlas.userId),
      fields: updatedFields,
    });

    return NextResponse.json({ ok: true, updatedFields });
  } catch (err) {
    logger.error("Atlas ai-context settings update failed", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
