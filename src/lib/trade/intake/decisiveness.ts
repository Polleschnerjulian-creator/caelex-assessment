// src/lib/trade/intake/decisiveness.ts
import {
  CONTROL_LIST_CROSS_WALK,
  type AttributeName,
} from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

const THRESHOLD_OPS = new Set(["lt", "lte", "gt", "gte", "between"]);
const HARD_REGIMES = new Set(["ITAR-USML", "MTCR-ANNEX"]);

const cache = new Map<AttributeName, number>();

/** Weight an attribute by how decisive it is: +1 per entry it appears in,
 *  +2 more when it appears with a THRESHOLD op, +3 more when that entry is a
 *  hard regime (ITAR/MTCR). Pure read over the corpus, memoized. */
export function decisivenessRank(attribute: AttributeName): number {
  const hit = cache.get(attribute);
  if (hit !== undefined) return hit;

  let rank = 0;
  for (const entry of CONTROL_LIST_CROSS_WALK) {
    for (const p of entry.predicates) {
      if (p.attribute !== attribute) continue;
      rank += 1;
      if (THRESHOLD_OPS.has(p.op)) rank += 2;
      if (HARD_REGIMES.has(entry.regime)) rank += 3;
    }
  }
  cache.set(attribute, rank);
  return rank;
}
