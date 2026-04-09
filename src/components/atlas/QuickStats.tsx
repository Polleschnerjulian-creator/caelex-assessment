"use client";

import { useMemo } from "react";
import { JURISDICTION_DATA } from "@/data/national-space-laws";

// ─── Types ───

interface StatItem {
  label: string;
  value: string | number;
  subLabel?: string;
  color: string;
}

// ─── Main Component ───

export default function QuickStats() {
  const stats = useMemo<StatItem[]>(() => {
    let enacted = 0;
    let inProgress = 0;
    let noLaw = 0;
    let latestUpdate = "";

    JURISDICTION_DATA.forEach((law) => {
      const status = law.legislation.status;
      if (status === "enacted") enacted++;
      else if (status === "draft" || status === "pending") inProgress++;
      else noLaw++;

      if (law.lastUpdated > latestUpdate) {
        latestUpdate = law.lastUpdated;
      }
    });

    // Format the latest update date
    const [year, month] = latestUpdate.split("-").map(Number);
    const months = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];
    const formattedDate = `${months[month - 1]} ${year}`;

    return [
      {
        label: "ENACTED",
        value: enacted,
        subLabel: "jurisdictions",
        color: "text-emerald-400",
      },
      {
        label: "IN PROGRESS",
        value: inProgress,
        subLabel: "draft / pending",
        color: "text-amber-400",
      },
      {
        label: "NO LEGISLATION",
        value: noLaw,
        subLabel: "regulatory gap",
        color: "text-red-400",
      },
      {
        label: "TOTAL TRACKED",
        value: JURISDICTION_DATA.size,
        subLabel: "jurisdictions",
        color: "text-blue-400",
      },
      {
        label: "LAST UPDATE",
        value: formattedDate,
        subLabel: "data refresh",
        color: "text-slate-300",
      },
    ];
  }, []);

  return (
    <div className="glass-surface rounded-lg border border-white/[0.06]">
      <div className="flex items-stretch divide-x divide-white/[0.06] overflow-x-auto">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex-1 min-w-[120px] px-4 py-3 flex flex-col items-center justify-center text-center"
          >
            {/* Label */}
            <span className="text-[9px] font-mono font-semibold text-slate-500 tracking-[0.1em] uppercase">
              {stat.label}
            </span>

            {/* Value */}
            <span
              className={`text-lg font-mono font-bold mt-0.5 ${stat.color}`}
            >
              {stat.value}
            </span>

            {/* Sub-label */}
            {stat.subLabel && (
              <span className="text-[9px] font-mono text-slate-600 mt-0.5">
                {stat.subLabel}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
