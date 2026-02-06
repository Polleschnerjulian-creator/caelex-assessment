"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Eye,
  Calendar,
  BarChart3,
  Shield,
  Activity,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface AuditSummary {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsByEntityType: Record<string, number>;
  eventsByDay: Array<{ date: string; count: number }>;
  securityEvents: {
    total: number;
    bySeverity: Record<string, number>;
    unresolved: number;
  };
}

interface AuditReportPreviewProps {
  summary: AuditSummary;
  period?: {
    from: string;
    to: string;
  };
  isLoading?: boolean;
  onGenerateReport?: () => Promise<void>;
  onGenerateCertificate?: () => Promise<void>;
  certificateEligible?: boolean;
  complianceScore?: number;
}

export function AuditReportPreview({
  summary,
  period,
  isLoading = false,
  onGenerateReport,
  onGenerateCertificate,
  certificateEligible = false,
  complianceScore,
}: AuditReportPreviewProps) {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);

  const handleGenerateReport = async () => {
    if (!onGenerateReport) return;
    setIsGeneratingReport(true);
    try {
      await onGenerateReport();
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!onGenerateCertificate) return;
    setIsGeneratingCert(true);
    try {
      await onGenerateCertificate();
    } finally {
      setIsGeneratingCert(false);
    }
  };

  // Get top actions
  const topActions = Object.entries(summary.eventsByAction)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Get top entity types
  const topEntityTypes = Object.entries(summary.eventsByEntityType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Calculate activity trend
  const recentDays = summary.eventsByDay.slice(-7);
  const avgDaily =
    recentDays.length > 0
      ? Math.round(
          recentDays.reduce((sum, d) => sum + d.count, 0) / recentDays.length,
        )
      : 0;

  if (isLoading) {
    return (
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-navy-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-200">
                Audit Report Preview
              </h3>
              {period && (
                <p className="text-sm text-slate-400">
                  {new Date(period.from).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(period.to).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {onGenerateReport && (
              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isGeneratingReport ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Generate Report
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-navy-900 border border-navy-600 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Total Events</span>
          </div>
          <div className="text-2xl font-bold text-slate-200">
            {summary.totalEvents.toLocaleString()}
          </div>
        </div>

        <div className="bg-navy-900 border border-navy-600 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">Daily Average</span>
          </div>
          <div className="text-2xl font-bold text-slate-200">{avgDaily}</div>
        </div>

        <div className="bg-navy-900 border border-navy-600 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Action Types</span>
          </div>
          <div className="text-2xl font-bold text-slate-200">
            {Object.keys(summary.eventsByAction).length}
          </div>
        </div>

        <div className="bg-navy-900 border border-navy-600 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm">Security Events</span>
          </div>
          <div className="text-2xl font-bold text-slate-200">
            {summary.securityEvents.total}
            {summary.securityEvents.unresolved > 0 && (
              <span className="text-sm text-amber-400 ml-2">
                ({summary.securityEvents.unresolved} open)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Top Actions & Entities */}
      <div className="p-4 grid md:grid-cols-2 gap-4">
        {/* Top Actions */}
        <div className="bg-navy-900 border border-navy-600 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">
            Top Actions
          </h4>
          <div className="space-y-2">
            {topActions.map(([action, count]) => {
              const percentage = Math.round(
                (count / summary.totalEvents) * 100,
              );
              return (
                <div key={action}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">
                      {action.replace(/_/g, " ").slice(0, 30)}
                    </span>
                    <span className="text-slate-300">{count}</span>
                  </div>
                  <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Entities */}
        <div className="bg-navy-900 border border-navy-600 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">
            By Entity Type
          </h4>
          <div className="space-y-2">
            {topEntityTypes.map(([entityType, count]) => {
              const percentage = Math.round(
                (count / summary.totalEvents) * 100,
              );
              return (
                <div key={entityType}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">
                      {entityType.replace(/_/g, " ")}
                    </span>
                    <span className="text-slate-300">{count}</span>
                  </div>
                  <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity Trend */}
      {recentDays.length > 0 && (
        <div className="p-4 border-t border-navy-700">
          <h4 className="text-sm font-medium text-slate-300 mb-3">
            7-Day Activity Trend
          </h4>
          <div className="flex items-end gap-1 h-16">
            {recentDays.map((day, index) => {
              const maxCount = Math.max(...recentDays.map((d) => d.count));
              const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center"
                  title={`${day.date}: ${day.count} events`}
                >
                  <div
                    className="w-full bg-blue-500/50 hover:bg-blue-500 rounded-t transition-colors"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-[10px] text-slate-500 mt-1">
                    {new Date(day.date).toLocaleDateString("en-GB", {
                      weekday: "short",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compliance Certificate Section */}
      {onGenerateCertificate && (
        <div className="p-4 border-t border-navy-700">
          <div className="flex items-center justify-between p-4 bg-navy-900 border border-navy-600 rounded-lg">
            <div className="flex items-center gap-3">
              {certificateEligible ? (
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
              ) : (
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-slate-200">
                  Compliance Certificate
                </h4>
                <p className="text-xs text-slate-400">
                  {certificateEligible
                    ? `Score: ${complianceScore}% - Eligible for certificate`
                    : `Score: ${complianceScore || 0}% - Minimum 40% required`}
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerateCertificate}
              disabled={!certificateEligible || isGeneratingCert}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                certificateEligible
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-navy-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              {isGeneratingCert ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Generate Certificate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditReportPreview;
