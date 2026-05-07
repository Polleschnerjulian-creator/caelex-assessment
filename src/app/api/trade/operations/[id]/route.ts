/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET   /api/trade/operations/[id]  — fetch one operation + lines + licenses
 * PATCH /api/trade/operations/[id]  — update mutable fields
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
import {
  TradeEndUseClass,
  TradeOperationStatus,
  TradeOperationType,
} from "@prisma/client";

const UpdateTradeOperationSchema = z.object({
  description: z.string().max(2000).optional(),
  operationType: z.nativeEnum(TradeOperationType).optional(),
  shipFromCountry: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional(),
  shipToCountry: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional(),
  endUseCountry: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .nullable()
    .optional(),
  routeStops: z.array(z.string().length(2)).max(20).optional(),
  declaredEndUse: z.nativeEnum(TradeEndUseClass).optional(),
  endUserName: z.string().max(300).nullable().optional(),
  endUserSector: z.string().max(200).nullable().optional(),
  scheduledShipDate: z.string().datetime().nullable().optional(),
  /// Status transitions are restricted — see the validation logic
  /// below. Only forward moves through the canonical lifecycle are
  /// allowed via this endpoint; BLOCKED requires a separate gated
  /// endpoint with mandatory blockReason notes (future sprint).
  status: z.nativeEnum(TradeOperationStatus).optional(),
});

/**
 * Allowed status transitions per the lifecycle state machine. Empty
 * array = terminal state, no further transitions via PATCH.
 */
const ALLOWED_TRANSITIONS: Record<
  TradeOperationStatus,
  TradeOperationStatus[]
> = {
  DRAFT: ["AWAITING_CLASSIFICATION", "BLOCKED"],
  AWAITING_CLASSIFICATION: ["SCREENING", "DRAFT", "BLOCKED"],
  SCREENING: ["AWAITING_LICENSE", "AWAITING_CLASSIFICATION", "BLOCKED"],
  AWAITING_LICENSE: ["LICENSED", "SCREENING", "BLOCKED"],
  LICENSED: ["EXECUTED", "AWAITING_LICENSE", "BLOCKED"],
  EXECUTED: ["BLOCKED"], // post-shipment block possible (recall)
  BLOCKED: ["VOLUNTARY_DISCLOSURE_FILED"],
  VOLUNTARY_DISCLOSURE_FILED: [],
};

// ─── GET ────────────────────────────────────────────────────────────

export async function GET(
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

    const { id } = await context.params;
    const operation = await prisma.tradeOperation.findFirst({
      where: { id, organizationId: org.organizationId },
      include: {
        counterparty: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            countryCode: true,
            screeningStatus: true,
            status: true,
            isHighRiskCountry: true,
            lastScreenedAt: true,
          },
        },
        intermediates: {
          select: {
            id: true,
            legalName: true,
            countryCode: true,
            screeningStatus: true,
          },
        },
        lines: {
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
        },
        licenses: {
          select: {
            id: true,
            licenseType: true,
            licenseNumber: true,
            issuedAt: true,
            validUntil: true,
            status: true,
            drawnDownValue: true,
            totalCapValue: true,
            capCurrency: true,
          },
        },
      },
    });

    if (!operation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ operation });
  } catch (err) {
    logger.error({ err }, "GET /api/trade/operations/[id] failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────

export async function PATCH(
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

    const { id } = await context.params;

    const existing = await prisma.tradeOperation.findFirst({
      where: { id, organizationId: org.organizationId },
      select: { id: true, status: true, reference: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = UpdateTradeOperationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Validate status transition if status is being changed
    if (data.status && data.status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status];
      if (!allowed.includes(data.status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${existing.status} to ${data.status}. Allowed next states: ${allowed.length > 0 ? allowed.join(", ") : "(none — terminal state)"}`,
          },
          { status: 409 },
        );
      }
    }

    // Build update payload — convert scheduledShipDate string → Date
    const updates: Record<string, unknown> = { ...data };
    if (data.scheduledShipDate !== undefined) {
      updates.scheduledShipDate = data.scheduledShipDate
        ? new Date(data.scheduledShipDate)
        : null;
    }
    // closedAt: set when transitioning to a terminal state via PATCH
    if (
      data.status === "EXECUTED" ||
      data.status === "VOLUNTARY_DISCLOSURE_FILED"
    ) {
      updates.closedAt = new Date();
    }

    const operation = await prisma.tradeOperation.update({
      where: { id },
      data: updates,
    });

    logger.info(
      {
        operationId: id,
        reference: existing.reference,
        userId,
        fields: Object.keys(data),
        statusFrom: existing.status,
        statusTo: data.status ?? existing.status,
      },
      "trade operation updated",
    );

    return NextResponse.json({ operation });
  } catch (err) {
    logger.error({ err }, "PATCH /api/trade/operations/[id] failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
