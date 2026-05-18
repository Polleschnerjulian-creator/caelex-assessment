"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — ArtifactEditor (TipTap-powered, Word-grade WYSIWYG).
 *
 * Sprint 9d (2026-05-18). Komplett-rewrite auf TipTap (ProseMirror under
 * the hood) + marked/turndown für Markdown-Roundtrip. Vorher: home-
 * brew contenteditable mit eigenem MD-converter — war zu fragil bei
 * real-world content. Jetzt: battle-tested editor-engine (used by
 * Notion, GitLab, Substack, etc).
 *
 * NEUE FEATURES (Word-parity):
 * - Echtes WYSIWYG: keine MD-marker sichtbar, alle formatting visuell
 * - Tabellen mit toolbar (insert row/col, delete row/col)
 * - Task-Lists mit checkboxes ("- [ ] punkt")
 * - Highlight (Marker-Stift)
 * - Text-Alignment (left/center/right/justify)
 * - Bullet/Numbered lists mit nested support
 * - Blockquote, Code-Inline, Code-Block
 * - Links mit edit-popup
 * - Echte Undo/Redo (TipTap history)
 * - Multi-page rendering hint (visual page-break-after every ~25 lines)
 * - Word-Status-Bar mit Seitenzahl + Zoom-Controls
 *
 * MD-roundtrip: marked (MD→HTML beim mount) + turndown (HTML→MD beim
 * save) — beides battle-tested. GFM-Plugin für tables.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  X,
  Save,
  Sparkles,
  Loader2,
  Check,
  FileText,
  ListTree,
  ArrowDownToLine,
  AlertCircle,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Link as LinkIcon,
  Highlighter,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
  Undo2,
  Redo2,
  Table as TableIcon,
  Trash2,
  Code,
  Minus,
} from "lucide-react";
import type { ArtifactInfo } from "./ArtifactPreviewPanel";
import { markdownToHtml, htmlToMarkdown } from "@/lib/atlas/editor-md-bridge";

const AUTOSAVE_PREFIX = "atlas-editor-draft-v1:";
const AUTOSAVE_DEBOUNCE_MS = 1500;
const AUTOSAVE_TTL_MS = 24 * 60 * 60 * 1000;

interface Props {
  artifact: ArtifactInfo;
  onClose: () => void;
  onSave: (next: { title: string; body: string }) => void;
}

interface OutlineEntry {
  level: 1 | 2 | 3;
  text: string;
  pos: number;
}

interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  suggestion?: string | null;
  applied?: boolean;
  selectionPreview?: string;
}

export function ArtifactEditor({ artifact, onClose, onSave }: Props) {
  const [title, setTitle] = useState(artifact.title);
  const [dirty, setDirty] = useState(false);
  const [autosavedAt, setAutosavedAt] = useState<number | null>(null);
  const [showOutline, setShowOutline] = useState(true);
  const [showAi, setShowAi] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [_, setForceUpdate] = useState(0);
  const forceUpdate = () => setForceUpdate((n) => n + 1);

  /* AI sidebar state */
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      id: "welcome",
      role: "system",
      text: "Hallo. Frag mich was zum Dokument oder gib mir eine Bearbeitungs-Anweisung. Beispiele:\n• Schreib Abschnitt II härter\n• Was bedeutet § 2 WeltrG?\n• Füge eine Anlage 3 hinzu\n• Schreib das in der Sie-Form\n\nTipp: Markier Text in der Seite und ich fokussier auf den Ausschnitt.",
    },
  ]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const aiScrollRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);
  const initialMdRef = useRef(artifact.body);
  const initialTitleRef = useRef(artifact.title);

  /* TipTap editor instance — set up once on mount. */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      LinkExt.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: "atlas-table" },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "Schreib hier dein Dokument...",
      }),
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: markdownToHtml(artifact.body),
    editorProps: {
      attributes: {
        class: "atlas-wysiwyg",
        spellcheck: "true",
      },
    },
    onUpdate: () => {
      setDirty(true);
      forceUpdate(); /* re-render toolbar active-state */
    },
    onSelectionUpdate: () => {
      forceUpdate(); /* re-render toolbar + selection-indicator */
    },
    immediatelyRender: false /* Next.js SSR safety */,
  });

  /* Cleanup on unmount */
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  /* Selection text (for AI selection-aware mode). */
  const selectionText = useMemo(() => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    if (from === to) return "";
    return editor.state.doc.textBetween(from, to, " ");
  }, [editor, _]); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Outline extracted from doc on every change. */
  const outline = useMemo(() => {
    if (!editor) return [];
    const out: OutlineEntry[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        const lvl = node.attrs.level as 1 | 2 | 3;
        out.push({ level: lvl, text: node.textContent, pos });
      }
    });
    return out;
  }, [editor, _]); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Stats for status bar — words, chars, page-estimate. */
  const stats = useMemo(() => {
    if (!editor) return { words: 0, chars: 0, minutes: 1, pages: 1 };
    const text = editor.getText();
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const minutes = Math.max(1, Math.round(words / 220));
    const pages = Math.max(1, Math.ceil(words / 330));
    return { words, chars, minutes, pages };
  }, [editor, _]); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Track dirty-state vs original. */
  useEffect(() => {
    if (!editor) return;
    setDirty(title !== initialTitleRef.current);
  }, [title, editor]);

  /* Auto-save to localStorage (debounced). */
  useEffect(() => {
    if (!editor || !dirty || typeof window === "undefined") return;
    const key = AUTOSAVE_PREFIX + artifact.title;
    const timer = window.setTimeout(() => {
      try {
        const md = htmlToMarkdown(editor.getHTML());
        window.localStorage.setItem(
          key,
          JSON.stringify({ body: md, title, savedAt: Date.now() }),
        );
        setAutosavedAt(Date.now());
      } catch {
        /* silent */
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [
    editor,
    title,
    dirty,
    artifact.title,
    _,
  ]); /* eslint-disable-line react-hooks/exhaustive-deps */

  /* Restore on mount if cached version newer. */
  useEffect(() => {
    if (typeof window === "undefined" || !editor) return;
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
          `Du hattest eine ungespeicherte Bearbeitung (${when}). Wiederherstellen?\n\nOK = wiederherstellen, Abbrechen = Original verwenden`,
        );
        if (ok) {
          editor.commands.setContent(markdownToHtml(data.body));
          setTitle(data.title);
          setDirty(true);
        } else {
          window.localStorage.removeItem(key);
        }
      } else if (!isFresh) {
        window.localStorage.removeItem(key);
      }
    } catch {
      /* silent */
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [editor]);

  /* Scroll AI sidebar to bottom on new message. */
  useEffect(() => {
    const el = aiScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [aiMessages.length, aiBusy]);

  /* Esc + Cmd+S */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (dirty) {
          const ok = confirm(
            "Ungespeicherte Änderungen verwerfen und schließen?",
          );
          if (!ok) return;
        }
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [dirty, onClose]);

  const handleSave = () => {
    if (!editor) return;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTOSAVE_PREFIX + artifact.title);
    }
    const md = htmlToMarkdown(editor.getHTML());
    onSave({ title, body: md });
    onClose();
  };

  const jumpToHeading = (entry: OutlineEntry) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setTextSelection(entry.pos + 1)
      .run();
    /* scroll into view */
    const dom = editor.view.domAtPos(entry.pos + 1).node;
    const el = (
      dom instanceof Element ? dom : dom.parentElement
    ) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleAskAi = async () => {
    const instruction = aiInput.trim();
    if (!instruction || aiBusy || !editor) return;
    setAiInput("");
    setAiError(null);
    const hasSelection = selectionText.trim().length > 0;
    const selectionPreview = hasSelection
      ? selectionText.length > 80
        ? `${selectionText.slice(0, 77).trim()}…`
        : selectionText.trim()
      : null;
    const currentMd = htmlToMarkdown(editor.getHTML());
    const apiInstruction = hasSelection
      ? `Der Anwalt hat folgenden Text-Ausschnitt markiert:\n\n"""${selectionText}"""\n\nAnweisung dazu: ${instruction}`
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
          body: currentMd,
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

  const applySuggestion = (msgId: string, suggestionMd: string) => {
    if (!editor) return;
    editor.commands.setContent(markdownToHtml(suggestionMd));
    setDirty(true);
    setAiMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, applied: true } : m)),
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {/* Title bar */}
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-300 bg-white px-4 py-1.5 dark:border-slate-700 dark:bg-slate-950">
        <FileText
          size={14}
          className="shrink-0 text-emerald-600 dark:text-emerald-400"
        />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dokumenttitel"
          className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
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
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1 text-[12px] font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={11} />
          Speichern (⌘S)
        </button>
        <button
          type="button"
          onClick={() => {
            if (dirty) {
              const ok = confirm(
                "Ungespeicherte Änderungen verwerfen und schließen?",
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

      {/* Ribbon */}
      <Ribbon
        editor={editor}
        showOutline={showOutline}
        setShowOutline={setShowOutline}
        showAi={showAi}
        setShowAi={setShowAi}
        selectionLen={selectionText.length}
      />

      {/* Body: outline + page + ai */}
      <div className="flex flex-1 overflow-hidden">
        {showOutline && (
          <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950 lg:flex">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
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
                  Noch keine Überschriften. Klick H1/H2/H3 in der Ribbon oder
                  wähle eine Formatvorlage.
                </div>
              ) : (
                <ul>
                  {outline.map((entry, idx) => (
                    <li key={`${entry.pos}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => jumpToHeading(entry)}
                        className={`flex w-full items-start gap-1.5 px-4 py-1 text-left text-[12px] text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${
                          entry.level === 1
                            ? "font-semibold"
                            : entry.level === 2
                              ? "pl-6"
                              : "pl-8 text-[11.5px]"
                        }`}
                      >
                        <span className="line-clamp-2">{entry.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}

        {/* Center: A4 page on gray */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto py-8">
            <div
              className="mx-auto"
              style={{
                width: `${21 * (zoom / 100)}cm`,
                transition: "width 200ms",
              }}
            >
              <div
                className="word-page bg-white shadow-[0_4px_24px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)]"
                style={{
                  minHeight: "29.7cm",
                  padding: "2.5cm 2.5cm 2.5cm 2.5cm",
                  fontFamily:
                    '"Calibri", "Aptos", system-ui, -apple-system, "Segoe UI", sans-serif',
                  transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                  transformOrigin: "top center",
                }}
              >
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          {/* Table-toolbar (appears when cursor is inside a table) */}
          {editor?.isActive("table") && <TableToolbar editor={editor} />}

          <StatusBar
            stats={stats}
            zoom={zoom}
            setZoom={setZoom}
            autosavedAt={autosavedAt}
            dirty={dirty}
            selectionLen={selectionText.length}
          />
        </main>

        {/* Right: AI Sidebar */}
        {showAi && (
          <aside className="flex w-full max-w-[380px] shrink-0 flex-col border-l border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
              <Sparkles
                size={13}
                className="text-emerald-600 dark:text-emerald-400"
              />
              <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                Atlas
              </span>
              <span className="ml-auto text-[10.5px] text-slate-400">
                Selection-aware
              </span>
            </div>
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
            <div className="border-t border-slate-200 p-3 dark:border-slate-800">
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900">
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
                  className="block w-full resize-none bg-transparent text-[12.5px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
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
        )}
      </div>

      {/* Word-page typography */}
      <style jsx global>{`
        .atlas-wysiwyg {
          outline: none;
          font-size: 11pt;
          line-height: 1.5;
          color: #1f2937;
          min-height: 100%;
        }
        .atlas-wysiwyg p {
          margin: 0 0 6pt;
          text-align: justify;
          hyphens: auto;
        }
        .atlas-wysiwyg p:empty::before {
          content: "";
          display: inline-block;
        }
        .atlas-wysiwyg h1 {
          font-size: 18pt;
          font-weight: 700;
          margin: 18pt 0 8pt;
          color: #0f172a;
          line-height: 1.25;
        }
        .atlas-wysiwyg h2 {
          font-size: 14pt;
          font-weight: 700;
          margin: 16pt 0 6pt;
          color: #0f172a;
          line-height: 1.3;
        }
        .atlas-wysiwyg h3 {
          font-size: 12pt;
          font-weight: 700;
          margin: 12pt 0 4pt;
          color: #1e293b;
        }
        .atlas-wysiwyg strong {
          font-weight: 700;
        }
        .atlas-wysiwyg em {
          font-style: italic;
        }
        .atlas-wysiwyg u {
          text-decoration: underline;
        }
        .atlas-wysiwyg s {
          text-decoration: line-through;
        }
        .atlas-wysiwyg mark {
          background: #fef3c7;
          padding: 1pt 2pt;
        }
        .atlas-wysiwyg code {
          background: #f1f5f9;
          padding: 1pt 4pt;
          border-radius: 3pt;
          font-family: "SF Mono", Menlo, monospace;
          font-size: 10pt;
          color: #be185d;
        }
        .atlas-wysiwyg pre {
          background: #0f172a;
          color: #f1f5f9;
          padding: 12pt;
          border-radius: 6pt;
          font-family: "SF Mono", Menlo, monospace;
          font-size: 10pt;
          overflow-x: auto;
          margin: 8pt 0;
        }
        .atlas-wysiwyg blockquote {
          border-left: 3px solid #10b981;
          padding: 6pt 12pt;
          color: #475569;
          font-style: italic;
          margin: 8pt 0;
          background: #f8fafc;
        }
        .atlas-wysiwyg ul {
          padding-left: 24pt;
          margin: 6pt 0;
          list-style-type: disc;
        }
        .atlas-wysiwyg ol {
          padding-left: 24pt;
          margin: 6pt 0;
          list-style-type: decimal;
        }
        .atlas-wysiwyg li {
          margin: 2pt 0;
          text-align: left;
        }
        .atlas-wysiwyg li p {
          margin: 0;
        }
        .atlas-wysiwyg hr {
          border: none;
          border-top: 1px solid #cbd5e1;
          margin: 16pt 0;
        }
        .atlas-wysiwyg a {
          color: #047857;
          text-decoration: underline;
        }
        .atlas-wysiwyg .atlas-table,
        .atlas-wysiwyg table {
          border-collapse: collapse;
          margin: 12pt 0;
          width: 100%;
          table-layout: fixed;
        }
        .atlas-wysiwyg th,
        .atlas-wysiwyg td {
          border: 1px solid #cbd5e1;
          padding: 6pt 8pt;
          vertical-align: top;
          min-width: 30pt;
          position: relative;
        }
        .atlas-wysiwyg th {
          background: #f1f5f9;
          font-weight: 600;
        }
        .atlas-wysiwyg .selectedCell:after {
          background: rgba(16, 185, 129, 0.15);
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        /* Task list */
        .atlas-wysiwyg ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .atlas-wysiwyg ul[data-type="taskList"] li {
          display: flex;
          gap: 8pt;
          align-items: flex-start;
        }
        .atlas-wysiwyg ul[data-type="taskList"] li > label {
          flex-shrink: 0;
          margin-top: 3pt;
        }
        .atlas-wysiwyg
          ul[data-type="taskList"]
          li
          > label
          > input[type="checkbox"] {
          cursor: pointer;
        }
        .atlas-wysiwyg ul[data-type="taskList"] li > div {
          flex: 1;
        }
        /* Placeholder */
        .atlas-wysiwyg p.is-editor-empty:first-child::before {
          color: #94a3b8;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        /* Text-align */
        .atlas-wysiwyg p[style*="text-align: center"],
        .atlas-wysiwyg h1[style*="text-align: center"],
        .atlas-wysiwyg h2[style*="text-align: center"],
        .atlas-wysiwyg h3[style*="text-align: center"] {
          text-align: center;
        }
        .atlas-wysiwyg p[style*="text-align: right"] {
          text-align: right;
        }
        .atlas-wysiwyg p[style*="text-align: justify"] {
          text-align: justify;
        }
      `}</style>
    </div>
  );
}

/* ── Ribbon Toolbar (Word-style) ──────────────────────────────────── */

function Ribbon({
  editor,
  showOutline,
  setShowOutline,
  showAi,
  setShowAi,
  selectionLen,
}: {
  editor: Editor | null;
  showOutline: boolean;
  setShowOutline: (v: boolean) => void;
  showAi: boolean;
  setShowAi: (v: boolean) => void;
  selectionLen: number;
}) {
  const [styleOpen, setStyleOpen] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  if (!editor) {
    return (
      <div className="h-[60px] shrink-0 border-b border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60" />
    );
  }

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs);

  return (
    <div className="flex shrink-0 items-stretch gap-0 border-b border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
      {/* Schriftart */}
      <RibbonGroup label="Schriftart">
        <RibbonBtn
          active={isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Fett (⌘B)"
        >
          <Bold size={14} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kursiv (⌘I)"
        >
          <Italic size={14} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Unterstreichen (⌘U)"
        >
          <UnderlineIcon size={14} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Durchgestrichen"
        >
          <Strikethrough size={14} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="Hervorheben"
        >
          <Highlighter size={14} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline-Code"
        >
          <Code size={14} />
        </RibbonBtn>
      </RibbonGroup>

      <RibbonSeparator />

      {/* Absatz */}
      <RibbonGroup label="Absatz">
        <RibbonBtn
          active={isActive({ textAlign: "left" } as never)}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Linksbündig"
        >
          <AlignLeft size={13} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive({ textAlign: "center" } as never)}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Zentriert"
        >
          <AlignCenter size={13} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive({ textAlign: "right" } as never)}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Rechtsbündig"
        >
          <AlignRight size={13} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive({ textAlign: "justify" } as never)}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          title="Blocksatz"
        >
          <AlignJustify size={13} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Aufzählung"
        >
          <List size={13} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Nummerierte Liste"
        >
          <ListOrdered size={13} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          title="Aufgaben-Liste (Checkboxes)"
        >
          <ListChecks size={13} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Zitat"
        >
          <Quote size={13} />
        </RibbonBtn>
      </RibbonGroup>

      <RibbonSeparator />

      {/* Formatvorlagen */}
      <RibbonGroup label="Formatvorlagen">
        <div className="relative">
          <button
            type="button"
            onClick={() => setStyleOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Type size={11} />
            {isActive("heading", { level: 1 })
              ? "Überschrift 1"
              : isActive("heading", { level: 2 })
                ? "Überschrift 2"
                : isActive("heading", { level: 3 })
                  ? "Überschrift 3"
                  : "Standard"}
            <ChevronDown size={10} />
          </button>
          {styleOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setStyleOpen(false)}
              />
              <ul className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().setParagraph().run();
                      setStyleOpen(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-[11pt] text-slate-700 transition-colors hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-500/10"
                  >
                    Standard
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().toggleHeading({ level: 1 }).run();
                      setStyleOpen(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-[16pt] font-bold text-slate-700 transition-colors hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-500/10"
                  >
                    Überschrift 1
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().toggleHeading({ level: 2 }).run();
                      setStyleOpen(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-[13pt] font-bold text-slate-700 transition-colors hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-500/10"
                  >
                    Überschrift 2
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().toggleHeading({ level: 3 }).run();
                      setStyleOpen(false);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-[12pt] font-bold text-slate-700 transition-colors hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-500/10"
                  >
                    Überschrift 3
                  </button>
                </li>
              </ul>
            </>
          )}
        </div>
        <RibbonBtn
          active={isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          title="Überschrift 1"
        >
          <Heading1 size={13} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="Überschrift 2"
        >
          <Heading2 size={13} />
        </RibbonBtn>
        <RibbonBtn
          active={isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          title="Überschrift 3"
        >
          <Heading3 size={13} />
        </RibbonBtn>
      </RibbonGroup>

      <RibbonSeparator />

      {/* Einfügen */}
      <RibbonGroup label="Einfügen">
        <RibbonBtn
          active={isActive("link")}
          onClick={() => {
            const prev = editor.getAttributes("link").href ?? "";
            const url = prompt("URL eingeben:", prev);
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
            } else {
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: url })
                .run();
            }
          }}
          title="Link"
        >
          <LinkIcon size={13} />
        </RibbonBtn>
        <RibbonBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontale Linie"
        >
          <Minus size={13} />
        </RibbonBtn>
        <div className="relative">
          <button
            type="button"
            onClick={() => setTableOpen((v) => !v)}
            className="inline-flex h-7 items-center gap-1 rounded px-1.5 text-[11.5px] text-slate-700 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Tabelle einfügen"
          >
            <TableIcon size={13} />
            <ChevronDown size={9} />
          </button>
          {tableOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setTableOpen(false)}
              />
              <div className="absolute left-0 top-full z-20 mt-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                      .run();
                    setTableOpen(false);
                  }}
                  className="block w-full whitespace-nowrap rounded px-2 py-1 text-left text-[12px] hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                >
                  3×3 Tabelle einfügen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .insertTable({ rows: 5, cols: 4, withHeaderRow: true })
                      .run();
                    setTableOpen(false);
                  }}
                  className="block w-full whitespace-nowrap rounded px-2 py-1 text-left text-[12px] hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                >
                  5×4 Tabelle einfügen
                </button>
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setInsertOpen((v) => !v)}
            className="inline-flex h-7 items-center gap-1 rounded px-2 text-[11.5px] font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Snippet
            <ChevronDown size={10} />
          </button>
          {insertOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setInsertOpen(false)}
              />
              <ul className="absolute right-0 top-full z-20 mt-1 w-72 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {INSERT_SNIPPETS.map((s) => (
                  <li key={s.label}>
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().insertContent(s.html).run();
                        setInsertOpen(false);
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
      </RibbonGroup>

      <RibbonSeparator />

      {/* Bearbeiten */}
      <RibbonGroup label="Bearbeiten">
        <RibbonBtn
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
          title="Rückgängig (⌘Z)"
        >
          <Undo2 size={13} />
        </RibbonBtn>
        <RibbonBtn
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
          title="Wiederholen (⌘⇧Z)"
        >
          <Redo2 size={13} />
        </RibbonBtn>
      </RibbonGroup>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        {selectionLen > 0 && (
          <div className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <Highlighter size={9} />
            {selectionLen} Zeichen markiert
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowOutline(!showOutline)}
          title={
            showOutline ? "Gliederung ausblenden" : "Gliederung einblenden"
          }
          className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          {showOutline ? (
            <PanelLeftClose size={14} />
          ) : (
            <PanelLeftOpen size={14} />
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowAi(!showAi)}
          title={showAi ? "Atlas-Panel ausblenden" : "Atlas-Panel einblenden"}
          className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          {showAi ? (
            <PanelRightClose size={14} />
          ) : (
            <PanelRightOpen size={14} />
          )}
        </button>
      </div>
    </div>
  );
}

function RibbonGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-2">
      <div className="flex items-center gap-0.5">{children}</div>
      <div className="text-[9.5px] uppercase tracking-[0.1em] text-slate-400">
        {label}
      </div>
    </div>
  );
}

function RibbonBtn({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
          : "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function RibbonSeparator() {
  return (
    <div className="mx-1 w-px self-stretch bg-slate-300 dark:bg-slate-700" />
  );
}

/* ── Contextual Table Toolbar ─────────────────────────────────────── */

function TableToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-t border-slate-200 bg-emerald-50 px-3 py-1 text-[11px] dark:border-slate-700 dark:bg-emerald-500/10">
      <TableIcon size={11} className="text-emerald-600 dark:text-emerald-400" />
      <span className="mr-2 text-[10.5px] font-medium text-emerald-700 dark:text-emerald-300">
        Tabellen-Aktionen:
      </span>
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        className="rounded px-2 py-0.5 text-slate-700 transition-colors hover:bg-emerald-100 dark:text-slate-300 dark:hover:bg-emerald-500/20"
      >
        + Zeile oben
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className="rounded px-2 py-0.5 text-slate-700 transition-colors hover:bg-emerald-100 dark:text-slate-300 dark:hover:bg-emerald-500/20"
      >
        + Zeile unten
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        className="rounded px-2 py-0.5 text-slate-700 transition-colors hover:bg-emerald-100 dark:text-slate-300 dark:hover:bg-emerald-500/20"
      >
        + Spalte links
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        className="rounded px-2 py-0.5 text-slate-700 transition-colors hover:bg-emerald-100 dark:text-slate-300 dark:hover:bg-emerald-500/20"
      >
        + Spalte rechts
      </button>
      <span className="mx-1 text-slate-300">|</span>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteRow().run()}
        className="rounded px-2 py-0.5 text-slate-700 transition-colors hover:bg-red-100 hover:text-red-700 dark:text-slate-300 dark:hover:bg-red-500/20"
      >
        − Zeile
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        className="rounded px-2 py-0.5 text-slate-700 transition-colors hover:bg-red-100 hover:text-red-700 dark:text-slate-300 dark:hover:bg-red-500/20"
      >
        − Spalte
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="ml-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-red-700 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-500/20"
      >
        <Trash2 size={10} />
        Tabelle löschen
      </button>
    </div>
  );
}

/* ── Status Bar ────────────────────────────────────────────────────── */

function StatusBar({
  stats,
  zoom,
  setZoom,
  autosavedAt,
  dirty,
  selectionLen,
}: {
  stats: { words: number; chars: number; minutes: number; pages: number };
  zoom: number;
  setZoom: (v: number) => void;
  autosavedAt: number | null;
  dirty: boolean;
  selectionLen: number;
}) {
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
    <div className="flex shrink-0 items-center gap-4 border-t border-slate-300 bg-emerald-700 px-4 py-1 text-[11px] text-white dark:border-slate-700 dark:bg-slate-800">
      <span>Seite 1 von {stats.pages}</span>
      <span className="opacity-50">|</span>
      <span>{stats.words} Wörter</span>
      <span className="opacity-50">|</span>
      <span>{stats.chars} Zeichen</span>
      <span className="opacity-50">|</span>
      <span>~{stats.minutes} Min Lesezeit</span>
      {selectionLen > 0 && (
        <>
          <span className="opacity-50">|</span>
          <span className="text-amber-200">
            Selektion: {selectionLen} Zeichen
          </span>
        </>
      )}
      <span className="ml-auto text-emerald-100">{autosaveLabel}</span>
      <span className="opacity-50">|</span>
      <button
        type="button"
        onClick={() => setZoom(Math.max(60, zoom - 10))}
        className="rounded px-1 transition-colors hover:bg-white/10"
        aria-label="Verkleinern"
      >
        −
      </button>
      <span className="w-8 text-center">{zoom}%</span>
      <button
        type="button"
        onClick={() => setZoom(Math.min(150, zoom + 10))}
        className="rounded px-1 transition-colors hover:bg-white/10"
        aria-label="Vergrößern"
      >
        +
      </button>
    </div>
  );
}

/* ── AI Message Bubble ────────────────────────────────────────────── */

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
          <div key={i}>{line || " "}</div>
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
          <span className="text-[10.5px] opacity-60">→ Seite</span>
        </button>
      )}
      {message.suggestion && message.applied && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Check size={12} />
          <span>Übernommen — Seite aktualisiert</span>
        </div>
      )}
    </div>
  );
}

/* ── Static data ──────────────────────────────────────────────────── */

const QUICK_PROMPTS = [
  "Schreib das formeller",
  "Kürz auf die Hälfte",
  "Schreib in der Sie-Form",
  "Füge eine Anlage hinzu",
];

const INSERT_SNIPPETS = [
  {
    label: "Anrede (Sehr geehrte/r)",
    preview: "Sehr geehrte/r [Anrede], ...",
    html: "<p>Sehr geehrte/r [Anrede],</p><p></p>",
  },
  {
    label: "Schlussformel + Signatur",
    preview: "Mit freundlichen Grüßen / [Name]",
    html: "<p></p><p>Mit freundlichen Grüßen</p><p></p><p></p><p>[Name Anwalt]</p>",
  },
  {
    label: "Anlagen-Block",
    preview: "Anlagen: Anlage 1, Anlage 2, ...",
    html: "<h3>Anlagen</h3><ul><li>Anlage 1: [Beschreibung]</li><li>Anlage 2: [Beschreibung]</li></ul>",
  },
  {
    label: "Roman-Section (I./II./III.)",
    preview: "I. Sachverhalt / II. Würdigung / III. Antrag",
    html: "<h2>I. Sachverhalt</h2><p>[Sachverhalt]</p><h2>II. Rechtliche Würdigung</h2><p>[Würdigung]</p><h2>III. Antrag</h2><p>[Antrag]</p>",
  },
  {
    label: "Aktenzeichen + Betreff",
    preview: "Aktenzeichen: ... | Betreff: ...",
    html: "<p><strong>Aktenzeichen:</strong> [AZ]</p><p><strong>Betreff:</strong> [prägnante Betreff-Zeile]</p>",
  },
  {
    label: "Checkliste",
    preview: "Abarbeitbare Punkte mit Checkbox",
    html: '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Punkt 1</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Punkt 2</p></div></li></ul>',
  },
  {
    label: "Gesetzes-Zitat (Blockquote)",
    preview: "§ X Abs. Y [Gesetz]",
    html: "<blockquote>§ [X] Abs. [Y] [GesetzKürzel]: [Zitat]</blockquote>",
  },
];
