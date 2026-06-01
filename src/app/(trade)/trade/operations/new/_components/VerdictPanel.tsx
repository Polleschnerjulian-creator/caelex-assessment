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
} from "lucide-react";
import { ClassificationPanel } from "@/components/trade/ClassificationPanel";

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
  classification: unknown | null;
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
  GO: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  REVIEW: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  BLOCKED: "border-red-500/40 bg-red-500/10 text-red-200",
};

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done")
    return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
  if (status === "blocked") return <XCircle className="h-5 w-5 text-red-400" />;
  return <AlertTriangle className="h-5 w-5 text-amber-400" />;
}

export function VerdictPanel({ operationId }: { operationId: string }) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
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

  useEffect(() => {
    void load();
  }, [load]);

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
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
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
                    classification={l.classification as never}
                  />
                </div>
              </details>
            ))}
        </div>
      )}

      {assessment.pendenzen.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <div className="mb-2 text-sm font-medium text-amber-200">
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
