/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/trade/operations/[id]/licenses — attach a license to operation
 *
 * Connects an existing TradeLicense to a TradeOperation. The license
 * stays at org level; this just creates the M:N edge in the implicit
 * join table. After attach, the operator can assign individual lines
 * to this license via PATCH /lines/[lineId].
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
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { emitTradeEvent } from "@/lib/comply-v2/trade/ops-events.server";
import { z } from "zod";

const AttachLicenseSchema = z.object({
  licenseId: z.string().min(1).max(50),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, organizationId } = tradeAuth;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { id: operationId } = await context.params;

    const body = await req.json();
    const parsed = AttachLicenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { licenseId } = parsed.data;

    // Verify both records are in caller's org
    const [operation, license] = await Promise.all([
      prisma.tradeOperation.findFirst({
        where: { id: operationId, organizationId },
        select: { id: true, status: true, reference: true },
      }),
      prisma.tradeLicense.findFirst({
        where: { id: licenseId, organizationId },
        select: { id: true, licenseType: true, status: true },
      }),
    ]);

    if (!operation) {
      return NextResponse.json(
        { error: "Operation not found" },
        { status: 404 },
      );
    }
    if (!license) {
      return NextResponse.json(
        { error: "License not found in your organization" },
        { status: 404 },
      );
    }

    if (license.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: `Cannot attach a ${license.status} license. Only ACTIVE licenses may cover operations.`,
        },
        { status: 409 },
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

    // Connect via implicit M:N join. Idempotent — Prisma's connect
    // is no-op if the edge already exists.
    await prisma.tradeOperation.update({
      where: { id: operationId },
      data: { licenses: { connect: { id: licenseId } } },
    });

    logger.info(
      {
        operationId,
        operationRef: operation.reference,
        licenseId,
        licenseType: license.licenseType,
        userId,
      },
      "trade license attached to operation",
    );

    const reqCtx = getRequestContext(req);
    await logAuditEvent({
      userId,
      organizationId,
      action: "trade_license_attached",
      entityType: "trade_license",
      entityId: licenseId,
      newValue: { operationId, licenseType: license.licenseType },
      description: `License ${license.licenseType} attached to operation ${operation.reference}`,
      ipAddress: reqCtx.ipAddress,
      userAgent: reqCtx.userAgent,
    });
    await emitTradeEvent("trade.license.attached", {
      organizationId,
      summary: `${operation.reference} · +license ${license.licenseType.replace(/_/g, " ")}`,
      data: {
        operationId,
        reference: operation.reference,
        licenseId,
        licenseType: license.licenseType,
        userId,
      },
    });

    return NextResponse.json({ attached: true });
  } catch (err) {
    logger.error({ err }, "POST /api/trade/operations/[id]/licenses failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
