"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Unified Suche.
 *
 * Sprint 18 (2026-05-19). User-feedback: "warum gibt's Wissensbasis UND
 * Datenbank? Ich will EINE Suche wie bei v1." Diese Seite ersetzt beide
 * navigation-einträge im sidebar. Eine search-box, durchsucht ALLE
 * quellen parallel:
 *
 *   1. Kanzlei-Wissensbasis (eigene snippets, schriftsätze, notizen,
 *      agent-artefakte) — semantic-search via pgvector embeddings →
 *      /api/atlas/knowledge/search
 *   2. Legal-Sources (937 statutory texts: UN-treaties, EU-instrumente,
 *      nationale space-gesetze) — client-side text-match auf static
 *      data
 *
 * Results in einer feed, type-badged (Kanzlei / Vertrag / Gesetz / VO /
 * Standard / etc.), nach relevanz/score sortiert. Optional filter-chips
 * oben um nach typ zu filtern.
 *
 * Add-snippet-flow lebt weiterhin auf /atlas/knowledge (power-user link
 * unten in der search-page). Sources-detail auf /atlas/sources/[id]
 * bleibt für direct-deep-links.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  Brain,
  Library,
  Plus,
  Filter,
  X,
  ChevronRight,
  Building2,
} from "lucide-react";
import {
  ALL_SOURCES,
  getTranslatedSource,
  type LegalSource,
} from "@/data/legal-sources";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface KnowledgeResult {
  kind: "knowledge";
  id: string;
  score: number;
  title: string;
  text: string;
  sourceType: string;
  mandate: { id: string; name: string } | null;
  createdAt: string;
}

interface SourceResult {
  kind: "source";
  id: string;
  title: string;
  citation: string | null;
  type: string;
  jurisdiction: string;
  area: string | null;
  status: string;
}

type SearchResult = KnowledgeResult | SourceResult;

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  /* Knowledge types */
  knowledge: {
    label: "Wissensbasis",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  note: {
    label: "Notiz",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  schriftsatz: {
    label: "Schriftsatz",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  memo: {
    label: "Memo",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  manual: {
    label: "Manuell",
    color: "bg-slate-50 text-slate-700 border-slate-200",
  },
  /* Source types */
  international_treaty: {
    label: "Vertrag",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  federal_law: {
    label: "Gesetz",
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
  federal_regulation: {
    label: "Verordnung",
    color: "bg-pink-50 text-pink-700 border-pink-200",
  },
  technical_standard: {
    label: "Standard",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  eu_regulation: {
    label: "EU-VO",
    color: "bg-violet-50 text-violet-700 border-violet-200",
  },
  eu_directive: {
    label: "EU-RL",
    color: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  },
};

const SCOPE_OPTIONS = [
  { value: "all", label: "Alles" },
  { value: "knowledge", label: "Wissensbasis" },
  { value: "sources", label: "Legal-Sources" },
] as const;
type Scope = (typeof SCOPE_OPTIONS)[number]["value"];

export default function SearchPage() {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  /* Auto-focus the search box on mount. */
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* Debounced search whenever query or scope changes. */
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(() => {
      void runSearch();
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [query, scope]);

  const runSearch = async () => {
    setError(null);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    try {
      const tasks: Promise<SearchResult[]>[] = [];
      if (scope === "all" || scope === "knowledge") {
        tasks.push(searchKnowledge(q));
      }
      if (scope === "all" || scope === "sources") {
        tasks.push(Promise.resolve(searchSources(q, language)));
      }
      const allResults = (await Promise.all(tasks)).flat();
      /* Sort: knowledge by score desc, sources by title relevance.
         Mixed = interleave knowledge first (richer match-info). */
      const k = allResults.filter(
        (r) => r.kind === "knowledge",
      ) as KnowledgeResult[];
      const s = allResults.filter((r) => r.kind === "source") as SourceResult[];
      k.sort((a, b) => b.score - a.score);
      setResults([...k, ...s]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  };

  const resultCount = results.length;
  const knowledgeCount = results.filter((r) => r.kind === "knowledge").length;
  const sourceCount = results.filter((r) => r.kind === "source").length;

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 pb-16 pt-12">
      {/* Title */}
      <header className="mb-8 text-center">
        <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Suche
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Durchsuche Wissensbasis, Schriftsätze, Notizen + 937 statutory
          legal-sources
        </p>
      </header>

      {/* Search input */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nach allem suchen — z.B. § 433 BGB, Outer Space Treaty, Frequenz-Allokation..."
          className="w-full rounded-xl border border-slate-200 bg-white px-12 py-3.5 text-[14px] text-slate-900 shadow-sm placeholder:text-slate-400 transition-all focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Suche zurücksetzen"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Scope filter + count */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900">
          {SCOPE_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setScope(s.value)}
              className={`rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
                scope === s.value
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11.5px] text-slate-500">
          {searching ? (
            <>
              <Loader2 size={11} className="animate-spin" />
              Suche…
            </>
          ) : query && resultCount > 0 ? (
            <span>
              {resultCount} Treffer · {knowledgeCount} Wissensbasis,{" "}
              {sourceCount} Sources
            </span>
          ) : query && resultCount === 0 && !searching ? (
            <span>Keine Treffer</span>
          ) : (
            <span>Tippen zum Suchen</span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Fehler bei der Suche: {error}
        </div>
      )}

      {/* Results */}
      {!query.trim() ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={`${r.kind}-${r.id}`}>
              {r.kind === "knowledge" ? (
                <KnowledgeResultCard r={r} />
              ) : (
                <SourceResultCard r={r} />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Power-user footer link */}
      {query.trim() && (
        <div className="mt-8 flex items-center justify-center gap-4 border-t border-slate-100 pt-6 text-[11.5px] text-slate-400 dark:border-slate-800">
          <Link
            href="/atlas/knowledge"
            className="inline-flex items-center gap-1 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
          >
            <Plus size={11} />
            Snippet zur Wissensbasis hinzufügen
          </Link>
          <span className="text-slate-300">·</span>
          <Link
            href="/atlas/sources"
            className="inline-flex items-center gap-1 transition-colors hover:text-slate-700 dark:hover:text-slate-300"
          >
            <Library size={11} />
            Alle Sources durchstöbern
          </Link>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

async function searchKnowledge(query: string): Promise<KnowledgeResult[]> {
  try {
    const res = await fetch("/api/atlas/knowledge/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, limit: 10 }),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      results: Array<{
        id: string;
        score: number;
        title: string;
        text: string;
        sourceType: string;
        mandate: { id: string; name: string } | null;
        createdAt: string;
      }>;
    };
    return (body.results ?? []).map((r) => ({
      kind: "knowledge" as const,
      ...r,
    }));
  } catch {
    return [];
  }
}

function searchSources(query: string, language: string): SourceResult[] {
  const q = query.toLowerCase();
  /* Client-side text-match. Score by where match occurs (title > citation
     > jurisdiction). Top 15 sources by simplified relevance. */
  const matches: { source: LegalSource; score: number }[] = [];
  for (const s of ALL_SOURCES) {
    const translated = getTranslatedSource(s, language as "en" | "de" | "fr");
    const title = (
      translated?.title ??
      s.title_local ??
      s.title_en ??
      ""
    ).toLowerCase();
    const citation = (
      s.official_reference ??
      s.un_reference ??
      s.parliamentary_reference ??
      ""
    ).toLowerCase();
    const juris = (s.jurisdiction ?? "").toLowerCase();
    let score = 0;
    if (title.includes(q)) score += 10;
    if (citation.includes(q)) score += 5;
    if (juris.includes(q)) score += 2;
    if (score > 0) matches.push({ source: s, score });
  }
  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 15).map(({ source: s }) => ({
    kind: "source" as const,
    id: s.id,
    title:
      getTranslatedSource(s, language as "en" | "de" | "fr")?.title ??
      s.title_local ??
      s.title_en ??
      "Unbekannt",
    citation:
      s.official_reference ??
      s.un_reference ??
      s.parliamentary_reference ??
      null,
    type: s.type,
    jurisdiction: s.jurisdiction,
    area: s.compliance_areas?.[0] ?? null,
    status: s.status,
  }));
}

/* ─────────────────────────────────────────────────────────────────── */

function KnowledgeResultCard({ r }: { r: KnowledgeResult }) {
  const badge = TYPE_BADGE[r.sourceType] ?? TYPE_BADGE.knowledge;
  return (
    <div className="group rounded-lg border border-slate-200 bg-white p-3.5 transition-colors hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600">
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain size={12} className="shrink-0 text-emerald-600" />
          <span
            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${badge.color}`}
          >
            {badge.label}
          </span>
          {r.mandate && (
            <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-500">
              <Building2 size={9} />
              {r.mandate.name}
            </span>
          )}
        </div>
        <div className="text-[10px] text-slate-400">
          {Math.round(r.score * 100)}% match
        </div>
      </div>
      <div className="text-[13.5px] font-medium text-slate-900 dark:text-slate-100">
        {r.title}
      </div>
      <div className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
        {r.text}
      </div>
    </div>
  );
}

function SourceResultCard({ r }: { r: SourceResult }) {
  const badge = TYPE_BADGE[r.type] ?? {
    label: r.type,
    color: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <Link
      href={`/atlas/sources/${r.id}`}
      className="group block rounded-lg border border-slate-200 bg-white p-3.5 transition-colors hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <Library size={12} className="shrink-0 text-slate-500" />
        <span
          className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${badge.color}`}
        >
          {badge.label}
        </span>
        <span className="text-[10.5px] uppercase tracking-wider text-slate-500">
          {r.jurisdiction}
        </span>
        {r.status === "in_force" && (
          <span className="rounded-full bg-emerald-100 px-1.5 text-[9.5px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
            in Kraft
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-medium text-slate-900 dark:text-slate-100">
            {r.title}
          </div>
          {r.citation && (
            <div className="mt-0.5 font-mono text-[11px] text-slate-500">
              {r.citation}
            </div>
          )}
        </div>
        <ChevronRight
          size={14}
          className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500"
        />
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center dark:border-slate-800 dark:bg-slate-900/30">
      <Search size={20} className="mx-auto mb-3 text-slate-300" />
      <p className="text-[13px] text-slate-600 dark:text-slate-300">
        Tippe oben um zu suchen
      </p>
      <p className="mx-auto mt-2 max-w-md text-[12px] text-slate-500">
        Atlas durchsucht deine{" "}
        <span className="font-medium text-emerald-700 dark:text-emerald-400">
          Wissensbasis
        </span>{" "}
        (eigene Snippets, Schriftsätze, Notizen) und gleichzeitig die{" "}
        <span className="font-medium text-slate-700 dark:text-slate-300">
          937 statutory Legal-Sources
        </span>{" "}
        (UN-Treaties, EU-Recht, nationale Space-Gesetze).
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
        {[
          "§ 433 BGB",
          "Outer Space Treaty",
          "Frequenz-Allokation",
          "BNetzA",
          "ITU",
        ].map((s) => (
          <span
            key={s}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-900"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
