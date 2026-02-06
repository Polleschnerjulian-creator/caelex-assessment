"use client";

import { useState } from "react";
import {
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  Building2,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";

interface Submission {
  id: string;
  ncaAuthority: string;
  ncaAuthorityLabel: string;
  submissionMethodLabel: string;
  status: string;
  statusLabel: string;
  statusColor: string;
  submittedAt: string;
  ncaReference?: string;
  acknowledgedAt?: string;
  report: {
    id: string;
    title: string | null;
    reportType: string;
  };
}

interface SubmissionHistoryProps {
  submissions: Submission[];
  onSelect?: (submission: Submission) => void;
  isLoading?: boolean;
}

const STATUS_ICONS: Record<string, typeof Send> = {
  DRAFT: FileText,
  SUBMITTED: Send,
  RECEIVED: Clock,
  UNDER_REVIEW: Clock,
  INFORMATION_REQUESTED: AlertCircle,
  ACKNOWLEDGED: CheckCircle2,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  WITHDRAWN: XCircle,
};

const STATUS_BG_COLORS: Record<string, string> = {
  gray: "bg-slate-500/10",
  blue: "bg-blue-500/10",
  cyan: "bg-cyan-500/10",
  yellow: "bg-yellow-500/10",
  orange: "bg-orange-500/10",
  green: "bg-green-500/10",
  red: "bg-red-500/10",
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  gray: "text-slate-400",
  blue: "text-blue-400",
  cyan: "text-cyan-400",
  yellow: "text-yellow-400",
  orange: "text-orange-400",
  green: "text-green-400",
  red: "text-red-400",
};

export function SubmissionHistory({
  submissions,
  onSelect,
  isLoading,
}: SubmissionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      !searchQuery ||
      sub.ncaAuthorityLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.report.reportType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.ncaReference?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || sub.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Get unique statuses for filter
  const uniqueStatuses = Array.from(new Set(submissions.map((s) => s.status)));

  if (isLoading) {
    return (
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-navy-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-200">
            Submission History
          </h3>
          <span className="text-sm text-slate-400">
            {filteredSubmissions.length} submission
            {filteredSubmissions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search submissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={statusFilter || ""}
              onChange={(e) => setStatusFilter(e.target.value || null)}
              className="pl-10 pr-8 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-navy-700">
        {filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No submissions found</p>
          </div>
        ) : (
          filteredSubmissions.map((submission) => {
            const StatusIcon = STATUS_ICONS[submission.status] || Send;
            const bgColor =
              STATUS_BG_COLORS[submission.statusColor] || STATUS_BG_COLORS.gray;
            const textColor =
              STATUS_TEXT_COLORS[submission.statusColor] ||
              STATUS_TEXT_COLORS.gray;

            return (
              <div
                key={submission.id}
                onClick={() => onSelect?.(submission)}
                className={`p-4 hover:bg-navy-700/50 transition-colors ${
                  onSelect ? "cursor-pointer" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${bgColor} ${textColor}`}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-200">
                          {submission.report.title ||
                            submission.report.reportType}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${bgColor} ${textColor}`}
                        >
                          {submission.statusLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {submission.ncaAuthorityLabel}
                        </span>
                        <span>{formatDate(submission.submittedAt)}</span>
                        {submission.ncaReference && (
                          <span className="font-mono text-xs">
                            Ref: {submission.ncaReference}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {onSelect && (
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SubmissionHistory;
