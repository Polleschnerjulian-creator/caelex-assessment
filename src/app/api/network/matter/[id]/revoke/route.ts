/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/network/matter/:id/revoke
 *
 * Revocation is instant and logged. Either party may revoke.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  revokeMatter,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";
import { logger } from "@/lib/logger";
import type { NetworkSide } from "@prisma/client";

export const runtime = "nodejs";

const Body = z.object({ reason: z.string().min(3).max(500) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Schema-drift resilience: don't read orgType from the membership
  // join (column may not exist in prod yet). Derive actorSide from
  // matter membership instead — if the caller's org IS the lawFirm
  // side of THIS matter, they're acting as ATLAS; otherwise CAELEX.
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) {
    return NextResponse.json({ error: "No active org" }, { status: 403 });
  }

  const matterSides = await prisma.legalMatter.findUnique({
    where: { id },
    select: { lawFirmOrgId: true, clientOrgId: true },
  });
  if (!matterSides) {
    return NextResponse.json({ error: "Matter not found" }, { status: 404 });
  }
  const actorSide: NetworkSide =
    matterSides.lawFirmOrgId === membership.organizationId ? "ATLAS" : "CAELEX";
  // Sanity: caller must be a party to the matter.
  if (
    matterSides.lawFirmOrgId !== membership.organizationId &&
    matterSides.clientOrgId !== membership.organizationId
  ) {
    return NextResponse.json({ error: "Not a party" }, { status: 403 });
  }

  try {
    const matter = await revokeMatter({
      matterId: id,
      actorUserId: session.user.id,
      actorOrgId: membership.organizationId,
      actorSide,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ matterId: matter.id, status: matter.status });
  } catch (err) {
    if (err instanceof MatterServiceError) {
      const code =
        err.code === "NOT_AUTHORIZED"
          ? 403
          : err.code === "MATTER_WRONG_STATE"
            ? 409
            : 400;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: code },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Matter revoke failed: ${msg}`);
    return NextResponse.json({ error: "Revocation failed" }, { status: 500 });
  }
}
