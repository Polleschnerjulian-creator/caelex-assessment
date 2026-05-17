"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 Sidebar redesign — section wrapper with muted header.
 *
 * Used for grouping sidebar items under a small uppercase header
 * (matches Claude Code's "Pinned" / "Recents" pattern).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ReactNode } from "react";

interface SidebarSectionProps {
  label: string;
  children: ReactNode;
  /** Optional right-side icon button (e.g. sort menu trigger). */
  rightAction?: ReactNode;
  /** Hide the header (still groups children). Useful when label would feel redundant. */
  hideLabel?: boolean;
}

export function SidebarSection({
  label,
  children,
  rightAction,
  hideLabel,
}: SidebarSectionProps) {
  return (
    <div className="mt-5 first:mt-3">
      {!hideLabel && (
        <div className="mb-1.5 flex items-center justify-between px-3">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-atlas-text-muted">
            {label}
          </span>
          {rightAction && (
            <span className="opacity-60 transition-opacity hover:opacity-100">
              {rightAction}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-col">{children}</div>
    </div>
  );
}
