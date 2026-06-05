"use client";

/**
 * ApplicabilityResult — the verdict view of the export-control applicability
 * triage. Renders the six regime verdicts produced by the PURE
 * `assessApplicability` engine, framed to make over-trust structurally hard
 * (the honesty rules R1–R6 from the design spec):
 *
 *  - R1: NO success-green anywhere. The most-negative verdict
 *    (OUT_OF_SCOPE_ON_THESE_FACTS) is neutral grey with a confirm reminder —
 *    never a confident "does not apply".
 *  - R4: a persistent, non-dismissible disclaimer banner sits at the top, and
 *    a compact per-verdict reminder under every card.
 *  - R5: a "Was diese Einordnung NICHT ist" block names the limits explicitly.
 *  - Astra hand-off: each card + the footer carry a quiet "Astra fragen" link
 *    using the established /trade/astra?prefill= deep-link pattern.
 *
 * Presentational only (tsc/eslint/review-gated; jsdom hangs on this machine).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Info,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import type {
  ApplicabilityResult as ApplicabilityResultModel,
  Applicability,
  RegimeVerdict,
} from "@/lib/trade/applicability/assess-applicability";
import {
  APPLICABILITY_COPY,
  PER_VERDICT_DISCLAIMER,
} from "@/lib/trade/applicability/applicability-copy";

interface Props {
  result: ApplicabilityResultModel;
  /**
   * Primary CTA behaviour. In the wizard, the ack already happened, so this
   * persists + routes home. On the standalone re-view page there is nothing
   * to persist — the page passes a router push. Optional: when omitted (e.g.
   * a pure preview) the primary CTA is hidden.
   */
  onApply?: () => void;
  /** "neu einschätzen" — restart the wizard. Optional. */
  onRestart?: () => void;
  /** Disables the apply button while the submit is in flight. */
  applying?: boolean;
}

const HEADLINE_COPY: Record<ApplicabilityResultModel["headline"], string> = {
  VIELE_REGIME:
    "Auf Basis deiner Angaben betreffen dich gleich mehrere Regime:",
  EINIGE_REGIME: "Auf Basis deiner Angaben betreffen dich diese Regime:",
  ORIENTIERUNG_NÖTIG:
    "Auf Basis deiner Angaben ist noch nichts eindeutig — aber einiges solltest du prüfen:",
};

// Dot + label per applicability level. NO success-green anywhere (R1):
// out-of-scope is neutral grey, never a checkmark / green.
const LEVEL: Record<
  Applicability,
  { dot: string; label: string; chipText: string; chipBg: string }
> = {
  CLEARLY_APPLIES: {
    dot: "bg-trade-accent-danger",
    label: "trifft zu",
    chipText: "",
    chipBg: "trade-chip-danger",
  },
  LIKELY_APPLIES: {
    dot: "bg-trade-accent-warn",
    label: "trifft wahrscheinlich zu — bestätigen",
    chipText: "",
    chipBg: "trade-chip-warn",
  },
  OUT_OF_SCOPE_ON_THESE_FACTS: {
    dot: "bg-trade-text-muted",
    label: "auf diesen Angaben außerhalb des Anwendungsbereichs — prüfen",
    chipText: "",
    chipBg: "trade-chip-neutral",
  },
};

function VerdictCard({ verdict }: { verdict: RegimeVerdict }) {
  const [open, setOpen] = React.useState(false);
  const copy = APPLICABILITY_COPY[verdict.copyKey];
  const level = LEVEL[verdict.applicability];
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <li className="rounded-lg border border-trade-border bg-trade-bg-panel">
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${level.dot}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[14px] font-semibold text-trade-text-primary">
                {copy?.title ?? verdict.regime}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${level.chipBg} ${level.chipText}`}
              >
                {level.label}
              </span>
              {verdict.fromUncertainty ? (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-medium trade-chip-warn">
                  wegen Unsicherheit hochgestuft
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-trade-text-secondary">
              {verdict.reason}
            </p>

            {copy ? (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-trade-accent-strong transition hover:text-trade-accent"
              >
                <Chevron className="h-3.5 w-3.5" aria-hidden="true" />
                Was bedeutet das?
              </button>
            ) : null}
          </div>
        </div>

        {open && copy ? (
          <div className="mt-3 space-y-3 border-t border-trade-border-subtle pt-3 pl-[22px]">
            <p className="text-[13px] leading-relaxed text-trade-text-secondary">
              {copy.whatItMeans}
            </p>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-trade-text-muted">
                Erste Schritte
              </div>
              <ul className="mt-1 space-y-1">
                {copy.firstSteps.map((step) => (
                  <li
                    key={step}
                    className="flex items-start gap-2 text-[13px] text-trade-text-secondary"
                  >
                    <ArrowRight
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-trade-text-muted"
                      aria-hidden="true"
                    />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link
                href={copy.surfaceHref}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-trade-accent-strong transition hover:text-trade-accent"
              >
                Dazu im Tool
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                href={`/trade/astra?prefill=${encodeURIComponent(copy.astraPrefill)}`}
                className="inline-flex items-center gap-1.5 text-[12px] text-trade-text-secondary transition hover:text-trade-text-primary"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Astra fragen
              </Link>
            </div>
            <p className="text-[11px] italic text-trade-text-muted">
              {PER_VERDICT_DISCLAIMER}
            </p>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function ApplicabilityResult({
  result,
  onApply,
  onRestart,
  applying,
}: Props) {
  return (
    <div className="space-y-5">
      {/* R4 — mandatory, non-dismissible disclaimer banner at the top. */}
      <div className="flex items-start gap-3 rounded-lg border border-trade-accent/40 bg-trade-accent-soft px-4 py-3">
        <ShieldAlert
          className="mt-0.5 h-5 w-5 shrink-0 text-trade-accent-strong"
          aria-hidden="true"
        />
        <p className="text-[12px] leading-relaxed text-trade-text-secondary">
          {result.disclaimer}
        </p>
      </div>

      <div>
        <h2 className="text-[16px] font-semibold text-trade-text-primary">
          {HEADLINE_COPY[result.headline]}
        </h2>
        <p className="mt-1 text-[12px] text-trade-text-muted">
          Sortiert nach Relevanz. „Außerhalb des Anwendungsbereichs“ ist nie ein
          sicheres „trifft nicht zu“ — nur „auf diesen Angaben nicht, bitte
          fachlich bestätigen“.
        </p>
      </div>

      <ul className="space-y-2">
        {result.verdicts.map((v) => (
          <VerdictCard key={v.regime} verdict={v} />
        ))}
      </ul>

      {/* R5 — explicitly name what this is NOT. */}
      <div className="rounded-lg border border-trade-border-subtle bg-trade-bg-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-trade-text-muted" aria-hidden="true" />
          <span className="text-[12px] font-semibold uppercase tracking-wide text-trade-text-secondary">
            Was diese Einordnung NICHT ist
          </span>
        </div>
        <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-trade-text-muted">
          <li>
            • Keine Klassifizierung deiner konkreten Güter (keine ECCN, USML
            oder Anlage-AL).
          </li>
          <li>
            • Keine Aussage, ob eine bestimmte Lieferung an ein bestimmtes Land
            erlaubt ist.
          </li>
          <li>• Kein Sanktions-Screening einer konkreten Partei.</li>
          <li>
            • Keine Güterlistenauskunft, keine verbindliche Einstufung und keine
            Rechtsberatung.
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-trade-border-subtle pt-4">
        {onApply ? (
          <button
            type="button"
            onClick={onApply}
            disabled={applying}
            className="inline-flex items-center gap-2 rounded-lg bg-trade-accent px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:opacity-60"
          >
            {applying
              ? "Wird übernommen…"
              : "Übernehmen & meine Schritte anzeigen"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        {onRestart ? (
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-trade-text-secondary transition hover:text-trade-text-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Neu einschätzen
          </button>
        ) : null}
        <Link
          href="/trade/astra?prefill=Mir wurde eine Exportkontroll-Einordnung angezeigt — kannst du mir helfen, die nächsten Schritte zu priorisieren?"
          className="inline-flex items-center gap-1.5 text-[13px] text-trade-text-secondary transition hover:text-trade-text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Mit Astra weiterdenken
        </Link>
      </div>

      <div className="flex items-start gap-2 text-[11px] text-trade-text-muted">
        <AlertTriangle
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        />
        <span>
          Diese Orientierung ersetzt keine fachliche Prüfung. Bei jedem Verdacht
          auf ITAR-, militärischen oder US-Bezug: spezialisierte Beratung
          einholen.
        </span>
      </div>
    </div>
  );
}
