/**
 * Caelex Trade — Classification Draft Builder (Sprint Z4b).
 *
 * Pure-function bridge between the datasheet extractor (Z4a) and the
 * parametric matcher. Given a `DatasheetExtraction`, returns a typed
 * `ClassificationDraft`: a ranked, citation-backed proposal the
 * operator reviews in the Z4d UI.
 *
 * Architecture:
 *   - No I/O, no DB, no Anthropic. Pure transformation.
 *   - Caller is responsible for persisting the draft to the
 *     `TradeItemClassificationDraft` table (Sprint Z4c).
 *   - The draft is *advisory only* — the disclaimer travels with the
 *     result so any consumer (Astra tool, REST endpoint, UI) cannot
 *     drop it.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  matchAgainstCrossWalk,
  type CandidateMatch,
  type ItemAttributeBag,
  type MatcherResult,
  type NearMissMatch,
  type PossibleMatch,
} from "@/lib/comply-v2/trade/classification/parametric-matcher";
import {
  matchByKeyword,
  type CorpusCodeMatch,
} from "@/lib/comply-v2/trade/classification/corpus-code-matcher";
import type { DatasheetExtraction, EvidenceSpan } from "./datasheet-extractor";

// ─── Public output shape ────────────────────────────────────────────

/**
 * A single proposed classification entry. Drawn from the matcher's
 * top candidate (when one exists) or — when no full match candidate
 * is available — the most-corroborated possible-match.
 */
export interface ProposedClassification {
  /** Canonical ID (e.g. "ECCN:9A515.a.1", "USML:XV(a)(7)(i)"). */
  canonicalId: string;
  /** Regime: EAR-CCL, ITAR-USML, EU-ANNEX-I, MTCR-ANNEX, etc. */
  regime: string;
  /** Plain-language title of the entry. */
  title: string;
  /** Citation to the authoritative source. */
  citation: string;
  /** Reasons-for-control codes (NS, RS, AT, MT, NP, CC). */
  reasonsForControl: string[];
  /**
   * Confidence label. Pulled from the matcher's per-candidate
   * confidence, or downgraded to LOW when the source was a
   * possible-match (one or more attributes unknown).
   */
  confidence: "HIGH" | "MEDIUM" | "LOW";
  /** Why this entry was chosen — propagated from matcher rationale. */
  rationale: string;
  /**
   * Evidence spans from the datasheet that support this proposal.
   * Each span is the literal text the extractor pulled for an
   * attribute the matcher's predicates depend on.
   */
  evidence: EvidenceSpan[];
  /**
   * Source signal: full match vs partial vs near-miss vs corpus keyword.
   * Lets the UI render different chrome (green tick / amber caution / grey
   * "near miss" / blue "keyword hint"). `corpus_keyword` is a LOW-confidence
   * control-list text match (DCW-1) surfaced only as a fallback when the
   * parametric matcher is sparse — it has no datasheet evidence spans.
   */
  source: "candidate" | "possible_match" | "near_miss" | "corpus_keyword";
}

/**
 * The full draft handed to the operator. Composed of zero-to-many
 * proposed classifications + the underlying extraction + a mandatory
 * disclaimer that travels with every response.
 */
export interface ClassificationDraft {
  /** Per-jurisdiction proposed codes. Empty when no entry matched. */
  proposals: ProposedClassification[];
  /**
   * The single highest-confidence proposal — for UI ergonomics. Null
   * when proposals is empty.
   */
  primary: ProposedClassification | null;
  /** Snapshot of attributes the extractor derived. */
  attributes: ItemAttributeBag;
  /** Full evidence trail across all extracted attributes. */
  evidence: EvidenceSpan[];
  /**
   * Operator-actionable items: attributes the matcher needs but the
   * extractor couldn't find. Surfacing these is the difference
   * between "operator stares at no-result page" and "operator
   * supplies five attributes and gets a clean draft".
   */
  attributesNeeded: string[];
  /** Plain-language summary suitable for an Astra chat reply. */
  summary: string;
  /** Mandatory legal disclaimer. NEVER drop this on serialisation. */
  disclaimer: string;
}

const COPILOT_DISCLAIMER =
  "Caelex Trade AI classification copilot output is SCREENING-LEVEL GUIDANCE only. The proposal is generated from a datasheet extraction + parametric matcher and has NOT been reviewed by a qualified compliance officer. Before any export decision, validate with qualified export-control counsel and, for high-value or borderline items, obtain a binding ruling (BAFA AzG / DDTC CJ / BIS CCATS). Violations of EAR / ITAR / Außenwirtschaftsgesetz can result in criminal penalties.";

// ─── Core ───────────────────────────────────────────────────────────

/**
 * Build a classification draft from a finished `DatasheetExtraction`.
 *
 * Pure function. Caller persists the result via the Z4c
 * `TradeItemClassificationDraft` model.
 */
export function buildClassificationDraft(
  extraction: DatasheetExtraction,
): ClassificationDraft {
  const matcherResult = matchAgainstCrossWalk(extraction.attributes);
  return composeDraft(extraction, matcherResult);
}

/**
 * Lower-level entry that lets a caller substitute a pre-computed
 * matcher result (useful for tests + for the Z4d UI where the
 * matcher already ran on the snapshot).
 */
export function composeDraft(
  extraction: DatasheetExtraction,
  matcherResult: MatcherResult,
): ClassificationDraft {
  const proposals: ProposedClassification[] = [];

  // Top three full-confidence candidates — anything below that is
  // noise for the operator review surface.
  for (const candidate of matcherResult.candidates.slice(0, 3)) {
    proposals.push(candidateToProposal(candidate, extraction.evidence));
  }

  // When no clean candidates exist, surface the best possible-match
  // (downgraded confidence) so the operator gets *something* to
  // anchor on.
  if (proposals.length === 0 && matcherResult.possibleMatches.length > 0) {
    proposals.push(
      possibleToProposal(matcherResult.possibleMatches[0], extraction.evidence),
    );
  }

  // Always surface the top near-miss when there are no candidates —
  // it's the most actionable signal ("you were 1 attribute away").
  if (proposals.length === 0 && matcherResult.nearMisses.length > 0) {
    proposals.push(
      nearMissToProposal(matcherResult.nearMisses[0], extraction.evidence),
    );
  }

  // DCW-1: corpus keyword fallback. When the parametric matcher is sparse
  // (< 3 proposals), surface up to a couple of control-list entries whose
  // TEXT matches the datasheet — LOW-confidence hints for codes the
  // predicate matcher structurally cannot see (USML XV paragraphs,
  // Wassenaar, Japan METI, India SCOMET, DE Ausfuhrliste). Deduped against
  // the parametric proposals. Suggestion-only + LOW + disclaimer travels —
  // it can never be a determination, so it carries no false-negative risk.
  if (proposals.length < 3 && extraction.rawText.trim().length > 0) {
    const seen = new Set(proposals.map((p) => p.canonicalId));
    // Require >=2 distinct datasheet tokens per entry — a single common word
    // ("system", "satellite") must not surface a control-list entry.
    for (const m of matchByKeyword(extraction.rawText, 8, 2)) {
      if (proposals.length >= 3) break;
      if (seen.has(m.entry.canonicalId)) continue;
      seen.add(m.entry.canonicalId);
      proposals.push(corpusMatchToProposal(m));
    }
  }

  const attributesNeeded = collectAttributesNeeded(matcherResult);
  const primary = proposals[0] ?? null;

  return {
    proposals,
    primary,
    attributes: extraction.attributes,
    evidence: extraction.evidence,
    attributesNeeded,
    summary: buildSummary(primary, proposals.length, matcherResult, extraction),
    disclaimer: COPILOT_DISCLAIMER,
  };
}

// ─── Adapters ───────────────────────────────────────────────────────

/** Map a corpus keyword match → a LOW-confidence proposal (DCW-1). */
function corpusMatchToProposal(m: CorpusCodeMatch): ProposedClassification {
  return {
    canonicalId: m.entry.canonicalId,
    regime: m.entry.regime,
    title: m.entry.title,
    citation: m.entry.sourceUrl,
    reasonsForControl: [...m.entry.controlReason],
    confidence: "LOW",
    rationale: m.rationale,
    evidence: [],
    source: "corpus_keyword",
  };
}

function candidateToProposal(
  candidate: CandidateMatch,
  evidence: EvidenceSpan[],
): ProposedClassification {
  const relevantAttrs = new Set(
    candidate.matchedPredicates.map((p) => p.attribute),
  );
  return {
    canonicalId: candidate.entry.canonicalId,
    regime: candidate.entry.regime,
    title: candidate.entry.title,
    citation: candidate.entry.citation,
    reasonsForControl: candidate.entry.reasonsForControl,
    confidence: candidate.confidence,
    rationale: candidate.rationale,
    evidence: evidence.filter((e) => relevantAttrs.has(e.attribute)),
    source: "candidate",
  };
}

function possibleToProposal(
  possible: PossibleMatch,
  evidence: EvidenceSpan[],
): ProposedClassification {
  const relevantAttrs = new Set(
    possible.matchedPredicates.map((p) => p.attribute),
  );
  return {
    canonicalId: possible.entry.canonicalId,
    regime: possible.entry.regime,
    title: possible.entry.title,
    citation: possible.entry.citation,
    reasonsForControl: possible.entry.reasonsForControl,
    // Possible matches always downgrade to LOW: we have unknowns.
    confidence: "LOW",
    rationale: possible.rationale,
    evidence: evidence.filter((e) => relevantAttrs.has(e.attribute)),
    source: "possible_match",
  };
}

function nearMissToProposal(
  nearMiss: NearMissMatch,
  evidence: EvidenceSpan[],
): ProposedClassification {
  const relevantAttrs = new Set(
    nearMiss.matchedPredicates.map((p) => p.attribute),
  );
  return {
    canonicalId: nearMiss.entry.canonicalId,
    regime: nearMiss.entry.regime,
    title: nearMiss.entry.title,
    citation: nearMiss.entry.citation,
    reasonsForControl: nearMiss.entry.reasonsForControl,
    confidence: "LOW",
    rationale: nearMiss.rationale,
    evidence: evidence.filter((e) => relevantAttrs.has(e.attribute)),
    source: "near_miss",
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function collectAttributesNeeded(matcherResult: MatcherResult): string[] {
  const needed = new Set<string>();
  for (const possible of matcherResult.possibleMatches) {
    for (const unknown of possible.unknownPredicates) {
      needed.add(unknown.missingAttribute);
    }
  }
  return Array.from(needed).sort();
}

function buildSummary(
  primary: ProposedClassification | null,
  proposalCount: number,
  matcherResult: MatcherResult,
  extraction: DatasheetExtraction,
): string {
  if (extraction.parseError) {
    return `Could not parse the uploaded datasheet (${extraction.parseError}). Upload a valid PDF or paste raw text.`;
  }
  if (!primary) {
    if (matcherResult.noAttributesPopulated) {
      return "No parametric attributes could be extracted from the datasheet. Add a description or fill in attributes manually.";
    }
    return `No clean classification candidate found across the ${matcherResult.candidates.length + matcherResult.possibleMatches.length + matcherResult.nearMisses.length} cross-walk entries evaluated. Review the extracted attributes and re-run with corrections.`;
  }

  const others =
    proposalCount > 1
      ? ` (+${proposalCount - 1} secondary candidate${proposalCount - 1 === 1 ? "" : "s"})`
      : "";
  return `Proposed classification: ${primary.canonicalId} (${primary.regime}, confidence ${primary.confidence})${others}. ${primary.rationale}`;
}
