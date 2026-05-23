"use client";

/**
 * Caelex Trade — App Shell — Apple HIG iteration.
 *
 * Layout follows macOS Big Sur+ unified-window pattern (Mail / Music /
 * System Settings / Finder):
 *   - Single continuous surface — sidebar and content touch
 *   - 1px hairline border separates sidebar from content (no gap)
 *   - No rounded panels, no floating shadows
 *   - Sidebar uses subtle elevated background tint (like Apple's
 *     NSVisualEffectView sidebar material)
 *
 * The shell is purely visual chrome — auth, productAccess, and org
 * resolution all happen in (trade)/trade/layout.tsx (server component).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

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
      className="trade-themed flex h-screen w-screen overflow-hidden bg-trade-bg-panel text-trade-text-primary"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif',
      }}
    >
      {/* Sidebar — slightly elevated tint (mimics NSVisualEffectView sidebar),
          1px right hairline. No rounded corners, no shadow. */}
      <aside className="w-[240px] shrink-0 overflow-hidden border-r border-black/[0.07] bg-trade-bg-elevated dark:border-white/[0.06]">
        <TradeSidebar org={org} />
      </aside>

      {/* Main content area — primary surface, no border, no shadow. */}
      <main className="flex-1 overflow-y-auto bg-trade-bg-panel">
        {children}
      </main>
    </div>
  );
}
