"use client";

import React from "react";
import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  FileText,
  Shield,
  Umbrella,
  Calendar,
  ChevronRight,
} from "lucide-react";
import type { DashboardAlert } from "@/lib/services";

interface DeadlineTimelineProps {
  alerts: DashboardAlert[];
  maxItems?: number;
}

export function DeadlineTimeline({
  alerts,
  maxItems = 5,
}: DeadlineTimelineProps) {
  // Filter only deadline-related alerts
  const deadlineAlerts = alerts
    .filter(
      (a) =>
        a.type === "deadline" || a.type === "expiry" || a.type === "incident",
    )
    .slice(0, maxItems);

  if (deadlineAlerts.length === 0) {
    return (
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Upcoming Deadlines
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400">No upcoming deadlines</p>
          <p className="text-sm text-slate-500">You&apos;re all caught up!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Upcoming Deadlines</h3>
        <Link
          href="/dashboard/timeline"
          className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-1">
        {deadlineAlerts.map((alert, index) => (
          <DeadlineItem
            key={alert.id}
            alert={alert}
            isLast={index === deadlineAlerts.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function DeadlineItem({
  alert,
  isLast,
}: {
  alert: DashboardAlert;
  isLast: boolean;
}) {
  const getIcon = (type: DashboardAlert["type"]) => {
    switch (type) {
      case "incident":
        return AlertTriangle;
      case "expiry":
        return Umbrella;
      case "deadline":
        return FileText;
      default:
        return Clock;
    }
  };

  const getSeverityColor = (severity: DashboardAlert["severity"]) => {
    switch (severity) {
      case "critical":
        return "border-red-500 bg-red-500/10";
      case "high":
        return "border-orange-500 bg-orange-500/10";
      case "medium":
        return "border-yellow-500 bg-yellow-500/10";
      case "low":
        return "border-emerald-500 bg-emerald-500/10";
      default:
        return "border-slate-500 bg-slate-500/10";
    }
  };

  const getIconColor = (severity: DashboardAlert["severity"]) => {
    switch (severity) {
      case "critical":
        return "text-red-400";
      case "high":
        return "text-orange-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-emerald-400";
      default:
        return "text-slate-400";
    }
  };

  const formatDueDate = (date: Date | null) => {
    if (!date) return "";

    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const hours = Math.ceil(diff / (1000 * 60 * 60));

    if (diff < 0) {
      return "Overdue";
    } else if (hours < 24) {
      return `${hours}h remaining`;
    } else if (days === 1) {
      return "Tomorrow";
    } else if (days < 7) {
      return `${days} days`;
    } else {
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
    }
  };

  const Icon = getIcon(alert.type);

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-px bg-white/[0.06]" />
      )}

      {/* Icon */}
      <div
        className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 ${getSeverityColor(alert.severity)} flex items-center justify-center`}
      >
        <Icon className={`w-4 h-4 ${getIconColor(alert.severity)}`} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <Link
          href={alert.link || "#"}
          className="block hover:bg-white/[0.06]/50 rounded-lg -ml-2 px-2 py-1 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-medium text-white">{alert.title}</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {alert.description}
              </p>
            </div>
            {alert.dueDate && (
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  alert.severity === "critical"
                    ? "text-red-400"
                    : alert.severity === "high"
                      ? "text-orange-400"
                      : "text-slate-400"
                }`}
              >
                {formatDueDate(alert.dueDate)}
              </span>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}
