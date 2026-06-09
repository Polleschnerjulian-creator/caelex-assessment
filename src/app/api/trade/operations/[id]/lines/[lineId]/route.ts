/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * DELETE /api/trade/operations/[id]/lines/[lineId] — remove a line
 * PATCH  /api/trade/operations/[id]/lines/[lineId] — update line
 *                                                     (currently:
 *                                                     assign/unassign
 *                                                     applied license)
 *
 * Org-scope verified before delete: line must reference operation in
 * caller's org. Terminal operation states block line removal for
 * audit integrity.
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
import { z } from "zod";
import { fromCents } from "@/lib/trade/money";

const PatchLineSchema = z.object({
  /**
   * Set to a license id to assign the license to this line, or to
   * null to unassign. The license must already be attached to the
   * parent operation (via POST /licenses).
   */
  appliedLicenseId: z.string().min(1).max(50).nullable(),
});

// ─── DELETE ─────────────────────────────────────────────────────────

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; lineId: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, organizationId } = tradeAuth;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { id: operationId, lineId } = await context.params;

    const line = await prisma.tradeOperationLine.findFirst({
      where: {
        id: lineId,
        operationId,
        operation: { organizationId },
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

    logger.info("trade operation line removed", {
      operationId,
      operationRef: line.operation.reference,
      lineId,
      itemId: line.itemId,
      userId,
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    logger.error(
      "DELETE /api/trade/operations/[id]/lines/[lineId] failed",
      err,
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string; lineId: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, organizationId } = tradeAuth;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { id: operationId, lineId } = await context.params;

    const body = await req.json();
    const parsed = PatchLineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { appliedLicenseId } = parsed.data;

    const line = await prisma.tradeOperationLine.findFirst({
      where: {
        id: lineId,
        operationId,
        operation: { organizationId },
      },
      select: {
        id: true,
        operation: {
          select: {
            status: true,
            licenses: { select: { id: true } },
          },
        },
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
          error: `Cannot modify lines on a ${line.operation.status} operation.`,
        },
        { status: 409 },
      );
    }

    // If assigning, the license must be attached to this operation
    if (appliedLicenseId !== null) {
      const isAttached = line.operation.licenses.some(
        (l) => l.id === appliedLicenseId,
      );
      if (!isAttached) {
        return NextResponse.json(
          {
            error:
              "License is not attached to this operation. Attach via POST /licenses first.",
          },
          { status: 409 },
        );
      }
    }

    const updated = await prisma.tradeOperationLine.update({
      where: { id: lineId },
      data: { appliedLicenseId },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            internalSku: true,
            eccnEU: true,
            eccnUS: true,
            usmlCategory: true,
            mtcrCategory: true,
            germanAlEntry: true,
            status: true,
          },
        },
        appliedLicense: {
          select: {
            id: true,
            licenseType: true,
            licenseNumber: true,
            status: true,
          },
        },
      },
    });

    logger.info("trade operation line license assignment updated", {
      operationId,
      lineId,
      appliedLicenseId,
      userId,
    });

    const serializedLine = {
      ...updated,
      unitValue: fromCents(updated.unitValue),
    };
    return NextResponse.json({ line: serializedLine });
  } catch (err) {
    logger.error("PATCH /api/trade/operations/[id]/lines/[lineId] failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
