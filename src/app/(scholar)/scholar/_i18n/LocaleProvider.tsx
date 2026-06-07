"use client";

/**
 * Caelex Scholar — client-side locale context.
 *
 * The (scholar) layout resolves the user's locale on the server
 * (getScholarLocale) and mounts <ScholarLocaleProvider locale={locale}> around
 * the shell + children. Any "use client" component below then reads the active
 * locale with useScholarLocale() — NO locale prop-threading into client comps.
 *
 *   import { useScholarLocale } from ".../_i18n/LocaleProvider";
 *   const locale = useScholarLocale();      // ScholarLocale, "en" if no provider
 *   t(locale, NS, "key");
 *
 * If no provider is mounted (defensive), the hook returns "en".
 */
import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SCHOLAR_LOCALE, type ScholarLocale } from "./core";

const ScholarLocaleContext = createContext<ScholarLocale>(
  DEFAULT_SCHOLAR_LOCALE,
);

export function ScholarLocaleProvider({
  locale,
  children,
}: {
  locale: ScholarLocale;
  children: ReactNode;
}) {
  return (
    <ScholarLocaleContext.Provider value={locale}>
      {children}
    </ScholarLocaleContext.Provider>
  );
}

/** Read the active Scholar UI locale. Returns "en" if no provider is mounted. */
export function useScholarLocale(): ScholarLocale {
  return useContext(ScholarLocaleContext);
}
