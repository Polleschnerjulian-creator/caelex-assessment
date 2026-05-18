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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Columns,
  Link as LinkIcon,
  Highlighter,
} from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";
import type { ArtifactInfo } from "./ArtifactPreviewPanel";

const AUTOSAVE_PREFIX = "atlas-editor-draft-v1:";
const AUTOSAVE_DEBOUNCE_MS = 1500;
const AUTOSAVE_TTL_MS = 24 * 60 * 60 * 1000; /* 24h */

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
  /** Sprint 9b — preview-snippet (≤80 chars) of the text the user had
   *  selected when sending this message. Rendered as a quote-badge
   *  above the user-bubble. */
  selectionPreview?: string;
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
  /* Sprint 9b (2026-05-18) — Split-view als dritter view-modus.
     edit-only, preview-only, oder side-by-side. */
  const [view, setView] = useState<"edit" | "preview" | "split">("edit");
  /* Sprint 9b — current textarea selection für AI-Selection-Aware-Mode.
     Wird bei jedem onSelect-Event aktualisiert. Null wenn keine
     selection (caret-only). */
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
    text: string;
  } | null>(null);
  /* Sprint 9b — autosave-status für status-bar feedback. */
  const [autosavedAt, setAutosavedAt] = useState<number | null>(null);

  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      id: "welcome",
      role: "system",
      text: "Hallo. Frag mich was zum Dokument oder gib mir eine Bearbeitungs-Anweisung. Beispiele:\n• Schreib Abschnitt II härter\n• Was bedeutet § 2 WeltrG?\n• Füge eine Anlage 3 hinzu\n• Schreib das in der Sie-Form\n\nTipp: Markier Text im Editor und ich fokussier auf den Ausschnitt.",
    },
  ]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);

  const outline = useMemo(() => parseOutline(body), [body]);

  /* ── Sprint 9b — Markdown-Toolbar Helpers ──────────────────────── */

  /** Wrap selected text in `before…after` markers. If no selection,
   *  inserts placeholders + selects them so user can type to replace. */
  const wrapSelection = useCallback(
    (before: string, after: string = before, placeholder = "text") => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const sel = body.slice(start, end);
      const middle = sel || placeholder;
      const newBody =
        body.slice(0, start) + before + middle + after + body.slice(end);
      setBody(newBody);
      requestAnimationFrame(() => {
        ta.focus();
        if (sel) {
          /* Restore selection over the wrapped text */
          ta.setSelectionRange(start + before.length, end + before.length);
        } else {
          /* Select the placeholder so user can type to replace */
          ta.setSelectionRange(
            start + before.length,
            start + before.length + middle.length,
          );
        }
      });
    },
    [body],
  );

  /** Toggle a line-prefix on the current line (H1/H2/H3/Bullet/Numbered/Quote).
   *  If line already has SAME prefix → strip it. If different prefix → swap. */
  const toggleLinePrefix = useCallback(
    (prefix: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const caret = ta.selectionStart;
      const lineStart = body.lastIndexOf("\n", caret - 1) + 1;
      const lineEndRaw = body.indexOf("\n", caret);
      const lineEnd = lineEndRaw === -1 ? body.length : lineEndRaw;
      const lineText = body.slice(lineStart, lineEnd);
      /* Strip any existing block-prefix first. */
      const stripped = lineText.replace(/^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s)/, "");
      const newLine =
        lineText.startsWith(prefix) && lineText !== stripped
          ? stripped
          : prefix + stripped;
      const newBody = body.slice(0, lineStart) + newLine + body.slice(lineEnd);
      setBody(newBody);
      requestAnimationFrame(() => {
        ta.focus();
        const newCaret =
          lineStart + newLine.length - (lineText.length - (caret - lineStart));
        ta.setSelectionRange(newCaret, newCaret);
      });
    },
    [body],
  );

  /** Insert a snippet at caret (replaces selection if any). */
  const insertAtCaret = useCallback(
    (snippet: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newBody = body.slice(0, start) + snippet + body.slice(end);
      setBody(newBody);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + snippet.length, start + snippet.length);
      });
    },
    [body],
  );

  /* Track dirty-state without re-firing on every keystroke. */
  useEffect(() => {
    setDirty(body !== artifact.body || title !== artifact.title);
  }, [body, title, artifact.body, artifact.title]);

  /* Sprint 9b — Auto-save to localStorage (debounced 1.5s). Schützt vor
     accidental tab-close / browser-crash / mac-sleep während großer
     edits. Key ist title-basiert weil wir keine stabile artifact-id
     haben (artifact wird beim refine recreated). */
  useEffect(() => {
    if (!dirty || typeof window === "undefined") return;
    const key = AUTOSAVE_PREFIX + artifact.title;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({ body, title, savedAt: Date.now() }),
        );
        setAutosavedAt(Date.now());
      } catch {
        /* localStorage full / blocked — silent */
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [body, title, dirty, artifact.title]);

  /* Sprint 9b — Restore-on-mount. Wenn der user den editor schließt
     ohne save (crash, accidental close), bieten wir bei reopen die
     letzte unsaved version an. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = AUTOSAVE_PREFIX + artifact.title;
    const cached = window.localStorage.getItem(key);
    if (!cached) return;
    try {
      const data = JSON.parse(cached) as {
        body: string;
        title: string;
        savedAt: number;
      };
      const isFresh = Date.now() - data.savedAt < AUTOSAVE_TTL_MS;
      const isDifferent =
        data.body !== artifact.body || data.title !== artifact.title;
      if (isFresh && isDifferent) {
        const ageMin = Math.round((Date.now() - data.savedAt) / 60_000);
        const when =
          ageMin < 1
            ? "gerade eben"
            : ageMin < 60
              ? `vor ${ageMin} Min`
              : new Date(data.savedAt).toLocaleString("de-DE");
        const ok = window.confirm(
          `Du hattest eine ungespeicherte Bearbeitung (${when}). Wiederherstellen?\n\nOK = wiederherstellen, Abbrechen = mit Original starten`,
        );
        if (ok) {
          setBody(data.body);
          setTitle(data.title);
        } else {
          window.localStorage.removeItem(key);
        }
      } else if (!isFresh) {
        window.localStorage.removeItem(key);
      }
    } catch {
      /* corrupted entry — ignore */
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount */
  }, []);

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
    /* Sprint 9b — Auto-save cache löschen wenn user explizit speichert. */
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTOSAVE_PREFIX + artifact.title);
    }
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
    /* Sprint 9b — Selection-aware: if the user has text selected in the
       editor, include it as focus-context in the API call AND show a
       badge in the user-bubble so the user knows AI saw the selection. */
    const hasSelection = selection !== null && selection.text.trim().length > 0;
    const selectionPreview = hasSelection
      ? selection!.text.length > 80
        ? `${selection!.text.slice(0, 77).trim()}…`
        : selection!.text.trim()
      : null;
    const apiInstruction = hasSelection
      ? `Der Anwalt hat folgenden Text-Ausschnitt markiert:\n\n"""${selection!.text}"""\n\nAnweisung dazu: ${instruction}`
      : instruction;
    const userMsgId = `u-${Date.now()}`;
    setAiMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        text: instruction,
        selectionPreview: selectionPreview ?? undefined,
      },
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
          instruction: apiInstruction,
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
        {/* View toggle — Sprint 9b: jetzt 3 Modi (edit / preview / split) */}
        <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setView("edit")}
            title="Nur Editor"
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
              view === "edit"
                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
            }`}
          >
            <Code2 size={10} />
            Editor
          </button>
          <button
            type="button"
            onClick={() => setView("split")}
            title="Editor + Vorschau side-by-side"
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
              view === "split"
                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"
            }`}
          >
            <Columns size={10} />
            Split
          </button>
          <button
            type="button"
            onClick={() => setView("preview")}
            title="Nur Vorschau"
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

        {/* Center: Editor / Preview / Split (Sprint 9b) */}
        <main className="flex flex-1 flex-col overflow-hidden bg-slate-100 dark:bg-slate-900">
          {/* Sprint 9b — Markdown-Toolbar (only shown in edit/split, not pure preview) */}
          {view !== "preview" && (
            <EditorToolbar
              wrap={wrapSelection}
              toggleLine={toggleLinePrefix}
              insert={insertAtCaret}
              hasSelection={selection !== null}
              selectionLen={selection?.text.length ?? 0}
            />
          )}

          <div className="flex-1 overflow-y-auto py-6">
            <div
              className={`mx-auto ${view === "split" ? "max-w-6xl px-6" : "max-w-3xl px-12"}`}
            >
              {view === "edit" && (
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onSelect={(e) => {
                    const ta = e.currentTarget;
                    const s = ta.selectionStart;
                    const en = ta.selectionEnd;
                    if (s !== en) {
                      setSelection({
                        start: s,
                        end: en,
                        text: body.slice(s, en),
                      });
                    } else {
                      setSelection(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.metaKey || e.ctrlKey) {
                      const k = e.key.toLowerCase();
                      if (k === "b") {
                        e.preventDefault();
                        wrapSelection("**", "**", "fett");
                      } else if (k === "i") {
                        e.preventDefault();
                        wrapSelection("*", "*", "kursiv");
                      } else if (k === "1") {
                        e.preventDefault();
                        toggleLinePrefix("# ");
                      } else if (k === "2") {
                        e.preventDefault();
                        toggleLinePrefix("## ");
                      } else if (k === "3") {
                        e.preventDefault();
                        toggleLinePrefix("### ");
                      } else if (k === "k") {
                        e.preventDefault();
                        wrapSelection("[", "](https://)", "Link-Text");
                      }
                    }
                  }}
                  spellCheck
                  className="block min-h-[78vh] w-full resize-none rounded-xl border border-slate-200 bg-white p-10 font-mono text-[13.5px] leading-[1.7] text-slate-900 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500/40 dark:focus:ring-emerald-500/10"
                />
              )}
              {view === "preview" && (
                <div className="prose prose-slate max-w-none rounded-xl border border-slate-200 bg-white p-10 text-[14px] leading-relaxed shadow-sm dark:prose-invert dark:border-slate-700 dark:bg-slate-950">
                  <MarkdownContent text={body} />
                </div>
              )}
              {view === "split" && (
                <div className="grid min-h-[78vh] grid-cols-2 gap-4">
                  <textarea
                    ref={textareaRef}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onSelect={(e) => {
                      const ta = e.currentTarget;
                      const s = ta.selectionStart;
                      const en = ta.selectionEnd;
                      if (s !== en) {
                        setSelection({
                          start: s,
                          end: en,
                          text: body.slice(s, en),
                        });
                      } else {
                        setSelection(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.metaKey || e.ctrlKey) {
                        const k = e.key.toLowerCase();
                        if (k === "b") {
                          e.preventDefault();
                          wrapSelection("**", "**", "fett");
                        } else if (k === "i") {
                          e.preventDefault();
                          wrapSelection("*", "*", "kursiv");
                        } else if (k === "1") {
                          e.preventDefault();
                          toggleLinePrefix("# ");
                        } else if (k === "2") {
                          e.preventDefault();
                          toggleLinePrefix("## ");
                        } else if (k === "3") {
                          e.preventDefault();
                          toggleLinePrefix("### ");
                        }
                      }
                    }}
                    spellCheck
                    className="block h-full w-full resize-none rounded-xl border border-slate-200 bg-white p-6 font-mono text-[13px] leading-[1.7] text-slate-900 shadow-sm focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500/40 dark:focus:ring-emerald-500/10"
                  />
                  <div className="overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                    <div className="prose prose-slate prose-sm max-w-none text-[13px] leading-relaxed dark:prose-invert">
                      <MarkdownContent text={body} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sprint 9b — Status bar (line/col, words, autosave) */}
          <EditorStatusBar
            body={body}
            selection={selection}
            autosavedAt={autosavedAt}
            dirty={dirty}
          />
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
      <div className="ml-auto flex max-w-[85%] flex-col items-end gap-1">
        {/* Sprint 9b — Selection-Preview Quote-Badge wenn der User
            mit aktiver Selektion gefragt hat. Macht klar dass die AI
            den Ausschnitt im Fokus hatte. */}
        {message.selectionPreview && (
          <div className="flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10.5px] italic text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <Highlighter size={9} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{message.selectionPreview}</span>
          </div>
        )}
        <div className="rounded-2xl bg-slate-100 px-3 py-1.5 text-[12.5px] text-slate-900 dark:bg-slate-800 dark:text-slate-100">
          {message.text}
        </div>
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

/* ── Sprint 9b — Markdown-Toolbar über dem Editor ───────────────────
   Stellt Format-Buttons + Insert-Snippets bereit. Tooltips zeigen den
   keyboard-shortcut wo's einen gibt. Selection-Indikator rechts zeigt
   "Selektion aktiv → AI fokussiert darauf" wenn was markiert ist. */
function EditorToolbar({
  wrap,
  toggleLine,
  insert,
  hasSelection,
  selectionLen,
}: {
  wrap: (before: string, after?: string, placeholder?: string) => void;
  toggleLine: (prefix: string) => void;
  insert: (snippet: string) => void;
  hasSelection: boolean;
  selectionLen: number;
}) {
  const [insertMenuOpen, setInsertMenuOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white/70 px-4 py-1.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <ToolbarBtn onClick={() => wrap("**", "**", "fett")} title="Fett (⌘B)">
        <Bold size={12} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => wrap("*", "*", "kursiv")} title="Kursiv (⌘I)">
        <Italic size={12} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => wrap("`", "`", "code")} title="Inline-Code">
        <Code2 size={12} />
      </ToolbarBtn>
      <ToolbarSep />
      <ToolbarBtn onClick={() => toggleLine("# ")} title="Überschrift 1 (⌘1)">
        <Heading1 size={12} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => toggleLine("## ")} title="Überschrift 2 (⌘2)">
        <Heading2 size={12} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => toggleLine("### ")} title="Überschrift 3 (⌘3)">
        <Heading3 size={12} />
      </ToolbarBtn>
      <ToolbarSep />
      <ToolbarBtn onClick={() => toggleLine("- ")} title="Bullet-Liste">
        <List size={12} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => toggleLine("1. ")} title="Nummerierte Liste">
        <ListOrdered size={12} />
      </ToolbarBtn>
      <ToolbarBtn onClick={() => toggleLine("> ")} title="Zitat (Blockquote)">
        <Quote size={12} />
      </ToolbarBtn>
      <ToolbarSep />
      <ToolbarBtn
        onClick={() => wrap("[", "](https://)", "Link-Text")}
        title="Link einfügen (⌘K)"
      >
        <LinkIcon size={12} />
      </ToolbarBtn>
      {/* Insert-Snippet Dropdown — typische deutsche legal-doc Phrasen */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setInsertMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          + Einfügen
        </button>
        {insertMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setInsertMenuOpen(false)}
            />
            <ul className="absolute left-0 top-full z-20 mt-1 w-64 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {INSERT_SNIPPETS.map((s) => (
                <li key={s.label}>
                  <button
                    type="button"
                    onClick={() => {
                      insert(s.snippet);
                      setInsertMenuOpen(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-[12px] text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-300 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                  >
                    <div className="font-medium">{s.label}</div>
                    <div className="line-clamp-1 text-[10.5px] text-slate-500 dark:text-slate-500">
                      {s.preview}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Selection indicator — pushed right */}
      {hasSelection && (
        <div className="ml-auto inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          <Highlighter size={9} />
          {selectionLen} Zeichen markiert · Atlas fokussiert darauf
        </div>
      )}
    </div>
  );
}

function ToolbarBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      {children}
    </button>
  );
}

function ToolbarSep() {
  return <div className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />;
}

const INSERT_SNIPPETS = [
  {
    label: "Anrede (Sehr geehrte/r ...)",
    preview: "Sehr geehrte/r [Anrede], ...",
    snippet: "\n\nSehr geehrte/r [Anrede],\n\n",
  },
  {
    label: "Schlussformel (Mit freundlichen Grüßen)",
    preview: "Mit freundlichen Grüßen / [Name]",
    snippet: "\n\nMit freundlichen Grüßen\n\n[Name Anwalt]\n",
  },
  {
    label: "Anlagen-Block",
    preview: "Anlagen: Anlage 1: ...",
    snippet:
      "\n\nAnlagen:\n- Anlage 1: [Beschreibung]\n- Anlage 2: [Beschreibung]\n",
  },
  {
    label: "Roman-Section (I./II./III.)",
    preview: "I. Sachverhalt / II. Würdigung / III. Antrag",
    snippet:
      "\n\nI. Sachverhalt\n\n[Sachverhalt]\n\nII. Rechtliche Würdigung\n\n[Würdigung]\n\nIII. Antrag\n\n[Antrag]\n",
  },
  {
    label: "Aktenzeichen + Betreff",
    preview: "Aktenzeichen: ... | Betreff: ...",
    snippet: "\n\nAktenzeichen: [AZ]\nBetreff: [prägnante Betreff-Zeile]\n",
  },
  {
    label: "Markdown-Tabelle (3x3)",
    preview: "| Spalte 1 | Spalte 2 | Spalte 3 |",
    snippet:
      "\n\n| Spalte 1 | Spalte 2 | Spalte 3 |\n|----------|----------|----------|\n| Zelle    | Zelle    | Zelle    |\n| Zelle    | Zelle    | Zelle    |\n",
  },
  {
    label: "Gesetzes-Zitat (Blockquote)",
    preview: "> § X Abs. Y ...",
    snippet: "\n\n> § [X] Abs. [Y] [GesetzKürzel]: [Zitat]\n",
  },
];

/* ── Sprint 9b — Status Bar unter dem Editor ───────────────────────── */
function EditorStatusBar({
  body,
  selection,
  autosavedAt,
  dirty,
}: {
  body: string;
  selection: { start: number; end: number; text: string } | null;
  autosavedAt: number | null;
  dirty: boolean;
}) {
  const wordCount = useMemo(
    () => body.split(/\s+/).filter(Boolean).length,
    [body],
  );
  const readingMin = Math.max(1, Math.round(wordCount / 220));
  const autosaveLabel = autosavedAt
    ? (() => {
        const sec = Math.round((Date.now() - autosavedAt) / 1000);
        if (sec < 5) return "soeben auto-gespeichert";
        if (sec < 60) return `auto-gespeichert vor ${sec}s`;
        return `auto-gespeichert ${new Date(autosavedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
      })()
    : dirty
      ? "noch nicht auto-gespeichert"
      : "—";
  return (
    <div className="flex items-center gap-3 border-t border-slate-200 bg-white px-4 py-1 text-[10.5px] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      <span>{body.length} Zeichen</span>
      <span>·</span>
      <span>{wordCount} Wörter</span>
      <span>·</span>
      <span>~{readingMin} Min Lesezeit</span>
      {selection && (
        <>
          <span>·</span>
          <span className="text-amber-700 dark:text-amber-300">
            Selektion: {selection.text.length} Z
          </span>
        </>
      )}
      <span className="ml-auto">{autosaveLabel}</span>
    </div>
  );
}
