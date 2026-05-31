import {
  matchAgainstCrossWalk,
  type ItemAttributeBag,
  type MatchConfidence,
} from "@/lib/comply-v2/trade/classification/parametric-matcher";

/**
 * A single extracted attribute (the subset of VisionAttribute / MergedAttribute
 * this module needs). `attribute` is an AttributeName whose values are exactly
 * the ItemAttributeBag keys.
 */
export interface SuggestInputAttribute {
  attribute: string;
  value: number | boolean | string;
  confidence: "high" | "medium" | "low";
}

/** A UI-friendly classification-code suggestion derived from the matcher. */
export interface CodeSuggestion {
  /** The control code, e.g. "9A515.a.1" (canonicalId minus the regime prefix). */
  code: string;
  /** Full stable id, e.g. "ECCN:9A515.a.1". */
  canonicalId: string;
  regime: string;
  title: string;
  confidence: MatchConfidence;
  rationale: string;
}

/**
 * The ItemAttributeBag keys we accept from extracted attributes. Anything not in
 * this set is ignored (kept out of the typed bag) — the matcher only reads these.
 */
const BAG_KEYS = new Set<keyof ItemAttributeBag>([
  "apertureMeters",
  "payloadKg",
  "rangeKm",
  "IspSeconds",
  "deltaVMetersPerSecond",
  "gsdMeters",
  "transmitPowerW",
  "frequencyGhz",
  "radHardTidKrad",
  "seuRateErrorsPerBitDay",
  "isRadHardened",
  "isMilSpec",
  "isAntiJam",
  "isSpeciallyDesigned",
  "itemClass",
]);

/** Fold extracted attributes into the matcher's ItemAttributeBag. */
export function attributesToBag(
  attributes: ReadonlyArray<SuggestInputAttribute>,
): ItemAttributeBag {
  const bag: ItemAttributeBag = {};
  for (const a of attributes) {
    if (BAG_KEYS.has(a.attribute as keyof ItemAttributeBag)) {
      (bag as Record<string, unknown>)[a.attribute] = a.value;
    }
  }
  return bag;
}

/**
 * Pure: run extracted attributes through the parametric matcher and map its
 * ranked candidates to UI suggestions. No I/O. Empty in → empty out.
 */
export function attributesToCandidateCodes(
  attributes: ReadonlyArray<SuggestInputAttribute>,
): CodeSuggestion[] {
  const bag = attributesToBag(attributes);
  const result = matchAgainstCrossWalk(bag);
  return result.candidates.map((c) => {
    const canonicalId = c.entry.canonicalId;
    const code = canonicalId.includes(":")
      ? canonicalId.slice(canonicalId.indexOf(":") + 1)
      : canonicalId;
    return {
      code,
      canonicalId,
      regime: String(c.entry.regime),
      title: c.entry.title,
      confidence: c.confidence,
      rationale: c.rationale,
    };
  });
}
