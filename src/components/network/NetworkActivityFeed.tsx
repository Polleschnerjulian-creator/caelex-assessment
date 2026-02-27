"use client";

import {
  UserPlus,
  UserX,
  FolderPlus,
  FolderLock,
  FileText,
  ShieldCheck,
  Eye,
  Download,
  LogIn,
  Activity,
} from "lucide-react";

export interface NetworkActivity {
  id: string;
  action:
    | "STAKEHOLDER_INVITED"
    | "STAKEHOLDER_REVOKED"
    | "DATA_ROOM_CREATED"
    | "DATA_ROOM_CLOSED"
    | "DOCUMENT_ADDED"
    | "ATTESTATION_SIGNED"
    | "DOCUMENT_VIEWED"
    | "DOCUMENT_DOWNLOADED"
    | "PORTAL_LOGIN";
  description: string;
  timestamp: string;
  entityId: string;
  entityType: string;
}

interface NetworkActivityFeedProps {
  activities: NetworkActivity[];
  loading?: boolean;
}

const ACTION_CONFIG: Record<
  NetworkActivity["action"],
  { icon: typeof UserPlus; color: string }
> = {
  STAKEHOLDER_INVITED: {
    icon: UserPlus,
    color: "text-emerald-500 bg-emerald-500/10",
  },
  STAKEHOLDER_REVOKED: {
    icon: UserX,
    color: "text-red-500 bg-red-500/10",
  },
  DATA_ROOM_CREATED: {
    icon: FolderPlus,
    color: "text-emerald-500 bg-emerald-500/10",
  },
  DATA_ROOM_CLOSED: {
    icon: FolderLock,
    color: "text-amber-500 bg-amber-500/10",
  },
  DOCUMENT_ADDED: {
    icon: FileText,
    color: "text-green-500 bg-green-500/10",
  },
  ATTESTATION_SIGNED: {
    icon: ShieldCheck,
    color: "text-slate-500 bg-slate-500/10",
  },
  DOCUMENT_VIEWED: {
    icon: Eye,
    color:
      "text-slate-500 dark:text-white/50 bg-slate-500/10 dark:bg-[--glass-bg-elevated]",
  },
  DOCUMENT_DOWNLOADED: {
    icon: Download,
    color: "text-orange-500 bg-orange-500/10",
  },
  PORTAL_LOGIN: {
    icon: LogIn,
    color:
      "text-slate-500 dark:text-white/50 bg-slate-500/10 dark:bg-[--glass-bg-elevated]",
  },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return "just now";
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 p-3 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[--glass-bg-elevated]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 rounded bg-slate-200 dark:bg-[--glass-bg-elevated]" />
        <div className="h-2.5 w-1/4 rounded bg-slate-100 dark:bg-[--glass-bg-surface]" />
      </div>
    </div>
  );
}

export default function NetworkActivityFeed({
  activities,
  loading = false,
}: NetworkActivityFeedProps) {
  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity
          size={32}
          className="text-slate-300 dark:text-white/20 mb-3"
        />
        <p className="text-body text-slate-500 dark:text-white/50">
          No network activity yet.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-white/5">
      {activities.map((activity) => {
        const config = ACTION_CONFIG[activity.action];
        const Icon = config?.icon || Activity;
        const colorClasses =
          config?.color || "text-slate-500 dark:text-white/50 bg-slate-500/10";

        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-[--glass-bg-surface] transition-colors"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClasses}`}
            >
              <Icon size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body text-slate-700 dark:text-white/70">
                {activity.description}
              </p>
              <p className="text-micro text-slate-400 dark:text-white/30 mt-0.5">
                {formatRelativeTime(activity.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
