/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET /api/network/invitations
 *
 * Lists *pending* LegalMatterInvitations for the caller's active
 * organisation — powers the /dashboard/network/inbox page.
 *
 * Without this endpoint the only path to accept an invite was the
 * single-use email token, which failed if the recipient lost the
 * email. Here we lookup by org membership: any invitation whose
 * counterparty is the caller's org is visible, as long as it isn't
 * consumed or expired.
 *
 * Does NOT return the raw token (tokens are already a secret, and a
 * session-based accept path doesn't need one). The inbox POSTs
 * against /api/network/invitations/[id] with action=ACCEPT/REJECT.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "No active organisation" },
        { status: 403 },
      );
    }

    // Pending = invitation row exists, consumedAt is null, expiresAt in
    // the future. Scope to matters where the caller is the INTENDED
    // acceptor — derived from `matter.invitedFrom`:
    //   invitedFrom=ATLAS → caller must be the clientOrgId
    //   invitedFrom=CAELEX → caller must be the lawFirmOrgId
    const now = new Date();
    const invitations = await prisma.legalMatterInvitation.findMany({
      where: {
        consumedAt: null,
        expiresAt: { gt: now },
        OR: [
          {
            matter: {
              invitedFrom: "ATLAS",
              clientOrgId: membership.organizationId,
            },
          },
          {
            matter: {
              invitedFrom: "CAELEX",
              lawFirmOrgId: membership.organizationId,
            },
          },
        ],
      },
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
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        proposedScope: inv.proposedScope,
        proposedDurationMonths: inv.proposedDurationMonths,
        matter: {
          id: inv.matter.id,
          name: inv.matter.name,
          reference: inv.matter.reference,
          description: inv.matter.description,
          invitedFrom: inv.matter.invitedFrom,
        },
        lawFirm: inv.matter.lawFirmOrg,
        client: inv.matter.clientOrg,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Network invitations list failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to load invitations" },
      { status: 500 },
    );
  }
}
