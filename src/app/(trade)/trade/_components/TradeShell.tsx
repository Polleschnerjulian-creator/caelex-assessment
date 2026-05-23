"use client";

/**
 * Caelex Trade — App Shell — clean macOS sidebar pattern.
 *
 * Sidebar: opaque `--trade-surface-secondary` (#F2F2F7 light, #1C1C1E
 * dark) — this is Apple's actual macOS sidebar tint, NOT glass. Glass
 * is reserved for floating chrome (toolbar overlays, command palette,
 * modals).
 *
 * Main content: opaque `--trade-surface` (pure white / pure black).
 *
 * 1px hairline separator between the two columns. No padding gap.
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
      className="trade-themed flex h-screen w-screen overflow-hidden text-[color:var(--trade-label)]"
      style={{
        background: "var(--trade-surface)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter Variable", "Inter", "Segoe UI Variable", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* Sidebar — Apple macOS sidebar tint, opaque. */}
      <aside
        className="w-[240px] shrink-0 overflow-hidden"
        style={{
          background: "var(--trade-surface-secondary)",
          borderRight: "1px solid var(--trade-separator)",
        }}
      >
        <TradeSidebar org={org} />
      </aside>

      {/* Main content area — opaque surface (data-first per HIG). */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ background: "var(--trade-surface)" }}
      >
        {children}
      </main>
    </div>
  );
}
