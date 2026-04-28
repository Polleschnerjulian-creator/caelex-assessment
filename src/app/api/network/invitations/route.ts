/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
    // the future. The intended acceptor depends on whether this is an
    // original invitation OR an amendment-counter-sign:
    //
    //   ORIGINAL (amendmentOf=null):
    //     invitedFrom=ATLAS  → recipient is clientOrgId (operator)
    //     invitedFrom=CAELEX → recipient is lawFirmOrgId (firm)
    //
    //   AMENDMENT (amendmentOf!=null):
    //     invitedFrom=ATLAS  → recipient is lawFirmOrgId (original inviter)
    //     invitedFrom=CAELEX → recipient is clientOrgId (original inviter)
    //
    // Both variants are surfaced in the inbox so the user sees every
    // pending action they need to take, regardless of who initiated.
    const now = new Date();
    const invitations = await prisma.legalMatterInvitation.findMany({
      where: {
        consumedAt: null,
        expiresAt: { gt: now },
        OR: [
          // Originals → recipient is the COUNTER-party
          {
            amendmentOf: null,
            matter: {
              invitedFrom: "ATLAS",
              clientOrgId: membership.organizationId,
            },
          },
          {
            amendmentOf: null,
            matter: {
              invitedFrom: "CAELEX",
              lawFirmOrgId: membership.organizationId,
            },
          },
          // Amendments → recipient is the ORIGINAL inviter (same side as matter.invitedFrom)
          {
            amendmentOf: { not: null },
            matter: {
              invitedFrom: "ATLAS",
              lawFirmOrgId: membership.organizationId,
            },
          },
          {
            amendmentOf: { not: null },
            matter: {
              invitedFrom: "CAELEX",
              clientOrgId: membership.organizationId,
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

    // For amendment invitations, also fetch the ORIGINAL invitation's
    // proposedScope so the inviter can see what was narrowed. We do
    // this in a second batch query rather than as a Prisma relation
    // because amendmentOf is a plain String (not a foreign-key
    // relation in the schema).
    const amendmentOriginalIds = invitations
      .map((inv) => inv.amendmentOf)
      .filter((id): id is string => id !== null);
    const originals = amendmentOriginalIds.length
      ? await prisma.legalMatterInvitation.findMany({
          where: { id: { in: amendmentOriginalIds } },
          select: {
            id: true,
            proposedScope: true,
            proposedDurationMonths: true,
          },
        })
      : [];
    const originalsById = new Map(originals.map((o) => [o.id, o]));

    return NextResponse.json({
      invitations: invitations.map((inv) => {
        const original = inv.amendmentOf
          ? (originalsById.get(inv.amendmentOf) ?? null)
          : null;
        return {
          id: inv.id,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
          proposedScope: inv.proposedScope,
          proposedDurationMonths: inv.proposedDurationMonths,
          // null for original invitations; populated for counter-amendments
          amendmentOf: inv.amendmentOf,
          // Original scope so the UI can highlight what was narrowed
          originalScope: original?.proposedScope ?? null,
          originalDurationMonths: original?.proposedDurationMonths ?? null,
          matter: {
            id: inv.matter.id,
            name: inv.matter.name,
            reference: inv.matter.reference,
            description: inv.matter.description,
            invitedFrom: inv.matter.invitedFrom,
          },
          lawFirm: inv.matter.lawFirmOrg,
          client: inv.matter.clientOrg,
        };
      }),
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
