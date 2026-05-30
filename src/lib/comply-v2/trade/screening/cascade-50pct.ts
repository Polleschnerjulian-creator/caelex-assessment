/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * 50%-Rule Cascade Engine (Wave A Sprint A6, extended Sprint D2).
 *
 * OFAC's 50% rule (and its EU/UK equivalents) extends sanctions
 * automatically to any entity that is 50% or more owned, directly or
 * indirectly, by one or more sanctioned persons. The entity itself
 * does NOT need to be on any list — the legal effect is the same.
 *
 * Source: 31 CFR § 510 (OFAC's 50% rule guidance, August 2014):
 *   "Property of an entity owned 50 percent or more by one or more
 *    blocked persons is considered to be the property of the blocked
 *    persons." This applies regardless of whether the entity itself
 *    is named on the SDN list.
 *
 * Sprint D2 extension — BIS Affiliate Rule (Sept 29, 2025).
 * BIS adopted an explicit 50%-aggregation rule mirroring OFAC for
 * the Entity List, Military End-User (MEU) List, Military Intelligence
 * End-User (MIEU) List, and Denied Persons List (DPL). The legal trigger
 * is analogous: ≥50% aggregate ownership by parties on any of these
 * lists requires BIS authorisation for the affiliated entity.
 *
 * The cascade ALGORITHM is identical regardless of which list triggered
 * the underlying CONFIRMED_HIT — we treat every CONFIRMED_HIT ancestor
 * the same. The DIFFERENCE is downstream interpretation: an OFAC
 * cascade blocks property; a BIS cascade requires a BIS license. The
 * UI / determination engine reads `triggerSources` (added below) to
 * tell the operator which authority's rule fired.
 *
 * The same principle now applies under the post-Dec-2025 OFAC trustee
 * doctrine for control-without-equity (TradePartyOwnership.controlType
 * = "control_no_equity") — but that's a separate flag, not aggregated
 * into the 50% number.
 *
 * Algorithm (BFS through ownership graph):
 *   1. Start at the target party with chain percent = 1.0
 *   2. Traverse UPWARD (target → its beneficial owners → grand-owners)
 *   3. At each step, multiply chain percent by the ownership edge
 *   4. Aggregate effective ownership per ancestor across ALL paths
 *      (diamond-ownership: same ancestor reachable via two children
 *       contributes the SUM of path products, not the max)
 *   5. Sum effective ownership of CONFIRMED_HIT ancestors → if ≥ 0.5,
 *      cascade hit triggered
 *
 * Cycles are detected by tracking visited (ancestorId, sourceChild)
 * pairs and refusing to re-traverse. A real ownership graph can have
 * cycles (cross-holdings) and we must terminate.
 *
 * Pure function (separated from DB I/O): takes a pre-loaded ownership
 * graph + ancestor-screening map, returns CascadeResult. The DB-bound
 * variant (`runCascadeForParty()`) lives in cascade-50pct.server.ts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { TradeScreeningStatus } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────

export interface OwnershipEdgeSummary {
  ownerId: string;
  ownedId: string;
  percent: number;
  /**
   * "voting" | "economic" | "control_no_equity"
   * Only "economic" and "voting" contribute to the 50% calculation.
   * "control_no_equity" is reported separately (post-Dec-2025 OFAC
   * trustee doctrine) but doesn't aggregate into the threshold.
   */
  controlType: string;
}

export interface AncestorSummary {
  id: string;
  legalName: string;
  countryCode: string;
  screeningStatus: TradeScreeningStatus;
  /**
   * Whether this ancestor itself was BLOCKED via earlier screening
   * (TradeParty.status === BLOCKED). Independent of screeningStatus
   * but usually correlated for CONFIRMED_HIT.
   */
  isBlocked: boolean;
}

/**
 * Pure-function input: the ownership graph as a flat edge list plus a
 * map of partyId → AncestorSummary for everyone the cascade might reach.
 *
 * The DB layer (cascade-50pct.server.ts) is responsible for loading
 * these in advance — we keep the algorithm pure for testability.
 */
export interface CascadeInput {
  /** The TradeParty we're analyzing for cascade hits. */
  targetPartyId: string;
  /** ALL ownership edges in the org's graph (or at least the connected component). */
  edges: OwnershipEdgeSummary[];
  /** Lookup of partyId → AncestorSummary for every party reachable in `edges`. */
  partySummaries: Map<string, AncestorSummary>;
  /**
   * Maximum traversal depth. Default 5. Most legitimate ownership
   * chains are 2-3 deep; 5 is a safety net against cycles + stack
   * overflow. Capped at 10 by the algorithm regardless of input.
   */
  maxDepth?: number;
}

export interface CascadeAncestor {
  ancestorId: string;
  ancestorName: string;
  countryCode: string;
  /** Aggregate effective ownership through ALL paths to this ancestor. */
  effectivePercent: number;
  /** ScreeningStatus of this ancestor (CLEAR/POTENTIAL_MATCH/CONFIRMED_HIT). */
  screeningStatus: TradeScreeningStatus;
  isBlocked: boolean;
  /** Number of distinct paths from target to this ancestor. */
  pathCount: number;
}

export interface CascadeResult {
  partyId: string;
  /**
   * Every ancestor found by traversing UPWARD from the target through
   * the ownership graph (within maxDepth). Includes ancestors of all
   * screeningStatus values, sorted by effectivePercent descending.
   */
  ancestors: CascadeAncestor[];
  /**
   * Sum of effective ownership from ancestors with CONFIRMED_HIT
   * screening status. This is the number compared to the 50% threshold.
   */
  aggregateSanctionedOwnership: number;
  /**
   * True if aggregateSanctionedOwnership >= 0.5 — the legal trigger
   * for OFAC 50% rule cascade. The target party should be treated
   * as sanctioned regardless of its own screening status.
   */
  cascadeHit: boolean;
  /**
   * Number of ancestors with CONFIRMED_HIT (≥1 means human review
   * needed even if total < 50%).
   */
  sanctionedAncestorCount: number;
  /**
   * Total effective ownership cascaded (sum across ALL ancestors,
   * regardless of screening status). Should be 1.0 in a clean tree
   * with no missing edges, < 1.0 if some equity is held by parties
   * not in our graph (the rest = "public/other").
   */
  totalCascadedOwnership: number;
  /**
   * Sprint D2 — which authority rules' 50%-Aggregation triggered this
   * cascade. Populated by the DB-loading wrapper (`runCascadeForParty`
   * in cascade-50pct.server.ts) by reading each CONFIRMED_HIT
   * ancestor's TradeScreeningResult.hits[] and rolling up the
   * distinct TradeSanctionsList values. Allows downstream callers to
   * surface "OFAC 50%-Rule" vs "BIS Affiliate Rule (Sept 29 2025)"
   * vs "EU 833/2014 sanctioned ownership" with the right framing.
   *
   * Empty array when no cascade hit, or when caller didn't supply
   * the sanctions-source map. Values come from `TradeSanctionsList`
   * enum (`OFAC_SDN`, `BIS_ENTITY`, `DDTC_DEBARRED`, `EU_FSF`,
   * `UK_OFSI`, `UN_CONSOLIDATED`).
   */
  triggerSources?: string[];
  /**
   * T-H5 (Sprint A, Task A6) — OFAC post-Dec-2025 trustee / control doctrine.
   *
   * Count of direct `control_no_equity` edges whose OWNER is sanctioned
   * (screeningStatus === CONFIRMED_HIT or isBlocked). These edges are
   * intentionally EXCLUDED from the 50%-rule equity math — control without
   * equity is a softer signal requiring human review rather than auto-block.
   *
   * When > 0, `screenParty` escalates a would-be CLEAR result to
   * POTENTIAL_MATCH. This field is INDEPENDENT of `cascadeHit` and
   * `aggregateSanctionedOwnership`; the equity math is unchanged.
   */
  sanctionedControlOnlyCount: number;
}

// ─── Algorithm ──────────────────────────────────────────────────────

const HARD_DEPTH_CAP = 10;
const ECONOMIC_OR_VOTING = new Set(["economic", "voting"]);

/**
 * Pure-function cascade analysis. Reads no I/O. The caller must
 * pre-load `edges` and `partySummaries`.
 */
export function analyzeCascade(input: CascadeInput): CascadeResult {
  const maxDepth = Math.min(input.maxDepth ?? 5, HARD_DEPTH_CAP);

  // Build adjacency: ownedId → list of (ownerId, percent, controlType)
  // We're traversing UPWARD (target → owners) so we index by ownedId.
  // Only economic and voting edges participate in the 50% equity math.
  const upwardAdj = new Map<string, OwnershipEdgeSummary[]>();
  // T-H5: collect direct control_no_equity edges on the TARGET separately.
  // These don't aggregate into the equity percentage but their owner's
  // sanctioned status is a separate escalation signal.
  const controlOnlyDirectEdges: OwnershipEdgeSummary[] = [];
  for (const edge of input.edges) {
    if (!ECONOMIC_OR_VOTING.has(edge.controlType)) {
      // Track control_no_equity edges that directly reference the target.
      if (
        edge.controlType === "control_no_equity" &&
        edge.ownedId === input.targetPartyId
      ) {
        controlOnlyDirectEdges.push(edge);
      }
      continue;
    }
    let bucket = upwardAdj.get(edge.ownedId);
    if (!bucket) {
      bucket = [];
      upwardAdj.set(edge.ownedId, bucket);
    }
    bucket.push(edge);
  }

  // Aggregate ownership per ancestor across all paths.
  // ancestorId → { effectivePercent, pathCount }
  const aggregated = new Map<
    string,
    { effectivePercent: number; pathCount: number }
  >();

  // BFS queue: (currentId, chainPercent, depthRemaining, visitedInChain)
  // visitedInChain: Set of party IDs in THIS path (for cycle protection)
  interface QueueItem {
    currentId: string;
    chainPercent: number;
    depthRemaining: number;
    visited: Set<string>;
  }

  const queue: QueueItem[] = [
    {
      currentId: input.targetPartyId,
      chainPercent: 1.0,
      depthRemaining: maxDepth,
      visited: new Set([input.targetPartyId]),
    },
  ];

  while (queue.length > 0) {
    const item = queue.shift()!;
    if (item.depthRemaining === 0) continue;

    const upwardEdges = upwardAdj.get(item.currentId);
    if (!upwardEdges) continue;

    for (const edge of upwardEdges) {
      // Cycle protection: skip if this ancestor is already in OUR chain
      if (item.visited.has(edge.ownerId)) continue;

      // Multiply path percent
      const newChainPercent = item.chainPercent * edge.percent;
      // Skip insignificant contributions to keep numbers clean
      if (newChainPercent < 0.0001) continue;

      // Aggregate across paths
      const prev = aggregated.get(edge.ownerId) ?? {
        effectivePercent: 0,
        pathCount: 0,
      };
      aggregated.set(edge.ownerId, {
        effectivePercent: prev.effectivePercent + newChainPercent,
        pathCount: prev.pathCount + 1,
      });

      // Continue BFS upward from the ancestor
      const newVisited = new Set(item.visited);
      newVisited.add(edge.ownerId);
      queue.push({
        currentId: edge.ownerId,
        chainPercent: newChainPercent,
        depthRemaining: item.depthRemaining - 1,
        visited: newVisited,
      });
    }
  }

  // Build CascadeAncestor list
  const ancestors: CascadeAncestor[] = [];
  let aggregateSanctioned = 0;
  let totalCascaded = 0;
  let sanctionedCount = 0;

  for (const [ancestorId, agg] of aggregated) {
    const summary = input.partySummaries.get(ancestorId);
    if (!summary) continue; // missing summary — skip rather than crash

    const cap = Math.min(agg.effectivePercent, 1); // numerical safety
    ancestors.push({
      ancestorId,
      ancestorName: summary.legalName,
      countryCode: summary.countryCode,
      effectivePercent: cap,
      screeningStatus: summary.screeningStatus,
      isBlocked: summary.isBlocked,
      pathCount: agg.pathCount,
    });

    totalCascaded += cap;

    if (summary.screeningStatus === "CONFIRMED_HIT" || summary.isBlocked) {
      aggregateSanctioned += cap;
      sanctionedCount++;
    }
  }

  // Sort ancestors by effective ownership descending (most-impactful first)
  ancestors.sort((a, b) => b.effectivePercent - a.effectivePercent);

  // Cap the aggregate to 1.0 to avoid > 100% from rounding artifacts
  const cappedSanctioned = Math.min(aggregateSanctioned, 1);

  // T-H5: count sanctioned control-only owners. Re-uses the same sanctioned
  // determination already used for equity ancestors: CONFIRMED_HIT OR isBlocked.
  // Only direct edges on the target party are counted (depth-1 trustees/directors).
  let sanctionedControlOnlyCount = 0;
  for (const controlEdge of controlOnlyDirectEdges) {
    const ownerSummary = input.partySummaries.get(controlEdge.ownerId);
    if (!ownerSummary) continue;
    if (
      ownerSummary.screeningStatus === "CONFIRMED_HIT" ||
      ownerSummary.isBlocked
    ) {
      sanctionedControlOnlyCount++;
    }
  }

  return {
    partyId: input.targetPartyId,
    ancestors,
    aggregateSanctionedOwnership: cappedSanctioned,
    cascadeHit: cappedSanctioned >= 0.5,
    sanctionedAncestorCount: sanctionedCount,
    totalCascadedOwnership: Math.min(totalCascaded, 1),
    sanctionedControlOnlyCount,
  };
}
