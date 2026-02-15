"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, CheckCheck, X, Trash2, Loader2 } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface NotificationItem {
  id: string;
  type: string;
  severity: "INFO" | "WARNING" | "URGENT" | "CRITICAL";
  title: string;
  message: string;
  read: boolean;
  dismissed: boolean;
  actionUrl?: string | null;
  createdAt: string;
  config?: {
    icon?: string;
    label?: string;
  };
}

const severityBorder: Record<string, string> = {
  INFO: "border-l-emerald-500",
  WARNING: "border-l-amber-500",
  URGENT: "border-l-red-500",
  CRITICAL: "border-l-red-600",
};

export default function NotificationCenter() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const formatRelativeTime = useCallback(
    (dateStr: string): string => {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      if (mins < 1) return t("common.justNow");
      if (mins < 60) return t("common.minutesAgo", { count: mins });
      if (hours < 24) return t("common.hoursAgo", { count: hours });
      if (days === 1) return t("notifications.yesterday");
      return t("common.daysAgo", { count: days });
    },
    [t],
  );

  const getDateGroup = useCallback(
    (dateStr: string): string => {
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString())
        return t("notifications.today");
      if (date.toDateString() === yesterday.toDateString())
        return t("notifications.yesterday");
      return t("notifications.earlier");
    },
    [t],
  );

  // Fetch unread count (poll every 30s)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch notifications when panel opens
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=30");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Mark single as read
  const markRead = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ notificationIds: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
    } finally {
      setActionLoading(null);
    }
  };

  // Mark all as read
  const markAllRead = async () => {
    setActionLoading("all");
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
    } finally {
      setActionLoading(null);
    }
  };

  // Dismiss
  const dismiss = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch("/api/notifications/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
    } finally {
      setActionLoading(null);
    }
  };

  // Group notifications by date
  const grouped = notifications.reduce<Record<string, NotificationItem[]>>(
    (acc, n) => {
      const group = getDateGroup(n.createdAt);
      if (!acc[group]) acc[group] = [];
      acc[group].push(n);
      return acc;
    },
    {},
  );
  const groupOrder = [
    t("notifications.today"),
    t("notifications.yesterday"),
    t("notifications.earlier"),
  ];

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 dark:text-white/60 hover:text-slate-800 dark:hover:text-white/80 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.04]"
        aria-label={t("notifications.notifications")}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 rounded-full text-[9px] font-medium text-white px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[380px] bg-[#0A0A0B] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-[14px] font-medium text-white">
              {t("notifications.notifications")}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={actionLoading === "all"}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 disabled:opacity-50"
                >
                  {actionLoading === "all" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCheck size={12} />
                  )}
                  {t("notifications.markAllRead")}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-white/60 p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <Bell className="w-8 h-8 text-white/20 mb-3" />
                <p className="text-[13px] text-white/50">
                  {t("notifications.noNotifications")}
                </p>
              </div>
            ) : (
              groupOrder.map((group) => {
                const items = grouped[group];
                if (!items?.length) return null;
                return (
                  <div key={group}>
                    <div className="px-4 py-2 bg-white/[0.02]">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                        {group}
                      </p>
                    </div>
                    {items.map((n) => (
                      <div
                        key={n.id}
                        className={`
                          flex items-start gap-3 px-4 py-3 border-l-2 border-b border-b-white/5
                          ${severityBorder[n.severity] || "border-l-white/10"}
                          ${n.read ? "bg-transparent" : "bg-white/[0.02]"}
                          hover:bg-white/[0.04] transition-colors group
                        `}
                      >
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[12px] leading-snug ${n.read ? "text-white/60" : "text-white/90 font-medium"}`}
                          >
                            {n.title}
                          </p>
                          <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-white/30 mt-1">
                            {formatRelativeTime(n.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pt-0.5">
                          {!n.read && (
                            <button
                              onClick={() => markRead(n.id)}
                              disabled={actionLoading === n.id}
                              className="p-1 text-white/30 hover:text-emerald-400 transition-colors"
                              title={t("notifications.markAsRead")}
                            >
                              {actionLoading === n.id ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Check size={12} />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => dismiss(n.id)}
                            disabled={actionLoading === n.id}
                            className="p-1 text-white/30 hover:text-red-400 transition-colors"
                            title={t("notifications.dismiss")}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
