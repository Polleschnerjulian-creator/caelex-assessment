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
        color: "text-emerald-600",
      },
      {
        label: "IN PROGRESS",
        value: inProgress,
        subLabel: "draft / pending",
        color: "text-amber-600",
      },
      {
        label: "NO LEGISLATION",
        value: noLaw,
        subLabel: "regulatory gap",
        color: "text-[var(--atlas-text-muted)]",
      },
      {
        label: "TOTAL TRACKED",
        value: JURISDICTION_DATA.size,
        subLabel: "jurisdictions",
        color: "text-blue-600",
      },
      {
        label: "LAST UPDATE",
        value: formattedDate,
        subLabel: "data refresh",
        color: "text-[var(--atlas-text-secondary)]",
      },
    ];
  }, []);

  return (
    <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] shadow-sm">
      <div className="flex items-stretch divide-x divide-[var(--atlas-border)] overflow-x-auto">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex-1 min-w-[120px] px-4 py-3 flex flex-col items-center justify-center text-center"
          >
            {/* Label */}
            <span className="text-[9px]  font-semibold text-[var(--atlas-text-faint)] tracking-[0.1em] uppercase">
              {stat.label}
            </span>

            {/* Value */}
            <span className={`text-lg  font-bold mt-0.5 ${stat.color}`}>
              {stat.value}
            </span>

            {/* Sub-label */}
            {stat.subLabel && (
              <span className="text-[9px]  text-[var(--atlas-text-faint)] mt-0.5">
                {stat.subLabel}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
