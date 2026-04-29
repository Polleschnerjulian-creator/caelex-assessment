/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/pharos/webhooks?oversightId=...
 *
 * Authority-side: list provisioned webhook-endpoints for an oversight.
 * Returns endpoint metadata + recent invocation stats. The rawSecret is
 * NEVER returned (only available once at provisioning).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
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

    const oversightId = request.nextUrl.searchParams.get("oversightId");

    // Authorize: caller must own at least one authority profile.
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    const orgIds = memberships.map((m) => m.organizationId);
    const profiles = await prisma.authorityProfile.findMany({
      where: { organizationId: { in: orgIds } },
      select: { id: true },
    });
    const profileIds = profiles.map((p) => p.id);

    const endpoints = await prisma.pharosWebhookEndpoint.findMany({
      where: {
        authorityProfileId: { in: profileIds },
        ...(oversightId ? { oversightId } : {}),
      },
      include: {
        invocations: {
          orderBy: { receivedAt: "desc" },
          take: 5,
          select: {
            id: true,
            eventType: true,
            status: true,
            receivedAt: true,
            workflowCaseId: true,
          },
        },
        _count: {
          select: { invocations: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Strip the secretHash + secretSalt from the response — never expose
    // the raw secret material via list endpoint.
    return NextResponse.json({
      endpoints: endpoints.map((e) => ({
        id: e.id,
        oversightId: e.oversightId,
        externalOperatorId: e.externalOperatorId,
        externalOperatorName: e.externalOperatorName,
        allowedEvents: e.allowedEvents,
        status: e.status,
        createdBy: e.createdBy,
        createdAt: e.createdAt,
        revokedAt: e.revokedAt,
        invocationCount: e._count.invocations,
        recentInvocations: e.invocations,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-webhooks-list] failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
