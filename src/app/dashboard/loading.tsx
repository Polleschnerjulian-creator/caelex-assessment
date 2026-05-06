/**
 * Dashboard segment-level loading UI.
 *
 * Why this exists: I made the dashboard segment `force-dynamic` to
 * stop SSG from trying to prerender auth-gated pages (and to fix the
 * 0/918 SSG hang). Side-effect of force-dynamic is that Next.js's
 * Link component no longer prefetches the page itself — only its
 * loading.tsx fallback. Without a loading.tsx, hovering or clicking
 * a sidebar item shows NOTHING until the server roundtrip completes
 * (300-600ms feels like "the app is broken").
 *
 * This file gives Next.js something to prefetch and something to
 * paint instantly on click. The user sees a skeleton in <50ms while
 * the real page streams in behind it.
 *
 * Visual: matches the V2 + cinema-mode dark glass aesthetic so the
 * transition doesn't flash a different theme. Renders the same
 * width/spacing as the real Today page so layout doesn't shift when
 * the actual content swaps in.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8 sm:px-10 lg:px-14">
      {/* Header skeleton — matches Today/Triage/Posture page header */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-white/[0.06] pb-5">
        <div className="min-w-0 space-y-3">
          <div
            aria-hidden
            className="h-8 w-32 animate-pulse rounded bg-white/[0.08]"
          />
          <div
            aria-hidden
            className="h-4 w-72 animate-pulse rounded bg-white/[0.04]"
          />
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div
              aria-hidden
              className="h-6 w-24 animate-pulse rounded-full bg-white/[0.06]"
            />
            <div
              aria-hidden
              className="h-6 w-28 animate-pulse rounded-full bg-white/[0.06]"
            />
          </div>
        </div>
      </header>

      {/* Section heading skeleton */}
      <div
        aria-hidden
        className="mb-3 h-3 w-20 animate-pulse rounded bg-white/[0.06]"
      />

      {/* Card grid skeleton — 3 cards of identical shape to ComplianceItemCard */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            aria-hidden
            className="comply-glass-card flex flex-col gap-3 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3 w-32 animate-pulse rounded bg-white/[0.08]" />
                <div className="h-2 w-16 animate-pulse rounded bg-white/[0.04]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-full animate-pulse rounded bg-white/[0.04]" />
              <div className="h-2 w-3/4 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="h-7 w-32 animate-pulse rounded-md bg-white/[0.08]" />
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-white/[0.15]" />
              <div className="h-2 w-20 animate-pulse rounded bg-white/[0.04]" />
            </div>
          </div>
        ))}
      </div>

      {/* Screen-reader-only loading announcement */}
      <span className="sr-only" role="status" aria-live="polite">
        Loading…
      </span>
    </div>
  );
}
