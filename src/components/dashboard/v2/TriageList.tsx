"use client";

import * as React from "react";
import {
  Bell,
  Gavel,
  Satellite,
  Check,
  X,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/v2/badge";
import { Kbd } from "@/components/ui/v2/kbd";
import {
  acknowledgeAction,
  dismissAction,
} from "@/app/dashboard/triage/server-actions";
import type {
  TriageItem,
  TriageSeverity,
  TriageSource,
} from "@/lib/comply-v2/triage-service.server";

/**
 * Linear-style triage inbox — single-column dense list with
 * keyboard navigation and one-key disposition.
 *
 * Keyboard:
 *   J / ↓ — focus next row
 *   K / ↑ — focus previous row
 *   A      — acknowledge focused item
 *   D      — dismiss focused item
 *   ↵      — open the source URL (if any)
 *   ?      — toggle keymap help (TODO Phase 2.1)
 *
 * The disposition forms post to thin Server Action wrappers in
 * server-actions.ts which delegate to the defineAction() actions.
 * Items disappear via revalidatePath() — no client-side optimistic
 * removal yet (Phase 2.1).
 */

type SourceVisual = {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge: "operator" | "counsel" | "authority" | "default";
};

const SOURCE_VISUALS: Record<TriageSource, SourceVisual> = {
  NOTIFICATION: { Icon: Bell, label: "Inbox", badge: "default" },
  REGULATORY_UPDATE: { Icon: Gavel, label: "Regulator", badge: "authority" },
  SATELLITE_ALERT: { Icon: Satellite, label: "Satellite", badge: "operator" },
};

const SEV_COLOR: Record<TriageSeverity, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-amber-500",
  MEDIUM: "bg-blue-500",
  LOW: "bg-slate-400",
  INFO: "bg-slate-300",
};

const SEV_LABEL: Record<TriageSeverity, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  INFO: "Info",
};

export interface TriageListProps {
  items: Array<Omit<TriageItem, "receivedAt"> & { receivedAt: string }>;
}

export function TriageList({ items }: TriageListProps) {
  const [focusIndex, setFocusIndex] = React.useState<number>(0);
  const rowRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const ackFormRefs = React.useRef<Array<HTMLFormElement | null>>([]);
  const dismissFormRefs = React.useRef<Array<HTMLFormElement | null>>([]);

  const focusRow = React.useCallback(
    (idx: number) => {
      if (items.length === 0) return;
      const next = Math.max(0, Math.min(items.length - 1, idx));
      setFocusIndex(next);
      rowRefs.current[next]?.focus();
    },
    [items.length],
  );

  React.useEffect(() => {
    // Focus first row on mount.
    if (items.length > 0) {
      rowRefs.current[0]?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Don't intercept if the user is typing in an input/textarea.
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        focusRow(focusIndex + 1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        focusRow(focusIndex - 1);
      } else if (e.key.toLowerCase() === "a") {
        e.preventDefault();
        ackFormRefs.current[focusIndex]?.requestSubmit();
      } else if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        dismissFormRefs.current[focusIndex]?.requestSubmit();
      } else if (e.key === "Enter") {
        const url = items[focusIndex]?.actionUrl;
        if (url) {
          e.preventDefault();
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }
    },
    [focusIndex, focusRow, items],
  );

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
        <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">
          Inbox zero.
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          No new signals to triage. Nicely done.
        </p>
      </div>
    );
  }

  return (
    <div
      role="list"
      onKeyDown={onKeyDown}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      {items.map((item, idx) => {
        const visual = SOURCE_VISUALS[item.source];
        const Icon = visual.Icon;
        const isFocused = idx === focusIndex;
        return (
          <div
            key={item.id}
            ref={(el) => {
              rowRefs.current[idx] = el;
            }}
            tabIndex={0}
            role="listitem"
            onClick={() => focusRow(idx)}
            className={`group flex items-start gap-3 border-b border-slate-100 px-4 py-3 transition outline-none last:border-b-0 dark:border-slate-800 ${
              isFocused
                ? "bg-emerald-50 dark:bg-emerald-950/20"
                : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
            } focus:bg-emerald-100/60 dark:focus:bg-emerald-900/30`}
          >
            {/* Severity dot */}
            <div className="flex flex-col items-center pt-1">
              <span
                className={`h-2 w-2 rounded-full ${SEV_COLOR[item.severity]}`}
                aria-label={`${SEV_LABEL[item.severity]} severity`}
              />
            </div>

            {/* Source icon */}
            <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />

            {/* Body */}
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-2">
                <Badge variant={visual.badge}>{visual.label}</Badge>
                {item.tag ? (
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    {item.tag}
                  </span>
                ) : null}
                <span className="ml-auto text-[10px] text-slate-400">
                  {formatRelative(item.receivedAt)}
                </span>
              </div>
              <h3 className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                {item.title}
              </h3>
              <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                {item.body}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 self-center">
              {item.actionUrl ? (
                <a
                  href={item.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Open source"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}

              <form
                ref={(el) => {
                  ackFormRefs.current[idx] = el;
                }}
                action={acknowledgeAction}
                className="inline"
                onClick={(e) => e.stopPropagation()}
              >
                <input type="hidden" name="itemId" value={item.id} />
                <button
                  type="submit"
                  aria-label={`Acknowledge "${item.title}"`}
                  className="rounded-md p-1.5 text-emerald-600 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </form>

              <form
                ref={(el) => {
                  dismissFormRefs.current[idx] = el;
                }}
                action={dismissAction}
                className="inline"
                onClick={(e) => e.stopPropagation()}
              >
                <input type="hidden" name="itemId" value={item.id} />
                <button
                  type="submit"
                  aria-label={`Dismiss "${item.title}"`}
                  className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        );
      })}

      {/* Keyboard help footer */}
      <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Kbd>J</Kbd>
          <Kbd>K</Kbd> navigate
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>A</Kbd> acknowledge
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>D</Kbd> dismiss
        </span>
        <span className="inline-flex items-center gap-1">
          <Kbd>↵</Kbd> open source
        </span>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = diff / 1000;
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h`;
  if (sec < 86400 * 30) return `${Math.round(sec / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}
