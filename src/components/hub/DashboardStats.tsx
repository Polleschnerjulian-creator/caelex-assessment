"use client";

import { FolderKanban, ListTodo, Timer, CheckCircle2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { GlassStagger, glassItemVariants } from "@/components/ui/GlassMotion";
import { motion } from "framer-motion";

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
    <GlassStagger className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <GlassCard key={card.label} hover className="p-5">
            <motion.div
              variants={glassItemVariants}
              className="flex flex-col gap-3"
            >
              <Icon size={20} className="text-blue-400" />
              <div>
                <p className="text-display-sm font-bold text-white leading-none">
                  {card.value}
                </p>
                <p className="text-caption text-slate-400 uppercase tracking-wider mt-1">
                  {card.label}
                </p>
                {card.sublabel && (
                  <p className="text-caption text-slate-600 mt-0.5">
                    {card.sublabel}
                  </p>
                )}
              </div>
            </motion.div>
          </GlassCard>
        );
      })}
    </GlassStagger>
  );
}
