"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  deadlineColors,
  getDaysUntilDue,
  getDeadlineUrgency,
} from "@/data/timeline-deadlines";

// ─── Types ───

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  category: string;
  priority: string;
  status: string;
  regulatoryRef: string | null;
  moduleSource: string | null;
  penaltyInfo: string | null;
}

interface GanttViewProps {
  deadlines: Deadline[];
}

// ─── Constants ───

const VIEW_OPTIONS = [3, 6, 12, 24] as const;

const MODULE_LABELS: Record<string, string> = {
  AUTHORIZATION: "Authorization",
  DEBRIS: "Debris",
  INSURANCE: "Insurance",
  CYBERSECURITY: "Cybersecurity",
  ENVIRONMENTAL: "Environmental",
  SUPERVISION: "Supervision",
  REGISTRATION: "Registration",
  DOCUMENTS: "Documents",
  NIS2: "NIS2",
  TIMELINE: "Timeline",
  REGULATORY: "Regulatory",
  LICENSE: "License",
  REPORTING: "Reporting",
  CERTIFICATION: "Certification",
  MISSION: "Mission",
  INTERNAL: "Internal",
  CONTRACTUAL: "Contractual",
};

// ─── Helpers ───

function getUrgencyColor(dueDate: string): string {
  const urgency = getDeadlineUrgency(new Date(dueDate));
  return deadlineColors.status[urgency] || "#6b7280";
}

function formatDaysRemaining(dueDate: string): string {
  const days = getDaysUntilDue(new Date(dueDate));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days}d remaining`;
}

// ─── Component ───

export default function GanttView({ deadlines }: GanttViewProps) {
  const [viewMonths, setViewMonths] = useState<number>(12);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Time Range ───

  const now = useMemo(() => new Date(), []);

  const { startDate, endDate, totalDays } = useMemo(() => {
    const start = new Date(now);
    start.setDate(1);
    start.setMonth(start.getMonth() - 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setMonth(end.getMonth() + viewMonths + 1);

    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );

    return { startDate: start, endDate: end, totalDays: days };
  }, [now, viewMonths]);

  // ─── Position Calculations ───

  const getPosition = useCallback(
    (dateStr: string) => {
      const date = new Date(dateStr);
      const dayOffset =
        (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      return (dayOffset / totalDays) * 100;
    },
    [startDate, totalDays],
  );

  const todayPosition = useMemo(
    () => getPosition(now.toISOString()),
    [getPosition, now],
  );

  // ─── Month Markers ───

  const monthMarkers = useMemo(() => {
    const markers: { position: number; label: string; isQuarter: boolean }[] =
      [];
    const d = new Date(startDate);
    d.setDate(1);

    while (d < endDate) {
      markers.push({
        position: getPosition(d.toISOString()),
        label: d.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        isQuarter: d.getMonth() % 3 === 0,
      });
      d.setMonth(d.getMonth() + 1);
    }
    return markers;
  }, [startDate, endDate, getPosition]);

  // ─── Groups ───

  const groups = useMemo(() => {
    const map = new Map<string, Deadline[]>();
    for (const d of deadlines) {
      const key = d.moduleSource || d.category || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    // Sort groups alphabetically
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [deadlines]);

  // ─── Min width for scrollability ───

  const minWidth = viewMonths <= 6 ? 900 : viewMonths <= 12 ? 1200 : 1800;

  // ─── Render ───

  if (deadlines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-slate-400"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
          No deadlines to display
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Create deadlines to see them on the Gantt timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* ─── Header: Zoom Controls + Legend ─── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 font-medium">
            Range
          </span>
          <div className="flex gap-1 bg-white/40 dark:bg-white/5 rounded-lg p-0.5 border border-black/[0.04] dark:border-white/5">
            {VIEW_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setViewMonths(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMonths === m
                    ? "bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm border border-black/[0.06] dark:border-white/10"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {m}M
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: deadlineColors.status.OVERDUE }}
            />
            Overdue
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: deadlineColors.status.DUE_SOON }}
            />
            Due soon
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: deadlineColors.status.UPCOMING }}
            />
            Upcoming
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: deadlineColors.status.ON_TRACK }}
            />
            On track
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-0.5 h-3 bg-red-500 rounded-full" />
            Today
          </div>
        </div>
      </div>

      {/* ─── Timeline Container ─── */}
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white/30 dark:bg-white/[0.02]"
      >
        <div style={{ minWidth: `${minWidth}px` }}>
          {/* ─── Month Axis ─── */}
          <div className="relative h-9 border-b border-black/[0.06] dark:border-white/5 ml-40">
            {monthMarkers.map((m, i) => (
              <div
                key={i}
                className="absolute top-0 h-full"
                style={{ left: `${m.position}%` }}
              >
                <div className="h-full border-l border-black/[0.06] dark:border-white/5" />
                <span
                  className={`absolute top-2 left-1.5 text-[10px] whitespace-nowrap select-none ${
                    m.isQuarter
                      ? "text-slate-600 dark:text-slate-300 font-medium"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {m.label}
                </span>
              </div>
            ))}

            {/* Today indicator on axis */}
            {todayPosition >= 0 && todayPosition <= 100 && (
              <div
                className="absolute top-0 h-full z-10"
                style={{ left: `${todayPosition}%` }}
              >
                <div className="h-full w-px bg-red-500" />
                <span className="absolute -top-0 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-b-md">
                  Today
                </span>
              </div>
            )}
          </div>

          {/* ─── Rows ─── */}
          {groups.map(([group, items], groupIndex) => (
            <div
              key={group}
              className={`relative flex items-stretch ${
                groupIndex < groups.length - 1
                  ? "border-b border-black/[0.04] dark:border-white/[0.04]"
                  : ""
              }`}
              style={{ minHeight: "44px" }}
            >
              {/* Group Label */}
              <div className="w-40 flex-shrink-0 flex items-center px-4 border-r border-black/[0.06] dark:border-white/5 bg-white/40 dark:bg-white/[0.02]">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                  {MODULE_LABELS[group] || group}
                </span>
              </div>

              {/* Timeline Area */}
              <div className="flex-1 relative">
                {/* Grid lines */}
                {monthMarkers.map((m, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-black/[0.03] dark:border-white/[0.03]"
                    style={{ left: `${m.position}%` }}
                  />
                ))}

                {/* Today line continuation */}
                {todayPosition >= 0 && todayPosition <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red-500/25 z-[5]"
                    style={{ left: `${todayPosition}%` }}
                  />
                )}

                {/* Horizontal connector line */}
                {items.length > 1 &&
                  (() => {
                    const positions = items
                      .map((d) => getPosition(d.dueDate))
                      .filter((p) => p >= -5 && p <= 105);
                    if (positions.length < 2) return null;
                    const min = Math.max(0, Math.min(...positions));
                    const max = Math.min(100, Math.max(...positions));
                    return (
                      <div
                        className="absolute top-1/2 h-px bg-slate-300/60 dark:bg-white/10 -translate-y-1/2"
                        style={{ left: `${min}%`, width: `${max - min}%` }}
                      />
                    );
                  })()}

                {/* Deadline Markers */}
                {items.map((d) => {
                  const pos = getPosition(d.dueDate);
                  if (pos < -5 || pos > 105) return null;
                  const color = getUrgencyColor(d.dueDate);
                  const isHovered = hoveredId === d.id;
                  const days = getDaysUntilDue(new Date(d.dueDate));

                  return (
                    <div
                      key={d.id}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-pointer"
                      style={{ left: `${Math.max(0, Math.min(100, pos))}%` }}
                      onMouseEnter={() => setHoveredId(d.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Marker dot */}
                      <div
                        className="transition-all duration-150"
                        style={{
                          width: isHovered ? 16 : 12,
                          height: isHovered ? 16 : 12,
                          borderRadius: "50%",
                          backgroundColor: color,
                          border: "2px solid white",
                          boxShadow: isHovered
                            ? `0 0 0 3px ${color}30, 0 2px 8px rgba(0,0,0,0.15)`
                            : "0 1px 3px rgba(0,0,0,0.12)",
                        }}
                      />

                      {/* Tooltip */}
                      {isHovered && (
                        <div
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 pointer-events-none z-50"
                          style={{ width: "max-content", maxWidth: 280 }}
                        >
                          <div
                            className="px-3 py-2.5 rounded-xl border shadow-xl"
                            style={{
                              background: "rgba(255, 255, 255, 0.92)",
                              backdropFilter: "blur(20px)",
                              WebkitBackdropFilter: "blur(20px)",
                              borderColor: "rgba(0, 0, 0, 0.08)",
                            }}
                          >
                            {/* Title */}
                            <p className="text-xs font-semibold text-slate-800 dark:text-white mb-1.5 leading-snug">
                              {d.title}
                            </p>

                            {/* Meta row */}
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-slate-500">
                                {new Date(d.dueDate).toLocaleDateString(
                                  "en-US",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                              <span
                                className="px-1.5 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: `${color}18`,
                                  color,
                                }}
                              >
                                {formatDaysRemaining(d.dueDate)}
                              </span>
                            </div>

                            {/* Priority + Category */}
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                              <span>{d.priority}</span>
                              {d.regulatoryRef && (
                                <>
                                  <span>&middot;</span>
                                  <span>{d.regulatoryRef}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Tooltip arrow */}
                          <div className="flex justify-center">
                            <div
                              className="w-2 h-2 rotate-45 -mt-1"
                              style={{
                                background: "rgba(255, 255, 255, 0.92)",
                                borderRight: "1px solid rgba(0, 0, 0, 0.08)",
                                borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Summary Footer ─── */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 px-1">
        <span>
          {deadlines.length} deadline{deadlines.length !== 1 ? "s" : ""} across{" "}
          {groups.length} module{groups.length !== 1 ? "s" : ""}
        </span>
        <span>
          {startDate.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}{" "}
          &ndash;{" "}
          {endDate.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}
