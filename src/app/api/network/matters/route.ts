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
import { $Enums } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // NOTE: deliberately do NOT include `organization.orgType` in the
    // membership select — that column was added to schema.prisma but
    // hasn't reliably propagated through `prisma db push` in the
    // Vercel build pipeline (the `|| echo` swallow in build:deploy
    // hides such failures). Reading orgType here was bringing the
    // entire endpoint down with PrismaClientKnownRequestError. We
    // compute callerSide from the matter data itself below — that
    // works regardless of whether the column exists in the DB.
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

    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status");
    const statusFilter = statusParam
      ? statusParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

    const validStatuses = Object.values($Enums.MatterStatus);

    if (statusFilter) {
      const invalid = statusFilter.filter(
        (s) => !validStatuses.includes(s as $Enums.MatterStatus),
      );
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: "Invalid status values", invalid },
          { status: 400 },
        );
      }
    }

    const safeStatusFilter = statusFilter as $Enums.MatterStatus[] | null;

    const matters = await prisma.legalMatter.findMany({
      where: {
        OR: [
          { lawFirmOrgId: membership.organizationId },
          { clientOrgId: membership.organizationId },
        ],
        ...(safeStatusFilter && safeStatusFilter.length > 0
          ? { status: { in: safeStatusFilter } }
          : {}),
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

    // Heuristic callerSide: if the user's org appears as lawFirmOrgId
    // in at least half their matters, treat them as ATLAS. Empty
    // matter list defaults to ATLAS — the panel only renders for
    // Atlas-side mode anyway, and the side doesn't influence empty-
    // state UI. An org with type=BOTH and a mix of matters falls to
    // whichever side is dominant — pragmatic for display purposes.
    const lawFirmCount = matters.filter(
      (m) => m.lawFirmOrgId === membership.organizationId,
    ).length;
    const callerSide =
      matters.length === 0 || lawFirmCount * 2 >= matters.length
        ? "ATLAS"
        : "CAELEX";

    return NextResponse.json({
      callerSide,
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
