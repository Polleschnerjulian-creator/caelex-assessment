"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

interface Factor {
  name: string;
  maxPoints: number;
  earnedPoints: number;
}

interface ComponentData {
  score: number;
  weight: number;
  factors: Factor[];
}

interface RRSComponentBreakdownProps {
  components: Record<string, ComponentData>;
}

const COMPONENT_LABELS: Record<string, string> = {
  authorizationReadiness: "Authorization Readiness",
  cybersecurityPosture: "Cybersecurity Posture",
  operationalCompliance: "Operational Compliance",
  jurisdictionalCoverage: "Multi-Jurisdictional Coverage",
  regulatoryTrajectory: "Regulatory Trajectory",
  governanceProcess: "Governance & Process",
};

const COMPONENT_ICONS: Record<string, string> = {
  authorizationReadiness: "shield",
  cybersecurityPosture: "lock",
  operationalCompliance: "settings",
  jurisdictionalCoverage: "globe",
  regulatoryTrajectory: "trending-up",
  governanceProcess: "file-text",
};

function getScoreColor(score: number): {
  text: string;
  bg: string;
  bar: string;
  badge: string;
} {
  if (score >= 80)
    return {
      text: "text-green-500 dark:text-green-400",
      bg: "bg-green-500/10",
      bar: "bg-green-500",
      badge:
        "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
    };
  if (score >= 60)
    return {
      text: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10",
      bar: "bg-amber-500",
      badge:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    };
  return {
    text: "text-red-500 dark:text-red-400",
    bg: "bg-red-500/10",
    bar: "bg-red-500",
    badge:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  };
}

function ComponentCard({
  componentKey,
  data,
  index,
}: {
  componentKey: string;
  data: ComponentData;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors = getScoreColor(data.score);
  const label = COMPONENT_LABELS[componentKey] || componentKey;
  const weightPercent = Math.round(data.weight * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <GlassCard hover={false} className="p-0 overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-4 flex items-center gap-4 group"
          aria-expanded={expanded}
          aria-controls={`component-details-${componentKey}`}
        >
          {/* Score badge */}
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-body-lg ${colors.bg} ${colors.text}`}
          >
            {data.score}
          </div>

          {/* Name + weight + bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-body font-medium text-slate-800 dark:text-white/80 truncate">
                {label}
              </h3>
              <span className="text-caption text-slate-500 dark:text-white/45 flex-shrink-0 ml-2">
                {weightPercent}% weight
              </span>
            </div>
            <div className="relative h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className={`absolute inset-y-0 left-0 rounded-full ${colors.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${data.score}%` }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.08 + 0.2,
                  ease: "easeOut",
                }}
              />
            </div>
          </div>

          {/* Expand indicator */}
          <div className="flex-shrink-0 text-slate-400 dark:text-white/30 group-hover:text-slate-600 dark:group-hover:text-white/50 transition-colors">
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {/* Expanded factor details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              id={`component-details-${componentKey}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-white/5">
                <table className="w-full" role="table">
                  <thead>
                    <tr>
                      <th className="text-left text-micro uppercase tracking-wider text-slate-400 dark:text-white/40 pb-2 font-medium">
                        Factor
                      </th>
                      <th className="text-right text-micro uppercase tracking-wider text-slate-400 dark:text-white/40 pb-2 font-medium">
                        Points
                      </th>
                      <th className="text-right text-micro uppercase tracking-wider text-slate-400 dark:text-white/40 pb-2 font-medium w-24">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.factors.map((factor, fi) => {
                      const pct =
                        factor.maxPoints > 0
                          ? Math.round(
                              (factor.earnedPoints / factor.maxPoints) * 100,
                            )
                          : 0;
                      const fColors = getScoreColor(pct);

                      return (
                        <tr
                          key={fi}
                          className="border-t border-slate-50 dark:border-white/5"
                        >
                          <td className="py-2 text-small text-slate-700 dark:text-white/60">
                            {factor.name}
                          </td>
                          <td className="py-2 text-small text-right">
                            <span className={fColors.text}>
                              {factor.earnedPoints}
                            </span>
                            <span className="text-slate-400 dark:text-white/30">
                              /{factor.maxPoints}
                            </span>
                          </td>
                          <td className="py-2">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-16 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${fColors.bar}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-micro text-slate-500 dark:text-white/45 w-8 text-right">
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

export default function RRSComponentBreakdown({
  components,
}: RRSComponentBreakdownProps) {
  const entries = Object.entries(components);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {entries.map(([key, data], index) => (
        <ComponentCard key={key} componentKey={key} data={data} index={index} />
      ))}
    </div>
  );
}
