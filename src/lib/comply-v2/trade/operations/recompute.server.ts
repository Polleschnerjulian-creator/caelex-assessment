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
 *
 * Both engines are pure functions; this file is the I/O glue.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { prisma } from "@/lib/prisma";
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

export interface RecomputeResult {
  risk: RiskScoreResult;
  catchAll: CatchAllResult;
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
    },
    lines: op.lines.map((l) => catchAllLineInput(l.item)),
    hasAttachedLicenses: op._count.licenses > 0,
  });

  // Persist all derived fields atomically
  await prisma.tradeOperation.update({
    where: { id: operationId },
    data: {
      riskScore: risk.score,
      catchAllArt4Hit: catchAll.art4,
      catchAllArt5Hit: catchAll.art5,
      catchAllArt9Hit: catchAll.art9,
      catchAllArt10Hit: catchAll.art10,
      notificationDuty: catchAll.notificationDuty,
    },
  });

  return { risk, catchAll };
}
