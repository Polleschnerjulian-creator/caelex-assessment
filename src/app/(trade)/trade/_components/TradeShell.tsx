"use client";

/**
 * Caelex Trade — App Shell — "Passage" light two-column architecture.
 *
 * Layout (per `.mockups/passage-light.html`):
 *   ┌──────┬───────────────┬──────────────────────────┐
 *   │ rail │ context panel │  content (page children) │
 *   │ 62px │    250px      │  flex-1                   │
 *   └──────┴───────────────┴──────────────────────────┘
 *   - rail  → black icon chrome (TradeRail), always dark
 *   - panel → white themed contextual nav (TradeContextPanel)
 *   - main  → md:pl-[312px] (62 + 250) so content clears both columns
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
import { TradeRail } from "./TradeRail";
import { TradeContextPanel } from "./TradeContextPanel";
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
        className="trade-themed flex min-h-screen w-screen overflow-hidden text-trade-text-primary"
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

        {/* Two-column nav — black icon rail (62px) + white contextual panel
            (250px). Both fixed to the viewport so they never scroll away on
            long pages; main content gets md:pl-[312px] to clear them. */}
        <aside
          className="fixed left-0 top-0 z-30 hidden h-screen w-[62px] md:block"
          aria-label="Trade navigation"
        >
          <TradeRail org={org} badgeCounts={badgeCounts} />
        </aside>
        <aside
          className="fixed left-[62px] top-0 z-30 hidden h-screen w-[250px] md:block"
          aria-label="Trade section navigation"
        >
          <TradeContextPanel badgeCounts={badgeCounts} />
        </aside>

        {/* Mobile drawer — hamburger button + slide-in panel below md */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Navigation öffnen"
          aria-expanded={mobileOpen}
          className="fixed left-3 top-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-md md:hidden"
          style={{
            background: "var(--trade-bg-panel)",
            border: "0.5px solid var(--trade-border)",
            color: "var(--trade-text-primary)",
          }}
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        {mobileOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside
              className="fixed inset-y-0 left-0 z-50 flex md:hidden"
              aria-label="Trade navigation (mobile)"
            >
              {/* Rail + panel together so the mobile drawer mirrors desktop */}
              <div className="h-full w-[62px]">
                <TradeRail org={org} badgeCounts={badgeCounts} />
              </div>
              <div className="relative h-full w-[250px]">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Navigation schließen"
                  className="absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-md"
                  style={{ color: "var(--trade-text-secondary)" }}
                >
                  <X size={18} aria-hidden="true" />
                </button>
                <TradeContextPanel badgeCounts={badgeCounts} />
              </div>
            </aside>
          </>
        ) : null}

        {/* Main content area — skip-link target + landmark.
            md:pl-[312px] reserves the visual space the two fixed columns
            occupy so content never slides under them on desktop.
            Wrapped in motion.div with `pathname` as key so each route
            change fades in (U-LOW-5). The inner div uses no max-width
            so the existing page-level layouts continue to control
            their own gutters. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex min-w-0 flex-1 flex-col overflow-x-hidden md:pl-[312px]"
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
          `showPill={false}` keeps this instance invisible (keyboard +
          `TRADE_COMMAND_EVENT` driven only); visible trigger pills live in
          page headers (e.g. Home) and dispatch the event to open this one.
          The component owns its own open state + key listener. */}
        <TradeCommandPalette showPill={false} />

        {/* Global "?" help center — same shell-level mount so the panel
          works from any route. Owns its own open state via "?" key +
          window event `caelex-trade:open-help`. */}
        <TradeHelpCenter />
      </div>
    </ToastProvider>
  );
}
