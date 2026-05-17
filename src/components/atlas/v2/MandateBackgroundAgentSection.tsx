"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint E1 — MandateDetailView Background-Agent Section.
 * ────────────────────────────────────────────────────────────────────
 * Inline UI für die D3 background-agent settings. Rendert sich als
 * neue Sektion `<section id="background-agent">` in der existierenden
 * single-page-scroll Layout der MandateDetailView.
 *
 * 4 States:
 *   1. Loading — Skeleton während initialer GET
 *   2. Empty / Disabled — Headline + CTA "Konfigurieren"
 *   3. Configured + Enabled — Status-Card mit Schedule / Goal / Next-
 *      Run / Last-Run / Recent-3-Runs / Halt-Banner
 *   4. Editing — Inline-Editor mit Schedule-Select + Goal-Textarea
 *
 * Backend endpoints (existieren seit D3):
 *   GET /api/atlas/mandate/[id]/background-agent
 *   PUT /api/atlas/mandate/[id]/background-agent
 *
 * Plus: GET /api/atlas/agent/runs?mandateId=X&templateId=background-agent&limit=3
 * (templateId-filter ist E1's API-tweak — geliefert durch Agent D).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Cpu,
  Edit2,
  Pause,
  Play,
} from "lucide-react";

type Schedule = "daily" | "weekly" | "every-6h" | "every-12h";

interface BackgroundAgentSettings {
  enabled: boolean;
  schedule: Schedule | null;
  goal: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

interface RecentRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  costUsd: number | null;
  iterations: number;
}

const SCHEDULE_LABELS: Record<Schedule, string> = {
  "every-6h": "alle 6h",
  "every-12h": "alle 12h",
  daily: "täglich",
  weekly: "wöchentlich",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  const minutes = Math.round(Math.abs(ms) / 60_000);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  if (ms < 0) {
    if (minutes < 60) return `vor ${minutes} min`;
    if (hours < 24) return `vor ${hours}h`;
    return `vor ${days}d`;
  }
  if (minutes < 60) return `in ${minutes} min`;
  if (hours < 24) return `in ${hours}h`;
  return `in ${days}d`;
}

export function MandateBackgroundAgentSection({
  mandateId,
}: {
  mandateId: string;
}) {
  const [settings, setSettings] = useState<BackgroundAgentSettings | null>(
    null,
  );
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editSchedule, setEditSchedule] = useState<Schedule>("daily");
  const [editGoal, setEditGoal] = useState("");

  const reload = async () => {
    try {
      const [settingsRes, runsRes] = await Promise.all([
        fetch(`/api/atlas/mandate/${mandateId}/background-agent`, {
          cache: "no-store",
        }),
        fetch(
          `/api/atlas/agent/runs?mandateId=${mandateId}&templateId=background-agent&limit=3`,
          { cache: "no-store" },
        ),
      ]);
      if (settingsRes.ok) {
        const data = (await settingsRes.json()) as BackgroundAgentSettings;
        setSettings(data);
        if (data.schedule) setEditSchedule(data.schedule);
        if (data.goal) setEditGoal(data.goal);
      }
      if (runsRes.ok) {
        const data = (await runsRes.json()) as { runs: RecentRun[] };
        setRecentRuns(data.runs ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandateId]);

  const handleSave = async (enabled: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const body: {
        enabled: boolean;
        schedule?: Schedule;
        goal?: string;
      } = { enabled };
      if (enabled) {
        body.schedule = editSchedule;
        body.goal = editGoal;
      }
      const res = await fetch(
        `/api/atlas/mandate/${mandateId}/background-agent`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setError(errBody.error || `Speichern fehlgeschlagen (${res.status})`);
        setSaving(false);
        return;
      }
      const data = (await res.json()) as BackgroundAgentSettings;
      setSettings(data);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const lastRun = recentRuns[0];
  const isHalted = lastRun?.status === "awaiting_approval";

  return (
    <section id="background-agent" className="mb-8 scroll-mt-20">
      <h2 className="mb-3 text-[14px] font-semibold text-slate-900 dark:text-slate-100">
        Hintergrund-Agent
      </h2>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-[12.5px] text-slate-500 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <Loader2 size={14} className="mr-2 inline animate-spin" />
          Lädt…
        </div>
      ) : !settings ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[12.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          Fehler beim Laden: {error}
        </div>
      ) : !settings.enabled && !editing ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="mb-2 text-[12.5px] text-slate-600 dark:text-slate-400">
            Hintergrund-Agent ist deaktiviert. Atlas kann periodische
            Recherchen, Monitoring-Tasks oder Status-Snapshots für dieses Mandat
            autonom ausführen.
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            <Play size={11} />
            Konfigurieren …
          </button>
        </div>
      ) : editing ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11.5px] font-medium text-slate-700 dark:text-slate-300">
                Schedule
              </label>
              <select
                value={editSchedule}
                onChange={(e) => setEditSchedule(e.target.value as Schedule)}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[12.5px] text-slate-900 dark:border-white/[0.10] dark:bg-transparent dark:text-slate-100"
              >
                {(Object.keys(SCHEDULE_LABELS) as Schedule[]).map((k) => (
                  <option key={k} value={k}>
                    {SCHEDULE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] font-medium text-slate-700 dark:text-slate-300">
                Ziel ({editGoal.length}/4000 Zeichen)
              </label>
              <textarea
                value={editGoal}
                onChange={(e) => setEditGoal(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="z.B. 'Prüfe wöchentlich neue NIS2-Transpositions-Acts in DE und drafte eine Outline für Auswirkungen auf diesen Mandanten.'"
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-[12.5px] text-slate-900 dark:border-white/[0.10] dark:bg-transparent dark:text-slate-100"
              />
            </div>
            {error && (
              <div className="text-[11.5px] text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSave(true)}
                disabled={
                  saving || editGoal.trim().length < 10 || !editSchedule
                }
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {saving && <Loader2 size={11} className="animate-spin" />}
                Speichern
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                disabled={saving}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.10] dark:text-slate-300"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {isHalted && (
            <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
              <ShieldAlert
                size={14}
                className="mt-0.5 shrink-0 text-red-700 dark:text-red-300"
              />
              <div className="flex-1 text-[12.5px] text-red-800 dark:text-red-200">
                <strong>Letzter Lauf wartet auf deine Freigabe.</strong> Atlas
                hat einen dangerous tool ausführen wollen und pausiert bis Du
                entscheidest.
              </div>
              <Link
                href={`/atlas/agent?resumeRunId=${lastRun.id}`}
                className="shrink-0 rounded-md bg-red-600 px-2.5 py-1 text-[11.5px] font-medium text-white hover:bg-red-700"
              >
                → Jetzt freigeben
              </Link>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12.5px]">
                <CheckCircle2
                  size={13}
                  className="text-emerald-600 dark:text-emerald-400"
                />
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Aktiv · {SCHEDULE_LABELS[settings.schedule!]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11.5px] text-slate-700 hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-300"
                >
                  <Edit2 size={10} />
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave(false)}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11.5px] text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-white/[0.10] dark:text-slate-300"
                >
                  <Pause size={10} />
                  Deaktivieren
                </button>
              </div>
            </div>

            <div className="space-y-2 text-[12.5px]">
              <div>
                <span className="text-slate-500">Ziel: </span>
                <span className="text-slate-800 dark:text-slate-200">
                  {settings.goal}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-500">
                <span>Nächster Lauf: {relativeTime(settings.nextRunAt)}</span>
                {settings.lastRunAt && (
                  <span>Letzter Lauf: {relativeTime(settings.lastRunAt)}</span>
                )}
              </div>
            </div>

            {recentRuns.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-3 dark:border-white/[0.08]">
                <div className="mb-2 text-[10.5px] uppercase tracking-wider text-slate-500">
                  Letzte {recentRuns.length} Runs
                </div>
                <div className="space-y-1.5">
                  {recentRuns.map((r) => (
                    <Link
                      key={r.id}
                      href={`/atlas/agent/history/${r.id}`}
                      className="flex items-center gap-2 rounded-md px-2 py-1 text-[11.5px] hover:bg-slate-50 dark:hover:bg-white/[0.05]"
                    >
                      <Cpu
                        size={10}
                        className={
                          r.status === "complete"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : r.status === "awaiting_approval"
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-400"
                        }
                      />
                      <span className="font-mono text-[10.5px] text-slate-500">
                        {new Date(r.startedAt).toLocaleString("de-DE", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {r.status}
                      </span>
                      {r.costUsd !== null && (
                        <span className="ml-auto font-mono text-[10.5px] text-slate-400">
                          ${r.costUsd.toFixed(4)} · {r.iterations} iter
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/atlas/agent/history?mandateId=${mandateId}&templateId=background-agent`}
                  className="mt-2 inline-block text-[11px] text-emerald-700 hover:underline dark:text-emerald-300"
                >
                  Alle Background-Runs zeigen →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
