/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * DELETE /api/trade/operations/[id]/lines/[lineId] — remove a line
 *
 * Org-scope verified before delete: line must reference operation in
 * caller's org. Terminal operation states block line removal for
 * audit integrity (use VOLUNTARY_DISCLOSURE_FILED transition instead
 * if you need to invalidate a shipped operation).
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
  context: { params: Promise<{ id: string; lineId: string }> },
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

    const { id: operationId, lineId } = await context.params;

    const line = await prisma.tradeOperationLine.findFirst({
      where: {
        id: lineId,
        operationId,
        operation: { organizationId: org.organizationId },
      },
      select: {
        id: true,
        itemId: true,
        operation: { select: { status: true, reference: true } },
      },
    });

    if (!line) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (
      line.operation.status === "EXECUTED" ||
      line.operation.status === "VOLUNTARY_DISCLOSURE_FILED" ||
      line.operation.status === "BLOCKED"
    ) {
      return NextResponse.json(
        {
          error: `Cannot remove lines from a ${line.operation.status} operation. Audit-integrity protection.`,
        },
        { status: 409 },
      );
    }

    await prisma.tradeOperationLine.delete({ where: { id: lineId } });

    logger.info(
      {
        operationId,
        operationRef: line.operation.reference,
        lineId,
        itemId: line.itemId,
        userId,
      },
      "trade operation line removed",
    );

    return NextResponse.json({ deleted: true });
  } catch (err) {
    logger.error(
      { err },
      "DELETE /api/trade/operations/[id]/lines/[lineId] failed",
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
