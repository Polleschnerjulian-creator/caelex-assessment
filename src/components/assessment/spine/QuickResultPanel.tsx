"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * QuickResultPanel — the quick-tier (public) result surface (plan Task 2.4).
 *
 * Renders, top to bottom (§6 / §6b "counts + headlines"):
 *   1. VERDICT HEADER — scope determination, regime DIRECTION ("likely light
 *      regime — verify group structure" style), the NIS2 gateway badge
 *      (including an EXPLICIT `needs_clarification` rendering — never
 *      "does not apply" for that state), and the rulebook as-of stamp.
 *   2. OBLIGATION CLUSTERS — per-cluster counts + the ONE top finding,
 *      rendered through the explanation-envelope pattern (WHAT / WHY /
 *      WHEREFORE / because-you-answered / sources / confidence) with the
 *      `isFindingComplete` withhold guard (an incomplete envelope is
 *      withheld with an honest notice, never partially rendered).
 *   3. UNKNOWNS — the COUNT with the full-tier CTA ("your N unknowns and
 *      M unassessed obligations", §6b conversion).
 *   4. The §6 (7) scope-limiting disclaimer.
 *   5. Email-gated PDF download reusing the EXISTING EmailGate (real
 *      /api/assessment/lead capture — unchecked consent, honeypot) and the
 *      server PDF route (email enforced server-side too).
 *
 * HONESTY INVARIANTS:
 *   - NO overall score. No 0–100 aggregate, no "compliance score" — anywhere
 *     in this DOM (unit-tested per the plan).
 *   - Flux flags render COLLAPSED-conservative ("contested — conservative
 *     reading shown") and expand on click (founder §11.4).
 *   - Empty lookups render "none identified" honestly — nothing fabricated.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileDown,
  HelpCircle,
  Scale,
  ShieldQuestion,
} from "lucide-react";
import EmailGate from "@/components/results/EmailGate";
import { RULEBOOK } from "@/data/assessment/rulebook";
import {
  isFindingComplete,
  type AssessmentFinding,
  type FindingVerdict,
} from "@/lib/assessment/finding";
import type { QuickClusterView, QuickResultView } from "./quick-projection";

// ─── Shared label maps ───────────────────────────────────────────────────────

const VERDICT_BADGE: Record<
  FindingVerdict,
  { label: string; className: string }
> = {
  applicable: {
    label: "Applicable",
    className: "bg-red-500/[0.12] border-red-500/25 text-red-300",
  },
  conditional: {
    label: "Conditional",
    className: "bg-amber-500/[0.12] border-amber-500/25 text-amber-300",
  },
  contested: {
    label: "Contested",
    className: "bg-amber-500/[0.12] border-amber-500/25 text-amber-300",
  },
  advisory: {
    label: "Advisory",
    className: "bg-white/[0.06] border-white/[0.12] text-white/60",
  },
  not_applicable: {
    label: "Not applicable",
    className: "bg-white/[0.06] border-white/[0.12] text-white/60",
  },
};

const CONFIDENCE_LABEL: Record<string, string> = {
  DETERMINED: "Determined",
  PROBABLE: "Probable — conservative reading",
  INDETERMINATE: "Indeterminate — decisive answer missing",
};

// Regime DIRECTION headlines (Task 1.8 RegimeEligibility values). The full
// reasoning lives in the finding envelope rendered beneath the headline.
const REGIME_DIRECTION: Record<string, string> = {
  eligible: "Light regime: eligible on your answers",
  likely_eligible_verify: "Likely light regime — verify group structure",
  not_eligible: "Standard regime applies",
};

// NIS2 gateway badge per classification. `needs_clarification` is an EXPLICIT
// open state — it must never read as "does not apply".
const NIS2_BADGE: Record<string, { label: string; className: string }> = {
  essential: {
    label: "NIS2: essential entity",
    className: "bg-red-500/[0.12] border-red-500/25 text-red-300",
  },
  important: {
    label: "NIS2: important entity",
    className: "bg-amber-500/[0.12] border-amber-500/25 text-amber-300",
  },
  out_of_scope: {
    label: "NIS2: out of scope on your answers",
    className: "bg-white/[0.06] border-white/[0.12] text-white/60",
  },
  needs_clarification: {
    label: "NIS2: needs clarification",
    className: "bg-amber-500/[0.12] border-amber-500/25 text-amber-300",
  },
};

// §6 (7) — scope-limiting, not confidence-retracting (short version at the
// point of action; the long text lives on the legal pages).
const SCOPE_DISCLAIMER =
  "This maps the obligations that attach to the facts you provided; it is general information, not legal advice on your specific situation, and does not prove compliance.";

// ─── Flux chip (founder §11.4: collapsed-conservative, expand on click) ─────

function FluxChip({ finding }: { finding: AssessmentFinding }) {
  const [expanded, setExpanded] = useState(false);
  const flux = finding.fluxFlag;
  if (!flux) return null;

  return (
    <div className="mt-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="inline-flex items-center gap-2 text-small text-amber-300">
          <AlertCircle size={12} aria-hidden="true" />
          {flux.summary}
        </span>
        {expanded ? (
          <ChevronDown
            size={14}
            className="text-amber-300/70"
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            size={14}
            className="text-amber-300/70"
            aria-hidden="true"
          />
        )}
      </button>
      {expanded ? (
        <div className="px-3 pb-3">
          <p className="text-small text-white/70 leading-relaxed mb-2">
            {flux.conservativeReading}
          </p>
          <ul className="space-y-1.5">
            {flux.positions.map((p, i) => (
              <li key={i} className="text-small text-white/55 leading-relaxed">
                <span className="text-white/40">{p.source}:</span> {p.position}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ─── Explanation-envelope finding card (with the withhold guard) ────────────

function FindingEnvelopeCard({
  finding,
  compact = false,
}: {
  finding: AssessmentFinding;
  compact?: boolean;
}) {
  // Withhold guard (invariant #5): an incomplete envelope is never partially
  // rendered. The projection already filters, but the guard is enforced at
  // the render boundary too — defence in depth on deserialized payloads.
  const missing = isFindingComplete(finding);
  if (missing.length > 0) {
    return <WithheldFindingNotice count={1} />;
  }

  const badge = VERDICT_BADGE[finding.verdict];

  return (
    <div className="rounded-xl bg-white/[0.03] backdrop-blur-[10px] border border-white/[0.08] p-5 text-left">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-subtitle text-white leading-snug">{finding.what}</p>
        <span
          className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full border text-micro uppercase tracking-[0.12em] ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <p className="text-body text-white/60 leading-relaxed mb-2">
        {finding.why}
      </p>
      <p className="text-body text-white/70 leading-relaxed">
        {finding.wherefore}
      </p>

      {finding.whyTrace.length > 0 ? (
        <p className="mt-3 text-small text-white/45">
          Because you answered:{" "}
          {finding.whyTrace
            .map((t) => `${t.questionId} — ${t.answerLabel}`)
            .join(" · ")}
        </p>
      ) : null}

      {!compact && finding.sources.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {finding.sources.map((s, i) => (
            <li key={i} className="text-small text-white/45 leading-relaxed">
              <Scale
                size={10}
                className="inline mr-1.5 -mt-0.5"
                aria-hidden="true"
              />
              {s.label} — {s.citation} (as of {s.asOf})
              {!s.verified ? (
                <span className="text-amber-300/80">
                  {" "}
                  · legal basis pending verification
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-micro uppercase tracking-[0.15em] text-white/40">
        Confidence: {CONFIDENCE_LABEL[finding.confidence] ?? finding.confidence}
      </p>

      <FluxChip finding={finding} />
    </div>
  );
}

function WithheldFindingNotice({ count }: { count: number }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-dashed border-white/[0.12] p-4 text-left">
      <p className="text-body text-white/55 leading-relaxed">
        {count === 1
          ? "One finding was withheld because its explanation envelope is incomplete"
          : `${count} findings were withheld because their explanation envelopes are incomplete`}{" "}
        — we never show a conclusion we cannot fully explain and cite.
      </p>
    </div>
  );
}

// ─── Cluster section (counts + ONE headline finding) ────────────────────────

function ClusterCard({ cluster }: { cluster: QuickClusterView }) {
  const countChips: { label: string; value: number; className: string }[] = [
    {
      label: "applicable",
      value: cluster.counts.applicable,
      className: "text-red-300",
    },
    {
      label: "conditional",
      value: cluster.counts.conditional,
      className: "text-amber-300",
    },
    {
      label: "contested",
      value: cluster.counts.contested,
      className: "text-amber-300",
    },
    {
      label: "advisory",
      value: cluster.counts.advisory,
      className: "text-white/60",
    },
  ].filter((c) => c.value > 0);

  return (
    <section
      aria-label={cluster.label}
      className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h3 className="text-title text-white">{cluster.label}</h3>
        <div className="flex flex-wrap gap-3">
          {countChips.map((c) => (
            <span key={c.label} className="text-small text-white/45">
              <span className={`font-medium ${c.className}`}>{c.value}</span>{" "}
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {cluster.topFinding ? (
        <FindingEnvelopeCard finding={cluster.topFinding} />
      ) : (
        <WithheldFindingNotice count={Math.max(1, cluster.withheldCount)} />
      )}

      {cluster.totalFindings > 1 ? (
        <p className="mt-3 text-small text-white/45">
          {cluster.totalFindings - 1} more obligation
          {cluster.totalFindings - 1 === 1 ? "" : "s"} identified in this
          cluster — assessed in detail in the full assessment.
        </p>
      ) : null}
    </section>
  );
}

// ─── Rulebook stamp ──────────────────────────────────────────────────────────

function RulebookStamp({ view }: { view: QuickResultView }) {
  const [open, setOpen] = useState(false);
  const computedDate = useMemo(() => {
    const d = new Date(view.computedAt);
    return Number.isNaN(d.getTime()) ? view.computedAt : d.toUTCString();
  }, [view.computedAt]);

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.08] p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="inline-flex items-center gap-2 text-small text-white/60">
          <BookOpen size={13} aria-hidden="true" />
          Assessed against Caelex Rulebook v{view.rulebookVersion} · computed{" "}
          {computedDate}
        </span>
        {open ? (
          <ChevronDown size={14} className="text-white/40" aria-hidden="true" />
        ) : (
          <ChevronRight
            size={14}
            className="text-white/40"
            aria-hidden="true"
          />
        )}
      </button>
      {open ? (
        <ul className="mt-3 space-y-1.5">
          {RULEBOOK.sources.map((s) => (
            <li key={s.id} className="text-small text-white/45 leading-relaxed">
              {s.label} — {s.citation} (as of {s.asOf})
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export interface QuickResultPanelProps {
  view: QuickResultView;
  /** The profile this verdict was computed from — required for the PDF route. */
  profileId: string;
}

export default function QuickResultPanel({
  view,
  profileId,
}: QuickResultPanelProps) {
  const [gateOpen, setGateOpen] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const nis2Value =
    typeof view.nis2Gateway?.value === "string" ? view.nis2Gateway.value : "";
  const nis2Badge = NIS2_BADGE[nis2Value] ?? null;

  const regimeValue =
    typeof view.regime?.value === "string" ? view.regime.value : "";
  const regimeDirection = REGIME_DIRECTION[regimeValue] ?? null;

  const handleLeadSubmitted = async (
    email: string,
    company?: string,
    role?: string,
    subscribe?: boolean,
  ) => {
    setGateOpen(false);
    setPdfError(null);
    try {
      const res = await fetch("/api/assessment/v2/pdf/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          email,
          company,
          role,
          consentNewsletter: subscribe ?? false,
        }),
      });
      if (!res.ok) {
        setPdfError(
          res.status === 429
            ? "Too many requests — please wait a moment and try again."
            : "We couldn't generate your PDF. Please try again.",
        );
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "caelex-quick-check-summary.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setPdfError(
        "We couldn't reach the server. Please check your connection and try again.",
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* ── 1 · Verdict header ─────────────────────────────────────────── */}
      <header className="mb-10">
        <p className="text-caption font-medium text-emerald-400/60 uppercase tracking-[0.2em] mb-3">
          Quick check result
        </p>
        <h1 className="text-display-sm font-medium tracking-[-0.02em] text-white mb-6">
          Your obligation map — counts and headlines
        </h1>

        {/* Scope determination */}
        <section aria-label="Scope determination" className="mb-6">
          <h2 className="text-micro uppercase tracking-[0.15em] text-white/40 mb-3">
            Scope determination
          </h2>
          {view.scope.length > 0 ? (
            <div className="space-y-3">
              {view.scope.map((f, i) => (
                <FindingEnvelopeCard key={i} finding={f} compact />
              ))}
            </div>
          ) : (
            <p className="text-body text-white/60 leading-relaxed">
              No scope exclusions or caveats were raised by your answers — the
              EU Space Act applicability gates passed.
            </p>
          )}
          {view.scopeWithheldCount > 0 ? (
            <div className="mt-3">
              <WithheldFindingNotice count={view.scopeWithheldCount} />
            </div>
          ) : null}
        </section>

        {/* Regime direction */}
        <section aria-label="Regime direction" className="mb-6">
          <h2 className="text-micro uppercase tracking-[0.15em] text-white/40 mb-3">
            Regime direction
          </h2>
          {view.regime ? (
            <div>
              {regimeDirection ? (
                <p className="text-subtitle text-white mb-3">
                  {regimeDirection}
                </p>
              ) : null}
              <FindingEnvelopeCard finding={view.regime} compact />
            </div>
          ) : (
            <p className="text-body text-white/60">
              The regime finding was withheld — its explanation envelope is
              incomplete.
            </p>
          )}
        </section>

        {/* NIS2 gateway */}
        <section aria-label="NIS2 gateway" className="mb-6">
          <h2 className="text-micro uppercase tracking-[0.15em] text-white/40 mb-3">
            NIS2 gateway
          </h2>
          {view.nis2Gateway ? (
            <div>
              {nis2Badge ? (
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-small mb-3 ${nis2Badge.className}`}
                >
                  <ShieldQuestion size={12} aria-hidden="true" />
                  {nis2Badge.label}
                </span>
              ) : null}
              {nis2Value === "needs_clarification" ? (
                <p className="text-body text-amber-200/90 leading-relaxed mb-3">
                  Your NIS2 classification is an OPEN question, not a negative:
                  it turns on answers you have not given yet. It is listed in
                  your unknowns below — resolving it can add (never remove) an
                  entire obligation set.
                </p>
              ) : null}
              <FindingEnvelopeCard finding={view.nis2Gateway} compact />
            </div>
          ) : (
            <p className="text-body text-white/60">
              The NIS2 gateway finding was withheld — its explanation envelope
              is incomplete.
            </p>
          )}
        </section>

        <RulebookStamp view={view} />
      </header>

      {/* ── 2 · Obligation clusters ────────────────────────────────────── */}
      <section aria-label="Obligation clusters" className="mb-10">
        <h2 className="text-heading text-white mb-2">
          Obligation clusters{" "}
          <span className="text-white/45">
            ({view.totalObligations} identified)
          </span>
        </h2>
        <p className="text-body text-white/55 mb-6">
          The quick check shows per-cluster counts and one headline finding
          each. The full assessment details every obligation with evidence
          examples and readiness.
        </p>

        {view.clusters.length > 0 ? (
          <div className="space-y-4">
            {view.clusters.map((c) => (
              <ClusterCard key={c.id} cluster={c} />
            ))}
          </div>
        ) : (
          <p className="text-body text-white/60 leading-relaxed">
            No obligation clusters were assessed on this result
            {view.scope.some((f) => f.verdict === "not_applicable")
              ? " — the assessment ended at the scope gate above."
              : "."}
          </p>
        )}

        {view.aggregationDisclosures.length > 0 ? (
          <div className="mt-4 rounded-xl bg-white/[0.02] border border-white/[0.08] p-4">
            {view.aggregationDisclosures.map((d, i) => (
              <p key={i} className="text-small text-white/55 leading-relaxed">
                {d}
              </p>
            ))}
          </div>
        ) : null}
      </section>

      {/* ── 3 · Unknowns + full-tier CTA ───────────────────────────────── */}
      <section
        aria-label="Unknowns to resolve"
        className="mb-10 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/[0.12] border border-emerald-500/20 flex items-center justify-center">
            <HelpCircle
              size={18}
              className="text-emerald-400"
              aria-hidden="true"
            />
          </div>
          <div>
            <h2 className="text-title text-white mb-1">
              {view.unknownsCount === 1
                ? "1 unknown to resolve"
                : `${view.unknownsCount} unknowns to resolve`}
            </h2>
            <p className="text-body text-white/70 leading-relaxed mb-4">
              Your {view.unknownsCount} unknown
              {view.unknownsCount === 1 ? "" : "s"} and{" "}
              {view.unassessedObligations} unassessed obligation
              {view.unassessedObligations === 1 ? "" : "s"} — create a free
              account to resolve them in the full assessment. Every
              &quot;I&apos;m not sure&quot; you resolve narrows your obligation
              set and raises confidence; it never gets cleaner by staying
              unknown.
            </p>
            <Link
              href="/assessment/full"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-body font-medium px-5 py-2.5 rounded-full transition-all"
            >
              Run the full assessment
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4 · PDF download (email-gated) ─────────────────────────────── */}
      <section aria-label="PDF summary" className="mb-10 text-center">
        <button
          type="button"
          onClick={() => setGateOpen(true)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.06] border border-white/[0.10] text-body text-white/70 hover:bg-white/[0.10] hover:text-white transition-all duration-300"
        >
          <FileDown size={14} aria-hidden="true" />
          Download the PDF summary
        </button>
        <p className="mt-2 text-small text-white/45">
          Email required for the PDF — your on-screen result stays free either
          way.
        </p>
        {pdfError ? (
          <p role="alert" className="mt-2 text-small text-red-400">
            {pdfError}
          </p>
        ) : null}
      </section>

      {/* ── 5 · Disclaimer (§6 (7) — scope-limiting) ───────────────────── */}
      <footer className="pt-6 border-t border-white/[0.08]">
        <p className="text-small text-white/45 leading-relaxed">
          {SCOPE_DISCLAIMER}{" "}
          <Link
            href="/legal/terms"
            className="underline hover:text-white/70 transition-colors"
          >
            Full terms
          </Link>
        </p>
      </footer>

      <EmailGate
        isOpen={gateOpen}
        onClose={() => setGateOpen(false)}
        onSubmit={handleLeadSubmitted}
        assessmentType="quick-check"
      />
    </div>
  );
}
