"use client";

/**
 * BulkActionsBar — fixed bottom-of-viewport toolbar that appears when
 * a list page has rows selected via the bulk-checkbox column (U-CRIT-5).
 *
 * Visual contract:
 *   - Fixed at the bottom-center of the viewport, full-width on mobile,
 *     centered-pill on desktop with soft shadow + rounded corners.
 *   - Shows "Selected (N)" + a "Clear" link + one or more action
 *     buttons supplied by the parent page.
 *   - Slides up on first selection, slides down when selection clears.
 *
 * MVP scope:
 *   - Pure presentational. Selection state lives in the parent page.
 *   - Actions are passed in as `ReactNode[]` so each list page can wire
 *     its own export/delete/archive verbs.
 *   - No multi-select-all-matching-filter pattern yet (that needs a
 *     server-side count + a "select 1234 matching rows" prompt; the
 *     primitives are here for it to land in a follow-up).
 *
 * Accessibility:
 *   - role="toolbar" + aria-label so screen readers announce the bar as
 *     a single landmark.
 *   - Keyboard: action buttons are regular `<button>` so Tab cycles
 *     naturally. The Clear button is reachable via the same focus path.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import * as React from "react";

interface Props {
  /** Number of items currently selected. When 0 the bar is hidden. */
  count: number;
  /** Callback to clear the selection (called when "Clear" is clicked). */
  onClear: () => void;
  /** Action buttons rendered right-aligned, in source order. */
  actions: React.ReactNode;
  /** Optional noun for the count phrase. Default "selected". */
  noun?: string;
}

export function BulkActionsBar({
  count,
  onClear,
  actions,
  noun = "selected",
}: Props) {
  if (count === 0) return null;
  return (
    <div
      role="toolbar"
      aria-label={`Bulk actions for ${count} ${noun} ${count === 1 ? "item" : "items"}`}
      className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-trade-border-subtle bg-trade-bg-panel px-4 py-2 shadow-xl"
      style={{
        backdropFilter: "blur(12px)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.10)",
      }}
    >
      <span className="text-[12px] font-semibold tabular-nums text-trade-text-primary">
        {count} {noun}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="text-[11px] text-trade-text-secondary underline-offset-2 transition hover:text-trade-text-primary hover:underline"
      >
        Clear
      </button>
      <div
        aria-hidden="true"
        className="mx-1 h-4 w-px bg-trade-border-subtle"
      />
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
