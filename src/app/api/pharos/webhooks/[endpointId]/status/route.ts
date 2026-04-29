/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/pharos/webhooks/[endpointId]/status
 *   { status: "ACTIVE" | "PAUSED" | "REVOKED" }
 *
 * Authority-side: toggle endpoint status. REVOKED is permanent — sets
 * revokedAt + flips status; subsequent invocations get HTTP 423.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "REVOKED"]),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { endpointId } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Authorize: caller's org must own the endpoint's authority-profile.
  const ep = await prisma.pharosWebhookEndpoint.findUnique({
    where: { id: endpointId },
    select: { id: true, authorityProfileId: true, status: true },
  });
  if (!ep) {
    return NextResponse.json({ error: "endpoint not found" }, { status: 404 });
  }
  if (ep.status === "REVOKED") {
    return NextResponse.json(
      { error: "endpoint is permanently revoked" },
      { status: 410 },
    );
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  const owned = await prisma.authorityProfile.findFirst({
    where: { id: ep.authorityProfileId, organizationId: { in: orgIds } },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json(
      { error: "Caller not authorized for this endpoint" },
      { status: 403 },
    );
  }

  try {
    const updated = await prisma.pharosWebhookEndpoint.update({
      where: { id: endpointId },
      data: {
        status: parsed.data.status,
        revokedAt: parsed.data.status === "REVOKED" ? new Date() : null,
      },
      select: { id: true, status: true, revokedAt: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-webhook-status] failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
