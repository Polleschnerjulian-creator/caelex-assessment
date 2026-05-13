"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — DATEV-Anwaltsabrechnung Export-Page.
 *
 * Filter-form + 1-Click-Download für Quartal-Stundenabrechnungen.
 * Picks date-range (from/to) + optional mandate-filter + billable-
 * toggle, then GETs /api/atlas/timetracking/datev-export with the
 * selected params. Browser triggers the CSV download natively.
 *
 * Use cases:
 *   - Quartal-Abrechnung: from=2026-04-01 to=2026-06-30
 *   - Mandant-Honorar: mandateId=cuid + Datum nach Bedarf
 *   - Alle billable-Entries dieser Woche: billableOnly + 7-day-range
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, Briefcase, Loader2 } from "lucide-react";
import type { MandateListItem } from "@/components/atlas/v2/types";

/* Helper: ISO date YYYY-MM-DD for the start of the current quarter
   so the form pre-fills sensibly. */
function currentQuarterStart(): string {
  const now = new Date();
  const month = now.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const d = new Date(now.getFullYear(), quarterStartMonth, 1);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DatevExportPage() {
  const [from, setFrom] = useState(currentQuarterStart());
  const [to, setTo] = useState(todayISO());
  const [mandateId, setMandateId] = useState("");
  const [billableOnly, setBillableOnly] = useState(true);
  const [mandates, setMandates] = useState<MandateListItem[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (mandateId) params.set("mandateId", mandateId);
      params.set("billableOnly", billableOnly ? "true" : "false");
      const url = `/api/atlas/timetracking/datev-export?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Download fehlgeschlagen (${res.status})`);
        return;
      }
      /* Pull the filename out of the content-disposition header, fall
         back to a sensible default. */
      const cd = res.headers.get("content-disposition") ?? "";
      const m = /filename="([^"]+)"/.exec(cd);
      const filename = m?.[1] ?? `caelex-stunden-${from}_${to}.csv`;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-6 py-8">
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500">
          <FileSpreadsheet size={11} />
          DATEV-Export
        </div>
        <h1 className="text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-100 [font-family:ui-serif,Georgia,'Cambria_Style',serif]">
          Stundenabrechnung exportieren
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Erstellt eine DATEV-Anwaltsabrechnung-konforme CSV mit allen
          Stundeneinträgen im gewählten Zeitraum. Direkt importierbar in DATEV
          oder Excel.
        </p>
      </header>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.02]">
        {/* Date range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-slate-600 dark:text-slate-400">
              Von
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-slate-400 dark:border-white/[0.10] dark:bg-[#1a1a1a] dark:text-slate-100 dark:focus:border-white/[0.20]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-slate-600 dark:text-slate-400">
              Bis
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-slate-400 dark:border-white/[0.10] dark:bg-[#1a1a1a] dark:text-slate-100 dark:focus:border-white/[0.20]"
            />
          </div>
        </div>

        {/* Quick-range buttons */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Aktuelles Quartal", action: () => setQuickRange("Q") },
            { label: "Letztes Quartal", action: () => setQuickRange("Q-1") },
            { label: "Aktueller Monat", action: () => setQuickRange("M") },
            { label: "Letzter Monat", action: () => setQuickRange("M-1") },
            { label: "Aktuelles Jahr", action: () => setQuickRange("Y") },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={b.action}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/[0.10] dark:text-slate-400 dark:hover:bg-white/[0.05]"
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Mandate filter */}
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[11.5px] font-medium text-slate-600 dark:text-slate-400">
            <Briefcase size={11} />
            Mandat (optional)
          </label>
          <select
            value={mandateId}
            onChange={(e) => setMandateId(e.target.value)}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-slate-400 dark:border-white/[0.10] dark:bg-[#1a1a1a] dark:text-slate-100 dark:focus:border-white/[0.20]"
          >
            <option value="">Alle Mandate</option>
            {mandates.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.clientName ? ` — ${m.clientName}` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Billable toggle */}
        <label className="flex items-center gap-2 text-[12.5px] text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={billableOnly}
            onChange={(e) => setBillableOnly(e.target.checked)}
            className="h-4 w-4 accent-slate-900 dark:accent-emerald-500"
          />
          <span>Nur abrechenbare Einträge (empfohlen für DATEV-Import)</span>
        </label>

        {/* Download */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/[0.05]">
          <span className="text-[11px] text-slate-500">
            UTF-8 BOM · Semikolon-Separator · Deutsche Lokalisierung
          </span>
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-30 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            {downloading ? (
              <>
                <Loader2 size={11} className="animate-spin" />
                Erstellt CSV…
              </>
            ) : (
              <>
                <Download size={11} />
                CSV herunterladen
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Spalten-Vorschau */}
      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div className="mb-2 text-[10.5px] font-medium uppercase tracking-wider text-slate-500">
          Enthaltene Spalten
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11.5px] text-slate-600 dark:text-slate-400">
          {[
            "Datum",
            "Mandant",
            "Mandat",
            "Bearbeiter",
            "Tätigkeit",
            "Dauer (Min)",
            "Dauer (h)",
            "Stundensatz EUR",
            "Honorar netto EUR",
            "Abrechenbar",
            "Chat-Ref",
          ].map((c) => (
            <div key={c} className="flex items-center gap-1.5">
              <span className="text-slate-400">·</span>
              {c}
            </div>
          ))}
        </div>
        <div className="mt-2 text-[10.5px] text-slate-500">
          Letzte Zeile: SUMME-Zeile mit Gesamt-Minuten + Gesamt-Honorar (für
          schnellen Quartal-Total-Check).
        </div>
      </div>
    </div>
  );

  /* Helpers (closure-captured into the buttons above). */
  function setQuickRange(kind: "Q" | "Q-1" | "M" | "M-1" | "Y") {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    let start: Date, end: Date;
    if (kind === "Q") {
      start = new Date(y, Math.floor(m / 3) * 3, 1);
      end = now;
    } else if (kind === "Q-1") {
      const qStart = Math.floor(m / 3) * 3 - 3;
      const yearAdj = qStart < 0 ? y - 1 : y;
      const monthAdj = qStart < 0 ? qStart + 12 : qStart;
      start = new Date(yearAdj, monthAdj, 1);
      end = new Date(yearAdj, monthAdj + 3, 0);
    } else if (kind === "M") {
      start = new Date(y, m, 1);
      end = now;
    } else if (kind === "M-1") {
      start = new Date(y, m - 1, 1);
      end = new Date(y, m, 0);
    } else {
      start = new Date(y, 0, 1);
      end = now;
    }
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  }
}
