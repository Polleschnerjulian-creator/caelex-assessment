"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — ValidityBadge.
 *
 * Renders the live status of an Atlas-corpus citation. Five visual
 * states matching the ValidityBadge enum from validity-tools.server.ts:
 *
 *   🟢 in_force        — emerald, "in force"
 *   🟡 needs_review    — amber, "in force, last_verified stale"
 *   🟡 pending         — amber, "draft / proposed / planned"
 *   ⚠️  amended         — orange, "amended (newer version exists)"
 *   ⚠️  repealed        — red,    "repealed / expired"
 *   ❓ unknown         — slate,  "not in corpus"
 *
 * Tooltip exposes lastVerified, staleDays, amendment chain. Click via
 * the wrapping CitationsPanel opens the source page (Sprint 5+).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ValidityBadge as Badge } from "@/lib/atlas/validity-tools.server";

interface Props {
  badge: Badge;
  /** Compact (12px circle only) or labelled (with text). Default labelled. */
  compact?: boolean;
}

/* M32 — Text colors must hit WCAG AA in BOTH modes. The original
   palette used `text-{color}-300` which is light-on-light against
   the page's `bg-white` in light-mode (1.5:1 contrast — invisible).
   Pattern: 600-shade for light-mode (passes 4.5:1 vs white), 300-
   shade for dark-mode (passes vs the navy backdrop). Dot colors stay
   the same — they read fine on either background. */
const STYLES: Record<
  Badge,
  { dot: string; text: string; label: string; emoji: string }
> = {
  in_force: {
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-300",
    label: "in force",
    emoji: "🟢",
  },
  needs_review: {
    dot: "bg-amber-400",
    text: "text-amber-600 dark:text-amber-300",
    label: "needs review",
    emoji: "🟡",
  },
  pending: {
    dot: "bg-amber-400",
    text: "text-amber-600 dark:text-amber-300",
    label: "pending",
    emoji: "🟡",
  },
  amended: {
    dot: "bg-orange-400",
    text: "text-orange-600 dark:text-orange-300",
    label: "amended",
    emoji: "⚠️",
  },
  repealed: {
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-300",
    label: "repealed",
    emoji: "⚠️",
  },
  unknown: {
    dot: "bg-slate-600",
    text: "text-slate-600 dark:text-slate-400",
    label: "unknown",
    emoji: "❓",
  },
};

export function ValidityBadge({ badge, compact = false }: Props) {
  const s = STYLES[badge];
  if (compact) {
    return (
      <span
        aria-label={s.label}
        title={s.label}
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${s.dot}`}
      />
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider ${s.text}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
