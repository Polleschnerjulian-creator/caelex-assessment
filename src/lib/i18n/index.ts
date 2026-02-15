/**
 * Internationalization (i18n) Module
 *
 * Lightweight translation system for dashboard UI.
 * Regulatory content stays in English — only UI chrome is translated.
 */

import en from "./translations/en.json";
import de from "./translations/de.json";
import fr from "./translations/fr.json";
import es from "./translations/es.json";

export type Language = "en" | "de" | "fr" | "es";

export const LANGUAGES: Record<Language, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};

type TranslationDict = Record<string, Record<string, string>>;

const translations: Record<Language, TranslationDict> = {
  en: en as TranslationDict,
  de: de as TranslationDict,
  fr: fr as TranslationDict,
  es: es as TranslationDict,
};

/**
 * Get a translated string by dot-notated key.
 * Supports parameter interpolation: {name} -> params.name
 * Falls back to English if key is missing in target language.
 */
export function getTranslation(
  lang: Language,
  key: string,
  params?: Record<string, string | number>,
): string {
  const [section, field] = key.split(".");
  if (!section || !field) return key;

  let value =
    translations[lang]?.[section]?.[field] ??
    translations.en?.[section]?.[field] ??
    key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }

  return value;
}

export function isValidLanguage(lang: string): lang is Language {
  return lang in LANGUAGES;
}
