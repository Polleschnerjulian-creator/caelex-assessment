"use client";

import { Eye, UserX, FolderLock, FileCheck, Clock } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import StakeholderTypeBadge, {
  type StakeholderType,
} from "./StakeholderTypeBadge";

export interface StakeholderEngagement {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  type: StakeholderType;
  status: "ACTIVE" | "INVITED" | "REVOKED";
  lastAccessAt: string | null;
  dataRoomCount: number;
  attestationCount: number;
}

interface StakeholderCardProps {
  engagement: StakeholderEngagement;
  onView: (id: string) => void;
  onRevoke: (id: string) => void;
}

const STATUS_CONFIG: Record<
  StakeholderEngagement["status"],
  { label: string; dotColor: string; textColor: string }
> = {
  ACTIVE: {
    label: "Active",
    dotColor: "bg-green-500",
    textColor: "text-green-600 dark:text-green-400",
  },
  INVITED: {
    label: "Invited",
    dotColor: "bg-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  REVOKED: {
    label: "Revoked",
    dotColor: "bg-red-500",
    textColor: "text-red-600 dark:text-red-400",
  },
};

function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function StakeholderCard({
  engagement,
  onView,
  onRevoke,
}: StakeholderCardProps) {
  const statusConfig = STATUS_CONFIG[engagement.status];

  return (
    <GlassCard hover>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-body-lg font-semibold text-slate-900 dark:text-white truncate">
              {engagement.companyName}
            </h3>
            <p className="text-small text-slate-500 dark:text-white/50 truncate">
              {engagement.contactName}
            </p>
          </div>
          <StakeholderTypeBadge type={engagement.type} size="sm" />
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`}
              aria-hidden="true"
            />
            <span
              className={`text-caption font-medium ${statusConfig.textColor}`}
            >
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-1 text-micro text-slate-500 dark:text-white/40">
            <Clock size={10} aria-hidden="true" />
            {formatRelativeTime(engagement.lastAccessAt)}
          </div>
        </div>

        {/* Counts */}
        <div className="flex items-center gap-4 pt-1">
          <div className="flex items-center gap-1.5 text-caption text-slate-600 dark:text-white/60">
            <FolderLock size={12} aria-hidden="true" />
            <span>{engagement.dataRoomCount} data rooms</span>
          </div>
          <div className="flex items-center gap-1.5 text-caption text-slate-600 dark:text-white/60">
            <FileCheck size={12} aria-hidden="true" />
            <span>{engagement.attestationCount} attestations</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
          <button
            onClick={() => onView(engagement.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium text-slate-700 dark:text-white/70 bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <Eye size={12} aria-hidden="true" />
            View
          </button>
          {engagement.status !== "REVOKED" && (
            <button
              onClick={() => onRevoke(engagement.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <UserX size={12} aria-hidden="true" />
              Revoke
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
