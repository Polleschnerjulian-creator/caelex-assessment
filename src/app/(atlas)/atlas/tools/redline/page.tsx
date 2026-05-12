"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Redline / Document-Diff tool.
 *
 * Two-pane upload + side-by-side diff view. The lawyer drops in
 * "Vertrag V1" (left) and "Vertrag V2 von der Gegenseite" (right),
 * Atlas extracts both via /api/atlas/redline, runs word-level LCS
 * diff, and renders inserts/deletes inline. Optional: Anthropic-
 * commentary highlighting the legally-significant changes.
 *
 * Use cases:
 *   - Vertragsverhandlung: was hat die Gegenseite in der neuen Version geändert?
 *   - Versionsvergleich: V1 vs. V2 eines eigenen Drafts
 *   - Bescheid-Diff: Bescheid zur ursprünglichen Anhörung
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState, useRef } from "react";
import { Upload, Loader2, ArrowLeftRight, Sparkles } from "lucide-react";

interface DiffSegment {
  op: "equal" | "insert" | "delete";
  text: string;
}

interface RedlineResponse {
  segments: DiffSegment[];
  beforeChars: number;
  afterChars: number;
  truncated: boolean;
  stats: { equal: number; insert: number; delete: number };
  commentary?: string;
  durationMs: number;
  error?: string;
}

export default function RedlinePage() {
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [withCommentary, setWithCommentary] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RedlineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  const canRun = beforeFile && afterFile && !running;

  const handleRun = async () => {
    if (!beforeFile || !afterFile) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("before", beforeFile);
      form.append("after", afterFile);
      if (withCommentary) form.append("commentary", "true");
      const res = await fetch("/api/atlas/redline", {
        method: "POST",
        body: form,
      });
      const body = (await res.json()) as RedlineResponse;
      if (!res.ok) {
        setError(body.error || `Server-Fehler (${res.status})`);
        return;
      }
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setBeforeFile(null);
    setAfterFile(null);
    setResult(null);
    setError(null);
    if (beforeRef.current) beforeRef.current.value = "";
    if (afterRef.current) afterRef.current.value = "";
  };

  return (
    <div className="mx-auto h-full max-w-7xl overflow-y-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-100 [font-family:ui-serif,Georgia,'Cambria_Style',serif]">
          Redline
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Vergleiche zwei Versionen eines Vertrags / Schriftsatzes / Bescheids.
          Word-level Diff plus optionale rechtliche Bewertung der Änderungen
          durch Atlas.
        </p>
      </div>

      {/* Upload area */}
      {!result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FileSlot
              label="Version 1 (Original)"
              file={beforeFile}
              inputRef={beforeRef}
              onPick={(f) => setBeforeFile(f)}
            />
            <FileSlot
              label="Version 2 (Geändert)"
              file={afterFile}
              inputRef={afterRef}
              onPick={(f) => setAfterFile(f)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <label className="flex items-center gap-2 text-[12.5px] text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={withCommentary}
                onChange={(e) => setWithCommentary(e.target.checked)}
                className="h-4 w-4 accent-slate-900 dark:accent-emerald-500"
              />
              <Sparkles size={12} className="text-slate-500" />
              <span>
                Rechtliche Bewertung der Änderungen durch Atlas (zusätzliche
                Kosten ~$0.01)
              </span>
            </label>
            <button
              type="button"
              onClick={handleRun}
              disabled={!canRun}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-30 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {running ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Vergleicht…
                </>
              ) : (
                <>
                  <ArrowLeftRight size={13} />
                  Diff erstellen
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-6">
          {/* Stats strip */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <div className="flex items-center gap-6 text-[12.5px]">
              <Stat
                label="Hinzugefügt"
                value={result.stats.insert.toLocaleString("de-DE")}
                color="text-emerald-600 dark:text-emerald-400"
              />
              <Stat
                label="Gelöscht"
                value={result.stats.delete.toLocaleString("de-DE")}
                color="text-red-600 dark:text-red-400"
              />
              <Stat
                label="Unverändert"
                value={result.stats.equal.toLocaleString("de-DE")}
                color="text-slate-600 dark:text-slate-400"
              />
              {result.truncated && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400">
                  · Dokument gekürzt (zu lang)
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-[12px] text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline dark:hover:text-slate-200"
            >
              Neuer Diff
            </button>
          </div>

          {/* Commentary (if requested + available) */}
          {result.commentary && (
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <Sparkles size={11} />
                Atlas-Bewertung
              </div>
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800 dark:text-slate-200">
                {result.commentary}
              </div>
            </div>
          )}

          {/* Diff view */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-wider text-slate-500">
              <span>Diff</span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/60" />
                hinzu
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-red-500/60" />
                weg
              </span>
            </div>
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800 dark:text-slate-200">
              {result.segments.map((seg, i) => {
                if (seg.op === "equal") return <span key={i}>{seg.text}</span>;
                if (seg.op === "insert") {
                  return (
                    <ins
                      key={i}
                      className="bg-emerald-200/60 text-emerald-900 no-underline dark:bg-emerald-500/25 dark:text-emerald-100"
                    >
                      {seg.text}
                    </ins>
                  );
                }
                return (
                  <del
                    key={i}
                    className="bg-red-200/60 text-red-900 line-through dark:bg-red-500/25 dark:text-red-100"
                  >
                    {seg.text}
                  </del>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileSlot({
  label,
  file,
  inputRef,
  onPick,
}: {
  label: string;
  file: File | null;
  /* React 19 useRef returns `RefObject<T | null>`; the underlying
     ref-callback API on <input> accepts that shape, but the
     LegacyRef union TS infers requires explicit React.Ref type. */
  inputRef: React.Ref<HTMLInputElement>;
  onPick: (f: File | null) => void;
}) {
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) onPick(f);
  };
  return (
    <label
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition-colors hover:border-slate-400 hover:bg-slate-100 dark:border-white/[0.10] dark:bg-white/[0.02] dark:hover:border-white/[0.20] dark:hover:bg-white/[0.04]"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      <Upload size={18} className="text-slate-400" />
      <div className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
        {label}
      </div>
      {file ? (
        <div className="text-[11.5px] text-slate-600 dark:text-slate-400">
          {file.name} · {Math.round(file.size / 1024)} KB
        </div>
      ) : (
        <div className="text-[11px] text-slate-500">
          PDF, DOCX, TXT, MD — drag&drop oder klicken
        </div>
      )}
    </label>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`text-[15px] font-semibold tabular-nums ${color}`}>
        {value}
      </div>
    </div>
  );
}
