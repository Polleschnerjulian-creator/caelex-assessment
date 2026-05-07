/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET  /api/trade/licenses  — list org's TradeLicenses
 * POST /api/trade/licenses  — create a new license at org level
 *
 * Licenses live at the organization level (not per-operation) because
 * a single AGG / EUGEA / BIS license typically covers MANY operations
 * with drawdown tracking. The license-to-operation relationship is
 * M:N via the implicit join + drawnDownValue accumulator.
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
import { Prisma, TradeLicenseStatus, TradeLicenseType } from "@prisma/client";

const CreateLicenseSchema = z.object({
  licenseType: z.nativeEnum(TradeLicenseType),
  licenseNumber: z.string().max(100).optional(),
  issuedAt: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  /**
   * Conditions JSON. Free-form — caller supplies. Common shape:
   *   {
   *     coveredCodes: ["9A001.a", "9A515.a"],
   *     coveredCountries: ["US", "JP", "KR"],
   *     endUseRestrictions: ["civilian only"],
   *     valueCap: { amount: 500000, currency: "EUR" }
   *   }
   */
  conditions: z.record(z.string(), z.unknown()).default({}),
  totalCapValue: z.number().min(0).optional(),
  capCurrency: z.string().length(3).default("EUR"),
  status: z.nativeEnum(TradeLicenseStatus).default("ACTIVE"),
  documentId: z.string().max(100).optional(),
});

// ─── GET ────────────────────────────────────────────────────────────

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const licenseType = searchParams.get("type");
    const search = searchParams.get("q") ?? "";

    const where: Prisma.TradeLicenseWhereInput = {
      organizationId: org.organizationId,
    };
    if (status && status in TradeLicenseStatus) {
      where.status = status as TradeLicenseStatus;
    }
    if (licenseType && licenseType in TradeLicenseType) {
      where.licenseType = licenseType as TradeLicenseType;
    }
    if (search) {
      where.licenseNumber = { contains: search, mode: "insensitive" };
    }

    const licenses = await prisma.tradeLicense.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        licenseType: true,
        licenseNumber: true,
        issuedAt: true,
        validUntil: true,
        conditions: true,
        drawnDownValue: true,
        totalCapValue: true,
        capCurrency: true,
        status: true,
        documentId: true,
        createdAt: true,
        _count: { select: { operations: true } },
      },
    });

    return NextResponse.json({ licenses });
  } catch (err) {
    logger.error({ err }, "GET /api/trade/licenses failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── POST ───────────────────────────────────────────────────────────

export async function POST(req: Request) {
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

    const body = await req.json();
    const parsed = CreateLicenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const license = await prisma.tradeLicense.create({
      data: {
        organizationId: org.organizationId,
        licenseType: data.licenseType,
        licenseNumber: data.licenseNumber,
        issuedAt: data.issuedAt ? new Date(data.issuedAt) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        conditions: data.conditions as Prisma.InputJsonValue,
        totalCapValue: data.totalCapValue,
        capCurrency: data.capCurrency.toUpperCase(),
        status: data.status,
        documentId: data.documentId,
      },
    });

    logger.info(
      {
        licenseId: license.id,
        licenseType: data.licenseType,
        licenseNumber: data.licenseNumber,
        userId,
      },
      "trade license created",
    );

    return NextResponse.json({ license }, { status: 201 });
  } catch (err) {
    logger.error({ err }, "POST /api/trade/licenses failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
