"use client";

import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import type { LinkStatus } from "@/lib/atlas/link-status";

interface Props {
  status: LinkStatus | undefined;
  lastVerified: string | undefined; // static ISO from the data file
}

/**
 * Surfaces the combined "is this source still alive & unchanged" signal.
 *
 * Priority:
 *   1. ERROR (HTTP failure)     → red "Link broken"
 *   2. CHANGED                  → amber "Content updated"
 *   3. UNCHANGED (< 14 days)    → green "Verified"
 *   4. UNCHANGED (older)        → slate "Last checked X days ago"
 *   5. no monitoring data       → fall back to static last_verified
 */
export function LinkStatusBadge({ status, lastVerified }: Props) {
  const now = Date.now();

  if (status?.status === "ERROR") {
    return (
      <span
        title={
          status.errorMessage
            ? `${status.errorMessage}${status.httpStatus ? ` (HTTP ${status.httpStatus})` : ""}`
            : "Primary source unreachable"
        }
        className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 border border-red-100 rounded-full px-2 py-0.5"
      >
        <XCircle size={10} strokeWidth={2.5} />
        Link broken
      </span>
    );
  }

  if (status?.status === "CHANGED") {
    const days = status.lastChanged
      ? Math.floor(
          (now - new Date(status.lastChanged).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;
    return (
      <span
        title={`Source content changed${days !== null ? ` ${days} day${days === 1 ? "" : "s"} ago` : ""} — needs admin review`}
        className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5"
      >
        <AlertTriangle size={10} strokeWidth={2.5} />
        Updated{days !== null ? ` ${days}d ago` : ""}
      </span>
    );
  }

  if (status?.status === "UNCHANGED" && status.lastChecked) {
    const days = Math.floor(
      (now - new Date(status.lastChecked).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days < 14) {
      return (
        <span
          title={`Primary source verified ${days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`}`}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5"
        >
          <CheckCircle2 size={10} strokeWidth={2.5} />
          Verified
        </span>
      );
    }
    return (
      <span
        title={`Last auto-checked ${days} days ago`}
        className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5"
      >
        <Clock size={10} strokeWidth={2} />
        Checked {days}d ago
      </span>
    );
  }

  // Fallback to static last_verified from the data file
  if (lastVerified) {
    const days = Math.floor(
      (now - new Date(lastVerified).getTime()) / (1000 * 60 * 60 * 24),
    );
    return (
      <span
        title={`Last manually verified ${lastVerified}`}
        className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5"
      >
        <Clock size={10} strokeWidth={2} />
        {days < 30
          ? "Recently verified"
          : `Verified ${Math.floor(days / 30)}mo ago`}
      </span>
    );
  }

  return null;
}
