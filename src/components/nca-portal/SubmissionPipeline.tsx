"use client";

import SubmissionCard from "./SubmissionCard";

interface PipelineSubmission {
  id: string;
  ncaAuthority: string;
  ncaAuthorityName: string;
  status: string;
  priority: string;
  daysInStatus: number;
  correspondenceCount: number;
  reportTitle: string | null;
  slaDeadline: string | null;
}

interface SubmissionPipelineProps {
  pipeline: Record<string, PipelineSubmission[]>;
}

const PIPELINE_COLUMNS = [
  { key: "DRAFT", label: "Draft", color: "bg-slate-400" },
  { key: "SUBMITTED", label: "Submitted", color: "bg-blue-400" },
  { key: "UNDER_REVIEW", label: "Under Review", color: "bg-amber-400" },
  { key: "APPROVED", label: "Approved", color: "bg-emerald-400" },
  { key: "REJECTED", label: "Rejected", color: "bg-red-400" },
];

export default function SubmissionPipeline({
  pipeline,
}: SubmissionPipelineProps) {
  // Merge RECEIVED into SUBMITTED, INFORMATION_REQUESTED into UNDER_REVIEW, ACKNOWLEDGED into APPROVED
  const mergedPipeline: Record<string, PipelineSubmission[]> = {
    DRAFT: [...(pipeline.DRAFT || [])],
    SUBMITTED: [...(pipeline.SUBMITTED || []), ...(pipeline.RECEIVED || [])],
    UNDER_REVIEW: [
      ...(pipeline.UNDER_REVIEW || []),
      ...(pipeline.INFORMATION_REQUESTED || []),
    ],
    APPROVED: [...(pipeline.APPROVED || []), ...(pipeline.ACKNOWLEDGED || [])],
    REJECTED: [...(pipeline.REJECTED || []), ...(pipeline.WITHDRAWN || [])],
  };

  const hasAnySubmissions = Object.values(mergedPipeline).some(
    (items) => items.length > 0,
  );

  if (!hasAnySubmissions) {
    return (
      <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          No submissions yet. Create a package and submit to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-700 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-4">
        Submission Pipeline
      </h3>
      <div className="grid grid-cols-5 gap-3 min-h-[300px]">
        {PIPELINE_COLUMNS.map((column) => {
          const items = mergedPipeline[column.key] || [];
          return (
            <div key={column.key} className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${column.color}`} />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  {column.label}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-white/40 font-medium">
                  {items.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[400px] custom-scrollbar">
                {items.map((sub) => (
                  <SubmissionCard
                    key={sub.id}
                    id={sub.id}
                    ncaAuthority={sub.ncaAuthority}
                    ncaAuthorityName={sub.ncaAuthorityName}
                    status={sub.status}
                    priority={sub.priority}
                    daysInStatus={sub.daysInStatus}
                    correspondenceCount={sub.correspondenceCount}
                    reportTitle={sub.reportTitle}
                    slaDeadline={sub.slaDeadline}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
