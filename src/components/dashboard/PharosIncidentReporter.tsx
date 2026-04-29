"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PharosIncidentReporter — operator-side dialog to file an NIS2-Incident
 * to a chosen authority via the Pharos workflow stack.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Send, Siren, X } from "lucide-react";

interface OversightOption {
  id: string;
  authorityName: string;
  oversightTitle: string;
}

export function PharosIncidentReporter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [oversights, setOversights] = useState<OversightOption[] | null>(null);
  const [oversightId, setOversightId] = useState<string>("");
  const [caseRef, setCaseRef] = useState("");
  const [severity, setSeverity] = useState<
    "minor" | "significant" | "major" | "critical"
  >("major");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Lazy-load the operator's active oversights when dialog opens.
  useEffect(() => {
    if (!open || oversights !== null) return;
    (async () => {
      try {
        const res = await fetch("/api/network/oversights?role=operator", {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          setOversights(
            (json.oversights ?? []).map(
              (o: {
                id: string;
                oversightTitle: string;
                authorityName?: string;
              }) => ({
                id: o.id,
                authorityName: o.authorityName ?? "—",
                oversightTitle: o.oversightTitle,
              }),
            ),
          );
        } else {
          setOversights([]);
        }
      } catch {
        setOversights([]);
      }
    })();
  }, [open, oversights]);

  async function submit() {
    if (submitting || !oversightId || !caseRef) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/network/oversight/${oversightId}/incidents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            caseRef,
            severity,
            summary: summary || undefined,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Übermittlung fehlgeschlagen");
      } else {
        setSuccess(
          `Vorfall an Behörde übermittelt (state=${json.currentState}). 72h-Notification-Frist läuft jetzt.`,
        );
        router.refresh();
        setTimeout(() => {
          setOpen(false);
          setSuccess(null);
          setCaseRef("");
          setSummary("");
        }, 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-white/15 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-slate-700/20"
      >
        <Siren className="w-3.5 h-3.5" />
        Pharos-Vorfall melden
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
            <header className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Siren className="w-4 h-4 text-slate-800 dark:text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  NIS2-Vorfall an Aufsicht melden
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="px-5 py-4 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Diese Meldung erzeugt ein signiertes{" "}
                <code>EARLY_WARNING_RECEIVED</code>- Event in der
                Pharos-Hash-Chain der gewählten Aufsicht. Damit ist die
                24h-Frist erfüllt; die 72h-Notification-Frist läuft ab
                Bestätigung.
              </p>

              <Field label="Aufsicht (Behörde)">
                <select
                  value={oversightId}
                  onChange={(e) => setOversightId(e.target.value)}
                  disabled={submitting}
                  className="w-full text-sm px-3 py-2 rounded border border-slate-300 bg-white text-slate-800 dark:bg-slate-900/40 dark:border-white/10 dark:text-slate-200"
                >
                  <option value="">— bitte wählen —</option>
                  {oversights?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.authorityName} — {o.oversightTitle}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Aktenzeichen / Case-Ref">
                <input
                  type="text"
                  value={caseRef}
                  onChange={(e) => setCaseRef(e.target.value)}
                  placeholder="z.B. ACME-NIS2-2026-001"
                  disabled={submitting}
                  className="w-full text-sm px-3 py-2 rounded border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 dark:bg-slate-900/40 dark:border-white/10 dark:text-slate-200 dark:placeholder:text-slate-500"
                />
              </Field>

              <Field label="Schweregrad">
                <div className="flex gap-2">
                  {(["minor", "significant", "major", "critical"] as const).map(
                    (s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSeverity(s)}
                        disabled={submitting}
                        className={`text-xs px-3 py-1.5 rounded border ${
                          severity === s
                            ? "bg-slate-700 text-white border-slate-800"
                            : "bg-white text-slate-700 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:border-white/10"
                        }`}
                      >
                        {s}
                      </button>
                    ),
                  )}
                </div>
              </Field>

              <Field label="Kurzbeschreibung (optional)">
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  disabled={submitting}
                  placeholder="z.B. TT&C-Link-Anomalie auf LEO-Mission, IDS hat erhöhte Latenz erkannt …"
                  className="w-full text-sm px-3 py-2 rounded border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 dark:bg-slate-900/40 dark:border-white/10 dark:text-slate-200 dark:placeholder:text-slate-500 resize-none"
                />
              </Field>

              {error && (
                <div className="inline-flex items-start gap-2 text-xs text-slate-900 dark:text-slate-300">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
                  {error}
                </div>
              )}
              {success && (
                <div className="inline-flex items-start gap-2 text-xs text-slate-800 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 mt-0.5" />
                  {success}
                </div>
              )}
            </div>

            <footer className="px-5 py-3 border-t border-slate-200 dark:border-white/5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/[0.05]"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !oversightId || !caseRef}
                className="text-xs px-3 py-1.5 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 text-white inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                Signiert melden
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] tracking-wider uppercase text-slate-500 font-medium mb-1">
        {label}
      </div>
      {children}
    </div>
  );
}
