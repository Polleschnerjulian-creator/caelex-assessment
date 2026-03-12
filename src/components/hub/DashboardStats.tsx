"use client";

import { FolderKanban, ListTodo, Timer, CheckCircle2 } from "lucide-react";

interface DashboardStatsProps {
  stats: {
    totalProjects: number;
    activeProjects: number;
    openTasks: number;
    inProgress: number;
    completedThisWeek: number;
    totalTasks: number;
  };
}

const statCards = (stats: DashboardStatsProps["stats"]) => [
  {
    icon: FolderKanban,
    value: stats.activeProjects,
    label: "Active Projects",
    sublabel: `${stats.totalProjects} total`,
  },
  {
    icon: ListTodo,
    value: stats.openTasks,
    label: "Open Tasks",
    sublabel: `${stats.totalTasks} total`,
  },
  {
    icon: Timer,
    value: stats.inProgress,
    label: "In Progress",
    sublabel: null,
  },
  {
    icon: CheckCircle2,
    value: stats.completedThisWeek,
    label: "Completed This Week",
    sublabel: null,
  },
];

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const cards = statCards(stats);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-2xl border border-[#e5e5ea] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-shadow"
          >
            <div className="flex flex-col gap-3">
              <Icon size={20} className="text-[#1d1d1f]" />
              <div>
                <p className="text-display-sm font-bold text-[#1d1d1f] leading-none">
                  {card.value}
                </p>
                <p className="text-caption text-[#86868b] uppercase tracking-wider mt-1">
                  {card.label}
                </p>
                {card.sublabel && (
                  <p className="text-caption text-[#86868b]/60 mt-0.5">
                    {card.sublabel}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
