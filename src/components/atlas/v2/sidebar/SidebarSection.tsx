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
import { ChevronRight } from "lucide-react";

interface SidebarSectionProps {
  label: string;
  children: ReactNode;
  /** Optional right-side icon button (e.g. sort menu trigger). */
  rightAction?: ReactNode;
  /** Hide the header (still groups children). Useful when label would feel redundant. */
  hideLabel?: boolean;
  /** 2026-06-11 — opt-in collapse. When set, the header label becomes
   *  a toggle button (chevron rotates, children hide). Controlled from
   *  the parent so collapse-state can persist (e.g. localStorage).
   *  All existing call-sites stay untouched: without `collapsible`
   *  the section renders exactly as before. */
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export function SidebarSection({
  label,
  children,
  rightAction,
  hideLabel,
  collapsible,
  collapsed,
  onToggleCollapsed,
}: SidebarSectionProps) {
  return (
    <div className="mt-5 first:mt-3">
      {!hideLabel && (
        <div className="mb-1.5 flex items-center justify-between px-3">
          {collapsible ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              className="flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.06em] text-atlas-text-muted transition-colors hover:text-atlas-text-primary"
            >
              <span>{label}</span>
              <ChevronRight
                size={10}
                aria-hidden="true"
                className={`transition-transform duration-150 ${
                  collapsed ? "" : "rotate-90"
                }`}
              />
            </button>
          ) : (
            <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-atlas-text-muted">
              {label}
            </span>
          )}
          {rightAction && (
            <span className="opacity-60 transition-opacity hover:opacity-100">
              {rightAction}
            </span>
          )}
        </div>
      )}
      {!(collapsible && collapsed) && (
        <div className="flex flex-col">{children}</div>
      )}
    </div>
  );
}
