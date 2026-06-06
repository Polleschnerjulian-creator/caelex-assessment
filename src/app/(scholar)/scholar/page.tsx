"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, AlertCircle, FileText, Loader2 } from "lucide-react";

/**
 * Caelex Scholar — search home page (Task 3.3).
 *
 * Client component: fetches only via POST /api/scholar/search.
 * No server-module or corpus-data imports — zero bundle bloat.
 */

interface SearchHit {
  id: string;
  jurisdiction: string;
  type: string;
  status: string;
  title: string;
  scopeDescription: string | null;
  score: number;
}

interface SearchResult {
  query: string;
  hitCount: number;
  semanticAvailable: boolean;
  hits: SearchHit[];
}

type PageState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty"; query: string }
  | { kind: "results"; data: SearchResult };

export default function ScholarSearchPage() {
  const [query, setQuery] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [state, setState] = useState<PageState>({ kind: "idle" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    setState({ kind: "loading" });
    try {
      const body: Record<string, string> = { query: trimmed };
      if (jurisdiction.trim()) body.jurisdiction = jurisdiction.trim();

      const res = await fetch("/api/scholar/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 403) {
        setState({
          kind: "error",
          message: "Zugriff verweigert. Bitte prüfe deine Zugangsberechtigung.",
        });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState({
          kind: "error",
          message:
            (data as { error?: string }).error ??
            "Die Suche ist fehlgeschlagen. Bitte versuche es erneut.",
        });
        return;
      }

      const data: SearchResult = await res.json();
      if (data.hits.length === 0) {
        setState({ kind: "empty", query: trimmed });
      } else {
        setState({ kind: "results", data });
      }
    } catch {
      setState({
        kind: "error",
        message:
          "Netzwerkfehler. Bitte prüfe deine Verbindung und versuche es erneut.",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div className="space-y-2">
        <h1 className="text-display font-semibold text-white">
          Durchsuche das Weltraumrecht
        </h1>
        <p className="text-body-lg text-slate-400">
          Finde relevante Rechtsquellen, Verordnungen und Gesetze — semantisch
          und volltext durchsuchbar.
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="z.B. Haftung, Weltraumschrott, Frequenzzuteilung …"
              minLength={2}
              required
              className="w-full bg-navy-900 border border-navy-700 rounded-lg pl-10 pr-4 py-3 text-body-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={query.trim().length < 2 || state.kind === "loading"}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-6 py-3 text-subtitle font-medium transition-colors flex items-center gap-2"
          >
            {state.kind === "loading" ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Suche…
              </>
            ) : (
              "Suchen"
            )}
          </button>
        </div>

        {/* Optional jurisdiction filter */}
        <div className="flex items-center gap-3">
          <span className="text-small text-slate-500 whitespace-nowrap">
            Jurisdiction (optional):
          </span>
          <input
            type="text"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value)}
            placeholder="z.B. DE, EU, FR …"
            className="bg-navy-900 border border-navy-700 rounded-md px-3 py-1.5 text-small text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors w-36"
          />
        </div>
      </form>

      {/* State rendering */}
      {state.kind === "idle" && (
        <div className="text-center py-16 text-slate-500 text-body">
          Gib mindestens 2 Zeichen ein und starte die Suche.
        </div>
      )}

      {state.kind === "loading" && (
        <div className="flex items-center justify-center gap-3 py-16 text-slate-400 text-body">
          <Loader2 size={20} className="animate-spin text-emerald-500" />
          Durchsuche Rechtsquellen…
        </div>
      )}

      {state.kind === "error" && (
        <div className="flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-small text-red-300">{state.message}</p>
        </div>
      )}

      {state.kind === "empty" && (
        <div className="text-center py-16 space-y-2">
          <p className="text-body text-slate-400">
            Keine Ergebnisse für{" "}
            <span className="text-white font-medium">
              &ldquo;{state.query}&rdquo;
            </span>
            .
          </p>
          <p className="text-small text-slate-500">
            Versuche es mit anderen Suchbegriffen oder einer anderen
            Jurisdiction.
          </p>
        </div>
      )}

      {state.kind === "results" && (
        <div className="space-y-4">
          {/* Result meta row */}
          <div className="flex items-center justify-between">
            <p className="text-small text-slate-400">
              <span className="text-emerald-400 font-medium">
                {state.data.hitCount}
              </span>{" "}
              {state.data.hitCount === 1 ? "Ergebnis" : "Ergebnisse"} für{" "}
              <span className="text-white">
                &ldquo;{state.data.query}&rdquo;
              </span>
            </p>
            {!state.data.semanticAvailable && (
              <span className="text-caption text-amber-400/70 border border-amber-400/20 rounded-full px-2.5 py-0.5 bg-amber-400/5">
                Semantische Suche aus — Stichwortsuche aktiv
              </span>
            )}
          </div>

          {/* Hit list */}
          <ul className="space-y-3">
            {state.data.hits.map((hit) => (
              <li key={hit.id}>
                <Link
                  href={`/scholar/sources/${encodeURIComponent(hit.id)}`}
                  className="block rounded-lg border border-navy-700 bg-navy-900 hover:border-emerald-500/40 hover:bg-navy-800 transition-all duration-200 p-4 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                      <FileText
                        size={15}
                        className="text-slate-500 group-hover:text-emerald-400 transition-colors"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <h2 className="text-title font-medium text-white group-hover:text-emerald-300 transition-colors leading-snug">
                        {hit.title}
                      </h2>
                      <p className="text-caption text-slate-500">
                        {hit.jurisdiction}
                        <span className="mx-1.5 opacity-40">·</span>
                        {hit.type}
                        <span className="mx-1.5 opacity-40">·</span>
                        {hit.status}
                      </p>
                      {hit.scopeDescription && (
                        <p className="text-small text-slate-400 line-clamp-2 pt-0.5">
                          {hit.scopeDescription}
                        </p>
                      )}
                    </div>
                    <span className="text-caption text-slate-600 shrink-0 tabular-nums">
                      {(hit.score * 100).toFixed(0)}%
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
