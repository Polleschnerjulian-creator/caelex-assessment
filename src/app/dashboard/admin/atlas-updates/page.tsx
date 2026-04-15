"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  X,
} from "lucide-react";

interface SourceCheck {
  id: string;
  sourceId: string;
  jurisdiction: string;
  sourceUrl: string;
  contentHash: string | null;
  previousHash: string | null;
  status:
    | "PENDING"
    | "UNCHANGED"
    | "CHANGED"
    | "ERROR"
    | "REVIEWED"
    | "DISMISSED";
  httpStatus: number | null;
  errorMessage: string | null;
  lastChecked: string;
  lastChanged: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof AlertCircle; color: string; bg: string; label: string }
> = {
  CHANGED: {
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    label: "Changed",
  },
  ERROR: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50 border-red-200",
    label: "Error",
  },
  UNCHANGED: {
    icon: CheckCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-50 border-emerald-200",
    label: "OK",
  },
  PENDING: {
    icon: Clock,
    color: "text-gray-400",
    bg: "bg-gray-50 border-gray-200",
    label: "Pending",
  },
  REVIEWED: {
    icon: Eye,
    color: "text-blue-500",
    bg: "bg-blue-50 border-blue-200",
    label: "Reviewed",
  },
  DISMISSED: {
    icon: X,
    color: "text-gray-400",
    bg: "bg-gray-50 border-gray-200",
    label: "Dismissed",
  },
};

export default function AtlasUpdatesPage() {
  const [checks, setChecks] = useState<SourceCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchChecks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/atlas-updates");
      if (res.ok) {
        const data = await res.json();
        setChecks(data.checks || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  const handleAction = useCallback(
    async (sourceId: string, action: "reviewed" | "dismissed") => {
      setActionLoading(sourceId);
      try {
        const res = await fetch("/api/admin/atlas-updates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId, action }),
        });
        if (res.ok) {
          setChecks((prev) =>
            prev.map((c) =>
              c.sourceId === sourceId
                ? {
                    ...c,
                    status:
                      action === "reviewed"
                        ? "REVIEWED"
                        : ("DISMISSED" as SourceCheck["status"]),
                    reviewedAt: new Date().toISOString(),
                  }
                : c,
            ),
          );
        }
      } catch {
        // silently fail
      } finally {
        setActionLoading(null);
      }
    },
    [],
  );

  const filtered =
    filter === "all" ? checks : checks.filter((c) => c.status === filter);

  const changedCount = checks.filter((c) => c.status === "CHANGED").length;
  const errorCount = checks.filter((c) => c.status === "ERROR").length;
  const okCount = checks.filter((c) => c.status === "UNCHANGED").length;
  const pendingCount = checks.filter((c) => c.status === "PENDING").length;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) return "just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">
            ATLAS Source Monitor
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {checks.length} sources tracked · Checks run daily at 04:30 UTC
          </p>
        </div>
        <button
          onClick={fetchChecks}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-[12px] font-medium text-gray-600 hover:border-gray-300 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          {
            n: changedCount,
            label: "Changed",
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            n: errorCount,
            label: "Errors",
            color: "text-red-500",
            bg: "bg-red-50",
          },
          {
            n: okCount,
            label: "Unchanged",
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            n: pendingCount,
            label: "Pending",
            color: "text-gray-500",
            bg: "bg-gray-50",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border border-gray-100 px-4 py-3 ${s.bg}`}
          >
            <span
              className={`text-[24px] font-bold ${s.color} block leading-none`}
            >
              {s.n}
            </span>
            <span className="text-[11px] font-medium text-gray-600 block mt-1">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "all", label: `All (${checks.length})` },
          { key: "CHANGED", label: `Changed (${changedCount})` },
          { key: "ERROR", label: `Errors (${errorCount})` },
          { key: "UNCHANGED", label: `OK (${okCount})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${filter === f.key ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-[13px]">
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-[13px]">
            {checks.length === 0
              ? "No source checks yet. The cron job runs daily at 04:30 UTC and checks ~50 sources per run."
              : "No sources match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((check) => {
            const cfg = STATUS_CONFIG[check.status] || STATUS_CONFIG.PENDING;
            const Icon = cfg.icon;
            return (
              <div
                key={check.id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition-all"
              >
                {/* Status */}
                <span
                  className={`flex items-center justify-center h-8 w-8 rounded-lg border ${cfg.bg}`}
                >
                  <Icon size={14} className={cfg.color} />
                </span>

                {/* Source info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-400">
                      {check.jurisdiction}
                    </span>
                    <span className="text-[13px] font-medium text-gray-900 truncate">
                      {check.sourceId}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-gray-400">
                      Checked {timeAgo(check.lastChecked)}
                    </span>
                    {check.lastChanged && (
                      <span className="text-[10px] text-amber-600 font-medium">
                        Changed {timeAgo(check.lastChanged)}
                      </span>
                    )}
                    {check.errorMessage && (
                      <span className="text-[10px] text-red-500 truncate max-w-[200px]">
                        {check.errorMessage}
                      </span>
                    )}
                  </div>
                </div>

                {/* Link */}
                <a
                  href={check.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                >
                  <ExternalLink size={14} />
                </a>

                {/* Actions for CHANGED */}
                {check.status === "CHANGED" && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleAction(check.sourceId, "reviewed")}
                      disabled={actionLoading === check.sourceId}
                      className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      Mark Reviewed
                    </button>
                    <button
                      onClick={() => handleAction(check.sourceId, "dismissed")}
                      disabled={actionLoading === check.sourceId}
                      className="px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 text-[10px] font-medium text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Status badge for non-CHANGED */}
                {check.status !== "CHANGED" && (
                  <span
                    className={`text-[9px] font-medium uppercase tracking-wider px-2 py-1 rounded border ${cfg.bg} ${cfg.color} flex-shrink-0`}
                  >
                    {cfg.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
