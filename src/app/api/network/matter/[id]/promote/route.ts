/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/network/matter/[id]/promote
 *
 * Promotet einen STANDALONE-Matter zum echten Mandat: nimmt
 * clientOrgId + scope + durationMonths, ruft promoteStandaloneMatter
 * auf, returnt rawAcceptToken + acceptUrl.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { ScopeItemSchema } from "@/lib/legal-network/scope";
import {
  promoteStandaloneMatter,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  clientOrgId: z.string().cuid(),
  scope: z.array(ScopeItemSchema).min(1).max(16),
  durationMonths: z.number().int().min(1).max(60),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: matterId } = await params;

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

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      return NextResponse.json({ error: "No active org" }, { status: 403 });
    }

    // Confirm caller's org is the matter's lawFirmOrgId — only the
    // owning law firm may promote its own workspace.
    const matter = await prisma.legalMatter.findUnique({
      where: { id: matterId },
      select: { lawFirmOrgId: true },
    });
    if (!matter) {
      return NextResponse.json({ error: "Matter not found" }, { status: 404 });
    }
    if (matter.lawFirmOrgId !== membership.organizationId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await promoteStandaloneMatter({
      matterId,
      clientOrgId: parsed.data.clientOrgId,
      scope: parsed.data.scope,
      durationMonths: parsed.data.durationMonths,
      invitingUserId: session.user.id,
    });

    return NextResponse.json({
      matterId,
      rawAcceptToken: result.rawAcceptToken,
      expiresAt: result.expiresAt.toISOString(),
      acceptUrl: `/network/accept/${result.rawAcceptToken}`,
    });
  } catch (err) {
    if (err instanceof MatterServiceError) {
      const status =
        err.code === "MATTER_NOT_FOUND"
          ? 404
          : err.code === "INVALID_STATE_FOR_PROMOTE"
            ? 409
            : 400;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`POST /api/network/matter/.../promote failed: ${msg}`);
    return NextResponse.json({ error: "Promote failed" }, { status: 500 });
  }
}
