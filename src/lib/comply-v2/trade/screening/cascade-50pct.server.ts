/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Server-side wrapper for the 50%-Rule Cascade Engine.
 *
 * Loads the org's ownership graph + ancestor party summaries from
 * Prisma, then delegates to the pure analyzeCascade() algorithm.
 *
 * For now we load the FULL ownership graph for the organization (not
 * just the connected component starting at target). This is fine for
 * MVP — typical org has < 100 TradeParty records and < 200 ownership
 * edges. If we ever exceed ~10K edges per org, we'd switch to a
 * recursive CTE that walks the graph in SQL.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import {
  analyzeCascade,
  type AncestorSummary,
  type CascadeInput,
  type CascadeResult,
  type OwnershipEdgeSummary,
} from "./cascade-50pct";

/**
 * Run the 50%-rule cascade for a TradeParty within its organization.
 *
 * The org-scope check is the caller's responsibility: pass `partyId`
 * only after verifying the user has access to the party. This server
 * function trusts its inputs and only loads data within the partition
 * defined by `organizationId`.
 *
 * Returns null if the party doesn't exist (caller decides whether
 * that's a 404 or a clean "no result" UX).
 */
export async function runCascadeForParty(
  partyId: string,
  organizationId: string,
  options?: { maxDepth?: number },
): Promise<CascadeResult | null> {
  // Verify the party exists in the org (cheap existence check)
  const target = await prisma.tradeParty.findFirst({
    where: { id: partyId, organizationId },
    select: { id: true },
  });
  if (!target) return null;

  // Load ALL ownership edges in the org. We include both directions
  // (owner + owned) because a target's ancestors might be owners of
  // other parties too — we want their full screening status.
  const [allEdges, allParties] = await Promise.all([
    prisma.tradePartyOwnership.findMany({
      where: {
        OR: [{ owner: { organizationId } }, { owned: { organizationId } }],
      },
      select: {
        ownerId: true,
        ownedId: true,
        percent: true,
        controlType: true,
      },
    }),
    prisma.tradeParty.findMany({
      where: { organizationId },
      select: {
        id: true,
        legalName: true,
        countryCode: true,
        screeningStatus: true,
        status: true,
      },
    }),
  ]);

  const edges: OwnershipEdgeSummary[] = allEdges.map((e) => ({
    ownerId: e.ownerId,
    ownedId: e.ownedId,
    percent: e.percent,
    controlType: e.controlType,
  }));

  const partySummaries = new Map<string, AncestorSummary>();
  for (const p of allParties) {
    partySummaries.set(p.id, {
      id: p.id,
      legalName: p.legalName,
      countryCode: p.countryCode,
      screeningStatus: p.screeningStatus,
      isBlocked: p.status === "BLOCKED",
    });
  }

  const input: CascadeInput = {
    targetPartyId: partyId,
    edges,
    partySummaries,
    maxDepth: options?.maxDepth,
  };

  return analyzeCascade(input);
}
