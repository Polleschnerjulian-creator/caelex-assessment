/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * DELETE /api/trade/operations/[id]/licenses/[licenseId] — detach a license
 *
 * Removes the M:N edge between the operation and the license. The
 * license itself stays at org level (just no longer covers this op).
 * Also unassigns any lines that were referencing this license — those
 * lines lose their appliedLicenseId and revert to "unassigned".
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; licenseId: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, organizationId } = tradeAuth;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { id: operationId, licenseId } = await context.params;

    const operation = await prisma.tradeOperation.findFirst({
      where: { id: operationId, organizationId },
      select: { id: true, status: true, reference: true },
    });
    if (!operation) {
      return NextResponse.json(
        { error: "Operation not found" },
        { status: 404 },
      );
    }

    if (
      operation.status === "EXECUTED" ||
      operation.status === "VOLUNTARY_DISCLOSURE_FILED" ||
      operation.status === "BLOCKED"
    ) {
      return NextResponse.json(
        {
          error: `Cannot modify license stack on a ${operation.status} operation.`,
        },
        { status: 409 },
      );
    }

    // Atomically: unassign lines referencing this license + detach license
    await prisma.$transaction([
      prisma.tradeOperationLine.updateMany({
        where: { operationId, appliedLicenseId: licenseId },
        data: { appliedLicenseId: null },
      }),
      prisma.tradeOperation.update({
        where: { id: operationId },
        data: { licenses: { disconnect: { id: licenseId } } },
      }),
    ]);

    logger.info("trade license detached from operation", {
      operationId,
      operationRef: operation.reference,
      licenseId,
      userId,
    });

    return NextResponse.json({ detached: true });
  } catch (err) {
    logger.error(
      "DELETE /api/trade/operations/[id]/licenses/[licenseId] failed",
      err,
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
