"use client";

/**
 * Caelex Trade — App Shell — Apple HIG iteration 3.
 *
 * Implements the macOS Big Sur+ unified-window layout per the user's
 * Apple Liquid Glass research:
 *   - Sidebar uses `trade-glass` (translucent, backdrop-blurred, inner
 *     specular highlight) as the chrome-layer material — never on
 *     data surfaces.
 *   - Main content sits on `--trade-surface` (opaque white in light,
 *     opaque black in dark) for legibility-first data display.
 *   - 1px hairline separator instead of gap-padding floating panels.
 *
 * Glass material is auto-downgraded to opaque under
 * `prefers-reduced-transparency` (Apple HIG mandate / EU Accessibility
 * Act compliance).
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
        background: "var(--trade-surface-secondary)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter Variable", "Inter", "Segoe UI Variable", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* Sidebar — chrome layer, glass-regular material.
          Borderless so the trade-glass border draws the only separator. */}
      <aside
        className="trade-glass w-[240px] shrink-0 overflow-hidden"
        style={{
          borderTop: "none",
          borderLeft: "none",
          borderBottom: "none",
          borderRight: "1px solid var(--trade-separator)",
        }}
      >
        <TradeSidebar org={org} />
      </aside>

      {/* Main content area — opaque surface (data-first per Apple HIG).
          Background is white in light mode, pure black in dark. */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ background: "var(--trade-surface)" }}
      >
        {children}
      </main>
    </div>
  );
}
