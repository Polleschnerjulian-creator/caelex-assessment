import { auth } from "@/lib/auth";
import { CommandPalette } from "./CommandPalette";
import { V2Sidebar } from "./V2Sidebar";
import { getPendingProposalCount } from "@/lib/comply-v2/proposal-stats.server";
import { getServerActionVerbs } from "@/lib/comply-v2/actions/palette-verbs.server";
import { getDensity } from "@/lib/comply-v2/density.server";

/**
 * Comply V2 Shell — full chrome that replaces the legacy
 * DashboardShell for v2 users.
 *
 * Layout:
 *   data-density root
 *   ├── CommandPalette (⌘K, fixed-position dialog)
 *   ├── V2Sidebar (Linear-style left rail, 240px wide, sticky)
 *   └── main
 *       └── {children} — the page content
 *
 * V1 users see DashboardShell directly via dashboard/layout.tsx
 * (kept untouched in the repo for emergency rollback per
 * docs/CAELEX-COMPLY-CONCEPT.md § 3 Rollback-Strategie).
 *
 * The shell is data-driven from server-side caches — palette verbs
 * + pending-proposal count + density preference are all resolved
 * once per request. Sub-pages don't need to re-fetch this.
 */
export default async function V2Shell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingProposals, serverVerbs, density, session] = await Promise.all([
    getPendingProposalCount(),
    Promise.resolve(getServerActionVerbs()),
    getDensity(),
    auth(),
  ]);

  return (
    <div
      data-density={density}
      className="flex min-h-screen bg-slate-50 dark:bg-slate-950"
    >
      {/* ⌘K palette — client island, mounts globally */}
      <CommandPalette serverVerbs={serverVerbs} />

      {/* Sidebar — sticky on desktop, hidden on mobile (Phase 3.1
          will add a hamburger drawer; for now the page reflows) */}
      <aside className="sticky top-0 hidden h-screen md:block">
        <V2Sidebar
          pendingProposals={pendingProposals}
          userEmail={session?.user?.email ?? null}
          userName={session?.user?.name ?? null}
        />
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
