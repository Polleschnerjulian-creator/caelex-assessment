// src/lib/trade/intake/derive-relevant-attributes.ts
import {
  CONTROL_LIST_CROSS_WALK,
  type AttributeName,
} from "@/lib/comply-v2/trade/classification/control-list-cross-walk";
import { decisivenessRank } from "./decisiveness";

/** Two itemClass strings are on the same branch when one is a prefix of the
 *  other (bidirectional) — handles the corpus's varied prefix depths. */
function classMatches(canonical: string, predicateValue: string): boolean {
  return (
    canonical === predicateValue ||
    canonical.startsWith(predicateValue + ".") ||
    predicateValue.startsWith(canonical + ".")
  );
}

const cache = new Map<string, AttributeName[]>();

/** The union of every non-itemClass AttributeName referenced in a predicate of
 *  any corpus entry whose itemClass-prefix gate bidirectionally matches
 *  `canonicalItemClass`, ordered by decisiveness rank (desc). Memoized. */
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
