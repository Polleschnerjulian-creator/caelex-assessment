/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Screen one TradeParty against the latest snapshots of all registered
 * sanctions lists. Persists a TradeScreeningResult and updates the
 * TradeParty's denormalized screeningStatus + lastScreenedAt.
 *
 * This is the central server function called by:
 *   - The on-demand "Screen now" button in /dashboard/trade/counterparties (A8)
 *   - The Astra tool `screen_trade_party` (A7)
 *   - The continuous re-screening cron (A7) for parties whose lastScreenedAt
 *     is older than 30 days
 *
 * Design:
 *   - Pure-ish: takes prisma client + party id, returns the new screening
 *     result. No HTTP, no UI concerns.
 *   - Uses the latest snapshot per list (computed via allLatestSnapshots()).
 *     Snapshot hash is recorded on the screening result for audit.
 *   - Hits below WEAK_MATCH threshold are dropped from persistence
 *     (would create noise; if the operator needs lower-threshold hits
 *     they re-screen with custom threshold via the screening engine).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  TradeScreeningStatus,
  TradeScreeningDecision,
  type TradeParty,
  type TradeScreeningResult,
  type TradeSanctionsList,
} from "@prisma/client";
import { logger } from "@/lib/logger";

import {
  classifyScore,
  screenAgainstEntries,
  SCORE_POTENTIAL_MATCH,
  SCORE_WEAK_MATCH,
  type FuzzyHit,
} from "./fuzzy-match";
import { allLatestSnapshots } from "./snapshot-store.server";
import type { CanonicalSanctionsEntry } from "./sources/types";
import { runCascadeForParty } from "./cascade-50pct.server";
import type { CascadeResult } from "./cascade-50pct";

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Hit augmented with the source list (which list the entryId came from).
 * Persisted on TradeScreeningResult.hits as JSONB.
 */
export interface PersistableHit extends FuzzyHit {
  list: TradeSanctionsList;
}

export interface ScreenPartyOptions {
  /**
   * Override the score threshold below which hits are discarded.
   * Default = SCORE_WEAK_MATCH (0.75). Pass POTENTIAL_MATCH (0.85)
   * for stricter screening or 0 to capture everything (debug).
   */
  scoreThreshold?: number;

  /**
   * Override the user id recorded as `decidedById` on auto-CLEAR
   * results. Defaults to undefined (system-recorded). Set this when
   * a human-initiated screen run should attribute the decision to
   * that user.
   */
  systemDecisionUserId?: string;
}

export interface ScreenPartyResult {
  partyId: string;
  /** New screening result row. */
  screeningResult: TradeScreeningResult;
  /** Updated party (with new denormalized status fields). */
  party: TradeParty;
  /**
   * Cascade analysis result, if the party has any beneficial owners
   * in the org's graph. Null if no edges exist for this party (cascade
   * couldn't compute anything meaningful — common for newly-added
   * counterparties before ownership is captured).
   */
  cascade: CascadeResult | null;
  /** Summary for logging/UI. */
  summary: {
    hitCount: number;
    topScore: number;
    decision: TradeScreeningDecision;
    listsConsulted: TradeSanctionsList[];
    snapshotsMissing: TradeSanctionsList[];
    /** Whether the 50%-rule cascade triggered (≥50% sanctioned ownership). */
    cascadeHit: boolean;
    /** Number of CONFIRMED_HIT ancestors found via cascade traversal. */
    sanctionedAncestorCount: number;
  };
}

// ─── Main entry point ───────────────────────────────────────────────

/**
 * Screen one TradeParty by id. Throws if party not found.
 */
export async function screenParty(
  partyId: string,
  options: ScreenPartyOptions = {},
): Promise<ScreenPartyResult> {
  const party = await prisma.tradeParty.findUnique({ where: { id: partyId } });
  if (!party) {
    throw new Error(`TradeParty not found: ${partyId}`);
  }

  const threshold = options.scoreThreshold ?? SCORE_WEAK_MATCH;
  const snapshots = await allLatestSnapshots();
  const listsConsulted = Array.from(snapshots.keys());

  // No snapshots at all — cron hasn't completed any successful sync yet.
  // This is NOT a failure of the party — we record an empty result with
  // a special note so the user understands why no hits appeared.
  if (snapshots.size === 0) {
    logger.warn(
      { partyId },
      "screenParty: no sanctions snapshots available — sync cron may not have run yet",
    );
  }

  // Run fuzzy match across ALL snapshots. List is preserved on each hit.
  const allHits: PersistableHit[] = [];
  const hashesByList: Partial<Record<TradeSanctionsList, string>> = {};

  for (const [list, snapshot] of snapshots) {
    hashesByList[list] = snapshot.hash;
    const entries = snapshot.entries as unknown as CanonicalSanctionsEntry[];
    const hits = screenAgainstEntries(party.canonicalName, entries, threshold);
    for (const hit of hits) {
      allHits.push({ ...hit, list });
    }
  }

  // Sort all hits across lists by score descending
  allHits.sort((a, b) => b.score - a.score);

  // ── 50%-Rule Cascade Analysis (Sprint A6) ─────────────────────────
  // Independent of fuzzy match: even if the party's name doesn't match
  // any sanctions list directly, it may be sanctioned by virtue of
  // beneficial ownership ≥50% by sanctioned entities.
  const cascade = await runCascadeForParty(partyId, party.organizationId);

  // Determine overall decision: triggered by EITHER fuzzy hits OR
  // cascade. Cascade hit alone is sufficient to escalate to
  // POTENTIAL_MATCH (in fact more decisive than a 0.85 name match).
  const topScore = allHits.length > 0 ? allHits[0].score : 0;
  const band = classifyScore(topScore);
  const cascadeHit = cascade?.cascadeHit ?? false;
  const cascadeAncestorCount = cascade?.sanctionedAncestorCount ?? 0;

  let decision: TradeScreeningDecision;
  let newStatus: TradeScreeningStatus;
  if (
    band === "confirmed" ||
    band === "potential" ||
    band === "weak" ||
    cascadeHit ||
    cascadeAncestorCount > 0
  ) {
    // Any of: name match (any band) OR cascade-detected sanctioned
    // ownership requires human review before clearing.
    decision = TradeScreeningDecision.POTENTIAL_MATCH;
    newStatus = TradeScreeningStatus.POTENTIAL_MATCH;
  } else {
    decision = TradeScreeningDecision.CLEAR;
    newStatus = TradeScreeningStatus.CLEAR;
  }

  // Compose snapshotHash — we hash the per-list hashes together so the
  // screening result is content-addressable to "this exact combination
  // of list versions". Lets us prove later: this party was screened
  // against THIS specific OFAC version + THIS specific BIS version etc.
  const combinedHash = combineHashes(hashesByList);

  // Persist + update denormalized fields atomically
  const now = new Date();
  const [screeningResult, updatedParty] = await prisma.$transaction([
    prisma.tradeScreeningResult.create({
      data: {
        partyId,
        hits: allHits as unknown as object[],
        decision,
        decidedById:
          decision === TradeScreeningDecision.CLEAR
            ? options.systemDecisionUserId
            : null,
        decidedAt: decision === TradeScreeningDecision.CLEAR ? now : null,
        snapshotHash: combinedHash,
      },
    }),
    prisma.tradeParty.update({
      where: { id: partyId },
      data: {
        screeningStatus: newStatus,
        screeningHits:
          allHits.length > 0
            ? (allHits.slice(0, 10) as unknown as object[])
            : null,
        lastScreenedAt: now,
      },
    }),
  ]);

  const result: ScreenPartyResult = {
    partyId,
    screeningResult,
    party: updatedParty,
    cascade,
    summary: {
      hitCount: allHits.length,
      topScore,
      cascadeHit,
      sanctionedAncestorCount: cascadeAncestorCount,
      decision,
      listsConsulted,
      snapshotsMissing: missingLists(listsConsulted),
    },
  };

  logger.info(
    {
      partyId,
      decision,
      hitCount: allHits.length,
      topScore: topScore.toFixed(3),
      listsConsulted: listsConsulted.length,
      cascadeHit,
      sanctionedAncestorCount: cascadeAncestorCount,
      cascadeAggregate: cascade?.aggregateSanctionedOwnership.toFixed(3),
    },
    "screenParty: completed",
  );

  return result;
}

// ─── Helpers (exported for testing) ─────────────────────────────────

/**
 * Combine per-list snapshot hashes into one deterministic hash. Sort
 * by list name first so the same set of hashes always produces the
 * same combined hash regardless of iteration order.
 */
export function combineHashes(
  hashesByList: Partial<Record<TradeSanctionsList, string>>,
): string {
  const sorted = Object.entries(hashesByList)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([list, hash]) => `${list}:${hash}`)
    .join("|");
  return createHash("sha256").update(sorted).digest("hex");
}

/**
 * Compute which sanctions lists were NOT consulted because no snapshot
 * exists yet. Surfaces "you should have synced X first" in the UI.
 *
 * Currently hard-coded against the registered parsers. Could be made
 * dynamic if the parser registry becomes user-configurable.
 */
export function missingLists(
  consulted: TradeSanctionsList[],
): TradeSanctionsList[] {
  // List the canonical 6-list set explicitly. If A3 adds EU/UK/UN
  // parsers, append them here too.
  const expected: TradeSanctionsList[] = [
    "OFAC_SDN",
    "BIS_ENTITY",
    "DDTC_DEBARRED",
  ] as TradeSanctionsList[];
  const consultedSet = new Set(consulted);
  return expected.filter((l) => !consultedSet.has(l));
}
