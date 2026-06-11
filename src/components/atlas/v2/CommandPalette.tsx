"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Command Palette (⌘K / Ctrl+K).
 *
 * Sprint 5b (2026-05-18). Universal-Navigation für Atlas. Linear-Style.
 * Lädt Recent Chats + Mandate über die existierenden /api/atlas/*
 * Endpoints und kombiniert sie mit statischen Aktionen (New Chat,
 * Settings, Vault, etc.) zu einer Cmd+K-Palette mit fuzzy-filter.
 *
 * Open: Cmd+K (Mac) / Ctrl+K (Windows/Linux), oder window.dispatchEvent
 * mit "atlas-v2-command-palette-open".
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MessageSquare,
  Briefcase,
  Settings,
  FolderOpen,
  Plus,
  ArrowRight,
  FileText,
  LogOut,
  HelpCircle,
  Bell,
  Bot,
  EyeOff,
  FileDiff,
  FileOutput,
  GitCompare,
  Library,
  PenSquare,
  Scale,
  ScrollText,
  Workflow,
} from "lucide-react";

interface Item {
  id: string;
  category: "Aktion" | "Chat" | "Mandat" | "Einstellung" | "Werkzeug";
  label: string;
  description?: string;
  icon: typeof FileText;
  href?: string;
  action?: () => void;
  /** Lower-case haystack for fuzzy-filter. */
  searchText: string;
}

interface ChatLite {
  id: string;
  title: string;
  updatedAt: string;
  /* Sidebar API shape — mandate is a nested obj (or null), not a string. */
  mandate?: { id: string; name: string } | null;
}

interface MandateLite {
  id: string;
  name: string;
  clientName?: string | null;
  jurisdiction?: string | null;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [chats, setChats] = useState<ChatLite[]>([]);
  const [mandates, setMandates] = useState<MandateLite[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Open via Cmd+K / Ctrl+K — overrides the previous focus-composer
     binding because command-palette is the more conventional ⌘K
     behavior (Linear, Notion, Raycast all use ⌘K for palette). */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k" && !e.shiftKey) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    const openHandler = () => setOpen(true);
    window.addEventListener("keydown", handler);
    window.addEventListener("atlas-v2-command-palette-open", openHandler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("atlas-v2-command-palette-open", openHandler);
    };
  }, [open]);

  /* Lazy-load chats + mandates on first open. Cache in component-state
     so subsequent opens are instant. */
  useEffect(() => {
    if (!open || (chats.length > 0 && mandates.length > 0)) return;
    setLoading(true);
    void Promise.all([
      fetch("/api/atlas/chat", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { chats: [] }))
        .catch(() => ({ chats: [] })),
      fetch("/api/atlas/mandate", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { mandates: [] }))
        .catch(() => ({ mandates: [] })),
    ]).then(([c, m]) => {
      setChats((c.chats ?? []).slice(0, 15));
      setMandates((m.mandates ?? []).slice(0, 15));
      setLoading(false);
    });
  }, [open, chats.length, mandates.length]);

  /* Auto-focus + clear query on open. */
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIdx(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const items: Item[] = useMemo(() => {
    const staticActions: Item[] = [
      {
        id: "new-chat",
        category: "Aktion",
        label: "Neuer Chat",
        description: "Starte eine neue Konversation",
        icon: Plus,
        href: "/atlas",
        searchText: "neuer chat new conversation start",
      },
      {
        id: "vault",
        category: "Aktion",
        label: "Vault öffnen",
        description: "Alle Mandate-Dokumente durchsuchen",
        icon: FolderOpen,
        /* 2026-06-11 — zeigte fälschlich auf /atlas/sources (den
           öffentlichen Gesetzes-Korpus). /atlas/vault ist die echte
           Dokumenten-Ansicht über alle Mandate. */
        href: "/atlas/vault",
        searchText: "vault dokumente files akten dateien",
      },
      {
        id: "alerts",
        category: "Aktion",
        label: "Benachrichtigungen",
        description: "Alerts & Abonnements verwalten",
        icon: Bell,
        href: "/atlas/alerts",
        searchText: "alerts benachrichtigungen glocke abos subscriptions",
      },
      {
        id: "settings",
        category: "Einstellung",
        label: "Einstellungen",
        description: "Profil, Kanzlei, Compliance",
        icon: Settings,
        href: "/atlas/settings",
        searchText: "settings einstellungen profile compliance dpa",
      },
      {
        id: "settings-firm",
        category: "Einstellung",
        label: "Kanzlei-Briefkopf",
        description: "Logo, Name, Footer für PDF-Export",
        icon: FileText,
        action: () => {
          router.push("/atlas/settings");
          /* Future enhancement: tab-anchor query-param (?tab=firm) */
        },
        searchText: "letterhead briefkopf logo kanzlei firm",
      },
      {
        id: "help",
        category: "Aktion",
        label: "Tastaturkürzel",
        description: "Liste aller Shortcuts",
        icon: HelpCircle,
        action: () => {
          /* "?" triggers the help-overlay via useAtlasKeyboardShortcuts */
          window.dispatchEvent(
            new KeyboardEvent("keydown", { key: "?", bubbles: true }),
          );
        },
        searchText: "help hilfe shortcuts tastatur keyboard",
      },
      {
        id: "logout",
        category: "Aktion",
        label: "Abmelden",
        description: "Aus Atlas ausloggen",
        icon: LogOut,
        href: "/api/auth/signout",
        searchText: "logout signout abmelden ausloggen",
      },
    ];

    /* 2026-06-11 — Werkzeug-Flächen, die sonst nur per Direkt-URL
       erreichbar sind. Alle Routen existieren als page.tsx (verifiziert);
       Workflows + Klauseln leben bewusst NUR hier und nicht in der
       Sidebar (User-Request Sprint 19d). */
    const toolActions: Item[] = [
      {
        id: "tool-drafting",
        category: "Werkzeug",
        label: "Drafting Studio",
        description: "Schriftsätze & Verträge aus Vorlagen entwerfen",
        icon: PenSquare,
        href: "/atlas/drafting",
        searchText: "drafting studio entwurf schriftsatz vorlage template",
      },
      {
        id: "tool-agent",
        category: "Werkzeug",
        label: "Agent",
        description: "Auftrag formulieren — Atlas plant & arbeitet Schritte ab",
        icon: Bot,
        href: "/atlas/agent",
        searchText: "agent auftrag recherche autonom steps mitarbeiter",
      },
      {
        id: "tool-redline",
        category: "Werkzeug",
        label: "Redline",
        description: "Zwei Vertragsversionen vergleichen (Diff)",
        icon: FileDiff,
        href: "/atlas/tools/redline",
        searchText: "redline diff vergleich vertragsversionen änderungen",
      },
      {
        id: "tool-anonymize",
        category: "Werkzeug",
        label: "Anonymisieren",
        description: "Personenbezogene Daten in Texten schwärzen",
        icon: EyeOff,
        href: "/atlas/tools/anonymize",
        searchText: "anonymisieren pii schwärzen redact datenschutz dsgvo",
      },
      {
        id: "tool-cases",
        category: "Werkzeug",
        label: "Rechtsprechung",
        description: "Urteilsdatenbank durchsuchen",
        icon: Scale,
        href: "/atlas/cases",
        searchText: "rechtsprechung urteile cases case law entscheidungen",
      },
      {
        id: "tool-datev",
        category: "Werkzeug",
        label: "DATEV-Export",
        description: "Stundenabrechnung als CSV exportieren",
        icon: FileOutput,
        href: "/atlas/exports/datev",
        searchText: "datev export abrechnung stunden csv timetracking",
      },
      {
        id: "tool-workflows",
        category: "Werkzeug",
        label: "Workflows",
        description: "Kuratierte Arbeitsabläufe mit Start-Prompt",
        icon: Workflow,
        href: "/atlas/workflows",
        searchText: "workflows abläufe playbooks prompts katalog",
      },
      {
        id: "tool-clauses",
        category: "Werkzeug",
        label: "Klausel-Bibliothek",
        description: "Kanzleiweite Klauseln durchsuchen",
        icon: ScrollText,
        href: "/atlas/clauses",
        searchText: "klauseln clauses bibliothek bausteine vertragsklauseln",
      },
      {
        id: "tool-comparator",
        category: "Werkzeug",
        label: "Rechtsvergleich",
        description: "Jurisdiktionen nebeneinander vergleichen",
        icon: GitCompare,
        href: "/atlas/comparator",
        searchText:
          "rechtsvergleich comparator jurisdiktionen länder vergleich",
      },
      {
        id: "tool-library",
        category: "Werkzeug",
        label: "Bibliothek",
        description: "Gespeicherte Atlas-Antworten & Recherchen",
        icon: Library,
        href: "/atlas/library",
        searchText: "bibliothek library gespeichert recherche antworten",
      },
    ];

    const chatItems: Item[] = chats.map((c) => ({
      id: `chat-${c.id}`,
      category: "Chat",
      label: c.title || "Unbenannter Chat",
      description: c.mandate?.name
        ? `Mandat: ${c.mandate.name}`
        : new Date(c.updatedAt).toLocaleDateString("de-DE"),
      icon: MessageSquare,
      href: `/atlas/chat/${c.id}`,
      searchText: `${c.title} ${c.mandate?.name ?? ""}`.toLowerCase(),
    }));

    const mandateItems: Item[] = mandates.map((m) => ({
      id: `mandate-${m.id}`,
      category: "Mandat",
      label: m.name,
      description:
        [m.clientName, m.jurisdiction].filter(Boolean).join(" · ") ||
        "Mandat öffnen",
      icon: Briefcase,
      href: `/atlas/mandate/${m.id}`,
      searchText:
        `${m.name} ${m.clientName ?? ""} ${m.jurisdiction ?? ""}`.toLowerCase(),
    }));

    return [...staticActions, ...toolActions, ...mandateItems, ...chatItems];
  }, [chats, mandates, router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => {
      /* Fuzzy: every char of q appears in order in searchText OR
         label contains q as substring. */
      if (i.searchText.includes(q) || i.label.toLowerCase().includes(q)) {
        return true;
      }
      return false;
    });
  }, [items, query]);

  /* Group by category for visual hierarchy. */
  const grouped = useMemo(() => {
    const map = new Map<Item["category"], Item[]>();
    for (const item of filtered) {
      const arr = map.get(item.category) ?? [];
      arr.push(item);
      map.set(item.category, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    /* Clamp selection when filter changes. */
    if (selectedIdx >= filtered.length) setSelectedIdx(0);
  }, [filtered.length, selectedIdx]);

  const executeItem = (item: Item) => {
    setOpen(false);
    if (item.action) {
      item.action();
    } else if (item.href) {
      if (item.href.startsWith("/api/")) {
        window.location.href = item.href;
      } else {
        router.push(item.href);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[selectedIdx];
      if (item) executeItem(item);
    }
  };

  /* Scroll the selected item into view on selection change. */
  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-cmd-idx="${selectedIdx}"]`,
    );
    if (el && el instanceof HTMLElement) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIdx]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[12vh]"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <Search size={16} className="text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Suchen — Chats · Mandate · Aktionen · Einstellungen"
            className="w-full bg-transparent text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
          />
          <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:inline-block">
            esc
          </kbd>
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {loading && filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-slate-500">
              Lade…
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-slate-500">
              Keine Treffer für „{query}"
            </div>
          ) : (
            grouped.map(([category, catItems]) => (
              <div key={category} className="mb-1.5">
                <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {category}
                </div>
                <ul>
                  {catItems.map((item) => {
                    const idx = filtered.indexOf(item);
                    const isSelected = idx === selectedIdx;
                    const ItemIcon = item.icon;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          data-cmd-idx={idx}
                          onMouseEnter={() => setSelectedIdx(idx)}
                          onClick={() => executeItem(item)}
                          className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                            isSelected
                              ? "bg-emerald-50 dark:bg-emerald-500/10"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                              isSelected
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            <ItemIcon size={13} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-medium text-slate-900 dark:text-slate-100">
                              {item.label}
                            </div>
                            {item.description && (
                              <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                {item.description}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <ArrowRight size={12} className="text-slate-400" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10.5px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
          <span>
            <kbd className="rounded bg-white px-1 py-0.5 font-medium dark:bg-slate-800">
              ↑↓
            </kbd>{" "}
            navigieren
            {"  ·  "}
            <kbd className="rounded bg-white px-1 py-0.5 font-medium dark:bg-slate-800">
              ↵
            </kbd>{" "}
            auswählen
          </span>
          <span>
            <kbd className="rounded bg-white px-1 py-0.5 font-medium dark:bg-slate-800">
              ⌘K
            </kbd>{" "}
            zum öffnen
          </span>
        </div>
      </div>
    </div>
  );
}
