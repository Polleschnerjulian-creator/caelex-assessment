"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Konflikt-Check-Banner für die Mandats-Detailseite.
 *
 * Lädt die offenen (nicht freigegebenen) Interessenkonflikte des Mandats
 * von GET /api/atlas/mandate/[id]/conflicts und zeigt sie als Banner über
 * der Parteien-Sektion. Jeder Treffer kann über den Freigabe-Dialog
 * dokumentiert werden (POST .../conflicts/clear); bei Severity "high" ist
 * die Begründung Pflicht (Aktenvermerk, §43a Abs. 4 BRAO).
 *
 * Aktualisiert sich nach Partei-Änderungen über das CustomEvent
 * "atlas:parties-changed" (dispatcht MandateParties nach jeder
 * erfolgreichen Mutation) — Banner und Parteien-Liste bleiben in einem
 * Roundtrip konsistent, ohne State-Lifting durch die Detail-View.
 *
 * Kein Treffer → rendert nichts (kein Dauer-Grünschild: Abwesenheit von
 * Treffern ist KEINE Freigabe-Garantie, siehe Spec §5 Honesty).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, ScaleIcon, X } from "lucide-react";

export const PARTIES_CHANGED_EVENT = "atlas:parties-changed";

type ConflictSeverity = "high" | "medium" | "info";

interface ConflictMatch {
  newPartyId: string;
  newPartyName: string;
  newPartyType: string;
  matchedPartyId: string;
  matchedPartyName: string;
  matchedPartyType: string;
  matchedMandateId: string;
  matchedMandateName: string;
  normalizedName: string;
  severity: ConflictSeverity;
}

const SEVERITY_STYLES: Record<
  ConflictSeverity,
  { label: string; badge: string; border: string }
> = {
  high: {
    label: "Hoch",
    badge: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    border: "border-red-300 dark:border-red-500/40",
  },
  medium: {
    label: "Mittel",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    border: "border-amber-300 dark:border-amber-500/40",
  },
  info: {
    label: "Hinweis",
    badge:
      "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-600",
  },
};

const PARTY_TYPE_LABELS: Record<string, string> = {
  client: "Mandant",
  opponent: "Gegner",
  authority: "Behörde",
  co_counsel: "Co-Counsel",
  other: "Sonstige",
};

function partyTypeLabel(type: string): string {
  return PARTY_TYPE_LABELS[type] ?? type;
}

export function MandateConflictBanner({
  mandateId,
  disabled,
}: {
  mandateId: string;
  disabled?: boolean;
}) {
  const [conflicts, setConflicts] = useState<ConflictMatch[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [clearing, setClearing] = useState<ConflictMatch | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/atlas/mandate/${mandateId}/conflicts`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { conflicts?: ConflictMatch[] };
        setConflicts(data.conflicts ?? []);
      }
    } catch {
      /* Banner ist Zusatzinformation — ein Ladefehler darf die
         Detailseite nicht stören; nächster Trigger lädt erneut. */
    } finally {
      setLoaded(true);
    }
  }, [mandateId]);

  useEffect(() => {
    void load();
    const onPartiesChanged = () => void load();
    window.addEventListener(PARTIES_CHANGED_EVENT, onPartiesChanged);
    return () =>
      window.removeEventListener(PARTIES_CHANGED_EVENT, onPartiesChanged);
  }, [load]);

  const submitClearance = useCallback(async () => {
    if (!clearing) return;
    if (clearing.severity === "high" && reason.trim().length === 0) {
      setError("Bei hoher Einstufung ist eine Begründung Pflicht.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/atlas/mandate/${mandateId}/conflicts/clear`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchedMandateId: clearing.matchedMandateId,
            normalizedName: clearing.normalizedName,
            severity: clearing.severity,
            reason: reason.trim().length > 0 ? reason.trim() : undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Freigabe fehlgeschlagen.");
        return;
      }
      /* Optimistisch: derselbe Clearance-Schlüssel (Mandat + Name)
         deckt alle Partei-Paare dieses Namens ab — wie serverseitig. */
      setConflicts((prev) =>
        prev.filter(
          (c) =>
            !(
              c.matchedMandateId === clearing.matchedMandateId &&
              c.normalizedName === clearing.normalizedName
            ),
        ),
      );
      setClearing(null);
      setReason("");
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }, [clearing, mandateId, reason]);

  if (!loaded || conflicts.length === 0) return null;

  return (
    <section id="conflicts" className="mb-8 scroll-mt-20">
      <h2 className="mb-3 flex items-center gap-2 text-[14px] font-medium text-slate-700 dark:text-slate-200">
        <ScaleIcon size={15} className="shrink-0" />
        Interessenkonflikt-Prüfung ({conflicts.length})
      </h2>
      <div className="space-y-2">
        {conflicts.map((c) => {
          const s = SEVERITY_STYLES[c.severity];
          return (
            <div
              key={`${c.newPartyId}-${c.matchedPartyId}`}
              className={`rounded-lg border ${s.border} bg-white p-3 dark:bg-slate-900/60`}
            >
              <div className="flex flex-wrap items-start gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.badge}`}
                >
                  <AlertTriangle size={10} />
                  {s.label}
                </span>
                <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                  {partyTypeLabel(c.newPartyType)}{" "}
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    „{c.newPartyName}&ldquo;
                  </span>{" "}
                  tritt im Mandat{" "}
                  <Link
                    href={`/atlas/mandate/${c.matchedMandateId}`}
                    className="font-medium underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500 dark:decoration-slate-600"
                  >
                    {c.matchedMandateName}
                  </Link>{" "}
                  als {partyTypeLabel(c.matchedPartyType)} auf.
                </p>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => {
                      setClearing(c);
                      setReason("");
                      setError(null);
                    }}
                    className="shrink-0 rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Dokumentieren &amp; freigeben
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {clearing && (
        <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-600 dark:bg-slate-900/60">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-[12px] text-slate-600 dark:text-slate-400">
              Freigabe dokumentieren: „{clearing.newPartyName}&ldquo; vs. Mandat
              „{clearing.matchedMandateName}&ldquo;
              {clearing.severity === "high" && (
                <span className="ml-1 text-red-600 dark:text-red-400">
                  (Begründung erforderlich)
                </span>
              )}
            </p>
            <button
              type="button"
              aria-label="Dialog schließen"
              onClick={() => setClearing(null)}
              className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={14} />
            </button>
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Begründung für die Akte (z. B. Einwilligung beider Mandanten, keine Interessenkollision im konkreten Gegenstand …)"
            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          {error && (
            <p className="mt-1 text-[12px] text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setClearing(null)}
              className="rounded px-2 py-1 text-[12px] text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => void submitClearance()}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-2.5 py-1 text-[12px] text-white transition-colors hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
            >
              {submitting && <Loader2 size={12} className="animate-spin" />}
              Freigeben
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
