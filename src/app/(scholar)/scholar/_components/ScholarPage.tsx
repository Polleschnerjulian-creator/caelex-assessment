/**
 * ScholarPage — shared max-width content container for all Scholar pages.
 *
 * Presentational only: no hooks, no data imports.
 * Works in both server components and the client search page.
 */

export function ScholarPage({ children }: { children: React.ReactNode }) {
  return (
    <main
      lang="de"
      className="mx-auto w-full max-w-6xl px-6 lg:px-8 py-12 min-h-screen"
    >
      {children}
    </main>
  );
}
