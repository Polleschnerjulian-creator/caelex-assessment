"use client";

import Link from "next/link";
import {
  Clock,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

interface SubmissionCardProps {
  id: string;
  ncaAuthorityName: string;
  ncaAuthority: string;
  status: string;
  priority: string;
  daysInStatus: number;
  correspondenceCount: number;
  reportTitle: string | null;
  slaDeadline: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-500/10 text-red-400 border-red-500/20",
  HIGH: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  NORMAL: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  LOW: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const NCA_COUNTRY_FLAGS: Record<string, string> = {
  DE_BMWK: "🇩🇪",
  DE_DLR: "🇩🇪",
  FR_CNES: "🇫🇷",
  FR_DGAC: "🇫🇷",
  IT_ASI: "🇮🇹",
  ES_AEE: "🇪🇸",
  NL_NSO: "🇳🇱",
  BE_BELSPO: "🇧🇪",
  AT_FFG: "🇦🇹",
  PL_POLSA: "🇵🇱",
  SE_SNSA: "🇸🇪",
  DK_DTU: "🇩🇰",
  FI_BF: "🇫🇮",
  PT_FCT: "🇵🇹",
  IE_EI: "🇮🇪",
  LU_LSA: "🇱🇺",
  CZ_CSO: "🇨🇿",
  RO_ROSA: "🇷🇴",
  GR_HSA: "🇬🇷",
  EUSPA: "🇪🇺",
  EC_DEFIS: "🇪🇺",
};

export default function SubmissionCard({
  id,
  ncaAuthorityName,
  ncaAuthority,
  priority,
  daysInStatus,
  correspondenceCount,
  reportTitle,
  slaDeadline,
}: SubmissionCardProps) {
  const flag = NCA_COUNTRY_FLAGS[ncaAuthority] || "🏳️";
  const priorityStyle = PRIORITY_COLORS[priority] || PRIORITY_COLORS.NORMAL;

  const isUrgent =
    priority === "URGENT" ||
    (slaDeadline &&
      new Date(slaDeadline).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000);

  return (
    <Link
      href={`/dashboard/nca-portal/submissions/${id}`}
      aria-label={`Submission to ${ncaAuthorityName}${reportTitle ? `: ${reportTitle}` : ""}, Priority: ${priority}, ${daysInStatus} days in status${isUrgent ? ", Urgent" : ""}`}
      className={`
        block bg-white dark:bg-navy-800/50 border rounded-lg p-3
        hover:border-blue-500/30 transition-all duration-150 cursor-pointer group
        ${isUrgent ? "border-red-500/30 dark:border-red-500/20" : "border-slate-200 dark:border-navy-700"}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{flag}</span>
          <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {ncaAuthorityName}
          </span>
        </div>
        <ChevronRight
          size={14}
          className="text-slate-400 dark:text-white/30 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          aria-hidden="true"
        />
      </div>

      {reportTitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2">
          {reportTitle}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${priorityStyle}`}
        >
          {priority}
        </span>

        <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
          <Clock size={10} aria-hidden="true" />
          {daysInStatus}d
        </span>

        {correspondenceCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
            <MessageSquare size={10} aria-hidden="true" />
            <span className="sr-only">Messages:</span>
            {correspondenceCount}
          </span>
        )}

        {isUrgent && (
          <>
            <AlertTriangle
              size={12}
              className="text-red-400 ml-auto"
              aria-hidden="true"
            />
            <span className="sr-only">Urgent</span>
          </>
        )}
      </div>
    </Link>
  );
}
