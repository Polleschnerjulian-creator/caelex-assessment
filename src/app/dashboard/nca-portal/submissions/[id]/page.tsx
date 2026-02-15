"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Building2,
  MessageSquarePlus,
  Package,
} from "lucide-react";
import TimelineEntry from "@/components/nca-portal/TimelineEntry";
import CorrespondenceForm from "@/components/nca-portal/CorrespondenceForm";
import SubmissionActions from "@/components/nca-portal/SubmissionActions";
import PackageCompletenessBar from "@/components/nca-portal/PackageCompletenessBar";

interface TimelineEntryData {
  id: string;
  type: "status_change" | "correspondence" | "document_update";
  timestamp: string;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

interface SubmissionDetail {
  id: string;
  ncaAuthority: string;
  ncaAuthorityName: string;
  ncaPortalUrl: string | null;
  status: string;
  priority: string;
  submittedAt: string;
  updatedAt: string;
  ncaReference: string | null;
  submissionMethod: string;
  coverLetter: string | null;
  followUpRequired: boolean;
  followUpDeadline: string | null;
  slaDeadline: string | null;
  packageId: string | null;
  package: {
    id: string;
    packageName: string;
    completenessScore: number;
  } | null;
  report: {
    id: string;
    title: string | null;
    reportType: string;
  };
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-slate-500/10 text-slate-400" },
  SUBMITTED: { label: "Submitted", color: "bg-blue-500/10 text-blue-400" },
  RECEIVED: { label: "Received", color: "bg-cyan-500/10 text-cyan-400" },
  UNDER_REVIEW: {
    label: "Under Review",
    color: "bg-amber-500/10 text-amber-400",
  },
  INFORMATION_REQUESTED: {
    label: "Info Requested",
    color: "bg-orange-500/10 text-orange-400",
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    color: "bg-emerald-500/10 text-emerald-400",
  },
  APPROVED: { label: "Approved", color: "bg-green-500/10 text-green-400" },
  REJECTED: { label: "Rejected", color: "bg-red-500/10 text-red-400" },
  WITHDRAWN: { label: "Withdrawn", color: "bg-slate-500/10 text-slate-400" },
};

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCorrespondenceForm, setShowCorrespondenceForm] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subRes, timelineRes] = await Promise.all([
        fetch(`/api/nca/submissions/${id}`),
        fetch(`/api/nca-portal/submissions/${id}/timeline`),
      ]);

      if (subRes.ok) {
        const data = await subRes.json();
        setSubmission(data.submission || data);
      }
      if (timelineRes.ok) {
        const data = await timelineRes.json();
        setTimeline(data.timeline || []);
      }
    } catch (error) {
      console.error("Failed to load submission:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <div className="h-8 bg-slate-200 dark:bg-navy-700 rounded animate-pulse w-48" />
        <div className="h-64 bg-slate-200 dark:bg-navy-700 rounded-xl animate-pulse" />
        <span className="sr-only">Loading submission details...</span>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">
          Submission not found
        </p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-blue-400 hover:text-blue-300"
        >
          Go back
        </button>
      </div>
    );
  }

  const statusBadge = STATUS_BADGES[submission.status] || STATUS_BADGES.DRAFT;

  // Calculate SLA countdown
  let slaCountdown: string | null = null;
  if (submission.slaDeadline) {
    const daysLeft = Math.ceil(
      (new Date(submission.slaDeadline).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );
    slaCountdown =
      daysLeft > 0
        ? `${daysLeft} days remaining`
        : `${Math.abs(daysLeft)} days overdue`;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/nca-portal")}
          aria-label="Back to NCA portal"
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            {submission.ncaAuthorityName}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-medium ${statusBadge.color}`}
            >
              {statusBadge.label}
            </span>
            {submission.ncaReference && (
              <span className="text-xs text-slate-400">
                Ref: {submission.ncaReference}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowCorrespondenceForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <MessageSquarePlus size={14} />
          Log Communication
        </button>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4">
              Timeline
            </h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                No timeline entries yet.
              </p>
            ) : (
              <div>
                {timeline.map((entry) => (
                  <TimelineEntry
                    key={entry.id}
                    type={entry.type}
                    timestamp={entry.timestamp}
                    title={entry.title}
                    description={entry.description}
                    metadata={entry.metadata}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Info Panel */}
        <div className="space-y-4">
          {/* Submission Info */}
          <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">
              Submission Info
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">
                  {submission.ncaAuthorityName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">
                  Submitted{" "}
                  {new Date(submission.submittedAt).toLocaleDateString()}
                </span>
              </div>
              {slaCountdown && (
                <div
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    slaCountdown.includes("overdue")
                      ? "bg-red-500/10 text-red-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  <Clock size={14} />
                  <span className="font-medium">SLA: {slaCountdown}</span>
                </div>
              )}
              {submission.followUpRequired && (
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <p className="font-medium">Follow-up Required</p>
                  {submission.followUpDeadline && (
                    <p className="text-[10px] mt-0.5">
                      Due:{" "}
                      {new Date(
                        submission.followUpDeadline,
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Linked Package */}
          {submission.package && (
            <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package size={14} className="text-blue-400" />
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                  Linked Package
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                {submission.package.packageName}
              </p>
              <PackageCompletenessBar
                score={submission.package.completenessScore}
                size="sm"
              />
            </div>
          )}

          {/* Actions */}
          <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">
              Actions
            </h3>
            <SubmissionActions
              submissionId={submission.id}
              currentStatus={submission.status}
              currentPriority={submission.priority}
              onUpdate={loadData}
            />
          </div>
        </div>
      </div>

      {/* Correspondence Form Modal */}
      {showCorrespondenceForm && (
        <CorrespondenceForm
          submissionId={id}
          onClose={() => setShowCorrespondenceForm(false)}
          onSubmit={loadData}
        />
      )}
    </div>
  );
}
