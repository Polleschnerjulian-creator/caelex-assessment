/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/pharos/webhooks/provision
 *
 * Authority-side: provisions a new HMAC-secured webhook for an external
 * operator. Returns the rawSecret ONCE — caller must store it.
 *
 * Auth: caller must be member of the AuthorityProfile that owns the
 * given oversightId.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { provisionWebhook } from "@/lib/pharos/webhook-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  oversightId: z.string(),
  externalOperatorId: z.string().min(2).max(80),
  externalOperatorName: z.string().min(2).max(200),
  allowedEvents: z
    .array(z.string())
    .min(1)
    .max(10)
    .refine(
      (arr) =>
        arr.every((e) =>
          [
            "nis2.early_warning",
            "nis2.notification",
            "nis2.final_report",
          ].includes(e),
        ),
      { message: "Unknown event type" },
    ),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Authorize: caller must own the authority profile of the oversight.
  const oversight = await prisma.oversightRelationship.findUnique({
    where: { id: parsed.data.oversightId },
    select: { id: true, authorityProfileId: true, status: true },
  });
  if (!oversight) {
    return NextResponse.json({ error: "oversight not found" }, { status: 404 });
  }
  if (oversight.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "oversight not active" },
      { status: 409 },
    );
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  const profile = await prisma.authorityProfile.findFirst({
    where: { id: oversight.authorityProfileId, organizationId: { in: orgIds } },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json(
      { error: "Caller not authorized for this authority" },
      { status: 403 },
    );
  }

  try {
    const result = await provisionWebhook({
      oversightId: oversight.id,
      authorityProfileId: oversight.authorityProfileId,
      externalOperatorId: parsed.data.externalOperatorId,
      externalOperatorName: parsed.data.externalOperatorName,
      allowedEvents: parsed.data.allowedEvents,
      createdBy: session.user.id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-webhook-provision] failed: ${msg}`);
    if (msg.includes("Unique") || msg.includes("unique")) {
      return NextResponse.json(
        {
          error:
            "Endpoint for this externalOperatorId already exists in this oversight",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
