// src/lib/trade/intake/canonical-item-classes.ts
import { CONTROL_LIST_CROSS_WALK } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

/**
 * The distinct `itemClass` prefix VALUES the parametric corpus actually gates
 * on — computed at module load from CONTROL_LIST_CROSS_WALK, never hand-listed.
 * This is the single canonical taxonomy: the product-category catalog, the
 * datasheet extractor, and category-detection all validate against it so the
 * extractor↔corpus mismatch that caused the star-tracker bug cannot recur.
 */
export const CANONICAL_ITEM_CLASSES: ReadonlySet<string> = new Set(
  CONTROL_LIST_CROSS_WALK.flatMap((entry) =>
    entry.predicates
      .filter(
        (p) =>
          p.attribute === "itemClass" &&
          p.op === "prefix" &&
          typeof p.value === "string",
      )
      .map((p) => p.value as string),
  ),
);

/** True when `cls` is the prefix of (or equal to) >=1 real corpus itemClass. */
export function isCanonicalItemClassPrefix(cls: string): boolean {
  if (!cls) return false;
  for (const real of CANONICAL_ITEM_CLASSES) {
    if (
      real === cls ||
      real.startsWith(cls + ".") ||
      cls.startsWith(real + ".") ||
      cls === real
    ) {
      return true;
    }
  }
  return false;
}
