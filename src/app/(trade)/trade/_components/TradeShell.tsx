"use client";

/**
 * Caelex Trade — App Shell — "Passage" Neon-console architecture.
 *
 * Layout (per `.mockups/neon-shell.html`):
 *   ┌─────────────────────────────────────────────────┐
 *   │ top bar (full width, sticky, 52px)              │
 *   ├───────────────┬─────────────────────────────────┤
 *   │ sidebar 240px │  content (page children, flex-1) │
 *   │ (sticky)      │                                  │
 *   └───────────────┴─────────────────────────────────┘
 *   - top bar → TradeTopBar: brand + breadcrumb + ⌘K + Astra + help +
 *     avatar, sticky over both columns (like Neon's top bar)
 *   - sidebar → TradeSidebarNav: one flat, sectioned light sidebar
 *     (icons + labels), sticky below the top bar
 *   - main    → flex-1, document-scrolled
 *
 * THEME: the shell no longer hard-forces dark. It carries `trade-themed`
 * (which holds the `--trade-*` tokens) and lets the `data-trade-theme`
 * attribute on <html> (set by TradeThemeProvider + the layout flash-guard,
 * default "light") drive light vs dark. The page background uses the
 * `--trade-bg-page` token so it flips with the theme.
 *
 * Accessibility (WCAG 2.2 AA / EU Accessibility Act):
 *   - Skip-link first in the DOM (SC 2.4.1) → jumps past nav to content.
 *   - main#main-content is the skip-link target + landmark.
 *   - lang on the wrapper for correct pronunciation of mixed DE/EN (SC 3.1.2).
 *   - Mobile drawer (Hamburger) below md shows rail + panel together so nav
 *     stays reachable without the fixed columns.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { TradeTopBar } from "./TradeTopBar";
import { TradeSidebarNav } from "./TradeSidebarNav";
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
        lang="de"
        className="trade-themed min-h-screen w-full text-trade-text-primary"
        style={{
          background: "var(--trade-bg-page)",
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
          Zum Hauptinhalt springen
        </a>

        {/* Top bar — sticky, full width, over both the sidebar + content
            (the Neon-console shell). 52px tall. */}
        <div className="sticky top-0 z-40">
          <TradeTopBar org={org} />
        </div>

        {/* Mobile menu button — sits in the top bar's left slot below md
            (the top-bar logo is hidden on mobile). Opens the nav drawer. */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Navigation öffnen"
          aria-expanded={mobileOpen}
          className="fixed left-3 top-[10px] z-50 inline-flex h-8 w-8 items-center justify-center rounded-lg md:hidden"
          style={{
            background: "var(--trade-bg-panel)",
            border: "1px solid var(--trade-border)",
            color: "var(--trade-text-primary)",
          }}
        >
          <Menu size={18} aria-hidden="true" />
        </button>

        <div className="flex">
          {/* Single sidebar — sticky below the top bar (desktop). */}
          <aside
            className="sticky top-[52px] hidden h-[calc(100vh-52px)] w-[240px] shrink-0 md:block"
            aria-label="Trade navigation"
          >
            <TradeSidebarNav badgeCounts={badgeCounts} />
          </aside>

          {/* Main content — skip-link target + landmark. Wrapped in
              motion.div with `pathname` as key so each route change fades in
              (U-LOW-5). No max-width — page layouts own their gutters. */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex min-w-0 flex-1 flex-col"
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
        </div>

        {/* Mobile drawer — slide-in single sidebar below md */}
        {mobileOpen ? (
          <>
            <div
              className="fixed inset-0 z-[45] bg-black/40 md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside
              className="fixed inset-y-0 left-0 z-50 w-[260px] md:hidden"
              aria-label="Trade navigation (mobile)"
            >
              <div className="relative h-full">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Navigation schließen"
                  className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md"
                  style={{ color: "var(--trade-text-secondary)" }}
                >
                  <X size={18} aria-hidden="true" />
                </button>
                <TradeSidebarNav badgeCounts={badgeCounts} />
              </div>
            </aside>
          </>
        ) : null}

        {/* Global ⌘K / Ctrl+K palette — mounted once at shell level so the
          shortcut works regardless of which sub-route the user is on.
          `showPill={false}` keeps this instance invisible (keyboard +
          `TRADE_COMMAND_EVENT` driven only); the top bar dispatches the
          event to open this one. */}
        <TradeCommandPalette showPill={false} />

        {/* Global "?" help center — same shell-level mount so the panel
          works from any route. Owns its own open state via "?" key +
          window event `caelex-trade:open-help`. */}
        <TradeHelpCenter />
      </div>
    </ToastProvider>
  );
}
