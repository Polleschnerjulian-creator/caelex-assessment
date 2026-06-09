/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/trade/operations/[id]/lines — add a line to an operation
 *
 * Adds one TradeOperationLine linking a TradeItem to the operation
 * with quantity + unit value. After this, the operation may need to
 * transition status (e.g. items unclassified → AWAITING_CLASSIFICATION,
 * all classified + counterparty CLEAR → SCREENING).
 *
 * Status-derivation logic for now lives in the UI; auto-status
 * transitions on line changes will be added in C3b/C3c with the
 * proper risk/lifecycle engine.
 *
 * Org-scope: both operation and item must belong to caller's org.
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
import { screenParty } from "@/lib/comply-v2/trade/screening/screen-party.server";
import { recomputeOperation } from "@/lib/comply-v2/trade/operations/recompute.server";
import { z } from "zod";
import { toCents, fromCents } from "@/lib/trade/money";

const AddLineSchema = z.object({
  itemId: z.string().min(1).max(50),
  quantity: z.number().positive(),
  unitValue: z.number().min(0),
  unitCurrency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/, "Must be ISO 4217 (uppercase 3 letters)")
    .default("EUR"),
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
    const parsed = AddLineSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Verify operation + item are both in caller's org
    const [operation, item] = await Promise.all([
      prisma.tradeOperation.findFirst({
        where: { id: operationId, organizationId },
        select: {
          id: true,
          reference: true,
          status: true,
          counterpartyId: true,
          counterparty: {
            select: { id: true, screeningStatus: true, lastScreenedAt: true },
          },
        },
      }),
      prisma.tradeItem.findFirst({
        where: { id: data.itemId, organizationId },
        select: { id: true, name: true, status: true },
      }),
    ]);

    if (!operation) {
      return NextResponse.json(
        { error: "Operation not found" },
        { status: 404 },
      );
    }
    if (!item) {
      return NextResponse.json(
        { error: "Item not found in your organization" },
        { status: 404 },
      );
    }

    // Block adding lines to terminal operations
    if (
      operation.status === "EXECUTED" ||
      operation.status === "VOLUNTARY_DISCLOSURE_FILED" ||
      operation.status === "BLOCKED"
    ) {
      return NextResponse.json(
        {
          error: `Cannot modify lines on a ${operation.status} operation. Lines are immutable in terminal states for audit integrity.`,
        },
        { status: 409 },
      );
    }

    const line = await prisma.tradeOperationLine.create({
      data: {
        operationId,
        itemId: data.itemId,
        quantity: data.quantity,
        unitValue: toCents(data.unitValue),
        unitCurrency: data.unitCurrency,
      },
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

    logger.info("trade operation line added", {
      operationId,
      operationRef: operation.reference,
      lineId: line.id,
      itemId: data.itemId,
      itemName: item.name,
      quantity: data.quantity,
      unitValue: data.unitValue,
      userId,
    });

    const reqCtx = getRequestContext(req);
    await logAuditEvent({
      userId,
      organizationId,
      action: "trade_operation_line_added",
      entityType: "trade_operation_line",
      entityId: line.id,
      newValue: {
        operationId,
        itemId: data.itemId,
        itemName: item.name,
        quantity: data.quantity,
        unitValue: data.unitValue,
        unitCurrency: data.unitCurrency,
      },
      description: `Line added to operation ${operation.reference}: ${item.name} × ${data.quantity}`,
      ipAddress: reqCtx.ipAddress,
      userAgent: reqCtx.userAgent,
    });
    await emitTradeEvent("trade.operation.line_added", {
      organizationId,
      summary: `${operation.reference} · +${item.name} × ${data.quantity} ${data.unitCurrency}`,
      data: {
        operationId,
        reference: operation.reference,
        lineId: line.id,
        itemName: item.name,
        quantity: data.quantity,
        unitValue: data.unitValue,
        unitCurrency: data.unitCurrency,
        userId,
      },
    });

    // ── Tier 1.1: auto-refresh derived state after a composition change ──
    // Adding a line changes what the operation IS, so its verdict + risk are
    // now stale. Auto-screen the counterparty (only if unscreened/stale, to
    // avoid redundant screens) and recompute risk + catch-all — so the next
    // /assess and the risk panel are fresh WITHOUT the operator clicking
    // "Screen" + "Recompute". Best-effort: a refresh failure must NOT fail the
    // line-add (the line is already persisted + audited above).
    try {
      const cp = operation.counterparty;
      const STALE_MS = 30 * 24 * 60 * 60 * 1000;
      const needsScreen =
        !!cp &&
        (cp.screeningStatus === "NOT_SCREENED" ||
          cp.screeningStatus === "STALE" ||
          !cp.lastScreenedAt ||
          Date.now() - cp.lastScreenedAt.getTime() > STALE_MS);
      if (cp && needsScreen) {
        await screenParty(cp.id);
      }
      await recomputeOperation(operationId, organizationId);
    } catch (e) {
      logger.warn(
        "[lines POST] auto-refresh (screen/recompute) failed — non-fatal",
        { operationId, err: e instanceof Error ? e.message : String(e) },
      );
    }

    const serializedLine = { ...line, unitValue: fromCents(line.unitValue) };
    return NextResponse.json({ line: serializedLine }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/trade/operations/[id]/lines failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
