"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — SuggestionsPanel.
 *
 * Sprint 16 (2026-05-19). Right-sidebar-content für die Vorschläge-tab.
 * Listet alle insertion + deletion-suggestions mit author, timestamp,
 * snippet-text. Per item: Accept (in-doc anwenden) oder Reject (revert).
 * Bulk-actions: alle akzeptieren / alle ablehnen.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import {
  GitPullRequest,
  PlusCircle,
  MinusCircle,
  Check,
  X,
  ChevronDown,
} from "lucide-react";

export interface Suggestion {
  id: string;
  kind: "insertion" | "deletion";
  author: string;
  createdAt: number;
  /** Snippet of the suggested-text for the panel-list. */
  text: string;
}

interface Props {
  suggestions: Suggestion[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onJumpTo: (id: string) => void;
}

export function SuggestionsPanel({
  suggestions,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  onJumpTo,
}: Props) {
  const [filter, setFilter] = useState<"all" | "insertion" | "deletion">("all");
  const visible = suggestions.filter((s) =>
    filter === "all" ? true : s.kind === filter,
  );
  const insCount = suggestions.filter((s) => s.kind === "insertion").length;
  const delCount = suggestions.filter((s) => s.kind === "deletion").length;

  return (
    <div className="flex h-full flex-col">
      {/* Filter chips + Bulk actions */}
      <div className="flex flex-col gap-1 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <div className="flex items-center gap-1">
          {(
            [
              ["all", "Alle", suggestions.length],
              ["insertion", "Einfügen", insCount],
              ["deletion", "Löschen", delCount],
            ] as const
          ).map(([f, label, count]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                filter === f
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {label} <span className="opacity-60">({count})</span>
            </button>
          ))}
        </div>
        {suggestions.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (
                  confirm(`Alle ${suggestions.length} Vorschläge akzeptieren?`)
                )
                  onAcceptAll();
              }}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2 py-0.5 text-[10.5px] font-medium text-white hover:bg-emerald-600"
            >
              <Check size={9} />
              Alle akzeptieren
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Alle ${suggestions.length} Vorschläge ablehnen?`))
                  onRejectAll();
              }}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10.5px] text-slate-600 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-red-500/10"
            >
              <X size={9} />
              Alle ablehnen
            </button>
          </div>
        )}
      </div>

      {/* Suggestions list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {visible.length === 0 ? (
          <div className="px-2 py-8 text-center text-[11.5px] text-slate-500">
            <GitPullRequest
              size={20}
              className="mx-auto mb-2 text-slate-300 dark:text-slate-700"
            />
            {suggestions.length === 0
              ? "Noch keine Vorschläge. Markier Text + click 'Vorschlag: Löschen' oder cursor an position + 'Vorschlag: Einfügen' in der Toolbar."
              : "Keine Treffer für diesen Filter."}
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((s) => (
              <li key={s.id}>
                <SuggestionCard
                  suggestion={s}
                  onJump={() => onJumpTo(s.id)}
                  onAccept={() => onAccept(s.id)}
                  onReject={() => onReject(s.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onJump,
  onAccept,
  onReject,
}: {
  suggestion: Suggestion;
  onJump: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isInsertion = suggestion.kind === "insertion";
  return (
    <div
      className={`rounded-lg border p-2 transition-colors ${
        isInsertion
          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/[0.04]"
          : "border-red-200 bg-red-50/40 dark:border-red-500/30 dark:bg-red-500/[0.04]"
      }`}
    >
      <div className="flex items-start gap-2">
        {isInsertion ? (
          <PlusCircle
            size={12}
            className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
          />
        ) : (
          <MinusCircle
            size={12}
            className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] text-slate-500">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {suggestion.author}
            </span>
            <span>
              {" · "}
              {new Date(suggestion.createdAt).toLocaleString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>
      {/* Snippet preview */}
      <button
        type="button"
        onClick={onJump}
        title="Im Dokument anzeigen"
        className={`mt-1 block w-full rounded-md border-l-2 px-2 py-1 text-left text-[12px] transition-colors hover:bg-white ${
          isInsertion
            ? "border-emerald-400 text-emerald-900 dark:border-emerald-500/60 dark:text-emerald-200"
            : "border-red-400 text-red-900 line-through dark:border-red-500/60 dark:text-red-200"
        }`}
      >
        {suggestion.text}
      </button>
      {/* Actions */}
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          onClick={onAccept}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded bg-emerald-500 px-2 py-1 text-[10.5px] font-medium text-white hover:bg-emerald-600"
        >
          <Check size={9} />
          Akzeptieren
        </button>
        <button
          type="button"
          onClick={onReject}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[10.5px] text-slate-700 hover:bg-red-50 hover:text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-red-500/10"
        >
          <X size={9} />
          Ablehnen
        </button>
      </div>
    </div>
  );
}
