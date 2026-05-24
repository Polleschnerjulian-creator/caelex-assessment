"use client";

/**
 * TradeHelpCenter — in-app help side-panel for Caelex Trade.
 *
 * Combines U-HIGH-8 (Help Center / Glossar / Docs link) and U-LOW-4
 * (Keyboard-Shortcuts cheatsheet) into a single panel because they
 * answer the same operator question: "what am I looking at and how do
 * I use it?". Splitting them across two surfaces fragments the answer.
 *
 * Triggers (any of):
 *   - "?" key (Slack / Linear / GitHub convention)
 *   - "Help" link in the sidebar footer
 *   - Programmatic via window event "caelex-trade:open-help"
 *
 * Content sections (in order):
 *   1. Quick start — three high-level "what should I do first" prompts
 *      that deep-link into Astra with pre-filled questions.
 *   2. Glossary — top 24 compliance acronyms with one-line definitions.
 *      Search field at the top so an operator can type "FDPR" and jump.
 *   3. Keyboard shortcuts — the global ones (⌘K, ?, Esc) plus a hint
 *      that ⌘K finds anything.
 *   4. Resources — link to Training Corpus + ICP documentation page.
 *
 * Why a slide-in panel rather than a /trade/help page:
 *   - Keeps the user's current context (they don't lose their place).
 *   - Esc/click-outside closes — discoverable + reversible.
 *   - Mounted at TradeShell level so it works from anywhere.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import Link from "next/link";
import {
  X,
  Search,
  Sparkles,
  BookOpen,
  Keyboard,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { GLOSSARY } from "@/lib/trade/glossary";

// Glossary lives in `src/lib/trade/glossary.ts` so both this side-
// panel AND the inline <Term> tooltip component share one source of
// truth (U-HIGH-7 refactor).

interface QuickStartPrompt {
  label: string;
  prefill: string;
}

const QUICK_START_PROMPTS: ReadonlyArray<QuickStartPrompt> = [
  {
    label: "How do I classify my first item?",
    prefill:
      "I'm new to Caelex Trade. Walk me through classifying my first item — ECCN, USML, EU Annex I, MTCR, and the German Ausfuhrliste in one pass. What information do I need?",
  },
  {
    label: "How does sanctions screening work here?",
    prefill:
      "Explain how Caelex screens counterparties. Which lists are covered (OFAC SDN / BIS Entity / DDTC Debarred / UK OFSI / UN Consolidated)? How does the OFAC 50% Rule cascade work for beneficial owners?",
  },
  {
    label: "Which license should I apply for?",
    prefill:
      "I have a controlled item I want to export. Compare my license options: BAFA-Einzelgenehmigung, AGG/AGE, BIS, DDTC DSP-5, EU general authorisation. How do I decide?",
  },
];

const SHORTCUTS: ReadonlyArray<{ keys: string; description: string }> = [
  { keys: "⌘ K", description: "Open command palette" },
  { keys: "Ctrl K", description: "Open command palette (Win/Linux)" },
  { keys: "⌘ /", description: "Open command palette (alternate)" },
  { keys: "?", description: "Open this help panel" },
  { keys: "Esc", description: "Close palette / help / modal" },
];

// ─── Component ────────────────────────────────────────────────────────

export function TradeHelpCenter() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  // "?" key handler — only fires when not focused inside a text input
  // (so typing "?" into a search box doesn't open the help panel).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setOpen((v) => !v);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Programmatic trigger — sidebar footer "Help" button dispatches
  // `caelex-trade:open-help` so we don't have to thread a callback
  // through the component tree.
  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("caelex-trade:open-help", onOpen);
    return () => window.removeEventListener("caelex-trade:open-help", onOpen);
  }, []);

  // Close on Esc (Radix-free; we render our own overlay so we own this).
  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  // Filter glossary on input. Matches on term AND definition so an
  // operator searching for "dual-use" finds EAR/ECCN/CCL entries even
  // though those words aren't in the term text.
  const filteredGlossary = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return GLOSSARY;
    return GLOSSARY.filter(
      (g) =>
        g.term.toLowerCase().includes(needle) ||
        g.definition.toLowerCase().includes(needle) ||
        (g.category?.toLowerCase().includes(needle) ?? false),
    );
  }, [query]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="trade-help-heading"
      className="fixed inset-0 z-[60] flex justify-end"
    >
      {/* Overlay — click outside to close. role="presentation" so
          screen readers skip it (the dialog is the focusable surface). */}
      <div
        role="presentation"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/40"
      />

      {/* Slide-in panel — fixed-width on desktop, full-width on mobile */}
      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto bg-trade-bg-panel shadow-xl"
        style={{
          borderLeft: "1px solid var(--trade-separator, rgba(0,0,0,0.08))",
        }}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-trade-border-subtle bg-trade-bg-panel px-5 py-3">
          <div className="flex items-center gap-2">
            <HelpCircle
              className="h-4 w-4 text-trade-text-secondary"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <h2
              id="trade-help-heading"
              className="text-[13px] font-semibold text-trade-text-primary"
            >
              Caelex Trade — Help
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close help panel"
            className="rounded-md p-1 text-trade-text-muted transition hover:bg-trade-bg-elevated hover:text-trade-text-primary"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 px-5 py-5">
          {/* ─── Quick start ─── */}
          <section className="mb-6">
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-trade-text-muted">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Quick start with Astra
            </h3>
            <ul className="space-y-1.5">
              {QUICK_START_PROMPTS.map((prompt) => (
                <li key={prompt.label}>
                  <Link
                    href={`/trade/astra?prefill=${encodeURIComponent(prompt.prefill)}`}
                    onClick={() => setOpen(false)}
                    className="group flex items-start gap-2 rounded-md border border-trade-border-subtle bg-trade-bg-elevated px-3 py-2 text-[12px] text-trade-text-secondary transition hover:border-trade-accent hover:text-trade-text-primary"
                  >
                    <Sparkles
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-trade-text-muted transition group-hover:text-trade-accent"
                      aria-hidden="true"
                    />
                    <span className="flex-1">{prompt.label}</span>
                    <ChevronRight
                      className="mt-0.5 h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* ─── Glossary ─── */}
          <section className="mb-6">
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-trade-text-muted">
              <BookOpen className="h-3 w-3" aria-hidden="true" />
              Glossary
            </h3>
            <div className="relative mb-2">
              <Search
                className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-trade-text-muted"
                aria-hidden="true"
              />
              <label htmlFor="trade-help-glossary-search" className="sr-only">
                Search glossary
              </label>
              <input
                id="trade-help-glossary-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ECCN, FDPR, OFAC…"
                className="w-full rounded-md border border-trade-border-subtle bg-trade-bg-elevated py-1.5 pl-8 pr-3 text-[12px] text-trade-text-primary outline-none placeholder:text-trade-text-muted focus:border-trade-accent focus:ring-2 focus:ring-trade-accent/30"
              />
            </div>
            {filteredGlossary.length === 0 ? (
              <p className="text-[12px] text-trade-text-muted">
                No matches. Try a different term or ask Astra above.
              </p>
            ) : (
              <ul className="divide-y divide-trade-border-subtle">
                {filteredGlossary.map((entry) => (
                  <li key={entry.term} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[12px] font-semibold text-trade-text-primary">
                        {entry.term}
                      </span>
                      {entry.category ? (
                        <span className="text-[10px] uppercase tracking-wider text-trade-text-muted">
                          {entry.category}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-trade-text-secondary">
                      {entry.definition}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ─── Keyboard shortcuts (U-LOW-4) ─── */}
          <section className="mb-6">
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-trade-text-muted">
              <Keyboard className="h-3 w-3" aria-hidden="true" />
              Keyboard shortcuts
            </h3>
            <ul className="space-y-1">
              {SHORTCUTS.map((s) => (
                <li
                  key={s.keys}
                  className="flex items-center justify-between gap-3 text-[12px] text-trade-text-secondary"
                >
                  <span>{s.description}</span>
                  <kbd className="rounded border border-trade-border-subtle bg-trade-bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-trade-text-primary">
                    {s.keys}
                  </kbd>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-trade-text-muted">
              The command palette (⌘K) finds any nav target, quick-create
              action, or Astra prompt — 27 verbs across navigate / create /
              Astra / settings.
            </p>
          </section>

          {/* ─── Resources ─── */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-trade-text-muted">
              Resources
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/trade/research/training-corpus"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-[12px] text-trade-text-secondary transition hover:text-trade-text-primary"
                >
                  <BookOpen
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                    strokeWidth={1.75}
                  />
                  Training Corpus — BAFA AzG + DDTC CJ precedents
                </Link>
              </li>
              <li>
                <Link
                  href="/trade/program"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-[12px] text-trade-text-secondary transition hover:text-trade-text-primary"
                >
                  <BookOpen
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                    strokeWidth={1.75}
                  />
                  Internal Compliance Program (ICP) documentation
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
