"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Lite Drafting Canvas (Tier-1 Sprint C, MVP).
 *
 * Two-pane workspace optimised for chat-driven drafting:
 *   ┌──────────────┬──────────────────────┐
 *   │              │  Draft (markdown,    │
 *   │   Chat       │  editable, exports   │
 *   │              │  to .doc / .md)      │
 *   └──────────────┴──────────────────────┘
 *
 * Differs from the existing /atlas/drafting/ workflow (Plan → Chat
 * → Review steps with persistence) — this is the LITE version: open
 * a fresh canvas, refine with chat, export to Word, done. No state
 * persisted server-side; the canvas lives in localStorage so a tab
 * reload doesn't lose the draft.
 *
 * Use cases:
 *   - "Schreib mir einen knappen Mandantenbrief zu Bescheid X" →
 *     paste into Outlook
 *   - Quick memo for partner review
 *   - Strawman draft to iterate on before promoting to the full
 *     drafting workflow
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState, useEffect, useRef } from "react";
import { Download, FileText, Trash2, ArrowRight } from "lucide-react";
import { ChatInput } from "@/components/atlas/v2/ChatInput";
import { MarkdownContent } from "@/components/atlas/v2/MarkdownContent";
import {
  exportDraftAsWord,
  exportDraftAsMarkdown,
} from "@/lib/atlas/draft-export";

const STORAGE_KEY = "atlas-v2-draft-canvas";

interface Turn {
  role: "user" | "assistant";
  text: string;
  id: string;
}

export default function DraftPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [draft, setDraft] = useState("");
  const [draftTitle, setDraftTitle] = useState("Atlas Draft");
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  /* Restore canvas from localStorage on mount. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { draft?: string; title?: string };
        if (parsed.draft) setDraft(parsed.draft);
        if (parsed.title) setDraftTitle(parsed.title);
      }
    } catch {
      /* swallow — corrupt localStorage shouldn't crash the page */
    }
  }, []);

  /* Persist draft + title on every change (debounced via the
     useEffect deps — React batches into the next paint). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ draft, title: draftTitle }),
      );
    } catch {
      /* swallow — quota exceeded shouldn't break the editor */
    }
  }, [draft, draftTitle]);

  /* Auto-scroll transcript on new content. */
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns.length, streamText]);

  const handleSubmit = async (text: string) => {
    const userTurn: Turn = {
      role: "user",
      text,
      id: `u-${Date.now()}`,
    };
    setTurns((prev) => [...prev, userTurn]);
    setStreaming(true);
    setStreamText("");
    setError(null);

    /* Build a stripped-down "drafting context" message for Atlas:
       the user's instruction + (if any) the current draft so the
       model can reference it for refinements. */
    const draftContext = draft.trim()
      ? `\n\n[CURRENT DRAFT]\n${draft}\n[/CURRENT DRAFT]\n\nDie Lawyer-Eingabe oben kann sich auf diesen Draft beziehen ("kürze Absatz 2", "formelleres Du-Sie", etc.). Antworte mit dem überarbeiteten Draft als Markdown — KEINE Vor- oder Nachrede, nur das Dokument selbst.`
      : `\n\nErstelle den angefragten Entwurf direkt als Markdown — KEINE Vor- oder Nachrede, nur das Dokument selbst.`;

    try {
      const res = await fetch("/api/atlas/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: text + draftContext,
          /* Drafting needs few tools — Korpus + Validity for legal
             grounding. Compliance/comparison/etc. are noise here. */
          toolToggles: {
            korpus: true,
            validity: true,
            documents: false,
            web: false,
            compliance: false,
            comparison: false,
            drafting: true,
            workflow: false,
            mandate: false,
          },
        }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const evt = JSON.parse(json);
            if (evt.type === "text") {
              assistantText += evt.delta as string;
              setStreamText(assistantText);
            }
          } catch {
            /* incomplete chunk */
          }
        }
      }
      setTurns((prev) => [
        ...prev,
        { role: "assistant", text: assistantText, id: `a-${Date.now()}` },
      ]);
      setStreamText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStreaming(false);
    }
  };

  const promoteToCanvas = (text: string) => {
    /* Drop trailing/leading code-fence markers if Atlas wrapped its
       draft in ```markdown ... ```. Common LLM tic. */
    const cleaned = text
      .replace(/^```(?:markdown|md)?\s*\n/i, "")
      .replace(/\n```\s*$/i, "")
      .trim();
    setDraft(cleaned);
    draftRef.current?.focus();
  };

  /* exportDraftAsWord / exportDraftAsMarkdown handle the download
     themselves (Blob + anchor + click) and return void — we just
     fire-and-forget. The `privileged: true` flag prepends the
     "PRIVILEGED & CONFIDENTIAL — Attorney-Client Work Product"
     marker (mandatory for any artifact that leaves the firm). */

  const downloadDoc = () => {
    if (!draft.trim()) return;
    exportDraftAsWord({
      title: draftTitle || "Atlas Draft",
      markdown: draft,
      locale: "de",
      privileged: true,
    });
  };

  const downloadMd = () => {
    if (!draft.trim()) return;
    exportDraftAsMarkdown({
      title: draftTitle || "Atlas Draft",
      markdown: draft,
      locale: "de",
      privileged: true,
    });
  };

  const clearDraft = () => {
    if (!draft.trim()) return;
    if (
      !window.confirm(
        "Draft wird komplett gelöscht (lokal gespeichert; Chat-Verlauf bleibt). Weiter?",
      )
    )
      return;
    setDraft("");
  };

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-2">
      {/* LEFT — Chat transcript + composer */}
      <div className="flex h-full flex-col border-r border-slate-200 dark:border-white/[0.06]">
        <header className="shrink-0 border-b border-slate-200 px-5 py-3 dark:border-white/[0.06]">
          <h1 className="text-[14px] font-medium text-slate-900 dark:text-slate-100 [font-family:ui-serif,Georgia,'Cambria_Style',serif]">
            Drafting Canvas
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Beschreibe das Dokument links, übernimm es rechts in den Canvas,
            verfeinere im Dialog. Lokal gespeichert.
          </p>
        </header>

        <div ref={transcriptRef} className="flex-1 overflow-y-auto px-5 py-4">
          {turns.length === 0 && !streaming && (
            <div className="text-center text-[12.5px] text-slate-500">
              z.B. „Schreib einen kurzen Mandantenbrief zur abgelehnten
              BNetzA-Frequenzanmeldung — 3 Absätze, höflich-bestimmt."
            </div>
          )}
          <div className="space-y-4">
            {turns.map((t) =>
              t.role === "user" ? (
                <div key={t.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl bg-slate-100 px-3 py-2 text-[13.5px] text-slate-900 dark:bg-white/[0.06] dark:text-slate-100">
                    {t.text}
                  </div>
                </div>
              ) : (
                <div key={t.id} className="space-y-2">
                  <div className="prose prose-sm max-w-none text-[13px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
                    <MarkdownContent text={t.text} />
                  </div>
                  <button
                    type="button"
                    onClick={() => promoteToCanvas(t.text)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
                  >
                    <ArrowRight size={11} />
                    Als Draft übernehmen
                  </button>
                </div>
              ),
            )}
            {streaming && (
              <div className="space-y-2">
                <div className="prose prose-sm max-w-none text-[13px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
                  <MarkdownContent text={streamText} />
                  <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-slate-500 align-middle dark:bg-slate-300" />
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 px-5 py-3 dark:border-white/[0.06]">
          <ChatInput
            disabled={streaming}
            placeholder={
              draft.trim()
                ? "Verfeinere den Draft (z.B. 'Absatz 2 förmlicher')…"
                : "Beschreibe das gewünschte Dokument…"
            }
            onSubmit={(text) => handleSubmit(text)}
          />
        </div>
      </div>

      {/* RIGHT — Draft canvas */}
      <div className="flex h-full flex-col bg-slate-50/50 dark:bg-white/[0.01]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-white/[0.06]">
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Titel"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={downloadDoc}
              disabled={!draft.trim()}
              title="Word (.doc) herunterladen"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-white disabled:opacity-30 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
            >
              <FileText size={11} />
              .doc
            </button>
            <button
              type="button"
              onClick={downloadMd}
              disabled={!draft.trim()}
              title="Markdown (.md) herunterladen"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-white disabled:opacity-30 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
            >
              <Download size={11} />
              .md
            </button>
            <button
              type="button"
              onClick={clearDraft}
              disabled={!draft.trim()}
              title="Canvas leeren"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1 text-slate-500 transition-colors hover:bg-white disabled:opacity-30 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <textarea
            ref={draftRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Hier landet der Draft. Du kannst direkt drin editieren oder über den Chat verfeinern lassen."
            className="block h-full min-h-[400px] w-full resize-none bg-transparent font-mono text-[12.5px] leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            spellCheck={false}
          />
        </div>

        {draft.trim() && (
          <div className="shrink-0 border-t border-slate-200 px-5 py-2 text-[10.5px] text-slate-500 dark:border-white/[0.06]">
            {draft.length.toLocaleString("de-DE")} Zeichen ·{" "}
            {draft.split(/\s+/).filter(Boolean).length.toLocaleString("de-DE")}{" "}
            Wörter · Lokal gespeichert
          </div>
        )}
      </div>
    </div>
  );
}

/* (No local helpers needed — the export functions handle their own
   Blob creation + download trigger.) */
