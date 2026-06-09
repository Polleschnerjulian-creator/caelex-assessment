/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET  /api/trade/operations  — list TradeOperations for the caller's org
 * POST /api/trade/operations  — create a new TradeOperation (DRAFT)
 *
 * Auth: session required, org-scoped via getCurrentOrganization.
 * Rate: "api" tier (100 req/min).
 *
 * Operations are created in DRAFT status. Status transitions to other
 * states (AWAITING_CLASSIFICATION, SCREENING, etc.) happen in
 * subsequent endpoints / engines (Sprint C3).
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
import {
  Prisma,
  TradeOperationStatus,
  TradeOperationType,
  TradeEndUseClass,
} from "@prisma/client";

// ─── Validation ─────────────────────────────────────────────────────

const CreateTradeOperationSchema = z.object({
  reference: z
    .string()
    .min(1, "Reference is required")
    .max(100)
    .regex(
      /^[A-Z0-9._-]+$/i,
      "Reference may only contain alphanumerics, dots, dashes, underscores",
    ),
  description: z.string().max(2000).default(""),
  operationType: z.nativeEnum(TradeOperationType),
  counterpartyId: z.string().min(1).max(50),
  shipFromCountry: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/, "Must be ISO 3166-1 alpha-2 (uppercase)"),
  shipToCountry: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/),
  endUseCountry: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional(),
  routeStops: z.array(z.string().length(2)).max(20).optional(),
  declaredEndUse: z.nativeEnum(TradeEndUseClass).default("CIVIL"),
  endUserName: z.string().max(300).optional(),
  endUserSector: z.string().max(200).optional(),
  scheduledShipDate: z.string().datetime().optional(),
});

// ─── GET ────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, organizationId } = tradeAuth;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") ?? "";
    const status = searchParams.get("status");
    const counterpartyId = searchParams.get("counterpartyId");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));

    const where: Prisma.TradeOperationWhereInput = {
      organizationId,
    };
    if (status && status in TradeOperationStatus) {
      where.status = status as TradeOperationStatus;
    }
    if (counterpartyId) {
      where.counterpartyId = counterpartyId;
    }
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [operations, total] = await Promise.all([
      prisma.tradeOperation.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          reference: true,
          description: true,
          operationType: true,
          status: true,
          shipFromCountry: true,
          shipToCountry: true,
          endUseCountry: true,
          declaredEndUse: true,
          riskScore: true,
          catchAllArt4Hit: true,
          catchAllArt5Hit: true,
          catchAllArt9Hit: true,
          catchAllArt10Hit: true,
          notificationDuty: true,
          scheduledShipDate: true,
          createdAt: true,
          updatedAt: true,
          counterparty: {
            select: {
              id: true,
              legalName: true,
              countryCode: true,
              screeningStatus: true,
              status: true,
              isHighRiskCountry: true,
            },
          },
          _count: { select: { lines: true, licenses: true } },
        },
      }),
      prisma.tradeOperation.count({ where }),
    ]);

    return NextResponse.json({
      operations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error("GET /api/trade/operations failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── POST ───────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, organizationId } = tradeAuth;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await req.json();
    const parsed = CreateTradeOperationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Verify counterparty exists in same org
    const counterparty = await prisma.tradeParty.findFirst({
      where: { id: data.counterpartyId, organizationId },
      select: { id: true, status: true, screeningStatus: true },
    });
    if (!counterparty) {
      return NextResponse.json(
        { error: "Counterparty not found in your organization" },
        { status: 404 },
      );
    }
    if (counterparty.status === "BLOCKED") {
      return NextResponse.json(
        {
          error:
            "Counterparty is BLOCKED. Resolve via triage before creating an operation.",
        },
        { status: 409 },
      );
    }

    try {
      const operation = await prisma.tradeOperation.create({
        data: {
          organizationId,
          createdById: userId,
          reference: data.reference,
          description: data.description,
          operationType: data.operationType,
          counterpartyId: data.counterpartyId,
          shipFromCountry: data.shipFromCountry,
          shipToCountry: data.shipToCountry,
          endUseCountry: data.endUseCountry,
          routeStops: data.routeStops ?? [],
          declaredEndUse: data.declaredEndUse,
          endUserName: data.endUserName,
          endUserSector: data.endUserSector,
          scheduledShipDate: data.scheduledShipDate
            ? new Date(data.scheduledShipDate)
            : null,
          // Initial state: DRAFT. State machine moves it forward as
          // items + licenses get attached (Sprint C3).
        },
      });

      logger.info("trade operation created", {
        operationId: operation.id,
        reference: operation.reference,
        counterpartyId: operation.counterpartyId,
        orgId: organizationId,
        userId,
      });

      // AuditLog: hash-chained 5+yr-retention trail per §22 AWV / 15 CFR 762
      const reqCtx = getRequestContext(req);
      await logAuditEvent({
        userId,
        organizationId,
        action: "trade_operation_created",
        entityType: "trade_operation",
        entityId: operation.id,
        newValue: {
          reference: operation.reference,
          operationType: operation.operationType,
          counterpartyId: operation.counterpartyId,
          shipFromCountry: operation.shipFromCountry,
          shipToCountry: operation.shipToCountry,
          declaredEndUse: operation.declaredEndUse,
        },
        description: `Trade operation ${operation.reference} created (${operation.operationType})`,
        ipAddress: reqCtx.ipAddress,
        userAgent: reqCtx.userAgent,
      });

      // Live feed: Ops Console SSE stream
      await emitTradeEvent("trade.operation.created", {
        organizationId,
        summary: `${operation.reference} · ${operation.operationType.replace(/_/g, " ")} · ${operation.shipFromCountry}→${operation.shipToCountry}`,
        data: {
          operationId: operation.id,
          reference: operation.reference,
          operationType: operation.operationType,
          counterpartyId: operation.counterpartyId,
          shipFromCountry: operation.shipFromCountry,
          shipToCountry: operation.shipToCountry,
          userId,
        },
      });

      return NextResponse.json({ operation }, { status: 201 });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "P2002") {
        return NextResponse.json(
          {
            error: `Reference '${data.reference}' already exists in this organization. Choose a unique reference.`,
          },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (err) {
    logger.error("POST /api/trade/operations failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
