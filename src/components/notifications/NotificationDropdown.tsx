"use client";

import { useState, useEffect } from "react";
import {
  X,
  Check,
  CheckCheck,
  Settings,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { NotificationItem } from "./NotificationItem";
import { csrfHeaders } from "@/lib/csrf-client";

interface Notification {
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
}

interface NotificationDropdownProps {
  onClose: () => void;
  onNotificationRead: () => void;
}

export function NotificationDropdown({
  onClose,
  onNotificationRead,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const response = await fetch("/api/notifications?limit=10");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkAllAsRead() {
    setIsMarkingAll(true);
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ all: true }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        onNotificationRead();
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    } finally {
      setIsMarkingAll(false);
    }
  }

  async function handleMarkAsRead(id: string) {
    try {
      const response = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ notificationIds: [id] }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        onNotificationRead();
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }

  async function handleDismiss(id: string) {
    try {
      const response = await fetch("/api/notifications/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ notificationId: id }),
      });

      if (response.ok) {
        const notification = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (notification && !notification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
          onNotificationRead();
        }
      }
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    }
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white disabled:opacity-50"
              title="Mark all as read"
            >
              {isMarkingAll ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CheckCheck size={16} />
              )}
            </button>
          )}
          <Link
            href="/dashboard/settings/notifications"
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            title="Notification settings"
            onClick={onClose}
          >
            <Settings size={16} />
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-white/40" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
              <Check size={24} className="text-white/30" />
            </div>
            <p className="text-sm text-white/50">You&apos;re all caught up!</p>
            <p className="text-xs text-white/30 mt-1">No new notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onDismiss={handleDismiss}
                onClose={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-white/10 p-2">
          <Link
            href="/dashboard/notifications"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            View all notifications
            <ExternalLink size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
