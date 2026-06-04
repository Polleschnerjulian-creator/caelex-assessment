/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Server-side wrapper that runs BOTH the risk-score engine AND the
 * catch-all evaluator for an operation, then persists all derived
 * fields atomically:
 *
 *   TradeOperation.riskScore         ← from risk engine
 *   TradeOperation.catchAllArt4Hit   ← from catch-all engine
 *   TradeOperation.catchAllArt5Hit   ← from catch-all engine
 *   TradeOperation.catchAllArt9Hit   ← from catch-all engine
 *   TradeOperation.catchAllArt10Hit  ← from catch-all engine
 *   TradeOperation.notificationDuty  ← from catch-all engine
 *   TradeOperation.para9NuclearHit   ← from catch-all engine (§9(1) AWV)
 *   TradeOperation.para9MilitaryHit  ← from catch-all engine (§9(2) AWV)
 *
 * Both engines are pure functions; this file is the I/O glue.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import type { TradeOperationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitTradeEvent } from "@/lib/comply-v2/trade/ops-events.server";
import {
  computeRiskScore,
  lineInputFromItem as riskLineInput,
  type RiskScoreResult,
} from "./risk-score";
import {
  evaluateCatchAll,
  lineInputFromItem as catchAllLineInput,
  type CatchAllResult,
} from "./catch-all-evaluator";
import { deriveOperationStatus } from "./derive-status";

export interface RecomputeResult {
  risk: RiskScoreResult;
  catchAll: CatchAllResult;
  /**
   * Tier 1.7 — the auto-derived lifecycle status transition, or null when no
   * automatic status change happened (operation in a human-gated state, the
   * derived target equalled the current status, or a concurrent change won the
   * CAS race).
   */
  statusChange: { from: TradeOperationStatus; to: TradeOperationStatus } | null;
}

/**
 * Recompute risk + catch-all for an operation and persist results.
 * Org-scope verification is the caller's responsibility.
 *
 * Returns null if the operation doesn't exist in the given org.
 */
export async function recomputeOperation(
  operationId: string,
  organizationId: string,
): Promise<RecomputeResult | null> {
  const op = await prisma.tradeOperation.findFirst({
    where: { id: operationId, organizationId },
    include: {
      counterparty: {
        select: {
          screeningStatus: true,
          status: true,
          isHighRiskCountry: true,
        },
      },
      lines: {
        include: {
          item: {
            select: {
              eccnEU: true,
              eccnUS: true,
              usmlCategory: true,
              mtcrCategory: true,
              germanAlEntry: true,
              // Tier 1.7 — classification readiness drives the prep-band status.
              status: true,
            },
          },
        },
      },
      _count: { select: { licenses: true } },
    },
  });

  if (!op) return null;

  const risk = computeRiskScore({
    operation: {
      operationType: op.operationType,
      shipFromCountry: op.shipFromCountry,
      shipToCountry: op.shipToCountry,
      endUseCountry: op.endUseCountry,
      declaredEndUse: op.declaredEndUse,
      endUserSector: op.endUserSector,
    },
    counterparty: {
      screeningStatus: op.counterparty.screeningStatus,
      status: op.counterparty.status,
      isHighRiskCountry: op.counterparty.isHighRiskCountry,
    },
    lines: op.lines.map((l) => riskLineInput(l.item)),
  });

  const catchAll = evaluateCatchAll({
    operation: {
      operationType: op.operationType,
      shipFromCountry: op.shipFromCountry,
      shipToCountry: op.shipToCountry,
      endUseCountry: op.endUseCountry,
      declaredEndUse: op.declaredEndUse,
      endUserName: op.endUserName,
      endUserSector: op.endUserSector,
      // §9(1)/§9(2) AWV self-attested knowledge signals — previously never
      // forwarded, so the high-confidence §9 paths could never fire.
      bafaNuclearNotification: op.bafaNuclearNotification,
      nuclearEndUseAware: op.nuclearEndUseAware,
      bafaMilitaryNotification: op.bafaMilitaryNotification,
      militaryEndUseAware: op.militaryEndUseAware,
    },
    lines: op.lines.map((l) => catchAllLineInput(l.item)),
    hasAttachedLicenses: op._count.licenses > 0,
  });

  // Persist all derived risk/catch-all fields. Unconditional by id — these are
  // always safe to overwrite with a fresh computation.
  await prisma.tradeOperation.update({
    where: { id: operationId },
    data: {
      riskScore: risk.score,
      catchAllArt4Hit: catchAll.art4,
      catchAllArt5Hit: catchAll.art5,
      catchAllArt9Hit: catchAll.art9,
      catchAllArt10Hit: catchAll.art10,
      notificationDuty: catchAll.notificationDuty,
      para9NuclearHit: catchAll.para9Nuclear,
      para9MilitaryHit: catchAll.para9Military,
    },
  });

  // ── Tier 1.7: verdict/fact-driven status auto-advance ──
  // Reflect the operation's facts onto its lifecycle status across the
  // fact-grounded prep band only (DRAFT→AWAITING_CLASSIFICATION→SCREENING→
  // AWAITING_LICENSE). Human-Freigabe / terminal states (LICENSED, EXECUTED,
  // BLOCKED, VOLUNTARY_DISCLOSURE_FILED) are never auto-set or overwritten —
  // deriveOperationStatus returns null for them.
  let statusChange: RecomputeResult["statusChange"] = null;
  const derivedStatus = deriveOperationStatus(op.status, {
    activeLineCount: op.lines.length,
    hasUnclassifiedItem: op.lines.some((l) => l.item.status !== "CLASSIFIED"),
    counterpartyScreening: op.counterparty?.screeningStatus ?? null,
  });
  if (derivedStatus) {
    // CAS guard: re-assert the status we read so a concurrent manual PATCH
    // (e.g. an operator BLOCK) can't be silently clobbered. count 0 ⇒ the row
    // moved under us ⇒ yield to the human decision.
    const swap = await prisma.tradeOperation.updateMany({
      where: { id: operationId, organizationId, status: op.status },
      data: { status: derivedStatus },
    });
    if (swap.count === 1) {
      statusChange = { from: op.status, to: derivedStatus };
      await emitTradeEvent("trade.operation.status_changed", {
        organizationId,
        summary: `${op.reference} · ${op.status} → ${derivedStatus} (auto)`,
        data: {
          operationId,
          reference: op.reference,
          from: op.status,
          to: derivedStatus,
          auto: true,
          trigger: "recompute",
        },
      });
    }
  }

  return { risk, catchAll, statusChange };
}
