"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * CaseDispatchPanel — interactive event-dispatch buttons for a workflow case.
 *
 * Each allowed event becomes a button; clicking POSTs to the dispatch
 * API which signs + persists the transition. Page refreshes on success.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";

const EVENT_LABELS: Record<string, string> = {
  EARLY_WARNING_RECEIVED: "Early Warning empfangen",
  INCIDENT_NOTIFICATION_RECEIVED: "Incident Notification empfangen",
  FINAL_REPORT_RECEIVED: "Final Report empfangen",
  SACHBEARBEITER_DECISION_CLOSE: "Verfahren beenden",
  BREACH_ACKNOWLEDGED: "Frist-Verletzung anerkennen",
  TRIAGE_COMPLETE: "Triage abschließen",
  REQUEST_INFO: "Nachreichung anfordern",
  INFO_PROVIDED: "Nachreichung erhalten",
  REVIEW_COMPLETE: "Review abschließen",
  APPROVED_FINAL: "Genehmigen (final)",
  REJECTED_FINAL: "Ablehnen (final)",
  OPERATOR_WITHDREW: "Operator hat zurückgezogen",
};

const EVENT_TONES: Record<string, "neutral" | "approve" | "danger"> = {
  APPROVED_FINAL: "approve",
  SACHBEARBEITER_DECISION_CLOSE: "approve",
  REJECTED_FINAL: "danger",
  REQUEST_INFO: "neutral",
};

export function CaseDispatchPanel({
  caseId,
  allowedEvents,
  fsmId,
}: {
  caseId: string;
  allowedEvents: string[];
  fsmId: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function dispatch(event: string) {
    if (submitting) return;
    setSubmitting(event);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/pharos/workflow/cases/${caseId}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Dispatch fehlgeschlagen");
      } else {
        setSuccess(`Transition zu ${json.newState} signiert + persistiert.`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="pharos-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Send className="w-4 h-4 text-slate-700 dark:text-slate-400" />
        <h2 className="pharos-display text-sm font-semibold text-slate-900 dark:text-slate-100">
          Erlaubte Aktionen
        </h2>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
        Jede Aktion erzeugt eine Ed25519-signierte Transition in der Hash-Chain
        des Vorgangs (<span className="pharos-code">{fsmId}</span>). Aktionen
        können nicht rückgängig gemacht werden — sie sind Teil des permanenten
        Audit-Trails.
      </p>

      <div className="flex flex-wrap gap-2">
        {allowedEvents.map((ev) => {
          const tone = EVENT_TONES[ev] ?? "neutral";
          const label = EVENT_LABELS[ev] ?? ev;
          const isLoading = submitting === ev;
          const btnClass =
            tone === "approve" || tone === "danger"
              ? "pharos-btn-primary"
              : "pharos-btn-ghost";
          return (
            <button
              key={ev}
              type="button"
              disabled={!!submitting}
              onClick={() => dispatch(ev)}
              className={`${btnClass} inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <span className="inline-block w-3 h-3 rounded-full bg-current opacity-50 animate-pulse" />
              ) : null}
              {label}
              <span className="pharos-code text-[9px] opacity-70">{ev}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 inline-flex items-start gap-2 text-xs text-slate-900 dark:text-slate-300">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 inline-flex items-start gap-2 text-xs text-slate-800 dark:text-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5" />
          {success}
        </div>
      )}
    </div>
  );
}
