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
import { Menu, X } from "lucide-react";
import { TradeSidebar } from "./TradeSidebar";

interface Props {
  org: {
    id: string;
    name: string;
  };
  children: React.ReactNode;
}

export function TradeShell({ org, children }: Props) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div
      data-caelex-theme="dark"
      data-trade-theme="dark"
      lang="de"
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

      {/* Sidebar — sticky dark rail, same material as Comply V2 */}
      <aside
        className="sticky top-0 hidden h-screen md:block"
        aria-label="Trade navigation"
      >
        <TradeSidebar org={org} />
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
            <TradeSidebar org={org} />
          </aside>
        </>
      ) : null}

      {/* Main content area — skip-link target + landmark */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-w-0 flex-1 flex-col overflow-x-hidden"
      >
        {children}
      </main>
    </div>
  );
}
