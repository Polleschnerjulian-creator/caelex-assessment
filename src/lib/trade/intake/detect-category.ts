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
    if (
      cls &&
      (cls === category.canonicalItemClass ||
        cls.startsWith(category.canonicalItemClass) ||
        category.canonicalItemClass.startsWith(cls))
    ) {
      score += 100;
    }
    for (const syn of category.synonyms)
      if (text.includes(syn.toLowerCase())) score += 10;
    return { id: category.id, category, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked;
}
