/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET /api/network/matters
 *
 * Returns all LegalMatters where the caller's org is either the law
 * firm side or the client side. Each row is shaped for both Atlas
 * (matter-list) and Caelex (legal-counsel-list) UIs.
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
      select: {
        organizationId: true,
        organization: { select: { orgType: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "No active organisation" },
        { status: 403 },
      );
    }

    const matters = await prisma.legalMatter.findMany({
      where: {
        OR: [
          { lawFirmOrgId: membership.organizationId },
          { clientOrgId: membership.organizationId },
        ],
      },
      include: {
        lawFirmOrg: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        clientOrg: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        _count: { select: { accessLogs: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({
      callerSide:
        membership.organization.orgType === "LAW_FIRM" ? "ATLAS" : "CAELEX",
      matters: matters.map((m) => ({
        id: m.id,
        name: m.name,
        reference: m.reference,
        status: m.status,
        scope: m.scope,
        effectiveFrom: m.effectiveFrom,
        effectiveUntil: m.effectiveUntil,
        invitedFrom: m.invitedFrom,
        invitedAt: m.invitedAt,
        acceptedAt: m.acceptedAt,
        lawFirm: m.lawFirmOrg,
        client: m.clientOrg,
        accessCount: m._count.accessLogs,
        updatedAt: m.updatedAt,
      })),
    });
  } catch (err) {
    // Surface the actual cause to Vercel logs — the generic "Failed
    // to load matters" public message hides what's wrong, which made
    // the diagnostic loop on the AB-2 left panel painful. Stack +
    // name help us spot prisma exceptions vs auth-shape mismatches.
    const errName = err instanceof Error ? err.name : typeof err;
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    logger.error(
      `Network matters list failed [${errName}]: ${errMsg}${
        errStack ? `\n${errStack}` : ""
      }`,
    );
    return NextResponse.json(
      { error: "Failed to load matters", code: errName, detail: errMsg },
      { status: 500 },
    );
  }
}
