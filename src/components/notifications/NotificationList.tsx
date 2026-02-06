"use client";

import { useState, useEffect } from "react";
import { Bell, Filter, CheckCheck, Loader2 } from "lucide-react";
import { NotificationItem } from "./NotificationItem";

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

interface Category {
  id: string;
  label: string;
}

export function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, offset]);

  async function fetchNotifications() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());
      if (filter === "unread") {
        params.append("read", "false");
      }

      const response = await fetch(`/api/notifications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setTotal(data.total);
        setUnreadCount(data.unreadCount);
        setCategories(data.categories || []);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [id] }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }

  async function handleDismiss(id: string) {
    try {
      const response = await fetch("/api/notifications/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });

      if (response.ok) {
        const notification = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        setTotal((prev) => prev - 1);
        if (notification && !notification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    }
  }

  const hasMore = offset + limit < total;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
          <p className="text-sm text-white/60">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "You&apos;re all caught up"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              {isMarkingAll ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCheck size={14} />
              )}
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setFilter("all");
            setOffset(0);
          }}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            filter === "all"
              ? "bg-white/10 text-white"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          All
        </button>
        <button
          onClick={() => {
            setFilter("unread");
            setOffset(0);
          }}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            filter === "unread"
              ? "bg-white/10 text-white"
              : "text-white/60 hover:text-white hover:bg-white/5"
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-white/40" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
            <Bell size={24} className="text-white/30" />
          </div>
          <h3 className="text-lg font-medium text-white mb-1">
            No Notifications
          </h3>
          <p className="text-sm text-white/50">
            {filter === "unread"
              ? "You&apos;ve read all your notifications"
              : "You don&apos;t have any notifications yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onDismiss={handleDismiss}
              variant="full"
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(offset > 0 || hasMore) && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-white/50">
            {offset + 1} - {Math.min(offset + limit, total)} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={!hasMore}
            className="px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationList;
