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
 * Beneficial-ownership resolution status for a cascade run.
 *
 *   COMPLETE   — the org's ownership graph models ~all of the party's equity
 *                (totalCascadedOwnership ≈ 1.0) AND at least one ownership edge
 *                exists. We could trace the whole chain.
 *   INCOMPLETE — ownership edges exist, but they account for LESS than the
 *                whole equity: some beneficial ownership is unmodeled (the rest
 *                is held by parties not captured in the graph). A partial chain
 *                is NOT a clean cascade.
 *   UNKNOWN    — no ownership edges for this party at all. We know nothing about
 *                who beneficially owns it.
 *
 * FAIL-CLOSED: anything other than COMPLETE is a GAP — beneficial ownership
 * could NOT be fully resolved, so the UI must treat the party as not-yet-clear
 * on the ownership axis (amber, "vor Transaktion erneut prüfen"), NEVER imply a
 * clean ≥50%-rule cascade. This status is presentation/threading only — it does
 * NOT alter `cascadeHit` or any equity math.
 */
export type UboStatus = "COMPLETE" | "INCOMPLETE" | "UNKNOWN";

/**
 * The CascadeResult enriched with a fail-closed `uboStatus`. Additive: every
 * field of the pure CascadeResult is preserved unchanged; `uboStatus` is the
 * only new field. Persisted/returned as the cascade snapshot, so the party page
 * can render an amber "UBO unvollständig" alert when not COMPLETE.
 */
export interface CascadeResultWithUbo extends CascadeResult {
  uboStatus: UboStatus;
}

/**
 * Threshold above which the modeled equity is treated as "complete coverage".
 * Mirrors the 0.999 figure the party-page cascade view already uses to decide
 * whether to show the "remainder held by parties not in graph" note, so the
 * status and that note agree. A tiny slack (0.001) absorbs float rounding from
 * the chain-percent multiplications in analyzeCascade.
 */
const UBO_COMPLETE_COVERAGE = 0.999;

/**
 * Derive the fail-closed beneficial-ownership resolution status from a computed
 * cascade plus whether the target party has ANY ownership edge in the graph.
 *
 * Conservative by construction:
 *   - no edges at all          ⇒ UNKNOWN  (we know nothing)
 *   - edges, partial coverage  ⇒ INCOMPLETE (some equity unmodeled)
 *   - edges, full coverage     ⇒ COMPLETE
 *
 * Pure helper (exported for testing). Never returns COMPLETE for a party whose
 * ownership we have not actually modeled — absence of data is never resolved.
 */
export function deriveUboStatus(
  result: CascadeResult,
  hasOwnershipEdges: boolean,
): UboStatus {
  if (!hasOwnershipEdges) return "UNKNOWN";
  return result.totalCascadedOwnership >= UBO_COMPLETE_COVERAGE
    ? "COMPLETE"
    : "INCOMPLETE";
}

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
): Promise<CascadeResultWithUbo | null> {
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

  const result = analyzeCascade(input);

  // Fail-closed UBO resolution status (additive — does NOT touch the cascade
  // decision). "Has ownership edges" = the target party is OWNED by at least
  // one edge in the graph. Only equity-bearing edges feed the coverage math in
  // analyzeCascade, so we mirror that here: an equity/voting owner edge on the
  // target is what makes ownership "modeled". A party with only a
  // control-without-equity edge (or no edge at all) has UNKNOWN equity
  // ownership — never silently COMPLETE.
  const hasOwnershipEdges = edges.some(
    (e) =>
      e.ownedId === partyId &&
      (e.controlType === "economic" || e.controlType === "voting"),
  );

  return {
    ...result,
    uboStatus: deriveUboStatus(result, hasOwnershipEdges),
  };
}
