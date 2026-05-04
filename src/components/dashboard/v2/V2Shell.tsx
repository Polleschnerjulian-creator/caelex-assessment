import { auth } from "@/lib/auth";
import { CommandPalette } from "./CommandPalette";
import { V2Sidebar } from "./V2Sidebar";
import { CaelexLensDefs } from "./CaelexLensDefs";
import { getPendingProposalCount } from "@/lib/comply-v2/proposal-stats.server";
import { getServerActionVerbs } from "@/lib/comply-v2/actions/palette-verbs.server";
import { getDensity } from "@/lib/comply-v2/density.server";

/**
 * Comply V2 Shell — full chrome that replaces the legacy
 * DashboardShell for v2 users.
 *
 * # Sprint 12 — Caelex Liquid Glass migration
 *
 * Pre-Sprint-12 the shell forced `dark palantir-canvas` and the
 * whole UI rendered as dark Palantir-style chrome with translucent
 * cards everywhere. Per the Sprint 12 design brief and Apple's WWDC
 * 2025 §219 rules ("Liquid Glass is best reserved for the
 * navigation layer that floats above the content"), V2 now renders
 * with:
 *
 *   - LIGHT mode by default (`data-caelex-theme="light"`)
 *   - CaelexLensDefs SVG filter injected once at the root for
 *     Chromium-only refraction; non-Chromium browsers fall through
 *     to flat blur via the @supports gate in globals.css
 *   - `caelex-canvas` page background (solid + subtle noise)
 *   - Chrome (sidebar, command palette) opts into
 *     `caelex-glass-regular`; content layer (page bodies, cards,
 *     tables) uses `caelex-content` — opaque, NO blur
 *
 * Dark mode is opt-in via `data-caelex-theme="dark"` (future:
 * surfaced as a Settings toggle alongside the existing UI-version
 * toggle).
 *
 * # Why no longer `dark` Tailwind class
 *
 * The legacy `dark` class lights up Tailwind `dark:*` selectors
 * across the whole subtree. Under Sprint 12's light-default model
 * we drop that — the new Caelex tokens use `[data-caelex-theme]`
 * which is independent from Tailwind dark mode and doesn't fight
 * with V1 surfaces (atlas, pharos, hub) that have their own scoped
 * dark/light logic.
 *
 * # Layout
 *
 *   data-density + data-caelex-theme root
 *   ├── CaelexLensDefs (SVG defs, hidden, Chromium refraction)
 *   ├── CommandPalette (⌘K, fixed-position dialog)
 *   ├── V2Sidebar (Glass-Regular chrome, 224px wide, sticky)
 *   └── main (caelex-canvas — opaque)
 *       └── {children} — the page content
 *
 * V1 users see DashboardShell directly via dashboard/layout.tsx
 * (kept untouched for emergency rollback per
 * docs/CAELEX-COMPLY-CONCEPT.md § 3 Rollback-Strategie).
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
      data-caelex-theme="light"
      className="caelex-canvas flex min-h-screen"
    >
      {/* SVG displacement filter — Chromium-only refraction. Non-
          Chromium browsers ignore the @supports-gated CSS rule and
          fall through to flat blur. */}
      <CaelexLensDefs />

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
