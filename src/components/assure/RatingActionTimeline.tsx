"use client";

import { motion } from "framer-motion";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Eye,
  CheckCircle,
  CircleDot,
} from "lucide-react";
import RCRGradeBadge from "./RCRGradeBadge";

// ─── Types ───

interface RatingAction {
  id: string;
  actionType: string;
  grade: string;
  previousGrade?: string;
  computedAt: string;
  actionRationale?: string;
  isPublished: boolean;
}

interface RatingActionTimelineProps {
  actions: RatingAction[];
}

// ─── Action Type Configuration ───

function getActionConfig(actionType: string) {
  switch (actionType.toUpperCase()) {
    case "UPGRADE":
      return {
        icon: ArrowUpCircle,
        color: "text-green-500 dark:text-green-400",
        dotColor: "bg-green-500",
        label: "Upgrade",
      };
    case "DOWNGRADE":
      return {
        icon: ArrowDownCircle,
        color: "text-red-500 dark:text-red-400",
        dotColor: "bg-red-500",
        label: "Downgrade",
      };
    case "WATCH_ON":
      return {
        icon: Eye,
        color: "text-amber-500 dark:text-amber-400",
        dotColor: "bg-amber-500",
        label: "Watch Placed",
      };
    case "WATCH_OFF":
      return {
        icon: Eye,
        color: "text-slate-400 dark:text-white/40",
        dotColor: "bg-slate-400",
        label: "Watch Removed",
      };
    case "AFFIRM":
      return {
        icon: CheckCircle,
        color: "text-slate-500 dark:text-white/50",
        dotColor: "bg-slate-400",
        label: "Affirmed",
      };
    case "INITIAL":
      return {
        icon: CircleDot,
        color: "text-blue-500 dark:text-blue-400",
        dotColor: "bg-blue-500",
        label: "Initial Rating",
      };
    default:
      return {
        icon: CircleDot,
        color: "text-slate-400 dark:text-white/30",
        dotColor: "bg-slate-400",
        label: actionType,
      };
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Component ───

export default function RatingActionTimeline({
  actions,
}: RatingActionTimelineProps) {
  if (actions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-body text-slate-500 dark:text-white/45">
          No rating actions recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="relative" role="list" aria-label="Rating action timeline">
      {/* Vertical connecting line */}
      <div className="absolute left-4 top-4 bottom-4 w-px bg-slate-200 dark:bg-white/10" />

      <div className="space-y-0">
        {actions.map((action, index) => {
          const config = getActionConfig(action.actionType);
          const Icon = config.icon;

          return (
            <motion.div
              key={action.id}
              role="listitem"
              initial={false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              {/* Dot */}
              <div className="relative z-10 flex-shrink-0 mt-1">
                <div
                  className={`w-8 h-8 rounded-full ${config.dotColor} flex items-center justify-center shadow-md`}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 bg-slate-50 dark:bg-white/5 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Action type + Grade */}
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-body font-medium ${config.color}`}>
                        {config.label}
                      </span>
                      <RCRGradeBadge grade={action.grade} size="sm" />
                      {action.previousGrade && (
                        <span className="text-caption text-slate-400 dark:text-white/30">
                          from {action.previousGrade}
                        </span>
                      )}
                      {!action.isPublished && (
                        <span className="text-micro px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-medium">
                          DRAFT
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <p className="text-caption text-slate-400 dark:text-white/30">
                      {formatDate(action.computedAt)} at{" "}
                      {formatTime(action.computedAt)}
                    </p>

                    {/* Rationale */}
                    {action.actionRationale && (
                      <p className="text-small text-slate-600 dark:text-white/60 mt-2 leading-relaxed">
                        {action.actionRationale}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
