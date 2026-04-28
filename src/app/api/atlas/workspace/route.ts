/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/workspace
 *
 * Atlas-AI-Mode 5. Quick-Action ⌘5: Erstellt einen leeren STANDALONE
 * Matter (ohne Mandant, ohne Scope, ohne Handshake) und gibt die
 * matterId zurück. Client navigiert anschließend zu
 * /atlas/network/{matterId}/workspace.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  createStandaloneMatter,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().min(2).max(120).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "legal_matter_invite",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    // Pick the user's law-firm-side org for this workspace. Strategy:
    //   1. Prefer a LAW_FIRM or BOTH membership (the semantically
    //      correct choice — Atlas IS the lawyer-side platform).
    //   2. If none exists, fall back to any active membership.
    //
    // The fallback is necessary because the Atlas (atlas)/atlas/layout
    // gate itself doesn't enforce orgType (it only checks isActive),
    // so any user who reached this endpoint has been blessed by that
    // gate and should not get a confusing 403 here. The fallback
    // handles edge cases like the Pharos-preview-mode AUTHORITY
    // membership taking precedence via joinedAt-epoch.
    const membership =
      (await prisma.organizationMember.findFirst({
        where: {
          userId: session.user.id,
          organization: {
            orgType: { in: ["LAW_FIRM", "BOTH"] },
            isActive: true,
          },
        },
        select: { organizationId: true },
        orderBy: { joinedAt: "asc" },
      })) ??
      (await prisma.organizationMember.findFirst({
        where: {
          userId: session.user.id,
          organization: { isActive: true },
        },
        select: { organizationId: true },
        orderBy: { joinedAt: "asc" },
      }));
    if (!membership) {
      return NextResponse.json(
        { error: "No active organisation" },
        { status: 403 },
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await createStandaloneMatter({
      lawFirmOrgId: membership.organizationId,
      createdBy: session.user.id,
      name: parsed.data.name,
    });

    return NextResponse.json({ matterId: result.matterId }, { status: 201 });
  } catch (err) {
    if (err instanceof MatterServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`POST /api/atlas/workspace failed: ${msg}`);
    return NextResponse.json(
      { error: "Workspace creation failed" },
      { status: 500 },
    );
  }
}
