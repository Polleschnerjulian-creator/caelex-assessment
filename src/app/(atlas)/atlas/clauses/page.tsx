"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Klausel-Bibliothek browse + create page.
 *
 * Lists all firm-wide + mandate-scoped clauses with filters
 * (category, jurisdiction). Inline create-form for org-admins.
 * Each clause: click → expanded body in modal-style overlay
 * (no separate route needed).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Library,
  Copy as CopyIcon,
  Check as CheckIcon,
  X,
} from "lucide-react";

interface ClauseRecord {
  id: string;
  title: string;
  body: string;
  category: string;
  jurisdiction: string;
  riskLevel: string;
  tags: string[];
  mandateId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string | null; email: string | null };
}

const INPUT_CLASS =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-emerald-500";

const CATEGORIES = [
  "drafting",
  "liability",
  "termination",
  "force-majeure",
  "data-privacy",
  "confidentiality",
  "governing-law",
  "dispute-resolution",
  "warranty",
  "indemnity",
  "ip",
  "other",
];

const JURISDICTIONS = ["DE", "FR", "UK", "US", "EU", "LU", "INT"];

export default function ClauseLibraryPage() {
  const [clauses, setClauses] = useState<ClauseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<string>("");
  const [filterJur, setFilterJur] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterCat) qs.set("category", filterCat);
      if (filterJur) qs.set("jurisdiction", filterJur);
      const res = await fetch(`/api/atlas/clauses?${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { clauses: ClauseRecord[] };
      setClauses(data.clauses ?? []);
    } finally {
      setLoading(false);
    }
  }, [filterCat, filterJur]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <Link
          href="/atlas"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={12} /> Zurück zu Atlas
        </Link>
      </div>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Drafting · Klausel-Bibliothek
          </p>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Library size={20} className="text-slate-700 dark:text-slate-300" />
            Klausel-Bibliothek
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Wiederverwendbare Klauseln pro Jurisdiktion + Kategorie +
            Risiko-Level. Atlas kann die Bibliothek in Drafting-Workflows
            referenzieren. Click auf eine Klausel → vollständiger Wortlaut +
            Kopier-Button.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          <Plus size={12} />
          Neue Klausel
        </button>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <FilterChip
          label="Alle Kategorien"
          active={!filterCat}
          onClick={() => setFilterCat("")}
        />
        {CATEGORIES.slice(0, 8).map((c) => (
          <FilterChip
            key={c}
            label={c}
            active={filterCat === c}
            onClick={() => setFilterCat(c)}
          />
        ))}
        <div className="mx-2 h-4 w-px bg-slate-300 dark:bg-slate-700" />
        <FilterChip
          label="Alle Jurisdiktionen"
          active={!filterJur}
          onClick={() => setFilterJur("")}
        />
        {JURISDICTIONS.map((j) => (
          <FilterChip
            key={j}
            label={j}
            active={filterJur === j}
            onClick={() => setFilterJur(j)}
          />
        ))}
      </div>

      {/* Grid */}
      {loading && clauses.length === 0 ? (
        <p className="text-sm text-slate-500">
          <Loader2 size={12} className="mr-2 inline animate-spin" /> Lädt
          Klauseln…
        </p>
      ) : clauses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center dark:border-slate-700/60 dark:bg-slate-900/30">
          <p className="text-sm text-slate-500">
            Noch keine Klauseln für die gewählten Filter.
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <Plus size={11} />
            Erste Klausel anlegen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {clauses.map((c) => (
            <ClauseCard
              key={c.id}
              clause={c}
              expanded={expanded === c.id}
              onToggle={() =>
                setExpanded((cur) => (cur === c.id ? null : c.id))
              }
            />
          ))}
        </div>
      )}

      {createOpen && (
        <CreateClauseDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
        active
          ? "border border-slate-900 bg-slate-900 text-white dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
          : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:border-slate-600"
      }`}
    >
      {label}
    </button>
  );
}

function ClauseCard({
  clause,
  expanded,
  onToggle,
}: {
  clause: ClauseRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(clause.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  const riskClass =
    clause.riskLevel === "aggressive"
      ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
      : clause.riskLevel === "defensive"
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
        : "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300";

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors dark:border-slate-700/60 dark:bg-slate-900/40">
      <button
        type="button"
        onClick={onToggle}
        className="block w-full p-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-[14px] font-semibold text-slate-900 dark:text-slate-100">
            {clause.title}
          </h3>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0 text-[10px] font-medium ${riskClass}`}
          >
            {clause.riskLevel}
          </span>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10.5px] text-slate-500">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {clause.category}
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {clause.jurisdiction}
          </span>
          {clause.mandateId === null ? (
            <span className="text-emerald-700 dark:text-emerald-300">
              · Kanzlei-weit
            </span>
          ) : (
            <span>· Mandats-spezifisch</span>
          )}
        </div>
        {!expanded && (
          <p className="line-clamp-2 text-[12px] text-slate-600 dark:text-slate-400">
            {clause.body}
          </p>
        )}
      </button>
      {expanded && (
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700/60">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10.5px] uppercase tracking-wider text-slate-500">
              Wortlaut
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              {copied ? (
                <CheckIcon
                  size={11}
                  className="text-emerald-600 dark:text-emerald-400"
                />
              ) : (
                <CopyIcon size={11} />
              )}
              {copied ? "Kopiert" : "Kopieren"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-300">
            {clause.body}
          </pre>
        </div>
      )}
    </div>
  );
}

function CreateClauseDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("drafting");
  const [jurisdiction, setJurisdiction] = useState("DE");
  const [riskLevel, setRiskLevel] = useState<
    "neutral" | "aggressive" | "defensive"
  >("neutral");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/atlas/clauses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          category,
          jurisdiction,
          riskLevel,
          tags: [],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm dark:bg-black/50"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)] dark:border-white/[0.08] dark:bg-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Neue Klausel</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-100"
            aria-label="Schließen"
          >
            <X size={14} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            placeholder="Titel — z.B. Haftungsbeschränkung 12 Mio EUR"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            className={INPUT_CLASS}
            disabled={busy}
          />
          <textarea
            placeholder="Wortlaut der Klausel"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            required
            maxLength={20_000}
            className={INPUT_CLASS}
            disabled={busy}
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={INPUT_CLASS}
              disabled={busy}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className={INPUT_CLASS}
              disabled={busy}
            >
              {JURISDICTIONS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
            <select
              value={riskLevel}
              onChange={(e) =>
                setRiskLevel(
                  e.target.value as "neutral" | "aggressive" | "defensive",
                )
              }
              className={INPUT_CLASS}
              disabled={busy}
            >
              <option value="neutral">neutral</option>
              <option value="aggressive">aggressive</option>
              <option value="defensive">defensive</option>
            </select>
          </div>
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !body.trim() || busy}
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              {busy ? <Loader2 size={11} className="animate-spin" /> : null}
              Anlegen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
