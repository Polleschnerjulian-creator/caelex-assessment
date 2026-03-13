"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface RiskEntry {
  category: string;
  riskScore: number;
}

interface RiskCategoryBreakdownProps {
  risks: RiskEntry[];
}

interface CategoryData {
  category: string;
  count: number;
  avgScore: number;
  totalScore: number;
}

// ─── Helpers ───

const CATEGORY_COLORS: Record<string, { bar: string; text: string }> = {
  regulatory: { bar: "bg-blue-400", text: "text-blue-400" },
  financial: { bar: "bg-emerald-400", text: "text-emerald-400" },
  operational: { bar: "bg-amber-400", text: "text-amber-400" },
  market: { bar: "bg-purple-400", text: "text-purple-400" },
  technology: { bar: "bg-cyan-400", text: "text-cyan-400" },
  legal: { bar: "bg-red-400", text: "text-red-400" },
  strategic: { bar: "bg-pink-400", text: "text-pink-400" },
  environmental: { bar: "bg-teal-400", text: "text-teal-400" },
};

function getCategoryColor(category: string) {
  return (
    CATEGORY_COLORS[category.toLowerCase()] || {
      bar: "bg-slate-400",
      text: "text-slate-400",
    }
  );
}

// ─── Component ───

export default function RiskCategoryBreakdown({
  risks,
}: RiskCategoryBreakdownProps) {
  const categories = useMemo<CategoryData[]>(() => {
    const grouped: Record<string, { scores: number[] }> = {};

    risks.forEach((r) => {
      const key = r.category.toLowerCase();
      if (!grouped[key]) grouped[key] = { scores: [] };
      grouped[key].scores.push(r.riskScore);
    });

    return Object.entries(grouped)
      .map(([category, data]) => ({
        category,
        count: data.scores.length,
        avgScore: Math.round(
          data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
        ),
        totalScore: data.scores.reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [risks]);

  const maxCount = Math.max(...categories.map((c) => c.count), 1);
  const maxAvg = Math.max(...categories.map((c) => c.avgScore), 1);

  return (
    <GlassCard hover={false} className="p-6">
      <h3 className="text-heading font-semibold text-white mb-5">
        Risk by Category
      </h3>

      <div className="space-y-4">
        {categories.map((cat, index) => {
          const colors = getCategoryColor(cat.category);
          const countWidth = (cat.count / maxCount) * 100;
          const avgWidth = (cat.avgScore / maxAvg) * 100;

          return (
            <motion.div
              key={cat.category}
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {/* Category label */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-body font-medium text-white/70 capitalize">
                  {cat.category}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-micro text-white/40">
                    {cat.count} risk{cat.count !== 1 ? "s" : ""}
                  </span>
                  <span className={`text-small font-semibold ${colors.text}`}>
                    Avg: {cat.avgScore}
                  </span>
                </div>
              </div>

              {/* Stacked bars */}
              <div className="flex items-center gap-2">
                {/* Count bar */}
                <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${countWidth}%` }}
                    transition={{
                      duration: 0.6,
                      ease: "easeOut",
                      delay: 0.1 + index * 0.05,
                    }}
                    className={`h-full rounded-full ${colors.bar} opacity-60`}
                  />
                </div>

                {/* Avg score bar */}
                <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${avgWidth}%` }}
                    transition={{
                      duration: 0.6,
                      ease: "easeOut",
                      delay: 0.15 + index * 0.05,
                    }}
                    className={`h-full rounded-full ${colors.bar}`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-white/20" />
          <span className="text-micro text-white/50">Count</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-white/50" />
          <span className="text-micro text-white/50">Avg Score</span>
        </div>
      </div>

      {categories.length === 0 && (
        <div className="text-center py-6">
          <p className="text-body text-white/50">No risk data available.</p>
        </div>
      )}
    </GlassCard>
  );
}
