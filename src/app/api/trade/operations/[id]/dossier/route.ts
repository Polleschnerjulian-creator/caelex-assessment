/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/trade/operations/[id]/dossier — the one-page "Why this?" court-ready
 * verdict dossier for one Ausfuhrvorgang, as a downloadable PDF.
 *
 * Auth + org-scoping mirror the sibling .../assess route exactly: getTradeAuth
 * gates session + org membership + TRADE entitlement (with super-admin god-mode),
 * the operation is resolved ONLY within the caller's organizationId, and the
 * call is rate-limited. READ-ONLY: it generates a document and writes nothing to
 * the DB except an optional audit-log entry recording that the dossier was
 * generated (who, when, for which operation) — no verdict is created or changed.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  buildVerdictDossier,
  OperationNotFoundError,
} from "@/lib/pdf/trade/verdict-dossier.server";

export const runtime = "nodejs";

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

    // Export of a generated document — use the export tier (20/hr).
    const rl = await checkRateLimit("export", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await context.params;

    // The signer is the requesting human — resolve their identity for the
    // ATTESTATION block. Falls back to "nicht verfügbar" inside the assembler.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    let dossier;
    try {
      dossier = await buildVerdictDossier(id, {
        organizationId,
        requester: { userId, name: user?.name, email: user?.email },
      });
    } catch (e) {
      if (e instanceof OperationNotFoundError) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      throw e;
    }

    // Optional audit-log entry: record that the dossier was generated. This is
    // the ONLY write this read-only route performs; it never alters the verdict.
    const { ipAddress, userAgent } = getRequestContext(req);
    await logAuditEvent({
      userId,
      organizationId,
      action: "trade_dossier_generated",
      entityType: "trade_operation",
      entityId: id,
      description: `Generated verdict dossier for operation ${dossier.operationReference}`,
      metadata: { contentHash: dossier.contentHash },
      ipAddress,
      userAgent,
    });

    // Return the PDF bytes. Buffer is an acceptable Response body in Node runtime.
    return new NextResponse(Buffer.from(dossier.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${dossier.filename}"`,
        "Cache-Control": "no-store",
        "X-Caelex-Dossier-Hash": dossier.contentHash,
      },
    });
  } catch (err) {
    logger.error("GET /api/trade/operations/[id]/dossier failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
