"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, Zap, Clock, TrendingUp } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface NextStep {
  action: string;
  impact: number;
  effort: string;
  component: string;
}

interface NextStepsCardProps {
  steps: NextStep[];
}

// ─── Helpers ───

function getImpactColor(impact: number): string {
  if (impact >= 8)
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (impact >= 5) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  return "text-orange-400 bg-orange-500/10 border-orange-500/20";
}

function getEffortIcon(effort: string) {
  switch (effort.toLowerCase()) {
    case "low":
      return <Zap size={12} className="text-emerald-400" />;
    case "medium":
      return <Clock size={12} className="text-amber-400" />;
    case "high":
      return <Clock size={12} className="text-red-400" />;
    default:
      return <Clock size={12} className="text-white/40" />;
  }
}

function getEffortColor(effort: string): string {
  switch (effort.toLowerCase()) {
    case "low":
      return "text-emerald-400";
    case "medium":
      return "text-amber-400";
    case "high":
      return "text-red-400";
    default:
      return "text-white/40";
  }
}

// ─── Component ───

export default function NextStepsCard({ steps }: NextStepsCardProps) {
  const sortedSteps = [...steps].sort((a, b) => b.impact - a.impact);

  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp size={18} className="text-emerald-400" />
        <h3 className="text-heading font-semibold text-white">
          Next Steps to Improve IRS
        </h3>
      </div>

      <div className="space-y-3">
        {sortedSteps.map((step, index) => (
          <motion.div
            key={step.action}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all group cursor-pointer"
          >
            {/* Priority number */}
            <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-micro font-bold text-emerald-400">
                {index + 1}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-body text-white/80 font-medium leading-snug">
                {step.action}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                {/* Impact badge */}
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-micro font-medium ${getImpactColor(step.impact)}`}
                >
                  +{step.impact} pts
                </span>

                {/* Effort indicator */}
                <span className="inline-flex items-center gap-1 text-micro">
                  {getEffortIcon(step.effort)}
                  <span className={getEffortColor(step.effort)}>
                    {step.effort} effort
                  </span>
                </span>

                {/* Component label */}
                <span className="text-micro text-white/30">
                  {step.component}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <ArrowUpRight
              size={14}
              className="text-white/20 group-hover:text-emerald-400 transition-colors flex-shrink-0 mt-1"
            />
          </motion.div>
        ))}
      </div>

      {steps.length === 0 && (
        <div className="text-center py-6">
          <p className="text-body text-white/40">
            No improvement steps available.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
