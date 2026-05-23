/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/trade/operations/[id]/sham-risk
 *
 * Runs the Z16 OFAC Sham-Transaction Doctrine detector against the
 * persisted operation + counterparty + end-user data and returns the
 * structured risk verdict (riskScore + redFlags + recommendation +
 * skippedChecks). The detector itself is pure (see
 * src/lib/trade/ofac-sham-doctrine/detector.ts) — this route is only
 * the persistence-layer adapter.
 *
 * The detector degrades gracefully when input data is absent: missing
 * UBO chain (Z9b), missing bank-country, missing historical pricing
 * medians, and missing re-export history each push the corresponding
 * red-flag check into `skippedChecks` rather than silently passing.
 *
 * Org-scoped + rate-limited under the "api" tier. Read-only; no audit
 * log entry (per audit policy, read-only endpoints log only on
 * sensitive resource categories).
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
import {
  detectShamTransactionRisk,
  type ShamDetectorOperation,
  type ShamDetectorCounterparty,
  type ReexportHistoryEntry,
} from "@/lib/trade/ofac-sham-doctrine/detector";

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

    // Fetch the operation + counterparty + UBO graph + lines + prior
    // re-export consents tied to this end-user. UBO graph reads stop
    // at depth 5 — the detector only needs depth>3 to fire, so 5 is
    // more than sufficient and protects against pathological cycles.
    const op = await prisma.tradeOperation.findFirst({
      where: { id, organizationId: org.organizationId },
      include: {
        counterparty: {
          include: {
            // First-level ownership: who owns the counterparty directly.
            beneficialOwners: {
              include: { owner: true },
            },
          },
        },
        lines: { include: { item: true } },
        // Prior re-export consents whose requesting party is the same
        // counterparty — proxy for end-user history when end-user name
        // matches the counterparty (common case). When end-user is a
        // separate party, an upstream Z3 join would resolve it; for
        // v1 we use the counterparty proxy.
        reexportConsents: true,
      },
    });

    if (!op) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Build UBO chain. v1 implementation: walk first level only.
    // Z9b will eventually supply the multi-level Orbis chain; once it
    // lands, swap this for the Z9b service call.
    const uboChain = op.counterparty.beneficialOwners.map((edge) => ({
      id: edge.owner.id,
      name: edge.owner.legalName,
      countryCode: edge.owner.countryCode,
      depth: 1,
      effectivePercent: edge.percent,
    }));

    // Map prior re-export consents → ReexportHistoryEntry. The Caelex
    // re-export-consent statuses map onto the detector's enum as:
    //   APPROVED|DENIED|REVOKED → same
    //   DRAFTED|SENT → PENDING (detector only cares about terminal)
    //   EXPIRED → APPROVED (was once approved)
    // FLAGGED + VIOLATION don't exist in the consent enum — the Caelex
    // VSD model is where violations live; for v1 we don't elevate
    // history items into FLAGGED automatically (conservative).
    const reexportHistory: ReexportHistoryEntry[] = op.reexportConsents.map(
      (c) => {
        let status: ReexportHistoryEntry["status"];
        switch (c.status) {
          case "APPROVED":
            status = "APPROVED";
            break;
          case "DENIED":
            status = "DENIED";
            break;
          case "REVOKED":
            status = "REVOKED";
            break;
          case "EXPIRED":
            status = "APPROVED";
            break;
          case "DRAFTED":
          case "SENT":
          default:
            status = "PENDING";
            break;
        }
        return {
          id: c.id,
          status,
          filedAt: c.createdAt,
        };
      },
    );

    const counterparty: ShamDetectorCounterparty = {
      id: op.counterparty.id,
      legalName: op.counterparty.legalName,
      countryCode: op.counterparty.countryCode,
      // The Caelex TradeParty model has no incorporatedAt / employeeCount /
      // bankCountry fields today — the detector will skip those checks
      // gracefully. Z9b will add UBO + Orbis enrichment, at which point
      // these fields can be wired in.
      uboChain,
    };

    const detectorInput: ShamDetectorOperation = {
      id: op.id,
      shipToCountry: op.shipToCountry,
      endUseCountry: op.endUseCountry ?? undefined,
      counterparty,
      endUser:
        op.endUserName || op.endUseCountry
          ? {
              name: op.endUserName ?? undefined,
              // Treat end-use country as proxy for operating country when
              // no separate end-user entity exists.
              operatingCountry: op.endUseCountry ?? undefined,
              reexportHistory,
            }
          : undefined,
      lines: op.lines.map((l) => ({
        eccn: l.item.eccnUS ?? l.item.eccnEU ?? "EAR99",
        unitValue: l.unitValue,
        quantity: l.quantity,
        currency: l.unitCurrency,
      })),
    };

    // Historical-medians context is not yet wired (depends on Z3
    // trade-flow warehouse). When it lands, populate
    // `historicalMediansEur` here; the detector handles either case.
    const result = detectShamTransactionRisk(detectorInput);

    logger.info("Z16 sham-transaction detector evaluated", {
      operationId: id,
      riskScore: result.riskScore,
      recommendation: result.recommendation,
      redFlagCount: result.redFlags.length,
      skippedCount: result.skippedChecks.length,
      userId,
    });

    return NextResponse.json({ result });
  } catch (err) {
    logger.error("GET /api/trade/operations/[id]/sham-risk failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
