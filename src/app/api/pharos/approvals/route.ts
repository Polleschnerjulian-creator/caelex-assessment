/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET  /api/pharos/approvals   — Liste offener Approval-Requests der Behörde
 * POST /api/pharos/approvals   — Neuen Approval-Request anlegen
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  createApprovalRequest,
  listOpenApprovals,
} from "@/lib/pharos/approval-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateBody = z.object({
  kind: z.enum([
    "OVERSIGHT_INITIATION",
    "OVERSIGHT_REVOCATION",
    "MDF_AMENDMENT",
    "CROSS_BORDER_SHARING",
    "SANCTION_ORDER",
    "AUTHORIZATION_DECISION",
    "GENERIC",
  ]),
  authorityProfileId: z.string(),
  oversightId: z.string().optional(),
  payload: z.record(z.unknown()),
  ttlHours: z.number().min(1).max(720).optional(),
});

async function callerAuthorityProfileIds(userId: string): Promise<string[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  const profiles = await prisma.authorityProfile.findMany({
    where: { organizationId: { in: orgIds } },
    select: { id: true },
  });
  return profiles.map((p) => p.id);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profileIds = await callerAuthorityProfileIds(session.user.id);
  if (profileIds.length === 0) {
    return NextResponse.json({ requests: [] });
  }

  // Caller can request a specific authority profile (default: union of caller's).
  const profileQ = request.nextUrl.searchParams.get("authorityProfileId");
  if (profileQ && !profileIds.includes(profileQ)) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }
  const targetProfile = profileQ ?? profileIds[0];
  const requests = await listOpenApprovals(targetProfile);
  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const profileIds = await callerAuthorityProfileIds(session.user.id);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = CreateBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (!profileIds.includes(parsed.data.authorityProfileId)) {
    return NextResponse.json(
      { error: "Caller not in this authority profile" },
      { status: 403 },
    );
  }

  try {
    const result = await createApprovalRequest({
      ...parsed.data,
      initiatedBy: session.user.id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-approvals] create failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
