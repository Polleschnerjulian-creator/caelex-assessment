"use client";

/**
 * TodaysFocus — the Tier-C hero band. "Today's 3 things, ~2h work."
 *
 * Not a to-do list — a staged invitation. Each focus item is a
 * clickable pill that snaps the detail panel to that control.
 * No busywork signals ("due in 4 days") — just the priority.
 */

import { ArrowRight, Flame, Clock } from "lucide-react";
import type { QueueItem } from "@/lib/provenance/workflow-queue";

interface TodaysFocusProps {
  focus: QueueItem[];
  blockedCount: number;
  hours: number;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

const SEVERITY_HUE: Record<string, string> = {
  critical: "text-red-500",
  major: "text-amber-500",
  minor: "text-[var(--text-tertiary)]",
};

function formatHours(h: number): string {
  if (h >= 1) {
    return `~${h % 1 === 0 ? h : h.toFixed(1)}h today`;
  }
  const minutes = Math.round(h * 60);
  return `~${minutes}m today`;
}

export function TodaysFocus({
  focus,
  blockedCount,
  hours,
  onSelect,
  selectedId,
}: TodaysFocusProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[var(--text-tertiary)]">
            Today's Focus
          </span>
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          {focus.length === 1
            ? "One control in focus"
            : `${focus.length} controls in focus`}
          <span className="ml-3 text-sm font-normal text-[var(--text-tertiary)]">
            <Clock className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
            {formatHours(hours)}
            {blockedCount > 0 && ` · ${blockedCount} waiting on evidence`}
          </span>
        </h2>
      </div>

      {/* Focus pills */}
      <div className="flex flex-wrap gap-2 md:justify-end">
        {focus.map((item) => {
          const isSelected = selectedId === item.req.id;
          return (
            <button
              key={item.req.id}
              onClick={() => onSelect(item.req.id)}
              className={[
                "group inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors max-w-[280px]",
                isSelected
                  ? "border-emerald-500 bg-emerald-500/10 text-[var(--text-primary)]"
                  : "border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:border-emerald-500/50",
              ].join(" ")}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${SEVERITY_HUE[item.req.severity] ?? "text-slate-400"} bg-current flex-shrink-0`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-[var(--text-tertiary)] mb-0.5">
                  {item.req.articleRef}
                </span>
                <span className="block truncate font-medium leading-tight">
                  {item.req.title}
                </span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-emerald-500 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TodaysFocus;
