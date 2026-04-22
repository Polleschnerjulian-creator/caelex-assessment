"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Megaphone,
  RefreshCw,
  X,
} from "lucide-react";

/**
 * /atlas/alerts — real implementation replacing the SAMPLE_ALERTS
 * stub. Two concerns on one page:
 *
 *   1. Notifications  — the actual feed of alerts the user has
 *      received (from admin-approved amendments + jurisdiction
 *      updates). Read/unread state, mark-read per row, mark-all-read.
 *   2. Subscriptions  — what the user is watching. Small list with
 *      unsubscribe controls so users can prune their alert scope
 *      without hunting across source/jurisdiction pages.
 *
 * All data comes from /api/atlas/alerts/* — no more hardcoded
 * SAMPLE_ALERTS. Client-side component because the state machine
 * (optimistic mark-read, toggle-all, unsubscribe) is interactive and
 * there's no SEO value in server-rendering private notifications.
 */

interface Notification {
  id: string;
  kind: "SOURCE_AMENDED" | "JURISDICTION_UPDATE" | "ADMIN_BROADCAST";
  title: string;
  summary: string;
  targetType: string;
  targetId: string;
  sourceId: string | null;
  readAt: string | null;
  createdAt: string;
}

interface Subscription {
  id: string;
  targetType: "SOURCE" | "JURISDICTION";
  targetId: string;
  title: string | null;
  createdAt: string;
}

/** Map notification kind → (icon, tint) for the left-column badge. */
const KIND_CONFIG: Record<
  Notification["kind"],
  { icon: typeof AlertTriangle; color: string; bg: string; border: string }
> = {
  SOURCE_AMENDED: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  JURISDICTION_UPDATE: {
    icon: Megaphone,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  ADMIN_BROADCAST: {
    icon: Megaphone,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
};

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - t;
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diffMs < 2 * min) return "just now";
  if (diffMs < hour) return `${Math.floor(diffMs / min)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Build the deep-link back to the source / jurisdiction that
 * triggered a notification. Matches the ATLAS routing conventions.
 */
function deepLinkFor(n: Notification): string {
  if (n.targetType === "SOURCE") return `/atlas/sources/${n.targetId}`;
  if (n.targetType === "JURISDICTION") {
    // "EU" / "INT" land on their own dedicated pages; otherwise
    // fall through to the jurisdictions/[code] detail page.
    if (n.targetId === "EU") return "/atlas/eu";
    if (n.targetId === "INT") return "/atlas/international";
    return `/atlas/jurisdictions/${n.targetId}`;
  }
  return "/atlas";
}

export default function AlertsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [unsubscribingId, setUnsubscribingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nRes, sRes] = await Promise.all([
        fetch("/api/atlas/alerts/notifications?limit=100"),
        fetch("/api/atlas/alerts/subscriptions"),
      ]);
      if (nRes.ok) {
        const data = (await nRes.json()) as {
          notifications: Notification[];
          unreadCount: number;
        };
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
      if (sRes.ok) {
        const data = (await sRes.json()) as { subscriptions: Subscription[] };
        setSubscriptions(data.subscriptions);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Optimistic mark-read: flip local state first, then hit the API.
   * On failure we DON'T roll back — the worst case is a brief UX
   * inconsistency that the next refresh clears up, and the user's
   * intent ("I saw this one") is preserved regardless.
   */
  const markRead = useCallback(async (id: string, read: boolean) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, readAt: read ? new Date().toISOString() : null }
          : n,
      ),
    );
    // Keep the badge count honest.
    setUnreadCount((c) => (read ? Math.max(0, c - 1) : c + 1));
    await fetch(`/api/atlas/alerts/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read }),
    }).catch(() => {
      /* optimistic UX: silent */
    });
  }, []);

  const markAllRead = useCallback(async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const res = await fetch("/api/atlas/alerts/notifications/mark-all-read", {
        method: "POST",
      });
      if (res.ok) {
        const now = new Date().toISOString();
        setNotifications((prev) =>
          prev.map((n) => (n.readAt ? n : { ...n, readAt: now })),
        );
        setUnreadCount(0);
      }
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, unreadCount]);

  const unsubscribe = useCallback(async (subId: string) => {
    setUnsubscribingId(subId);
    try {
      const res = await fetch(
        `/api/atlas/alerts/subscriptions/${encodeURIComponent(subId)}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
      }
    } finally {
      setUnsubscribingId(null);
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--atlas-bg-page)] p-4 gap-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-emerald-600" strokeWidth={1.5} />
          <h1 className="text-[18px] font-semibold tracking-tight text-[var(--atlas-text-primary)]">
            Alerts
          </h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-medium text-red-600 tabular-nums">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            aria-label="Refresh"
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[11px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)] transition-colors shadow-sm"
          >
            <RefreshCw size={11} strokeWidth={1.5} />
            Refresh
          </button>
          <button
            onClick={markAllRead}
            disabled={markingAll || unreadCount === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--atlas-bg-surface)] border border-[var(--atlas-border)] px-2.5 py-1.5 text-[11px] text-[var(--atlas-text-muted)] hover:text-[var(--atlas-text-secondary)] transition-colors shadow-sm disabled:opacity-40 disabled:pointer-events-none"
          >
            {markingAll && (
              <Loader2
                size={11}
                strokeWidth={1.5}
                className="animate-spin"
                aria-hidden="true"
              />
            )}
            Mark all read
          </button>
        </div>
      </header>

      {/* Notifications list */}
      <section className="flex-1 space-y-1.5">
        {loading ? (
          <div className="flex items-center gap-2 text-[12px] text-[var(--atlas-text-faint)] py-12 justify-center">
            <Loader2 size={14} className="animate-spin" strokeWidth={1.5} />
            Loading alerts…
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] px-5 py-10 text-center">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] mb-3">
              <Bell
                size={16}
                strokeWidth={1.5}
                className="text-[var(--atlas-text-faint)]"
              />
            </div>
            <h2 className="text-[13px] font-medium text-[var(--atlas-text-primary)] mb-1">
              No alerts yet
            </h2>
            <p className="text-[11px] text-[var(--atlas-text-muted)] max-w-sm mx-auto leading-relaxed">
              Subscribe to a jurisdiction or a specific source to be notified
              whenever an amendment is detected and reviewed. Open any
              jurisdiction page and click{" "}
              <span className="font-medium">Watch</span>.
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const cfg = KIND_CONFIG[n.kind];
            const Icon = cfg.icon;
            const isUnread = !n.readAt;
            return (
              <Link
                key={n.id}
                href={deepLinkFor(n)}
                onClick={() => {
                  // Click = read. Don't wait for the link navigation
                  // to settle before flipping the flag.
                  if (isUnread) markRead(n.id, true);
                }}
                className={`group relative overflow-hidden rounded-xl border px-4 py-3 transition-all duration-200 shadow-sm block hover:bg-[var(--atlas-bg-surface-muted)] ${
                  isUnread
                    ? "border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] ring-1 ring-emerald-100"
                    : "border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex items-center justify-center h-7 w-7 rounded-md ${cfg.bg} ${cfg.border} border flex-shrink-0 mt-0.5`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 ${cfg.color}`}
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={`text-[9px] font-semibold tracking-wider uppercase ${cfg.color}`}
                      >
                        {n.kind.replace(/_/g, " ").toLowerCase()}
                      </span>
                      {isUnread && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <p
                      className={`text-[12px] leading-relaxed ${
                        isUnread
                          ? "text-[var(--atlas-text-primary)] font-medium"
                          : "text-[var(--atlas-text-muted)]"
                      }`}
                    >
                      {n.title}
                    </p>
                    {n.summary && (
                      <p className="mt-1 text-[11px] text-[var(--atlas-text-muted)] leading-relaxed line-clamp-2">
                        {n.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--atlas-text-faint)]">
                      <span>{formatRelativeTime(n.createdAt)}</span>
                      <span className="opacity-50">·</span>
                      <span className="inline-flex items-center gap-0.5 group-hover:text-[var(--atlas-text-secondary)] transition-colors">
                        View source{" "}
                        <ChevronRight size={10} strokeWidth={1.75} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </section>

      {/* Subscriptions — what the user is watching */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[11px] font-semibold text-[var(--atlas-text-muted)] tracking-[0.1em] uppercase">
            Watching
          </h2>
          <span className="text-[11px] text-[var(--atlas-text-faint)]">
            ({subscriptions.length})
          </span>
        </div>

        {subscriptions.length === 0 ? (
          <p className="text-[11px] text-[var(--atlas-text-faint)] leading-relaxed">
            You haven&rsquo;t subscribed to anything yet. Open a jurisdiction or
            a source and click <strong>Watch</strong> to start getting alerts
            for amendments.
          </p>
        ) : (
          <div className="rounded-xl border border-[var(--atlas-border)] bg-[var(--atlas-bg-surface)] divide-y divide-[var(--atlas-border-subtle)]">
            {subscriptions.map((s) => {
              const label =
                s.title ??
                (s.targetType === "JURISDICTION"
                  ? `Jurisdiction: ${s.targetId}`
                  : s.targetId);
              const href =
                s.targetType === "SOURCE"
                  ? `/atlas/sources/${s.targetId}`
                  : s.targetId === "EU"
                    ? "/atlas/eu"
                    : s.targetId === "INT"
                      ? "/atlas/international"
                      : `/atlas/jurisdictions/${s.targetId}`;
              const busy = unsubscribingId === s.id;
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex items-center justify-center h-7 w-7 rounded-md bg-[var(--atlas-bg-surface-muted)] border border-[var(--atlas-border)] shrink-0">
                    {s.targetType === "JURISDICTION" ? (
                      <Megaphone
                        size={12}
                        strokeWidth={1.75}
                        className="text-[var(--atlas-text-faint)]"
                      />
                    ) : (
                      <CheckCircle2
                        size={12}
                        strokeWidth={1.75}
                        className="text-[var(--atlas-text-faint)]"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={href}
                      className="text-[12px] text-[var(--atlas-text-secondary)] hover:text-[var(--atlas-text-primary)] transition-colors line-clamp-1"
                    >
                      {label}
                    </Link>
                    <div className="text-[10px] text-[var(--atlas-text-faint)] mt-0.5 uppercase tracking-wider">
                      {s.targetType.toLowerCase()}
                    </div>
                  </div>
                  <button
                    onClick={() => unsubscribe(s.id)}
                    disabled={busy}
                    aria-label="Unwatch"
                    title="Unwatch"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md text-[var(--atlas-text-faint)] hover:text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    {busy ? (
                      <Loader2
                        size={12}
                        strokeWidth={1.75}
                        className="animate-spin"
                      />
                    ) : (
                      <X size={13} strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
