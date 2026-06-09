/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET   /api/trade/operations/[id]  — fetch one operation + lines + licenses
 * PATCH /api/trade/operations/[id]  — update mutable fields
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
  TradeEndUseClass,
  TradeOperationStatus,
  TradeOperationType,
} from "@prisma/client";
import { fromCents, fromCentsNullable } from "@/lib/trade/money";
import {
  evaluateShipGate,
  OperationNotFoundError,
} from "@/lib/trade/ship-gate-precondition.server";

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
  /// Conscious, logged human override for the LICENSED → EXECUTED
  /// pre-ship precondition gate (fix G1). When the gate finds
  /// unresolved GAP-level reasons, the named human may proceed ONLY by
  /// re-submitting with this object: a non-empty justification recorded
  /// to the AuditLog. A BLOCKED (hard-block) gate can NEVER be overridden
  /// — the route refuses regardless of this field.
  shipGateOverride: z
    .object({
      justification: z.string().trim().min(10).max(2000),
    })
    .optional(),
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
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, organizationId } = tradeAuth;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await context.params;
    const operation = await prisma.tradeOperation.findFirst({
      where: { id, organizationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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

    // Serialize bigint cents → euros numbers for JSON
    const serializedOperation = {
      ...operation,
      lines: operation.lines.map((l) => ({
        ...l,
        unitValue: fromCents(l.unitValue),
      })),
      licenses: operation.licenses.map((lic) => ({
        ...lic,
        drawnDownValue: fromCents(lic.drawnDownValue),
        totalCapValue: fromCentsNullable(lic.totalCapValue),
      })),
    };
    return NextResponse.json({ operation: serializedOperation });
  } catch (err) {
    logger.error("GET /api/trade/operations/[id] failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────

export async function PATCH(
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

    const { id } = await context.params;

    const existing = await prisma.tradeOperation.findFirst({
      where: { id, organizationId },
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

    // ── Pre-ship precondition gate (fix G1) ──────────────────────────
    // The single most dangerous historical break: LICENSED → EXECUTED
    // proceeded on the enum value ALONE. Before this transition is
    // allowed, RE-RUN the conservative assess engine + per-line licence-
    // coverage + screening + catch-all verification. A non-GO outcome is
    // refused with the SPECIFIC unresolved reasons (machine + human),
    // wrapped in the ExplainedResult envelope. A hard-blocked operation
    // can NOT be overridden to EXECUTED at all; a GAP-level outcome may
    // proceed only with a conscious, logged human override.
    let shipGateOverrideLogged: {
      justification: string;
      reasonCodes: string[];
    } | null = null;
    // The deferred override AuditLog payload — written only AFTER the
    // TOCTOU-guarded updateMany commits (C2). Captured inside the gate
    // block so the full reasons/verdict provenance survives to the write.
    let shipGateOverrideAudit: {
      description: string;
      reasons: unknown;
      verdict: string;
      justification: string;
    } | null = null;
    if (existing.status === "LICENSED" && data.status === "EXECUTED") {
      let gate;
      try {
        gate = await evaluateShipGate(id, { organizationId });
      } catch (e) {
        if (e instanceof OperationNotFoundError) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        throw e;
      }

      if (!gate.value.passed) {
        const override = data.shipGateOverride;
        // Hard block → refuse outright. No override path exists for a
        // BLOCKED verdict / confirmed sanctions hit / ITAR-embargo-AnnexIV
        // hard block. Fail closed.
        if (gate.value.hardBlocked) {
          return NextResponse.json(
            {
              error: "Ship gate blocked — EXECUTED refused.",
              code: "SHIP_GATE_BLOCKED",
              reasons: gate.value.reasons,
              explained: gate,
              overridable: false,
            },
            { status: 409 },
          );
        }
        // GAP-level: allow ONLY a conscious, logged override. Without one,
        // surface the exact reasons so the confirm dialog can show them.
        if (!override) {
          return NextResponse.json(
            {
              error:
                "Ship gate preconditions unresolved — EXECUTED requires a logged override.",
              code: "SHIP_GATE_UNRESOLVED",
              reasons: gate.value.reasons,
              explained: gate,
              overridable: true,
            },
            { status: 409 },
          );
        }
        // A justified override was supplied. Capture the override payload
        // now (while we hold the gate result), but DEFER the AuditLog write
        // until AFTER the TOCTOU-guarded updateMany actually commits the
        // LICENSED → EXECUTED transition (count > 0). Recording an override
        // before the write could otherwise log an override for a transition
        // that then loses the concurrency race and never happens.
        shipGateOverrideLogged = {
          justification: override.justification,
          reasonCodes: gate.value.reasons.map((r) => r.code),
        };
        shipGateOverrideAudit = {
          description: `Trade operation ${existing.reference}: pre-ship gate OVERRIDDEN by ${userId} — ${gate.value.reasons.length} unresolved reason(s): ${gate.value.reasons.map((r) => r.code).join(", ")}`,
          reasons: gate.value.reasons,
          verdict: gate.value.verdict,
          justification: override.justification,
        };
        logger.warn(
          "trade pre-ship gate overridden — EXECUTED proceeding on logged human justification",
          {
            operationId: id,
            reference: existing.reference,
            userId,
            reasonCodes: gate.value.reasons.map((r) => r.code),
          },
        );
      }
      // gate.value.passed === true → proceed normally (no override needed).
    }

    // Build update payload — convert scheduledShipDate string → Date.
    // Strip shipGateOverride: it is a control field for the gate, NOT a
    // persisted operation column.
    const { shipGateOverride: _shipGateOverride, ...persistable } = data;
    const updates: Record<string, unknown> = { ...persistable };
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

    // Atomic guard against a status-transition TOCTOU: re-assert the status
    // we validated against (and the org) in the WHERE, so a concurrent PATCH
    // can't silently clobber a just-committed transition (e.g. a BLOCKED
    // decision flipped back to AWAITING_LICENSE). count 0 ⇒ the row moved
    // under us ⇒ 409 retry. The status guard only applies when this PATCH
    // actually changes status; non-status edits stay org-scoped.
    const guardOnStatus = Boolean(
      data.status && data.status !== existing.status,
    );
    const writeResult = await prisma.tradeOperation.updateMany({
      where: guardOnStatus
        ? { id, organizationId, status: existing.status }
        : { id, organizationId },
      data: updates,
    });
    if (writeResult.count === 0) {
      return NextResponse.json(
        {
          error:
            "Operation was modified concurrently — please reload and retry.",
        },
        { status: 409 },
      );
    }
    const operation = await prisma.tradeOperation.findFirstOrThrow({
      where: { id, organizationId },
    });

    // C2 — the ship-gate override AuditLog is written ONLY now that the
    // guarded updateMany has committed (count > 0). An override is therefore
    // recorded iff the LICENSED → EXECUTED transition actually happened — a
    // concurrent clobber that returned 409 above never reaches here.
    if (shipGateOverrideAudit) {
      const overrideCtx = getRequestContext(req);
      await logAuditEvent({
        userId,
        organizationId,
        action: "trade_operation_ship_gate_override",
        entityType: "trade_operation",
        entityId: id,
        previousValue: { status: existing.status },
        newValue: { status: data.status },
        description: shipGateOverrideAudit.description,
        metadata: {
          shipGateOverride: true,
          justification: shipGateOverrideAudit.justification,
          reasons: shipGateOverrideAudit.reasons,
          verdict: shipGateOverrideAudit.verdict,
        },
        ipAddress: overrideCtx.ipAddress,
        userAgent: overrideCtx.userAgent,
      });
    }

    logger.info("trade operation updated", {
      operationId: id,
      reference: existing.reference,
      userId,
      fields: Object.keys(persistable),
      statusFrom: existing.status,
      statusTo: data.status ?? existing.status,
      shipGateOverridden: Boolean(shipGateOverrideLogged),
    });

    // AuditLog — separate verb for status transitions vs other updates.
    // Status transitions are the legally-significant event (gating
    // movement through the lifecycle); other updates are routine.
    const reqCtx = getRequestContext(req);
    if (data.status && data.status !== existing.status) {
      await logAuditEvent({
        userId,
        organizationId,
        action: "trade_operation_status_changed",
        entityType: "trade_operation",
        entityId: id,
        previousValue: { status: existing.status },
        newValue: { status: data.status },
        description: shipGateOverrideLogged
          ? `Trade operation ${existing.reference}: ${existing.status} → ${data.status} (ship gate OVERRIDDEN by ${userId})`
          : `Trade operation ${existing.reference}: ${existing.status} → ${data.status}`,
        ...(shipGateOverrideLogged
          ? {
              metadata: {
                shipGateOverride: true,
                justification: shipGateOverrideLogged.justification,
                reasonCodes: shipGateOverrideLogged.reasonCodes,
              },
            }
          : {}),
        ipAddress: reqCtx.ipAddress,
        userAgent: reqCtx.userAgent,
      });
      await emitTradeEvent("trade.operation.status_changed", {
        organizationId,
        summary: `${existing.reference} · ${existing.status} → ${data.status}`,
        data: {
          operationId: id,
          reference: existing.reference,
          from: existing.status,
          to: data.status,
          userId,
        },
      });
    } else {
      await logAuditEvent({
        userId,
        organizationId,
        action: "trade_operation_updated",
        entityType: "trade_operation",
        entityId: id,
        newValue: persistable,
        description: `Trade operation ${existing.reference} updated (${Object.keys(persistable).join(", ")})`,
        ipAddress: reqCtx.ipAddress,
        userAgent: reqCtx.userAgent,
      });
    }

    return NextResponse.json({ operation });
  } catch (err) {
    logger.error("PATCH /api/trade/operations/[id] failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
