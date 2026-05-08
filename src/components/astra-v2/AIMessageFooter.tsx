"use client";

import * as React from "react";
import { Sparkles, ShieldAlert } from "lucide-react";
import type { V2CitationCheck } from "@/lib/comply-v2/astra-engine.server";

/**
 * AI Message Footer — Sprint 6C (EU AI Act Art. 50 §4) +
 *                     Sprint UF20 (confidence dot).
 *
 * Renders below every Astra-generated message bubble. Three layers:
 *
 *   1. **Confidence dot** (Sprint UF20) — small colored dot + label
 *      at the start of the footer line. Derived purely from the
 *      citation-validator output (no external API call): high when
 *      all citations verified, medium when some unverified, low when
 *      most unverified, omitted when there are no citations to check.
 *      Audit found "kein Confidence-Indicator pro Antwort" — this
 *      closes that gap with the data we already compute on the server.
 *
 *   2. **AI-generated disclosure** — always shown. Required by
 *      Art. 50(4) ("AI-generated text shall be marked"). Discreet
 *      but unmissable: small icon + "AI-generated" label.
 *
 *   3. **Citation warning** — shown only when the citation-validator
 *      flagged at least one unverified regulatory reference. Surfaces
 *      "N of M citations could not be verified — please cross-check
 *      against primary sources" + the first 3 unverified raw strings
 *      so the user knows exactly which to double-check.
 *
 * The footer is tightly coupled to the message bubble's bottom
 * margin — it should feel like part of the bubble, not a separate
 * card. Compact enough to disappear into the visual rhythm but
 * still readable on demand.
 */

export interface AIMessageFooterProps {
  citationCheck?: V2CitationCheck;
}

/**
 * Sprint UF20 — derive a confidence tier from the citation check.
 * Cheap, deterministic, no model call. The confidence reflects only
 * the regulatory-reference verification — it's NOT an end-to-end
 * answer-quality signal. The label is honest about this scope.
 */
function deriveConfidence(
  citationCheck: V2CitationCheck | undefined,
): { level: "high" | "medium" | "low"; label: string } | null {
  if (!citationCheck || citationCheck.total === 0) return null;
  const ratio = citationCheck.verifiedCount / citationCheck.total;
  if (ratio >= 0.85) {
    return {
      level: "high",
      label: `High confidence · ${citationCheck.verifiedCount}/${citationCheck.total} citations verified`,
    };
  }
  if (ratio >= 0.5) {
    return {
      level: "medium",
      label: `Medium confidence · ${citationCheck.verifiedCount}/${citationCheck.total} citations verified`,
    };
  }
  return {
    level: "low",
    label: `Low confidence · ${citationCheck.verifiedCount}/${citationCheck.total} citations verified`,
  };
}

export function AIMessageFooter({ citationCheck }: AIMessageFooterProps) {
  const hasUnverified = citationCheck && citationCheck.unverifiedCount > 0;
  const confidence = deriveConfidence(citationCheck);
  return (
    <footer
      data-testid="ai-message-footer"
      className="mt-2 flex flex-col gap-1.5"
    >
      {/* Layer 1 — Confidence dot + AI-generated disclosure on one line */}
      <p className="inline-flex flex-wrap items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
        {confidence ? (
          <>
            <span
              data-testid="ai-confidence-dot"
              className={
                confidence.level === "high"
                  ? "h-1.5 w-1.5 rounded-full bg-emerald-400"
                  : confidence.level === "medium"
                    ? "h-1.5 w-1.5 rounded-full bg-amber-400"
                    : "h-1.5 w-1.5 rounded-full bg-rose-400"
              }
              aria-hidden
            />
            <span
              data-testid="ai-confidence-label"
              className={
                confidence.level === "high"
                  ? "text-emerald-300/80"
                  : confidence.level === "medium"
                    ? "text-amber-300/80"
                    : "text-rose-300/80"
              }
              title={confidence.label}
            >
              {confidence.level} confidence
            </span>
            <span className="text-slate-600">·</span>
          </>
        ) : null}
        <Sparkles className="h-2.5 w-2.5 text-emerald-400/70" aria-hidden />
        <span data-testid="ai-generated-label">
          AI-generated · verify before submission
        </span>
      </p>

      {/* Layer 2 — Citation warning when unverified */}
      {hasUnverified ? (
        <div
          role="status"
          data-testid="citation-warning"
          className="inline-flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/[0.05] p-2"
        >
          <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-amber-100">
              {citationCheck.unverifiedCount} of {citationCheck.total} citation
              {citationCheck.total === 1 ? "" : "s"} could not be verified
            </p>
            <p className="mt-0.5 text-[10px] text-amber-100/70">
              Cross-check against primary sources before relying on these
              references.
            </p>
            {citationCheck.unverifiedSample.length > 0 ? (
              <ul className="mt-1.5 space-y-0.5 font-mono text-[9px]">
                {citationCheck.unverifiedSample.map((c, idx) => (
                  <li
                    key={`${c.regulation}-${c.article}-${idx}`}
                    className="text-amber-200/80"
                  >
                    · {c.raw}
                  </li>
                ))}
                {citationCheck.unverifiedCount >
                citationCheck.unverifiedSample.length ? (
                  <li className="text-amber-200/40">
                    +
                    {citationCheck.unverifiedCount -
                      citationCheck.unverifiedSample.length}{" "}
                    more…
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </footer>
  );
}
