"use client";

import { motion } from "framer-motion";
import { AlertTriangle, DollarSign, Clock, ShieldCheck } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface ScenarioData {
  name: string;
  description: string;
  financialImpact: {
    bestCase: number;
    mostLikely: number;
    worstCase: number;
  };
  timeToRecover: string;
  mitigationEffectiveness: number;
}

interface ScenarioAnalysisCardProps {
  scenario: ScenarioData;
  triggeredRisks: number;
}

// ─── Helpers ───

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function getEffectivenessColor(pct: number): string {
  if (pct >= 70) return "text-emerald-400";
  if (pct >= 40) return "text-amber-400";
  return "text-red-400";
}

function getEffectivenessBarColor(pct: number): string {
  if (pct >= 70) return "bg-emerald-500";
  if (pct >= 40) return "bg-amber-500";
  return "bg-red-500";
}

// ─── Component ───

export default function ScenarioAnalysisCard({
  scenario,
  triggeredRisks,
}: ScenarioAnalysisCardProps) {
  const { financialImpact, mitigationEffectiveness } = scenario;

  // Calculate range bar positions
  const maxVal = financialImpact.worstCase;
  const bestPct = maxVal > 0 ? (financialImpact.bestCase / maxVal) * 100 : 0;
  const likelyPct =
    maxVal > 0 ? (financialImpact.mostLikely / maxVal) * 100 : 0;

  return (
    <GlassCard hover className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-amber-400" />
            <h3 className="text-heading font-semibold text-white">
              {scenario.name}
            </h3>
          </div>
          <p className="text-small text-white/45 leading-relaxed">
            {scenario.description}
          </p>
        </div>

        {/* Triggered risks badge */}
        <div className="flex-shrink-0 ml-4">
          <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="text-center">
              <span className="text-display-sm font-bold text-red-400 block leading-none">
                {triggeredRisks}
              </span>
              <span className="text-micro text-red-400/60 uppercase tracking-wider">
                Risks
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Impact Range */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <DollarSign size={14} className="text-white/40" />
          <span className="text-small font-medium text-white/60">
            Financial Impact Range
          </span>
        </div>

        <div className="relative h-8 bg-white/5 rounded-lg overflow-hidden mb-2">
          {/* Range bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500/20 via-amber-500/30 to-red-500/40 rounded-lg"
          />

          {/* Best case marker */}
          <motion.div
            initial={{ left: 0 }}
            animate={{ left: `${bestPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-400"
          />

          {/* Most likely marker */}
          <motion.div
            initial={{ left: 0 }}
            animate={{ left: `${likelyPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            className="absolute top-0 bottom-0 w-1 bg-amber-400 rounded"
          />

          {/* Worst case is always at 100% */}
          <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-red-400" />
        </div>

        <div className="flex justify-between text-micro">
          <span className="text-emerald-400">
            Best: {formatCurrency(financialImpact.bestCase)}
          </span>
          <span className="text-amber-400">
            Likely: {formatCurrency(financialImpact.mostLikely)}
          </span>
          <span className="text-red-400">
            Worst: {formatCurrency(financialImpact.worstCase)}
          </span>
        </div>
      </div>

      {/* Bottom metrics */}
      <div className="flex items-center gap-6 pt-3 border-t border-white/5">
        {/* Time to recover */}
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-white/30" />
          <div>
            <span className="text-micro text-white/30 block">Recovery</span>
            <span className="text-body font-medium text-white/70">
              {scenario.timeToRecover}
            </span>
          </div>
        </div>

        {/* Mitigation effectiveness */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={14} className="text-white/30" />
            <span className="text-micro text-white/30">
              Mitigation Effectiveness
            </span>
            <span
              className={`text-small font-semibold ml-auto ${getEffectivenessColor(mitigationEffectiveness)}`}
            >
              {mitigationEffectiveness}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${mitigationEffectiveness}%` }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
              className={`h-full rounded-full ${getEffectivenessBarColor(mitigationEffectiveness)}`}
            />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
