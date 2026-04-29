/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/pharos/workflow/cases/[caseId]/dispatch
 *
 * Fire a state-machine event on a workflow case. The transition is
 * Ed25519-signed by the caller's derived keypair and chained into
 * WorkflowTransition.previousHash. Every dispatch is auditable.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { dispatchEvent } from "@/lib/pharos/workflow-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  event: z.string().min(2).max(64),
  payload: z.record(z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caseId } = await context.params;

  // Auth-scope: caller must belong to the authority OR operator side.
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

  const caseRow = await prisma.workflowCase.findUnique({
    where: { id: caseId },
    select: {
      authorityProfileId: true,
      operatorOrgId: true,
    },
  });
  if (!caseRow) {
    return NextResponse.json({ error: "case not found" }, { status: 404 });
  }
  const authorized =
    (caseRow.authorityProfileId &&
      profileIds.includes(caseRow.authorityProfileId)) ||
    (caseRow.operatorOrgId && orgIds.includes(caseRow.operatorOrgId));
  if (!authorized) {
    return NextResponse.json(
      { error: "not authorized for this case" },
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
    const result = await dispatchEvent({
      caseId,
      event: parsed.data.event,
      actorUserId: session.user.id,
      payload: parsed.data.payload,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason ?? "dispatch failed" },
        { status: 409 },
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-workflow-dispatch] failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
