/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Eval Bench types (Sprint 6, 2026-05-12).
 *
 * SpaceLaw Bench: Golden-set evaluation harness modelled after Harvey's
 * BigLaw Bench. Each query is annotated by senior practitioners with
 * the sources Atlas SHOULD cite + tools it SHOULD call. The runner
 * computes per-turn citation accuracy + tool-selection precision +
 * hallucination rate (citations to non-existent sources).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export type EvalCategory =
  | "compliance"
  | "national_law"
  | "treaty"
  | "drafting"
  | "comparison"
  | "validity"
  | "document";

export interface GoldenQuery {
  id: string;
  category: EvalCategory;
  /** German question as a lawyer would phrase it. */
  query: string;
  /** Atlas-source-ids the response SHOULD cite (any subset = pass). */
  expectedSources: string[];
  /** Atlas tool-names the LLM SHOULD invoke (any subset = pass). */
  expectedTools: string[];
  /** Free-text keywords the response SHOULD contain. */
  expectedKeywords?: string[];
  /** Free-text keywords the response MUST NOT contain (negative
   *  signals: typical hallucinations). */
  mustNotContain?: string[];
  /** Optional reviewer notes for next-iteration calibration. */
  reviewerNotes?: string;
  /** Senior reviewer who labelled this entry. */
  labelledBy?: string;
}

export interface EvalResult {
  queryId: string;
  query: string;
  category: EvalCategory;
  /** Final assistant text (truncated for storage). */
  responseText: string;
  /** Tools the LLM actually called. */
  actualTools: string[];
  /** Citations the response actually emitted (parsed via citation-extractor). */
  actualCitations: string[];
  /** Citation accuracy: |actual ∩ expected| / |expected|. */
  citationRecall: number;
  /** Tool-selection precision: |actual ∩ expected| / |expected|. */
  toolRecall: number;
  /** Hallucinated citations: actual citations that DON'T resolve to corpus. */
  hallucinatedCitations: string[];
  /** Keyword presence checks. */
  keywordHits: string[];
  keywordMisses: string[];
  /** Negative-signal hits — non-empty = bad. */
  negativeSignalHits: string[];
  /** Pass/fail rollup. Pass iff: citationRecall ≥ 0.5, toolRecall ≥
   *  0.5, no hallucinations, no negative signals. */
  pass: boolean;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface EvalReport {
  ranAt: string;
  modelMode: "gateway" | "direct" | "unknown";
  totalQueries: number;
  passed: number;
  failed: number;
  /** Aggregate hallucination rate: total hallucinated citations /
   *  total citations across all queries. */
  hallucinationRate: number;
  /** Average citation recall. */
  avgCitationRecall: number;
  /** Average tool-selection recall. */
  avgToolRecall: number;
  /** Per-category breakdown. */
  byCategory: Record<EvalCategory, { pass: number; fail: number; n: number }>;
  /** Per-query results (full detail). */
  results: EvalResult[];
  /** Sum of inference cost across the run. */
  totalCostUsd: number;
}
