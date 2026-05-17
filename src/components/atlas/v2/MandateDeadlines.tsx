"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate Deadlines UI block.
 *
 * Renders the deadline list for one mandate. Each row: title +
 * dueAt + warnDays + status toggle + remove. Add-form at the bottom
 * with a quick-set ("in 7d / in 14d / in 30d / custom").
 *
 * Warning state computed client-side: rows whose dueAt is within
 * warnDays of now AND still status==="open" get an amber pill.
 * Past-due rows get red.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState, useCallback } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  ExternalLink,
  X,
} from "lucide-react";

interface DeadlineRecord {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  warnDays: number;
  status: string; // "open" | "done"
  url: string | null;
  createdAt: string;
}

interface Props {
  mandateId: string;
  disabled?: boolean;
}

const INPUT_CLASS =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none transition-colors focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500";

export function MandateDeadlines({ mandateId, disabled }: Props) {
  const [deadlines, setDeadlines] = useState<DeadlineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [warnDays, setWarnDays] = useState(7);

  const reload = useCallback(async () => {
    setLoading(true);
    /* AUDIT-FIX H17 (2026-05-17): clear stale error before fetch,
       surface network/server errors instead of silently returning
       empty list — lawyer needs to know if the section is broken
       vs genuinely empty. */
    setError(null);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/deadlines`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError(`Fristen konnten nicht geladen werden (HTTP ${res.status}).`);
        return;
      }
      const data = (await res.json()) as { deadlines: DeadlineRecord[] };
      setDeadlines(data.deadlines ?? []);
    } catch (e) {
      setError(
        e instanceof Error
          ? `Netzwerk-Fehler beim Laden der Fristen: ${e.message}`
          : "Netzwerk-Fehler beim Laden der Fristen.",
      );
    } finally {
      setLoading(false);
    }
  }, [mandateId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /* AUDIT-FIX 2026-05-17: listen for the suggestion-accepted event so a
     newly accepted deadline-suggestion appears in this list without the
     user having to reload. Dispatched by MandateDeadlineSuggestions after
     a successful accept. */
  useEffect(() => {
    const onRefresh = () => void reload();
    window.addEventListener("atlas:mandate-deadlines-refresh", onRefresh);
    return () =>
      window.removeEventListener("atlas:mandate-deadlines-refresh", onRefresh);
  }, [reload]);

  const quickSet = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(17, 0, 0, 0);
    /* Format as YYYY-MM-DDTHH:mm for the datetime-local input. */
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    setDueAt(`${yyyy}-${mm}-${dd}T${hh}:${mi}`);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueAt) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/deadlines`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dueAt: new Date(dueAt).toISOString(),
          warnDays,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setTitle("");
      setDueAt("");
      setWarnDays(7);
      setFormOpen(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  };

  const toggleStatus = async (d: DeadlineRecord) => {
    const nextStatus = d.status === "open" ? "done" : "open";
    /* Optimistic update — flip locally first, server-confirms. */
    setDeadlines((list) =>
      list.map((x) => (x.id === d.id ? { ...x, status: nextStatus } : x)),
    );
    try {
      await fetch(`/api/atlas/mandate/${mandateId}/deadlines/${d.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {
      void reload();
    }
  };

  const handleDelete = async (d: DeadlineRecord) => {
    if (!confirm(`Frist „${d.title}" wirklich löschen?`)) return;
    setDeadlines((list) => list.filter((x) => x.id !== d.id));
    try {
      await fetch(`/api/atlas/mandate/${mandateId}/deadlines/${d.id}`, {
        method: "DELETE",
      });
    } catch {
      void reload();
    }
  };

  /* Compute per-row status — needed both for sort + per-row pill. */
  const rows = deadlines.map((d) => {
    const due = new Date(d.dueAt).getTime();
    const now = Date.now();
    const daysToGo = Math.ceil((due - now) / (24 * 60 * 60 * 1000));
    const isPast = d.status === "open" && daysToGo < 0;
    const isWarning =
      d.status === "open" && daysToGo >= 0 && daysToGo <= d.warnDays;
    return { ...d, daysToGo, isPast, isWarning };
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
      {loading && rows.length === 0 ? (
        <p className="text-xs text-slate-500">Lädt Fristen…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-slate-500">
          Noch keine Fristen für dieses Mandat.
        </p>
      ) : (
        <ul className="mb-3 divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((d) => (
            <li key={d.id} className="flex items-start gap-2 py-2 text-[13px]">
              <button
                type="button"
                onClick={() => toggleStatus(d)}
                title={d.status === "done" ? "Wieder öffnen" : "Erledigt"}
                aria-label={d.status === "done" ? "Wieder öffnen" : "Erledigt"}
                className="mt-0.5 shrink-0"
              >
                {d.status === "done" ? (
                  <CheckCircle2
                    size={14}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                ) : (
                  <Circle
                    size={14}
                    className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                  />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div
                  className={`line-clamp-2 ${
                    d.status === "done"
                      ? "text-slate-400 line-through dark:text-slate-600"
                      : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {d.title}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10.5px]">
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <CalendarClock size={9} />
                    {new Date(d.dueAt).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {d.status === "open" && d.isPast && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0 text-red-700 dark:bg-red-500/10 dark:text-red-300">
                      <AlertTriangle size={9} />
                      {Math.abs(d.daysToGo)} Tage überfällig
                    </span>
                  )}
                  {d.status === "open" && d.isWarning && (
                    <span className="rounded-full bg-amber-50 px-1.5 py-0 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                      in {d.daysToGo} Tag{d.daysToGo === 1 ? "" : "en"}
                    </span>
                  )}
                  {d.url && (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-300"
                    >
                      <ExternalLink size={9} />
                      Portal
                    </a>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(d)}
                title="Frist löschen"
                aria-label="Frist löschen"
                className="shrink-0 text-slate-400 hover:text-red-600 disabled:opacity-30 dark:text-slate-500 dark:hover:text-red-400"
                disabled={disabled}
              >
                <Trash2 size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {formOpen ? (
        <form
          onSubmit={handleAdd}
          className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700/40"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-500">
              Neue Frist
            </span>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setError(null);
              }}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              aria-label="Abbrechen"
            >
              <X size={12} />
            </button>
          </div>
          <input
            type="text"
            placeholder="z.B. BNetzA-Antrag einreichen"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            className={INPUT_CLASS}
            disabled={adding}
          />
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              required
              className={`flex-1 ${INPUT_CLASS}`}
              disabled={adding}
            />
            <input
              type="number"
              min={0}
              max={180}
              value={warnDays}
              onChange={(e) => setWarnDays(Number(e.target.value))}
              title="Vorwarnung (Tage)"
              className={`w-20 ${INPUT_CLASS}`}
              disabled={adding}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[7, 14, 30, 60].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => quickSet(d)}
                className="rounded-full border border-slate-200 px-2 py-0.5 text-[10.5px] text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:bg-slate-900"
              >
                in {d}d
              </button>
            ))}
            <div className="flex-1" />
            <button
              type="submit"
              disabled={!title.trim() || !dueAt || adding}
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-30 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {adding ? (
                <Loader2
                  size={11}
                  className="animate-spin motion-reduce:animate-none"
                />
              ) : (
                <Plus size={11} />
              )}
              Hinzufügen
            </button>
          </div>
          {error && (
            <p className="text-[11px] text-red-500 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-30 dark:hover:text-slate-200"
        >
          <Plus size={11} />
          Frist hinzufügen
        </button>
      )}
    </div>
  );
}
