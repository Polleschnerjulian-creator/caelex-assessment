"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Zap,
  Radio,
  Satellite,
  Shield,
} from "lucide-react";

interface IncidentSummary {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  overdue: number;
  byCategory: {
    collision: number;
    debris: number;
    communication: number;
    cyber: number;
    other: number;
  };
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recentIncidents: {
    id: string;
    title: string;
    category: string;
    severity: "critical" | "high" | "medium" | "low";
    status: string;
    createdAt: Date;
  }[];
}

interface IncidentSummaryCardProps {
  summary: IncidentSummary;
}

export function IncidentSummaryCard({ summary }: IncidentSummaryCardProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "collision":
        return Zap;
      case "debris":
        return Satellite;
      case "communication":
        return Radio;
      case "cyber":
        return Shield;
      default:
        return AlertTriangle;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-[var(--accent-danger)] bg-[var(--accent-danger)]/10 border-[var(--accent-danger)/30]";
      case "high":
        return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      case "medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "low":
        return "text-[var(--accent-primary)] bg-[var(--accent-primary-soft)] border-[var(--accent-success)/30]";
      default:
        return "text-[var(--text-tertiary)] bg-[var(--surface-sunken)]0/10 border-[var(--border-default)]/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return (
          <AlertTriangle className="w-4 h-4 text-[var(--accent-danger)]" />
        );
      case "in_progress":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "resolved":
        return (
          <CheckCircle2 className="w-4 h-4 text-[var(--accent-success)]" />
        );
      case "closed":
        return <XCircle className="w-4 h-4 text-[var(--text-tertiary)]" />;
      default:
        return <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else {
      return "Just now";
    }
  };

  return (
    <div className="bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Incident Response
          </h3>
          <p className="text-sm text-[var(--text-tertiary)]">
            EU Space Act Art. 33-35
          </p>
        </div>
        <Link
          href="/dashboard/supervision"
          className="text-sm text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] flex items-center gap-1"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="text-center p-3 bg-zinc-900 rounded-lg">
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {summary.total}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Total</p>
        </div>
        <div className="text-center p-3 bg-[var(--accent-danger)]/10 rounded-lg border border-[var(--accent-danger)]/20">
          <p className="text-2xl font-bold text-[var(--accent-danger)]">
            {summary.open}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Open</p>
        </div>
        <div className="text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <p className="text-2xl font-bold text-yellow-400">
            {summary.inProgress}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">In Progress</p>
        </div>
        <div className="text-center p-3 bg-[var(--accent-success)]/10 rounded-lg border border-[var(--accent-success)]/20">
          <p className="text-2xl font-bold text-[var(--accent-success)]">
            {summary.resolved}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Resolved</p>
        </div>
      </div>

      {/* Overdue Alert */}
      {summary.overdue > 0 && (
        <div className="flex items-center gap-3 p-3 mb-6 bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)/30] rounded-lg">
          <AlertTriangle className="w-5 h-5 text-[var(--accent-danger)] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--accent-danger)]">
              {summary.overdue} incident{summary.overdue > 1 ? "s" : ""} overdue
              for NCA notification
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Immediate action required
            </p>
          </div>
          <Link
            href="/dashboard/supervision?filter=overdue"
            className="text-xs text-[var(--accent-danger)] hover:text-red-300 font-medium"
          >
            View
          </Link>
        </div>
      )}

      {/* Severity Breakdown */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-[var(--text-tertiary)] mb-3">
          By Severity
        </h4>
        <div className="flex gap-2">
          {summary.bySeverity.critical > 0 && (
            <span className="px-2 py-1 text-xs font-medium rounded border text-[var(--accent-danger)] bg-[var(--accent-danger)]/10 border-[var(--accent-danger)/30]">
              {summary.bySeverity.critical} Critical
            </span>
          )}
          {summary.bySeverity.high > 0 && (
            <span className="px-2 py-1 text-xs font-medium rounded border text-orange-400 bg-orange-500/10 border-orange-500/30">
              {summary.bySeverity.high} High
            </span>
          )}
          {summary.bySeverity.medium > 0 && (
            <span className="px-2 py-1 text-xs font-medium rounded border text-yellow-400 bg-yellow-500/10 border-yellow-500/30">
              {summary.bySeverity.medium} Medium
            </span>
          )}
          {summary.bySeverity.low > 0 && (
            <span className="px-2 py-1 text-xs font-medium rounded border text-[var(--accent-primary)] bg-[var(--accent-primary-soft)] border-[var(--accent-success)/30]">
              {summary.bySeverity.low} Low
            </span>
          )}
          {Object.values(summary.bySeverity).every((v) => v === 0) && (
            <span className="text-sm text-[var(--text-secondary)]">
              No active incidents
            </span>
          )}
        </div>
      </div>

      {/* Recent Incidents */}
      {summary.recentIncidents.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[var(--text-tertiary)] mb-3">
            Recent Activity
          </h4>
          <div className="space-y-2">
            {summary.recentIncidents.slice(0, 3).map((incident) => {
              const CategoryIcon = getCategoryIcon(incident.category);
              return (
                <Link
                  key={incident.id}
                  href={`/dashboard/supervision/incidents/${incident.id}`}
                  className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-[var(--surface-sunken)]/50 transition-colors"
                >
                  <div
                    className={`p-1.5 rounded ${getSeverityColor(incident.severity)}`}
                  >
                    <CategoryIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">
                      {incident.title}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {formatTimeAgo(incident.createdAt)}
                    </p>
                  </div>
                  {getStatusIcon(incident.status)}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {summary.total === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-[var(--accent-success)]/50 mb-3" />
          <p className="text-[var(--text-tertiary)]">No incidents reported</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Your operations are running smoothly
          </p>
        </div>
      )}
    </div>
  );
}
