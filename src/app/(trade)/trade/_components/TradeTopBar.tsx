"use client";

/**
 * Caelex Trade — Top bar (Neon-console shell, full-width header).
 *
 * The horizontal bar that spans the top of the Passage shell — like Neon's
 * top bar. Carries:
 *   - left: dark Passage logo chip → Home, then a breadcrumb
 *     `org / <active section>` derived from the pathname.
 *   - right: ⌘K command trigger, Astra link, "?" help trigger, and the
 *     org-initials avatar (→ settings).
 *
 * The ⌘K + "?" buttons dispatch the same window events the shell-level
 * <TradeCommandPalette> / <TradeHelpCenter> listen for, so no palette is
 * double-mounted here.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Sparkles, HelpCircle, ChevronRight } from "lucide-react";
import { TRADE_COMMAND_EVENT } from "./TradeCommandPalette";
import { activeNavLabel } from "./trade-nav";

const HELP_EVENT = "caelex-trade:open-help";

/** Two-letter initials from an org name (e.g. "Acme Space" → "AS"). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TradeTopBar({ org }: { org: { id: string; name: string } }) {
  const pathname = usePathname();
  const section = activeNavLabel(pathname);

  return (
    <header
      className="flex h-[52px] items-center gap-3 px-4"
      style={{
        background: "var(--trade-bg-panel)",
        borderBottom: "1px solid var(--trade-border)",
      }}
    >
      {/* Brand mark → Home */}
      <Link
        href="/trade"
        aria-label={`${org.name} — Passage`}
        title="Passage"
        className="hidden place-items-center transition-opacity hover:opacity-90 md:grid"
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: "linear-gradient(160deg, #26282f, #141519)",
          boxShadow: "0 1px 2px rgba(0,0,0,.15)",
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 19 L13 5 M11 19 L19 5"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M4 12 H20"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity=".55"
          />
        </svg>
      </Link>

      {/* Breadcrumb — org / active section */}
      <nav
        className="ml-10 flex min-w-0 items-center gap-1.5 text-[13px] md:ml-0"
        aria-label="Breadcrumb"
      >
        <span className="truncate font-semibold text-trade-text-primary">
          {org.name}
        </span>
        {section ? (
          <>
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-trade-text-muted"
              aria-hidden="true"
            />
            <span className="truncate text-trade-text-secondary">
              {section}
            </span>
          </>
        ) : null}
      </nav>

      <div className="flex-1" />

      {/* ⌘K command trigger */}
      <button
        type="button"
        data-testid="topbar-cmdk"
        onClick={() => window.dispatchEvent(new Event(TRADE_COMMAND_EVENT))}
        className="hidden items-center gap-2 rounded-lg border border-trade-border bg-trade-bg-panel px-3 text-[12px] text-trade-text-muted transition hover:bg-trade-hover sm:inline-flex"
        style={{ height: 32 }}
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="rounded border border-trade-border bg-trade-bg-subtle px-1 text-[11px]">
          ⌘K
        </span>
        <span>Suchen oder Aktion…</span>
      </button>

      {/* Astra */}
      <Link
        href="/trade/astra"
        className="inline-flex items-center gap-1.5 rounded-lg border border-trade-border bg-trade-bg-panel px-3 text-[13px] font-medium text-trade-text-primary transition hover:bg-trade-hover"
        style={{ height: 32 }}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Astra
      </Link>

      {/* Help */}
      <button
        type="button"
        aria-label="Hilfe"
        onClick={() => window.dispatchEvent(new Event(HELP_EVENT))}
        className="grid place-items-center rounded-lg border border-trade-border bg-trade-bg-panel text-trade-text-secondary transition hover:bg-trade-hover"
        style={{ width: 32, height: 32 }}
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
      </button>

      {/* Org avatar → settings */}
      <Link
        href="/trade/settings"
        title={org.name}
        aria-label={`${org.name} — Einstellungen`}
        className="grid place-items-center text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
        style={{
          width: 30,
          height: 30,
          borderRadius: 9,
          background: "linear-gradient(150deg, #3c3f46, #222329)",
        }}
      >
        {initials(org.name)}
      </Link>
    </header>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
