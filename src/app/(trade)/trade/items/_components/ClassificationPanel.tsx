"use client";

/**
 * ClassificationPanel — Trade light-theme variant (Sprint A1).
 *
 * Light-Indigo port of `src/components/trade/ClassificationPanel.tsx`.
 * Same data shape (`ClassificationResult` re-exported), same sections
 * (gate badge, requirement cards, next steps, de-minimis, trigger
 * detail, mandatory disclaimer) — but tokenised against the Trade
 * `--trade-*` palette so it renders correctly inside `.trade-themed`.
 *
 * Why a separate file?
 *   The legacy dark variant lives under `/dashboard/trade/items/[id]`
 *   and stays untouched during Phase-A migration. The Trade brand uses
 *   `data-trade-theme` (not the global `.dark` class), so Tailwind
 *   `dark:` variants would either no-op or — worse — pick up Comply's
 *   global dark class on top of Trade's light shell. Keeping two
 *   files avoids that aliasing entirely. When Welt A is sunset, both
 *   files collapse into one.
 *
 * Status semantic colours (red/amber/emerald) intentionally use raw
 * Tailwind hues rather than Trade tokens — gate/risk colours are
 * universal compliance signals that should not re-brand with the
 * theme. They stay readable in both Trade light and Trade dark.
 */

import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { useState } from "react";

import type {
  LicenseDetermination,
  LicenseRequirement,
} from "@/lib/comply-v2/trade/license-determination";
import type {
  TriggerEvaluation,
  TriggerResult,
} from "@/lib/comply-v2/trade/property-trigger-engine";
import type { DeMinimisResult } from "@/lib/comply-v2/trade/de-minimis-calculator";
import type { ClassificationResult } from "@/components/trade/ClassificationPanel";

export type { ClassificationResult };

// ─── Gate badge ───────────────────────────────────────────────────────

function GateBadge({ gate }: { gate: LicenseDetermination["gate"] }) {
  const config = {
    CLEARED: {
      icon: ShieldCheck,
      label: "Cleared",
      className: "trade-chip-success",
    },
    REVIEW_NEEDED: {
      icon: ShieldAlert,
      label: "Review Needed",
      className: "trade-chip-warn",
    },
    BLOCKED: {
      icon: ShieldX,
      label: "Blocked",
      className: "trade-chip-danger",
    },
  }[gate];

  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-2 rounded-md px-4 py-2.5 ${config.className}`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span className="text-[13px] font-semibold">{config.label}</span>
    </div>
  );
}

// ─── Requirement card ─────────────────────────────────────────────────

function RequirementCard({ req }: { req: LicenseRequirement }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig: Record<string, { className: string; label: string }> = {
    REQUIRED: {
      className: "trade-chip-danger",
      label: "Required",
    },
    LIKELY_REQUIRED: {
      className: "trade-chip-warn",
      label: "Likely Required",
    },
    EXCEPTION_MAY_APPLY: {
      className: "trade-chip-success",
      label: "Exception May Apply",
    },
    NLR: {
      className: "trade-chip-neutral",
      label: "NLR",
    },
    DENIED: {
      className: "trade-chip-danger",
      label: "Denied",
    },
    UNKNOWN: {
      className: "trade-chip-warn",
      label: "Unknown",
    },
  };

  const sc = statusConfig[req.status] ?? statusConfig.UNKNOWN;

  return (
    <div className="rounded-md border border-trade-border-subtle bg-trade-bg-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-trade-text-primary">
              {req.jurisdiction}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${sc.className}`}
            >
              {sc.label}
            </span>
            {req.licenseType && (
              <span className="rounded-full bg-trade-bg-subtle px-2 py-0.5 text-[10px] font-medium text-trade-text-secondary">
                {req.licenseType}
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-trade-text-secondary">
            {req.reason}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-md p-1.5 text-trade-text-muted transition hover:bg-trade-hover hover:text-trade-text-primary"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 rounded-md border-l-2 border-trade-border bg-trade-bg-subtle p-3">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-trade-text-muted">
            Recommended Action
          </div>
          <p className="text-[12px] leading-relaxed text-trade-text-primary">
            {req.recommendedAction}
          </p>
          {req.triggerCode && (
            <div className="mt-2 font-mono text-[11px] text-trade-text-muted">
              Code: {req.triggerCode}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Trigger row ──────────────────────────────────────────────────────

function TriggerRow({ result }: { result: TriggerResult }) {
  const confidenceClass: Record<string, string> = {
    HIGH: "trade-chip-success",
    MEDIUM: "trade-chip-warn",
    LOW: "trade-chip-neutral",
  };
  const colorClass = confidenceClass[result.confidence] ?? "trade-chip-neutral";

  return (
    <div className="flex items-start gap-3 rounded-md bg-trade-bg-subtle px-3 py-2.5">
      <Zap
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-trade-text-secondary"
        strokeWidth={2}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-trade-text-primary">
            {result.reason}
          </span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${colorClass}`}
          >
            {result.confidence}
          </span>
        </div>
        {result.suggestedCodes.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {result.suggestedCodes.map((c) => (
              <span
                key={`${c.jurisdiction}-${c.code}`}
                className={
                  c.itar
                    ? "rounded px-1.5 py-0.5 font-mono text-[10px] trade-chip-danger"
                    : "rounded bg-trade-bg-panel px-1.5 py-0.5 font-mono text-[10px] text-trade-text-secondary ring-1 ring-trade-border-subtle"
                }
              >
                {c.jurisdiction}: {c.code}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── De-minimis summary ───────────────────────────────────────────────

function DeMinimisRow({ dm }: { dm: DeMinimisResult }) {
  const outcomeLabel: Record<string, string> = {
    ITAR_CONTROLLED: "ITAR Controlled (no de-minimis)",
    EMBARGOED_DESTINATION: "Embargoed Destination",
    DE_MINIMIS_EXCEEDED: "De-minimis Exceeded",
    FDPR_TRIGGERED: "FDPR Triggered",
    DE_MINIMIS_ELIGIBLE: "De-minimis Eligible",
    REQUIRES_LEGAL_REVIEW: "Legal Review Required",
  };
  const riskClass: Record<string, string> = {
    HIGH: "trade-chip-danger",
    MEDIUM: "trade-chip-warn",
    LOW: "trade-chip-success",
  };
  const riskColor = riskClass[dm.riskLevel] ?? "trade-chip-neutral";

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-trade-border-subtle bg-trade-bg-subtle px-3 py-2.5">
      <div>
        <span className="text-[12px] font-medium text-trade-text-primary">
          {outcomeLabel[dm.outcome] ?? dm.outcome}
        </span>
        <p className="mt-0.5 text-[11px] text-trade-text-muted">
          US content: {dm.usControlledContentPercent}% / threshold:{" "}
          {dm.appliedThresholdPercent}%{dm.fdprFlag && " · FDPR flag"}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${riskColor}`}
      >
        {dm.riskLevel}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────

interface Props {
  classification: ClassificationResult;
}

export function ClassificationPanel({ classification }: Props) {
  const { triggerEval, deMinimis, licenseDetermination: ld } = classification;
  const [showTriggers, setShowTriggers] = useState(false);

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <GateBadge gate={ld.gate} />
        {ld.mtcrCatIBlock && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest trade-chip-danger">
            MTCR Cat. I
          </span>
        )}
        {ld.itarBlock && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest trade-chip-danger">
            ITAR
          </span>
        )}
        {ld.embargoBlock && (
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest trade-chip-danger">
            Embargo
          </span>
        )}
      </div>

      {/* License requirements */}
      {ld.requirements.length > 0 && (
        <section>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
            License Requirements
          </div>
          <div className="space-y-2">
            {ld.requirements.map((r, i) => (
              <RequirementCard key={`${r.jurisdiction}-${i}`} req={r} />
            ))}
          </div>
        </section>
      )}

      {/* Next steps */}
      {ld.nextSteps.length > 0 && (
        <section>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
            Next Steps
          </div>
          <ol className="space-y-1.5">
            {ld.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-trade-accent-soft text-[9px] font-bold text-trade-accent-strong">
                  {i + 1}
                </span>
                <span className="text-[12px] leading-relaxed text-trade-text-primary">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* De-minimis */}
      {deMinimis && (
        <section>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
            De-minimis / FDPR
          </div>
          <DeMinimisRow dm={deMinimis} />
        </section>
      )}

      {/* Trigger engine results (collapsed by default) */}
      {triggerEval.triggeredRuleCount > 0 && (
        <section>
          <button
            onClick={() => setShowTriggers((v) => !v)}
            className="flex items-center gap-2 text-[11px] text-trade-text-secondary transition hover:text-trade-text-primary"
          >
            {showTriggers ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {triggerEval.triggeredRuleCount} trigger
            {triggerEval.triggeredRuleCount !== 1 ? "s" : ""} fired (
            {triggerEval.maxConfidence ?? "UNKNOWN"} confidence)
          </button>
          {showTriggers && (
            <div className="mt-2 space-y-1.5">
              {triggerEval.results.map((r) => (
                <TriggerRow key={r.ruleId} result={r} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Cleared with no triggers */}
      {ld.gate === "CLEARED" && triggerEval.triggeredRuleCount === 0 && (
        <div className="flex items-center gap-3 rounded-md px-4 py-3 trade-chip-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />
          <p className="text-[12px] leading-relaxed">
            No controlled-item triggers detected based on current property data.
            Conduct end-user and end-use screening before shipment.
          </p>
        </div>
      )}

      {/* Mandatory disclaimer */}
      <div className="flex items-start gap-2.5 rounded-md border border-trade-border-subtle bg-trade-bg-subtle p-3.5">
        <Info
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-trade-text-muted"
          strokeWidth={2}
        />
        <p className="text-[11px] leading-relaxed text-trade-text-muted">
          {ld.disclaimer}
        </p>
      </div>
    </div>
  );
}
