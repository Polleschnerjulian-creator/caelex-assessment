"use client";

/**
 * Caelex Trade — App Shell — Comply V2 chrome + WCAG 2.2 AA hardening.
 *
 * Accessibility additions (per WCAG 2.2 AA / EU Accessibility Act):
 *   - Skip-link at the top of the DOM (SC 2.4.1) so keyboard users
 *     can jump past the sidebar to main content.
 *   - main#main-content as the skip-link target + landmark.
 *   - lang="de" on the shell wrapper so screen readers pronounce the
 *     mixed German/English content correctly (SC 3.1.2).
 *   - Mobile drawer (Hamburger) brought back so nav is reachable
 *     below 768px without the sidebar (was dropped in the V2 port).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { TradeSidebar } from "./TradeSidebar";
import { TradeCommandPalette } from "./TradeCommandPalette";
import { TradeHelpCenter } from "./TradeHelpCenter";
import { ToastProvider } from "@/components/ui/Toast";
import type { SidebarBadgeCounts } from "@/lib/trade/sidebar-badge-counts.server";

interface Props {
  org: {
    id: string;
    name: string;
  };
  /** Server-fetched counts for sidebar attention badges. Optional —
   *  legacy callers/tests render without badges. */
  badgeCounts?: SidebarBadgeCounts;
  children: React.ReactNode;
}

export function TradeShell({ org, badgeCounts, children }: Props) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  // U-LOW-5 — subtle fade-in on route change. `pathname` as the key
  // means `<motion.div>` remounts on each navigation; Framer Motion's
  // initial → animate transition runs each time. Bounded to 180ms +
  // a slight Y-offset so the effect reads as "page settled", not
  // "page bounced". `motion-safe`/`prefers-reduced-motion` is honored
  // automatically by Framer Motion via its `reducedMotion` config.
  const pathname = usePathname();

  // ToastProvider wraps the entire Trade shell so any descendent client
  // component (OnboardingBanner, OperationLifecyclePanel, …) can call
  // useToast() to surface success / error / info notifications top-right.
  return (
    <ToastProvider>
      <div
        data-caelex-theme="dark"
        data-trade-theme="dark"
        lang="en"
        className="trade-themed dark comply-dark-canvas flex min-h-screen w-screen overflow-hidden text-white"
        style={{
          fontFamily:
            'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif',
        }}
      >
        {/* Skip-link — WCAG SC 2.4.1. First focusable element; visually
          hidden until keyboard focus, then jumps to main content. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus-visible:not-sr-only"
        >
          Skip to main content
        </a>

        {/* Sidebar — fixed dark rail pinned to the viewport so it never
            scrolls away on long pages. Was previously `sticky top-0`,
            but `sticky` was unreliable inside the `overflow-hidden`
            outer flex container — `fixed` is bulletproof. The main
            content gets `md:pl-[244px]` below to leave room for the
            sidebar's footprint. */}
        <aside
          className="fixed left-0 top-0 z-30 hidden h-screen md:block"
          aria-label="Trade navigation"
        >
          <TradeSidebar org={org} badgeCounts={badgeCounts} />
        </aside>

        {/* Mobile drawer — hamburger button + slide-in panel below md */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          className="fixed left-3 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-md md:hidden"
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            color: "rgba(255, 255, 255, 0.95)",
          }}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        {mobileOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside
              className="fixed inset-y-0 left-0 z-50 w-[244px] md:hidden"
              aria-label="Trade navigation (mobile)"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md"
                style={{ color: "rgba(255, 255, 255, 0.85)" }}
              >
                <X size={18} aria-hidden="true" />
              </button>
              <TradeSidebar org={org} badgeCounts={badgeCounts} />
            </aside>
          </>
        ) : null}

        {/* Main content area — skip-link target + landmark.
            md:pl-[244px] reserves the visual space the fixed sidebar
            occupies so content never slides under it on desktop.
            Wrapped in motion.div with `pathname` as key so each route
            change fades in (U-LOW-5). The inner div uses no max-width
            so the existing page-level layouts continue to control
            their own gutters. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex min-w-0 flex-1 flex-col overflow-x-hidden md:pl-[244px]"
        >
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex min-w-0 flex-1 flex-col"
          >
            {children}
          </motion.div>
        </main>

        {/* Global ⌘K / Ctrl+K palette — mounted once at shell level so the
          shortcut works regardless of which sub-route the user is on.
          The component owns its own open state + key listener; we don't
          need props here. */}
        <TradeCommandPalette />

        {/* Global "?" help center — same shell-level mount so the panel
          works from any route. Owns its own open state via "?" key +
          window event `caelex-trade:open-help`. */}
        <TradeHelpCenter />
      </div>
    </ToastProvider>
  );
}
