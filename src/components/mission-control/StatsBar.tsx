"use client";

import type { CelesTrakResponse } from "@/lib/satellites/types";

interface StatsBarProps {
  stats: CelesTrakResponse["stats"] | null;
  fleetCount: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function StatsBar({ stats, fleetCount, t }: StatsBarProps) {
  const items = [
    {
      label: t("missionControl.tracked"),
      value: stats?.total.toLocaleString() ?? "—",
      color: "text-white",
    },
    {
      label: t("missionControl.payloads"),
      value: stats?.payloads.toLocaleString() ?? "—",
      color: "text-blue-400",
    },
    {
      label: t("missionControl.debris"),
      value: stats?.debris.toLocaleString() ?? "—",
      color: "text-red-400",
    },
    {
      label: t("missionControl.rocketBodies"),
      value: stats?.rocketBodies.toLocaleString() ?? "—",
      color: "text-amber-400",
    },
    {
      label: t("missionControl.yourFleet"),
      value: String(fleetCount),
      color: "text-emerald-400",
    },
  ];

  return (
    <div className="flex items-center gap-6 px-5 py-3 bg-black/60 backdrop-blur-md border-t border-white/10">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
            {item.label}
          </span>
          <span className={`text-[13px] font-mono font-semibold ${item.color}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
