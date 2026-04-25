/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET  /api/pharos/oversight/accept?token=...
 *      Operator-side preview of an inbound oversight invite. Returns
 *      authority identity, MDF, proposed VDF, lifecycle metadata —
 *      everything needed to render the consent screen WITHOUT
 *      consuming the token.
 *
 * POST /api/pharos/oversight/accept
 *      Operator commits the decision: ACCEPT (with optional VDF
 *      amendment), or DISPUTE (status → DISPUTED, no activation).
 *      Single endpoint for both verbs, differentiated by `action` in
 *      the body — same shape as Atlas's /api/network/accept.
 *
 * Note: a separate `/dispute` endpoint exists if you only have the
 * oversightId (e.g. from inside the Operator Network UI after the
 * token has already been consumed). This endpoint requires a token.
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
  previewOversightInvite,
  acceptOversight,
  disputeOversight,
  OversightServiceError,
} from "@/lib/pharos/oversight-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── GET — preview ────────────────────────────────────────────────────

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

    try {
      const preview = await previewOversightInvite(parsed.data.token);

      // Confirm the viewing user's org is the operator the invitation
      // was addressed to. This is a soft check — the accept service
      // re-validates it cryptographically against the token-bound
      // operatorOrgId, so we can return a friendly 403 here without
      // any security loss.
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id },
        select: { organizationId: true },
        orderBy: { joinedAt: "asc" },
      });
      if (!membership || membership.organizationId !== preview.operator.id) {
        return NextResponse.json(
          {
            error:
              "Diese Aufsichts-Einladung ist an eine andere Organisation gerichtet",
            code: "WRONG_ORG",
          },
          { status: 403 },
        );
      }

      return NextResponse.json(preview);
    } catch (err) {
      if (err instanceof OversightServiceError) {
        const status =
          err.code === "INVITE_TOKEN_INVALID"
            ? 404
            : err.code === "INVITE_TOKEN_EXPIRED"
              ? 410
              : err.code === "OVERSIGHT_WRONG_STATE"
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
    logger.error(`Pharos accept GET (preview) failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to load oversight preview" },
      { status: 500 },
    );
  }
}

// ─── POST — accept or dispute ────────────────────────────────────────

const Body = z.object({
  token: z.string().min(1).max(200),
  action: z.enum(["ACCEPT", "DISPUTE"]),
  // ACCEPT-only: optional VDF amendment (operator may add to VDF, never reduce MDF)
  amendedVoluntaryDisclosure: z.array(ScopeItemSchema).max(16).optional(),
  // DISPUTE-only: required reason (audit-trail evidence)
  reason: z.string().min(10).max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Same rate-limit tier as Atlas accept — both are bilateral handshakes.
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

  // Resolve operator-side org membership.
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: { select: { id: true, isActive: true, orgType: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership || !membership.organization.isActive) {
    return NextResponse.json(
      { error: "No active organisation" },
      { status: 403 },
    );
  }

  // Pharos invites are addressed to operator orgs (not law-firm,
  // not authority). An authority can't accept its own invite.
  if (membership.organization.orgType === "AUTHORITY") {
    return NextResponse.json(
      {
        error: "Authority orgs cannot accept oversight invites",
        code: "WRONG_ORG_TYPE",
      },
      { status: 403 },
    );
  }

  try {
    if (parsed.data.action === "DISPUTE") {
      // For dispute via token we need to first resolve the oversight
      // by token, then call disputeOversight by id. We use the preview
      // service — it does not consume the token, just resolves it.
      if (!parsed.data.reason) {
        return NextResponse.json(
          { error: "DISPUTE requires a reason (min 10 chars)" },
          { status: 400 },
        );
      }
      const preview = await previewOversightInvite(parsed.data.token);
      const result = await disputeOversight({
        oversightId: preview.oversight.id,
        disputingOrgId: membership.organization.id,
        disputingUserId: session.user.id,
        reason: parsed.data.reason,
      });
      return NextResponse.json({
        oversightId: result.id,
        status: result.status,
      });
    }

    // ACCEPT
    const result = await acceptOversight({
      rawToken: parsed.data.token,
      acceptedBy: session.user.id,
      acceptingOrgId: membership.organization.id,
      amendedVoluntaryDisclosure: parsed.data.amendedVoluntaryDisclosure,
    });
    return NextResponse.json({
      oversightId: result.oversightId,
      handshakeHash: result.handshakeHash,
      status: "ACTIVE",
    });
  } catch (err) {
    if (err instanceof OversightServiceError) {
      const status =
        err.code === "INVITE_TOKEN_INVALID"
          ? 404
          : err.code === "INVITE_TOKEN_EXPIRED"
            ? 410
            : err.code === "OVERSIGHT_WRONG_STATE"
              ? 409
              : err.code === "NOT_AUTHORIZED"
                ? 403
                : err.code === "VDF_AMENDMENT_INVALID"
                  ? 400
                  : err.code === "OVERSIGHT_NOT_FOUND"
                    ? 404
                    : 400;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Pharos accept POST failed: ${msg}`);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
