"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Anonymisierungs-Tool (PII-Redact).
 *
 * Two-pane layout: original on the left, anonymised on the right.
 * Mode toggle (strict / balanced) above. Action buttons: Anonymisieren,
 * Output kopieren.
 *
 * Used before publishing case-law, training material, or sample
 * briefs. GDPR Art. 4(1) coverage via the Anthropic-driven backend.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Loader2,
  Copy as CopyIcon,
  Check as CheckIcon,
  ArrowRight,
} from "lucide-react";

export default function AnonymizePage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"strict" | "balanced">("balanced");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (!input.trim()) return;
    setBusy(true);
    setError(null);
    setOutput("");
    try {
      const res = await fetch("/api/atlas/anonymize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: input, mode, language: "de" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { anonymised: string };
      setOutput(data.anonymised ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <Link
          href="/atlas"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={12} /> Zurück zu Atlas
        </Link>
      </div>

      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Tools · Anonymisierung
        </p>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Shield size={20} className="text-slate-700 dark:text-slate-300" />
          PII-Redaction
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Entfernt personenbezogene Daten nach DSGVO Art. 4(1) aus dem Text.
          Namen → [PERSON], Firmen → [COMPANY], IBAN/USt-ID → [IBAN]/[VAT-ID]
          etc. Nutze vor Veröffentlichung von Schriftsätzen, Beispiel-Verträgen,
          Trainings-Materialien.
        </p>
      </header>

      {/* Mode toggle */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-[11.5px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Modus
        </span>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/[0.08] dark:bg-white/[0.04]">
          {(
            [
              {
                v: "balanced" as const,
                label: "Balanced",
                hint: "High-confidence PII",
              },
              {
                v: "strict" as const,
                label: "Strict",
                hint: "Auch Mehrdeutiges",
              },
            ] as const
          ).map((opt) => {
            const active = mode === opt.v;
            return (
              <button
                key={opt.v}
                type="button"
                onClick={() => setMode(opt.v)}
                title={opt.hint}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                  active
                    ? "bg-white text-slate-900 shadow-sm dark:bg-white/[0.08] dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
                aria-pressed={active}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={run}
          disabled={!input.trim() || busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          {busy ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <ArrowRight size={13} />
          )}
          Anonymisieren
        </button>
      </div>

      {/* Two-pane editor */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11.5px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Original
            </span>
            <span className="text-[10.5px] tabular-nums text-slate-400 dark:text-slate-500">
              {input.length} Zeichen
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Text mit PII einfügen — Namen, Adressen, Telefonnummern, Kontodaten etc."
            rows={20}
            maxLength={50_000}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white p-3 font-mono text-[12.5px] leading-relaxed text-slate-900 outline-none focus:border-slate-400 focus-visible:outline-none dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:text-slate-100 dark:focus:border-white/[0.16]"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11.5px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Anonymisiert
            </span>
            {output && (
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.05] dark:hover:text-slate-200"
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
            )}
          </div>
          <div className="min-h-[480px] rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[12.5px] leading-relaxed text-slate-700 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-slate-300">
            {busy ? (
              <span className="text-slate-500">
                <Loader2 size={11} className="mr-1.5 inline animate-spin" />
                Anonymisiert…
              </span>
            ) : error ? (
              <span className="text-red-600 dark:text-red-400">{error}</span>
            ) : output ? (
              <pre className="whitespace-pre-wrap break-words">{output}</pre>
            ) : (
              <span className="text-slate-400 dark:text-slate-600">
                Output erscheint hier nach Klick auf „Anonymisieren".
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
        ⓘ <strong>Disclaimer:</strong> Die Anonymisierung erfolgt durch ein LLM
        (Claude). Best-effort, keine 100%-Garantie für vollständige Entfernung
        aller PII. Für sicherheitskritische Dokumente bitte manuelle
        Nachkontrolle. Für formal-juristische Anonymisierung von
        Urteilsschriften gilt zusätzlich §169 GVG (Gerichtsöffentlichkeit).
      </p>
    </div>
  );
}
