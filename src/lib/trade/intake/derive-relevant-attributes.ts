// src/lib/trade/intake/derive-relevant-attributes.ts
import {
  CONTROL_LIST_CROSS_WALK,
  type AttributeName,
} from "@/lib/comply-v2/trade/classification/control-list-cross-walk";
import { decisivenessRank } from "./decisiveness";

/** B15 — MATCHER-DIRECTION class match. The parametric matcher's itemClass
 *  `prefix` op is UNIDIRECTIONAL: an entry matches iff the operator's canonical
 *  class STARTS WITH the predicate value (`actual.startsWith(value)`), i.e. the
 *  predicate value is a prefix of (or equal to) the canonical class. So an
 *  entry whose gate is DEEPER than `canonical` (e.g. `gnss.receiver.antijam`
 *  vs a `gnss.receiver` item) can NEVER fire for that item — deriving its
 *  fields would ask the operator for an attribute the matcher cannot gate on.
 *
 *  We therefore mirror the matcher exactly: `canonical === value` OR `canonical`
 *  starts with `value + "."` (dot-boundary so `gnss.r` does not match
 *  `gnss.receiver`). The reverse direction (predicate value deeper than
 *  canonical) is deliberately dropped — that is the bidirectional leak. */
function classMatches(canonical: string, predicateValue: string): boolean {
  return (
    canonical === predicateValue || canonical.startsWith(predicateValue + ".")
  );
}

const cache = new Map<string, AttributeName[]>();

/** The union of every non-itemClass AttributeName referenced in a predicate of
 *  any corpus entry whose itemClass-prefix gate is MATCHER-REACHABLE from
 *  `canonicalItemClass` (the gate value is a prefix of, or equal to, the class
 *  — see `classMatches`), ordered by decisiveness rank (desc). Memoized. */
export function deriveRelevantAttributes(
  canonicalItemClass: string,
): AttributeName[] {
  const hit = cache.get(canonicalItemClass);
  if (hit) return hit;

  const set = new Set<AttributeName>();
  for (const entry of CONTROL_LIST_CROSS_WALK) {
    const gate = entry.predicates.find(
      (p) =>
        p.attribute === "itemClass" &&
        p.op === "prefix" &&
        typeof p.value === "string",
    );
    if (!gate || !classMatches(canonicalItemClass, gate.value as string))
      continue;
    for (const p of entry.predicates) {
      if (p.attribute !== "itemClass") set.add(p.attribute);
    }
  }
  const ordered = [...set].sort(
    (a, b) => decisivenessRank(b) - decisivenessRank(a),
  );
  cache.set(canonicalItemClass, ordered);
  return ordered;
}
