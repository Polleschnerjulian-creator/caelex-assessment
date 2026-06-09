"use client";

/**
 * ExplainedPanel — the renderer for the Explanation Envelope.
 *
 * THIS COMPONENT IS THE ENFORCEMENT BOUNDARY of the founder's thesis: a
 * consequential export-control output may not reach the operator's eyes
 * without its full WHAT / WHY / WHEREFORE / CONFIDENCE / SOURCE / OVERRIDE.
 *
 * If the envelope is incomplete — `isExplained()` reports any missing field —
 * this panel REFUSES to render the value and instead renders a loud
 * "EXPLANATION MISSING — result withheld" error block. An un-explained verdict
 * therefore cannot ship: the failure mode is a withheld result, never a
 * silently-shown black-box verdict.
 *
 * Progressive disclosure: the one-line verdict layer (WHAT + confidence badge +
 * recommended next action) is always visible; the WHY (legal basis, matched
 * rule, parameters), the SOURCE provenance, and the OVERRIDE affordance live in
 * a "Show reasoning" disclosure. The content underneath is identical for expert
 * and novice — teaching is a free side effect of the transparency the auditor
 * already requires.
 *
 * Honest colour: UNVERIFIED is amber/neutral and blocking — NEVER green. A
 * fail-closed result is visibly not-a-clearance.
 *
 * Dark-theme tokens only (rgba inline styles matching the Trade surface).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldQuestion,
  ExternalLink,
  FileText,
  UserCheck,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import {
  type ExplainConfidence,
  type ExplainedResult,
  isExplained,
} from "@/lib/comply-v2/trade/explained-result";

// ─── Confidence badge config ────────────────────────────────────────────────
//
// HONEST COLOUR: HIGH is green (a corroborated determination), MEDIUM amber,
// LOW slate, UNVERIFIED amber-neutral. UNVERIFIED is NEVER green — it is the
// fail-closed, blocking state.

const CONFIDENCE_CONFIG: Record<
  ExplainConfidence,
  { label: string; color: string; bg: string; border: string }
> = {
  HIGH: {
    label: "High confidence",
    color: "rgb(74, 222, 128)",
    bg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.25)",
  },
  MEDIUM: {
    label: "Medium confidence",
    color: "rgb(252, 211, 77)",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.25)",
  },
  LOW: {
    label: "Low confidence",
    color: "rgb(148, 163, 184)",
    bg: "rgba(148, 163, 184, 0.10)",
    border: "rgba(148, 163, 184, 0.22)",
  },
  UNVERIFIED: {
    label: "Unverified — not a clearance",
    color: "rgb(252, 211, 77)",
    bg: "rgba(245, 158, 11, 0.10)",
    border: "rgba(245, 158, 11, 0.30)",
  },
};

function ConfidenceBadge({ confidence }: { confidence: ExplainConfidence }) {
  const c = CONFIDENCE_CONFIG[confidence];
  return (
    <span
      data-testid="explained-confidence"
      data-confidence={confidence}
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
      style={{
        background: c.bg,
        color: c.color,
        border: `0.5px solid ${c.border}`,
      }}
    >
      {c.label}
    </span>
  );
}

// ─── Override status pill (AI-PROPOSED vs HUMAN-REVIEWED) ─────────────────────

function OverrideStatus({
  override,
}: {
  override: ExplainedResult<unknown>["override"];
}) {
  const reviewed = Boolean(override.by);
  const color = reviewed ? "rgb(74, 222, 128)" : "rgb(252, 211, 77)";
  const bg = reviewed ? "rgba(34, 197, 94, 0.10)" : "rgba(245, 158, 11, 0.10)";
  return (
    <span
      data-testid="explained-override-status"
      data-reviewed={reviewed ? "true" : "false"}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
      style={{ background: bg, color }}
    >
      <UserCheck className="h-3 w-3" strokeWidth={2} />
      {reviewed ? "Human-reviewed" : "AI-proposed"}
    </span>
  );
}

// ─── The "EXPLANATION MISSING" refusal block ─────────────────────────────────

/**
 * Rendered IN PLACE of the value when the envelope is incomplete. Loud,
 * unmistakable, and lists the missing fields so the bug is obvious in dev. A
 * withheld result is the safe failure mode.
 */
function ExplanationMissingBlock({ missing }: { missing: string[] }) {
  return (
    <div
      role="alert"
      data-testid="explained-missing"
      className="rounded-xl p-4"
      style={{
        background: "rgba(239, 68, 68, 0.10)",
        border: "0.5px solid rgba(239, 68, 68, 0.35)",
      }}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0"
          strokeWidth={2}
          style={{ color: "rgb(252, 165, 165)" }}
        />
        <div className="min-w-0">
          <div
            className="text-[13px] font-semibold"
            style={{ color: "rgb(252, 165, 165)" }}
          >
            Explanation missing — result withheld
          </div>
          <p
            className="mt-1 text-[12px] leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.7)" }}
          >
            This export-control result cannot be shown because its explanation
            envelope is incomplete. A verdict without its full reasoning may not
            be surfaced. Missing field(s):{" "}
            <span className="font-mono" style={{ color: "rgb(252, 211, 77)" }}>
              {missing.join(", ")}
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Disclosure section helper ───────────────────────────────────────────────

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "rgba(255, 255, 255, 0.4)" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── Public component ────────────────────────────────────────────────────────

export interface ExplainedPanelProps<T> {
  /** The explained result to render. Refused if its envelope is incomplete. */
  result: ExplainedResult<T>;
  /**
   * Optional short label naming WHAT KIND of decision this is, e.g.
   * "Classification", "Screening", "Licence determination". Shown as an
   * eyebrow above the WHAT headline.
   */
  kind?: string;
  /**
   * Optional un-collapsible high-stakes banner text (e.g. an ITAR see-through
   * warning). When present it renders above the verdict and cannot be hidden.
   */
  hardBanner?: string;
  /**
   * Optional override-affordance callback. When provided, an "Override /
   * record my decision" action renders in the disclosure so the human can be
   * recorded as the decision-of-record. The panel itself never decides — it
   * only surfaces the affordance.
   */
  onOverride?: () => void;
  /** Start with the reasoning disclosure open (e.g. for novice/teaching mode). */
  defaultOpen?: boolean;
}

export function ExplainedPanel<T>({
  result,
  kind,
  hardBanner,
  onOverride,
  defaultOpen = false,
}: ExplainedPanelProps<T>) {
  const [open, setOpen] = useState(defaultOpen);

  // ── ENFORCEMENT: refuse to render an incomplete envelope. ──
  const missing = isExplained(result);
  if (missing.length > 0) {
    return <ExplanationMissingBlock missing={missing} />;
  }

  const conf = CONFIDENCE_CONFIG[result.confidence];

  return (
    <div
      data-testid="explained-panel"
      className="rounded-xl p-4"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.07)",
      }}
    >
      {/* Un-collapsible high-stakes banner */}
      {hardBanner ? (
        <div
          data-testid="explained-hard-banner"
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-lg px-3 py-2"
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "0.5px solid rgba(239, 68, 68, 0.30)",
          }}
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            strokeWidth={2}
            style={{ color: "rgb(252, 165, 165)" }}
          />
          <span
            className="text-[12px] font-medium leading-relaxed"
            style={{ color: "rgb(252, 165, 165)" }}
          >
            {hardBanner}
          </span>
        </div>
      ) : null}

      {/* ── Verdict layer (always visible) ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {kind ? (
            <div
              className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: "rgba(255, 255, 255, 0.4)" }}
            >
              {kind}
            </div>
          ) : null}
          {/* WHAT */}
          <p
            data-testid="explained-what"
            className="text-[14px] font-semibold leading-snug text-white"
          >
            {result.what}
          </p>
          {/* WHEREFORE — the single recommended next action, always visible */}
          <p
            data-testid="explained-wherefore"
            className="mt-1.5 text-[12px] leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.7)" }}
          >
            {result.wherefore}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <ConfidenceBadge confidence={result.confidence} />
          <OverrideStatus override={result.override} />
        </div>
      </div>

      {/* ── Show-reasoning disclosure toggle ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="explained-toggle"
        className="mt-3 flex items-center gap-1.5 text-[11px] font-medium transition-colors"
        style={{ color: conf.color }}
      >
        {open ? (
          <ChevronUp className="h-3.5 w-3.5" strokeWidth={2} />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
        )}
        {open ? "Hide reasoning" : "Show reasoning"}
      </button>

      {/* ── Reasoning (WHY + SOURCE + OVERRIDE), progressive disclosure ── */}
      {open ? (
        <div
          data-testid="explained-reasoning"
          className="mt-3 space-y-4 rounded-lg p-3"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderLeft: "2px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          {/* WHY — legal basis + matched rule + reasoning */}
          <Section label="Why — legal basis & matched rule">
            <p
              data-testid="explained-why"
              className="text-[12px] leading-relaxed"
              style={{ color: "rgba(255, 255, 255, 0.75)" }}
            >
              {result.why}
            </p>
          </Section>

          {/* SOURCE — provenance list */}
          <Section label="Sources — list version & citation">
            {result.sources.length === 0 ? (
              <div
                data-testid="explained-no-sources"
                className="flex items-center gap-2 text-[12px]"
                style={{ color: "rgb(252, 211, 77)" }}
              >
                <ShieldQuestion className="h-3.5 w-3.5 shrink-0" />
                No source could be consulted — see the reason above. This result
                is unverified and not a clearance.
              </div>
            ) : (
              <ul data-testid="explained-sources" className="space-y-2">
                {result.sources.map((s, i) => (
                  <li
                    key={`${s.citation}-${i}`}
                    className="rounded-lg px-3 py-2"
                    style={{ background: "rgba(255, 255, 255, 0.03)" }}
                  >
                    <div className="flex items-start gap-2">
                      <FileText
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        style={{ color: "rgba(255, 255, 255, 0.4)" }}
                      />
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium text-white">
                          {s.label}
                        </div>
                        <div
                          className="mt-0.5 font-mono text-[11px]"
                          style={{ color: "rgba(255, 255, 255, 0.55)" }}
                        >
                          {s.citation}
                        </div>
                        {s.listVersion ? (
                          <div
                            className="mt-0.5 text-[10px] uppercase tracking-[0.10em]"
                            style={{ color: "rgba(255, 255, 255, 0.4)" }}
                          >
                            List version / as-of: {s.listVersion}
                          </div>
                        ) : null}
                        {s.currentAsOf ? (
                          <div
                            data-testid="explained-source-asof"
                            className="mt-0.5 text-[10px] uppercase tracking-[0.10em]"
                            style={{ color: "rgba(255, 255, 255, 0.4)" }}
                          >
                            Stand: {s.currentAsOf}
                          </div>
                        ) : null}
                        {s.url ? (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium"
                            style={{ color: "rgb(129, 220, 188)" }}
                          >
                            View source
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* OVERRIDE — decision-of-record affordance / record */}
          <Section label="Override — the human decides">
            {result.override.by ? (
              <div
                data-testid="explained-override-record"
                className="text-[12px] leading-relaxed"
                style={{ color: "rgba(255, 255, 255, 0.7)" }}
              >
                Decision of record:{" "}
                <span className="font-medium text-white">
                  {result.override.by}
                </span>
                {result.override.at ? (
                  <span style={{ color: "rgba(255, 255, 255, 0.5)" }}>
                    {" "}
                    · {result.override.at}
                  </span>
                ) : null}
                {result.override.justification ? (
                  <p className="mt-1">{result.override.justification}</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <p
                  className="text-[12px] leading-relaxed"
                  style={{ color: "rgba(255, 255, 255, 0.6)" }}
                >
                  This is an AI-prepared proposal. Caelex prepares a DRAFT and
                  submits NOTHING — you remain responsible and are recorded as
                  the decision-maker.
                </p>
                {result.override.allowed && onOverride ? (
                  <button
                    type="button"
                    onClick={onOverride}
                    data-testid="explained-override-action"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors"
                    style={{
                      background: "rgba(129, 220, 188, 0.12)",
                      color: "rgb(129, 220, 188)",
                      border: "0.5px solid rgba(52, 211, 153, 0.25)",
                    }}
                  >
                    <UserCheck className="h-3.5 w-3.5" strokeWidth={2} />
                    Override / record my decision
                  </button>
                ) : null}
              </div>
            )}
          </Section>
        </div>
      ) : null}
    </div>
  );
}

export default ExplainedPanel;
