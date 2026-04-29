/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/network/oversight/[oversightId]/incidents
 *
 * Operator-Side: NIS2-Incident melden. Erzeugt einen WorkflowCase
 * (fsmId=nis2-incident-v1) und disptached EARLY_WARNING_RECEIVED, das
 * den Case sofort in den 72h-Wartezustand bringt. Behörde sieht den
 * Vorfall live in /pharos/workflow.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  createWorkflowCase,
  dispatchEvent,
} from "@/lib/pharos/workflow-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  caseRef: z.string().min(3).max(80),
  severity: z.enum(["minor", "significant", "major", "critical"]),
  detectedAt: z.string().optional(),
  summary: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ oversightId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { oversightId } = await context.params;

  // Authorize: caller must be operator-side member of this oversight.
  const oversight = await prisma.oversightRelationship.findUnique({
    where: { id: oversightId },
    select: {
      id: true,
      operatorOrgId: true,
      authorityProfileId: true,
      status: true,
    },
  });
  if (!oversight) {
    return NextResponse.json({ error: "oversight not found" }, { status: 404 });
  }
  if (oversight.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "oversight is not active" },
      { status: 409 },
    );
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  if (!orgIds.includes(oversight.operatorOrgId)) {
    return NextResponse.json(
      { error: "Caller is not operator-side member of this oversight" },
      { status: 403 },
    );
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

  try {
    // 1. Create the case (initial state = AwaitingEarlyWarning)
    const created = await createWorkflowCase({
      fsmId: "nis2-incident-v1",
      caseRef: parsed.data.caseRef,
      oversightId: oversight.id,
      authorityProfileId: oversight.authorityProfileId,
      operatorOrgId: oversight.operatorOrgId,
      metadata: {
        severity: parsed.data.severity,
        detectedAt: parsed.data.detectedAt ?? new Date().toISOString(),
        summary: parsed.data.summary,
        reportedBy: session.user.id,
      },
    });

    // 2. Auto-dispatch EARLY_WARNING_RECEIVED so the 24h-clock starts
    //    against the 72h-Notification-Frist instead.
    const dispatched = await dispatchEvent({
      caseId: created.caseId,
      event: "EARLY_WARNING_RECEIVED",
      actorUserId: session.user.id,
      payload: { severity: parsed.data.severity },
    });

    return NextResponse.json(
      {
        ok: true,
        caseId: created.caseId,
        currentState: dispatched.newState ?? created.currentState,
      },
      { status: 201 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[operator-incident-report] failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
