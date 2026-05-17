"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Agent-Run History.
 *
 * Lists past Agent-Mode runs in reverse-chronological order. Each row
 * shows: status-badge, goal-preview, mandate, iterations, cost, time-
 * ago. Click → /atlas/agent/history/[id] for the full step + artifact
 * + citation replay (no Anthropic re-cost — DB-resident).
 *
 * Filters: by mandate (dropdown), by status (running / complete /
 * error / aborted).
 *
 * Audit-trail nutzbar als "was hat Atlas wann für Mandant XY gemacht"
 * Pflicht-Beleg gegenüber Mandant / Aufsichtsbehörde / Versicherung.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Briefcase,
  Cpu,
  ChevronRight,
} from "lucide-react";
import type { MandateListItem } from "@/components/atlas/v2/types";

interface RunListItem {
  id: string;
  goal: string;
  status: "running" | "complete" | "error" | "aborted";
  iterations: number;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  mandate: { id: string; name: string; clientName: string | null } | null;
  /* Sprint C1 — fork lineage. Both null for original (non-forked) runs;
     both set for forked runs. Surfaced as "↪ from XXXXXXXX@N" badge. */
  parentRunId: string | null;
  forkedFromStep: number | null;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `vor ${hr} h`;
  const d = Math.round(hr / 24);
  if (d < 7) return `vor ${d} d`;
  return new Date(iso).toLocaleDateString("de-DE");
}

function durationLabel(start: string, end: string | null): string | null {
  if (!end) return null;
  const sec = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 1000,
  );
  if (sec < 60) return `${sec}s`;
  return `${Math.round(sec / 60)}min`;
}

export default function AgentHistoryPage() {
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [mandates, setMandates] = useState<MandateListItem[]>([]);
  const [filterMandate, setFilterMandate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMandate) params.set("mandateId", filterMandate);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/atlas/agent/runs?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { runs: RunListItem[] };
      setRuns(data.runs ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMandate, filterStatus]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/atlas/mandate", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { mandates: MandateListItem[] };
        setMandates(data.mandates ?? []);
      } catch {
        /* mandate-list optional */
      }
    })();
  }, []);

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto px-6 py-8">
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          <Cpu size={11} />
          Agent-History
        </div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-100 [font-family:ui-serif,Georgia,'Cambria_Style',serif]">
            Vergangene Agent-Runs
          </h1>
          <Link
            href="/atlas/agent"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            Neuer Agent-Run
          </Link>
        </div>
        <p className="mt-1 text-[13px] text-slate-500">
          Audit-Trail aller autonomen Agent-Ausführungen. Click auf einen Run
          zeigt Steps, Artifacts, Citations + komplettes Reasoning — ohne neue
          Anthropic-Kosten.
        </p>
      </header>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <span className="text-[10.5px] uppercase tracking-wider text-slate-500">
          Filter:
        </span>
        <select
          value={filterMandate}
          onChange={(e) => setFilterMandate(e.target.value)}
          className="rounded-md bg-transparent px-2 py-1 text-[12px] text-slate-900 outline-none dark:text-slate-100"
        >
          <option value="">Alle Mandate</option>
          {mandates.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md bg-transparent px-2 py-1 text-[12px] text-slate-900 outline-none dark:text-slate-100"
        >
          <option value="">Alle Status</option>
          <option value="complete">✓ Komplett</option>
          <option value="error">✗ Fehler</option>
          <option value="running">⟳ Läuft</option>
          <option value="aborted">⊘ Abgebrochen</option>
        </select>
        <span className="ml-auto text-[11px] text-slate-500">
          {runs.length} Run{runs.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[12.5px] text-slate-500">
          <Loader2 size={14} className="mr-2 animate-spin" />
          Lädt…
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-[12.5px] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.02]">
          Noch keine Agent-Runs.{" "}
          <Link
            href="/atlas/agent"
            className="text-emerald-700 hover:underline dark:text-emerald-300"
          >
            Ersten Run starten
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((r) => (
            <RunRow key={r.id} run={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RunRow({ run }: { run: RunListItem }) {
  const tone =
    run.status === "complete"
      ? {
          icon: <CheckCircle2 size={13} />,
          color: "text-emerald-600 dark:text-emerald-400",
          label: "Komplett",
        }
      : run.status === "error"
        ? {
            icon: <AlertCircle size={13} />,
            color: "text-red-600 dark:text-red-400",
            label: "Fehler",
          }
        : run.status === "running"
          ? {
              icon: <Loader2 size={13} className="animate-spin" />,
              color: "text-blue-600 dark:text-blue-400",
              label: "Läuft",
            }
          : {
              icon: <AlertCircle size={13} />,
              color: "text-slate-500",
              label: "Abgebrochen",
            };

  const dur = durationLabel(run.startedAt, run.completedAt);

  return (
    <Link
      href={`/atlas/agent/history/${run.id}`}
      className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:border-white/[0.15] dark:hover:bg-white/[0.04]"
    >
      <span className={`mt-0.5 shrink-0 ${tone.color}`}>{tone.icon}</span>
      <div className="min-w-0 flex-1">
        {/* Sprint C1 — lineage badge for forked runs. Displayed ABOVE
            the goal-line so it's visible at the row's top-edge. */}
        {run.parentRunId && run.forkedFromStep && (
          <div className="mb-1 inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
            <ChevronRight size={9} className="rotate-180" />
            from{" "}
            <span className="font-mono">{run.parentRunId.slice(0, 8)}</span>@
            {run.forkedFromStep}
          </div>
        )}
        <div className="line-clamp-2 text-[13px] text-slate-900 dark:text-slate-100">
          {run.goal}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10.5px] text-slate-500">
          <span className={tone.color}>{tone.label}</span>
          <span>·</span>
          <span>{timeAgo(run.startedAt)}</span>
          {dur && (
            <>
              <span>·</span>
              <span>{dur}</span>
            </>
          )}
          {run.iterations > 0 && (
            <>
              <span>·</span>
              <span>
                {run.iterations} Iteration{run.iterations === 1 ? "" : "en"}
              </span>
            </>
          )}
          {run.costUsd !== null && (
            <>
              <span>·</span>
              <span className="tabular-nums">${run.costUsd.toFixed(4)}</span>
            </>
          )}
          {run.mandate && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Briefcase size={9} />
                {run.mandate.name}
              </span>
            </>
          )}
        </div>
        {run.errorMessage && (
          <div className="mt-1 line-clamp-1 text-[10.5px] text-red-600 dark:text-red-400">
            {run.errorMessage}
          </div>
        )}
      </div>
      <ChevronRight size={13} className="mt-0.5 shrink-0 text-slate-400" />
    </Link>
  );
}
