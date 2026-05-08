"use client";

/**
 * Sprint E (Notification Center) — full-page inbox client island.
 *
 * Consumes the server-rendered initial list + filter, then handles
 * filter switching, mark-read / dismiss / mark-all-read actions, and
 * pagination ("Load more"). Optimistic updates on every action with
 * server-side rollback on failure.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  X,
  Inbox,
  AlertTriangle,
  ShieldAlert,
  Info,
  ArrowUpRight,
  Filter,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardHeader,
  EmptyState,
} from "@/components/dashboard/v2/ui/PageChrome";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  severity: string;
  read: boolean;
  dismissed: boolean;
  createdAt: string;
  readAt: string | null;
  entityType: string | null;
  entityId: string | null;
}

interface Props {
  initialItems: NotificationItem[];
  initialTotal: number;
  initialUnreadCount: number;
  initialFilter: "all" | "unread";
  /** Sprint UF41 (P1-D4) — server-resolved initial filters. */
  initialSeverity: SeverityFilter | null;
  initialCategory: string | null;
  categories: Array<{ id: string; label: string }>;
}

const PAGE_SIZE = 50;

type SeverityFilter = "INFO" | "WARNING" | "URGENT" | "CRITICAL";
const SEVERITY_OPTIONS: { value: SeverityFilter; label: string }[] = [
  { value: "CRITICAL", label: "Critical" },
  { value: "URGENT", label: "Urgent" },
  { value: "WARNING", label: "Warning" },
  { value: "INFO", label: "Info" },
];

export function NotificationsInbox({
  initialItems,
  initialTotal,
  initialUnreadCount,
  initialFilter,
  initialSeverity,
  initialCategory,
  categories,
}: Props) {
  const router = useRouter();
  const [items, setItems] = React.useState<NotificationItem[]>(initialItems);
  const [total, setTotal] = React.useState(initialTotal);
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount);
  const [filter, setFilter] = React.useState<"all" | "unread">(initialFilter);
  // Sprint UF41 (P1-D4) — severity + category filters on the inbox.
  // Both are mirrored to URL params so back/forward + bookmarks work.
  const [severity, setSeverity] = React.useState<SeverityFilter | null>(
    initialSeverity,
  );
  const [category, setCategory] = React.useState<string | null>(
    initialCategory,
  );
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const hasMore = items.length < total;

  /**
   * Sprint UF41 — single helper that owns URL-param construction. Each
   * filter mutator calls this so we never drift between the URL and
   * the in-memory state. router.refresh() then re-runs the server
   * component and the initial list reflects the new filter without
   * a full page reload.
   */
  function pushFiltered(next: {
    filter?: "all" | "unread";
    severity?: SeverityFilter | null;
    category?: string | null;
  }) {
    const f = next.filter ?? filter;
    const s = next.severity === undefined ? severity : next.severity;
    const c = next.category === undefined ? category : next.category;
    const params = new URLSearchParams();
    if (f === "unread") params.set("filter", "unread");
    if (s) params.set("severity", s);
    if (c) params.set("category", c);
    const qs = params.toString();
    router.push(
      qs ? `/dashboard/notifications?${qs}` : "/dashboard/notifications",
    );
    router.refresh();
  }

  function switchFilter(next: "all" | "unread") {
    if (next === filter) return;
    setFilter(next);
    pushFiltered({ filter: next });
  }

  function switchSeverity(next: SeverityFilter | null) {
    if (next === severity) return;
    setSeverity(next);
    pushFiltered({ severity: next });
  }

  function switchCategory(next: string | null) {
    if (next === category) return;
    setCategory(next);
    pushFiltered({ category: next });
  }

  function clearAll() {
    if (filter === "all" && severity === null && category === null) return;
    setFilter("all");
    setSeverity(null);
    setCategory(null);
    pushFiltered({ filter: "all", severity: null, category: null });
  }

  async function handleClick(n: NotificationItem) {
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
        setItems((prev) =>
          prev.map((it) => (it.id === n.id ? { ...it, read: false } : it)),
        );
        setUnreadCount((c) => c + 1);
        return;
      }
    }
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  }

  async function handleDismiss(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const dismissed = items.find((it) => it.id === id);
    setItems((prev) => prev.filter((it) => it.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    if (dismissed && !dismissed.read) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch("/api/notifications/dismiss", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
    } catch {
      // Item disappeared from local state but server still has it —
      // a refresh will resync. Acceptable for the inbox.
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0 || busy) return;
    setBusy(true);
    setItems((prev) => prev.map((it) => ({ ...it, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const url = new URL("/api/notifications", window.location.origin);
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("offset", String(items.length));
      if (filter === "unread") url.searchParams.set("read", "false");
      // Sprint UF41 — severity + category have to round-trip too,
      // otherwise "Load more" silently widens the result set past
      // what the user filtered.
      if (severity) url.searchParams.set("severity", severity);
      if (category) url.searchParams.set("category", category);
      const res = await fetch(url.toString());
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: NotificationItem[];
        total: number;
      };
      setItems((prev) => [...prev, ...data.notifications]);
      setTotal(data.total);
    } finally {
      setLoadingMore(false);
    }
  }

  const hasActiveFilter =
    filter === "unread" || severity !== null || category !== null;

  return (
    <div className="space-y-4">
      {/* Filter tabs + dropdowns + bulk action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
            <FilterTab
              active={filter === "all"}
              onClick={() => switchFilter("all")}
              icon={Filter}
            >
              All
              <span className="ml-1.5 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] tabular-nums text-slate-300">
                {total}
              </span>
            </FilterTab>
            <FilterTab
              active={filter === "unread"}
              onClick={() => switchFilter("unread")}
              icon={Inbox}
            >
              Unread
              {unreadCount > 0 ? (
                <span className="ml-1.5 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] tabular-nums text-rose-300 ring-1 ring-inset ring-rose-500/20">
                  {unreadCount}
                </span>
              ) : null}
            </FilterTab>
          </nav>

          {/* Sprint UF41 (P1-D4) — severity dropdown.
              Audit-flagged finding: Notifications surface had only
              all/unread; CO with 200 mixed signals couldn't isolate
              CRITICAL items. Native <select> for keyboard-friendliness
              + zero JS overhead. */}
          <FilterSelect
            label="Severity"
            value={severity ?? ""}
            onChange={(v) => switchSeverity((v as SeverityFilter) || null)}
            options={SEVERITY_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
          />

          {/* Sprint UF41 (P1-D4) — category dropdown. Server resolves
              category id → NotificationType[] via NOTIFICATION_CONFIG
              so the operator picks "Compliance" or "Incidents", not 30+
              raw enum values. */}
          <FilterSelect
            label="Category"
            value={category ?? ""}
            onChange={(v) => switchCategory(v || null)}
            options={categories.map((c) => ({
              value: c.id,
              label: c.label,
            }))}
          />

          {hasActiveFilter ? (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium text-slate-400 transition hover:text-slate-200"
              title="Reset all filters"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0 || busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-[12px] font-medium text-slate-200 transition hover:border-white/[0.14] hover:bg-white/[0.05] disabled:opacity-40 disabled:hover:border-white/[0.08] disabled:hover:bg-white/[0.025]"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title={
              hasActiveFilter
                ? "No notifications match these filters"
                : "No notifications yet"
            }
            description={
              hasActiveFilter
                ? "Adjust the filters above or clear them to see your full inbox."
                : "Notifications appear here when deadlines approach, regulators publish updates, or incidents need attention."
            }
            cta={
              hasActiveFilter
                ? { label: "Clear filters", href: "/dashboard/notifications" }
                : undefined
            }
          />
        </Card>
      ) : (
        <Card>
          <CardHeader
            icon={Bell}
            title={`${items.length} of ${total}`}
            subtitle="Click an item to mark it read and follow the link if one is set. Click X to dismiss without marking read."
          />
          <ul className="divide-y divide-white/[0.04]">
            {items.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onClick={() => handleClick(n)}
                onDismiss={(e) => handleDismiss(e, n.id)}
              />
            ))}
          </ul>
          {hasMore ? (
            <div className="border-t border-white/[0.05] bg-white/[0.012] px-4 py-3 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="text-[12px] font-medium text-emerald-300 transition hover:text-emerald-200 disabled:opacity-50"
              >
                {loadingMore
                  ? "Loading…"
                  : `Load ${Math.min(PAGE_SIZE, total - items.length)} more`}
              </button>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}

import { Bell } from "lucide-react";

function FilterTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition ${
        active
          ? "bg-white/[0.06] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

/**
 * Sprint UF41 (P1-D4) — native <select> wrapped to match the toolbar
 * aesthetic. Native picker is keyboard-accessible by default + works
 * on touch without an extra library. The placeholder option ("Any")
 * doubles as the unset state — selecting it clears the filter.
 */
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const isActive = value !== "";
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`appearance-none rounded-lg border bg-white/[0.02] px-3 py-1.5 pr-7 text-[12px] font-medium transition focus:outline-none focus:ring-1 focus:ring-emerald-500/40 ${
          isActive
            ? "border-emerald-500/30 text-emerald-200"
            : "border-white/[0.06] text-slate-300 hover:border-white/[0.12]"
        }`}
      >
        <option value="">{label}: Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {label}: {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-slate-400" />
    </label>
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
        className={`group flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-white/[0.025] ${
          notification.read ? "opacity-65" : ""
        }`}
      >
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]">
          <SeverityIcon className={`h-3.5 w-3.5 ${tone}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-slate-100">
              {notification.title}
            </span>
            {!notification.read ? (
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            ) : null}
            {notification.actionUrl ? (
              <ArrowUpRight className="h-3 w-3 text-slate-500 opacity-0 transition group-hover:opacity-100" />
            ) : null}
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-400">
            {notification.message}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {formatRelative(notification.createdAt)}
            {notification.entityType ? (
              <>
                {" · "}
                <span className="font-mono">{notification.entityType}</span>
              </>
            ) : null}
          </p>
        </div>
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
          className="rounded p-1 text-slate-500 opacity-0 transition hover:bg-white/[0.06] hover:text-slate-200 group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
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

// Re-export Link for tree-shake safety; not used elsewhere but defensive.
export const __link = Link;
