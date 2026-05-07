"use client";

/**
 * ClassificationPanel
 *
 * Renders the full classification result for a TradeItem:
 *   - Trigger-engine results (rules that fired, confidence, codes)
 *   - Per-jurisdiction license requirements
 *   - Overall gate badge (CLEARED / REVIEW_NEEDED / BLOCKED)
 *   - De-minimis summary if available
 *   - Mandatory disclaimer
 *
 * Props come from the GET /api/trade/items/[id] response field
 * `classification`, which is pre-computed server-side.
 */

import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
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

// ─── Types ────────────────────────────────────────────────────────────

export interface ClassificationResult {
  triggerEval: TriggerEvaluation;
  deMinimis: DeMinimisResult | null;
  licenseDetermination: LicenseDetermination;
}

// ─── Gate badge ───────────────────────────────────────────────────────

function GateBadge({ gate }: { gate: LicenseDetermination["gate"] }) {
  const config = {
    CLEARED: {
      icon: ShieldCheck,
      label: "Cleared",
      bg: "rgba(34, 197, 94, 0.12)",
      color: "rgb(74, 222, 128)",
      border: "rgba(34, 197, 94, 0.25)",
    },
    REVIEW_NEEDED: {
      icon: ShieldAlert,
      label: "Review Needed",
      bg: "rgba(245, 158, 11, 0.12)",
      color: "rgb(252, 211, 77)",
      border: "rgba(245, 158, 11, 0.25)",
    },
    BLOCKED: {
      icon: ShieldX,
      label: "Blocked",
      bg: "rgba(239, 68, 68, 0.12)",
      color: "rgb(252, 165, 165)",
      border: "rgba(239, 68, 68, 0.25)",
    },
  }[gate];

  const Icon = config.icon;

  return (
    <div
      className="flex items-center gap-2 rounded-xl px-4 py-2.5"
      style={{
        background: config.bg,
        border: `0.5px solid ${config.border}`,
      }}
    >
      <Icon
        className="h-4 w-4 shrink-0"
        strokeWidth={2}
        style={{ color: config.color }}
      />
      <span
        className="text-[13px] font-semibold"
        style={{ color: config.color }}
      >
        {config.label}
      </span>
    </div>
  );
}

// ─── Requirement card ─────────────────────────────────────────────────

function RequirementCard({ req }: { req: LicenseRequirement }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig: Record<
    string,
    { color: string; bg: string; label: string }
  > = {
    REQUIRED: {
      color: "rgb(252, 165, 165)",
      bg: "rgba(239, 68, 68, 0.10)",
      label: "Required",
    },
    LIKELY_REQUIRED: {
      color: "rgb(252, 211, 77)",
      bg: "rgba(245, 158, 11, 0.10)",
      label: "Likely Required",
    },
    EXCEPTION_MAY_APPLY: {
      color: "rgb(129, 220, 188)",
      bg: "rgba(52, 211, 153, 0.10)",
      label: "Exception May Apply",
    },
    NLR: {
      color: "rgb(148, 163, 184)",
      bg: "rgba(148, 163, 184, 0.08)",
      label: "NLR",
    },
    DENIED: {
      color: "rgb(252, 165, 165)",
      bg: "rgba(239, 68, 68, 0.15)",
      label: "Denied",
    },
    UNKNOWN: {
      color: "rgb(252, 211, 77)",
      bg: "rgba(245, 158, 11, 0.08)",
      label: "Unknown",
    },
  };

  const sc = statusConfig[req.status] ?? statusConfig.UNKNOWN;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.07)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-white">
              {req.jurisdiction}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ background: sc.bg, color: sc.color }}
            >
              {sc.label}
            </span>
            {req.licenseType && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  color: "rgba(255, 255, 255, 0.65)",
                }}
              >
                {req.licenseType}
              </span>
            )}
          </div>
          <p
            className="mt-1 text-[12px] leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.6)" }}
          >
            {req.reason}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/10"
        >
          {expanded ? (
            <ChevronUp
              className="h-3.5 w-3.5"
              style={{ color: "rgba(255, 255, 255, 0.5)" }}
            />
          ) : (
            <ChevronDown
              className="h-3.5 w-3.5"
              style={{ color: "rgba(255, 255, 255, 0.5)" }}
            />
          )}
        </button>
      </div>

      {expanded && (
        <div
          className="mt-3 rounded-lg p-3"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            borderLeft: "2px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <div
            className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "rgba(255, 255, 255, 0.4)" }}
          >
            Recommended Action
          </div>
          <p
            className="text-[12px] leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.75)" }}
          >
            {req.recommendedAction}
          </p>
          {req.triggerCode && (
            <div
              className="mt-2 font-mono text-[11px]"
              style={{ color: "rgba(255, 255, 255, 0.45)" }}
            >
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
  const confidenceColor: Record<string, string> = {
    HIGH: "rgb(74, 222, 128)",
    MEDIUM: "rgb(252, 211, 77)",
    LOW: "rgb(148, 163, 184)",
  };
  const col = confidenceColor[result.confidence] ?? "rgba(255,255,255,0.5)";

  return (
    <div
      className="flex items-start gap-3 rounded-lg px-3 py-2.5"
      style={{ background: "rgba(255, 255, 255, 0.02)" }}
    >
      <Zap
        className="mt-0.5 h-3.5 w-3.5 shrink-0"
        strokeWidth={2}
        style={{ color: col }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-[12px] font-medium"
            style={{ color: "rgba(255, 255, 255, 0.85)" }}
          >
            {result.reason}
          </span>
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: col,
              border: `0.5px solid ${col}33`,
            }}
          >
            {result.confidence}
          </span>
        </div>
        {result.suggestedCodes.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {result.suggestedCodes.map((c) => (
              <span
                key={`${c.jurisdiction}-${c.code}`}
                className="rounded px-1.5 py-0.5 font-mono text-[10px]"
                style={{
                  background: c.itar
                    ? "rgba(239, 68, 68, 0.10)"
                    : "rgba(255, 255, 255, 0.05)",
                  color: c.itar
                    ? "rgb(252, 165, 165)"
                    : "rgba(255, 255, 255, 0.65)",
                  border: c.itar
                    ? "0.5px solid rgba(239, 68, 68, 0.20)"
                    : "0.5px solid rgba(255,255,255,0.08)",
                }}
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
  const riskColor: Record<string, string> = {
    HIGH: "rgb(252, 165, 165)",
    MEDIUM: "rgb(252, 211, 77)",
    LOW: "rgb(74, 222, 128)",
  };

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.05)",
      }}
    >
      <div>
        <span
          className="text-[12px] font-medium"
          style={{ color: "rgba(255, 255, 255, 0.85)" }}
        >
          {outcomeLabel[dm.outcome] ?? dm.outcome}
        </span>
        <p
          className="mt-0.5 text-[11px]"
          style={{ color: "rgba(255, 255, 255, 0.45)" }}
        >
          US content: {dm.usControlledContentPercent}% / threshold:{" "}
          {dm.appliedThresholdPercent}%{dm.fdprFlag && " · FDPR flag"}
        </p>
      </div>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: riskColor[dm.riskLevel] ?? "rgba(255,255,255,0.5)" }}
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
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest"
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              color: "rgb(252, 165, 165)",
              border: "0.5px solid rgba(239, 68, 68, 0.25)",
            }}
          >
            MTCR Cat. I
          </span>
        )}
        {ld.itarBlock && (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest"
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              color: "rgb(252, 165, 165)",
              border: "0.5px solid rgba(239, 68, 68, 0.18)",
            }}
          >
            ITAR
          </span>
        )}
        {ld.embargoBlock && (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest"
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              color: "rgb(252, 165, 165)",
              border: "0.5px solid rgba(239, 68, 68, 0.18)",
            }}
          >
            Embargo
          </span>
        )}
      </div>

      {/* License requirements */}
      {ld.requirements.length > 0 && (
        <section>
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255, 255, 255, 0.4)" }}
          >
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
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255, 255, 255, 0.4)" }}
          >
            Next Steps
          </div>
          <ol className="space-y-1.5">
            {ld.nextSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    color: "rgba(255, 255, 255, 0.55)",
                  }}
                >
                  {i + 1}
                </span>
                <span
                  className="text-[12px] leading-relaxed"
                  style={{ color: "rgba(255, 255, 255, 0.7)" }}
                >
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
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "rgba(255, 255, 255, 0.4)" }}
          >
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
            className="flex items-center gap-2 text-[11px] transition-colors hover:text-white"
            style={{ color: "rgba(255, 255, 255, 0.5)" }}
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
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{
            background: "rgba(34, 197, 94, 0.06)",
            boxShadow: "inset 0 0 0 0.5px rgba(34, 197, 94, 0.15)",
          }}
        >
          <CheckCircle2
            className="h-4 w-4 shrink-0"
            strokeWidth={2}
            style={{ color: "rgb(74, 222, 128)" }}
          />
          <p
            className="text-[12px] leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.7)" }}
          >
            No controlled-item triggers detected based on current property data.
            Conduct end-user and end-use screening before shipment.
          </p>
        </div>
      )}

      {/* Mandatory disclaimer */}
      <div
        className="flex items-start gap-2.5 rounded-xl p-3.5"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          boxShadow: "inset 0 0 0 0.5px rgba(255, 255, 255, 0.06)",
        }}
      >
        <Info
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
          strokeWidth={2}
          style={{ color: "rgba(255, 255, 255, 0.35)" }}
        />
        <p
          className="text-[11px] leading-relaxed"
          style={{ color: "rgba(255, 255, 255, 0.4)" }}
        >
          {ld.disclaimer}
        </p>
      </div>
    </div>
  );
}
