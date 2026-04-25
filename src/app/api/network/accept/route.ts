/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/network/accept
 * POST /api/network/reject
 *
 * Symmetric endpoints. Accept consumes the token and activates the
 * matter (direct accept) or transitions to PENDING_CONSENT (amend).
 * Reject consumes the token and closes the matter.
 *
 * Route is colocated — both verbs share the same URL, differentiated
 * by action in the body. Lower surface area, same rate-limit tier.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import {
  acceptInvite,
  rejectInvite,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";
import { dispatchCounterSignEmail } from "@/lib/legal-network/email-dispatch";
import { ScopeItemSchema } from "@/lib/legal-network/scope";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const Body = z.object({
  token: z.string().min(1).max(200),
  action: z.enum(["ACCEPT", "REJECT"]),
  amendedScope: z.array(ScopeItemSchema).optional(),
  amendedDurationMonths: z.number().int().min(1).max(60).optional(),
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    if (parsed.data.action === "REJECT") {
      const matter = await rejectInvite({
        rawToken: parsed.data.token,
        rejectingUserId: session.user.id,
        rejectingOrgId: membership.organization.id,
        reason: parsed.data.reason,
      });
      return NextResponse.json({ matterId: matter.id, status: matter.status });
    }

    const result = await acceptInvite({
      rawToken: parsed.data.token,
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

    // Dispatch counter-sign email when amendment created a new
    // PENDING_CONSENT invitation. Best-effort fire-and-forget — same
    // pattern as the inbox accept route. The "production also emails
    // this" comment in earlier versions of this route is now actually
    // true with this dispatch.
    if (result.counterInvitationId) {
      void dispatchCounterSignEmail({
        counterInvitationId: result.counterInvitationId,
        amendingUserId: session.user.id,
      });
    }

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
    // Unexpected: log + 500 instead of bubbling to Next's default
    // handler, so production gets a tagged log entry with stack.
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Network accept POST failed: ${msg}`);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}

// ─── GET — preview invitation ────────────────────────────────────────
//
// The consent-landing page needs to show WHO is inviting WHOM + WHAT
// scope + WHAT duration before the user clicks Accept. Lookup by token
// returns everything needed to render that screen, without consuming.

const QuerySchema = z.object({ token: z.string().min(1).max(200) });

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      token: url.searchParams.get("token"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const { hashToken, isExpired } = await import("@/lib/legal-network/tokens");
    const tokenHash = hashToken(parsed.data.token);
    const invitation = await prisma.legalMatterInvitation.findUnique({
      where: { tokenHash },
      include: {
        matter: {
          include: {
            lawFirmOrg: {
              select: { id: true, name: true, logoUrl: true, slug: true },
            },
            clientOrg: {
              select: { id: true, name: true, logoUrl: true, slug: true },
            },
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }
    if (invitation.consumedAt) {
      return NextResponse.json(
        { error: "Invitation already used", consumedAt: invitation.consumedAt },
        { status: 410 },
      );
    }
    if (isExpired(invitation.expiresAt)) {
      return NextResponse.json(
        { error: "Invitation expired", expiresAt: invitation.expiresAt },
        { status: 410 },
      );
    }

    // Also confirm the viewing user's org is the one expected to accept.
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    });
    const expectedAcceptorOrgId =
      invitation.matter.invitedFrom === "ATLAS"
        ? invitation.matter.clientOrgId
        : invitation.matter.lawFirmOrgId;
    if (!membership || membership.organizationId !== expectedAcceptorOrgId) {
      return NextResponse.json(
        { error: "This invitation is for a different organisation" },
        { status: 403 },
      );
    }

    return NextResponse.json({
      matter: {
        id: invitation.matter.id,
        name: invitation.matter.name,
        reference: invitation.matter.reference,
        description: invitation.matter.description,
        invitedFrom: invitation.matter.invitedFrom,
        status: invitation.matter.status,
      },
      lawFirm: invitation.matter.lawFirmOrg,
      client: invitation.matter.clientOrg,
      proposedScope: invitation.proposedScope,
      proposedDurationMonths: invitation.proposedDurationMonths,
      expiresAt: invitation.expiresAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Network accept GET (preview) failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to load invitation preview" },
      { status: 500 },
    );
  }
}
