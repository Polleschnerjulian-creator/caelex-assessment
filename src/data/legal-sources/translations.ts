// src/data/legal-sources/translations.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Legal Sources — translation registry + lookup helpers.
 *
 * Extracted from ./index.ts (Atlas perf pass F3, 2026-06) so that client
 * components which only need TRANSLATED TITLES for sources they already
 * hold (e.g. CiteThisButton, JurisdictionExport receive the source via
 * props) do not value-import the corpus barrel and drag ~2.5MB of
 * jurisdiction data into the browser bundle. This module imports ONLY
 * the translation maps (~650KB) + types — never ./sources/*.
 *
 * ./index.ts re-exports everything here, so existing imports from
 * "@/data/legal-sources" keep working unchanged.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "./types";

import {
  LEGAL_SOURCE_TRANSLATIONS_DE,
  AUTHORITY_TRANSLATIONS_DE,
  type TranslatedProvision,
  type TranslatedSource,
  type TranslatedAuthority,
} from "./translations-de";
import {
  LEGAL_SOURCE_TRANSLATIONS_FR,
  AUTHORITY_TRANSLATIONS_FR,
} from "./translations-fr";

export type { TranslatedProvision, TranslatedSource, TranslatedAuthority };

/**
 * Registry of language-keyed translation maps. Adding a new language
 * is now a 3-line change: write `translations-xx.ts`, import its two
 * Maps here, register the language code. The fallback chain in
 * getTranslatedSource / getTranslatedAuthority traverses this
 * registry, so neither lookup needs to grow per-language switches.
 *
 * Languages NOT in the registry (e.g. "es", "it", "pt") fall through
 * to the source's title_en + scope_description, with title_local
 * surfaced when the source's jurisdiction matches the user's language
 * by ISO code (e.g. an Italian source under user-language "it").
 */
const SOURCE_TRANSLATION_REGISTRY = new Map<
  string,
  Map<string, TranslatedSource>
>([
  ["de", LEGAL_SOURCE_TRANSLATIONS_DE],
  ["fr", LEGAL_SOURCE_TRANSLATIONS_FR],
]);

const AUTHORITY_TRANSLATION_REGISTRY = new Map<
  string,
  Map<string, TranslatedAuthority>
>([
  ["de", AUTHORITY_TRANSLATIONS_DE],
  ["fr", AUTHORITY_TRANSLATIONS_FR],
]);

/** Languages with at least a partial Atlas-translation registry. */
export const SUPPORTED_TRANSLATION_LANGUAGES = ["en", "de", "fr"] as const;
export type SupportedTranslationLanguage =
  (typeof SUPPORTED_TRANSLATION_LANGUAGES)[number];

/**
 * Returns translated content for a legal source based on the active language.
 * Resolution chain (in order):
 *   1. English ("en") → return source.title_en + scope_description.
 *   2. Language has a registered translation map AND the source has a
 *      translation entry → return mapped title + translated provisions.
 *   3. Language has a registered map but no entry for THIS source →
 *      fall back to title_local if the source's jurisdiction matches
 *      the user's language by ISO code (e.g. an Italian source under
 *      user-language "it" surfaces in Italian even without an explicit
 *      translation entry); otherwise title_en.
 *   4. Language is unsupported entirely → English baseline.
 */
export function getTranslatedSource(
  source: LegalSource,
  language: string,
): {
  title: string;
  scopeDescription?: string;
  getProvisionTranslation: (section: string) => TranslatedProvision | null;
} {
  if (language === "en") {
    return {
      title: source.title_en,
      scopeDescription: source.scope_description,
      getProvisionTranslation: (_section: string) => null,
    };
  }

  const map = SOURCE_TRANSLATION_REGISTRY.get(language);
  const translated = map?.get(source.id);
  if (translated) {
    return {
      title: translated.title,
      scopeDescription: translated.scopeDescription ?? source.scope_description,
      getProvisionTranslation: (section: string) =>
        translated.provisions[section] ?? null,
    };
  }

  // No mapping. Use title_local when the source's own jurisdiction
  // implies the user's language (e.g. FR source for FR user, DE source
  // for DE user). Heuristic — falls through cleanly when the mapping
  // isn't right (e.g. an INT source under FR user keeps title_en).
  const useLocal =
    !!source.title_local &&
    source.jurisdiction.toLowerCase() === language.toLowerCase();
  return {
    title: useLocal ? (source.title_local as string) : source.title_en,
    scopeDescription: source.scope_description,
    getProvisionTranslation: (_section: string) => null,
  };
}

/**
 * Returns translated content for an authority based on the active language.
 * Same fallback chain as getTranslatedSource.
 */
export function getTranslatedAuthority(
  authority: Authority,
  language: string,
): {
  name: string;
  mandate: string;
} {
  if (language === "en") {
    return {
      name: authority.name_en,
      mandate: authority.space_mandate,
    };
  }

  const map = AUTHORITY_TRANSLATION_REGISTRY.get(language);
  const translated = map?.get(authority.id);
  if (translated) {
    return {
      name: translated.name,
      mandate: translated.mandate,
    };
  }

  const useLocal =
    !!authority.name_local &&
    authority.jurisdiction.toLowerCase() === language.toLowerCase();
  return {
    name: useLocal ? authority.name_local : authority.name_en,
    mandate: authority.space_mandate,
  };
}
