"use client";

import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";

interface TimelineEntryProps {
  type: "status_change" | "correspondence" | "document_update";
  timestamp: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-slate-400",
  SUBMITTED: "text-blue-400",
  RECEIVED: "text-cyan-400",
  UNDER_REVIEW: "text-amber-400",
  INFORMATION_REQUESTED: "text-orange-400",
  ACKNOWLEDGED: "text-emerald-400",
  APPROVED: "text-green-400",
  REJECTED: "text-red-400",
  WITHDRAWN: "text-slate-400",
};

export default function TimelineEntry({
  type,
  timestamp,
  title,
  description,
  metadata,
}: TimelineEntryProps) {
  const getIcon = () => {
    if (type === "status_change") {
      const status = metadata?.status as string;
      if (status === "APPROVED" || status === "ACKNOWLEDGED")
        return <CheckCircle size={16} className="text-emerald-400" />;
      if (status === "REJECTED")
        return <AlertCircle size={16} className="text-red-400" />;
      return (
        <ArrowRight
          size={16}
          className={STATUS_COLORS[status] || "text-blue-400"}
        />
      );
    }
    if (type === "correspondence") {
      const direction = metadata?.direction as string;
      if (direction === "INBOUND")
        return <ArrowDownLeft size={16} className="text-blue-400" />;
      return <ArrowUpRight size={16} className="text-slate-400" />;
    }
    return <FileText size={16} className="text-slate-400" />;
  };

  const getBorderColor = () => {
    if (type === "status_change") {
      const status = metadata?.status as string;
      if (status === "APPROVED" || status === "ACKNOWLEDGED")
        return "border-emerald-500/30";
      if (status === "REJECTED") return "border-red-500/30";
      return "border-blue-500/30";
    }
    if (type === "correspondence") {
      const direction = metadata?.direction as string;
      if (direction === "INBOUND") return "border-blue-500/20";
      return "border-slate-500/20";
    }
    return "border-slate-200 dark:border-navy-700";
  };

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-lg border ${getBorderColor()} bg-white dark:bg-navy-800 flex items-center justify-center flex-shrink-0`}
        >
          {getIcon()}
        </div>
        <div className="w-px flex-1 bg-slate-200 dark:bg-navy-700 my-1" />
      </div>

      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {title}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">
            <Clock size={10} />
            {new Date(timestamp).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-3">
            {description}
          </p>
        )}
        {metadata?.requiresResponse === true && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-amber-400 font-medium">
            <AlertCircle size={10} />
            Response required
          </span>
        )}
      </div>
    </div>
  );
}
