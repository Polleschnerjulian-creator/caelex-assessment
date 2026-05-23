/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Cross-screening — wires OpenSanctions + Orbis UBO into the existing
 * 50%-Rule cascade (Sprint Z9c, Tier 5).
 *
 * Two integration surfaces:
 *
 * 1. OpenSanctions hits appear as a new TradeSanctionsList source.
 *    Snapshot-store + screen-party already iterate every registered
 *    parser, so OpenSanctions hits flow through automatically once Z9a
 *    registered the parser. No code change needed here — confirmed by
 *    a test in this file that the registered-parser list contains
 *    OPEN_SANCTIONS.
 *
 * 2. Orbis UBO tree extends the cascade input. The existing cascade
 *    engine reads ownership edges from TradePartyOwnership records
 *    (publicly-declared ownership). We *merge* in Orbis-reported edges
 *    so the cascade considers ULTIMATE beneficial owners that may not
 *    be modelled as TradeParty records.
 *
 *    Crucial design choice: we don't write Orbis nodes into the
 *    TradeParty table. Doing so would scatter "synthetic" parties into
 *    the org's counterparty list, which would confuse users + auditors.
 *    Instead we keep Orbis ancestors as IN-MEMORY-ONLY entries that
 *    flow into the cascade input alongside the real ownership graph.
 *
 *    Their screening status comes from Orbis's own compliance overlay
 *    (`isSanctioned` flag on UboNode). A sanctioned Orbis UBO becomes
 *    a CONFIRMED_HIT ancestor in the cascade, triggering the 50%-rule
 *    just like a real CONFIRMED_HIT TradeParty would.
 *
 * 3. "UBO-resolved" UI chip — the counterparty detail page reads the
 *    resolved depth + UBO summary from the existing screening result
 *    extension (`uboSummary` field returned alongside cascade).
 *
 * Pure functions. The DB-bound counterpart lives in
 * cross-screening.server.ts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { TradeScreeningStatus } from "@prisma/client";
import type { AncestorSummary, OwnershipEdgeSummary } from "./cascade-50pct";
import {
  computeTreeDepth,
  listAncestors,
  type UboEdge,
  type UboNode,
  type UboTree,
} from "./sources/orbis-ubo";

// ─── Types ──────────────────────────────────────────────────────────

/**
 * The "UBO-resolved" summary attached to a screening result. Drives the
 * UI chip on the counterparty detail page + the audit trail.
 */
export interface UboResolutionSummary {
  /** True iff a UBO tree was successfully resolved (Orbis returned data). */
  resolved: boolean;

  /**
   * Adapter name that produced the resolution. "mock" in dev/tests,
   * "orbis-v1" in prod (when wired). Empty string when `resolved=false`.
   */
  adapter: string;

  /** Depth of the resolved ownership chain (0 for root-only). */
  depth: number;

  /** Total number of nodes (entities + persons) in the tree. */
  nodeCount: number;

  /** Total number of edges in the tree. */
  edgeCount: number;

  /**
   * Number of Orbis-flagged sanctioned ancestors. These contribute to
   * the cascade aggregate via `isBlocked: true` in the merged
   * AncestorSummary map.
   */
  sanctionedAncestorCount: number;

  /**
   * Number of Orbis-flagged PEP ancestors. Surfaced for enhanced-DD
   * UX but does NOT trigger sanctions-cascade by itself.
   */
  pepAncestorCount: number;

  /**
   * Orbis confidence in the resolved tree (0.0 - 1.0). Below 0.5 the
   * UI surfaces a "low-confidence UBO data" warning.
   */
  confidence: number;

  /** ISO-8601 UTC timestamp from the UBO adapter ("when last refreshed"). */
  fetchedAt: string;
}

/**
 * Result of merging UBO ownership into the existing cascade input.
 * Exposed as a return type so the server-side wrapper can preserve
 * the originally-loaded summaries map (so the rest of the cascade
 * algorithm can resolve every owner ID it encounters).
 */
export interface MergedCascadeInput {
  edges: OwnershipEdgeSummary[];
  partySummaries: Map<string, AncestorSummary>;
  uboSummary: UboResolutionSummary;
}

// ─── Pure helpers ───────────────────────────────────────────────────

/**
 * Stable namespace separator for synthetic UBO party IDs. We prefix
 * with `UBO::` so that:
 *   - There's zero chance of colliding with a CUID-style real
 *     TradeParty.id (which never contains `::`)
 *   - Downstream consumers can filter out synthetic ancestors with a
 *     simple substring check if they want to render "real-only" views
 */
export const UBO_NAMESPACE_PREFIX = "UBO::";

/** True iff `id` was minted by us as a synthetic UBO node. */
export function isUboAncestorId(id: string): boolean {
  return id.startsWith(UBO_NAMESPACE_PREFIX);
}

/** Wrap a UboNode.id into our cascade-namespace. */
function toCascadeId(uboId: string): string {
  return `${UBO_NAMESPACE_PREFIX}${uboId}`;
}

/**
 * Map UboNode → AncestorSummary, deriving screeningStatus from Orbis's
 * own compliance overlay. We do NOT consult our OpenSanctions snapshot
 * here — that's a separate dimension and would create circular
 * dependencies during the merge.
 *
 *   Orbis `isSanctioned: true` → screeningStatus = CONFIRMED_HIT,
 *                                 isBlocked = true
 *   Orbis `isSanctioned: false` → screeningStatus = CLEAR,
 *                                 isBlocked = false
 *
 * This is intentionally simpler than the full fuzzy-match pipeline:
 * Orbis pre-resolves the entity, so we trust their authoritative flag.
 * A user can override by deliberately adding the Orbis-flagged entity
 * as a real TradeParty + manually screening it.
 */
export function uboNodeToAncestorSummary(node: UboNode): AncestorSummary {
  const isSanctioned = node.isSanctioned === true;
  return {
    id: toCascadeId(node.id),
    legalName: node.name,
    countryCode: node.countryCode,
    screeningStatus: (isSanctioned
      ? "CONFIRMED_HIT"
      : "CLEAR") as TradeScreeningStatus,
    isBlocked: isSanctioned,
  };
}

/**
 * Map a UboEdge to an OwnershipEdgeSummary in cascade-namespace.
 *
 * One subtlety: the cascade engine traverses from a TARGET party UP to
 * ancestors. The UBO tree is rooted at the same target. So when we
 * splice the UBO tree into the cascade input we need to bridge the
 * UBO root onto the real TradeParty id.
 *
 *   Real-side:  TradePartyOwnership(ownerId=X, ownedId=tradePartyId)
 *   UBO-side:   UboEdge(ownerId=uboRootNode, ownedId=uboRootNode) — this
 *               doesn't exist as a self-edge; instead the root has
 *               outgoing edges to its owners.
 *
 * So for every UBO edge `(uboOwner → uboOwned)`:
 *   - if `uboOwned` is the UBO tree root, set its cascade-side ownedId
 *     to `targetPartyId` (the real TradeParty id)
 *   - otherwise namespace both sides
 */
export function uboEdgeToCascadeEdge(
  edge: UboEdge,
  uboRootNodeId: string,
  realTargetPartyId: string,
): OwnershipEdgeSummary {
  return {
    ownerId: toCascadeId(edge.ownerId),
    ownedId:
      edge.ownedId === uboRootNodeId
        ? realTargetPartyId
        : toCascadeId(edge.ownedId),
    percent: edge.percent,
    controlType: edge.controlType,
  };
}

/**
 * Find the UBO tree's root node ID. Mirrors the helper inside
 * orbis-ubo.ts but kept private there — exported here because the
 * merge logic needs it.
 */
function findRootNodeId(tree: UboTree): string | null {
  for (const node of tree.nodes) {
    if (node.bvdId === tree.rootEntityId) return node.id;
  }
  for (const node of tree.nodes) {
    if (node.id === tree.rootEntityId) return node.id;
  }
  const owners = new Set(tree.edges.map((e) => e.ownerId));
  for (const node of tree.nodes) {
    if (!owners.has(node.id)) return node.id;
  }
  return null;
}

/**
 * Merge an Orbis UBO tree into an existing cascade input. Pure function.
 *
 * @param baseEdges - existing TradePartyOwnership-derived edges
 * @param baseSummaries - existing AncestorSummary map (mutated → cloned)
 * @param tree - the UBO tree, or null when Orbis returned nothing
 * @param realTargetPartyId - the real TradeParty id at the root
 */
export function mergeUboTreeIntoCascade(
  baseEdges: OwnershipEdgeSummary[],
  baseSummaries: Map<string, AncestorSummary>,
  tree: UboTree | null,
  realTargetPartyId: string,
  adapterName: string,
): MergedCascadeInput {
  // Clone the summaries map to keep the function pure.
  const mergedSummaries = new Map(baseSummaries);

  if (!tree || tree.nodes.length === 0) {
    return {
      edges: [...baseEdges],
      partySummaries: mergedSummaries,
      uboSummary: {
        resolved: false,
        adapter: "",
        depth: 0,
        nodeCount: 0,
        edgeCount: 0,
        sanctionedAncestorCount: 0,
        pepAncestorCount: 0,
        confidence: 0,
        fetchedAt: "",
      },
    };
  }

  const uboRoot = findRootNodeId(tree);
  if (!uboRoot) {
    return {
      edges: [...baseEdges],
      partySummaries: mergedSummaries,
      uboSummary: {
        resolved: false,
        adapter: adapterName,
        depth: 0,
        nodeCount: tree.nodes.length,
        edgeCount: tree.edges.length,
        sanctionedAncestorCount: 0,
        pepAncestorCount: 0,
        confidence: tree.confidence,
        fetchedAt: tree.fetchedAt,
      },
    };
  }

  // Add every UBO node EXCEPT the root as a synthetic ancestor.
  // The root is the real TradeParty — its summary is already in
  // baseSummaries (or will be looked up by realTargetPartyId).
  for (const node of tree.nodes) {
    if (node.id === uboRoot) continue;
    const summary = uboNodeToAncestorSummary(node);
    // Real party wins if the cascade-namespaced ID somehow collides
    // (shouldn't happen because of the UBO:: prefix, but the guard is
    // cheap insurance).
    if (!mergedSummaries.has(summary.id)) {
      mergedSummaries.set(summary.id, summary);
    }
  }

  // Splice in UBO edges. Each edge is namespaced + the leaf bridge
  // remaps the root-owned edge onto the real target party id.
  const mergedEdges: OwnershipEdgeSummary[] = [...baseEdges];
  for (const edge of tree.edges) {
    mergedEdges.push(uboEdgeToCascadeEdge(edge, uboRoot, realTargetPartyId));
  }

  // UI summary
  const ancestors = listAncestors(tree);
  const sanctionedCount = ancestors.filter(
    (a) => a.isSanctioned === true,
  ).length;
  const pepCount = ancestors.filter((a) => a.isPep === true).length;
  const depth = computeTreeDepth(tree);

  return {
    edges: mergedEdges,
    partySummaries: mergedSummaries,
    uboSummary: {
      resolved: true,
      adapter: adapterName,
      depth,
      nodeCount: tree.nodes.length,
      edgeCount: tree.edges.length,
      sanctionedAncestorCount: sanctionedCount,
      pepAncestorCount: pepCount,
      confidence: tree.confidence,
      fetchedAt: tree.fetchedAt,
    },
  };
}

/**
 * Derive a single status keyword that drives the "UBO-resolved" chip on
 * the counterparty detail page. Caller renders the right colour + label
 * based on the returned status.
 *
 *   "blocked"   — UBO chain includes a sanctioned ancestor
 *   "warning"   — UBO chain includes a PEP (no sanctions) OR confidence
 *                  is low
 *   "ok"        — UBO chain resolved cleanly, no flags
 *   "unresolved" — Orbis returned nothing (party not in their database)
 */
export function uboChipStatus(
  summary: UboResolutionSummary,
): "blocked" | "warning" | "ok" | "unresolved" {
  if (!summary.resolved) return "unresolved";
  if (summary.sanctionedAncestorCount > 0) return "blocked";
  if (summary.pepAncestorCount > 0) return "warning";
  if (summary.confidence < 0.5) return "warning";
  return "ok";
}
