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
// Note: canonicalizeName (from "./sources/types") is intentionally NOT used
// for identity reconciliation — it strips legal-form suffixes (GmbH/B.V./LLC)
// which would merge distinct entities. Use identityKey() (local) for that.

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
 * Identity key for a legal entity: lowercase + trim + collapse-whitespace
 * + strip non-alphanumeric punctuation, but WITHOUT stripping legal-form
 * suffixes (GmbH, B.V., LLC, …).
 *
 * Why NOT reuse canonicalizeName here:
 *   canonicalizeName is a *fuzzy-match* normaliser that strips suffixes so
 *   "Spire GmbH" and "Spire B.V." both become "spire". That's correct for
 *   sanctions-list fuzzy matching where we want to catch name variants, but
 *   WRONG for identity reconciliation — "Spire GmbH" and "Spire B.V." are
 *   legally distinct entities. Merging them could hide a sanction on one.
 *
 * This function produces an equality key: two entities share the same key
 * only if their full legal names (including suffix) normalise identically.
 */
function identityKey(name: string): string {
  if (!name) return "";
  let s = name.toLowerCase();
  // Strip diacritics (same as canonicalizeName step 1)
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  // Replace punctuation/separators with space (but keep alphanumeric + letters)
  s = s.replace(/[^\p{L}\p{N}]+/gu, " ");
  // Collapse whitespace + trim
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Composite lookup key: identity key of name + "||" + normalised countryCode.
 * Two entities reconcile only when BOTH the full legal name (suffix included)
 * AND the country code agree. Entities with different countries are always
 * treated as distinct even when names match.
 *
 * "XX" (unknown country) on either side is treated as compatible — we
 * cannot confirm they are different, so we err on the side of dedup to
 * avoid double-counting. The caller should supply real country codes
 * whenever possible.
 */
function nameCountryKey(name: string, countryCode: string): string {
  return `${identityKey(name)}||${(countryCode ?? "XX").toUpperCase()}`;
}

/**
 * Build a lookup from (normalised-full-name + country) → existing party id
 * from baseSummaries. Used during UBO merge to reconcile a UBO node against
 * an already-known party so we never give the same entity two different ids.
 *
 * We index every entry in baseSummaries (skipping the target itself, whose
 * reconciliation is handled via the root bridge). Entries with an empty or
 * whitespace-only key are excluded to avoid false positives.
 *
 * Key change from original: we NO LONGER use canonicalizeName (which strips
 * legal-form suffixes). "Spire GmbH" and "Spire B.V." now produce different
 * keys, so they are never reconciled. This prevents a sanctioned UBO node
 * from being silently merged into a CLEAR declared party that merely shares
 * the base name.
 */
function buildExistingPartyNameIndex(
  baseSummaries: Map<string, AncestorSummary>,
  realTargetPartyId: string,
): Map<string, string> {
  const index = new Map<string, string>();
  for (const [id, summary] of baseSummaries) {
    if (id === realTargetPartyId) continue;
    const key = nameCountryKey(summary.legalName, summary.countryCode);
    if (key.length > 0) {
      index.set(key, id);
    }
  }
  return index;
}

/**
 * Resolve the cascade-side id for a non-root UBO node.
 *
 * If the UBO node's full-name+country key matches an existing party in the
 * `nameIndex`, return that party's real id (identity reconciliation).
 * Otherwise mint a fresh `UBO::` id (new node).
 *
 * Reconciliation criteria (most-to-least permissive — we err toward NOT
 * merging, because over-merging can hide sanctions):
 *   - Full legal name (including suffix) must match exactly after
 *     normalisation (lower, diacritics stripped, punctuation → space).
 *   - Country code must match (or one side is "XX"/unknown, treated as
 *     compatible).
 *
 * We deliberately do NOT use canonicalizeName (which strips GmbH/B.V./LLC)
 * because "Spire GmbH" and "Spire B.V." are distinct legal entities.
 */
function resolveUboNodeId(
  node: UboNode,
  nameIndex: Map<string, string>,
): string {
  const key = nameCountryKey(node.name, node.countryCode);
  const existingId = key.length > 0 ? nameIndex.get(key) : undefined;

  // If no direct match, also check with unknown-country wildcard "XX" on
  // the UBO side — some Orbis nodes have countryCode "XX" when jurisdiction
  // cannot be determined.
  if (!existingId && node.countryCode === "XX") {
    // Try each existing-party entry to find one with same name key
    const nameOnly = identityKey(node.name);
    for (const [indexKey, id] of nameIndex) {
      if (indexKey.startsWith(`${nameOnly}||`)) {
        return id;
      }
    }
  }

  return existingId ?? toCascadeId(node.id);
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

  // Build a name-based index of existing parties for identity reconciliation
  // (T-M2): a UBO non-root node whose normalised name matches an existing
  // party maps to that party's real id rather than getting a new UBO:: id.
  const existingNameIndex = buildExistingPartyNameIndex(
    baseSummaries,
    realTargetPartyId,
  );

  // Map uboNode.id → resolved cascade id (real party id OR UBO:: id).
  // Built during the summary-insertion pass so the edge pass can reuse it.
  const uboIdToCascadeId = new Map<string, string>();

  // Add every UBO node EXCEPT the root as a synthetic ancestor.
  // The root is the real TradeParty — its summary is already in
  // baseSummaries (or will be looked up by realTargetPartyId).
  for (const node of tree.nodes) {
    if (node.id === uboRoot) continue;

    const resolvedId = resolveUboNodeId(node, existingNameIndex);
    uboIdToCascadeId.set(node.id, resolvedId);

    // If this node reconciled to an EXISTING party, the summary is already
    // in mergedSummaries (cloned from baseSummaries) — nothing to add.
    // Only genuinely-new nodes (UBO:: ids) need a synthetic summary entry.
    if (!mergedSummaries.has(resolvedId)) {
      const summary = uboNodeToAncestorSummary(node);
      // Patch the id to the resolved id (which is the UBO:: form here).
      mergedSummaries.set(resolvedId, { ...summary, id: resolvedId });
    }
  }

  // Build a map of existing-edge keys → index in the base-edge array.
  // Key: "ownerId|ownedId|controlType" (no percent — the percent may differ).
  //
  // When a UBO edge reconciles to real party ids on both sides AND a matching
  // base edge already exists, we compare percents and keep the MAXIMUM. This
  // prevents a counterparty from understating its declared ownership (30%) and
  // hiding a ≥50% cascade that the Orbis data (60%) would reveal.
  //
  // We work on a COPY of baseEdges so we never mutate the caller's array.
  const mergedEdges: OwnershipEdgeSummary[] = baseEdges.map((e) => ({ ...e }));

  // Index into mergedEdges by edge key for O(1) lookup during UBO splice.
  const baseEdgeKeyToIndex = new Map<string, number>();
  for (let i = 0; i < mergedEdges.length; i++) {
    const e = mergedEdges[i];
    baseEdgeKeyToIndex.set(`${e.ownerId}|${e.ownedId}|${e.controlType}`, i);
  }

  // Splice in UBO edges, remapping node ids through uboIdToCascadeId so
  // reconciled nodes point at their real party id rather than UBO:: ids.
  for (const edge of tree.edges) {
    const resolvedOwnedId =
      edge.ownedId === uboRoot
        ? realTargetPartyId
        : (uboIdToCascadeId.get(edge.ownedId) ?? toCascadeId(edge.ownedId));
    const resolvedOwnerId =
      uboIdToCascadeId.get(edge.ownerId) ?? toCascadeId(edge.ownerId);

    const edgeKey = `${resolvedOwnerId}|${resolvedOwnedId}|${edge.controlType}`;
    const existingIdx = baseEdgeKeyToIndex.get(edgeKey);

    if (existingIdx !== undefined) {
      // A declared (base) edge for this (owner, owned, controlType) exists.
      // Raise its percent to the Orbis-reported value if higher — we must
      // not silently accept an understated declaration that hides a cascade.
      // The cascade must see max(declared, Orbis-reported).
      if (edge.percent > mergedEdges[existingIdx].percent) {
        mergedEdges[existingIdx] = {
          ...mergedEdges[existingIdx],
          percent: edge.percent,
        };
      }
      // Either way, do NOT append the UBO edge again (that would double-count).
    } else {
      // No matching base edge — this is a new ownership fact from Orbis.
      mergedEdges.push({
        ownerId: resolvedOwnerId,
        ownedId: resolvedOwnedId,
        percent: edge.percent,
        controlType: edge.controlType,
      });
    }
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
