"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * LibraryView — client-side page for /atlas/library.
 *
 * Renders the lawyer's personal research entries as a list of cards
 * with live search filtering. Each card uses AtlasMarkdown so saved
 * citations stay clickable. Delete is single-click + animated fade
 * (no confirmation modal — entries are user-curated and re-creatable).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Trash2,
  AlertTriangle,
  Loader2,
  Bookmark,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { AtlasMarkdown } from "@/components/atlas/ai-mode/AtlasMarkdown";

interface ResearchEntry {
  id: string;
  title: string;
  content: string;
  query: string | null;
  sourceKind: string | null;
  sourceMatterId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  entries: ResearchEntry[];
  nextCursor: string | null;
  notProvisioned?: boolean;
}

const SOURCE_KIND_LABEL: Record<string, string> = {
  ATLAS_IDLE: "Atlas-Idle",
  MATTER_CHAT: "Mandats-Chat",
  MANUAL: "Manuell",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function LibraryView() {
  const [entries, setEntries] = useState<ResearchEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notProvisioned, setNotProvisioned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Debounce the search input — every keystroke triggering a fetch
  // would hammer the API. 240ms feels responsive without spamming.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 240);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch on mount + whenever debounced search changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (debouncedQuery) params.set("q", debouncedQuery);
        const res = await fetch(`/api/atlas/library?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as ListResponse;
        if (cancelled) return;
        if (!res.ok) {
          setError("Bibliothek konnte nicht geladen werden.");
          return;
        }
        setError(null);
        setEntries(json.entries ?? []);
        setNotProvisioned(Boolean(json.notProvisioned));
      } catch {
        if (!cancelled) setError("Netzwerk-Fehler.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/atlas/library/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleting(null);
        return;
      }
      // Optimistic remove with a brief delay so the user sees the
      // animated transition rather than a flash-removal.
      setTimeout(() => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setDeleting(null);
      }, 200);
    } catch {
      setDeleting(null);
    }
  }, []);

  const empty = !loading && entries.length === 0 && !notProvisioned;

  const stats = useMemo(() => {
    const total = entries.length;
    const matterChats = entries.filter(
      (e) => e.sourceKind === "MATTER_CHAT",
    ).length;
    return { total, matterChats };
  }, [entries]);

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-white">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/atlas"
            className="inline-flex items-center gap-1.5 text-[11px] text-white/45 hover:text-white/80 transition mb-4"
          >
            <ArrowLeft size={11} strokeWidth={1.7} />
            Zurück zu Atlas
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <Bookmark
              size={20}
              strokeWidth={1.5}
              className="text-emerald-300/80"
              aria-hidden="true"
            />
            <h1 className="text-2xl font-semibold tracking-tight">
              Bibliothek
            </h1>
          </div>
          <p className="text-[12px] text-white/45 max-w-xl leading-relaxed">
            Deine persönliche Sammlung gespeicherter Atlas-Antworten. Eine Notiz
            reicht über Mandate hinweg — jeder Eintrag bleibt mit klickbaren
            Citations und der ursprünglichen Frage erhalten.
          </p>
          {!loading && stats.total > 0 && (
            <div className="mt-3 text-[10.5px] tracking-[0.18em] uppercase text-white/35">
              {stats.total} Einträg{stats.total === 1 ? "" : "e"}
              {stats.matterChats > 0 &&
                ` · ${stats.matterChats} aus Mandats-Chats`}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-6 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.025] ring-1 ring-white/[0.06] focus-within:ring-white/20 transition">
          <Search
            size={13}
            strokeWidth={1.7}
            className="text-white/35 flex-shrink-0"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche in Titel, Inhalt oder Frage…"
            className="flex-1 bg-transparent outline-none text-[12.5px] text-white/90 placeholder:text-white/30"
            autoFocus
          />
        </div>

        {/* States */}
        {error && (
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/[0.06] text-red-300 ring-1 ring-red-500/20 text-[11.5px]">
            <AlertTriangle size={11} strokeWidth={1.7} />
            {error}
          </div>
        )}
        {notProvisioned && (
          <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-500/[0.06] text-amber-300/90 ring-1 ring-amber-500/20 text-[11.5px] leading-relaxed">
            <div className="font-medium mb-0.5">
              Bibliothek wird gerade eingerichtet.
            </div>
            Die Datenbank-Migration{" "}
            <code className="font-mono text-[10.5px] bg-white/5 px-1.5 py-0.5 rounded">
              20260425130000_add_atlas_research_entry
            </code>{" "}
            ist noch ausstehend. Sobald sie angewendet ist, erscheinen hier
            deine gespeicherten Einträge.
          </div>
        )}

        {loading && (
          <div className="py-12 text-center text-[11.5px] text-white/35 animate-pulse">
            Lade Bibliothek…
          </div>
        )}

        {empty && (
          <div className="py-16 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/[0.03] ring-1 ring-white/[0.06] mb-3">
              <Bookmark
                size={18}
                strokeWidth={1.5}
                className="text-white/40"
                aria-hidden="true"
              />
            </div>
            <p className="text-[12.5px] text-white/55 max-w-sm mx-auto leading-relaxed">
              {debouncedQuery
                ? "Kein Eintrag passt zur Suche."
                : "Noch keine Einträge. Speichere eine Atlas-Antwort über das Lesezeichen-Symbol, dann landet sie hier."}
            </p>
          </div>
        )}

        {/* Entries list */}
        {entries.length > 0 && (
          <div className="space-y-3">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className={`
                  group rounded-xl bg-white/[0.025] ring-1 ring-white/[0.06]
                  px-5 py-4
                  transition-all duration-200
                  ${deleting === entry.id ? "opacity-30 scale-[0.99]" : "opacity-100"}
                `}
              >
                <header className="flex items-start gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[13.5px] font-semibold text-white/90 leading-tight tracking-tight">
                      {entry.title}
                    </h2>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-white/35">
                      <time dateTime={entry.createdAt}>
                        {formatDate(entry.createdAt)}
                      </time>
                      {entry.sourceKind && (
                        <>
                          <span>·</span>
                          <span>
                            {SOURCE_KIND_LABEL[entry.sourceKind] ??
                              entry.sourceKind}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleting === entry.id}
                    title="Eintrag löschen"
                    className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md
                               bg-white/[0.02] text-white/40 ring-1 ring-white/[0.06]
                               opacity-0 group-hover:opacity-100
                               hover:bg-red-500/12 hover:text-red-300 hover:ring-red-500/30
                               transition-all duration-150"
                    aria-label="Eintrag löschen"
                  >
                    {deleting === entry.id ? (
                      <Loader2
                        size={11}
                        strokeWidth={2}
                        className="animate-spin"
                      />
                    ) : (
                      <Trash2 size={11} strokeWidth={1.7} />
                    )}
                  </button>
                </header>

                {entry.query && (
                  <div className="mb-3 px-3 py-1.5 rounded-md bg-white/[0.025] text-[11px] text-white/55 italic leading-relaxed border-l-2 border-white/[0.08]">
                    {entry.query}
                  </div>
                )}

                <div className="text-[12.5px] text-white/80 leading-relaxed">
                  <AtlasMarkdown text={entry.content} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
