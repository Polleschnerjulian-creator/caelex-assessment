"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Inline chat approval gate.
 *
 * Rendered in AtlasChatView when the backend emits `approval_required`.
 * The chat pauses on ONE gated tool at a time; this card lets the
 * lawyer approve, edit (inline JSON), or reject before Atlas resumes.
 *
 * Visual language mirrors ApprovalCardEntry in the agent page —
 * red-tinted card, German action labels, same button tokens.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import { Check, X, ShieldAlert, Loader2 } from "lucide-react";
import { labelFor } from "@/lib/atlas/tool-labels";

export interface ChatApprovalGateProps {
  toolName: string;
  toolInput: Record<string, unknown>;
  rationale: string;
  submitting: boolean;
  onDecide: (
    decision: "approved" | "rejected" | "modified",
    modifiedInput?: Record<string, unknown>,
  ) => void;
}

export function ChatApprovalGate({
  toolName,
  toolInput,
  rationale,
  submitting,
  onDecide,
}: ChatApprovalGateProps) {
  const initialJson = (() => {
    try {
      return JSON.stringify(toolInput, null, 2);
    } catch {
      return "{}";
    }
  })();

  const [mode, setMode] = useState<"buttons" | "edit">("buttons");
  const [editJson, setEditJson] = useState<string>(initialJson);
  const [parseError, setParseError] = useState<string | null>(null);

  /* Resolve a human-readable label for the tool name. Falls back to
     the raw snake_case name if there's no entry in the registry. */
  const lbl = labelFor(toolName);
  const humanLabel = lbl.done !== toolName ? lbl.done : toolName;

  const handleConfirmEdit = () => {
    setParseError(null);
    let parsed: Record<string, unknown>;
    try {
      const raw: unknown = JSON.parse(editJson);
      if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        throw new Error("JSON muss ein Objekt sein");
      }
      parsed = raw as Record<string, unknown>;
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Ungültiges JSON");
      return;
    }
    onDecide("modified", parsed);
    setMode("buttons");
  };

  return (
    <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-red-800 dark:text-red-200">
        <ShieldAlert size={14} className="shrink-0" />
        <span>Atlas pausiert — Freigabe erforderlich</span>
      </div>

      {/* Tool card */}
      <div className="rounded-md border border-red-200 bg-white/70 p-3 dark:border-red-500/20 dark:bg-black/20">
        {/* Tool label row */}
        <div className="mb-1.5 flex items-center gap-2 text-[12px] text-red-900 dark:text-red-100">
          <span className="font-mono text-[11.5px] text-red-700 dark:text-red-200/90">
            {humanLabel}
          </span>
          <span className="text-[10.5px] text-red-400 dark:text-red-400/60">
            ({toolName})
          </span>
        </div>

        {/* Rationale — ready German one-liner from the backend */}
        <div className="mb-2 text-[11.5px] text-red-700 dark:text-red-200/80">
          {rationale}
        </div>

        {mode === "buttons" ? (
          <>
            {/* Input preview */}
            <pre className="mb-2 max-h-32 overflow-auto rounded-md border border-red-100 bg-slate-50 p-2 font-mono text-[10.5px] leading-relaxed text-slate-800 dark:border-red-500/10 dark:bg-black/30 dark:text-slate-200">
              {initialJson}
            </pre>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onDecide("approved")}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2
                    size={10}
                    className="animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Check size={10} />
                )}
                Genehmigen
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditJson(initialJson);
                  setParseError(null);
                  setMode("edit");
                }}
                disabled={submitting}
                className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-[11.5px] text-amber-800 hover:bg-amber-50 disabled:opacity-40 dark:border-amber-500/30 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-500/10"
              >
                Bearbeiten
              </button>
              <button
                type="button"
                onClick={() => onDecide("rejected")}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 py-1 text-[11.5px] text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-500/30 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-500/10"
              >
                <X size={10} />
                Ablehnen
              </button>
            </div>
          </>
        ) : (
          /* Edit mode — JSON textarea */
          <div className="space-y-1.5">
            <textarea
              value={editJson}
              onChange={(e) => {
                setEditJson(e.target.value);
                if (parseError) setParseError(null);
              }}
              rows={Math.min(10, Math.max(3, editJson.split("\n").length))}
              spellCheck={false}
              className="w-full rounded-md border border-red-200 bg-white p-2 font-mono text-[11px] leading-relaxed text-slate-900 outline-none dark:border-red-500/20 dark:bg-black/30 dark:text-slate-100"
            />
            {parseError && (
              <div className="text-[10.5px] text-red-700 dark:text-red-300">
                {parseError}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleConfirmEdit}
                disabled={submitting}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2
                    size={10}
                    className="animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Check size={10} />
                )}
                Speichern &amp; genehmigen
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("buttons");
                  setParseError(null);
                }}
                disabled={submitting}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11.5px] text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.12] dark:bg-transparent dark:text-slate-300"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
