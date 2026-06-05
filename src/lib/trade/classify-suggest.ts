import {
  matchAgainstCrossWalk,
  type ItemAttributeBag,
  type MatchConfidence,
} from "@/lib/comply-v2/trade/classification/parametric-matcher";
import {
  buildClassificationDraft,
  type ProposedClassification,
} from "./classification-draft-builder";

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

/** Map a draft proposal → the UI's CodeSuggestion shape. */
function proposalToSuggestion(p: ProposedClassification): CodeSuggestion {
  const canonicalId = p.canonicalId;
  const code = canonicalId.includes(":")
    ? canonicalId.slice(canonicalId.indexOf(":") + 1)
    : canonicalId;
  return {
    code,
    canonicalId,
    regime: String(p.regime),
    title: p.title,
    confidence: p.confidence,
    rationale: p.rationale,
  };
}

/**
 * Rich variant for the INTERACTIVE datasheet path
 * (`/api/trade/classify/suggest-codes`). Runs the full `composeDraft`
 * pipeline — parametric candidates + best possible-match + top near-miss +
 * the DCW-1 corpus keyword fallback (only when `text` is supplied) — and maps
 * the proposals to UI suggestions.
 *
 * Confidence is propagated verbatim: only true parametric candidates reach
 * HIGH/MEDIUM. Possible-match, near-miss and keyword hints are all LOW, so the
 * honesty layer (`assessSuggestionCoverage`) renders them as "nur schwache
 * Treffer — bitte fachlich bestätigen", never as a determination.
 *
 * Why this exists separately from `attributesToCandidateCodes`: that lean
 * function is also consumed by `auto-classify-on-create`, which AUTO-WRITES
 * codes and must stay strict (HIGH/MEDIUM candidates only). The interactive
 * surface, where a human reviews every hint, can afford the wider recall.
 *
 * Pure. No I/O. Empty attributes + non-distinctive text → empty out.
 */
export function suggestionsFromAttributesAndText(
  attributes: ReadonlyArray<SuggestInputAttribute>,
  text?: string,
): CodeSuggestion[] {
  const bag = attributesToBag(attributes);
  const draft = buildClassificationDraft({
    rawText: text ?? "",
    pageCount: 1,
    attributes: bag,
    evidence: [],
  });
  return draft.proposals.map(proposalToSuggestion);
}
