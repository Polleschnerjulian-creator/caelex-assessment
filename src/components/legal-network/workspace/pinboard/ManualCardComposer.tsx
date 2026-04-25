"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * ManualCardComposer — collapsible inline editor for adding free-form
 * TEXT cards to the pinboard. Distinct from Claude-generated artifacts:
 * the lawyer types title + body and the card lands at the end of the
 * board, ready to pin or rearrange.
 *
 * Stays collapsed by default (just a "+ Karte" button) — expanded
 * state only when actively composing. Submit collapses + clears.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useRef, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";

interface ManualCardComposerProps {
  matterId: string;
  /** Called after successful create — parent triggers Pinboard refresh. */
  onCreated: () => void | Promise<void>;
}

const MAX_TITLE = 200;
const MAX_CONTENT = 10_000;

export function ManualCardComposer({
  matterId,
  onCreated,
}: ManualCardComposerProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [open]);

  function reset() {
    setTitle("");
    setContent("");
    setError(null);
    setOpen(false);
  }

  async function handleSubmit() {
    const t = title.trim();
    const c = content.trim();
    if (!t || !c || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/network/matter/${matterId}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, content: c }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Konnte Karte nicht speichern");
      }
      await onCreated();
      reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <div className="px-6 pt-4">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[12px] text-white/55 hover:text-white hover:border-white/20 hover:bg-white/[0.025] transition"
        >
          <Plus size={11} strokeWidth={2} />
          Eigene Karte
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 pt-4">
      <div className="rounded-2xl border border-white/[0.1] bg-white/[0.025] backdrop-blur-xl p-3 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] tracking-[0.22em] uppercase text-white/45">
            Neue Notiz-Karte
          </span>
          <button
            onClick={reset}
            disabled={submitting}
            className="text-white/40 hover:text-white p-1 rounded transition"
            aria-label="Schließen"
          >
            <X size={11} strokeWidth={1.8} />
          </button>
        </div>

        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={MAX_TITLE}
          placeholder="Titel"
          disabled={submitting}
          className="w-full bg-transparent outline-none text-[14px] font-medium text-white placeholder:text-white/30 mb-2"
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={MAX_CONTENT}
          placeholder="Was soll auf die Karte? (Plain text, kein Markdown.)"
          disabled={submitting}
          className="w-full bg-transparent outline-none resize-none text-[12px] text-white/85 placeholder:text-white/30 leading-relaxed"
        />

        {error && (
          <div className="text-[11px] text-red-400 mt-1.5 px-0.5">{error}</div>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-white/[0.05] pt-2">
          <div className="text-[10px] text-white/30 tabular-nums">
            {content.length}/{MAX_CONTENT}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={reset}
              disabled={submitting}
              className="px-3 h-7 rounded-md text-[11px] text-white/55 hover:text-white hover:bg-white/[0.04] disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || !content.trim() || submitting}
              className="px-3 h-7 rounded-md bg-white text-black text-[11px] font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 inline-flex items-center gap-1.5"
            >
              {submitting && (
                <Loader2 size={10} strokeWidth={2.2} className="animate-spin" />
              )}
              {submitting ? "Speichere…" : "Karte erstellen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
