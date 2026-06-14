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
 * one-click confirm of a guessed code. Instead the operator gets an honest,
 * inline code-entry surface (B11): they type the control code they know
 * applies, and we thread it through the SAME confirmed-code path — so it lands
 * as a controlled good and fails closed (REVIEW / BLOCKED, never a fabricated
 * GO). The flow NEVER dead-ends. We synthesise nothing.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useState } from "react";
import {
  Check,
  AlertTriangle,
  Sparkles,
  Pencil,
  ArrowRight,
} from "lucide-react";
import type { DatasheetApplyPayload } from "../../_components/DatasheetDropzone";

/** The operator-entered control code on the inline manual-entry surface (B11).
 *  `code` is the raw control code as typed (e.g. "EU:9A004", "1.A.1",
 *  "XV(e)(16)"); `regime` is an optional corpus RegimeName hint. The orchestrator
 *  routes both through `confirmedCodeCell` → a typed cell OR `declaredOtherCode`,
 *  so the item is always treated as controlled (fail-closed). */
export interface ManualCodeEntry {
  code: string;
  regime?: string;
}

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
  onManualCode,
}: {
  payload: DatasheetApplyPayload;
  submitting: boolean;
  error: string | null;
  /** Confirm the chosen suggestion as the classification (Screen 2 sign-off). */
  onConfirm: (suggestion: ClassifyConfirmSuggestion) => void;
  /** Honest fallback — re-open the scoped form to supply more decisive fields. */
  onManual: () => void;
  /** B11 — the operator typed a control code on the inline manual-entry surface.
   *  The orchestrator threads it through the confirmed-code path (fail-closed).
   *  The flow never dead-ends: even with no suggestion the operator can proceed. */
  onManualCode: (entry: ManualCodeEntry) => void;
}) {
  const suggestions = payload.suggestions as ClassifyConfirmSuggestion[];
  const [top, ...alternatives] = suggestions;

  // B5 — a LOW top suggestion is an itemClass-prefix-only match (no decisive
  // parametric predicate). It must NOT be one-click confirmable: a careless
  // confirm here arms the dropped-cell fail-open downstream. The operator must
  // explicitly affirm they reviewed the code ("fachlich geprüft") before the
  // Bestätigen button enables. HIGH/MEDIUM stay one-click.
  const [lowAffirmed, setLowAffirmed] = useState(false);

  // §7.4 — no usable proposal at all: never confirm a guessed code. B11 — but
  // never dead-end either: offer an honest inline code-entry surface so the
  // operator can supply the code they know applies (threaded fail-closed).
  if (!top) {
    return (
      <ManualFallback
        onManual={onManual}
        onManualCode={onManualCode}
        submitting={submitting}
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

      {/* B5 — LOW: itemClass-prefix-only. No one-click confirm; the operator
          must affirm a manual review before the Bestätigen button enables. */}
      {top.confidence === "LOW" && (
        <div className="flex flex-col gap-2 rounded-lg trade-chip-warn px-3 py-2.5 text-xs">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Nur ein schwacher Treffer (Treffer allein über die Produktklasse,
              kein entscheidendes Parameter-Kriterium). Bestätige diesen Code
              erst, nachdem du ihn fachlich geprüft hast — oder wähle den Code
              manuell.
            </span>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-trade-text-primary">
            <input
              type="checkbox"
              data-testid="assess-low-affirm"
              checked={lowAffirmed}
              onChange={(e) => setLowAffirmed(e.target.checked)}
              className="h-3.5 w-3.5 accent-trade-accent"
            />
            Ich habe {top.code} fachlich geprüft.
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="assess-confirm-btn"
          disabled={submitting || (top.confidence === "LOW" && !lowAffirmed)}
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
          <Pencil className="h-4 w-4" /> Andere Felder ergänzen
        </button>
      </div>

      {/* B11 — the operator can ALWAYS override the suggestion with the code
          they know applies. Threaded fail-closed (controlled good → REVIEW). */}
      <ManualCodeEntry onSubmit={onManualCode} submitting={submitting} />
    </section>
  );
}

function ManualFallback({
  onManual,
  onManualCode,
  submitting,
  note,
}: {
  onManual: () => void;
  onManualCode: (entry: ManualCodeEntry) => void;
  submitting: boolean;
  note: string;
}) {
  return (
    <section className="space-y-4" data-testid="assess-classify-step">
      <h2 className="text-lg text-trade-text-primary">
        Klassifizierung bestätigen
      </h2>
      <div className="flex items-start gap-2 rounded-lg trade-chip-warn px-3 py-2 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {note} Gib den Kontrolllisten-Code manuell an — wir prüfen konservativ
          (eine fehlende Einstufung ist keine Freigabe).
        </span>
      </div>
      {/* B11 — the honest, never-dead-end path: type the code you know applies. */}
      <ManualCodeEntry onSubmit={onManualCode} submitting={submitting} />
      <button
        type="button"
        onClick={onManual}
        className="inline-flex items-center gap-2 text-sm text-trade-text-muted transition hover:text-trade-text-primary"
      >
        <Pencil className="h-4 w-4" /> Lieber zurück zum Formular und Felder
        ergänzen
      </button>
    </section>
  );
}

/**
 * B11 — inline manual control-code entry. The operator types the code they know
 * applies (and optionally the regime). On submit we forward it verbatim to the
 * orchestrator, which threads it through `confirmedCodeCell`:
 *   - a recognised regime/prefix → the typed TradeItem cell;
 *   - anything else → `declaredOtherCode` (regime + bare code).
 * EITHER way the item is treated as a CONTROLLED good downstream → fail-closed
 * (REVIEW, or BLOCKED to an embargoed destination). We never synthesise a code
 * and never produce a GO from a blank entry — the submit button stays disabled
 * until a non-empty code is typed.
 */
function ManualCodeEntry({
  onSubmit,
  submitting,
}: {
  onSubmit: (entry: ManualCodeEntry) => void;
  submitting: boolean;
}) {
  const [code, setCode] = useState("");
  const [regime, setRegime] = useState("");
  const trimmedCode = code.trim();
  const trimmedRegime = regime.trim();
  const canSubmit = trimmedCode.length > 0 && !submitting;
  return (
    <div
      className="space-y-3 rounded-xl border border-trade-border bg-trade-bg-panel p-4"
      data-testid="assess-manual-code"
    >
      <div className="flex items-center gap-2">
        <Pencil className="h-4 w-4 text-trade-text-muted" />
        <span className="text-sm font-medium text-trade-text-primary">
          Code manuell angeben
        </span>
      </div>
      <label className="block text-sm text-trade-text-muted">
        Kontrolllisten-Code
        <input
          data-testid="assess-manual-code-input"
          className="mt-1 w-full rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-trade-text-primary outline-none focus:border-trade-accent"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="z. B. EU:9A004, 1.A.1, XV(e)(16)"
        />
      </label>
      <label className="block text-sm text-trade-text-muted">
        Regime (optional)
        <input
          data-testid="assess-manual-code-regime"
          className="mt-1 w-full rounded-lg border border-trade-border bg-trade-bg-panel px-3 py-2 text-trade-text-primary outline-none focus:border-trade-accent"
          value={regime}
          onChange={(e) => setRegime(e.target.value)}
          placeholder="z. B. EU-ANNEX-I, EAR-CCL, MTCR-ANNEX"
        />
      </label>
      <button
        type="button"
        data-testid="assess-manual-code-submit"
        disabled={!canSubmit}
        onClick={() =>
          onSubmit(
            trimmedRegime
              ? { code: trimmedCode, regime: trimmedRegime }
              : { code: trimmedCode },
          )
        }
        className="inline-flex items-center gap-2 rounded-lg bg-trade-accent px-5 py-2.5 text-white transition hover:bg-trade-accent-strong disabled:opacity-40"
      >
        <ArrowRight className="h-4 w-4" /> Mit diesem Code prüfen
      </button>
    </div>
  );
}
