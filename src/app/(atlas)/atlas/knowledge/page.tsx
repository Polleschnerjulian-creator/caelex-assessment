"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Kanzlei-Knowledge Browser.
 *
 * Two surfaces in one page:
 *   1. Search-Box am Top — semantische Suche über alle Chunks
 *   2. Add-Form daneben — manuelles Snippet einpflegen
 *   3. Liste recent chunks darunter
 *
 * MVP — auto-indexing of Schriftsätze / Notes / Agent-Artifacts kommt
 * im Folge-Sprint. Aktuell pflegt der Lawyer seine eigene Wissensbasis
 * manuell ein (über die Add-Form oder durch Copy-Paste aus altem
 * Schriftsatz).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import {
  Brain,
  Search,
  Plus,
  Loader2,
  Database,
  Briefcase,
  X,
} from "lucide-react";

interface KnowledgeChunk {
  id: string;
  title: string;
  text: string;
  sourceType: string;
  sourceRef: string | null;
  mandateId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  mandate: { id: string; name: string } | null;
}

interface SearchResult extends KnowledgeChunk {
  score: number;
}

const SOURCE_TYPE_LABEL: Record<string, string> = {
  note: "Notiz",
  schriftsatz: "Schriftsatz",
  memo: "Memo",
  manual: "Manuell",
  agent_artifact: "Agent-Artefakt",
  mandate_file: "Mandat-Datei",
};

export default function KnowledgePage() {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [addTitle, setAddTitle] = useState("");
  const [addText, setAddText] = useState("");
  const [addSourceType, setAddSourceType] = useState<
    "manual" | "note" | "schriftsatz" | "memo"
  >("manual");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/atlas/knowledge?limit=50", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { chunks: KnowledgeChunk[] };
      setChunks(data.chunks ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearchError(null);
    setResults(null);
    try {
      const res = await fetch("/api/atlas/knowledge/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: query.trim(), limit: 10 }),
      });
      const body = (await res.json()) as
        | { results: SearchResult[]; candidates: number }
        | { error: string };
      if (!res.ok) {
        setSearchError(
          ("error" in body ? body.error : null) ?? "Search fehlgeschlagen",
        );
        return;
      }
      if ("results" in body) setResults(body.results);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : String(e));
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!addTitle.trim() || !addText.trim() || adding) return;
    setAdding(true);
    setAddError(null);
    setAddSuccess(null);
    try {
      const res = await fetch("/api/atlas/knowledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: addTitle.trim(),
          text: addText.trim(),
          sourceType: addSourceType,
          autoChunk: addText.length > 1500,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAddError(body.error || `Fehler (${res.status})`);
        return;
      }
      setAddSuccess(
        `${body.chunks?.length ?? 1} Chunk${body.chunks?.length === 1 ? "" : "s"} eingebettet + gespeichert`,
      );
      setAddTitle("");
      setAddText("");
      void reload();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto px-6 py-8">
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <Brain size={11} />
          Knowledge-Persistence
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-100 [font-family:ui-serif,Georgia,'Cambria_Style',serif]">
            Kanzlei-Wissensbasis
          </h1>
          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-[12px] text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-300 dark:hover:bg-white/[0.05]"
          >
            {showAddForm ? <X size={11} /> : <Plus size={11} />}
            {showAddForm ? "Schließen" : "Snippet hinzufügen"}
          </button>
        </div>
        <p className="mt-1 text-[13px] text-slate-500">
          Semantische Suche über alle Schriftsätze, Notizen, Agent-Artefakte und
          manuell eingegebene Snippets. Atlas wird besser je länger deine
          Kanzlei sie nutzt.
        </p>
      </header>

      {/* Add-Form (collapsible) */}
      {showAddForm && (
        <div className="mb-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">
              Titel
            </label>
            <input
              type="text"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              placeholder="z.B. 'BNetzA-Argument zur Frequenz-Ermessensausübung'"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-900 outline-none focus:border-slate-400 dark:border-white/[0.10] dark:bg-[#1a1a1a] dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
              <span>Text</span>
              <span className="text-[10px] text-slate-400">
                {addText.length} Zeichen{" "}
                {addText.length > 1500 && "· wird auto-gechunked"}
              </span>
            </label>
            <textarea
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              placeholder="z.B. ein Auszug aus einem alten Schriftsatz, eine Argumentations-Linie, eine Best-Practice-Klausel…"
              rows={6}
              className="block w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-slate-400 dark:border-white/[0.10] dark:bg-[#1a1a1a] dark:text-slate-100"
            />
          </div>
          <div className="flex items-center justify-between">
            <select
              value={addSourceType}
              onChange={(e) =>
                setAddSourceType(e.target.value as typeof addSourceType)
              }
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-700 outline-none dark:border-white/[0.10] dark:bg-[#1a1a1a] dark:text-slate-300"
            >
              <option value="manual">Manuell</option>
              <option value="note">Notiz</option>
              <option value="schriftsatz">Schriftsatz</option>
              <option value="memo">Memo</option>
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={
                !addTitle.trim() || addText.trim().length < 20 || adding
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-[12px] font-medium text-white hover:bg-slate-800 disabled:opacity-30 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {adding ? (
                <>
                  <Loader2
                    size={11}
                    className="animate-spin motion-reduce:animate-none"
                  />
                  Wird gespeichert…
                </>
              ) : (
                <>
                  <Plus size={11} />
                  Hinzufügen
                </>
              )}
            </button>
          </div>
          {addError && (
            <div className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-[11.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {addError}
            </div>
          )}
          {addSuccess && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11.5px] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              ✓ {addSuccess}
            </div>
          )}
        </div>
      )}

      {/* Search-Box */}
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-1 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div className="flex items-center gap-2 px-3 py-2">
          <Search size={14} className="shrink-0 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            placeholder="Semantische Suche, z.B. 'BNetzA-Frequenz-Ermessen'…"
            className="flex-1 bg-transparent text-[13.5px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={!query.trim() || searching}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1 text-[12px] font-medium text-white hover:bg-slate-800 disabled:opacity-30 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {searching ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              "Suche"
            )}
          </button>
        </div>
      </div>

      {searchError && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {searchError}
        </div>
      )}

      {/* Results — when search is run, hides the recent-list */}
      {results !== null ? (
        <section>
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-500">
            <span>Suchergebnisse ({results.length})</span>
            <button
              type="button"
              onClick={() => {
                setResults(null);
                setQuery("");
              }}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            >
              Zurück zur Liste
            </button>
          </div>
          {results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-[12.5px] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.02]">
              {/* AUDIT-FIX L05: more natural German wording. */}
              Keine Treffer über der Relevanz-Schwelle (40%). Lege weitere
              Snippets in der Kanzlei-Wissensbasis an.
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((r) => (
                <ChunkCard key={r.id} chunk={r} score={r.score} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section>
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Database size={10} />
              Aktuelle Wissensbasis ({chunks.length})
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[12.5px] text-slate-500">
              <Loader2 size={14} className="mr-2 animate-spin" />
              Lädt…
            </div>
          ) : chunks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-[12.5px] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.02]">
              Noch keine Chunks. Klicke „Snippet hinzufügen" um deine
              Wissensbasis aufzubauen.
            </div>
          ) : (
            <div className="space-y-2">
              {chunks.map((c) => (
                <ChunkCard key={c.id} chunk={c} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ChunkCard({
  chunk,
  score,
}: {
  chunk: KnowledgeChunk;
  score?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const sourceLabel = SOURCE_TYPE_LABEL[chunk.sourceType] ?? chunk.sourceType;
  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/[0.15] dark:hover:bg-white/[0.04]"
    >
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <div className="line-clamp-1 text-[13px] font-medium text-slate-900 dark:text-slate-100">
          {chunk.title}
        </div>
        {score !== undefined && (
          <div className="shrink-0 tabular-nums text-[11px] text-emerald-600 dark:text-emerald-400">
            {(score * 100).toFixed(0)}% match
          </div>
        )}
      </div>
      <div className="mb-1 flex flex-wrap items-center gap-2 text-[10.5px] text-slate-500">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-white/[0.05]">
          {sourceLabel}
        </span>
        {chunk.mandate && (
          <span className="inline-flex items-center gap-0.5">
            <Briefcase size={9} />
            {chunk.mandate.name}
          </span>
        )}
        <span>·</span>
        <span>{new Date(chunk.createdAt).toLocaleDateString("de-DE")}</span>
        <span>·</span>
        <span>{chunk.text.length} Zeichen</span>
      </div>
      <div
        className={`text-[12px] leading-relaxed text-slate-600 dark:text-slate-400 ${
          expanded ? "" : "line-clamp-2"
        }`}
      >
        {chunk.text}
      </div>
    </button>
  );
}
