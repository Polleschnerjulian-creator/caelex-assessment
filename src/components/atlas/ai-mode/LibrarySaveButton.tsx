"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * LibrarySaveButton — Phase 5 Personal Research Library save action.
 *
 * Sits next to a finished Atlas message (in AIMode and ChatSidebar)
 * and lets the lawyer save the response into their cross-matter
 * library. Click → POST /api/atlas/library, animate confirmation.
 *
 * State machine: idle → saving → saved → idle (after 1.6s) | error
 * → idle (after 1.6s).
 *
 * Reusable: takes content + optional matter context + optional query.
 * Same Atlas accent vocabulary (emerald hover, glass surface) as
 * Phase 2 PinnableParagraph + Phase 3 CitationChip.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useState } from "react";
import { Bookmark, Check, Loader2, AlertTriangle } from "lucide-react";

interface LibrarySaveButtonProps {
  /** The full message content to save. Markdown OK — citations stay
   *  embedded as plaintext and re-render as chips on read. */
  content: string;
  /** Optional: the user question that produced the answer. Useful
   *  retrospective context when re-reading. */
  query?: string;
  /** Where the save was triggered from. Drives the `sourceKind` field
   *  on the server entry so the library page can group / filter
   *  later. */
  sourceKind?: "ATLAS_IDLE" | "MATTER_CHAT" | "MANUAL";
  /** When triggered from inside a matter conversation, link the
   *  entry back so the library page can show "from {matter}". */
  sourceMatterId?: string;
  /** Optional pre-rendered title (overrides server's first-N-chars
   *  default). Lawyers usually skip this and let the server pick. */
  title?: string;
  /** Visual variant. "compact" is for inline use next to a chat
   *  bubble (small icon-only button); "labelled" is for prominent
   *  use in the AIMode message-tools row (icon + text). */
  variant?: "compact" | "labelled";
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function LibrarySaveButton({
  content,
  query,
  sourceKind,
  sourceMatterId,
  title,
  variant = "compact",
}: LibrarySaveButtonProps) {
  const [state, setState] = useState<SaveState>("idle");

  const handleSave = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (state !== "idle" && state !== "error") return;
      if (!content.trim()) return;
      setState("saving");
      try {
        const res = await fetch("/api/atlas/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title?.trim() || undefined,
            content,
            query: query?.trim() || undefined,
            sourceKind,
            sourceMatterId,
          }),
        });
        if (!res.ok) {
          setState("error");
          setTimeout(() => setState("idle"), 1600);
          return;
        }
        setState("saved");
        setTimeout(() => setState("idle"), 1800);
      } catch {
        setState("error");
        setTimeout(() => setState("idle"), 1600);
      }
    },
    [content, query, sourceKind, sourceMatterId, title, state],
  );

  const labels: Record<SaveState, string> = {
    idle: "In Bibliothek speichern",
    saving: "Speichere…",
    saved: "Gespeichert",
    error: "Fehler — erneut versuchen",
  };

  if (variant === "labelled") {
    return (
      <button
        type="button"
        onClick={handleSave}
        disabled={state === "saving"}
        title={labels[state]}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
          text-[10.5px] font-medium tracking-tight
          transition-all duration-150
          ${
            state === "saved"
              ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40"
              : state === "error"
                ? "bg-red-500/10 text-red-300 ring-1 ring-red-500/30"
                : state === "saving"
                  ? "bg-white/[0.06] text-white/65 ring-1 ring-white/10"
                  : "bg-white/[0.04] text-white/55 ring-1 ring-white/[0.08] hover:bg-emerald-500/12 hover:text-emerald-200 hover:ring-emerald-500/30"
          }
        `}
        aria-label={labels[state]}
      >
        {state === "saved" ? (
          <Check size={10} strokeWidth={2} />
        ) : state === "error" ? (
          <AlertTriangle size={10} strokeWidth={2} />
        ) : state === "saving" ? (
          <Loader2 size={10} strokeWidth={2} className="animate-spin" />
        ) : (
          <Bookmark size={10} strokeWidth={1.8} />
        )}
        <span>
          {state === "saved"
            ? "Gespeichert"
            : state === "saving"
              ? "Speichere…"
              : state === "error"
                ? "Fehler"
                : "In Bibliothek"}
        </span>
      </button>
    );
  }

  // compact variant — icon-only square, fits next to a paragraph or
  // tool-trace row. Same emerald accent on hover/saved as the rest
  // of the Atlas vocabulary.
  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={state === "saving"}
      title={labels[state]}
      className={`
        inline-flex items-center justify-center w-5 h-5 rounded-md
        transition-all duration-150
        ${
          state === "saved"
            ? "bg-emerald-500/20 text-emerald-300"
            : state === "error"
              ? "bg-red-500/15 text-red-300"
              : state === "saving"
                ? "bg-white/[0.08] text-white/70"
                : "bg-white/[0.04] text-white/45 hover:bg-emerald-500/15 hover:text-emerald-300"
        }
      `}
      aria-label={labels[state]}
    >
      {state === "saved" ? (
        <Check size={11} strokeWidth={2} />
      ) : state === "error" ? (
        <AlertTriangle size={10} strokeWidth={2} />
      ) : state === "saving" ? (
        <Loader2 size={10} strokeWidth={2} className="animate-spin" />
      ) : (
        <Bookmark size={10} strokeWidth={1.8} />
      )}
    </button>
  );
}
