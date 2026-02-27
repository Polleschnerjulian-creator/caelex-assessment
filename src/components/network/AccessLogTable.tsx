"use client";

import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Shield } from "lucide-react";

export interface AccessLog {
  id: string;
  timestamp: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  entityType: string;
  entityId: string;
  entityName: string;
  durationMs: number | null;
}

interface AccessLogTableProps {
  logs: AccessLog[];
  loading?: boolean;
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function truncateUserAgent(ua: string, maxLen: number = 40): string {
  if (ua.length <= maxLen) return ua;
  return ua.slice(0, maxLen) + "...";
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-slate-200 dark:bg-[--glass-bg-elevated]" />
        </td>
      ))}
    </tr>
  );
}

const ACTION_COLORS: Record<string, string> = {
  VIEW: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  DOWNLOAD: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  LOGIN: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  PRINT: "text-slate-600 dark:text-slate-400 bg-slate-500/10",
  UPLOAD: "text-green-600 dark:text-green-400 bg-green-500/10",
  FAILED_LOGIN: "text-red-600 dark:text-red-400 bg-red-500/10",
};

export default function AccessLogTable({
  logs,
  loading = false,
}: AccessLogTableProps) {
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const sortedLogs = [...logs].sort((a, b) => {
    const dateA = new Date(a.timestamp).getTime();
    const dateB = new Date(b.timestamp).getTime();
    return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
  });

  const toggleSort = () => {
    setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
  };

  const SortIcon = sortDirection === "desc" ? ArrowDown : ArrowUp;

  if (!loading && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield size={32} className="text-slate-300 dark:text-white/20 mb-3" />
        <p className="text-body text-slate-500 dark:text-white/50">
          No access logs recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[--glass-border-subtle]">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50 dark:bg-[--glass-bg-surface] border-b border-slate-200 dark:border-[--glass-border-subtle]">
            <th className="px-4 py-3">
              <button
                onClick={toggleSort}
                className="flex items-center gap-1.5 text-caption font-semibold text-slate-600 dark:text-white/60 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Timestamp
                <SortIcon size={12} />
              </button>
            </th>
            <th className="px-4 py-3 text-caption font-semibold text-slate-600 dark:text-white/60 uppercase tracking-wider">
              Action
            </th>
            <th className="px-4 py-3 text-caption font-semibold text-slate-600 dark:text-white/60 uppercase tracking-wider">
              IP Address
            </th>
            <th className="px-4 py-3 text-caption font-semibold text-slate-600 dark:text-white/60 uppercase tracking-wider">
              User Agent
            </th>
            <th className="px-4 py-3 text-caption font-semibold text-slate-600 dark:text-white/60 uppercase tracking-wider">
              Entity
            </th>
            <th className="px-4 py-3 text-caption font-semibold text-slate-600 dark:text-white/60 uppercase tracking-wider">
              Duration
            </th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            : sortedLogs.map((log, index) => {
                const actionColor =
                  ACTION_COLORS[log.action] ||
                  "text-slate-600 dark:text-slate-400 bg-slate-500/10";

                return (
                  <tr
                    key={log.id}
                    className={`border-b border-slate-100 dark:border-white/5 transition-colors ${
                      index % 2 === 0
                        ? "bg-white dark:bg-transparent"
                        : "bg-slate-50/50 dark:bg-white/[0.02]"
                    } hover:bg-slate-50 dark:hover:bg-[--glass-bg-surface]`}
                  >
                    <td className="px-4 py-3 text-small text-slate-700 dark:text-white/70 font-mono whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-micro px-1.5 py-0.5 rounded font-medium ${actionColor}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-small text-slate-600 dark:text-white/60 font-mono">
                      {log.ipAddress}
                    </td>
                    <td className="px-4 py-3 text-small text-slate-500 dark:text-white/40 max-w-[200px]">
                      <span title={log.userAgent}>
                        {truncateUserAgent(log.userAgent)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-small text-slate-700 dark:text-white/70">
                      <span className="text-micro text-slate-400 dark:text-white/30">
                        {log.entityType}:
                      </span>{" "}
                      {log.entityName}
                    </td>
                    <td className="px-4 py-3 text-small text-slate-500 dark:text-white/50 font-mono">
                      {formatDuration(log.durationMs)}
                    </td>
                  </tr>
                );
              })}
        </tbody>
      </table>
    </div>
  );
}
