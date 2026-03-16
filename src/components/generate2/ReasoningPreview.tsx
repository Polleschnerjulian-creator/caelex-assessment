"use client";

import { ArrowLeft, Sparkles, GitBranch } from "lucide-react";
import { SectionPlanCard } from "./SectionPlanCard";
import { innerGlass } from "./styles";
import type {
  ReasoningPlan,
  ComplianceVerdict,
} from "@/lib/generate/reasoning-types";
import type { DocumentTypeMeta } from "@/lib/generate/types";

const COMPLIANCE_LEVEL_COLORS: Record<string, string> = {
  high: "text-green-600 bg-green-500/10 border-green-500/20",
  medium: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  low: "text-red-600 bg-red-500/10 border-red-500/20",
};

interface ReasoningPreviewProps {
  plan: ReasoningPlan;
  meta: DocumentTypeMeta;
  onConfirm: () => void;
  onBack: () => void;
  onVerdictOverride: (sectionIndex: number, verdict: ComplianceVerdict) => void;
  isConfirming: boolean;
}

export function ReasoningPreview({
  plan,
  meta,
  onConfirm,
  onBack,
  onVerdictOverride,
  isConfirming,
}: ReasoningPreviewProps) {
  const estimatedActions = plan.sections.reduce(
    (sum, s) => sum + s.estimatedActionRequired,
    0,
  );
  const highConfSections = plan.sections.filter(
    (s) => s.confidenceLevel === "high",
  ).length;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-black/[0.06]">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-800">
            Generation Plan
          </h3>
        </div>
        <p className="text-lg font-semibold text-slate-800">{meta.title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{meta.articleRef}</p>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Overall summary card */}
        <div className="rounded-xl p-4" style={innerGlass}>
          <p className="text-sm text-slate-600">{plan.overallStrategy}</p>
          <div className="flex items-center gap-3 mt-3">
            <span
              className={`text-xs px-2.5 py-1 rounded-lg border ${COMPLIANCE_LEVEL_COLORS[plan.estimatedComplianceLevel]}`}
            >
              Est. Compliance: {plan.estimatedComplianceLevel.toUpperCase()}
            </span>
            <span className="text-xs text-slate-400">
              {highConfSections}/{plan.sections.length} sections high confidence
            </span>
          </div>
          {estimatedActions > 0 && (
            <p className="text-xs text-amber-600 mt-2">
              ~{estimatedActions} ACTION REQUIRED markers expected
            </p>
          )}
        </div>

        {/* Section plans */}
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-2">
            Section Plan
          </h4>
          <div className="space-y-1.5">
            {plan.sections.map((section) => (
              <SectionPlanCard
                key={section.sectionIndex}
                plan={section}
                onVerdictOverride={onVerdictOverride}
              />
            ))}
          </div>
        </div>

        {/* Cross-references */}
        {plan.crossReferences.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
              <GitBranch size={14} />
              Cross-References
            </h4>
            <div className="rounded-xl p-3 space-y-1.5" style={innerGlass}>
              {plan.crossReferences.map((ref, idx) => (
                <div key={idx} className="text-xs text-slate-600">
                  → {ref.toDocumentType}
                  {ref.toSection != null
                    ? `, Section ${ref.toSection}`
                    : ""}{" "}
                  <span className="text-slate-400">({ref.description})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2 pb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-black/[0.08] text-sm text-slate-600 hover:bg-white/40 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:bg-slate-400 text-white text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
          >
            <Sparkles size={14} />
            {isConfirming ? "Starting..." : "Confirm & Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
