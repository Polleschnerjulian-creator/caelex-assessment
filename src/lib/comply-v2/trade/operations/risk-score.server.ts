/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Server-side wrapper for the risk-score engine. Loads the operation
 * + counterparty + lines from Prisma, runs the pure-function engine,
 * and persists the result on TradeOperation.riskScore.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  computeRiskScore,
  lineInputFromItem,
  type RiskScoreResult,
} from "./risk-score";

/**
 * Recompute the risk score for an operation and persist it. Org-scope
 * verification is the caller's responsibility — pass `partyId` only
 * after verifying the user has access.
 *
 * Returns the full RiskScoreResult for UI display, OR null if the
 * operation doesn't exist.
 */
export async function recomputeRiskScore(
  operationId: string,
  organizationId: string,
): Promise<RiskScoreResult | null> {
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
    },
  });

  if (!op) return null;

  const result = computeRiskScore({
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
    lines: op.lines.map((l) => lineInputFromItem(l.item)),
  });

  // Persist denormalized score for fast list-view filtering
  await prisma.tradeOperation.update({
    where: { id: operationId },
    data: { riskScore: result.score },
  });

  return result;
}
