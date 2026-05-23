/**
 * Caelex Trade — BOM Classification Orchestrator.
 *
 * Sprint Z3p.
 *
 * Combines the parametric matcher (Z3l bridge) with the see-through
 * propagation engine (Z3o) into a single composable operation. Given
 * a parent item plus its direct children, this service:
 *
 *   1. Runs `classifyTradeItemParametric` on every node
 *   2. Derives jurisdiction tags from each matcher result
 *   3. Propagates ITAR / EU Annex IV up the BOM via
 *      `propagateSeeThroughITAR`
 *   4. Returns a combined view: per-node matcher result + the
 *      parent's final jurisdiction set + the see-through audit trail
 *
 * Scope: single-level BOM (parent + direct children). Recursive
 * multi-level walking is deferred to a future sprint when the
 * `TradeBomEdge` schema lands. The single-level form is what the
 * canonical XV(e)(17) hosted-payload scenario needs.
 *
 * This is a pure function with no I/O — Prisma-bound callers do the
 * loading and pass in plain objects at the boundary.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  classifyTradeItemParametric,
  type TradeItemParametricSnapshot,
} from "./item-parametric-classification";
import {
  propagateSeeThroughITAR,
  type BOMNode,
  type JurisdictionTag,
  type PropagationEvent,
} from "./see-through-propagation";
import type { MatcherResult } from "@/lib/comply-v2/trade/classification/parametric-matcher";
import type { RegimeName } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Input shape — a BOM node carrying the matcher snapshot plus an
 * `itemId` and `name` for stable identity in the result trail. The
 * optional `preClassifiedJurisdictions` lets the operator override
 * the matcher-derived classification (e.g. attorney opinion, BAFA
 * Auskunft zur Güterliste).
 */
export interface BOMItemInput extends TradeItemParametricSnapshot {
  itemId: string;
  name: string;
  /**
   * Operator-asserted jurisdictions, when known. If provided, they
   * UNION with matcher-derived tags. Useful for items where the
   * regulatory determination is already locked in by a binding ruling.
   */
  preClassifiedJurisdictions?: JurisdictionTag[];
  /**
   * Explicit XV(e)(17) marker. Useful when the operator has manually
   * confirmed the hosted-payload classification — propagates a more
   * specific rationale string.
   */
  isXVe17HostedPayload?: boolean;
}

export interface NodeClassification {
  itemId: string;
  name: string;
  matcherResult: MatcherResult;
  /**
   * Jurisdictions assigned to this node BEFORE see-through propagation.
   * Union of pre-classified + matcher-derived.
   */
  initialJurisdictions: JurisdictionTag[];
}

export interface BOMClassificationResult {
  /** Classification for the parent node. */
  parent: NodeClassification & {
    /** Jurisdictions AFTER see-through propagation. */
    finalJurisdictions: JurisdictionTag[];
    /** See-through audit trail (which child propagated what). */
    seeThroughTrail: PropagationEvent[];
    /** Convenience flag — parent inherited ITAR from any child. */
    itarInherited: boolean;
  };
  /** Classification for each child node. */
  children: NodeClassification[];
  /** Always emitted — operator review is required. */
  disclaimer: string;
}

// ─── Mapping: matcher regime → jurisdiction tag ─────────────────────

const REGIME_TO_JURISDICTION: Record<RegimeName, JurisdictionTag | null> = {
  "EAR-CCL": "EAR",
  "ITAR-USML": "ITAR",
  "EU-ANNEX-I": "EU_DUAL_USE",
  "DE-AL-TEIL-IB": "EU_DUAL_USE", // German national list is EU 2021/821-derived
  "JP-METI": null, // Japan METI Schedule 1/2 — no first-class JAPAN tag yet; propagation handled at the regime layer until a Z36 JAPAN_NATIONAL tag is added
  "MTCR-ANNEX": "MTCR",
  WASSENAAR: "WASSENAAR",
  NSG: null, // Nuclear Suppliers Group — no first-class jurisdiction tag
  OTHER: null,
};

const ORCHESTRATOR_DISCLAIMER =
  "BOM classification combines parametric matcher output (Z3c-Z3m) with ITAR see-through propagation (Z3o). Both stages are SCREENING-LEVEL guidance — final classification of a host product requires a qualified compliance officer's review, especially for see-through scenarios where ITAR jurisdiction crosses BOM boundaries with no de minimis carve-out.";

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * Classify a single-level BOM (parent + direct children) end-to-end.
 *
 * Steps:
 *   1. Run matcher on parent and every child.
 *   2. Derive jurisdiction tags from each matcher result.
 *   3. Combine with operator-asserted pre-classifications.
 *   4. Run see-through propagation: children → parent.
 *   5. Return combined view.
 */
export function classifyBOM(
  parent: BOMItemInput,
  children: BOMItemInput[],
): BOMClassificationResult {
  // Step 1+2+3 — classify every node and derive its jurisdiction tags.
  const parentNode = classifyAndDerive(parent);
  const childNodes = children.map(classifyAndDerive);

  // Step 4 — see-through propagation. Build the BOMNode shapes the
  // propagation engine expects (just the jurisdiction-relevant fields).
  const propagationInput: BOMNode = {
    itemId: parentNode.itemId,
    name: parentNode.name,
    jurisdictionTags: parentNode.initialJurisdictions,
    isXVe17HostedPayload: parent.isXVe17HostedPayload,
  };
  const propagationChildren: BOMNode[] = childNodes.map((cn, idx) => ({
    itemId: cn.itemId,
    name: cn.name,
    jurisdictionTags: cn.initialJurisdictions,
    isXVe17HostedPayload: children[idx].isXVe17HostedPayload,
  }));

  const propagated = propagateSeeThroughITAR(
    propagationInput,
    propagationChildren,
  );

  return {
    parent: {
      ...parentNode,
      finalJurisdictions: propagated.parent.jurisdictionTags,
      seeThroughTrail: propagated.trail,
      itarInherited: propagated.itarInherited,
    },
    children: childNodes,
    disclaimer: ORCHESTRATOR_DISCLAIMER,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function classifyAndDerive(input: BOMItemInput): NodeClassification {
  const matcherResult = classifyTradeItemParametric(input);
  const matcherDerived = deriveJurisdictionsFromMatcher(matcherResult);
  const preAsserted = input.preClassifiedJurisdictions ?? [];
  const initialJurisdictions = mergeJurisdictions([
    ...preAsserted,
    ...matcherDerived,
  ]);
  return {
    itemId: input.itemId,
    name: input.name,
    matcherResult,
    initialJurisdictions,
  };
}

/**
 * Map the matcher's candidates (full matches only — possibleMatches
 * and nearMisses don't yet count as a classification) to jurisdiction
 * tags. Empty candidate list → UNKNOWN tag.
 *
 * Exported for testability.
 */
export function deriveJurisdictionsFromMatcher(
  result: MatcherResult,
): JurisdictionTag[] {
  if (result.candidates.length === 0) return ["UNKNOWN"];
  const tags = new Set<JurisdictionTag>();
  for (const candidate of result.candidates) {
    const tag = REGIME_TO_JURISDICTION[candidate.entry.regime];
    if (tag !== null) tags.add(tag);
  }
  // If every candidate mapped to null (NSG, OTHER), still surface
  // UNKNOWN so downstream sees the matcher couldn't pin a jurisdiction.
  if (tags.size === 0) return ["UNKNOWN"];
  return Array.from(tags);
}

function mergeJurisdictions(tags: JurisdictionTag[]): JurisdictionTag[] {
  const set = new Set(tags);
  // If we have any concrete tag, drop UNKNOWN — we know something.
  if (set.size > 1 && set.has("UNKNOWN")) {
    set.delete("UNKNOWN");
  }
  return Array.from(set);
}
