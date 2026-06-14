// src/lib/trade/intake/classification-input.ts
//
// Shared, pure helper that builds the attribute input for the scoped-intake
// CLASSIFICATION call (the live `ClassificationPreview` AND the "Vorgang
// starten" / confirm suggestion path).
//
// The bug it fixes: the scoped form lets the operator pick a product class
// (e.g. Sternsensor → `spacecraft.adcs.star_tracker`) but the classification
// call never received that class's `itemClass`, so the matcher could not scope
// to the class — a 10-arcsec star tracker was suggested as 7A002.a (a gyro) on
// a coincidental numeric overlap. Injecting the chosen category's
// `canonicalItemClass` lets the matcher scope to the class, so it surfaces the
// star-tracker code instead.
//
// Fail-closed: this only makes the classifier MORE accurate (it scopes to the
// chosen class). An UNKNOWN category injects NOTHING (honest — never a
// fabricated itemClass). An explicit `itemClass` already in the scoped attrs
// WINS (no duplication, no override).
import type { SuggestInputAttribute } from "@/lib/trade/classify-suggest";
import { getCategory } from "./product-categories";

/**
 * Build the matcher input for a scoped-intake classification: the operator's
 * scoped attributes PLUS the chosen category's `canonicalItemClass` (as an
 * `itemClass` entry, prepended).
 *
 * - Unknown category → the scoped attrs are returned UNCHANGED (no itemClass
 *   fabricated).
 * - Scoped attrs already carry an `itemClass` → returned UNCHANGED (the
 *   explicit itemClass wins; no duplicate).
 *
 * Pure — no React, no I/O.
 */
export function classificationInputForCategory(
  categoryId: string,
  scopedAttrs: ReadonlyArray<SuggestInputAttribute>,
): SuggestInputAttribute[] {
  const scoped = [...scopedAttrs];
  // An explicit itemClass in the scoped attrs wins — never duplicate/override it.
  if (scoped.some((a) => a.attribute === "itemClass")) return scoped;
  const category = getCategory(categoryId);
  // Unknown category → inject nothing (honest; the matcher stays unscoped).
  if (!category) return scoped;
  return [
    {
      attribute: "itemClass",
      value: category.canonicalItemClass,
      confidence: "high",
    },
    ...scoped,
  ];
}
