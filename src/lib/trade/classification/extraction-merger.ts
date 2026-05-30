/**
 * Caelex Trade — Regex + Vision Extraction Merger (M1-1A).
 *
 * Pure function that combines the output of the Z4a regex datasheet
 * extractor with the M1-1A Claude Vision extractor. The merger codifies
 * the trust hierarchy:
 *
 *   1. Regex matches are PRECISION-FIRST — when they fire, they're
 *      reliable (designed to favour false negatives over false
 *      positives). So when BOTH sources agree on a value, regex wins
 *      as the primary source.
 *
 *   2. Vision is RECALL-FIRST — it catches values in tables, scanned
 *      PDFs, and unusual phrasings the regex misses. When only Vision
 *      has a value, emit it as the primary source with whatever
 *      confidence Claude assigned.
 *
 *   3. DISAGREEMENTS are surfaced — when both sources have a value but
 *      they don't agree (within numeric tolerance), emit the regex
 *      value as primary AND attach Vision's claim in `alternateValue`,
 *      plus a warning. The UI flags this for operator review.
 *
 * The merger is a PURE function — no I/O, no server-only — so it can be
 * tested with synthetic inputs and re-used wherever a regex + Vision
 * pair needs to be reconciled.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  DatasheetExtraction,
  EvidenceSpan,
} from "@/lib/trade/datasheet-extractor";
import type { AttributeName } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";
import type {
  AttributeConfidence,
  VisionAttribute,
} from "./claude-vision-extractor.server";

// ─── Output shape ──────────────────────────────────────────────────────

/** Which extractor produced the primary value for an attribute. */
export type ExtractionSource = "regex" | "vision";

/** A single merged attribute — what the UI renders per row. */
export interface MergedAttribute {
  attribute: AttributeName;
  /** Primary value (the one the matcher should consume). */
  value: number | boolean | string;
  /** Which extractor produced the primary value. */
  source: ExtractionSource;
  /** Confidence of the primary value. Regex is always "high"
   *  (precision-by-design); Vision passes through its own assessment. */
  confidence: AttributeConfidence;
  /** Human-readable provenance — for regex: "Datasheet quote: <…>";
   *  for vision: Claude's one-sentence reason. */
  reasoning: string;
  /** When both sources had a value but disagreed, this carries the
   *  other extractor's claim so the UI can show "Vision said X". */
  alternateValue?: {
    value: number | boolean | string;
    source: ExtractionSource;
    confidence: AttributeConfidence;
    reasoning: string;
  };
}

/** The full merger output, ready for the UI + matcher. */
export interface MergedExtraction {
  attributes: MergedAttribute[];
  /** Regex evidence spans, kept for the side-by-side PDF viewer. */
  regexEvidence: EvidenceSpan[];
  /** Warnings from Claude (e.g. "this PDF looks scanned") + merger-
   *  produced warnings (e.g. "regex and Vision disagreed on payloadKg"). */
  warnings: string[];
  /** Set when the regex pipeline failed entirely. */
  regexParseError?: string;
  /** Set when the Vision pipeline failed entirely. */
  visionError?: string;
}

/** Tolerance for numeric agreement — 5% relative error covers minor
 *  unit-conversion drift (mm vs m rounding) without masking real
 *  disagreement on order-of-magnitude values. */
export const NUMERIC_AGREEMENT_TOLERANCE = 0.05;

// ─── Merger ────────────────────────────────────────────────────────────

export interface MergerInput {
  /** Output of the regex extractor (`extractDatasheet`). Pass null when
   *  the regex pipeline never ran (e.g. PDF couldn't be parsed). */
  regex: DatasheetExtraction | null;
  /** Output of the Vision extractor. Pass null when Vision was skipped
   *  or failed. */
  vision: VisionAttribute[] | null;
  /** Warnings from the Vision extractor, passed through unchanged. */
  visionWarnings?: string[];
  /** Error string from the Vision extractor (when it failed). */
  visionError?: string;
}

export function mergeExtractions(input: MergerInput): MergedExtraction {
  const regexAttrs = extractRegexAttributes(input.regex);
  const visionByName = new Map<AttributeName, VisionAttribute>();
  if (input.vision) {
    for (const v of input.vision) visionByName.set(v.attribute, v);
  }

  const merged: MergedAttribute[] = [];
  const warnings: string[] = [...(input.visionWarnings ?? [])];

  // First pass: every regex attribute. Pair with vision when present.
  for (const [name, regexEntry] of regexAttrs) {
    const visionEntry = visionByName.get(name);
    if (!visionEntry) {
      merged.push({
        attribute: name,
        value: regexEntry.value,
        source: "regex",
        confidence: "high",
        reasoning: regexEntry.reasoning,
      });
      continue;
    }
    // Both sources have it — check agreement.
    if (valuesAgree(regexEntry.value, visionEntry.value)) {
      merged.push({
        attribute: name,
        value: regexEntry.value,
        source: "regex",
        confidence: "high",
        reasoning: `${regexEntry.reasoning} (Vision agreed)`,
      });
    } else {
      // Disagreement → regex wins as primary, vision attached.
      warnings.push(
        `Regex und Vision differieren bei ${name}: ${formatVal(regexEntry.value)} (Regex) vs ${formatVal(visionEntry.value)} (Vision). Bitte manuell prüfen.`,
      );
      merged.push({
        attribute: name,
        value: regexEntry.value,
        source: "regex",
        confidence: "high",
        reasoning: regexEntry.reasoning,
        alternateValue: {
          value: visionEntry.value,
          source: "vision",
          confidence: visionEntry.confidence,
          reasoning: visionEntry.reasoning,
        },
      });
    }
    visionByName.delete(name);
  }

  // Second pass: vision-only attributes (regex didn't catch them).
  for (const v of visionByName.values()) {
    merged.push({
      attribute: v.attribute,
      value: v.value,
      source: "vision",
      confidence: v.confidence,
      reasoning: v.reasoning,
    });
  }

  // Sort: regex-first (most trusted), then vision; within group by
  // attribute-name for stable rendering.
  merged.sort((a, b) => {
    if (a.source !== b.source) return a.source === "regex" ? -1 : 1;
    return a.attribute.localeCompare(b.attribute);
  });

  return {
    attributes: merged,
    regexEvidence: input.regex?.evidence ?? [],
    warnings,
    regexParseError: input.regex?.parseError,
    visionError: input.visionError,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────

interface RegexAttributeEntry {
  value: number | boolean | string;
  reasoning: string;
}

/** Pull (name, value, evidence-quote) tuples out of a DatasheetExtraction.
 *  Walks the regex-extractor's `attributes` bag AND the embedded
 *  `parametricAttributes` extended bag, joining each to its
 *  `EvidenceSpan` to assemble a `reasoning` string. */
function extractRegexAttributes(
  ds: DatasheetExtraction | null,
): Map<AttributeName, RegexAttributeEntry> {
  const out = new Map<AttributeName, RegexAttributeEntry>();
  if (!ds) return out;

  // Index evidence by attribute for O(1) lookup.
  const evByAttr = new Map<AttributeName, EvidenceSpan>();
  for (const e of ds.evidence) evByAttr.set(e.attribute, e);

  // Top-level attributes on the bag.
  const bag = ds.attributes as Record<string, unknown>;
  for (const [key, val] of Object.entries(bag)) {
    if (key === "parametricAttributes") continue;
    if (val === null || val === undefined) continue;
    if (
      typeof val !== "number" &&
      typeof val !== "boolean" &&
      typeof val !== "string"
    ) {
      continue;
    }
    const ev = evByAttr.get(key as AttributeName);
    out.set(key as AttributeName, {
      value: val,
      reasoning: ev
        ? `Datasheet quote: "${ev.quote}"`
        : `Regex match (no quote captured)`,
    });
  }

  // Extended-vocabulary attributes (Z3e / Z25 / Z34c) live in
  // parametricAttributes. They never landed in top-level bag fields,
  // but the regex extractor records them under the same `AttributeName`
  // keys inside the JSON sub-bag.
  const ext = (
    ds.attributes as { parametricAttributes?: Record<string, unknown> }
  ).parametricAttributes;
  if (ext) {
    for (const [key, val] of Object.entries(ext)) {
      if (val === null || val === undefined) continue;
      if (
        typeof val !== "number" &&
        typeof val !== "boolean" &&
        typeof val !== "string"
      ) {
        continue;
      }
      const ev = evByAttr.get(key as AttributeName);
      out.set(key as AttributeName, {
        value: val,
        reasoning: ev
          ? `Datasheet quote: "${ev.quote}"`
          : `Regex match (parametric — no quote)`,
      });
    }
  }

  return out;
}

/** True if two extraction values agree.
 *
 *  Numbers: within `NUMERIC_AGREEMENT_TOLERANCE` relative error (or 1e-9
 *  absolute when one side is 0). Booleans + strings: strict equality
 *  (case-insensitive for strings). */
export function valuesAgree(
  a: number | boolean | string,
  b: number | boolean | string,
): boolean {
  if (typeof a !== typeof b) return false;
  if (typeof a === "number" && typeof b === "number") {
    if (a === 0 && b === 0) return true;
    const denom = Math.max(Math.abs(a), Math.abs(b));
    return denom === 0
      ? Math.abs(a - b) < 1e-9
      : Math.abs(a - b) / denom <= NUMERIC_AGREEMENT_TOLERANCE;
  }
  if (typeof a === "boolean" && typeof b === "boolean") {
    return a === b;
  }
  if (typeof a === "string" && typeof b === "string") {
    return a.toLowerCase().trim() === b.toLowerCase().trim();
  }
  return false;
}

function formatVal(v: number | boolean | string): string {
  if (typeof v === "number") return v.toString();
  if (typeof v === "boolean") return v ? "ja" : "nein";
  return JSON.stringify(v);
}

// ─── Vision-skip predicate ─────────────────────────────────────────────

/**
 * Returns true when the Vision extractor can be safely skipped because
 * the regex extractor already produced a strong, complete result.
 *
 * Vision's primary value is RECALL: catching attributes in tables,
 * scanned PDFs, or unusual phrasings that regex misses. It is only safe
 * to skip Vision when regex is clearly sufficient — i.e. the PDF parsed
 * cleanly (so regex was not blind) AND the extraction is non-trivial
 * with the key classification anchor (itemClass) present.
 *
 * Skip predicate — ALL of the following must hold:
 *   1. `regex` is non-null.
 *   2. `regex.parseError` is falsy — if the PDF failed to parse, regex
 *      extracted nothing from a scanned/encrypted document; Vision's
 *      image-based recall is essential in that case.
 *   3. `itemClass` is present in the attributes bag — it is the keystone
 *      attribute that drives classification. If regex missed itemClass,
 *      Vision should run regardless of how many other attrs were found.
 *   4. Total extracted attributes (top-level keys excluding
 *      `parametricAttributes`, plus all keys inside
 *      `parametricAttributes`) is at least 3. This threshold is
 *      deliberately conservative: a single attribute hit (or two) is too
 *      thin a basis to declare the regex result "complete"; we need at
 *      least itemClass + 2 supporting attributes.
 *
 * Trade-off note: skipping Vision saves one Claude call (~$0.02,
 * 8–25 s) but forgoes Vision's table/scanned-PDF recall. The threshold
 * is conservative so Vision still runs on weak or parse-failed extractions
 * where its recall is genuinely valuable. A future enhancement could let
 * the operator force Vision via a `forceVision` query param.
 */
export function shouldSkipVision(regex: DatasheetExtraction | null): boolean {
  // Rule 1: need an actual extraction object.
  if (regex === null) return false;

  // Rule 2: scanned/encrypted PDFs parse cleanly for Vision but not for
  // text-based regex; if parseError is set, Vision must run.
  if (regex.parseError) return false;

  const bag = regex.attributes as Record<string, unknown>;

  // Rule 3: itemClass is the classification keystone — without it Vision
  // should run even if other parametric attributes were found.
  if (!bag.itemClass) return false;

  // Rule 4: count all extracted attributes.
  //   Top-level bag keys (excluding the nested parametricAttributes map).
  const topLevel = Object.keys(bag).filter(
    (k) =>
      k !== "parametricAttributes" && bag[k] !== undefined && bag[k] !== null,
  ).length;

  //   Extended-vocabulary attributes stored inside parametricAttributes.
  const parametric =
    bag.parametricAttributes != null
      ? Object.keys(bag.parametricAttributes as object).length
      : 0;

  const totalAttributes = topLevel + parametric;

  // Require at least 3 total attributes (inclusive of itemClass).
  // This ensures the regex result is non-trivial before we skip Vision.
  return totalAttributes >= 3;
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
