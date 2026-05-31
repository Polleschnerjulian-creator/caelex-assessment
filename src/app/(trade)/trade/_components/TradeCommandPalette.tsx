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

const COMMANDS: Command[] = [
  {
    label: "Neuer Vorgang",
    href: "/trade/operations/new",
    keywords: "ausfuhr export anlegen operation",
  },
  {
    label: "Partner screenen",
    href: "/trade/parties",
    keywords: "counterparty sanktion screening",
  },
  {
    label: "Artikel klassifizieren",
    href: "/trade/items",
    keywords: "classify eccn usml item",
  },
  {
    label: "Pipeline öffnen",
    href: "/trade/operations",
    keywords: "vorgänge operations",
  },
  { label: "Lizenzen", href: "/trade/licenses", keywords: "license bafa" },
  {
    label: "Dokumente",
    href: "/trade/documents",
    keywords: "euc vsd genehmigung",
  },
  {
    label: "Astra fragen",
    href: "/trade/astra",
    keywords: "ai assistent frage",
  },
  {
    label: "Compliance-Programm",
    href: "/trade/program",
    keywords: "icp programm",
  },
  {
    label: "Einstellungen",
    href: "/trade/settings",
    keywords: "settings konfiguration",
  },
];

export function TradeCommandPalette() {
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
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      <button
        data-testid="cmdk-pill"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-trade-border bg-trade-bg-elevated px-3 py-1.5 text-xs text-trade-text-muted transition hover:bg-trade-hover"
      >
        <Search className="h-3.5 w-3.5" />
        <span>⌘K&nbsp;&nbsp;Suchen oder Aktion…</span>
      </button>

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
