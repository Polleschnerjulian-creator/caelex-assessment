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
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getTradeAuth } from "@/lib/trade/trade-auth";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; ownershipId: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id, ownershipId } = await context.params;

    // Verify the edge exists, references the right owned party, and
    // both parties are in caller's org.
    const edge = await prisma.tradePartyOwnership.findFirst({
      where: {
        id: ownershipId,
        ownedId: id,
        owned: { organizationId: tradeAuth.organizationId },
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
        userId: tradeAuth.userId,
      },
      "trade ownership edge deleted",
    );

    return NextResponse.json({ deleted: true });
  } catch (err) {
    logger.error({ err }, "DELETE /api/trade/parties/[id]/owners failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
