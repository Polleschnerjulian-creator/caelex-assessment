/**
 * ScholarPage — shared max-width content container for all Scholar pages.
 *
 * Presentational only: no hooks, no data imports.
 * Works in both server components and the client search page.
 *
 * i18n: the surface's language is declared once on the ScholarShell wrapper
 * (`<div lang={locale}>`, the active UI locale). This <main> intentionally
 * carries NO hardcoded lang so it inherits that active locale — a fixed
 * lang="de" here would wrongly override the wrapper for en/it/fr/es readers
 * (WCAG 3.1.1 / 3.1.2).
 */

export function ScholarPage({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 lg:px-8 py-12 min-h-screen">
      {children}
    </main>
  );
}
