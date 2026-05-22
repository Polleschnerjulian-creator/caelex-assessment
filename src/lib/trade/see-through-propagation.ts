/**
 * Caelex Trade — ITAR see-through rule propagation.
 *
 * Sprint Z3o.
 *
 * Per ITAR § 123.1(b), USML-controlled components carry their ITAR
 * jurisdiction across host-product boundaries with NO de minimis
 * carve-out. A foreign-made satellite incorporating ANY USML XV
 * defense article (including an XV(e)(17) hosted payload) is itself
 * ITAR-controlled in its entirety. The 2014 ECR moved most commercial
 * items to 9x515 where the EAR's 25% de minimis applies (10% for
 * Country Group D:5 destinations) — but the see-through rule remains
 * the asymmetric exception: ITAR poison still propagates.
 *
 * This module implements the pure-function side of the see-through
 * propagation. Inputs are a parent node and an array of child nodes;
 * outputs are the updated parent with inherited jurisdiction tags and
 * a trail of which children caused the inheritance.
 *
 * Scope: this sprint ships the engine only. A `BOM` schema model with
 * `TradeBomEdge` is a separate sprint (Z12-Z13 stack). When that lands,
 * the engine here gets wired into a recursive walker that operates
 * over the persisted graph; today, callers pass in their own
 * pre-loaded array.
 *
 * Closes ontology research caveat #5: "The see-through rule (ITAR
 * § 123.1(b)) means a foreign-built satellite incorporating any USML
 * XV defense article (including an XV(e)(17) hosted payload) is
 * ITAR-controlled throughout. The classifier must propagate ITAR
 * jurisdiction across bill-of-materials boundaries."
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Single-letter jurisdiction tag attached to a BOM node. The engine
 * uses these to decide propagation — ITAR poisons up, EAR does not.
 */
export type JurisdictionTag =
  | "ITAR" // 22 CFR USML — propagates up via see-through rule
  | "EAR" // 15 CFR CCL — does NOT propagate via see-through rule
  | "EU_DUAL_USE" // EU Reg. 2021/821 Annex I — no see-through, has de minimis
  | "EU_ANNEX_IV" // EU Reg. 833/2014 Art. 2b — hard prohibition (Z2b)
  | "MTCR" // Multilateral missile-technology
  | "WASSENAAR" // Wassenaar Arrangement
  | "UNKNOWN"; // operator hasn't classified yet

/**
 * Minimum shape for a BOM node. Callers can extend with whatever
 * application-specific fields they need; the propagation engine only
 * touches the fields listed here.
 */
export interface BOMNode {
  /** Stable identifier for the item. Used in the propagation trail. */
  itemId: string;
  /** Human-readable name. Used in operator-facing rationale strings. */
  name: string;
  /**
   * Jurisdictions currently attached to this node. The engine reads
   * these to decide propagation and writes back the inherited set in
   * the returned node.
   */
  jurisdictionTags: JurisdictionTag[];
  /**
   * Whether this node carries an XV(e)(17) hosted-payload designation.
   * Optional; mostly informational since `ITAR` in jurisdictionTags
   * is already sufficient to trigger propagation, but XV(e)(17) gets
   * a more specific rationale string when it fires.
   */
  isXVe17HostedPayload?: boolean;
}

/**
 * Single propagation event — one child caused the parent to inherit a
 * jurisdiction. The trail is the operator-facing audit log.
 */
export interface PropagationEvent {
  /** ID of the child that propagated. */
  childItemId: string;
  childName: string;
  /** The jurisdiction the parent inherited from this child. */
  inheritedJurisdiction: JurisdictionTag;
  /** Plain-language explanation for the operator UI. */
  rationale: string;
}

export interface SeeThroughResult {
  /**
   * Updated parent node with all inherited jurisdiction tags. The
   * tags are union-merged with the parent's pre-existing tags
   * (no duplicates).
   */
  parent: BOMNode;
  /** Audit trail — one event per inherited jurisdiction edge. */
  trail: PropagationEvent[];
  /** True when ITAR was inherited from at least one child. */
  itarInherited: boolean;
  /** Always emitted — operator review is required for see-through cases. */
  disclaimer: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const SEE_THROUGH_DISCLAIMER =
  "ITAR see-through rule applies under 22 CFR § 123.1(b). A host product incorporating any USML defense article is ITAR-controlled throughout, with no de minimis carve-out. Removal of the article is a 'retransfer' requiring DDTC authorization. This output is SCREENING-LEVEL GUIDANCE; the final jurisdiction determination requires a qualified compliance officer.";

/**
 * Jurisdictions that propagate up the BOM. ITAR is the canonical
 * propagating jurisdiction per § 123.1(b). EU Annex IV (Reg. 833/2014
 * Art. 2b) is added because Art. 2b's hard-prohibition gate is itself
 * a non-de-minimis rule — a host product incorporating an Annex IV
 * item destined for Russia/Belarus is itself prohibited.
 *
 * EU dual-use (Annex I) does NOT propagate this way — it carries a
 * 10% de minimis under EU 2021/821 Art. 3.
 */
const PROPAGATING_JURISDICTIONS: ReadonlySet<JurisdictionTag> = new Set([
  "ITAR",
  "EU_ANNEX_IV",
]);

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * Propagate see-through-rule jurisdictions from children to parent.
 * Pure function — no I/O, no mutation of inputs.
 *
 * The returned parent's `jurisdictionTags` is the union of:
 *   - Its own pre-existing tags
 *   - Every PROPAGATING_JURISDICTIONS tag found on any child
 *
 * Each inheritance is recorded as a `PropagationEvent` in `trail`,
 * with a child-specific rationale string. XV(e)(17) hosted payloads
 * get a more specific rationale than generic ITAR.
 */
export function propagateSeeThroughITAR(
  parent: BOMNode,
  children: BOMNode[],
): SeeThroughResult {
  const inheritedTags = new Set<JurisdictionTag>(parent.jurisdictionTags);
  const trail: PropagationEvent[] = [];
  let itarInherited = false;

  for (const child of children) {
    for (const tag of child.jurisdictionTags) {
      if (!PROPAGATING_JURISDICTIONS.has(tag)) continue;

      // Track even if the parent already has this tag — the operator
      // still wants to see WHICH children would have propagated.
      const wasAlreadyPresent = inheritedTags.has(tag);
      inheritedTags.add(tag);
      if (tag === "ITAR") itarInherited = true;

      trail.push({
        childItemId: child.itemId,
        childName: child.name,
        inheritedJurisdiction: tag,
        rationale: buildRationale(parent, child, tag, wasAlreadyPresent),
      });
    }
  }

  return {
    parent: {
      ...parent,
      jurisdictionTags: Array.from(inheritedTags),
    },
    trail,
    itarInherited,
    disclaimer: SEE_THROUGH_DISCLAIMER,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function buildRationale(
  parent: BOMNode,
  child: BOMNode,
  jurisdiction: JurisdictionTag,
  wasAlreadyPresent: boolean,
): string {
  const alreadyNote = wasAlreadyPresent
    ? ` (host already classified ${jurisdiction}; recorded for audit trail)`
    : "";

  if (jurisdiction === "ITAR") {
    if (child.isXVe17HostedPayload) {
      return `Host product "${parent.name}" inherits ITAR jurisdiction from XV(e)(17) hosted payload "${child.name}". Per 22 CFR § 123.1(b), the host bus remains EAR-classified but the payload remains ITAR — removal is a retransfer requiring DDTC authorization.${alreadyNote}`;
    }
    return `Host product "${parent.name}" inherits ITAR jurisdiction from USML defense article "${child.name}". Per 22 CFR § 123.1(b), the host is ITAR-controlled throughout with no de minimis carve-out.${alreadyNote}`;
  }

  if (jurisdiction === "EU_ANNEX_IV") {
    return `Host product "${parent.name}" inherits EU Annex IV (Reg. 833/2014 Art. 2b) controls from child item "${child.name}". Art. 2b applies a hard prohibition for Russia / Belarus destinations regardless of de minimis content.${alreadyNote}`;
  }

  // Defensive default — should be unreachable given PROPAGATING_JURISDICTIONS.
  return `Host product "${parent.name}" inherits ${jurisdiction} from child item "${child.name}".${alreadyNote}`;
}
