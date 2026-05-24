"use client";

/**
 * Caelex Trade — App Shell — matches Caelex Comply V2 chrome.
 *
 * Layout mirrors `src/components/dashboard/v2/V2Shell.tsx`:
 *   - Dark canvas (`comply-dark-canvas` via data-caelex-theme="dark")
 *   - Solid premium sidebar (244px, rgb(20,20,22)) with hairline edge
 *   - Main content area on canvas, no top bar (yet)
 *
 * The `trade-themed` class still scopes Trade's accent tokens (indigo),
 * but the chrome layer uses the same Caelex dark canvas + sidebar
 * material as Comply for visual consistency across products.
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
      data-caelex-theme="dark"
      data-trade-theme="dark"
      className="trade-themed dark comply-dark-canvas flex min-h-screen w-screen overflow-hidden text-white"
      style={{
        fontFamily:
          'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif',
      }}
    >
      {/* Sidebar — sticky dark rail, same material as Comply V2 */}
      <aside className="sticky top-0 hidden h-screen md:block">
        <TradeSidebar org={org} />
      </aside>

      {/* Main content area — opaque page surfaces */}
      <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
