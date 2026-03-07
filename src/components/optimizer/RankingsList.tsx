"use client";

import type {
  JurisdictionRanking,
  OptimizerBadge,
} from "@/lib/optimizer/types";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";

interface RankingsListProps {
  rankings: JurisdictionRanking[];
  selectedJurisdiction?: SpaceLawCountryCode;
  onSelect: (jurisdiction: SpaceLawCountryCode) => void;
  accentColor?: string;
}

const BADGE_COLORS: Record<string, string> = {
  BEST_OVERALL: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  FASTEST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  CHEAPEST: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  MOST_COMPLIANT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const BADGE_LABELS: Record<string, string> = {
  BEST_OVERALL: "Best",
  FASTEST: "Fast",
  CHEAPEST: "Cheap",
  MOST_COMPLIANT: "Compl",
};

const DIMENSIONS = [
  { key: "timeline", label: "Time" },
  { key: "cost", label: "Cost" },
  { key: "compliance", label: "Comp" },
  { key: "insurance", label: "Insu" },
  { key: "liability", label: "Liab" },
  { key: "debris", label: "Debr" },
] as const;

export default function RankingsList({
  rankings,
  selectedJurisdiction,
  onSelect,
  accentColor = "#10B981",
}: RankingsListProps) {
  const sorted = [...rankings].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((ranking, index) => {
        const rank = index + 1;
        const isSelected = ranking.jurisdiction === selectedJurisdiction;
        const isTop3 = rank <= 3;

        let rowClasses = "glass-surface border-white/5 hover:border-white/10";
        if (isSelected) {
          rowClasses = "glass-elevated glass-accent border-emerald-500/40";
        } else if (isTop3) {
          rowClasses = "glass-elevated border-white/10 hover:border-white/20";
        }

        return (
          <button
            key={ranking.jurisdiction}
            onClick={() => onSelect(ranking.jurisdiction)}
            className={`w-full text-left rounded-lg border p-3 transition-all duration-200 ${rowClasses}`}
          >
            {/* Main row */}
            <div className="flex items-center gap-3">
              {/* Rank */}
              <span
                className="text-xs w-5 text-right shrink-0"
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  color: isTop3 ? accentColor : "#94A3B8",
                }}
              >
                {rank}
              </span>

              {/* Flag */}
              <span className="text-lg shrink-0">{ranking.flagEmoji}</span>

              {/* Name + code */}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-slate-200 text-sm truncate">
                  {ranking.jurisdictionName}
                </span>
                <span
                  className="text-slate-400 text-xs"
                  style={{ fontFamily: "IBM Plex Mono, monospace" }}
                >
                  {ranking.jurisdiction}
                </span>
              </div>

              {/* Badges */}
              <div className="flex gap-1 shrink-0">
                {ranking.badges.map((badge: OptimizerBadge) => (
                  <span
                    key={badge}
                    className={`text-[9px] px-1.5 py-0.5 rounded border ${BADGE_COLORS[badge] ?? "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}
                    style={{ fontFamily: "IBM Plex Mono, monospace" }}
                  >
                    {BADGE_LABELS[badge] ?? badge}
                  </span>
                ))}
              </div>

              {/* Total score */}
              <span
                className="text-lg shrink-0 w-10 text-right"
                style={{
                  fontFamily: "IBM Plex Mono, monospace",
                  color: isTop3 ? accentColor : "#E2E8F0",
                }}
              >
                {ranking.totalScore}
              </span>
            </div>

            {/* Score bar */}
            <div className="mt-2 h-[1px] w-full rounded-full bg-slate-700/50">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${ranking.totalScore}%`,
                  backgroundColor: accentColor,
                  opacity: isSelected ? 0.8 : 0.4,
                }}
              />
            </div>

            {/* Mini dimension breakdown */}
            <div className="mt-2 grid grid-cols-6 gap-1">
              {DIMENSIONS.map((dim) => (
                <div key={dim.key} className="text-center">
                  <div
                    className="text-[9px] text-slate-500 uppercase"
                    style={{ fontFamily: "IBM Plex Mono, monospace" }}
                  >
                    {dim.label}
                  </div>
                  <div
                    className="text-[10px] text-slate-300"
                    style={{ fontFamily: "IBM Plex Mono, monospace" }}
                  >
                    {ranking.dimensionScores[dim.key]}
                  </div>
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
