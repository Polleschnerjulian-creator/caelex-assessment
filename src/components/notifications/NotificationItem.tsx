"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Check,
  FileText,
  Shield,
  Bell,
  Users,
  Satellite,
  Settings,
} from "lucide-react";

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    actionUrl: string | null;
    severity: string;
    read: boolean;
    createdAt: string;
    config: {
      label: string;
      category: string;
    };
  };
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onClose?: () => void;
  variant?: "dropdown" | "full";
}

const categoryIcons: Record<string, typeof Clock> = {
  deadlines: Clock,
  compliance: Shield,
  authorization: FileText,
  incidents: AlertTriangle,
  reports: FileText,
  team: Users,
  spacecraft: Satellite,
  system: Settings,
};

const severityConfig: Record<
  string,
  { icon: typeof Info; color: string; bgColor: string }
> = {
  INFO: {
    icon: Info,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  WARNING: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  URGENT: {
    icon: AlertCircle,
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
  },
  CRITICAL: {
    icon: AlertCircle,
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  onClose,
  variant = "dropdown",
}: NotificationItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const severity = severityConfig[notification.severity] || severityConfig.INFO;
  const SeverityIcon = severity.icon;
  const CategoryIcon = categoryIcons[notification.config.category] || Bell;

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  const content = (
    <div
      className={`
        relative p-3 transition-colors
        ${!notification.read ? "bg-blue-500/5" : ""}
        ${isHovered ? "bg-white/[0.03]" : ""}
        ${variant === "full" ? "rounded-lg border border-white/5" : ""}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div
          className={`
            w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
            ${severity.bgColor}
          `}
        >
          <SeverityIcon size={18} className={severity.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4
                className={`text-sm font-medium truncate ${
                  notification.read ? "text-white/70" : "text-white"
                }`}
              >
                {notification.title}
              </h4>
              <p className="text-xs text-white/50 line-clamp-2 mt-0.5">
                {notification.message}
              </p>
            </div>

            {/* Actions (visible on hover) */}
            {isHovered && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {!notification.read && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onMarkAsRead(notification.id);
                    }}
                    className="p-1 rounded hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDismiss(notification.id);
                  }}
                  className="p-1 rounded hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-white/40">
              <CategoryIcon size={10} />
              {notification.config.category}
            </span>
            <span className="text-white/20">·</span>
            <span className="text-[10px] text-white/40">
              {formatTime(notification.createdAt)}
            </span>
            {!notification.read && (
              <>
                <span className="text-white/20">·</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (notification.actionUrl) {
    return (
      <Link
        href={notification.actionUrl}
        onClick={() => {
          if (!notification.read) {
            onMarkAsRead(notification.id);
          }
          onClose?.();
        }}
        className="block"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default NotificationItem;
