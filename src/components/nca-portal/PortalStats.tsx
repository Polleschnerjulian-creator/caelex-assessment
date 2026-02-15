"use client";

import { Send, MessageSquare, Clock, Timer } from "lucide-react";

interface PortalStatsProps {
  activeSubmissions: number;
  pendingFollowUps: number;
  upcomingDeadlines: number;
  avgResponseDays: number;
}

const STATS_CONFIG = [
  {
    key: "activeSubmissions",
    label: "Active Submissions",
    icon: Send,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    key: "pendingFollowUps",
    label: "Pending Follow-ups",
    icon: MessageSquare,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    key: "upcomingDeadlines",
    label: "Upcoming Deadlines",
    icon: Clock,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  {
    key: "avgResponseDays",
    label: "Avg Response Time",
    icon: Timer,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    suffix: " days",
  },
] as const;

export default function PortalStats({
  activeSubmissions,
  pendingFollowUps,
  upcomingDeadlines,
  avgResponseDays,
}: PortalStatsProps) {
  const values: Record<string, number> = {
    activeSubmissions,
    pendingFollowUps,
    upcomingDeadlines,
    avgResponseDays,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS_CONFIG.map((stat) => {
        const Icon = stat.icon;
        const value = values[stat.key];
        return (
          <div
            key={stat.key}
            className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}
                aria-hidden="true"
              >
                <Icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {value}
                  {"suffix" in stat ? stat.suffix : ""}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
