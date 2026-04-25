/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET /api/network/oversights
 *
 * Operator-side endpoint: liefert alle Aufsichts-Beziehungen der
 * callenden Operator-Organisation. Genutzt von der "Behördliche
 * Aufsichten"-Card im /dashboard/network. Operator hat das Recht
 * zu sehen, WELCHE Behörden Zugriff haben — Pharos ist transparent
 * by design.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { listOversightsByOperator } from "@/lib/pharos/oversight-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
      return NextResponse.json({ error: "No active org" }, { status: 403 });
    }

    const oversights = await listOversightsByOperator(
      membership.organizationId,
    );

    // Project to a slim DTO — Operators don't need to see internal
    // service-layer fields like acceptanceTokenHash.
    return NextResponse.json({
      oversights: oversights.map((ov) => ({
        id: ov.id,
        oversightTitle: ov.oversightTitle,
        oversightReference: ov.oversightReference,
        legalReference: ov.legalReference,
        status: ov.status,
        initiatedAt: ov.initiatedAt,
        acceptedAt: ov.acceptedAt,
        effectiveFrom: ov.effectiveFrom,
        effectiveUntil: ov.effectiveUntil,
        accessLogCount: ov._count.accessLogs,
        mandatoryDisclosureSize: Array.isArray(ov.mandatoryDisclosure)
          ? (ov.mandatoryDisclosure as unknown[]).length
          : 0,
        voluntaryDisclosureSize: Array.isArray(ov.voluntaryDisclosure)
          ? (ov.voluntaryDisclosure as unknown[]).length
          : 0,
        authority: {
          id: ov.authorityProfile.organization.id,
          name: ov.authorityProfile.organization.name,
          logoUrl: ov.authorityProfile.organization.logoUrl,
          authorityType: ov.authorityProfile.authorityType,
          jurisdiction: ov.authorityProfile.jurisdiction,
        },
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Operator oversights GET failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to load oversights" },
      { status: 500 },
    );
  }
}
