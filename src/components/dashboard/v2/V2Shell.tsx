import Link from "next/link";

/**
 * Comply V2 Shell — Placeholder
 *
 * This is the entry-point for the Comply v2 redesign. During Phase 0,
 * it's an intentional "Coming Soon" surface so super-admins (and any
 * pilot users who toggled in via Settings) can verify the V1/V2 switch
 * works end-to-end before any real features land.
 *
 * From Phase 1 onwards, this component will host:
 *   - V2Sidebar (Today / Workflows / Reference)
 *   - Cmd-K palette
 *   - V2 top-bar with Astra ambient bar
 *   - {children} = the new surfaces (today, triage, review-queue, lineage…)
 *
 * Until then, children render unwrapped under a banner that explains
 * the user is on the experimental shell and how to switch back.
 *
 * See docs/CAELEX-COMPLY-CONCEPT.md.
 */
export default function V2Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-light-bg">
      <div className="border-b border-amber-300/40 bg-amber-50/80 backdrop-blur-sm dark:border-amber-500/20 dark:bg-amber-950/30">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Comply v2 · Preview
            </span>
            <span className="text-amber-900/80 dark:text-amber-100/80">
              You are on the redesigned Comply shell. Surfaces are still being
              built — most pages still render the V1 layout below.
            </span>
          </div>
          <Link
            href="/dashboard/settings/ui"
            className="rounded-md border border-amber-400/50 bg-white/60 px-3 py-1 text-xs font-medium text-amber-900 transition hover:bg-white dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100"
          >
            Switch back to V1
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
