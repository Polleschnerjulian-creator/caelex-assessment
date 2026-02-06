"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCheck,
  CheckCircle2,
  Circle,
  FileText,
  AlertCircle,
  Clock,
  Filter,
  Download,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string | null;
  previousValue: string | null;
  newValue: string | null;
  timestamp: string;
}

interface ActivityFeedProps {
  limit?: number;
  showFilters?: boolean;
  showExport?: boolean;
  compact?: boolean;
}

const actionIcons: Record<string, LucideIcon> = {
  article_status_changed: FileCheck,
  checklist_item_completed: CheckCircle2,
  checklist_item_uncompleted: Circle,
  document_status_changed: FileText,
  document_uploaded: FileText,
  workflow_created: FileCheck,
  workflow_status_changed: FileCheck,
  workflow_submitted: FileCheck,
  assessment_imported: AlertCircle,
  bulk_status_update: FileCheck,
};

const actionColors: Record<string, string> = {
  article_status_changed: "text-blue-600 dark:text-blue-400",
  checklist_item_completed: "text-green-600 dark:text-green-400",
  checklist_item_uncompleted: "text-amber-600 dark:text-amber-400",
  document_status_changed: "text-purple-600 dark:text-purple-400",
  document_uploaded: "text-purple-600 dark:text-purple-400",
  workflow_created: "text-blue-600 dark:text-blue-400",
  workflow_status_changed: "text-blue-600 dark:text-blue-400",
  workflow_submitted: "text-green-600 dark:text-green-400",
  assessment_imported: "text-cyan-600 dark:text-cyan-400",
  bulk_status_update: "text-blue-600 dark:text-blue-400",
};

const entityTypeLabels: Record<string, string> = {
  article: "Article",
  checklist: "Checklist",
  document: "Document",
  authorization: "Authorization",
  workflow: "Workflow",
  user: "Profile",
};

export default function ActivityFeed({
  limit = 50,
  showFilters = true,
  showExport = true,
  compact = false,
}: ActivityFeedProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams({ limit: String(limit) });
      if (entityFilter !== "all") {
        params.set("entityType", entityFilter);
      }

      const res = await fetch(`/api/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entityFilter, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = async (format: "json" | "csv") => {
    try {
      const res = await fetch(`/api/audit/export?format=${format}`);
      if (res.ok) {
        if (format === "csv") {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const data = await res.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `audit-log-${new Date().toISOString().split("T")[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error("Error exporting audit logs:", error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Within last hour
    if (diff < 60 * 60 * 1000) {
      const mins = Math.floor(diff / 60000);
      return mins <= 1 ? "Just now" : `${mins}m ago`;
    }

    // Within last 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    }

    // Within last week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}d ago`;
    }

    // Older
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getDescription = (log: AuditLogEntry): string => {
    if (log.description) return log.description;

    // Generate description from action
    switch (log.action) {
      case "article_status_changed":
        try {
          const prev = log.previousValue ? JSON.parse(log.previousValue) : null;
          const next = log.newValue ? JSON.parse(log.newValue) : null;
          return `Changed status from "${prev?.status || "none"}" to "${next?.status || "unknown"}"`;
        } catch {
          return "Updated article status";
        }
      case "checklist_item_completed":
        return "Completed checklist item";
      case "checklist_item_uncompleted":
        return "Unmarked checklist item";
      case "document_status_changed":
        return "Updated document status";
      case "workflow_created":
        return "Created authorization workflow";
      case "workflow_submitted":
        return "Submitted authorization application";
      case "assessment_imported":
        try {
          const data = log.newValue ? JSON.parse(log.newValue) : null;
          return `Imported assessment: ${data?.applicable || 0} applicable articles`;
        } catch {
          return "Imported assessment results";
        }
      default:
        return log.action.replace(/_/g, " ");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-start gap-3">
            <div className="w-8 h-8 bg-slate-200 dark:bg-white/[0.05] rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-white/[0.05] rounded w-3/4" />
              <div className="h-3 bg-slate-100 dark:bg-white/[0.04] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters and export */}
      {(showFilters || showExport) && (
        <div className="flex items-center justify-between gap-4">
          {showFilters && (
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-500 dark:text-white/60" />
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/12 text-slate-700 dark:text-white/60 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-slate-300 dark:focus:border-white/[0.1]"
              >
                <option value="all">All Activity</option>
                <option value="article">Articles</option>
                <option value="checklist">Checklist</option>
                <option value="document">Documents</option>
                <option value="workflow">Workflows</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={refreshing}
              className="p-1.5 text-slate-600 dark:text-white/70 hover:text-slate-800 dark:hover:text-white/60 transition-colors"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>

            {showExport && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleExport("csv")}
                  className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-slate-600 dark:text-white/70 hover:text-slate-800 dark:hover:text-white/60 transition-colors"
                >
                  <Download size={12} />
                  CSV
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-slate-600 dark:text-white/70 hover:text-slate-800 dark:hover:text-white/60 transition-colors"
                >
                  <Download size={12} />
                  JSON
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity list */}
      {logs.length === 0 ? (
        <div className="py-12 text-center">
          <Clock
            size={32}
            className="mx-auto text-slate-300 dark:text-white/10 mb-3"
          />
          <p className="text-[14px] text-slate-600 dark:text-white/60 mb-1">
            No activity yet
          </p>
          <p className="text-[12px] text-slate-500 dark:text-white/10">
            Activity will appear here as you track compliance.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {logs.map((log, index) => {
              const Icon = actionIcons[log.action] || FileCheck;
              const iconColor =
                actionColors[log.action] || "text-gray-500 dark:text-white/60";

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.02 }}
                  className={`flex items-start gap-3 ${compact ? "py-2" : "py-3"} ${
                    index < logs.length - 1
                      ? "border-b border-slate-100 dark:border-white/[0.03]"
                      : ""
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] ${iconColor}`}
                  >
                    <Icon size={compact ? 12 : 14} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`${compact ? "text-[12px]" : "text-[13px]"} text-slate-800 dark:text-white/70`}
                    >
                      {getDescription(log)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`${compact ? "text-[10px]" : "text-[11px]"} text-slate-600 dark:text-white/60`}
                      >
                        {entityTypeLabels[log.entityType] || log.entityType}
                      </span>
                      <span className="text-slate-300 dark:text-white/10">
                        ·
                      </span>
                      <span
                        className={`${compact ? "text-[10px]" : "text-[11px]"} text-slate-600 dark:text-white/60`}
                      >
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Load more indicator */}
      {total > logs.length && (
        <p className="text-center text-[11px] text-slate-600 dark:text-white/60 pt-2">
          Showing {logs.length} of {total} activities
        </p>
      )}
    </div>
  );
}
