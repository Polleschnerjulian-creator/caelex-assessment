"use client";

/**
 * ShamRiskChip — Sprint Z16 (Tier 5).
 *
 * Surfaces the OFAC 2026 Sham-Transaction Doctrine detector verdict for
 * a single operation as a compact chip on the operation detail page.
 *
 * The chip:
 *   - shows the risk score (0–100) and color-codes by recommendation band
 *   - on hover/expand, lists each red-flag title + the OFAC enforcement
 *     citations grounding it
 *   - lists `skippedChecks` (data-not-available) so silent-pass cannot
 *     happen — this was the specific failure mode OFAC called out in
 *     the GVA Capital settlement
 *
 * Fetches once on mount from GET /api/trade/operations/[id]/sham-risk.
 * Read-only — re-evaluation is implicit (every page load re-runs the
 * pure detector on the current persisted data).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import { ShieldAlert, ChevronDown, ChevronUp, FileText } from "lucide-react";

interface ShamCitation {
  name: string;
  year: number;
  penaltyUsd: number;
  factPattern: string;
  publicLink?: string;
}

interface ShamRedFlag {
  type: string;
  severity: number;
  title: string;
  rationale: string;
  citations: ShamCitation[];
}

interface ShamRiskResult {
  riskScore: number;
  recommendation: "PROCEED" | "ENHANCED_DUE_DILIGENCE" | "ESCALATE" | "REJECT";
  redFlags: ShamRedFlag[];
  skippedChecks: Array<{ type: string; reason: string }>;
  detectorVersion: string;
}

interface ShamRiskChipProps {
  operationId: string;
}

const RECOMMENDATION_LABEL: Record<ShamRiskResult["recommendation"], string> = {
  PROCEED: "Proceed",
  ENHANCED_DUE_DILIGENCE: "Enhanced DD",
  ESCALATE: "Escalate",
  REJECT: "Reject",
};

function bandColors(recommendation: ShamRiskResult["recommendation"]): {
  border: string;
  bg: string;
  text: string;
  badge: string;
} {
  switch (recommendation) {
    case "REJECT":
      return {
        border: "border-red-300",
        bg: "bg-red-50",
        text: "text-red-700",
        badge: "bg-red-600 text-white",
      };
    case "ESCALATE":
      return {
        border: "border-orange-300",
        bg: "bg-orange-50",
        text: "text-orange-700",
        badge: "bg-orange-600 text-white",
      };
    case "ENHANCED_DUE_DILIGENCE":
      return {
        border: "border-amber-300",
        bg: "bg-amber-50",
        text: "text-amber-700",
        badge: "bg-amber-500 text-white",
      };
    case "PROCEED":
    default:
      return {
        border: "border-emerald-200",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        badge: "bg-emerald-600 text-white",
      };
  }
}

export function ShamRiskChip({ operationId }: ShamRiskChipProps) {
  const [result, setResult] = useState<ShamRiskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/trade/operations/${operationId}/sham-risk`)
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to evaluate sham risk");
        }
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setResult(data.result ?? null);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Network error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [operationId]);

  if (loading) {
    return (
      <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-trade-border-subtle bg-trade-bg-panel px-3 py-2 text-[12px] text-trade-text-muted">
        <ShieldAlert className="h-3.5 w-3.5" />
        Evaluating sham-transaction risk…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
        <ShieldAlert className="h-3.5 w-3.5" />
        Sham-risk evaluation unavailable: {error}
      </div>
    );
  }

  if (!result) return null;

  const c = bandColors(result.recommendation);
  const hasContent =
    result.redFlags.length > 0 || result.skippedChecks.length > 0;

  return (
    <section
      className={`mb-6 rounded-md border ${c.border} ${c.bg} px-4 py-3`}
      aria-label="OFAC sham-transaction risk"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className={`mt-0.5 h-4 w-4 ${c.text}`} />
          <div>
            <div className="flex items-center gap-2">
              <h2
                className={`text-[12px] font-semibold uppercase tracking-widest ${c.text}`}
              >
                OFAC Sham-Transaction Risk
              </h2>
              <span
                className={`rounded px-1.5 py-[1px] font-mono text-[10px] font-bold ${c.badge}`}
              >
                {RECOMMENDATION_LABEL[result.recommendation]}
              </span>
              <span
                className={`font-mono text-[12px] font-semibold tabular-nums ${c.text}`}
              >
                {result.riskScore}/100
              </span>
            </div>
            <p className={`mt-0.5 text-[11px] ${c.text} opacity-80`}>
              {result.redFlags.length === 0
                ? "No red flags fired. "
                : `${result.redFlags.length} red flag${result.redFlags.length === 1 ? "" : "s"} fired. `}
              {result.skippedChecks.length > 0 &&
                `${result.skippedChecks.length} check${result.skippedChecks.length === 1 ? "" : "s"} skipped (no data).`}
            </p>
          </div>
        </div>
        {hasContent && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`inline-flex items-center gap-1 rounded border ${c.border} bg-white/60 px-2 py-1 text-[10px] font-medium ${c.text} transition hover:bg-white`}
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Details
              </>
            )}
          </button>
        )}
      </header>

      {expanded && hasContent && (
        <div className="mt-4 space-y-4">
          {result.redFlags.map((flag, i) => (
            <article
              key={`${flag.type}-${i}`}
              className="rounded border border-trade-border-subtle bg-white/80 p-3"
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-trade-text-muted">
                    {flag.type.replaceAll("_", " ")}
                  </span>
                  <span className="font-mono text-[10px] font-semibold tabular-nums text-trade-text-secondary">
                    +{flag.severity}
                  </span>
                </div>
              </div>
              <h3 className="text-[12.5px] font-semibold text-trade-text-primary">
                {flag.title}
              </h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-trade-text-secondary">
                {flag.rationale}
              </p>
              {flag.citations.length > 0 && (
                <div className="mt-2 border-t border-trade-border-subtle pt-2">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-trade-text-muted">
                    OFAC Enforcement Precedents
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-trade-text-secondary">
                    {flag.citations.map((cite) => (
                      <li
                        key={`${cite.name}-${cite.year}`}
                        className="flex items-start gap-1.5"
                      >
                        <FileText className="mt-0.5 h-3 w-3 shrink-0 text-trade-text-muted" />
                        <span>
                          <span className="font-semibold">{cite.name}</span> (
                          {cite.year}, $
                          {(cite.penaltyUsd / 1_000_000).toFixed(1)}M)
                          {cite.publicLink && (
                            <>
                              {" "}
                              <a
                                href={cite.publicLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-trade-accent underline decoration-dotted hover:text-trade-accent-strong"
                              >
                                settlement PDF
                              </a>
                            </>
                          )}
                          <span className="block text-trade-text-muted">
                            {cite.factPattern}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}

          {result.skippedChecks.length > 0 && (
            <div className="rounded border border-dashed border-trade-border-subtle bg-trade-bg-panel/60 p-3">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-trade-text-muted">
                Checks Skipped — No Data Available
              </div>
              <p className="mb-1.5 text-[11px] italic text-trade-text-muted">
                These checks did not pass — they did not run. Treat them as open
                until the underlying data is collected.
              </p>
              <ul className="space-y-1 text-[11px] text-trade-text-secondary">
                {result.skippedChecks.map((s) => (
                  <li key={s.type} className="flex items-start gap-1.5">
                    <span className="font-mono text-[10px] text-trade-text-muted">
                      {s.type.replaceAll("_", " ")}
                    </span>
                    <span className="opacity-80">— {s.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <footer className="text-[10px] italic text-trade-text-muted">
            31 CFR § 501.601 · OFAC Enforcement Guidelines Update, January 2026
            · Caelex detector {result.detectorVersion}
          </footer>
        </div>
      )}
    </section>
  );
}
