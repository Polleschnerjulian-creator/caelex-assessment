"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — MandateAttachModal
 *
 * Search-first Modal aus dem ChatInput Plus-Menü. Zwei Datenquellen:
 *   - Empty-State: Recents via existing GET /api/atlas/mandate
 *     (bis zu 8 zuletzt aktualisierte Mandate)
 *   - Active-Search: live-debounced gegen GET /api/atlas/mandate/search
 *
 * Klick auf einen Mandat-Eintrag ruft onSelect() — der Parent
 * (ChatInput) entscheidet ob der API-Call (attach) sofort oder
 * verzögert (bei brand-neuem Chat) passiert.
 *
 * Klick "Neues Mandat anlegen" navigiert zu /atlas/mandate/new
 * (öffnet neuen Tab; Chat-Composer-State bleibt erhalten).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Briefcase, Loader2, Plus, X } from "lucide-react";

interface MandateLite {
  id: string;
  name: string;
  clientName: string | null;
  updatedAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (mandate: { id: string; name: string }) => void;
}

export function MandateAttachModal({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MandateLite[]>([]);
  const [recents, setRecents] = useState<MandateLite[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Auto-focus the search input on open. */
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      /* Delay one tick so the input is mounted. */
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  /* Lade Recents beim ersten Öffnen — separater Effect damit
     Re-Open keinen Flash erzeugt. */
  useEffect(() => {
    if (!open || recents.length > 0) return;
    void (async () => {
      const res = await fetch("/api/atlas/mandate", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { mandates: MandateLite[] };
      setRecents((data.mandates ?? []).slice(0, 8));
    })();
  }, [open, recents.length]);

  /* Debounced search 200ms. Empty query → cleared results, fall back
     auf Recents-Liste in der UI. */
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length === 0) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/atlas/mandate/search?q=${encodeURIComponent(q)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as { mandates: MandateLite[] };
        setResults(data.mandates ?? []);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [query, open]);

  /* Esc closes. */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const list = query.trim().length > 0 ? results : recents;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[15vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_48px_rgba(0,0,0,0.18)] dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:shadow-[0_24px_48px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.06]">
          <div className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
            Mandat anhängen
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-white/[0.06]">
          <Search size={13} className="shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mandat suchen…"
            aria-label="Mandat suchen"
            className="w-full bg-transparent text-[14px] text-slate-800 outline-none focus-visible:outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          {loading && (
            <Loader2
              size={12}
              className="shrink-0 animate-spin text-slate-400"
            />
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-1.5 py-1.5">
          {query.trim().length === 0 && recents.length > 0 && (
            <div className="px-3 pb-1 pt-1.5 text-[10.5px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Recent
            </div>
          )}
          {list.length === 0 ? (
            <div className="px-3 py-4 text-center text-[12.5px] text-slate-500">
              {query.trim().length > 0
                ? loading
                  ? "Sucht…"
                  : "Keine Treffer."
                : "Noch keine Mandate."}
            </div>
          ) : (
            list.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect({ id: m.id, name: m.name })}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
              >
                <Briefcase
                  size={13}
                  className="shrink-0 opacity-60 text-slate-600 dark:text-slate-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-slate-800 dark:text-slate-100">
                    {m.name}
                  </div>
                  {m.clientName && (
                    <div className="line-clamp-1 text-[10.5px] text-slate-500">
                      {m.clientName}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 px-1.5 py-1.5 dark:border-white/[0.06]">
          <Link
            href="/atlas/mandate/new"
            target="_blank"
            rel="noopener"
            onClick={onClose}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-700 transition-colors hover:bg-black/[0.04] dark:text-slate-200 dark:hover:bg-white/[0.04]"
          >
            <Plus size={13} className="shrink-0 opacity-60" />
            Neues Mandat anlegen
          </Link>
        </div>
      </div>
    </div>
  );
}
