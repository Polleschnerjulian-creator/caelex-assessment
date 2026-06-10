"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * FindingCard — the full-tier explanation-envelope renderer (plan Task 3.3).
 *
 * Lineage: the refusal pattern is a structural copy of the Passage
 * ExplainedPanel (src/components/trade/ExplainedPanel.tsx) — COPIED, not
 * imported (surface separation). The card REFUSES to render any finding that
 * fails `isFindingComplete`, showing the named-missing-fields fallback
 * instead. A conclusion without its full reasoning and citation must never
 * be surfaced (honesty invariant #5).
 *
 * Renders, for a complete envelope:
 *   - the verdict badge,
 *   - the one-line obligation (WHAT),
 *   - WHY + WHEREFORE,
 *   - the why-trace ("Because you answered: …"),
 *   - legal sources with citation + as-of date (+ "legal basis pending
 *     verification" when a source is unverified),
 *   - the confidence band,
 *   - the §6 (2) `evidenceExamples` list ("Evidence a supervisor would
 *     accept") when present — full tier only; the pipeline never attaches it
 *     to INDETERMINATE findings,
 *   - the flux chip COLLAPSED by default with one-click expansion
 *     (founder §11.4: "contested — conservative reading shown"; the
 *     legislative positions enter the DOM only on expand).
 *
 * Also exports `FluxChip` — reused by the full result page for contested
 * roadmap items. (The §6 NIS2 transposition suffix lives in the PURE sibling
 * module ./nis2-suffix.ts: the server page must be able to CALL it, and a
 * non-component export of a "use client" file is a client reference on the
 * server, not a callable.)
 *
 * NO overall score: nothing in this module aggregates (invariant #6).
 */

import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Scale,
} from "lucide-react";
import {
  isFindingComplete,
  type AssessmentFinding,
  type FindingVerdict,
  type FluxFlag,
} from "@/lib/assessment/finding";

// ─── Shared label maps (spine design language — QuickResultPanel parity) ────

const VERDICT_BADGE: Record<
  FindingVerdict,
  { label: string; className: string }
> = {
  applicable: {
    label: "Applicable",
    className: "bg-red-50 border-red-200 text-red-600",
  },
  conditional: {
    label: "Conditional",
    className: "bg-black/[0.05] border-black/[0.18] text-black/75",
  },
  contested: {
    label: "Contested",
    className: "bg-black/[0.05] border-black/[0.18] text-black/75",
  },
  advisory: {
    label: "Advisory",
    className: "bg-black/[0.04] border-black/[0.12] text-black/60",
  },
  not_applicable: {
    label: "Not applicable",
    className: "bg-black/[0.04] border-black/[0.12] text-black/60",
  },
};

const CONFIDENCE_LABEL: Record<string, string> = {
  DETERMINED: "Determined",
  PROBABLE: "Probable — conservative reading",
  INDETERMINATE: "Indeterminate — decisive answer missing",
};

// ─── Flux chip (founder §11.4: collapsed-conservative, expand on click) ─────

export function FluxChip({ flux }: { flux: FluxFlag }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 rounded-lg bg-black/[0.03] border border-black/[0.15] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="inline-flex items-center gap-2 text-small text-black/75">
          <AlertCircle size={12} aria-hidden="true" />
          {flux.summary}
        </span>
        {expanded ? (
          <ChevronDown size={14} className="text-black/55" aria-hidden="true" />
        ) : (
          <ChevronRight
            size={14}
            className="text-black/55"
            aria-hidden="true"
          />
        )}
      </button>
      {expanded ? (
        <div className="px-3 pb-3">
          <p className="text-small text-black/70 leading-relaxed mb-2">
            {flux.conservativeReading}
          </p>
          <ul className="space-y-1.5">
            {flux.positions.map((p, i) => (
              <li key={i} className="text-small text-black/55 leading-relaxed">
                <span className="text-black/40">{p.source}:</span> {p.position}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ─── The named-missing-fields refusal block (ExplainedPanel pattern) ────────

/**
 * Rendered IN PLACE of the finding when the envelope is incomplete. Loud,
 * unmistakable, and NAMES the missing fields so the bug is obvious in dev.
 * A withheld finding is the safe failure mode — never a partial render.
 */
function FindingWithheldBlock({ missing }: { missing: string[] }) {
  return (
    <div
      role="alert"
      data-testid="finding-withheld"
      className="rounded-xl bg-red-50 border border-red-200 p-4 text-left"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={16}
          className="mt-0.5 shrink-0 text-red-600"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-body font-medium text-red-600">
            Finding withheld — explanation incomplete
          </p>
          <p className="mt-1 text-small text-black/70 leading-relaxed">
            This finding cannot be shown because its explanation envelope is
            incomplete. A conclusion without its full reasoning and citation may
            not be surfaced. Missing field(s):{" "}
            <span className="font-mono text-black/75">
              {missing.join(", ")}
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── The card ────────────────────────────────────────────────────────────────

export interface FindingCardProps {
  finding: AssessmentFinding;
}

export default function FindingCard({ finding }: FindingCardProps) {
  // ── ENFORCEMENT: refuse to render an incomplete envelope (invariant #5). ──
  const missing = isFindingComplete(finding);
  if (missing.length > 0) {
    return <FindingWithheldBlock missing={missing} />;
  }

  const badge = VERDICT_BADGE[finding.verdict];

  return (
    <article className="rounded-xl bg-white backdrop-blur-[10px] border border-black/[0.08] p-5 text-left">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-subtitle text-[#1d1d1f] leading-snug">
          {finding.what}
        </p>
        <span
          className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full border text-micro uppercase tracking-[0.12em] ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <p className="text-body text-black/60 leading-relaxed mb-2">
        {finding.why}
      </p>
      <p className="text-body text-black/70 leading-relaxed">
        {finding.wherefore}
      </p>

      {finding.whyTrace.length > 0 ? (
        <p className="mt-3 text-small text-black/45">
          Because you answered:{" "}
          {finding.whyTrace
            .map((t) => `${t.questionId} — ${t.answerLabel}`)
            .join(" · ")}
        </p>
      ) : null}

      {finding.sources.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {finding.sources.map((s, i) => (
            <li key={i} className="text-small text-black/45 leading-relaxed">
              <Scale
                size={10}
                className="inline mr-1.5 -mt-0.5"
                aria-hidden="true"
              />
              {s.label} — {s.citation} (as of {s.asOf})
              {!s.verified ? (
                <span className="text-black/60">
                  {" "}
                  · legal basis pending verification
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {finding.evidenceExamples && finding.evidenceExamples.length > 0 ? (
        <div className="mt-4 rounded-lg bg-black/[0.03] border border-black/[0.12] p-3">
          <p className="inline-flex items-center gap-2 text-small font-medium text-[#1d1d1f] mb-2">
            <ClipboardCheck size={12} aria-hidden="true" />
            Evidence a supervisor would accept
          </p>
          <ul className="space-y-1">
            {finding.evidenceExamples.map((e, i) => (
              <li key={i} className="text-small text-black/60 leading-relaxed">
                — {e}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-3 text-micro uppercase tracking-[0.15em] text-black/40">
        Confidence: {CONFIDENCE_LABEL[finding.confidence] ?? finding.confidence}
      </p>

      {finding.fluxFlag ? <FluxChip flux={finding.fluxFlag} /> : null}
    </article>
  );
}
