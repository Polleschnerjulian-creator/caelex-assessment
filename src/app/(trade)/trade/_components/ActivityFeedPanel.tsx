/**
 * Caelex Trade — Welcome dashboard Activity Feed panel.
 *
 * Renders a chronological feed of recent trade activity, grouped by
 * day. Each item is a click-through link to the source entity. The
 * panel renders an empty state when no recent events exist.
 *
 * Server component — no client-side state. The parent (page.tsx)
 * fetches the feed via getActivityFeed().
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import Link from "next/link";
import {
  Activity,
  Workflow,
  FileCheck,
  Users,
  Package,
  FileSignature,
  AlertOctagon,
  Layers,
  type LucideIcon,
} from "lucide-react";
import {
  groupActivityByDay,
  formatRelativeTime,
  type ActivityEvent,
} from "@/lib/trade/welcome-feed/activity-feed-service";

interface ActivityFeedPanelProps {
  events: ActivityEvent[];
  /** Optional `now` override for deterministic rendering in tests. */
  now?: Date;
}

export function ActivityFeedPanel({ events, now }: ActivityFeedPanelProps) {
  const groups = groupActivityByDay(events);

  return (
    <section className="mb-8" data-testid="activity-feed-panel">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-trade-text-primary">
          Recent activity
        </h2>
        <p className="text-[12px] text-trade-text-muted">
          Last 30 days · {events.length} event{events.length === 1 ? "" : "s"}
        </p>
      </header>

      {groups.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-md border border-trade-border-subtle bg-trade-bg-panel">
          {groups.map((group, idx) => (
            <div
              key={group.date}
              className={
                idx > 0 ? "border-t border-trade-border-subtle" : undefined
              }
            >
              <div className="bg-trade-bg-subtle px-4 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-trade-text-muted">
                  {formatDayLabel(group.date)}
                </p>
              </div>
              <ul className="divide-y divide-trade-border-subtle">
                {group.events.map((evt) => (
                  <li key={evt.id}>
                    <ActivityRow event={evt} now={now} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Row primitive ──────────────────────────────────────────────────

function ActivityRow({ event, now }: { event: ActivityEvent; now?: Date }) {
  const Icon = iconForCategory(event.category);
  const tone = toneForCategory(event.category);

  return (
    <Link
      href={event.href}
      className="group flex items-start gap-3 px-4 py-2.5 transition hover:bg-trade-bg-elevated"
    >
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tone}`}
      >
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[12px] font-medium text-trade-text-primary group-hover:text-trade-accent-strong">
          {event.title}
        </p>
        <p className="mt-0.5 text-[11px] text-trade-text-muted">
          {event.actorEmail ? (
            <>
              <span className="font-mono">{event.actorEmail}</span>
              <span className="mx-1.5">·</span>
            </>
          ) : null}
          <time dateTime={event.occurredAt.toISOString()}>
            {formatRelativeTime(event.occurredAt, now)}
          </time>
        </p>
      </div>
    </Link>
  );
}

// ─── Empty state ────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed border-trade-border-subtle bg-trade-bg-panel p-8 text-center">
      <Activity
        className="mx-auto mb-2 h-7 w-7 text-trade-text-muted"
        strokeWidth={1.5}
      />
      <p className="text-[13px] font-semibold text-trade-text-primary">
        No recent activity
      </p>
      <p className="mt-1 text-[12px] text-trade-text-muted">
        Activity from the last 30 days will appear here as your team works.
      </p>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function iconForCategory(category: ActivityEvent["category"]): LucideIcon {
  switch (category) {
    case "operation":
      return Workflow;
    case "license":
      return FileCheck;
    case "party":
      return Users;
    case "item":
      return Package;
    case "euc":
      return FileSignature;
    case "reexport":
      return FileSignature;
    case "vsd":
      return AlertOctagon;
    case "sammelgenehmigung":
      return Layers;
  }
}

function toneForCategory(category: ActivityEvent["category"]): string {
  switch (category) {
    case "vsd":
      return "trade-chip-danger";
    case "license":
    case "sammelgenehmigung":
      return "trade-chip-success";
    case "party":
      return "trade-chip-warn";
    case "euc":
    case "reexport":
      return "trade-chip-info";
    case "operation":
    case "item":
    default:
      return "trade-chip-neutral";
  }
}

/**
 * Map an ISO date (YYYY-MM-DD) into a friendly group header.
 */
function formatDayLabel(isoDate: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  if (isoDate === today) return "Today";
  if (isoDate === yesterday) return "Yesterday";
  // Construct from UTC parts so the label matches the bucket key.
  const [year, month, day] = isoDate.split("-").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return isoDate;
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
