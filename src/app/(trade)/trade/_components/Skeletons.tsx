/**
 * Caelex Trade — shared skeleton components.
 *
 * Replaces flat "Loading…" text with animated grey-box skeletons that
 * mirror the shape of the eventual content. Apple/Linear pattern:
 * perceived performance is dramatically better when the user sees the
 * eventual layout immediately, even before data resolves.
 *
 * Keeps the same a11y semantics (role="status" + aria-live="polite" +
 * aria-busy) so screen readers still announce "loading...".
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";

interface SkeletonProps {
  /** Tailwind width class — defaults to full-width. */
  width?: string;
  /** Tailwind height class — defaults to h-4. */
  height?: string;
  /** Additional Tailwind classes to merge. */
  className?: string;
}

/** Single shimmering grey rectangle. */
export function Skeleton({
  width = "w-full",
  height = "h-4",
  className = "",
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded ${width} ${height} ${className}`}
      style={{ background: "var(--trade-bg-subtle)" }}
    />
  );
}

/**
 * List-row skeleton — mirrors the typical list-card layout:
 * icon-block + 2 lines of text + chip + meta.
 */
export function ListRowSkeleton() {
  return (
    <div
      className="flex items-center gap-4 rounded-md border px-4 py-3"
      style={{
        borderColor: "var(--trade-border-subtle)",
        background: "var(--trade-bg-panel)",
      }}
    >
      <Skeleton width="w-8" height="h-8" className="rounded-md" />
      <div className="flex-1 space-y-2">
        <Skeleton width="w-1/3" height="h-3.5" />
        <Skeleton width="w-1/2" height="h-3" />
      </div>
      <Skeleton width="w-20" height="h-6" className="rounded-full" />
      <Skeleton width="w-16" height="h-3" />
    </div>
  );
}

interface ListSkeletonProps {
  /** Number of skeleton rows to render. Default 5. */
  rows?: number;
  /** Accessible label for screen readers (e.g. "Loading counterparties"). */
  label: string;
}

/** Full-list skeleton with a11y announcement. */
export function ListSkeleton({ rows = 5, label }: ListSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="space-y-2"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
