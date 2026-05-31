"use client";

/**
 * Caelex Trade — Command Palette (⌘K / Ctrl-K).
 *
 * U-CRIT-4. Universal verb engine for the Trade workspace. Every nav
 * destination, every quick-create action reachable in two keystrokes.
 *
 * Keyboard contract:
 *   - ⌘K / Ctrl+K toggles the palette globally inside `/trade/*`.
 *   - Esc / outside-click closes.
 *
 * Accessibility:
 *   - Focus-trap via modal overlay approach.
 *   - autoFocus on input when opened.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

interface Command {
  label: string;
  href: string;
  keywords?: string;
}

/** Window event any trigger pill can dispatch to open the shell-level palette. */
export const TRADE_COMMAND_EVENT = "caelex-trade:open-command";

const COMMANDS: Command[] = [
  // ── Verbs (the redesign's task-first entries) ──
  {
    label: "Neuer Vorgang",
    href: "/trade/operations/new",
    keywords: "ausfuhr export anlegen operation darf ich liefern",
  },
  {
    label: "Partner screenen",
    href: "/trade/parties",
    keywords: "counterparty gegenpartei sanktion screening ofac",
  },
  {
    label: "Artikel klassifizieren",
    href: "/trade/items",
    keywords: "classify eccn usml item ware",
  },
  // ── Navigation (every reachable route, so ⌘K is the full catch-all) ──
  { label: "Home", href: "/trade", keywords: "übersicht overview start" },
  {
    label: "Pipeline öffnen",
    href: "/trade/operations",
    keywords: "vorgänge operations",
  },
  { label: "Lizenzen", href: "/trade/licenses", keywords: "license bafa" },
  {
    label: "Dokumente",
    href: "/trade/documents",
    keywords: "euc vsd genehmigung nachweise",
  },
  {
    label: "End-Use Certificates",
    href: "/trade/euc",
    keywords: "euc endverwender certificate",
  },
  {
    label: "Re-Export Consents",
    href: "/trade/reexport-consents",
    keywords: "reexport zustimmung",
  },
  {
    label: "Self-Disclosures (VSD)",
    href: "/trade/vsd",
    keywords: "vsd selbstanzeige voluntary",
  },
  {
    label: "Sammelgenehmigungen",
    href: "/trade/sammelgenehmigungen",
    keywords: "sag bulk bafa sammel",
  },
  {
    label: "France LOS",
    href: "/trade/france-los",
    keywords: "frankreich licence",
  },
  {
    label: "UK ECJU",
    href: "/trade/uk-ecju",
    keywords: "uk oiel siel strategic",
  },
  {
    label: "FAA AST",
    href: "/trade/faa-ast",
    keywords: "faa launch part 450 us",
  },
  {
    label: "Deemed Exports",
    href: "/trade/deemed-exports",
    keywords: "deemed technologie zugang z13",
  },
  {
    label: "Astra fragen",
    href: "/trade/astra",
    keywords: "ai assistent frage chat",
  },
  {
    label: "Compliance-Programm",
    href: "/trade/program",
    keywords: "icp programm",
  },
  {
    label: "Einstellungen",
    href: "/trade/settings",
    keywords: "settings konfiguration profil",
  },
];

/**
 * @param showPill  when true, render the visible trigger pill (used in the
 *   Home header). When false (the shell-level global mount), the palette is
 *   keyboard/event-driven only — no pill — so it never double-renders with a
 *   header pill. Both instances would otherwise show; the shell mount stays
 *   invisible and just owns the global ⌘K + `TRADE_COMMAND_EVENT` listener.
 */
export function TradeCommandPalette({
  showPill = true,
}: {
  showPill?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(TRADE_COMMAND_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(TRADE_COMMAND_EVENT, onOpenEvent);
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.keywords ?? "").toLowerCase().includes(q),
    );
  }, [query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  return (
    <>
      {showPill && (
        <button
          data-testid="cmdk-pill"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-trade-border bg-trade-bg-elevated px-3 py-1.5 text-xs text-trade-text-muted transition hover:bg-trade-hover"
        >
          <Search className="h-3.5 w-3.5" />
          <span>⌘K&nbsp;&nbsp;Suchen oder Aktion…</span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[15vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-trade-border bg-trade-bg-panel shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              data-testid="cmdk-input"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Was willst du tun?"
              className="w-full border-b border-trade-border bg-transparent px-4 py-3 text-sm text-trade-text-primary outline-none"
            />
            <ul
              data-testid="cmdk-list"
              className="max-h-80 overflow-y-auto py-1"
            >
              {results.map((c) => (
                <li key={c.href}>
                  <button
                    onClick={() => go(c.href)}
                    className="flex w-full items-center px-4 py-2.5 text-left text-sm text-trade-text-primary transition hover:bg-trade-hover"
                  >
                    {c.label}
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="px-4 py-3 text-sm text-trade-text-muted">
                  Keine Treffer
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
