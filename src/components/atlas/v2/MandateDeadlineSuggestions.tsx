"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Pending deadline-suggestions surface.
 *
 * Surfaces auto-extracted Frist-Vorschläge from the
 * `AtlasMandateDeadlineSuggestion` model (M3 schema, dark-feature until
 * 2026-05-17). For each pending suggestion the lawyer can:
 *   - Accept → creates a real AtlasMandateDeadline, refreshes the
 *     parent Deadlines section via the `refreshKey` bump pattern
 *   - Dismiss → marks suggestion.status=dismissed (permanently hidden,
 *     the @@unique([mandateId, sourceFileId, title]) constraint
 *     prevents re-extraction from re-creating the same row)
 *
 * Hidden entirely when no pending suggestions — zero noise for
 * mandates that haven't accumulated extractions yet.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles, Check, X, FileText } from "lucide-react";

interface SuggestionItem {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  confidence: number;
  suggestedAt: string;
  sourceFile: { id: string; filename: string } | null;
}

interface Props {
  mandateId: string;
  /** Called after a successful accept — parent should refresh the
   *  Deadlines list (typically by bumping its refreshKey state). */
  onAccepted?: () => void;
  disabled?: boolean;
}

export function MandateDeadlineSuggestions({
  mandateId,
  onAccepted,
  disabled,
}: Props) {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/atlas/mandate/${mandateId}/deadline-suggestions`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = (await res.json()) as { suggestions: SuggestionItem[] };
        setSuggestions(data.suggestions ?? []);
        setError(null);
      } else {
        setError(`HTTP ${res.status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [mandateId]);

  useEffect(() => {
    void load();
  }, [load]);

  /* Sprint 6b (2026-05-18) — listen for new suggestions persisted via
     /files/[fileId]/extract-deadlines so the lawyer sees them appear
     without a page reload. */
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ mandateId: string; count: number }>;
      if (ce.detail?.mandateId === mandateId && (ce.detail.count ?? 0) > 0) {
        void load();
      }
    };
    window.addEventListener("atlas-v2-deadline-suggestions-changed", handler);
    return () =>
      window.removeEventListener(
        "atlas-v2-deadline-suggestions-changed",
        handler,
      );
  }, [load, mandateId]);

  const handleResolve = async (
    suggestionId: string,
    action: "accept" | "dismiss",
  ) => {
    setResolvingId(suggestionId);
    setError(null);
    try {
      const res = await fetch(
        `/api/atlas/mandate/${mandateId}/deadline-suggestions/${suggestionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || `HTTP ${res.status}`);
        return;
      }
      /* Optimistic: remove from local list. */
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      if (action === "accept") {
        /* Tell the Deadlines section to refetch — the newly created
           AtlasMandateDeadline should appear immediately, not after
           a page reload. The event is also the prop callback's escape
           hatch for parents that need to know without subscribing. */
        window.dispatchEvent(new Event("atlas:mandate-deadlines-refresh"));
        onAccepted?.();
      }
    } finally {
      setResolvingId(null);
    }
  };

  /* Zero-noise: don't render anything if there are no suggestions.
     Skip the section heading too — the parent decides whether to wrap
     with a wider container. */
  if (!loading && suggestions.length === 0 && !error) return null;

  return (
    <section
      id="deadline-suggestions"
      className="mb-6 scroll-mt-20 rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-500/20 dark:bg-amber-500/5"
    >
      <div className="mb-3 flex items-center gap-2">
        <Sparkles
          size={13}
          className="shrink-0 text-amber-600 dark:text-amber-400"
        />
        <h3 className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
          Vorgeschlagene Fristen ({suggestions.length})
        </h3>
        <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
          aus Vault-Dateien extrahiert · zum Aktivieren bestätigen
        </span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-[12px] text-slate-500">
          <Loader2 size={11} className="animate-spin" /> Lädt…
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[11.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <ul className="space-y-2">
          {suggestions.map((s) => {
            const busy = resolvingId === s.id;
            const due = new Date(s.dueAt);
            const confidencePct = Math.round(s.confidence * 100);
            return (
              <li
                key={s.id}
                className="rounded-md border border-amber-200/80 bg-white/70 p-3 dark:border-amber-500/20 dark:bg-slate-900/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
                        {s.title}
                      </span>
                      <span
                        title={`Konfidenz ${confidencePct}%`}
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      >
                        {confidencePct}%
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-slate-500 dark:text-slate-400">
                      <span>
                        Fällig:{" "}
                        <span className="text-slate-700 dark:text-slate-300">
                          {due.toLocaleDateString("de-DE", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })}
                        </span>
                      </span>
                      {s.sourceFile && (
                        <span className="inline-flex items-center gap-1">
                          ·
                          <FileText size={9} />
                          <span className="line-clamp-1">
                            {s.sourceFile.filename}
                          </span>
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                        {s.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleResolve(s.id, "accept")}
                      disabled={busy || disabled}
                      title="Als Frist übernehmen"
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <Check size={10} />
                      )}
                      Übernehmen
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolve(s.id, "dismiss")}
                      disabled={busy || disabled}
                      title="Vorschlag verwerfen"
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
