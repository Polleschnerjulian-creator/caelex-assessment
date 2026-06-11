"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Mandate Time-Entries UI block.
 *
 * Quick log-time form + recent-entries list. Per-mandate. Sums up
 * total + billable minutes + billable Euro at the top so the
 * lawyer sees the running total at a glance.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  Loader2,
  Plus,
  MessageSquare,
  AlertCircle,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Check,
  X,
} from "lucide-react";

interface TimeEntry {
  id: string;
  minutes: number;
  description: string;
  billable: boolean;
  hourlyRateEur: number | null;
  workedOn: string;
  chatId: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
}

interface Totals {
  minutes: number;
  billableMinutes: number;
  billableEur: number;
}

interface Props {
  mandateId: string;
  disabled?: boolean;
  /** PERF-T1-1 step 2: pre-fetched entries from the aggregator endpoint.
   *  Used as a seed for instant first paint. We still fetch in the
   *  background because aggregator's per-source cap (25) can under-count
   *  totals for long-running mandates — the server-computed totals come
   *  ~100ms after first paint and overwrite the client-computed totals. */
  initialData?: unknown[];
}

/* Helper: compute totals strip values client-side from the visible
   entries array. Used to seed the totals state when parent provides
   initialData (so the totals strip renders something meaningful in
   the same frame as the entries list). The server-side reload still
   overwrites these with the authoritative aggregate computed across
   ALL entries (not just the first 25 the aggregator caps to). */
function computeTotalsFromEntries(entries: TimeEntry[]): Totals {
  let minutes = 0;
  let billableMinutes = 0;
  let billableEur = 0;
  for (const e of entries) {
    minutes += e.minutes;
    if (e.billable) {
      billableMinutes += e.minutes;
      if (e.hourlyRateEur) {
        billableEur += (e.minutes / 60) * e.hourlyRateEur;
      }
    }
  }
  return { minutes, billableMinutes, billableEur };
}

const INPUT_CLASS =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none transition-colors focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500";

export function MandateTimeEntries({
  mandateId,
  disabled,
  initialData,
}: Props) {
  /* PERF-T1-1 step 2: seed entries + totals from initialData. The
     entries useState gets the cast directly; totals get computed
     client-side via the helper so the totals strip renders in the
     same frame as the entries (instead of flashing 0/0/0 first). */
  const initialEntries = (initialData as TimeEntry[] | undefined) ?? [];
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);
  const [totals, setTotals] = useState<Totals>(() =>
    computeTotalsFromEntries(initialEntries),
  );
  const [loading, setLoading] = useState(!initialData);
  const [adding, setAdding] = useState(false);
  /* AUDIT-FIX 2026-05-19: reload() referenced setError without an
     error-state declaration — a latent crash on the first network
     error. Adding the state + an inline error banner closes the
     loop H17 was trying to address. */
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [minutes, setMinutes] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [rate, setRate] = useState<number | "">(280);
  /* M-a fix (2026-06-11): add-form errors get their own state so the
     failure renders INSIDE the form (inputs stay filled for retry)
     instead of vanishing silently. */
  const [formError, setFormError] = useState<string | null>(null);
  /* Edit/Delete (abrechnungsfest): pencil → inline edit form, trash →
     inline confirm (kein Browser-confirm). One id at a time each. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    /* AUDIT-FIX H17 (2026-05-17): surface fetch errors instead of
       silently returning empty — lawyer needs to know about broken
       state vs genuinely empty. */
    setError(null);
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/time-entries`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError(
          `Stundeneinträge konnten nicht geladen werden (HTTP ${res.status}).`,
        );
        return;
      }
      const data = (await res.json()) as {
        entries: TimeEntry[];
        totals: Totals;
      };
      setEntries(data.entries ?? []);
      setTotals(
        data.totals ?? { minutes: 0, billableMinutes: 0, billableEur: 0 },
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? `Netzwerk-Fehler: ${e.message}`
          : "Netzwerk-Fehler beim Laden.",
      );
    } finally {
      setLoading(false);
    }
  }, [mandateId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minutes || !description.trim()) return;
    setAdding(true);
    setFormError(null);
    try {
      /* M-a fix (2026-06-11): the previous version ignored res.ok — a
         403/429/500 cleared the form and closed it as if saved (silent
         loss of the entry). Now: error renders in the form, inputs
         stay filled for retry; only a confirmed 2xx clears them. */
      const res = await fetch(`/api/atlas/mandate/${mandateId}/time-entries`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          minutes: Number(minutes),
          description: description.trim(),
          billable,
          hourlyRateEur: billable && rate ? Number(rate) : undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setFormError(
          body.error || `Speichern fehlgeschlagen (HTTP ${res.status}).`,
        );
        return;
      }
      setMinutes("");
      setDescription("");
      setFormOpen(false);
      await reload();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? `Netzwerk-Fehler: ${err.message}`
          : "Netzwerk-Fehler beim Speichern.",
      );
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    setBusyId(entryId);
    setError(null);
    try {
      const res = await fetch(
        `/api/atlas/mandate/${mandateId}/time-entries/${entryId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error || `Löschen fehlgeschlagen (HTTP ${res.status}).`);
        return;
      }
      setConfirmingId(null);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? `Netzwerk-Fehler: ${err.message}`
          : "Netzwerk-Fehler beim Löschen.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const fmtMins = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h === 0) return `${min}m`;
    return `${h}h ${min.toString().padStart(2, "0")}m`;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-900/40">
      {/* Card head — DATEV-Export Einstieg. Dezent (gleicher Stil wie
          „Akte exportieren" im Mandats-Header); der Export selbst lebt
          auf /atlas/exports/datev mit Zeitraum-/Mandats-Filter. */}
      <div className="mb-2 flex items-center justify-end">
        <Link
          href="/atlas/exports/datev"
          className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
        >
          <FileSpreadsheet size={11} />
          Export (DATEV)
        </Link>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {/* Totals strip */}
      <div className="mb-3 grid grid-cols-3 gap-2 rounded bg-slate-50 px-3 py-2 dark:bg-white/[0.02]">
        <Stat label="Gesamt" value={fmtMins(totals.minutes)} />
        <Stat label="Abrechenbar" value={fmtMins(totals.billableMinutes)} />
        <Stat
          label="€"
          value={
            totals.billableEur > 0 ? `€${totals.billableEur.toFixed(0)}` : "—"
          }
        />
      </div>

      {/* Entries */}
      {loading && entries.length === 0 ? (
        <p className="text-xs text-slate-500">
          <Loader2
            size={11}
            className="mr-1.5 inline animate-spin motion-reduce:animate-none"
          />{" "}
          Lädt Einträge…
        </p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-slate-500">
          Noch keine Zeiteinträge für dieses Mandat.
        </p>
      ) : (
        <ul className="mb-3 max-h-[280px] space-y-1 overflow-y-auto">
          {entries.map((e) =>
            editingId === e.id ? (
              <li key={e.id} className="rounded px-1.5 py-1.5 text-[12.5px]">
                <EntryEditForm
                  mandateId={mandateId}
                  entry={e}
                  onCancel={() => setEditingId(null)}
                  onSaved={async () => {
                    setEditingId(null);
                    await reload();
                  }}
                />
              </li>
            ) : (
              <li
                key={e.id}
                className="flex items-start gap-2 rounded px-1.5 py-1.5 text-[12.5px] hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <Clock
                  size={11}
                  className={`mt-0.5 shrink-0 ${
                    e.billable
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-slate-900 dark:text-slate-100">
                    {e.description}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10.5px] text-slate-500">
                    <span className="font-medium tabular-nums">
                      {fmtMins(e.minutes)}
                    </span>
                    {e.billable && e.hourlyRateEur ? (
                      <span>· €{e.hourlyRateEur}/h</span>
                    ) : !e.billable ? (
                      <span>· nicht abrechenbar</span>
                    ) : null}
                    <span>
                      · {new Date(e.workedOn).toLocaleDateString("de-DE")}
                    </span>
                    <span>· {e.user.name || e.user.email}</span>
                    {e.chatId && (
                      <span className="inline-flex items-center gap-0.5">
                        <MessageSquare size={9} /> Chat
                      </span>
                    )}
                  </div>
                </div>
                {/* Aktionen: Stift → Inline-Edit, Papierkorb → Inline-
                    Confirm (Muster: trash→setConfirmingId). Bei
                    archivierten/geschlossenen Mandaten (disabled)
                    komplett ausgeblendet. */}
                {!disabled &&
                  (confirmingId === e.id ? (
                    <span className="flex shrink-0 items-center gap-1.5 text-[10.5px]">
                      <span className="text-slate-500">Löschen?</span>
                      <button
                        type="button"
                        onClick={() => void handleDelete(e.id)}
                        disabled={busyId === e.id}
                        className="rounded px-1.5 py-0.5 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        {busyId === e.id ? (
                          <Loader2
                            size={10}
                            className="animate-spin motion-reduce:animate-none"
                          />
                        ) : (
                          "Ja"
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        disabled={busyId === e.id}
                        className="rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                      >
                        Abbrechen
                      </button>
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmingId(null);
                          setEditingId(e.id);
                        }}
                        disabled={busyId !== null}
                        title="Bearbeiten"
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(e.id)}
                        disabled={busyId !== null}
                        title="Löschen"
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <Trash2 size={11} />
                      </button>
                    </span>
                  ))}
              </li>
            ),
          )}
        </ul>
      )}

      {/* Add form */}
      {formOpen ? (
        <form
          onSubmit={handleAdd}
          className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700/40"
        >
          {/* AUDIT-FIX M19 (2026-05-17): responsive — wrap to column
              on very narrow screens (<360px). Was flex-row-only causing
              the 96px minutes-input + flex-1 description to clip. */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(e) =>
                setMinutes(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="Minuten"
              aria-label="Dauer in Minuten"
              required
              className={`w-full sm:w-24 ${INPUT_CLASS}`}
              disabled={adding}
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. Vertragsentwurf gegengelesen"
              aria-label="Tätigkeitsbeschreibung"
              required
              maxLength={500}
              className={`flex-1 ${INPUT_CLASS}`}
              disabled={adding}
            />
          </div>
          {/* M-a fix: Fehler INNERHALB des Formulars anzeigen — die
              Eingaben bleiben stehen, der Anwalt kann direkt erneut
              speichern. */}
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            >
              <AlertCircle size={11} className="mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="h-3.5 w-3.5 accent-slate-900 dark:accent-emerald-500"
              />
              Abrechenbar
            </label>
            {billable && (
              <label className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                <span>€/h:</span>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  value={rate}
                  onChange={(e) =>
                    setRate(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className={`w-16 ${INPUT_CLASS}`}
                  disabled={adding}
                />
              </label>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setFormError(null);
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!minutes || !description.trim() || adding}
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
              Speichern
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-30 dark:hover:text-slate-200"
        >
          <Plus size={11} />
          Zeit erfassen
        </button>
      )}
    </div>
  );
}

/* ── EntryEditForm — Inline-Edit für einen bestehenden Eintrag ────────
   Spiegelt das Add-Formular (Minuten, Beschreibung, Abrechenbar, Satz)
   + Datum (workedOn). PATCH auf die [entryId]-Detailroute; Fehler
   bleiben im Formular, Eingaben werden bei Fehlern NICHT verworfen. */
function EntryEditForm({
  mandateId,
  entry,
  onCancel,
  onSaved,
}: {
  mandateId: string;
  entry: TimeEntry;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [minutes, setMinutes] = useState<number | "">(entry.minutes);
  const [description, setDescription] = useState(entry.description);
  const [billable, setBillable] = useState(entry.billable);
  const [rate, setRate] = useState<number | "">(entry.hourlyRateEur ?? "");
  const [workedOn, setWorkedOn] = useState<string>(() => {
    const d = new Date(entry.workedOn);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minutes || !description.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/atlas/mandate/${mandateId}/time-entries/${entry.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            minutes: Number(minutes),
            description: description.trim(),
            billable,
            hourlyRateEur: billable && rate !== "" ? Number(rate) : null,
            ...(workedOn ? { workedOn: new Date(workedOn).toISOString() } : {}),
          }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          body.error || `Speichern fehlgeschlagen (HTTP ${res.status}).`,
        );
        return;
      }
      await onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? `Netzwerk-Fehler: ${err.message}`
          : "Netzwerk-Fehler beim Speichern.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="space-y-2 rounded-md border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-700/60 dark:bg-slate-950/40"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="number"
          min={1}
          max={1440}
          value={minutes}
          onChange={(e) =>
            setMinutes(e.target.value === "" ? "" : Number(e.target.value))
          }
          placeholder="Minuten"
          aria-label="Dauer in Minuten"
          required
          className={`w-full sm:w-24 ${INPUT_CLASS}`}
          disabled={saving}
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tätigkeitsbeschreibung"
          aria-label="Tätigkeitsbeschreibung"
          required
          maxLength={500}
          className={`flex-1 ${INPUT_CLASS}`}
          disabled={saving}
        />
        <input
          type="date"
          value={workedOn}
          onChange={(e) => setWorkedOn(e.target.value)}
          aria-label="Datum der Tätigkeit"
          className={`w-full sm:w-36 ${INPUT_CLASS}`}
          disabled={saving}
        />
      </div>
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle size={11} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            className="h-3.5 w-3.5 accent-slate-900 dark:accent-emerald-500"
          />
          Abrechenbar
        </label>
        {billable && (
          <label className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
            <span>€/h:</span>
            <input
              type="number"
              min={0}
              max={5000}
              value={rate}
              onChange={(e) =>
                setRate(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={`w-16 ${INPUT_CLASS}`}
              disabled={saving}
            />
          </label>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 disabled:opacity-50 dark:hover:text-slate-300"
        >
          <X size={10} />
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={!minutes || !description.trim() || saving}
          className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-30 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          {saving ? (
            <Loader2
              size={11}
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <Check size={11} />
          )}
          Aktualisieren
        </button>
      </div>
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9.5px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="text-[13px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}
