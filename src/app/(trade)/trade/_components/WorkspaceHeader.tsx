/**
 * Apple-style workspace header for the Trade welcome page.
 *
 * Replaces the large "Caelex Trade" H1 + LIVE pill + 3-line paragraph
 * with a tight, Finder-style header:
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  Workspace ▽                              ● Live · 30d   │
 *   ├──────────────────────────────────────────────────────────┤
 *   │  Welcome to {org.name}                                   │
 *   │  Classify. License. Ship. Today's overview.              │
 *   └──────────────────────────────────────────────────────────┘
 *
 * The dropdown chevron is a click-target for the org switcher (TBD —
 * placeholder for now, navigates to /trade/settings on click).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { ChevronDown } from "lucide-react";

interface WorkspaceHeaderProps {
  orgName: string;
  /** ISO date of the snapshot window — typically today. */
  windowLabel?: string;
}

export function WorkspaceHeader({
  orgName,
  windowLabel = "Last 30 days",
}: WorkspaceHeaderProps) {
  return (
    <header className="mb-10">
      {/* Top row — org switcher dropdown + live indicator */}
      <div className="mb-6 flex items-center justify-between border-b border-black/[0.06] pb-4 dark:border-white/[0.06]">
        <Link
          href="/trade/settings"
          className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[14px] font-medium text-trade-text-secondary transition-colors hover:bg-trade-bg-subtle hover:text-trade-text-primary"
        >
          <span>Workspace</span>
          <ChevronDown
            className="h-3.5 w-3.5 opacity-50 transition-transform group-hover:opacity-100"
            strokeWidth={2.5}
          />
        </Link>

        <div className="flex items-center gap-3">
          <p className="text-[12px] text-trade-text-muted">{windowLabel}</p>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </div>
        </div>
      </div>

      {/* Title row */}
      <div>
        <h1 className="text-[32px] font-light leading-tight tracking-tight text-trade-text-primary">
          Welcome to{" "}
          <span className="font-medium text-trade-accent-strong">
            {orgName}
          </span>
        </h1>
        <p className="mt-1.5 text-[15px] text-trade-text-secondary">
          Classify. License. Ship. Today&rsquo;s overview is below.
        </p>
      </div>
    </header>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
