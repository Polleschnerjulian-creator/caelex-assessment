"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Agent-Run Detail (History-Replay).
 *
 * Renders a persisted Agent-Run from the DB — no Anthropic re-cost.
 * Shows: goal, mandate-context, status, full step-list with reasoning,
 * artifacts, citation-verification, token + cost stats.
 *
 * Used as audit-trail evidence ("zeig mir was Atlas am 12.05.2026 für
 * Mandant XY gemacht hat") und für lawyer's eigene Lernkurve.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Cpu,
  Brain,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { MarkdownContent } from "@/components/atlas/v2/MarkdownContent";
import { labelFor } from "@/lib/atlas/tool-labels";

interface PersistedStep {
  iteration: number;
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  durationMs?: number;
  isError?: boolean;
  summary?: string;
}

interface PersistedArtifact {
  kind: string;
  title: string;
  body: string;
}

interface PersistedRun {
  id: string;
  goal: string;
  status: "running" | "complete" | "error" | "aborted";
  iterations: number;
  steps: PersistedStep[];
  reasoning: Record<string, string>;
  artifacts: PersistedArtifact[];
  citations: {
    total: number;
    verified: number;
    warnings: number;
    hallucinated: number;
    citations: Array<{
      sourceId: string;
      citation: string;
      badge: string;
      title: string | null;
    }>;
  } | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  mandate: { id: string; name: string; clientName: string | null } | null;
}

export default function AgentRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [run, setRun] = useState<PersistedRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/atlas/agent/runs/${id}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setError(
            res.status === 404 ? "Run nicht gefunden" : `HTTP ${res.status}`,
          );
          return;
        }
        const data = (await res.json()) as { run: PersistedRun };
        setRun(data.run);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Diesen Agent-Run permanent löschen? Audit-Trail-Eintrag geht verloren.",
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/atlas/agent/runs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(`Löschen fehlgeschlagen (${res.status})`);
        setDeleting(false);
        return;
      }
      window.location.href = "/atlas/agent/history";
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-[12.5px] text-slate-500">
        <Loader2 size={14} className="mr-2 animate-spin" />
        Lädt Run…
      </div>
    );
  }
  if (error || !run) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/atlas/agent/history"
          className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
        >
          <ArrowLeft size={11} />
          Zurück zur History
        </Link>
        <div className="mt-4 text-[13px] text-red-600 dark:text-red-400">
          {error ?? "Run nicht gefunden"}
        </div>
      </div>
    );
  }

  /* Group steps by iteration for the reasoning-bucketing. */
  const byIter = new Map<number, PersistedStep[]>();
  const iterations: number[] = [];
  for (const s of run.steps) {
    if (!byIter.has(s.iteration)) {
      iterations.push(s.iteration);
      byIter.set(s.iteration, []);
    }
    byIter.get(s.iteration)!.push(s);
  }

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto px-6 py-8">
      {/* Header */}
      <div className="mb-4">
        <Link
          href="/atlas/agent/history"
          className="inline-flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
        >
          <ArrowLeft size={11} />
          Zurück zur History
        </Link>
      </div>
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <Cpu size={11} />
          Agent-Run
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-medium leading-tight text-slate-900 dark:text-slate-100">
            {run.goal}
          </h1>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            title="Run löschen"
            className="shrink-0 rounded-md border border-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:border-white/[0.10] dark:hover:bg-red-500/10 dark:hover:text-red-300"
          >
            <Trash2 size={12} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
          <StatusBadge status={run.status} />
          <span>{new Date(run.startedAt).toLocaleString("de-DE")}</span>
          {run.iterations > 0 && <span>· {run.iterations} Iterationen</span>}
          {run.steps.length > 0 && <span>· {run.steps.length} Tool-Calls</span>}
          {run.costUsd !== null && <span>· ${run.costUsd.toFixed(4)}</span>}
          {run.mandate && (
            <Link
              href={`/atlas/mandate/${run.mandate.id}`}
              className="hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              · {run.mandate.name}
            </Link>
          )}
        </div>
        {run.errorMessage && (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {run.errorMessage}
          </div>
        )}
      </header>

      {/* Steps + reasoning grouped by iteration */}
      {iterations.length > 0 && (
        <section className="mb-6 space-y-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">
            Ausführungs-Trace
          </div>
          {iterations.flatMap((iter) => {
            const steps = byIter.get(iter) ?? [];
            const reasoning = run.reasoning[String(iter)];
            return [
              reasoning ? (
                <ReasoningCard
                  key={`r-${iter}`}
                  iteration={iter}
                  text={reasoning}
                />
              ) : null,
              ...steps.map((s) => <StepCard key={s.toolId} step={s} />),
            ];
          })}
        </section>
      )}

      {/* Citation-Verification Banner (read-only, simplified) */}
      {run.citations && run.citations.total > 0 && (
        <section className="mb-6">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">
            Citation-Verification
          </div>
          <div
            className={`rounded-lg border px-4 py-2 text-[12px] ${
              run.citations.hallucinated > 0
                ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                : run.citations.warnings > 0
                  ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                  : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
            }`}
          >
            {run.citations.verified}/{run.citations.total} verified
            {run.citations.warnings > 0 &&
              ` · ${run.citations.warnings} warnings`}
            {run.citations.hallucinated > 0 &&
              ` · ${run.citations.hallucinated} hallucinated`}
          </div>
        </section>
      )}

      {/* Artifacts */}
      {run.artifacts.length > 0 && (
        <section className="space-y-3">
          <div className="text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Artefakte ({run.artifacts.length})
          </div>
          {run.artifacts.map((a, i) => (
            <div
              key={`${a.kind}-${i}`}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.02]"
            >
              <div className="mb-2 flex items-baseline gap-2 border-b border-slate-100 pb-2 dark:border-white/[0.05]">
                <span className="text-[10.5px] uppercase tracking-wider text-slate-500">
                  {a.kind}
                </span>
                <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
                  {a.title}
                </span>
              </div>
              <div className="prose prose-sm max-w-none text-[13px] leading-relaxed text-slate-800 dark:prose-invert dark:text-slate-200">
                <MarkdownContent text={a.body} />
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m = {
    complete: {
      icon: <CheckCircle2 size={11} />,
      tint: "text-emerald-600 dark:text-emerald-400",
      label: "Komplett",
    },
    error: {
      icon: <AlertCircle size={11} />,
      tint: "text-red-600 dark:text-red-400",
      label: "Fehler",
    },
    running: {
      icon: <Loader2 size={11} className="animate-spin" />,
      tint: "text-blue-600 dark:text-blue-400",
      label: "Läuft",
    },
    aborted: {
      icon: <AlertCircle size={11} />,
      tint: "text-slate-500",
      label: "Abgebrochen",
    },
  }[status] ?? {
    icon: <AlertCircle size={11} />,
    tint: "text-slate-500",
    label: status,
  };
  return (
    <span className={`inline-flex items-center gap-1 ${m.tint}`}>
      {m.icon}
      {m.label}
    </span>
  );
}

function ReasoningCard({
  iteration,
  text,
}: {
  iteration: number;
  text: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 dark:border-white/[0.06] dark:bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-100/60 dark:hover:bg-white/[0.04]"
      >
        <Brain size={11} className="shrink-0 text-slate-500" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Reasoning · Iteration {iteration}
        </span>
        <span className="ml-auto text-[10.5px] text-slate-400">
          {text.length} Zeichen · {open ? "einklappen" : "anzeigen"}
        </span>
        <ChevronRight
          size={11}
          className={`shrink-0 text-slate-500 transition-transform ${
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

function StepCard({ step }: { step: PersistedStep }) {
  const lbl = labelFor(step.toolName);
  const detail = lbl.describe?.(step.input);
  const errored = !!step.isError;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          {errored ? (
            <AlertCircle size={13} className="text-red-600 dark:text-red-400" />
          ) : (
            <CheckCircle2
              size={13}
              className="text-emerald-600 dark:text-emerald-400"
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13px] font-medium text-slate-900 dark:text-slate-100">
              {lbl.done}
            </div>
            {step.durationMs !== undefined && (
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
            <div className="mt-1.5 text-[11px] text-slate-500">
              <span className="text-slate-400">→ </span>
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
