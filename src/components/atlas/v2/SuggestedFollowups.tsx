"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Suggested follow-up chips.
 *
 * Renders 3 LLM-generated follow-up prompts under the most-recent
 * assistant answer. Click → calls onPick which auto-fills the
 * composer + auto-submits.
 *
 * Suggestions are fetched lazily after the streaming `done` event so
 * we never block the response render. Loading state is intentionally
 * subtle (small dots) — these are nice-to-have, not critical.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";

interface Props {
  chatId: string;
  /** Bumped by the parent to trigger a fresh fetch (e.g. after a
   *  follow-up is sent and the assistant turn finishes). */
  refreshKey: number;
  onPick: (text: string) => void;
}

interface Suggestion {
  text: string;
}

export function SuggestedFollowups({ chatId, refreshKey, onPick }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    /* Tiny debounce — wait 400ms after the `done` event so the
       assistant message has fully settled in the DB before we ask
       Haiku to riff on it. */
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/atlas/chat/${chatId}/followups`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { suggestions: Suggestion[] };
        if (!cancelled) setSuggestions(data.suggestions ?? []);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [chatId, refreshKey]);

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
        <Sparkles
          size={11}
          className="animate-pulse text-emerald-400 motion-reduce:animate-none"
        />
        <span>Folgefragen…</span>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        <Sparkles size={10} />
        Folgefragen
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s, i) => (
          <button
            key={`${refreshKey}-${i}`}
            type="button"
            onClick={() => onPick(s.text)}
            className="group inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-200"
          >
            <span className="line-clamp-1">{s.text}</span>
            <ArrowRight
              size={10}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
