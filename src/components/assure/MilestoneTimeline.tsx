"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Target,
  Calendar,
} from "lucide-react";

// ─── Types ───

interface Milestone {
  id: string;
  title: string;
  targetDate: string;
  completedDate?: string;
  status: string;
  category: string;
}

interface MilestoneTimelineProps {
  milestones: Milestone[];
}

// ─── Helpers ───

function getStatusConfig(status: string) {
  switch (status.toUpperCase()) {
    case "ON_TRACK":
      return {
        color: "bg-emerald-500",
        textColor: "text-emerald-400",
        borderColor: "border-emerald-500/30",
        bgTint: "bg-emerald-500/10",
        icon: <Target size={14} />,
        label: "On Track",
      };
    case "AT_RISK":
      return {
        color: "bg-amber-500",
        textColor: "text-amber-400",
        borderColor: "border-amber-500/30",
        bgTint: "bg-amber-500/10",
        icon: <AlertTriangle size={14} />,
        label: "At Risk",
      };
    case "DELAYED":
      return {
        color: "bg-red-500",
        textColor: "text-red-400",
        borderColor: "border-red-500/30",
        bgTint: "bg-red-500/10",
        icon: <Clock size={14} />,
        label: "Delayed",
      };
    case "COMPLETED":
    case "COMPLETED_M":
      return {
        color: "bg-blue-500",
        textColor: "text-blue-400",
        borderColor: "border-blue-500/30",
        bgTint: "bg-blue-500/10",
        icon: <CheckCircle2 size={14} />,
        label: "Completed",
      };
    case "CANCELLED":
      return {
        color: "bg-slate-500",
        textColor: "text-slate-400",
        borderColor: "border-slate-500/30",
        bgTint: "bg-slate-500/10",
        icon: <XCircle size={14} />,
        label: "Cancelled",
      };
    default:
      return {
        color: "bg-white/20",
        textColor: "text-white/40",
        borderColor: "border-white/10",
        bgTint: "bg-white/5",
        icon: <Clock size={14} />,
        label: status,
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

// ─── Component ───

export default function MilestoneTimeline({
  milestones,
}: MilestoneTimelineProps) {
  // Sort by targetDate
  const sorted = [...milestones].sort(
    (a, b) =>
      new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
  );

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/10" />

      <div className="space-y-1">
        {sorted.map((milestone, index) => {
          const config = getStatusConfig(milestone.status);

          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
              className="relative flex items-start gap-4 pl-0"
            >
              {/* Timeline dot */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`w-10 h-10 rounded-full ${config.bgTint} border ${config.borderColor} flex items-center justify-center`}
                >
                  <span className={config.textColor}>{config.icon}</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pb-6 pt-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-body-lg font-medium text-white/80">
                      {milestone.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      {/* Category */}
                      <span className="text-micro text-white/30 capitalize">
                        {milestone.category}
                      </span>

                      {/* Dates */}
                      <span className="flex items-center gap-1 text-micro text-white/30">
                        <Calendar size={10} />
                        Target: {formatDate(milestone.targetDate)}
                      </span>

                      {milestone.completedDate && (
                        <span className="flex items-center gap-1 text-micro text-blue-400/60">
                          <CheckCircle2 size={10} />
                          Done: {formatDate(milestone.completedDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-micro font-medium ${config.textColor} ${config.bgTint} ${config.borderColor} flex-shrink-0`}
                  >
                    {config.icon}
                    {config.label}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {milestones.length === 0 && (
        <div className="text-center py-8">
          <p className="text-body text-white/30">No milestones defined yet.</p>
        </div>
      )}
    </div>
  );
}
