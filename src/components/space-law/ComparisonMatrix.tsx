"use client";

import { motion } from "framer-motion";
import { Clock, Coins, Shield, Scale, Orbit, BookOpen } from "lucide-react";
import type {
  ComparisonMatrix,
  ComparisonCriterion,
} from "@/lib/space-law-types";
import { type ReactNode, useMemo } from "react";

// ─── Props ───

interface ComparisonMatrixProps {
  matrix: ComparisonMatrix;
  jurisdictions: Array<{
    countryCode: string;
    countryName: string;
    flagEmoji: string;
  }>;
}

// ─── Category Configuration ───

type CriterionCategory = ComparisonCriterion["category"];

const CATEGORY_ORDER: CriterionCategory[] = [
  "timeline",
  "cost",
  "insurance",
  "liability",
  "debris",
  "regulatory",
];

const CATEGORY_LABELS: Record<CriterionCategory, string> = {
  timeline: "Timeline",
  cost: "Costs & Fees",
  insurance: "Insurance & Coverage",
  liability: "Liability",
  debris: "Debris Mitigation",
  regulatory: "Regulatory Framework",
};

const CATEGORY_ICONS: Record<CriterionCategory, ReactNode> = {
  timeline: <Clock className="w-3.5 h-3.5" />,
  cost: <Coins className="w-3.5 h-3.5" />,
  insurance: <Shield className="w-3.5 h-3.5" />,
  liability: <Scale className="w-3.5 h-3.5" />,
  debris: <Orbit className="w-3.5 h-3.5" />,
  regulatory: <BookOpen className="w-3.5 h-3.5" />,
};

// ─── Score Colors ───

const SCORE_COLORS: Record<number, string> = {
  5: "bg-emerald-400",
  4: "bg-blue-400",
  3: "bg-amber-400",
  2: "bg-orange-400",
  1: "bg-red-400",
};

const SCORE_UNFILLED = "bg-white/[0.08]";

// ─── Score Dots ───

function ScoreDots({ score }: { score: number }) {
  const color = SCORE_COLORS[score] ?? SCORE_COLORS[1];
  return (
    <div className="inline-flex items-center gap-0.5 ml-2 shrink-0">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`block w-1.5 h-1.5 rounded-full ${
            i < score ? color : SCORE_UNFILLED
          }`}
        />
      ))}
    </div>
  );
}

// ─── Grouped Criteria ───

function useGroupedCriteria(criteria: ComparisonCriterion[]) {
  return useMemo(() => {
    const groups: Record<CriterionCategory, ComparisonCriterion[]> = {
      timeline: [],
      cost: [],
      insurance: [],
      liability: [],
      debris: [],
      regulatory: [],
    };

    for (const criterion of criteria) {
      if (groups[criterion.category]) {
        groups[criterion.category].push(criterion);
      }
    }

    return CATEGORY_ORDER.filter((cat) => groups[cat].length > 0).map(
      (category) => ({
        category,
        label: CATEGORY_LABELS[category],
        icon: CATEGORY_ICONS[category],
        criteria: groups[category],
      }),
    );
  }, [criteria]);
}

// ─── Desktop Table ───

function DesktopTable({
  groups,
  jurisdictions,
}: {
  groups: ReturnType<typeof useGroupedCriteria>;
  jurisdictions: ComparisonMatrixProps["jurisdictions"];
}) {
  let globalRowIndex = 0;

  return (
    <div className="hidden md:block overflow-x-auto">
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/[0.04]">
              <th className="sticky left-0 z-10 bg-white/[0.04] px-5 py-3.5 text-[11px] font-mono uppercase tracking-[0.15em] text-white/40 border-b border-white/[0.08] min-w-[200px]">
                Criterion
              </th>
              {jurisdictions.map((j) => (
                <th
                  key={j.countryCode}
                  className="px-4 py-3.5 text-center border-b border-white/[0.08] min-w-[150px]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-base leading-none">
                      {j.flagEmoji}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-white/60">
                      {j.countryCode}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <GroupRows
                key={group.category}
                group={group}
                jurisdictions={jurisdictions}
                startIndex={(() => {
                  const start = globalRowIndex;
                  globalRowIndex += group.criteria.length;
                  return start;
                })()}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupRows({
  group,
  jurisdictions,
  startIndex,
}: {
  group: {
    category: CriterionCategory;
    label: string;
    icon: ReactNode;
    criteria: ComparisonCriterion[];
  };
  jurisdictions: ComparisonMatrixProps["jurisdictions"];
  startIndex: number;
}) {
  return (
    <>
      {/* Category header row */}
      <tr>
        <td
          colSpan={jurisdictions.length + 1}
          className="px-5 py-2.5 bg-white/[0.02] border-b border-white/[0.06]"
        >
          <div className="flex items-center gap-2 text-white/50">
            {group.icon}
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
              {group.label}
            </span>
          </div>
        </td>
      </tr>

      {/* Criterion rows */}
      {group.criteria.map((criterion, i) => {
        const rowIndex = startIndex + i;
        const isEvenRow = rowIndex % 2 === 0;

        return (
          <tr
            key={criterion.id}
            className={`${
              isEvenRow ? "bg-transparent" : "bg-white/[0.015]"
            } hover:bg-white/[0.04] transition-colors duration-150`}
          >
            <td className="sticky left-0 z-10 px-5 py-3 border-b border-white/[0.06]">
              <div
                className={`${
                  isEvenRow ? "bg-[#0A0F1E]" : "bg-[#0c1122]"
                } -mx-5 -my-3 px-5 py-3`}
              >
                <span className="text-[13px] text-white/80">
                  {criterion.label}
                </span>
              </div>
            </td>
            {jurisdictions.map((j) => {
              const val = criterion.jurisdictionValues[j.countryCode];
              return (
                <td
                  key={j.countryCode}
                  className="px-4 py-3 border-b border-white/[0.06] text-center"
                >
                  {val ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-[12px] text-white/70 leading-snug">
                        {val.value}
                      </span>
                      <ScoreDots score={val.score} />
                      {val.notes && (
                        <span className="text-[10px] text-white/35 leading-snug mt-0.5">
                          {val.notes}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-white/20">&mdash;</span>
                  )}
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}

// ─── Mobile Card Layout ───

function MobileCards({
  groups,
  jurisdictions,
}: {
  groups: ReturnType<typeof useGroupedCriteria>;
  jurisdictions: ComparisonMatrixProps["jurisdictions"];
}) {
  return (
    <div className="md:hidden space-y-3">
      {groups.map((group) => (
        <div key={group.category} className="space-y-2">
          {/* Category header */}
          <div className="flex items-center gap-2 text-white/50 px-1 pt-3 pb-1">
            {group.icon}
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
              {group.label}
            </span>
          </div>

          {/* Criterion cards */}
          {group.criteria.map((criterion) => (
            <div
              key={criterion.id}
              className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <span className="text-[13px] text-white/80 font-medium">
                  {criterion.label}
                </span>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {jurisdictions.map((j) => {
                  const val = criterion.jurisdictionValues[j.countryCode];
                  return (
                    <div
                      key={j.countryCode}
                      className="px-4 py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm leading-none">
                          {j.flagEmoji}
                        </span>
                        <span className="font-mono text-[11px] text-white/50 uppercase tracking-wider">
                          {j.countryCode}
                        </span>
                      </div>
                      {val ? (
                        <div className="flex items-center gap-2 text-right min-w-0">
                          <span className="text-[12px] text-white/70 leading-snug truncate">
                            {val.value}
                          </span>
                          <ScoreDots score={val.score} />
                        </div>
                      ) : (
                        <span className="text-[11px] text-white/20">
                          &mdash;
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───

export default function ComparisonMatrixView({
  matrix,
  jurisdictions,
}: ComparisonMatrixProps) {
  const groups = useGroupedCriteria(matrix.criteria);

  if (matrix.criteria.length === 0 || jurisdictions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
          Comparison Matrix
        </span>
        <span className="font-mono text-[11px] text-white/50">
          {matrix.criteria.length} criteria &middot; {jurisdictions.length}{" "}
          jurisdictions
        </span>
      </div>

      {/* Desktop table */}
      <DesktopTable groups={groups} jurisdictions={jurisdictions} />

      {/* Mobile cards */}
      <MobileCards groups={groups} jurisdictions={jurisdictions} />
    </motion.div>
  );
}
