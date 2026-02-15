"use client";

import {
  Mail,
  FileText,
  Phone,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  AlertCircle,
} from "lucide-react";

interface CorrespondenceEntryProps {
  id: string;
  direction: string;
  messageType: string;
  subject: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  requiresResponse: boolean;
  responseDeadline?: string | null;
  respondedAt?: string | null;
  ncaContactName?: string | null;
  sentBy?: string | null;
}

const MESSAGE_TYPE_ICONS: Record<string, typeof Mail> = {
  EMAIL: Mail,
  LETTER: FileText,
  PORTAL_MSG: FileText,
  PHONE_CALL: Phone,
  MEETING_NOTE: Users,
};

export default function CorrespondenceEntry({
  direction,
  messageType,
  subject,
  content,
  createdAt,
  isRead,
  requiresResponse,
  responseDeadline,
  respondedAt,
  ncaContactName,
}: CorrespondenceEntryProps) {
  const isInbound = direction === "INBOUND";
  const Icon = MESSAGE_TYPE_ICONS[messageType] || Mail;
  const DirectionIcon = isInbound ? ArrowDownLeft : ArrowUpRight;

  const isOverdue =
    requiresResponse &&
    !respondedAt &&
    responseDeadline &&
    new Date(responseDeadline) < new Date();

  return (
    <div
      className={`
        flex gap-3 p-3 rounded-lg border transition-colors
        ${
          isInbound
            ? "bg-blue-50/50 dark:bg-blue-500/[0.04] border-blue-200/50 dark:border-blue-500/10"
            : "bg-white dark:bg-navy-800/50 border-slate-200 dark:border-navy-700"
        }
        ${!isRead && isInbound ? "ring-1 ring-blue-400/30" : ""}
      `}
    >
      <div
        className={`
          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
          ${isInbound ? "bg-blue-500/10" : "bg-slate-100 dark:bg-white/[0.06]"}
        `}
      >
        <Icon
          size={16}
          className={
            isInbound ? "text-blue-400" : "text-slate-500 dark:text-slate-400"
          }
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <DirectionIcon
              size={12}
              className={isInbound ? "text-blue-400" : "text-slate-400"}
            />
            <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {subject}
            </span>
            {!isRead && isInbound && (
              <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
            )}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">
            {new Date(createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {ncaContactName && isInbound && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            From: {ncaContactName}
          </p>
        )}

        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
          {content}
        </p>

        {requiresResponse && !respondedAt && (
          <div
            className={`
              flex items-center gap-1.5 mt-2 text-[10px] font-medium
              ${isOverdue ? "text-red-400" : "text-amber-400"}
            `}
          >
            {isOverdue ? <AlertCircle size={10} /> : <Clock size={10} />}
            {isOverdue
              ? "Response overdue"
              : responseDeadline
                ? `Response needed by ${new Date(responseDeadline).toLocaleDateString()}`
                : "Response required"}
          </div>
        )}
      </div>
    </div>
  );
}
