/**
 * Caelex Scholar — i18n core (Foundation).
 *
 * Plain TypeScript — NO `server-only` — so it can be imported from BOTH server
 * components (pages resolve `locale` via locale.server.ts and pass it down) and
 * client components ("use client" comps read `locale` from the LocaleProvider
 * via useScholarLocale()).
 *
 * Wiring contract (followed by every lane):
 *   - Locales: en | de | it | fr | es. DEFAULT + FALLBACK is ALWAYS "en".
 *   - Each translatable string is a key in a NAMESPACE dictionary under
 *     src/app/(scholar)/scholar/_i18n/<ns>.ts, shaped:
 *         export const <NS> = {
 *           en: { key: "English text", ... },   // EN = source of truth
 *           de: { key: "Deutscher Text", ... },  // = the current hardcoded DE
 *           it: { ... }, fr: { ... }, es: { ... },
 *         } as const;
 *   - Resolve via t(locale, <NS>, "key").
 *   - Reuse the `common` namespace for shared terms; add only lane-specific
 *     keys to your own namespace.
 *
 * This file is intentionally dependency-free.
 */

export type ScholarLocale = "en" | "de" | "it" | "fr" | "es";

/** All supported locales, in display order. EN first (default). */
export const SCHOLAR_LOCALES: ScholarLocale[] = ["en", "de", "it", "fr", "es"];

/** The default + fallback locale. Every resolver falls back here. */
export const DEFAULT_SCHOLAR_LOCALE: ScholarLocale = "en";

/** Native-language labels for each locale (for a language switcher). */
export const LOCALE_LABELS: Record<ScholarLocale, string> = {
  en: "English",
  de: "Deutsch",
  it: "Italiano",
  fr: "Français",
  es: "Español",
};

/** Type guard: is `value` a valid ScholarLocale? */
export function isScholarLocale(value: unknown): value is ScholarLocale {
  return (
    typeof value === "string" && (SCHOLAR_LOCALES as string[]).includes(value)
  );
}

/**
 * Coerce any value to a valid ScholarLocale, defaulting to "en".
 * Useful when reading an untrusted string (e.g. a DB column).
 */
export function toScholarLocale(value: unknown): ScholarLocale {
  return isScholarLocale(value) ? value : DEFAULT_SCHOLAR_LOCALE;
}

/**
 * The shape of a namespace dictionary: an object keyed by locale, each value a
 * flat string→string map. EN is the source of truth — its keys define the
 * valid key space for the namespace.
 */
export type ScholarNamespace = Record<ScholarLocale, Record<string, string>>;

/**
 * Resolve a translated string.
 *
 *   t(locale, NS, "key")
 *     → NS[locale]?.[key]   (the requested locale)
 *     ?? NS.en[key]         (English fallback — source of truth)
 *     ?? String(key)        (last-ditch: the key itself, so nothing renders blank)
 *
 * The `key` param is typed as `keyof NS["en"]`, so callers get autocomplete and
 * a compile error on typos against the English (source-of-truth) key space.
 */
export function t<NS extends ScholarNamespace>(
  locale: ScholarLocale,
  ns: NS,
  key: keyof NS["en"],
): string {
  const k = key as string;
  return ns[locale]?.[k] ?? ns.en[k] ?? k;
}
