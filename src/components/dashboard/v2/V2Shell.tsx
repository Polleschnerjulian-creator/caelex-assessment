import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Kbd } from "@/components/ui/v2/kbd";
import { CommandPalette } from "./CommandPalette";

/**
 * Comply V2 Shell
 *
 * Wraps the legacy DashboardShell during Phase 0 with a thin V2 chrome:
 *
 *   - Top banner: clarifies user is on the preview, links back to Settings
 *   - CommandPalette: ⌘K / Ctrl-K opens the universal verb engine
 *   - data-density="cozy": baseline density (Linear-spacious). Operator
 *     power-users will be able to flip to "compact" or "dense" once the
 *     Phase 5 density toggle ships.
 *
 * From Phase 1 onwards, this component will replace DashboardShell
 * entirely and host:
 *   - V2Sidebar (Today / Workflows / Reference)
 *   - Astra ambient bar at the bottom
 *   - Pinned-Objects drawer (Gotham pattern)
 *
 * For now we keep V1 children rendering unwrapped underneath so super-
 * admins and pilot users can navigate the full app while we build.
 *
 * Scope: this component is only mounted from /dashboard/* layout —
 * Atlas, Pharos, Assure are unaffected. See docs/CAELEX-COMPLY-CONCEPT.md.
 */
export default function V2Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-density="cozy"
      className="min-h-screen bg-light-bg dark:bg-slate-950"
    >
      {/* ⌘K palette — client island, mounts globally for the V2 surface */}
      <CommandPalette />

      {/* Preview banner */}
      <div className="border-b border-amber-300/40 bg-amber-50/80 backdrop-blur-sm dark:border-amber-500/20 dark:bg-amber-950/30">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-6 py-2.5">
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-300">
              <Sparkles className="h-3 w-3" />
              Comply v2 · Preview
            </span>
            <span className="hidden text-amber-900/80 sm:inline dark:text-amber-100/80">
              You are on the redesigned shell. Press{" "}
              <Kbd className="border-amber-400/40 bg-white/60 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
                ⌘
              </Kbd>{" "}
              <Kbd className="border-amber-400/40 bg-white/60 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
                K
              </Kbd>{" "}
              to open the command palette.
            </span>
          </div>
          <Link
            href="/dashboard/settings/ui"
            className="rounded-md border border-amber-400/50 bg-white/60 px-3 py-1 text-xs font-medium text-amber-900 transition hover:bg-white dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
          >
            Switch back to V1
          </Link>
        </div>
      </div>

      {children}
    </div>
  );
}
