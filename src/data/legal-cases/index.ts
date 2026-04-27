/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Atlas Case-Law index — barrel export with the same lookup ergonomics
 * as `legal-sources/index.ts`. Astra and the workspace UI consume both
 * datasets through analogous helpers (`getCasesByJurisdiction`,
 * `getCasesApplyingSource`, `searchCases`) so that case-law surfaces
 * show up wherever a legal source is rendered.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { ATLAS_CASES } from "./cases";
import {
  LEGAL_CASE_TRANSLATIONS_DE,
  type TranslatedCase,
} from "./translations-de";
import type {
  LegalCase,
  CaseForum,
  CaseStatus,
  PrecedentialWeight,
} from "./types";

export type {
  LegalCase,
  CaseForum,
  CaseStatus,
  PrecedentialWeight,
} from "./types";
export type { TranslatedCase } from "./translations-de";

export { ATLAS_CASES } from "./cases";

/**
 * Supported translation languages for case-law content. English is
 * always the source-of-truth (the case fields themselves); other
 * languages live in `translations-{lang}.ts` files and are looked up
 * via getTranslatedCase().
 */
export const SUPPORTED_CASE_TRANSLATION_LANGUAGES = ["en", "de"] as const;
export type CaseTranslationLanguage =
  (typeof SUPPORTED_CASE_TRANSLATION_LANGUAGES)[number];

const CASE_TRANSLATION_REGISTRY = new Map<
  CaseTranslationLanguage,
  Map<string, TranslatedCase>
>([["de", LEGAL_CASE_TRANSLATIONS_DE]]);

/**
 * Returns the translated record for a case in the requested language,
 * or `undefined` if the language is unsupported / the entry is missing.
 *
 * Convention: callers fall back to the source case's English fields
 * when this returns undefined. We never invent a translation —
 * unverified strings stay in their source-of-truth English form.
 */
export function getTranslatedCase(
  caseId: string,
  language: string,
): TranslatedCase | undefined {
  if (language === "en") return undefined; // English is the source-of-truth
  const map = CASE_TRANSLATION_REGISTRY.get(
    language as CaseTranslationLanguage,
  );
  return map?.get(caseId);
}

// ─── Lookup helpers ─────────────────────────────────────────────────

export function getCaseById(id: string): LegalCase | undefined {
  return ATLAS_CASES.find((c) => c.id === id);
}

export function getCasesByJurisdiction(jurisdiction: string): LegalCase[] {
  return ATLAS_CASES.filter((c) => c.jurisdiction === jurisdiction);
}

/**
 * Returns every case that cites the given legal-source ID in its
 * `applied_sources` array. This is the join column that lets the UI
 * say "3 cases applied this source" on each legal-source page.
 */
export function getCasesApplyingSource(sourceId: string): LegalCase[] {
  return ATLAS_CASES.filter((c) => c.applied_sources.includes(sourceId));
}

export function getCasesByComplianceArea(area: string): LegalCase[] {
  return ATLAS_CASES.filter((c) =>
    c.compliance_areas.includes(area as LegalCase["compliance_areas"][number]),
  );
}

export function getCasesByForum(forum: CaseForum): LegalCase[] {
  return ATLAS_CASES.filter((c) => c.forum === forum);
}

/**
 * Naive substring search across title, facts, ruling, holding, and
 * industry-significance fields. Same shape as `searchLegalSources` so
 * the UI can render unified results.
 */
export function searchCases(query: string): LegalCase[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return ATLAS_CASES.filter((c) => {
    const haystack = [
      c.title,
      c.facts,
      c.ruling_summary,
      c.legal_holding,
      c.industry_significance,
      c.plaintiff,
      c.defendant,
      ...(c.parties_mentioned ?? []),
      ...(c.notes ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

// ─── Cross-dataset stat helpers (used in admin / coverage pages) ───

export const ATLAS_CASES_COUNT = ATLAS_CASES.length;

export const CASES_BY_JURISDICTION: Record<string, number> = ATLAS_CASES.reduce<
  Record<string, number>
>((acc, c) => {
  acc[c.jurisdiction] = (acc[c.jurisdiction] ?? 0) + 1;
  return acc;
}, {});

export const CASES_BY_FORUM: Record<CaseForum, number> = ATLAS_CASES.reduce(
  (acc, c) => {
    acc[c.forum] = (acc[c.forum] ?? 0) + 1;
    return acc;
  },
  {} as Record<CaseForum, number>,
);
