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
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { z } from "zod";

const AttachLicenseSchema = z.object({
  licenseId: z.string().min(1).max(50),
});

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
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
        where: { id: operationId, organizationId: org.organizationId },
        select: { id: true, status: true, reference: true },
      }),
      prisma.tradeLicense.findFirst({
        where: { id: licenseId, organizationId: org.organizationId },
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

    return NextResponse.json({ attached: true });
  } catch (err) {
    logger.error({ err }, "POST /api/trade/operations/[id]/licenses failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
