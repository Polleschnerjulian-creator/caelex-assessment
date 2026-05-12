"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Agent-Mode UI.
 *
 * The "Mitarbeiter-Sprung". User types a high-level goal, Atlas
 * plans 3-8 steps, runs them autonomously, shows live progress as
 * step-cards, ends with an artifact (markdown report + download
 * buttons).
 *
 * Differs from /atlas/chat:
 *   - No back-and-forth — single goal in, structured run out
 *   - Step-cards stack as Atlas works (not chat bubbles)
 *   - Final artifact has prominent export-to-Word / save-to-mandate
 *     buttons (the chat-view's tiny "Notiz" affordance is for chat;
 *     here we treat the output as the actual deliverable)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  ChevronRight,
  Cpu,
  Briefcase,
  FolderInput,
  CalendarPlus,
  Check,
  Paperclip,
  X,
  Brain,
} from "lucide-react";
import { MarkdownContent } from "@/components/atlas/v2/MarkdownContent";
import { AtlasMark } from "@/components/atlas/v2/AtlasLogo";
import { labelFor } from "@/lib/atlas/tool-labels";
import { exportDraftAsWord } from "@/lib/atlas/draft-export";
import type { MandateListItem } from "@/components/atlas/v2/types";

interface StepRecord {
  iteration: number;
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  isError?: boolean;
  summary?: string;
}

/* Per-iteration thinking text is stored in a Map<iter, string> in
   component state; no separate type needed since the Map signature
   already documents the shape. */

interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

const SUGGESTED_GOALS = [
  "Erstelle eine NIS2-Klassifizierung + Compliance-Brief für einen LEO-Satelliten-Operator in Deutschland",
  "Recherchiere die einschlägigen BNetzA-Frequenzanmelde-Pflichten für eine 12-Satelliten-Konstellation und drafte den Antrag",
  "Vergleiche DE, FR und UK Authorisierungs-Verfahren für Satellitenbetreiber und liefere eine 1-Seite Decision-Memo",
  "Prüfe ITAR/EAR-Klassifikation für ein RF-Subsystem mit GaN-PA, GaAs-LNA und SDR-Backend",
  "Drafte einen Widerspruch gegen einen ablehnenden BNetzA-Bescheid mit Citations + Anhörungsrüge-Begründung",
];

/* Heuristic deadline-detection regex. Matches:
   - "(bis|spätestens|fällig am|Frist) DD.MM.YYYY"
   - "(deadline|by) DD.MM.YYYY"
   - "DD.MM.YYYY" near "Frist|Deadline" keywords
   German date format only — international formats would need a
   bigger parser. Each match has a leading keyword + a parseable
   DD.MM.YYYY date. Captures the keyword in [1] for label + date
   in [2-4]. */
const DEADLINE_REGEX =
  /(bis spätestens|spätestens|bis zum|bis|fällig am|Frist:?|Deadline:?|Stichtag:?)\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/gi;

interface DetectedDeadline {
  raw: string;
  isoDate: string;
  context: string;
}

/* Multi-Artifact parser. Atlas in agent-mode now produces structured
   artifacts using fence markers like:
     [[ARTIFACT type=memo title="..."]] ... [[/ARTIFACT]]
   We parse the final-text into an array of typed artifacts the UI
   can render as separate cards. Anything outside the fences is
   ignored (system-prompt instructs the model not to emit prose
   outside artifacts). */

type ArtifactKind = "memo" | "schriftsatz" | "email" | "checklist" | "summary";

interface Artifact {
  kind: ArtifactKind;
  title: string;
  body: string;
}

const ARTIFACT_OPEN_RE = /\[\[ARTIFACT\s+type=(\w+)\s+title="([^"]+)"\]\]/g;
const ARTIFACT_CLOSE = "[[/ARTIFACT]]";

function parseArtifacts(text: string): Artifact[] {
  const out: Artifact[] = [];
  let m: RegExpExecArray | null;
  ARTIFACT_OPEN_RE.lastIndex = 0;
  while ((m = ARTIFACT_OPEN_RE.exec(text)) !== null) {
    const kindRaw = m[1].toLowerCase();
    const title = m[2];
    const bodyStart = m.index + m[0].length;
    const closeIdx = text.indexOf(ARTIFACT_CLOSE, bodyStart);
    if (closeIdx === -1) {
      /* Streaming may not have emitted the closing fence yet —
         take everything from bodyStart to EOF and render as the
         in-flight artifact. */
      out.push({
        kind: normaliseKind(kindRaw),
        title,
        body: text.slice(bodyStart).trim(),
      });
      break;
    }
    out.push({
      kind: normaliseKind(kindRaw),
      title,
      body: text.slice(bodyStart, closeIdx).trim(),
    });
    ARTIFACT_OPEN_RE.lastIndex = closeIdx + ARTIFACT_CLOSE.length;
  }
  return out;
}

function normaliseKind(s: string): ArtifactKind {
  if (
    s === "schriftsatz" ||
    s === "email" ||
    s === "checklist" ||
    s === "summary"
  )
    return s;
  return "memo";
}

function detectDeadlines(text: string): DetectedDeadline[] {
  const found: DetectedDeadline[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(DEADLINE_REGEX)) {
    const day = m[2].padStart(2, "0");
    const month = m[3].padStart(2, "0");
    const year = m[4];
    const isoDate = `${year}-${month}-${day}`;
    /* Dedupe by ISO date — multiple references to the same date
       in the report shouldn't produce duplicate calendar entries. */
    if (seen.has(isoDate)) continue;
    seen.add(isoDate);
    /* Grab ~80 chars of context around the match for the calendar
       entry title. */
    const start = Math.max(0, (m.index ?? 0) - 40);
    const end = Math.min(text.length, (m.index ?? 0) + 80);
    const context = text.slice(start, end).replace(/\s+/g, " ").trim();
    found.push({ raw: m[0], isoDate, context });
  }
  return found;
}

export default function AgentPage() {
  const [goal, setGoal] = useState("");
  const [mandateId, setMandateId] = useState<string>("");
  const [mandates, setMandates] = useState<MandateListItem[]>([]);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepRecord[]>([]);
  /* Reasoning text per iteration — accumulated via thinking_delta
     stream events. Keyed by iteration number; rendered next to the
     step-cards as a "Warum?"-expandable. */
  const [reasoning, setReasoning] = useState<Map<number, string>>(new Map());
  const [finalText, setFinalText] = useState("");
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  /* Post-run action states — track which post-run actions have been
     triggered already so we can disable the buttons + show a Check. */
  const [savedToVault, setSavedToVault] = useState(false);
  const [savedDeadlines, setSavedDeadlines] = useState<Set<string>>(new Set());
  /* Pre-run file attachments — Bescheide / Verträge / etc. that
     Atlas should read first, then run the agent on them. Each gets
     extracted via /api/atlas/extract and the text is prepended to
     the goal as a fenced [Anhang] block. */
  const [attachments, setAttachments] = useState<
    { fileName: string; text: string }[]
  >([]);
  const [extractingFiles, setExtractingFiles] = useState<string[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  /* Fetch mandate list on mount so the Mandate-Picker is populated.
     Re-fetches when the page mounts; mandate-creation is a separate
     flow that requires page-reload anyway. */
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/atlas/mandate", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { mandates: MandateListItem[] };
        setMandates(data.mandates ?? []);
      } catch {
        /* Mandates are optional — page works without them. */
      }
    })();
  }, []);

  /* Auto-scroll on new content. */
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [steps.length, finalText, usage]);

  /* File-extraction for the agent. Posts each PDF/DOCX/TXT to
     /api/atlas/extract (already built for the chat composer) and
     keeps the extracted text in local state. Runs sequentially so
     the spinner-rows show one-at-a-time. */
  const handleAddFile = async (file: File) => {
    setAttachError(null);
    if (file.size > 10 * 1024 * 1024) {
      setAttachError(
        `Datei zu groß (${Math.round(file.size / 1024)} KB; max 10 MB).`,
      );
      return;
    }
    setExtractingFiles((prev) => [...prev, file.name]);
    try {
      /* Plain-text files we can read client-side — saves a server
         round-trip and keeps the spinner short. */
      const lower = file.name.toLowerCase();
      const isTextFile =
        lower.endsWith(".txt") ||
        lower.endsWith(".md") ||
        lower.endsWith(".markdown") ||
        file.type === "text/plain" ||
        file.type === "text/markdown";
      let text = "";
      if (isTextFile) {
        text = (await file.text()).trim();
      } else {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/atlas/extract", {
          method: "POST",
          body: form,
        });
        const body = (await res.json().catch(() => ({}))) as {
          text?: string;
          error?: string;
        };
        if (!res.ok) {
          setAttachError(
            body.error || `Extraktion fehlgeschlagen (${res.status})`,
          );
          return;
        }
        text = (body.text ?? "").trim();
      }
      if (!text) {
        setAttachError("Datei enthielt keinen extrahierbaren Text.");
        return;
      }
      setAttachments((prev) => [...prev, { fileName: file.name, text }]);
    } catch (e) {
      setAttachError(
        e instanceof Error ? e.message : "Datei konnte nicht gelesen werden",
      );
    } finally {
      setExtractingFiles((prev) => prev.filter((n) => n !== file.name));
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRun = async () => {
    if (!goal.trim() || running) return;
    setRunning(true);
    setSteps([]);
    setReasoning(new Map());
    setFinalText("");
    setUsage(null);
    setError(null);
    setSavedToVault(false);
    setSavedDeadlines(new Set());
    try {
      /* Build the effective goal: attached files prepended as fenced
         [Anhang]-Blocks (same convention the chat-composer uses), so
         Atlas knows it should read them as evidence-context for the
         actual goal that follows. */
      const effectiveGoal =
        attachments.length === 0
          ? goal.trim()
          : attachments
              .map(
                (a) =>
                  `--- Anhang: ${a.fileName} ---\n${a.text}\n--- /Anhang ---`,
              )
              .join("\n\n") + `\n\n${goal.trim()}`;
      const res = await fetch("/api/atlas/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          goal: effectiveGoal,
          mandateId: mandateId || undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let textBuffer = "";
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
            switch (evt.type) {
              case "text":
                textBuffer += evt.delta as string;
                setFinalText(textBuffer);
                break;
              case "thinking_delta": {
                /* Accumulate thinking text per iteration. Multiple
                   deltas per iteration land in the same bucket;
                   tool_use blocks for that iteration share the
                   same reasoning. */
                const it = evt.iteration as number;
                const delta = evt.delta as string;
                setReasoning((prev) => {
                  const next = new Map(prev);
                  next.set(it, (next.get(it) ?? "") + delta);
                  return next;
                });
                break;
              }
              case "step_start":
                setSteps((prev) => [
                  ...prev,
                  {
                    iteration: evt.iteration as number,
                    toolId: evt.toolId as string,
                    toolName: evt.toolName as string,
                    input: (evt.input as Record<string, unknown>) ?? {},
                    startedAt: Date.now(),
                  },
                ]);
                break;
              case "step_complete":
                setSteps((prev) =>
                  prev.map((s) =>
                    s.toolId === evt.toolId
                      ? {
                          ...s,
                          completedAt: Date.now(),
                          durationMs: evt.durationMs as number,
                          isError: evt.isError as boolean,
                          summary: evt.summary as string,
                        }
                      : s,
                  ),
                );
                break;
              case "run_done":
                setUsage(evt.usage as UsageStats);
                break;
              case "error":
                setError(evt.message as string);
                break;
            }
          } catch {
            /* incomplete chunk */
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setSteps([]);
    setReasoning(new Map());
    setFinalText("");
    setUsage(null);
    setError(null);
    setGoal("");
    setSavedToVault(false);
    setSavedDeadlines(new Set());
    setAttachments([]);
    setAttachError(null);
    /* Keep mandateId selection — user often runs multiple agents
       on the same mandate, no reason to make them re-pick. */
  };

  /* Save the agent's final artifact as a Markdown file in the
     selected mandate's vault. Uses the existing multipart-upload
     flow at /api/atlas/mandate/[id]/files. */
  const saveToVault = async () => {
    if (!mandateId || !finalText.trim() || savedToVault) return;
    const title =
      goal
        .split(/[.!?\n]/)[0]
        ?.trim()
        .slice(0, 80) || "Atlas Agent-Ergebnis";
    const filename = `${title.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "").trim()}.md`;
    const blob = new Blob([finalText], { type: "text/markdown" });
    const file = new File([blob], filename, { type: "text/markdown" });
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/files`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Speichern fehlgeschlagen (${res.status})`);
        return;
      }
      setSavedToVault(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  /* Create a mandate-deadline from a detected date. The agent often
     mentions deadlines in its output (e.g. "Registrierungsfrist bis
     17.04.2025"); we surface them with a one-click "trag in Mandat-
     Kalender ein" action so the lawyer doesn't have to re-type. */
  const saveDeadline = async (d: DetectedDeadline) => {
    if (!mandateId || savedDeadlines.has(d.isoDate)) return;
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/deadlines`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: d.context.slice(0, 200),
          dueAt: new Date(d.isoDate + "T23:59:59").toISOString(),
          kind: "agent_detected",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Frist konnte nicht angelegt werden`);
        return;
      }
      setSavedDeadlines((prev) => new Set(prev).add(d.isoDate));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const downloadDoc = () => {
    if (!finalText.trim()) return;
    /* Use the first sentence of the goal as a title, capped. */
    const title =
      goal
        .split(/[.!?\n]/)[0]
        ?.trim()
        .slice(0, 80) || "Atlas Agent-Ergebnis";
    exportDraftAsWord({
      title,
      markdown: finalText,
      locale: "de",
      privileged: true,
    });
  };

  const hasResults = steps.length > 0 || finalText || error;

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto px-6 py-8">
      {/* Header */}
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <Cpu size={11} />
          Agent-Mode
        </div>
        <h1 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-100 [font-family:ui-serif,Georgia,'Cambria_Style',serif]">
          Atlas erledigt die Aufgabe.
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Beschreibe ein konkretes Ziel — Atlas plant 3–8 Schritte und führt sie
          autonom aus. Recherche, Klassifizierung, Drafting, Friststellung in
          einem Lauf.
        </p>
      </header>

      {/* Goal input (hidden once we're running / done) */}
      {!hasResults && !running && (
        <div className="space-y-4">
          {/* Mandate-Picker — optional. When selected, Atlas runs the
              agent WITH the mandate's full context (jurisdiction,
              operator-type, custom-instructions, etc.) injected into
              its system prompt. Empty = "general" agent run. */}
          {mandates.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <Briefcase size={14} className="shrink-0 text-slate-500" />
              <label className="text-[12px] text-slate-500">
                Mandat-Kontext:
              </label>
              <select
                value={mandateId}
                onChange={(e) => setMandateId(e.target.value)}
                className="flex-1 bg-transparent text-[12.5px] text-slate-900 outline-none dark:text-slate-100"
              >
                <option value="">Kein Mandat — generischer Agent-Run</option>
                {mandates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.clientName ? ` — ${m.clientName}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            {/* Attached files (PDF / DOCX / TXT / MD) — prepended to the
                goal as fenced [Anhang]-Blocks so Atlas reads them as
                evidence-context. Use cases: drop Bescheid + write
                "drafte den Widerspruch", drop Vertrag + write
                "fasse die Haftungsklauseln zusammen", etc. */}
            {(attachments.length > 0 || extractingFiles.length > 0) && (
              <div className="flex flex-col gap-1 px-2 pt-2">
                {attachments.map((a, i) => (
                  <div
                    key={`${a.fileName}-${i}`}
                    className="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11.5px] text-slate-700 dark:bg-white/[0.04] dark:text-slate-300"
                  >
                    <Paperclip size={12} className="shrink-0 text-slate-500" />
                    <span className="flex-1 truncate" title={a.fileName}>
                      {a.fileName}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {Math.round(a.text.length / 1024)} KB Text
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      aria-label="Anhang entfernen"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {extractingFiles.map((name) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11.5px] text-slate-500 dark:bg-white/[0.02]"
                  >
                    <Loader2 size={12} className="shrink-0 animate-spin" />
                    <span className="flex-1 truncate">{name}</span>
                    <span className="shrink-0 text-[10px]">extrahiert…</span>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="z.B. „Erstelle eine NIS2-Klassifizierung für meinen LEO-Satelliten-Operator und drafte den Compliance-Brief."
              rows={3}
              className="block w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              autoFocus
            />

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              multiple
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                for (const f of files) await handleAddFile(f);
                e.target.value = "";
              }}
              className="hidden"
            />

            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 dark:border-white/[0.05]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
                  title="Datei hochladen (PDF, DOCX, TXT, MD)"
                >
                  <Paperclip size={11} />
                  Datei
                </button>
                <span className="text-[11px] text-slate-500">
                  {goal.length}/2000 Zeichen
                  {attachments.length > 0 &&
                    ` · ${attachments.length} Anhang${attachments.length === 1 ? "" : "e"}`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRun}
                disabled={goal.trim().length < 10}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-30 dark:bg-emerald-500 dark:hover:bg-emerald-600"
              >
                <Play size={11} />
                Agent starten
              </button>
            </div>
          </div>

          {attachError && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {attachError}
            </div>
          )}

          {/* Suggested goals */}
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">
              Beispiele
            </div>
            <div className="space-y-1.5">
              {SUGGESTED_GOALS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setGoal(s)}
                  className="flex w-full items-start gap-2 rounded-md border border-slate-200 px-3 py-2 text-left text-[12.5px] leading-snug text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:text-slate-300 dark:hover:border-white/[0.15] dark:hover:bg-white/[0.02]"
                >
                  <Sparkles
                    size={11}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />
                  <span className="flex-1">{s}</span>
                  <ChevronRight
                    size={11}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Running / completed view */}
      {hasResults && (
        <div ref={transcriptRef} className="space-y-4">
          {/* Goal pinned at top */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <div className="mb-1 text-[10.5px] uppercase tracking-wider text-slate-500">
              Ziel
            </div>
            <div className="text-[13px] text-slate-900 dark:text-slate-100">
              {goal}
            </div>
          </div>

          {/* Active run indicator */}
          {running && steps.length === 0 && !finalText && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-[12.5px] text-slate-600 dark:border-white/[0.08] dark:text-slate-400">
              <span className="inline-flex animate-pulse text-slate-700 dark:text-slate-200">
                <AtlasMark size={10} />
              </span>
              Atlas plant die Schritte…
            </div>
          )}

          {/* Step-cards */}
          {(() => {
            /* Group steps by iteration so each iteration's
               reasoning-panel renders ONCE above its step-cards
               (instead of duplicating the same reasoning above
               every tool-call in that iteration). */
            const byIter = new Map<number, StepRecord[]>();
            const iterations: number[] = [];
            for (const s of steps) {
              if (!byIter.has(s.iteration)) {
                iterations.push(s.iteration);
                byIter.set(s.iteration, []);
              }
              byIter.get(s.iteration)!.push(s);
            }
            return iterations.flatMap((iter) => {
              const iterSteps = byIter.get(iter) ?? [];
              const reasoningText = reasoning.get(iter);
              return [
                reasoningText ? (
                  <ReasoningPanel
                    key={`reasoning-${iter}`}
                    iteration={iter}
                    text={reasoningText}
                  />
                ) : null,
                ...iterSteps.map((step) => (
                  <StepCard key={step.toolId} step={step} />
                )),
              ];
            });
          })()}

          {/* Final artifacts — Atlas in agent-mode now produces
              MULTIPLE structured artifacts per run (memo, schriftsatz,
              email, checklist, summary). We parse the fenced markers
              and render each as its own card. If no artifacts were
              parsed (= older runs or system-prompt-disregarded), we
              fall back to a single-card render of finalText. */}
          {finalText &&
            (() => {
              const artifacts = parseArtifacts(finalText);
              if (artifacts.length === 0) {
                /* Legacy/fallback render — same as before, one card. */
                return (
                  <LegacyArtifact
                    finalText={finalText}
                    running={running}
                    mandateId={mandateId}
                    savedToVault={savedToVault}
                    onDownloadDoc={downloadDoc}
                    onSaveToVault={saveToVault}
                  />
                );
              }
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={11} />
                    {running
                      ? `Atlas erstellt Artefakte… (${artifacts.length})`
                      : `Ergebnis — ${artifacts.length} Artefakt${artifacts.length === 1 ? "" : "e"}`}
                  </div>
                  {artifacts.map((a, i) => (
                    <ArtifactCard
                      key={`${a.kind}-${i}-${a.title}`}
                      artifact={a}
                      running={running}
                      mandateId={mandateId}
                      goalTitle={goal.split(/[.!?\n]/)[0]?.trim() ?? ""}
                    />
                  ))}
                </div>
              );
            })()}

          {/* Auto-detected deadlines — run-level, NOT per-artifact, so
              we render at the bottom (after all artifacts). Detects
              across the entire finalText, not just one artifact. */}
          {!running &&
            mandateId &&
            finalText &&
            (() => {
              const deadlines = detectDeadlines(finalText);
              if (deadlines.length === 0) return null;
              return (
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                  <div className="mb-2 flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-slate-500">
                    <CalendarPlus size={10} />
                    Erkannte Fristen ({deadlines.length})
                  </div>
                  <div className="space-y-1.5">
                    {deadlines.map((d) => {
                      const saved = savedDeadlines.has(d.isoDate);
                      return (
                        <div
                          key={d.isoDate}
                          className="flex items-center gap-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-[11.5px] dark:bg-white/[0.02]"
                        >
                          <span className="shrink-0 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {d.isoDate}
                          </span>
                          <span className="line-clamp-1 flex-1 text-slate-500">
                            …{d.context}…
                          </span>
                          <button
                            type="button"
                            onClick={() => saveDeadline(d)}
                            disabled={saved}
                            className={`shrink-0 rounded-md border px-2 py-0.5 text-[10.5px] transition-colors ${
                              saved
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                                : "border-slate-200 text-slate-600 hover:bg-white dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
                            }`}
                          >
                            {saved ? (
                              <span className="inline-flex items-center gap-1">
                                <Check size={9} />
                                in Kalender
                              </span>
                            ) : (
                              "→ Kalender"
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          {/* Usage footer + reset */}
          {usage && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <span>
                {steps.length} Tool-Calls ·{" "}
                {usage.inputTokens.toLocaleString("de-DE")}↑ ·{" "}
                {usage.outputTokens.toLocaleString("de-DE")}↓ tokens · $
                {usage.costUsd.toFixed(4)}
              </span>
              <button
                type="button"
                onClick={reset}
                className="text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline dark:hover:text-slate-200"
              >
                Neuer Agent-Run
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Step-card ─────────────────────────────────────────────────────────
 *
 * Renders one tool-call as a horizontal card:
 *   ✓ Korpus durchsucht                              128ms
 *   „NIS2 Art. 21/23 essential entities"
 *   → OK · 4 Treffer
 *
 * The friendly label comes from labelFor() (the same util the chat
 * view uses for tool-trace lines).
 */
function StepCard({ step }: { step: StepRecord }) {
  const lbl = labelFor(step.toolName);
  const detail = lbl.describe?.(step.input);
  const completed = !!step.completedAt;
  const errored = !!step.isError;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          {!completed ? (
            <Loader2
              size={14}
              className="animate-spin text-slate-500 dark:text-slate-400"
            />
          ) : errored ? (
            <AlertCircle size={14} className="text-red-600 dark:text-red-400" />
          ) : (
            <CheckCircle2
              size={14}
              className="text-emerald-600 dark:text-emerald-400"
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
              {completed ? lbl.done : lbl.running}
            </div>
            {completed && step.durationMs !== undefined && (
              <div className="shrink-0 tabular-nums text-[10.5px] text-slate-500">
                {step.durationMs >= 1000
                  ? `${(step.durationMs / 1000).toFixed(1)}s`
                  : `${step.durationMs}ms`}
              </div>
            )}
          </div>
          {detail && (
            <div className="mt-0.5 line-clamp-2 text-[12px] text-slate-500">
              {detail}
            </div>
          )}
          {step.summary && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="text-slate-400">→</span>
              <span className={errored ? "text-red-600 dark:text-red-400" : ""}>
                {step.summary}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* exportDraftAsWord handles its own blob + anchor click — no local
   download helper needed here. */

/* ── ArtifactCard ─────────────────────────────────────────────────────
 *
 * Renders one structured artifact from the agent's multi-output. Each
 * artifact has its own type-specific icon, title, body, and action
 * buttons. The .doc export uses the artifact's title as filename + the
 * appropriate privileged-stamp (schriftsatz always gets privilege
 * marker; memo/email get it conditionally per locale-defaults). The
 * Save-to-Vault button is shown only when a mandate is selected.
 */
function ArtifactCard({
  artifact,
  running,
  mandateId,
  goalTitle,
}: {
  artifact: Artifact;
  running: boolean;
  mandateId: string;
  goalTitle: string;
}) {
  const [savedToVault, setSavedToVault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta: Record<
    ArtifactKind,
    { label: string; tint: string; icon: React.ReactNode }
  > = {
    memo: {
      label: "Memo",
      tint: "text-blue-600 dark:text-blue-400",
      icon: <FileText size={11} />,
    },
    schriftsatz: {
      label: "Schriftsatz",
      tint: "text-emerald-600 dark:text-emerald-400",
      icon: <FileText size={11} />,
    },
    email: {
      label: "Email-Draft",
      tint: "text-amber-600 dark:text-amber-400",
      icon: <FileText size={11} />,
    },
    checklist: {
      label: "Checkliste",
      tint: "text-slate-600 dark:text-slate-400",
      icon: <Check size={11} />,
    },
    summary: {
      label: "Zusammenfassung",
      tint: "text-slate-500",
      icon: <Sparkles size={11} />,
    },
  };
  const m = meta[artifact.kind];

  const downloadDoc = () => {
    exportDraftAsWord({
      title: artifact.title || goalTitle || "Atlas Agent-Ergebnis",
      markdown: artifact.body,
      locale: "de",
      privileged: artifact.kind === "schriftsatz" || artifact.kind === "memo",
    });
  };

  const saveToVault = async () => {
    if (savedToVault || saving) return;
    setSaving(true);
    setError(null);
    const safeTitle =
      artifact.title.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "").trim() ||
      "Atlas Agent Artefakt";
    const filename = `${safeTitle}.md`;
    const blob = new Blob([artifact.body], { type: "text/markdown" });
    const file = new File([blob], filename, { type: "text/markdown" });
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/files`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Speichern fehlgeschlagen (${res.status})`);
        return;
      }
      setSavedToVault(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-white/[0.05]">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`shrink-0 ${m.tint}`}>{m.icon}</span>
          <span
            className={`shrink-0 text-[10.5px] uppercase tracking-wider ${m.tint}`}
          >
            {m.label}
          </span>
          <span className="line-clamp-1 text-[13px] font-medium text-slate-900 dark:text-slate-100">
            {artifact.title}
          </span>
        </div>
        {!running && artifact.kind !== "summary" && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={downloadDoc}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
            >
              <FileText size={11} />
              .doc
            </button>
            {mandateId && (
              <button
                type="button"
                onClick={saveToVault}
                disabled={savedToVault || saving}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors disabled:opacity-100 ${
                  savedToVault
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
                }`}
              >
                {saving ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : savedToVault ? (
                  <>
                    <Check size={11} />
                    Im Vault
                  </>
                ) : (
                  <>
                    <FolderInput size={11} />
                    In Vault
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="prose prose-sm max-w-none text-[13px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
        <MarkdownContent text={artifact.body} />
        {running && (
          <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-slate-500 align-middle dark:bg-slate-300" />
        )}
      </div>
      {error && (
        <div className="mt-2 text-[11px] text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

/* ── LegacyArtifact ───────────────────────────────────────────────────
 *
 * Fallback render when no fenced artifacts were emitted (older runs
 * or the model ignored the structured-output instruction). Same look
 * as pre-Sprint-D: one card with the whole finalText.
 */
function LegacyArtifact({
  finalText,
  running,
  mandateId,
  savedToVault,
  onDownloadDoc,
  onSaveToVault,
}: {
  finalText: string;
  running: boolean;
  mandateId: string;
  savedToVault: boolean;
  onDownloadDoc: () => void;
  onSaveToVault: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-white/[0.05]">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={11} />
          {running ? "Atlas schreibt Ergebnis…" : "Ergebnis"}
        </div>
        {!running && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onDownloadDoc}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
            >
              <FileText size={11} />
              .doc Export
            </button>
            {mandateId && (
              <button
                type="button"
                onClick={onSaveToVault}
                disabled={savedToVault}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors disabled:opacity-100 ${
                  savedToVault
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
                }`}
              >
                {savedToVault ? (
                  <>
                    <Check size={11} />
                    Im Mandat-Vault
                  </>
                ) : (
                  <>
                    <FolderInput size={11} />
                    In Mandat-Vault
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="prose prose-sm max-w-none text-[13.5px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
        <MarkdownContent text={finalText} />
        {running && (
          <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-slate-500 align-middle dark:bg-slate-300" />
        )}
      </div>
    </div>
  );
}

/* ── ReasoningPanel ───────────────────────────────────────────────────
 *
 * Renders Atlas's Extended-Thinking output for one iteration. Sits
 * ABOVE the step-cards of that iteration as a collapsible "Warum?"
 * panel. The lawyer sees the model's actual reasoning ("ich suche
 * im Korpus nach NIS2 Art. 21 weil der Mandant essential entity
 * sein könnte und Art. 21 die Pflichten enthält") for full
 * transparency.
 *
 * Streaming behaviour: text streams in via thinking_delta events,
 * we accumulate it per-iteration. The panel auto-expands while
 * the iteration is still running (= text grows), collapses to a
 * 1-line preview once the iteration's steps complete.
 */
function ReasoningPanel({
  iteration,
  text,
}: {
  iteration: number;
  text: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60 dark:border-white/[0.06] dark:bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
      >
        <Brain
          size={11}
          className="shrink-0 text-slate-500 dark:text-slate-400"
        />
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Reasoning · Iteration {iteration}
        </span>
        <span className="ml-auto text-[10.5px] text-slate-400 dark:text-slate-500">
          {text.length} Zeichen · {open ? "einklappen" : "anzeigen"}
        </span>
        <ChevronRight
          size={11}
          className={`shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      {open && (
        <div className="whitespace-pre-wrap border-t border-slate-200 px-3 py-2 text-[12px] leading-relaxed text-slate-700 dark:border-white/[0.05] dark:text-slate-300">
          {text}
        </div>
      )}
    </div>
  );
}
