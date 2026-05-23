/**
 * Apple HIG-conformant workspace header for the Trade welcome page.
 *
 * Layout follows Apple Mail / Calendar / Music "Today" view:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  Workspace ▽                                  ● Live     │ ← toolbar
 *   ├──────────────────────────────────────────────────────────┤
 *   │  Today                                                    │ ← display title
 *   │  Mittwoch, 23. Mai · MEVA                                 │ ← caption (secondary)
 *   └──────────────────────────────────────────────────────────┘
 *
 * Typography:
 *   - Title: SF Pro Display 32pt regular weight (W400 = "regular",
 *     not "bold")
 *   - Caption: SF Pro Text 13pt regular, tertiary color
 *
 * No heavy borders, no rounded boxes, no accent gradients — just
 * typography hierarchy on a clean surface.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { ChevronDown } from "lucide-react";

interface WorkspaceHeaderProps {
  orgName: string;
}

export function WorkspaceHeader({ orgName }: WorkspaceHeaderProps) {
  // Format date in Apple-style (long form, German locale): "Mittwoch, 23. Mai"
  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formattedDate = dateFormatter.format(today);

  return (
    <header className="mb-10">
      {/* Toolbar row — workspace switcher + live indicator */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/trade/settings"
          className="group inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[13px] font-medium text-trade-text-secondary transition-colors hover:bg-trade-bg-subtle hover:text-trade-text-primary"
        >
          <span>Workspace</span>
          <ChevronDown
            className="h-3 w-3 opacity-50 transition-transform group-hover:opacity-100"
            strokeWidth={2.5}
          />
        </Link>

        <div className="flex items-center gap-1.5 text-[12px] text-trade-text-muted">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          <span>Live</span>
        </div>
      </div>

      {/* Display title — Apple SF Pro Display, regular weight, generous */}
      <div>
        <h1 className="text-[34px] font-normal leading-tight tracking-[-0.02em] text-trade-text-primary">
          Today
        </h1>
        <p className="mt-1 text-[14px] text-trade-text-muted">
          {formattedDate} ·{" "}
          <span className="text-trade-text-secondary">{orgName}</span>
        </p>
      </div>
    </header>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
