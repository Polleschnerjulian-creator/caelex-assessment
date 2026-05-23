/**
 * Apple HIG-conformant workspace header — iteration 3.
 *
 * Type ramp follows Apple HIG exactly (from the user's research doc):
 *   - Title 2 (22px / Semibold / -0.020em tracking) for page title
 *   - Footnote (13px / Regular / -0.006em) for caption
 *
 * Caption uses tertiary label color (rgba(60,60,67,0.3) light /
 * rgba(235,235,245,0.3) dark) — labels are always greyscale + alpha
 * per Apple, never colored.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { ChevronDown } from "lucide-react";

interface WorkspaceHeaderProps {
  orgName: string;
}

export function WorkspaceHeader({ orgName }: WorkspaceHeaderProps) {
  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const formattedDate = dateFormatter.format(today);

  return (
    <header className="mb-10">
      {/* Toolbar row — workspace switcher (left) + live status (right) */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/trade/settings"
          className="group inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[13px] font-medium transition-colors"
          style={{
            color: "var(--trade-label-secondary)",
            transitionTimingFunction: "var(--trade-ease-out-quad)",
            transitionDuration: "var(--trade-dur-fast)",
          }}
        >
          <span>Workspace</span>
          <ChevronDown
            className="h-3 w-3 opacity-50 transition-transform group-hover:opacity-100"
            strokeWidth={2.5}
          />
        </Link>

        <div
          className="flex items-center gap-1.5 text-[12px]"
          style={{ color: "var(--trade-label-tertiary)" }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inset-0 animate-ping rounded-full opacity-50"
              style={{ background: "var(--trade-accent-success)" }}
            />
            <span
              className="relative h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--trade-accent-success)" }}
            />
          </span>
          <span>Live</span>
        </div>
      </div>

      {/* Display title — Apple Title 1 (28px / Regular) — Apple Mail
          "Today" pattern */}
      <div>
        <h1
          className="text-[28px] leading-[1.21] tracking-[-0.022em]"
          style={{
            color: "var(--trade-label)",
            fontWeight: 600,
          }}
        >
          Today
        </h1>
        <p
          className="mt-1 text-[13px]"
          style={{ color: "var(--trade-label-tertiary)" }}
        >
          {formattedDate} ·{" "}
          <span style={{ color: "var(--trade-label-secondary)" }}>
            {orgName}
          </span>
        </p>
      </div>
    </header>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
