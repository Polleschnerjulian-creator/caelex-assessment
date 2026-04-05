"use client";

import {
  Eye,
  XCircle,
  FolderLock,
  FileText,
  Clock,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

export interface DataRoom {
  id: string;
  name: string;
  purpose: string;
  stakeholderName: string;
  documentCount: number;
  accessLevel: "VIEW_ONLY" | "COMMENT" | "CONTRIBUTE" | "FULL_ACCESS";
  expiresAt: string | null;
  status: "ACTIVE" | "CLOSED";
  createdAt: string;
}

interface DataRoomCardProps {
  dataRoom: DataRoom;
  onView: (id: string) => void;
  onClose: (id: string) => void;
}

const ACCESS_LEVEL_CONFIG: Record<
  DataRoom["accessLevel"],
  { label: string; color: string; icon: typeof ShieldCheck }
> = {
  VIEW_ONLY: {
    label: "View Only",
    color:
      "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20",
    icon: ShieldCheck,
  },
  COMMENT: {
    label: "Comment",
    color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    icon: ShieldCheck,
  },
  CONTRIBUTE: {
    label: "Contribute",
    color:
      "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    icon: ShieldAlert,
  },
  FULL_ACCESS: {
    label: "Full Access",
    color:
      "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: ShieldCheck,
  },
};

function getExpiryInfo(expiresAt: string | null): {
  label: string;
  urgent: boolean;
} | null {
  if (!expiresAt) return null;
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return { label: "Expired", urgent: true };
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 3) return { label: `${diffDays}d left`, urgent: true };
  if (diffDays <= 14) return { label: `${diffDays}d left`, urgent: false };
  return { label: `${diffDays}d left`, urgent: false };
}

export default function DataRoomCard({
  dataRoom,
  onView,
  onClose,
}: DataRoomCardProps) {
  const accessConfig = ACCESS_LEVEL_CONFIG[dataRoom.accessLevel];
  const AccessIcon = accessConfig.icon;
  const expiryInfo = getExpiryInfo(dataRoom.expiresAt);
  const isClosed = dataRoom.status === "CLOSED";

  return (
    <GlassCard hover>
      <div className={`p-4 space-y-3 ${isClosed ? "opacity-60" : ""}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FolderLock
              size={16}
              className={`flex-shrink-0 ${
                isClosed
                  ? "text-slate-400 dark:text-white/30"
                  : "text-emerald-500"
              }`}
            />
            <h3 className="text-body-lg font-semibold text-slate-900 dark:text-white truncate">
              {dataRoom.name}
            </h3>
          </div>
          <span
            className={`text-micro px-1.5 py-0.5 rounded-full font-medium ${
              isClosed
                ? "bg-slate-100 dark:bg-[--glass-bg-elevated] text-slate-500 dark:text-white/40"
                : "bg-green-500/10 text-green-600 dark:text-green-400"
            }`}
          >
            {dataRoom.status}
          </span>
        </div>

        {/* Purpose and stakeholder */}
        <div className="space-y-1">
          <p className="text-small text-slate-500 dark:text-white/50 line-clamp-2">
            {dataRoom.purpose}
          </p>
          <p className="text-caption text-slate-400 dark:text-white/40">
            Shared with {dataRoom.stakeholderName}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-caption text-slate-600 dark:text-white/60">
            <FileText size={12} aria-hidden="true" />
            <span>{dataRoom.documentCount} documents</span>
          </div>

          <span
            className={`flex items-center gap-1 text-micro px-1.5 py-0.5 rounded border font-medium ${accessConfig.color}`}
          >
            <AccessIcon size={10} aria-hidden="true" />
            {accessConfig.label}
          </span>

          {expiryInfo && (
            <span
              className={`flex items-center gap-1 text-micro ${
                expiryInfo.urgent
                  ? "text-red-500 dark:text-red-400"
                  : "text-slate-500 dark:text-white/50"
              }`}
            >
              <Clock size={10} aria-hidden="true" />
              {expiryInfo.label}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-[--glass-border-subtle]">
          <button
            onClick={() => onView(dataRoom.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium text-slate-700 dark:text-white/70 bg-slate-100 dark:bg-[--glass-bg-elevated] hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <Eye size={12} aria-hidden="true" />
            View
          </button>
          {!isClosed && (
            <button
              onClick={() => onClose(dataRoom.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <XCircle size={12} aria-hidden="true" />
              Close Room
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
