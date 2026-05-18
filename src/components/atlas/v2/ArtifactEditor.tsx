"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — ArtifactEditor (Word-like fullscreen mit AI-Sidebar).
 *
 * Sprint 9 (2026-05-18). Triggert wenn der User auf "Bearbeiten" in der
 * ArtifactPreviewPanel klickt. Öffnet einen fullscreen-overlay mit
 * 3-Spalten-Layout:
 *
 *   [Outline 240px] [Editable Markdown center] [AI-Assistant 360px]
 *
 * - Outline auto-extrahiert H1/H2/H3 + Roman-Sections aus dem body —
 *   click springt zur entsprechenden zeile im textarea.
 * - Editor ist ein markdown-textarea (KEIN WYSIWYG — markdown bleibt
 *   das format das die AI versteht + der PDF-Generator verarbeitet).
 *   Generöse padding + serif-leaning typography für "Word-feel".
 * - AI-Sidebar postet zu /api/atlas/refine-artifact mit dem aktuellen
 *   body + der Anweisung. Wenn die AI einen edit vorschlägt (parsed via
 *   ===EDITED-DOCUMENT=== marker), zeigt eine "Übernehmen"-card unter
 *   der Erklärung — click ersetzt den body 1:1.
 *
 * Save-Flow: "Speichern"-button im Header dispatcht ein CustomEvent
 * "atlas-v2-artifact-edited" mit dem neuen body. Der ChatView fängt
 * das und schickt's als refine-message an die AI (gleicher pfad wie
 * der bisherige "Anpassen"-button).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Save,
  Sparkles,
  Loader2,
  Check,
  FileText,
  ListTree,
  ArrowDownToLine,
  Eye,
  Code2,
  AlertCircle,
} from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";
import type { ArtifactInfo } from "./ArtifactPreviewPanel";

interface Props {
  artifact: ArtifactInfo;
  onClose: () => void;
  /** Called when the user clicks Save. Receives the edited body + title. */
  onSave: (next: { title: string; body: string }) => void;
}

interface OutlineEntry {
  level: 1 | 2 | 3;
  text: string;
  lineIndex: number;
}

interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  /** When non-null, the AI proposed a full body-rewrite the user can
   *  apply with one click. */
  suggestion?: string | null;
  applied?: boolean;
}

function parseOutline(body: string): OutlineEntry[] {
  const out: OutlineEntry[] = [];
  const lines = body.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^# /.test(line)) {
      out.push({
        level: 1,
        text: line.replace(/^# /, "").trim(),
        lineIndex: i,
      });
    } else if (/^## /.test(line)) {
      out.push({
        level: 2,
        text: line.replace(/^## /, "").trim(),
        lineIndex: i,
      });
    } else if (/^### /.test(line)) {
      out.push({
        level: 3,
        text: line.replace(/^### /, "").trim(),
        lineIndex: i,
      });
    } else if (/^[IVX]+\.\s/.test(line)) {
      out.push({ level: 2, text: line.trim(), lineIndex: i });
    }
  }
  return out;
}

export function ArtifactEditor({ artifact, onClose, onSave }: Props) {
  const [title, setTitle] = useState(artifact.title);
  const [body, setBody] = useState(artifact.body);
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<"edit" | "preview">("edit");

  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      id: "welcome",
      role: "system",
      text: "Hallo. Frag mich was zum Dokument oder gib mir eine Bearbeitungs-Anweisung. Beispiele:\n• Schreib Abschnitt II härter\n• Was bedeutet § 2 WeltrG?\n• Füge eine Anlage 3 hinzu\n• Schreib das in der Sie-Form",
    },
  ]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

  const outline = useMemo(() => parseOutline(body), [body]);

  /* Track dirty-state without re-firing on every keystroke. */
  useEffect(() => {
    setDirty(body !== artifact.body || title !== artifact.title);
  }, [body, title, artifact.body, artifact.title]);

  /* Esc closes — but warn on unsaved. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dirty) {
          const ok = confirm(
            "Ungespeicherte änderungen verwerfen und schließen?",
          );
          if (!ok) return;
        }
        onClose();
      }
      /* Cmd+S / Ctrl+S → save */
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [dirty, onClose]);

  /* Scroll AI sidebar to bottom on new message. */
  useEffect(() => {
    const el = aiScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [aiMessages.length, aiBusy]);

  const handleSave = () => {
    onSave({ title, body });
    onClose();
  };

  /* Jump to outline entry: find the line offset in the textarea and
     set caret + scroll. */
  const jumpToOutline = (entry: OutlineEntry) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const lines = body.split("\n");
    let offset = 0;
    for (let i = 0; i < entry.lineIndex; i++) {
      offset += lines[i].length + 1; /* +1 for the newline */
    }
    ta.focus();
    ta.setSelectionRange(
      offset,
      offset + (lines[entry.lineIndex]?.length ?? 0),
    );
    /* Force scroll: we set scrollTop based on approximate line-height. */
    const approxLineH = 24; /* matches our prose-css line-height */
    ta.scrollTop = entry.lineIndex * approxLineH - 80;
  };

  const handleAskAi = async () => {
    const instruction = aiInput.trim();
    if (!instruction || aiBusy) return;
    setAiInput("");
    setAiError(null);
    const userMsgId = `u-${Date.now()}`;
    setAiMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", text: instruction },
    ]);
    setAiBusy(true);
    try {
      const res = await fetch("/api/atlas/refine-artifact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: artifact.kind,
          title,
          body,
          instruction,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        explanation: string;
        suggestion: string | null;
      };
      setAiMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: data.explanation,
          suggestion: data.suggestion,
        },
      ]);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setAiBusy(false);
      requestAnimationFrame(() => aiInputRef.current?.focus());
    }
  };

  const applySuggestion = (msgId: string, suggestion: string) => {
    setBody(suggestion);
    setAiMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, applied: true } : m)),
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-slate-950">
      {/* Top bar */}
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-2.5 dark:border-slate-800">
        <FileText
          size={16}
          className="shrink-0 text-emerald-600 dark:text-emerald-400"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <div className="flex shrink-0 items-center gap-2 text-[11px] text-slate-500">
          {dirty ? (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Geändert
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Check size={11} className="text-emerald-600" />
              Aktuell
            </span>
          )}
        </div>
        {/* View toggle */}
        <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setView("edit")}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
              view === "edit"
                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
            }`}
          >
            <Code2 size={10} />
            Bearbeiten
          </button>
          <button
            type="button"
            onClick={() => setView("preview")}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
              view === "preview"
                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
            }`}
          >
            <Eye size={10} />
            Vorschau
          </button>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={11} />
          Speichern (⌘S)
        </button>
        <button
          type="button"
          onClick={() => {
            if (dirty) {
              const ok = confirm(
                "Ungespeicherte änderungen verwerfen und schließen?",
              );
              if (!ok) return;
            }
            onClose();
          }}
          aria-label="Schließen"
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X size={16} />
        </button>
      </header>

      {/* 3-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Outline */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 lg:flex">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
            <ListTree size={12} className="text-slate-400" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Gliederung
            </span>
            <span className="ml-auto text-[10.5px] text-slate-400">
              {outline.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {outline.length === 0 ? (
              <div className="px-4 py-3 text-[11.5px] text-slate-400">
                Noch keine Überschriften. Schreib z.B.{" "}
                <code>## Sachverhalt</code> um Abschnitte anzulegen.
              </div>
            ) : (
              <ul>
                {outline.map((entry, idx) => (
                  <li key={`${entry.lineIndex}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => jumpToOutline(entry)}
                      className={`flex w-full items-start gap-1.5 px-4 py-1 text-left text-[12px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${
                        entry.level === 1
                          ? "font-semibold"
                          : entry.level === 2
                            ? "pl-6"
                            : "pl-8 text-[11.5px] text-slate-500"
                      }`}
                    >
                      <span className="line-clamp-2">{entry.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-slate-200 px-4 py-2 text-[10.5px] text-slate-400 dark:border-slate-800">
            {body.length} Zeichen · {body.split(/\s+/).filter(Boolean).length}{" "}
            Wörter
          </div>
        </aside>

        {/* Center: Editor or Preview */}
        <main className="flex flex-1 flex-col overflow-hidden bg-slate-100 dark:bg-slate-900">
          <div className="flex-1 overflow-y-auto py-8">
            <div className="mx-auto max-w-3xl px-12">
              {view === "edit" ? (
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  spellCheck
                  className="block min-h-[80vh] w-full resize-none rounded-xl border border-slate-200 bg-white p-10 font-mono text-[13.5px] leading-[1.7] text-slate-900 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500/40 dark:focus:ring-emerald-500/10"
                />
              ) : (
                <div className="prose prose-slate max-w-none rounded-xl border border-slate-200 bg-white p-10 text-[14px] leading-relaxed shadow-sm dark:prose-invert dark:border-slate-700 dark:bg-slate-950">
                  <MarkdownContent text={body} />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right: AI Assistant */}
        <aside className="flex w-full max-w-[380px] shrink-0 flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
            <Sparkles
              size={13}
              className="text-emerald-600 dark:text-emerald-400"
            />
            <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
              Atlas
            </span>
            <span className="ml-auto text-[10.5px] text-slate-400">
              Kontext-aware · Live-Edit
            </span>
          </div>

          {/* Messages */}
          <div ref={aiScrollRef} className="flex-1 overflow-y-auto px-3 py-3">
            <div className="space-y-3">
              {aiMessages.map((m) => (
                <AiMessageBubble
                  key={m.id}
                  message={m}
                  onApply={() => {
                    if (m.suggestion) applySuggestion(m.id, m.suggestion);
                  }}
                />
              ))}
              {aiBusy && (
                <div className="flex items-center gap-2 px-2 py-1 text-[11.5px] text-slate-500">
                  <Loader2 size={11} className="animate-spin" />
                  Atlas denkt nach…
                </div>
              )}
              {aiError && (
                <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 p-3 dark:border-slate-800">
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-emerald-500/40 dark:focus-within:ring-emerald-500/10">
              <textarea
                ref={aiInputRef}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleAskAi();
                  }
                }}
                placeholder="Frag Atlas oder gib Anweisung…"
                rows={2}
                disabled={aiBusy}
                className="block w-full resize-none bg-transparent text-[12.5px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Enter = senden · Shift+Enter = neue Zeile
                </span>
                <button
                  type="button"
                  onClick={handleAskAi}
                  disabled={!aiInput.trim() || aiBusy}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Sparkles size={10} />
                  Senden
                </button>
              </div>
            </div>
            {/* Suggested prompts (quick-actions) */}
            <div className="mt-2 flex flex-wrap gap-1">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAiInput(q)}
                  className="rounded-full border border-slate-200 px-2 py-0.5 text-[10.5px] text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* Quick-prompt chips shown under the AI input — typical edits a lawyer
   does often. Click prefills the input. */
const QUICK_PROMPTS = [
  "Schreib das formeller",
  "Kürz auf die Hälfte",
  "Schreib in der Sie-Form",
  "Füge eine Anlage hinzu",
];

function AiMessageBubble({
  message,
  onApply,
}: {
  message: AiMessage;
  onApply: () => void;
}) {
  if (message.role === "system") {
    return (
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] leading-relaxed text-slate-600 dark:bg-slate-900/50 dark:text-slate-400">
        {message.text.split("\n").map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    );
  }
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl bg-slate-100 px-3 py-1.5 text-[12.5px] text-slate-900 dark:bg-slate-800 dark:text-slate-100">
        {message.text}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] leading-relaxed text-slate-800 dark:bg-emerald-500/10 dark:text-slate-200">
        {message.text.split("\n").map((line, i) => (
          <div key={i}>{line || " "}</div>
        ))}
      </div>
      {message.suggestion && !message.applied && (
        <button
          type="button"
          onClick={onApply}
          className="flex w-full items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-left text-[12px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/5 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
        >
          <ArrowDownToLine size={12} />
          <span className="flex-1">
            Edit übernehmen ({message.suggestion.length} Zeichen)
          </span>
          <span className="text-[10.5px] opacity-60">→ Editor</span>
        </button>
      )}
      {message.suggestion && message.applied && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Check size={12} />
          <span>Übernommen — im Editor links änderbar</span>
        </div>
      )}
    </div>
  );
}
