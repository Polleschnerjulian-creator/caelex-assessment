"use client";

import { motion } from "framer-motion";
import { ArrowRight, Layers, Zap } from "lucide-react";

interface OverlapRequirement {
  nis2RequirementId: string;
  nis2Article: string;
  nis2Title: string;
  euSpaceActArticle: string;
  description: string;
  effortType: "single_implementation" | "partial_overlap" | "separate_effort";
}

interface NIS2CrosswalkViewProps {
  overlappingRequirements: OverlapRequirement[];
  overlapCount: number;
  totalApplicable: number;
  totalPotentialSavingsWeeks: number;
}

const effortConfig = {
  single_implementation: {
    label: "Single Implementation",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    description: "Implement once, satisfy both frameworks",
  },
  partial_overlap: {
    label: "Partial Overlap",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    description: "Shared foundation, some additions needed",
  },
  separate_effort: {
    label: "Separate Effort",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/20",
    description: "Independent implementation required",
  },
};

export default function NIS2CrosswalkView({
  overlappingRequirements,
  overlapCount,
  totalApplicable,
  totalPotentialSavingsWeeks,
}: NIS2CrosswalkViewProps) {
  const singleImpl = overlappingRequirements.filter(
    (r) => r.effortType === "single_implementation",
  );
  const partialOverlap = overlappingRequirements.filter(
    (r) => r.effortType === "partial_overlap",
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            NIS2 ↔ EU Space Act Crosswalk
          </h3>
          <p className="text-sm text-white/40">
            How NIS2 obligations map to the upcoming EU Space Act
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-blue-400">
          <Layers className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-center">
          <div className="text-xl font-mono font-bold text-green-400">
            {overlapCount}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-green-400/60 mt-1">
            Overlapping
          </div>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 text-center group/weeks relative">
          <div className="text-xl font-mono font-bold text-blue-400">
            {totalPotentialSavingsWeeks}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-blue-400/60 mt-1">
            Weeks Saved
          </div>
          <div className="text-[9px] text-blue-400/40 mt-1 leading-tight">
            Estimated effort transferable to EU Space Act. Actual savings depend
            on organization size and existing measures.
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Zap className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span className="text-xl font-mono font-bold text-white">
              {Math.round(
                ((singleImpl.length + partialOverlap.length * 0.5) /
                  Math.max(totalApplicable, 1)) *
                  100,
              )}
              %
            </span>
          </div>
          <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">
            Overlap Rate
          </div>
        </div>
      </div>

      {/* Key insight */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 mb-6">
        <p className="text-sm text-blue-400 leading-relaxed">
          <strong>Key insight:</strong> The EU Space Act (Art. 74-95) will act
          as <em>lex specialis</em> for space operators, superseding NIS2 for
          space-specific cybersecurity. Start NIS2 compliance now — much of your
          work will directly transfer to EU Space Act compliance in 2030.
        </p>
      </div>

      {/* Overlap list */}
      <div className="space-y-2">
        {overlappingRequirements.slice(0, 10).map((req, index) => {
          const config = effortConfig[req.effortType];

          return (
            <motion.div
              key={`${req.nis2RequirementId}-${req.euSpaceActArticle}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}
            >
              {/* NIS2 side */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-white/40">NIS2</div>
                <div className="text-sm text-white truncate">
                  {req.nis2Article}
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight
                className={`w-4 h-4 ${config.color} flex-shrink-0`}
                aria-hidden="true"
              />

              {/* EU Space Act side */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-white/40">
                  EU Space Act
                </div>
                <div className="text-sm text-white truncate">
                  {req.euSpaceActArticle}
                </div>
              </div>

              {/* Effort type badge */}
              <span
                className={`text-[9px] uppercase tracking-wider ${config.color} flex-shrink-0 whitespace-nowrap`}
              >
                {config.label}
              </span>
            </motion.div>
          );
        })}

        {overlappingRequirements.length > 10 && (
          <p className="text-center text-xs text-white/40 py-2">
            + {overlappingRequirements.length - 10} more cross-references
          </p>
        )}
      </div>
    </motion.div>
  );
}
