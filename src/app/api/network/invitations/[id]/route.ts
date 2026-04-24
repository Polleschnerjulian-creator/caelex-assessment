/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/network/invitations/:id
 *
 * Session-authenticated accept/reject for the inbox flow. Mirrors the
 * semantics of /api/network/accept (which requires a raw token from
 * email) but authorises via the caller's org membership — so operators
 * can accept mandates without the original invite email.
 *
 * The service layer (acceptInvite/rejectInvite) supports both lookup
 * paths; this route just picks the invitationId branch.
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
  acceptInvite,
  rejectInvite,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";
import { ScopeItemSchema } from "@/lib/legal-network/scope";

export const runtime = "nodejs";

const Body = z.object({
  action: z.enum(["ACCEPT", "REJECT"]),
  amendedScope: z.array(ScopeItemSchema).optional(),
  amendedDurationMonths: z.number().int().min(1).max(60).optional(),
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Share the same rate-limit tier as the token-accept route.
    const rl = await checkRateLimit(
      "legal_matter_accept",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const raw = await request.json().catch(() => null);
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Resolve caller's active org. Used both for authorisation (service
    // throws NOT_AUTHORIZED if the caller's org isn't the expected
    // acceptor) and telemetry.
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: { select: { id: true, isActive: true } } },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership || !membership.organization.isActive) {
      return NextResponse.json(
        { error: "No active organisation" },
        { status: 403 },
      );
    }

    if (parsed.data.action === "REJECT") {
      const matter = await rejectInvite({
        invitationId: id,
        rejectingUserId: session.user.id,
        rejectingOrgId: membership.organization.id,
        reason: parsed.data.reason,
      });
      return NextResponse.json({
        matterId: matter.id,
        status: matter.status,
      });
    }

    const result = await acceptInvite({
      invitationId: id,
      acceptingUserId: session.user.id,
      acceptingOrgId: membership.organization.id,
      amendedScope: parsed.data.amendedScope,
      amendedDurationMonths: parsed.data.amendedDurationMonths,
      ipAddress:
        request.headers.get("cf-connecting-ip") ??
        request.headers.get("x-real-ip") ??
        null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      matterId: result.matter.id,
      status: result.matter.status,
      counterToken: result.counterToken,
    });
  } catch (err) {
    if (err instanceof MatterServiceError) {
      const statusMap: Record<string, number> = {
        TOKEN_INVALID: 404,
        TOKEN_CONSUMED: 410,
        TOKEN_EXPIRED: 410,
        NOT_AUTHORIZED: 403,
        MATTER_WRONG_STATE: 409,
        SCOPE_WIDENED: 400,
        INVALID_SCOPE: 400,
      };
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] ?? 400 },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Invitation action failed: ${msg}`);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
