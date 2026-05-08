"use client";

/**
 * Sprint UF5 — Top-bar Help drawer.
 *
 * Single global access point for in-app help. Opens via the (?) icon
 * in the V2TopBar (or via "?" keyboard shortcut, like Linear).
 *
 * Three sections, ordered by what users most need:
 *
 *   1. Quick actions   — first-time tasks: assessment, mission, invite
 *   2. Glossary search — every domain term + acronym (filterable)
 *   3. Keyboard cheat  — ⌘K, J/K, A/D, etc.
 *
 * Why this exists:
 *   - HelpTooltip (UF1) is great for inline (?) icons, but invisible
 *     until hover. New users don't discover terms by hovering.
 *   - The drawer is a single discoverable surface where they can browse
 *     vocabulary alphabetically OR jump to "what should I do first?".
 *   - Linear / Notion / GitHub all have this (?) pattern; users already
 *     know where to look.
 *
 * Accessibility:
 *   - ESC closes
 *   - Focus traps inside dialog while open
 *   - Search input auto-focuses on open
 *   - "?" keyboard shortcut to open (matches Linear / GitHub)
 */

import * as React from "react";
import Link from "next/link";
import {
  HelpCircle,
  Search,
  Sparkles,
  Compass,
  Users,
  Keyboard,
  ArrowRight,
  X as XIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/v2/dialog";
import { GLOSSARY, type GlossaryEntry } from "./ui/HelpTooltip";

// ─── Section grouping ────────────────────────────────────────────────────
//
// Map glossary keys to logical sections. Keys not in any group fall
// into "Other". The order of GROUPS is the rendering order in the
// drawer.

interface GlossarySection {
  title: string;
  description: string;
  keys: string[];
}

const GLOSSARY_SECTIONS: GlossarySection[] = [
  {
    title: "Today's work",
    description: "Daily-driver inboxes and AI-driven action queues.",
    keys: ["Today", "Triage", "Proposals", "Astra"],
  },
  {
    title: "Operations",
    description: "Missions, fleet tracking, and predictive forecasting.",
    keys: ["Missions", "Mission Control", "Ephemeris", "Sentinel"],
  },
  {
    title: "Compliance",
    description: "Posture, articles, incidents, documents, and trade.",
    keys: [
      "Posture",
      "Article Tracker",
      "Incidents",
      "Documents",
      "Regulatory Feed",
      "Network",
      "Trade",
    ],
  },
  {
    title: "Audit & system",
    description: "Evidence trail, live event feed, system health.",
    keys: ["Audit Center", "Audit Log", "Ops Console", "System Health"],
  },
  {
    title: "Domain abbreviations",
    description: "ECCN, USML, IOD, NIS2 and other acronyms.",
    keys: ["ECCN", "USML", "IOD", "OOS_ADR", "NIS2"],
  },
  {
    title: "NASA program phases",
    description: "Standard mission lifecycle phases A through F.",
    keys: ["PHASE A", "PHASE B", "PHASE C", "PHASE D", "PHASE E", "PHASE F"],
  },
];

// ─── Quick actions ───────────────────────────────────────────────────────
//
// First-time / high-leverage actions surfaced in the drawer. Each has
// an icon, blurb, and target route. Click → navigate (drawer auto-
// closes on link click via Radix dialog default).

interface QuickAction {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
  href: string;
  iconColor: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: Sparkles,
    title: "Run a compliance assessment",
    body: "Answer 8 questions to map your operator type to applicable regulations.",
    href: "/assessment",
    iconColor: "text-emerald-300",
  },
  {
    icon: Compass,
    title: "Create your first mission",
    body: "Group spacecraft into a mission with NASA program phase + customer.",
    href: "/dashboard/missions",
    iconColor: "text-sky-300",
  },
  {
    icon: Users,
    title: "Invite your team",
    body: "Add counsel, engineers, auditors with role-based access control.",
    href: "/dashboard/settings/members",
    iconColor: "text-violet-300",
  },
  {
    icon: Keyboard,
    title: "Learn the keyboard shortcuts",
    body: "⌘K palette, J/K navigation, A/D acknowledge — Linear-pattern.",
    href: "#keyboard",
    iconColor: "text-amber-300",
  },
];

// ─── Keyboard shortcuts ──────────────────────────────────────────────────

interface ShortcutRow {
  combo: string[];
  description: string;
}

const SHORTCUTS: ShortcutRow[] = [
  { combo: ["⌘", "K"], description: "Open the command palette" },
  { combo: ["G", "T"], description: "Go to Today" },
  { combo: ["G", "P"], description: "Go to Posture" },
  { combo: ["G", "M"], description: "Go to Missions" },
  { combo: ["?"], description: "Open this help drawer" },
  { combo: ["J"], description: "Next item (in lists)" },
  { combo: ["K"], description: "Previous item" },
  { combo: ["A"], description: "Acknowledge / approve" },
  { combo: ["D"], description: "Dismiss" },
  { combo: ["Esc"], description: "Close panels and dialogs" },
];

// ─── Component ───────────────────────────────────────────────────────────

export function HelpDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus search on open. Radix already handles initial focus, but
  // explicit ref-focus is the most reliable cross-browser path.
  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Reset query when drawer closes so next-open is clean state.
  React.useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setQuery(""), 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const filteredSections = React.useMemo(() => {
    if (!query.trim()) return GLOSSARY_SECTIONS;
    const q = query.toLowerCase();
    return GLOSSARY_SECTIONS.map((section) => ({
      ...section,
      keys: section.keys.filter((k) => {
        const entry = GLOSSARY[k];
        if (!entry) return false;
        return (
          k.toLowerCase().includes(q) ||
          entry.short.toLowerCase().includes(q) ||
          entry.body?.toLowerCase().includes(q) ||
          entry.acronym?.toLowerCase().includes(q)
        );
      }),
    })).filter((s) => s.keys.length > 0);
  }, [query]);

  const totalMatches = filteredSections.reduce(
    (acc, s) => acc + s.keys.length,
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl"
        showClose={false}
        onOpenAutoFocus={(e) => {
          // Let our manual focus run; Radix's default would steal it.
          e.preventDefault();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20"
              aria-hidden
            >
              <HelpCircle className="h-4 w-4 text-emerald-300" />
            </span>
            <div>
              <DialogTitle className="text-[14px]">
                Help &amp; reference
              </DialogTitle>
              <DialogDescription className="text-[11.5px]">
                Glossary · quick actions · keyboard shortcuts
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close help drawer"
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-white/[0.04] px-5 py-3">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search glossary, e.g. 'NIS2', 'ephemeris', 'sanctions'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="block w-full rounded-md border border-white/[0.06] bg-white/[0.02] py-2 pl-9 pr-3 text-[12.5px] text-slate-100 placeholder-slate-500 transition focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              aria-label="Search glossary"
            />
            {query.trim() ? (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10.5px] text-slate-500">
                {totalMatches} match{totalMatches !== 1 ? "es" : ""}
              </span>
            ) : null}
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {/* Quick actions only when not searching */}
          {!query.trim() ? (
            <section className="mb-5">
              <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Quick actions
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {QUICK_ACTIONS.map((qa) => (
                  <Link
                    key={qa.title}
                    href={qa.href}
                    onClick={() => {
                      if (qa.href.startsWith("#")) return;
                      onOpenChange(false);
                    }}
                    className="group flex items-start gap-3 rounded-lg border border-white/[0.05] bg-white/[0.015] p-3 transition hover:border-white/[0.1] hover:bg-white/[0.03]"
                  >
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]"
                      aria-hidden
                    >
                      <qa.icon className={`h-3.5 w-3.5 ${qa.iconColor}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-100">
                        {qa.title}
                        <ArrowRight className="h-3 w-3 text-slate-500 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </div>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">
                        {qa.body}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {/* Glossary */}
          <section className="mb-5">
            <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {query.trim() ? "Search results" : "Glossary"}
            </h3>
            {filteredSections.length === 0 ? (
              <div className="rounded-lg border border-white/[0.05] bg-white/[0.012] p-6 text-center">
                <Search
                  className="mx-auto mb-2 h-4 w-4 text-slate-600"
                  aria-hidden
                />
                <p className="text-[12px] text-slate-400">
                  No glossary entries match{" "}
                  <span className="font-semibold text-slate-200">
                    &ldquo;{query}&rdquo;
                  </span>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSections.map((section) => (
                  <GlossarySectionView key={section.title} section={section} />
                ))}
              </div>
            )}
          </section>

          {/* Keyboard shortcuts */}
          {!query.trim() ? (
            <section id="keyboard">
              <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Keyboard shortcuts
              </h3>
              <div className="overflow-hidden rounded-lg border border-white/[0.05] bg-white/[0.012]">
                <ul className="divide-y divide-white/[0.04]">
                  {SHORTCUTS.map((s) => (
                    <li
                      key={s.description}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <span className="text-[12px] text-slate-300">
                        {s.description}
                      </span>
                      <span className="flex shrink-0 items-center gap-0.5">
                        {s.combo.map((k, i) => (
                          <React.Fragment key={`${s.description}-${i}`}>
                            {i > 0 ? (
                              <span className="px-1 text-[10px] text-slate-600">
                                +
                              </span>
                            ) : null}
                            <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-slate-200">
                              {k}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] bg-white/[0.012] px-5 py-2.5">
          <p className="text-[10.5px] text-slate-500">
            Press{" "}
            <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1 font-mono text-[9.5px] text-slate-300">
              ?
            </kbd>{" "}
            anywhere to reopen this help drawer.
          </p>
          <Link
            href="/resources/glossary"
            onClick={() => onOpenChange(false)}
            className="text-[10.5px] font-medium text-emerald-300 transition hover:text-emerald-200"
          >
            Full glossary →
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GlossarySectionView({ section }: { section: GlossarySection }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2">
        <h4 className="text-[11.5px] font-semibold text-slate-200">
          {section.title}
        </h4>
        <p className="truncate text-[10.5px] text-slate-500">
          {section.description}
        </p>
      </div>
      <ul className="space-y-1.5">
        {section.keys.map((k) => {
          const entry = GLOSSARY[k];
          if (!entry) return null;
          return <GlossaryRow key={k} term={k} entry={entry} />;
        })}
      </ul>
    </div>
  );
}

function GlossaryRow({ term, entry }: { term: string; entry: GlossaryEntry }) {
  return (
    <li className="rounded-md border border-white/[0.04] bg-white/[0.01] px-3 py-2">
      <div className="flex items-baseline gap-2">
        <span className="text-[12px] font-semibold text-slate-100">{term}</span>
        {entry.acronym ? (
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {entry.acronym}
          </span>
        ) : null}
        {entry.learnMoreHref ? (
          <Link
            href={entry.learnMoreHref}
            className="ml-auto text-[10.5px] font-medium text-emerald-300/80 transition hover:text-emerald-200"
          >
            Open →
          </Link>
        ) : null}
      </div>
      <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">
        {entry.short}
      </p>
      {entry.body ? (
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          {entry.body}
        </p>
      ) : null}
    </li>
  );
}

// ─── Trigger button + keyboard shortcut wrapper ─────────────────────────
//
// Convenience component: a (?) button that opens the drawer + a global
// "?" keypress listener. Use in V2TopBar.

export function HelpDrawerTrigger() {
  const [open, setOpen] = React.useState(false);

  // Listen for "?" keypress globally to open. Skip when focus is in
  // an editable element so we don't intercept the user typing "?".
  React.useEffect(() => {
    function isEditable(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target.isContentEditable
      );
    }

    function handler(e: KeyboardEvent) {
      if (e.key !== "?" || isEditable(e.target)) return;
      e.preventDefault();
      setOpen(true);
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Open help drawer"
        data-testid="v2-topbar-help"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-100"
      >
        <HelpCircle className="h-4 w-4" strokeWidth={1.6} />
      </button>
      <HelpDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
