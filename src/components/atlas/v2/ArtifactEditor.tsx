"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — ArtifactEditor (WYSIWYG, Word-like Drucklayout).
 *
 * Sprint 9c (2026-05-18). Komplett-rewrite des Editors für Word-feel.
 * Vorher: monospace textarea mit sichtbaren markdown-markern (#, **, etc).
 * Jetzt: contenteditable WYSIWYG mit:
 *
 *   • Ribbon-Toolbar oben (Word-Start-Tab Layout: Schriftart | Absatz |
 *     Formatvorlagen | Einfügen | Bearbeiten)
 *   • A4-Seite weiß auf grauem Canvas mit Schatten + Marginalien wie ein
 *     echtes Blatt Papier (21cm × 29.7cm, 2.5cm margins = Word-default)
 *   • Sans-serif Body (system-ui, calibri-feel), 11pt, line-height 1.5,
 *     justified, hyphenation
 *   • Status-Bar unten (Seitenzahl, Wörter, Zeichen, View-Mode-Toggle,
 *     Auto-save-Status)
 *   • Outline-Sidebar links (collapse-able)
 *   • Atlas AI-Sidebar rechts (collapse-able)
 *
 * MARKDOWN BLEIBT SOURCE-OF-TRUTH: beim mount wird MD → HTML konvertiert
 * und in contentEditable gepackt. Beim save (oder bei AI-Anfrage) wird
 * der HTML wieder zu Markdown serialisiert. So bleibt die AI-Pipeline +
 * PDF/DOCX-Export unverändert.
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
  AlertCircle,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
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
  Search,
  Code2,
} from "lucide-react";
import type { ArtifactInfo } from "./ArtifactPreviewPanel";
import { markdownToHtml, htmlToMarkdown } from "@/lib/atlas/markdown-html";

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
  anchorId: string;
}

interface AiMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  suggestion?: string | null;
  applied?: boolean;
  selectionPreview?: string;
}

function extractOutline(html: string): OutlineEntry[] {
  if (typeof document === "undefined") return [];
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const out: OutlineEntry[] = [];
  let idCounter = 0;
  tmp.querySelectorAll("h1, h2, h3").forEach((h) => {
    const lvl = parseInt(h.tagName.slice(1), 10) as 1 | 2 | 3;
    const text = h.textContent?.trim() ?? "";
    if (text) {
      out.push({ level: lvl, text, anchorId: `outline-anchor-${idCounter++}` });
    }
  });
  return out;
}

export function ArtifactEditor({ artifact, onClose, onSave }: Props) {
  const [title, setTitle] = useState(artifact.title);
  /* WYSIWYG state: editor-HTML is the live representation (managed by
     contentEditable). We sync to markdown-body lazily (on save / AI-call). */
  const [editorHtml, setEditorHtml] = useState(() =>
    markdownToHtml(artifact.body),
  );
  const [dirty, setDirty] = useState(false);
  const [autosavedAt, setAutosavedAt] = useState<number | null>(null);
  /* Panel collapses — user kann fokus auf nur die seite kriegen. */
  const [showOutline, setShowOutline] = useState(true);
  const [showAi, setShowAi] = useState(true);
  /* Zoom (status-bar bottom-right, Word-style). 100 = 100%. */
  const [zoom, setZoom] = useState(100);
  /* Active formats for toolbar-button highlighting. */
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
  /* Current selection-text — used für AI-selection-aware mode. */
  const [selectionText, setSelectionText] = useState("");

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

  const editorRef = useRef<HTMLDivElement>(null);
  const aiScrollRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLTextAreaElement>(null);
  const initialHtmlRef = useRef(editorHtml);

  /* On-mount: write initial HTML into contentEditable. We do this ONCE
     to avoid React fighting with the user's cursor on every input. */
  useEffect(() => {
    if (
      editorRef.current &&
      editorRef.current.innerHTML !== initialHtmlRef.current
    ) {
      editorRef.current.innerHTML = initialHtmlRef.current;
    }
  }, []);

  /* Track selection + active formats on every selection change. */
  useEffect(() => {
    const onSelectionChange = () => {
      if (typeof document === "undefined") return;
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setSelectionText("");
        return;
      }
      /* Only track if the selection is inside our editor. */
      const node = sel.anchorNode;
      if (!node || !editorRef.current?.contains(node)) {
        setSelectionText("");
        return;
      }
      setSelectionText(sel.toString());
      try {
        setActiveFormats({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          underline: document.queryCommandState("underline"),
        });
      } catch {
        /* queryCommandState is deprecated — fallback silent */
      }
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  /* Outline gets extracted from editorHtml (updated on input). */
  const outline = useMemo(() => extractOutline(editorHtml), [editorHtml]);

  /* Track dirty-state. */
  useEffect(() => {
    setDirty(editorHtml !== initialHtmlRef.current || title !== artifact.title);
  }, [editorHtml, title, artifact.title]);

  /* Auto-save to localStorage (debounced). Stores the markdown-equivalent
     so restore-on-mount works seamlessly. */
  useEffect(() => {
    if (!dirty || typeof window === "undefined") return;
    const key = AUTOSAVE_PREFIX + artifact.title;
    const timer = window.setTimeout(() => {
      try {
        const md = htmlToMarkdown(editorHtml);
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
  }, [editorHtml, title, dirty, artifact.title]);

  /* Restore on mount if cached version newer than artifact. */
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
          `Du hattest eine ungespeicherte Bearbeitung (${when}). Wiederherstellen?\n\nOK = wiederherstellen, Abbrechen = Original verwenden`,
        );
        if (ok) {
          const restoredHtml = markdownToHtml(data.body);
          initialHtmlRef.current = restoredHtml;
          setEditorHtml(restoredHtml);
          setTitle(data.title);
          if (editorRef.current) editorRef.current.innerHTML = restoredHtml;
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
  }, []);

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
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTOSAVE_PREFIX + artifact.title);
    }
    const md = htmlToMarkdown(editorHtml);
    onSave({ title, body: md });
    onClose();
  };

  /* Editor input handler — capture HTML changes without re-rendering
     the contentEditable (would lose cursor). */
  const handleEditorInput = useCallback(() => {
    if (!editorRef.current) return;
    setEditorHtml(editorRef.current.innerHTML);
  }, []);

  /* execCommand wrapper — for inline formatting (bold, italic, etc).
     Deprecated API but the only realistic way to format contentEditable
     without bringing in a 150KB editor library. Modern browsers still
     fully support it. */
  const exec = useCallback((command: string, value?: string) => {
    if (typeof document === "undefined") return;
    editorRef.current?.focus();
    try {
      document.execCommand(command, false, value);
      /* Sync HTML state after command */
      if (editorRef.current) {
        setEditorHtml(editorRef.current.innerHTML);
      }
      /* Re-query active formats */
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
      });
    } catch (err) {
      console.warn("execCommand failed:", command, err);
    }
  }, []);

  const formatBlock = useCallback(
    (tag: string) => exec("formatBlock", tag),
    [exec],
  );

  /* Insert HTML at the current selection — used for snippets. */
  const insertHtml = useCallback(
    (html: string) => exec("insertHTML", html),
    [exec],
  );

  /* Outline-jump: find the heading in the editor DOM and scroll to it. */
  const jumpToHeading = (entry: OutlineEntry) => {
    if (!editorRef.current) return;
    const headings = editorRef.current.querySelectorAll(`h${entry.level}`);
    for (const h of Array.from(headings)) {
      if (h.textContent?.trim() === entry.text) {
        h.scrollIntoView({ behavior: "smooth", block: "start" });
        /* Briefly highlight */
        h.classList.add("outline-flash");
        setTimeout(() => h.classList.remove("outline-flash"), 1200);
        return;
      }
    }
  };

  const handleAskAi = async () => {
    const instruction = aiInput.trim();
    if (!instruction || aiBusy) return;
    setAiInput("");
    setAiError(null);
    const hasSelection = selectionText.trim().length > 0;
    const selectionPreview = hasSelection
      ? selectionText.length > 80
        ? `${selectionText.slice(0, 77).trim()}…`
        : selectionText.trim()
      : null;
    /* Convert current HTML to markdown for AI context */
    const currentMd = htmlToMarkdown(editorHtml);
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
    const newHtml = markdownToHtml(suggestionMd);
    setEditorHtml(newHtml);
    if (editorRef.current) editorRef.current.innerHTML = newHtml;
    setAiMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, applied: true } : m)),
    );
  };

  /* Stats for status bar */
  const stats = useMemo(() => {
    const text =
      editorRef.current?.innerText ??
      editorHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    const minutes = Math.max(1, Math.round(words / 220));
    /* Heuristic page-count: ~330 words per A4 page at 11pt. */
    const pages = Math.max(1, Math.ceil(words / 330));
    return { words, chars, minutes, pages };
  }, [editorHtml]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      {/* Title bar (Word's blue strip at the very top). */}
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

      {/* Ribbon — Word-style grouped toolbar */}
      <Ribbon
        active={activeFormats}
        exec={exec}
        formatBlock={formatBlock}
        insertHtml={insertHtml}
        showOutline={showOutline}
        setShowOutline={setShowOutline}
        showAi={showAi}
        setShowAi={setShowAi}
        selectionLen={selectionText.length}
      />

      {/* 3-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Outline (collapse-able) */}
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
                  Noch keine Überschriften. Markier Text + click H1/H2/H3 in der
                  Ribbon.
                </div>
              ) : (
                <ul>
                  {outline.map((entry, idx) => (
                    <li key={`${entry.anchorId}-${idx}`}>
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

        {/* Center — Word-like A4 page on gray canvas */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div
              className="mx-auto py-8"
              style={{
                width: `${21 * (zoom / 100)}cm`,
                transition: "width 200ms",
              }}
            >
              <div
                className="word-page bg-white shadow-[0_4px_24px_rgba(0,0,0,0.10),0_1px_3px_rgba(0,0,0,0.06)] dark:bg-slate-50"
                style={{
                  minHeight: "29.7cm",
                  padding: "2.5cm 2.5cm 2.5cm 2.5cm",
                  fontFamily:
                    '"Calibri", "Aptos", system-ui, -apple-system, "Segoe UI", sans-serif',
                  fontSize: "11pt",
                  lineHeight: 1.5,
                  color: "#1f2937",
                  hyphens: "auto",
                  WebkitHyphens: "auto",
                  transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                  transformOrigin: "top center",
                }}
              >
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  spellCheck
                  className="atlas-wysiwyg outline-none"
                />
              </div>
            </div>
          </div>

          {/* Status bar — Word-style */}
          <StatusBar
            stats={stats}
            zoom={zoom}
            setZoom={setZoom}
            autosavedAt={autosavedAt}
            dirty={dirty}
            selectionLen={selectionText.length}
          />
        </main>

        {/* Right — Atlas AI Assistant (collapse-able) */}
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

      {/* Word-page typography (scoped via .atlas-wysiwyg) */}
      <style jsx global>{`
        .atlas-wysiwyg h1 {
          font-size: 16pt;
          font-weight: 700;
          margin: 18pt 0 6pt;
          color: #0f172a;
        }
        .atlas-wysiwyg h2 {
          font-size: 14pt;
          font-weight: 700;
          margin: 16pt 0 6pt;
          color: #0f172a;
        }
        .atlas-wysiwyg h3 {
          font-size: 12pt;
          font-weight: 700;
          margin: 12pt 0 4pt;
          color: #1e293b;
        }
        .atlas-wysiwyg p {
          margin: 0 0 6pt;
          text-align: justify;
        }
        .atlas-wysiwyg blockquote {
          border-left: 3px solid #10b981;
          padding: 6pt 12pt;
          color: #475569;
          font-style: italic;
          margin: 8pt 0;
          background: #f8fafc;
        }
        .atlas-wysiwyg ul,
        .atlas-wysiwyg ol {
          padding-left: 24pt;
          margin: 6pt 0;
        }
        .atlas-wysiwyg li {
          margin: 2pt 0;
          text-align: left;
        }
        .atlas-wysiwyg a {
          color: #047857;
          text-decoration: underline;
        }
        .atlas-wysiwyg code {
          background: #f1f5f9;
          padding: 1pt 4pt;
          border-radius: 3pt;
          font-family: "SF Mono", Menlo, monospace;
          font-size: 10pt;
        }
        .atlas-wysiwyg :focus {
          outline: none;
        }
        .atlas-wysiwyg .outline-flash {
          animation: outlineFlash 1.2s ease-out;
        }
        @keyframes outlineFlash {
          0% {
            background: rgba(16, 185, 129, 0.3);
          }
          100% {
            background: transparent;
          }
        }
      `}</style>
    </div>
  );
}

/* ── Ribbon Toolbar (Word-Start-Tab Layout) ────────────────────────── */

function Ribbon({
  active,
  exec,
  formatBlock,
  insertHtml,
  showOutline,
  setShowOutline,
  showAi,
  setShowAi,
  selectionLen,
}: {
  active: { bold: boolean; italic: boolean; underline: boolean };
  exec: (cmd: string, value?: string) => void;
  formatBlock: (tag: string) => void;
  insertHtml: (html: string) => void;
  showOutline: boolean;
  setShowOutline: (v: boolean) => void;
  showAi: boolean;
  setShowAi: (v: boolean) => void;
  selectionLen: number;
}) {
  const [insertOpen, setInsertOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  return (
    <div className="flex shrink-0 items-stretch gap-0 border-b border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
      {/* Schriftart-Gruppe */}
      <RibbonGroup label="Schriftart">
        <RibbonBtn
          active={active.bold}
          onClick={() => exec("bold")}
          title="Fett (⌘B)"
        >
          <Bold size={14} />
        </RibbonBtn>
        <RibbonBtn
          active={active.italic}
          onClick={() => exec("italic")}
          title="Kursiv (⌘I)"
        >
          <Italic size={14} />
        </RibbonBtn>
        <RibbonBtn
          active={active.underline}
          onClick={() => exec("underline")}
          title="Unterstreichen (⌘U)"
        >
          <Underline size={14} />
        </RibbonBtn>
        <RibbonBtn
          onClick={() => exec("strikeThrough")}
          title="Durchgestrichen"
        >
          <Strikethrough size={14} />
        </RibbonBtn>
      </RibbonGroup>

      <RibbonSeparator />

      {/* Absatz-Gruppe */}
      <RibbonGroup label="Absatz">
        <RibbonBtn onClick={() => exec("justifyLeft")} title="Linksbündig">
          <AlignLeft size={13} />
        </RibbonBtn>
        <RibbonBtn onClick={() => exec("justifyCenter")} title="Zentriert">
          <AlignCenter size={13} />
        </RibbonBtn>
        <RibbonBtn onClick={() => exec("justifyRight")} title="Rechtsbündig">
          <AlignRight size={13} />
        </RibbonBtn>
        <RibbonBtn onClick={() => exec("justifyFull")} title="Blocksatz">
          <AlignJustify size={13} />
        </RibbonBtn>
        <RibbonBtn
          onClick={() => exec("insertUnorderedList")}
          title="Aufzählung"
        >
          <List size={13} />
        </RibbonBtn>
        <RibbonBtn
          onClick={() => exec("insertOrderedList")}
          title="Nummerierte Liste"
        >
          <ListOrdered size={13} />
        </RibbonBtn>
        <RibbonBtn
          onClick={() => formatBlock("blockquote")}
          title="Zitat (Blockquote)"
        >
          <Quote size={13} />
        </RibbonBtn>
      </RibbonGroup>

      <RibbonSeparator />

      {/* Formatvorlagen-Gruppe (style preview tiles) */}
      <RibbonGroup label="Formatvorlagen">
        <div className="relative">
          <button
            type="button"
            onClick={() => setStyleOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Type size={11} />
            Standard
            <ChevronDown size={10} />
          </button>
          {styleOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setStyleOpen(false)}
              />
              <ul className="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {STYLE_OPTIONS.map((s) => (
                  <li key={s.label}>
                    <button
                      type="button"
                      onClick={() => {
                        formatBlock(s.tag);
                        setStyleOpen(false);
                      }}
                      className="block w-full px-3 py-1.5 text-left text-slate-700 transition-colors hover:bg-emerald-50 dark:text-slate-300 dark:hover:bg-emerald-500/10"
                      style={{ fontSize: s.size, fontWeight: s.weight }}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <RibbonBtn onClick={() => formatBlock("h1")} title="Überschrift 1 (⌘1)">
          <Heading1 size={13} />
        </RibbonBtn>
        <RibbonBtn onClick={() => formatBlock("h2")} title="Überschrift 2 (⌘2)">
          <Heading2 size={13} />
        </RibbonBtn>
        <RibbonBtn onClick={() => formatBlock("h3")} title="Überschrift 3 (⌘3)">
          <Heading3 size={13} />
        </RibbonBtn>
      </RibbonGroup>

      <RibbonSeparator />

      {/* Einfügen-Gruppe */}
      <RibbonGroup label="Einfügen">
        <RibbonBtn
          onClick={() => {
            const url = prompt("URL eingeben:");
            if (url) exec("createLink", url);
          }}
          title="Link einfügen (⌘K)"
        >
          <LinkIcon size={13} />
        </RibbonBtn>
        <div className="relative">
          <button
            type="button"
            onClick={() => setInsertOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700"
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
                        insertHtml(s.html);
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

      {/* Bearbeiten-Gruppe */}
      <RibbonGroup label="Bearbeiten">
        <RibbonBtn onClick={() => exec("undo")} title="Rückgängig (⌘Z)">
          <span className="text-[14px] leading-none">↶</span>
        </RibbonBtn>
        <RibbonBtn onClick={() => exec("redo")} title="Wiederholen (⌘⇧Z)">
          <span className="text-[14px] leading-none">↷</span>
        </RibbonBtn>
      </RibbonGroup>

      {/* Right-side: panel toggles + selection indicator */}
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
  onClick,
  title,
  children,
}: {
  active?: boolean;
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
      className={`inline-flex h-7 w-7 items-center justify-center rounded transition-colors ${
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

/* ── Status Bar (Word-style: pages, words, zoom) ──────────────────── */

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
      {/* Zoom controls */}
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

const STYLE_OPTIONS: {
  label: string;
  tag: string;
  size: string;
  weight: number;
}[] = [
  { label: "Standard", tag: "p", size: "11pt", weight: 400 },
  { label: "Überschrift 1", tag: "h1", size: "14pt", weight: 700 },
  { label: "Überschrift 2", tag: "h2", size: "13pt", weight: 700 },
  { label: "Überschrift 3", tag: "h3", size: "12pt", weight: 700 },
  { label: "Zitat", tag: "blockquote", size: "11pt", weight: 400 },
];

const INSERT_SNIPPETS = [
  {
    label: "Anrede (Sehr geehrte/r)",
    preview: "Sehr geehrte/r [Anrede], ...",
    html: "<p>Sehr geehrte/r [Anrede],</p><p><br></p>",
  },
  {
    label: "Schlussformel + Signatur",
    preview: "Mit freundlichen Grüßen / [Name]",
    html: "<p><br></p><p>Mit freundlichen Grüßen</p><p><br></p><p><br></p><p>[Name Anwalt]</p>",
  },
  {
    label: "Anlagen-Block",
    preview: "Anlagen: Anlage 1, Anlage 2, ...",
    html: "<p><br></p><h3>Anlagen</h3><ul><li>Anlage 1: [Beschreibung]</li><li>Anlage 2: [Beschreibung]</li></ul>",
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
    label: "Tabelle (3x3)",
    preview: "3-spaltige Tabelle",
    html: "<table border='1' style='border-collapse:collapse;width:100%'><tr><th style='padding:6pt;background:#f1f5f9'>Spalte 1</th><th style='padding:6pt;background:#f1f5f9'>Spalte 2</th><th style='padding:6pt;background:#f1f5f9'>Spalte 3</th></tr><tr><td style='padding:6pt'>Zelle</td><td style='padding:6pt'>Zelle</td><td style='padding:6pt'>Zelle</td></tr></table>",
  },
  {
    label: "Gesetzes-Zitat (Blockquote)",
    preview: "§ X Abs. Y [Gesetz]",
    html: "<blockquote>§ [X] Abs. [Y] [GesetzKürzel]: [Zitat]</blockquote>",
  },
];
