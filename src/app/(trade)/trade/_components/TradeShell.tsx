"use client";

/**
 * Caelex Trade — App Shell — three-column layout.
 *
 *   ┌──┬─────┬────────────────────┐
 *   │R │ Sb  │  Main content      │
 *   │a │ ide │                    │
 *   │i │ bar │                    │
 *   │l │     │                    │
 *   └──┴─────┴────────────────────┘
 *
 *   - Rail (56px, dark #0A0A0A) — primary app sections (Today / Data /
 *     Operations / Documents / Astra / Settings). Caelex brand mark
 *     pinned to top.
 *   - Sidebar (240px, light --trade-surface-secondary) — shows the
 *     subsection of items for the currently-active rail section.
 *   - Main (flex, opaque --trade-surface) — page content.
 *
 * Matches the reference UI pattern (Linear / Notion / Apple Mail
 * "Mailboxes column" model).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { TradeRail } from "./TradeRail";
import { TradeSidebar } from "./TradeSidebar";

interface Props {
  org: {
    id: string;
    name: string;
  };
  children: React.ReactNode;
}

export function TradeShell({ org, children }: Props) {
  return (
    <div
      className="trade-themed flex h-screen w-screen overflow-hidden text-[color:var(--trade-label)]"
      style={{
        background: "var(--trade-surface)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter Variable", "Inter", "Segoe UI Variable", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* Column 1 — dark icon rail */}
      <TradeRail />

      {/* Column 2 — light context sidebar */}
      <aside
        className="hidden w-[240px] shrink-0 overflow-hidden md:block"
        style={{
          background: "var(--trade-surface-secondary)",
          borderRight: "1px solid var(--trade-separator)",
        }}
      >
        <TradeSidebar org={org} />
      </aside>

      {/* Column 3 — main content (opaque per Apple HIG) */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ background: "var(--trade-surface)" }}
      >
        {children}
      </main>
    </div>
  );
}
