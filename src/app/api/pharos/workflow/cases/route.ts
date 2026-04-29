/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET  /api/pharos/workflow/cases?fsmId=...
 *      → list open cases scoped to caller's authority/org
 * POST /api/pharos/workflow/cases
 *      → create a new workflow case (e.g. NIS2-Incident)
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
  listOpenCases,
  type FSMId,
} from "@/lib/pharos/workflow-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_FSM_IDS: FSMId[] = [
  "nis2-incident-v1",
  "eu-space-act-authorisation-v1",
];

const CreateBody = z.object({
  fsmId: z.enum(["nis2-incident-v1", "eu-space-act-authorisation-v1"]),
  caseRef: z.string().min(3).max(80),
  oversightId: z.string().optional(),
  authorityProfileId: z.string().optional(),
  operatorOrgId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

async function callerScope(userId: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  const profiles = await prisma.authorityProfile.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true },
  });
  return {
    orgIds,
    authorityProfileIds: profiles.map((p) => p.id),
  };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const scope = await callerScope(session.user.id);

  const fsmIdParam = request.nextUrl.searchParams.get("fsmId");
  if (fsmIdParam && !VALID_FSM_IDS.includes(fsmIdParam as FSMId)) {
    return NextResponse.json({ error: "invalid fsmId" }, { status: 400 });
  }

  const cases = await listOpenCases({
    fsmId: (fsmIdParam as FSMId | null) ?? undefined,
  });
  // Filter by caller's scope.
  const accessible = cases.filter(
    (c) =>
      (c.authorityProfileId &&
        scope.authorityProfileIds.includes(c.authorityProfileId)) ||
      (c.operatorOrgId && scope.orgIds.includes(c.operatorOrgId)),
  );
  return NextResponse.json({ cases: accessible });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const scope = await callerScope(session.user.id);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Authorize: the caller's org must be either the authority OR the operator
  // tied to this new case.
  const { authorityProfileId, operatorOrgId } = parsed.data;
  const okAuth =
    !authorityProfileId ||
    scope.authorityProfileIds.includes(authorityProfileId);
  const okOperator = !operatorOrgId || scope.orgIds.includes(operatorOrgId);
  if (!okAuth || !okOperator) {
    return NextResponse.json(
      { error: "Caller not authorized for the given authority/operator" },
      { status: 403 },
    );
  }

  try {
    const result = await createWorkflowCase(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-workflow] create failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
