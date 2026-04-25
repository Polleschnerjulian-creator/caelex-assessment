/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/network/matter/:id/status
 *
 * Toggle between ACTIVE and SUSPENDED. Operator-side only (the
 * client chooses whether to pause their firm's access, not the firm).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  setMatterStatus,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";
import { logger } from "@/lib/logger";
import type { NetworkSide } from "@prisma/client";

export const runtime = "nodejs";

const Body = z.object({
  nextStatus: z.enum(["ACTIVE", "SUSPENDED"]),
});

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

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: {
      organizationId: true,
      organization: { select: { orgType: true } },
    },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) {
    return NextResponse.json({ error: "No active org" }, { status: 403 });
  }

  const actorSide: NetworkSide =
    membership.organization.orgType === "LAW_FIRM" ? "ATLAS" : "CAELEX";

  try {
    const matter = await setMatterStatus({
      matterId: id,
      nextStatus: parsed.data.nextStatus,
      actorUserId: session.user.id,
      actorOrgId: membership.organizationId,
      actorSide,
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
    logger.error(`Matter status change failed: ${msg}`);
    return NextResponse.json(
      { error: "Status change failed" },
      { status: 500 },
    );
  }
}
