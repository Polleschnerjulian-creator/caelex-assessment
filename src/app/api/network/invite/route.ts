/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/network/invite
 *
 * Creates a LegalMatter invitation. Direction (ATLAS→CAELEX or
 * CAELEX→ATLAS) is inferred from the caller's organisation type.
 * A single endpoint is intentional — route segmentation would
 * replicate the same service call behind different URLs.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import {
  createInvite,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";
import { ScopeItemSchema } from "@/lib/legal-network/scope";
import type { NetworkSide } from "@prisma/client";

export const runtime = "nodejs";

const Body = z.object({
  counterpartyOrgId: z.string().cuid(),
  name: z.string().min(3).max(200),
  reference: z.string().max(50).optional(),
  description: z.string().max(2000).optional(),
  proposedScope: z.array(ScopeItemSchema).min(1).max(16),
  proposedDurationMonths: z.number().int().min(1).max(60).optional(),
});

export async function POST(request: NextRequest) {
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

  const raw = await request.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Resolve caller's active org + derive initiator-side from its type.
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: {
      organization: { select: { id: true, orgType: true, isActive: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership || !membership.organization.isActive) {
    return NextResponse.json(
      { error: "No active organisation" },
      { status: 403 },
    );
  }

  // Determine side: if caller is a law firm → ATLAS invites operator.
  // If caller is an operator → CAELEX invites firm.
  const orgType = membership.organization.orgType;
  let initiatorSide: NetworkSide;
  if (orgType === "LAW_FIRM") initiatorSide = "ATLAS";
  else if (orgType === "OPERATOR") initiatorSide = "CAELEX";
  else {
    // BOTH-type orgs must be explicit — disambiguate via body.
    return NextResponse.json(
      {
        error:
          "Org is type BOTH; invites via this endpoint not supported. Set a primary side first.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await createInvite({
      initiatorOrgId: membership.organization.id,
      initiatorUserId: session.user.id,
      initiatorSide,
      counterpartyOrgId: parsed.data.counterpartyOrgId,
      name: parsed.data.name,
      reference: parsed.data.reference,
      description: parsed.data.description,
      proposedScope: parsed.data.proposedScope,
      proposedDurationMonths: parsed.data.proposedDurationMonths,
    });

    // Response includes the raw token only to the initiator — so the
    // UI can copy-paste an invitation link if email delivery fails.
    // In production, email dispatch (Resend) is the primary path; we
    // leave that wiring to a follow-up commit.
    return NextResponse.json(
      {
        matterId: result.matter.id,
        invitationId: result.invitation.id,
        inviteToken: result.rawToken,
        expiresAt: result.invitation.expiresAt,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof MatterServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      );
    }
    throw err;
  }
}
