"use client";

import {
  ChevronDown,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { innerGlass } from "./styles";
import type {
  SectionPlan,
  ComplianceVerdict,
} from "@/lib/generate/reasoning-types";

const VERDICT_CONFIG: Record<
  ComplianceVerdict,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  compliant: {
    label: "Compliant",
    color: "text-green-600 bg-green-500/10 border-green-500/20",
    icon: CheckCircle2,
  },
  substantially_compliant: {
    label: "Substantially Compliant",
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    icon: CheckCircle2,
  },
  partially_compliant: {
    label: "Partially Compliant",
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    icon: AlertTriangle,
  },
  non_compliant: {
    label: "Non-Compliant",
    color: "text-red-600 bg-red-500/10 border-red-500/20",
    icon: XCircle,
  },
  not_applicable: {
    label: "N/A",
    color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
    icon: Info,
  },
};

const CONFIDENCE_ICONS: Record<string, string> = {
  high: "✅",
  medium: "⚠️",
  low: "🔴",
};

interface SectionPlanCardProps {
  plan: SectionPlan;
  onVerdictOverride?: (
    sectionIndex: number,
    verdict: ComplianceVerdict,
  ) => void;
}

export function SectionPlanCard({
  plan,
  onVerdictOverride,
}: SectionPlanCardProps) {
  const [expanded, setExpanded] = useState(plan.warnings.length > 0);
  const config = VERDICT_CONFIG[plan.complianceVerdict];

  return (
    <div
      className="rounded-xl border border-black/[0.06] overflow-hidden"
      style={innerGlass}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/30 transition-colors text-left focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        aria-expanded={expanded}
      >
        <span className="text-sm shrink-0">
          {CONFIDENCE_ICONS[plan.confidenceLevel]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">
            {plan.sectionIndex + 1}. {plan.sectionTitle}
          </p>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-lg border ${config.color} shrink-0`}
        >
          {config.label}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Details — expandable */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-black/[0.04]">
          <p className="text-xs text-slate-500 mt-2">{plan.writingStrategy}</p>

          {plan.availableData.length > 0 && (
            <div className="text-xs">
              <span className="text-slate-400 font-medium">Data: </span>
              <span className="text-slate-600">
                {plan.availableData
                  .map((d) => `${d.field}=${d.value}`)
                  .join(", ")}
              </span>
            </div>
          )}

          {plan.missingData.length > 0 && (
            <div className="text-xs">
              <span className="text-red-400 font-medium">Missing: </span>
              <span className="text-red-500">
                {plan.missingData.map((d) => d.field).join(", ")}
              </span>
            </div>
          )}

          {plan.warnings.map((warning, idx) => (
            <div
              key={idx}
              className="text-xs px-3 py-2 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/20"
            >
              {warning.message}
              {warning.suggestion && (
                <p className="text-amber-500 mt-1">{warning.suggestion}</p>
              )}
            </div>
          ))}

          {onVerdictOverride && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-400">Override:</span>
              <select
                value={plan.complianceVerdict}
                onChange={(e) =>
                  onVerdictOverride(
                    plan.sectionIndex,
                    e.target.value as ComplianceVerdict,
                  )
                }
                className="text-xs bg-white/50 border border-black/[0.08] rounded-lg px-2 py-1 text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="compliant">Compliant</option>
                <option value="substantially_compliant">
                  Substantially Compliant
                </option>
                <option value="partially_compliant">Partially Compliant</option>
                <option value="non_compliant">Non-Compliant</option>
                <option value="not_applicable">N/A</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
