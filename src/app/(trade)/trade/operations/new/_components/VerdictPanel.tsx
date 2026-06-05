"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Info,
} from "lucide-react";
import { ClassificationPanel } from "@/components/trade/ClassificationPanel";
import {
  LIABILITY_COPY,
  type EngineDetermination,
  type OperationContext,
} from "@/lib/trade/license-application";
import { WasJetztPanel } from "./WasJetztPanel";

type StepStatus = "done" | "gap" | "blocked";
type Verdict = "GO" | "REVIEW" | "BLOCKED";

interface StepResult {
  step: string;
  status: StepStatus;
  summary: string;
  why: string;
}
interface Pendenz {
  label: string;
  actionHref?: string;
}
interface LineView {
  lineId: string;
  itemId: string;
  itemName: string;
  /** ClassificationResult — only `licenseDetermination` is read here. */
  classification: { licenseDetermination?: EngineDetermination } | null;
}
interface Assessment {
  operationId: string;
  counterpartyId: string;
  verdict: Verdict;
  headline: string;
  steps: StepResult[];
  pendenzen: Pendenz[];
  lines: LineView[];
}

const STEP_LABEL: Record<string, string> = {
  classify: "Klassifizieren",
  screen: "Screenen",
  jurisdiction: "Jurisdiktion / De-minimis",
  license: "Genehmigungsbedarf",
  form: "Formular",
};
const VERDICT_CLASS: Record<Verdict, string> = {
  GO: "trade-chip-success",
  REVIEW: "trade-chip-warn",
  BLOCKED: "trade-chip-danger",
};

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done")
    return <CheckCircle2 className="h-5 w-5 text-trade-accent-success" />;
  if (status === "blocked")
    return <XCircle className="h-5 w-5 text-trade-accent-danger" />;
  return <AlertTriangle className="h-5 w-5 text-trade-accent-warn" />;
}

/**
 * PERSISTENT-LIGHT liability cue (tier 3) next to auto-classify / auto-screen
 * claims: a small inline ⓘ that counters the "auto- = done" misread at the
 * exact spot it arises. Deliberately quiet — must not compete with the banner.
 */
function AutoSuggestHint() {
  return (
    <span
      className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-trade-text-muted/80"
      title={LIABILITY_COPY.autoSuggestCue}
    >
      <Info className="h-3 w-3 shrink-0" />
      {LIABILITY_COPY.autoSuggestCue}
    </span>
  );
}

// ─── Operation GET → OperationContext (prefill) ──────────────────────

/** Minimal shape read from GET /api/trade/operations/[id] for prefill. */
interface OperationGet {
  reference: string;
  shipToCountry: string;
  endUseCountry: string | null;
  declaredEndUse: string;
  counterparty?: { legalName?: string | null } | null;
  lines?: Array<{
    quantity?: number | null;
    unitValue?: number | null; // euros (API serialised cents→euros)
    unitCurrency?: string | null;
    item?: {
      eccnEU?: string | null;
      eccnUS?: string | null;
      usmlCategory?: string | null;
    } | null;
  }> | null;
}

const KNOWN_END_USE = new Set([
  "CIVIL",
  "DUAL_USE",
  "MILITARY",
  "WMD_RELATED",
  "UNKNOWN",
]);

/**
 * Assemble an OperationContext from the operation GET payload. The triggering
 * codes are the union of each line item's ECCN/USML; the starting cap is
 * Σ(quantity × unitValue) in the first line's currency (default EUR).
 */
function buildOperationContext(
  op: OperationGet,
  operationId: string,
): OperationContext {
  const codes = new Set<string>();
  let total = 0;
  let sawValue = false;
  const lines = op.lines ?? [];
  for (const l of lines) {
    const it = l.item;
    if (it?.eccnEU) codes.add(it.eccnEU);
    if (it?.eccnUS) codes.add(it.eccnUS);
    if (it?.usmlCategory) codes.add(it.usmlCategory);
    if (typeof l.unitValue === "number" && typeof l.quantity === "number") {
      total += l.unitValue * l.quantity;
      sawValue = true;
    }
  }
  const currency =
    lines.find((l) => l.unitCurrency)?.unitCurrency?.toUpperCase() ?? "EUR";
  const declaredEndUse = KNOWN_END_USE.has(op.declaredEndUse)
    ? (op.declaredEndUse as OperationContext["declaredEndUse"])
    : "UNKNOWN";

  return {
    operationId,
    reference: op.reference,
    counterpartyName: op.counterparty?.legalName ?? "—",
    shipToCountry: op.shipToCountry,
    endUseCountry: op.endUseCountry ?? null,
    declaredEndUse,
    triggerCodes: [...codes],
    totalValueEur: sawValue ? total : null,
    currency,
  };
}

export function VerdictPanel({ operationId }: { operationId: string }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [opContext, setOpContext] = useState<OperationContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screening, setScreening] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trade/operations/${operationId}/assess`);
      if (!res.ok)
        throw new Error((await res.json()).error ?? "Prüfung fehlgeschlagen");
      setAssessment((await res.json()).assessment);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unerwarteter Fehler");
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  // Second, non-blocking read (option 5a): the assess response carries the
  // determinations but NOT the operation's reference / shipTo / declaredEndUse /
  // line values needed to prefill an application draft. Fetch the existing
  // operation GET and assemble an OperationContext. Failure is silent — the
  // "Was jetzt?" panel still shows its WHY/licence/docs; only the "Antrag
  // vorbereiten" button waits for context.
  const loadContext = useCallback(async () => {
    try {
      const res = await fetch(`/api/trade/operations/${operationId}`);
      if (!res.ok) return;
      const op = (await res.json()).operation;
      if (!op || typeof op !== "object" || !op.reference) return;
      setOpContext(buildOperationContext(op, operationId));
    } catch {
      // ignore — prefill context is best-effort
    }
  }, [operationId]);

  useEffect(() => {
    void load();
    void loadContext();
  }, [load, loadContext]);

  const runScreen = useCallback(async () => {
    if (!assessment) return;
    setScreening(true);
    try {
      await fetch(`/api/trade/parties/${assessment.counterpartyId}/screen`, {
        method: "POST",
      });
      await load();
    } finally {
      setScreening(false);
    }
  }, [assessment, load]);

  if (loading) {
    return (
      <div
        className="flex items-center gap-2 text-trade-text-muted"
        data-testid="verdict-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" /> Prüfe …
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border px-4 py-3 text-sm trade-chip-danger">
        {error}
      </div>
    );
  }
  if (!assessment) return null;

  return (
    <section className="space-y-5" data-testid="verdict-panel">
      <div
        className={`rounded-xl border px-5 py-4 text-lg font-semibold ${VERDICT_CLASS[assessment.verdict]}`}
      >
        {assessment.headline}
      </div>

      {/* Liability framing (tier 1/2) — directly under the verdict, as
          prominent as the verdict itself. GO = honest green note; REVIEW =
          amber, BLOCKED = red (loudest). Copy is single-sourced + tested. */}
      {assessment.verdict === "GO" ? (
        <div className="flex items-start gap-2 rounded-lg border px-4 py-3 text-sm trade-chip-success">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{LIABILITY_COPY.goNote}</span>
        </div>
      ) : (
        <div
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-medium ${
            assessment.verdict === "BLOCKED"
              ? "trade-chip-danger"
              : "trade-chip-warn"
          }`}
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{LIABILITY_COPY.verdictBanner}</span>
        </div>
      )}

      <ol className="space-y-2">
        {assessment.steps.map((s) => (
          <li
            key={s.step}
            className="flex items-start gap-3 rounded-lg border border-trade-border bg-trade-bg-panel px-4 py-3"
          >
            <StepIcon status={s.status} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-trade-text-primary">
                {STEP_LABEL[s.step] ?? s.step}
              </div>
              <div className="text-sm text-trade-text-muted">{s.summary}</div>
              {s.why && (
                <div className="mt-0.5 text-xs text-trade-text-muted/70">
                  {s.why}
                </div>
              )}
              {(s.step === "classify" || s.step === "screen") && (
                <AutoSuggestHint />
              )}
            </div>
            {s.step === "screen" && s.status === "gap" && (
              <button
                onClick={() => void runScreen()}
                disabled={screening}
                className="inline-flex items-center gap-1.5 rounded-lg bg-trade-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-trade-accent-strong disabled:opacity-50"
              >
                {screening ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                Jetzt screenen
              </button>
            )}
          </li>
        ))}
      </ol>

      {/* "Was jetzt?" — surface the discarded licenseDetermination: WHY +
          likely licence + docs + Antrag-vorbereiten (REVIEW) / stop (BLOCKED).
          Only for non-GO; the panel self-hides if nothing is actionable. */}
      {assessment.verdict !== "GO" && (
        <WasJetztPanel
          determinations={assessment.lines
            .map((l) => l.classification?.licenseDetermination)
            .filter((d): d is EngineDetermination => Boolean(d))}
          ctx={opContext}
          onDraftCreated={() => void load()}
        />
      )}

      {assessment.lines.some((l) => l.classification) && (
        <div className="space-y-2">
          {assessment.lines
            .filter((l) => l.classification)
            .map((l) => (
              <details
                key={l.lineId}
                className="rounded-lg border border-trade-border bg-trade-bg-subtle px-4 py-3"
              >
                <summary className="cursor-pointer text-sm text-trade-text-primary">
                  Einstufungsdetails — {l.itemName}
                </summary>
                <div className="mt-3">
                  {/* ClassificationResult is structurally identical to the panel's prop type */}
                  <ClassificationPanel
                    classification={l.classification as unknown as never}
                  />
                </div>
              </details>
            ))}
        </div>
      )}

      {assessment.pendenzen.length > 0 && (
        <div className="rounded-lg border px-4 py-3 trade-chip-warn">
          <div className="mb-2 text-sm font-medium text-current">
            Offene Punkte
          </div>
          <ul className="space-y-1.5">
            {assessment.pendenzen.map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 text-sm text-trade-text-muted"
              >
                <span>{p.label}</span>
                {p.actionHref && (
                  <Link
                    href={p.actionHref}
                    className="text-trade-accent hover:underline"
                  >
                    öffnen
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-trade-border px-4 py-2 text-sm text-trade-text-primary transition hover:bg-trade-hover"
        >
          <RefreshCw className="h-4 w-4" /> Erneut prüfen
        </button>
        <Link
          href={`/trade/operations/${operationId}`}
          className="rounded-lg bg-trade-accent px-4 py-2 text-sm text-white transition hover:bg-trade-accent-strong"
        >
          Zum Vorgang
        </Link>
      </div>
    </section>
  );
}
