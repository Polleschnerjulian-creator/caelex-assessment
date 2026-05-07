/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * DELETE /api/trade/parties/[id]/owners/[ownershipId] — remove an
 * ownership edge.
 *
 * Org-scope verified before delete: edge must reference the owned
 * party in caller's organization.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; ownershipId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const org = await getCurrentOrganization(userId);
    if (!org) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const { id, ownershipId } = await context.params;

    // Verify the edge exists, references the right owned party, and
    // both parties are in caller's org.
    const edge = await prisma.tradePartyOwnership.findFirst({
      where: {
        id: ownershipId,
        ownedId: id,
        owned: { organizationId: org.organizationId },
      },
      select: { id: true, ownerId: true, ownedId: true, percent: true },
    });
    if (!edge) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.tradePartyOwnership.delete({ where: { id: ownershipId } });

    logger.info(
      {
        ownershipId,
        ownedId: id,
        ownerId: edge.ownerId,
        percent: edge.percent,
        userId,
      },
      "trade ownership edge deleted",
    );

    return NextResponse.json({ deleted: true });
  } catch (err) {
    logger.error({ err }, "DELETE /api/trade/parties/[id]/owners failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
