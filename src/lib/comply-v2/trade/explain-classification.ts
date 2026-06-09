/**
 * Caelex Passage — the REFERENCE explanation wrapper: classification.
 *
 * `explainClassification()` is the canonical example of LAYERING the
 * Explanation Envelope (`ExplainedResult<T>`) OVER an existing engine output
 * WITHOUT changing the engine's return type. It reads the parametric matcher's
 * `MatcherResult` (control-list candidates / possible matches / near-misses)
 * and composes the six-field envelope from the already-present primitives:
 *   - WHAT       ← the top candidate's `canonicalId` + regime / title
 *   - WHY        ← the matched predicates (attribute · op · expected · actual)
 *                  + the matcher's rationale
 *   - WHEREFORE  ← what the determination means + the next action
 *   - CONFIDENCE ← the candidate's HIGH/MEDIUM/LOW band (or UNVERIFIED)
 *   - SOURCE     ← the entry `citation` + the cross-walk valid-from as the
 *                  list-version stamp
 *   - OVERRIDE   ← AI-proposed (a human applies it)
 *
 * CONSERVATIVE-BY-DESIGN (legal invariant, do not weaken):
 *   - A null / empty / no-candidate matcher result maps to confidence
 *     "UNVERIFIED" with the why "no match found — absence is NOT a clearance
 *     (eine fehlende Einstufung ist keine Freigabe)". It is NEVER mapped to a
 *     green/CLEAR — a missing classification is not a clearance.
 *   - A `possibleMatch` (a NULL attribute left a predicate unevaluated) also
 *     maps to UNVERIFIED — three-valued logic surfaced "fill in attribute X to
 *     confirm", which is not a determination.
 *   - Only a real `candidate` (every predicate satisfied, none refuted, none
 *     unknown) yields a determined HIGH/MEDIUM/LOW result.
 *
 * Pure, dependency-free (re-uses the matcher's existing types). Additive — the
 * matcher is untouched.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  CandidateMatch,
  MatchedPredicate,
  MatcherResult,
} from "./classification/parametric-matcher";
import {
  type ExplainedResult,
  type ExplainSource,
  explainedResult,
  unverifiedResult,
} from "./explained-result";

/**
 * The machine-readable `value` carried by an explained classification. A
 * structured subset of the matcher's top candidate (or null when unverified)
 * so downstream code can act on the determination without re-parsing prose.
 */
export interface ClassifiedCode {
  /** Stable control-list id, e.g. "ECCN:9A515.a.1". Null when no determination. */
  canonicalId: string | null;
  /** Regime the entry belongs to, e.g. "EAR-CCL". Null when no determination. */
  regime: string | null;
  /** Plain-language title of the matched entry. Null when no determination. */
  title: string | null;
  /** The matched predicates that drove the determination (empty when none). */
  matchedPredicates: MatchedPredicate[];
}

export type ExplainedClassification = ExplainedResult<ClassifiedCode>;

/**
 * Compose the Explanation Envelope over a parametric-matcher result.
 *
 * @param matcher  the existing `MatcherResult` (engine output, untouched). May
 *                 be `null`/`undefined` (e.g. the engine was never run) — that
 *                 is treated as an unverified determination, never a clearance.
 */
export function explainClassification(
  matcher: MatcherResult | null | undefined,
): ExplainedClassification {
  const emptyCode: ClassifiedCode = {
    canonicalId: null,
    regime: null,
    title: null,
    matchedPredicates: [],
  };

  // ── No engine result at all → fail closed. ──
  if (!matcher) {
    return unverifiedResult<ClassifiedCode>({
      value: emptyCode,
      what: "No classification could be determined.",
      why:
        "No match found — absence is NOT a clearance (eine fehlende Einstufung ist keine Freigabe). " +
        "The classification engine produced no result for this item.",
      wherefore:
        "Populate the item's technical attributes and re-run, or request a binding ruling (BAFA AzG / BIS CCATS / DDTC CJ).",
    });
  }

  const topCandidate = matcher.candidates[0];

  // ── A real, fully-satisfied candidate → a determined result. ──
  if (topCandidate) {
    return explainFromCandidate(topCandidate, matcher);
  }

  // ── Possible match (a NULL attribute left a predicate unevaluated). ──
  // Three-valued logic: this is "fill in attribute X to confirm", NOT a
  // determination. Map to UNVERIFIED — never a clearance.
  const possible = matcher.possibleMatches[0];
  if (possible) {
    const missing = Array.from(
      new Set(possible.unknownPredicates.map((u) => u.missingAttribute)),
    );
    return unverifiedResult<ClassifiedCode>({
      value: {
        canonicalId: null,
        regime: possible.entry.regime,
        title: possible.entry.title,
        matchedPredicates: possible.matchedPredicates,
      },
      what: `Possible match against ${possible.entry.canonicalId} — not yet confirmed.`,
      why:
        `${possible.rationale} ` +
        "An unverified, possible match is NOT a classification and NOT a clearance " +
        "(eine fehlende Einstufung ist keine Freigabe).",
      wherefore: `Populate the missing attribute(s) [${missing.join(", ")}] and re-run to resolve. Until then this item is unclassified.`,
      sources: [sourceFromEntry(possible.entry)],
    });
  }

  // ── Near-misses present but no candidate / possible. Surface the closest. ──
  const nearMiss = matcher.nearMisses[0];
  if (nearMiss) {
    return unverifiedResult<ClassifiedCode>({
      value: {
        canonicalId: null,
        regime: nearMiss.entry.regime,
        title: nearMiss.entry.title,
        matchedPredicates: nearMiss.matchedPredicates,
      },
      what: `No control-list entry matched. Closest near-miss: ${nearMiss.entry.canonicalId}.`,
      why:
        `${nearMiss.rationale} ` +
        "No entry fully matched — a near-miss is NOT a classification and an unclassified item is NOT cleared.",
      wherefore:
        "Verify the refuted attribute against the datasheet, or accept that this entry does not apply and review other regimes.",
      sources: [sourceFromEntry(nearMiss.entry)],
    });
  }

  // ── Nothing matched at all → the load-bearing honesty path. ──
  const reason = matcher.noAttributesPopulated
    ? "No technical attributes were populated, so no list could be evaluated."
    : "No control-list entry matched the populated attributes.";
  return unverifiedResult<ClassifiedCode>({
    value: emptyCode,
    what: "No classification could be determined.",
    why:
      `${reason} No match found — absence is NOT a clearance ` +
      "(eine fehlende Einstufung ist keine Freigabe).",
    wherefore: matcher.noAttributesPopulated
      ? "Populate at least one technical attribute (aperture, range, SEU rate, …) and re-run."
      : "Confirm the item's attributes, check other regimes, or request a binding ruling (BAFA AzG / BIS CCATS / DDTC CJ).",
  });
}

// ─── Determined-candidate mapping ────────────────────────────────────────────

function explainFromCandidate(
  candidate: CandidateMatch,
  matcher: MatcherResult,
): ExplainedClassification {
  const { entry, confidence, matchedPredicates, rationale } = candidate;

  // WHY: matched-predicate parameter table (attribute · op · expected · actual)
  // + the matcher's own rationale + the citation. The auditor's "show your work".
  const predicateLines = matchedPredicates
    .map(
      (p) =>
        `${p.attribute} ${humanOp(p.op)} ${formatValue(p.expectedValue)} (actual: ${formatValue(p.actualValue)})`,
    )
    .join("; ");

  // T-M19: if the matcher raised sanity warnings, fold them into the WHY so a
  // mis-normalised value cannot hide behind a confident-looking verdict.
  const sanitySuffix =
    matcher.sanityWarnings.length > 0
      ? ` ⚠ Sanity warnings: ${matcher.sanityWarnings.join(" | ")}`
      : "";

  return explainedResult<ClassifiedCode>({
    value: {
      canonicalId: entry.canonicalId,
      regime: entry.regime,
      title: entry.title,
      matchedPredicates,
    },
    what: `Item classifies as ${entry.canonicalId} (${entry.regime}) — ${entry.title}.`,
    why:
      `Legal basis: ${entry.citation}. ` +
      `Matched predicate(s): ${predicateLines || "itemClass prefix only"}. ` +
      `${rationale}${sanitySuffix}`,
    wherefore: buildWherefore(entry.canonicalId, confidence),
    confidence,
    sources: [sourceFromEntry(entry)],
  });
}

function buildWherefore(canonicalId: string, confidence: string): string {
  if (confidence === "HIGH") {
    return `Proceed on the basis that ${canonicalId} applies, then run screening + de-minimis. For a binding answer, confirm via BAFA AzG / BIS CCATS / DDTC CJ.`;
  }
  if (confidence === "MEDIUM") {
    return `Treat ${canonicalId} as the working classification but verify the boundary/parametric attribute before any binding determination. Next: confirm the specification, then screen.`;
  }
  // LOW — itemClass-only match.
  return `${canonicalId} is a low-confidence (itemClass-only) candidate. Populate parametric attributes or seek expert review before relying on it.`;
}

// ─── Source provenance ───────────────────────────────────────────────────────

function sourceFromEntry(entry: {
  canonicalId: string;
  regime: string;
  citation: string;
  validFrom: string;
  validUntil?: string | null;
  title: string;
}): ExplainSource {
  // list-version stamp: the entry's validity window from the cross-walk so the
  // auditor sees WHICH version of the control list was consulted.
  const version = entry.validUntil
    ? `${entry.validFrom} → ${entry.validUntil}`
    : `in force from ${entry.validFrom}`;
  return {
    label: `${entry.regime} — ${entry.canonicalId} (${entry.title})`,
    citation: entry.citation,
    listVersion: version,
  };
}

// ─── Format helpers (kept local so the wrapper has no engine-internal deps) ──

function humanOp(op: string): string {
  switch (op) {
    case "lt":
      return "<";
    case "lte":
      return "≤";
    case "gt":
      return ">";
    case "gte":
      return "≥";
    case "eq":
      return "=";
    case "between":
      return "between";
    case "prefix":
      return "starts with";
    case "in":
      return "∈";
    case "contains":
      return "contains";
    default:
      return op;
  }
}

function formatValue(v: unknown): string {
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  if (typeof v === "number") {
    if (Math.abs(v) > 0 && Math.abs(v) < 0.001) return v.toExponential(1);
    return String(v);
  }
  return String(v);
}
