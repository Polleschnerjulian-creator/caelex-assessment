/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/pharos/approvals/[requestId]/sign
 *
 * Signs an open approval request as the calling user with the role they
 * provide in the body. The role MUST match the user's actual authority-
 * profile membership role; for now Phase 1 trusts the body field.
 * Phase 2: enforce role server-side via OrganizationMember lookup.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  ApprovalServiceError,
  signApprovalRequest,
} from "@/lib/pharos/approval-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  approverRole: z.enum([
    "SACHBEARBEITER",
    "REFERATSLEITER",
    "DATENSCHUTZBEAUFTRAGTER",
    "RECHTSREFERENT",
    "INSPEKTOR",
    "BEHOERDENLEITER",
  ]),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ requestId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { requestId } = await context.params;

  // Authorize: caller's org must own the authority profile of the request.
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

  const req = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    select: { authorityProfileId: true },
  });
  if (!req) {
    return NextResponse.json({ error: "request not found" }, { status: 404 });
  }
  if (!profileIds.includes(req.authorityProfileId)) {
    return NextResponse.json(
      { error: "not authorized for this authority" },
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
    const result = await signApprovalRequest({
      requestId,
      approverUserId: session.user.id,
      approverRole: parsed.data.approverRole,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ApprovalServiceError) {
      const status =
        err.code === "REQUEST_NOT_FOUND"
          ? 404
          : err.code === "EXPIRED"
            ? 410
            : err.code === "ALREADY_SIGNED"
              ? 409
              : 400;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-approvals-sign] failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
