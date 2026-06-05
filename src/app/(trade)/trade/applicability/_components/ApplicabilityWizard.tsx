"use client";

/**
 * ApplicabilityWizard — the ~7-question export-control applicability triage
 * stepper. The visual + interaction sibling of HomeOnboarding: indigo
 * gradient header, --trade-* token cards, lucide icons, progress dots.
 *
 * Answers live in client state and NOTHING persists until the final,
 * acknowledged submit (R6 — one checkbox "mir ist klar, dass dies eine
 * vorläufige Orientierung ist und keine Rechtsberatung ersetzt"). On success
 * the wizard swaps to <ApplicabilityResult/>.
 *
 * Honesty in the wizard itself: every question carries a plain-language
 * "warum wir das fragen" helper and a "weiß nicht / unsicher" option, which
 * the pure engine rounds UP to "may apply" (R2). The US/military questions
 * (Q4–Q6) are never skipped (R3 stickiness).
 *
 * Presentational + local state only (tsc/eslint/review-gated; jsdom hangs).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Package,
  Rocket,
  Flag,
  Users,
  Shield,
  Send,
  Loader2,
  HelpCircle,
} from "lucide-react";
import type {
  ApplicabilityAnswers,
  ApplicabilityResult as ApplicabilityResultModel,
  ProductKind,
  DomainSignal,
  YesNoUnsure,
  TransferScope,
} from "@/lib/trade/applicability/assess-applicability";
import { submitApplicability } from "../actions";
import { ApplicabilityResult } from "./ApplicabilityResult";

// ─── Option vocabularies (label + value), German ──────────────────────
const ESTABLISHMENT: Array<{ value: string; label: string }> = [
  { value: "DE", label: "Deutschland" },
  { value: "FR", label: "Frankreich" },
  { value: "IT", label: "Italien" },
  { value: "ES", label: "Spanien" },
  { value: "NL", label: "Niederlande" },
  { value: "EU", label: "EU — Mitgliedsstaat noch offen" },
  { value: "NON_EU", label: "Außerhalb der EU" },
];

const PRODUCT_KINDS: Array<{ value: ProductKind; label: string }> = [
  { value: "hardware", label: "Hardware (Bauteile, Geräte, Systeme)" },
  { value: "software", label: "Software" },
  { value: "technology", label: "Technologie / technische Unterlagen" },
  { value: "service_only", label: "Nur Dienstleistung" },
  { value: "unsure", label: "Weiß nicht / unsicher" },
];

const DOMAIN_SIGNALS: Array<{ value: DomainSignal; label: string }> = [
  { value: "satellite", label: "Satellit (komplett oder Bus)" },
  { value: "launch_propulsion", label: "Antrieb / Trägerrakete" },
  { value: "ground_station", label: "Bodenstation" },
  { value: "rf_payload", label: "RF-Nutzlast / Kommunikation" },
  { value: "imaging_eo_sar", label: "Erdbeobachtung / SAR" },
  { value: "none", label: "Nichts davon" },
  { value: "unsure", label: "Weiß nicht / unsicher" },
];

const YES_NO_UNSURE: Array<{ value: YesNoUnsure; label: string }> = [
  { value: "yes", label: "Ja" },
  { value: "no", label: "Nein" },
  { value: "unsure", label: "Weiß nicht / unsicher" },
];

const TRANSFER_SCOPE: Array<{ value: TransferScope; label: string }> = [
  { value: "none", label: "Nein, alles bleibt im Land" },
  { value: "intra_eu_only", label: "Nur innerhalb der EU" },
  { value: "outside_eu", label: "Auch außerhalb der EU" },
  { value: "global", label: "Weltweit" },
  { value: "unsure", label: "Weiß nicht / unsicher" },
];

type StepKey =
  | "establishment"
  | "products"
  | "domains"
  | "usOrigin"
  | "usPerson"
  | "military"
  | "transfer";

interface StepDef {
  key: StepKey;
  icon: React.ComponentType<{ className?: string }>;
  question: string;
  why: string;
}

const STEPS: StepDef[] = [
  {
    key: "establishment",
    icon: Building2,
    question: "Wo ist euer Unternehmen rechtlich ansässig?",
    why: "Euer Sitz bestimmt das Grundregime — EU-Dual-Use-VO und ggf. nationales Recht (z. B. die deutsche BAFA).",
  },
  {
    key: "products",
    icon: Package,
    question: "Was stellt ihr her oder bewegt ihr?",
    why: "Ob es überhaupt ein kontrollierbares Gut gibt, entscheidet, welche Regeln greifen können. Mehrfachauswahl möglich.",
  },
  {
    key: "domains",
    icon: Rocket,
    question: "Hat davon etwas mit Raumfahrt oder Verteidigung zu tun?",
    why: "Antrieb/Trägertechnik berührt das MTCR; komplette Satelliten/Nutzlasten können besondere Kontrollen auslösen. Mehrfachauswahl.",
  },
  {
    key: "usOrigin",
    icon: Flag,
    question: "Steckt US-Ursprung drin?",
    why: "US-Teile, -Komponenten, -Software oder US-Technologie können die US-EAR auslösen — auch für ein deutsches Unternehmen.",
  },
  {
    key: "usPerson",
    icon: Users,
    question:
      "Sind US-Personen beteiligt oder verarbeitet ihr US-Technologie / technische Daten?",
    why: "Das betrifft „Deemed Exports“ und einen möglichen ITAR-Personen-Nexus — auch ohne physische Ausfuhr.",
  },
  {
    key: "military",
    icon: Shield,
    question:
      "Baut, integriert oder wartet ihr gezielt MILITÄRISCHES Gerät (statt rein zivil)?",
    why: "Militärischer Bezug kann ITAR/USML oder die nationale Munitionsliste auslösen — das ist der heikelste Punkt.",
  },
  {
    key: "transfer",
    icon: Send,
    question:
      "Liefert oder übermittelt ihr an jemanden außerhalb eures Landes?",
    why: "Auch das Versenden technischer Unterlagen oder der Zugang für ausländische Mitarbeitende zählt als Übermittlung.",
  },
];

const ACK_TEXT =
  "Mir ist klar, dass dies eine vorläufige Orientierung ist und keine Rechtsberatung ersetzt.";

function emptyAnswers(): ApplicabilityAnswers {
  return {
    establishmentCountry: "",
    productKinds: [],
    domainSignals: [],
    hasUsOriginContent: "unsure",
    hasUsPersonOrTechNexus: "unsure",
    hasMilitaryOrDefenseNexus: "unsure",
    transfersAbroad: "unsure",
  };
}

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function ApplicabilityWizard() {
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] =
    React.useState<ApplicabilityAnswers>(emptyAnswers);
  const [ack, setAck] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ApplicabilityResultModel | null>(
    null,
  );

  const total = STEPS.length;
  const isLast = step === total - 1;
  const current = STEPS[step];

  // Per-step "can advance" gating — a question must be answered to proceed.
  // "unsure" is a valid answer (rounds up), so the gate is "non-empty", not
  // "decisive".
  const stepAnswered = React.useMemo(() => {
    switch (current.key) {
      case "establishment":
        return answers.establishmentCountry !== "";
      case "products":
        return answers.productKinds.length > 0;
      case "domains":
        return answers.domainSignals.length > 0;
      case "transfer":
        return answers.transfersAbroad !== ("" as TransferScope);
      // Q4–Q6 default to "unsure" (already a valid answer), so always passable.
      default:
        return true;
    }
  }, [current.key, answers]);

  function next() {
    setError(null);
    if (!isLast) setStep((s) => Math.min(s + 1, total - 1));
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitApplicability(answers);
      if (res.ok) {
        setResult(res.result);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Etwas ist schiefgelaufen. Bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <ApplicabilityResult
        result={result}
        onApply={() => {
          window.location.assign("/trade");
        }}
        onRestart={() => {
          setResult(null);
          setAnswers(emptyAnswers());
          setAck(false);
          setStep(0);
        }}
      />
    );
  }

  const StepIcon = current.icon;

  return (
    <section data-testid="applicability-wizard" className="space-y-5">
      {/* Neutral dark-slate header — sibling of HomeOnboarding. */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#44454e] to-[#1c1d22] px-6 py-5 shadow-[0_8px_30px_rgba(20,21,26,0.4)]">
        <div className="text-[10px] font-medium uppercase tracking-wide text-white/80">
          Betrifft mich das überhaupt?
        </div>
        <div className="mt-1 text-lg font-semibold text-white">
          Exportkontrolle — kurze Einschätzung
        </div>
        <div className="text-sm text-white/90">
          In ~2 Minuten: welche Regeln für euch gelten. Eine Orientierung, keine
          Rechtsberatung.
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span
            key={s.key}
            className={`h-1.5 rounded-full transition-all ${
              i === step
                ? "w-6 bg-trade-accent"
                : i < step
                  ? "w-1.5 bg-trade-accent-strong"
                  : "w-1.5 bg-trade-border"
            }`}
          />
        ))}
      </div>
      <div className="text-[11px] text-trade-text-muted">
        Frage {step + 1} von {total}
      </div>

      {/* Question card */}
      <div className="rounded-xl border border-trade-border bg-trade-bg-panel px-5 py-5">
        <div className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-trade-accent-soft text-trade-accent-strong"
          >
            <StepIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-trade-text-primary">
              {current.question}
            </h2>
            <div className="mt-1 flex items-start gap-1.5 text-[12px] leading-relaxed text-trade-text-muted">
              <HelpCircle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{current.why}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <StepBody
            answers={answers}
            setAnswers={setAnswers}
            stepKey={current.key}
          />
        </div>
      </div>

      {/* R6 — acknowledgement, only on the last step, gates the submit. */}
      {isLast ? (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-trade-border-subtle bg-trade-bg-subtle px-4 py-3">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-trade-accent"
          />
          <span className="text-[12px] leading-relaxed text-trade-text-secondary">
            {ACK_TEXT}
          </span>
        </label>
      ) : null}

      {error ? (
        <p className="text-[12px] text-trade-accent-danger" role="alert">
          {error}
        </p>
      ) : null}

      {/* Nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={step === 0 || submitting}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-trade-text-secondary transition hover:text-trade-text-primary disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Zurück
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!ack || submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-trade-accent px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {submitting ? "Wird ausgewertet…" : "Einschätzung anzeigen"}
            {!submitting ? (
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            ) : null}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            disabled={!stepAnswered}
            className="inline-flex items-center gap-2 rounded-lg bg-trade-accent px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-trade-accent-strong disabled:opacity-50"
          >
            Weiter
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

// ─── Per-step body (the actual inputs) ────────────────────────────────
function StepBody({
  answers,
  setAnswers,
  stepKey,
}: {
  answers: ApplicabilityAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<ApplicabilityAnswers>>;
  stepKey: StepKey;
}) {
  switch (stepKey) {
    case "establishment":
      return (
        <SingleSelect
          options={ESTABLISHMENT}
          value={answers.establishmentCountry}
          onChange={(v) =>
            setAnswers((a) => ({ ...a, establishmentCountry: v }))
          }
        />
      );
    case "products":
      return (
        <MultiSelect
          options={PRODUCT_KINDS}
          values={answers.productKinds}
          onToggle={(v) =>
            setAnswers((a) => ({
              ...a,
              productKinds: toggleInArray(a.productKinds, v as ProductKind),
            }))
          }
        />
      );
    case "domains":
      return (
        <MultiSelect
          options={DOMAIN_SIGNALS}
          values={answers.domainSignals}
          onToggle={(v) =>
            setAnswers((a) => ({
              ...a,
              domainSignals: toggleInArray(a.domainSignals, v as DomainSignal),
            }))
          }
        />
      );
    case "usOrigin":
      return (
        <SingleSelect
          options={YES_NO_UNSURE}
          value={answers.hasUsOriginContent}
          onChange={(v) =>
            setAnswers((a) => ({
              ...a,
              hasUsOriginContent: v as YesNoUnsure,
            }))
          }
        />
      );
    case "usPerson":
      return (
        <SingleSelect
          options={YES_NO_UNSURE}
          value={answers.hasUsPersonOrTechNexus}
          onChange={(v) =>
            setAnswers((a) => ({
              ...a,
              hasUsPersonOrTechNexus: v as YesNoUnsure,
            }))
          }
        />
      );
    case "military":
      return (
        <SingleSelect
          options={YES_NO_UNSURE}
          value={answers.hasMilitaryOrDefenseNexus}
          onChange={(v) =>
            setAnswers((a) => ({
              ...a,
              hasMilitaryOrDefenseNexus: v as YesNoUnsure,
            }))
          }
        />
      );
    case "transfer":
      return (
        <SingleSelect
          options={TRANSFER_SCOPE}
          value={answers.transfersAbroad}
          onChange={(v) =>
            setAnswers((a) => ({
              ...a,
              transfersAbroad: v as TransferScope,
            }))
          }
        />
      );
    default:
      return null;
  }
}

// ─── Reusable option controls ─────────────────────────────────────────
function SingleSelect({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={`flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left text-[13px] transition ${
              selected
                ? "border-trade-accent bg-trade-accent-soft text-trade-text-primary"
                : "border-trade-border bg-trade-bg-panel text-trade-text-secondary hover:bg-trade-hover"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                selected
                  ? "border-trade-accent bg-trade-accent"
                  : "border-trade-border-strong"
              }`}
            >
              {selected ? (
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              ) : null}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function MultiSelect({
  options,
  values,
  onToggle,
}: {
  options: Array<{ value: string; label: string }>;
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const selected = values.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            aria-pressed={selected}
            className={`flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left text-[13px] transition ${
              selected
                ? "border-trade-accent bg-trade-accent-soft text-trade-text-primary"
                : "border-trade-border bg-trade-bg-panel text-trade-text-secondary hover:bg-trade-hover"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                selected
                  ? "border-trade-accent bg-trade-accent text-white"
                  : "border-trade-border-strong"
              }`}
            >
              {selected ? (
                <svg
                  viewBox="0 0 12 12"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    d="M2.5 6.5l2.5 2.5 4.5-5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
