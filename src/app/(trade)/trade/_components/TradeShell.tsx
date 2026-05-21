"use client";

/**
 * Caelex Trade — App Shell (Sprint T2).
 *
 * Floating-panel layout mirroring AtlasShellV2:
 *   - Page background (`bg-trade-bg-page`) is the gap colour between the
 *     two panels and the viewport edge
 *   - Sidebar and main content are floating panels with rounded corners,
 *     subtle shadow, and a thin ring
 *   - The `trade-themed` class on the root applies the indigo accent
 *     token palette defined in globals.css
 *
 * The shell is purely visual chrome — auth, productAccess, and org
 * resolution all happen in (trade)/trade/layout.tsx (server component).
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
    <div className="trade-themed flex h-screen w-screen gap-2 bg-trade-bg-page p-2 text-trade-text-primary">
      <aside className="w-[260px] shrink-0 overflow-hidden rounded-xl bg-trade-bg-panel shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.06),0_24px_64px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.4)] dark:ring-white/[0.06]">
        <TradeSidebar org={org} />
      </aside>
      <main className="flex-1 overflow-y-auto rounded-xl bg-trade-bg-panel shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_rgba(0,0,0,0.06),0_24px_64px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.04] dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.4)] dark:ring-white/[0.06]">
        {children}
      </main>
    </div>
  );
}
