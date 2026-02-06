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
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  notes?: string;
}

interface SubmissionStatusCardProps {
  submission: {
    id: string;
    ncaAuthorityLabel: string;
    ncaAuthorityInfo?: {
      country: string;
      portalUrl?: string;
    };
    submissionMethodLabel: string;
    statusLabel: string;
    statusColor: string;
    status: string;
    submittedAt: string;
    ncaReference?: string;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    followUpRequired?: boolean;
    followUpDeadline?: string;
    statusHistory: StatusHistoryEntry[];
    report: {
      title: string;
      reportType: string;
    };
  };
  onAcknowledge?: () => void;
  onResend?: () => void;
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

const STATUS_COLORS: Record<string, string> = {
  gray: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function SubmissionStatusCard({
  submission,
  onAcknowledge,
  onResend,
}: SubmissionStatusCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const StatusIcon = STATUS_ICONS[submission.status] || Send;
  const colorClass =
    STATUS_COLORS[submission.statusColor] || STATUS_COLORS.gray;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-navy-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200">
                {submission.report.title || submission.report.reportType}
              </h3>
              <p className="text-sm text-slate-400">
                Submitted to {submission.ncaAuthorityLabel}
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${colorClass}`}
          >
            {submission.statusLabel}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-4">
        {/* Key Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400">Authority:</span>
            <span className="text-slate-200">
              {submission.ncaAuthorityLabel}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400">Submitted:</span>
            <span className="text-slate-200">
              {formatDate(submission.submittedAt)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Send className="w-4 h-4 text-slate-500" />
            <span className="text-slate-400">Method:</span>
            <span className="text-slate-200">
              {submission.submissionMethodLabel}
            </span>
          </div>
          {submission.ncaReference && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-slate-400">Reference:</span>
              <span className="text-slate-200 font-mono">
                {submission.ncaReference}
              </span>
            </div>
          )}
        </div>

        {/* NCA Portal Link */}
        {submission.ncaAuthorityInfo?.portalUrl && (
          <a
            href={submission.ncaAuthorityInfo.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="w-4 h-4" />
            Visit NCA Portal
          </a>
        )}

        {/* Acknowledgment Info */}
        {submission.acknowledgedAt && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-400">
              <strong>Acknowledged:</strong>{" "}
              {formatDate(submission.acknowledgedAt)}
              {submission.acknowledgedBy && ` by ${submission.acknowledgedBy}`}
            </p>
          </div>
        )}

        {/* Rejection Info */}
        {submission.rejectedAt && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">
              <strong>Rejected:</strong> {formatDate(submission.rejectedAt)}
            </p>
            {submission.rejectionReason && (
              <p className="text-sm text-red-300 mt-1">
                {submission.rejectionReason}
              </p>
            )}
          </div>
        )}

        {/* Follow-up Required */}
        {submission.followUpRequired && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <p className="text-sm text-orange-400">
              <strong>Follow-up Required</strong>
              {submission.followUpDeadline && (
                <span> by {formatDate(submission.followUpDeadline)}</span>
              )}
            </p>
          </div>
        )}

        {/* Status History */}
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300"
          >
            {showHistory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Status History ({submission.statusHistory.length})
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {submission.statusHistory.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 text-sm pl-4 border-l-2 border-navy-600"
                >
                  <div className="flex-1">
                    <span className="text-slate-300">{entry.status}</span>
                    <span className="text-slate-500 ml-2">
                      {formatDate(entry.timestamp)}
                    </span>
                    {entry.notes && (
                      <p className="text-slate-400 mt-1">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {(onAcknowledge || onResend) && (
        <div className="p-4 border-t border-navy-700 flex gap-2">
          {onAcknowledge && submission.status === "SUBMITTED" && (
            <button
              onClick={onAcknowledge}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Record Acknowledgment
            </button>
          )}
          {onResend &&
            ["REJECTED", "INFORMATION_REQUESTED"].includes(
              submission.status,
            ) && (
              <button
                onClick={onResend}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Resend Submission
              </button>
            )}
        </div>
      )}
    </div>
  );
}

export default SubmissionStatusCard;
