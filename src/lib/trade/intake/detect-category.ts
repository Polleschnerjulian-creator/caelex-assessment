// src/lib/trade/intake/detect-category.ts
import { PRODUCT_CATEGORIES, type ProductCategory } from "./product-categories";

export interface CategoryRanking {
  id: string;
  category: ProductCategory;
  score: number;
}

/** Score each category by: +100 if the extracted itemClass prefix-matches its
 *  canonicalItemClass; +N synonym hits in the free text. Returns descending,
 *  positive-score categories only — NEVER decides (the operator confirms). */
export function rankCategories(input: {
  itemClass: string | null;
  text: string;
}): CategoryRanking[] {
  const text = (input.text ?? "").toLowerCase();
  const cls = input.itemClass ?? "";
  const ranked = PRODUCT_CATEGORIES.map((category) => {
    let score = 0;
    // The generic "Andere" fallback (B11) carries no corpus class and no
    // synonyms — it is a deliberate operator escape hatch, never an auto-ranked
    // detection target, so it scores 0 and is filtered out below.
    const itemClass = category.canonicalItemClass;
    // B16 — DOT-BOUNDARY guard, mirroring the sibling
    // `isCanonicalItemClassPrefix` (canonical-item-classes.ts). A bare
    // `startsWith` with no segment boundary lets a class that is a non-dot
    // prefix of another score a false +100 (e.g. "spacecraft.adcs.star"
    // matching "spacecraft.adcs.star_tracker"). Only an exact class or a true
    // dot-boundary ancestor/descendant counts.
    const exact = !!itemClass && !!cls && cls === itemClass;
    if (
      itemClass &&
      cls &&
      (exact ||
        cls.startsWith(itemClass + ".") ||
        itemClass.startsWith(cls + "."))
    ) {
      score += 100;
    }
    for (const syn of category.synonyms)
      if (text.includes(syn.toLowerCase())) score += 10;
    return { id: category.id, category, score, exact };
  })
    .filter((r) => r.score > 0)
    // Descending by score; on a tie, prefer the category whose class EXACTLY
    // equals the extracted class over a mere dot-boundary ancestor/descendant.
    .sort((a, b) => b.score - a.score || Number(b.exact) - Number(a.exact))
    .map(({ id, category, score }) => ({ id, category, score }));
  return ranked;
}
