"use client";

import * as React from "react";
import { Sparkles, ShieldAlert } from "lucide-react";
import type { V2CitationCheck } from "@/lib/comply-v2/astra-engine.server";

/**
 * AI Message Footer — Sprint 6C (EU AI Act Art. 50 §4)
 *
 * Renders below every Astra-generated message bubble. Two layers:
 *
 *   1. **AI-generated disclosure** — always shown. Required by
 *      Art. 50(4) ("AI-generated text shall be marked"). Discreet
 *      but unmissable: small icon + "AI-generated" label.
 *
 *   2. **Citation warning** — shown only when the citation-validator
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

export function AIMessageFooter({ citationCheck }: AIMessageFooterProps) {
  const hasUnverified = citationCheck && citationCheck.unverifiedCount > 0;
  return (
    <footer
      data-testid="ai-message-footer"
      className="mt-2 flex flex-col gap-1.5"
    >
      {/* Layer 1 — AI-generated disclosure */}
      <p className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500">
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
