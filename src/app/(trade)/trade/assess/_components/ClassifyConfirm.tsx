"use client";

/**
 * Caelex Passage — /trade/assess Screen 2 (classify + confirm).
 *
 * Renders the parametric matcher's top classification proposal for an uploaded
 * datasheet (code · regime · confidence · the cited rationale as evidence) plus
 * any weaker alternatives, behind a single explicit **Bestätigen** sign-off.
 *
 * HONESTY (spec §7.4): the verdict is NEVER computed here. The human confirms
 * the classification before anything downstream runs. When the extraction
 * produced NO usable suggestion (or only low-confidence hints), there is no
 * one-click confirm of a guessed code — only an honest "Code manuell wählen"
 * fallback that hands off to the manual classification path. We synthesise
 * nothing.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Check, AlertTriangle, Sparkles, Pencil } from "lucide-react";
import type { DatasheetApplyPayload } from "../../_components/DatasheetDropzone";

/** A code suggestion as surfaced by `DatasheetDropzone` / `classify-suggest`. */
export interface ClassifyConfirmSuggestion {
  code: string;
  canonicalId: string;
  regime: string;
  title: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rationale: string;
}

const CONFIDENCE_CLS: Record<"HIGH" | "MEDIUM" | "LOW", string> = {
  HIGH: "trade-chip-success",
  MEDIUM: "trade-chip-warn",
  LOW: "trade-chip-neutral",
};

export function ClassifyConfirm({
  payload,
  submitting,
  error,
  onConfirm,
  onManual,
}: {
  payload: DatasheetApplyPayload;
  submitting: boolean;
  error: string | null;
  /** Confirm the chosen suggestion as the classification (Screen 2 sign-off). */
  onConfirm: (suggestion: ClassifyConfirmSuggestion) => void;
  /** Honest fallback when there is nothing trustworthy to confirm. */
  onManual: () => void;
}) {
  const suggestions = payload.suggestions as ClassifyConfirmSuggestion[];
  const [top, ...alternatives] = suggestions;

  // §7.4 — no usable proposal at all: never confirm a guessed code.
  if (!top) {
    return (
      <ManualFallback
        onManual={onManual}
        note="Aus dem Datenblatt ließ sich kein belastbarer Kontrolllisten-Code ableiten."
      />
    );
  }

  return (
    <section className="space-y-4" data-testid="assess-classify-step">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-trade-accent" />
        <h2 className="text-lg text-trade-text-primary">
          Klassifizierung bestätigen
        </h2>
      </div>
      <p className="text-sm text-trade-text-muted">
        Aus dem Datenblatt vorgeschlagen — bitte fachlich bestätigen, bevor wir
        die Lieferung prüfen. Bis zur Bestätigung wird kein Verdikt berechnet.
      </p>

      {error && (
        <div className="rounded-lg border px-4 py-3 text-sm trade-chip-danger">
          {error}
        </div>
      )}

      {/* Top proposal — the code the human is asked to confirm. */}
      <div
        className="rounded-xl border border-trade-accent/60 bg-trade-accent-soft p-4"
        data-testid="assess-top-proposal"
      >
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-trade-text-primary">
            {top.code}
          </span>
          <span className="text-xs text-trade-text-muted">{top.regime}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] ${CONFIDENCE_CLS[top.confidence]}`}
          >
            {top.confidence}
          </span>
        </div>
        <p className="mt-1 text-sm text-trade-text-primary">{top.title}</p>
        {top.rationale && (
          <p
            className="mt-2 text-xs text-trade-text-muted"
            data-testid="assess-top-evidence"
          >
            {top.rationale}
          </p>
        )}
      </div>

      {/* Weaker alternatives — context only, not auto-confirmable. */}
      {alternatives.length > 0 && (
        <div className="rounded-lg border border-trade-border bg-trade-bg-panel p-3">
          <p className="mb-2 text-xs font-medium text-trade-text-secondary">
            Alternativen
          </p>
          <ul className="space-y-1.5">
            {alternatives.slice(0, 4).map((s) => (
              <li
                key={s.canonicalId}
                className="flex items-center gap-2 text-sm"
              >
                <span className="font-medium text-trade-text-primary">
                  {s.code}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] ${CONFIDENCE_CLS[s.confidence]}`}
                >
                  {s.confidence}
                </span>
                <span className="truncate text-xs text-trade-text-muted">
                  {s.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Low-confidence honesty banner — confirm is allowed but flagged. */}
      {top.confidence === "LOW" && (
        <div className="flex items-start gap-2 rounded-lg trade-chip-warn px-3 py-2 text-xs">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Nur ein schwacher Treffer — bestätige nur, wenn du den Code fachlich
            geprüft hast. Andernfalls wähle den Code manuell.
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={() => onConfirm(top)}
          className="inline-flex items-center gap-2 rounded-lg bg-trade-accent px-5 py-2.5 text-white transition hover:bg-trade-accent-strong disabled:opacity-40"
        >
          <Check className="h-4 w-4" /> Bestätigen: {top.code}
        </button>
        <button
          type="button"
          onClick={onManual}
          className="inline-flex items-center gap-2 rounded-lg border border-trade-border px-5 py-2.5 text-trade-text-primary transition hover:bg-trade-hover"
        >
          <Pencil className="h-4 w-4" /> Code manuell wählen
        </button>
      </div>
    </section>
  );
}

function ManualFallback({
  onManual,
  note,
}: {
  onManual: () => void;
  note: string;
}) {
  return (
    <section className="space-y-4" data-testid="assess-classify-step">
      <h2 className="text-lg text-trade-text-primary">
        Klassifizierung bestätigen
      </h2>
      <div className="flex items-start gap-2 rounded-lg trade-chip-warn px-3 py-2 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{note} Bitte wähle den Code manuell.</span>
      </div>
      <button
        type="button"
        onClick={onManual}
        className="inline-flex items-center gap-2 rounded-lg border border-trade-border px-5 py-2.5 text-trade-text-primary transition hover:bg-trade-hover"
      >
        <Pencil className="h-4 w-4" /> Code manuell wählen
      </button>
    </section>
  );
}
