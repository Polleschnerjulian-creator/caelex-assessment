"use client";

import {
  Satellite,
  Rocket,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";

type SpacecraftStatus =
  | "PRE_LAUNCH"
  | "LAUNCHED"
  | "OPERATIONAL"
  | "DECOMMISSIONING"
  | "DEORBITED"
  | "LOST";

interface SpacecraftStats {
  total: number;
  byStatus: Record<SpacecraftStatus, number>;
  byOrbitType: Record<string, number>;
  byMissionType: Record<string, number>;
  operational: number;
  preLaunch: number;
}

interface SpacecraftStatsProps {
  stats: SpacecraftStats | null;
  isLoading?: boolean;
}

export function SpacecraftStats({ stats, isLoading }: SpacecraftStatsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Fleet",
      value: stats.total,
      icon: Satellite,
      color: "blue",
      bgColor: "bg-blue-500/20",
      iconColor: "text-blue-400",
    },
    {
      label: "Operational",
      value: stats.operational,
      icon: CheckCircle,
      color: "emerald",
      bgColor: "bg-emerald-500/20",
      iconColor: "text-emerald-400",
    },
    {
      label: "Pre-Launch",
      value: stats.preLaunch,
      icon: Clock,
      color: "purple",
      bgColor: "bg-purple-500/20",
      iconColor: "text-purple-400",
    },
    {
      label: "In Transition",
      value: stats.byStatus.LAUNCHED + stats.byStatus.DECOMMISSIONING,
      icon: Rocket,
      color: "amber",
      bgColor: "bg-amber-500/20",
      iconColor: "text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white/5 rounded-xl border border-white/10 p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}
              >
                <Icon size={20} className={stat.iconColor} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-white/50">{stat.label}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default SpacecraftStats;
