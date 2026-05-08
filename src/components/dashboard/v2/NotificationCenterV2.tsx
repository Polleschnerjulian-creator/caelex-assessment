"use client";

/**
 * Sprint E (Notification Center) — Bell + popover for V2.
 *
 * Replaces the inert <Bell> placeholder in V2TopBar with a real
 * unread-count badge + click-to-open popover. The popover renders
 * the 10 most-recent unread+read notifications with click-to-mark-
 * read + click-through to actionUrl, plus "Mark all read" /
 * "View all" affordances.
 *
 * Server APIs reused (zero new endpoints):
 *   GET  /api/notifications?limit=10
 *   GET  /api/notifications/unread-count
 *   POST /api/notifications/mark-read   { notificationIds[] | all:true }
 *   POST /api/notifications/dismiss     { notificationId | all:true }
 *
 * Refresh strategy: polls unread-count every 60s while the bell is
 * mounted (cheap query, single COUNT). On popover-open, refetches
 * the list. On click-action, optimistic update + background refetch.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  X,
  CheckCheck,
  Inbox,
  AlertTriangle,
  ShieldAlert,
  Info,
  ArrowUpRight,
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  severity: "INFO" | "WARNING" | "CRITICAL";
  read: boolean;
  dismissed: boolean;
  createdAt: string; // ISO
  readAt: string | null;
}

const POLL_INTERVAL_MS = 60_000;
const POPOVER_LIMIT = 10;

export function NotificationCenterV2() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

  // Initial unread fetch + interval poll.
  React.useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (!res.ok || !active) return;
        const data = (await res.json()) as { count?: number };
        if (active && typeof data.count === "number")
          setUnreadCount(data.count);
      } catch {
        // Network blip — keep last known count
      }
    };
    void fetchCount();
    const t = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  // When opening, fetch the list.
  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/notifications?limit=${POPOVER_LIMIT}`);
        if (!res.ok || !active) return;
        const data = (await res.json()) as {
          notifications: NotificationItem[];
          unreadCount: number;
        };
        if (active) {
          setItems(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      } catch {
        // Show empty fallback below
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  // Outside-click close.
  React.useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Escape closes.
  React.useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  async function handleItemClick(n: NotificationItem) {
    // Optimistic mark-read
    if (!n.read) {
      setItems((prev) =>
        prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ notificationIds: [n.id] }),
        });
      } catch {
        // Roll back on failure
        setItems((prev) =>
          prev.map((it) => (it.id === n.id ? { ...it, read: false } : it)),
        );
        setUnreadCount((c) => c + 1);
        return;
      }
    }
    if (n.actionUrl) {
      setOpen(false);
      router.push(n.actionUrl);
    }
  }

  async function handleMarkAllRead(e: React.MouseEvent) {
    e.stopPropagation();
    if (unreadCount === 0) return;
    setItems((prev) => prev.map((it) => ({ ...it, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      // Re-poll the truth
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = (await res.json()) as { count?: number };
        if (typeof data.count === "number") setUnreadCount(data.count);
      }
    }
  }

  async function handleDismiss(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      await fetch("/api/notifications/dismiss", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch {
      // Item disappeared from local state but server still has it —
      // next refetch will resync. Acceptable degradation.
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : "Notifications"
        }
        aria-expanded={open}
        data-testid="v2-topbar-bell"
        onClick={() => setOpen((o) => !o)}
        className="apple-icon-btn relative inline-flex h-8 w-8 items-center justify-center rounded-full"
      >
        <Bell className="h-4 w-4" strokeWidth={1.6} />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-semibold leading-none text-white"
            style={{ height: 16 }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[380px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#13131A] shadow-[0_24px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur"
        >
          <header className="flex items-center justify-between gap-2 border-b border-white/[0.05] bg-white/[0.012] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] font-semibold tracking-tight text-slate-100">
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-rose-300 ring-1 ring-inset ring-rose-500/25">
                  {unreadCount} new
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-400 transition hover:bg-white/[0.05] hover:text-slate-200 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            </div>
          </header>

          <div className="max-h-[480px] overflow-y-auto">
            {loading ? (
              <ul className="divide-y divide-white/[0.04]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="px-4 py-3">
                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.05]" />
                    <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-white/[0.04]" />
                  </li>
                ))}
              </ul>
            ) : items.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]">
                  <Inbox className="h-4 w-4 text-slate-500" />
                </div>
                <p className="text-[12.5px] text-slate-300">All caught up</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  We&apos;ll show new compliance signals here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.04]">
                {items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onClick={() => handleItemClick(n)}
                    onDismiss={(e) => handleDismiss(e, n.id)}
                  />
                ))}
              </ul>
            )}
          </div>

          <footer className="border-t border-white/[0.05] bg-white/[0.012] px-4 py-2.5">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex w-full items-center justify-center gap-1 rounded-md py-1 text-[12px] font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-slate-100"
            >
              View all
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

function NotificationRow({
  notification,
  onClick,
  onDismiss,
}: {
  notification: NotificationItem;
  onClick: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}) {
  const SeverityIcon =
    notification.severity === "CRITICAL"
      ? ShieldAlert
      : notification.severity === "WARNING"
        ? AlertTriangle
        : Info;
  const tone =
    notification.severity === "CRITICAL"
      ? "text-rose-400"
      : notification.severity === "WARNING"
        ? "text-amber-400"
        : "text-cyan-400";

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`group flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/[0.025] ${
          notification.read ? "opacity-60" : ""
        }`}
      >
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
          <SeverityIcon className={`h-3.5 w-3.5 ${tone}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[12.5px] font-semibold text-slate-100">
              {notification.title}
            </span>
            {!notification.read ? (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-slate-400">
            {notification.message}
          </p>
          <p className="mt-1 text-[10.5px] text-slate-500">
            {formatRelative(notification.createdAt)}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          {!notification.read ? (
            <span
              aria-hidden
              title="Will be marked read on click"
              className="rounded p-1 text-slate-500"
            >
              <Check className="h-3 w-3" />
            </span>
          ) : null}
          <span
            role="button"
            tabIndex={0}
            aria-label="Dismiss"
            onClick={onDismiss}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onDismiss(
                  e as unknown as React.MouseEvent<HTMLSpanElement, MouseEvent>,
                );
              }
            }}
            className="rounded p-1 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-200"
          >
            <X className="h-3 w-3" />
          </span>
        </span>
      </button>
    </li>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 30) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return new Date(iso).toLocaleDateString();
}
