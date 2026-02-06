"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  FileText,
  Shield,
  Upload,
  CheckCircle2,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  Clock,
  MapPin,
  Monitor,
  ExternalLink,
} from "lucide-react";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  entityType?: string;
  entityId?: string;
  description: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  changes?: {
    field: string;
    oldValue: string | null;
    newValue: string | null;
  }[];
}

interface AuditLogItemProps {
  entry: AuditLogEntry;
  showDetails?: boolean;
}

// Action to icon mapping
const ACTION_ICONS: Record<string, typeof Activity> = {
  create: FileText,
  update: Activity,
  delete: Activity,
  upload: Upload,
  approve: CheckCircle2,
  submit: CheckCircle2,
  login: UserIcon,
  logout: UserIcon,
  security: Shield,
  default: Activity,
};

// Action to color mapping
const ACTION_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  create: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  update: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  delete: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  upload: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  approve: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  submit: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  login: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  logout: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
  },
  security: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  default: {
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/30",
  },
};

// Get action category from action string
function getActionCategory(action: string): string {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes("create") || lowerAction.includes("add"))
    return "create";
  if (
    lowerAction.includes("update") ||
    lowerAction.includes("change") ||
    lowerAction.includes("edit")
  )
    return "update";
  if (lowerAction.includes("delete") || lowerAction.includes("remove"))
    return "delete";
  if (lowerAction.includes("upload")) return "upload";
  if (lowerAction.includes("approve") || lowerAction.includes("accept"))
    return "approve";
  if (lowerAction.includes("submit") || lowerAction.includes("send"))
    return "submit";
  if (lowerAction.includes("login") || lowerAction.includes("sign_in"))
    return "login";
  if (lowerAction.includes("logout") || lowerAction.includes("sign_out"))
    return "logout";
  if (lowerAction.includes("security") || lowerAction.includes("auth"))
    return "security";
  return "default";
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Format action name for display
function formatActionName(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditLogItem({
  entry,
  showDetails = false,
}: AuditLogItemProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);

  const category = getActionCategory(entry.action);
  const Icon = ACTION_ICONS[category] || ACTION_ICONS.default;
  const colors = ACTION_COLORS[category] || ACTION_COLORS.default;

  const hasDetails = entry.changes?.length || entry.metadata || entry.ipAddress;

  return (
    <div className="relative pl-12">
      {/* Timeline dot */}
      <div
        className={`absolute left-0 w-12 h-12 flex items-center justify-center`}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${colors.bg} border ${colors.border}`}
        >
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
      </div>

      {/* Content */}
      <div
        className={`group bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-lg p-4 transition-colors ${
          hasDetails ? "cursor-pointer" : ""
        }`}
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white">
                {formatActionName(entry.action)}
              </span>
              {entry.entityType && (
                <span className="px-2 py-0.5 text-xs bg-white/10 text-white/60 rounded">
                  {entry.entityType}
                </span>
              )}
            </div>
            <p className="text-sm text-white/60 mt-1 line-clamp-2">
              {entry.description}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-white/40 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(entry.timestamp)}
            </span>
            {hasDetails && (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-white/30" />
              </motion.div>
            )}
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-2 mt-3">
          {entry.user.avatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={entry.user.avatar}
              alt={entry.user.name}
              className="w-5 h-5 rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
              <UserIcon className="w-3 h-3 text-white/50" />
            </div>
          )}
          <span className="text-xs text-white/50">
            {entry.user.name || entry.user.email.split("@")[0]}
          </span>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && hasDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              {/* Changes */}
              {entry.changes && entry.changes.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                    Changes
                  </h4>
                  <div className="space-y-2">
                    {entry.changes.map((change, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-xs"
                      >
                        <span className="text-white/60 min-w-[80px]">
                          {change.field}:
                        </span>
                        <span className="text-red-400/70 line-through">
                          {change.oldValue || "(empty)"}
                        </span>
                        <ChevronRight className="w-3 h-3 text-white/30 shrink-0" />
                        <span className="text-green-400/70">
                          {change.newValue || "(empty)"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {entry.ipAddress && (
                  <div className="flex items-center gap-2 text-white/40">
                    <MapPin className="w-3 h-3" />
                    <span>IP: {entry.ipAddress}</span>
                  </div>
                )}
                {entry.userAgent && (
                  <div className="flex items-center gap-2 text-white/40">
                    <Monitor className="w-3 h-3" />
                    <span className="truncate">{entry.userAgent}</span>
                  </div>
                )}
                {entry.entityId && (
                  <div className="flex items-center gap-2 text-white/40">
                    <ExternalLink className="w-3 h-3" />
                    <span className="font-mono">{entry.entityId}</span>
                  </div>
                )}
              </div>

              {/* Metadata */}
              {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
                    Additional Data
                  </h4>
                  <pre className="text-xs text-white/50 bg-white/5 rounded p-2 overflow-x-auto">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* Timestamp details */}
              <div className="mt-3 text-xs text-white/40">
                {new Date(entry.timestamp).toLocaleString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
