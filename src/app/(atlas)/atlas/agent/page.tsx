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
} from "lucide-react";
import { MarkdownContent } from "@/components/atlas/v2/MarkdownContent";
import { AtlasMark } from "@/components/atlas/v2/AtlasLogo";
import { labelFor } from "@/lib/atlas/tool-labels";
import { exportDraftAsWord } from "@/lib/atlas/draft-export";

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

export default function AgentPage() {
  const [goal, setGoal] = useState("");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepRecord[]>([]);
  const [finalText, setFinalText] = useState("");
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll on new content. */
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [steps.length, finalText, usage]);

  const handleRun = async () => {
    if (!goal.trim() || running) return;
    setRunning(true);
    setSteps([]);
    setFinalText("");
    setUsage(null);
    setError(null);
    try {
      const res = await fetch("/api/atlas/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal: goal.trim() }),
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
    setFinalText("");
    setUsage(null);
    setError(null);
    setGoal("");
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
          <div className="rounded-2xl border border-slate-200 bg-white p-1 dark:border-white/[0.08] dark:bg-[#1a1a1a]">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="z.B. „Erstelle eine NIS2-Klassifizierung für meinen LEO-Satelliten-Operator und drafte den Compliance-Brief."
              rows={3}
              className="block w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-[14px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              autoFocus
            />
            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 dark:border-white/[0.05]">
              <span className="text-[11px] text-slate-500">
                {goal.length}/2000 Zeichen
              </span>
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
          {steps.map((step) => (
            <StepCard key={step.toolId} step={step} />
          ))}

          {/* Final artifact */}
          {finalText && (
            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/[0.05]">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={11} />
                  {running ? "Atlas schreibt Ergebnis…" : "Ergebnis"}
                </div>
                {!running && (
                  <button
                    type="button"
                    onClick={downloadDoc}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
                  >
                    <FileText size={11} />
                    .doc Export
                  </button>
                )}
              </div>
              <div className="prose prose-sm max-w-none text-[13.5px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
                <MarkdownContent text={finalText} />
                {running && (
                  <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-slate-500 align-middle dark:bg-slate-300" />
                )}
              </div>
            </div>
          )}

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
