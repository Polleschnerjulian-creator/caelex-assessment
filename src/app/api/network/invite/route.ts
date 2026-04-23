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
import { sendEmail } from "@/lib/email";
import { renderLegalMatterInviteEmail } from "@/lib/email/legal-matter-invite";
import { logger } from "@/lib/logger";
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

    // Fire email (best-effort; don't block the response on delivery).
    // We look up the counterparty-org's primary owner email as the
    // recipient — in Phase 2 the invite form can collect a specific
    // address. For now the OWNER is the obvious consent-holder.
    void dispatchInviteEmail({
      matterId: result.matter.id,
      rawToken: result.rawToken,
      initiatorSide,
      initiatorOrgName:
        (
          await prisma.organization.findUnique({
            where: { id: membership.organization.id },
            select: { name: true },
          })
        )?.name ?? "Atlas",
      initiatorUserName:
        session.user.name ?? session.user.email ?? "Ein Atlas-User",
      counterpartyOrgId: parsed.data.counterpartyOrgId,
      matterName: parsed.data.name,
      matterReference: parsed.data.reference,
      proposedScope: parsed.data.proposedScope,
      expiresAt: result.invitation.expiresAt,
    }).catch((err) => {
      logger.error(
        `Legal-Network invite email dispatch failed: ${err.message}`,
      );
    });

    // Response still includes the raw token so the UI can render
    // a copy-able fallback link even if email delivery is down.
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

// ─── Email dispatch (fire-and-forget) ────────────────────────────────
//
// Best-effort delivery — we never want a failing Resend call to tank
// the invite creation. The raw token is still in the API response so
// the UI can show a copy-able link as a fallback.

interface DispatchEmailInput {
  matterId: string;
  rawToken: string;
  initiatorSide: NetworkSide;
  initiatorOrgName: string;
  initiatorUserName: string;
  counterpartyOrgId: string;
  matterName: string;
  matterReference?: string;
  proposedScope: Array<{ category: string; permissions: string[] }>;
  expiresAt: Date;
}

async function dispatchInviteEmail(input: DispatchEmailInput): Promise<void> {
  const recipient = await findRecipient(input.counterpartyOrgId);
  if (!recipient) {
    logger.warn(
      `Legal-Network invite: no OWNER email found for org ${input.counterpartyOrgId}`,
    );
    return;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ??
    "https://www.caelex.eu";
  const acceptUrl = `${baseUrl}/network/accept/${input.rawToken}`;

  const expiresInHours = Math.max(
    1,
    Math.floor((input.expiresAt.getTime() - Date.now()) / (60 * 60 * 1000)),
  );

  // Humanise the scope into a one-line summary for the email.
  const scopeSummary =
    input.proposedScope
      .map((s) => {
        const cat = s.category.toLowerCase().replace(/_/g, " ");
        return `${cat} (${s.permissions.join("/")})`;
      })
      .join(" · ") || "Minimaler Scope";

  const direction: "ATLAS_INVITES_CAELEX" | "CAELEX_INVITES_ATLAS" =
    input.initiatorSide === "ATLAS"
      ? "ATLAS_INVITES_CAELEX"
      : "CAELEX_INVITES_ATLAS";

  const { subject, html, text } = renderLegalMatterInviteEmail({
    inviterOrgName: input.initiatorOrgName,
    inviterName: input.initiatorUserName,
    recipientOrgName: recipient.orgName,
    matterName: input.matterName,
    matterReference: input.matterReference ?? null,
    scopeSummary,
    acceptUrl,
    expiresInHours,
    direction,
  });

  await sendEmail({
    to: recipient.email,
    subject,
    html,
    text,
  });
}

async function findRecipient(
  orgId: string,
): Promise<{ email: string; orgName: string } | null> {
  // Primary: the organisation's OWNER — the person with ultimate
  // consent authority. Falls back to any ADMIN.
  const owner = await prisma.organizationMember.findFirst({
    where: { organizationId: orgId, role: "OWNER" },
    include: {
      user: { select: { email: true } },
      organization: { select: { name: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  if (owner?.user.email) {
    return { email: owner.user.email, orgName: owner.organization.name };
  }
  const admin = await prisma.organizationMember.findFirst({
    where: { organizationId: orgId, role: "ADMIN" },
    include: {
      user: { select: { email: true } },
      organization: { select: { name: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  if (admin?.user.email) {
    return { email: admin.user.email, orgName: admin.organization.name };
  }
  return null;
}
