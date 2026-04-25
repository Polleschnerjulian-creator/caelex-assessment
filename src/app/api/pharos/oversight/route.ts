/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET  /api/pharos/oversight  — list authority's oversight relationships
 * POST /api/pharos/oversight  — initiate a new oversight (authority-side)
 *
 * The bilateral handshake — same shape as Atlas's matter-invite but
 * with MDF + VDF semantics. POST returns a one-time accept-token URL
 * that authorities email to operator-side compliance officers.
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
  initiateOversight,
  listOversightsByAuthority,
  OversightServiceError,
} from "@/lib/pharos/oversight-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const InitiateBody = z.object({
  operatorOrgId: z.string().cuid(),
  oversightTitle: z.string().min(3).max(200),
  oversightReference: z.string().max(50).optional(),
  legalReference: z.string().min(2).max(200),
  mandatoryDisclosure: z.array(ScopeItemSchema).min(1).max(16),
  voluntaryDisclosure: z.array(ScopeItemSchema).max(16).optional(),
});

/** Authority-side caller resolution. Confirms caller is OWNER/ADMIN
 *  on an AUTHORITY org and returns the AuthorityProfile. */
async function resolveAuthorityCaller(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    select: {
      organizationId: true,
      role: true,
      organization: { select: { orgType: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) return null;
  if (membership.organization.orgType !== "AUTHORITY") return null;
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") return null;

  const profile = await prisma.authorityProfile.findUnique({
    where: { organizationId: membership.organizationId },
  });
  if (!profile) return null;
  return { membership, profile };
}

// ─── GET — list oversights ────────────────────────────────────────────

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const caller = await resolveAuthorityCaller(session.user.id);
    if (!caller) {
      return NextResponse.json(
        {
          error: "Pharos requires an AUTHORITY org with active profile",
          code: "AUTHORITY_NOT_CONFIGURED",
        },
        { status: 403 },
      );
    }

    const oversights = await listOversightsByAuthority(caller.profile.id);

    return NextResponse.json({
      oversights: oversights.map((o) => ({
        id: o.id,
        oversightTitle: o.oversightTitle,
        oversightReference: o.oversightReference,
        legalReference: o.legalReference,
        status: o.status,
        operator: o.operatorOrg,
        initiatedAt: o.initiatedAt,
        acceptedAt: o.acceptedAt,
        effectiveFrom: o.effectiveFrom,
        effectiveUntil: o.effectiveUntil,
        accessLogCount: o._count.accessLogs,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Pharos oversight GET failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to load oversights" },
      { status: 500 },
    );
  }
}

// ─── POST — initiate oversight ────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const caller = await resolveAuthorityCaller(session.user.id);
    if (!caller) {
      return NextResponse.json(
        {
          error: "Pharos requires an AUTHORITY org with active profile",
          code: "AUTHORITY_NOT_CONFIGURED",
        },
        { status: 403 },
      );
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

    const raw = await request.json().catch(() => null);
    const parsed = InitiateBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    try {
      const result = await initiateOversight({
        authorityProfileId: caller.profile.id,
        operatorOrgId: parsed.data.operatorOrgId,
        oversightTitle: parsed.data.oversightTitle,
        oversightReference: parsed.data.oversightReference,
        legalReference: parsed.data.legalReference,
        mandatoryDisclosure: parsed.data.mandatoryDisclosure,
        voluntaryDisclosure: parsed.data.voluntaryDisclosure,
        initiatedBy: session.user.id,
      });

      // Return the raw token to the authority — they paste it into the
      // operator's email. The token is one-time; once the operator accepts
      // (or it expires), it's burned.
      return NextResponse.json({
        oversightId: result.oversightId,
        rawAcceptToken: result.rawAcceptToken,
        expiresAt: result.expiresAt.toISOString(),
        acceptUrl: `/network/pharos-accept/${result.rawAcceptToken}`,
      });
    } catch (err) {
      if (err instanceof OversightServiceError) {
        const status =
          err.code === "AUTHORITY_NOT_FOUND"
            ? 403
            : err.code === "OPERATOR_NOT_FOUND"
              ? 404
              : err.code === "ALREADY_EXISTS"
                ? 409
                : 400;
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status },
        );
      }
      throw err;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Pharos oversight POST failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to initiate oversight" },
      { status: 500 },
    );
  }
}
